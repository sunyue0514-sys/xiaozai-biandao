import { getMaterialById, getCustomerById } from '@/lib/db-store';
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { 
  createPerformance, 
  getPerformancesByUid,
  updatePerformance,
} from '@/lib/memory-system/db';
import { analyzeHitFactors } from '@/lib/memory-system/analyzer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/memory/performance
 * 获取用户的效果记录列表
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

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const isHit = searchParams.get('isHit');
    const limit = Number(searchParams.get('limit') || '20');
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });

    // 使用userId对应的uid来查询
    const performances = await getPerformancesByUid(String(userId), {
      platform: platform || undefined,
      isHit: isHit === 'true' ? true : isHit === 'false' ? false : undefined,
      limit,
    });

    return NextResponse.json({ success: true, data: performances });
  } catch (error) {
    console.error('获取效果记录失败:', error);
    return NextResponse.json(
      { error: '获取效果记录失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/memory/performance
 * 创建新的效果记录（用户填写发布数据）
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

    const body = await request.json();
    const { 
      materialId,
      customerId,
      title,
      topic,
      scriptType,
      contentPreview,
      platform,
      publishUrl,
      publishedAt,
      viewCount,
      likeCount,
      commentCount,
      shareCount,
      collectCount,
      finishRate,
      userRating,
      userTags,
      enableAnalysis = true,
    } = body;

    // 验证必填字段
    if (!materialId) {
      return NextResponse.json({ error: '请关联素材ID' }, { status: 400 });
    }
    if (!platform) {
      return NextResponse.json({ error: '请选择发布平台' }, { status: 400 });
    }
    if (viewCount === undefined || likeCount === undefined) {
      return NextResponse.json({ error: '请填写播放量和点赞数' }, { status: 400 });
    }

    // 创建效果记录
    if (!Number.isSafeInteger(materialId) || materialId <= 0 ||
        [viewCount, likeCount, commentCount, shareCount, collectCount].some(value => value !== undefined && (!Number.isSafeInteger(value) || value < 0)) ||
        (finishRate !== undefined && (!Number.isFinite(finishRate) || finishRate < 0 || finishRate > 100)) ||
        (userRating !== undefined && (!Number.isSafeInteger(userRating) || userRating < 1 || userRating > 5)) ||
        typeof platform !== 'string' || platform.length > 100 || typeof enableAnalysis !== 'boolean') {
      return NextResponse.json({ error: 'Invalid performance input' }, { status: 400 });
    }
    if (userTags !== undefined && (!Array.isArray(userTags) || userTags.length > 20 || userTags.some(value => typeof value !== 'string' || value.length > 100))) return NextResponse.json({ error: 'Invalid user tags' }, { status: 400 });
    const material = await getMaterialById(materialId);
    if (!material || material.isDeleted || material.uid !== String(userId)) return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    if (customerId !== undefined && customerId !== null && customerId !== 0) {
      if (!Number.isSafeInteger(customerId) || customerId <= 0) return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
      const customer = await getCustomerById(customerId);
      if (!customer || customer.uid !== String(userId)) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    if (publishedAt && !Number.isFinite(Date.parse(publishedAt))) return NextResponse.json({ error: 'Invalid publication date' }, { status: 400 });
    if (enableAnalysis) {
      const rate = checkRateLimit('memory-analysis:' + userId, RATE_LIMITS.ai);
      if (!rate.allowed) return createRateLimitResponse(rate.resetTime);
    }
    const performance = await createPerformance(String(userId), {
      materialId,
      customerId,
      title,
      topic,
      scriptType,
      contentPreview,
      platform,
      publishUrl,
      publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      viewCount,
      likeCount,
      commentCount: commentCount || 0,
      shareCount: shareCount || 0,
      collectCount: collectCount || 0,
      finishRate,
      userRating,
      userTags,
    });

    // 如果开启AI分析，异步执行
    if (enableAnalysis && performance.id) {
      // 异步执行AI分析，不阻塞响应
      analyzePerformanceAsync(performance.id, String(userId), performance).catch(console.error);
    }

    return NextResponse.json({ 
      success: true, 
      data: performance,
      message: '效果记录已保存，AI正在分析中...'
    });
  } catch (error) {
    console.error('创建效果记录失败:', error);
    return NextResponse.json(
      { error: '创建效果记录失败' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/memory/performance
 * 更新效果记录
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid performance ID' }, { status: 400 });
    for (const [field, getter] of [['materialId', getMaterialById], ['customerId', getCustomerById]] as const) {
      if (body[field] === undefined) continue;
      const relatedId = Number(body[field]);
      if (!Number.isSafeInteger(relatedId) || relatedId <= 0) return NextResponse.json({ error: 'Invalid related ID' }, { status: 400 });
      const related = await getter(relatedId);
      if (!related || related.uid !== String(userId)) return NextResponse.json({ error: 'Related record not found' }, { status: 404 });
      body[field] = relatedId;
    }
    for (const field of ['viewCount', 'likeCount', 'commentCount', 'shareCount', 'collectCount']) {
      if (body[field] !== undefined && (!Number.isSafeInteger(body[field]) || body[field] < 0)) return NextResponse.json({ error: 'Invalid count' }, { status: 400 });
    }
    if ((body.finishRate !== undefined && (!Number.isFinite(body.finishRate) || body.finishRate < 0 || body.finishRate > 100)) ||
        (body.userRating !== undefined && (!Number.isSafeInteger(body.userRating) || body.userRating < 1 || body.userRating > 5)) ||
        (body.publishedAt && !Number.isFinite(Date.parse(body.publishedAt)))) return NextResponse.json({ error: 'Invalid performance value' }, { status: 400 });
    // The storage helper spreads its input into SQL: send only mapped database
    // columns, avoiding both mass assignment and undeclared camelCase columns.
    if (body.userTags !== undefined && (!Array.isArray(body.userTags) || body.userTags.length > 20 || body.userTags.some((value: unknown) => typeof value !== 'string' || value.length > 100))) return NextResponse.json({ error: 'Invalid user tags' }, { status: 400 });
    const fields: Record<string, string> = { materialId: 'material_id', customerId: 'customer_id', platform: 'platform', publishUrl: 'publish_url', publishedAt: 'published_at', viewCount: 'view_count', likeCount: 'like_count', commentCount: 'comment_count', shareCount: 'share_count', collectCount: 'collect_count', finishRate: 'finish_rate', userRating: 'user_rating', userTags: 'user_tags' };
    const updates = Object.fromEntries(Object.entries(fields).filter(([field]) => body[field] !== undefined).map(([field, column]) => [column, body[field]]));

    if (!id) {
      return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();
    const performance = await updatePerformance(id, String(userId), updates);

    return NextResponse.json({ success: true, data: performance });
  } catch (error) {
   
    if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Performance record not found' }, { status: 404 });
    }
 console.error('更新效果记录失败:', error);
    return NextResponse.json(
      { error: '更新效果记录失败' },
      { status: 500 }
    );
  }
}

/**
 * 异步执行AI分析
 */
async function analyzePerformanceAsync(
  id: number,
  uid: string,
  performance: Awaited<ReturnType<typeof createPerformance>>
) {
  try {
    const analysis = await analyzeHitFactors(performance);
    
    // 更新分析结果
    
    // 直接更新分析字段
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const client = getSupabaseClient();
    
    await client
      .from('content_performance')
      .update({
        is_hit: analysis.isHit,
        hit_score: analysis.hitScore,
        hit_factors: analysis.hitFactors,
        ai_analysis: analysis.analysis,
      })
      .eq('id', id)
      .eq('uid', uid);
    
    console.log(`[Memory] 分析完成: ID=${id}, 爆款得分=${analysis.hitScore}`);
  } catch (error) {
    console.error('[Memory] AI分析失败:', error);
  }
}
