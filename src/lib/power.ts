import { getSupabaseClient } from '@/storage/database/supabase-client';

// 算力包配置（2025年6月更新：取消会员体系，改为纯算力模式）
export const POWER_PACKAGES = [
  { id: 'trial', name: '新人体验', amount: 3000, price: 0, validDays: 1, description: '新用户注册赠送' },
  { id: 'starter', name: '入门套餐', amount: 10000, price: 28.9, validDays: 365, description: '适合新手体验' },
  { id: 'basic', name: '基础套餐', amount: 50000, price: 99.9, validDays: 365, description: '适合日常使用' },
  { id: 'pro', name: '专业套餐', amount: 100000, price: 199, validDays: 365, description: '适合创作者' },
  { id: 'team', name: '团队套餐', amount: 400000, price: 699, validDays: 365, description: '适合工作室/团队' },
];

// 兑换码类型奖励配置
export const CODE_TYPE_REWARDS = {
  vip_1month: { power: 500, validDays: 30, points: 100 },
  vip_3month: { power: 1500, validDays: 90, points: 280 },
  vip_6month: { power: 3000, validDays: 180, points: 520 },
  vip_12month: { power: 5000, validDays: 365, points: 900 },
  power_1000: { power: 1000, validDays: 30, points: 100 },
  power_5000: { power: 5000, validDays: 90, points: 450 },
  power_10000: { power: 10000, validDays: 180, points: 850 },
  power_50000: { power: 50000, validDays: 365, points: 4000 },
  custom: { power: 0, validDays: 30, points: 0 }, // 自定义点数
};

// 算力消耗规则（2025年6月更新：取消会员体系，改为纯算力模式）
export const POWER_CONSUMPTION_RULES = {
  // ===== 重度功能 =====
  // 账号规划生成（整合IP定位+问卷+知识库，消耗最高）
  accountPlan: { baseCost: 2500, perCharCost: 0 },
  // 客户定位分析(IP定位)（提示词最长，整合大量数据）
  positioning: { baseCost: 2000, perCharCost: 0 },
  customerPositioning: { baseCost: 2000, perCharCost: 0 },
  // 视频深度分析（使用Vision模型，成本高）
  video_deep_analysis: { baseCost: 1500, perCharCost: 0 },
  videoDeepAnalysis: { baseCost: 1500, perCharCost: 0 },
  // 智能推导创作（6步推导，上下文很长）
  creative: { baseCost: 900, perCharCost: 0 },
  creativeGeneration: { baseCost: 900, perCharCost: 0 },
  // 数据分析/业务分析/报告（处理大量数据）
  businessAnalysis: { baseCost: 1000, perCharCost: 0 },
  dataAnalysis: { baseCost: 1000, perCharCost: 0 },
  // 批量开篇生成（一次生成6个开篇）
  opening_batch: { baseCost: 800, perCharCost: 0 },
  batchOpeningGenerate: { baseCost: 800, perCharCost: 0 },
  // 批量选题生成（一次生成24个选题）
  topic_batch: { baseCost: 800, perCharCost: 0 },
  batchTopicGenerate: { baseCost: 800, perCharCost: 0 },
  // 千川脚本生成（提示词较长）
  qianchuan_script: { baseCost: 500, perCharCost: 0 },
  qianchuanScript: { baseCost: 500, perCharCost: 0 },

  // ===== 中度功能 =====
  // 脚本生成（按字数计费）
  script: { baseCost: 0, perCharCost: 1.5 },
  scriptGenerate: { baseCost: 0, perCharCost: 1.5 },
  // 直播话术生成（生成3套话术）
  live_speech: { baseCost: 450, perCharCost: 0 },
  liveSpeech: { baseCost: 450, perCharCost: 0 },
  // 素材生成（按字数计费）
  materialGenerate: { baseCost: 0, perCharCost: 2.25 },
  // 快速创作（按字数计费）
  quickCreate: { baseCost: 0, perCharCost: 1.5 },
  // 信息流广告脚本（按字数计费）
  feed_ad_script: { baseCost: 0, perCharCost: 3 },
  adScript: { baseCost: 0, perCharCost: 3 },
  // 选题推荐（单次推荐）
  topic: { baseCost: 375, perCharCost: 0 },
  topicRecommend: { baseCost: 375, perCharCost: 0 },
  // 报告优化（单次优化）
  reportOptimize: { baseCost: 375, perCharCost: 0 },
  // AI辅助填充（单次填充）
  aiFill: { baseCost: 225, perCharCost: 0 },

  // ===== 轻度功能 =====
  // AI对话（按字数计费）
  chat: { baseCost: 0, perCharCost: 0.75 },
  aiChat: { baseCost: 0, perCharCost: 0.75 },
  // 开场白生成（按字数计费）
  opening: { baseCost: 0, perCharCost: 0.75 },
  openingGenerate: { baseCost: 0, perCharCost: 0.75 },
  // 千川文案生成（按字数计费）
  qianchuan_copywriting: { baseCost: 0, perCharCost: 2.25 },
  qianchuanCopy: { baseCost: 0, perCharCost: 2.25 },
  // 信息流广告文案（按字数计费）
  feed_ad_copywriting: { baseCost: 0, perCharCost: 2.25 },
  adCopy: { baseCost: 0, perCharCost: 2.25 },
  // 智能超级编导对话（单次对话）
  scriptlessChat: { baseCost: 75, perCharCost: 0 },
  // 千川智能分析（单次分析）
  qianchuan_analyze: { baseCost: 75, perCharCost: 0 },
  qianchuanAnalyze: { baseCost: 75, perCharCost: 0 },
  // 智能推导段落修改（单段修改）
  creative_edit: { baseCost: 75, perCharCost: 0 },
  creativeEdit: { baseCost: 75, perCharCost: 0 },
  // 智能推导一键润色（单次润色）
  creative_polish: { baseCost: 150, perCharCost: 0 },
  creativePolish: { baseCost: 150, perCharCost: 0 },
  // 视频快速分析（轻量版）
  video_quick_analysis: { baseCost: 300, perCharCost: 0 },
  videoQuickAnalysis: { baseCost: 300, perCharCost: 0 },
  // 超级导演
  superDirector: { baseCost: 100, perCharCost: 0 },

  // ===== 默认值 =====
  default: { baseCost: 100, perCharCost: 0 },
};

