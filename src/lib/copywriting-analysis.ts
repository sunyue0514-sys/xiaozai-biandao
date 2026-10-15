/**
 * 文案分析工具函数
 * 用于开篇评分、营销植入分析、质量检查等
 * 
 * 评分系统设计原则（V2版本）：
 * 1. 与提示词结构完全匹配：结尾服务于内容、反公式化、人设一致性等
 * 2. 基础分充足：确保生成内容稳定达到240-280分
 * 3. 最低标准：240分以上为合格
 * 
 * 评分维度（总分300分）：
 * - 开头吸引力：基础分70 + 加分30 = 最高100分
 * - 内容价值感：基础分70 + 加分30 = 最高100分
 * - 表达自然度：基础分70 + 加分30 = 最高100分
 * - 人设一致性：基础分70 + 加分30 = 最高100分
 * - 结尾恰当性：基础分70 + 加分30 = 最高100分
 * 
 * 总分 = 各维度平均分 × 3
 * 最低240分 = 平均每项80分
 */

import {
  OpeningScore,
  OpeningScoreItem,
  MarketingAnalysis,
  MarketingPosition,
  NaturalnessLevel,
  QualityCheck,
  ColloquialLevel,
  MARKETING_POSITION_CONFIG,
  NATURALNESS_CONFIG,
  COLLOQUIAL_CONFIG,
} from '@/components/result/types';

/**
 * 提取文案开篇（前100字或第一段）
 */
export function extractOpening(content: string): string {
  if (!content) return '';
  
  // 按段落分割，取第一段
  const paragraphs = content.split('\n').filter(p => p.trim());
  if (paragraphs.length > 0) {
    const firstParagraph = paragraphs[0].trim();
    // 如果第一段超过100字，截取前100字
    return firstParagraph.length > 100 
      ? firstParagraph.substring(0, 100) + '...'
      : firstParagraph;
  }
  
  // 如果没有段落，直接截取前100字
  return content.trim().substring(0, 100);
}

/**
 * 计算开篇评分（基于规则的基础评分）
 * 
 * ✅ 现已升级为综合评分V2，基于整个文案内容
 * 评分范围：240-300分
 * 
 * @param content 完整文案内容（函数内部会提取开篇）
 * @param topic 选题（可选）
 */
export function calculateOpeningScoreBasic(
  content: string,
  topic: string = ''
): OpeningScore {
  return calculateFullContentScore(content, topic);
}

/**
 * 计算文案综合评分 V2（匹配新提示词结构）
 * 
 * 评分原则：
 * - 最低标准：240分（合格线）
 * - 正常文案：240-260分
 * - 优秀文案：270-290分
 * - 问题文案：240分以下
 * 
 * 设计逻辑：
 * - 每个维度基础分70分（确保最低240分）
 * - 特征加分最高30分
 * - 总分 = 各维度平均分 × 3（换算为300分制）
 */
export function calculateFullContentScore(
  content: string,
  topic: string = '',
  opening?: string
): OpeningScore {
  const items: OpeningScoreItem[] = [];
  const maxTotal = 300;

  // 使用传入的开篇或提取开篇
  const openingText = opening || extractOpening(content);

  // ========== 评分维度 V2 ==========
  // 每个维度基础分70分，特征加分最高30分

  // 1. 开头吸引力（基础分70 + 特征分最高30 = 100分）
  const hookResult = evaluateOpeningHook(openingText);
  items.push({
    name: '开头吸引力',
    passed: hookResult.score >= 75,
    score: hookResult.score,
    maxScore: 100,
    reason: hookResult.reason,
  });

  // 2. 内容价值感（基础分70 + 特征分最高30 = 100分）
  const valueResult = evaluateContentValue(content);
  items.push({
    name: '内容价值感',
    passed: valueResult.score >= 75,
    score: valueResult.score,
    maxScore: 100,
    reason: valueResult.reason,
  });

  // 3. 表达自然度（基础分70 + 特征分最高30 = 100分）
  const naturalResult = evaluateExpressionNaturalness(content);
  items.push({
    name: '表达自然度',
    passed: naturalResult.score >= 75,
    score: naturalResult.score,
    maxScore: 100,
    reason: naturalResult.reason,
  });

  // 4. 人设一致性（基础分70 + 特征分最高30 = 100分）
  const personaResult = evaluatePersonaConsistency(content);
  items.push({
    name: '人设一致性',
    passed: personaResult.score >= 75,
    score: personaResult.score,
    maxScore: 100,
    reason: personaResult.reason,
  });

  // 5. 结尾恰当性（基础分70 + 特征分最高30 = 100分）
  const endingResult = evaluateEndingAppropriateness(content);
  items.push({
    name: '结尾恰当性',
    passed: endingResult.score >= 75,
    score: endingResult.score,
    maxScore: 100,
    reason: endingResult.reason,
  });

  // 计算总分：各维度平均分 × 3
  const avgScore = items.reduce((sum, item) => sum + item.score, 0) / items.length;
  const total = Math.round(avgScore * 3);

  // 生成点评
  const comment = generateFullContentCommentV2(total, items);

  return {
    total: Math.min(total, maxTotal),
    maxTotal,
    items,
    comment,
  };
}

/**
 * 生成文案综合点评 V2
 */
function generateFullContentCommentV2(
  total: number,
  items: OpeningScoreItem[]
): string {
  const passedCount = items.filter(item => item.passed).length;
  const totalCount = items.length;
  
  // 找出需要优化的维度
  const weakItems = items.filter(item => !item.passed);
  const weakNames = weakItems.map(item => item.name).join('、');

  if (total >= 270) {
    return `文案表现优秀！${passedCount}/${totalCount}项指标通过。内容有价值、表达自然、人设清晰。`;
  } else if (total >= 250) {
    return `文案表现良好，${passedCount}/${totalCount}项指标通过。继续保持，可以更精进。`;
  } else if (total >= 240) {
    const suggestion = weakNames ? `建议优化：${weakNames}。` : '';
    return `文案表现合格，${passedCount}/${totalCount}项指标通过。${suggestion}`;
  } else {
    return `文案需要优化，仅${passedCount}/${totalCount}
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
`;
  }
}

// ============================================
// 新评分函数 V2（匹配当前提示词结构）
// ============================================

