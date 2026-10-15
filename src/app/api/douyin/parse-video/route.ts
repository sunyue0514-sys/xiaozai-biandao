import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 抖音视频链接解析服务
 * 
 * 优先使用 TikHub API（￥0.007/次）
 * 备用：apis.uctb.cn（￥1/次）
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseShortVideo, detectPlatform } from '@/lib/video-parser';

// ========== 类型定义 ==========
interface VideoData {
  videoId: string;
  title: string;
  description: string;
  coverUrl: string;
  videoUrl: string;
  author: {
    uid: string;
    name: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  views?: number;
  createdAt: string;
  platform: string;
}

// ========== API 路由 ==========

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true,"service":"video","video":true});
  if (securityResponse) return securityResponse;

  try {
    const body = await request.json();
    const url = body.url;

    if (!url) {
      return NextResponse.json({
        success: false,
        error: '请提供视频链接',
      }, { status: 400 });
    }

    // 使用统一的视频解析服务（TikHub 优先）
    const result = await parseShortVideo(url);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '解析失败，请稍后重试',
      }, { status: 400 });
    }

    // 转换为前端需要的格式
    const videoData: VideoData = {
      videoId: result.data!.videoId || '',
      title: result.data!.title || '',
      description: result.data!.title || '',
      coverUrl: result.data!.cover || '',
      videoUrl: result.data!.videoUrl || url,
      author: {
        uid: result.data!.authorId || '',
        name: result.data!.author || '',
        avatar: result.data!.authorAvatar || '',
      },
      likes: result.data!.likes || 0,
      comments: result.data!.comments || 0,
      shares: result.data!.shares || 0,
      collects: result.data!.collects || 0,
      views: result.data!.views || 0,
      createdAt: new Date().toISOString(),
      platform: result.data!.platform || detectPlatform(url) || 'unknown',
    };
    
    return NextResponse.json({
      success: true,
      data: videoData,
    });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({
      success: false,
      error: '解析失败，请稍后重试',
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  return NextResponse.json({
    name: '短视频链接解析API',
    providers: {
      primary: {
        name: 'TikHub',
        price: '￥0.007/次',
        env: 'TIKHUB_API_KEY',
      },
      backup: {
        name: 'apis.uctb.cn',
        price: '￥1/次',
        env: 'VIDEO_PARSE_API_TOKEN',
      },
    },
    platforms: ['抖音', '快手', '小红书', 'B站', '微博', '西瓜视频', '皮皮虾'],
    usage: {
      method: 'POST',
      endpoint: '/api/douyin/parse-video',
      body: {
        url: '视频链接（必填）',
      },
    },
  });
}
