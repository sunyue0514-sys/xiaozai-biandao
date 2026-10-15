import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * AI 质量分析智能路由
 * 接收自然语言问题，自动判断意图并调用对应功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getStats, 
  getFeatureStats, 
  getErrorStats, 
  getOptimizationSuggestions,
  generateQualityReport,
  diagnoseAIQuality,
  FEATURE_NAMES
} from '@/lib/ai-quality-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 验证调试 Token
function validateDebugToken(request: NextRequest): boolean {
  const debugToken = process.env.DEBUG_TOKEN;
  
  // 生产环境需要验证 Token
  if (!debugToken) {
    return false;
  }
  
  const requestToken = request.headers.get('X-Debug-Token');
  return requestToken === debugToken;
}

// 意图识别关键词
const INTENT_KEYWORDS: Record<string, {
  keywords: string[];
  action: string;
  description: string;
}> = {
  stats: {
    keywords: ['统计', '数据', '概览', '调用', '次数', '成功率', '耗时', '看看', '查看', '有多少'],
    action: 'stats',
    description: 'AI 调用统计数据'
  },
  errors: {
    keywords: ['错误', '失败', '报错', '异常', '出问题', '不行', '错误分析', '失败原因'],
    action: 'errors',
    description: 'AI 调用错误分析'
  },
  suggestions: {
    keywords: ['优化', '改进', '建议', '提升', '怎么改', '如何优化', '怎么办', '解决方案'],
    action: 'suggestions',
    description: 'AI 优化建议'
  },
  diagnose: {
    keywords: ['诊断', '检查', '全面', '一键', '整体', '健康', '状态', '有没有问题'],
    action: 'diagnose',
    description: 'AI 质量诊断'
  },
  report: {
    keywords: ['报告', '周报', '日报', '月报', '总结', '汇总', '导出'],
    action: 'report',
    description: 'AI 质量报告'
  },
  help: {
    keywords: ['帮助', '能做什么', '功能', '怎么用', '使用方法', '介绍'],
    action: 'help',
    description: '功能介绍'
  }
};

// 识别用户意图
function recognizeIntent(question: string): { action: string; confidence: number; params: Record<string, any> } {
  const lowerQuestion = question.toLowerCase();
  
  // 检查功能名称
  let targetFeature: string | undefined;
  for (const [feature, name] of Object.entries(FEATURE_NAMES)) {
    if (lowerQuestion.includes(name.toLowerCase()) || lowerQuestion.includes(feature.toLowerCase())) {
      targetFeature = feature;
      break;
    }
  }
  
  // 检查报告类型
  let reportType: 'daily' | 'weekly' | 'monthly' | undefined;
  if (lowerQuestion.includes('日报') || lowerQuestion.includes('每天')) {
    reportType = 'daily';
  } else if (lowerQuestion.includes('月报') || lowerQuestion.includes('每月')) {
    reportType = 'monthly';
  } else if (lowerQuestion.includes('周报') || lowerQuestion.includes('每周') || lowerQuestion.includes('报告')) {
    reportType = 'weekly';
  }
  
  // 计算各意图的匹配分数
  const scores: Record<string, number> = {};
  
  for (const [intent, config] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      if (lowerQuestion.includes(keyword)) {
        score += 1;
      }
    }
    scores[intent] = score;
  }
  
  // 找出最高分
  let maxIntent = 'help';
  let maxScore = 0;
  
  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxIntent = intent;
    }
  }
  
  // 如果没有明确匹配，默认返回诊断
  if (maxScore === 0) {
    maxIntent = 'diagnose';
  }
  
  return {
    action: maxIntent,
    confidence: maxScore > 0 ? maxScore / 5 : 0.5,
    params: {
      feature: targetFeature,
      reportType
    }
  };
}

