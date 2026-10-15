import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT, buildContentIPPositioningPrompt, IPPositioning, HOOK_DESIGN_PROMPT, GOLDEN_SENTENCE_PROMPT, EMOTION_DESIGN_PROMPT } from '@/lib/system-prompts';
import { searchKnowledge, buildKnowledgePrompt, getWritingMethodologyPrompt } from '@/lib/knowledge-helper';
// 导入新的提示词工程组件
import { 
  buildIPConstraints, 
  buildIdentityMappingInstruction,
  REWRITE_EXECUTION_STEPS,
  REWRITE_CORE_CONCEPT,
  REWRITE_EXAMPLES 
} from '@/lib/prompt-engineering';
// 导入新的提示词构建器
import { buildWritingSystemPrompt, buildIP36SystemPrompt } from '@/lib/prompt-builders';
import type { ScriptType } from '@/lib/content-knowledge-base';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 洗稿模式提示词
const REWRITE_MODE_PROMPTS: Record<string, { name: string; prompt: string }> = {
  high_dimension: {
    name: '高维同题再创作',
    prompt: `【洗稿模式：高维同题再创作】
- 保留原文首句和核心主题
- 改写中间内容，换一种表达方式
- 加入新的观点和案例
- 重复率控制在10%以内
- 内容要更深入、更有价值`
  },
  differentiation: {
    name: '定向差异化再创作',
    prompt: `【洗稿模式：定向差异化再创作】
- 保留开篇底层逻辑
- 按照用户指导或知识库自由发挥
- 加入差异化观点和内容
- 形成独特的表达风格
- 避免与原文雷同`
  },
  first_sentence: {
    name: '首句借势续写',
    prompt: `【洗稿模式：首句借势续写】
- 借用原文首句作为钩子开头
- 迅速转向自己的业务方向
- 用自己的逻辑和案例展开
- 保持开篇吸引力
- 内容要原创且贴合自身定位`
  },
};

// 博主平台提示词
const BLOGGER_PLATFORM_PROMPTS: Record<string, string> = {
  douyin: '抖音平台博主风格',
  xiaohongshu: '小红书平台博主风格',
};


