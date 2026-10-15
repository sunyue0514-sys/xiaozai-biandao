import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import {
  buildFeedAdSystemPrompt,
  buildFeedAdUserMessage,
  ProductInfo,
  FeedAdType,
  AdPlatform,
} from '@/lib/ad-templates';
import { 
  checkProhibitedWords, 
  ProhibitedWordResult,
  detectBlackFiveProduct,
  BlackFiveType,
} from '@/lib/prohibited-words';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FeedAdCopywritingRequest {
  productInfo: ProductInfo;
  adType: FeedAdType;
  platform?: AdPlatform;
  adObjective?: string;
  wordCount?: number;
  additionalRequirements?: string;
  enableProhibitedCheck?: boolean;
}

interface FeedAdCopywritingResponse {
  content: string;
  prohibitedWords?: ProhibitedWordResult[];
  hasProhibitedWords?: boolean;
  blackFiveWarning?: {
    isBlackFive: boolean;
    types: BlackFiveType[];
    warnings: string[];
    riskLevel: 'none' | 'high' | 'critical';
  };
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return new Response(
        JSON.stringify({ error: '未登录或登录已过期' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '会话无效' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力（信息流文案预估200字，消耗约200算力）
    const powerCheck = await consumePower(userId, 'feed_ad_copywriting', 200);
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
    const consumedAmount = powerCheck.consumed || 0;

    const body: FeedAdCopywritingRequest = await request.json();
    const { productInfo, adType, platform, adObjective, wordCount, additionalRequirements, enableProhibitedCheck = true } = body;

    if (!productInfo?.productName) {
      return new Response(
        JSON.stringify({ error: '请填写产品/服务名称' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!productInfo.sellingPoints?.length) {
      return new Response(
        JSON.stringify({ error: '请至少填写一个核心卖点/优势' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 确保 productCategory 有默认值
    if (!productInfo.productCategory) {
      productInfo.productCategory = 'other';
    }

    // 🔴 黑五类产品检测
    const blackFiveDetection = detectBlackFiveProduct(
      productInfo.productName,
      productInfo.sellingPoints,
      productInfo.productCategory
    );

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建系统提示词（默认500字）（已包含合规约束）
    const systemPrompt = buildFeedAdSystemPrompt(adType, productInfo, 'copywriting', platform, wordCount);

    // 构建用户消息
    const userMessage = buildFeedAdUserMessage(productInfo, adType, adObjective || '推广产品', 'copywriting', additionalRequirements);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    // 生成随机种子（通过在提示词中注入随机元素来增加多样性）
    const randomSeed = Math.floor(Math.random() * 1000000);
    
    // 使用流式输出
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';

        try {
          // 🔴 如果检测到黑五类产品，先发送警告信息
          if (blackFiveDetection.isBlackFive) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              blackFiveWarning: {
                isBlackFive: blackFiveDetection.isBlackFive,
                types: blackFiveDetection.types,
                warnings: blackFiveDetection.warnings,
                riskLevel: blackFiveDetection.riskLevel,
              }
            })}\n\n`));
          }

          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.8,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          // 违禁词检测 - 传入黑五类类型进行针对性检测
          let prohibitedWords: ProhibitedWordResult[] = [];
          if (enableProhibitedCheck && fullContent) {
            prohibitedWords = checkProhibitedWords(
              fullContent, 
              productInfo.productCategory,
              blackFiveDetection.types // 传入黑五类类型
            );
          }

          // done信号不包含content，避免前端重复追加
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            done: true,
            prohibitedWords: prohibitedWords.length > 0 ? prohibitedWords : undefined,
            hasProhibitedWords: prohibitedWords.length > 0,
          })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          await refundPower(userId, consumedAmount, `信息流文案失败: ${(error instanceof Error ? 'Request failed' : '未知').slice(0, 50)}`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败，如已扣费请联系管理员核对，自动退款尚未启用' })}\n\n`));
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
    console.error('API operation event');
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