/**
 * 评估开头吸引力 V2
 * 基础分70 + 特征分最高30 = 最高100分
 * 
 * 评估维度：钩子类型、情绪触发、身份锁定
 */
function evaluateOpeningHook(text: string): { score: number; reason: string } {
  let score = 70; // 基础分70分（提高基础分确保最低240分）
  const reasons: string[] = [];
  
  // ========== 钩子检测 ==========
  
  // 1. 提问钩子（+8分）
  if (/[?？]/.test(text) || 
      /为什么|怎么|如何|什么|哪个|哪些|多少/.test(text) ||
      /是不是|对不对|有没有|能不能/.test(text)) {
    score += 8;
    reasons.push('提问钩子');
  }

  // 2. 反常识钩子（+7分）
  if (/大多数(人)?(都)?(搞错|错|不知道)|真相其实|其实不然|并非如此/.test(text) ||
      /大家都(以为|觉得|认为)|很多人不知道|很少有人知道/.test(text)) {
    score += 7;
    reasons.push('反常识钩子');
  }

  // 3. 揭秘钩子（+6分）
  if (/揭秘|曝光|真相|秘密|内幕|公开/.test(text) ||
      /终于(有人|敢|能)|说(实话|真话)|告诉(你|大家)/.test(text)) {
    score += 6;
    reasons.push('揭秘钩子');
  }

  // 4. 警示钩子（+5分）
  if (/千万别|不要|别再|危险|风险|警告|避免|防止|小心/.test(text)) {
    score += 5;
    reasons.push('警示钩子');
  }

  // 5. 身份锁定（+5分）- "XX注意！""正在XX的看过来"
  if (/.{2,}(注意|看过来|举个手)/.test(text) ||
      /正在|准备|打算/.test(text)) {
    score += 5;
    reasons.push('身份锁定');
  }

  // 6. 数据钩子（+4分）
  if (/\d+(个|种|样|款|件|次)/.test(text) ||
      /调查(显示|表明|发现)|数据(显示|表明|发现)/.test(text)) {
    score += 4;
    reasons.push('数据钩子');
  }

  // 限制最高分
  score = Math.min(score, 100);

  return {
    score,
    reason: reasons.length > 0 ? reasons.slice(0, 3).join('、') : '开头完整',
  };
}

/**
 * 评估内容价值感 V2
 * 基础分70 + 特征分最高30 = 最高100分
 * 
 * 评估维度：是否有干货、有经验感、有解决方案
 */
function evaluateContentValue(content: string): { score: number; reason: string } {
  let score = 70; // 基础分70分
  const reasons: string[] = [];
  
  // ========== 价值感检测 ==========
  
  // 1. 有解决方案/建议（+10分）
  if (/正确做法|应该|建议|推荐|试试|可以|不妨|最好/.test(content) ||
      /解决|方案|方法|技巧|秘诀/.test(content)) {
    score += 10;
    reasons.push('有解决方案');
  }

  // 2. 有具体案例/细节（+8分）
  if (/我有一个朋友|我同事|我同学|上次|那天|有一回/.test(content) ||
      /\d+年|\d+月|\d+天|\d+次/.test(content) ||
      /真实经历|亲身|自己/.test(content)) {
    score += 8;
    reasons.push('有真实细节');
  }

  // 3. 有痛点+价值（+7分）
  if ((/坑|亏|上当|后悔|浪费|损失/.test(content)) &&
      (/避免|防止|解决|搞定|不再/.test(content))) {
    score += 7;
    reasons.push('痛点+价值');
  }

  // 4. 有具体数字/数据（+5分）
  if (/\d+元|\d+块|\d+万|\d+%|\d+折/.test(content) ||
      /\d+(个|种|样|款|件)/.test(content)) {
    score += 5;
    reasons.push('有具体数据');
  }

  // 限制最高分
  score = Math.min(score, 100);

  return {
    score,
    reason: reasons.length > 0 ? reasons.slice(0, 3).join('、') : '内容完整',
  };
}

/**
 * 评估表达自然度 V2
 * 基础分70 + 特征分最高30 = 最高100分
 * 
 * 评估维度：口语化、不公式化、有变化
 */
function evaluateExpressionNaturalness(content: string): { score: number; reason: string } {
  let score = 70; // 基础分70分
  const reasons: string[] = [];
  let deductions = 0;
  
  // ========== 口语化特征（加分） ==========
  
  // 1. 有口语化表达（+8分）
  if (/咱|呗|嘛|呗|呢|啊|呀|吧/.test(content) ||
      /说实话|其实|真的|真的|确实/.test(content)) {
    score += 8;
    reasons.push('口语化表达');
  }

  // 2. 有感叹号、问号等情绪符号（+5分）
  const emotionMarks = (content.match(/[！？!？]/g) || []).length;
  if (emotionMarks >= 2 && emotionMarks <= 10) {
    score += 5;
    reasons.push('有情绪');
  }

  // ========== 公式化检测（扣分） ==========
  
  // 3. 检测机械重复的"正确做法"（扣分）
  const correctWayCount = (content.match(/正确做法/g) || []).length;
  if (correctWayCount >= 3) {
    deductions += 10;
    reasons.push('公式化（正确做法重复）');
  }

  // 4. 检测句号滥用（每10个字一个句号就扣分）
  const periodDensity = (content.match(/。/g) || []).length / Math.max(content.length, 1);
  if (periodDensity > 0.12) {
    deductions += 5;
    reasons.push('句号过多');
  }

  // 5. 检测"评论区聊聊"等套路结尾
  if (/评论区(聊聊|说说|打出来)/.test(content.slice(-100))) {
    // 不扣分，但也不加分
  } else {
    // 没有套路结尾，加分
    score += 5;
    reasons.push('结尾自然');
  }

  score = Math.max(score - deductions, 70); // 最低保持基础分
  score = Math.min(score, 100);

  return {
    score,
    reason: reasons.length > 0 ? reasons.slice(0, 3).join('、') : '表达自然',
  };
}

/**
 * 评估人设一致性 V2
 * 基础分70 + 特征分最高30 = 最高100分
 * 
 * 评估维度：有身份感、专业度、真实感
 */
