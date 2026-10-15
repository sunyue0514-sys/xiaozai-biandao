/**
 * 智能记忆系统 - 数据库操作
 */

import { getSupabaseClient, waitForSequenceCheck } from '@/storage/database/supabase-client';
import type {
  ContentPerformance,
  HitPattern,
  UserStyleProfile,
  CreationSession,
  MemoryContext,
  PerformanceInput,
  SimilarCase,
} from './types';

// ========== 效果记录相关 ==========

/**
 * 创建效果记录
 */
export async function createPerformance(
  uid: string,
  input: PerformanceInput & { 
    title?: string; 
    topic?: string; 
    scriptType?: string; 
    contentPreview?: string;
    customerId?: number;
  }
): Promise<ContentPerformance> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('content_performance')
    .insert({
      uid,
      material_id: input.materialId,
      customer_id: input.customerId,
      title: input.title,
      topic: input.topic,
      script_type: input.scriptType,
      content_preview: input.contentPreview,
      platform: input.platform,
      publish_url: input.publishUrl,
      published_at: input.publishedAt,
      view_count: input.viewCount,
      like_count: input.likeCount,
      comment_count: input.commentCount || 0,
      share_count: input.shareCount || 0,
      collect_count: input.collectCount || 0,
      finish_rate: input.finishRate,
      user_rating: input.userRating,
      user_tags: input.userTags,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return mapPerformance(data);
}

/**
 * 更新效果记录
 */
export async function updatePerformance(
  id: number,
  uid: string,
  input: Partial<PerformanceInput>
): Promise<ContentPerformance> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = { ...input };
  // 字段名映射
  if (input.materialId) updateData.material_id = input.materialId;
  if (input.publishUrl) updateData.publish_url = input.publishUrl;
  if (input.publishedAt) updateData.published_at = input.publishedAt;
  if (input.viewCount !== undefined) updateData.view_count = input.viewCount;
  if (input.likeCount !== undefined) updateData.like_count = input.likeCount;
  if (input.commentCount !== undefined) updateData.comment_count = input.commentCount;
  if (input.shareCount !== undefined) updateData.share_count = input.shareCount;
  if (input.collectCount !== undefined) updateData.collect_count = input.collectCount;
  if (input.finishRate !== undefined) updateData.finish_rate = input.finishRate;
  if (input.userRating !== undefined) updateData.user_rating = input.userRating;
  if (input.userTags) updateData.user_tags = input.userTags;
  
  const { data, error } = await client
    .from('content_performance')
    .update(updateData)
    .eq('id', id)
    .eq('uid', uid)
    .select()
    .single();
  
  if (error) throw error;
  
  return mapPerformance(data);
}

/**
 * 获取用户的效果记录
 */