// 格式化统计结果
function formatStatsResult(data: any): string {
  const { summary, byFeature } = data;
  
  let result = `📊 AI 调用统计\n\n`;
  result += `**概览**\n`;
  result += `- 总调用：${summary.totalCalls} 次\n`;
  result += `- 成功率：${summary.successRate}%\n`;
  result += `- 平均耗时：${summary.avgDuration}ms\n`;
  result += `- 总 Token：${summary.totalTokens}\n\n`;
  
  if (byFeature.length > 0) {
    result += `**功能排行**\n`;
    byFeature.slice(0, 5).forEach((f: any, i: number) => {
      const status = f.successRate >= 95 ? '✅' : f.successRate >= 80 ? '⚠️' : '❌';
      result += `${i + 1}. ${status} ${f.displayName}：${f.calls}次 (成功率 ${f.successRate}%)\n`;
    });
  }
  
  return result;
}

// 格式化错误结果
function formatErrorsResult(data: any): string {
  const { totalErrors, byType, recentErrors } = data;
  
  let result = `⚠️ 错误分析报告\n\n`;
  result += `发现 ${totalErrors} 个错误\n\n`;
  
  if (byType.length > 0) {
    result += `**错误类型分布**\n`;
    byType.forEach((t: any) => {
      result += `- ${t.name}：${t.count}次 (${t.percentage}%)\n`;
      result += `  影响功能：${t.affectedFeatures.map((f: string) => FEATURE_NAMES[f] || f).join('、')}\n`;
    });
  }
  
  if (recentErrors.length > 0) {
    result += `\n**最近错误**\n`;
    recentErrors.slice(0, 3).forEach((e: any) => {
      result += `- [${new Date(e.time).toLocaleString('zh-CN')}] ${FEATURE_NAMES[e.feature] || e.feature}\n`;
      result += `  错误：${e.error}\n`;
    });
  }
  
  return result;
}

// 格式化诊断结果
function formatDiagnoseResult(data: any): string {
  const { status, summary, issues, recommendations } = data;
  
  const statusEmoji = status === 'healthy' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  const statusText = status === 'healthy' ? '健康' : status === 'warning' ? '警告' : '异常';
  
  let result = `🔍 AI 质量诊断\n\n`;
  result += `**整体状态**: ${statusEmoji} ${statusText}\n\n`;
  result += `**关键指标**\n`;
  result += `- 总调用：${summary.totalCalls} 次\n`;
  result += `- 成功率：${summary.successRate}%\n`;
  result += `- 平均耗时：${summary.avgDuration}ms\n\n`;
  
  if (issues.length > 0) {
    result += `**发现问题**\n`;
    issues.forEach((issue: any) => {
      const severityEmoji = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡';
      result += `- ${severityEmoji} ${issue.feature === 'overall' ? '整体' : (FEATURE_NAMES[issue.feature] || issue.feature)}: ${issue.issue}\n`;
      result += `  建议：${issue.recommendation}\n`;
    });
  }
  
  if (recommendations.length > 0) {
    result += `\n**优化建议**\n`;
    recommendations.forEach((r: string) => {
      result += `- ${r}\n`;
    });
  }
  
  return result;
}

// 格式化优化建议
function formatSuggestionsResult(data: any): string {
  const { suggestions } = data;
  
  let result = `💡 AI 优化建议\n\n`;
  
  if (suggestions.length === 0) {
    result += `当前暂无优化建议，AI 功能运行良好！\n`;
  } else {
    suggestions.forEach((s: any, i: number) => {
      const priorityEmoji = s.priority === 'critical' ? '🔴' : s.priority === 'high' ? '🟠' : '🟡';
      result += `${i + 1}. ${priorityEmoji} **${s.featureName}**\n`;
      result += `   问题：${s.issue}\n`;
      result += `   建议：${s.suggestion}\n`;
      if (s.codeExample) {
        result += `   示例：\n\`\`\`\n${s.codeExample}\n\`\`\`\n`;
      }
      result += `\n`;
    });
  }
  
  return result;
}

