import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';

// 获取视频列表（公开接口，无需登录）
export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const client = getSupabaseClient();

    // 尝试获取用户信息（可选）
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    let isAdmin = false;
    let userId: string | null = null;
    
    if (token) {
      const sessionValid = await hasSession(token);
      if (sessionValid) {
        const userInfo = await getSessionUserInfo(token);
        isAdmin = userInfo?.role === 'admin';
        const uid = await getSessionUserId(token);
        userId = uid ? String(uid) : null;
      }
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 构建查询 - 获取已审核通过的视频
    let query = client
      .from('inspiration_videos')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: videos, error } = await query;

    if (error) {
      console.error('API operation event');
      return NextResponse.json({
        success: false,
        error: '获取视频列表失败',
        videos: [],
      });
    }

    // 如果用户已登录，也获取用户自己上传的处理中的视频
    let userPendingVideos: any[] = [];
    if (userId) {
      const { data: pendingVideos } = await client
        .from('inspiration_videos')
        .select('*')
        .eq('uploaded_by', userId)
        .in('processing_status', ['pending', 'processing', 'failed'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      userPendingVideos = pendingVideos || [];
    }

    // 转换为前端需要的格式
    const formatVideo = (video: any) => {
      // 从标题中提取话题标签（#后面的内容）
      const hashtagMatches = video.title?.match(/#([^#\s]+)/g) || [];
      const hashtags = hashtagMatches.map((tag: string) => tag.replace('#', '')).slice(0, 5);
      
      // 清理标题中的话题标签
      const cleanTitle = video.title?.replace(/#[^#\s]+/g, '').trim() || video.title || '';
      
      // 构造视频链接：优先使用视频ID构造详情页链接，比短链接更稳定
      let videoUrl = video.video_url;
      if (video.video_id && video.platform === 'douyin') {
        videoUrl = `https://www.douyin.com/video/${video.video_id}`;
      }
      
      return {
        id: String(video.id),
        title: cleanTitle,
        hashtags,
        cover: video.cover || 'https://picsum.photos/seed/video/400/600',
        author: {
          name: video.author || '未知作者',
          avatar: video.author_avatar || 'https://picsum.photos/seed/avatar/100/100',
        },
        category: video.category || 'content',
        industry: video.industry || '',
        track: '知识科普/教育', // 默认赛道
        contentType: video.category === 'content' ? '干货/观点' : '创意展示',
        stats: {
          views: video.views || 0,
          likes: video.likes || 0,
          comments: video.comments || 0,
          shares: video.shares || 0,
          collects: video.collects || 0,
        },
        viralTags: [],
        createdAt: video.created_at || new Date().toISOString(),
        videoUrl: videoUrl,
        platform: video.platform,
        scriptContent: video.script_content || video.description || video.title || '',
        // 处理状态
        processingStatus: video.processing_status || 'completed',
        processingError: video.processing_error,
      };
    };

    const formattedVideos = (videos || []).map(formatVideo);
    const formattedPendingVideos = userPendingVideos.map(formatVideo);

    return NextResponse.json({
      success: true,
      videos: formattedVideos,
      pendingVideos: formattedPendingVideos, // 用户自己上传的处理中视频
      total: formattedVideos.length,
      isAdmin,
    });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({
      success: false,
      error: '服务器错误',
      videos: [],
    }, { status: 500 });
  }
}
