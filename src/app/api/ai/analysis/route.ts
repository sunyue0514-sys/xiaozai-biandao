import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * AI 分析 API
 * 
 * 支持多种分析类型：
 * - viral_analysis: 爆款视频分析
 */

import { NextRequest, NextResponse } from 'next/server';

// ========== 类型定义 ==========
interface ViralAnalysisRequest {
  type: 'viral_analysis';
  data: {
    title: string;
    description: string;
    hashtags: string[];
    likes: number;
    comments: number;
    shares: number;
    collects: number;
    views?: number;
    author: {
      name: string;
      followerCount?: number;
    };
    platform: string;
  };
}

interface ViralAnalysisResult {
  viralFactors: string[];
  contentStrategy: string[];
  creativeSuggestions: string[];
  targetAudience: string;
}

// ========== 爆款分析逻辑 ==========

/**
 * 分析爆款因素
 */
function analyzeViralFactors(data: ViralAnalysisRequest['data']): string[] {
  const factors: string[] = [];
  
  // 互动率分析
  const totalInteractions = data.likes + data.comments + data.shares + data.collects;
  const engagementRate = data.views ? (totalInteractions / data.views) * 100 : 0;
  
  if (engagementRate > 10) {
    factors.push('超高互动率：用户参与度极高，内容引发强烈共鸣');
  } else if (engagementRate > 5) {
    factors.push('良好互动率：内容质量优秀，用户愿意互动');
  }
  
  // 评论/点赞比分析
  const commentRatio = data.likes > 0 ? (data.comments / data.likes) * 100 : 0;
  if (commentRatio > 10) {
    factors.push('高讨论度：评论占比高，话题具有争议性或引发思考');
  }
  
  // 分享/收藏比分析
  const shareRatio = data.likes > 0 ? (data.shares / data.likes) * 100 : 0;
  if (shareRatio > 5) {
    factors.push('强传播性：分享意愿强，内容具有社交价值');
  }
  
  const collectRatio = data.likes > 0 ? (data.collects / data.likes) * 100 : 0;
  if (collectRatio > 3) {
    factors.push('高实用价值：收藏比例高，内容具有学习参考价值');
  }
  
  // 标题分析
  if (data.title.includes('？') || data.title.includes('?')) {
    factors.push('标题设问：使用疑问句引发好奇心');
  }
  if (data.title.length < 30 && data.title.length > 10) {
    factors.push('标题简洁：短小精悍，快速传递核心信息');
  }
  if (/[0-9]/.test(data.title)) {
    factors.push('数字吸引：标题包含数字，增强可信度和吸引力');
  }
  
  // 标签分析
  const hashtags = data.hashtags || [];
  if (hashtags.length >= 3 && hashtags.length <= 5) {
    factors.push('标签精准：使用适量热门标签，曝光与精准兼顾');
  }
  
  // 粉丝与数据对比
  if (data.author.followerCount && data.author.followerCount < 10000 && data.likes > 100000) {
    factors.push('小号爆款：低粉丝高产赞，内容质量过硬');
  }
  
  if (factors.length === 0) {
    factors.push('综合表现优秀：各项数据均衡，内容质量稳定');
  }
  
  return factors;
}

/**
 * 生成内容策略建议
 */
function generateContentStrategy(data: ViralAnalysisRequest['data']): string[] {
  const strategies: string[] = [];
  const hashtags = data.hashtags || [];
  
  // 基于互动类型
  if (data.comments > data.shares) {
    strategies.push('激发讨论：可以继续使用引发思考或争议的表达方式');
  }
  if (data.shares > data.comments) {
    strategies.push('社交价值：内容适合转发分享，可以强化"收藏备用"属性');
  }
  
  // 基于标签
  if (hashtags.length > 0) {
    strategies.push('借势话题：可围绕 #' + hashtags[0] + ' 持续产出系列内容');
  }
  
  // 基于平台
  const platformStrategies: Record<string, string> = {
    'douyin': '抖音算法偏好：前3秒抓眼球，完播率是关键',
    'kuaishou': '快手社区偏好：真实接地气，老铁文化',
    'xiaohongshu': '小红书风格：图文并茂，干货分享型',
    'bilibili': 'B站特色：深度内容，弹幕互动',
    'weibo': '微博传播：热点借势，话题营销',
  };
  
  if (platformStrategies[data.platform]) {
    strategies.push(platformStrategies[data.platform]);
  }
  
  return strategies;
}

