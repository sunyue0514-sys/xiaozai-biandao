import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 视频分析历史 API
 * GET: 获取历史列表
 * DELETE: 删除历史记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import {
  getVideoAnalysisHistoryByUserId,
  deleteVideoAnalysisHistory,
  getVideoAnalysisHistoryCount,
} from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/video-analysis-history
 * 获取用户的视频分析历史列表
 */
export async function GET(request: NextRequest) {
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

    // 获取分页参数
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // 获取历史记录
    const history = await getVideoAnalysisHistoryByUserId(userId, limit);
    const total = await getVideoAnalysisHistoryCount(userId);

    return NextResponse.json({
      success: true,
      data: history,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { error: '获取历史记录失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/video-analysis-history?id=xxx
 * 删除视频分析历史记录
 */
export async function DELETE(request: NextRequest) {
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

    // 获取要删除的记录ID
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json({ error: '请提供记录ID' }, { status: 400 });
    }

    // 删除记录
    const success = await deleteVideoAnalysisHistory(id, userId);

    if (!success) {
      return NextResponse.json({ error: '删除失败，记录不存在或无权限' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    );
  }
}
