import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';
import {
  buildScriptSystemPrompt,
  buildScriptUserMessage,
} from '@/lib/script-templates';
import { ScriptResult, DualVersionScriptResult, parseScriptJson, parseRewriteScriptJson, RewriteScriptResult } from '@/types/script';
import { searchKnowledge, buildKnowledgePrompt } from '@/lib/knowledge-helper';
// 导入新的提示词工程组件
import { 
  buildIPConstraints, 
  buildIdentityMappingInstruction,
  REWRITE_EXECUTION_STEPS,
  REWRITE_CORE_CONCEPT,
  REWRITE_EXAMPLES
} from '@/lib/prompt-engineering';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ScriptGenerateRequest {
  topic: string;
  scriptType: string;
  shootingMethod: string;
  context?: string;
  additionalInfo?: string; // 兼容前端传递的补充信息
  customerId?: number;
  customerName?: string;
  ipPositioning?: any;
  wordCount?: number;
  referenceVideo?: string | {
    title?: string;
    scriptContent?: string; // 提取的完整文案内容
    hashtags?: string[];
    stats?: {
      likes?: number;
      comments?: number;
      shares?: number;
    };
    track?: string;
    contentType?: string;
    highlight?: string;
    viralTags?: string[];
    platform?: string;
  }; // 参考视频/文案/原始脚本，支持字符串或对象格式
  hasCustomerProfile?: boolean; // 是否有客户档案
  generationMode?: 'rewrite' | 'script'; // 生成模式：仿写模式输出多形态，脚本模式输出双版本
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  let userIdForRefund: number | null = null;
  let consumedForRefund = 0;
  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return new Response(
        JSON.stringify({ error: '访问已被禁止' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 敏感操作速率限制
    const { allowed: ipAllowed, resetTime } = checkRateLimit(`script:${ip}`, RATE_LIMITS.script);
    if (!ipAllowed) {
      return new Response(
        JSON.stringify({ 
          error: '脚本生成过于频繁，请稍后再试',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return new Response(
        JSON.stringify({ error: '未登录或登录已过期' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '会话无效' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 用户级别AI调用限制
    const { allowed: userAllowed, reason } = checkAILimit(String(userId));
    if (!userAllowed) {
      return new Response(
        JSON.stringify({ error: reason || 'AI调用次数已达上限' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力（预估500字，消耗约600算力）
    const powerCheck = await consumePower(userId, 'script', 600);
    if (!powerCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: powerCheck.error, 
          code: powerCheck.code,
          required: powerCheck.required,
          remaining: powerCheck.remaining
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: ScriptGenerateRequest = await request.json();
    const { topic, scriptType, shootingMethod, context, additionalInfo, customerId, customerName, ipPositioning, wordCount = 500, referenceVideo, hasCustomerProfile, generationMode } = body;
    
    // 调试日志：检查是否接收到 generationMode 参数
    console.log('API operation event');
    
    // 合并 context 和 additionalInfo（兼容两种字段名）
    const combinedContext = [context, additionalInfo].filter(Boolean).join('\n');
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: '请输入选题主题' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 主题长度限制
    if (topic.length > 3000) {
      return new Response(
        JSON.stringify({ error: '主题过长，请控制在3000字以内' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 上下文长度限制
    if (context && context.length > 2000) {
      return new Response(
        JSON.stringify({ error: '补充要求过长，请控制在2000字以内' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    // 增加超时时间到 120 秒，确保复杂脚本能够完整生成
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    // 计算原视频文案长度（用于动态计算时长）
    let originalScriptLength: number | undefined = undefined;
    if (referenceVideo) {
      if (typeof referenceVideo === 'string') {
        originalScriptLength = referenceVideo.length;
      } else if (referenceVideo.scriptContent) {
        originalScriptLength = referenceVideo.scriptContent.length;
      }
    }

    // 构建系统提示词（结构化输出）
    let systemPrompt = buildScriptSystemPrompt(scriptType, shootingMethod, wordCount, originalScriptLength);
    
    // 仿写模式：添加核心概念、身份映射指令和仿写执行步骤（核心改进）
    if (generationMode === 'rewrite' && hasCustomerProfile && ipPositioning && referenceVideo) {
      systemPrompt += '\n\n' + REWRITE_CORE_CONCEPT;
      systemPrompt += '\n\n' + REWRITE_EXECUTION_STEPS;
      systemPrompt += '\n\n' + buildIdentityMappingInstruction(ipPositioning);
    }
    
    // 添加IP定位约束（增强版：将参考变为约束）
    if (ipPositioning) {
      systemPrompt += buildIPConstraints(ipPositioning, customerName, {
        mode: generationMode === 'rewrite' ? 'strict' : 'flexible',
        emphasis: ['identity', 'expertise', 'audience', 'tone', 'content']
      });
      
      // 添加创作指令摘要
      systemPrompt += `\n\n【核心创作指令】
基于以上创作者档案约束进行创作：
1. 内容主题必须与创作者的专业领域相关
2. 表达风格必须符合创作者的人设特点
3. ${generationMode === 'rewrite' ? '仿写时：学习参考内容的结构，用自己的身份和案例重新创作' : '确保内容与目标用户相关'}`;
    }

    // 搜索知识库获取相关方法论内容
    const searchQuery = `${topic} ${scriptType} 脚本创作`;
    const knowledgeResult = await searchKnowledge(searchQuery, request, 2, 0.5);
    if (knowledgeResult.success) {
      systemPrompt += buildKnowledgePrompt(knowledgeResult.context);
    }

    const userMessage = buildScriptUserMessage(topic, scriptType, shootingMethod, combinedContext, referenceVideo, hasCustomerProfile, generationMode);

    // 仿写模式：在用户消息中也添加示例（增强模型理解）
    let finalUserMessage = userMessage;
    if (generationMode === 'rewrite' && hasCustomerProfile && referenceVideo) {
      // 在用户消息开头添加仿写指导
      finalUserMessage = `【仿写任务说明】

你需要基于参考内容进行仿写创作。

${REWRITE_EXAMPLES}

--- 以下是具体任务 ---

${userMessage}`;
    }

    // 调试：检查提示词是否包含多形态格式标记
    console.log('API operation event');

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: finalUserMessage },
    ];

    // 记录已扣除的算力，用于失败时退还
    const consumedPowerRef = { value: 0 };
    const userIdRef = { value: userId };
    userIdForRefund = userId;
    consumedForRefund = 0;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
              consumedPowerRef.value += text.length;
              consumedForRefund = consumedPowerRef.value;
              // 流式输出原始内容
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          // 尝试解析JSON
          console.log('API operation event');
          
          // 根据 generationMode 选择解析函数
          let scriptResult: ScriptResult | DualVersionScriptResult | RewriteScriptResult | null = null;
          let isRewriteFormat = false;
          
          if (generationMode === 'rewrite') {
            // 仿写模式：使用多形态解析
            scriptResult = parseRewriteScriptJson(fullContent);
            isRewriteFormat = scriptResult !== null;
            console.log('API operation event');
          } else {
            // 脚本模式：使用双版本解析
            scriptResult = parseScriptJson(fullContent);
            console.log('API operation event');
          }
          
          if (scriptResult) {
            // 成功解析结构化数据
            const doneEvent = { 
              done: true, 
              structured: true,
              script: scriptResult,
              format: isRewriteFormat ? 'rewrite' : 'script'
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(doneEvent)}\n\n`));
          } else {
            // 解析失败，返回原始文本
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              done: true, 
              structured: false,
              rawContent: fullContent 
            })}\n\n`));
          }
          
          controller.close();
        } catch (streamError) {
          console.error('API operation event');
          // 失败时返还算力
          const refundAmount = consumedPowerRef.value > 0 ? Math.max(consumedPowerRef.value, 100) : 600;
          await refundPower(userIdRef.value, refundAmount, `脚本生成失败: ${(streamError instanceof Error ? 'Request failed' : '流式错误').slice(0, 50)}`);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: '生成失败，如已扣费请联系管理员核对，自动退款尚未启用' })}\n\n`)
          );
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
  } catch (error) {
    console.error('API operation event');
    // 失败时返还算力
    if (userIdForRefund) {
      await refundPower(userIdForRefund, consumedForRefund || 600, `脚本生成异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    }
    return new Response(
      JSON.stringify({ error: '服务器错误，如已扣费请联系管理员核对，自动退款尚未启用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
