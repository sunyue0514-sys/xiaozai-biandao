/**
 * 代理状态API
 * 获取代理的完整状态信息
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import {
  getAgentAccountByUserId,
  getAgentUsers,
  getCommissionRecordsByBeneficiary,
  getAgentSubscriptions,
  getAllAgents,
} from '@/lib/db-store';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最高管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

// 默认域名
const DEFAULT_DOMAIN = process.env.COZE_PROJECT_DOMAIN_DEFAULT || '';

/**
 * GET: 获取代理状态
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

    // 检查是否是最高管理员 - 最高管理员优先显示管理界面
    const client = getSupabaseClient();
    const isSuperAdmin = (userInfo.role === 'super_admin');
    if (isSuperAdmin) {
      return await getAdminOverview(client, userInfo, true);
    }

    // 检查是否是代理
    const agent = await getAgentAccountByUserId(userInfo.id);
    
    if (!agent) {
      // 不是代理，返回非代理状态
      return NextResponse.json({
        success: true,
        data: {
          isAgent: false,
          message: '您还不是代理，请联系管理员开通',
        },
      });
    }

    // 获取下级用户列表
    // 注意：inviter_id 存储的是代理的 user_id，不是 agent_accounts.id
    const users = await getAgentUsers(agent.userId, 50);
    
    // 获取佣金记录
    const commissions = await getCommissionRecordsByBeneficiary(userInfo.id, 20);
    
    // 获取开通记录
    const subscriptions = await getAgentSubscriptions(agent.id, 20);
    
    // 计算统计数据
    const activeUsers = users.filter(u => u.memberExpiry && new Date(u.memberExpiry) > new Date()).length;
    
    // 构建邀请链接
    const inviteLink = `${DEFAULT_DOMAIN}/login?ref=${agent.agentPath}`;

    // 等级进度
    const levelThresholds = [
      { name: '新手代理', threshold: 0 },
      { name: '铜牌代理', threshold: 500 },
      { name: '银牌代理', threshold: 2000 },
      { name: '金牌代理', threshold: 5000 },
      { name: '钻石代理', threshold: 10000 },
    ];
    
    let currentLevel = levelThresholds[0].name;
    let nextLevel: string | null = levelThresholds[1].name;
    let targetEarnings: number | null = levelThresholds[1].threshold;
    
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (agent.totalCommission >= levelThresholds[i].threshold) {
        currentLevel = levelThresholds[i].name;
        nextLevel = i < levelThresholds.length - 1 ? levelThresholds[i + 1].name : null;
        targetEarnings = i < levelThresholds.length - 1 ? levelThresholds[i + 1].threshold : null;
        break;
      }
    }
    
    const progress = targetEarnings 
      ? Math.min(100, (agent.totalCommission / targetEarnings) * 100)
      : 100;

    return NextResponse.json({
      success: true,
      data: {
        isAgent: true,
        level: currentLevel,
        agentLevel: agent.agentLevel, // 代理层级：0=总代, 1=一级代理, 2=二级代理
        commissionRate: agent.commissionRate,
        totalEarnings: agent.totalCommission,
        thisMonthEarnings: commissions
          .filter(c => {
            const created = new Date(c.createdAt);
            const now = new Date();
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
          })
          .reduce((sum, c) => sum + c.amount, 0),
        inviteCount: agent.inviteCount,
        activeUsers: activeUsers,
        withdrawable: agent.pendingAmount,
        withdrawn: agent.settledAmount,
        inviteCode: agent.agentPath,
        inviteLink: inviteLink,
        agentPath: agent.agentPath,
        recentCommissions: commissions.slice(0, 10).map(c => ({
          id: c.id,
          userId: c.userId,
          userName: c.userName,
          amount: c.originalPrice,
          commission: c.amount,
          createdAt: c.createdAt,
        })),
        invitees: users.slice(0, 10).map(u => ({
          id: u.id,
          name: u.username,
          phone: u.phone || '',
          registerTime: u.createdAt,
          status: u.memberExpiry && new Date(u.memberExpiry) > new Date() ? 'active' : 'inactive',
          totalSpent: 0,
        })),
        levelProgress: {
          current: currentLevel,
          next: nextLevel,
          progress: progress,
          requirement: nextLevel ? `累计佣金达到 ¥${targetEarnings}` : null,
          currentEarnings: agent.totalCommission,
          targetEarnings: targetEarnings,
        },
        users: users,
        subscriptions: subscriptions,
        commissions: commissions,
      },
    });

  } catch (error) {
    console.error('[代理状态] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取代理状态失败' },
      { status: 500 }
    );
  }
}

/**
 * 获取最高管理员概览
 */
