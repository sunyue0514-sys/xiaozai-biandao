/**
 * 代理创建用户 API
 * 一级代理可创建用户并绑定兑换码
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAgentAccountByUserId, updateAgentAccount } from '@/lib/db-store';
import { generateUniqueReferralCode } from '@/lib/db-utils';
import { hashPassword } from '@/lib/password';
import { POINTS_COST } from '@/lib/points-config';
import { consumePoints } from '@/lib/points-service';
import { isSuperAdmin } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST: 创建用户并绑定兑换码
 * 请求体: {
 *   username: string,
 *   password: string,
 *   codeType: 'trial' | 'monthly' | 'yearly' | 'permanent',
 *   codeCount?: number,  // 可选，批量创建兑换码数量，默认1
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const userInfo = token && await hasSession(token) ? await getSessionUser(token) : null;
    if (!userInfo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const agent = await getAgentAccountByUserId(userInfo.id);
    if (!agent || agent.status !== 'active' || !agent.canCreateUser) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ success: false, error: 'Financial write service is disabled until an atomic, idempotent ledger is configured', code: 'FINANCIAL_SERVICE_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to verify authorization' }, { status: 503 });
  }
}

/**
 * 生成兑换码
 */
function generateCodeValue(type: string): string {
  const prefix = type === 'trial' ? 'TRY' :
                 type === 'monthly' ? 'MON' :
                 type === 'yearly' ? 'YEA' :
                 'PER';
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}-${random}`;
}

/**
 * 获取类型名称
 */
function getTypeName(type: string): string {
  const names: Record<string, string> = {
    trial: '体验',
    monthly: '月卡',
    yearly: '年卡',
    permanent: '永久',
  };
  return names[type] || type;
}
