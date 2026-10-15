import { getAgentAccountByUserId } from '@/lib/db-store';
/**
 * 点数划拨API
 * 
 * 功能：
 * 1. 上级给下级划拨点数
 * 2. 平台给代理充值点数
 * 3. 查询点数流水
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { SUPER_ADMIN_UIDS } from '@/lib/permissions';
import { getSessionUserId, hasSession, getSessionUser } from '@/lib/session';
import { 
  rechargeAgentPoints, 
  allocatePoints, 
  getAgentPointsInfo,
  getPointsTransactions,
  getSubAgentsConsumptionStats,
  getAgentConsumptionRecords,
} from '@/lib/points-service';

/**
 * GET: 查询点数信息
 * 
 * 参数：
 * - action: points(点数信息) | transactions(流水) | consumption(消耗记录) | sub_stats(下级统计)
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

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ success: false, error: '会话无效' }, { status: 401 });
    }

    // 获取用户信息
    const { data: user } = await client
      .from('users')
      .select('id, uid, username, role')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'points';
    const agentId = searchParams.get('agentId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const type = searchParams.get('type') || undefined;

    // 获取当前用户的代理账户
    const { data: currentAgent } = await client
      .from('agent_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const isSuperAdmin = (user.role === 'super_admin');

    switch (action) {
      case 'points': {
        // 查询点数信息
        const targetAgentId = isSuperAdmin && agentId ? parseInt(agentId) : currentAgent?.id;
        
        if (!targetAgentId) {
          // 如果没有代理账户，返回null（前端需要这个来区分是否是代理）
          return NextResponse.json({ 
            success: true, 
            data: null,
            agentInfo: null,
          });
        }

        const info = await getAgentPointsInfo(parseInt(String(targetAgentId)));
        
        return NextResponse.json({ 
          success: true, 
          data: info,
          agentInfo: info,  // 兼容前端调用
        });
      }

      case 'transactions': {
        // 查询点数流水
        const targetAgentId = isSuperAdmin && agentId ? parseInt(agentId) : currentAgent?.id;
        
        if (!targetAgentId) {
          return NextResponse.json({ 
            success: false, 
            error: '代理不存在' 
          }, { status: 404 });
        }

        const transactions = await getPointsTransactions(parseInt(String(targetAgentId)), {
          type: type as any,
          startDate,
          endDate,
          limit: 100,
        });
        
        return NextResponse.json({ 
          success: true, 
          data: transactions 
        });
      }

      case 'consumption': {
        // 查询消耗记录
        const targetAgentId = isSuperAdmin && agentId ? parseInt(agentId) : currentAgent?.id;
        
        if (!targetAgentId) {
          return NextResponse.json({ 
            success: false, 
            error: '代理不存在' 
          }, { status: 404 });
        }

        const records = await getAgentConsumptionRecords(parseInt(String(targetAgentId)), {
          startDate,
          endDate,
          limit: 100,
        });
        
        return NextResponse.json({ 
          success: true, 
          data: records 
        });
      }

      case 'sub_stats': {
        // 查询下级代理消耗统计
        if (!currentAgent && !isSuperAdmin) {
          return NextResponse.json({ 
            success: false, 
            error: '您还不是代理' 
          }, { status: 403 });
        }

        // 获取所有下级代理
        const { data: subAgents } = await client
          .from('agent_accounts')
          .select('id, uid, agent_level, points_balance, points_total, points_used')
          .eq('parent_id', currentAgent?.id);

        // 获取消耗统计
        const stats = await getSubAgentsConsumptionStats(currentAgent?.id || 0, {
          startDate,
          endDate,
        });

        // 合并数据
        const result = (subAgents || []).map(sub => {
          const stat = stats.find(s => s.agentId === sub.id);
          return {
            agentId: sub.id,
            agentUid: sub.uid,
            agentLevel: sub.agent_level,
            pointsBalance: sub.points_balance || 0,
            pointsTotal: sub.points_total || 0,
            pointsUsed: sub.points_used || 0,
            consumptionTotal: stat?.totalPoints || 0,
            consumptionCount: stat?.count || 0,
          };
        });
        
        return NextResponse.json({ 
          success: true, 
          data: result 
        });
      }

      case 'sub_consumption': {
        // 查询下级代理的消耗记录明细
        if (!currentAgent && !isSuperAdmin) {
          return NextResponse.json({ 
            success: false, 
            error: '您还不是代理' 
          }, { status: 403 });
        }

        // 获取所有下级代理的ID列表
        const { data: subAgents } = await client
          .from('agent_accounts')
          .select('id')
          .eq('parent_id', currentAgent?.id);

        if (!subAgents || subAgents.length === 0) {
          return NextResponse.json({ 
            success: true, 
            data: [] 
          });
        }

        const subAgentIds = subAgents.map(s => s.id);

        // 查询所有下级代理的消耗记录
        let query = client
          .from('code_consumption_records')
          .select('id, agent_id, agent_uid, code, code_type, points_cost, created_at')
          .in('agent_id', subAgentIds)
          .order('created_at', { ascending: false })
          .limit(200);

        if (startDate) {
          query = query.gte('created_at', startDate);
        }
        if (endDate) {
          query = query.lte('created_at', endDate);
        }

        const { data: records, error } = await query;

        if (error) {
          console.error('[下级消耗记录查询] 错误:', error);
          return NextResponse.json({ 
            success: false, 
            error: '查询失败' 
          }, { status: 500 });
        }

        const result = (records || []).map(record => ({
          id: record.id,
          agentId: record.agent_id,
          agentUid: record.agent_uid,
          code: record.code,
          codeType: record.code_type,
          pointsCost: record.points_cost,
          createdAt: record.created_at,
        }));
        
        return NextResponse.json({ 
          success: true, 
          data: result 
        });
      }

      default:
        return NextResponse.json({ 
          success: false, 
          error: '未知操作' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[点数查询] 错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '查询失败' 
    }, { status: 500 });
  }
}

/**
 * POST: 点数操作
 * 
 * 操作类型：
 * - recharge: 充值（仅平台）
 * - allocate: 划拨（上级给下级）
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('sessionToken')?.value;
    const userInfo = token && await hasSession(token) ? await getSessionUser(token) : null;
    if (!userInfo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    if (!['recharge', 'allocate'].includes(body.action) || !Number.isSafeInteger(body.points) || body.points <= 0) return NextResponse.json({ success: false, error: 'Invalid points operation' }, { status: 400 });
    if (body.action === 'recharge' && userInfo.role !== 'super_admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    if (body.action === 'allocate') {
      const agent = await getAgentAccountByUserId(userInfo.id);
      if (!agent || agent.status !== 'active') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'Financial write service is disabled until an atomic, idempotent ledger is configured', code: 'FINANCIAL_SERVICE_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to verify authorization' }, { status: 503 });
  }
}
