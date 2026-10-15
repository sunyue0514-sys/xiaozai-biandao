import { getAgentAccountByUserId } from '@/lib/db-store';
/**
 * 兑换码生成API
 * 
 * 新版逻辑：
 * 1. 检查用户是否有代理身份
 * 2. 检查代理层级是否有权限生成该类型
 * 3. 检查点数是否足够
 * 4. 生成兑换码时消耗点数
 * 5. 记录消耗明细
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionUserId, hasSession, getSessionUser } from '@/lib/session';
import { getUserById, createOperationLog } from '@/lib/db-store';
import { getEffectiveRole, isSuperAdmin } from '@/lib/permissions';
import { 
  CodeType, 
  POINTS_COST, 
  CODE_TYPE_REWARDS,
  getPointsCost,
  canGenerateCodeType,
} from '@/lib/points-config';
import { 
  getAgentPointsInfo, 
  consumePoints,
  AgentPointsInfo,
} from '@/lib/points-service';

// 生成兑换码
function generateCode(type: string): string {
  // 纯算力包兑换码前缀
  const prefix = type === 'trial' ? 'T' : 
                 type === 'power_10000' ? 'P1' : 
                 type === 'power_50000' ? 'P5' : 
                 type === 'power_100000' ? 'PA' :  // A=10万
                 type === 'power_400000' ? 'PD' :  // D=40万
                 'P'; // 默认算力包
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 验证权限
async function checkPermission(request: NextRequest, client: ReturnType<typeof getSupabaseClient>): Promise<{
  success: boolean;
  user?: Awaited<ReturnType<typeof getUserById>>;
  agentInfo?: AgentPointsInfo;
  error?: string;
}> {
  console.log('[兑换码生成] ========== 验证权限 ==========');
  
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.replace('Bearer ', '');
  const tokenFromCookie = request.cookies.get('sessionToken')?.value;
  const token = tokenFromHeader || tokenFromCookie;


  if (!token) {
    console.log('[兑换码生成] 没有token');
    return { success: false, error: '未登录' };
  }

  const sessionValid = await hasSession(token);
  console.log('[兑换码生成] Session验证结果:', sessionValid);

  if (!sessionValid) {
    console.log('[兑换码生成] Session验证失败');
    return { success: false, error: '未登录或登录已过期' };
  }

  const userId = await getSessionUserId(token);
  console.log('[兑换码生成] 用户ID:', userId);

  if (!userId) {
    return { success: false, error: '会话无效' };
  }

  const user = await getUserById(userId);
  if (!user) {
    return { success: false, error: '用户不存在' };
  }

  // 最高管理员有全部权限
  if ((user.role === 'super_admin')) {
    return { success: true, user };
  }

  // 检查是否有代理身份
  const { data: agent } = await client
    .from('agent_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!agent) {
    return { success: false, error: '您还不是代理，无法生成兑换码' };
  }

  const agentInfo: AgentPointsInfo = {
    agentId: agent.id,
    agentUid: agent.uid,
    pointsBalance: agent.points_balance ?? 0,
    pointsTotal: agent.points_total ?? 0,
    pointsUsed: agent.points_used ?? 0,
    agentLevel: agent.agent_level as 0 | 1 | 2 | null,
    parentId: agent.parent_id ?? undefined,
    parentUid: agent.parent_uid ?? undefined,
  };

  return { success: true, user, agentInfo };
}

// 获取兑换码列表
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  
  try {
    const { success, user, error } = await checkPermission(request, client);
    
    if (!success || !user) {
      return NextResponse.json({ success: false, error }, { status: 403 });
    }

    let query = client.from('redemption_codes').select('*');
    if (!(user.role === 'super_admin')) {
      query = query.eq('created_by', user.uid);
    }
    const { data: codes, error: queryError } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (queryError) {
      return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: codes });
  } catch (error) {
    console.error('[兑换码列表] 错误:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// 生成兑换码
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const userInfo = token && await hasSession(token) ? await getSessionUser(token) : null;
    if (!userInfo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (userInfo.role !== 'super_admin') {
      const agent = await getAgentAccountByUserId(userInfo.id);
      if (!agent || agent.status !== 'active' || !agent.canCreateCode) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const { count = 1, type = 'power_10000', maxUses = 1, expiresAt = null } = body;
    if (!Number.isSafeInteger(count) || count < 1 || count > 100 || maxUses !== 1 || typeof type !== 'string' || !Object.prototype.hasOwnProperty.call(CODE_TYPE_REWARDS, type) ||
        (expiresAt !== null && (typeof expiresAt !== 'string' || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now()))) return NextResponse.json({ success: false, error: 'Invalid redemption code configuration' }, { status: 400 });
    return NextResponse.json({ success: false, error: 'Financial write service is disabled until an atomic, idempotent ledger is configured', code: 'FINANCIAL_SERVICE_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to verify authorization' }, { status: 503 });
  }
}
