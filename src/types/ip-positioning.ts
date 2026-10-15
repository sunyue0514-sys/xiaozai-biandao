/**
 * IP定位统一类型定义
 * 
 * ⚠️ 重要：所有涉及IP定位的地方都应该使用这个类型
 * 不要在其他文件中重复定义 interface
 * 
 * 数据格式说明：
 * - 数组字段：用于多选场景，如兴趣爱好、技能等
 * - 字符串字段：用于单选或自由输入场景，如专业特长、人生格言等
 */

/**
 * IP定位完整数据结构
 */
export interface IPPositioning {
  // 基础信息
  basicInfo?: IPBasicInfo;
  
  // 核心价值
  coreValue?: IPCoreValue;
  
  // 人生经历（兼容两种字段名）
  lifeExperience?: IPLifeExperience;
  lifeStory?: IPLifeExperience;  // 别名
  
  // 定位方向
  positioningDirection?: IPPositioningDirection;
  
  // 用户画像
  userPersona?: IPUserPersona;
  
  // 产品服务
  productsServices?: IPProductsServices;
  
  // 内容方向
  contentDirection?: IPContentDirection;
  
  // 核心业务（兼容旧字段）
  coreBusiness?: string;
}

/** 基础信息 */
export interface IPBasicInfo {
  identity?: string;           // 身份定位
  nickname?: string;           // 昵称
  gender?: string;             // 性别
  age?: string;                // 年龄
  location?: string;           // 所在地
  appearance?: string;         // 形象特点
  personality?: string | string[];  // 性格特点（可能是字符串或数组）
  othersEvaluation?: string;   // 他人评价
  familyInfluence?: string;    // 家庭影响
  careerView?: string;         // 职业观
}

/** 核心价值 */
export interface IPCoreValue {
  interests?: string | string[];    // 兴趣爱好（可能是字符串或数组）
  skills?: string | string[];       // 技能（可能是字符串或数组）
  specialties?: string | string[];  // 专业特长（可能是字符串或数组）⚠️ 注意：前端表单是字符串，但处理时要兼容数组
  passions?: string;                // 热情所在
  valueProvided?: string;           // 提供的价值
}

/** 人生经历 */
export interface IPLifeExperience {
  last10Years?: string;      // 近10年经历
  recent10Years?: string;    // 别名
  darkMoments?: string;      // 至暗时刻
  darkestMoment?: string;    // 别名
  turningPoints?: string;    // 转折点
  turningPoint?: string;     // 别名
  highlights?: string;       // 高光时刻
  highlightMoment?: string;  // 别名
  motto?: string;            // 人生格言
}

/** 定位方向 */
export interface IPPositioningDirection {
  nicheField?: string;              // 细分领域
  contentTrack?: string | string[]; // 内容赛道
  monetization?: string | string[]; // 变现方向
}

/** 用户画像 */
export interface IPUserPersona {
  targetUsers?: string;             // 目标用户
  targetCustomers?: string;         // 别名
  userPainPoints?: string;          // 用户痛点
  painPoints?: string;              // 别名
  commonQuestions?: string | string[]; // 常见问题
  competitiveAdvantage?: string;    // 竞争优势
}

/** 产品服务 */
export interface IPProductsServices {
  products?: string | string[];  // 产品
  services?: string | string[];  // 服务
}

/** 内容方向 */
export interface IPContentDirection {
  mainTopics?: string | string[];  // 主要话题
  contentStyle?: string;           // 内容风格
  updateFrequency?: string;        // 更新频率
}

// ============ 工具函数 ============

/**
 * 安全地将字段转换为数组
 * 用于处理可能是字符串或数组的情况
 */
export function ensureArray(value: string | string[] | undefined | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  // 字符串：按顿号、逗号、空格分割
  return value.split(/[、,，\s]+/).filter(Boolean);
}

/**
 * 安全地将字段转换为字符串（用顿号连接）
 */
export function joinArray(value: string | string[] | undefined | null, separator: string = '、'): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.join(separator);
}

/**
 * 规范化IP定位数据（确保类型一致）
 * 在从数据库读取后调用，确保数据格式正确
 */
