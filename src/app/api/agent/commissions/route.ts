/**
 * 代理佣金记录API
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import {
  getAgentAccountByUserId,
  getCommissionRecordsByBeneficiary,
  getAgentSubscriptions,
  getPendingCommissionRecords,
} from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: 获取代理的佣金记录
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

    // 获取 URL 参数
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'commission'; // commission | subscriptions | pending
    const limit = parseInt(searchParams.get('limit') || '50');

    if (type === 'subscriptions') {
      // 获取开通记录
      const subscriptions = await getAgentSubscriptions(agent.id, limit);
      
      return NextResponse.json({
        success: true,
        data: subscriptions,
        total: subscriptions.length,
      });
    }

    if (type === 'pending') {
      // 获取待结算佣金
      const pending = await getPendingCommissionRecords(userInfo.id);
      
      // 计算待结算总额
      const totalPending = pending.reduce((sum, r) => sum + r.amount, 0);
      
      return NextResponse.json({
        success: true,
        data: pending,
        total: pending.length,
        totalPending: Math.round(totalPending * 100) / 100,
      });
    }

    // 获取佣金记录
    const records = await getCommissionRecordsByBeneficiary(userInfo.id, limit);

    // 计算统计
    const totalCommission = records.reduce((sum, r) => sum + r.amount, 0);
    const pendingCommission = records
      .filter(r => r.settlementStatus === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);
    const settledCommission = records
      .filter(r => r.settlementStatus === 'settled')
      .reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      success: true,
      data: records,
      total: records.length,
      stats: {
        totalCommission: Math.round(totalCommission * 100) / 100,
        pendingCommission: Math.round(pendingCommission * 100) / 100,
        settledCommission: Math.round(settledCommission * 100) / 100,
      },
      agent: {
        agentPath: agent.agentPath,
        totalCommission: agent.totalCommission,
        pendingAmount: agent.pendingAmount,
        settledAmount: agent.settledAmount,
      },
    });

  } catch (error) {
    console.error('[佣金记录] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取佣金记录失败' },
      { status: 500 }
    );
  }
}
