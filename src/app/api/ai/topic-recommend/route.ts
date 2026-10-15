import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT } from '@/lib/system-prompts';
import { buildIPConstraints } from '@/lib/prompt-engineering';
import { searchKnowledge, buildKnowledgePrompt } from '@/lib/knowledge-helper';
import { getUserById } from '@/lib/db-store';
import { injectMemoryEnhancement, buildMemoryPrefix } from '@/lib/memory-system';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';
// 导入新的提示词构建器
import { buildTopicSystemPrompt } from '@/lib/prompt-builders';
import { logAICall } from '@/lib/ai-quality-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 内容类型定义
const CONTENT_TYPES: Record<string, { name: string; description: string; tips: string }> = {
  '讲故事': {
    name: '讲故事',
    description: '最能立人设、建立信任的内容',
    tips: '通过真实故事展现人物性格、价值观，建立情感连接，让用户记住你是谁'
  },
  '晒过程': {
    name: '晒过程',
    description: '秀手艺展实力，最利于成交的内容',
    tips: '展示工作过程、项目案例、服务细节，用实力说话，让用户看到你的专业度'
  },
  '教知识': {
    name: '教知识',
    description: '创作成本低，吸引精准粉丝的内容',
    tips: '分享专业知识、实用技巧、行业干货，建立专家形象，吸引有需求的精准用户'
  },
  '说观点': {
    name: '说观点',
    description: '引发共鸣认同、关注讨论的内容',
    tips: '表达态度、观点、价值观，引发用户共鸣和讨论，建立思想领袖形象'
  },
  '说产品': {
    name: '说产品',
    description: '直接介绍产品服务，促进转化',
    tips: '展示产品优势、服务特色、客户案例，直接引导用户了解和购买'
  }
};

// 目标人群四象限定义
const AUDIENCE_TYPES: Record<string, { name: string; desc: string; focus: string; examples: string[] }> = {
  'intention': {
    name: '意向用户',
    desc: '已有购买意向，正在对比选择',
    focus: '关注性价比、对比测评、使用体验、购买建议',
    examples: ['测评对比类', '价格分析类', '使用教程类', '优惠信息类']
  },
  'awareness': {
    name: '意识用户',
    desc: '有痛点意识但未考虑解决方案',
    focus: '问题分析、痛点共鸣、解决方案科普',
    examples: ['痛点挖掘类', '问题分析类', '方法科普类', '案例分享类']
  },
  'potential': {
    name: '潜在用户',
    desc: '有潜在需求但未意识到',
    focus: '激发需求、创造场景、引发思考',
    examples: ['场景代入类', '认知刷新类', '趋势预测类', '利益诱惑类']
  },
  'mass': {
    name: '大众用户',
    desc: '无明确需求，泛娱乐向',
    focus: '吸引注意力、蹭热点、引发好奇',
    examples: ['热点解读类', '趣味科普类', '情感共鸣类', '猎奇探秘类']
  }
};

// 生成策略定义
const STRATEGIES: Record<string, { name: string; instruction: string }> = {
  'normal': {
    name: '常规模式',
    instruction: '生成平衡多样性和实用性的选题，覆盖不同角度和方向。'
  },
  'differentiation': {
    name: '高差异化模式',
    instruction: '刻意避免常见的选题角度，追求独特性和新颖性。尝试反直觉的观点、非主流的视角、被忽视的细分领域。避免"如何做X"、"X个技巧"等常见格式。'
  },
  'exploration': {
    name: '探索模式',
    instruction: '尝试小众话题和新领域，挖掘少有人涉及但有价值的内容方向。可以跨界结合、冷门知识、前沿趋势等。适合想要突破现有内容框架的创作者。'
  },
  'hotspot': {
    name: '热点模式',
    instruction: '围绕热点话题多角度挖掘，结合行业特点创造关联性选题。注意时效性和话题热度，用热点吸引流量，用专业内容留住用户。'
  }
};