// 获取算力消耗
export function getConsumptionAmount(feature: string, charCount?: number): number {
  if (!Object.hasOwn(POWER_CONSUMPTION_RULES, feature) || (charCount !== undefined && (!Number.isSafeInteger(charCount) || charCount < 0))) return NaN;
  const rule = POWER_CONSUMPTION_RULES[feature as keyof typeof POWER_CONSUMPTION_RULES];
  return Math.ceil(rule.baseCost + (charCount || 0) * rule.perCharCost);
}

// 获取算力包
export function getPowerPackage(id: string) {
  return POWER_PACKAGES.find(pkg => pkg.id === id);
}

// 检查用户是否有足够的算力
function validAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount >= 0;
}
function validUser(userId: number): boolean {
  return Number.isSafeInteger(userId) && userId > 0;
}
function validBalance(value: unknown): value is number {
  return typeof value === 'number' && validAmount(value);
}
function activeExpiry(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const expiry = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(expiry) && expiry > Date.now();
}
export async function checkUserCredits(userId: number, requiredCredits: number): Promise<{ success: boolean; message: string; balance: number }> {
  if (!validUser(userId) || !validAmount(requiredCredits)) return {success:false,message:'Invalid credit request',balance:0};
  try {
    const {data:user,error}=await getSupabaseClient().from('users').select('credits,power_expiry,power_quota').eq('id',userId).single();
    if (error || !user || !activeExpiry(user.power_expiry)) return {success:false,message:'Credit account unavailable or expired',balance:0};
    if (user.power_quota === -1) return {success:true,message:'Unlimited account',balance:999999};
    if (!validBalance(user.credits)) return {success:false,message:'Invalid credit balance',balance:0};
    return {success:user.credits >= requiredCredits,message:user.credits >= requiredCredits ? 'Credits available' : 'Insufficient credits',balance:user.credits};
  } catch {return {success:false,message:'Credit service unavailable',balance:0};}
}
export async function deductUserCredits(userId: number, amount: number, feature: string): Promise<{ success: boolean; message: string; newBalance: number; consumed: number }> {
  const failed=(message:string,balance=0)=>({success:false,message,newBalance:balance,consumed:0});
  if (!validUser(userId) || !validAmount(amount) || !feature) return failed('Invalid credit request');
  try {
    const client=getSupabaseClient();
    const {data:user,error}=await client.from('users').select('credits,used_power,power_expiry,power_quota').eq('id',userId).single();
    if (error || !user || !activeExpiry(user.power_expiry)) return failed('Credit account unavailable or expired');
    if (user.power_quota === -1) return {success:true,message:'Unlimited account',newBalance:999999,consumed:0};
    const used=user.used_power === null ? 0 : user.used_power;
    if (!validBalance(user.credits) || !validBalance(used) || !validAmount(used+amount)) return failed('Invalid credit balance');
    if (user.credits < amount) return failed('Insufficient credits',user.credits);
    if (amount === 0) return {success:true,message:'No charge',newBalance:user.credits,consumed:0};
    const newBalance=user.credits-amount;
    let query=client.from('users').update({credits:newBalance,used_power:used+amount}).eq('id',userId).eq('credits',user.credits);
    for (const field of ['used_power','power_quota','power_expiry'] as const) {
      query=user[field] === null ? query.is(field,null) : query.eq(field,user[field]);
    }
    const {data:updated,error:updateError}=await query.select('credits,used_power').maybeSingle();
    if (updateError || !updated || updated.credits !== newBalance || updated.used_power !== used+amount) return failed('Credit update conflict; retry the request',user.credits);
    return {success:true,message:'Credits deducted',newBalance,consumed:amount};
  } catch {return failed('Credit service unavailable');}
}
// Refunds need a durable, unique charge receipt. Legacy amount-only calls cannot
// prove that a charge occurred or that it has not already been refunded.
export async function refundPower(_userId: number, _amount: number, _reason?: string): Promise<{ success: boolean; message: string }> {
  return {success:false,message:'USAGE_LEDGER_UNAVAILABLE: automatic refunds require a verified charge receipt'};
}

