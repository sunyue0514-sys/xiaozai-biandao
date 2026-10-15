import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT } from '@/lib/system-prompts';
import { 
  getKnowledgeForScriptType,
  type ScriptType,
} from '@/lib/prompt-knowledge-map';
import { getClientIp, isIpBlacklisted, checkRateLimit, RATE_LIMITS, checkAILimit } from '@/lib/security';
import { logAICall } from '@/lib/ai-quality-logger';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 智能推导创作 API
 * 
 * 根据用户的6步推导结果（主题→内容类型→人群→风格→价值→框架），
 * 生成有血有肉的专属口播文案。
 */

// 风格到脚本类型的映射
const STYLE_TO_SCRIPT_TYPE: Record<string, ScriptType> = {
  '测评对比': 'knowledge',
  '真实体验': 'story',
  '轻松测评': 'story',
  '快速结论': 'knowledge',
  '干货教程': 'process',
  '经历分享': 'story',
  '轻松解决': 'process',
  '速战速决': 'knowledge',
  '场景共鸣': 'story',
  '情感触达': 'story',
  '知识科普': 'knowledge',
  '利他分享': 'knowledge',
  '轻松娱乐': 'story',
  '涨知识': 'knowledge',
  '情感治愈': 'story',
  '神转折': 'story',
};

// 内容类型到脚本类型的映射
const CONTENT_TYPE_TO_SCRIPT_TYPE: Record<string, ScriptType> = {
  '讲故事': 'story',
  '分享干货': 'knowledge',
  '聊观点': 'opinion',
  '种草产品': 'knowledge',  // 种草产品归类为知识型，因为需要介绍产品特点和使用体验
  '分享经历': 'story',
};

/**
 * 构建完整的提示词 - 确保生成的内容有血有肉
 */
function buildSystemPrompt(params: {
  style: string;
  scriptType: ScriptType;
  audience: string;
  value: string;
  framework: Array<{ name: string; time: string }>;
  ipPositioning?: string;
  customerName?: string;
  topic: string;
  contentType?: string;
}): string {
  const { style, scriptType, audience, value, framework, ipPositioning, customerName, topic, contentType } = params;
  
  // 如果有内容类型，优先使用内容类型对应的脚本类型
  const actualScriptType = contentType ? (CONTENT_TYPE_TO_SCRIPT_TYPE[contentType] || scriptType) : scriptType;
  
  // 获取脚本类型知识
  const scriptKnowledge = getKnowledgeForScriptType(actualScriptType);
  
  // 框架时长汇总
  const totalTime = framework.reduce((sum, f) => {
    const match = f.time.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 10);
  }, 0);
  
  // 是否有客户档案
  const hasCustomerProfile = ipPositioning && customerName;
  
  let prompt = `你是一位专业的短视频口播创作者。

`;

  // ========== 1. 角色设定 ==========
  if (hasCustomerProfile) {
    // 有客户档案 - 强制人设约束
    prompt += `【身份设定 - 必须严格遵守】
你是${customerName}，这是你的固定人设，不管讲述什么主题都要以这个身份来讲。

你的身份特点：
${ipPositioning}

【核心原则】
- 无论用户输入什么主题，你都要以${customerName}这个人的身份、视角、语气来讲述
- 你的专业背景、生活经验、说话风格都要符合这个人设
- 就像${customerName}真的在拍短视频，用自己的方式分享这个话题
- 分享的角度和侧重点要符合你的专业背景和人生经历

【语气风格】
- 像${customerName}这样真实的人在说话，不是AI在输出
- 有自己的观点和态度，不人云亦云
- 接地气，说真话，不端着

`;
  } else {
    // 无客户档案 - 普通创作者
    prompt += `【身份】
你是一位短视频口播创作者，用通俗易懂的语言分享实用内容。

【风格】
- 接地气，说人话
- 有自己的观点
- 分享真实有用的内容

`;
  }

  // ========== 2. 目标人群 ==========
  prompt += `【目标观众】
${audience}

他们最关心的问题是什么？
- ${getAudiencePainPoints(audience, topic)}
`;

  // ========== 3. 内容类型约束 ==========
  if (contentType) {
    const contentTypeGuide = getContentTypeGuide(contentType);
    prompt += `
【内容类型：${contentType}】
${contentTypeGuide}
`;
  }

  // ========== 4. 脚本结构 ==========
  prompt += `
【脚本结构：${scriptKnowledge.script.name}】
模型：${scriptKnowledge.script.model}

结构要点：
${scriptKnowledge.script.structure.map(s => `- ${s}`).join('\n')}

`;

  // ========== 5. 价值承诺 ==========
  prompt += `
【内容价值】
${value}

文案要让观众看完后："原来如此"、"学到了"、"马上去试试"
`;

  // ========== 6. 框架要求 ==========
  prompt += `
【时间分配】
`;
  framework.forEach((part, i) => {
    prompt += `- ${part.name}：${part.time}\n`;
  });
  prompt += `\n`;

  // ========== 7. 内容质量要求 ==========
  prompt += `
【⚠️ 重要：内容质量要求】

❌ 禁止出现的空洞表达：
- "我也是一头雾水"
- "后来慢慢摸索出经验"
- "希望对大家有帮助"
- "先说第一点、再来说第二点"
- "总之、因此、所以"等书面连接词
- 任何省略号"..."作为内容结尾
- "各位好，今天聊聊xxx这个话题"这种废话开头

✅ 必须包含的具体内容：
- 具体的场景：什么时候、什么地方、发生了什么
- 具体的数据：多少钱、多少天、多少比例
- 具体的细节：动作、表情、对话、感受
- 真实的案例：真实发生过的故事

✅ 开头钩子要求：
- 前3秒必须抓住观众
- 要有具体数字、具体场景、具体悬念
- 避免"大家好"这种废话开头

✅ 正文要求：
- 每个观点都要有具体案例支撑
- 案例要真实可信，能让人"对号入座"
- 语气要像在跟朋友聊天，不是做报告

✅ 结尾要求：
- 不要"有问题评论区见"这种套话
- 要有态度、有温度，引导互动要有创意

`;

  // ========== 8. 内容安全 ==========
  prompt += CONTENT_SAFETY_PROMPT;

  // ========== 9. 输出格式 ==========
  prompt += `

【输出格式 - 直接输出纯文本，不要任何格式符号】

第一部分：开场钩子（3-5秒）
[具体、吸引人的开场，让用户停下来]

第二部分：正文内容（${totalTime - 10}秒左右）
[结合框架要求，填充具体内容。有故事、有数据、有细节]

第三部分：互动结尾（5秒左右）
[有态度的收尾，引导互动有创意]

`;

  return prompt;
}

