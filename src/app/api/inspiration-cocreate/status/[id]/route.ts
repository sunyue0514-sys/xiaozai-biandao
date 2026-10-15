import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 灵感共创 - 状态查询接口
 * 
 * 用于前端轮询查询视频处理状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasSession, getSessionUserId } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少视频ID' 
      }, { status: 400 });
    }
    
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
        error: '会话已过期' 
      }, { status: 401 });
    }
    
    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: '会话无效' 
      }, { status: 401 });
    }
    
    const client = getSupabaseClient();
    
    // 查询视频状态
    const { data: video, error } = await client
      .from('inspiration_videos')
      .select(`
        id,
        title,
        platform,
        category,
        industry,
        status,
        processing_status,
        processing_error,
        processing_started_at,
        processing_completed_at,
        likes,
        author,
        cover,
        script_content,
        created_at,
        uploaded_by
      `)
      .eq('id', id)
      .single();
    
    if (error || !video) {
      return NextResponse.json({ 
        success: false, 
        error: '视频不存在' 
      }, { status: 404 });
    }
    
    // 权限检查：只能查看自己上传的视频
    if (video.uploaded_by !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: '无权查看此视频' 
      }, { status: 403 });
    }
    
    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        platform: video.platform,
        category: video.category,
        industry: video.industry,
        likes: video.likes,
        author: video.author,
        cover: video.cover,
        scriptContent: video.script_content,
        createdAt: video.created_at,
        // 处理状态
        status: video.status,
        processingStatus: video.processing_status,
        processingError: video.processing_error,
        processingStartedAt: video.processing_started_at,
        processingCompletedAt: video.processing_completed_at,
      },
    });
    
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误' 
    }, { status: 500 });
  }
}
