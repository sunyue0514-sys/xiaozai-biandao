/**
 * 智能推导创作 - 正文生成提示词
 * 根据框架和开篇生成完整文案
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

所有文案必须：
1. 符合账号身份定位，表达专业可靠
2. 考虑目标用户的理解能力和需求痛点
3. 保持语言风格一致，有辨识度
4. 有账号独特的视角和个人特色
5. 禁止偏离定位说与账号无关的内容`;
}

/**
 * 仿写核心概念
 */
export const REWRITE_CORE_CONCEPT = `【仿写核心概念】
仿写 = 学习结构 + 替换身份 + 保持风格

不是简单替换文字，而是：
1. 学习原文的叙事逻辑和结构节奏
2. 将主人公/场景/案例替换为符合自己人设的元素
3. 保持原文的情绪曲线和语言风格
4. 最终产出"听起来像你会说的"内容`;

/**
 * 仿写执行步骤
 */
export const REWRITE_EXECUTION_STEPS = `【仿写执行步骤】
Step 1: 身份映射
- 分析原主人公的身份特征
- 找到自己与原主人公的共同点
- 保留"共性"，替换"个性"

Step 2: 场景迁移
- 将原文场景替换为自己的真实经历场景
- 保持场景的"功能"（引发共鸣、说明问题等）
- 让场景更真实可信

Step 3: 案例替换
- 替换为符合自己领域的真实案例
- 保持案例的"冲击感"
- 案例要具体、有细节

Step 4: 风格适配
- 调整措辞为自己的口头禅
- 调整语序为自己的说话节奏
- 确保读起来"像自己说的"`;

/**
 * 金句设计要求
 */
export const GOLDEN_SENTENCE_GUIDE = `【金句设计】
金句特点：
- 短小精悍，10-20字
- 朗朗上口，便于传播
- 有道理有共鸣
- 可以独立成句被引用

金句位置建议：
- 结尾升华：用一句有态度的话收尾，让人想转发
- 转折点：在内容高潮处插入，强化记忆
- 自嘲式：用自嘲拉近与观众的距离

金句类型参考：
- 态度金句："xxx不是xxx，是xxx"
- 总结金句："说到底，xxx"
- 自嘲金句："我也曾经xxx，但我后来发现xxx"
- 洞察金句："其实xxx背后是xxx"`;

/**
 * 情绪曲线设计
 */
export const EMOTION_CURVE_GUIDE = `【情绪曲线设计】
口播内容的情绪节奏：

1. 开头（前3-5秒）：引发好奇或共鸣
   - 用钩子抓住注意力
   - 不要一上来就说结论

2. 中段（5-30秒）：建立连接和信息传递
   - 层层递进，逻辑清晰
   - 适当制造小高潮
   - 保持节奏感，不拖沓

3. 结尾（最后5-10秒）：升华和行动指引
   - 用金句升华主题
   - 或用问句引发互动
   - 不要突然结束`;

/**
 * 构建正文生成的 System Prompt
 */
