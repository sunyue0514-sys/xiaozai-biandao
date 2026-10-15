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
 * 段落修改 API（流式SSE）
 * 
 * 功能：
 * - 根据用户要求修改指定段落
 * - 支持单段修改（50算力）和多段修改（100算力）
 * - 自动追踪版本链
 * 
 * 请求体：
 * {
 *   recordId: number,        // 当前记录ID
 *   paragraphs: string[],    // 要修改的段落标签，如 ["核心内容", "干货植入"]
 *   request: string,       // 修改要求，如"改得更口语化"
 *   context: {              // 上下文信息
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
        const { recordId, paragraphs, request: editRequest, context, originalScript: passedScript } = body;

        if ((!recordId && !passedScript) || !paragraphs || !editRequest) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '缺少必要参数' })}\n\n`));
          controller.close();
          return;
        }

        // 3. 判断算力消耗（单段50，多段100）
        const powerCost = paragraphs.length === 1 ? 50 : 100;

        // 4. 检查并扣除算力
        const powerResult = await consumePower(userId, 'creative_edit', powerCost);
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

        // 7. 构建修改提示词
        const paragraphList = paragraphs.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n');
        
        const systemPrompt = `你是一位专业的短视频文案编辑。

【任务】
根据用户要求，修改指定段落的内容，其他段落保持不变。

【修改要求】
${editRequest}

【需要注意】
- 只修改用户指定的段落
- 保持其他段落的原文不变
- 修改后的内容要符合整体风格和语境
- 语言要自然、口语化、有感染力
- 直接输出修改后的完整脚本，不要添加任何标记或说明`;

        const userPrompt = `【原脚本】
${originalScript}

【要修改的段落】
${paragraphList}

请直接输出修改后的完整脚本（不要添加任何标记）。`;

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
            parent_id: recordId || null,  // 版本链
            version: newVersion,
            action: 'edit',
            edit_request: editRequest,
            edit_paragraphs: paragraphs,
            edit_context: {
              originalScript,
              modifiedParagraphs: paragraphs,
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
          feature: 'creative_edit',
          userId,
          input: `修改段落: ${paragraphs.join(', ')}, 要求: ${editRequest}`,
          output: outputContent.substring(0, 200),
          success: true,
          durationMs: Date.now() - startTime,
          model: 'deepseek-chat',
        });

      } catch (error) {
        console.error('API operation event');
        const errorMsg = error instanceof Error ? 'Request failed' : '修改失败';
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