async function getAdminOverview(client: ReturnType<typeof getSupabaseClient>, userInfo: { id: number; uid: string; username?: string; role?: string }, isSuperAdmin: boolean = false) {
  // 获取所有代理
  const allAgents = await getAllAgents();
  
  // 获取待审核结算
  const { data: pendingSettlements } = await client
    .from('agent_settlements')
    .select('amount')
    .eq('status', 'pending');
  
  // 获取所有佣金记录（最高管理员作为受益人）
  const commissions = await getCommissionRecordsByBeneficiary(userInfo.id, 50);
  
  // 统计数据
  const totalAgents = allAgents.length;
  const totalSales = allAgents.reduce((sum, a) => sum + a.totalSales, 0);
  const totalCommission = allAgents.reduce((sum, a) => sum + a.totalCommission, 0);
  const pendingAmount = (pendingSettlements || []).reduce((sum, s) => sum + parseFloat(s.amount || '0'), 0);
  
  // 获取最近的开通记录
  const { data: recentSubscriptions } = await client
    .from('agent_subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    success: true,
    data: {
      isAgent: true,
      isSuperAdmin: isSuperAdmin,
      level: isSuperAdmin ? '最高管理员' : '管理员',
      commissionRate: 0.5, // 管理员默认50%
      totalEarnings: totalCommission,
      thisMonthEarnings: commissions
        .filter(c => {
          const created = new Date(c.createdAt);
          const now = new Date();
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        })
        .reduce((sum, c) => sum + c.amount, 0),
      inviteCount: totalAgents,
      activeUsers: allAgents.filter(a => a.status === 'active').length,
      withdrawable: 0, // 最高管理员不需要申请结算
      withdrawn: 0,
      inviteCode: 'ADMIN',
      inviteLink: `${DEFAULT_DOMAIN}/login?ref=ADMIN`,
      agentPath: 'ADMIN',
      levelProgress: {
        current: isSuperAdmin ? '最高管理员' : '管理员',
        next: null,
        progress: 100,
        requirement: null,
        currentEarnings: totalCommission,
        targetEarnings: null,
      },
      // 管理员专属数据
      adminStats: {
        totalAgents: totalAgents,
        totalSales: totalSales,
        totalCommission: totalCommission,
        pendingSettlements: pendingAmount,
      },
      // 所有代理列表
      allAgents: allAgents.map(a => ({
        id: a.id,
        uid: a.uid,
        agentPath: a.agentPath,
        commissionRate: a.commissionRate,
        inviteCount: a.inviteCount,
        paidUserCount: a.paidUserCount,
        totalSales: a.totalSales,
        totalCommission: a.totalCommission,
        pendingAmount: a.pendingAmount,
        settledAmount: a.settledAmount,
        status: a.status,
        createdAt: a.createdAt,
      })),
      // 最近开通记录
      recentSubscriptions: (recentSubscriptions || []).map(s => ({
        id: s.id,
        agentUid: s.agent_uid,
        userName: s.user_name,
        planName: s.plan_name,
        originalPrice: parseFloat(s.original_price || '0'),
        commissionAmount: parseFloat(s.commission_amount || '0'),
        createdAt: s.created_at,
      })),
      // 佣金记录
      commissions: commissions,
      users: [],
      subscriptions: [],
    },
  });
}
