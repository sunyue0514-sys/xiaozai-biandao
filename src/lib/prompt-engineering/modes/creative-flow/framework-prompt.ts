/**
 * 智能推导创作 - 框架设计提示词
 * 根据选题特征生成推荐框架结构
 */

import { CONTENT_TYPES, type ContentType } from './topic-prompt';

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

所有框架必须：
1. 符合账号身份定位
2. 考虑目标用户的理解能力
3. 保持语言风格的一致性`;
}

/**
 * 框架类型定义
 */
export const FRAMEWORK_TYPES = {
  identityContrast: {
    id: 'identityContrast',
    name: '身份反差型',
   适用场景: ['个人IP', '成长逆袭', '身份转型'],
    结构: ['抛出反差', '拆解本质', '方法论', '结果', '升华'],
    爆点: '反差本身就是爆点',
  },
  contrastImpact: {
    id: 'contrastImpact',
    name: '对比冲击型',
    适用场景: ['测评对比', '方法PK', '过去vs现在'],
    结构: ['设置对照', '对比展示', '结论'],
    爆点: '数据对比冲击',
  },
  problemSolving: {
    id: 'problemSolving',
    name: '问题解答型',
    适用场景: ['教程干货', '常见误区', '方法分享'],
    结构: ['提出痛点', '层层拆解', '方案', '行动'],
    爆点: '解惑后的恍然大悟',
  },
  storyNarrative: {
    id: 'storyNarrative',
    name: '故事叙事型',
    适用场景: ['经历分享', '种草安利', '案例展示'],
    结构: ['场景切入', '冲突建立', '高潮', '结论'],
    爆点: '情节反转或金句升华',
  },
  cognitiveImpact: {
    id: 'cognitiveImpact',
    name: '认知冲击型',
    适用场景: ['观点输出', '热点评论', '反常识'],
    结构: ['反常识开头', '论证', '升华', '行动'],
    爆点: '颠覆认知的结论',
  },
  suspenseProgressive: {
    id: 'suspenseProgressive',
    name: '悬念递进型',
    适用场景: ['揭秘', '行业内幕', '探店'],
    结构: ['抛出悬念', '逐步揭开', '最终真相'],
    爆点: '揭秘的满足感',
  },
} as const;

export type FrameworkType = keyof typeof FRAMEWORK_TYPES;

/**
 * 框架与内容类型的推荐映射
 */
export const FRAMEWORK_CONTENT_MAP: Record<ContentType, FrameworkType[]> = {
  knowledge: ['problemSolving', 'contrastImpact', 'cognitiveImpact'],
  experience: ['storyNarrative', 'identityContrast', 'problemSolving'],
  opinion: ['cognitiveImpact', 'suspenseProgressive', 'contrastImpact'],
  product: ['problemSolving', 'contrastImpact', 'storyNarrative'],
};

/**
 * 内容类型到框架类型的名称映射
 */
const CONTENT_TO_FRAMEWORK_NAME: Record<ContentType, string[]> = {
  knowledge: ['问题解答型', '对比冲击型', '认知冲击型'],
  experience: ['故事叙事型', '身份反差型', '问题解答型'],
  opinion: ['认知冲击型', '悬念递进型', '对比冲击型'],
  product: ['问题解答型', '对比冲击型', '故事叙事型'],
};

/**
 * 构建框架生成的 System Prompt
 */
export function buildFrameworkSystemPrompt(params: {
  topic: string;
  contentType: ContentType;
  ipPositioning?: IPPositioning;
  customerName?: string;
  targetUsers?: string;
  differentiator?: string;
}): string {
  const {
    topic,
    contentType,
    ipPositioning,
    customerName,
    targetUsers,
    differentiator,
  }: {
    topic: string;
    contentType: ContentType;
    ipPositioning?: IPPositioning;
    customerName?: string;
    targetUsers?: string;
    differentiator?: string;
  } = params;
  const typeInfo = CONTENT_TYPES[contentType];
  const recommendedFrameworks = CONTENT_TO_FRAMEWORK_NAME[contentType];

  let prompt = `【创作任务：框架设计】

你是短视频内容结构专家，负责根据选题设计最佳的内容框架。

【选题】${topic}
【内容类型】${typeInfo.name}
【类型特点】${typeInfo.features.join('、')}
【推荐框架类型】${recommendedFrameworks.join('、')}（优先从这些类型中选择）

【框架类型说明】
1. 身份反差型：适合个人IP、成长逆袭内容。结构：抛出反差→拆解本质→方法论→结果→升华
2. 对比冲击型：适合测评、方法对比内容。结构：设置对照→对比展示→结论
3. 问题解答型：适合教程、干货内容。结构：提出痛点→层层拆解→方案→行动
4. 故事叙事型：适合经历分享、种草内容。结构：场景切入→冲突建立→高潮→结论
5. 认知冲击型：适合观点输出、反常识内容。结构：反常识开头→论证→升华→行动
6. 悬念递进型：适合揭秘、探店内容。结构：抛出悬念→逐步揭开→最终真相

【框架设计要求】
1. 根据选题特征推荐最合适的框架类型
2. 每段要有明确的"这一段要达成什么目的"
3. 说明每段要包含的关键元素
4. 预估字数（建议500-800字，60秒左右口播）
5. 分析这个框架的优势和可能产生爆点的位置

【输出格式】
\`\`\`json
{
  "framework": {
    "type": "框架类型",
    "name": "框架名称",
    "paragraphs": [
      {
        "index": 1,
        "name": "段落名称",
        "purpose": "这一段要达成什么目的",
        "elements": ["要包含的关键元素1", "关键元素2"],
        "wordCount": "预估字数"
      }
    ],
    "totalWordCount": "总字数预估",
    "estimatedDuration": "预估时长",
    "advantage": "这个框架的优势分析",
    "hotPointPosition": "可能产生爆点的位置"
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
- 框架设计要贴合这个人群的理解能力和关注点`;
  }

  // 添加差异化约束
  if (differentiator) {
    prompt += `\n\n【差异化方向】
${differentiator}
- 框架设计要体现这个差异化`;
  }

  prompt += `

【⚠️ 重要提醒】
- 严格以创作者人设视角设计内容框架
- 案例和表达方式要符合人设身份
- 避免写成通用框架，要有人设特色`;

  return prompt;
}

/**
 * 框架自检提示词
 */
export function buildFrameworkSelfCheckPrompt(params: {
  framework: Record<string, unknown>;
  topic: string;
  contentType: ContentType;
  ipPositioning?: IPPositioning;
}): string {
  const { framework, topic, contentType, ipPositioning } = params;
  const typeInfo = CONTENT_TYPES[contentType];

  let prompt = `【框架自检】

请对以下框架进行质量检查：

【选题】${topic}
【内容类型】${typeInfo.name}
【框架结构】
${JSON.stringify(framework, null, 2)}`;

  if (ipPositioning?.identity?.title) {
    prompt += `\n【人设身份】${ipPositioning.identity.title}`;
  }

  prompt += `

【自检维度】
1. ✅ 框架是否适合这个选题？（结构能承载选题内容吗？）
2. ✅ 是否贴合人设身份？（框架风格是否符合创作者定位？）
3. ✅ 段落结构是否清晰？（每段目的明确吗？）
4. ✅ 是否有爆点设计？（哪里可能产生传播？）
5. ✅ 字数和时长是否合适？（60秒口播约500-800字）

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
