import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 灵感共创 - 重新处理视频接口
 * 用于重新提取文案（解决旧数据处理问题）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录' 
      }, { status: 401 });
    }

    const sessionValid = await hasSession(token);
    if (!sessionValid) {
      return NextResponse.json({ 
        success: false, 
        error: '会话已过期，请重新登录' 
      }, { status: 401 });
    }

    const userInfo = await getSessionUserInfo(token);
    if (!userInfo || userInfo.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: '仅管理员可以使用此功能' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json({ 
        success: false, 
        error: '请提供视频ID' 
      }, { status: 400 });
    }

    const client = getSupabaseClient();

    // 获取视频记录
    const { data: video, error: fetchError } = await client
      .from('inspiration_videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return NextResponse.json({ 
        success: false, 
        error: '视频不存在' 
      }, { status: 404 });
    }

    console.log('API operation event');

    // 更新状态为处理中
    await client
      .from('inspiration_videos')
      .update({
        processing_status: 'pending',
        processing_started_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('id', videoId);

    // 异步触发后台处理
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:5000`;
    const processUrl = `${domain}/api/inspiration-cocreate/process`;

    console.log('API operation event');

    // 不等待结果，异步调用
    fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        videoId: video.id,
        url: video.video_url,
        
        
         // 不传递 token
         // 空对象
      }),
    }).then(response => {
      console.log('API operation event');
    }).catch(error => {
      console.error('API operation event');
    });

    return NextResponse.json({
      success: true,
      message: '已开始重新处理，请稍后刷新查看结果',
      videoId: video.id,
    });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? 'Request failed' : '处理失败',
    }, { status: 500 });
  }
}
