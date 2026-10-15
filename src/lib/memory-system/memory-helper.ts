/**
 * 记忆增强生成辅助模块
 * 为各种生成API提供统一的记忆注入接口
 */

import { 
  buildEnhancedContext, 
  buildMemoryEnhancedPrompt,
  calculateMemoryConfidence 
} from './enhancer';
import { getUserStyleProfile, getHitPerformances, getHitPatterns } from './db';
import type { EnhancedGenerationContext, MemoryContext, UserStyleProfile, HitPattern, ContentPerformance } from './types';

/**
 * 记忆增强结果
 */
export interface MemoryEnhancementResult {
  // 是否启用记忆增强
  enabled: boolean;
  // 记忆置信度 (0-100)
  confidence: number;
  // 增强后的系统提示词
  enhancedPrompt?: string;
  // 记忆上下文
  context?: EnhancedGenerationContext;
  // 学习到的偏好摘要（用于调试/展示）
  preferencesSummary?: {
    titleFormulas: string[];
    openingTypes: string[];
    emotions: string[];
    hitCount: number;
    hasStyleProfile: boolean;
  };
}

/**
 * 为生成API注入记忆增强
 * 统一入口，简化各API的集成
 * 
 * @param uid - 用户ID
 * @param baseSystemPrompt - 原始系统提示词
 * @param options - 增强选项
 * @returns 记忆增强结果
 */
export async function injectMemoryEnhancement(
  uid: string,
  baseSystemPrompt: string,
  options: {
    // 客户ID（可选，用于特定客户的记忆）
    customerId?: number;
    // 客户名称（可选）
    customerName?: string;
    // IP定位信息（可选）
    ipPositioning?: Record<string, unknown>;
    // 主题（可选，用于相似案例检索）
    topic?: string;
    // 脚本类型（可选，用于特征过滤）
    scriptType?: string;
    // 最低置信度阈值（默认20，低于此值不启用记忆增强）
    minConfidence?: number;
    // 是否强制启用（忽略置信度检查）
    forceEnable?: boolean;
  } = {}
): Promise<MemoryEnhancementResult> {
  const minConfidence = options.minConfidence ?? 20;
  
  try {
    // 1. 构建记忆增强上下文
    const context = await buildEnhancedContext(uid, {
      customerId: options.customerId,
      customerName: options.customerName,
      ipPositioning: options.ipPositioning,
      topic: options.topic,
      scriptType: options.scriptType,
    });
    
    // 2. 计算记忆置信度
    const confidence = calculateMemoryConfidence(context);
    
    // 3. 判断是否启用记忆增强
    const shouldEnable = options.forceEnable || confidence >= minConfidence;
    
    if (!shouldEnable) {
      return {
        enabled: false,
        confidence,
        preferencesSummary: {
          titleFormulas: [],
          openingTypes: [],
          emotions: [],
          hitCount: 0,
          hasStyleProfile: false,
        },
      };
    }
    
    // 4. 生成增强后的系统提示词
    const enhancedPrompt = buildMemoryEnhancedPrompt(context, baseSystemPrompt);
    
    // 5. 提取偏好摘要
    const preferences = context.learnedPreferences;
    
    return {
      enabled: true,
      confidence,
      enhancedPrompt,
      context,
      preferencesSummary: {
        titleFormulas: preferences?.titleFormulas || [],
        openingTypes: preferences?.openingTypes || [],
        emotions: preferences?.emotionsToUse || [],
        hitCount: context.memoryContext?.historicalHits?.length || 0,
        hasStyleProfile: !!context.memoryContext?.styleProfile,
      },
    };
  } catch (error) {
    console.error('Memory enhancement failed:', error);
    // 失败时返回原始提示词，不阻断生成流程
    return {
      enabled: false,
      confidence: 0,
      preferencesSummary: {
        titleFormulas: [],
        openingTypes: [],
        emotions: [],
        hitCount: 0,
        hasStyleProfile: false,
      },
    };
  }
}

/**
 * 快速获取用户的记忆状态摘要
 * 用于前端展示记忆系统状态
 */
export async function getMemoryStatus(uid: string): Promise<{
  hasStyleProfile: boolean;
  totalHits: number;
  totalContents: number;
  hitRate: number;
  learningProgress: number;
  confidenceScore: number;
  topEmotions: string[];
  preferredScriptTypes: string[];
}> {
  try {
    const [profile, hits] = await Promise.all([
      getUserStyleProfile(uid),
      getHitPerformances(uid, 100),
    ]);
    
    return {
      hasStyleProfile: !!profile,
      totalHits: profile?.totalHits || hits.length,
      totalContents: profile?.totalContents || 0,
      hitRate: profile?.hitRate || 0,
      learningProgress: profile?.learningProgress || 0,
      confidenceScore: profile?.confidenceScore || 0,
      topEmotions: profile?.dominantEmotions || [],
      preferredScriptTypes: profile?.preferredScriptTypes || [],
    };
  } catch (error) {
    console.error('Get memory status failed:', error);
    return {
      hasStyleProfile: false,
      totalHits: 0,
      totalContents: 0,
      hitRate: 0,
      learningProgress: 0,
      confidenceScore: 0,
      topEmotions: [],
      preferredScriptTypes: [],
    };
  }
}

/**
 * 构建记忆增强的流式响应前缀
 * 用于在SSE流中告知前端记忆状态
 */
export function buildMemoryPrefix(result: MemoryEnhancementResult): string {
  if (!result.enabled || !result.preferencesSummary) {
    return '';
  }
  
  const summary = result.preferencesSummary;
  const parts: string[] = [];
  
  if (summary.hitCount > 0) {
    parts.push(`已参考${summary.hitCount}个爆款案例`);
  }
  if (summary.hasStyleProfile) {
    parts.push('已加载个人风格画像');
  }
  if (summary.titleFormulas.length > 0) {
    parts.push(`${summary.titleFormulas.length}个标题技巧`);
  }
  if (summary.openingTypes.length > 0) {
    parts.push(`${summary.openingTypes.length}种开头方式`);
  }
  
  if (parts.length === 0) {
    return '';
  }
  
  return `【记忆增强已激活】${parts.join('、')}\n\n`;
}

/**
 * 格式化记忆状态为用户友好文本
 */
export function formatMemoryStatus(status: Awaited<ReturnType<typeof getMemoryStatus>>): string {
  const lines: string[] = [];
  
  if (status.hasStyleProfile) {
    lines.push(`✅ 已建立个人风格画像`);
    lines.push(`📊 学习进度: ${status.learningProgress}%`);
    lines.push(`🎯 爆款率: ${status.hitRate.toFixed(1)}%`);
    if (status.topEmotions.length > 0) {
      lines.push(`💡 擅长情绪: ${status.topEmotions.join('、')}`);
    }
    if (status.preferredScriptTypes.length > 0) {
      lines.push(`📝 偏好类型: ${status.preferredScriptTypes.join('、')}`);
    }
  } else {
    lines.push(`⏳ 记忆系统学习中...`);
    lines.push(`📊 已记录${status.totalContents}篇内容`);
    lines.push(`🎯 累计${status.totalHits}个爆款`);
    lines.push(`💡 继续创作，系统会越来越懂你`);
  }
  
  return lines.join('\n');
}
