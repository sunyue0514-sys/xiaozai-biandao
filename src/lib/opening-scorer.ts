/**
 * 开篇评分系统
 * 攻击注意力系统：预测破坏 / 奖励损失 / 命名
 */

import type { OpeningStrategy } from './opening-strategies';
import { getStrategy } from './opening-strategies';

// 评分结果接口
export interface OpeningScore {
  predictionDisruption: number;  // 预测破坏分 (0-10)
  rewardLoss: number;           // 奖励损失分 (0-10)
  naming: number;               // 命名分 (0-10)
  total: number;                // 总分 (0-30)
}

// 评级类型
export type OpeningRating = 'excellent' | 'good' | 'pass' | 'needs_work';

// 评级配置
export const RATING_CONFIG: Record<OpeningRating, { label: string; color: string; minScore: number }> = {
  excellent: { label: '优秀', color: 'text-green-600 bg-green-100', minScore: 24 },
  good: { label: '良好', color: 'text-blue-600 bg-blue-100', minScore: 18 },
  pass: { label: '合格', color: 'text-yellow-600 bg-yellow-100', minScore: 12 },
  needs_work: { label: '需优化', color: 'text-red-600 bg-red-100', minScore: 0 },
};

// ========== 预测破坏评分 (Prediction Disruption) ==========
// 评估开篇打破用户预期的程度

const DISRUPTION_PATTERNS = {
  high: [
    /其实[呢]?[,，]?\s*(并不是|根本不是|绝对不是|真相是|事实是)/,
    /你(以为|觉得|认为)[^.!?]*(其实|但是|但|可是|真相|事实)/,
    /大家都[觉得认为][^.!?]*(错|不对|假|骗)/,
    /[明明明明].*却/,
    /(根本|绝对|完全)不是/,
  ],
  medium: [
    /其实/,
    /但是|但|可是|却/,
    /真相|事实|实际上/,
    /你(以为|觉得|认为)/,
    /(不是|不对|错了)/,
    /结果呢/,
    /问题[在是]/,
  ],
  low: [
    /也/,
    /还/,
    /就/,
  ],
};

function scorePredictionDisruption(content: string): number {
  let score = 0;
  
  // 高冲击力模式 (+3分)
  for (const pattern of DISRUPTION_PATTERNS.high) {
    if (pattern.test(content)) {
      score += 3;
      break;
    }
  }
  
  // 中等冲击力模式 (+2分)
  for (const pattern of DISRUPTION_PATTERNS.medium) {
    if (pattern.test(content)) {
      score += 2;
      break;
    }
  }
  
  // 检查是否有对比结构
  if (/.{2,}(vs|对比|比较|差距|不同).{2,}/.test(content) || 
      /.{2,}[，,]([^，,]{2,})[，,].{2,}/.test(content)) {
    score += 2;
  }
  
  // 检查是否有否定词
  const negationCount = (content.match(/不|没|无|非|错|假/g) || []).length;
  score += Math.min(negationCount, 2);
  
  // 检查是否有疑问句
  if (/[？?]/.test(content)) {
    score += 1;
  }
  
  // 检查是否有感叹号
  if (/[！!]/.test(content)) {
    score += 1;
  }
  
  return Math.min(score, 10);
}

// ========== 奖励损失评分 (Reward/Loss) ==========
// 评估用户看完能获得的价值感或损失感

const REWARD_PATTERNS = {
  high: [
    /你(将|会|能)[得到获得学会]/,
    /(教你|带你|帮你|让你)[^.!?]*(学会|掌握|实现|成功)/,
    /(不再|再也不|终于)[^.!?]*(担心|害怕|纠结|焦虑)/,
    /(赚|省|省时|省力|省钱)[^，。！？]{0,10}(万|千|百|块|元)/,
  ],
  medium: [
    /你(将|会|能|可以)/,
    /(帮你|让你|教你怎么)/,
    /(省|赚|获得|得到|实现)/,
    /(不再|再也不)/,
    /(避免|防止|解决)/,
  ],
  low: [
    /你/,
    /可以/,
    /能够/,
  ],
};

function scoreRewardLoss(content: string): number {
  let score = 0;
  
  // 高价值模式 (+3分)
  for (const pattern of REWARD_PATTERNS.high) {
    if (pattern.test(content)) {
      score += 3;
      break;
    }
  }
  
  // 中等价值模式 (+2分)
  for (const pattern of REWARD_PATTERNS.medium) {
    if (pattern.test(content)) {
      score += 2;
      break;
    }
  }
  
  // 检查是否有直接利益相关词
  const benefitKeywords = ['赚钱', '省钱', '省时', '省力', '提升', '改变', '成功', '突破'];
  for (const keyword of benefitKeywords) {
    if (content.includes(keyword)) {
      score += 1;
      break;
    }
  }
  
  // 检查是否有"你"字（第二人称增强代入感）
  const youCount = (content.match(/你|你的|你们/g) || []).length;
  score += Math.min(youCount, 2);
  
  // 检查是否有痛点相关词
  const painKeywords = ['痛点', '问题', '困扰', '烦恼', '焦虑', '担心'];
  for (const keyword of painKeywords) {
    if (content.includes(keyword)) {
      score += 1;
      break;
    }
  }
  
  return Math.min(score, 10);
}

