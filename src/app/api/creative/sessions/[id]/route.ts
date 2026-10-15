import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 智能推导创作 - 会话详情 API
 * GET /api/creative/sessions/[id] - 获取会话详情
 * PUT /api/creative/sessions/[id] - 更新会话
 * DELETE /api/creative/sessions/[id] - 删除会话
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
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
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('creative_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '会话不存在' }, { status: 404 });
      }
      console.error('API operation event');
      return NextResponse.json({ error: '获取会话详情失败' }, { status: 500 });
    }

    // 获取关联的客户信息
    let customer = null;
    if (data?.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('id, name, avatar_url')
        .eq('id', Number(data.customer_id))
        .eq('uid', String(userId))
        .single();
      customer = customerData;
    }

    return NextResponse.json({
      success: true,
      data: { ...data, customer },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":false});
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
    const supabase = await getSupabaseClient();

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // 可更新的字段
    const updatableFields = [
      'customer_id',
      'content_type',
      'target_users',
      'differentiator',
      'topic',
      'topic_direction',
      'framework',
      'opening',
      'opening_choice',
      'final_content',
      'status',
      'step',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.customer_id !== undefined) {
      const value = body.customer_id;
      if (value === null || value === '') {
        updateData.customer_id = null;
      } else {
        const customerId = typeof value === 'number' ? value
          : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
        if (!Number.isInteger(customerId) || customerId <= 0 || customerId > 2147483647) {
          return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
        }
        const { data: customer, error: customerError } = await supabase.from('customers')
          .select('id').eq('id', customerId).eq('uid', String(userId)).maybeSingle();
        if (customerError) return NextResponse.json({ error: 'Customer lookup failed' }, { status: 500 });
        if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        updateData.customer_id = customerId;
      }
    }

    const { data, error } = await supabase
      .from('creative_sessions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('API operation event');
      return NextResponse.json({ error: '更新会话失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
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
    const supabase = await getSupabaseClient();

    const { error } = await supabase
      .from('creative_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('API operation event');
      return NextResponse.json({ error: '删除会话失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
