/**
 * 点数系统配置
 * 
 * 核心规则：
 * 1. 点数来源：上级给下级划拨
 * 2. 消耗时机：生成兑换码时扣点
 * 3. 收款方式：私下收款，看消耗点数对账
 * 4. 兑换码：无有效期，不退点
 * 
 * 2024年改造：
 * - 取消会员体系，改为纯算力模式
 * - 新用户注册赠送3000算力（1天有效期）
 * - 兑换码只支持算力包
 */

// 兑换码类型定义（向后兼容）
export type CodeType = 
  | 'power_10000'   // 算力包10000（1万）
  | 'power_50000'   // 算力包50000（5万）
  | 'power_100000'  // 算力包100000（10万）
  | 'power_400000'  // 算力包400000（40万）
  // 以下为兼容旧代码
  | 'trial'         // 试用（已废弃，改为赠送算力）
  | 'monthly'       // 月度会员（已废弃）
  | 'yearly'        // 年度会员（已废弃）
  | 'power_3000'    // 3000算力（新人赠送）
  | 'power_5000';   // 5000算力（别名）

// 点数消耗配置（代理生成兑换码时消耗的点数）
export const POINTS_COST: Partial<Record<CodeType, number>> = {
  power_10000: 29,   // 算力包10000（1万）：29点 ≈ 28.9元成本
  power_50000: 100,  // 算力包50000（5万）：100点 ≈ 99.9元成本
  power_100000: 199, // 算力包100000（10万）：199点 ≈ 199元成本
  power_400000: 699, // 算力包400000（40万）：699点 ≈ 699元成本
  // 兼容旧代码（已废弃）
  trial: 0,
  monthly: 0,
  yearly: 0,
  power_3000: 0,
  power_5000: 50,
};

// 兑换码类型中文名
export const CODE_TYPE_NAMES: Partial<Record<CodeType, string>> = {
  power_10000: '算力包10000（1万算力）',
  power_50000: '算力包50000（5万算力）',
  power_100000: '算力包100000（10万算力）',
  power_400000: '算力包400000（40万算力）',
  // 兼容旧代码
  trial: '试用',
  monthly: '月度会员（已废弃）',
  yearly: '年度会员（已废弃）',
  power_3000: '3000算力（新人赠送）',
  power_5000: '5000算力',
};

// 兑换码类型对应的奖励
export const CODE_TYPE_REWARDS: Partial<Record<CodeType, { days: number; power: number }>> = {
  power_10000: { days: 365, power: 10000 },  // 算力包10000（1年有效期）
  power_50000: { days: 365, power: 50000 },  // 算力包50000（1年有效期）
  power_100000: { days: 365, power: 100000 }, // 算力包100000（1年有效期）
  power_400000: { days: 365, power: 400000 }, // 算力包400000（1年有效期）
  // 兼容旧代码
  trial: { days: 0, power: 0 },
  monthly: { days: 0, power: 0 },
  yearly: { days: 0, power: 0 },
  power_3000: { days: 0, power: 0 },
  power_5000: { days: 0, power: 0 },
};

// 代理层级定义
export type AgentLevel = 0 | 1 | 2;

// 代理层级名称
export const AGENT_LEVEL_NAMES: Record<AgentLevel, string> = {
  0: '总代',
  1: '一级代理',
  2: '二级代理',
};

// 点数交易类型
export type PointsTransactionType = 
  | 'recharge'   // 充值（平台给代理加）
  | 'allocate'   // 划拨（上级给下级）
  | 'consume'    // 消耗（生成兑换码）
  | 'refund';    // 退款（预留）

// 点数交易类型名称
export const TRANSACTION_TYPE_NAMES: Record<PointsTransactionType, string> = {
  recharge: '充值',
  allocate: '划拨',
  consume: '消耗',
  refund: '退款',
};

// 获取兑换码消耗点数
export function getPointsCost(codeType: CodeType): number {
  return POINTS_COST[codeType] ?? 0;
}

// 检查代理是否有权限生成指定类型的兑换码
export function canGenerateCodeType(
  agentLevel: AgentLevel | null,
  codeType: CodeType
): boolean {
  // 二级代理不能生成任何兑换码，只能推广用户
  if (agentLevel === 2) {
    return false;
  }
  
  // 算力包兑换码：总代和一级代理可以生成
  return agentLevel === null || agentLevel === 0 || agentLevel === 1;
}

// 检查代理点数是否足够
export function hasEnoughPoints(
  pointsBalance: number,
  codeType: CodeType
): boolean {
  const cost = getPointsCost(codeType);
  return pointsBalance >= cost;
}
