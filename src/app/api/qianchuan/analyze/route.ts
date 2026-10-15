import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 千川智能分析 API
 * 基于产品信息，动态生成深度分析结果
 * 支持卖点拆解、用户画像、价值阶梯、痛点挖掘
 */

import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { 
  ANALYSIS_TOOLS, 
  buildAnalysisPrompt,
  EnhancedProductInfo,
} from '@/lib/qianchuan-methodology';
import { ProductCategory } from '@/lib/prohibited-words';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AnalysisType = 'selling_point' | 'user_portrait' | 'value_ladder' | 'pain_point';

interface AnalyzeRequest {
  analysisType: AnalysisType;
  productInfo: {
    productName: string;
    productCategory: ProductCategory;
    price?: string;
    sellingPoints: string[];
    targetUsers?: string;
    userPainPoints?: string;
    usageScenario?: string;
    promotion?: string;
  };
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    // 验证登录状态
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

    // 检查算力（分析消耗50算力）
    const powerCheck = await consumePower(userId, 'qianchuan_analyze', 50);
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

    const body: AnalyzeRequest = await request.json();
    const { analysisType, productInfo } = body;

    if (!productInfo?.productName) {
      return new Response(
        JSON.stringify({ error: '请填写产品名称' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取分析工具配置
    const tool = ANALYSIS_TOOLS.find(t => t.id === analysisType);
    if (!tool) {
      return new Response(
        JSON.stringify({ error: '无效的分析类型' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建分析提示词
    const enhancedProductInfo: EnhancedProductInfo = {
      productName: productInfo.productName,
      productCategory: productInfo.productCategory || 'other',
      price: productInfo.price || '',
      sellingPoints: productInfo.sellingPoints,
      targetUsers: productInfo.targetUsers || '',
      userPainPoints: productInfo.userPainPoints || '',
      usageScenario: productInfo.usageScenario || '',
      promotion: productInfo.promotion,
    };

    const analysisPrompt = buildAnalysisPrompt(analysisType, enhancedProductInfo);

    const messages = [
      { 
        role: 'system' as const, 
        content: `你是一位专业的短视频带货编导，擅长${tool.name}。请基于产品信息，进行深度分析。

【输出要求】
1. 分析结果必须具体、可操作
2. 每个结论都要有依据
3. 输出格式清晰，便于阅读
4. 结果可直接应用到素材创作中` 
      },
      { role: 'user' as const, content: analysisPrompt },
    ];

    // 使用流式输出
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            analysisType,
            toolName: tool.name,
          })}\n\n`));

          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          await refundPower(userId, consumedAmount, `千川分析失败: ${(error instanceof Error ? 'Request failed' : '未知').slice(0, 50)}`);
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
    console.error('API operation event');
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
