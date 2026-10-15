import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { 
  getUserStyleProfile, 
  upsertUserStyleProfile,
  getPerformancesByUid,
} from '@/lib/memory-system/db';
import { learnUserStyle } from '@/lib/memory-system/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/memory/profile
 * 获取用户风格画像
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    const profile = await getUserStyleProfile(String(userId));

    return NextResponse.json({ 
      success: true, 
      data: profile,
      message: profile ? '已加载你的风格画像' : '还没有风格画像，快去创作吧！'
    });
  } catch (error) {
    console.error('获取风格画像失败:', error);
    return NextResponse.json(
      { error: '获取风格画像失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memory/profile/learn
 * 触发风格学习
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    // 获取所有效果记录
    const rate = checkRateLimit('memory-profile-learning:' + userId, RATE_LIMITS.ai);
    if (!rate.allowed) return createRateLimitResponse(rate.resetTime);
    const performances = await getPerformancesByUid(String(userId), { limit: 100 });
    
    if (performances.length < 3) {
      return NextResponse.json({ 
        success: false, 
        message: '内容太少啦，再创作几个视频后再来学习吧！',
        data: null
      });
    }

    // 分类爆款和普通内容
    const hits = performances.filter(p => p.isHit);
    const fails = performances.filter(p => !p.isHit);
    
    // 计算统计数据
    const stats = {
      totalContents: performances.length,
      totalHits: hits.length,
      hitRate: (hits.length / performances.length) * 100,
      avgViews: Math.round(performances.reduce((sum, p) => sum + p.viewCount, 0) / performances.length),
      avgLikes: Math.round(performances.reduce((sum, p) => sum + p.likeCount, 0) / performances.length),
    };

    // AI学习用户风格
    const learnedStyle = await learnUserStyle(String(userId), hits, fails, stats);

    // 更新风格画像
    const profile = await upsertUserStyleProfile(String(userId), {
      ...learnedStyle,
      totalContents: stats.totalContents,
      totalHits: stats.totalHits,
      hitRate: stats.hitRate,
      avgViews: stats.avgViews,
      avgLikes: stats.avgLikes,
      learningProgress: Math.min(stats.totalContents * 5, 100),
      lastLearnedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      data: profile,
      message: `风格学习完成！已分析${stats.totalContents}条内容，识别出${hits.length}个爆款经验`,
      stats,
    });
  } catch (error) {
    console.error('风格学习失败:', error);
    return NextResponse.json(
      { error: '风格学习失败，请稍后重试' },
      { status: 500 }
    );
  }
}
