import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 智能推导创作 - 开篇生成 API
 * POST /api/creative/sessions/[id]/openings - 生成开篇（双版本）
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { buildOpeningSystemPrompt } from '@/lib/prompt-engineering';

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
    const { topic, framework, contentType: ct, customerId, targetUsers, differentiator } = body;

    const supabase = await getSupabaseClient();

    // 获取会话信息
    const { data: sessionData, error: sessionError } = await supabase
      .from('creative_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (sessionError) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    // 获取客户档案的 IP 定位
    let ipPositioning = null;
    let customerName = null;
    if (sessionData?.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('name, ip_positioning')
        .eq('id', parseInt(sessionData.customer_id))
        .eq('uid', String(userId))
        .single();
      if (customerData) {
        ipPositioning = customerData.ip_positioning;
        customerName = customerData.name;
      }
    }

    // 构建 Prompt
    const systemPrompt = buildOpeningSystemPrompt({
      topic,
      framework,
      contentType: ct,
      ipPositioning,
      customerName,
      targetUsers,
      differentiator,
    });

    const userMessage = `请根据以上要求，为这个选题和框架生成两个不同风格的开篇方案。

【选题】${topic}
【内容类型】${ct}

请确保两个开篇有明显不同的钩子类型，吸引不同偏好的观众。`;

    // 创建 LLM 客户端
    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // 使用流式调用收集结果
    let responseText = '';
    const stream = client.stream(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.8,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        responseText += chunk.content.toString();
      }
    }

    // 尝试解析 JSON
    let openings = null;
    try {
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                        responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        openings = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        openings = { raw: responseText };
      }
    } catch {
      openings = { raw: responseText };
    }

    // 更新会话
    await supabase
      .from('creative_sessions')
      .update({
        opening: openings,
        step: 5,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('user_id', userId);

    return NextResponse.json({
      success: true,
      data: {
        openings,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '生成开篇失败' }, { status: 500 });
  }
}
