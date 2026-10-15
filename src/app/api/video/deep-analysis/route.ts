import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 视频深度分析 API
 * 使用混合方案提取视频文案，结合 Vision 模型分析视频内容
 * 
 * 技术方案（方案C - 混合方案）：
 * 1. 解析视频链接获取视频下载地址
 * 2. 智能提取文案：字幕优先 → ASR降级 → Vision兜底
 * 3. Vision模型仅用于画面分析（场景、人物、情绪等）
 * 4. 生成爆款分析报告：从"形式拆解"升级为"本质归因"
 * 
 * V2 改进：
 * - 每个观点必须有原文证据和时间戳
 * - 方法论改为填空式模板
 * - 数据分析添加对比和原因解释
 * - 风险分析添加敏感词预警
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { parseShortVideo, detectPlatform, VideoInfo } from '@/lib/video-parser';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { createVideoAnalysisHistory } from '@/lib/db-store';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';
import { extractScript, cleanScriptContent } from '@/lib/script-extractor';
import { generateDeepAnalysisPromptV2, getDefaultReportV2 } from '@/prompts/deep-analysis-v2';
import type { AnalysisReportV2, TimestampedScript } from '@/types/analysis-report';
import { safeParseLLMJson } from '@/lib/json-repair';
import { logAICall } from '@/lib/ai-quality-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 平台名称映射
const PLATFORM_NAMES: Record<string, string> = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  weibo: '微博',
};


// 视频分析结果接口（V2）
interface VideoAnalysisResult {
  // 版本标识
  _version: "2.0";
  
  // 基础信息
  title: string;
  author: string;
  authorId?: string;
  authorAvatar?: string;
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  views: number;
  cover: string;
  platform: string;
  platformName: string;
  videoUrl: string;
  duration?: number;
  
  // 口播文案
  scriptContent: string;
  scriptWithTimestamps?: TimestampedScript;
  
  // 脚本类型识别
  scriptType: {
    id: 'story' | 'process' | 'knowledge' | 'opinion';
    name: string;
    confidence: number;
    reason: string;
  };
  
  // 深度分析报告（V2 七大模块）
  analysisReport: AnalysisReportV2;
}

/**
 * 纯文案分析模式（V2）
 * 使用新的 V2 prompt，输出带时间戳证据的分析报告
 */