// 商业目标定义
const BUSINESS_GOALS: Record<string, { name: string; instruction: string }> = {
  'none': {
    name: '不选择',
    instruction: ''
  },
  'conversion': {
    name: '精准转化',
    instruction: '选题要注重带货和销售转化，强调产品价值、使用场景、购买理由，引导用户产生购买行为。'
  },
  'growth': {
    name: '快速涨粉',
    instruction: '选题要注重粉丝增长和曝光，选择有传播性、争议性、话题性的内容，容易引发转发和关注。'
  },
  'brand': {
    name: '品牌影响力',
    instruction: '选题要注重品牌建设和认知度，展现专业实力、行业洞察、价值观输出，建立信任和权威形象。'
  },
  'community': {
    name: '社群运营',
    instruction: '选题要注重社群建设和用户互动，选择能引发讨论、共鸣、参与的话题，增强用户粘性。'
  }
};

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
    
    // IP级别速率限制
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
    
    // 用户级别AI调用限制
    const { allowed: userAllowed, reason } = checkAILimit(String(userId));
    if (!userAllowed) {
      return new Response(
        JSON.stringify({ error: reason || 'AI调用次数已达上限' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力（选题推荐固定消耗250算力）
    const powerCheck = await consumePower(userId, 'topic', 0);
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
    
    // 记录消耗的算力
    consumedPower = powerCheck.consumed || 250;

    const { 
      industry, 
      position, 
      target, 
      count, 
      customerId, 
      customerName, 
      ipPositioning, 
      contentType,
      // 新增参数
      creationMode = 'humanity',
      strategy = 'normal',
      audienceType = 'intention',
      hotspotKeyword = '',
      featureTheme = '',
      otherInfo = '',
      businessGoal = 'none',
    } = await request.json();

    // 如果没有任何信息，提示需要输入
    if (!ipPositioning && !industry && !featureTheme && !otherInfo) {
      return new Response(
        JSON.stringify({ error: '请至少填写行业、特色主题或其他信息中的一项' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取内容类型信息
    const contentTypeInfo = CONTENT_TYPES[contentType] || null;
    
    // 获取目标人群信息
    const audienceInfo = AUDIENCE_TYPES[audienceType] || AUDIENCE_TYPES['intention'];
    
    // 获取生成策略信息
    const strategyInfo = STRATEGIES[strategy] || STRATEGIES['normal'];
    
    // 获取商业目标信息
    const businessGoalInfo = BUSINESS_GOALS[businessGoal] || BUSINESS_GOALS['none'];

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 使用新的提示词构建器 - 按需取用知识片段
    let baseSystemPrompt = CONTENT_SAFETY_PROMPT + buildTopicSystemPrompt({
      mode: creationMode as 'humanity' | 'audience',
      strategy: strategy as 'normal' | 'differentiation' | 'exploration' | 'hotspot',
      audienceType: audienceType as 'intention' | 'awareness' | 'potential' | 'mass',
      contentType: contentType,
      businessGoal: businessGoal,
    });

    // 热点模式特殊处理
    if (strategy === 'hotspot' && hotspotKeyword) {
      baseSystemPrompt += `

【热点话题】
当前热点：${hotspotKeyword}
请将热点话题与创作者的领域结合，从多个角度挖掘选题。

`;
    }

    baseSystemPrompt += `【重要输出规则】
1. 只输出选题标题，每个选题一行
2. 不要输出任何其他内容（不要推荐指数、选题类型、爆款分析等）
3. 选题要多样化，覆盖不同角度和方向
4. 每个选题要具体、可执行
5. 选题要有吸引力，能引发用户点击

直接输出选题标题，每行一个，不需要编号和其他内容。`;

    // 构建用户消息（使用增强版IP约束）
    let userMessage = '';
    
    if (ipPositioning) {
      // 使用IP约束构建器（精简模式：选题只需要关注身份、领域、目标用户）
      const ipConstraints = buildIPConstraints(ipPositioning, customerName, {
        mode: 'minimal',  // 精简模式，仅保留核心约束
        emphasis: ['identity', 'expertise', 'audience']
      });
      
      userMessage = `${ipConstraints}

${industry ? `行业：${industry}` : ''}
${featureTheme ? `特色主题：${featureTheme}` : ''}
${otherInfo ? `其他信息：${otherInfo}` : ''}

请为这位创作者生成${count || 10}个选题。选题要与创作者的专业领域相关，符合目标用户的需求。`;
    } else {
      userMessage = `请为我推荐${count || 10}个选题：

${industry ? `行业领域：${industry}` : ''}
${featureTheme ? `特色主题：${featureTheme}` : ''}
${otherInfo ? `其他信息：${otherInfo}` : ''}

${contentTypeInfo ? `内容类型：${contentTypeInfo.name}` : ''}`;
    }

    // 搜索知识库获取相关方法论内容
    const searchQuery = [industry, featureTheme, ipPositioning?.positioningDirection?.nicheField, contentTypeInfo?.name]
      .filter(Boolean)
      .join(' ');
    
    let knowledgePrompt = '';
    if (searchQuery) {
      const knowledgeResult = await searchKnowledge(searchQuery, request, 2, 0.5);
      if (knowledgeResult.success) {
        knowledgePrompt = buildKnowledgePrompt(knowledgeResult.context);
      }
    }

    // 如果有知识库内容，添加到系统提示词
    if (knowledgePrompt) {
      baseSystemPrompt += knowledgePrompt;
    }

    // ========== 记忆增强注入 ==========
    // 将内容类型转换为脚本类型
    const scriptTypeMap: Record<string, string> = {
      '讲故事': 'story',
      '晒过程': 'process',
      '教知识': 'knowledge',
      '说观点': 'opinion',
      '说产品': 'product',
    };
    
    // 注入用户的创作经验和风格偏好
    const memoryResult = await injectMemoryEnhancement(
      user.uid,
      baseSystemPrompt,
      {
        customerId,
        customerName,
        ipPositioning,
        topic: searchQuery,
        scriptType: contentType ? scriptTypeMap[contentType] : undefined,
        minConfidence: 15,
      }
    );

    // 使用增强后的提示词
    const systemPrompt = memoryResult.enhancedPrompt || baseSystemPrompt;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    const encoder = new TextEncoder();
    const startTime = Date.now();
    let outputContent = '';
    const model = 'deepseek-v3-2-251201';
    const inputSummary = featureTheme || industry || otherInfo || '选题推荐';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 如果记忆增强启用，先发送状态前缀
          if (memoryResult.enabled) {
            const memoryPrefix = buildMemoryPrefix(memoryResult);
            if (memoryPrefix) {
              outputContent += memoryPrefix;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: memoryPrefix })}\n\n`));
            }
          }

          const llmStream = client.stream(messages, {
            model: model,
            temperature: 0.85,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              outputContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          
          // 发送记忆增强元数据
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            done: true,
            memory: memoryResult.enabled ? {
              confidence: memoryResult.confidence,
              preferences: memoryResult.preferencesSummary,
            } : undefined
          })}\n\n`));
          controller.close();
          
          // 记录成功的 AI 调用日志
          logAICall({
            feature: 'topic_recommend',
            userId: user.id,
            input: inputSummary,
            output: outputContent,
            success: true,
            durationMs: Date.now() - startTime,
            model: model,
          });
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`));
          controller.close();
          
          // 失败时返还算力
          const errorMsg = error instanceof Error ? 'Request failed' : '生成失败';
          await refundPower(userIdRef.value, consumedPower, `选题推荐失败: ${errorMsg.slice(0, 50)}`);
          
          // 记录失败的 AI 调用日志
          logAICall({
            feature: 'topic_recommend',
            userId: user.id,
            input: inputSummary,
            output: outputContent,
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
    try {
      await refundPower(userIdRef.value, consumedPower, `选题推荐异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    } catch {
      // 忽略返还失败
    }
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
