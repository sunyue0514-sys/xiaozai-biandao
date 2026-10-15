import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT } from '@/lib/system-prompts';
import { buildIPConstraints } from '@/lib/prompt-engineering';
import { searchKnowledge, buildKnowledgePrompt } from '@/lib/knowledge-helper';
import { 
  getAllStrategies, 
  OpeningStrategy, 
  SCRIPT_TYPE_LABELS,
} from '@/lib/opening-strategies';
import { 
  analyzeOpeningCreation, 
} from '@/lib/opening-analysis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 单个开篇结果接口
export interface OpeningResult {
  id: number;
  strategy: OpeningStrategy;
  strategyName: string;
  suitableFor: string;  // 适合场景
  content: string;
  wordCount: number;
}

// 生成单个开篇
async function generateSingleOpening(
  client: LLMClient,
  strategyId: OpeningStrategy,
  strategyPrompt: string,
  topic: string,
  scriptTypeLabel: string,
  ipPositioningPrompt: string,
  knowledgePrompt: string,
  requirements?: string
): Promise<string> {
  const systemPrompt = CONTENT_SAFETY_PROMPT + strategyPrompt + ipPositioningPrompt + knowledgePrompt;

  const userMessage = `请为以下选题创作开篇：

选题：${topic}
脚本类型：${scriptTypeLabel}
${requirements ? `补充要求：${requirements}` : ''}

请直接输出开篇内容，不要有任何前缀说明。`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userMessage },
  ];

  let result = '';
  const stream = client.stream(messages, {
    model: 'deepseek-v3-2-251201',
    temperature: 0.85,
  });

  for await (const chunk of stream) {
    if (chunk.content) {
      result += chunk.content.toString();
    }
  }

  // 清理结果
  return result
    .replace(/```[\s\S]*?```/g, '')
    .replace(/【[^】]*】/g, '')
    .replace(/^[「『""]|[」』""]$/g, '')
    .replace(/\n/g, '')
    .trim();
}

// 创建开篇结果对象
function createOpeningResult(
  content: string,
  strategy: { id: OpeningStrategy; name: string; suitableFor: string },
  id: number
): OpeningResult {
  const wordCount = content.length;

  return {
    id,
    strategy: strategy.id,
    strategyName: strategy.name,
    suitableFor: strategy.suitableFor,
    content,
    wordCount,
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

    // 检查算力（批量生成预估6个开篇，每个50字，消耗约300算力）
    const powerCheck = await consumePower(userId, 'opening_batch', 300);
    if (!powerCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: powerCheck.error, 
          code: powerCheck.code,
          required: powerCheck.required,
          remaining: powerCheck.remaining
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 解析请求参数
    const { 
      topic, 
      scriptType, 
      customerId, 
      customerName, 
      ipPositioning, 
      requirements,
    } = await request.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: '请输入选题主题' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 初始化LLM客户端
    const customHeaders = safeForwardHeaders(request.headers);
    // 增加超时时间到 120 秒
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    // 生成创作分析
    const analysis = analyzeOpeningCreation(topic);

    // 构建IP定位提示词（使用增强版约束）
    let ipPositioningPrompt = '';
    if (ipPositioning) {
      ipPositioningPrompt = buildIPConstraints(ipPositioning, customerName, {
        mode: 'flexible',
        emphasis: ['identity', 'expertise', 'audience', 'tone']
      });
    }

    // 搜索知识库
    const searchQuery = `${topic} 开篇创作 短视频`;
    const knowledgeResult = await searchKnowledge(searchQuery, request, 2, 0.5);
    const knowledgePrompt = knowledgeResult.success ? buildKnowledgePrompt(knowledgeResult.context) : '';

    // 脚本类型标签
    const scriptTypeLabel = SCRIPT_TYPE_LABELS[scriptType as string] || '讲故事';

    // 获取所有策略
    const allStrategies = getAllStrategies();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 首先发送创作分析
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'analysis',
            analysis 
          })}\n\n`));

          // 依次生成每个开篇（不并行，避免并发问题）
          const openings: OpeningResult[] = [];
          
          for (let index = 0; index < allStrategies.length; index++) {
            const strategy = allStrategies[index];
            
            try {
              // 发送生成进度
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress',
                current: index + 1,
                total: allStrategies.length,
                strategy: strategy.name,
              })}\n\n`));

              const content = await generateSingleOpening(
                client,
                strategy.id,
                strategy.systemPrompt,
                topic,
                scriptTypeLabel,
                ipPositioningPrompt,
                knowledgePrompt,
                requirements
              );

              const openingResult = createOpeningResult(content, strategy, index + 1);

              openings.push(openingResult);

              // 发送单个开篇结果
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'opening',
                opening: openingResult,
              })}\n\n`));

            } catch (error) {
              console.error('API operation event');
              // 跳过失败的开篇
            }
          }

          // 检查是否有生成的开篇
          if (openings.length === 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error',
              error: '所有开篇生成失败，请检查网络或重试' 
            })}\n\n`));
            controller.close();
            return;
          }

          // 发送完成信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done',
            openings,
          })}\n\n`));

          controller.close();
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error',
            error: '生成失败' 
          })}\n\n`));
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
