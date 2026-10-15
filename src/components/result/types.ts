/**
 * 文案结果展示组件 - 类型定义
 */

// ========== 开篇评分相关 ==========

/**
 * 开篇评分项
 */
export interface OpeningScoreItem {
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  reason: string;
}

/**
 * 开篇评分结果
 */
export interface OpeningScore {
  total: number;
  maxTotal: number;
  items: OpeningScoreItem[];
  comment: string;
}

// ========== 营销植入分析相关 ==========

/**
 * 营销切入位置
 */
export type MarketingPosition = 'beginning' | 'middle' | 'end' | 'throughout' | 'none';

/**
 * 营销切入位置配置
 */
export const MARKETING_POSITION_CONFIG: Record<MarketingPosition, { label: string; description: string }> = {
  beginning: { label: '开头切入', description: '营销信息在开篇即出现' },
  middle: { label: '中段切入', description: '营销信息在文案中部出现' },
  end: { label: '结尾切入', description: '营销信息在文案结尾出现' },
  throughout: { label: '贯穿全文', description: '营销信息贯穿整个文案' },
  none: { label: '无营销植入', description: '文案中未检测到明显的营销信息' },
};

/**
 * 自然度等级（1-5）
 */
export type NaturalnessLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 自然度配置
 */
export const NATURALNESS_CONFIG: Record<NaturalnessLevel, { label: string; description: string }> = {
  1: { label: '生硬', description: '营销植入非常生硬，缺乏过渡' },
  2: { label: '较生硬', description: '营销植入略显生硬' },
  3: { label: '一般', description: '营销植入有过渡但不够自然' },
  4: { label: '较自然', description: '营销植入较为自然' },
  5: { label: '自然', description: '营销植入非常自然，与内容融合度高' },
};

/**
 * 营销植入分析结果
 */
export interface MarketingAnalysis {
  position: MarketingPosition;
  positionLabel: string;
  method: string;
  ratio: number;
  naturalness: NaturalnessLevel;
  naturalnessLabel: string;
  marketingText?: string;
}

// ========== 质量检查相关 ==========

/**
 * 字数检查结果
 */
export interface WordCountCheck {
  targetMin: number;
  targetMax: number;
  actual: number;
  deviation: number;
  passed: boolean;
}

/**
 * 违禁词检查结果
 */
export interface BannedWordsCheck {
  found: string[];
  passed: boolean;
}

/**
 * 口语化程度等级（1-5）
 */
export type ColloquialLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 口语化配置
 */
export const COLLOQUIAL_CONFIG: Record<ColloquialLevel, { label: string; description: string }> = {
  1: { label: '书面化', description: '文案偏书面化，不够口语化' },
  2: { label: '较书面', description: '文案略显书面化' },
  3: { label: '适中', description: '文案口语化程度适中' },
  4: { label: '较口语', description: '文案较为口语化' },
  5: { label: '口语化', description: '文案口语化程度高，自然流畅' },
};

/**
 * 质量检查结果
 */
export interface QualityCheck {
  wordCountCheck: WordCountCheck;
  bannedWordsCheck: BannedWordsCheck;
  colloquialScore: ColloquialLevel;
  colloquialLabel: string;
  suggestions: string[];
}

// ========== 综合分析结果 ==========

/**
 * 文案分析结果
 */
export interface CopywritingAnalysis {
  openingScore: OpeningScore;
  marketingAnalysis: MarketingAnalysis;
  qualityCheck: QualityCheck;
  rating: 'excellent' | 'good' | 'pass' | 'needs_work';
  ratingLabel: string;
}

// ========== 创作分析（详细版扩展）==========

/**
 * 五阶系统分析
 */
export interface FiveStageSystem {
  valueGeneration: string;  // 价值生成
  resources: string;         // 资源
  businessArchitecture: string;  // 商业架构
}

/**
 * 四点分析
 */
export interface FourPointsAnalysis {
  needs: string;      // 需求
  painPoints: string; // 痛点
  pleasurePoints: string; // 爽点
  itchPoints: string; // 痒点
}

/**
 * 文案框架
 */
export interface CopywritingFramework {
  structure: string;      // 结构说明
  opening: number;        // 开篇字数
  argumentA: number;      // 论据A字数
  argumentB: number;      // 论据B字数
  argumentC: number;      // 论据C字数
  conclusion: number;     // 总结字数
}

/**
 * 拍摄方式分析
 */
export interface ShootingMethod {
  method: string;         // 确定方式
  reason: string;         // 推荐理由
  alternative?: string;   // 备选方式
}

/**
 * 创作分析（详细版）
 */
export interface CreationAnalysis {
  // 选题分析
  topicAnalysis: string;
  // 五阶系统
  fiveStageSystem?: FiveStageSystem;
  // 四点分析
  fourPointsAnalysis?: FourPointsAnalysis;
  // 目标人群
  targetAudience: string;
  // 视频类型
  videoType?: string;
  // 营销信息来源
  marketingSource?: string;
  // 提取的营销信息
  extractedMarketing?: string;
  // 营销策略
  marketingStrategy: string;
  // 文案框架
  framework?: CopywritingFramework;
  // 拍摄方式
  shootingMethod?: ShootingMethod;
}

/**
 * 文案项
 */
export interface CopywritingItem {
  id: number;
  content: string;
  coverTitles?: string[];
  analysis?: CopywritingAnalysis;
  creationAnalysis?: CreationAnalysis;
  // 文案标签
  tags?: string[];
}

// ========== 展示模式 ==========

/**
 * 展示模式
 */
export type DisplayMode = 'compact' | 'detailed';

// ========== 创作需求回顾 ==========

/**
 * 创作需求回顾
 */
export interface CreationRequirements {
  topic: string;
  mode?: string;
  creationMode?: string;
  scriptType?: string;
  industry?: string;
  wordCount?: number;
  customerName?: string;
  ipPositioning?: {
    industry?: string;
    persona?: string;
    coreAngle?: string;
    productService?: string;
    businessGoal?: string;
  };
}

// ========== 生成状态 ==========

/**
 * 生成步骤状态
 */
export type GenerationStepStatus = 'pending' | 'generating' | 'completed' | 'error';

/**
 * 生成步骤
 */
export interface GenerationStep {
  id: string;
  name: string;
  status: GenerationStepStatus;
  message?: string;
}

/**
 * 生成状态追踪
 */
export interface GenerationStatus {
  steps: GenerationStep[];
  currentStep: string;
  progress: number;
}
