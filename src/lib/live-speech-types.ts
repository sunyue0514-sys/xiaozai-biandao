/**
 * 本地生活团购直播话术类型定义
 * 基于五步法框架 + 三种钩子类型
 */

// ==================== 行业类型 ====================

export const INDUSTRY_TYPES = {
  catering: {
    id: 'catering',
    name: '餐饮美食',
    icon: '🍜',
    examples: ['火锅', '烧烤', '自助餐', '奶茶', '快餐', '西餐'],
  },
  hotel: {
    id: 'hotel',
    name: '酒店住宿',
    icon: '🏨',
    examples: ['民宿', '度假村', '商务酒店', '主题酒店'],
  },
  beauty: {
    id: 'beauty',
    name: '美容美业',
    icon: '💅',
    examples: ['美发', '美甲', 'SPA', '护肤', '医美'],
  },
  entertainment: {
    id: 'entertainment',
    name: '亲子娱乐',
    icon: '🎢',
    examples: ['游乐园', '密室逃脱', 'KTV', '电影院', '剧本杀'],
  },
  fitness: {
    id: 'fitness',
    name: '运动健身',
    icon: '💪',
    examples: ['健身房', '瑜伽', '游泳', '球类运动'],
  },
  other: {
    id: 'other',
    name: '其他行业',
    icon: '📦',
    examples: ['教育培训', '汽车服务', '家政服务'],
  },
} as const;

// ==================== 钩子类型 ====================

export const HOOK_TYPES = {
  price: {
    id: 'price',
    name: '价格钩',
    label: '爆款冲单版',
    description: '价格对比 → 性价比冲击',
    icon: '💰',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
   适用场景: '优惠力度大的产品',
  },
  pain: {
    id: 'pain',
    name: '痛点钩',
    label: '精准转化版',
    description: '直击痛点 → 解决方案',
    icon: '🎯',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    适用场景: '解决用户困扰的场景',
  },
  scenario: {
    id: 'scenario',
    name: '场景钩',
    label: '情感共鸣版',
    description: '场景描绘 → 代入感',
    icon: '🎬',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    适用场景: '特定使用场景的产品',
  },
} as const;

// ==================== 话术步骤 ====================

export const SPEECH_STEPS = {
  opening: {
    id: 'opening',
    name: '开场留人',
    order: 1,
    icon: '🎤',
    description: '抓住注意力，抛出钩子（3秒内）',
    tips: [
      '黄金3秒法则：前3秒决定用户是否停留',
      '必须抛出钩子：价格/痛点/利益/悬念',
      '开场公式：身份定位 + 核心福利 + 紧迫感',
    ],
  },
  value: {
    id: 'value',
    name: '价值塑造',
    order: 2,
    icon: '🏷️',
    description: '拆解套餐，用数字强化性价比',
    tips: [
      '拆解法：把套餐内容拆开算账',
      '对比法：用市场价对比直播间价',
      '具象化：用具体细节增强真实感',
    ],
  },
  scenario: {
    id: 'scenario',
    name: '场景代入',
    order: 3,
    icon: '🎬',
    description: '描绘具体使用场景，引发共鸣',
    tips: [
      '五感描述法：视觉、听觉、嗅觉、味觉、触觉',
      '时间场景法：周末、下班、聚会、约会',
      '让用户想象自己正在使用产品的场景',
    ],
  },
  scarcity: {
    id: 'scarcity',
    name: '稀缺促单',
    order: 4,
    icon: '🔥',
    description: '制造紧迫感，限时限量',
    tips: [
      '限时：今天、最后XX分钟',
      '限量：仅剩XX份',
      '库存告急：后台显示库存紧张',
    ],
  },
  trust: {
    id: 'trust',
    name: '信任保障',
    order: 5,
    icon: '✅',
    description: '售后政策，消除顾虑',
    tips: [
      '零风险承诺：不约可退、随时退、过期自动退',
      '权威背书：官方认证、服务人数、好评率',
      '消除顾虑：不满意可退款、支持试用',
    ],
  },
} as const;

// ==================== 场景类型 ====================

export const SCENARIO_TYPES = {
  weekend_home: {
    id: 'weekend_home',
    name: '周末宅家',
    icon: '🏠',
    desc: '周末休息在家追剧、打游戏等场景',
  },
  after_work: {
    id: 'after_work',
    name: '下班后聚餐',
    icon: '🌙',
    desc: '下班后和朋友、同事聚餐场景',
  },
  friends_gathering: {
    id: 'friends_gathering',
    name: '朋友聚会',
    icon: '🎉',
    desc: '和朋友一起聚会、庆祝场景',
  },
  family_dinner: {
    id: 'family_dinner',
    name: '家庭聚餐',
    icon: '👨‍👩‍👧‍👦',
    desc: '和家人一起吃饭、庆祝场景',
  },
  date: {
    id: 'date',
    name: '情侣约会',
    icon: '💑',
    desc: '情侣约会、纪念日等场景',
  },
  business: {
    id: 'business',
    name: '商务宴请',
    icon: '💼',
    desc: '商务应酬、接待客户场景',
  },
  birthday: {
    id: 'birthday',
    name: '生日派对',
    icon: '🎂',
    desc: '生日庆祝、派对场景',
  },
} as const;

