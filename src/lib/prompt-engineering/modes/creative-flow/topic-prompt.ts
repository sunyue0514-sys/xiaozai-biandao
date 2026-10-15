/**
 * 智能推导创作 - 选题生成提示词
 * 根据内容类型、用户画像、差异化方向生成双版本选题
 */

/**
 * IP 定位类型
 */
interface IPPositioning {
  identity?: { title?: string; description?: string };
  domain?: string;
  targetAudience?: string[];
  toneAndStyle?: string;
  values?: string[];
  basicInfo?: string;
  positioningDirection?: string;
}

/**
 * IP 定位约束构建器
 */
function buildIPConstraints(ipPositioning: any): string {
  if (!ipPositioning) return '';
  
  const { identity, domain, targetAudience, toneAndStyle } = ipPositioning;
  
  return `
【IP定位约束 - 必须严格遵守】
- 账号身份：${identity?.title || '未设置'}
- 擅长领域：${domain || '未设置'}
- 目标用户：${targetAudience?.join('、') || '未设置'}
- 语言风格：${toneAndStyle || '未设置'}

所有选题必须：
1. 符合账号身份定位，不偏离专业领域
2. 考虑目标用户的认知水平和需求痛点
3. 保持语言风格的一致性
4. 具有账号独特视角和个人特色`;
}

/**
 * 内容类型定义
 */
export const CONTENT_TYPES = {
  knowledge: {
    name: '知识分享',
    description: '教别人一个技能或知识点',
    features: ['结构化', '有步骤', '有干货感'],
  },
  experience: {
    name: '经验分享',
    description: '分享自己的经历、踩坑、心得',
    features: ['故事感', '代入感', '有情绪'],
  },
  opinion: {
    name: '观点输出',
    description: '表达一个观点、态度、立场',
    features: ['有态度', '有论据', '能引发讨论'],
  },
  product: {
    name: '产品/服务介绍',
    description: '介绍自己的产品或服务',
    features: ['有价值感', '有信任感', '不硬广'],
  },
} as const;

export type ContentType = keyof typeof CONTENT_TYPES;

/**
 * 选题方向推荐
 */
export const CONTENT_DIRECTIONS = {
  knowledge: ['实用技巧', '避坑指南', '入门教程', '进阶方法', '常见误区'],
  experience: ['成长经历', '踩坑分享', '逆袭故事', '心得感悟', '真实记录'],
  opinion: ['热点评论', '态度表达', '认知刷新', '行业洞察', '价值观输出'],
  product: ['产品测评', '服务体验', '使用教程', '效果展示', '对比分析'],
} as const;

/**
 * 构建选题生成的 System Prompt
 */
export function buildTopicSystemPrompt(params: {
  contentType?: ContentType;
  ipPositioning?: IPPositioning;
  customerName?: string;
  targetUsers?: string;
  differentiator?: string;
}): string {
  const {
    contentType,
    ipPositioning,
    customerName,
    targetUsers,
    differentiator,
  }: {
    contentType?: ContentType;
    ipPositioning?: IPPositioning;
    customerName?: string;
    targetUsers?: string;
    differentiator?: string;
  } = params;

  // 默认使用知识分享类型
  const type = contentType || 'knowledge';
  const typeInfo = CONTENT_TYPES[type];
  const directions = CONTENT_DIRECTIONS[type];

  let prompt = `【创作任务：选题生成】

你是短视频内容策划专家，负责为人设账号生成具有爆款潜力的选题。

【内容类型】${typeInfo.name}
定义：${typeInfo.description}
风格要求：${typeInfo.features.join('、')}
建议方向：${directions.join('、')}、${directions[0]}等

【选题要求】
1. 生成3个选题，每个选题要有明确的爆点设计
2. 选题要口语化、接地气，适合短视频口播
3. 长度控制在15-30字
4. 避免标题党，但要有吸引力

【选题爆点类型】
- 身份代入型：利用目标用户的身份标签引发共鸣
- 数字冲击型：用具体数字吸引注意力
- 痛点共鸣型：戳中目标用户的痛点
- 反常识型：颠覆用户认知
- 结果导向型：展示明确的效果或结果

【输出格式】
请按以下JSON格式输出两套选题方案（方案A和方案B要有明显不同的角度）：

\`\`\`json
{
  "directionA": {
    "angle": "角度描述（如：实用技巧型）",
    "topics": [
      { "title": "选题1", "hotPoint": "爆点设计（如：身份代入+数字）", "reason": "为什么这个选题能火" },
      { "title": "选题2", "hotPoint": "爆点设计", "reason": "为什么这个选题能火" },
      { "title": "选题3", "hotPoint": "爆点设计", "reason": "为什么这个选题能火" }
    ]
  },
  "directionB": {
    "angle": "角度描述（如：痛点共鸣型）",
    "topics": [
      { "title": "选题1", "hotPoint": "爆点设计", "reason": "为什么这个选题能火" },
      { "title": "选题2", "hotPoint": "爆点设计", "reason": "为什么这个选题能火" },
      { "title": "选题3", "hotPoint": "爆点设计", "reason": "为什么这个选题能火" }
    ]
  }
}
\`\`\``;

  // 添加 IP 约束
  if (ipPositioning) {
    prompt += '\n\n' + buildIPConstraints(ipPositioning);
  }

  // 添加目标用户约束
  if (targetUsers) {
    prompt += `\n\n【目标用户约束】
- 主要目标用户：${targetUsers}
- 选题要贴合这个人群的关注点和痛点`;
  }

  // 添加差异化约束
  if (differentiator) {
    prompt += `\n\n【差异化方向】
${differentiator}
- 选题要体现这个差异化，不要写成通用内容`;
  }

  return prompt;
}

/**
 * 选题自检提示词
 */
export function buildTopicSelfCheckPrompt(params: {
  selectedTopic: string;
  contentType: ContentType;
  ipPositioning?: IPPositioning;
  targetUsers?: string;
  differentiator?: string;
}): string {
  const { selectedTopic, contentType, ipPositioning, targetUsers, differentiator } = params;
  const typeInfo = CONTENT_TYPES[contentType];

  let prompt = `【选题自检】

请对以下选题进行质量检查：

【选题】${selectedTopic}
【内容类型】${typeInfo.name}
【类型特点】${typeInfo.features.join('、')}`;

  if (ipPositioning?.identity?.title) {
    prompt += `\n【人设身份】${ipPositioning.identity.title}`;
  }
  if (targetUsers) {
    prompt += `\n【目标用户】${targetUsers}`;
  }
  if (differentiator) {
    prompt += `\n【差异化要求】${differentiator}`;
  }

  prompt += `

【自检维度】
1. ✅ 选题是否贴合人设身份？
2. ✅ 选题是否符合目标用户需求？
3. ✅ 是否有明确的爆点设计？
4. ✅ 是否体现差异化方向？
5. ✅ 是否适合短视频口播形式？
6. ✅ 是否有足够的传播潜力（让人想转发/收藏）？

【输出格式】
\`\`\`json
{
  "passed": true/false,
  "checks": [
    { "item": "检查项", "passed": true/false, "reason": "原因" }
  ],
  "suggestions": ["如果有问题，列出改进建议"]
}
\`\`\``;

  return prompt;
}