async function analyzeScriptOnly(
  scriptContent: string,
  videoInfo: VideoInfo,
  customHeaders: Record<string, string>,
  scriptWithTimestamps?: TimestampedScript
): Promise<{
  analysisReport: AnalysisReportV2;
  scriptType: VideoAnalysisResult['scriptType'];
}> {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  // 计算预估播放量和互动率
  const likes = videoInfo.likes || 0;
  const comments = videoInfo.comments || 0;
  const shares = videoInfo.shares || 0;
  const collects = videoInfo.collects || 0;
  let views = videoInfo.views || 0;
  let estimatedViews = false;
  
  if (views === 0 && likes > 0) {
    views = Math.round(likes / 0.06);
    estimatedViews = true;
    console.log('API operation event');
  }
  
  // 计算互动率
  const interactionRates = {
    collectRate: views > 0 ? ((collects / views) * 100).toFixed(2) : '0',
    shareRate: views > 0 ? ((shares / views) * 100).toFixed(2) : '0',
    commentRate: views > 0 ? ((comments / views) * 100).toFixed(2) : '0',
    likeRate: views > 0 ? ((likes / views) * 100).toFixed(2) : '0',
  };
  
  console.log('API operation event');

  // 使用 V2 prompt
  const userPrompt = generateDeepAnalysisPromptV2({
    scriptContent,
    scriptWithTimestamps,
    videoInfo: {
      title: videoInfo.title,
      author: videoInfo.author,
      likes,
      comments,
      shares,
      collects,
      views,
      estimatedViews,
    },
    interactionRates,
  });

  console.log('API operation event');

  const stream = client.stream([
    { role: 'system', content: '你是一位专业的爆款短视频分析师。请严格按照用户要求的JSON格式输出分析报告。' },
    { role: 'user', content: userPrompt },
  ], {
    model: 'doubao-seed-2-0-lite-260215',
    temperature: 0.3,
  });

  let result = '';
  const startTime = Date.now();
  
  try {
    for await (const chunk of stream) {
      if (chunk.content) {
        result += chunk.content.toString();
      }
      if (Date.now() - startTime > 90000) {
        console.log('API operation event');
        break;
      }
    }
  } catch (streamError: any) {
    console.error('API operation event');
    throw streamError;
  }

  // 解析 JSON
  const parsed = safeParseLLMJson<{
    scriptType?: { id: string; name: string; confidence: number; reason: string };
    analysisReport?: Partial<AnalysisReportV2>;
    coreEssence?: AnalysisReportV2['coreEssence'];
    dataAttribution?: AnalysisReportV2['dataAttribution'];
    userPortrait?: AnalysisReportV2['userPortrait'];
    contentStructure?: AnalysisReportV2['contentStructure'];
    copyableMethodology?: AnalysisReportV2['copyableMethodology'];
    riskWarning?: AnalysisReportV2['riskWarning'];
    monetizationAnalysis?: AnalysisReportV2['monetizationAnalysis'];
  }>(result, '[文案分析]');
  
  if (parsed) {
    const reportData = parsed.analysisReport || parsed;
    
    // 处理 scriptType，确保 id 符合类型要求
    const validScriptTypes = ['story', 'process', 'knowledge', 'opinion'] as const;
    const scriptTypeId = parsed.scriptType?.id || 'knowledge';
    const normalizedScriptType = {
      id: validScriptTypes.includes(scriptTypeId as any) ? scriptTypeId as typeof validScriptTypes[number] : 'knowledge' as const,
      name: parsed.scriptType?.name || '教知识',
      confidence: parsed.scriptType?.confidence || 0.5,
      reason: parsed.scriptType?.reason || '默认类型',
    };
    
    // 构建 V2 报告
    const analysisReport: AnalysisReportV2 = {
      _version: "2.0",
      videoInfo: {
        title: videoInfo.title,
        author: videoInfo.author,
        duration: scriptWithTimestamps?.duration || 0,
        platform: '',
        likes,
        comments,
        shares,
        collects,
        views,
      },
      scriptWithTimestamps,
      scriptType: normalizedScriptType,
      coreEssence: reportData.coreEssence || getDefaultReportV2(videoInfo, interactionRates, scriptWithTimestamps).coreEssence,
      dataAttribution: reportData.dataAttribution || getDefaultReportV2(videoInfo, interactionRates, scriptWithTimestamps).dataAttribution,
      userPortrait: reportData.userPortrait || getDefaultReportV2(videoInfo, interactionRates, scriptWithTimestamps).userPortrait,
      contentStructure: reportData.contentStructure || getDefaultReportV2(videoInfo, interactionRates, scriptWithTimestamps).contentStructure,
      copyableMethodology: reportData.copyableMethodology || getDefaultReportV2(videoInfo, interactionRates, scriptWithTimestamps).copyableMethodology,
      riskWarning: reportData.riskWarning || getDefaultReportV2(videoInfo, interactionRates, scriptWithTimestamps).riskWarning,
      monetizationAnalysis: reportData.monetizationAnalysis || getDefaultReportV2(videoInfo, interactionRates, scriptWithTimestamps).monetizationAnalysis,
    };
    
    // 强制覆盖互动率
    if (analysisReport.dataAttribution?.industryBenchmark?.thisVideo) {
      analysisReport.dataAttribution.industryBenchmark.thisVideo = {
        likeRate: interactionRates.likeRate + '%',
        commentRate: interactionRates.commentRate + '%',
        shareRate: interactionRates.shareRate + '%',
        collectRate: interactionRates.collectRate + '%',
      };
    }
    
    return {
      analysisReport,
      scriptType: analysisReport.scriptType,
    };
  }

  // JSON 解析失败，但文案已提取成功，返回包含文案的默认报告
  console.log('API operation event');
  const defaultReport = getDefaultReportV2(videoInfo, interactionRates, scriptWithTimestamps);
  
  // 确保文案数据正确设置
  defaultReport.scriptWithTimestamps = scriptWithTimestamps;
  defaultReport.videoInfo.duration = scriptWithTimestamps?.duration || 0;
  
  return {
    analysisReport: defaultReport,
    scriptType: defaultReport.scriptType,
  };
}