// 拍摄方式提示词
const SHOOTING_METHOD_PROMPTS: Record<string, string> = {
  talking_head: '拍摄方式：口播讲解，适合直接面对镜头说话',
  vlog: '拍摄方式：Vlog记录，适合生活化场景呈现',
  interview: '拍摄方式：访谈对话，适合问答互动形式',
  demonstration: '拍摄方式：实操演示，适合手把手教学',
  animation: '拍摄方式：动画解说，适合抽象概念可视化',
  slideshow: '拍摄方式：图文展示，适合信息密集型内容',
};

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

    // 检查算力（文案生成预估300字，消耗约400算力）
    const powerCheck = await consumePower(userId, 'script', 300);
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
      mode,
      creationMode = 'original_humanity',
      scriptType = 'opinion',
      style, 
      length, 
      reference, 
      requirements, 
      customerId, 
      customerName, 
      ipPositioning,
      customPersona,
      industry,
      wordCount,
      shootingMethod,
      openingText,
      otherInfo,
      // 开篇参数（从创作开篇页面传入）
      opening,
      openingStrategy,
      // 洗稿模式参数
      rewriteMode,
      // 文风模拟参数
      bloggerPlatform,
      bloggerLink,
      bloggerSampleText,
      // IP36计参数
      ip36Technique,
      ip36Category,
    } = await request.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: '请输入选题或口水话' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    // 增加超时时间到 120 秒
    const config = new Config({ timeout: 120000 });
    const client = new LLMClient(config, customHeaders);

    // 使用新的提示词构建器 - 按需取用知识片段
    const isRewrite = creationMode === 'rewrite_source' || creationMode === 'rewrite_style';
    let systemPrompt = CONTENT_SAFETY_PROMPT + buildWritingSystemPrompt({
      scriptType: scriptType as ScriptType,
      creationMode: isRewrite ? 'rewrite' : 'original',
    });
    
    // 洗稿模式添加具体模式提示
    if (creationMode === 'rewrite_source' && rewriteMode && REWRITE_MODE_PROMPTS[rewriteMode]) {
      systemPrompt += '\n\n' + REWRITE_MODE_PROMPTS[rewriteMode].prompt;
    }
    
    // 文风模拟添加博主平台提示
    if (creationMode === 'style_simulation' && bloggerPlatform) {
      const platformPrompt = BLOGGER_PLATFORM_PROMPTS[bloggerPlatform] || '';
      systemPrompt += `\n\n【目标平台风格】${platformPrompt}`;
    }
    
    // IP36计模式
    if (creationMode === 'ip36' && ip36Technique) {
      systemPrompt = CONTENT_SAFETY_PROMPT + buildIP36SystemPrompt({
        techniqueId: ip36Technique,
        category: ip36Category,
        ipPositioning,
        wordCount,
      });
    }
    
    // 添加薛辉方法论
    systemPrompt += '\n\n' + getWritingMethodologyPrompt(creationMode);
    
    // 仿写模式：添加核心概念和执行步骤
    if (creationMode === 'rewrite_style') {
      systemPrompt += '\n\n' + REWRITE_CORE_CONCEPT;
      systemPrompt += '\n\n' + REWRITE_EXECUTION_STEPS;
    }
    
    // 添加字数限制
    if (wordCount) {
      systemPrompt += `\n\n【字数要求】文案字数控制在${wordCount}字左右`;
    }
    
    // 添加拍摄方式
    if (shootingMethod && SHOOTING_METHOD_PROMPTS[shootingMethod]) {
      systemPrompt += `\n\n${SHOOTING_METHOD_PROMPTS[shootingMethod]}`;
    }
    
    // 构建用户消息
    let userMessage = `请为以下主题创作文案：

【主题/选题】${topic}`;
    
    // 如果有开篇，作为核心开头
    if (opening) {
      userMessage = `请基于以下开篇，创作完整的文案内容：

【主题/选题】${topic}

【开篇（必须使用此开头）】
"${opening}"

${openingStrategy ? `【开篇策略】${openingStrategy}` : ''}

【创作要求】
1. 必须以给定的开篇作为文案开头，不能修改
2. 围绕主题继续展开内容
3. 保持开篇的风格和节奏
4. 内容要完整、有价值`;
    }
    
    // 仿写模式：添加身份映射指令（核心改进）
    if (creationMode === 'rewrite_style' && ipPositioning && reference) {
      userMessage += buildIdentityMappingInstruction(ipPositioning as IPPositioning);
      userMessage += `\n\n${REWRITE_EXAMPLES}`;
    }
    
    // 添加IP定位约束（增强版）
    if (ipPositioning) {
      // 使用新的约束机制
      userMessage += buildIPConstraints(ipPositioning as IPPositioning, customerName, {
        mode: 'strict',
        emphasis: ['identity', 'expertise', 'audience', 'tone']
      });
    } else if (customPersona) {
      userMessage += `

【创作者人设】${customPersona}`;
    }
    
    // 添加行业信息
    if (industry) {
      userMessage += `\n\n【行业领域】${industry}`;
    }
    
    // 添加开篇文案
    if (openingText) {
      userMessage += `\n\n【开篇文案】${openingText}`;
    }
    
    // 添加其他信息
    if (otherInfo) {
      userMessage += `\n\n【其他要求】${otherInfo}`;
    }
    
    // 洗稿/仿写模式添加参考文案
    if ((creationMode === 'rewrite_source' || creationMode === 'rewrite_style') && reference) {
      if (creationMode === 'rewrite_style') {
        // 仿写模式：明确说明只学习结构
        userMessage += `\n\n【参考内容 - 学习结构和技巧，用自己的身份和案例重新创作】\n${reference}`;
      } else {
        userMessage += `\n\n【参考文案】\n${reference}`;
      }
    }
    
    // 文风模拟模式添加博主链接
    if (creationMode === 'style_simulation' && bloggerLink) {
      const platformName = bloggerPlatform === 'douyin' ? '抖音' : bloggerPlatform === 'xiaohongshu' ? '小红书' : '';
      userMessage += `\n\n【博主主页】${platformName}博主主页链接：${bloggerLink}`;
      userMessage += `\n请分析该博主的文风特点，并模拟其风格创作文案。`;
    }
    
    // 兼容旧参数
    if (requirements) {
      userMessage += `\n\n【补充要求】${requirements}`;
    }

    userMessage += `\n\n请按JSON格式输出，包含coverTitles和content两个字段。`;

    // 搜索知识库获取相关方法论内容
    const searchQuery = `${topic} ${creationMode} ${scriptType} 文案创作`;
    const knowledgeResult = await searchKnowledge(searchQuery, request, 2, 0.5);
    if (knowledgeResult.success) {
      systemPrompt += buildKnowledgePrompt(knowledgeResult.context);
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
          const llmStream = client.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.8,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              consumedPowerRef.value += text.length;
              consumedForRefund = consumedPowerRef.value;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (streamError) {
          console.error('API operation event');
          // 失败时返还算力
          const refundAmount = consumedPowerRef.value > 0 ? Math.max(consumedPowerRef.value, 100) : 400;
          await refundPower(userIdRef.value, refundAmount, `文案生成失败: ${(streamError instanceof Error ? 'Request failed' : '流式错误').slice(0, 50)}`);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败，如已扣费请联系管理员核对，自动退款尚未启用' })}\n\n`));
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
      await refundPower(userIdForRefund, consumedForRefund || 400, `文案生成异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    }
    return new Response(
      JSON.stringify({ error: '服务暂时不可用，如已扣费请联系管理员核对，自动退款尚未启用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
