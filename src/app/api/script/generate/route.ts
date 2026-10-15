import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT, HOOK_DESIGN_PROMPT, GOLDEN_SENTENCE_PROMPT, EMOTION_DESIGN_PROMPT } from '@/lib/system-prompts';
import { searchKnowledge, buildKnowledgePrompt, getScriptMethodologyPrompt } from '@/lib/knowledge-helper';
import { buildIPConstraints } from '@/lib/prompt-engineering';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';
import { logAICall } from '@/lib/ai-quality-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 脚本类型对应的分镜头结构
const SCRIPT_STRUCTURES: Record<string, string> = {
  story: `【分镜头结构】
镜头1(0-3秒)：开场悬念
镜头2(3-13秒)：背景铺垫
镜头3(13-28秒)：冲突困境
镜头4(28-43秒)：突破解决
镜头5(43-53秒)：金句升华
镜头6(53-60秒)：互动号召`,

  process: `【分镜头结构】
镜头1(0-5秒)：结果展示
镜头2(5-15秒)：步骤1
镜头3(15-25秒)：步骤2
镜头4(25-35秒)：步骤3
镜头5(35-45秒)：步骤4+技巧细节
镜头6(45-55秒)：关键技巧特写
镜头7(55-60秒)：号召行动`,

  knowledge: `【分镜头结构】
镜头1(0-5秒)：痛点引入
镜头2(5-20秒)：知识点1+案例
镜头3(20-35秒)：知识点2+案例
镜头4(35-50秒)：知识点3+案例
镜头5(50-60秒)：总结+号召`,

  opinion: `【分镜头结构】
镜头1(0-5秒)：观点抛出
镜头2(5-20秒)：论据1+案例
镜头3(20-35秒)：论据2+案例
镜头4(35-45秒)：论据3
镜头5(45-55秒)：反面论证
镜头6(55-60秒)：升华金句`,

  product: `【分镜头结构】
镜头1(0-10秒)：痛点刺激
镜头2(10-25秒)：产品展示
镜头3(25-40秒)：效果证明
镜头4(40-50秒)：优惠信息
镜头5(50-60秒)：购买号召`,
};

// 拍摄方式的镜头语言指导（关键修改：每种拍摄方式对应不同的镜头语言）
const SHOOTING_METHOD_PROMPTS: Record<string, string> = {
  talking_head: `【拍摄方式：直面镜头讲述 - 镜头语言规范】

适用镜头：
- 中近景(MS)：人物胸部以上，适合日常讲述
- 特写(CU)：面部表情，强调情绪
- 全景(FS)：展示环境，用于开场或结尾

运镜要求：
- 镜头稳定，三脚架固定
- 人物居中或三分位
- 眼神直视镜头，营造对话感
- 手势自然，避免过度摆动

每个镜头必须标注：
【镜头X】(时间范围)
机位：中近景/特写/全景
画面：人物动作描述
字幕：画面要显示的关键信息
台词：口语化文案
备注：情绪/语气要求`,

  follow_shot: `【拍摄方式：跟拍记录 - 镜头语言规范】

适用镜头：
- 跟拍镜头：跟随主体移动
- 第一人称(POV)：模拟眼睛视角
- 手持晃动：增加真实感
- 中景(MS)：记录操作过程

运镜要求：
- 镜头跟随主体自然移动
- 可适当晃动增加现场感
- 注意捕捉关键动作细节
- 过程完整不跳剪

每个镜头必须标注：
【镜头X】(时间范围)
机位：跟拍/POV/手持
画面：正在进行的动作/过程
字幕：关键步骤说明
旁白：画外音解说
备注：运镜方式/节奏`,

  fixed_angle: `【拍摄方式：固定机位展示 - 镜头语言规范】

适用镜头：
- 固定全景：展示完整场景
- 固定中景：展示操作台面
- 固定特写：展示细节
- 俯拍：展示桌面/物品

运镜要求：
- 机位完全固定，不移动不缩放
- 画面构图讲究，物品摆放整齐
- 适合后期加字幕和特效
- 可多机位切换

每个镜头必须标注：
【镜头X】(时间范围)
机位：固定全景/中景/特写/俯拍
画面：展示内容和布局
字幕：要点说明/步骤标注
旁白：解说文案
备注：画面构图要求`,

  voice_over: `【拍摄方式：画外音配画面 - 镜头语言规范】

适用镜头：
- 空镜：风景、环境、物件
- 素材画面：图片、视频片段
- B-roll：辅助画面
- 字幕卡：纯文字画面

运镜要求：
- 画面与声音内容匹配
- 可以用照片、视频素材拼接
- 注意画面转场节奏
- 字幕要清晰易读

每个镜头必须标注：
【镜头X】(时间范围)
画面：展示的画面内容/素材
字幕：核心文字信息
旁白：配音文案
备注：画面来源/转场方式`,

  third_person: `【拍摄方式：第三人称偷拍 - 镜头语言规范】

适用镜头：
- 远景偷拍：记录整体场景
- 侧面拍摄：记录人物活动
- 遮挡镜头：增加偷拍感
- 中景：记录互动过程

运镜要求：
- 镜头位置隐蔽，模拟旁观者视角
- 可用遮挡物增加偷拍感
- 捕捉自然真实的反应
- 避免人物直视镜头

每个镜头必须标注：
【镜头X】(时间范围)
机位：远景偷拍/侧面/遮挡
画面：正在发生的场景
字幕：情境说明
台词：自然对话/旁白
备注：偷拍角度/真实感要求`,

  selfie: `【拍摄方式：手持自拍 - 镜头语言规范】

适用镜头：
- 自拍近景：面部表情
- 自拍中景：半身展示
- 自拍全景：展示环境
- 翻转镜头：展示物品/场景

运镜要求：
- 手持设备自拍，可以有轻微晃动
- 镜头距离适中，不要太近或太远
- 可以走动、转身展示环境
- 真实自然，有互动感

每个镜头必须标注：
【镜头X】(时间范围)
机位：自拍近景/中景/全景
画面：人物动作+环境
字幕：关键信息标注
台词：口语化文案
备注：走动/转身等动作要求`,
};

