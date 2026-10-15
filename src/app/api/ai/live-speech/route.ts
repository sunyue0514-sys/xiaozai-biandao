import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT } from '@/lib/system-prompts';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';
import {
  HOOK_TYPES,
  SPEECH_STEPS,
  INDUSTRY_TYPES,
  SCENARIO_TYPES,
  LiveSpeechInput,
  SingleSpeech,
  SpeechStepContent,
  LiveSpeechOutput,
  calculateDiscount,
} from '@/lib/live-speech-types';
import { logAICall } from '@/lib/ai-quality-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 钩子类型的详细提示词
const HOOK_PROMPTS = {
  price: {
    systemAddition: `你是直播带货专家，专门撰写价格钩话术。
价格钩的核心逻辑是：价格对比 → 性价比冲击
适用于优惠力度大的产品。

开场策略：
- 直接报出震撼价格
- 与原价/市场价形成强烈对比
- 用数字冲击用户心理

价值塑造策略：
- 把套餐内容拆开算账
- 逐项列出原价，加总后对比
- 强调"比自己去买还便宜"

场景代入策略：
- 强调用这个价格能享受的体验
- 对比其他消费场景的花费
- 让用户感觉"赚到"

稀缺促单策略：
- "这个价格仅限今天"
- "限量XX份"
- "错过今天恢复原价"`,
    
    example: `示例话术：
"原价89元，直播间只要59元！
这59元你能吃到什么？
锅底任选一个38元，
肥牛卷一份28元，
还有蔬菜拼盘、小吃、饮料...
算下来比自己去菜市场买还便宜！"`,
  },
  
  pain: {
    systemAddition: `你是直播带货专家，专门撰写痛点钩话术。
痛点钩的核心逻辑是：直击痛点 → 解决方案
适用于解决用户困扰的场景。

开场策略：
- 直击用户痛点
- 描述用户遇到的困扰
- 引发"我就是这样"的共鸣

价值塑造策略：
- 说明产品如何解决痛点
- 对比解决前后的差异
- 强调省心、省力、省钱

场景代入策略：
- 描绘痛点发生的具体场景
- 展示产品介入后的美好改变
- 让用户看到希望

稀缺促单策略：
- "今天下单立即解决问题"
- "限时优惠，别再忍受了"
- "这是改变的机会"`,
    
    example: `示例话术：
"下班后不想做饭？
外卖又贵又不健康？
这份火锅套餐，下班路上就能约，
到店直接吃，人均不到60，
比外卖还便宜，比自己做还省心！"`,
  },
  
  scenario: {
    systemAddition: `你是直播带货专家，专门撰写场景钩话术。
场景钩的核心逻辑是：场景描绘 → 代入感
适用于特定使用场景的产品。

开场策略：
- 描绘具体的生活场景
- 用五感（视觉、听觉、嗅觉、味觉、触觉）增强代入感
- 让用户想象自己就在场景中

价值塑造策略：
- 说明产品如何融入场景
- 强调体验感和仪式感
- 描绘美好的画面

场景代入策略：
- 详细描绘使用场景
- 用"你想象一下"引导
- 让用户身临其境

稀缺促单策略：
- "这个场景就差这一单了"
- "周末想这样度过，就要提前准备"
- "限量预约，别错过美好时光"`,
    
    example: `示例话术：
"周末宅家追剧，嘴巴总想吃点什么...
这份火锅套餐，在家就能煮，
边追剧边吃火锅，
再配上一杯冰可乐，
这才是周末该有的样子！"`,
  },
};

