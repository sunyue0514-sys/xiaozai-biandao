import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { consumePower, refundPower } from '@/lib/power';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import {
  getConversationById,
  getMessagesByConversationId,
  createConversation,
  addUserMessage,
  addAssistantMessage,
  touchConversation,
  updateConversationTitle,
  ScriptlessResult,
  checkCreditsEnough,
  deductCredits,
  CREDIT_RULES,
} from '@/lib/scriptless-store';
import {
  LLMClient,
  Config,
  HeaderUtils,
} from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// JSON 修复函数：处理 LLM 输出中的常见格式问题
function repairJson(jsonStr: string): string {
  let repaired = jsonStr;
  
  // 1. 移除末尾多余的逗号（在 ] 或 } 前面）
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  
  // 2. 修复未转义的换行符（在字符串值内）
  // 注意：这是一个简化的处理，可能无法处理所有情况
  repaired = repaired.replace(/"([^"]*)\n([^"]*)":/g, '"$1 $2":');
  
  // 3. 修复中文引号
  repaired = repaired.replace(/[""]/g, '"');
  
  // 4. 移除控制字符
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, (char) => {
    if (char === '\n' || char === '\r' || char === '\t') return char;
    return '';
  });
  
  // 5. 确保字符串值中的引号被转义
  // 这个比较复杂，暂时跳过
  
  return repaired;
}

// 从文本中提取 JSON 对象
function extractJson(text: string): string | null {
  // 尝试找到完整的 JSON 对象
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return null;
}

// 安全解析 JSON，带重试机制
function safeParseJson(jsonStr: string): { success: boolean; data: any; error?: string } {
  // 第一次尝试：直接解析
  try {
    return { success: true, data: JSON.parse(jsonStr) };
  } catch (e1) {
    console.log('API operation event');
  }
  
  // 第二次尝试：修复后解析
  try {
    const repaired = repairJson(jsonStr);
    return { success: true, data: JSON.parse(repaired) };
  } catch (e2) {
    console.log('API operation event');
  }
  
  // 第三次尝试：尝试提取关键字段
  try {
    const extracted = extractKeyFields(jsonStr);
    if (extracted) {
      console.log('API operation event');
      return { success: true, data: extracted };
    }
  } catch (e3) {
    console.log('API operation event');
  }
  
  return { 
    success: false, 
    data: null, 
    error: 'JSON 解析失败，无法修复' 
  };
}

// 从 JSON 文本中提取关键字段
function extractKeyFields(text: string): ScriptlessResult | null {
  const result: ScriptlessResult = {
    positioning: '',
    opening: '',
    scriptStructure: '',
    qaSession: [],
    visualSuggestions: [],
    endingSpeech: '',
    goldenQuote: '',
  };
  
  // 提取 goldenQuote
  const goldenQuoteMatch = text.match(/"goldenQuote"\s*:\s*"([^"]*)"/);
  if (goldenQuoteMatch) {
    result.goldenQuote = goldenQuoteMatch[1];
  }
  
  // 提取 opening
  const openingMatch = text.match(/"opening"\s*:\s*"([^"]*)"/);
  if (openingMatch) {
    result.opening = openingMatch[1];
  }
  
  // 提取 positioning
  const positioningMatch = text.match(/"positioning"\s*:\s*"([^"]*)"/);
  if (positioningMatch) {
    result.positioning = positioningMatch[1];
  }
  
  // 提取 endingSpeech
  const endingMatch = text.match(/"endingSpeech"\s*:\s*"([^"]*)"/);
  if (endingMatch) {
    result.endingSpeech = endingMatch[1];
  }
  
  // 提取 qaSession 数组（逐个提取问题和回答方向）
  const questionMatches = text.matchAll(/"question"\s*:\s*"([^"]+)"/g);
  const answerDirectionMatches = text.matchAll(/"answerDirection"\s*:\s*"([^"]*)"/g);
  // 兼容旧的 answer 字段
  const answerMatches = text.matchAll(/"answer"\s*:\s*"([^"]*)"/g);
  
  const questions = Array.from(questionMatches, m => m[1]);
  const answerDirections = Array.from(answerDirectionMatches, m => m[1]);
  const answers = Array.from(answerMatches, m => m[1]);
  
  for (let i = 0; i < questions.length; i++) {
    result.qaSession.push({
      question: questions[i],
      answerDirection: answerDirections[i] || answers[i] || '',
    });
  }
  
  // 提取 visualSuggestions
  const visualMatches = text.matchAll(/"visualSuggestions"\s*:\s*\[([\s\S]*?)\]/g);
  for (const match of visualMatches) {
    const items = match[1].match(/"([^"]+)"/g);
    if (items) {
      result.visualSuggestions = items.map(s => s.replace(/"/g, ''));
    }
  }
  
  // 检查是否至少提取到一些有效内容
  if (result.goldenQuote || result.opening || result.qaSession.length > 0) {
    return result;
  }
  
  return null;
}

