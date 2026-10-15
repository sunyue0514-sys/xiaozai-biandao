import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 智能推导创作 - 选题生成 API
 * POST /api/creative/sessions/[id]/topics - 生成选题
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { buildTopicSystemPrompt } from '@/lib/prompt-engineering';

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
    const { direction, customerId } = body;

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
    const systemPrompt = buildTopicSystemPrompt({
      ipPositioning,
      customerName,
    });

    const userMessage = `请根据用户的需求方向，生成3-5个具体可执行的短视频选题。

【用户需求】${direction}

每个选题请包含：
1. 选题文本：具体可执行的内容方向
2. 推荐方向：A或B（A=共鸣型，B=实用型）

请确保选题贴合IP定位，有爆款潜力。`;

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

    console.log('API operation event');

    // 尝试解析 JSON
    let topics: Array<{ text: string; direction: string }> = [];
    try {
      // 提取 JSON 部分
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || 
                        responseText.match(/\{[\s\S]*\}$/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        
        // 检查是否是 { directionA: {...}, directionB: {...} } 格式
        if (parsed.directionA?.topics || parsed.directionB?.topics) {
          // 转换为 { text, direction }[] 格式
          if (parsed.directionA?.topics) {
            for (const t of parsed.directionA.topics) {
              topics.push({ text: t.title || t.text || String(t), direction: 'A' });
            }
          }
          if (parsed.directionB?.topics) {
            for (const t of parsed.directionB.topics) {
              topics.push({ text: t.title || t.text || String(t), direction: 'B' });
            }
          }
        } 
        // 检查是否是直接的 topics 数组
        else if (Array.isArray(parsed)) {
          topics = parsed.map((t) => ({
            text: t.title || t.text || String(t),
            direction: t.direction || (typeof t === 'string' ? 'A' : 'A'),
          }));
        }
        // 检查是否是 { topics: [...] } 格式
        else if (parsed.topics && Array.isArray(parsed.topics)) {
          topics = (parsed.topics as Array<Record<string, unknown>>).map((t: Record<string, unknown>) => ({
            text: String(t.title || t.text || JSON.stringify(t)),
            direction: String(t.direction || 'A'),
          }));
        }
        
        console.log('API operation event');
      }
    } catch (e) {
      console.error('API operation event');
      // 解析失败，尝试纯文本解析
      const lines = responseText.split('\n').filter((l) => l.trim() && !l.startsWith('```'));
      for (const line of lines) {
        const cleaned = line.replace(/^\d+[\.、:：]\s*/, '').trim();
        if (cleaned.length > 5) {
          topics.push({ 
            text: cleaned, 
            direction: line.includes('共鸣') || line.includes('A') ? 'A' : 'B' 
          });
        }
      }
    }

    // 更新会话
    await supabase
      .from('creative_sessions')
      .update({
        topics,
        step: 2,
        topic_direction_raw: direction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('user_id', userId);

    return NextResponse.json({
      success: true,
      data: {
        topics,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '生成选题失败' }, { status: 500 });
  }
}
