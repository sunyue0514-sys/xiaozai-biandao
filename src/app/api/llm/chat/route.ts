import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT, VIDEO_CREATION_PROMPT } from '@/lib/system-prompts';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';
import { isMultimodalErrorFormat } from '@/lib/llm-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 默认系统提示词（包含内容审核约束）
const DEFAULT_SYSTEM_PROMPT = CONTENT_SAFETY_PROMPT + VIDEO_CREATION_PROMPT;

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
    
    // 验证登录状态
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

    // 检查算力（预估200字）
    const powerCheck = await consumePower(userId, 'chat', 200);
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

    const { messages, model, temperature, thinking, systemPrompt } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      await refundPower(userId, consumedAmount, 'chat参数错误');
      return new Response(
        JSON.stringify({ error: '消息格式错误' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 消息总长度限制
    const totalLength = messages.reduce((sum: number, m: { content: string }) => sum + (m.content?.length || 0), 0);
    if (totalLength > 10000) {
      await refundPower(userId, consumedAmount, 'chat消息超长');
      return new Response(
        JSON.stringify({ error: '消息总长度超过限制（10000字）' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 确保有系统提示词，自动注入内容审核约束
    const finalMessages = [...messages];
    const hasSystemMessage = finalMessages.some(msg => msg.role === 'system');
    
    if (!hasSystemMessage) {
      const systemContent = systemPrompt 
        ? CONTENT_SAFETY_PROMPT + systemPrompt 
        : DEFAULT_SYSTEM_PROMPT;
      
      finalMessages.unshift({
        role: 'system',
        content: systemContent,
      });
    } else {
      const systemIndex = finalMessages.findIndex(msg => msg.role === 'system');
      if (systemIndex !== -1) {
        finalMessages[systemIndex] = {
          role: 'system',
          content: CONTENT_SAFETY_PROMPT + finalMessages[systemIndex].content,
        };
      }
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const encoder = new TextEncoder();
    let accumulatedContent = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(finalMessages, {
            model: model || 'doubao-seed-1-8-251228',
            temperature: temperature ?? 0.7,
            thinking: thinking || 'disabled',
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              accumulatedContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          
          // 最终检测：如果累积内容是错误格式，发送错误消息
          if (isMultimodalErrorFormat(accumulatedContent)) {
            console.error('API operation event');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '图片/视频识别失败，请确保文件清晰且格式正确' })}\n\n`));
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          await refundPower(userId, consumedAmount, `chat流式错误: ${(error instanceof Error ? 'Request failed' : '未知').slice(0, 50)}`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败，如已扣费请联系管理员核对，自动退款尚未启用' })}\n\n`));
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
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
