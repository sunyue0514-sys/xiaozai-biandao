/**
 * 佣金计算模块
 * 支持三层代理体系的佣金分成计算
 * 
 * 核心规则：
 * 1. 超级管理员生成的兑换码不产生佣金（平台承担成本）
 * 2. 代理生成的兑换码产生佣金，按分成比例分配
 * 3. 二级代理推广时，佣金分给兑换码创建者（上级代理）和二级代理（推广代理）
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';
import { 
  getAgentAccountByUserId, 
  createCommissionRecord, 
  updateAgentStats,
  getUserById,
} from '@/lib/db-store';

// 最高管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

// 会员类型价格映射
const CODE_TYPE_PRICES: Record<string, number> = {
  'trial': 0,
  'monthly': 99,
  'yearly': 999,
  'power': 0,  // 算力兑换码，根据算力价值计算
};

// 算力价格映射（每1000算力约等于1元）
const POWER_TO_PRICE_RATE = 0.001;

/**
 * 佣金计算结果
 */
interface CommissionResult {
  success: boolean;
  distributions: CommissionDistribution[];
  error?: string;
}

/**
 * 佣金分配详情
 */
interface CommissionDistribution {
  beneficiaryId: number;
  beneficiaryUid: string;
  beneficiaryRole: 'super_admin' | 'level1_agent' | 'level2_agent';
  amount: number;
  rate: number;
  reason: string;
}

/**
 * 检查用户是否是超级管理员
 */
function isSuperAdminUser(uid: string): boolean {
  return SUPER_ADMIN_UIDS.includes(uid);
}

/**
 * 计算并分配佣金
 * 
 * @param user 使用兑换码的用户
 * @param codeType 兑换码类型 (monthly, yearly, power 等)
 * @param price 实际价格
 * @param sourceId 兑换码 ID
 * @param codeCreatorId 兑换码创建者 ID
 * @param codeCreatorUid 兑换码创建者 UID（用于判断是否是超级管理员）
 * @param rewardPower 奖励的算力数量（用于算力兑换码的价格计算）
 */