const SCRIPT_TYPES = [
  { value: 'story', label: '讲故事' },
  { value: 'process', label: '晒过程' },
  { value: 'knowledge', label: '教知识' },
  { value: 'opinion', label: '说观点' },
  { value: 'product', label: '说产品' },
];

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  // 用于失败时返还算力
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
    
    // 敏感操作速率限制
    const { allowed: ipAllowed, resetTime } = checkRateLimit(`script:${ip}`, RATE_LIMITS.script);
    if (!ipAllowed) {
      return new Response(
        JSON.stringify({ 
          error: '脚本生成过于频繁，请稍后再试',
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
    
    // 用户级别AI调用限制
    const { allowed: userAllowed, reason } = checkAILimit(String(userId));
    if (!userAllowed) {
      return new Response(
        JSON.stringify({ error: reason || 'AI调用次数已达上限' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力（预估500字，消耗约600算力）
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
    
    // 记录本次消耗的算力，用于失败时返还
    consumedPower = powerCheck.consumed || 600;

    const { topic, scriptType, shootingMethod, context, customerId, customerName, ipPositioning } = await request.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: '请输入选题主题' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 主题长度限制
    if (topic.length > 3000) {
      return new Response(
        JSON.stringify({ error: '主题过长，请控制在3000字以内' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 上下文长度限制
    if (context && context.length > 2000) {
      return new Response(
        JSON.stringify({ error: '补充要求过长，请控制在2000字以内' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    // 增加超时时间到 120 秒，确保复杂脚本能够完整生成
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    const shootingMethodLabel: string = ({
      talking_head: '直面镜头讲述',
      follow_shot: '跟拍记录',
      fixed_angle: '固定机位展示',
      voice_over: '画外音配画面',
      third_person: '第三人称偷拍',
      selfie: '手持自拍'
    } as Record<string, string>)[shootingMethod] || '直面镜头讲述';

    // 构建分镜头脚本系统提示词
    let systemPrompt = `你是一位专业的短视频分镜头脚本编导，擅长创作可直接拍摄的专业脚本。

【核心要求】
1. 必须输出分镜头格式，每个镜头包含：机位、画面、字幕、台词/旁白
2. 拍摄方式决定镜头语言，必须严格按照选择的拍摄方式标注机位
3. 内容要口语化、自然，适合口播
4. 禁止使用markdown符号和emoji

${SCRIPT_STRUCTURES[scriptType] || SCRIPT_STRUCTURES.story}

${SHOOTING_METHOD_PROMPTS[shootingMethod] || SHOOTING_METHOD_PROMPTS.talking_head}

【输出格式 - 必须严格遵循】

爆款标题：[吸引眼球的标题]

预计时长：[总时长，如60秒]

【镜头1】(0-5秒)
机位：[根据拍摄方式选择合适的机位]
画面：[具体的画面内容描述，包含人物动作、表情、场景]
字幕：[画面上要显示的关键文字，简洁有力]
台词/旁白：[口语化文案，适合对着镜头说或配音]
备注：[情绪、语气、运镜等补充说明]

【镜头2】(5-15秒)
机位：[...]
画面：[...]
字幕：[...]
台词/旁白：[...]
备注：[...]

... [继续分镜头，直到结尾]

【拍摄建议】
[针对该拍摄方式的具体建议，如灯光、背景、设备等]

【推荐标签】
[#标签1 #标签2 #标签3 ... 直接可复制的标签格式]`;

    // 添加内容安全约束
    systemPrompt += '\n\n' + CONTENT_SAFETY_PROMPT;
    
    // 添加前三秒钩子设计
    systemPrompt += '\n\n' + HOOK_DESIGN_PROMPT;
    
    // 添加金句植入要求
    systemPrompt += '\n\n' + GOLDEN_SENTENCE_PROMPT;
    
    // 添加情绪调动设计
    systemPrompt += '\n\n' + EMOTION_DESIGN_PROMPT;
    
    // 添加完整的薛辉方法论
    systemPrompt += '\n\n' + getScriptMethodologyPrompt(scriptType);
    
    // 使用完整的IP定位提示词（增强版：将参考变为约束）
    if (ipPositioning) {
      systemPrompt += buildIPConstraints(ipPositioning, customerName, {
        mode: 'flexible',
        emphasis: ['identity', 'expertise', 'audience', 'tone', 'content']
      });
      
      // 添加创作指令摘要
      systemPrompt += `\n\n【核心创作指令】
基于以上创作者档案约束进行分镜头脚本创作：
1. 内容主题必须与创作者的专业领域相关
2. 表达风格必须符合创作者的人设特点
3. 确保内容与目标用户相关
4. 脚本应直接可用，不包含任何创作者背景说明`;
    }

    // 搜索知识库获取相关方法论内容
    const searchQuery = `${topic} ${scriptType} 脚本创作`;
    const knowledgeResult = await searchKnowledge(searchQuery, request, 2, 0.5);
    if (knowledgeResult.success) {
      systemPrompt += buildKnowledgePrompt(knowledgeResult.context);
    }

    const userMessage = `请根据以下信息创作分镜头脚本：

选题主题：${topic}
脚本类型：${SCRIPT_TYPES.find(t => t.value === scriptType)?.label || '讲故事'}
拍摄方式：${shootingMethodLabel}

${context ? `补充要求：${context}` : ''}

【重要提醒】
1. 必须按分镜头格式输出，每个镜头包含：机位、画面、字幕、台词/旁白、备注
2. 机位必须符合"${shootingMethodLabel}"的拍摄方式特点
3. 台词要口语化，适合对着镜头自然表达`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    const encoder = new TextEncoder();
    const startTime = Date.now();
    let outputContent = '';
    let streamError: string | null = null;
    const model = 'deepseek-v3-2-251201';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: model,
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              outputContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          // done信号不包含content，避免前端重复追加
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
          
          // 记录成功的 AI 调用日志
          logAICall({
            feature: 'script_generate',
            userId: userId,
            input: topic,
            output: outputContent,
            success: true,
            durationMs: Date.now() - startTime,
            model: model,
          });
        } catch (error) {
          console.error('API operation event');
          streamError = error instanceof Error ? 'Request failed' : '生成失败，请重试';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: streamError })}\n\n`)
          );
          controller.close();
          
          // 失败时返还算力
          await refundPower(userIdRef.value, consumedPower, `脚本生成失败: ${streamError.slice(0, 50)}`);
          
          // 记录失败的 AI 调用日志
          logAICall({
            feature: 'script_generate',
            userId: userId,
            input: topic,
            output: outputContent,
            success: false,
            errorType: 'model_error',
            errorMessage: streamError || undefined,
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
    await refundPower(userIdRef.value, consumedPower, `脚本生成异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    return new Response(
      JSON.stringify({ error: '服务器错误，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