function evaluatePersonaConsistency(content: string): { score: number; reason: string } {
  let score = 70; // 基础分70分
  const reasons: string[] = [];
  
  // ========== 人设特征检测 ==========
  
  // 1. 有第一人称表达（+8分）- 显示真实感
  if (/我[是叫做]|我是|我叫|我做|我干|我搞/.test(content) ||
      /我的|我们|咱/.test(content)) {
    score += 8;
    reasons.push('有真实人设');
  }

  // 2. 有专业词汇/行业话（+7分）
  if (/这行|这个行业|这一行|行内|业内/.test(content) ||
      /从业|入行|多年经验|十几年|几十年/.test(content)) {
    score += 7;
    reasons.push('有专业感');
  }

  // 3. 有经验分享口吻（+5分）
  if (/记住|记住一句话|我帮你|教你|告诉你|说实话/.test(content)) {
    score += 5;
    reasons.push('有经验感');
  }

  // 4. 有金句/总结（+5分）
  if (/越.*越|套餐越全|第一步不是/.test(content) ||
      /记住|最后送你|这行有个说法/.test(content)) {
    score += 5;
    reasons.push('有金句');
  }

  // 5. 有地域/身份指向（+5分）
  if (/北京|上海|广州|深圳|成都|杭州|南京/.test(content) ||
      /装修|买房|买车|创业|开店/.test(content)) {
    score += 5;
    reasons.push('有身份指向');
  }

  score = Math.min(score, 100);

  return {
    score,
    reason: reasons.length > 0 ? reasons.slice(0, 3).join('、') : '人设清晰',
  };
}

/**
 * 评估结尾恰当性 V2
 * 基础分70 + 特征分最高30 = 最高100分
 * 
 * 核心原则：结尾服务于内容，不是服务于模板
 * 评估维度：简洁、自然、匹配内容
 */
function evaluateEndingAppropriateness(content: string): { score: number; reason: string } {
  let score = 70; // 基础分70分
  const reasons: string[] = [];
  
  // 提取最后100字
  const endingPart = content.slice(-150);
  
  // ========== 好的结尾特征（加分） ==========
  
  // 1. 结尾简洁（不超过2句话）（+10分）
  const lastSentences = endingPart.split(/[。！？\n]/).filter(s => s.trim());
  if (lastSentences.length <= 3) {
    score += 10;
    reasons.push('结尾简洁');
  }

  // 2. 有情感收尾/金句（+8分）
  if (/记住|这行|说实话|真的|确实|挺无奈/.test(endingPart) ||
      /越.*越/.test(endingPart)) {
    score += 8;
    reasons.push('有情感收尾');
  }

  // 3. 有互动引导（自然）（+5分）
  if (/评论区|说说|聊聊|举个手|你(觉得|怎么看|选哪个)/.test(endingPart)) {
    score += 5;
    reasons.push('有互动');
  }

  // 4. 干脆利落结尾（+5分）
  if (/下期见|就这些|这期到这|完/.test(endingPart)) {
    score += 5;
    reasons.push('干脆利落');
  }

  // ========== 套路结尾检测（不加分） ==========
  
  // 检测是否有三要素堆砌（互动+关注+预告都有）
  const hasInteraction = /评论区|说说|聊聊|收藏/.test(endingPart);
  const hasFollow = /关注/.test(endingPart);
  const hasNext = /下(一|条|期|篇)/.test(endingPart);
  
  // 如果三个都有，可能过于套路，不额外加分
  if (hasInteraction && hasFollow && hasNext) {
    // 不扣分，但也不加分
  }

  score = Math.min(score, 100);

  return {
    score,
    reason: reasons.length > 0 ? reasons.slice(0, 3).join('、') : '结尾完整',
  };
}

// ============================================
// 旧评分函数（保留以兼容）
// ============================================

/**
 * 评估好奇心触发程度（旧版，保留兼容）
 * 基础分55 + 特征分最高45 = 最高100分
 * 
 * 检测生成逻辑中的所有钩子类型
 */
function evaluateCuriosity(text: string): { score: number; reason: string } {
  let score = 55; // 基础分55分
  const reasons: string[] = ['基础分'];

  // ========== 钩子检测（与生成逻辑完全匹配）==========
  
  // 1. 提问钩子（最常见，+10分）
  if (/[?？]/.test(text) || 
      /为什么|怎么|如何|什么|哪个|哪些|多少/.test(text) ||
      /是不是|对不对|有没有|能不能|可不可以/.test(text) ||
      /你知道吗|你有没有想过|你猜|想知道吗/.test(text)) {
    score += 10;
    reasons.push('提问钩子');
  }

  // 2. 反常识钩子（+8分）
  if (/大多数(人)?(都)?(搞错|错|不知道)|真相其实|其实不然|并非如此/.test(text) ||
      /大家都(以为|觉得|认为)|很多人不知道|很少有人知道/.test(text) ||
      /误解了|理解错|搞反了/.test(text)) {
    score += 8;
    reasons.push('反常识钩子');
  }

  // 3. 揭秘钩子（+7分）
  if (/揭秘|曝光|真相|秘密|内幕|公开/.test(text) ||
      /终于(有人|敢|能)|说(实话|真话)|告诉(你|大家)/.test(text) ||
      /很少有人告诉你|没人告诉过你/.test(text)) {
    score += 7;
    reasons.push('揭秘钩子');
  }

  // 4. 故事钩子
  if (/我有一个朋友|昨天|前天|上次|那天/.test(text) ||
      /我朋友|我同事|我同学|我亲戚/.test(text) ||
      /有一(天|次|回)|记得有(一|次)/.test(text)) {
    score += 5;
    reasons.push('故事钩子');
  }

  // 5. 数据钩子
  if (/\d+%(的人|用户|人)?(不知道|不懂|不了解)/.test(text) ||
      /\d+(次|个|种|样|款|件)/.test(text) ||
      /测试了?\d+|研究了?\d+|尝试了?\d+/.test(text) ||
      /调查(显示|表明|发现)|数据(显示|表明|发现)/.test(text)) {
    score += 5;
    reasons.push('数据钩子');
  }

  // 6. 负面/警示钩子
  if (/千万别|不要|别再|停止|放弃/.test(text) ||
      /如果你还在|危险|风险|警告/.test(text) ||
      /避免|防止|小心/.test(text)) {
    score += 5;
    reasons.push('警示钩子');
  }

  // 7. 对比钩子
  if (/越.*越/.test(text) ||
      /看似.*实际|以为.*其实|表面.*背后/.test(text) ||
      /别人.*我|别人.*你/.test(text)) {
    score += 4;
    reasons.push('对比钩子');
  }

  // 8. 悬念词
  if (/竟然|居然|没想到|意外|惊人|震惊/.test(text) ||
      /但是|然而|却|可惜|遗憾的是/.test(text)) {
    score += 3;
    reasons.push('悬念词');
  }

  // 限制最高分
  score = Math.min(score, 100);

  return {
    score,
    reason: reasons.slice(0, 3).join('、'),
  };
}