/**
 * 获取人群痛点
 */
function getAudiencePainPoints(audience: string, topic: string): string {
  const painPoints: Record<string, string> = {
    '正在对比产品的人群': `担心选错、花冤枉钱、售后没保障`,
    '遇到问题需要解决方案的人群': `不知道怎么做、怕踩坑、找不到靠谱答案`,
    '需求未被唤醒的人群': `不知道自己需要、觉得这事离自己很远`,
    '泛娱乐随便看看的人群': `无聊打发时间、想看点有趣的内容`,
  };
  
  const base = painPoints[audience] || '想学到有用的东西';
  
  // 结合主题细化
  if (topic.includes('装修')) {
    return `怕被坑、怕超预算、怕住进去后悔、不知道水电/防水/瓷砖怎么选`;
  }
  
  return base;
}

/**
 * 获取内容类型指导
 */
function getContentTypeGuide(contentType: string): string {
  const guides: Record<string, string> = {
    '讲故事': `这是"讲故事"类型的内容。

核心特征：有真实经历、有起承转合、有情感起伏
叙事结构：先设置悬念/冲突 → 描述过程 → 揭示结局/感悟
关键要素：
- 要有"我"的真实参与，不是旁观者叙述
- 有具体的时间、地点、人物、对话
- 有情绪变化：惊讶、后悔、欣喜、感动等
- 结局要升华到对观众的启发

开头方式：
- "你们知道吗，我之前..."
- "那天我..."
- "没想到..."

结尾方式：
- "这件事让我明白..."
- "现在想想..."`,
    '分享干货': `这是"分享干货"类型的内容。

核心特征：有方法、有步骤、有要点
结构特点：问题→解决方案→操作步骤→效果验证
关键要素：
- 逻辑清晰，步骤明确
- 每个步骤要有具体操作点
- 可以用"123"、"第一第二第三"
- 要解释"为什么这样做"让观众理解原理

开头方式：
- "今天教你..."
- "只要三步..."
- "很多人不知道..."`,
    '聊观点': `这是"聊观点"类型的内容。

核心特征：有立场、有态度、有论据
结构特点：抛出观点 → 论证支撑 → 案例说明 → 升华总结
关键要素：
- 观点要鲜明，不能两边都说
- 论据要有说服力，数据或真实案例
- 可以有一点点争议性，引发思考
- 态度要真诚，不装

开头方式：
- "我觉得..."
- "最近有个感受..."
- "你们有没有发现..."`,
    '种草产品': `这是"种草产品"类型的内容。

核心特征：真实体验、有代入感、有购买理由
结构特点：痛点场景 → 产品出现 → 体验过程 → 使用效果 → 推荐理由
关键要素：
- 从用户视角出发，不是卖家视角
- 描述真实使用场景和感受
- 要有"用了之后怎么样"的具体变化
- 推荐理由要具体，不要泛泛说"好用"

开头方式：
- "用了三个月..."
- "最近被朋友安利了..."
- "用了这个之后..."`,
    '分享经历': `这是"分享经历"类型的内容。

核心特征：生活化、有共鸣、有感悟
结构特点：场景描述 → 过程记录 → 感受表达 → 经验分享
关键要素：
- 贴近日常生活，观众能"对号入座"
- 有具体的细节和感受
- 结尾要有感悟或启发
- 语气轻松自然，像跟朋友聊天

开头方式：
- "昨天..."
- "最近在..."
- "今天去..."`,
  };
  
  return guides[contentType] || '按正常口播文案创作';
}

