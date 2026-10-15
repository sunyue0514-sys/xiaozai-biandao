import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  // 用于失败时返还算力
  let consumedPower = 0;
  const userIdRef = { value: 0 };
  
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
    userIdRef.value = userId || 0;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '会话无效' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力（商业分析固定消耗500算力）
    const powerCheck = await consumePower(userId, 'businessAnalysis', 0);
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
    consumedPower = powerCheck.consumed || 500;

    const body = await request.json();
    const { customerId, customerName, customerDescription, formData } = body;

    if (!customerId || !customerName) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建AI分析提示词 - 自然、专业、无AI味
    const systemPrompt = `你是一位专业的短视频IP定位分析师，精通"薛辉方法论"和IP打造策略。

请根据客户提供的信息，生成一份全面的商业定位分析报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用括号说明或标注，如（推荐）、【重点】等
3. 使用自然的段落和空行分隔内容
4. 用数字序号或中文数字来组织内容
5. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
6. 避免使用"作为AI"、"我建议"、"首先"等机械化的开场白
7. 直接切入内容，给出专业、具体的分析结论

报告结构：

一、IP定位分析
根据客户的行业背景、专业能力和目标用户，设计适合的IP人设，并基于薛辉方法论的四大内容体系，推荐适合的内容类型：
- 讲故事：最能立人设、建立信任的内容
- 晒过程：秀手艺展实力，最利于成交的内容  
- 教知识：创作成本低，吸引精准粉丝的内容
- 说观点：引发共鸣认同、关注讨论的内容

二、目标用户画像
详细描述目标用户的年龄、性别、职业、收入等特征，分析用户的核心痛点和真实需求，给出如何在短视频平台精准触达目标用户的策略。

三、内容策略建议
基于爆款选题公式，推荐选题方向和内容呈现形式，建议内容发布频率和最佳发布时间。

四、变现路径规划
根据客户的变现目标，推荐最适合的变现方式，设计产品矩阵，规划从粉丝到客户的转化路径。

五、行动计划
给出短期、中期、长期的具体目标和执行建议。`;

    // 安全地获取表单数据
    const safeGet = (obj: Record<string, unknown> | undefined, key: string, defaultVal = '未填写'): string => {
      if (!obj) return defaultVal;
      const val = obj[key];
      if (val === null || val === undefined || val === '') return defaultVal;
      if (Array.isArray(val)) return val.length > 0 ? val.join('、') : defaultVal;
      return String(val);
    };

    const userPrompt = `客户名称：${customerName}
客户描述：${customerDescription || '暂无'}

详细情况：
联系人：${safeGet(formData, 'contactPerson')}
所在城市：${safeGet(formData, 'city')}
运营平台：${safeGet(formData, 'platforms')}
现有粉丝数：${safeGet(formData, 'currentAccounts')}

所属行业：${safeGet(formData, 'industry')}
从业年限：${safeGet(formData, 'yearsInBusiness')}
主要竞争对手：${safeGet(formData, 'competitors')}
行业优势：${safeGet(formData, 'industryAdvantages')}
行业挑战：${safeGet(formData, 'industryChallenges')}

目标用户年龄：${safeGet(formData, 'targetAgeRange')}
目标用户性别：${safeGet(formData, 'targetGender')}
目标用户职业：${safeGet(formData, 'targetOccupation')}
目标用户收入：${safeGet(formData, 'targetIncome')}
用户痛点：${safeGet(formData, 'targetPainPoints')}
用户需求：${safeGet(formData, 'targetNeeds')}

主要产品服务：${safeGet(formData, 'mainProducts')}
服务区域：${safeGet(formData, 'serviceAreas')}
价格区间：${safeGet(formData, 'priceRange')}
核心卖点：${safeGet(formData, 'uniqueValue')}

目标粉丝数：${safeGet(formData, 'targetFollowers')}
目标月收入：${safeGet(formData, 'targetRevenue')}
期望变现方式：${safeGet(formData, 'preferredMonetization')}
变现目标描述：${safeGet(formData, 'monetizationGoal')}

请生成商业定位分析报告：`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.8,
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
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '分析过程中出现错误，请重试' })}\n\n`));
          } catch {
            // Controller might already be closed
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
          
          // 失败时返还算力
          const errorMsg = error instanceof Error ? 'Request failed' : '生成失败';
          await refundPower(userIdRef.value, consumedPower, `商业分析失败: ${errorMsg.slice(0, 50)}`);
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
    await refundPower(userIdRef.value, consumedPower, `商业分析异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    return new Response(
      JSON.stringify({ error: '服务暂时不可用，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
