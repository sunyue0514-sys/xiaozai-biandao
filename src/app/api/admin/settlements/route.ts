/**
 * 管理员结算审核API
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { updateAgentStats, getAgentAccountByAgentId } from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最高管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

/**
 * GET: 获取待审核结算列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    const client = getSupabaseClient();

    const userInfo = await getSessionUser(token);
    if (!userInfo) {
      return NextResponse.json({ success: false, error: '用户信息不存在' }, { status: 401 });
    }

    // 检查是否是管理员（最高管理员或普通管理员）
    const isAdmin = (userInfo.role === 'super_admin') || ['admin', 'super_admin'].includes(userInfo.role);
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    // 获取 URL 参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '100');

    // 获取结算列表
    let query = client
      .from('agent_settlements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: settlements, error } = await query;

    if (error) {
      console.error('[结算审核] 查询失败:', error);
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
    }

    // 获取统计
    const { data: stats } = await client
      .from('agent_settlements')
      .select('status, amount')
      .in('status', ['pending', 'approved', 'rejected', 'completed']);

    const summary = {
      pending: 0,
      pendingAmount: 0,
      approved: 0,
      approvedAmount: 0,
      completed: 0,
      completedAmount: 0,
    };

    (stats || []).forEach(s => {
      if (s.status === 'pending') {
        summary.pending++;
        summary.pendingAmount += s.amount;
      } else if (s.status === 'approved') {
        summary.approved++;
        summary.approvedAmount += s.amount;
      } else if (s.status === 'completed') {
        summary.completed++;
        summary.completedAmount += s.amount;
      }
    });

    return NextResponse.json({
      success: true,
      data: settlements || [],
      summary: {
        pending: summary.pending,
        pendingAmount: Math.round(summary.pendingAmount * 100) / 100,
        approved: summary.approved,
        approvedAmount: Math.round(summary.approvedAmount * 100) / 100,
        completed: summary.completed,
        completedAmount: Math.round(summary.completedAmount * 100) / 100,
      },
    });

  } catch (error) {
    console.error('[结算审核] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取结算列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST: 审核结算
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const userInfo = token && await hasSession(token) ? await getSessionUser(token) : null;
    if (!userInfo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (userInfo.role !== 'super_admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ success: false, error: 'Financial write service is disabled until an atomic, idempotent ledger is configured', code: 'FINANCIAL_SERVICE_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to verify authorization' }, { status: 503 });
  }
}
