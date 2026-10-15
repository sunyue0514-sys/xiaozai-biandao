import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { getClientIp, isIpBlacklisted, checkRateLimit, RATE_LIMITS, checkAILimit } from '@/lib/security';
import { logAICall } from '@/lib/ai-quality-logger';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 一键润色 API（流式SSE）
 * 
 * 功能：
 * - 对整个脚本进行润色优化
 * - 支持多种润色风格
 * - 自动追踪版本链
 * 
 * 请求体：
 * {
 *   recordId: number,        // 当前记录ID
 *   polishType: string,      // 润色类型: more_fun/more_professional/shorter/add_examples
 *   context: {               // 上下文信息
 *     topic: string,
 *     style: string,
 *     audience: string,
 *     customerName?: string,
 *     ipPositioning?: string,
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  const encoder = new TextEncoder();
  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. 验证登录
        const authHeader = request.headers.get('authorization');
        const tokenFromHeader = authHeader?.replace('Bearer ', '');
        const tokenFromCookie = request.cookies.get('sessionToken')?.value;
        const token = tokenFromHeader || tokenFromCookie;

        if (!token || !(await hasSession(token))) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '请先登录' })}\n\n`));
          controller.close();
          return;
        }

        const userId = await getSessionUserId(token);
        if (!userId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '用户信息无效' })}\n\n`));
          controller.close();
          return;
        }

        // 2. 解析请求
        const body = await request.json();
        const { recordId, polishType, context, originalScript: passedScript } = body;

        if ((!recordId && !passedScript) || !polishType) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '缺少必要参数' })}\n\n`));
          controller.close();
          return;
        }

        // 3. 润色类型到要求的映射
        const polishRequests: Record<string, string> = {
          'more_fun': '让文案更有趣、更轻松、更有感染力，可以加一些网络梗或幽默表达',
          'more_professional': '让文案更专业、更有说服力，增加权威感和专业度',
          'shorter': '精简文案，去除冗余表达，保留核心内容',
          'add_examples': '在关键观点处添加具体案例或故事，增强说服力',
        };

        const editRequest = polishRequests[polishType] || '优化整体文案';
        const powerCost = 100;  // 一键润色100算力

        // 4. 检查并扣除算力
        const powerResult = await consumePower(userId, 'creative_polish', powerCost);
        if (!powerResult.success) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '算力不足', code: 'POWER_INSUFFICIENT' })}\n\n`));
          controller.close();
          return;
        }

        const supabase = await getSupabaseClient();
        let originalScript = passedScript || '';
        let topic = context?.topic || '';
        
        // 5. 如果有 recordId，从数据库获取原记录
        if (recordId && !passedScript) {
          const { data: originalRecord } = await supabase
            .from('creative_records')
            .select('*')
            .eq('id', recordId)
            .eq('user_id', userId)
            .single();

          if (!originalRecord) {
            await refundPower(userId, powerCost);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '记录不存在' })}\n\n`));
            controller.close();
            return;
          }

          originalScript = originalRecord.script_content || '';
          topic = originalRecord.topic || topic;
        }
        
        // 6. 计算新版本号
        const { count: versionCount } = await supabase
          .from('creative_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('topic', topic);

        const newVersion = (versionCount || 0) + 1;
        const polishNames: Record<string, string> = {
          'more_fun': '更有趣',
          'more_professional': '更专业',
          'shorter': '更精简',
          'add_examples': '加案例',
        };
        const polishName = polishNames[polishType] || '优化';

        const systemPrompt = `你是一位专业的短视频文案编辑。

【任务】
对整个脚本进行润色优化。

【润色类型】
${polishName}

【具体要求】
${editRequest}

【需要注意】
- 保持脚本的整体结构和核心内容
- 只进行语言层面的优化
- 润色后要自然流畅，不生硬
- 保持口语化、有感染力的风格`;

        const userPrompt = `【原脚本】
${originalScript}

请对以上脚本进行${polishName}润色优化。`;

        // 8. 调用 AI
        const customHeaders = safeForwardHeaders(request.headers);
        const config = new Config({ timeout: 120000 });
        const client = new LLMClient(config, customHeaders);

        const messages = [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt },
        ];

        let fullContent = '';
        let outputContent = '';
        const model = 'deepseek-v3-2-251201';

        try {
          const llmStream = client.stream(messages, {
            model,
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const content = typeof chunk.content === 'string' ? chunk.content : '';
              fullContent += content;
              outputContent += content;
              
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ content: content, done: false })}\n\n`
              ));
            }
          }
        } catch (aiError) {
          console.error('API operation event');
          await refundPower(userId, powerCost);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI生成失败，请重试' })}\n\n`));
          controller.close();
          return;
        }

        // 9. 保存到历史记录
        try {
          await supabase.from('creative_records').insert({
            user_id: userId,
            topic: topic,
            audience: context?.audience || '',
            style: context?.style || '',
            value: context?.value || '',
            framework: context?.framework || null,
            script_content: outputContent,
            parent_id: recordId || null,
            version: newVersion,
            action: 'polish',
            edit_request: editRequest,
            edit_paragraphs: ['all'],
            edit_context: {
              polishType,
              originalScript,
            },
          });
        } catch (saveError) {
          console.error('API operation event');
        }

        // 10. 返回完成
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ 
            content: '', 
            done: true, 
            recordId: recordId,
            newVersion,
            versionNumber: newVersion,
          })}\n\n`
        ));
        controller.close();

        // 11. 记录日志
        await logAICall({
          feature: 'creative_polish',
          userId,
          input: `一键润色: ${polishType}`,
          output: outputContent.substring(0, 200),
          success: true,
          durationMs: Date.now() - startTime,
          model: 'deepseek-chat',
        });

      } catch (error) {
        console.error('API operation event');
        const errorMsg = error instanceof Error ? 'Request failed' : '润色失败';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