export async function checkAndConsumePower(userId: number, feature: string, charCount?: number, fixedAmount?: number): Promise<{ success: boolean; message: string; newBalance?: number; amount?: number; consumed?: number }> {
  const amount = fixedAmount !== undefined ? fixedAmount : getConsumptionAmount(feature,charCount);
  const result=await deductUserCredits(userId,amount,feature);
  return {...result,amount};
}

export async function consumePower(userId: number, feature: string, charCount?: number, fixedAmount?: number): Promise<{
  success: boolean;
  error?: string;
  code?: string;
  required?: number;
  remaining?: number;
  cost?: number;
  consumed?: number;
  data?: {
    required: number;
    remaining: number;
    cost: number;
    canProceed: boolean;
  };
}> {
  const result = await checkAndConsumePower(userId, feature, charCount, fixedAmount);
  
  if (result.success) {
    return {
      success: true,
      required: result.amount!,
      remaining: result.newBalance!,
      cost: result.consumed!,
      consumed: result.consumed!,
      data: {
        required: result.amount!,
        remaining: result.newBalance!,
        cost: result.consumed!,
        canProceed: true
      }
    };
  } else {
    // 获取当前余额用于返回
    const balanceResult = await getUserCredits(userId);
    return {
      success: false,
      error: result.message,
      code: 'CREDIT_CHARGE_FAILED',
      required: result.amount || 0,
      remaining: balanceResult.success ? balanceResult.balance : 0,
      cost: result.amount || 0,
      consumed: 0,
      data: {
        required: result.amount || 0,
        remaining: balanceResult.success ? balanceResult.balance : 0,
        cost: result.amount || 0,
        canProceed: false
      }
    };
  }
}

// 注意：POWER_PACKAGES 和 CODE_TYPE_REWARDS 已在上面通过 export const 定义

// 获取用户算力余额
export async function getUserCredits(userId: number): Promise<{ success: boolean; balance: number }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();
    
    if (error) {
      return { success: false, balance: 0 };
    }
    
    return { success: true, balance: data?.credits || 0 };
  } catch {
    return { success: false, balance: 0 };
  }
}
