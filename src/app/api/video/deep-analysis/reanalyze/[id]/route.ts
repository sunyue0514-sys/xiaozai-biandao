import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { consumePower, refundPower } from '@/lib/power';
/**
 * 重新分析 API
 * 
 * 使用已有的 scriptContent 重新调用 LLM 生成分析报告
 * 用于修复历史数据中"文案提取失败"的问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { 
  getVideoAnalysisHistoryById,
  updateVideoAnalysisTask,
  getUserById,
  updateUser,
} from '@/lib/db-store';
import { HeaderUtils, LLMClient, Config } from 'coze-coding-dev-sdk';
import { generateDeepAnalysisPromptV2, getDefaultReportV2 } from '@/prompts/deep-analysis-v2';
import { deepMergeWithDefaults } from '@/constants/analysis-defaults';
import { safeParseLLMJson } from '@/lib/json-repair';
import type { AnalysisReportV2 } from '@/types/analysis-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 重新分析消耗的算力
const REANALYZE_POWER_COST = 100;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":true,"body":false});
  if (securityResponse) return securityResponse;

  let consumedAmount = 0;
  let chargedUserId: number | null = null;
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
      return NextResponse.json({ error: '无法获取用户信息' }, { status: 401 });
    }

    const { id } = await params;
    const historyId = parseInt(id, 10);
    if (isNaN(historyId)) {
      return NextResponse.json({ error: '无效的任务ID' }, { status: 400 });
    }

    // 获取历史记录
    const history = await getVideoAnalysisHistoryById(historyId);
    if (!history) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    // 验证权限
    if (history.userId !== userId) {
      return NextResponse.json({ error: '无权操作此记录' }, { status: 403 });
    }

    // 检查是否有文案
    if (!history.scriptContent || history.scriptContent.length < 10) {
      return NextResponse.json({ error: '文案内容不足，无法重新分析' }, { status: 400 });
    }

    // 检查算力
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const charge = await consumePower(userId, "video_reanalyze", 0, REANALYZE_POWER_COST);
    if (!charge.success) return NextResponse.json({ error: charge.error, code: charge.code }, { status: 403 });
    chargedUserId = userId;
    consumedAmount = charge.consumed || 0;

    console.log('API operation event');

    // 更新状态
    await updateVideoAnalysisTask(historyId, {
      status: 'processing',
      progress: 50,
      progressMessage: '正在重新生成分析报告...',
    });

    // 从请求头中提取认证信息
    const customHeaders = safeForwardHeaders(request.headers);

    // 调用 LLM 重新分析
    const analysisReport = await regenerateAnalysis(
      history.scriptContent,
      {
        title: history.videoTitle || '',
        author: history.author || '',
        likes: history.likes || 0,
        comments: history.comments || 0,
        shares: history.shares || 0,
        collects: history.collects || 0,
        views: history.views || 0,
      },
      customHeaders
    );

    // 更新记录
    await updateVideoAnalysisTask(historyId, {
      status: 'completed',
      progress: 100,
      progressMessage: '重新分析完成',
      analysisReport: JSON.stringify(analysisReport),
    });

    console.log('API operation event');

    return NextResponse.json({
      success: true,
      message: '重新分析完成',
      analysisReport,
    });

  } catch (error: any) {
    if (chargedUserId && consumedAmount) await refundPower(chargedUserId, consumedAmount, "Video reanalysis failed");
    console.error('API operation event');
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    );
  }
}

// 重新生成分析报告
async function regenerateAnalysis(
  scriptContent: string,
  videoInfo: {
    title: string;
    author: string;
    likes: number;
    comments: number;
    shares: number;
    collects: number;
    views: number;
  },
  customHeaders: Record<string, string>
) {
  const config = new Config();
  const client = new LLMClient(config, customHeaders);

  const likes = videoInfo.likes || 0;
  const comments = videoInfo.comments || 0;
  const shares = videoInfo.shares || 0;
  const collects = videoInfo.collects || 0;
  let views = videoInfo.views || 0;
  let estimatedViews = false;

  // 预估播放量
  if (views === 0 && likes > 0) {
    views = Math.round(likes / 0.06);
    estimatedViews = true;
    console.log('API operation event');
  }

  // 计算互动率
  const collectRate = views > 0 ? ((collects / views) * 100).toFixed(2) : '0';
  const shareRate = views > 0 ? ((shares / views) * 100).toFixed(2) : '0';
  const commentRate = views > 0 ? ((comments / views) * 100).toFixed(2) : '0';
  const likeRate = views > 0 ? ((likes / views) * 100).toFixed(2) : '0';

  console.log('API operation event');

  // 使用 V2 prompt
  const systemPrompt = generateDeepAnalysisPromptV2({
    scriptContent,
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
    interactionRates: {
      collectRate,
      shareRate,
      commentRate,
      likeRate,
    },
  });

  console.log('API operation event');

  const stream = client.stream([
    { role: 'system', content: '你是一位专业的爆款短视频分析师。请严格按照用户要求的JSON格式输出分析报告。每个观点必须有原文证据支撑。' },
    { role: 'user', content: systemPrompt },
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
      // 超时保护（增加到120秒）
      if (Date.now() - startTime > 120000) {
        console.log('API operation event');
        break;
      }
    }
  } catch (streamError: any) {
    console.error('API operation event');
    throw streamError;
  }

  // 解析 JSON - 使用 safeParseLLMJson
  try {
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
    }>(result, '[重新分析]');
    
    if (parsed) {
      console.log('API operation event');

      // 添加 V2 版本标识
      (parsed as any)._version = "2.0";

      // 使用 V2 默认报告进行深度合并
      const defaultReportV2 = getDefaultReportV2(
        { likes, comments, shares, collects, views },
        { collectRate, shareRate, commentRate, likeRate }
      );
      const mergedResult = deepMergeWithDefaults(parsed as any, defaultReportV2);
      mergedResult._version = "2.0";

      // 更新互动率数据
      mergedResult.dataAttribution.industryBenchmark.thisVideo = {
        collectRate: `${collectRate}%`,
        shareRate: `${shareRate}%`,
        commentRate: `${commentRate}%`,
        likeRate: `${likeRate}%`,
      };
      mergedResult.dataAttribution.industryBenchmark.differenceAnalysis = 
        `收藏率${collectRate}%（行业15-20%），分享率${shareRate}%（行业8-12%），评论率${commentRate}%（行业5-10%）`;

      console.log('API operation event');
      return mergedResult;
    }
  } catch (e) {
    console.error('API operation event');
    console.log('API operation event');
  }

  // 解析失败，返回带真实数据的默认报告
  console.log('API operation event');
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
