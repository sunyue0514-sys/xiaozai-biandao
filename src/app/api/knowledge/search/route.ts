import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { NextRequest } from 'next/server';
import { KnowledgeClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return new Response(
        JSON.stringify({ error: '未登录或登录已过期' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return new Response(
        JSON.stringify({ error: '会话无效' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { query, topK = 5 } = body;

    if (typeof query !== 'string' || !query.trim() || query.length > 2000 || !Number.isSafeInteger(topK) || topK < 1 || topK > 20) {
      return new Response(
        JSON.stringify({ error: '搜索关键词不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const datasets = (process.env.KNOWLEDGE_PUBLIC_DATASETS || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!datasets.length || datasets.some(value => !/^[a-zA-Z0-9_-]+$/.test(value))) {
      return new Response(JSON.stringify({ error: 'Public knowledge datasets are not configured', code: 'KNOWLEDGE_SCOPE_UNAVAILABLE' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    const rate = checkRateLimit('knowledge-search:' + userId, RATE_LIMITS.ai);
    if (!rate.allowed) return createRateLimitResponse(rate.resetTime);
    const customHeaders = {};
    const config = new Config();
    const knowledgeClient = new KnowledgeClient(config, customHeaders);

    // 搜索知识库
    const searchResult = await knowledgeClient.search(
      query,
      datasets,
      topK,
      0.5 // 最小相似度阈值
    );

    if (searchResult.code === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          results: searchResult.chunks || [],
          query
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: searchResult.msg || '搜索失败' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Knowledge search error:', error);
    return new Response(
      JSON.stringify({ error: '知识库搜索失败，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
