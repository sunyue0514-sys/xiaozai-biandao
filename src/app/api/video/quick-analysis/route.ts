import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 视频快速分析 API（轻量版）
 * 专为灵感共创模块设计，快速输出爆款分析结果
 * 
 * 特点：
 * 1. 支持缓存机制，避免重复分析
 * 2. 消耗更少算力（200点）
 * 3. 基于视频元数据+可选文案进行分析
 * 4. 即使无文案也能给出深度分析
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 轻量分析结果接口
interface QuickAnalysisResult {
  title: string;
  author: string;
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  views: number;
  platform: string;
  platformName: string;
  analysis: {
    // 一、核心本质
    coreEssence: {
      primaryEmotion: string;
      secondaryEmotion: string;
      triggerMechanism: string;
      coreDemand: string;
      whyNow: string;
    };
    // 二、数据归因
    dataAttribution: {
      collectRate: string;
      shareRate: string;
      commentRate: string;
      whyHighOrLow: string;
      algorithmTrigger: string;
    };
    // 三、用户画像
    userPortrait: {
      targetAudience: string;
      painPoints: string[];
      pleasurePoints: string[];
    };
    // 四、内容结构
    contentStructure: {
      hookType: string;
      hookFormula: string;
      hookScore: number;
      structureType: string;
      endingHook: string;
    };
    // 五、可复制方法论
    copyableMethodology: {
      topicFormula: string;
      keyElements: string[];
      quickCopy: string;
    };
    // 六、风险指南
    riskWarning: {
      canCopy: string[];
      cannotCopy: string[];
      adaptationTip: string;
    };
    // 七、变现转化
    monetization: {
      path: string;
      potential: number;
      suitableProducts: string[];
    };
  };
}

// 平台名称映射
const PLATFORM_NAMES: Record<string, string> = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  weibo: '微博',
};

/**
 * 调用 LLM 进行爆款分析
 */
