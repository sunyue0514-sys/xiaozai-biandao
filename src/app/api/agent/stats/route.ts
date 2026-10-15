/**
 * 代理层级统计 API
 * 支持按层级统计代理数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getAllAgents, getAgentAccountByUserId } from '@/lib/db-store';
import { getAgentCommissionStats } from '@/lib/commission-calculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最高管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

/**
 * GET: 获取代理统计数据
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

    // 检查是否是管理员
    const isSuperAdmin = (userInfo.role === 'super_admin');
    const isAdmin = ['admin', 'super_admin'].includes(userInfo.role);
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    // 获取代理列表
    const agents = await getAllAgents();
    
    // 分离一级和二级代理
    const level1Agents = agents.filter(a => a.agentLevel === 1 || (!a.agentLevel && !a.parentId));
    const level2Agents = agents.filter(a => a.agentLevel === 2 || (!a.agentLevel && a.parentId));

    // 最高管理员统计
    if (isSuperAdmin) {
      // 平台总收益
      const { data: platformCommissions } = await client
        .from('commission_records')
        .select('amount')
        .eq('beneficiary_uid', SUPER_ADMIN_UIDS[0]);
      
      const platformTotalCommission = (platformCommissions || []).reduce(
        (sum, r) => sum + parseFloat(r.amount || '0'), 
        0
      );

      // 今日数据
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCommissions } = await client
        .from('commission_records')
        .select('amount')
        .eq('beneficiary_uid', SUPER_ADMIN_UIDS[0])
        .gte('created_at', today);
      
      const todayCommission = (todayCommissions || []).reduce(
        (sum, r) => sum + parseFloat(r.amount || '0'), 
        0
      );

      // 本月数据
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: monthCommissions } = await client
        .from('commission_records')
        .select('amount')
        .eq('beneficiary_uid', SUPER_ADMIN_UIDS[0])
        .gte('created_at', monthStart);
      
      const monthCommission = (monthCommissions || []).reduce(
        (sum, r) => sum + parseFloat(r.amount || '0'), 
        0
      );

      // 总用户数
      const { count: totalUsers } = await client
        .from('users')
        .select('*', { count: 'exact', head: true });

      // 今日新增用户
      const { count: todayNewUsers } = await client
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // 兑换码统计
      const { count: totalCodes } = await client
        .from('redemption_codes')
        .select('*', { count: 'exact', head: true });

      const { count: usedCodes } = await client
        .from('redemption_codes')
        .select('*', { count: 'exact', head: true })
        .gt('used_count', 0);

      // 结算统计
      const { data: pendingSettlements } = await client
        .from('commission_records')
        .select('amount')
        .eq('settlement_status', 'pending');
      
      const pendingSettlementAmount = (pendingSettlements || []).reduce(
        (sum, r) => sum + parseFloat(r.amount || '0'), 
        0
      );

      return NextResponse.json({
        success: true,
        data: {
          isSuperAdmin: true,
          // 平台概览
          platformStats: {
            totalUsers: totalUsers || 0,
            todayNewUsers: todayNewUsers || 0,
            totalAgents: agents.length,
            level1Agents: level1Agents.length,
            level2Agents: level2Agents.length,
          },
          // 收益统计
          revenueStats: {
            platformTotalCommission,
            todayCommission,
            monthCommission,
          },
          // 兑换码统计
          codeStats: {
            totalCodes: totalCodes || 0,
            usedCodes: usedCodes || 0,
          },
          // 结算统计
          settlementStats: {
            pendingSettlementAmount,
          },
          // 一级代理列表
          level1Agents: level1Agents.map(a => ({
            id: a.id,
            uid: a.uid,
            agentPath: a.agentPath,
            commissionRate: a.commissionRate,
            platformRate: a.platformRate,
            inviteCount: a.inviteCount,
            paidUserCount: a.paidUserCount,
            totalSales: a.totalSales,
            totalCommission: a.totalCommission,
            status: a.status,
          })),
          // 二级代理列表
          level2Agents: level2Agents.map(a => ({
            id: a.id,
            uid: a.uid,
            agentPath: a.agentPath,
            parentId: a.parentId,
            parentUid: a.parentUid,
            commissionRate: a.commissionRate,
            inviteCount: a.inviteCount,
            paidUserCount: a.paidUserCount,
            totalCommission: a.totalCommission,
            status: a.status,
          })),
        },
      });
    }

    // 一级代理统计
    const currentAgent = await getAgentAccountByUserId(userInfo.id);
    if (!currentAgent) {
      return NextResponse.json({ 
        success: false, 
        error: '您还不是代理' 
      }, { status: 400 });
    }

    if (currentAgent.agentLevel === 1 || !currentAgent.parentId) {
      // 获取下级代理
      const subAgents = agents.filter(a => a.parentId === currentAgent.id);
      
      // 获取推广用户（直接推广 + 下级代理推广）
      const { data: directUsers } = await client
        .from('users')
        .select('id')
        .eq('inviter_id', userInfo.id);
      
      // 下级代理的用户
      let subAgentUserCount = 0;
      for (const sub of subAgents) {
        const { count } = await client
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('inviter_id', sub.userId);
        subAgentUserCount += count || 0;
      }

      // 佣金统计
      const commissionStats = await getAgentCommissionStats(userInfo.id);

      // 兑换码统计
      const { count: totalCodes } = await client
        .from('redemption_codes')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userInfo.uid);

      const { count: usedCodes } = await client
        .from('redemption_codes')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', userInfo.uid)
        .gt('used_count', 0);

      return NextResponse.json({
        success: true,
        data: {
          isSuperAdmin: false,
          agentLevel: 1,
          // 用户统计
          userStats: {
            directUsers: directUsers?.length || 0,
            subAgentUsers: subAgentUserCount,
            totalUsers: (directUsers?.length || 0) + subAgentUserCount,
          },
          // 下级代理
          subAgents: subAgents.map(a => ({
            id: a.id,
            uid: a.uid,
            agentPath: a.agentPath,
            commissionRate: a.commissionRate,
            inviteCount: a.inviteCount,
            paidUserCount: a.paidUserCount,
            totalCommission: a.totalCommission,
            status: a.status,
          })),
          // 佣金统计
          commissionStats,
          // 兑换码统计
          codeStats: {
            totalCodes: totalCodes || 0,
            usedCodes: usedCodes || 0,
          },
          // 代理信息
          agentInfo: {
            agentPath: currentAgent.agentPath,
            platformRate: currentAgent.platformRate,
            canCreateCode: currentAgent.canCreateCode,
            canCreateUser: currentAgent.canCreateUser,
          },
        },
      });
    }

    // 二级代理统计
    const commissionStats = await getAgentCommissionStats(userInfo.id);

    // 推广用户
    const { data: promotedUsers } = await client
      .from('users')
      .select('id, username, member_type, created_at')
      .eq('inviter_id', userInfo.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      success: true,
      data: {
        isSuperAdmin: false,
        agentLevel: 2,
        // 用户统计
        userStats: {
          totalUsers: promotedUsers?.length || 0,
          users: promotedUsers || [],
        },
        // 佣金统计
        commissionStats,
        // 代理信息
        agentInfo: {
          agentPath: currentAgent.agentPath,
          commissionRate: currentAgent.commissionRate,
          parentUid: currentAgent.parentUid,
        },
      },
    });

  } catch (error) {
    console.error('[代理统计] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
