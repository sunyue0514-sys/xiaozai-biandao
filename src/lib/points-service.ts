/**
 * 点数操作核心工具函数
 * 
 * 核心原则：
 * 1. 所有操作记录流水
 * 2. 操作原子性
 * 3. 数据不可删除
 */

import { getSupabaseClient, waitForSequenceCheck } from '@/storage/database/supabase-client';
import { 
  CodeType, 
  AgentLevel, 
  PointsTransactionType,
  getPointsCost,
  canGenerateCodeType,
  hasEnoughPoints,
} from './points-config';

// ============================================
// 类型定义
// ============================================

export interface PointsTransaction {
  id: number;
  agentId: number;
  agentUid: string;
  type: PointsTransactionType;
  points: number;
  balanceAfter: number;
  relatedId?: number;
  relatedUid?: string;
  remark?: string;
  createdAt: string;
  createdBy?: string;
}

export interface CodeConsumptionRecord {
  id: number;
  agentId: number;
  agentUid: string;
  agentUsername?: string;
  parentId?: number;
  parentUid?: string;
  codeId: number;
  code: string;
  codeType: CodeType;
  pointsCost: number;
  createdAt: string;
}

export interface AgentPointsInfo {
  agentId: number;
  agentUid: string;
  pointsBalance: number;
  pointsTotal: number;
  pointsUsed: number;
  agentLevel: AgentLevel | null;
  parentId?: number;
  parentUid?: string;
}

// ============================================
// 点数查询
// ============================================

/**
 * 获取代理的点数信息
 */
export async function getAgentPointsInfo(agentId: number): Promise<AgentPointsInfo | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('agent_accounts')
    .select('id, uid, points_balance, points_total, points_used, agent_level, parent_id, parent_uid')
    .eq('id', agentId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    agentId: data.id,
    agentUid: data.uid,
    pointsBalance: data.points_balance ?? 0,
    pointsTotal: data.points_total ?? 0,
    pointsUsed: data.points_used ?? 0,
    agentLevel: data.agent_level as AgentLevel | null,
    parentId: data.parent_id ?? undefined,
    parentUid: data.parent_uid ?? undefined,
  };
}

/**
 * 获取代理的点数余额
 */
export async function getAgentPointsBalance(agentId: number): Promise<number> {
  const info = await getAgentPointsInfo(agentId);
  return info?.pointsBalance ?? 0;
}

// ============================================
// 点数操作（核心函数，确保原子性）
// ============================================

/**
 * 给代理充值/调整点数（平台操作）
 * 
 * @param agentId 代理ID
 * @param points 点数（正数为增加，负数为减少）
 * @param operatorUid 操作人UID
 * @param remark 备注
 */
export async function rechargeAgentPoints(
  agentId: number,
  points: number,
  operatorUid: string,
  remark?: string
): Promise<{ success: boolean; balanceAfter: number; error?: string }> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  
  try {
    // 获取当前余额
    const info = await getAgentPointsInfo(agentId);
    if (!info) {
      return { success: false, balanceAfter: 0, error: '代理不存在' };
    }

    const balanceAfter = info.pointsBalance + points;
    const totalAfter = info.pointsTotal + (points > 0 ? points : 0);

    if (balanceAfter < 0) {
      return { success: false, balanceAfter: info.pointsBalance, error: '点数不足' };
    }

    // 更新代理账户
    const { error: updateError } = await client
      .from('agent_accounts')
      .update({
        points_balance: balanceAfter,
        points_total: totalAfter,
        updated_at: new Date().toISOString(),
      })
      .eq('id', agentId);

    if (updateError) {
      console.error('[点数充值] 更新代理账户失败:', updateError);
      return { success: false, balanceAfter: info.pointsBalance, error: '更新失败' };
    }

    // 记录流水
    await client
      .from('points_transactions')
      .insert({
        agent_id: agentId,
        agent_uid: info.agentUid,
        type: 'recharge',
        points: points,
        balance_after: balanceAfter,
        remark: remark || `平台${points > 0 ? '充值' : '扣减'}${Math.abs(points)}点`,
        created_by: operatorUid,
      });

    console.log(`[点数充值] ${operatorUid} 给代理 ${info.agentUid} ${points > 0 ? '充值' : '扣减'} ${Math.abs(points)} 点，余额: ${balanceAfter}`);

    return { success: true, balanceAfter };
  } catch (error) {
    console.error('[点数充值] 错误:', error);
    return { success: false, balanceAfter: 0, error: String(error) };
  }
}

