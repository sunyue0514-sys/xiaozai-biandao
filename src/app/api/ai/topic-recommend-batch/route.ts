import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { CONTENT_SAFETY_PROMPT } from '@/lib/system-prompts';
import { buildIPConstraints } from '@/lib/prompt-engineering';
import { getTopicMethodologyPrompt } from '@/lib/knowledge-helper';
import { searchKnowledge, buildKnowledgePrompt } from '@/lib/knowledge-helper';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  checkAILimit,
} from '@/lib/security';
import {
  TOPIC_CATEGORIES,
  TOPIC_SUB_TYPES,
  HIGHLIGHT_TAGS,
  NewTopicResult,
  NewGroupedTopics,
  AudienceAnalysis,
} from '@/lib/topic-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 目标人群四象限定义
const AUDIENCE_TYPES: Record<string, { name: string; desc: string; focus: string; examples?: string[] }> = {
  'intention': {
    name: '意向用户',
    desc: '已有购买意向，正在对比选择',
    focus: '关注性价比、对比测评、使用体验、购买建议',
    examples: ['测评对比类', '价格分析类', '使用教程类', '优惠信息类'],
  },
  'awareness': {
    name: '意识用户',
    desc: '有痛点意识但未考虑解决方案',
    focus: '问题分析、痛点共鸣、解决方案科普',
    examples: ['痛点挖掘类', '问题分析类', '方法科普类', '案例分享类'],
  },
  'potential': {
    name: '潜在用户',
    desc: '有潜在需求但未意识到',
    focus: '激发需求、创造场景、引发思考',
    examples: ['场景代入类', '认知刷新类', '趋势预测类', '利益诱惑类'],
  },
  'mass': {
    name: '大众用户',
    desc: '无明确需求，泛娱乐向',
    focus: '吸引注意力、蹭热点、引发好奇',
    examples: ['热点解读类', '趣味科普类', '情感共鸣类', '猎奇探秘类'],
  },
};