export async function calculateAndDistributeCommission(
  user: { id: number; username?: string; inviterId?: number },
  codeType: string,
  price: number,
  sourceId: number | undefined,
  codeCreatorId: number | undefined,
  rewardPower: number = 0,
  codeCreatorUid?: string
): Promise<CommissionResult> {
  const client = getSupabaseClient();
  
  const distributions: CommissionDistribution[] = [];
  
  // 算力兑换码：根据算力价值计算价格
  let effectivePrice = price;
  if (codeType === 'power' && price <= 0 && rewardPower > 0) {
    effectivePrice = Math.round(rewardPower * POWER_TO_PRICE_RATE * 100) / 100;
  }
  
  try {
    // 1. 获取兑换码创建者的代理账户
    const codeCreator = codeCreatorId ? await getAgentAccountByUserId(codeCreatorId) : null;
    
    // 无论是否有佣金，都要更新代理的邀请统计
    if (codeCreator) {
      // 更新代理的邀请用户数
      const newInviteCount = codeCreator.inviteCount + 1;
      await updateAgentStats(codeCreator.id, {
        inviteCount: newInviteCount,
      });
      
      // 如果有推广代理（用户通过推广链接注册），也更新其统计
      if (user.inviterId && user.inviterId !== codeCreatorId) {
        const userInviter = await getAgentAccountByUserId(user.inviterId);
        if (userInviter) {
          await updateAgentStats(userInviter.id, {
            inviteCount: userInviter.inviteCount + 1,
          });
        }
      }
    }
    
    // 2. 【核心规则】超级管理员生成的兑换码不产生佣金
    if (codeCreatorUid && isSuperAdminUser(codeCreatorUid)) {
      console.log(`[佣金计算] 兑换码由超级管理员创建，不产生佣金`);
      return { success: true, distributions: [] };
    }
    
    // 试用码或有效价格为0，不计算佣金
    if (codeType === 'trial' || effectivePrice <= 0) {
      return { success: true, distributions: [] };
    }
    
    // 3. 兑换码不是代理创建的，且不是超级管理员创建的（异常情况）
    if (!codeCreator) {
      console.log(`[佣金计算] 兑换码创建者不是代理，不产生佣金`);
      return { success: true, distributions: [] };
    }
    
    // 4. 平台分成（最高管理员）
    const platformRate = codeCreator.platformRate || 0.5;
    const platformAmount = Math.round(effectivePrice * platformRate * 100) / 100;
    const remainingAmount = effectivePrice - platformAmount;
    
    // 最高管理员获得平台分成
    const { data: superAdmin } = await client
      .from('users')
      .select('id, uid')
      .eq('uid', SUPER_ADMIN_UIDS[0])
      .single();
    
    if (superAdmin && platformAmount > 0) {
      distributions.push({
        beneficiaryId: superAdmin.id,
        beneficiaryUid: superAdmin.uid,
        beneficiaryRole: 'super_admin',
        amount: platformAmount,
        rate: platformRate,
        reason: '平台分成',
      });
    }
    
    // 5. 获取用户的推广代理（谁推广的这个用户）
    const userInviter = user.inviterId ? await getAgentAccountByUserId(user.inviterId) : null;
    
    // 6. 佣金分配逻辑
    if (!userInviter) {
      // 情况A：用户没有推广代理，剩余全部给兑换码创建者
      if (remainingAmount > 0) {
        distributions.push({
          beneficiaryId: codeCreator.userId,
          beneficiaryUid: codeCreator.uid,
          beneficiaryRole: codeCreator.agentLevel === 0 ? 'level1_agent' : 
                          codeCreator.agentLevel === 1 ? 'level1_agent' : 'level2_agent',
          amount: remainingAmount,
          rate: 1 - platformRate,
          reason: '兑换码创建者直接收益（无推广代理）',
        });
      }
    } else if (userInviter.agentLevel === 2) {
      // 情况B：用户通过二级代理推广，佣金分成
      // 二级代理获得其分成比例的佣金
      const level2Agent = userInviter;
      const level2Rate = level2Agent.commissionRate || 0.5;
      const level2Amount = Math.round(remainingAmount * level2Rate * 100) / 100;
      const level1Amount = remainingAmount - level2Amount;
      
      // 二级代理获得分成
      if (level2Amount > 0) {
        distributions.push({
          beneficiaryId: level2Agent.userId,
          beneficiaryUid: level2Agent.uid,
          beneficiaryRole: 'level2_agent',
          amount: level2Amount,
          rate: level2Rate,
          reason: '二级代理推广分成',
        });
      }
      
      // 兑换码创建者（上级代理）获得剩余
      if (level1Amount > 0) {
        distributions.push({
          beneficiaryId: codeCreator.userId,
          beneficiaryUid: codeCreator.uid,
          beneficiaryRole: 'level1_agent',
          amount: level1Amount,
          rate: (1 - platformRate) * (1 - level2Rate),
          reason: '兑换码创建者（上级代理）分成',
        });
      }
    } else {
      // 情况C：用户通过一级代理或总代推广
      if (userInviter.userId === codeCreator.userId) {
        // 推广人就是兑换码创建者，拿全部剩余
        if (remainingAmount > 0) {
          distributions.push({
            beneficiaryId: codeCreator.userId,
            beneficiaryUid: codeCreator.uid,
            beneficiaryRole: 'level1_agent',
            amount: remainingAmount,
            rate: 1 - platformRate,
            reason: '代理推广 + 兑换码创建者',
          });
        }
      } else {
        // 推广人和兑换码创建者是不同的一级代理
        // 兑换码创建者获得剩余收益
        if (remainingAmount > 0) {
          distributions.push({
            beneficiaryId: codeCreator.userId,
            beneficiaryUid: codeCreator.uid,
            beneficiaryRole: 'level1_agent',
            amount: remainingAmount,
            rate: 1 - platformRate,
            reason: '兑换码创建者收益',
          });
        }
      }
    }
    
    // 7. 创建佣金记录并更新统计
    for (const dist of distributions) {
      // 创建佣金记录
      await createCommissionRecord({
        userId: user.id,
        userName: user.username,
        planId: codeType === 'monthly' ? 1 : 2,
        planName: codeType === 'monthly' ? '月度会员' : '年度会员',
        originalPrice: effectivePrice,
        sourceType: 'redemption_code',
        sourceId: sourceId,
        beneficiaryId: dist.beneficiaryId,
        beneficiaryUid: dist.beneficiaryUid,
        beneficiaryRole: dist.beneficiaryRole,
        amount: dist.amount,
        commissionRate: dist.rate,
      });
      
      // 更新代理统计（仅更新代理，不更新最高管理员）
      if (dist.beneficiaryRole !== 'super_admin') {
        const agent = await getAgentAccountByUserId(dist.beneficiaryId);
        if (agent) {
          await updateAgentStats(agent.id, {
            paidUserCount: agent.paidUserCount + 1,
            totalSales: agent.totalSales + effectivePrice,
            totalCommission: agent.totalCommission + dist.amount,
            pendingAmount: agent.pendingAmount + dist.amount,
          });
        }
      }
    }
    
    console.log(`[佣金计算] 用户 ${user.username} 兑换 ${codeType} (${effectivePrice}元)`);
    console.log(`[佣金计算] 分配结果:`, distributions.map(d => 
      `${d.beneficiaryRole}: ¥${d.amount} (${d.reason})`
    ).join(', '));
    
    return { success: true, distributions };
    
  } catch (error) {
    console.error('[佣金计算] 错误:', error);
    return { 
      success: false, 
      distributions: [], 
      error: error instanceof Error ? error.message : '未知错误' 
    };
  }
}