// ========== 命名评分 (Naming) ==========
// 评估给概念命名的精准度和传播力

const NAMING_PATTERNS = {
  high: [
    /这就[叫是]/,
    /其实[叫是]/,
    /叫作/,
    /称之为/,
    /(本质|根源|核心)[是为]/,
  ],
  medium: [
    /就是/,
    /叫做/,
    /是[一一个]/,
    /所谓的/,
    /[：:]/, // 冒号常用于引出命名
  ],
  low: [
    /叫/,
    /说是/,
    /名为/,
  ],
};

// 检查是否有新概念命名
function hasNewNaming(content: string): boolean {
  // 检查是否有"XX是XX"的定义句式
  if (/[^，。！？]{2,6}(是|叫|叫作)[^，。！？]{2,8}/.test(content)) {
    return true;
  }
  // 检查是否有"这就是XX"的强调句式
  if (/这就[是叫]/.test(content)) {
    return true;
  }
  // 检查是否有抽象名词+解释的结构
  if (/[的本质|根源|核心|真相|关键][是为]/.test(content)) {
    return true;
  }
  return false;
}

function scoreNaming(content: string): number {
  let score = 0;
  
  // 高命名力模式 (+3分)
  for (const pattern of NAMING_PATTERNS.high) {
    if (pattern.test(content)) {
      score += 3;
      break;
    }
  }
  
  // 中等命名力模式 (+2分)
  for (const pattern of NAMING_PATTERNS.medium) {
    if (pattern.test(content)) {
      score += 2;
      break;
    }
  }
  
  // 检查是否有新概念命名
  if (hasNewNaming(content)) {
    score += 2;
  }
  
  // 检查是否有破折号或冒号（常用于引出命名）
  if (/[—…：:]|\\.\\.\\./.test(content)) {
    score += 1;
  }
  
  // 检查是否有精炼的表达（短句更有传播力）
  const sentences = content.split(/[，。！？]/).filter(s => s.trim());
  if (sentences.length <= 2 && content.length <= 40) {
    score += 1;
  }
  
  // 检查是否有数字（数字命名更有说服力）
  if (/\d+/.test(content)) {
    score += 1;
  }
  
  return Math.min(score, 10);
}

// ========== 综合评分 ==========

/**
 * 对开篇内容进行评分
 */
export function scoreOpening(content: string, strategy?: OpeningStrategy): OpeningScore {
  // 基础评分
  let predictionDisruption = scorePredictionDisruption(content);
  let rewardLoss = scoreRewardLoss(content);
  let naming = scoreNaming(content);
  
  // 根据策略调整权重
  if (strategy) {
    const strategyConfig = getStrategy(strategy);
    if (strategyConfig) {
      const { scoringFocus } = strategyConfig;
      
      // 根据策略的评分侧重进行调整
      // 如果策略侧重某个维度，则适当提升该维度的基础分
      if (scoringFocus.predictionDisruption >= 4) {
        predictionDisruption = Math.min(predictionDisruption + 1, 10);
      }
      if (scoringFocus.rewardLoss >= 4) {
        rewardLoss = Math.min(rewardLoss + 1, 10);
      }
      if (scoringFocus.naming >= 4) {
        naming = Math.min(naming + 1, 10);
      }
    }
  }
  
  const total = predictionDisruption + rewardLoss + naming;
  
  return {
    predictionDisruption,
    rewardLoss,
    naming,
    total,
  };
}

/**
 * 根据总分获取评级
 */
export function getRating(totalScore: number): OpeningRating {
  if (totalScore >= RATING_CONFIG.excellent.minScore) return 'excellent';
  if (totalScore >= RATING_CONFIG.good.minScore) return 'good';
  if (totalScore >= RATING_CONFIG.pass.minScore) return 'pass';
  return 'needs_work';
}

/**
 * 获取评级的显示配置
 */
export function getRatingConfig(rating: OpeningRating) {
  return RATING_CONFIG[rating];
}

/**
 * 获取评分详情描述
 */
export function getScoreBreakdown(score: OpeningScore): string[] {
  const breakdown: string[] = [];
  
  if (score.predictionDisruption >= 7) {
    breakdown.push('打破预期效果好');
  } else if (score.predictionDisruption <= 3) {
    breakdown.push('预期冲击力不足');
  }
  
  if (score.rewardLoss >= 7) {
    breakdown.push('价值感/共鸣感强');
  } else if (score.rewardLoss <= 3) {
    breakdown.push('与用户关联度低');
  }
  
  if (score.naming >= 7) {
    breakdown.push('命名精准有传播力');
  } else if (score.naming <= 3) {
    breakdown.push('缺乏概念命名');
  }
  
  return breakdown;
}
