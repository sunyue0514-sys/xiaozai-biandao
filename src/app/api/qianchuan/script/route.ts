import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import {
  buildQianchuanSystemPrompt,
  buildProductUserMessage,
  ProductInfo,
  QianchuanMaterialType,
  QianchuanCreativeMode,
  QIANCHUAN_CREATIVE_MODES,
} from '@/lib/ad-templates';
import { 
  checkProhibitedWords, 
  ProhibitedWordResult,
  detectBlackFiveProduct,
  BlackFiveType,
} from '@/lib/prohibited-words';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QianchuanScriptRequest {
  productInfo: ProductInfo;
  materialType: QianchuanMaterialType;
  additionalRequirements?: string;
  enableProhibitedCheck?: boolean;
  wordCount?: number; // 字数要求
  copywriting?: string; // 已有文案，用于生成脚本
  creativeMode?: QianchuanCreativeMode; // 创作模式
}

interface QianchuanScriptResponse {
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

    // 检查算力（千川脚本预估500字，消耗约500算力）
    const powerCheck = await consumePower(userId, 'qianchuan_script', 500);
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

    const body: QianchuanScriptRequest = await request.json();
    const { productInfo, materialType, additionalRequirements, enableProhibitedCheck = true, wordCount, copywriting, creativeMode } = body;

    if (!productInfo?.productName) {
      return new Response(
        JSON.stringify({ error: '请填写产品名称' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!productInfo.sellingPoints?.length) {
      return new Response(
        JSON.stringify({ error: '请至少填写一个核心卖点' }),
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

    // 构建系统提示词（默认500字），传递创作模式（已包含合规约束）
    const systemPrompt = buildQianchuanSystemPrompt(materialType, productInfo, 'script', wordCount, creativeMode);

    // 构建用户消息 - 如果有文案则基于文案生成脚本
    let userMessage: string;
    if (copywriting) {
      // 获取创作模式名称
      const creativeModeName = creativeMode ? QIANCHUAN_CREATIVE_MODES[creativeMode]?.name : null;
      userMessage = `请基于以下文案生成分镜头脚本，每个镜头需要包含：机位/景别、画面描述、字幕、台词/旁白、备注。

【原始文案】
${copywriting}

${additionalRequirements ? `【额外要求】\n${additionalRequirements}` : ''}
${creativeModeName ? `\n⚠️ 创作模式：${creativeModeName} - 请严格按照该模式的风格创作脚本` : ''}

重要提醒：
脚本必须包含【画面X】格式，每个画面要有镜头、画面描述、字幕、台词
不要重复内容，写一遍即可`;
    } else {
      userMessage = buildProductUserMessage(productInfo, 'script', additionalRequirements, creativeMode);
    }

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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`));
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
