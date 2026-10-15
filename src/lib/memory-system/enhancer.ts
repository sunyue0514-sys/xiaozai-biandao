/**
 * 智能记忆系统 - 记忆增强生成器
 * 在内容生成时注入记忆，实现"越用越懂你"
 */

import { getMemoryContext, getHitPatterns, getUserStyleProfile } from './db';
import type { MemoryContext, UserStyleProfile, HitPattern, EnhancedGenerationContext } from './types';

/**
 * 构建记忆增强的生成上下文
 * 在每次生成前调用
 */
export async function buildEnhancedContext(
  uid: string,
  options: {
    customerId?: number;
    customerName?: string;
    ipPositioning?: Record<string, unknown>;
    topic?: string;
    scriptType?: string;
  }
): Promise<EnhancedGenerationContext> {
  // 获取记忆上下文
  const memoryContext = await getMemoryContext(uid, {
    customerId: options.customerId,
    topic: options.topic,
    scriptType: options.scriptType,
  });
  
  // 提取学习到的偏好
  const learnedPreferences = extractLearnedPreferences(memoryContext);
  
  return {
    customerId: options.customerId,
    customerName: options.customerName,
    ipPositioning: options.ipPositioning,
    memoryContext,
    learnedPreferences,
    referenceCases: memoryContext.similarSuccessCases,
  };
}

/**
 * 从记忆上下文中提取学习到的偏好
 */
function extractLearnedPreferences(context: MemoryContext): EnhancedGenerationContext['learnedPreferences'] {
  const preferences = {
    titleFormulas: [] as string[],
    openingTypes: [] as string[],
    emotionsToUse: [] as string[],
    keywordsToInclude: [] as string[],
    keywordsToAvoid: [] as string[],
  };
  
  // 从风格画像中提取
  if (context.styleProfile) {
    const profile = context.styleProfile;
    
    if (profile.titleFormulas?.length) {
      preferences.titleFormulas = profile.titleFormulas;
    }
    
    if (profile.preferredOpeningTypes?.length) {
      preferences.openingTypes = profile.preferredOpeningTypes;
    }
    
    if (profile.dominantEmotions?.length) {
      preferences.emotionsToUse = profile.dominantEmotions;
    }
  }
  
  // 从爆款特征中提取
  if (context.applicablePatterns?.length) {
    const patterns = context.applicablePatterns;
    
    // 提取标题公式
    const titlePatterns = patterns.filter(p => p.patternType === 'title');
    preferences.titleFormulas.push(...titlePatterns.map(p => p.patternValue || p.patternName));
    
    // 提取开头类型
    const openingPatterns = patterns.filter(p => p.patternType === 'opening');
    preferences.openingTypes.push(...openingPatterns.map(p => p.patternValue || p.patternName));
    
    // 提取情绪类型
    const emotionPatterns = patterns.filter(p => p.patternType === 'emotion');
    preferences.emotionsToUse.push(...emotionPatterns.map(p => p.patternValue || p.patternName));
  }
  
  // 从历史爆款中提取关键词
  if (context.historicalHits?.length) {
    const keywords = new Set<string>();
    context.historicalHits.forEach(hit => {
      if (hit.hitFactors?.keywords) {
        hit.hitFactors.keywords.forEach(k => keywords.add(k));
      }
    });
    preferences.keywordsToInclude = Array.from(keywords).slice(0, 10);
  }
  
  // 去重
  preferences.titleFormulas = [...new Set(preferences.titleFormulas)].slice(0, 5);
  preferences.openingTypes = [...new Set(preferences.openingTypes)].slice(0, 3);
  preferences.emotionsToUse = [...new Set(preferences.emotionsToUse)].slice(0, 3);
  
  return preferences;
}

/**
 * 生成记忆增强的系统提示词
 * 注入到生成API中
 */