/**
 * 获取内容类型简要说明
 */
function getContentTypeBrief(contentType: string): string {
  const briefs: Record<string, string> = {
    '讲故事': '有真实经历、有起承转合、有情感起伏',
    '分享干货': '有方法、有步骤、有要点',
    '聊观点': '有立场、有态度、有论据',
    '种草产品': '真实体验、有代入感、有购买理由',
    '分享经历': '生活化、有共鸣、有感悟',
  };
  return briefs[contentType] || '';
}

/**
 * 构建用户消息
 */
function buildUserMessage(params: {
  topic: string;
  style: string;
  audience: string;
  value: string;
  framework: Array<{ name: string; time: string }>;
  customerName?: string;
  contentType?: string;
}): string {
  const { topic, style, audience, value, framework, customerName, contentType } = params;
  
  const totalTime = framework.reduce((sum, f) => {
    const match = f.time.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 10);
  }, 0);

  let message = `请为"${topic}"这个主题创作口播文案。

【我是谁】
${customerName || '该创作者'}`;

  // 如果有内容类型，添加内容类型说明
  if (contentType) {
    message += `\n\n【内容类型】
${contentType}——${getContentTypeBrief(contentType)}`;
  }

  message += `

【用什么风格讲】
${style}

【讲给谁听】
${audience}

【让他们收获什么】
${value}

【按这个框架讲】
${framework.map((f, i) => `${i + 1}. ${f.name}（${f.time}）`).join('\n')}
总时长：约${totalTime}秒

【重要提醒】
- 必须结合"${topic}"这个具体主题，不能泛泛而谈
- 要有真实细节、真实数据、真实场景
- 让人听完觉得"说的就是我"、"原来要这样"
- 语言口语化，像在跟朋友聊天

【输出格式】
- 每个段落只写纯内容，不要写段落名称或标题
- 段落之间用空行分隔
- UI上会显示每个段落的标题（如"开场钩子"、"经历讲述"），所以内容只写正文即可`;
  
  return message;
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  let consumedPower = 0;
  const userIdRef = { value: 0 };

  try {
    const ip = getClientIp(request);

    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return new Response(
        JSON.stringify({ error: '访问已被禁止' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 速率限制
    const { allowed: ipAllowed, resetTime } = checkRateLimit(`creative:${ip}`, RATE_LIMITS.script);
    if (!ipAllowed) {
      return new Response(
        JSON.stringify({ 
          error: '生成过于频繁，请稍后再试',
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

    const userId = await getSessionUserId(token);
    userIdRef.value = userId || 0;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '会话无效' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // AI调用限制
    const { allowed: userAllowed, reason } = checkAILimit(String(userId));
    if (!userAllowed) {
      return new Response(
        JSON.stringify({ error: reason || 'AI调用次数已达上限' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力
    const powerCheck = await consumePower(userId, 'creative', 400);
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
    consumedPower = powerCheck.consumed || 400;

    const { 
      topic,
      style,
      audience,
      value,
      framework,
      ipPositioning,
      customerName,
      contentType,
    } = await request.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: '请输入选题主题' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!style || !audience || !value || !framework || framework.length === 0) {
      return new Response(
        JSON.stringify({ error: '参数不完整' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const scriptType = STYLE_TO_SCRIPT_TYPE[style] || 'story';

    // 构建提示词
    const systemPrompt = buildSystemPrompt({
      topic,
      style,
      scriptType,
      audience,
      value,
      framework,
      ipPositioning,
      customerName,
      contentType,
    });

    const userMessage = buildUserMessage({
      topic,
      style,
      audience,
      value,
      framework,
      customerName,
      contentType,
    });

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    const encoder = new TextEncoder();
    const startTime = Date.now();
    let outputContent = '';
    const model = 'deepseek-v3-2-251201';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: model,
            temperature: 0.8, // 稍微高一点，让内容更有创意
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              outputContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();

          // 记录成功日志
          logAICall({
            feature: 'creative_generate',
            userId: userId,
            input: topic,
            output: outputContent.slice(0, 500),
            success: true,
            durationMs: Date.now() - startTime,
            model: model,
          });

          // 保存到历史记录
          try {
            const supabase = await getSupabaseClient();
            await supabase.from('creative_records').insert({
              user_id: userId,
              topic,
              audience,
              style,
              value,
              framework: framework,
              script_content: outputContent,
            });
          } catch (err) {
            console.error('API operation event');
            // 不影响主流程，只是记录失败
          }
        } catch (error) {
          console.error('API operation event');
          const errorMsg = error instanceof Error ? 'Request failed' : '生成失败，请重试';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
          controller.close();

          // 失败时返还算力
          await refundPower(userIdRef.value, consumedPower, `智能推导创作失败: ${errorMsg.slice(0, 50)}`);

          // 记录失败日志
          logAICall({
            feature: 'creative_generate',
            userId: userId,
            input: topic,
            output: outputContent.slice(0, 500),
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
    await refundPower(userIdRef.value, consumedPower, `智能推导创作异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    return new Response(
      JSON.stringify({ error: '服务器错误，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
