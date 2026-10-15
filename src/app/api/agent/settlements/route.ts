/**
 * 代理结算API
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import {
  getAgentAccountByUserId,
  createAgentSettlement,
  updateAgentStats,
  getAgentSubscriptions,
  getCommissionRecordsByBeneficiary,
} from '@/lib/db-store';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: 获取结算记录
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

    const userInfo = await getSessionUser(token);
    if (!userInfo) {
      return NextResponse.json({ success: false, error: '用户信息不存在' }, { status: 401 });
    }

    // 检查是否是代理
    const agent = await getAgentAccountByUserId(userInfo.id);
    if (!agent) {
      return NextResponse.json({ success: false, error: '您不是代理' }, { status: 403 });
    }

    const client = getSupabaseClient();

    // 获取结算记录
    const { data: settlements, error } = await client
      .from('agent_settlements')
      .select('*')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[结算记录] 查询失败:', error);
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: settlements || [],
      stats: {
        totalSettled: agent.settledAmount,
        pendingAmount: agent.pendingAmount,
      },
    });

  } catch (error) {
    console.error('[结算记录] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取结算记录失败' },
      { status: 500 }
    );
  }
}

/**
 * POST: 申请结算
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const userInfo = token && await hasSession(token) ? await getSessionUser(token) : null;
    if (!userInfo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const agent = await getAgentAccountByUserId(userInfo.id);
    if (!agent || agent.status !== 'active') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ success: false, error: 'Financial write service is disabled until an atomic, idempotent ledger is configured', code: 'FINANCIAL_SERVICE_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to verify authorization' }, { status: 503 });
  }
}