// 子类型详细说明（用于提示词）- 基于薛辉爆款选题方法论
const SUB_TYPE_DETAILS: Record<string, { 
  name: string; 
  goal: string; 
  features: string; 
  examples: string[];
  avoidTopics: string[];
}> = {
  // 流量型 - A类：破圈引流
  // 方法论核心：身份锁定+痛点尖叫+结果承诺（黄金钩子）
  traffic_a: {
    name: '破圈引流',
    goal: '吸引新用户关注，扩大受众范围',
    features: '用"黄金钩子公式"制造强吸引力：身份锁定让人代入，痛点尖叫引发好奇，结果承诺驱动点击',
    examples: [
      '【身份+反差+结果】做了8年程序员，我为什么不建议年轻人盲目进大厂',
      '【身份+痛点+揭秘】跑外卖3年，我发现90%的人都在错误地"省时间"',
      '【数字+身份+结果】35岁被裁后，我用这3个方法月入翻倍',
      '【痛点+身份+反转】那些天天喊着要辞职的人，为什么最后都没走？',
    ],
    avoidTopics: ['平淡无奇的陈述句', '没有身份代入的泛泛而谈', '缺少痛点尖叫的"正确废话"'],
  },
  // 流量型 - B类：建立链接
  // 方法论核心：场景化痛点+情感共鸣
  traffic_b: {
    name: '建立链接',
    goal: '与用户建立情感连接，增强粘性',
    features: '用"四要素"制造代入感：具体人群+具体场景+具体痛点，让用户产生"这就是我"的共鸣',
    examples: [
      '【场景共鸣】每天早上闹钟响的那刻，你是不是也在想"今天能不能不上班"',
      '【身份+困扰】作为妈妈，我听过最扎心的一句话是"你怎么不管管孩子"',
      '【反问+场景】有没有一种可能，你拼命努力的方向，从一开始就错了',
      '【共情+身份】那些看起来很拼的人，深夜其实都在崩溃',
    ],
    avoidTopics: ['高高在上的说教', '与用户无关的行业八卦', '没有情感温度的干货'],
  },
  // 变现型 - A类：促进转化
  // 方法论核心：精准痛点+明确收益
  conversion_a: {
    name: '促进转化',
    goal: '直接推动用户购买或行动',
    features: '用"四要素"精准定位：具体人群+具体痛点+具体场景+具体结果，让用户看到"买了能怎样"',
    examples: [
      '【痛点+结果】花2万报的班不如这个方法，零基础也能30天上手接单',
      '【身份+场景+收益】宝妈兼职月入5000的真相：不是卖货，是这个被忽略的技能',
      '【对比+数字】同样是学英语，为什么他3个月能和外国人聊天，你学了10年还是开不了口',
      '【痛点+方案】皮肤暗黄的女孩，我建议你别再乱买护肤品了',
    ],
    avoidTopics: ['纯娱乐无转化意向', '硬广味太重的推销', '没有痛点支撑的"好处"罗列'],
  },
  // 变现型 - B类：培育需求
  // 方法论核心：唤醒沉睡痛点+发现新可能
  conversion_b: {
    name: '培育需求',
    goal: '激发用户潜在需求，为转化铺垫',
    features: '用"痛点唤醒"制造需求：让用户意识到问题的存在，或发现从未想过的可能性',
    examples: [
      '【认知刷新】你以为的"努力"，可能正在毁掉你的职业生涯',
      '【隐患唤醒】那些你不在意的小习惯，正在悄悄偷走你的睡眠质量',
      '【可能发现】原来这个技能，才是普通人翻身的最低门槛',
      '【场景+新认知】当你还在纠结要不要学的时候，别人已经靠这个变现了',
    ],
    avoidTopics: ['硬邦邦的广告', '与产品毫无关联', '吓唬用户但没有解决方案'],
  },
  // 人设型 - A类：强化共鸣
  // 方法论核心：价值观冲突+态度表达
  persona_a: {
    name: '强化共鸣',
    goal: '展现价值观，引发用户共鸣',
    features: '用鲜明的态度制造"同频共振"：敢于表达、敢于否定、敢于站队，让用户产生"这个人懂我"',
    examples: [
      '【态度宣言】我为什么从不劝人买房——一个房产中介的真心话',
      '【价值观】在这个急功近利的时代，我选择做一个"慢"的人',
      '【否定+立场】别再相信什么"躺平"了，那只是别人给你喝的毒鸡汤',
      '【身份+感悟】做了10年销售，我发现越是"老实人"，越容易成交',
    ],
    avoidTopics: ['中庸没态度的废话', '迎合所有人的"和稀泥"', '与账号人设不符的观点'],
  },
  // 人设型 - B类：建立信任
  // 方法论核心：专业展示+真诚分享
  persona_b: {
    name: '建立信任',
    goal: '展示专业度和真诚，赢得用户信任',
    features: '用"真材实料"建立信任：具体案例、具体数据、具体方法论，让用户相信你是靠谱的专家',
    examples: [
      '【案例+结果】帮一个负债30万的粉丝做了规划，一年后他来报喜了',
      '【避坑指南】装修最容易踩的5个坑，我都替你们花钱试过了',
      '【方法论分享】我是怎么把一个冷门号做到10万粉的，方法全公开',
      '【真诚+身份】说真的，这个行业没那么光鲜，但也没那么黑暗',
    ],
    avoidTopics: ['夸大其词的吹嘘', '没有细节的空话', '与专业领域无关的内容'],
  },
};

// 生成策略定义
const STRATEGIES: Record<string, { name: string; instruction: string }> = {
  'normal': {
    name: '常规模式',
    instruction: '生成平衡多样性和实用性的选题，覆盖不同角度和方向。',
  },
  'differentiation': {
    name: '高差异化模式',
    instruction: '刻意避免常见的选题角度，追求独特性和新颖性。尝试反直觉的观点、非主流的视角。',
  },
  'exploration': {
    name: '探索模式',
    instruction: '尝试小众话题和新领域，挖掘少有人涉及但有价值的内容方向。',
  },
  'hotspot': {
    name: '热点模式',
    instruction: '围绕热点话题多角度挖掘，结合行业特点创造关联性选题。',
  },
};