/**
 * 生成创作建议
 */
function generateCreativeSuggestions(data: ViralAnalysisRequest['data']): string[] {
  const suggestions: string[] = [];
  
  // 基于标题特点
  if (data.title.includes('如何') || data.title.includes('怎么')) {
    suggestions.push('延续教程风格：用户喜欢你的"干货分享"形式');
  }
  if (/[0-9]+个|[0-9]+种|[0-9]+招/.test(data.title)) {
    suggestions.push('清单体结构：数字罗列式标题很受欢迎，可继续使用');
  }
  
  // 基于数据表现
  if (data.likes > 100000) {
    suggestions.push('爆款潜力方向：该主题有爆款基因，可以做系列延伸');
  }
  
  // 通用建议
  suggestions.push('模仿结构：学习该视频的开头节奏和信息密度');
  suggestions.push('差异化：在相似主题下找到你的独特切入点');
  suggestions.push('迭代优化：借鉴爆款元素，但保持自己的内容风格');
  
  return suggestions.slice(0, 5);
}

/**
 * 分析目标受众
 */
function analyzeTargetAudience(data: ViralAnalysisRequest['data']): string {
  const audiences: string[] = [];
  const hashtags = data.hashtags || [];
  
  // 基于标签推断
  const tagAudienceMap: Record<string, string> = {
    '搞钱': '追求财务自由的年轻人、职场新人',
    '副业': '想增加收入来源的上班族',
    '成长': '自我提升意识强的知识型用户',
    '职场': '职场人士、求职者',
    '穿搭': '关注时尚的女性用户',
    '美食': '热爱生活的美食爱好者',
    '旅行': '向往自由的年轻群体',
    '健身': '注重健康的运动爱好者',
    '育儿': '年轻父母群体',
    '情感': '情感需求强烈的年轻用户',
  };
  
  for (let i = 0; i < hashtags.length; i++) {
    const tag = hashtags[i];
    if (tagAudienceMap[tag]) {
      audiences.push(tagAudienceMap[tag]);
    }
  }
  
  // 基于数据特征推断
  if (data.collects > data.shares) {
    audiences.push('注重实用价值的收藏型用户');
  }
  if (data.comments > data.likes * 0.1) {
    audiences.push('喜欢互动讨论的活跃用户');
  }
  
  if (audiences.length === 0) {
    return '该内容受众较广，适合对主题感兴趣的泛用户群体';
  }
  
  // 去重并取前3个
  const uniqueAudiences: string[] = [];
  for (let i = 0; i < audiences.length; i++) {
    if (uniqueAudiences.indexOf(audiences[i]) === -1) {
      uniqueAudiences.push(audiences[i]);
    }
  }
  
  return uniqueAudiences.slice(0, 3).join('、');
}

// ========== API 路由 ==========

/**
 * POST /api/ai/analysis
 * 
 * AI 分析接口
 */
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false});
  if (securityResponse) return securityResponse;

  try {
    const body = await request.json();
    const type = body.type;
    const data = body.data;

    if (!type || !data) {
      return NextResponse.json({
        success: false,
        error: '参数不完整',
      }, { status: 400 });
    }

    if (type === 'viral_analysis') {
      // 爆款分析
      const analysis: ViralAnalysisResult = {
        viralFactors: analyzeViralFactors(data),
        contentStrategy: generateContentStrategy(data),
        creativeSuggestions: generateCreativeSuggestions(data),
        targetAudience: analyzeTargetAudience(data),
      };

      return NextResponse.json({
        success: true,
        analysis: analysis,
      });
    }

    return NextResponse.json({
      success: false,
      error: '不支持的分析类型',
    }, { status: 400 });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({
      success: false,
      error: '分析失败，请稍后重试',
    }, { status: 500 });
  }
}