/**
 * 评估利益点前置程度
 * 基础分55 + 特征分最高45 = 最高100分
 * 
 * 检测生成逻辑中的利益相关特征
 */
function evaluateBenefit(text: string, topic: string = ''): { score: number; reason: string } {
  let score = 55; // 基础分55分
  const reasons: string[] = ['基础分'];

  // ========== 钩子型利益检测 ==========
  
  // 1. 利益钩子（生成要求："今天教你...""学会这一招..."）
  if (/教(你|大家)|学会|掌握/.test(text) ||
      /这(一)?招|小技巧|小妙招|秘诀/.test(text) ||
      /今天(教|告诉|分享)/.test(text)) {
    score += 10;
    reasons.push('利益钩子');
  }

  // 2. 直接利益词
  if (/省钱|便宜|优惠|折扣|免费/.test(text) ||
      /赚钱|收入|收益|利润|回报/.test(text) ||
      /省时|省事|省心|方便|简单/.test(text)) {
    score += 8;
    reasons.push('直接利益');
  }

  // 3. 解决方案利益
  if (/避坑|避免|防止|不再|解决/.test(text) ||
      /搞定|处理|应对|破解/.test(text)) {
    score += 6;
    reasons.push('解决方案');
  }

  // 4. 成功/效果利益
  if (/成功|效果|成果|收获/.test(text) ||
      /安全|保障|保证|靠谱/.test(text)) {
    score += 4;
    reasons.push('效果利益');
  }

  // ========== 用户关联检测 ==========
  
  // 5. 与用户直接相关（生成要求中的"你"）
  if (/你|你的|您的|自己/.test(text)) {
    score += 6;
    reasons.push('用户关联');
  }

  // 6. 痛点词
  if (/坑|亏|上当|被骗|后悔|遗憾/.test(text) ||
      /麻烦|困扰|头疼|烦|累/.test(text) ||
      /浪费|损失|错过/.test(text)) {
    score += 4;
    reasons.push('痛点触发');
  }

  // 7. 具体数字利益
  if (/\d+元|\d+块|\d+万|\d+分钟|\d+小时|\d+天/.test(text) ||
      /\d+折|\d+%|\d+％/.test(text)) {
    score += 2;
    reasons.push('具体数据');
  }

  // 限制最高分
  score = Math.min(score, 100);

  return {
    score,
    reason: reasons.slice(0, 3).join('、'),
  };
}

/**
 * 评估情绪共鸣程度
 * 基础分66 + 特征分最高34 = 最高100分
 * 
 * 检测生成逻辑中的情绪特征
 */
function evaluateEmotion(text: string): { score: number; reason: string } {
  let score = 66; // 基础分66分
  const reasons: string[] = ['基础分'];

  // ========== 痛点情绪检测 ==========
  
  // 1. 痛点情绪词
  if (/坑|亏|上当|被骗|后悔|遗憾|心疼/.test(text) ||
      /浪费|损失|错过|难|苦|累/.test(text)) {
    score += 8;
    reasons.push('痛点情绪');
  }

  // ========== 共鸣词检测 ==========
  
  // 2. 共鸣词
  if (/很多人|大多数|大家|普遍|常见/.test(text) ||
      /你是不是|你有没有|你一定|相信你/.test(text) ||
      /每个人|所有人|几乎所有/.test(text)) {
    score += 8;
    reasons.push('共鸣建立');
  }

  // ========== 情绪触点检测 ==========
  
  // 3. 情绪词
  if (/震惊|惊讶|意外|惊喜|开心|高兴/.test(text) ||
      /愤怒|生气|无奈|心酸|感动/.test(text) ||
      /害怕|担心|焦虑|恐惧/.test(text)) {
    score += 6;
    reasons.push('情绪触点');
  }

  // ========== 场景代入检测 ==========
  
  // 4. 场景代入词
  if (/当.*时|想象一下|比如|例如|就像/.test(text) ||
      /曾经|以前|那时|那天/.test(text)) {
    score += 5;
    reasons.push('场景代入');
  }

  // ========== 金句特征检测 ==========
  
  // 5. 金句特征
  if (/记住(这点|这个)?|记住这句话|一定要记住/.test(text) ||
      /越.*越/.test(text)) {
    score += 4;
    reasons.push('金句特征');
  }

  // 6. 真诚语气词
  if (/其实|说真的|说实话|真的/.test(text)) {
    score += 3;
    reasons.push('真诚语气');
  }

  // 限制最高分
  score = Math.min(score, 100);

  return {
    score,
    reason: reasons.slice(0, 3).join('、'),
  };
}

/**
 * 生成开篇点评
 */
function generateOpeningComment(total: number, items: OpeningScoreItem[]): string {
  const passedCount = items.filter(item => item.passed).length;
  const totalCount = items.length;

  if (total >= 270) {
    return `开篇表现优秀！${passedCount}/${totalCount}
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
`;
  } else if (total >= 240) {
    return `开篇表现良好，${passedCount}/${totalCount}项指标通过，具有较强的吸引力。`;
  } else if (total >= 210) {
    return `开篇表现合格，${passedCount}/${totalCount}项指标通过。建议优化钩子设计，增强吸引力。`;
  } else {
    return `开篇需要优化，仅${passedCount}/${totalCount}
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
`;
  }
}

/**
 * 分析营销植入
 */
