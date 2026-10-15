import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 智能推导创作 - 文案微调 API
 * POST /api/creative/sessions/[id]/refine - 微调文案
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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
    const { content, instruction } = body;

    if (!content || !instruction) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

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
    if (sessionData?.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('ip_positioning')
        .eq('id', parseInt(sessionData.customer_id))
        .eq('uid', String(userId))
        .single();
      if (customerData) {
        ipPositioning = customerData.ip_positioning;
      }
    }

    // 构建微调 Prompt
    const systemPrompt = `你是一位专业的短视频文案专家。请根据用户的修改指令，对文案进行精确修改。

## 修改原则
1. 只修改用户明确要求修改的部分
2. 保持其他部分不变
3. 确保修改后文案流畅自然
4. 保持原有的IP定位和风格特征（如果有）

## IP定位约束（必须遵守）
${ipPositioning ? `
【账号定位】
- 账号身份：${ipPositioning.identity?.title || '未设置'}
- 擅长领域：${ipPositioning.domain || '未设置'}
- 目标用户：${ipPositioning.targetAudience?.join('、') || '未设置'}
- 语言风格：${ipPositioning.toneAndStyle || '未设置'}

请务必保持以上定位特征不变。
` : '（无IP定位约束）'}

## 输出要求
直接输出修改后的完整文案，不要有任何格式前缀或说明。`;

    const userMessage = `## 原文案
${content}

## 修改指令
${instruction}

请根据以上指令修改文案，直接输出修改后的完整内容。`;

    // 创建 LLM 客户端
    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // 使用流式调用收集结果
    let refinedContent = '';
    const stream = client.stream(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.6,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        refinedContent += chunk.content.toString();
      }
    }

    // 更新会话（添加到修改历史）
    const refineHistory = sessionData.refine_history || [];
    refineHistory.push({
      original: content,
      instruction,
      result: refinedContent,
      createdAt: new Date().toISOString(),
    });

    await supabase
      .from('creative_sessions')
      .update({
        final_content: refinedContent,
        refine_history: refineHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('user_id', userId);

    return NextResponse.json({
      success: true,
      data: {
        content: refinedContent,
        history: refineHistory,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '微调文案失败' }, { status: 500 });
  }
}