// 格式化报告
function formatReportResult(data: any): string {
  const { reportId, period, summary, highlights, actions } = data;
  
  let result = `📋 AI 质量报告\n\n`;
  result += `**报告周期**: ${period.start} ~ ${period.end}\n\n`;
  result += `**概览**\n`;
  result += `- 总调用：${summary.totalCalls} 次\n`;
  result += `- 成功率：${summary.successRate}%\n`;
  result += `- 平均耗时：${summary.avgDuration}ms\n\n`;
  
  if (highlights.length > 0) {
    result += `**亮点**\n`;
    highlights.forEach((h: string) => {
      result += `- ✅ ${h}\n`;
    });
  }
  
  if (actions.length > 0) {
    result += `\n**待办事项**\n`;
    actions.forEach((a: string) => {
      result += `- ${a}\n`;
    });
  }
  
  return result;
}

// 帮助信息
function getHelpMessage(): string {
  return `📖 AI 质量优化助手 - 功能介绍

**我可以帮你：**

1. 📊 **查看统计数据** - "帮我看看这周的AI调用数据"
2. ⚠️ **分析错误** - "最近脚本生成总是失败，帮我看看"  
3. 💡 **优化建议** - "如何提升AI生成质量"
4. 🔍 **一键诊断** - "帮我全面检查AI功能"
5. 📋 **生成报告** - "生成一份AI质量周报"

**示例对话：**
- "查看统计数据"
- "分析最近的错误"
- "帮我诊断一下AI质量"
- "生成周报"
- "脚本生成成功率怎么样"

直接告诉我你想了解什么即可！`;
}

// POST /api/ai-quality/chat - 智能对话入口
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"admin":true});
  if (securityResponse) return securityResponse;

  // 验证权限
  if (!validateDebugToken(request)) {
    return NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { question, action: explicitAction } = body;
    
    // 如果没有问题，返回帮助信息
    if (!question) {
      return NextResponse.json({
        success: true,
        data: {
          answer: getHelpMessage(),
          action: 'help'
        }
      });
    }
    
    // 识别意图（如果提供了明确的 action，直接使用）
    const intent = explicitAction ? { action: explicitAction, confidence: 1, params: {} as Record<string, any> } : recognizeIntent(question);
    const { action, params } = intent;
    
    // 安全获取参数
    const featureFilter = params?.feature as string | undefined;
    const reportTypeParam = params?.reportType as 'daily' | 'weekly' | 'monthly' | undefined;
    
    let answer = '';
    let data: any = null;
    
    // 执行对应操作
    switch (action) {
      case 'stats': {
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const summary = await getStats(startDate, endDate, featureFilter);
        const byFeature = await getFeatureStats(startDate, endDate);
        
        data = { summary, byFeature };
        answer = formatStatsResult(data);
        break;
      }
      
      case 'errors': {
        data = await getErrorStats(featureFilter, 20);
        answer = formatErrorsResult(data);
        break;
      }
      
      case 'suggestions': {
        data = await getOptimizationSuggestions();
        answer = formatSuggestionsResult(data);
        break;
      }
      
      case 'diagnose': {
        data = await diagnoseAIQuality();
        answer = formatDiagnoseResult(data);
        break;
      }
      
      case 'report': {
        const reportType = reportTypeParam || 'weekly';
        data = await generateQualityReport(reportType);
        answer = formatReportResult(data);
        break;
      }
      
      case 'help':
      default:
        answer = getHelpMessage();
        break;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        answer,
        action,
        rawData: data
      }
    });
    
  } catch (error: any) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    );
  }
}

// GET - 快速诊断
export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false,"admin":true});
  if (securityResponse) return securityResponse;

  if (!validateDebugToken(request)) {
    return NextResponse.json(
      { success: false, error: '未授权访问' },
      { status: 401 }
    );
  }
  
  try {
    const data = await diagnoseAIQuality();
    const answer = formatDiagnoseResult(data);
    
    return NextResponse.json({
      success: true,
      data: {
        answer,
        action: 'diagnose',
        rawData: data
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    );
  }
}
