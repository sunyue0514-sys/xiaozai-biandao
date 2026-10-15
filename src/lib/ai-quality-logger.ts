/**
 * AI 质量监控工具函数
 * 用于记录、分析和统计 AI 调用数据
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

// 功能名称映射
export const FEATURE_NAMES: Record<string, string> = {
  'script_generate': '脚本生成',
  'script_dialogue': '对话脚本',
  'script_opening': '开场白生成',
  'script_writing': '写作脚本',
  'topic_recommend': '选题推荐',
  'copywriting_analysis': '文案分析',
  'live_speech': '直播话术',
  'quick_create': '快速创作',
  'video_deep_analysis': '视频深度分析',
  'rewrite_script': '仿写脚本',
  'qianchuan_copywriting': '千川文案',
  'qianchuan_script': '千川脚本',
  'qianchuan_analyze': '千川分析',
  'scriptless_chat': '无脚本对话',
  'customer_positioning': '客户定位',
  'product_positioning': '产品定位',
  'product_auto_fill': '产品自动填充',
};

// 错误类型定义
export const ERROR_TYPES: Record<string, { name: string; description: string }> = {
  'json_parse_error': {
    name: 'JSON解析错误',
    description: 'LLM返回的JSON格式不正确'
  },
  'timeout_error': {
    name: '超时错误',
    description: 'API调用超时'
  },
  'rate_limit_error': {
    name: '频率限制',
    description: '触发API调用频率限制'
  },
  'model_error': {
    name: '模型错误',
    description: '模型返回错误或异常'
  },
  'input_error': {
    name: '输入错误',
    description: '用户输入参数不合法'
  },
  'multimodal_error': {
    name: '多模态错误',
    description: '视觉模型处理失败'
  },
  'unknown_error': {
    name: '未知错误',
    description: '未分类的错误类型'
  }
};

// AI 调用日志接口
export interface AICallLog {
  feature: string;
  userId?: number;
  input?: string;
  output?: string;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  durationMs: number;
  tokensUsed?: number;
  model?: string;
  qualityScore?: number;
}

// 聚合统计接口
export interface AggregatedStats {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  successRate: number;
  avgDuration: number;
  totalTokens: number;
  avgQualityScore: number | null;
}

/**
 * 记录 AI 调用日志
 */
export async function logAICall(log: AICallLog): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    // 截断输入输出，避免存储过大
    const truncatedInput = log.input ? log.input.substring(0, 1000) : null;
    const truncatedOutput = log.output ? log.output.substring(0, 2000) : null;
    
    const { error } = await supabase
      .from('ai_call_logs')
      .insert({
        feature: log.feature,
        user_id: log.userId || null,
        input: truncatedInput,
        output: truncatedOutput,
        success: log.success,
        error_type: log.errorType || null,
        error_message: log.errorMessage || null,
        duration_ms: log.durationMs,
        tokens_used: log.tokensUsed || 0,
        model: log.model || null,
        quality_score: log.qualityScore || null,
      });
    
    if (error) {
      console.error('[AI Quality] 记录日志失败:', error);
    }
  } catch (err) {
    // 不阻塞主流程
    console.error('[AI Quality] 记录日志异常:', err);
  }
}

/**
 * 获取日期范围内的统计
 */