/**
 * 获取代理的佣金统计
 */
export async function getAgentCommissionStats(agentId: number): Promise<{
  totalCommission: number;
  pendingAmount: number;
  settledAmount: number;
  todayCommission: number;
  monthCommission: number;
}> {
  const client = getSupabaseClient();
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  // 获取总佣金
  const { data: totalData } = await client
    .from('commission_records')
    .select('amount')
    .eq('beneficiary_id', agentId);
  
  const totalCommission = (totalData || []).reduce(
    (sum, r) => sum + parseFloat(r.amount || '0'), 
    0
  );
  
  // 获取待结算金额
  const { data: pendingData } = await client
    .from('commission_records')
    .select('amount')
    .eq('beneficiary_id', agentId)
    .eq('settlement_status', 'pending');
  
  const pendingAmount = (pendingData || []).reduce(
    (sum, r) => sum + parseFloat(r.amount || '0'), 
    0
  );
  
  // 获取已结算金额
  const { data: settledData } = await client
    .from('commission_records')
    .select('amount')
    .eq('beneficiary_id', agentId)
    .eq('settlement_status', 'settled');
  
  const settledAmount = (settledData || []).reduce(
    (sum, r) => sum + parseFloat(r.amount || '0'), 
    0
  );
  
  // 获取今日佣金
  const { data: todayData } = await client
    .from('commission_records')
    .select('amount')
    .eq('beneficiary_id', agentId)
    .gte('created_at', todayStart);
  
  const todayCommission = (todayData || []).reduce(
    (sum, r) => sum + parseFloat(r.amount || '0'), 
    0
  );
  
  // 获取本月佣金
  const { data: monthData } = await client
    .from('commission_records')
    .select('amount')
    .eq('beneficiary_id', agentId)
    .gte('created_at', monthStart);
  
  const monthCommission = (monthData || []).reduce(
    (sum, r) => sum + parseFloat(r.amount || '0'), 
    0
  );
  
  return {
    totalCommission,
    pendingAmount,
    settledAmount,
    todayCommission,
    monthCommission,
  };
}
