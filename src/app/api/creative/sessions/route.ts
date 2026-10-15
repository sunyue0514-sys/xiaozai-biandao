import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 智能推导创作 - 会话管理 API
 * GET /api/creative/sessions - 获取会话列表
 * POST /api/creative/sessions - 创建新会话
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await getSupabaseClient();

    // 先获取会话列表
    const { data: sessions, error } = await supabase
      .from('creative_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('API operation event');
      return NextResponse.json({ error: '获取会话列表失败' }, { status: 500 });
    }

    // 如果有会话，获取对应的客户信息
    let customerMap: Record<string, { name: string; avatar_url?: string }> = {};
    if (sessions && sessions.length > 0) {
      const customerIds = sessions
        .map((s: any) => s.customer_id)
        .filter(Boolean);
      
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, avatar_url')
          .eq('uid', String(userId))
          .in('id', customerIds.map((id: string) => parseInt(id)));
        
        if (customers) {
          customerMap = customers.reduce((acc: Record<string, any>, c: any) => {
            acc[c.id.toString()] = { name: c.name, avatar_url: c.avatar_url };
            return acc;
          }, {});
        }
      }
    }

    // 合并客户信息
    const sessionsWithCustomer = sessions?.map((s: any) => ({
      ...s,
      customer: s.customer_id ? customerMap[parseInt(s.customer_id)] || null : null
    })) || [];

    // 获取总数
    const { count } = await supabase
      .from('creative_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      data: sessionsWithCustomer,
      total: count || 0,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { customerId, contentType, targetUsers, differentiator } = body;

    const supabase = await getSupabaseClient();

    // 如果 customerId 存在，验证格式（UUID 或整数转字符串）
    let validCustomerId: number | null = null;
    if (customerId !== undefined && customerId !== null && customerId !== '') {
      const id = typeof customerId === 'number' ? customerId
        : typeof customerId === 'string' && /^\d+$/.test(customerId) ? Number(customerId) : NaN;
      if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
        return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
      }
      const { data: customer, error: customerError } = await supabase.from('customers')
        .select('id').eq('id', id).eq('uid', String(userId)).maybeSingle();
      if (customerError) return NextResponse.json({ error: 'Customer lookup failed' }, { status: 500 });
      if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      validCustomerId = id;
    }

    const { data, error } = await supabase
      .from('creative_sessions')
      .insert({
        user_id: userId,
        customer_id: validCustomerId,
        content_type: contentType || null,
        target_users: targetUsers || null,
        differentiator: differentiator || null,
        title: `创作会话-${new Date().toLocaleDateString('zh-CN')}`,
        status: 'draft',
        step: 1,
      })
      .select()
      .single();

    if (error) {
      console.error('API operation event');
      return NextResponse.json({ error: '创建会话失败' }, { status: 500 });
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
