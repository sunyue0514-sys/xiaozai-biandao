import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 单条视频分析历史 API
 * GET: 获取单条历史记录详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getVideoAnalysisHistoryById } from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 计算 relativeMetrics
function calculateRelativeMetrics(likes: number, collects: number, shares: number, comments: number) {
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
}

/**
 * GET /api/video-analysis-history/[id]
 * 获取单条视频分析历史详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
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

    // 获取记录ID
    const { id } = await params;
    const historyId = parseInt(id);

    if (!historyId) {
      return NextResponse.json({ error: '无效的记录ID' }, { status: 400 });
    }

    // 获取记录详情
    const history = await getVideoAnalysisHistoryById(historyId, userId);

    if (!history) {
      return NextResponse.json({ error: '记录不存在或无权限查看' }, { status: 404 });
    }

    // 解析分析报告JSON
    let analysisReport = null;
    if (history.analysisReport) {
      try {
        analysisReport = JSON.parse(history.analysisReport);
      } catch {
        analysisReport = null;
      }
    }
    
    // 使用真实数据计算 relativeMetrics
    if (analysisReport && analysisReport.interactionAnalysis) {
      analysisReport.interactionAnalysis.relativeMetrics = calculateRelativeMetrics(
        history.likes,
        history.collects,
        history.shares,
        history.comments
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...history,
        analysisReport,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { error: '获取详情失败' },
      { status: 500 }
    );
  }
}
