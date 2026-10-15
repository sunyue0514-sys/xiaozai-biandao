/**
 * 选题类型和论证方式配置
 */

// ==================== 新版选题分类（竞品对标） ====================

// 选题主分类（流量型/变现型/人设型）
export const TOPIC_CATEGORIES = {
  traffic: {
    id: 'traffic',
    name: '流量型选题',
    label: '流量型',
    description: '用于获取流量、扩大影响力',
    icon: '🚀',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  conversion: {
    id: 'conversion',
    name: '变现型选题',
    label: '变现型',
    description: '用于促进转化、实现变现',
    icon: '💰',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  persona: {
    id: 'persona',
    name: '人设型选题',
    label: '人设型',
    description: '用于强化人设、建立信任',
    icon: '👤',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
} as const;

// 子类型目标定义
export const TOPIC_SUB_TYPES = {
  // 流量型子分类
  traffic_a: { id: 'traffic_a', parentId: 'traffic', subType: 'A', name: '破圈引流', goal: '吸引新用户关注，扩大受众范围' },
  traffic_b: { id: 'traffic_b', parentId: 'traffic', subType: 'B', name: '建立链接', goal: '与用户建立情感连接，增强粘性' },
  // 变现型子分类
  conversion_a: { id: 'conversion_a', parentId: 'conversion', subType: 'A', name: '促进转化', goal: '直接推动用户购买或行动' },
  conversion_b: { id: 'conversion_b', parentId: 'conversion', subType: 'B', name: '培育需求', goal: '激发用户潜在需求，为转化铺垫' },
  // 人设型子分类
  persona_a: { id: 'persona_a', parentId: 'persona', subType: 'A', name: '强化共鸣', goal: '展现价值观，引发用户共鸣' },
  persona_b: { id: 'persona_b', parentId: 'persona', subType: 'B', name: '建立信任', goal: '展示专业度和真诚，赢得用户信任' },
} as const;

// ==================== 旧版选题分类（保留兼容） ====================

// 脚本类型（对应选题生成）
export const TOPIC_TYPES = {
  opinion: {
    id: 'opinion',
    name: '说观点',
    label: '聊观点',
    description: '表达独特个人观点，引发思考',
    icon: '💡',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  knowledge: {
    id: 'knowledge',
    name: '教知识',
    label: '教知识',
    description: '分享有价值专业知识',
    icon: '📚',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  process: {
    id: 'process',
    name: '晒过程',
    label: '晒过程',
    description: '展示某件事完整过程',
    icon: '🎬',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  story: {
    id: 'story',
    name: '讲故事',
    label: '讲故事',
    description: '通过故事化内容吸引观众',
    icon: '📖',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
} as const;

// 论证方式（说观点类型）
export const OPINION_METHODS = {
  inductive: { id: 'inductive', name: '归纳论证', desc: '从具体案例归纳出观点' },
  comparative: { id: 'comparative', name: '对比论证', desc: '通过对比突出观点' },
  causal: { id: 'causal', name: '因果论证', desc: '分析原因和结果' },
  counterexample: { id: 'counterexample', name: '反例论证', desc: '用反例佐证观点' },
} as const;

// 知识类型（教知识类型）
export const KNOWLEDGE_METHODS = {
  problem_solving: { id: 'problem_solving', name: '解题型', desc: '解决具体问题' },
  reveal: { id: 'reveal', name: '揭秘型', desc: '揭露行业内幕' },
  recommendation: { id: 'recommendation', name: '推荐型', desc: '推荐产品或方法' },
  comparison: { id: 'comparison', name: '对比型', desc: '对比分析优劣' },
} as const;

// 过程类型（晒过程类型）
export const PROCESS_METHODS = {
  showcase: { id: 'showcase', name: '过程展示', desc: '展示完整过程' },
  review: { id: 'review', name: '测评产品', desc: '测评产品效果' },
  challenge: { id: 'challenge', name: '任务挑战', desc: '挑战完成某任务' },
  comparison: { id: 'comparison', name: '对比测评', desc: '对比不同方案' },
} as const;

// 故事类型（讲故事类型）
export const STORY_METHODS = {
  success: { id: 'success', name: '成功案例', desc: '分享成功经历' },
  struggle: { id: 'struggle', name: '苦难经历', desc: '讲述困难克服' },
  hero: { id: 'hero', name: '平凡英雄', desc: '普通人不平凡事' },
  transformation: { id: 'transformation', name: '蜕变成长', desc: '成长变化故事' },
} as const;

// 亮点标签
export const HIGHLIGHT_TAGS = {
  target_audience: { id: 'target_audience', name: '圈定人群', icon: '🎯', desc: '精准定位目标人群' },
  pain_point: { id: 'pain_point', name: '痛点切入', icon: '🔥', desc: '直击用户痛点' },
  save_money: { id: 'save_money', name: '省钱攻略', icon: '💰', desc: '帮助用户省钱' },
  avoid_pitfall: { id: 'avoid_pitfall', name: '避坑指南', icon: '⚡', desc: '避免踩坑' },
  emotional: { id: 'emotional', name: '情感共鸣', icon: '❤️', desc: '引发情感共鸣' },
  curiosity: { id: 'curiosity', name: '激发好奇', icon: '🤔', desc: '激发用户好奇心' },
  contrast: { id: 'contrast', name: '反差冲击', icon: '💥', desc: '制造强烈反差' },
  practical: { id: 'practical', name: '实用干货', icon: '💡', desc: '提供实用价值' },
} as const;

// 获取类型的论证方式
export function getMethodsForType(typeId: string) {
  switch (typeId) {
    case 'opinion':
      return Object.values(OPINION_METHODS);
    case 'knowledge':
      return Object.values(KNOWLEDGE_METHODS);
    case 'process':
      return Object.values(PROCESS_METHODS);
    case 'story':
      return Object.values(STORY_METHODS);
    default:
      return [];
  }
}

// 选题结果接口（旧版兼容）
export interface TopicResult {
  id: string;
  content: string;           // 选题内容
  type: keyof typeof TOPIC_TYPES;  // 脚本类型
  typeName: string;          // 类型名称
  method: string;            // 论证方式
  methodName: string;        // 论证方式名称
  score: number;             // 评分 (0-100)
  highlights: string[];      // 亮点标签
  highlightNames: string[];  // 亮点标签名称
}

// 按类型分组的选题结果（旧版兼容）
export interface GroupedTopicResults {
  [typeId: string]: {
    typeInfo: typeof TOPIC_TYPES[keyof typeof TOPIC_TYPES];
    topics: TopicResult[];
  };
}

// ==================== 新版接口定义 ====================

// 新版选题结果接口
export interface NewTopicResult {
  id: string;
  content: string;           // 选题内容
  categoryId: 'traffic' | 'conversion' | 'persona';  // 选题主分类
  categoryName: string;      // 分类名称
  subType: 'A' | 'B';        // 子类型（A类/B类）
  subTypeName: string;       // 子类型名称（如"破圈引流"）
  subTypeGoal: string;       // 子类型目标说明
  method?: string;           // 论证方式
  methodName?: string;       // 论证方式名称
  score: number;             // 评分 (0-100)
  highlights: string[];      // 亮点标签
}

// 新版按分类分组的选题结果
export interface NewGroupedTopics {
  categoryId: 'traffic' | 'conversion' | 'persona';
  categoryInfo: typeof TOPIC_CATEGORIES[keyof typeof TOPIC_CATEGORIES];
  subGroups: {
    subTypeId: string;
    subType: 'A' | 'B';
    name: string;            // 如"破圈引流"
    goal: string;            // 目标说明
    topics: NewTopicResult[];
  }[];
}

// 人群分析结果
export interface AudienceAnalysis {
  profile: string;           // 目标人群画像
  quadrants: Array<{
    id: string;
    name: string;
    desc: string;
    focus: string;
    examples?: string[];
  }>;
  painPoints: {
    demand: string;          // 需求
    pain: string;            // 痛点
    pleasure: string;        // 爽点
    itch: string;            // 痒点
  };
  businessGoal: string;      // 商业目标
  strategy: string;          // 选题策略
}

// 新版完整选题结果数据
export interface NewTopicResultData {
  version: '2.0';            // 版本标识
  audienceAnalysis?: AudienceAnalysis;
  groupedTopics: NewGroupedTopics[];
  total: number;
}

// 获取分类的子类型
export function getSubTypesForCategory(categoryId: string) {
  return Object.values(TOPIC_SUB_TYPES).filter(st => st.parentId === categoryId);
}