/**
 * 上级给下级划拨点数
 * 
 * @param fromAgentId 上级代理ID
 * @param toAgentId 下级代理ID
 * @param points 点数（正数）
 * @param operatorUid 操作人UID
 * @param remark 备注
 */
export async function allocatePoints(
  fromAgentId: number,
  toAgentId: number,
  points: number,
  operatorUid: string,
  remark?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  
  try {
    if (points <= 0) {
      return { success: false, error: '划拨点数必须大于0' };
    }

    // 获取双方信息
    const fromInfo = await getAgentPointsInfo(fromAgentId);
    const toInfo = await getAgentPointsInfo(toAgentId);

    if (!fromInfo) {
      return { success: false, error: '上级代理不存在' };
    }
    if (!toInfo) {
      return { success: false, error: '下级代理不存在' };
    }

    // 验证关系
    if (toInfo.parentId !== fromAgentId) {
      return { success: false, error: '只能给直属下级划拨点数' };
    }

    // 检查余额
    if (fromInfo.pointsBalance < points) {
      return { success: false, error: '点数不足' };
    }

    // 执行划拨（事务性操作）
    const now = new Date().toISOString();

    // 扣减上级
    const fromBalanceAfter = fromInfo.pointsBalance - points;
    const { error: fromError } = await client
      .from('agent_accounts')
      .update({
        points_balance: fromBalanceAfter,
        updated_at: now,
      })
      .eq('id', fromAgentId);

    if (fromError) {
      console.error('[点数划拨] 扣减上级失败:', fromError);
      return { success: false, error: '扣减上级点数失败' };
    }

    // 增加下级
    const toBalanceAfter = toInfo.pointsBalance + points;
    const toTotalAfter = toInfo.pointsTotal + points;
    const { error: toError } = await client
      .from('agent_accounts')
      .update({
        points_balance: toBalanceAfter,
        points_total: toTotalAfter,
        updated_at: now,
      })
      .eq('id', toAgentId);

    if (toError) {
      console.error('[点数划拨] 增加下级失败:', toError);
      // 回滚上级
      await client
        .from('agent_accounts')
        .update({ points_balance: fromInfo.pointsBalance, updated_at: now })
        .eq('id', fromAgentId);
      return { success: false, error: '增加下级点数失败' };
    }

    // 记录流水（上级）
    await client
      .from('points_transactions')
      .insert({
        agent_id: fromAgentId,
        agent_uid: fromInfo.agentUid,
        type: 'allocate',
        points: -points,
        balance_after: fromBalanceAfter,
        related_id: toAgentId,
        related_uid: toInfo.agentUid,
        remark: remark || `划拨给下级${toInfo.agentUid}`,
        created_by: operatorUid,
      });

    // 记录流水（下级）
    await client
      .from('points_transactions')
      .insert({
        agent_id: toAgentId,
        agent_uid: toInfo.agentUid,
        type: 'allocate',
        points: points,
        balance_after: toBalanceAfter,
        related_id: fromAgentId,
        related_uid: fromInfo.agentUid,
        remark: remark || `从上级${fromInfo.agentUid}划拨`,
        created_by: operatorUid,
      });

    console.log(`[点数划拨] ${fromInfo.agentUid} 划拨 ${points} 点给 ${toInfo.agentUid}`);

    return { success: true };
  } catch (error) {
    console.error('[点数划拨] 错误:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 消耗点数（生成兑换码时调用）
 * 
 * @param agentId 代理ID
 * @param codeType 兑换码类型
 * @param codeId 兑换码ID
 * @param code 兑换码
 * @param operatorUid 操作人UID
 */
export async function consumePoints(
  agentId: number,
  codeType: CodeType,
  codeId: number,
  code: string,
  operatorUid: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  
  try {
    const pointsCost = getPointsCost(codeType);

    // 体验会员不消耗点数
    if (pointsCost === 0) {
      return { success: true };
    }

    // 获取代理信息
    const info = await getAgentPointsInfo(agentId);
    if (!info) {
      return { success: false, error: '代理不存在' };
    }

    // 检查权限
    if (!canGenerateCodeType(info.agentLevel, codeType)) {
      return { success: false, error: '无权限生成该类型兑换码' };
    }

    // 检查余额
    if (!hasEnoughPoints(info.pointsBalance, codeType)) {
      return { success: false, error: `点数不足，需要${pointsCost}点，当前余额${info.pointsBalance}点` };
    }

    // 扣减点数
    const balanceAfter = info.pointsBalance - pointsCost;
    const usedAfter = info.pointsUsed + pointsCost;
    const now = new Date().toISOString();

    const { error: updateError } = await client
      .from('agent_accounts')
      .update({
        points_balance: balanceAfter,
        points_used: usedAfter,
        updated_at: now,
      })
      .eq('id', agentId);

    if (updateError) {
      console.error('[点数消耗] 更新代理账户失败:', updateError);
      return { success: false, error: '更新失败' };
    }

    // 记录流水
    await client
      .from('points_transactions')
      .insert({
        agent_id: agentId,
        agent_uid: info.agentUid,
        type: 'consume',
        points: -pointsCost,
        balance_after: balanceAfter,
        related_id: codeId,
        remark: `生成兑换码 ${code} (${codeType})`,
        created_by: operatorUid,
      });

    // 记录消耗明细
    await client
      .from('code_consumption_records')
      .insert({
        agent_id: agentId,
        agent_uid: info.agentUid,
        parent_id: info.parentId,
        parent_uid: info.parentUid,
        code_id: codeId,
        code: code,
        code_type: codeType,
        points_cost: pointsCost,
      });

    console.log(`[点数消耗] ${info.agentUid} 消耗 ${pointsCost} 点生成 ${codeType} 兑换码 ${code}`);

    return { success: true };
  } catch (error) {
    console.error('[点数消耗] 错误:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// 统计查询
// ============================================

/**
 * 获取代理的消耗记录
 */
export async function getAgentConsumptionRecords(
  agentId: number,
  options?: {
    startDate?: string;
    endDate?: string;
    codeType?: CodeType;
    limit?: number;
  }
): Promise<CodeConsumptionRecord[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('code_consumption_records')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }
  if (options?.codeType) {
    query = query.eq('code_type', options.codeType);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[消耗记录查询] 错误:', error);
    return [];
  }

  return (data || []).map(record => ({
    id: record.id,
    agentId: record.agent_id,
    agentUid: record.agent_uid,
    agentUsername: record.agent_username,
    parentId: record.parent_id,
    parentUid: record.parent_uid,
    codeId: record.code_id,
    code: record.code,
    codeType: record.code_type,
    pointsCost: record.points_cost,
    createdAt: record.created_at,
  }));
}

/**
 * 获取下级代理的消耗统计
 */
export async function getSubAgentsConsumptionStats(
  parentAgentId: number,
  options?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<{
  agentId: number;
  agentUid: string;
  totalPoints: number;
  count: number;
}[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('code_consumption_records')
    .select('agent_id, agent_uid, points_cost')
    .eq('parent_id', parentAgentId);

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  // 按代理聚合
  const stats: Record<number, { agentId: number; agentUid: string; totalPoints: number; count: number }> = {};

  for (const record of data) {
    const agentId = record.agent_id;
    if (!stats[agentId]) {
      stats[agentId] = {
        agentId,
        agentUid: record.agent_uid,
        totalPoints: 0,
        count: 0,
      };
    }
    stats[agentId].totalPoints += record.points_cost;
    stats[agentId].count += 1;
  }

  return Object.values(stats);
}

/**
 * 获取点数流水记录
 */
export async function getPointsTransactions(
  agentId: number,
  options?: {
    type?: PointsTransactionType;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<PointsTransaction[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('points_transactions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (options?.type) {
    query = query.eq('type', options.type);
  }
  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[点数流水查询] 错误:', error);
    return [];
  }

  return (data || []).map(record => ({
    id: record.id,
    agentId: record.agent_id,
    agentUid: record.agent_uid,
    type: record.type,
    points: record.points,
    balanceAfter: record.balance_after,
    relatedId: record.related_id,
    relatedUid: record.related_uid,
    remark: record.remark,
    createdAt: record.created_at,
    createdBy: record.created_by,
  }));
}