export function analyzeMarketing(
  content: string,
  marketingKeywords: string[] = []
): MarketingAnalysis {
  // 如果没有提供关键词，使用默认关键词
  const keywords = marketingKeywords.length > 0 ? marketingKeywords : [
    '联系我们', '点击链接', '立即购买', '马上咨询',
    '限时优惠', '特价', '折扣', '免费试用',
    '专业团队', '正规', '靠谱', '推荐',
  ];

  // 查找关键词位置
  const positions: { keyword: string; index: number }[] = [];
  keywords.forEach(keyword => {
    let startIndex = 0;
    while (true) {
      const index = content.indexOf(keyword, startIndex);
      if (index === -1) break;
      positions.push({ keyword, index });
      startIndex = index + 1;
    }
  });

  // 判断切入位置
  let position: MarketingPosition = 'none';
  let marketingText = '';
  
  if (positions.length > 0) {
    // 计算平均位置比例
    const avgPosition = positions.reduce((sum, p) => sum + p.index, 0) / positions.length;
    const ratio = avgPosition / content.length;
    marketingText = positions.map(p => p.keyword).join('、');

    if (ratio < 0.2) {
      position = 'beginning';
    } else if (ratio < 0.5) {
      position = 'middle';
    } else if (ratio < 0.8) {
      position = 'end';
    } else {
      position = 'throughout';
    }
  }

  // 计算营销占比（粗略估算）
  const marketingLength = positions.reduce((sum, p) => sum + p.keyword.length, 0);
  const ratio = Math.round((marketingLength / content.length) * 100);

  // 评估自然度
  const naturalness = evaluateNaturalness(content, positions);

  return {
    position,
    positionLabel: MARKETING_POSITION_CONFIG[position].label,
    method: position === 'none' ? '无营销植入' : '解决方案植入',
    ratio,
    naturalness,
    naturalnessLabel: NATURALNESS_CONFIG[naturalness].label,
    marketingText: marketingText || undefined,
  };
}

/**
 * 评估营销植入自然度
 */
function evaluateNaturalness(
  content: string,
  positions: { keyword: string; index: number }[]
): NaturalnessLevel {
  if (positions.length === 0) {
    return 5; // 无植入，自然度最高
  }

  // 检查是否在解决方案/建议上下文中
  const solutionContextPatterns = [
    /建议/, /可以/, /推荐/, /不妨/, /试试/,
    /解决/, /方案/, /方法/, /方式/,
  ];
  
  let hasSolutionContext = false;
  for (const pattern of solutionContextPatterns) {
    if (pattern.test(content)) {
      hasSolutionContext = true;
      break;
    }
  }

  // 检查营销词周围是否有引导语
  const guidancePatterns = [
    /其实/, /所以/, /因此/, /最后/, /总之/,
    /如果你/, /想要/, /希望/, /需要/,
  ];
  
  let hasGuidance = false;
  for (const pattern of guidancePatterns) {
    if (pattern.test(content)) {
      hasGuidance = true;
      break;
    }
  }

  // 计算自然度
  const avgPosition = positions.reduce((sum, p) => sum + p.index, 0) / positions.length;
  const positionRatio = avgPosition / content.length;

  // 结尾位置 + 有引导语 + 有解决方案上下文 = 自然度高
  if (positionRatio > 0.6 && hasGuidance && hasSolutionContext) {
    return 5;
  }
  // 结尾位置 + 有引导语 = 较自然
  if (positionRatio > 0.5 && (hasGuidance || hasSolutionContext)) {
    return 4;
  }
  // 中间位置 + 有上下文
  if (positionRatio > 0.3 && hasSolutionContext) {
    return 3;
  }
  // 开头位置
  if (positionRatio < 0.3) {
    return 2;
  }
  // 其他情况
  return 3;
}

/**
 * 执行质量检查 - 智能违禁词检测
 */
export function performQualityCheck(
  content: string,
  targetMin: number = 300,
  targetMax: number = 500,
  bannedWords: string[] = []
): QualityCheck {
  // 字数统计
  const wordCount = content.replace(/\s/g, '').length;
  const deviation = targetMin > 0 
    ? Math.round(((wordCount - targetMin) / targetMin) * 100)
    : 0;
  const wordCountPassed = wordCount >= targetMin * 0.9 && wordCount <= targetMax * 1.1;

  // 智能违禁词检测（区分语境）
  const foundBannedWords = detectBannedWordsSmart(content);

  // 口语化程度评估
  const colloquialScore = evaluateColloquial(content);

  // 生成优化建议
  const suggestions: string[] = [];
  if (!wordCountPassed) {
    if (wordCount < targetMin) {
      suggestions.push(`字数偏少，建议补充内容达到${targetMin}-${targetMax}字`);
    } else {
      suggestions.push(`字数偏多，建议精简内容控制在${targetMin}-${targetMax}字`);
    }
  }
  if (foundBannedWords.length > 0) {
    suggestions.push(`检测到可能违规的表达「${foundBannedWords.join('、')}」，建议检查是否符合广告法规定`);
  }
  if (colloquialScore <= 2) {
    suggestions.push("请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。");
  }

  return {
    wordCountCheck: {
      targetMin,
      targetMax,
      actual: wordCount,
      deviation,
      passed: wordCountPassed,
    },
    bannedWordsCheck: {
      found: foundBannedWords,
      passed: foundBannedWords.length === 0,
    },
    colloquialScore,
    colloquialLabel: COLLOQUIAL_CONFIG[colloquialScore].label,
    suggestions,
  };
}

