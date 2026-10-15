import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 智能推导创作 - 正文生成 API（流式SSE）
 * POST /api/creative/sessions/[id]/generate - 生成正文
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { buildContentSystemPrompt } from '@/lib/prompt-engineering';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '用户信息无效' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      topic, 
      opening, 
      openingHookType,
      framework, 
      contentType: ct, 
      customerId, 
      targetUsers, 
      differentiator,
      wordCount = 600,
      saveToSession = true,
    } = body;

    // 获取会话信息（用于获取客户档案）
    let ipPositioning = null;
    let customerName = null;
    const supabase = await getSupabaseClient();
    
    if (saveToSession) {
      const { data, error } = await supabase
        .from('creative_sessions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        return NextResponse.json({ error: '会话不存在' }, { status: 404 });
      }
      
      // 获取客户信息
      if (data?.customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('name, ip_positioning')
          .eq('id', parseInt(data.customer_id))
        .eq('uid', String(userId))
          .single();
        if (customerData) {
          ipPositioning = customerData.ip_positioning;
          customerName = customerData.name;
        }
      }
    } else if (customerId) {
      const { data } = await supabase
        .from('customers')
        .select('name, ip_positioning')
        .eq('id', customerId)
        .eq('uid', String(userId))
        .single();
      if (data) {
        ipPositioning = data.ip_positioning;
        customerName = data.name;
      }
    }

    // 构建 Prompt
    const systemPrompt = buildContentSystemPrompt({
      topic,
      opening,
      framework,
      contentType: ct,
      ipPositioning,
      customerName,
      targetUsers,
      differentiator,
      wordCount,
    });

    const userMessage = `请根据以上框架和开篇，生成完整的口播文案。

【选题】${topic}
【选定开篇】${opening}
【开篇钩子类型】${openingHookType || '未指定'}
【内容类型】${ct}
【字数要求】约${wordCount}字（约${Math.round(wordCount / 150 * 60)}秒口播）

请直接输出文案，不要有任何格式前缀。`;

    // 创建 LLM 客户端
    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config({ timeout: 180000 });
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        
        try {
          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.75,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          // 如果需要保存到会话
          if (saveToSession && fullContent) {
            await supabase
              .from('creative_sessions')
              .update({
                opening,
                opening_choice: 'A',
                final_content: fullContent,
                framework,
                step: 6,
                status: 'completed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', id).eq('user_id', userId);
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`));
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
    return NextResponse.json({ error: '生成正文失败' }, { status: 500 });
  }
}
