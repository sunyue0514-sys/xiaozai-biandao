/**
 * 开篇质量检查模块
 * 检查开篇是否符合爆款基础要求
 */

// 质量检查结果接口
export interface QualityCheckResult {
  wordCount: number;        // 字数
  concise: boolean;         // 简洁直接
  colloquial: boolean;      // 口语化
  restrained: boolean;      // 克制表达
  userRelated: boolean;     // 与用户相关
  issues: string[];         // 存在的问题
}

// 书面语词汇模式
const WRITTEN_PATTERNS = [
  /因此/,
  /由于/,
  /鉴于/,
  /综上所述/,
  /由此可见/,
  /由此可见/,
  /毋庸置疑/,
  /由此可见/,
  /众所周知/,
  /不言而喻/,
  /总而言之/,
  /显而易见/,
  /不难看出/,
  /值得一提/,
  /综上所述/,
  /换句话说/,
  /换言之/,
  /如此一来/,
  /与此同时/,
];

// 夸大绝对化词汇模式
const EXAGGERATION_PATTERNS = [
  /最好/,
  /最强/,
  /最牛/,
  /第一[名家]/,
  /绝对/,
  /肯定/,
  /一定/,
  /必须/,
  /只能/,
  /只有/,
  /全部/,
  /所有/,
  /永远/,
  /从未/,
  /史上/,
  /史上最/,
  /史上最强/,
];

// 冗余修饰词模式
const REDUNDANT_PATTERNS = [
  /非常非常/,
  /特别特别/,
  /真的真的/,
  /真的特别/,
  /特别真的/,
  /非常特别/,
];

/**
 * 检查字数是否合适
 * 爆款开篇通常在20-50字
 */
function checkWordCount(content: string): { count: number; isGood: boolean } {
  // 移除标点和空格后计算实际字数
  const cleanContent = content.replace(/[\s，。！？、；：""''（）【】《》…—]/g, '');
  const count = cleanContent.length;
  
  // 理想范围：20-50字
  const isGood = count >= 15 && count <= 60;
  
  return { count, isGood };
}

/**
 * 检查是否简洁直接
 * 一句话说清一个意思，无冗余修饰
 */
function checkConcise(content: string): { isConcise: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // 检查句子数量（逗号分隔也算）
  const sentences = content.split(/[，。！？、]/).filter(s => s.trim());
  if (sentences.length > 3) {
    issues.push('句子过多，建议控制在2-3句内');
  }
  
  // 检查是否有冗余修饰
  for (const pattern of REDUNDANT_PATTERNS) {
    if (pattern.test(content)) {
      issues.push('存在重复修饰词，建议精简');
      break;
    }
  }
  
  // 检查是否有过多形容词
  const adjectives = content.match(/很|非常|特别|真的|相当|十分|极其/g) || [];
  if (adjectives.length > 2) {
    issues.push('形容词过多，建议减少修饰');
  }
  
  // 检查总长度
  if (content.length > 60) {
    issues.push('字数偏多，建议控制在50字以内');
  }
  
  return {
    isConcise: issues.length === 0,
    issues,
  };
}

/**
 * 检查是否口语化
 * 无书面语、成语堆砌
 */
function checkColloquial(content: string): { isColloquial: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // 检查书面语
  for (const pattern of WRITTEN_PATTERNS) {
    if (pattern.test(content)) {
      issues.push('存在书面语表达，建议改为口语');
      break;
    }
  }
  
  // 检查成语使用
  const idioms = content.match(/[一][^，。！？]{2,3}[是才]$/gm) || [];
  if (idioms.length > 1) {
    issues.push('成语使用过多，建议用日常表达');
  }
  
  // 检查是否有过于正式的句式
  if (/之所以[.,，。].*是因为/.test(content)) {
    issues.push('"之所以...是因为"过于书面，建议简化');
  }
  
  // 检查是否有"的"字过多
  const deCount = (content.match(/的/g) || []).length;
  if (deCount > 3) {
    issues.push('"的"字使用过多，建议精简');
  }
  
  return {
    isColloquial: issues.length === 0,
    issues,
  };
}

/**
 * 检查是否克制表达
 * 无夸大、绝对化词汇
 */
function checkRestrained(content: string): { isRestrained: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // 检查夸大词汇
  for (const pattern of EXAGGERATION_PATTERNS) {
    if (pattern.test(content)) {
      issues.push('存在夸大或绝对化表达，建议改为克制表达');
      break;
    }
  }
  
  // 检查是否有过度承诺
  const overPromise = /(保证|包你|一定让你|肯定能|绝对能|100%|百分之百)/;
  if (overPromise.test(content)) {
    issues.push('存在过度承诺，建议更客观表达');
  }
  
  // 检查是否有煽动性词汇
  const inflammatory = /(震惊|惊呆|吓哭|疯了|疯了|彻底疯了)/;
  if (inflammatory.test(content)) {
    issues.push('存在煽动性词汇，建议更理性表达');
  }
  
  return {
    isRestrained: issues.length === 0,
    issues,
  };
}

/**
 * 检查是否与用户相关
 * 有"你"、直接利益关联
 */
function checkUserRelated(content: string): { isRelated: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // 检查是否有"你"
  const hasYou = /你|你的|你们/.test(content);
  
  // 检查是否有利益关联词
  const hasBenefit = /赚钱|省钱|省时|省力|提升|改变|成功|突破|避免|解决|问题|困扰/.test(content);
  
  // 检查是否有痛点词
  const hasPain = /痛|难|烦|累|苦|愁|怕|担心|焦虑|纠结|迷茫/.test(content);
  
  if (!hasYou && !hasBenefit && !hasPain) {
    issues.push('与用户关联度低，建议增加"你"或直接利益关联');
  }
  
  return {
    isRelated: issues.length === 0,
    issues,
  };
}

/**
 * 综合质量检查
 */
export function checkOpeningQuality(content: string): QualityCheckResult {
  const { count } = checkWordCount(content);
  const { isConcise, issues: conciseIssues } = checkConcise(content);
  const { isColloquial, issues: colloquialIssues } = checkColloquial(content);
  const { isRestrained, issues: restrainedIssues } = checkRestrained(content);
  const { isRelated, issues: relatedIssues } = checkUserRelated(content);
  
  const allIssues = [
    ...conciseIssues,
    ...colloquialIssues,
    ...restrainedIssues,
    ...relatedIssues,
  ];
  
  return {
    wordCount: count,
    concise: isConcise,
    colloquial: isColloquial,
    restrained: isRestrained,
    userRelated: isRelated,
    issues: allIssues,
  };
}

/**
 * 获取质量检查的通过率
 */
export function getQualityScore(result: QualityCheckResult): number {
  const checks = [result.concise, result.colloquial, result.restrained, result.userRelated];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

/**
 * 获取质量标签列表
 */
export function getQualityLabels(result: QualityCheckResult): Array<{ label: string; passed: boolean }> {
  return [
    { label: `${result.wordCount}字`, passed: result.wordCount >= 15 && result.wordCount <= 60 },
    { label: '简洁直接', passed: result.concise },
    { label: '口语化', passed: result.colloquial },
    { label: '克制表达', passed: result.restrained },
    { label: '与用户相关', passed: result.userRelated },
  ];
}
