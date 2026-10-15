/**
 * 智能推导创作 - 开篇生成提示词
 * 生成双版本开篇方案
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

所有开篇必须：
1. 符合账号身份定位和表达方式
2. 考虑目标用户的兴趣点
3. 保持语言风格一致
4. 自然地引入内容主题`;
}

/**
 * 开篇钩子类型
 */
export const HOOK_TYPES = {
  question: {
    id: 'question',
    name: '提问钩子',
    description: '用问题开场，引发好奇心',
    example: '"你有没有遇到过..."、"为什么..."',
  },
  conflict: {
    id: 'conflict',
    name: '冲突钩子',
    description: '设置冲突或对立，吸引注意力',
    example: '"不是...而是..."、"表面...实际..."',
  },
  number: {
    id: 'number',
    name: '数字钩子',
    description: '用具体数字开头，吸引眼球',
    example: '"3个技巧..."、"90%的人..."、"第1个..."',
  },
  counterIntuitive: {
    id: 'counterIntuitive',
    name: '反常识钩子',
    description: '颠覆用户认知，引发思考',
    example: '"其实你一直做错了..."、"不是...而是..."',
  },
  scene: {
    id: 'scene',
    name: '场景钩子',
    description: '用具体场景开场，增加代入感',
    example: '"你有没有遇到过..."、"昨天..."',
  },
  result: {
    id: 'result',
    name: '结果钩子',
    description: '先展示结果，吸引看完',
    example: '"用了这个方法，我..."、"终于..."',
  },
} as const;

export type HookType = keyof typeof HOOK_TYPES;

/**
 * 开篇与内容类型的推荐映射
 */
export const HOOK_CONTENT_MAP: Record<string, HookType[]> = {
  知识分享: ['question', 'counterIntuitive', 'number'],
  经验分享: ['scene', 'conflict', 'result'],
  观点输出: ['counterIntuitive', 'question', 'conflict'],
  '产品/服务介绍': ['result', 'question', 'scene'],
};

/**
 * 构建开篇生成的 System Prompt
 */
export function buildOpeningSystemPrompt(params: {
  topic: string;
  framework: Record<string, unknown>;
  contentType: string;
  ipPositioning?: IPPositioning;
  customerName?: string;
  targetUsers?: string;
  differentiator?: string;
}): string {
  const {
    topic,
    framework,
    contentType,
    ipPositioning,
    customerName,
    targetUsers,
    differentiator,
  }: {
    topic: string;
    framework: Record<string, unknown>;
    contentType: string;
    ipPositioning?: IPPositioning;
    customerName?: string;
    targetUsers?: string;
    differentiator?: string;
  } = params;

  let prompt = `【创作任务：开篇设计】

你是短视频开头设计专家，负责为内容生成具有强吸引力的开篇方案。

【选题】${topic}
【内容类型】${contentType}
【框架结构】
${JSON.stringify(framework, null, 2)}

【开篇要求】
1. 生成2个不同风格的开篇方案（开篇A和开篇B要有明显不同的钩子类型）
2. 每个开篇控制在20-50字
3. 开篇要能：
   - 3秒内抓住注意力
   - 引发好奇心或共鸣
   - 引出后续内容
4. 开篇要有"钩子感"，让人想继续看下去

【钩子类型参考】
1. 提问钩子：用问题开场，引发好奇心
   示例："你有没有遇到过..."、"为什么..."
2. 冲突钩子：设置冲突或对立，吸引注意力
   示例："不是...而是..."、"表面...实际..."
3. 数字钩子：用具体数字开头，吸引眼球
   示例："3个技巧..."、"90%的人..."
4. 反常识钩子：颠覆用户认知，引发思考
   示例："其实你一直做错了..."、"不是...而是..."
5. 场景钩子：用具体场景开场，增加代入感
   示例："你有没有遇到过..."、"昨天..."
6. 结果钩子：先展示结果，吸引看完
   示例："用了这个方法，我..."、"终于..."

【输出格式】
\`\`\`json
{
  "openingA": {
    "hookType": "钩子类型",
    "content": "开篇内容（20-50字）",
    "reason": "为什么这个开篇能抓住注意力"
  },
  "openingB": {
    "hookType": "钩子类型",
    "content": "开篇内容（20-50字）",
    "reason": "为什么这个开篇能抓住注意力"
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
- 开篇要贴合这个人群的语境和表达方式`;
  }

  // 添加差异化约束
  if (differentiator) {
    prompt += `\n\n【差异化方向】
${differentiator}
- 开篇要体现这个差异化风格`;
  }

  prompt += `

【⚠️ 重要提醒】
- 开篇要口语化、自然，像是在跟朋友聊天
- 避免太书面、太广告腔的表达
- 要有人设的味道，不是通用开场`;

  return prompt;
}

/**
 * 开篇自检提示词
 */
export function buildOpeningSelfCheckPrompt(params: {
  opening: string;
  hookType: string;
  topic: string;
  ipPositioning?: IPPositioning;
}): string {
  const { opening, hookType, topic, ipPositioning } = params;

  let prompt = `【开篇自检】

请对以下开篇进行质量检查：

【开篇】${opening}
【钩子类型】${hookType}
【选题】${topic}`;

  if (ipPositioning?.identity?.title) {
    prompt += `\n【人设身份】${ipPositioning.identity.title}`;
  }

  prompt += `

【自检维度】
1. ✅ 钩子是否有效？（3秒内能抓住注意力吗？）
2. ✅ 是否贴合人设身份？（有这个人设的味道吗？）
3. ✅ 是否口语化、自然？（不像广告腔？）
4. ✅ 是否引出后续内容？（能让人想继续看吗？）
5. ✅ 字数是否合适？（20-50字）

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
