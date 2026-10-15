import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, KnowledgeClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT } from '@/lib/system-prompts';
import { getUserById } from '@/lib/db-store';
import { injectMemoryEnhancement, buildMemoryPrefix } from '@/lib/memory-system';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return new Response(
        JSON.stringify({ error: '访问已被禁止' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // IP级别速率限制
    const { allowed: ipAllowed, resetTime } = checkRateLimit(`ai-ip:${ip}`, RATE_LIMITS.ai);
    if (!ipAllowed) {
      return new Response(
        JSON.stringify({ 
          error: 'AI调用过于频繁，请稍后再试',
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
    
    // 获取用户信息以获取uid
    const user = await getUserById(userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
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

    // 检查算力（每次对话消耗50算力）
    const powerCheck = await consumePower(userId, 'superDirector', 0);
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
    const consumedAmount = powerCheck.consumed || 0;

    const body = await request.json();
    const { message, history = [], customerInfo, customerId, ipPositioning } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 消息长度限制（防止超长输入消耗资源）
    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ error: '消息过长，请控制在5000字以内' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const knowledgeClient = new KnowledgeClient(config, customHeaders);

    // 搜索知识库获取相关内容
    let knowledgeContext = '';
    try {
      const searchResult = await knowledgeClient.search(
        message,
        undefined,
        2,
        0.6
      );
      
      if (searchResult.code === 0 && searchResult.chunks && searchResult.chunks.length > 0) {
        knowledgeContext = '\n\n【相关知识库内容】\n' + 
          searchResult.chunks.map((chunk) => 
            `---\n相关度：${chunk.score.toFixed(2)}\n内容：${chunk.content}\n---`
          ).join('\n');
      }
    } catch (error) {
      console.error('API operation event');
    }

    const baseSystemPrompt = CONTENT_SAFETY_PROMPT + `你是"小仔仔"，一个亲切友好的短视频创作小伙伴。

【能力】IP定位、选题策划、脚本撰写、运营变现

【风格】
- 语气活泼亲切，像朋友聊天一样
- 多给实操建议，接地气
- 语言自然口语化，可以用"呀""呢""～"等语气词
- 不用markdown符号

${customerInfo ? `【当前客户】${customerInfo.name || ''} | ${customerInfo.industry || ''} | ${customerInfo.description || ''}` : ''}

${knowledgeContext}`;

    // ========== 记忆增强注入 ==========
    // 从对话内容推断脚本类型（用于特征过滤）
    const scriptType = inferScriptType(message);
    
    // 注入用户的创作经验和风格偏好
    const memoryResult = await injectMemoryEnhancement(
      user.uid,
      baseSystemPrompt,
      {
        customerId,
        customerName: customerInfo?.name,
        ipPositioning,
        topic: message,
        scriptType,
        minConfidence: 20,
      }
    );

    // 使用增强后的提示词
    const systemPrompt = memoryResult.enhancedPrompt || baseSystemPrompt;

    // 构建消息列表，过滤无效的历史消息
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];

    // 添加历史消息（只保留有效的 user/assistant 消息）
    for (const h of history) {
      if (h.role === 'user' || h.role === 'assistant') {
        messages.push({ role: h.role, content: h.content || '' });
      }
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: message });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 如果记忆增强启用，先发送状态前缀
          if (memoryResult.enabled) {
            const memoryPrefix = buildMemoryPrefix(memoryResult);
            if (memoryPrefix) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: memoryPrefix })}\n\n`));
            }
          }

          const llmStream = llmClient.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.6,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          
          // 发送记忆增强元数据
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            done: true,
            memory: memoryResult.enabled ? {
              confidence: memoryResult.confidence,
              preferences: memoryResult.preferencesSummary,
            } : undefined
          })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          await refundPower(userId, consumedAmount, `超级导演失败: ${(error instanceof Error ? 'Request failed' : '未知').slice(0, 50)}`);
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败，如已扣费请联系管理员核对，自动退款尚未启用' })}\n\n`));
          } catch {
            // Controller might already be closed
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
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
    return new Response(
      JSON.stringify({ error: '服务暂时不可用，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 从对话内容推断脚本类型
 */
function inferScriptType(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('故事') || lowerMessage.includes('情感')) {
    return 'story';
  }
  if (lowerMessage.includes('过程') || lowerMessage.includes('展示') || lowerMessage.includes('工作')) {
    return 'process';
  }
  if (lowerMessage.includes('知识') || lowerMessage.includes('教程') || lowerMessage.includes('干货')) {
    return 'knowledge';
  }
  if (lowerMessage.includes('观点') || lowerMessage.includes('看法') || lowerMessage.includes('评价')) {
    return 'opinion';
  }
  if (lowerMessage.includes('产品') || lowerMessage.includes('推广') || lowerMessage.includes('带货')) {
    return 'product';
  }
  
  return undefined;
}