export function buildContentSystemPrompt(params: {
  topic: string;
  opening: string;
  framework: Record<string, unknown>;
  contentType: string;
  ipPositioning?: IPPositioning;
  customerName?: string;
  targetUsers?: string;
  differentiator?: string;
  wordCount?: number;
}): string {
  const {
    topic,
    opening,
    framework,
    contentType,
    ipPositioning,
    customerName,
    targetUsers,
    differentiator,
    wordCount = 600,
  }: {
    topic: string;
    opening: string;
    framework: Record<string, unknown>;
    contentType: string;
    ipPositioning?: IPPositioning;
    customerName?: string;
    targetUsers?: string;
    differentiator?: string;
    wordCount?: number;
  } = params;

  let prompt = `【创作任务：文案生成】

你是短视频口播文案专家，负责根据框架生成完整的口播文案。

【选题】${topic}
【内容类型】${contentType}
【选定开篇】${opening}
【框架结构】
${JSON.stringify(framework, null, 2)}

【字数要求】约${wordCount}字（约${Math.round(wordCount / 150 * 60)}秒口播）

【文案要求】
1. 开头必须使用选定的开篇
2. 按照框架结构逐段展开
3. 口语化表达，像是在跟朋友聊天
4. 每段要有明确的承接，不要跳跃
5. 中间段落要有节奏感，不要平铺直叙
6. 结尾要有升华感或金句
7. 禁止使用绝对化词汇（"肯定"、"绝对"、"都"等）
8. 禁止使用Markdown格式
9. 禁止使用emoji

${GOLDEN_SENTENCE_GUIDE}

${EMOTION_CURVE_GUIDE}

【输出格式】
直接输出文案内容，不要加任何格式前缀。
第一行开始就是文案正文。
文案要一气呵成，可以有自然的段落分隔。`;

  // 添加 IP 约束
  if (ipPositioning) {
    prompt += '\n\n' + buildIPConstraints(ipPositioning);
  }

  // 添加目标用户约束
  if (targetUsers) {
    prompt += `\n\n【目标用户约束】
- 主要目标用户：${targetUsers}
- 用这个人群体能理解的语言和表达方式
- 内容要贴合这个人群的实际需求`;
  }

  // 添加差异化约束
  if (differentiator) {
    prompt += `\n\n【差异化方向】
${differentiator}
- 文案要体现这个差异化，不要写成通用内容
- 避免套路化表达`;
  }

  prompt += `

【⚠️ 身份自检 - 生成前必须检查】
□ 是否以"${ipPositioning?.identity?.title || '创作者'}"视角创作？
□ 案例是否来自"${ipPositioning?.domain || '专业领域'}"？
□ 表达方式是否符合"${targetUsers || '目标用户'}"的理解水平？
□ 有没有出现与身份不符的案例或表达？（如有则删除替换）

【⚠️ 内容安全检查】
- 禁止绝对化表述
- 禁止虚假宣传
- 禁止攻击性言论
- 禁止违反平台规范的内容`;

  return prompt;
}

/**
 * 文案微调提示词
 */
export function buildRefineSystemPrompt(params: {
  originalContent: string;
  topic: string;
  framework: Record<string, unknown>;
  contentType: string;
  instruction: string;
  ipPositioning?: IPPositioning;
  customerName?: string;
}): string {
  const { originalContent, topic, framework, contentType, instruction, ipPositioning, customerName } = params;

  let prompt = `【创作任务：文案微调】

你是短视频文案编辑，负责根据用户指令修改文案。

【原始文案】
${originalContent}

【选题】${topic}
【内容类型】${contentType}
【框架结构】
${JSON.stringify(framework, null, 2)}

【修改指令】
${instruction}

【修改要求】
1. 保持原文案的框架结构和核心观点
2. 按照修改指令进行调整
3. 调整后要自然流畅，不能有拼接感
4. 保持口语化表达风格
5. 保持人设特色
6. 字数可以适当调整

【输出格式】
直接输出修改后的文案，不要加任何前缀说明。`;

  // 添加 IP 约束
  if (ipPositioning) {
    prompt += '\n\n' + buildIPConstraints(ipPositioning);
  }

  return prompt;
}

/**
 * 文案最终自检提示词
 */
export function buildContentSelfCheckPrompt(params: {
  content: string;
  topic: string;
  opening: string;
  framework: Record<string, unknown>;
  contentType: string;
  ipPositioning?: IPPositioning;
  differentiator?: string;
}): string {
  const { content, topic, opening, framework, contentType, ipPositioning, differentiator } = params;

  let prompt = `【文案最终自检】

请对以下文案进行全面的质量检查：

【选题】${topic}
【内容类型】${contentType}
【选定开篇】${opening}
【框架结构】
${JSON.stringify(framework, null, 2)}

【文案全文】
${content}`;

  if (differentiator) {
    prompt += `\n\n【差异化要求】${differentiator}`;
  }

  prompt += `

【自检维度】
1. ✅ 开篇是否正确使用了选定的开篇？
2. ✅ 框架结构是否完整？（每个段落都有展开吗？）
3. ✅ 内容是否贴合人设？（有人设的味道吗？）
4. ✅ 是否口语化、自然？（像是在聊天吗？）
5. ✅ 是否有金句设计？（有让人想转发的句子吗？）
6. ✅ 情绪曲线是否合理？（有节奏感吗？）
7. ✅ 是否体现差异化方向？
8. ✅ 是否有违禁词或绝对化表述？
9. ✅ 字数是否合适？（500-800字）
10. ✅ 是否有明显的废话或重复？

【输出格式】
\`\`\`json
{
  "passed": true/false,
  "score": 1-10,
  "checks": [
    { "item": "检查项", "passed": true/false, "reason": "原因" }
  ],
  "suggestions": ["如果有改进空间，列出建议"]
}
\`\`\``;

  return prompt;
}