export async function getPerformancesByUid(
  uid: string,
  options?: {
    customerId?: number;
    platform?: string;
    isHit?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<ContentPerformance[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('content_performance')
    .select('*')
    .eq('uid', uid)
    .order('created_at', { ascending: false });
  
  if (options?.customerId) {
    query = query.eq('customer_id', options.customerId);
  }
  if (options?.platform) {
    query = query.eq('platform', options.platform);
  }
  if (options?.isHit !== undefined) {
    query = query.eq('is_hit', options.isHit);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return data.map(mapPerformance);
}

/**
 * 获取爆款记录
 */
export async function getHitPerformances(
  uid: string,
  limit: number = 20
): Promise<ContentPerformance[]> {
  return getPerformancesByUid(uid, { isHit: true, limit });
}

// ========== 爆款特征相关 ==========

/**
 * 获取爆款特征
 */
export async function getHitPatterns(
  uid: string,
  options?: {
    patternType?: string;
    customerId?: number;
    limit?: number;
  }
): Promise<HitPattern[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('hit_patterns')
    .select('*')
    .or(`uid.eq.${uid},uid.eq.system`)
    .order('success_count', { ascending: false });
  
  if (options?.patternType) {
    query = query.eq('pattern_type', options.patternType);
  }
  if (options?.customerId) {
    query = query.or(`customer_id.is.null,customer_id.eq.${options.customerId}`);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return data.map(mapPattern);
}

/**
 * 添加爆款特征
 */
export async function addHitPattern(
  uid: string,
  pattern: Omit<HitPattern, 'id' | 'uid' | 'createdAt' | 'updatedAt' | 'successCount' | 'totalUsage'>
): Promise<HitPattern> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('hit_patterns')
    .insert({
      uid,
      pattern_type: pattern.patternType,
      pattern_name: pattern.patternName,
      pattern_value: pattern.patternValue,
      description: pattern.description,
      applicable_scenes: pattern.applicableScenes,
      applicable_platforms: pattern.applicablePlatforms,
      success_count: 1,
      total_usage: 1,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return mapPattern(data);
}

/**
 * 更新特征成功次数
 */
export async function incrementPatternSuccess(id: number): Promise<void> {
  const client = getSupabaseClient();
  
  await client.rpc('increment_pattern_success', { pattern_id: id });
}

// ========== 用户风格画像相关 ==========

/**
 * 获取用户风格画像
 */
export async function getUserStyleProfile(uid: string): Promise<UserStyleProfile | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('user_style_profile')
    .select('*')
    .eq('uid', uid)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // 未找到
    throw error;
  }
  
  return mapStyleProfile(data);
}

/**
 * 创建或更新用户风格画像
 */
export async function upsertUserStyleProfile(
  uid: string,
  profile: Partial<UserStyleProfile>
): Promise<UserStyleProfile> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {};
  
  if (profile.writingStyle) updateData.writing_style = profile.writingStyle;
  if (profile.tonePreference) updateData.tone_preference = profile.tonePreference;
  if (profile.languageStyle) updateData.language_style = profile.languageStyle;
  if (profile.titleFormulas) updateData.title_formulas = profile.titleFormulas;
  if (profile.preferredOpeningTypes) updateData.preferred_opening_types = profile.preferredOpeningTypes;
  if (profile.preferredScriptTypes) updateData.preferred_script_types = profile.preferredScriptTypes;
  if (profile.dominantEmotions) updateData.dominant_emotions = profile.dominantEmotions;
  if (profile.totalContents !== undefined) updateData.total_contents = profile.totalContents;
  if (profile.totalHits !== undefined) updateData.total_hits = profile.totalHits;
  if (profile.hitRate !== undefined) updateData.hit_rate = profile.hitRate;
  if (profile.avgViews !== undefined) updateData.avg_views = profile.avgViews;
  if (profile.avgLikes !== undefined) updateData.avg_likes = profile.avgLikes;
  if (profile.learningProgress !== undefined) updateData.learning_progress = profile.learningProgress;
  if (profile.confidenceScore !== undefined) updateData.confidence_score = profile.confidenceScore;
  
  const { data, error } = await client
    .from('user_style_profile')
    .upsert({
      uid,
      ...updateData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'uid' })
    .select()
    .single();
  
  if (error) throw error;
  
  return mapStyleProfile(data);
}

// ========== 创作会话相关 ==========

/**
 * 创建创作会话
 */
export async function createCreationSession(
  uid: string,
  sessionType: CreationSession['sessionType'],
  inputContext?: Record<string, unknown>,
  memoryContext?: MemoryContext
): Promise<number> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('creation_sessions')
    .insert({
      uid,
      session_type: sessionType,
      input_context: inputContext,
      memory_context: memoryContext,
      generation_count: 1,
      regenerate_count: 0,
    })
    .select('id')
    .single();
  
  if (error) throw error;
  
  return data.id;
}

/**
 * 更新创作会话
 */
export async function updateCreationSession(
  id: number,
  uid: string,
  updates: {
    finalOutput?: string;
    finalMaterialId?: number;
    userActions?: string[];
    userEdits?: string;
    userFeedback?: string;
    satisfactionScore?: number;
    regenerateCount?: number;
  }
): Promise<void> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {};
  if (updates.finalOutput) updateData.final_output = updates.finalOutput;
  if (updates.finalMaterialId) updateData.final_material_id = updates.finalMaterialId;
  if (updates.userActions) updateData.user_actions = updates.userActions;
  if (updates.userEdits) updateData.user_edits = updates.userEdits;
  if (updates.userFeedback) updateData.user_feedback = updates.userFeedback;
  if (updates.satisfactionScore !== undefined) updateData.satisfaction_score = updates.satisfactionScore;
  if (updates.regenerateCount !== undefined) updateData.regenerate_count = updates.regenerateCount;
  
  await client
    .from('creation_sessions')
    .update(updateData)
    .eq('id', id)
    .eq('uid', uid);
}

// ========== 记忆检索 ==========

/**
 * 获取记忆上下文（核心函数）
 * 在生成前调用，注入记忆增强
 */
export async function getMemoryContext(
  uid: string,
  options?: {
    customerId?: number;
    topic?: string;
    scriptType?: string;
  }
): Promise<MemoryContext> {
  // 并行获取各种记忆
  const [hits, profile, patterns] = await Promise.all([
    getHitPerformances(uid, 10),
    getUserStyleProfile(uid),
    getHitPatterns(uid, { limit: 20 }),
  ]);
  
  // 构建记忆上下文
  const context: MemoryContext = {
    historicalHits: hits,
    styleProfile: profile || undefined,
    applicablePatterns: patterns.filter(p => {
      // 根据场景过滤特征
      if (options?.scriptType && p.applicableScenes) {
        return p.applicableScenes.some(s => s.includes(options.scriptType!));
      }
      return true;
    }),
    avoidPatterns: [], // TODO: 从失败案例中提取
    similarSuccessCases: [], // TODO: 基于topic相似度检索
  };
  
  return context;
}