async function analyzeVideo(
  title: string,
  author: string,
  likes: number,
  collects: number,
  shares: number,
  comments: number,
  views: number,
  platform: string,
  scriptContent?: string
): Promise<QuickAnalysisResult['analysis']> {
  const config = new Config();
  const client = new LLMClient(config);

  // 计算真实比率（基于预估播放量）
  // 如果播放量为0，基于点赞数预估（抖音点赞率约5-8%，取6%）
  const estimatedViews = views > 0 ? views : Math.round(likes / 0.06);
  const collectRate = estimatedViews > 0 ? ((collects / estimatedViews) * 100).toFixed(2) : '0';
  const shareRate = estimatedViews > 0 ? ((shares / estimatedViews) * 100).toFixed(2) : '0';
  const commentRate = estimatedViews > 0 ? ((comments / estimatedViews) * 100).toFixed(2) : '0';

  const systemPrompt = `你是一位爆款短视频分析师，擅长从标题、互动数据中洞察视频为什么能火。请用精简但深刻的语言输出分析结果。

## 你的分析能力

即使只有标题和互动数据，你也能通过以下方式深度分析：
1. **标题拆解**：钩子类型、情绪触发、目标人群
2. **数据分析**：收藏率/分享率/评论率反映的用户心理
3. **对标思维**：与行业均值对比，判断内容质量
4. **逆向推导**：从数据反推内容结构和表达方式

## 分析维度

### 一、核心本质（回答"为什么能爆"）
- 主要情绪：这个标题击中了什么情绪？（焦虑/好奇/获得感/认同感/虚荣心/恐惧/贪婪/懒惰）
- 次要情绪：辅助情绪是什么？
- 触发机制：标题是如何激发这些情绪的？
- 核心需求：满足了什么需求？
- 为什么现在能火：时机分析

### 二、数据归因
分析互动数据背后的原因：
- 收藏率高（>20%）= 内容实用性强，用户想反复看
- 分享率高（>10%）= 有传播价值，用户愿意推荐
- 评论率高（>10%）= 有争议或共鸣点，用户想表达
- 数据组合分析：高收藏+低分享 = 私藏型干货；高分享+低收藏 = 社交货币型

### 三、用户画像
基于标题和数据判断：
- 目标受众是谁？（年龄段+职业+特点）
- 痛点是什么？（3个）
- 爽点是什么？（3个）

### 四、内容结构
从标题推断可能的内容结构：
- 钩子类型：数字钩子/痛点钩子/悬念钩子/反差钩子/身份钩子
- 钩子公式：标题是怎么写的
- 钩子评分：0-10分
- 结构类型：倒序列举/问题解决/对比论证/故事叙述
- 结尾钩子：可能的收尾方式

### 五、可复制方法论
- 选题公式：可以直接套用的模板
- 必备要素：复制这类内容必须有的要素（3个）
- 快速复制方法：一句话说清楚怎么抄

### 六、风险指南
- 可以抄的（2个）
- 不能抄的（2个）
- 适配建议：如何结合自己的领域

### 七、变现转化
- 变现路径：知识付费/带货/广告/引流私域
- 潜力评分：0-10分
- 适合的产品（2个）

## 输出格式（严格JSON）

\`\`\`json
{
  "coreEssence": {
    "primaryEmotion": "焦虑",
    "secondaryEmotion": "获得感",
    "triggerMechanism": "用具体数字刺激焦虑，用方法论给解决方案",
    "coreDemand": "学习需求：想做出爆款视频",
    "whyNow": "短视频竞争加剧，创作者普遍焦虑"
  },
  "dataAttribution": {
    "collectRate": "15.0%",
    "shareRate": "5.0%",
    "commentRate": "3.0%",
    "whyHighOrLow": "收藏率较高说明内容实用性强，用户愿意保存反复看",
    "algorithmTrigger": "高收藏率触发算法推荐，进入更大流量池"
  },
  "userPortrait": {
    "targetAudience": "25-35岁短视频创作者，有基础但缺乏方法论",
    "painPoints": ["做不出爆款", "不懂用户心理", "没有系统方法"],
    "pleasurePoints": ["找到方法了", "原来是这样", "收藏慢慢学"]
  },
  "contentStructure": {
    "hookType": "数字钩子+痛点钩子",
    "hookFormula": "数字(3个)+结果承诺(效率翻倍)",
    "hookScore": 8.5,
    "structureType": "倒序列举型",
    "endingHook": "引导关注获取更多"
  },
  "copyableMethodology": {
    "topicFormula": "[数字]个[领域]技巧，帮你[结果诱惑]",
    "keyElements": ["具体数字", "清晰的价值承诺", "可执行的方法"],
    "quickCopy": "把核心方法论提炼成N个要点，倒序讲解制造悬念"
  },
  "riskWarning": {
    "canCopy": ["标题数字公式", "倒序讲解结构"],
    "cannotCopy": ["具体的方法论内容", "原创案例"],
    "adaptationTip": "用自己的专业领域知识替换内容，保留结构和公式"
  },
  "monetization": {
    "path": "知识付费：课程/咨询/社群",
    "potential": 8,
    "suitableProducts": ["短视频运营课程", "一对一咨询"]
  }
}
\`\`\`

## 重要提醒
1. 分析要一针见血，不要正确的废话
2. 用户画像要具体，不能只说"年轻人"
3. 方法论要能直接套用
4. 风险分析要说清楚边界
5. 如果提供了文案内容，结合文案进行更深入的分析`;

  const userMessage = scriptContent 
    ? `请深度分析这个短视频：

## 视频信息
- 标题：${title}
- 作者：${author}
- 平台：${PLATFORM_NAMES[platform] || platform}
- 点赞：${likes.toLocaleString()}
- 评论：${comments.toLocaleString()}
- 分享：${shares.toLocaleString()}
- 收藏：${collects.toLocaleString()}
- 预估播放：${estimatedViews.toLocaleString()}

## 互动数据比率
- 收藏率：${collectRate}%（行业均值：15-20%）
- 分享率：${shareRate}%（行业均值：8-12%）
- 评论率：${commentRate}%（行业均值：5-10%）

## 口播文案
${scriptContent}

输出JSON格式的深度分析结果。`
    : `请深度分析这个短视频（基于标题和互动数据）：

## 视频信息
- 标题：${title}
- 作者：${author}
- 平台：${PLATFORM_NAMES[platform] || platform}
- 点赞：${likes.toLocaleString()}
- 评论：${comments.toLocaleString()}
- 分享：${shares.toLocaleString()}
- 收藏：${collects.toLocaleString()}
- 预估播放：${estimatedViews.toLocaleString()}

## 互动数据比率
- 收藏率：${collectRate}%（行业均值：15-20%）
- 分享率：${shareRate}%（行业均值：8-12%）
- 评论率：${commentRate}%（行业均值：5-10%）

注意：未提供文案内容，请基于标题和互动数据进行深度分析。
输出JSON格式的分析结果。`;

  console.log('API operation event');
  console.log('API operation event');
  console.log('API operation event');

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userMessage },
  ];

  let result = '';
  const startTime = Date.now();
  
  try {
    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.3,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        result += chunk.content.toString();
      }
      if (Date.now() - startTime > 30000) {
        console.log('API operation event');
        break;
      }
    }
  } catch (streamError: any) {
    console.error('API operation event');
    throw streamError;
  }

  console.log('API operation event');

  // 解析JSON
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('API operation event');
      return parsed;
    }
  } catch (e) {
    console.error('API operation event');
    console.error('API operation event');
  }

  throw new Error('LLM 返回格式错误');
}