// 商业目标定义
const BUSINESS_GOALS: Record<string, { name: string; instruction: string }> = {
  'none': { name: '不选择', instruction: '' },
  'conversion': { name: '精准转化', instruction: '选题注重带货和销售转化。' },
  'growth': { name: '快速涨粉', instruction: '选题注重粉丝增长和曝光，选择有传播性的内容。' },
  'brand': { name: '品牌影响力', instruction: '选题注重品牌建设和认知度。' },
  'community': { name: '社群运营', instruction: '选题注重社群建设和用户互动。' },
};

// 生成人群分析
async function generateAudienceAnalysis(
  client: LLMClient,
  context: {
    industry?: string;
    featureTheme?: string;
    otherInfo?: string;
    ipPositioning?: any;
    customerName?: string;
    painPoints?: string;
    demandPoints?: string;
    pleasurePoints?: string;
    itchPoints?: string;
    userProfile?: {
      age?: string;
      gender?: string;
      identity?: string;
      income?: string;
      traits?: string;
    };
  },
  customHeaders: Record<string, string>
): Promise<AudienceAnalysis | null> {
  const systemPrompt = CONTENT_SAFETY_PROMPT + `你是一位专业的用户研究分析师。请根据提供的信息，分析目标人群画像、四象限用户分布、四痛点分析，并给出选题策略建议。

【输出格式要求 - 非常重要】
你必须严格按照以下JSON格式输出，不要输出任何其他内容：

{
  "profile": "目标人群画像描述（50-100字）",
  "quadrants": [
    {"id": "intention", "name": "意向用户", "desc": "描述", "focus": "关注点", "examples": ["选题类型1", "选题类型2"]},
    {"id": "awareness", "name": "意识用户", "desc": "描述", "focus": "关注点", "examples": ["选题类型1", "选题类型2"]},
    {"id": "potential", "name": "潜在用户", "desc": "描述", "focus": "关注点", "examples": ["选题类型1", "选题类型2"]},
    {"id": "mass", "name": "大众用户", "desc": "描述", "focus": "关注点", "examples": ["选题类型1", "选题类型2"]}
  ],
  "painPoints": {
    "demand": "需求描述：用户想解决的问题",
    "pain": "痛点描述：用户经历过的糟糕体验",
    "pleasure": "爽点描述：用户获得的成就感",
    "itch": "痒点描述：用户向往的理想状态"
  },
  "businessGoal": "商业目标描述",
  "strategy": "选题策略建议（100-150字）"
}

直接输出JSON，不要有其他文字。`;

  let userMessage = '';
  if (context.ipPositioning) {
    const ipConstraints = buildIPConstraints(context.ipPositioning, context.customerName, {
      mode: 'minimal',
      emphasis: ['identity', 'expertise', 'audience']
    });
    userMessage = `${ipConstraints}`;
  } else {
    userMessage = `请分析以下行业/领域的人群特征：

行业领域：${context.industry || '未指定'}
特色主题：${context.featureTheme || '未指定'}
${context.otherInfo ? `其他信息：${context.otherInfo}` : ''}`;
  }

  // 添加用户提供的分析信息
  if (context.userProfile) {
    const profileParts: string[] = [];
    if (context.userProfile.age) profileParts.push(`年龄：${context.userProfile.age}`);
    if (context.userProfile.gender) profileParts.push(`性别：${context.userProfile.gender}`);
    if (context.userProfile.identity) profileParts.push(`身份：${context.userProfile.identity}`);
    if (context.userProfile.income) profileParts.push(`收入：${context.userProfile.income}`);
    if (context.userProfile.traits) profileParts.push(`特征：${context.userProfile.traits}`);
    if (profileParts.length > 0) {
      userMessage += `\n\n用户画像：\n${profileParts.join('\n')}`;
    }
  }

  if (context.painPoints) userMessage += `\n\n痛点：${context.painPoints}`;
  if (context.demandPoints) userMessage += `\n\n需求：${context.demandPoints}`;
  if (context.pleasurePoints) userMessage += `\n\n爽点：${context.pleasurePoints}`;
  if (context.itchPoints) userMessage += `\n\n痒点：${context.itchPoints}`;

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

    // 提取JSON
    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = result.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr);
      return {
        profile: parsed.profile || '',
        quadrants: parsed.quadrants || [],
        painPoints: parsed.painPoints || { demand: '', pain: '', pleasure: '', itch: '' },
        businessGoal: parsed.businessGoal || '',
        strategy: parsed.strategy || '',
      };
    }
    return null;
  } catch (error) {
    console.error('API operation event');
    return null;
  }
}