// 构建系统提示词
function buildSystemPrompt(customerInfo?: string): string {
  return `你是专业短视频编导，擅长无脚本拍摄的IP前采问题设计。

${customerInfo ? `客户信息：${customerInfo}` : ''}

## 你的任务
根据用户的拍摄需求，生成一份精简实用的《IP深度访谈问题清单》。

## 问题设计原则
1. **极度具象化**：问题必须结合具体数字、地点、产品名、场景
2. **带刺有挑战**：适度质疑、追问，激发真实情感反应
3. **情感挖掘**：追问艰难时刻、家人态度、后悔瞬间、创业故事
4. **本地化**：结合用户提到的具体地点、金额、店名等
5. **精简实用**：每个模块只设计1个最核心的问题

## 输出格式要求
直接输出纯JSON，不要有任何其他文字。字符串值在一行内完成。

## JSON结构
{"goldenQuote":"核心宣传语一句话","opening":"视频开头文案","positioning":"目标受众和核心价值","qaSession":[{"question":"Q1问题","answerDirection":"回答方向提示：引导对方说出什么内容、什么角度"},{"question":"Q2问题","answerDirection":"回答方向提示"}],"visualSuggestions":["拍摄建议1","拍摄建议2"],"endingSpeech":"结尾口播"}

## 五大模块说明（每个模块1个问题，共5题）
1. **基本盘**（Q1）：了解业务核心、投入、定位
2. **人设背景**（Q2）：挖掘创业故事、个人经历、情感
3. **差异化**（Q3）：对比竞品、突出优势、独特卖点
4. **人群需求**（Q4）：目标客户痛点、解决方案
5. **素材背书**（Q5）：案例、数据、可信度证明

## answerDirection 写法示例
- "引导店主说出具体投入金额，追问钱是怎么凑的"
- "让店主讲出创业初期的困难时刻，激发情感共鸣"
- "引导店主对比同行，突出自己的独特优势"`;
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;
  let chargedUserId: number | null = null;
  let consumedAmount = 0;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversationId, message, customerId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: '请输入消息内容' },
        { status: 400 }
      );
    }

    const config = new Config();
    const customHeaders = safeForwardHeaders(request.headers);

    // 获取或创建会话
    let convId = conversationId;
    let isNewConversation = false;

    if (!convId) {
      console.log('API operation event');
      const newConv = await createConversation(userId.toString());
      console.log('API operation event');
      if (!newConv) {
        console.error('API operation event');
        return NextResponse.json(
          { success: false, error: '系统繁忙，请稍后重试', code: 'CREATE_CONVERSATION_FAILED' },
          { status: 503 }
        );
      }
      convId = newConv.id;
      isNewConversation = true;
    } else {
      const conv = await getConversationById(convId, userId.toString());
      if (!conv) {
        return NextResponse.json(
          { success: false, error: '会话不存在' },
          { status: 404 }
        );
      }
    }

    // 检查并扣除算力
    const creditCost = isNewConversation 
      ? CREDIT_RULES.NEW_GENERATION 
      : CREDIT_RULES.CONTINUE_GENERATION;
    
    const reservation = await consumePower(userId, "scriptless", 0, creditCost);
    if (!reservation.success) return NextResponse.json({success:false,error:reservation.error,code:reservation.code},{status:403});
    chargedUserId = userId; consumedAmount = reservation.consumed || 0;
    

    // 获取历史消息
    const historyMessages = await getMessagesByConversationId(convId);

    // 获取客户信息
    let customerInfo = '';
    if (customerId) {
      try {
        const customerResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ''}/api/customer/${customerId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const customerData = await customerResponse.json();
        if (customerData.data) {
          customerInfo = `客户名称: ${customerData.data.name}`;
          if (customerData.data.ipPositioning) {
            try {
              const positioning = JSON.parse(customerData.data.ipPositioning);
              customerInfo += `\nIP定位: ${JSON.stringify(positioning)}`;
            } catch {
              // 忽略解析错误
            }
          }
        }
      } catch {
        // 忽略获取客户信息错误
      }
    }

    // 保存用户消息
    await addUserMessage(convId, message, customerId);

    // 更新会话标题
    if (isNewConversation) {
      const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
      await updateConversationTitle(convId, userId.toString(), title);
    }

    // 构建消息列表
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: buildSystemPrompt(customerInfo) }
    ];

    // 添加历史消息（最近6轮，减少context）
    const recentHistory = historyMessages.slice(-12);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        messages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant' && msg.result) {
        // 只传递关键信息，不传完整JSON
        messages.push({
          role: 'assistant',
          content: `已生成访谈问题清单，包含${msg.result.qaSession?.length || 0}个问题。`
        });
      }
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: message });

    // 调用LLM
    const llmClient = new LLMClient(config, customHeaders);

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';

          // 发送开始状态
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: 'start', conversationId: convId }) + '\n')
          );

          const llmStream = llmClient.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.8,
          });

          // 实时流式输出
          for await (const chunk of llmStream) {
            if (chunk.content) {
              const content = chunk.content.toString();
              fullContent += content;
              
              // 实时发送每个chunk
              controller.enqueue(
                encoder.encode(JSON.stringify({ 
                  type: 'chunk', 
                  content 
                }) + '\n')
              );
            }
          }

          // 使用安全的 JSON 解析（带自动修复）
          let result: ScriptlessResult | null = null;
          let responseContent = '';

          // 提取 JSON 部分
          const jsonStr = extractJson(fullContent);
          
          if (jsonStr) {
            const parseResult = safeParseJson(jsonStr);
            if (parseResult.success && parseResult.data) {
              result = parseResult.data;
              responseContent = '已为您生成完整的访谈问题清单';
              console.log('API operation event');
            } else {
              // 解析失败，将原始内容作为文本返回
              console.error('API operation event');
              responseContent = fullContent;
            }
          } else {
            responseContent = fullContent;
          }

          // 保存助手消息
          await addAssistantMessage(convId, responseContent, result || {
            positioning: '',
            opening: '',
            scriptStructure: '',
            qaSession: [],
            visualSuggestions: [],
            endingSpeech: '',
            goldenQuote: '',
          });

          // 更新会话时间
          await touchConversation(convId);

          // 扣除算力
          const deductResult = { success: true, remaining: reservation.remaining };

          // 发送完成结果
          controller.enqueue(
            encoder.encode(JSON.stringify({
              type: 'result',
              conversationId: convId,
              content: responseContent,
              result,
              creditsUsed: creditCost,
              remaining: deductResult.success ? deductResult.remaining : undefined,
            }) + '\n')
          );

          controller.close();
        } catch (error) {
          const amount = consumedAmount; consumedAmount = 0;
          if (chargedUserId && amount) await refundPower(chargedUserId, amount, 'Scriptless generation failed');
          console.error('API operation event');
          controller.enqueue(
            encoder.encode(JSON.stringify({
              type: 'error',
              message: '生成失败，请重试'
            }) + '\n')
          );
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
    const amount = consumedAmount; consumedAmount = 0;
    if (chargedUserId && amount) await refundPower(chargedUserId, amount, 'Scriptless generation failed');
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
