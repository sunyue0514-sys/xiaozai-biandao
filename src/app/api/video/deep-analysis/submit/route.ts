import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 视频分析任务提交 API
 * 创建任务记录，立即返回taskId，支持异步处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform } from '@/lib/video-parser';
import { hasSession, getSessionUserId } from '@/lib/session';
import { createVideoAnalysisTask } from '@/lib/db-store';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true,"video":true});
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

    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: '请提供视频链接' }, { status: 400 });
    }

    // 检测平台
    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json({ 
        error: '不支持该平台，请上传抖音、快手、小红书、B站或微博的视频链接' 
      }, { status: 400 });
    }

    // 创建任务记录（pending状态）
    const task = await createVideoAnalysisTask({
      userId,
      videoUrl: url,
      platform,
      status: 'pending',
      progress: 0,
      progressMessage: '任务已创建，等待处理',
    });

    console.log('API operation event');

    // 立即返回任务ID，不等待处理完成
    return NextResponse.json({
      success: true,
      taskId: task.id,
      message: '任务已提交，请轮询查询状态',
    });

  } catch (error) {
    console.error('API operation event');
    const errorMessage = error instanceof Error ? 'Request failed' : 'Request failed';
    return NextResponse.json({
      error: `任务提交失败: ${errorMessage}`,
    }, { status: 500 });
  }
}