/**
 * 获取相似成功案例
 */
export async function getSimilarCases(
  uid: string,
  topic: string,
  limit: number = 3
): Promise<SimilarCase[]> {
  const client = getSupabaseClient();
  
  // 基于关键词相似度查询
  // 简化实现：查询同脚本类型的高播放内容
  const { data, error } = await client
    .from('content_performance')
    .select(`
      material_id,
      title,
      topic,
      script_type,
      view_count,
      like_count
    `)
    .eq('uid', uid)
    .eq('is_hit', true)
    .order('view_count', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return data.map((item, index) => ({
    materialId: item.material_id,
    title: item.title,
    topic: item.topic,
    scriptType: item.script_type,
    viewCount: item.view_count,
    likeCount: item.like_count,
    similarity: 1 - index * 0.1, // 简化的相似度计算
  }));
}

// ========== 数据映射函数 ==========

function mapPerformance(data: Record<string, unknown>): ContentPerformance {
  return {
    id: data.id as number,
    uid: data.uid as string,
    materialId: data.material_id as number | undefined,
    customerId: data.customer_id as number | undefined,
    title: data.title as string | undefined,
    topic: data.topic as string | undefined,
    scriptType: data.script_type as string | undefined,
    openingType: data.opening_type as string | undefined,
    contentPreview: data.content_preview as string | undefined,
    platform: data.platform as string | undefined,
    publishUrl: data.publish_url as string | undefined,
    publishedAt: data.published_at ? new Date(data.published_at as string) : undefined,
    viewCount: data.view_count as number,
    likeCount: data.like_count as number,
    commentCount: data.comment_count as number,
    shareCount: data.share_count as number,
    collectCount: data.collect_count as number,
    finishRate: data.finish_rate as number | undefined,
    isHit: data.is_hit as boolean,
    hitScore: data.hit_score as number | undefined,
    hitFactors: data.hit_factors as Record<string, unknown> | undefined,
    aiAnalysis: data.ai_analysis as string | undefined,
    userRating: data.user_rating as number | undefined,
    userTags: data.user_tags as string[] | undefined,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapPattern(data: Record<string, unknown>): HitPattern {
  return {
    id: data.id as number,
    uid: data.uid as string,
    customerId: data.customer_id as number | undefined,
    patternType: data.pattern_type as HitPattern['patternType'],
    patternName: data.pattern_name as string,
    patternValue: data.pattern_value as string | undefined,
    description: data.description as string | undefined,
    successCount: data.success_count as number,
    totalUsage: data.total_usage as number,
    successRate: data.success_rate as number | undefined,
    exampleTitles: data.example_titles as string[] | undefined,
    exampleMaterialIds: data.example_material_ids as number[] | undefined,
    applicableScenes: data.applicable_scenes as string[] | undefined,
    applicablePlatforms: data.applicable_platforms as string[] | undefined,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}

function mapStyleProfile(data: Record<string, unknown>): UserStyleProfile {
  return {
    id: data.id as number,
    uid: data.uid as string,
    writingStyle: data.writing_style as UserStyleProfile['writingStyle'],
    tonePreference: data.tone_preference as UserStyleProfile['tonePreference'],
    languageStyle: data.language_style as UserStyleProfile['languageStyle'],
    titleFormulas: data.title_formulas as string[] | undefined,
    titleLengthPreference: data.title_length_preference as 'short' | 'medium' | 'long' | undefined,
    titleNumberPreference: data.title_number_preference as boolean | undefined,
    titleEmotionWords: data.title_emotion_words as string[] | undefined,
    preferredOpeningTypes: data.preferred_opening_types as string[] | undefined,
    openingHookPatterns: data.opening_hook_patterns as string[] | undefined,
    preferredScriptTypes: data.preferred_script_types as string[] | undefined,
    avgContentLength: data.avg_content_length as number | undefined,
    emojiUsageRate: data.emoji_usage_rate as number | undefined,
    questionUsageRate: data.question_usage_rate as number | undefined,
    dominantEmotions: data.dominant_emotions as string[] | undefined,
    emotionIntensity: data.emotion_intensity as 'high' | 'medium' | 'low' | undefined,
    totalContents: data.total_contents as number,
    totalHits: data.total_hits as number,
    hitRate: data.hit_rate as number | undefined,
    avgViews: data.avg_views as number | undefined,
    avgLikes: data.avg_likes as number | undefined,
    learningProgress: data.learning_progress as number,
    lastLearnedAt: data.last_learned_at ? new Date(data.last_learned_at as string) : undefined,
    confidenceScore: data.confidence_score as number | undefined,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  };
}