// 生成单套话术
async function generateSingleSpeech(
  client: LLMClient,
  hookType: 'price' | 'pain' | 'scenario',
  input: LiveSpeechInput,
  customHeaders: Record<string, string>
): Promise<SingleSpeech> {
  const hookInfo = HOOK_TYPES[hookType];
  const hookPrompt = HOOK_PROMPTS[hookType];
  
  // 构建场景描述
  let scenarioDesc = '';
  if (input.targetScenarios && input.targetScenarios.length > 0) {
    const scenarioNames = input.targetScenarios.map(s => SCENARIO_TYPES[s as keyof typeof SCENARIO_TYPES]?.name).filter(Boolean);
    if (scenarioNames.length > 0) {
      scenarioDesc = `适用场景：${scenarioNames.join('、')}`;
    }
  }
  
  // 构建套餐明细描述
  let packageDetail = input.packageContent;
  if (input.packageItems && input.packageItems.length > 0) {
    const items = input.packageItems.map(item => {
      if (item.originalPrice) {
        return `- ${item.name}：原价${item.originalPrice}元${item.description ? `（${item.description}）` : ''}`;
      }
      return `- ${item.name}${item.description ? `（${item.description}）` : ''}`;
    }).join('\n');
    packageDetail = `${input.packageContent}\n\n套餐明细：\n${items}`;
  }
  
  // 构建卖点描述
  let sellingPointsDesc = '';
  if (input.sellingPoints && input.sellingPoints.length > 0) {
    sellingPointsDesc = `\n\n核心卖点：\n${input.sellingPoints.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  }
  
  // 构建亮点描述
  let highlightsDesc = '';
  if (input.highlights && input.highlights.length > 0) {
    highlightsDesc = `\n\n特色亮点：\n${input.highlights.join('、')}`;
  }
  
  // 构建售后政策描述
  let afterSalesDesc = '';
  if (input.afterSalesPolicy) {
    afterSalesDesc = `\n\n售后政策：${input.afterSalesPolicy}`;
  }
  
  // 构建目标人群描述
  let audienceDesc = '';
  if (input.targetAudience) {
    audienceDesc = `\n\n目标人群：${input.targetAudience}`;
  }
  
  // 构建补充信息描述
  let additionalDesc = '';
  if (input.additionalInfo) {
    additionalDesc = `\n\n补充信息：${input.additionalInfo}`;
  }

  const systemPrompt = CONTENT_SAFETY_PROMPT + `
${hookPrompt.systemAddition}

【话术结构要求 - 五步法】
请按照以下五个步骤生成话术，每个步骤都要有明确的目的和技巧：

1. 开场留人（3秒内）：抓住注意力，抛出钩子
2. 价值塑造：拆解套餐，用数字强化性价比
3. 场景代入：描绘具体使用场景，引发共鸣
4. 稀缺促单：制造紧迫感，限时限量
5. 信任保障：售后政策，消除顾虑

【输出格式要求 - 非常重要】
你必须严格按照以下JSON格式输出，不要输出任何其他内容：

{
  "steps": [
    {
      "stepId": "opening",
      "stepName": "开场留人",
      "order": 1,
      "content": "话术内容（注意要有吸引力）",
      "tips": ["技巧提示1", "技巧提示2"]
    },
    {
      "stepId": "value",
      "stepName": "价值塑造",
      "order": 2,
      "content": "话术内容",
      "tips": ["技巧提示"]
    },
    {
      "stepId": "scenario",
      "stepName": "场景代入",
      "order": 3,
      "content": "话术内容",
      "tips": ["技巧提示"]
    },
    {
      "stepId": "scarcity",
      "stepName": "稀缺促单",
      "order": 4,
      "content": "话术内容",
      "tips": ["技巧提示"]
    },
    {
      "stepId": "trust",
      "stepName": "信任保障",
      "order": 5,
      "content": "话术内容",
      "tips": ["技巧提示"]
    }
  ],
  "analysis": {
    "hookType": "钩子类型说明（一句话解释这个钩子的核心逻辑）",
    "coreTechnique": "核心技巧说明",
    "copyableFormula": "可复制的话术公式"
  },
  "fullScript": "完整的连续话术（将五个步骤自然连接，可直接使用）"
}

直接输出JSON，不要有其他文字。`;

  const userMessage = `请为以下团购套餐生成"${hookInfo.name}"（${hookInfo.label}）类型的直播话术：

【商家信息】
商家名称：${input.merchantName}
行业类型：${INDUSTRY_TYPES[input.industry]?.name || input.industry}

【价格信息】
原价：${input.originalPrice}元
直播价：${input.livePrice}元
折扣：省${input.originalPrice - input.livePrice}元

【套餐内容】
${packageDetail}${sellingPointsDesc}${highlightsDesc}${afterSalesDesc}${scenarioDesc}${audienceDesc}${additionalDesc}

【钩子类型】
${hookInfo.name}（${hookInfo.label}）
核心逻辑：${hookInfo.description}

${hookPrompt.example}

请生成符合上述要求的话术，注意：
1. 话术要口语化、接地气，像真正的直播主说话
2. 每个步骤的内容要有吸引力，不要过于公式化
3. 完整话术要自然流畅，可以直接用于直播`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userMessage },
  ];

  try {
    let result = '';
    const stream = client.stream(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.8,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        result += chunk.content.toString();
      }
    }

    // 解析结果 - 使用更健壮的 JSON 提取方法
    let parsed: any = null;
    
    // 方法1：尝试直接解析整个结果
    try {
      // 先清理可能的 markdown 代码块标记
      let cleanResult = result.trim();
      if (cleanResult.startsWith('```json')) {
        cleanResult = cleanResult.slice(7);
      } else if (cleanResult.startsWith('```')) {
        cleanResult = cleanResult.slice(3);
      }
      if (cleanResult.endsWith('```')) {
        cleanResult = cleanResult.slice(0, -3);
      }
      cleanResult = cleanResult.trim();
      
      parsed = JSON.parse(cleanResult);
    } catch {
      // 方法2：找到第一个完整 JSON 对象
      const jsonStart = result.indexOf('{');
      if (jsonStart !== -1) {
        let depth = 0;
        let jsonEnd = -1;
        
        for (let i = jsonStart; i < result.length; i++) {
          if (result[i] === '{') depth++;
          else if (result[i] === '}') {
            depth--;
            if (depth === 0) {
              jsonEnd = i;
              break;
            }
          }
        }
        
        if (jsonEnd !== -1) {
          const jsonStr = result.substring(jsonStart, jsonEnd + 1);
          try {
            parsed = JSON.parse(jsonStr);
          } catch (parseError) {
            console.error('API operation event');
            console.error('API operation event');
          }
        }
      }
    }
    
    if (parsed) {
      return {
        hookType,
        hookName: hookInfo.name,
        hookLabel: hookInfo.label,
        hookDescription: hookInfo.description,
        steps: parsed.steps || [],
        analysis: parsed.analysis || {
          hookType: hookInfo.description,
          coreTechnique: '',
          copyableFormula: '',
        },
        fullScript: parsed.fullScript || '',
      };
    }
    
    throw new Error('JSON解析失败');
  } catch (error) {
    console.error('API operation event');
    
    // 返回空话术结构
    return {
      hookType,
      hookName: hookInfo.name,
      hookLabel: hookInfo.label,
      hookDescription: hookInfo.description,
      steps: Object.values(SPEECH_STEPS).map(step => ({
        stepId: step.id,
        stepName: step.name,
        order: step.order,
        content: '',
        tips: [],
      })),
      analysis: {
        hookType: hookInfo.description,
        coreTechnique: '',
        copyableFormula: '',
      },
      fullScript: '',
    };
  }
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  const startTime = Date.now();
  let userId: number | null = null;
  let inputSummary = '';
  // 用于失败时返还算力
  let consumedPower = 0;
  const userIdRef = { value: 0 };
  
  try {
    const ip = getClientIp(request);
    
    if (isIpBlacklisted(ip)) {
      return new Response(
        JSON.stringify({ error: '访问已被禁止' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { allowed: ipAllowed, resetTime } = checkRateLimit(`ai-ip:${ip}`, RATE_LIMITS.ai);
    if (!ipAllowed) {
      return new Response(
        JSON.stringify({ 
          error: 'AI调用过于频繁，请稍后再试',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
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

    userId = await getSessionUserId(token);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '会话无效' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { allowed: userAllowed, reason } = checkAILimit(String(userId));
    if (!userAllowed) {
      return new Response(
        JSON.stringify({ error: reason || 'AI调用次数已达上限' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力
    const powerCheck = await consumePower(userId, 'live_speech', 0);
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
    
    // 记录本次消耗的算力，用于失败时返还
    consumedPower = powerCheck.consumed || 300;
    userIdRef.value = userId || 0;

    const body = await request.json();
    const input: LiveSpeechInput = {
      merchantName: body.merchantName || '',
      industry: body.industry || 'catering',
      originalPrice: Number(body.originalPrice) || 0,
      livePrice: Number(body.livePrice) || 0,
      packageContent: body.packageContent || '',
      packageItems: body.packageItems || [],
      sellingPoints: body.sellingPoints || [],
      highlights: body.highlights || [],
      afterSalesPolicy: body.afterSalesPolicy || '',
      targetScenarios: body.targetScenarios || [],
      targetAudience: body.targetAudience || '',
      additionalInfo: body.additionalInfo || '',
    };
    
    inputSummary = input.merchantName?.slice(0, 30) || '未知商家';

    // 参数验证
    if (!input.merchantName) {
      return new Response(
        JSON.stringify({ error: '请输入商家名称' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!input.packageContent) {
      return new Response(
        JSON.stringify({ error: '请输入套餐内容' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);
    const model = 'deepseek-v3-2-251201';

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const speeches: SingleSpeech[] = [];
          const hookTypes: ('price' | 'pain' | 'scenario')[] = ['price', 'pain', 'scenario'];
          const stageMessages = {
            price: '正在生成爆款冲单版话术（价格钩）...',
            pain: '正在生成精准转化版话术（痛点钩）...',
            scenario: '正在生成情感共鸣版话术（场景钩）...',
          };

          // 1. 发送开始消息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress',
            stage: 'analyzing',
            message: '正在分析套餐信息...',
            progress: 5,
          })}\n\n`));

          // 2. 按钩子类型依次生成话术
          for (let i = 0; i < hookTypes.length; i++) {
            const hookType = hookTypes[i];
            const progress = 10 + (i * 30);
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'progress',
              stage: `generating_${hookType}` as const,
              message: stageMessages[hookType],
              progress,
            })}\n\n`));

            const speech = await generateSingleSpeech(client, hookType, input, customHeaders);
            speeches.push(speech);

            // 发送该钩子类型的话术结果
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'hook_speech',
              hookType,
              speech,
            })}\n\n`));
          }

          // 3. 计算价格信息
          const { discount, rate } = calculateDiscount(input.originalPrice, input.livePrice);
          
          // 计算套餐价值
          let estimatedValue = input.originalPrice;
          if (input.packageItems && input.packageItems.length > 0) {
            estimatedValue = input.packageItems.reduce((sum, item) => sum + (item.originalPrice || 0), input.originalPrice);
          }
          
          // 4. 发送完成消息
          const output: LiveSpeechOutput = {
            merchantName: input.merchantName,
            industry: input.industry,
            industryName: INDUSTRY_TYPES[input.industry as keyof typeof INDUSTRY_TYPES]?.name || input.industry,
            priceInfo: {
              originalPrice: input.originalPrice,
              livePrice: input.livePrice,
              discount,
              discountRate: rate,
            },
            packageValue: {
              totalItems: input.packageItems?.length || 1,
              estimatedValue,
              savings: estimatedValue - input.livePrice,
            },
            speeches,
            suggestions: {
              missingInfo: !input.sellingPoints?.length ? ['建议补充核心卖点，让话术更有针对性'] : [],
              versionSwitch: speeches[0]?.fullScript ? '推荐优先使用爆款冲单版（价格钩），适合首次推广' : '',
              industryTips: INDUSTRY_TYPES[input.industry as keyof typeof INDUSTRY_TYPES] 
                ? `${INDUSTRY_TYPES[input.industry as keyof typeof INDUSTRY_TYPES].name}类目建议：注重场景描绘和性价比展示` 
                : '',
            },
            generatedAt: new Date().toISOString(),
            version: '1.0',
          };

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress',
            stage: 'finalizing',
            message: '正在整理话术...',
            progress: 95,
          })}\n\n`));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done',
            output,
          })}\n\n`));
          
          controller.close();
          
          // 记录成功的 AI 调用日志
          logAICall({
            feature: 'live_speech',
            userId: userId ?? undefined,
            input: inputSummary,
            output: `生成${speeches.length}套话术`,
            success: true,
            durationMs: Date.now() - startTime,
            model: model,
          });
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error',
            error: '话术生成失败，请稍后重试' 
          })}\n\n`));
          controller.close();
          
          // 失败时返还算力
          const errorMsg = error instanceof Error ? 'Request failed' : '生成失败';
          await refundPower(userIdRef.value, consumedPower, `直播话术失败: ${errorMsg.slice(0, 50)}`);
          
          // 记录失败的 AI 调用日志
          logAICall({
            feature: 'live_speech',
            userId: userId ?? undefined,
            input: inputSummary,
            success: false,
            errorType: 'model_error',
            errorMessage: errorMsg,
            durationMs: Date.now() - startTime,
            model: model,
          });
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
    await refundPower(userIdRef.value, consumedPower, `直播话术异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    
    // 记录失败的 AI 调用日志
    logAICall({
      feature: 'live_speech',
      userId: userId ?? undefined,
      input: inputSummary,
      success: false,
      errorType: 'unknown_error',
      errorMessage: error instanceof Error ? 'Request failed' : '服务暂时不可用',
      durationMs: Date.now() - startTime,
    });
    
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