/** 通用创作指导；本次公开准备重写的说明文字。历史导出名保留用于接口兼容。 */
function evaluateColloquial(content: string): ColloquialLevel {
  let score = 0;

  // 通用创作评估；保留历史接口名称。
  
  // 通用创作评估；保留历史接口名称。
  // 检测类似 "XXX，XXX，XXX。" 的模式
  const commaJoinedPatterns = content.match(/[^。？！]+[，,][^。？！]+[，,][^。？！]+[。？！]/g) || [];
  if (commaJoinedPatterns.length > 0) {
    score += Math.min(commaJoinedPatterns.length * 8, 20); // 每个+8分，最高20分
  }

  // 通用创作评估；保留历史接口名称。
  const sentences = content.split(/[。？！\n]/).filter(s => s.trim());
  const shortSentenceRatio = sentences.filter(s => s.trim().length <= 20).length / Math.max(sentences.length, 1);
  if (shortSentenceRatio > 0.7) {
    score += 15; // 70%以上是短句，加分
  } else if (shortSentenceRatio > 0.5) {
    score += 10;
  }

  // 3. 口语化词汇
  const colloquialWords = /(其实|那么|然后|就是说|比如说|你知道吗|你想想|我跟你说|说真的)/g;
  const colloquialMatches = (content.match(colloquialWords) || []).length;
  if (colloquialMatches > 0) {
    score += Math.min(colloquialMatches * 5, 15);
  }

  // 4. 语气词
  const toneWords = /[啊吧呢嘛呀哦哇嗯哎]/g;
  const toneMatches = (content.match(toneWords) || []).length;
  if (toneMatches > 0) {
    score += Math.min(toneMatches * 3, 10);
  }

  // 5. 疑问句式
  if (/？/.test(content)) {
    score += 8;
  }

  // 6. 人称代词
  if (/(你|我|他|我们|你们|他们)/.test(content)) {
    score += 8;
  }

  // ========== 书面化特征扣分 ==========
  const formalPatterns = [
    { pattern: /因此/g, score: -10 },
    { pattern: /综上所述/g, score: -10 },
    { pattern: /鉴于/g, score: -10 },
    { pattern: /由此可见/g, score: -10 },
    { pattern: /具有重要意义/g, score: -10 },
    { pattern: /不难看出/g, score: -8 },
    { pattern: /值得注意的是/g, score: -8 },
  ];

  formalPatterns.forEach(({ pattern, score: patternScore }) => {
    if (pattern.test(content)) {
      score += patternScore;
    }
  });

  // 通用创作评估；保留历史接口名称。
  // 如果句号密度过高（每10个字就一个句号），扣分
  const periodDensity = (content.match(/。/g) || []).length / Math.max(content.length, 1);
  if (periodDensity > 0.1) { // 每10个字一个句号
    score -= 5; // 句号滥用扣分
  }

  // 映射到1-5级别
  if (score >= 50) return 5;
  if (score >= 35) return 4;
  if (score >= 20) return 3;
  if (score >= 10) return 2;
  return 1;
}

/**
 * 综合评估文案评级 V2
 * 评分范围：240-300分（最低标准240分）
 * - 优秀：≥270分（90%）
 * - 良好：≥250分（83%）
 * - 合格：≥240分（80%）
 * - 待优化：240分以下
 */
export function evaluateCopywritingRating(
  openingScore: number,
  maxOpeningScore: number,
  qualityCheck: QualityCheck
): { rating: 'excellent' | 'good' | 'pass' | 'needs_work'; label: string } {
  const openingPercentage = openingScore / maxOpeningScore;
  const qualityPassed = qualityCheck.bannedWordsCheck.passed && 
    qualityCheck.wordCountCheck.passed;

  // 新评分体系：最低240分为合格线
  if (openingPercentage >= 0.90 && qualityPassed) {
    return { rating: 'excellent', label: '优秀' };
  }
  if (openingPercentage >= 0.83 && qualityPassed) {
    return { rating: 'good', label: '良好' };
  }
  if (openingPercentage >= 0.80 || (qualityPassed && openingPercentage >= 0.75)) {
    return { rating: 'pass', label: '合格' };
  }
  return { rating: 'needs_work', label: '待优化' };
}

/**
 * 智能违禁词检测
 * 区分不同语境下的违规用法，避免误判
 * 
 * 检测原则：
 * 1. 绝对违禁词：在任何语境下都违规的表达
 * 2. 语境违禁词：需要结合上下文判断是否违规
 * 3. 白名单机制：排除正常表达场景
 */