/**
 * POST /api/video/quick-analysis
 * 视频快速分析接口
 * 
 * 支持两种调用方式：
 * 1. 传 videoUrl：自动解析视频获取数据
 * 2. 直接传元数据：title, likes, collects, shares, comments, platform
 */
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    const ip = getClientIp(request);
    
    if (isIpBlacklisted(ip)) {
      return NextResponse.json({ error: '访问已被禁止' }, { status: 403 });
    }
    
    const { allowed: ipAllowed, resetTime } = checkRateLimit(`ai-ip:${ip}`, RATE_LIMITS.ai);
    if (!ipAllowed) {
      return NextResponse.json({
        error: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      }, { status: 429 });
    }

    // 验证登录状态
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '会话无效' }, { status: 401 });
    }

    const { allowed: userAllowed, reason } = checkAILimit(String(userId));
    if (!userAllowed) {
      return NextResponse.json({ error: reason || 'AI调用次数已达上限' }, { status: 429 });
    }

    // 检查算力
    const input = await request.json();
    if (input.videoId) {
      if (!Number.isInteger(input.videoId) || input.videoId < 1) return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
      const { data: source, error: sourceError } = await getSupabaseClient().from('inspiration_videos')
        .select('id, uploaded_by, status').eq('id', input.videoId).single();
      if (sourceError || !source || source.status !== 'approved' && Number(source.uploaded_by) !== userId) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    const powerCheck = await consumePower(userId, 'video_quick_analysis');
    if (!powerCheck.success) {
      return NextResponse.json({
        error: powerCheck.error,
        code: powerCheck.code,
        required: powerCheck.required,
        remaining: powerCheck.remaining,
      }, { status: 403 });
    }

    const body = await request.json();
    const { 
      // 方式1：直接传元数据
      title, 
      author, 
      likes, 
      collects, 
      shares, 
      comments, 
      views, 
      platform,
      track,
      category,
      // 可选：文案内容
      scriptContent,
      // 视频ID（用于缓存）
      videoId,
      // 是否强制重新分析
      forceRefresh,
    } = body;

    // 验证必填字段
    if (!title || !likes) {
      return NextResponse.json({ error: '请提供视频标题和点赞数' }, { status: 400 });
    }

    // 如果提供了 videoId，先检查是否有缓存的分析结果
    if (videoId && !forceRefresh) {
      try {
        const supabase = getSupabaseClient();
        const { data: cachedResult, error: cacheError } = await supabase
          .from('inspiration_videos')
          .select('quick_analysis_result')
          .eq('id', videoId)
          .single();
        
        if (!cacheError && cachedResult?.quick_analysis_result) {
          console.log('API operation event');
          const cachedData = cachedResult.quick_analysis_result;
          
          // 验证缓存数据结构完整性
          if (cachedData && cachedData.analysis && 
              cachedData.analysis.coreEssence && 
              cachedData.analysis.userPortrait) {
            return NextResponse.json({
              success: true,
              data: cachedData,
              fromCache: true,
            });
          }
        }
      } catch (cacheError) {
        console.error('API operation event');
        // 继续执行分析流程
      }
    }

    // 调用 LLM 分析
    let analysis: QuickAnalysisResult['analysis'];
    
    try {
      analysis = await analyzeVideo(
        title,
        author || '未知作者',
        likes,
        collects || 0,
        shares || 0,
        comments || 0,
        views || 0,
        platform || 'douyin',
        scriptContent
      );
    } catch (analysisError: any) {
      console.error('API operation event');
      return NextResponse.json({
        error: '分析失败，请稍后重试',
        detail: 'Request failed',
      }, { status: 500 });
    }

    // 组装结果
    const result: QuickAnalysisResult = {
      title: title,
      author: author || '未知作者',
      likes: likes,
      comments: comments || 0,
      shares: shares || 0,
      collects: collects || 0,
      views: views || likes * 50,
      platform: platform || 'douyin',
      platformName: PLATFORM_NAMES[platform || 'douyin'] || platform || '抖音',
      analysis: analysis,
    };

    // 如果提供了 videoId，保存分析结果到数据库
    if (videoId) {
      try {
        const supabase = getSupabaseClient();
        const { error: updateError } = await supabase
          .from('inspiration_videos')
          .update({ 
            quick_analysis_result: result,
            updated_at: new Date().toISOString()
          })
          .eq('id', videoId).eq('uploaded_by', userId);
        
        if (updateError) {
          console.error('API operation event');
        } else {
          console.log('API operation event');
        }
      } catch (saveError) {
        console.error('API operation event');
        // 不影响返回结果
      }
    }

    console.log('API operation event');

    return NextResponse.json({
      success: true,
      data: result,
      fromCache: false,
    });

  } catch (error) {
    console.error('API operation event');
    const errorMessage = error instanceof Error ? 'Request failed' : 'Request failed';
    return NextResponse.json({
      error: `分析失败: ${errorMessage}`,
      message: errorMessage,
    }, { status: 500 });
  }
}
