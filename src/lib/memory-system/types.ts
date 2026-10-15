/**
 * 智能记忆系统 - 类型定义
 */

// ========== 内容效果记录 ==========
export interface ContentPerformance {
  id: number;
  uid: string;
  materialId?: number;
  customerId?: number;
  
  // 内容信息
  title?: string;
  topic?: string;
  scriptType?: string;
  openingType?: string;
  contentPreview?: string;
  
  // 发布信息
  platform?: string;
  publishUrl?: string;
  publishedAt?: Date;
  
  // 效果数据
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  collectCount: number;
  finishRate?: number;
  
  // AI分析
  isHit: boolean;
  hitScore?: number;
  hitFactors?: HitFactors;
  aiAnalysis?: string;
  
  // 用户标记
  userRating?: number;
  userTags?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

// 爆款因子
export interface HitFactors {
  titleFormula?: string;       // 标题公式
  openingType?: string;        // 开头类型
  emotionType?: string;        // 情绪类型
  hookStrength?: number;       // 钩子强度 1-10
  relevanceScore?: number;     // 相关度评分
  uniquenessScore?: number;    // 独特性评分
  keywords?: string[];         // 关键词
}

// ========== 爆款特征 ==========
export interface HitPattern {
  id: number;
  uid: string;
  customerId?: number;
  
  patternType: PatternType;
  patternName: string;
  patternValue?: string;
  description?: string;
  
  successCount: number;
  totalUsage: number;
  successRate?: number;
  
  exampleTitles?: string[];
  exampleMaterialIds?: number[];
  
  applicableScenes?: string[];
  applicablePlatforms?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export type PatternType = 'title' | 'opening' | 'emotion' | 'structure' | 'timing';

// ========== 用户风格画像 ==========
export interface UserStyleProfile {
  id: number;
  uid: string;
  
  // 整体风格
  writingStyle?: WritingStyle;
  tonePreference?: TonePreference;
  languageStyle?: LanguageStyle;
  
  // 标题偏好
  titleFormulas?: string[];
  titleLengthPreference?: 'short' | 'medium' | 'long';
  titleNumberPreference?: boolean;
  titleEmotionWords?: string[];
  
  // 开头偏好
  preferredOpeningTypes?: string[];
  openingHookPatterns?: string[];
  
  // 内容偏好
  preferredScriptTypes?: string[];
  avgContentLength?: number;
  emojiUsageRate?: number;
  questionUsageRate?: number;
  
  // 情绪偏好
  dominantEmotions?: string[];
  emotionIntensity?: 'high' | 'medium' | 'low';
  
  // 统计数据
  totalContents: number;
  totalHits: number;
  hitRate?: number;
  avgViews?: number;
  avgLikes?: number;
  
  // 学习状态
  learningProgress: number;
  lastLearnedAt?: Date;
  confidenceScore?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export type WritingStyle = 'formal' | 'casual' | 'humorous' | 'professional';
export type TonePreference = 'friendly' | 'authoritative' | 'neutral';
export type LanguageStyle = 'concise' | 'detailed' | 'colloquial';

// ========== 创作会话 ==========
export interface CreationSession {
  id: number;
  uid: string;
  sessionType: 'script' | 'topic' | 'opening' | 'writing';
  
  inputContext?: Record<string, unknown>;
  memoryContext?: MemoryContext;
  
  generationParams?: Record<string, unknown>;
  generationCount: number;
  regenerateCount: number;
  
  finalOutput?: string;
  finalMaterialId?: number;
  
  userActions?: UserAction[];
  userEdits?: string;
  userFeedback?: string;
  satisfactionScore?: number;
  
  createdAt: Date;
}

export type UserAction = 'copy' | 'save' | 'regenerate' | 'edit' | 'discard';

// ========== 记忆上下文 ==========
export interface MemoryContext {
  // 历史爆款
  historicalHits?: ContentPerformance[];
  
  // 用户风格画像
  styleProfile?: UserStyleProfile;
  
  // 适用的爆款特征
  applicablePatterns?: HitPattern[];
  
  // 避坑规则
  avoidPatterns?: string[];
  
  // 相似成功案例
  similarSuccessCases?: SimilarCase[];
}

// 相似案例
export interface SimilarCase {
  materialId: number;
  title: string;
  topic: string;
  scriptType: string;
  viewCount: number;
  likeCount: number;
  similarity: number;  // 相似度 0-1
}

// ========== 效果反馈输入 ==========
export interface PerformanceInput {
  materialId: number;
  platform: string;
  publishUrl?: string;
  publishedAt?: Date;
  viewCount: number;
  likeCount: number;
  commentCount?: number;
  shareCount?: number;
  collectCount?: number;
  finishRate?: number;
  userRating?: number;
  userTags?: string[];
}

// ========== AI分析结果 ==========
export interface AIAnalysisResult {
  isHit: boolean;
  hitScore: number;
  hitFactors: HitFactors;
  analysis: string;
  suggestions: string[];
}

// ========== 风格学习结果 ==========
export interface StyleLearningResult {
  updated: boolean;
  changes: string[];
  confidence: number;
  profile: UserStyleProfile;
}

// ========== 记忆增强生成上下文 ==========
export interface EnhancedGenerationContext {
  // 基础上下文
  customerId?: number;
  customerName?: string;
  ipPositioning?: Record<string, unknown>;
  
  // 记忆增强
  memoryContext?: MemoryContext;
  
  // 学习到的偏好
  learnedPreferences?: {
    titleFormulas: string[];
    openingTypes: string[];
    emotionsToUse: string[];
    keywordsToInclude: string[];
    keywordsToAvoid: string[];
  };
  
  // 成功案例参考
  referenceCases?: SimilarCase[];
}