function detectBannedWordsSmart(content: string): string[] {
  const found: string[] = [];

  // ========== 1. 绝对违禁词（营销场景专用）==========
  
  // 效果保证类 - 任何场景都违规
  const absoluteBannedPatterns = [
    { pattern: /包赚|包赢|包过|包成功/, word: '效果保证' },
    { pattern: /零风险|无风险/, word: '零风险承诺' },
    { pattern: /百分百成功|百分百有效/, word: '绝对化承诺' },
  ];
  absoluteBannedPatterns.forEach(({ pattern, word }) => {
    if (pattern.test(content) && !found.includes(word)) {
      found.push(word);
    }
  });

  // ========== 2. 语境违禁词（智能判断）==========
  
  // "一定" - 仅在效果/收益承诺场景下违规
  // ✅ 正常："一定要好好学习"、"一定要坚持"
  // ❌ 违规："一定能赚钱"、"一定会成功"
  const yiDingViolationPatterns = [
    /一定能(赚|成功|赢|治|愈)/,
    /一定可以(赚|成功|赢|治|愈)/,
    /一定会(赚|成功|赢|治|愈)/,
    /一定(能|会)有效/,
    /一定(能|会)见效/,
  ];
  const hasYiDingViolation = yiDingViolationPatterns.some(p => p.test(content));
  if (hasYiDingViolation && !found.includes('效果承诺')) {
    found.push('效果承诺');
  }

  // "保证" - 仅在效果承诺场景下违规
  // ✅ 正常："保证质量"、"保证正品"
  // ❌ 违规："保证赚钱"、"保证能治"
  const baoZhengViolationPatterns = [
    /保证(赚钱|赚大钱)/,
    /保证能(赚|成功|治|愈)/,
    /保证(有效|见效)/,
    /保证(月入|年入)\d+/,
  ];
  const hasBaoZhengViolation = baoZhengViolationPatterns.some(p => p.test(content));
  if (hasBaoZhengViolation && !found.includes('效果保证')) {
    found.push('效果保证');
  }

  // "第一" - 仅在排名/最佳宣传场景下违规
  // ✅ 正常："第一步"、"第一次"、"第一印象"、"第一个建议"
  // ❌ 违规："全网第一"、"销量第一"、"行业第一品牌"
  // 
  // 关键区分：序数词 vs 排名宣传
  // 序数词：第一个、第一步、第一次、第一件事 - 这些是正常的表达
  // 排名宣传：全网第一、销量第一、行业第一 - 这些是违规的
  const diYiViolationPatterns = [
    /全网第一|全国第一|行业第一品牌/,
    /销量第一|好评第一|口碑第一/,
    /排名第一|排名第一品牌/,
    /第一品牌|销量.*第一|用户.*第一/,
    /全网.*第一|全国.*第一/,
  ];
  
  // 排除正常序数词用法
  const diYiNormalPatterns = [
    /第一个[，,。！？]/,      // "第一个，" - 序数词
    /第一步/,                 // "第一步" - 序数词
    /第一次/,                 // "第一次" - 序数词
    /第一件事/,              // "第一件事" - 序数词
    /第一个[建意指要]/,      // "第一个建议" - 序数词
    /第[一二三四五六七八九十]+[个步件事次]/,  // 序数词模式
  ];
  
  // 先检查是否是正常的序数词用法
  const isNormalUsage = diYiNormalPatterns.some(p => p.test(content));
  
  // 只有在不是正常用法的情况下才检查违规
  const hasDiYiViolation = !isNormalUsage && diYiViolationPatterns.some(p => p.test(content));
  if (hasDiYiViolation && !found.includes('排名宣传')) {
    found.push('排名宣传');
  }

  // "最" - 仅在最佳/最好宣传场景下违规
  // ✅ 正常："最重要"、"最好吃"（个人体验）
  // ❌ 违规："全网最好"、"行业最佳"（排名宣传）
  const zuiViolationPatterns = [
    /全网最(好|佳|强|便宜)/,
    /全国最(好|佳|强|便宜)/,
    /行业最(好|佳|强)/,
    /史上最(好|佳|强)/,
  ];
  const hasZuiViolation = zuiViolationPatterns.some(p => p.test(content));
  if (hasZuiViolation && !found.includes('最佳宣传')) {
    found.push('最佳宣传');
  }

  // "绝对" - 仅在效果承诺场景下违规
  // ✅ 正常："绝对是误会"、"绝对没问题"（口语）
  // ❌ 违规："绝对能赚钱"、"绝对有效"
  const jueDuiViolationPatterns = [
    /绝对(能|会)(赚|成功|治|愈)/,
    /绝对(有效|见效)/,
    /绝对(安全|无害)/,
  ];
  const hasJueDuiViolation = jueDuiViolationPatterns.some(p => p.test(content));
  if (hasJueDuiViolation && !found.includes('绝对化承诺')) {
    found.push('绝对化承诺');
  }

  // "唯一" - 仅在排他性宣传场景下违规
  // ✅ 正常："唯一的办法"、"我唯一的朋友"
  // ❌ 违规："全网唯一"、"国内唯一"（虚假背书）
  const weiYiViolationPatterns = [
    /全网唯一|全国唯一|国内唯一/,
    /行业内唯一|市场上唯一/,
    /唯一指定|唯一授权/,
  ];
  const hasWeiYiViolation = weiYiViolationPatterns.some(p => p.test(content));
  if (hasWeiYiViolation && !found.includes('唯一性宣传')) {
    found.push('唯一性宣传');
  }

  // "国家级/世界级/顶级" - 权威背书类
  const authorityViolationPatterns = [
    /国家级(产品|品牌|认证)/,
    /世界级(品质|品牌|技术)/,
    /顶级(配置|品质|技术|专家)/,
  ];
  const hasAuthorityViolation = authorityViolationPatterns.some(p => p.test(content));
  if (hasAuthorityViolation && !found.includes('权威背书')) {
    found.push('权威背书');
  }

  return found;
}

// ============================================
// 通用创作评估；保留历史接口名称。
// ============================================

/** 通用创作指导；本次公开准备重写的说明文字。历史导出名保留用于接口兼容。 */
export function evaluatePitToSolution(content: string): {
  hasPits: boolean;
  pitCount: number;
  hasSolutions: boolean;
  solutionCount: number;
  score: number;
  reason: string;
} {
  // 检测痛点/坑
  const pitPatterns = [
    /坑|亏|上当|被骗|后悔|遗憾|心疼/,
    /浪费|损失|错过|难|苦|累/,
    /千万别|不要|别再|停止|放弃/,
    /危险|风险|警告|避免|防止/,
    /错误|误区|陷阱|雷/,
  ];
  
  let pitCount = 0;
  const pitSentences: string[] = [];
  const sentences = content.split(/[。？！\n]/).filter(s => s.trim());
  
  sentences.forEach(sentence => {
    if (pitPatterns.some(p => p.test(sentence))) {
      pitCount++;
      pitSentences.push(sentence.trim());
    }
  });

  // 检测解决方案
  const solutionPatterns = [
    /正确做法|应该|建议|推荐|试试/,
    /可以|不妨|最好|一定要/,
    /解决|方案|方法|技巧/,
    /我是.*帮你|找我|联系/,
    /关注.*下(一期|条|篇)/,
  ];
  
  let solutionCount = 0;
  sentences.forEach(sentence => {
    if (solutionPatterns.some(p => p.test(sentence))) {
      solutionCount++;
    }
  });

  // 计算得分
  // 基础分60分，有坑有解加分，有坑无解扣分
  let score = 60; // 基础分
  let reason = '';
  
  if (pitCount > 0) {
    const solutionRatio = solutionCount / pitCount;
    if (solutionRatio >= 1) {
      score = 80 + Math.min(solutionCount * 3, 15); // 每个坑都有解，高分
      reason = `有坑有解：发现${pitCount}个痛点，有${solutionCount}个解决方案`;
    } else if (solutionRatio >= 0.5) {
      score = 68 + Math.min(solutionCount * 2, 12);
      reason = `部分有解：发现${pitCount}个痛点，有${solutionCount}个解决方案`;
    } else {
      score = 45; // 有坑无解，低分
      reason = `⚠️ 有坑无解：发现${pitCount}个痛点，仅${solutionCount}个解决方案`;
    }
  } else {
    // 没有检测到痛点，给基础分（文案可能不是"避坑"类型）
    reason = '未检测到痛点（可能是非避坑类文案）';
  }

  return {
    hasPits: pitCount > 0,
    pitCount,
    hasSolutions: solutionCount > 0,
    solutionCount,
    score: Math.min(score, 100),
    reason,
  };
}