/**
 * POST /api/video/deep-analysis
 * 视频深度分析接口
 */
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true,"video":true});
  if (securityResponse) return securityResponse;

  const startTime = Date.now();
  let userId: number | null = null;
  let inputUrl: string = '';
  let consumedForRefund = 0;
  
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

    userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '会话无效' }, { status: 401 });
    }

    const { allowed: userAllowed, reason } = checkAILimit(String(userId));
    if (!userAllowed) {
      return NextResponse.json({ error: reason || 'AI调用次数已达上限' }, { status: 429 });
    }

    // 检查算力（视频深度分析消耗较多）
    const powerCheck = await consumePower(userId, 'video_deep_analysis');
    consumedForRefund = powerCheck.consumed || 0;
    if (!powerCheck.success) {
      return NextResponse.json({
        error: powerCheck.error,
        code: powerCheck.code,
        required: powerCheck.required,
        remaining: powerCheck.remaining,
      }, { status: 403 });
    }

    const body = await request.json();
    const { url } = body;
    inputUrl = url || '';

    if (!url) {
      return NextResponse.json({ error: '请提供视频链接' }, { status: 400 });
    }

    // 检测平台
    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json({ error: '不支持该平台，请上传抖音、快手、小红书、B站或微博的视频链接' }, { status: 400 });
    }

    const customHeaders = safeForwardHeaders(request.headers);

    // 步骤1：解析视频获取元数据和下载链接
    console.log('API operation event');
    const parseResult = await parseShortVideo(url);
    
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json({
        error: parseResult.error || '视频解析失败',
      }, { status: 400 });
    }

    const videoInfo = parseResult.data;
    
    if (!videoInfo.videoUrl) {
      return NextResponse.json({
        error: '无法获取视频下载链接，请尝试其他视频',
      }, { status: 400 });
    }

    console.log('API operation event');

    // 步骤2：提取文案（必须成功才能进行分析）
    console.log('API operation event');
    
    // 增加重试机制（最多2次重试）
    let scriptResult;
    let retryCount = 0;
    const maxRetries = 2;
    
    do {
      if (retryCount > 0) {
        console.log('API operation event');
        // 等待1秒后重试，避免立即触发限流
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      scriptResult = await extractScript(videoInfo.videoUrl, customHeaders);
      retryCount++;
    } while (
      (!scriptResult.success || scriptResult.confidence < 0.7) && 
      retryCount <= maxRetries
    );
    
    // 文案提取失败时返回详细错误信息
    if (!scriptResult.success || scriptResult.confidence < 0.7) {
      console.error('API operation event');
      
      // 记录失败日志到 AI 质量监控
      logAICall({
        feature: 'video_deep_analysis',
        userId: userId ?? undefined,
        input: inputUrl,
        success: false,
        errorType: 'script_extraction_failed',
        errorMessage: scriptResult.error || '文案提取失败',
        durationMs: Date.now() - startTime,
      });
      
      // 返回详细的错误信息给用户
      return NextResponse.json({
        success: false,
        error: '文案提取失败，请稍后重试',
        errorType: 'script_extraction',
        details: {
          retryCount: retryCount - 1,
          error: scriptResult.error,
          confidence: scriptResult.confidence,
        },
      }, { status: 200 });
    }
    
    // 检测 Vision API 返回的错误格式
    // 错误格式示例: File: [assets/image.png]``URL: [https://code.coze.cn/api/sandbox/coze_coding/file/proxy?...]``Image: [...]
    const errorPatterns = [
      /^File:\s*\[/i,
      /^URL:\s*\[/i,
      /^Image:\s*\[/i,                      // 新增：检测 Image: [ 开头
      /File:\s*\[/i,                        // 任何位置出现 File: [
      /URL:\s*\[/i,                         // 任何位置出现 URL: [
      /Image:\s*\[/i,                       // 任何位置出现 Image: [
      /coze_coding\/file\/proxy/i,          // 包含 coze_coding/file/proxy
      /assets\/image/i,                      // 包含 assets/image
      /^```[\s\S]*(File|URL|Image):/i,      // Markdown代码块中的错误
    ];
    const isErrorFormat = errorPatterns.some(pattern => pattern.test(scriptResult.scriptContent));
    if (isErrorFormat) {
      console.error('API operation event');
      
      // 记录失败日志
      logAICall({
        feature: 'video_deep_analysis',
        userId: userId ?? undefined,
        input: inputUrl,
        success: false,
        errorType: 'vision_api_error',
        errorMessage: 'Vision API 返回错误格式',
        durationMs: Date.now() - startTime,
      });
      
      return NextResponse.json({
        success: false,
        error: '视频解析失败，API返回异常格式',
        errorType: 'vision_api',
      }, { status: 200 });
    }
    
    const scriptContent = cleanScriptContent(scriptResult.scriptContent);
    
    // 文案太短也无法有效分析
    if (scriptContent.length < 50) {
      console.error('API operation event');
      
      // 记录失败日志
      logAICall({
        feature: 'video_deep_analysis',
        userId: userId ?? undefined,
        input: inputUrl,
        success: false,
        errorType: 'script_too_short',
        errorMessage: `文案内容过短: ${scriptContent.length}字`,
        durationMs: Date.now() - startTime,
      });
      
      return NextResponse.json({
        success: false,
        error: '视频文案过短或无口播内容，无法进行分析',
        errorType: 'script_too_short',
        details: { length: scriptContent.length },
      }, { status: 200 });
    }
    
    console.log('API operation event');

    // 步骤3：生成分析报告（V2 纯文案分析）
    console.log('API operation event');
    
    let analysisResult;
    
    try {
      analysisResult = await analyzeScriptOnly(
        scriptContent, 
        videoInfo, 
        customHeaders,
        scriptResult.scriptWithTimestamps // 传入带时间戳的文案
      );
    } catch (analysisError: any) {
      console.error('API operation event');
      // 计算互动率用于默认报告
      const views = videoInfo.views || Math.round((videoInfo.likes || 0) / 0.06);
      const interactionRates = {
        collectRate: views > 0 ? (((videoInfo.collects || 0) / views) * 100).toFixed(2) : '0',
        shareRate: views > 0 ? (((videoInfo.shares || 0) / views) * 100).toFixed(2) : '0',
        commentRate: views > 0 ? (((videoInfo.comments || 0) / views) * 100).toFixed(2) : '0',
        likeRate: views > 0 ? (((videoInfo.likes || 0) / views) * 100).toFixed(2) : '0',
      };
      const defaultReport = getDefaultReportV2(videoInfo, interactionRates, scriptResult.scriptWithTimestamps);
      // 确保文案数据正确设置
      defaultReport.scriptWithTimestamps = scriptResult.scriptWithTimestamps;
      analysisResult = { 
        analysisReport: defaultReport,
        scriptType: defaultReport.scriptType,
      };
    }

    // 组装完整结果（V2）
    const result: VideoAnalysisResult = {
      _version: "2.0",
      title: videoInfo.title,
      author: videoInfo.author,
      authorId: videoInfo.authorId,
      authorAvatar: videoInfo.authorAvatar,
      likes: videoInfo.likes,
      comments: videoInfo.comments || 0,
      shares: videoInfo.shares || 0,
      collects: videoInfo.collects || 0,
      views: videoInfo.views || 0,
      cover: videoInfo.cover || '',
      platform: platform,
      platformName: PLATFORM_NAMES[platform] || platform,
      videoUrl: videoInfo.videoUrl,
      duration: scriptResult.scriptWithTimestamps?.duration,
      
      // 口播文案
      scriptContent: scriptContent,
      scriptWithTimestamps: scriptResult.scriptWithTimestamps,
      
      // 脚本类型识别
      scriptType: analysisResult.scriptType,
      
      // 深度分析报告（V2）
      analysisReport: analysisResult.analysisReport,
    };

    // 保存到历史记录（异步执行，不阻塞响应）
    try {
      await createVideoAnalysisHistory({
        userId: userId,
        videoUrl: url,
        videoTitle: videoInfo.title,
        videoCover: videoInfo.cover,
        platform: platform,
        platformName: PLATFORM_NAMES[platform] || platform,
        author: videoInfo.author,
        authorId: videoInfo.authorId,
        authorAvatar: videoInfo.authorAvatar,
        likes: videoInfo.likes,
        comments: videoInfo.comments || 0,
        shares: videoInfo.shares || 0,
        collects: videoInfo.collects || 0,
        views: videoInfo.views || 0,
        scriptContent: scriptContent,
        analysisReport: JSON.stringify(analysisResult.analysisReport),
        // 新结构不再有单一总分，不传totalScore字段
      });
      console.log('API operation event');
    } catch (historyError) {
      // 历史记录保存失败不影响主流程
      console.error('API operation event');
    }

    console.log('API operation event');

    // 记录成功的 AI 调用日志
    logAICall({
      feature: 'video_deep_analysis',
      userId: userId ?? undefined,
      input: inputUrl,
      output: `分析完成: ${videoInfo.title?.slice(0, 50) || '未知标题'}`,
      success: true,
      durationMs: Date.now() - startTime,
      model: 'deepseek-v3-2-251201',
    });

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('API operation event');
    const errorMessage = error instanceof Error ? 'Request failed' : 'Request failed';
    
    // 失败时返还算力
    if (userId) {
      await refundPower(userId, consumedForRefund, `视频分析失败: ${errorMessage.slice(0, 50)}`);
    }
    
    // 记录失败的 AI 调用日志
    logAICall({
      feature: 'video_deep_analysis',
      userId: userId ?? undefined,
      input: inputUrl,
      success: false,
      errorType: 'model_error',
      errorMessage: errorMessage,
      durationMs: Date.now() - startTime,
    });
    
    return NextResponse.json({
      error: `视频分析失败，如已扣费请联系管理员核对，自动退款尚未启用: ${errorMessage}`,
      message: errorMessage,
    }, { status: 500 });
  }
}
