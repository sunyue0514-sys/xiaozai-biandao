import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT, buildContentIPPositioningPrompt, IPPositioning } from '@/lib/system-prompts';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 对话结果接口
interface DialogueResult {
  ipInfo: {
    industry?: string;
    persona?: string;
    coreAngle?: string;
    productService?: string;
    businessGoal?: string;
    targetAudience?: string;
  };
  opening: {
    question: string;
    answer: string;
  };
  rounds: Array<{
    round: number;
    goal: string;
    question: string;
    answer: string;
  }>;
  monologue: string;
}

// 构建对话轮次目标说明
function buildRoundGoalsPrompt(roundGoals: string[]): string {
  return roundGoals.map((goal, index) => 
    `第${index + 1}轮目标：${goal}`
  ).join('\n');
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  let userIdForRefund: number | null = null;
  let consumedForRefund = 0;
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

    // 检查算力
    const powerCheck = await consumePower(userId, 'script', 500);
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

    const { 
      topic,
      customerId,
      customerName,
      ipPositioning,
      roundCount = 3,
      roundGoals,
      otherInfo,
    } = await request.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: '请输入选题主题' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    // 增加超时时间到 120 秒
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    // 构建系统提示
    const systemPrompt = CONTENT_SAFETY_PROMPT + `你是一位专业的短视频对话流策划师。请为IP创作"对话流解析"内容。

【对话流设计原理】
对话流是一种通过编导提问+IP回答的形式，层层递进传递核心观点的内容形式。
适合展现IP的专业度、人设魅力，同时通过冲突设计吸引观众。

【对话轮次设计原则】
1. 开篇钩子：编导提问要有争议性/冲突性，IP回答要犀利直接（2-3句话）
2. 层层递进：从表面现象到深层原因，再到解决方案
3. 情绪曲线：好奇→认同→共鸣→行动
4. 金句植入：每轮回答至少包含1个可独立传播的金句

【对话风格要求】
1. 编导提问：简洁有力，有冲突性、争议性
2. IP回答：犀利直接，符合人设，有个性
3. 语言口语化：像真人在聊天，不做作
4. 避免说教：用案例和故事传递观点

【输出格式要求 - 非常重要】
请严格按照以下JSON格式输出，不要输出任何其他内容：
\`\`\`json
{
  "ipInfo": {
    "industry": "IP行业",
    "persona": "IP人设描述",
    "coreAngle": "核心切点",
    "productService": "产品/服务",
    "businessGoal": "商业目标",
    "targetAudience": "目标观众"
  },
  "opening": {
    "question": "编导提问（要有争议性/冲突性，能引发好奇）",
    "answer": "IP回答（犀利直接，2-3句话，制造钩子）"
  },
  "rounds": [
    {
      "round": 1,
      "goal": "该轮对话目标",
      "question": "编导提问",
      "answer": "IP回答（100-200字）"
    }
  ],
  "monologue": "整合独白文案（将所有对话整合为适合IP单独输出的完整文案，300-500字）"
}
\`\`\`

只输出JSON，不要有其他文字。`;

    // 构建用户消息
    let userMessage = `请为以下选题创作对话流解析：

【选题主题】${topic}
【对话轮次】${roundCount}轮
【每轮目标】
${buildRoundGoalsPrompt(roundGoals || [])}`;

    // 添加IP定位信息（使用统一的提示词构建函数）
    if (ipPositioning) {
      userMessage += buildContentIPPositioningPrompt(ipPositioning, customerName);
    }

    // 添加其他要求
    if (otherInfo) {
      userMessage += `\n\n【其他要求】${otherInfo}`;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    // 记录已扣除的算力，用于失败时退还
    const consumedPowerRef = { value: 0 };
    const userIdRef = { value: userId };
    userIdForRefund = userId;
    consumedForRefund = 0;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始进度
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            progress: 10, 
            step: '正在分析选题和IP定位...' 
          })}\n\n`));

          let result = '';
          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.85,
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            progress: 30, 
            step: '正在生成对话流...' 
          })}\n\n`));

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              result += text;
              consumedPowerRef.value += text.length;
              consumedForRefund = consumedPowerRef.value;
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            progress: 80, 
            step: '正在解析结果...' 
          })}\n\n`));

          // 解析JSON结果
          let parsedResult: DialogueResult;
          try {
            // 提取JSON
            const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) || result.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : result;
            parsedResult = JSON.parse(jsonStr);
            
            // 确保轮次正确
            if (parsedResult.rounds) {
              parsedResult.rounds = parsedResult.rounds.map((r, i) => ({
                ...r,
                round: i + 1,
              }));
            }
          } catch (e) {
            console.error('API operation event');
            // 如果解析失败，创建一个默认结构，从新的IPPositioning中提取信息
            const fallbackIpInfo = ipPositioning ? {
              industry: ipPositioning.positioningDirection?.nicheField || ipPositioning.basicInfo?.identity || '',
              persona: ipPositioning.basicInfo?.nickname || '',
              coreAngle: '',
              productService: (ipPositioning.productsServices?.products || ipPositioning.productsServices?.services || []).join('、'),
              businessGoal: '',
              targetAudience: ipPositioning.userPersona?.targetUsers || '',
            } : {};
            
            parsedResult = {
              ipInfo: fallbackIpInfo,
              opening: {
                question: '请输入问题',
                answer: result.substring(0, 200),
              },
              rounds: [{
                round: 1,
                goal: '对话内容',
                question: '',
                answer: result,
              }],
              monologue: result,
            };
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress', 
            progress: 100, 
            step: '生成完成' 
          })}\n\n`));

          // 验证并修复数据格式
          const sanitizeValue = (value: any, maxDepth: number = 3): string => {
            if (maxDepth <= 0) return '[数据过深]';
            if (value === null || value === undefined) return '';
            if (typeof value === 'string') return value;
            if (typeof value === 'number' || typeof value === 'boolean') return String(value);
            if (typeof value === 'object') {
              // 如果是数组，取第一个元素或转成字符串
              if (Array.isArray(value)) {
                if (value.length === 0) return '';
                if (typeof value[0] === 'string') return value[0];
                return sanitizeValue(value[0], maxDepth - 1);
              }
              // 如果对象包含对话流的关键字段，说明数据嵌套错误，尝试提取正确的值
              if (value.ipInfo || value.rounds || value.opening) {
                // 这是一个嵌套的对话流对象，不是有效的文本值
                // 尝试提取可能的文本字段
                if (value.answer && typeof value.answer === 'string') return value.answer;
                if (value.question && typeof value.question === 'string') return value.question;
                if (value.text) return sanitizeValue(value.text, maxDepth - 1);
                if (value.content) return sanitizeValue(value.content, maxDepth - 1);
                // 无法提取有效文本，返回错误提示
                return '[数据格式异常]';
              }
              // 尝试提取常见的文本字段
              if (value.text) return sanitizeValue(value.text, maxDepth - 1);
              if (value.content) return sanitizeValue(value.content, maxDepth - 1);
              if (value.value) return sanitizeValue(value.value, maxDepth - 1);
              if (value.name) return sanitizeValue(value.name, maxDepth - 1);
              // 对于普通对象，尝试找到第一个字符串类型的值
              for (const key of Object.keys(value)) {
                const v = value[key];
                if (typeof v === 'string' && v.length > 0 && v.length < 1000) {
                  return v;
                }
              }
              // 最后转成JSON字符串
              try {
                const jsonStr = JSON.stringify(value);
                // 如果JSON太长，截断
                if (jsonStr.length > 500) {
                  return jsonStr.substring(0, 500) + '...';
                }
                return jsonStr;
              } catch {
                return '[数据无法序列化]';
              }
            }
            return String(value || '');
          };

          // 深度修复对话流数据结构
          const fixDialogueData = (data: any): DialogueResult => {
            // 递归提取嵌套的对话流数据
            const extractDialogue = (obj: any, depth: number = 0): any => {
              if (depth > 5 || !obj || typeof obj !== 'object') return obj;
              
              // 如果这是一个对话流对象，提取它的核心字段
              if (obj.ipInfo || obj.rounds || obj.opening || obj.monologue) {
                return {
                  ipInfo: obj.ipInfo || {},
                  opening: obj.opening || { question: '', answer: '' },
                  rounds: obj.rounds || [],
                  monologue: obj.monologue || '',
                };
              }
              return obj;
            };

            // 检查并修复 opening 字段
            let fixedOpening = data.opening || { question: '', answer: '' };
            if (fixedOpening && typeof fixedOpening === 'object') {
              // 检查 opening 是否嵌套了对话流
              if (fixedOpening.ipInfo || fixedOpening.rounds) {
                // opening 错误地包含了整个对话流，尝试提取正确的值
                const nested = extractDialogue(fixedOpening);
                // 使用嵌套数据作为主数据
                if (nested.ipInfo) data.ipInfo = nested.ipInfo;
                if (nested.rounds) data.rounds = nested.rounds;
                if (nested.monologue) data.monologue = nested.monologue;
                // 重新设置 opening
                fixedOpening = nested.opening || { question: '', answer: '' };
              }
              // 检查 question 和 answer 是否嵌套了对话流
              if (fixedOpening.question && typeof fixedOpening.question === 'object') {
                const nested = extractDialogue(fixedOpening.question);
                if (nested.opening) {
                  fixedOpening = nested.opening;
                  if (nested.ipInfo) data.ipInfo = nested.ipInfo;
                  if (nested.rounds) data.rounds = nested.rounds;
                  if (nested.monologue) data.monologue = nested.monologue;
                } else {
                  fixedOpening.question = sanitizeValue(fixedOpening.question);
                }
              }
              if (fixedOpening.answer && typeof fixedOpening.answer === 'object') {
                const nested = extractDialogue(fixedOpening.answer);
                if (nested.opening) {
                  // answer 错误地包含了整个对话流
                  if (nested.ipInfo) data.ipInfo = nested.ipInfo;
                  if (nested.rounds) data.rounds = nested.rounds;
                  if (nested.monologue) data.monologue = nested.monologue;
                  // 使用嵌套的 opening 替换当前的
                  fixedOpening = nested.opening || fixedOpening;
                } else {
                  fixedOpening.answer = sanitizeValue(fixedOpening.answer);
                }
              }
            }

            // 修复 rounds 字段
            let fixedRounds = data.rounds || [];
            if (Array.isArray(fixedRounds)) {
              fixedRounds = fixedRounds.map((r, i) => {
                if (!r || typeof r !== 'object') {
                  return { round: i + 1, goal: '', question: '', answer: String(r || '') };
                }
                return {
                  round: i + 1,
                  goal: sanitizeValue(r.goal),
                  question: sanitizeValue(r.question),
                  answer: sanitizeValue(r.answer),
                };
              });
            }

            return {
              ipInfo: {
                industry: sanitizeValue(data.ipInfo?.industry),
                persona: sanitizeValue(data.ipInfo?.persona),
                coreAngle: sanitizeValue(data.ipInfo?.coreAngle),
                productService: sanitizeValue(data.ipInfo?.productService),
                businessGoal: sanitizeValue(data.ipInfo?.businessGoal),
                targetAudience: sanitizeValue(data.ipInfo?.targetAudience),
              },
              opening: {
                question: sanitizeValue(fixedOpening?.question),
                answer: sanitizeValue(fixedOpening?.answer),
              },
              rounds: fixedRounds,
              monologue: sanitizeValue(data.monologue),
            };
          };

          const sanitizedResult = fixDialogueData(parsedResult);

          // 发送最终结果
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'result', 
            result: sanitizedResult 
          })}\n\n`));
          
          controller.close();
        } catch (streamError) {
          console.error('API operation event');
          // 失败时返还算力
          const refundAmount = consumedPowerRef.value > 0 ? Math.max(consumedPowerRef.value, 100) : 500;
          await refundPower(userIdRef.value, refundAmount, `对话脚本生成失败: ${(streamError instanceof Error ? 'Request failed' : '流式错误').slice(0, 50)}`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error',
            error: '生成失败，如已扣费请联系管理员核对，自动退款尚未启用' 
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
    // 失败时返还算力
    if (userIdForRefund) {
      await refundPower(userIdForRefund, consumedForRefund || 500, `对话脚本生成异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    }
    return new Response(
      JSON.stringify({ error: '服务暂时不可用，如已扣费请联系管理员核对，自动退款尚未启用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
