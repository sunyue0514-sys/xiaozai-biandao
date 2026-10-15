import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT, buildContentIPPositioningPrompt } from '@/lib/system-prompts';
import { searchKnowledge, buildKnowledgePrompt, getOpeningMethodologyPrompt } from '@/lib/knowledge-helper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 开篇提示词 - 基于薛辉爆款方法论
const OPENING_PROMPTS: Record<string, string> = {
  suspense: `你是一位短视频开篇创作专家。请根据选题创作一个悬念式开篇。

【悬念式开篇 - 薛辉方法论】

═══════════════════════════════════════════════════════════════
核心公式：制造信息差 + 激发好奇心
═══════════════════════════════════════════════════════════════

【黄金句式】
- "90%的人都不知道..."
- "结果完全出乎我的意料..."
- "真相是..."
- "我从业X年，第一次见到..."
- "别人不告诉你的..."

【创作要点】
1. 3秒内抛出悬念钩子
2. 不要直接给答案，让用户继续看
3. 用数字增加可信度："3个"、"5年"、"90%"
4. 语气要像跟朋友说悄悄话

【优秀示例】
- "装修这块儿，90%的人第一步就错了"
- "我跑了100家装修公司，发现一个秘密"
- "这个坑我花了3万才明白"

【输出规则】
- 不要Markdown符号、不要emoji
- 口语化，像跟朋友聊天
- 控制在30-50字
- 直接输出开篇内容`,

  pain: `你是一位短视频开篇创作专家。请根据选题创作一个痛点式开篇。

【痛点式开篇 - 薛辉方法论】

═══════════════════════════════════════════════════════════════
核心公式：精准人群 + 痛点尖叫 + 情感共鸣
═══════════════════════════════════════════════════════════════

【黄金句式】
- "你是不是也..."
- "这个问题困扰了我..."
- "每次...是不是都..."
- "说真的，我也踩过这个坑"
- "如果你也...一定要听我说"

【创作要点】
1. 圈定人群：让用户觉得"这说的就是我"
2. 点出痛点：具体、真实、有画面感
3. 情感共鸣：像朋友诉苦，不是卖货
4. 避免说教：用"我"的视角，不用"你"

【优秀示例】
- "装修过的人都知道，预算超支是常态"
- "我家装修完，才发现这5个坑"
- "说实话，我第一套房也踩了这些坑"

【输出规则】
- 不要Markdown符号、不要emoji
- 口语化，像跟朋友诉苦
- 控制在30-50字
- 直接输出开篇内容`,

  contrast: `你是一位短视频开篇创作专家。请根据选题创作一个反差式开篇。

【反差式开篇 - 薛辉方法论】

═══════════════════════════════════════════════════════════════
核心公式：颠覆认知 + 制造冲击
═══════════════════════════════════════════════════════════════

【黄金句式】
- "很多人以为...但真相是..."
- "别人花X年，我只用X天..."
- "原来...根本不需要..."
- "都说是...但其实..."
- "我以前也这么想，直到..."

【创作要点】
1. 先说大众认知，再反转
2. 反差要足够大，有冲击力
3. 用数据或对比强化反差
4. 让用户产生"原来如此"的感觉

【优秀示例】
- "很多人以为装修越贵越好，其实正好相反"
- "别人装修花半年，我只用了一个月"
- "都说是坑，我倒觉得是个机会"

【输出规则】
- 不要Markdown符号、不要emoji
- 口语化，有冲击力
- 控制在30-50字
- 直接输出开篇内容`,

  question: `你是一位短视频开篇创作专家。请根据选题创作一个提问式开篇。

【提问式开篇 - 薛辉方法论】

═══════════════════════════════════════════════════════════════
核心公式：精准问题 + 激发好奇 + 引发思考
═══════════════════════════════════════════════════════════════

【黄金句式】
- "你知道为什么...吗？"
- "到底是什么原因..."
- "有没有想过..."
- "为什么有些人...而你..."
- "想知道...吗？"

【创作要点】
1. 问题要击中用户真正关心的
2. 让用户产生"我也想知道答案"
3. 问题越具体，吸引力越强
4. 避免空泛问题，要有针对性

【优秀示例】
- "你知道装修最容易被坑的是什么吗？"
- "为什么同样的装修，别人比你省一半？"
- "想知道怎么让小房子住出大房子的感觉吗？"

【输出规则】
- 不要Markdown符号、不要emoji
- 口语化，像在问朋友
- 控制在30-50字
- 直接输出开篇内容`,

  story: `你是一位短视频开篇创作专家。请根据选题创作一个故事式开篇。

【故事式开篇 - 薛辉方法论】

═══════════════════════════════════════════════════════════════
核心公式：场景代入 + 细节画面 + 情感共鸣
═══════════════════════════════════════════════════════════════

【黄金句式】
- "那天我遇到了一个..."
- "有一次..."
- "记得刚入行的时候..."
- "我有个客户..."
- "前两天..."

【创作要点】
1. 用具体时间/地点开头，有画面感
2. 细节要真实，不要虚构
3. 情感要自然，不要煽情
4. 让用户快速进入情境

【优秀示例】
- "前两天有个客户来找我，说他家装修花了50万"
- "我记得刚做这行的时候，第一个客户..."
- "那天我去量房，看到业主的预算单..."

【输出规则】
- 不要Markdown符号、不要emoji
- 口语化，像讲故事给朋友听
- 控制在30-50字
- 直接输出开篇内容`,

  golden: `你是一位短视频开篇创作专家。请根据选题创作一个金句式开篇。

【金句式开篇 - 薛辉方法论】

═══════════════════════════════════════════════════════════════
核心公式：精炼观点 + 直击痛点 + 传播力强
═══════════════════════════════════════════════════════════════

【黄金句式】
- "XXX最XX的方式是什么？XX"
- "XXX这件事，XX才是关键"
- "别再XXX了，XXX才是正道"
- "XXX越XX，XXX越XX"

【创作要点】
1. 一句话说透一个道理
2. 观点要鲜明，不模棱两可
3. 要有传播价值，让人想转发
4. 简洁有力，20-40字最佳

【优秀示例】
- "装修最省钱的方式是什么？不踩坑"
- "房子越小，越要舍得花钱在收纳上"
- "别再纠结风格了，实用才是硬道理"

【输出规则】
- 不要Markdown符号、不要emoji
- 简洁有力，一句话到位
- 控制在20-40字
- 直接输出开篇内容`,
};

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

    // 检查算力（开场白生成预估100字，消耗约100算力）
    const powerCheck = await consumePower(userId, 'opening', 100);
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
    consumedPower = powerCheck.consumed || 100;

    const { topic, scriptType, style, requirements, customerId, customerName, ipPositioning } = await request.json();
    
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

    let systemPrompt = CONTENT_SAFETY_PROMPT + (OPENING_PROMPTS[style] || OPENING_PROMPTS.suspense);
    
    // 使用完整的IP定位提示词
    if (ipPositioning) {
      systemPrompt += buildContentIPPositioningPrompt(ipPositioning, customerName);
    }
    
    // 注意：OPENING_PROMPTS 已包含薛辉方法论，无需再调用 getOpeningMethodologyPrompt

    const scriptTypeMap: Record<string, string> = {
      story: '讲故事',
      process: '晒过程',
      knowledge: '教知识',
      opinion: '说观点',
      product: '说产品',
    };
    const scriptTypeLabel = scriptTypeMap[scriptType as string] || '讲故事';

    const userMessage = `请为以下选题创作开篇：

选题：${topic}
脚本类型：${scriptTypeLabel}
${requirements ? `补充要求：${requirements}` : ''}

请直接输出开篇内容。`;

    // 搜索知识库获取相关方法论内容
    const searchQuery = `${topic} ${style} 开篇创作`;
    const knowledgeResult = await searchKnowledge(searchQuery, request, 2, 0.5);
    if (knowledgeResult.success) {
      systemPrompt += buildKnowledgePrompt(knowledgeResult.context);
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.85,
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`));
          controller.close();
          
          // 失败时返还算力
          const errorMsg = error instanceof Error ? 'Request failed' : '生成失败';
          await refundPower(userIdRef.value, consumedPower, `开场白生成失败: ${errorMsg.slice(0, 50)}`);
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
    await refundPower(userIdRef.value, consumedPower, `开场白生成异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