export async function getStats(
  startDate: string,
  endDate: string,
  feature?: string
): Promise<AggregatedStats> {
  const supabase = getSupabaseClient();
  
  let query = supabase
    .from('ai_call_logs')
    .select('success, duration_ms, tokens_used, quality_score')
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`);
  
  if (feature) {
    query = query.eq('feature', feature);
  }
  
  const { data, error } = await query;
  
  if (error || !data) {
    return {
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      successRate: 0,
      avgDuration: 0,
      totalTokens: 0,
      avgQualityScore: null,
    };
  }
  
  const totalCalls = data.length;
  const successCalls = data.filter(d => d.success).length;
  const failedCalls = totalCalls - successCalls;
  const totalDuration = data.reduce((sum, d) => sum + (d.duration_ms || 0), 0);
  const totalTokens = data.reduce((sum, d) => sum + (d.tokens_used || 0), 0);
  const qualityScores = data.filter(d => d.quality_score !== null).map(d => d.quality_score);
  
  return {
    totalCalls,
    successCalls,
    failedCalls,
    successRate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100 * 10) / 10 : 0,
    avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
    totalTokens,
    avgQualityScore: qualityScores.length > 0 
      ? Math.round((qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) * 100) / 100 
      : null,
  };
}

/**
 * 获取各功能的统计
 */
export async function getFeatureStats(
  startDate: string,
  endDate: string
): Promise<Array<{
  feature: string;
  displayName: string;
  calls: number;
  successRate: number;
  avgDuration: number;
  trend: string;
}>> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('ai_call_logs')
    .select('feature, success, duration_ms')
    .gte('created_at', `${startDate}T00:00:00Z`)
    .lte('created_at', `${endDate}T23:59:59Z`);
  
  if (error || !data) {
    return [];
  }
  
  // 按功能分组统计
  const featureMap = new Map<string, { total: number; success: number; duration: number }>();
  
  for (const item of data) {
    const existing = featureMap.get(item.feature) || { total: 0, success: 0, duration: 0 };
    existing.total++;
    if (item.success) existing.success++;
    existing.duration += item.duration_ms || 0;
    featureMap.set(item.feature, existing);
  }
  
  // 转换为数组并排序
  const result = Array.from(featureMap.entries())
    .map(([feature, stats]) => ({
      feature,
      displayName: FEATURE_NAMES[feature] || feature,
      calls: stats.total,
      successRate: Math.round((stats.success / stats.total) * 100 * 10) / 10,
      avgDuration: Math.round(stats.duration / stats.total),
      trend: 'stable', // 简化处理，实际可以对比历史数据
    }))
    .sort((a, b) => b.calls - a.calls);
  
  return result;
}

/**
 * 获取错误统计
 */
export async function getErrorStats(
  feature?: string,
  limit: number = 20
): Promise<{
  totalErrors: number;
  byType: Array<{
    type: string;
    name: string;
    count: number;
    percentage: number;
    affectedFeatures: string[];
  }>;
  recentErrors: Array<{
    time: string;
    feature: string;
    error: string;
    input?: string;
    suggestion?: string;
  }>;
}> {
  const supabase = getSupabaseClient();
  
  // 获取失败记录
  let query = supabase
    .from('ai_call_logs')
    .select('feature, error_type, error_message, input, created_at')
    .eq('success', false)
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (feature) {
    query = query.eq('feature', feature);
  }
  
  const { data, error } = await query;
  
  if (error || !data) {
    return {
      totalErrors: 0,
      byType: [],
      recentErrors: [],
    };
  }
  
  const totalErrors = data.length;
  
  // 按错误类型分组
  const typeMap = new Map<string, { count: number; features: Set<string> }>();
  
  for (const item of data) {
    const errorType = item.error_type || 'unknown_error';
    const existing = typeMap.get(errorType) || { count: 0, features: new Set() };
    existing.count++;
    existing.features.add(item.feature);
    typeMap.set(errorType, existing);
  }
  
  const byType = Array.from(typeMap.entries())
    .map(([type, stats]) => ({
      type,
      name: ERROR_TYPES[type]?.name || type,
      count: stats.count,
      percentage: Math.round((stats.count / totalErrors) * 100 * 10) / 10,
      affectedFeatures: Array.from(stats.features),
    }))
    .sort((a, b) => b.count - a.count);
  
  // 获取最近的错误
  const recentErrors = data.slice(0, limit).map(item => ({
    time: item.created_at,
    feature: item.feature,
    error: item.error_message || '未知错误',
    input: item.input?.substring(0, 100),
    suggestion: getErrorSuggestion(item.error_type, item.error_message),
  }));
  
  return {
    totalErrors,
    byType,
    recentErrors,
  };
}

/**
 * 根据错误类型提供建议
 */
function getErrorSuggestion(errorType?: string, errorMessage?: string): string {
  if (!errorType) return '检查日志获取详细信息';
  
  const suggestions: Record<string, string> = {
    'json_parse_error': '使用 json-repair 工具修复，或在 prompt 中明确 JSON 格式要求',
    'timeout_error': '检查网络连接，增加超时时间，或添加重试机制',
    'rate_limit_error': '降低调用频率，或联系管理员提升配额',
    'model_error': '检查模型状态，尝试使用其他模型',
    'input_error': '检查输入参数是否符合要求',
    'multimodal_error': '检查图片/视频格式，尝试重新上传',
  };
  
  return suggestions[errorType] || '查看详细日志定位问题';
}

/**
 * 获取优化建议
 */
export async function getOptimizationSuggestions(): Promise<Array<{
  priority: string;
  feature: string;
  featureName: string;
  issue: string;
  suggestion: string;
  codeExample?: string;
}>> {
  const supabase = getSupabaseClient();
  
  // 获取最近7天的错误统计
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDate = sevenDaysAgo.toISOString().split('T')[0];
  const endDate = new Date().toISOString().split('T')[0];
  
  const errorStats = await getErrorStats();
  const featureStats = await getFeatureStats(startDate, endDate);
  
  const suggestions: Array<{
    priority: string;
    feature: string;
    featureName: string;
    issue: string;
    suggestion: string;
    codeExample?: string;
  }> = [];
  
  // 分析错误率高的功能
  for (const stat of featureStats) {
    if (stat.successRate < 90) {
      suggestions.push({
        priority: stat.successRate < 80 ? 'critical' : 'high',
        feature: stat.feature,
        featureName: stat.displayName,
        issue: `${stat.displayName} 成功率仅 ${stat.successRate}%`,
        suggestion: '优先排查该功能的错误日志，定位根本原因',
      });
    }
  }
  
  // 分析错误类型
  for (const errorType of errorStats.byType) {
    if (errorType.type === 'json_parse_error' && errorType.count > 5) {
      suggestions.push({
        priority: 'high',
        feature: errorType.affectedFeatures[0] || 'multiple',
        featureName: FEATURE_NAMES[errorType.affectedFeatures[0]] || '多个功能',
        issue: `JSON 解析错误出现 ${errorType.count} 次`,
        suggestion: '在 prompt 中明确 JSON 格式要求，添加格式示例',
        codeExample: `请按以下 JSON 格式输出：
{
  "title": "标题内容",
  "content": "正文内容",
  "tags": ["标签1", "标签2"]
}`,
      });
    }
    
    if (errorType.type === 'timeout_error' && errorType.count > 3) {
      suggestions.push({
        priority: 'medium',
        feature: errorType.affectedFeatures[0] || 'multiple',
        featureName: FEATURE_NAMES[errorType.affectedFeatures[0]] || '多个功能',
        issue: `超时错误出现 ${errorType.count} 次`,
        suggestion: '增加超时时间，或添加重试机制',
      });
    }
  }
  
  // 按优先级排序
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);
  
  return suggestions;
}

/**
 * 生成质量报告
 */
export async function generateQualityReport(
  type: 'daily' | 'weekly' | 'monthly',
  features?: string[]
): Promise<{
  reportId: string;
  period: { start: string; end: string };
  summary: AggregatedStats;
  featureStats: Array<{
    feature: string;
    displayName: string;
    calls: number;
    successRate: number;
    avgDuration: number;
    trend: string;
  }>;
  highlights: string[];
  actions: string[];
}> {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  
  switch (type) {
    case 'daily':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      endDate = startDate;
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date(now);
      break;
    case 'monthly':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      endDate = new Date(now);
      break;
  }
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const summary = await getStats(startDateStr, endDateStr);
  let featureStats = await getFeatureStats(startDateStr, endDateStr);
  
  // 过滤指定功能
  if (features && features.length > 0) {
    featureStats = featureStats.filter(f => features.includes(f.feature));
  }
  
  // 生成亮点
  const highlights: string[] = [];
  
  if (summary.successRate >= 95) {
    highlights.push(`整体成功率保持在 ${summary.successRate}%，表现优秀`);
  }
  
  for (const stat of featureStats) {
    if (stat.successRate >= 98) {
      highlights.push(`${stat.displayName} 成功率达到 ${stat.successRate}%`);
    }
  }
  
  // 生成待办事项
  const actions: string[] = [];
  const suggestions = await getOptimizationSuggestions();
  
  for (const suggestion of suggestions.slice(0, 3)) {
    actions.push(suggestion.suggestion);
  }
  
  const reportId = `rpt_${startDateStr.replace(/-/g, '')}_${type}`;
  
  return {
    reportId,
    period: { start: startDateStr, end: endDateStr },
    summary,
    featureStats,
    highlights,
    actions,
  };
}

/**
 * 一键诊断
 */
export async function diagnoseAIQuality(): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  summary: {
    totalCalls: number;
    successRate: number;
    avgDuration: number;
  };
  issues: Array<{
    severity: string;
    feature: string;
    issue: string;
    recommendation: string;
  }>;
  recommendations: string[];
}> {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekAgoStr = sevenDaysAgo.toISOString().split('T')[0];
  
  const [summary, errorStats, featureStats] = await Promise.all([
    getStats(weekAgoStr, today),
    getErrorStats(),
    getFeatureStats(weekAgoStr, today),
  ]);
  
  const issues: Array<{
    severity: string;
    feature: string;
    issue: string;
    recommendation: string;
  }> = [];
  
  // 判断整体状态
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  if (summary.successRate < 80) {
    status = 'critical';
    issues.push({
      severity: 'critical',
      feature: 'overall',
      issue: `整体成功率仅 ${summary.successRate}%`,
      recommendation: '立即排查系统错误，检查关键 API 状态',
    });
  } else if (summary.successRate < 90) {
    status = 'warning';
    issues.push({
      severity: 'warning',
      feature: 'overall',
      issue: `整体成功率 ${summary.successRate}%，有优化空间`,
      recommendation: '分析失败案例，优化提示词和参数配置',
    });
  }
  
  // 检查各功能状态
  for (const stat of featureStats) {
    if (stat.successRate < 85) {
      issues.push({
        severity: 'high',
        feature: stat.feature,
        issue: `${stat.displayName} 成功率 ${stat.successRate}%`,
        recommendation: '检查该功能的错误日志，定位问题根源',
      });
    }
    
    if (stat.avgDuration > 10000) {
      issues.push({
        severity: 'medium',
        feature: stat.feature,
        issue: `${stat.displayName} 平均耗时 ${stat.avgDuration}ms`,
        recommendation: '考虑优化提示词长度，或使用更快的模型',
      });
    }
  }
  
  // 检查错误类型
  for (const errorType of errorStats.byType) {
    if (errorType.count > 10) {
      issues.push({
        severity: 'high',
        feature: 'multiple',
        issue: `${errorType.name} 出现 ${errorType.count} 次`,
        recommendation: getErrorSuggestion(errorType.type),
      });
    }
  }
  
  // 生成推荐
  const recommendations: string[] = [];
  
  if (errorStats.byType.some(e => e.type === 'json_parse_error')) {
    recommendations.push('统一使用 JSON 修复工具，在 prompt 中明确格式要求');
  }
  
  if (featureStats.some(f => f.avgDuration > 8000)) {
    recommendations.push('考虑使用流式输出，提升用户体验');
  }
  
  if (summary.successRate >= 90) {
    recommendations.push('当前状态良好，可以尝试优化内容质量');
  }
  
  return {
    status,
    summary: {
      totalCalls: summary.totalCalls,
      successRate: summary.successRate,
      avgDuration: summary.avgDuration,
    },
    issues,
    recommendations,
  };
}
