import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 智能推导创作 - 框架生成 API
 * POST /api/creative/sessions/[id]/framework - 生成框架
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { buildFrameworkSystemPrompt, type ContentType } from '@/lib/prompt-engineering';

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
    const { topic, topicDirection, contentType: ct, customerId, targetUsers, differentiator } = body;

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
    const systemPrompt = buildFrameworkSystemPrompt({
      topic,
      contentType: ct as ContentType,
      ipPositioning,
      customerName,
      targetUsers,
      differentiator,
    });

    const userMessage = `请根据以上要求，为这个选题设计最佳的内容框架。

【选题】${topic}
【用户选择的方向】${topicDirection === 'A' ? '方向A' : '方向B'}

请设计一个完整的框架结构，确保：
1. 框架类型选择合适
2. 每段目的明确
3. 有爆点设计`;

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
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        responseText += chunk.content.toString();
      }
    }

    // 尝试解析 JSON
    let framework = null;
    try {
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                        responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        framework = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        framework = { raw: responseText };
      }
    } catch {
      framework = { raw: responseText };
    }

    // 更新会话
    await supabase
      .from('creative_sessions')
      .update({
        topic: { ...(sessionData.topic || {}), selected: topic, direction: topicDirection },
        framework,
        step: 4,
        topic_direction: topicDirection,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('user_id', userId);

    return NextResponse.json({
      success: true,
      data: {
        framework,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '生成框架失败' }, { status: 500 });
  }
}