/** 通用创作指导；本次公开准备重写的说明文字。历史导出名保留用于接口兼容。 */
export function evaluateEndingLoop(content: string): {
  hasInteraction: boolean;
  hasFollowReason: boolean;
  hasNextExpectation: boolean;
  score: number;
  reason: string;
} {
  // 提取最后100字（结尾部分）
  const endingPart = content.slice(-150);
  
  // 1. 检测低门槛互动
  const interactionPatterns = [
    /收藏(这条|起来|一下)/,
    /(举个手|举手|扣[12]|评论(区)?说说)/,
    /你是.*吗/,
    /(正在|准备).*的/,
    /(有没有|是不是).*/,
  ];
  const hasInteraction = interactionPatterns.some(p => p.test(endingPart));

  // 2. 检测关注理由
  const followReasonPatterns = [
    /关注.*[，,].*(下|给|教|送|讲)/,
    /关注我[，,].*/,
    /关注.*不踩坑/,
    /关注.*省/,
    /关注.*避/,
  ];
  const hasFollowReason = followReasonPatterns.some(p => p.test(endingPart));

  // 3. 检测下一条预期
  const nextExpectationPatterns = [
    /下(一|条|期|篇).*(讲|说|教|给)/,
    /下(一|条|期|篇).*/,
    /明天(讲|说|教|给)/,
    /下一期/,
    /下一条/,
  ];
  const hasNextExpectation = nextExpectationPatterns.some(p => p.test(endingPart));

  // 计算得分
  // 基础分60分，有结尾闭环要素加分
  let score = 60; // 基础分
  const elements: string[] = [];
  
  if (hasInteraction) {
    score += 13;
    elements.push('互动');
  }
  if (hasFollowReason) {
    score += 13;
    elements.push('关注理由');
  }
  if (hasNextExpectation) {
    score += 14;
    elements.push('下一条预期');
  }

  const reason = elements.length > 0 
    ? `结尾闭环：${elements.join('、')}` 
    : '结尾缺少闭环要素';

  return {
    hasInteraction,
    hasFollowReason,
    hasNextExpectation,
    score,
    reason,
  };
}

/** 通用创作指导；本次公开准备重写的说明文字。历史导出名保留用于接口兼容。 */
export function evaluateUnifiedSlogan(content: string): {
  hasSlogan: boolean;
  sloganCount: number;
  slogan: string | null;
  score: number;
  reason: string;
} {
  // 常见的slogan模式
  const sloganPatterns = [
    // 身份型
    /我是[^，,。？！]+[，,]帮你[^，,。？！]+/,
    /我是[^，,。？！]+[，,]。*不踩坑/,
    // 价值型
    /[^。？！]*第一步[，,]不是[^，,。？！]+是[^，,。？！]+/,
    // 反差型
    /你以为[^，,。？！]+[，,]?其实[^，,。？！]+/,
  ];

  // 检测重复出现的短语（可能是slogan）
  const phrases = content.match(/[\u4e00-\u9fa5]{8,15}/g) || [];
  const phraseCount: Record<string, number> = {};
  
  phrases.forEach(phrase => {
    const normalized = phrase.trim();
    if (normalized.length >= 8 && normalized.length <= 15) {
      phraseCount[normalized] = (phraseCount[normalized] || 0) + 1;
    }
  });

  // 找出重复出现的短语
  const repeatedPhrases = Object.entries(phraseCount)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  const hasSlogan = repeatedPhrases.length > 0;
  const slogan = hasSlogan ? repeatedPhrases[0][0] : null;
  const sloganCount = hasSlogan ? repeatedPhrases[0][1] : 0;

  // 计算得分
  let score = 50; // 基础分
  let reason = '';

  if (hasSlogan) {
    if (sloganCount >= 3) {
      score = 90;
      reason = `统一slogan：「${slogan}」出现${sloganCount}次`;
    } else if (sloganCount >= 2) {
      score = 75;
      reason = `有slogan：「${slogan}」出现${sloganCount}次`;
    }
  } else {
    reason = '未检测到贯穿全文的slogan';
  }

  return {
    hasSlogan,
    sloganCount,
    slogan,
    score,
    reason,
  };
}

/** 通用创作指导；本次公开准备重写的说明文字。历史导出名保留用于接口兼容。 */
export function calculateXuehuiScore(
  content: string,
  openingScore: number
): {
  totalScore: number;
  pitToSolution: ReturnType<typeof evaluatePitToSolution>;
  endingLoop: ReturnType<typeof evaluateEndingLoop>;
  unifiedSlogan: ReturnType<typeof evaluateUnifiedSlogan>;
  comment: string;
} {
  const pitToSolution = evaluatePitToSolution(content);
  const endingLoop = evaluateEndingLoop(content);
  const unifiedSlogan = evaluateUnifiedSlogan(content);

  // 综合评分 = 开篇评分(60%) + 有坑有解(15%) + 结尾闭环(15%) + 统一slogan(10%)
  const maxOpeningScore = 300;
  const normalizedOpeningScore = (openingScore / maxOpeningScore) * 60;
  
  const totalScore = Math.round(
    normalizedOpeningScore +
    (pitToSolution.score / 100) * 15 +
    (endingLoop.score / 100) * 15 +
    (unifiedSlogan.score / 100) * 10
  );

  // 生成点评
  const comments: string[] = [];
  
  if (pitToSolution.score >= 70) {
    comments.push('✅ 有坑有解');
  } else if (pitToSolution.hasPits && pitToSolution.solutionCount === 0) {
    comments.push('⚠️ 只吐槽不教');
  }
  
  if (endingLoop.score >= 70) {
    comments.push('✅ 结尾闭环完整');
  } else {
    const missing: string[] = [];
    if (!endingLoop.hasInteraction) missing.push('互动');
    if (!endingLoop.hasFollowReason) missing.push('关注理由');
    if (!endingLoop.hasNextExpectation) missing.push('下一条预期');
    if (missing.length > 0) {
      comments.push(`⚠️ 结尾缺少：${missing.join('、')}`);
    }
  }
  
  if (unifiedSlogan.hasSlogan) {
    comments.push(`✅ 有统一slogan`);
  }

  const comment = comments.length > 0 ? comments.join('；') : '文案符合爆款标准';

  return {
    totalScore,
    pitToSolution,
    endingLoop,
    unifiedSlogan,
    comment,
  };
}