// ==================== 接口定义 ====================

// 套餐内容项
export interface PackageItem {
  name: string;           // 项目名称
  originalPrice?: number; // 原价（可选）
  description?: string;   // 描述（可选）
}

// 输入参数接口
export interface LiveSpeechInput {
  // 基础信息
  merchantName: string;         // 商家名称
  industry: keyof typeof INDUSTRY_TYPES; // 行业类型
  
  // 价格信息
  originalPrice: number;        // 原价
  livePrice: number;            // 直播价
  
  // 套餐内容
  packageContent: string;       // 套餐内容描述
  packageItems?: PackageItem[]; // 套餐明细（可选）
  
  // 核心卖点（可选）
  sellingPoints?: string[];
  
  // 特色亮点（可选）
  highlights?: string[];
  
  // 售后政策（可选）
  afterSalesPolicy?: string;
  
  // 目标场景（可选）
  targetScenarios?: (keyof typeof SCENARIO_TYPES)[];
  
  // 目标人群（可选）
  targetAudience?: string;
  
  // 其他补充信息（可选）
  additionalInfo?: string;
}

// 单个话术步骤内容
export interface SpeechStepContent {
  stepId: string;           // 步骤ID
  stepName: string;         // 步骤名称
  order: number;            // 顺序
  content: string;          // 话术内容
  tips?: string[];          // 技巧提示
}

// 单套话术（包含五步）
export interface SingleSpeech {
  hookType: keyof typeof HOOK_TYPES;  // 钩子类型
  hookName: string;                   // 钩子名称
  hookLabel: string;                  // 钩子标签（如"爆款冲单版"）
  hookDescription: string;            // 钩子描述
  
  // 五步话术
  steps: SpeechStepContent[];
  
  // 技巧解析
  analysis: {
    hookType: string;       // 钩子类型说明
    coreTechnique: string;  // 核心技巧
    copyableFormula: string; // 可复制公式
  };
  
  // 完整话术（拼接后）
  fullScript: string;
}

// 输出结果接口
export interface LiveSpeechOutput {
  // 基础信息
  merchantName: string;
  industry: string;
  industryName: string;
  
  // 价格对比
  priceInfo: {
    originalPrice: number;
    livePrice: number;
    discount: number;        // 折扣金额
    discountRate: string;    // 折扣比例（如"6.6折"）
  };
  
  // 套餐价值
  packageValue: {
    totalItems: number;      // 套餐项目数
    estimatedValue: number;  // 估算总价值
    savings: number;         // 节省金额
  };
  
  // 三套话术（价格钩/痛点钩/场景钩）
  speeches: SingleSpeech[];
  
  // 优化建议
  suggestions: {
    missingInfo: string[];   // 可补充的信息维度
    versionSwitch: string;   // 版本切换建议
    industryTips: string;    // 行业特定建议
  };
  
  // 元信息
  generatedAt: string;
  version: string;
}

// API请求参数
export interface LiveSpeechRequest {
  merchantName: string;
  industry: string;
  originalPrice: number;
  livePrice: number;
  packageContent: string;
  packageItems?: PackageItem[];
  sellingPoints?: string[];
  highlights?: string[];
  afterSalesPolicy?: string;
  targetScenarios?: string[];
  targetAudience?: string;
  additionalInfo?: string;
}

// API响应（流式）
export interface LiveSpeechStreamMessage {
  type: 'progress' | 'hook_speech' | 'done' | 'error';
  
  // progress 类型
  stage?: 'analyzing' | 'generating_price' | 'generating_pain' | 'generating_scenario' | 'finalizing';
  message?: string;
  progress?: number;  // 0-100
  
  // hook_speech 类型
  hookType?: keyof typeof HOOK_TYPES;
  speech?: SingleSpeech;
  
  // done 类型
  output?: LiveSpeechOutput;
  
  // error 类型
  error?: string;
}

// 获取行业的场景推荐
export function getRecommendedScenarios(industry: keyof typeof INDUSTRY_TYPES): (keyof typeof SCENARIO_TYPES)[] {
  const scenarioMap: Record<string, (keyof typeof SCENARIO_TYPES)[]> = {
    catering: ['friends_gathering', 'family_dinner', 'after_work', 'date', 'weekend_home'],
    hotel: ['date', 'family_dinner', 'weekend_home', 'business'],
    beauty: ['date', 'weekend_home', 'friends_gathering'],
    entertainment: ['friends_gathering', 'family_dinner', 'birthday', 'date'],
    fitness: ['after_work', 'weekend_home', 'friends_gathering'],
    other: ['friends_gathering', 'after_work', 'weekend_home'],
  };
  return scenarioMap[industry] || scenarioMap.other;
}

// 计算折扣
export function calculateDiscount(original: number, live: number): { discount: number; rate: string } {
  const discount = original - live;
  const rateNum = (live / original) * 10;
  const rate = rateNum % 1 === 0 ? `${rateNum}折` : `${rateNum.toFixed(1)}折`;
  return { discount, rate };
}