export function buildMemoryEnhancedPrompt(
  context: EnhancedGenerationContext,
  baseSystemPrompt: string
): string {
  const memoryParts: string[] = [];
  
  // 1. 风格画像
  if (context.memoryContext?.styleProfile) {
    const profile = context.memoryContext.styleProfile;
    memoryParts.push(`【你的专属风格画像】
- 写作风格：${profile.writingStyle || '自然流畅'}
- 语气偏好：${profile.tonePreference || '亲切友好'}
- 语言特点：${profile.languageStyle || '口语化'}
- 爆款率：${profile.hitRate?.toFixed(1) || 0}%（共${profile.totalHits}个爆款）
请保持与你的风格一致。`);
  }
  
  // 2. 学习到的偏好
  if (context.learnedPreferences) {
    const prefs = context.learnedPreferences;
    
    if (prefs.titleFormulas.length > 0) {
      memoryParts.push(`【标题技巧】
你过去成功的标题公式：
${prefs.titleFormulas.map((f, i) => `${i + 1}. ${f}`).join('\n')}
请参考这些公式，但不要完全照搬。`);
    }
    
    if (prefs.openingTypes.length > 0) {
      memoryParts.push(`【开头技巧】
你擅长使用的开头类型：${prefs.openingTypes.join('、')}
选择最适合当前内容的开头类型。`);
    }
    
    if (prefs.emotionsToUse.length > 0) {
      memoryParts.push(`【情绪调动】
你的爆款内容常激发这些情绪：${prefs.emotionsToUse.join('、')}
适当运用这些情绪元素。`);
    }
    
    if (prefs.keywordsToInclude.length > 0) {
      memoryParts.push(`【关键词参考】
你常用的有效词汇：${prefs.keywordsToInclude.slice(0, 5).join('、')}`);
    }
  }
  
  // 3. 历史爆款参考
  if (context.memoryContext?.historicalHits?.length) {
    const hits = context.memoryContext.historicalHits.slice(0, 3);
    memoryParts.push(`【你的爆款案例参考】
${hits.map((hit, i) => 
  `${i + 1}. 《${hit.title || '无标题'}》
   播放${hit.viewCount}，点赞${hit.likeCount}
   类型：${hit.scriptType}，开头：${hit.openingType || '未知'}`
).join('\n\n')}
参考这些成功案例的优点，但不要复制内容。`);
  }
  
  // 4. 避坑规则
  if (context.memoryContext?.avoidPatterns?.length) {
    memoryParts.push(`【避坑提醒】
以下是你之前效果不好的做法，请避免：
${context.memoryContext.avoidPatterns.map(p => `- ${p}`).join('\n')}`);
  }
  
  // 组合最终提示词
  if (memoryParts.length > 0) {
    return `${baseSystemPrompt}

---
【智能记忆系统已激活】
以下是你积累的创作经验，请充分利用：

${memoryParts.join('\n\n')}

---
现在请根据以上经验，创作出符合你风格的高质量内容。`;
  }
  
  return baseSystemPrompt;
}

/**
 * 获取推荐的标题公式
 */
export async function getRecommendedTitleFormulas(
  uid: string,
  scriptType?: string
): Promise<HitPattern[]> {
  const patterns = await getHitPatterns(uid, {
    patternType: 'title',
    limit: 10,
  });
  
  // 按成功率排序
  return patterns
    .filter(p => !scriptType || !p.applicableScenes || p.applicableScenes.some(s => s.includes(scriptType)))
    .sort((a, b) => (b.successRate || 0) - (a.successRate || 0));
}

/**
 * 获取推荐的开头类型
 */
export async function getRecommendedOpeningTypes(
  uid: string,
  scriptType?: string
): Promise<HitPattern[]> {
  const patterns = await getHitPatterns(uid, {
    patternType: 'opening',
    limit: 5,
  });
  
  return patterns
    .filter(p => !scriptType || !p.applicableScenes || p.applicableScenes.some(s => s.includes(scriptType)))
    .sort((a, b) => (b.successRate || 0) - (a.successRate || 0));
}

/**
 * 计算记忆置信度
 * 用于判断是否应该使用记忆增强
 */
export function calculateMemoryConfidence(context: EnhancedGenerationContext): number {
  let confidence = 0;
  
  // 有风格画像 +30
  if (context.memoryContext?.styleProfile) {
    confidence += 30;
    // 有爆款记录 +20
    if (context.memoryContext.styleProfile.totalHits > 0) {
      confidence += 20;
    }
  }
  
  // 有历史爆款 +20
  if (context.memoryContext?.historicalHits?.length) {
    confidence += Math.min(context.memoryContext.historicalHits.length * 4, 20);
  }
  
  // 有学习到的偏好 +20
  if (context.learnedPreferences) {
    const prefs = context.learnedPreferences;
    if (prefs.titleFormulas.length > 0) confidence += 5;
    if (prefs.openingTypes.length > 0) confidence += 5;
    if (prefs.emotionsToUse.length > 0) confidence += 5;
    if (prefs.keywordsToInclude.length > 0) confidence += 5;
  }
  
  // 有爆款特征 +10
  if (context.memoryContext?.applicablePatterns?.length) {
    confidence += Math.min(context.memoryContext.applicablePatterns.length, 10);
  }
  
  return Math.min(confidence, 100);
}