export function normalizeIPPositioning(data: unknown): IPPositioning {
  if (!data || typeof data !== 'object') return {};
  
  const raw = data as Record<string, unknown>;
  
  return {
    basicInfo: normalizeBasicInfo(raw.basicInfo),
    coreValue: normalizeCoreValue(raw.coreValue),
    lifeExperience: normalizeLifeExperience(raw.lifeExperience || raw.lifeStory),
    positioningDirection: normalizePositioningDirection(raw.positioningDirection),
    userPersona: normalizeUserPersona(raw.userPersona),
    productsServices: normalizeProductsServices(raw.productsServices),
    contentDirection: normalizeContentDirection(raw.contentDirection),
    coreBusiness: typeof raw.coreBusiness === 'string' ? raw.coreBusiness : undefined,
  };
}

function normalizeBasicInfo(data: unknown): IPBasicInfo | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as Record<string, unknown>;
  return {
    identity: typeof raw.identity === 'string' ? raw.identity : undefined,
    nickname: typeof raw.nickname === 'string' ? raw.nickname : undefined,
    gender: typeof raw.gender === 'string' ? raw.gender : undefined,
    age: typeof raw.age === 'string' ? raw.age : undefined,
    location: typeof raw.location === 'string' ? raw.location : undefined,
    appearance: typeof raw.appearance === 'string' ? raw.appearance : undefined,
    personality: raw.personality as string | string[] | undefined,
    othersEvaluation: typeof raw.othersEvaluation === 'string' ? raw.othersEvaluation : undefined,
    familyInfluence: typeof raw.familyInfluence === 'string' ? raw.familyInfluence : undefined,
    careerView: typeof raw.careerView === 'string' ? raw.careerView : undefined,
  };
}

function normalizeCoreValue(data: unknown): IPCoreValue | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as Record<string, unknown>;
  return {
    interests: raw.interests as string | string[] | undefined,
    skills: raw.skills as string | string[] | undefined,
    specialties: raw.specialties as string | string[] | undefined,
    passions: typeof raw.passions === 'string' ? raw.passions : undefined,
    valueProvided: typeof raw.valueProvided === 'string' ? raw.valueProvided : undefined,
  };
}

function normalizeLifeExperience(data: unknown): IPLifeExperience | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as Record<string, unknown>;
  return {
    last10Years: (raw.last10Years || raw.recent10Years) as string | undefined,
    darkMoments: (raw.darkMoments || raw.darkestMoment) as string | undefined,
    turningPoints: (raw.turningPoints || raw.turningPoint) as string | undefined,
    highlights: (raw.highlights || raw.highlightMoment) as string | undefined,
    motto: typeof raw.motto === 'string' ? raw.motto : undefined,
  };
}

function normalizePositioningDirection(data: unknown): IPPositioningDirection | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as Record<string, unknown>;
  return {
    nicheField: typeof raw.nicheField === 'string' ? raw.nicheField : undefined,
    contentTrack: raw.contentTrack as string | string[] | undefined,
    monetization: raw.monetization as string | string[] | undefined,
  };
}

function normalizeUserPersona(data: unknown): IPUserPersona | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as Record<string, unknown>;
  return {
    targetUsers: (raw.targetUsers || raw.targetCustomers) as string | undefined,
    userPainPoints: (raw.userPainPoints || raw.painPoints) as string | undefined,
    commonQuestions: raw.commonQuestions as string | string[] | undefined,
    competitiveAdvantage: typeof raw.competitiveAdvantage === 'string' ? raw.competitiveAdvantage : undefined,
  };
}

function normalizeProductsServices(data: unknown): IPProductsServices | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as Record<string, unknown>;
  return {
    products: raw.products as string | string[] | undefined,
    services: raw.services as string | string[] | undefined,
  };
}

function normalizeContentDirection(data: unknown): IPContentDirection | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const raw = data as Record<string, unknown>;
  return {
    mainTopics: raw.mainTopics as string | string[] | undefined,
    contentStyle: typeof raw.contentStyle === 'string' ? raw.contentStyle : undefined,
    updateFrequency: typeof raw.updateFrequency === 'string' ? raw.updateFrequency : undefined,
  };
}
