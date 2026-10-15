import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { getProductProfileById, updateProductProfile } from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProductPositioningRequest {
  productProfileId: number;
}

export async function POST(request: NextRequest) {
  let chargedUserId: number | null = null;
  let consumedAmount = 0;
  const refundOnce = async () => {
    if (chargedUserId !== null && consumedAmount > 0) {
      const amount = consumedAmount;
      consumedAmount = 0;
      await refundPower(chargedUserId, amount, 'Product positioning failed');
    }
  };
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

    // 检查算力（产品定位分析消耗500算力）
    const body: ProductPositioningRequest = await request.json();
    const { productProfileId } = body;

    if (!Number.isSafeInteger(productProfileId) || productProfileId <= 0) {
      return new Response(
        JSON.stringify({ error: '请选择产品档案' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取产品档案
    const profile = await getProductProfileById(productProfileId);
    if (!profile || profile.uid !== userId.toString()) {
      return new Response(
        JSON.stringify({ error: '产品档案不存在或无权访问' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rate = checkRateLimit('product-positioning:' + userId, RATE_LIMITS.ai);
    if (!rate.allowed) return createRateLimitResponse(rate.resetTime);
    const powerCheck = await consumePower(userId, 'positioning', 500);
    if (!powerCheck.success) {
      return new Response(
        JSON.stringify({
          error: powerCheck.error,
          code: powerCheck.code,
          required: powerCheck.required,
          remaining: powerCheck.remaining,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    consumedAmount = powerCheck.consumed || 0;
    chargedUserId = userId;

    const customHeaders = {};
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建分析提示词
    const systemPrompt = `你是一位资深的电商产品定位专家，擅长分析产品特点并给出精准的市场定位建议。

你需要从以下几个维度分析产品：
1. 市场定位：产品在市场中的独特位置
2. 目标人群画像：更细致的人群描述
3. 核心竞争力：区别于竞品的关键优势
4. 营销切入点：最有效的营销角度
5. 内容策略：适合的内容创作方向
6. 使用场景拓展：详细的使用场景描述

输出要求：
- 语言简洁有力，直击要点
- 给出具体可执行的建议
- 突出产品的差异化优势
- 禁止使用任何markdown符号（# * - 等）
- 禁止使用emoji表情
- 使用自然段落分隔，不用列表符号
- 直接输出纯文本内容`;

    const userMessage = `请分析以下产品并给出定位建议：

产品名称：${profile.name}
产品类目：${profile.category}
价格/优惠：${profile.price || '未填写'}
核心卖点：${profile.sellingPoints.join('、') || '未填写'}
目标人群：${profile.targetUsers || '未填写'}
用户痛点：${profile.userPainPoints || '未填写'}
使用场景：${profile.usageScenario || '未填写'}
优惠活动：${profile.promotion || '未填写'}
品牌故事：${profile.brandStory || '未填写'}
竞品分析：${profile.competitorAnalysis || '未填写'}

请给出详细的产品定位分析，注意不要使用任何markdown符号（# * - 等）。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    // 使用流式输出
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          // 保存分析结果到产品档案
          await updateProductProfile(productProfileId, {
            aiPositioning: fullContent,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Product positioning stream error:', error);
          await refundOnce();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '分析失败，如已扣费请联系管理员核对，自动退款尚未启用' })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Product positioning error:', error);
    await refundOnce();
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
