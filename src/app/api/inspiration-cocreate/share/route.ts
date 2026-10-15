import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 分享上传 API
 * 
 * POST /api/inspiration-cocreate/share
 * 
 * 请求体：
 * {
 *   url: string,           // 视频链接
 *   category: 'content' | 'presentation',  // 内容型/展示型
 * }
 * 
 * 功能：
 * 1. 解析视频链接
 * 2. AI分析爆款标签
 * 3. 返回分析结果供用户确认
 */

import { NextRequest, NextResponse } from 'next/server';

interface ShareRequest {
  url: string;
  category: 'content' | 'presentation';
}

// 平台识别
function detectPlatform(url: string): string {
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) return 'douyin';
  if (url.includes('kuaishou.com')) return 'kuaishou';
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu';
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili';
  if (url.includes('weibo.com') || url.includes('weibo.cn')) return 'weibo';
  return 'unknown';
}

// 平台名称映射
const PLATFORM_NAMES: Record<string, string> = {
  'douyin': '抖音',
  'kuaishou': '快手',
  'xiaohongshu': '小红书',
  'bilibili': 'B站',
  'weibo': '微博',
  'unknown': '未知平台',
};

// AI分析爆款标签
function analyzeViralTags(videoData: {
  title: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
}): { tags: string[]; highlight: string } {
  const { title, description, likes, comments, shares, views } = videoData;
  
  const tags: string[] = [];
  
  // 互动率分析
  const engagementRate = ((likes + comments + shares) / views) * 100;
  if (engagementRate > 10) {
    tags.push('超高互动率');
  }
  
  // 评论/点赞比
  const commentRatio = (comments / likes) * 100;
  if (commentRatio > 10) {
    tags.push('引发争议');
    tags.push('高讨论度');
  }
  
  // 分享率
  const shareRatio = (shares / likes) * 100;
  if (shareRatio > 5) {
    tags.push('强传播性');
  }
  
  // 标题分析
  if (title.includes('？') || title.includes('?')) {
    tags.push('标题吸睛');
  }
  if (/\d+/.test(title)) {
    tags.push('数字吸引');
  }
  if (title.length < 30) {
    tags.push('标题简洁');
  }
  
  // 内容分析
  const fullText = title + description;
  if (fullText.includes('方法') || fullText.includes('技巧') || fullText.includes('教程')) {
    tags.push('干货密度大');
    tags.push('实用性强');
  }
  if (fullText.includes('避坑') || fullText.includes('不要') || fullText.includes('错误')) {
    tags.push('痛点精准');
  }
  if (fullText.includes('真实') || fullText.includes('经历') || fullText.includes('故事')) {
    tags.push('真情实感');
  }
  
  // 默认标签
  if (tags.length === 0) {
    tags.push('内容优质');
  }
  
  // 生成亮点
  const highlight = tags.length > 0 
    ? `${tags.slice(0, 2).join('、')}，值得借鉴`
    : '分析中...';
  
  return { tags: tags.slice(0, 5), highlight };
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"video":true});
  if (securityResponse) return securityResponse;

  try {
    const body = await request.json() as ShareRequest;
    const { url, category } = body;
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: '请输入视频链接' },
        { status: 400 }
      );
    }
    
    const platform = detectPlatform(url);
    
    // 模拟视频解析（实际应调用短视频解析API）
    // TODO: 调用 /api/douyin/parse-video 获取真实数据
    const mockVideoData = {
      videoId: `mock_${Date.now()}`,
      title: '【示例】如何在30天内实现收入翻倍',
      description: '分享3个实用的副业赚钱方法，普通人也能月入过万',
      coverUrl: 'https://picsum.photos/seed/share/400/600',
      author: {
        name: '示例创作者',
        avatar: 'https://picsum.photos/seed/avatar/100/100',
        followerCount: 128000,
      },
      likes: 125000,
      comments: 12800,
      shares: 8500,
      views: 890000,
      createdAt: new Date().toISOString(),
    };
    
    // 检查是否达到1000赞
    if (mockVideoData.likes < 1000) {
      return NextResponse.json({
        success: false,
        error: '视频需达到 1000 赞以上才会被收录',
        data: mockVideoData,
      });
    }
    
    // AI分析爆款标签
    const { tags, highlight } = analyzeViralTags(mockVideoData);
    
    // 返回分析结果
    return NextResponse.json({
      success: true,
      data: {
        ...mockVideoData,
        platform,
        platformName: PLATFORM_NAMES[platform],
        category,
        viralTags: tags,
        highlight,
        track: '知识付费', // AI识别赛道
        content_type: '干货分享', // AI识别内容类型
      },
      _message: '分析完成，确认上传后将收录到爆款库',
    });
    
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '解析失败，请检查链接是否正确' },
      { status: 500 }
    );
  }
}
