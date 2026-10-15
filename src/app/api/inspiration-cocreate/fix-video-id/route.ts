import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 修复历史视频数据 - 补充 video_id
 * 
 * 此 API 用于批量修复历史数据，从抖音短链接中提取视频ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserInfo } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 从抖音短链接提取视频ID
 */
async function extractVideoIdFromUrl(url: string): Promise<string | null> {
  try {
    // 如果已经是视频详情页链接，直接提取
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    if (videoIdMatch) {
      return videoIdMatch[1];
    }

    // 跟踪重定向获取视频ID
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      const finalUrl = response.url;
      
      // 从最终URL中提取视频ID
      const match = finalUrl.match(/\/video\/(\d+)/);
      if (match) {
        return match[1];
      }
      
      // 尝试从 iesdouyin.com URL 中提取
      const iesMatch = finalUrl.match(/\/share\/video\/(\d+)/);
      if (iesMatch) {
        return iesMatch[1];
      }
      
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('API operation event');
    return null;
  }
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const sessionValid = await hasSession(token);
    if (!sessionValid) {
      return NextResponse.json({ error: '会话已过期' }, { status: 401 });
    }

    const userInfo = await getSessionUserInfo(token);
    if (userInfo?.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    const client = getSupabaseClient();
    
    // 获取所有 video_id 为空的视频
    const { data: videos, error } = await client
      .from('inspiration_videos')
      .select('id, video_url, platform, video_id')
      .is('video_id', null)
      .eq('platform', 'douyin');

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要修复的数据',
        fixed: 0,
      });
    }

    console.log('API operation event');

    let fixedCount = 0;
    const results: { id: number; videoId: string | null; status: string }[] = [];

    // 逐个处理（避免并发过多）
    for (const video of videos) {
      const videoId = await extractVideoIdFromUrl(video.video_url);
      
      if (videoId) {
        // 更新数据库
        const { error: updateError } = await client
          .from('inspiration_videos')
          .update({ video_id: videoId })
          .eq('id', video.id);

        if (!updateError) {
          fixedCount++;
          results.push({ id: video.id, videoId, status: 'success' });
          console.log('API operation event');
        } else {
          results.push({ id: video.id, videoId: null, status: 'update_failed' });
          console.error('API operation event');
        }
      } else {
        results.push({ id: video.id, videoId: null, status: 'extract_failed' });
        console.log('API operation event');
      }

      // 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      message: `修复完成，共修复 ${fixedCount}/${videos.length} 条记录`,
      total: videos.length,
      fixed: fixedCount,
      results,
    });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? 'Request failed' : '修复失败',
    }, { status: 500 });
  }
}