// 单个子类型的选题生成
async function generateTopicsForSubType(
  client: LLMClient,
  categoryId: 'traffic' | 'conversion' | 'persona',
  subTypeId: string,
  subTypeInfo: typeof TOPIC_SUB_TYPES[keyof typeof TOPIC_SUB_TYPES],
  context: {
    industry?: string;
    featureTheme?: string;
    otherInfo?: string;
    ipPositioning?: any;
    customerName?: string;
    audienceType?: string;
    strategy?: string;
    hotspotKeyword?: string;
    businessGoal?: string;
    countPerType: number;
    audienceAnalysis?: AudienceAnalysis | null;
    creationMode?: string; // 新增：创作模式
  },
  customHeaders: Record<string, string>,
  knowledgeContext?: string // 新增：知识库内容
): Promise<NewTopicResult[]> {
  const categoryInfo = TOPIC_CATEGORIES[categoryId];
  const audienceInfo = AUDIENCE_TYPES[context.audienceType || 'intention'];
  const strategyInfo = STRATEGIES[context.strategy || 'normal'];
  const businessGoalInfo = BUSINESS_GOALS[context.businessGoal || 'none'];
  const subTypeDetail = SUB_TYPE_DETAILS[subTypeId];

  // 构建系统提示词 - 分层架构
  let systemPrompt = CONTENT_SAFETY_PROMPT;

  // L1: 安全层（已包含）

  // L2: 角色定义
  systemPrompt += `\n\n你是一位专业的短视频选题策划师。`;

  // L3: 方法论层 - 核心知识（优先使用知识库内容）
  if (knowledgeContext) {
    systemPrompt += `\n\n${knowledgeContext}`;
  } else {
    // 如果没有知识库内容，使用内置方法论
    systemPrompt += `\n\n${getTopicMethodologyPrompt(
      context.creationMode as 'humanity' | 'audience',
      subTypeId
    )}`;
  }

  // L4: 任务定义 - 当前类型的定位
  systemPrompt += `\n\n【当前任务 - 必须严格遵守】

═══════════════════════════════════════════════════════════════
分类定位
═══════════════════════════════════════════════════════════════

- 主分类：${categoryInfo.label}（${categoryInfo.description}）
- 子类型：${subTypeDetail.name}
- 核心目标：${subTypeDetail.goal}
- 内容特征：${subTypeDetail.features}

【${subTypeDetail.name}选题示例】
${subTypeDetail.examples.map((e, i) => `${i + 1}. ${e}`).join('\n')}

【避免的选题方向】
${subTypeDetail.avoidTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;

  // L5: 目标人群
  systemPrompt += `\n\n【目标人群】
${context.audienceAnalysis?.profile || `目标人群：${audienceInfo.name}，${audienceInfo.desc}`}`;

  // L6: 策略和商业目标
  systemPrompt += `\n\n【生成策略：${strategyInfo.name}】
${strategyInfo.instruction}`;

  if (businessGoalInfo.instruction) {
    systemPrompt += `\n\n【商业目标：${businessGoalInfo.name}】
${businessGoalInfo.instruction}`;
  }

  // L7: 四痛点分析
  if (context.audienceAnalysis?.painPoints) {
    systemPrompt += `\n\n【四痛点分析 - 结合痛点设计选题】
- 需求：${context.audienceAnalysis.painPoints.demand}
- 痛点：${context.audienceAnalysis.painPoints.pain}
- 爽点：${context.audienceAnalysis.painPoints.pleasure}
- 痒点：${context.audienceAnalysis.painPoints.itch}`;
  }

  // L8: 输出格式（必须放在最后）
  systemPrompt += `\n\n【输出格式要求 - 非常重要】

你必须严格按照以下JSON格式输出，不要输出任何其他内容（不要输出代码块标记）：

[
  {
    "content": "选题标题（必须是完整的中文句子，15-40字）",
    "highlights": ["亮点标签名称"]
  }
]

【重要规则】
1. 直接输出JSON数组，不要用代码块包裹
2. 选题必须符合"${subTypeDetail.name}"的目标定位：${subTypeDetail.goal}
3. 参考示例风格，但不要照抄，要结合行业特点创新
4. 每个选题的content必须是独立的、有吸引力的标题
5. 避免生成不符合该类型定位的选题

【亮点标签参考】
${Object.values(HIGHLIGHT_TAGS).map(t => `- ${t.name}：${t.desc}`).join('\n')}

只输出JSON数组，不要有其他文字。`;

  let userMessage = '';
  if (context.ipPositioning) {
    const ipConstraints = buildIPConstraints(context.ipPositioning, context.customerName, {
      mode: 'minimal',
      emphasis: ['identity', 'expertise', 'audience']
    });
    userMessage = `${ipConstraints}\n\n请为"${subTypeDetail.name}"（${subTypeDetail.goal}）类型生成${context.countPerType}个选题，选题要符合该类型的内容特征。`;
  } else {
    userMessage = `请生成${context.countPerType}个"${subTypeDetail.name}"类型的选题：

【当前类型】${subTypeDetail.name} - ${subTypeDetail.goal}
【内容特征】${subTypeDetail.features}

行业领域：${context.industry || '未指定'}
特色主题：${context.featureTheme || '未指定'}
${context.otherInfo ? `其他信息：${context.otherInfo}` : ''}`;
  }

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userMessage },
  ];

  let result = '';
  const stream = client.stream(messages, {
    model: 'deepseek-v3-2-251201',
    temperature: 0.85,
  });

  for await (const chunk of stream) {
    if (chunk.content) {
      result += chunk.content.toString();
    }
  }

  // 解析结果
  try {
    let jsonStr = '';
    const lastIndex = result.lastIndexOf(']');
    const firstIndex = result.indexOf('[');
    if (firstIndex !== -1 && lastIndex !== -1 && lastIndex > firstIndex) {
      jsonStr = result.substring(firstIndex, lastIndex + 1);
    }
    
    if (!jsonStr) {
      throw new Error('未找到有效的JSON数据');
    }
    
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // 尝试逐个提取选题对象
      const topicObjects: any[] = [];
      const objectPattern = /\{\s*"content"\s*:\s*"([^"]+)"[^}]*\}/g;
      let match;
      while ((match = objectPattern.exec(jsonStr)) !== null) {
        const fullMatch = match[0];
        try {
          const obj = JSON.parse(fullMatch);
          if (obj.content && /[\u4e00-\u9fa5]/.test(obj.content)) {
            topicObjects.push(obj);
          }
        } catch {
          const contentMatch = fullMatch.match(/"content"\s*:\s*"([^"]+)"/);
          const highlightsMatch = fullMatch.match(/"highlights"\s*:\s*\[([^\]]*)\]/);
          if (contentMatch && contentMatch[1]) {
            topicObjects.push({
              content: contentMatch[1],
              highlights: highlightsMatch ? highlightsMatch[1].split(',').map(s => s.replace(/"/g, '').trim()).filter(Boolean) : [],
            });
          }
        }
      }
      if (topicObjects.length === 0) {
        throw new Error('无法从JSON中提取任何有效选题');
      }
      parsed = topicObjects;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('解析结果不是有效数组');
    }

    const invalidContentPatterns = /^(highlights|method|content|type|id|score|"|\[|\]|\{|\}|null|undefined)$/i;
    const validTopics = parsed.filter((item: any) => {
      const content = item.content || '';
      if (content.length < 8) return false;
      if (invalidContentPatterns.test(content.trim())) return false;
      if (!/[\u4e00-\u9fa5]/.test(content)) return false;
      return true;
    });

    if (validTopics.length === 0) {
      throw new Error('解析结果中没有有效的选题内容');
    }

    // 基于方法论的评分逻辑
    return validTopics.map((item: any, index: number) => {
      const content = item.content || '';
      const highlights = item.highlights || [];
      
      // 使用方法论评分
      const score = calculateTopicScore(content, subTypeId, highlights);

      return {
        id: `${subTypeId}_${index + 1}`,
        content,
        categoryId,
        categoryName: categoryInfo.label,
        subType: subTypeInfo.subType,
        subTypeName: subTypeInfo.name,
        subTypeGoal: subTypeInfo.goal,
        score,
        highlights: highlights || [],
      };
    });
  } catch (error) {
    console.error('API operation event');
    
    // 降级处理
    const invalidPatterns = /^(highlights|method|content|type|id|score|null|undefined|"|\[|\]|\{|\})$/i;
    const jsonFieldPattern = /^\s*"(content|method|highlights|id|type|score)"\s*:/;
    
    const lines = result.split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => {
        if (!l || l.length < 8) return false;
        if (jsonFieldPattern.test(l)) return false;
        if (invalidPatterns.test(l)) return false;
        if (l.startsWith('{') || l.startsWith('[') || l.startsWith(']')) return false;
        if (!/[\u4e00-\u9fa5]/.test(l)) return false;
        return true;
      });
    
    return lines.slice(0, context.countPerType)
      .map((line: string, index: number) => {
        let content = line.replace(/^\d+[.、)\s]*/, '').trim();
        content = content.replace(/^["""「]|["""」]$/g, '').trim();
        
        return {
          id: `${subTypeId}_${index + 1}`,
          content,
          categoryId,
          categoryName: categoryInfo.label,
          subType: subTypeInfo.subType,
          subTypeName: subTypeInfo.name,
          subTypeGoal: subTypeInfo.goal,
          score: calculateTopicScore(content, subTypeId, []),
          highlights: [],
        };
      })
      .filter((item) => {
        const content = item.content.trim();
        return content.length >= 8 && /[\u4e00-\u9fa5]/.test(content);
      });
  }
}

/**
 * 基于方法论的选题评分
 * 
 * 评分维度：
 * 1. 黄金钩子要素（身份锁定、痛点尖叫、结果承诺）
 * 2. 选题四要素（热度、痛点、爽点、情感）
 * 3. 与子类型目标的匹配度
 */
function calculateTopicScore(
  content: string,
  subTypeId: string,
  highlights: string[]
): number {
  let score = 50; // 基础分

  // 1. 黄金钩子要素检测（最高+15分）
  // 身份锁定
  if (/[省市县区镇村]|北京|上海|广州|深圳|杭州|成都|注意|听好/.test(content)) {
    score += 5;
  }
  // 痛点尖叫
  if (/谁.*谁|千万别|后悔|坑|雷|亏|坑|必|一定|绝对/.test(content)) {
    score += 5;
  }
  // 结果承诺
  if (/看完|学会|知道|省|赚|少花|多赚|避坑|不踩/.test(content)) {
    score += 5;
  }

  // 2. 选题四要素检测（最高+15分）
  // 热度/时效性
  if (/最新|首次|独家|揭秘|真相|2024|2025|今年|今年/.test(content)) {
    score += 4;
  }
  // 痛点直击
  if (/困扰|问题|怎么办|如何解决|为什么|怎么|啥/.test(content)) {
    score += 4;
  }
  // 爽点（获得感）
  if (/省钱|快速|简单|轻松|秘籍|方法|技巧|妙招/.test(content)) {
    score += 4;
  }
  // 情感共鸣
  if (/为什么|凭什么|凭什么不|为什么总是|到底|究竟/.test(content)) {
    score += 3;
  }

  // 3. 数字元素（增强可信度）
  if (/\d+个|\d+招|\d+种|\d+步|\d+块|\d+万|\d+%/.test(content)) {
    score += 5;
  }

  // 4. 长度适中（15-35字最佳）
  if (content.length >= 15 && content.length <= 35) {
    score += 3;
  } else if (content.length < 10 || content.length > 50) {
    score -= 5; // 过短或过长扣分
  }

  // 5. 亮点标签加分
  score += Math.min(highlights.length * 2, 6);

  // 6. 子类型匹配度加分
  const subTypeMatchPatterns: Record<string, RegExp> = {
    traffic_a: /揭秘|真相|谎言|反差|争议/, // 破圈引流
    traffic_b: /你|你们|是不是|有没有/, // 建立链接
    conversion_a: /对比|测评|推荐|效果|省钱/, // 促进转化
    conversion_b: /可能|其实|原来|没想到/, // 培育需求
    persona_a: /我为什么|我坚持|我的看法|我认为/, // 强化共鸣
    persona_b: /经验|建议|避坑|踩过|做过/, // 建立信任
  };
  
  const matchPattern = subTypeMatchPatterns[subTypeId];
  if (matchPattern && matchPattern.test(content)) {
    score += 3;
  }

  // 7. 语言风格检查（口语化加分，书面化扣分）
  // 书面化词汇扣分
  if (/的反直觉|蒙蔽|综上所述|由此可见|不难看出|值得注意的是/.test(content)) {
    score -= 5;
  }
  // 口语化表达加分
  if (/这块儿|这事儿|这玩意儿|这东西|这招儿/.test(content)) {
    score += 2;
  }

  // 确保分数在40-70区间
  return Math.min(70, Math.max(40, score));
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  let userIdForRefund: number | null = null;
  let consumedForRefund = 0;
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

    const userId = await getSessionUserId(token);
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
    const powerCheck = await consumePower(userId, 'topic_batch', 0);
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
      industry, 
      customerId, 
      customerName, 
      ipPositioning, 
      creationMode = 'humanity',
      strategy = 'normal',
      audienceType = 'intention',
      hotspotKeyword = '',
      featureTheme = '',
      otherInfo = '',
      businessGoal = 'none',
      countPerType = 5,
      // 新增：深度分析参数
      userProfile,
      painPoints,
      demandPoints,
      pleasurePoints,
      itchPoints,
    } = await request.json();

    console.log('API operation event');

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const context = {
      industry,
      featureTheme,
      otherInfo,
      ipPositioning,
      customerName,
      audienceType,
      strategy,
      hotspotKeyword,
      businessGoal,
      countPerType,
      userProfile,
      painPoints,
      demandPoints,
      pleasurePoints,
      itchPoints,
      creationMode, // 新增：创作模式
    };

    // 记录已扣除的算力，用于失败时退还
    const consumedPowerRef = { value: powerCheck.consumed || 0 };
    const userIdRef = { value: userId };
    userIdForRefund = userId;
    consumedForRefund = consumedPowerRef.value;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 0. 先从知识库获取选题方法论（新增）
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress',
            stage: 'knowledge',
            message: '正在加载选题方法论...',
          })}\n\n`));

          // 构建知识库搜索查询
          const knowledgeSearchQuery = `${context.industry || ''} ${context.featureTheme || ''} 选题方法 爆款选题`.trim();
          let knowledgeContext = '';
          
          try {
            const knowledgeResult = await searchKnowledge(knowledgeSearchQuery, request, 2, 0.5);
            if (knowledgeResult.success && knowledgeResult.context) {
              knowledgeContext = knowledgeResult.context;
              console.log('API operation event');
            }
          } catch (error) {
            console.error('API operation event');
            // 继续执行，使用内置方法论
          }

          // 1. 首先生成人群分析
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'progress',
            stage: 'analysis',
            message: '正在分析目标人群...',
          })}\n\n`));

          const audienceAnalysis = await generateAudienceAnalysis(client, context, customHeaders);
          
          // 发送人群分析结果
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'audience_analysis',
            data: audienceAnalysis,
          })}\n\n`));

          // 2. 按新分类生成选题
          const groupedTopics: NewGroupedTopics[] = [];
          const categoryEntries = Object.entries(TOPIC_CATEGORIES) as [keyof typeof TOPIC_CATEGORIES, typeof TOPIC_CATEGORIES[keyof typeof TOPIC_CATEGORIES]][];
          
          let totalGenerated = 0;

          for (const [categoryId, categoryInfo] of categoryEntries) {
            // 获取该分类下的子类型
            const subTypes = Object.entries(TOPIC_SUB_TYPES)
              .filter(([_, info]) => info.parentId === categoryId) as [string, typeof TOPIC_SUB_TYPES[keyof typeof TOPIC_SUB_TYPES]][];

            const subGroups: NewGroupedTopics['subGroups'] = [];

            for (const [subTypeId, subTypeInfo] of subTypes) {
              // 发送进度
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'progress',
                stage: 'generating',
                message: `正在生成${categoryInfo.label} - ${subTypeInfo.name}选题...`,
                currentCategory: categoryInfo.label,
                currentSubType: subTypeInfo.name,
              })}\n\n`));

              try {
                const topics = await generateTopicsForSubType(
                  client,
                  categoryId as 'traffic' | 'conversion' | 'persona',
                  subTypeId,
                  subTypeInfo,
                  { ...context, audienceAnalysis, creationMode },
                  customHeaders,
                  knowledgeContext || undefined // 传递知识库内容
                );
                
                totalGenerated += topics.length;

                subGroups.push({
                  subTypeId,
                  subType: subTypeInfo.subType,
                  name: subTypeInfo.name,
                  goal: subTypeInfo.goal,
                  topics,
                });

                // 发送该子类型的结果
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'topics',
                  categoryId,
                  categoryInfo: {
                    id: categoryInfo.id,
                    name: categoryInfo.name,
                    label: categoryInfo.label,
                    icon: categoryInfo.icon,
                    color: categoryInfo.color,
                    bgColor: categoryInfo.bgColor,
                  },
                  subTypeId,
                  subTypeInfo: {
                    name: subTypeInfo.name,
                    goal: subTypeInfo.goal,
                    subType: subTypeInfo.subType,
                  },
                  topics,
                })}\n\n`));
              } catch (error) {
                console.error('API operation event');
                subGroups.push({
                  subTypeId,
                  subType: subTypeInfo.subType,
                  name: subTypeInfo.name,
                  goal: subTypeInfo.goal,
                  topics: [],
                });
              }
            }

            if (subGroups.some(sg => sg.topics.length > 0)) {
              groupedTopics.push({
                categoryId,
                categoryInfo,
                subGroups,
              });
            }
          }

          // 3. 发送完成信号
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done',
            version: '2.0',
            audienceAnalysis,
            groupedTopics,
            total: totalGenerated,
          })}\n\n`));
          
          controller.close();
        } catch (streamError) {
          console.error('API operation event');
          // 失败时返还算力
          const refundAmount = consumedPowerRef.value > 0 ? consumedPowerRef.value : 800;
          await refundPower(userIdRef.value, refundAmount, `批量选题生成失败: ${(streamError instanceof Error ? 'Request failed' : '流式错误').slice(0, 50)}`);
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
      await refundPower(userIdForRefund, consumedForRefund || 800, `批量选题生成异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    }
    return new Response(
      JSON.stringify({ error: '服务暂时不可用，如已扣费请联系管理员核对，自动退款尚未启用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
