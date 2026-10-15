import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT } from '@/lib/system-prompts';
import { buildIPConstraints } from '@/lib/prompt-engineering';
import { getUserById } from '@/lib/db-store';
import { injectMemoryEnhancement, buildMemoryPrefix } from '@/lib/memory-system';

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

    // 获取用户信息以获取uid
    const user = await getUserById(userId);
    if (!user) {
      return new Response(
        JSON.stringify({ error: '用户不存在' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力（预估200字，消耗约300算力）
    const powerCheck = await consumePower(userId, 'quickCreate', 200);
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

    const { topic, type, style, customerId, customerName, ipPositioning } = await request.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: '请输入创作主题' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 薛辉方法论 - 内容类型特点
    const typePrompts: Record<string, string> = {
      story: '讲故事类型：用情感打动人，有起承转合，注重共鸣',
      process: '晒过程类型：展示专业能力，建立专业信任',
      knowledge: '教知识类型：用干货输出建立专业权威',
      opinion: '说观点类型：用态度和观点吸引认同',
      product: '说产品类型：用4P法则展示产品价值',
    };

    // 薛辉方法论 - 风格指南
    const stylePrompts: Record<string, string> = {
      professional: '专业严谨风格：数据准确，逻辑严密',
      casual: '轻松幽默风格：语言活泼，有趣有料',
      emotional: '情感共鸣风格：走心文案，真情实感',
      practical: '实用干货风格：直击痛点，给解决方案',
    };

    const baseSystemPrompt = CONTENT_SAFETY_PROMPT + `你是一位拥有百万粉丝的短视频内容创作专家，精通抖音、快手、小红书等平台的算法逻辑和用户喜好。请根据用户提供的主题，快速创作一个高质量的短视频脚本方案。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深编剧在给客户写脚本
7. 直接切入内容，不要有任何开场白

【核心原则】
一、黄金3秒法则：开场3秒必须抓住注意力，否则用户会划走
二、价值优先：每一条内容都要给用户明确的价值（情感价值/知识价值/娱乐价值）
三、节奏把控：短视频节奏要紧凑，避免冗长
四、结尾升华：结尾要有记忆点或行动号召

【内容类型特点】
讲故事：用情感打动人，有起承转合，注重共鸣
晒过程：用真实打动人，展示细节，注重可信度
教知识：用干货打动人，逻辑清晰，注重实用性
聊观点：用态度打动人，观点鲜明，注重启发性

【风格指南】
专业严谨：数据准确，逻辑严密，适合财经、法律、医学等专业领域
轻松幽默：语言活泼，段子穿插，适合生活、娱乐、情感类内容
情感共鸣：走心文案，真情实感，适合故事、成长、家庭类内容
实用干货：直击痛点，给解决方案，适合教程、技巧、职场类内容

【内容类型】：${typePrompts[type || 'story']}
【创作风格】：${stylePrompts[style || 'casual']}

【输出格式】

爆款标题
一个吸引人的标题，建议用疑问句或数字开头，如"3个方法让你..."、"为什么..."、"千万别..."等

黄金开场（3秒抓人）
开场白，建议用悬念、痛点、反差或金句开场，让用户不想划走

核心内容
分点列出主要内容，每点控制在10-15秒
要点1：...
要点2：...
要点3：...

升华结尾
结尾要有记忆点，可以是有趣的总结、行动号召或金句

推荐标签
#标签1 #标签2 #标签3 #标签4 #标签5

拍摄建议
镜头：...
配乐：...
剪辑：...

爆点分析
分析这条内容的爆点在哪里，用户为什么会点赞收藏转发`;

    // 构建基础系统提示
    let systemPrompt = baseSystemPrompt;

    // 如果有IP定位信息，使用增强版约束
    if (ipPositioning) {
      systemPrompt += buildIPConstraints(ipPositioning, customerName, {
        mode: 'flexible',
        emphasis: ['identity', 'expertise', 'audience', 'tone', 'content']
      });
    }

    // ========== 记忆增强注入 ==========
    // 注入用户的创作经验和风格偏好
    const memoryResult = await injectMemoryEnhancement(
      user.uid,
      systemPrompt,
      {
        customerId,
        customerName,
        ipPositioning,
        topic,
        scriptType: type,
        minConfidence: 15, // 较低阈值，让更多用户受益
      }
    );

    // 使用增强后的提示词
    const finalSystemPrompt = memoryResult.enhancedPrompt || systemPrompt;

    const messages = [
      { role: 'system' as const, content: finalSystemPrompt },
      { role: 'user' as const, content: `请为我创作一个关于"${topic}"的短视频脚本` },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 如果记忆增强启用，先发送状态前缀
          if (memoryResult.enabled) {
            const memoryPrefix = buildMemoryPrefix(memoryResult);
            if (memoryPrefix) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: memoryPrefix })}\n\n`));
            }
          }

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
          
          // 发送记忆增强元数据（前端可用于展示）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            done: true,
            memory: memoryResult.enabled ? {
              confidence: memoryResult.confidence,
              preferences: memoryResult.preferencesSummary,
            } : undefined
          })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`));
          controller.close();
          
          // 失败时返还算力
          const errorMsg = error instanceof Error ? 'Request failed' : '生成失败';
          await refundPower(userIdRef.value, consumedPower, `快速创作失败: ${errorMsg.slice(0, 50)}`);
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
    await refundPower(userIdRef.value, consumedPower, `快速创作异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
