import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser } from '@/lib/db-store';
import { getSessionUserId, hasSession, getSessionUser } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { calculateAndDistributeCommission } from '@/lib/commission-calculator';

// 最高管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

// 算力包类型映射：兑换码类型 -> 会员类型（仅用于标识，实际以兑换码中的 rewardDays 为准）
// 注意：现在所有兑换码都是算力包，不再有纯会员兑换码
const CODE_TYPE_TO_MEMBER_TYPE: Record<string, string> = {
  'power_10000': 'power',   // 算力包10000
  'power_50000': 'power',   // 算力包50000
  'power_100000': 'power',  // 算力包100000
  'power_400000': 'power',  // 算力包400000
};

// 兑换码对应的价格（用于计算代理佣金）
const CODE_TYPE_PRICES: Record<string, number> = {
  'power_10000': 28.9,     // 算力包10000
  'power_50000': 99.9,     // 算力包50000
  'power_100000': 199,     // 算力包100000
  'power_400000': 699,     // 算力包400000
};

// 兑换码验证和兑换API
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const userInfo = token && await hasSession(token) ? await getSessionUser(token) : null;
    if (!userInfo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { code } = await request.json();
    if (typeof code !== 'string' || !code.trim() || code.trim().length > 128) return NextResponse.json({ success: false, error: 'Invalid redemption code' }, { status: 400 });
    return NextResponse.json({ success: false, error: 'Financial write service is disabled until an atomic, idempotent ledger is configured', code: 'FINANCIAL_SERVICE_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to verify authorization' }, { status: 503 });
  }
}

