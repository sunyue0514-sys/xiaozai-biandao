import { guardAIRequest, isVideoShareUrl, safeForwardHeaders } from '@/app/api/ai/_security';
import { getSupabaseClient } from '@/storage/database/supabase-client';
/**
 * 视频分析任务状态查询 API
 * 查询任务状态，如果是pending则执行任务
 * 
 * 阶梯扣费规则：
 * - ≤1分钟：500算力
 * - 1-3分钟：700算力
 * - 3-5分钟：900算力
 * 
 * 扣费流程：
 * 1. 任务开始时预扣最低算力（500）
 * 2. 任务完成后根据视频时长补扣差额
 * 3. 任务失败退还预扣算力
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { 
  getVideoAnalysisHistoryById, 
  updateVideoAnalysisTask,
  VideoAnalysisStatus,
  getUserById,
  updateUser,
} from '@/lib/db-store';
import { consumePower, refundPower } from '@/lib/power';
import { checkAILimit } from '@/lib/security';
import { parseShortVideo } from '@/lib/video-parser';
import { extractScript, cleanScriptContent } from '@/lib/script-extractor';
import { HeaderUtils, LLMClient, Config } from 'coze-coding-dev-sdk';
import { calculatePowerCost } from '@/lib/video-compressor';
import { 
  DEFAULT_ANALYSIS_REPORT, 
  deepMergeWithDefaults
} from '@/constants/analysis-defaults';
import { generateDeepAnalysisPromptV2, getDefaultReportV2 } from '@/prompts/deep-analysis-v2';
import { safeParseLLMJson } from '@/lib/json-repair';
import type { AnalysisReportV2 } from '@/types/analysis-report';

// 基础算力消耗（≤1分钟视频）
const BASE_POWER_COST = 500;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 平台名称映射
const PLATFORM_NAMES_LOCAL: Record<string, string> = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  weibo: '微博',
};

// 默认报告 - 使用公共常量
function getDefaultReport(videoInfo: any) {
  return DEFAULT_ANALYSIS_REPORT;
}

// 执行视频分析任务
async function executeAnalysisTask(
  taskId: number,
  videoUrl: string,
  platform: string,
  customHeaders: Record<string, string>,
  userId: number,
  prepaidAmount: number
) {
  console.log('API operation event');
  
  let powerCostDeducted = prepaidAmount; // 已扣除的算力
  
  try {
    // 步骤1: 解析视频
    await updateVideoAnalysisTask(taskId, {
      status: 'processing',
      progress: 10,
      progressMessage: '正在解析视频...',
    });

    const parseResult = await parseShortVideo(videoUrl);
    if (!parseResult.success || !parseResult.data?.videoUrl) {
      throw new Error(parseResult.error || '视频解析失败');
    }

    const videoInfo = parseResult.data;
    
    await updateVideoAnalysisTask(taskId, {
      progress: 20,
      progressMessage: '视频解析成功，正在提取文案...',
      videoTitle: videoInfo.title,
      videoCover: videoInfo.cover,
      author: videoInfo.author,
      authorId: videoInfo.authorId,
      authorAvatar: videoInfo.authorAvatar,
      likes: videoInfo.likes,
      comments: videoInfo.comments || 0,
      shares: videoInfo.shares || 0,
      collects: videoInfo.collects || 0,
      views: videoInfo.views || 0,
    });

    // 步骤2: 提取文案
    if (!videoInfo.videoUrl) {
      throw new Error('无法获取视频下载链接');
    }
    
    const scriptResult = await extractScript(videoInfo.videoUrl, customHeaders);
    
    // 记录文案提取结果
    console.log('API operation event');
    
    // 检测错误格式内容（Vision API 可能返回的错误格式）
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
    
    const isErrorResponse = (content: string): boolean => {
      if (!content) return false;
      return errorPatterns.some(pattern => pattern.test(content));
    };
    
    // 如果提取的文案是错误格式，视为失败
    let scriptContent: string;
    if (scriptResult.success && !isErrorResponse(scriptResult.scriptContent)) {
      scriptContent = cleanScriptContent(scriptResult.scriptContent);
      console.log('API operation event');
    } else {
      // 文案提取失败或返回错误格式，使用标题作为兜底
      scriptContent = videoInfo.title || '';
      console.log('API operation event');
      console.log('API operation event');
    }

    // 根据视频时长计算实际算力消耗
    const videoDuration = scriptResult.metadata?.duration || 0;
    const actualPowerCost = calculatePowerCost(videoDuration);
    
    console.log('API operation event');
    
    // 补扣算力差额
    if (actualPowerCost > BASE_POWER_COST) {
      const extraCost = actualPowerCost - BASE_POWER_COST;
      const extra = await consumePower(userId, "video_deep_analysis", 0, extraCost);
      if (!extra.success) throw new Error("Insufficient power for video duration");
      powerCostDeducted += extra.consumed || 0;
    }

    await updateVideoAnalysisTask(taskId, {
      progress: 50,
      progressMessage: '文案提取完成，正在生成分析报告...',
      scriptContent,
    });

    // 步骤3: 生成分析报告
    // 添加详细日志
    console.log('API operation event');
    
    // 即使文案置信度不高，也尝试调用 LLM 分析（基于标题+部分文案）
    // 只有在完全失败时才返回默认报告
    const analysisReport = await analyzeScriptOnly(scriptContent, videoInfo, customHeaders);

    // 步骤4: 完成
    await updateVideoAnalysisTask(taskId, {
      status: 'completed',
      progress: 100,
      progressMessage: '分析完成',
      analysisReport: JSON.stringify(analysisReport),
      totalScore: undefined, // 新结构不再有单一总分
    });

    console.log('API operation event');
    
  } catch (error: any) {
    console.error('API operation event');
    
    // 任务失败，退还预扣的算力
    await refundPower(userId, powerCostDeducted, "Video analysis failed");
    
    await updateVideoAnalysisTask(taskId, {
      status: 'failed',
      progress: 0,
      progressMessage: '分析失败',
      errorMessage: 'Request failed',
    });
  }
}

// 纯文案分析 - 七大模块本质归因分析 (V2版本)
async function analyzeScriptOnly(
  scriptContent: string,
  videoInfo: any,
  customHeaders: Record<string, string>
) {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  // 注意：错误格式检测已在 executeAnalysisTask 中完成
  // scriptContent 要么是正确的文案，要么是标题，不需要再次检测

  // 计算预估播放量和互动率
  const likes = videoInfo.likes || 0;
  const comments = videoInfo.comments || 0;
  const shares = videoInfo.shares || 0;
  const collects = videoInfo.collects || 0;
  let views = videoInfo.views || 0;
  
  // 如果播放量为0，基于点赞数预估（抖音点赞率约5-8%）
  let estimatedViews = false;
  if (views === 0 && likes > 0) {
    views = Math.round(likes / 0.06); // 使用6%的平均点赞率预估
    estimatedViews = true;
    console.log('API operation event');
  }
  
  // 计算互动率
  const collectRate = views > 0 ? ((collects / views) * 100).toFixed(2) : '0';
  const shareRate = views > 0 ? ((shares / views) * 100).toFixed(2) : '0';
  const commentRate = views > 0 ? ((comments / views) * 100).toFixed(2) : '0';
  const likeRate = views > 0 ? ((likes / views) * 100).toFixed(2) : '0';
  
  console.log('API operation event');

  // 使用V2版本的提示词
  const systemPrompt = generateDeepAnalysisPromptV2({
    scriptContent: scriptContent,
    videoInfo: {
      title: videoInfo.title || '未知标题',
      author: videoInfo.author || '未知作者',
      likes,
      comments,
      shares,
      collects,
      views,
      estimatedViews,
    },
    interactionRates: {
      collectRate,
      shareRate,
      commentRate,
      likeRate,
    },
  });

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    {
      role: 'user' as const,
      content: `请直接输出JSON格式的分析报告，不要使用\`\`\`json\`\`\`代码块包裹，不要有任何额外说明文字。确保输出的JSON是完整有效的。`,
    },
  ];

  console.log('API operation event');

  try {
    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.3,
    });

    let result = '';
    const startTime = Date.now();
    
    for await (const chunk of stream) {
      if (chunk.content) {
        result += chunk.content.toString();
      }
      // 超时保护（V2版本需要更长时间，增加到120秒）
      if (Date.now() - startTime > 120000) {
        console.log('API operation event');
        break;
      }
    }

    // 使用 safeParseLLMJson 解析 JSON
    const parsed = safeParseLLMJson<{
      scriptType?: { id: 'story' | 'process' | 'knowledge' | 'opinion'; name: string; confidence: number; reason: string };
      analysisReport?: Partial<AnalysisReportV2>;
      coreEssence?: AnalysisReportV2['coreEssence'];
      dataAttribution?: AnalysisReportV2['dataAttribution'];
      userPortrait?: AnalysisReportV2['userPortrait'];
      contentStructure?: AnalysisReportV2['contentStructure'];
      copyableMethodology?: AnalysisReportV2['copyableMethodology'];
      riskWarning?: AnalysisReportV2['riskWarning'];
      monetizationAnalysis?: AnalysisReportV2['monetizationAnalysis'];
    }>(result, '[文案分析V2]');
    
    if (parsed) {
      console.log('API operation event');
      
      // 添加V2版本标识
      (parsed as any)._version = "2.0";
      
      // 使用V2默认报告进行深度合并
      const defaultReportV2 = getDefaultReportV2(
        { likes, comments, shares, collects, views },
        { collectRate, shareRate, commentRate, likeRate }
      );
      const mergedResult = deepMergeWithDefaults(parsed as any, defaultReportV2);
      mergedResult._version = "2.0"; // 确保版本标识存在
      
      console.log('API operation event');
      return mergedResult;
    }
  } catch (e) {
    console.error('API operation event');
  }

  // 返回V2格式的默认报告
  const defaultReportV2 = getDefaultReportV2(
    { likes, comments, shares, collects, views },
    { collectRate, shareRate, commentRate, likeRate }
  );
  defaultReportV2._version = "2.0";
  defaultReportV2.dataAttribution.industryBenchmark.thisVideo = {
    collectRate: `${collectRate}%`,
    shareRate: `${shareRate}%`,
    commentRate: `${commentRate}%`,
    likeRate: `${likeRate}%`,
  };
  defaultReportV2.dataAttribution.industryBenchmark.differenceAnalysis = 
    `收藏率${collectRate}%（行业15-20%），分享率${shareRate}%（行业8-12%），评论率${commentRate}%（行业5-10%）`;
  
  return defaultReportV2;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    // 验证登录
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

    const { id } = await params;
    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: '无效的任务ID' }, { status: 400 });
    }

    // 查询任务
    const task = await getVideoAnalysisHistoryById(taskId, userId);
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 如果任务是pending，开始执行
    if (task.status === 'pending') {
      if (!isVideoShareUrl(task.videoUrl)) return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
      const paidResponse = await guardAIRequest(request, { paid: true, body: false});
      if (paidResponse) return paidResponse;
      const { data: claimed, error: claimError } = await getSupabaseClient().from('video_analysis_history')
        .update({ status: 'processing', progress: 5 }).eq('id', taskId).eq('user_id', userId)
        .eq('status', 'pending').select('id').single();
      if (claimError || !claimed) return NextResponse.json({ success: true, taskId, status: 'processing', progress: 5 });
      // 预扣最低算力（500），任务完成后根据视频时长补扣差额
      const powerCheck = await consumePower(userId, 'video_deep_analysis', 0, BASE_POWER_COST);
      if (!powerCheck.success) {
        await updateVideoAnalysisTask(taskId, {
          status: 'failed',
          errorMessage: powerCheck.error || '算力不足',
        });
        return NextResponse.json({
          success: false,
          taskId,
          status: 'failed',
          error: powerCheck.error,
        });
      }

      // 检查AI限制
      const { allowed, reason } = checkAILimit(String(userId));
      if (!allowed) {
        // 退还预扣的算力
        await refundPower(userId, powerCheck.consumed || 0, "Video analysis quota exceeded");
        
        await updateVideoAnalysisTask(taskId, {
          status: 'failed',
          errorMessage: reason || 'AI调用次数已达上限',
        });
        return NextResponse.json({
          success: false,
          taskId,
          status: 'failed',
          error: reason,
        });
      }

      // 异步执行任务（不等待），传入 userId 用于补扣算力
      const customHeaders = safeForwardHeaders(request.headers);
      void executeAnalysisTask(taskId, task.videoUrl, task.platform, customHeaders, userId, powerCheck.consumed || 0);

      // 立即返回processing状态
      return NextResponse.json({
        success: true,
        taskId,
        status: 'processing',
        progress: 5,
        progressMessage: '任务开始处理...',
      });
    }

    // 返回当前状态
    const response: any = {
      success: true,
      taskId,
      status: task.status,
      progress: task.progress,
      progressMessage: task.progressMessage,
    };

    // 如果完成，返回结果
    if (task.status === 'completed') {
      // 计算 relativeMetrics
      const calculateRelativeMetrics = (likes: number, collects: number, shares: number, comments: number) => {
        const safeLikes = likes || 1;
        const collectRatio = ((collects || 0) / safeLikes * 100).toFixed(1);
        const shareRatio = ((shares || 0) / safeLikes * 100).toFixed(1);
        const commentRatio = ((comments || 0) / safeLikes * 100).toFixed(1);
        
        const getEvaluation = (ratio: number) => {
          if (ratio >= 40) return '优秀';
          if (ratio >= 15) return '良好';
          return '一般';
        };
        
        const getExplanation = (type: string, ratio: number) => {
          if (type === 'collect') {
            if (ratio >= 40) return '收藏率极高，内容实用性非常强';
            if (ratio >= 15) return '收藏率良好，内容有价值';
            return '收藏率一般，建议增强内容实用性';
          }
          if (type === 'share') {
            if (ratio >= 15) return '分享率极高，传播价值强';
            if (ratio >= 5) return '分享率良好，有传播潜力';
            return '分享率一般，建议增强传播点';
          }
          if (type === 'comment') {
            if (ratio >= 15) return '评论率极高，互动性强';
            if (ratio >= 5) return '评论率良好，有讨论价值';
            return '评论率一般，建议增加互动引导';
          }
          return '';
        };
        
        return {
          collectLikeRatio: {
            value: `${collectRatio}%`,
            evaluation: getEvaluation(parseFloat(collectRatio)),
            explanation: getExplanation('collect', parseFloat(collectRatio)),
          },
          shareLikeRatio: {
            value: `${shareRatio}%`,
            evaluation: getEvaluation(parseFloat(shareRatio) * 2.67),
            explanation: getExplanation('share', parseFloat(shareRatio)),
          },
          commentLikeRatio: {
            value: `${commentRatio}%`,
            evaluation: getEvaluation(parseFloat(commentRatio) * 2.67),
            explanation: getExplanation('comment', parseFloat(commentRatio)),
          },
        };
      };

      const analysisReport = task.analysisReport ? JSON.parse(task.analysisReport) : {};
      
      // 确保 interactionAnalysis 存在，并使用真实数据计算 relativeMetrics
      const interactionAnalysis = analysisReport.interactionAnalysis || {};
      
      response.data = {
        title: task.videoTitle,
        author: task.author,
        authorId: task.authorId,
        authorAvatar: task.authorAvatar,
        likes: task.likes,
        comments: task.comments,
        shares: task.shares,
        collects: task.collects,
        views: task.views,
        cover: task.videoCover,
        platform: task.platform,
        platformName: PLATFORM_NAMES_LOCAL[task.platform] || task.platform,
        videoUrl: task.videoUrl,
        scriptContent: task.scriptContent,
        analysisReport: {
          ...analysisReport,
          interactionAnalysis: {
            ...interactionAnalysis,
            relativeMetrics: calculateRelativeMetrics(task.likes, task.collects, task.shares, task.comments),
          },
        },
      };
    }

    // 如果失败，返回错误信息
    if (task.status === 'failed') {
      response.error = task.errorMessage;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({
      error: '查询失败',
    }, { status: 500 });
  }
}
