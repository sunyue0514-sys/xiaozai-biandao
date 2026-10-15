/**
 * 提示词构建器 - 按需取用知识片段
 * 
 * 核心原则：
 * 1. 根据参数精准匹配知识，不相关的坚决不给
 * 2. 知识库是"工具箱"，不是"参考书"
 * 3. 每个场景只看到它需要的知识
 */

import {
  SCRIPT_TYPE_KNOWLEDGE,
  HOOK_KNOWLEDGE,
  PSYCHOLOGICAL_TACTICS_KNOWLEDGE,
  TOPIC_METHOD_KNOWLEDGE,
  QIANCHUAN_KNOWLEDGE,
  getKnowledgeForScriptType,
  getKnowledgeForTopicMode,
  getKnowledgeForQianchuan,
  getAllConstraintsPrompt,
  getConstraintsForScriptType,
  // 通用创作评估；保留历史接口名称。
  getXuehuiCoreFrameworkPrompt,
  type ScriptType,
  type TopicMode,
  type Strategy,
  type BusinessGoal,
  type AudienceType,
} from './prompt-knowledge-map';

// 导入IP36计配置
import {
  IP36_CATEGORIES,
  getTechniqueById,
  type IP36Technique,
} from './ip36-config';

// ============================================
// 选题提示词构建
// ============================================

/**
 * 构建选题系统提示词
 * 
 * @param mode - 创作模式：humanity（人性爆款）/ audience（人群选题）
 * @param strategy - 生成策略
 * @param audienceType - 目标人群类型
 * @param contentType - 内容类型
 * @param businessGoal - 商业目标
 */
export function buildTopicSystemPrompt(options: {
  mode: TopicMode;
  strategy: Strategy;
  audienceType?: AudienceType;
  contentType?: string;
  businessGoal?: BusinessGoal;
}): string {
  const { mode, strategy, audienceType, contentType, businessGoal } = options;

  let prompt = `你是一位专业的短视频选题策划师。

`;

  // ========== 1. 核心方法论 ==========
  prompt += buildTopicKnowledgePrompt(mode);

  // ========== 2. 语言风格约束（确保标题不书面化） ==========
  prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";

  // ========== 3. 目标人群（人群选题法专属） ==========
  if (mode === 'audience' && audienceType) {
    prompt += buildAudiencePrompt(audienceType);
  }

  // ========== 4. 生成策略 ==========
  prompt += buildStrategyPrompt(strategy);

  // ========== 5. 商业目标 ==========
  if (businessGoal && businessGoal !== 'none') {
    prompt += buildBusinessGoalPrompt(businessGoal);
  }

  // ========== 6. 内容类型 ==========
  if (contentType) {
    prompt += buildContentTypePrompt(contentType);
  }

  return prompt;
}

/**
 * 选题方法论提示词
 */
function buildTopicKnowledgePrompt(mode: TopicMode): string {
  const knowledge = getKnowledgeForTopicMode(mode);
  
  let prompt = `【核心方法论：${knowledge.method.name}】

${knowledge.method.description}

步骤：
${knowledge.method.steps.join('\n')}

示例：
- 行业关键词：${knowledge.method.example.industry.join('、')}
- 目标受众关键词：${knowledge.method.example.audience.join('、')}
- 组合结果：${knowledge.method.example.result}

`;

  // 雷达图评估（通用）
  prompt += `
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
${knowledge.radar.map(d => `- ${d.name}：${d.description}`).join('\n')}

`;

  // 人性爆款选题法 - 添加心理战术
  if (mode === 'humanity') {
    prompt += `【人性驱动力】

运用人性驱动力设计选题：

${Object.entries(PSYCHOLOGICAL_TACTICS_KNOWLEDGE).map(([key, value]) => 
  `- ${value.name}：${value.formula}`
).join('\n')}

`;
  }

  return prompt;
}

/**
 * 目标人群提示词
 */
function buildAudiencePrompt(audienceType: AudienceType): string {
  const audienceMap: Record<AudienceType, { name: string; desc: string; focus: string; examples: string[] }> = {
    intention: {
      name: '意向用户',
      desc: '已有购买意向，正在对比选择',
      focus: '关注性价比、对比测评、使用体验、购买建议',
      examples: ['测评对比类', '价格分析类', '使用教程类', '优惠信息类'],
    },
    awareness: {
      name: '意识用户',
      desc: '有痛点意识但未考虑解决方案',
      focus: '问题分析、痛点共鸣、解决方案科普',
      examples: ['痛点挖掘类', '问题分析类', '方法科普类', '案例分享类'],
    },
    potential: {
      name: '潜在用户',
      desc: '有潜在需求但未意识到',
      focus: '激发需求、创造场景、引发思考',
      examples: ['场景代入类', '认知刷新类', '趋势预测类', '利益诱惑类'],
    },
    mass: {
      name: '大众用户',
      desc: '无明确需求，泛娱乐向',
      focus: '吸引注意力、蹭热点、引发好奇',
      examples: ['热点解读类', '趣味科普类', '情感共鸣类', '猎奇探秘类'],
    },
  };

  const audience = audienceMap[audienceType];
  
  return `【目标人群：${audience.name}】

人群特征：${audience.desc}
选题重点：${audience.focus}
推荐选题类型：${audience.examples.join('、')}

`;
}

/**
 * 生成策略提示词
 */
function buildStrategyPrompt(strategy: Strategy): string {
  const strategyMap: Record<Strategy, { name: string; instruction: string }> = {
    normal: {
      name: '常规模式',
      instruction: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    },
    differentiation: {
      name: '高差异化模式',
      instruction: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    },
    exploration: {
      name: '探索模式',
      instruction: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    },
    hotspot: {
      name: '热点模式',
      instruction: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    },
  };

  const s = strategyMap[strategy];
  
  return `【生成策略：${s.name}】

${s.instruction}

`;
}

/**
 * 商业目标提示词
 */
function buildBusinessGoalPrompt(goal: BusinessGoal): string {
  const goalMap: Record<BusinessGoal, string> = {
    none: '',
    conversion: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    growth: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    brand: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    community: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
  };

  const instruction = goalMap[goal];
  if (!instruction) return '';

  return `【商业目标】

${instruction}

`;
}

/**
 * 内容类型提示词
 */
function buildContentTypePrompt(contentType: string): string {
  const typeMap: Record<string, { desc: string; tips: string }> = {
    '讲故事': {
      desc: '最能立人设、建立信任的内容',
      tips: '通过真实故事展现人物性格、价值观，建立情感连接',
    },
    '晒过程': {
      desc: '秀手艺展实力，最利于成交的内容',
      tips: '展示工作过程、项目案例、服务细节，用实力说话',
    },
    '教知识': {
      desc: '创作成本低，吸引精准粉丝的内容',
      tips: '分享专业知识、实用技巧、行业干货，建立专家形象',
    },
    '说观点': {
      desc: '引发共鸣认同、关注讨论的内容',
      tips: '表达态度、观点、价值观，引发用户共鸣和讨论',
    },
    '说产品': {
      desc: '直接介绍产品服务，促进转化',
      tips: '展示产品优势、服务特色、客户案例',
    },
  };

  const type = typeMap[contentType];
  if (!type) return '';

  return `【内容类型：${contentType}】

${type.desc}
${type.tips}

`;
}

// ============================================
// 文案创作提示词构建
// ============================================

/**
 * 构建文案创作系统提示词
 * 
 * @param scriptType - 脚本类型
 * @param creationMode - 创作模式
 */
export function buildWritingSystemPrompt(options: {
  scriptType: ScriptType;
  creationMode: 'original' | 'rewrite';
}): string {
  const { scriptType, creationMode } = options;

  let prompt = `你是一位专业的短视频文案创作专家。

`;

  // ========== 1. 脚本结构（只拿对应类型） ==========
  prompt += buildScriptStructurePrompt(scriptType);

  // 通用创作评估；保留历史接口名称。
  prompt += getXuehuiCoreFrameworkPrompt(scriptType);

  // ========== 3. 创作约束（解决"味儿不对"问题） ==========
  prompt += getConstraintsForScriptType(scriptType);

  // ========== 4. 仿写规则（仿写模式专属） ==========
  if (creationMode === 'rewrite') {
    prompt += buildRewritePrompt();
  }

  // ========== 5. 输出格式要求（必须放在最后，确保格式不变） ==========
  prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。\n仅输出符合以下字段结构的JSON，示例字符串请替换为实际生成内容：\n{\n  \"copywritings\": [\n    {\n      \"coverTitles\": [\n        \"示例\",\n        \"示例\",\n        \"示例\"\n      ],\n      \"content\": \"示例\"\n    },\n    {\n      \"coverTitles\": [\n        \"示例\",\n        \"示例\",\n        \"示例\"\n      ],\n      \"content\": \"示例\"\n    }\n  ]\n}";

  return prompt;
}

/**
 * 脚本结构提示词（只包含相关内容）
 */
function buildScriptStructurePrompt(scriptType: ScriptType): string {
  const knowledge = getKnowledgeForScriptType(scriptType);
  
  let prompt = `【脚本结构：${knowledge.script.name}】

模型：${knowledge.script.model}
${knowledge.script.description}

结构：
${knowledge.script.structure.map((s, i) => `${i + 1}. ${s}`).join('\n')}

关键要点：
${knowledge.script.keyPoints.map(p => `• ${p}`).join('\n')}

`;

  // 只添加推荐的钩子（不是全部16个）
  prompt += `【推荐钩子 - 适合${knowledge.script.name}】

${knowledge.hooks.map(h => `【${h.name}】
公式：${h.formula}
模板：${h.templates[0]}
示例：${h.examples[0]}`).join('\n\n')}

`;

  // 只添加推荐的心理战术
  if (knowledge.tactics.length > 0) {
    prompt += `【心理战术】

${knowledge.tactics.map(t => `【${t.name}】（${t.intensity}）
公式：${t.formula}`).join('\n\n')}

`;
  }

  return prompt;
}

/**
 * 仿写规则提示词
 */
function buildRewritePrompt(): string {
  return "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";
}

// ============================================
// 脚本生成提示词构建
// ============================================

/**
 * 构建脚本生成系统提示词
 * 
 * @param scriptType - 脚本类型
 * @param shootingMethod - 拍摄方式
 * @param isRewrite - 是否仿写模式
 */
export function buildScriptSystemPrompt(options: {
  scriptType: ScriptType;
  shootingMethod?: string;
  isRewrite?: boolean;
}): string {
  const { scriptType, shootingMethod, isRewrite } = options;

  let prompt = `你是一位专业的短视频分镜头脚本编导。

`;

  // ========== 1. 脚本结构（只拿对应类型） ==========
  prompt += buildScriptStructurePrompt(scriptType);

  // ========== 2. 创作约束（解决"味儿不对"问题） ==========
  prompt += getConstraintsForScriptType(scriptType);

  // ========== 3. 拍摄方式 ==========
  if (shootingMethod) {
    prompt += buildShootingMethodPrompt(shootingMethod);
  }

  // ========== 4. 仿写规则 ==========
  if (isRewrite) {
    prompt += buildRewritePrompt();
  }

  // ========== 5. 输出格式 ==========
  prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";

  return prompt;
}

/**
 * 拍摄方式提示词
 */
function buildShootingMethodPrompt(method: string): string {
  const methodMap: Record<string, { desc: string; shots: string[] }> = {
    '口播': {
      desc: '对着镜头说话',
      shots: ['近景', '中景'],
    },
    '剧情': {
      desc: '有情节的故事',
      shots: ['全景', '中景', '近景', '特写'],
    },
    '记录': {
      desc: '真实记录过程',
      shots: ['全景', '中景', '近景'],
    },
  };

  const m = methodMap[method];
  if (!m) return '';

  return `【拍摄方式：${method}】

${m.desc}
适用景别：${m.shots.join('、')}

`;
}

// ============================================
// 千川素材提示词构建
// ============================================

/**
 * 构建千川素材系统提示词
 */
export function buildQianchuanSystemPrompt(): string {
  const knowledge = getKnowledgeForQianchuan();

  let prompt = `你是一位专业的千川广告素材创作专家。

`;

  // ========== 1. 黄金5秒 ==========
  prompt += `【黄金5秒法则】

${knowledge.golden5Seconds.principles.map((p: { type: string; formula: string }) => `- ${p.type}：${p.formula}`).join('\n')}

`;

  // ========== 2. 下单理由 ==========
  prompt += `【下单理由公式】

${knowledge.orderReasons.map((r: { type: string; formula: string }) => `- ${r.type}：${r.formula}`).join('\n')}

`;

  // ========== 3. 种草感技巧 ==========
  prompt += `【种草感技巧】

${knowledge.seedingTechniques.map((t: { wrong: string; right: string }) => `❌ 错误：${t.wrong}
✅ 正确：${t.right}`).join('\n\n')}

`;

  // ========== 4. 创作约束 ==========
  prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";

  prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";

  // ========== 5. 输出格式 ==========
  prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。\n仅输出符合以下字段结构的JSON，示例字符串请替换为实际生成内容：\n{\n  \"hookOpening\": {\n    \"content\": \"示例\",\n    \"hookTechnique\": \"示例\"\n  },\n  \"fullScript\": {\n    \"content\": \"示例\",\n    \"keyPoints\": [\n      \"示例\",\n      \"示例\"\n    ]\n  },\n  \"callToAction\": {\n    \"content\": \"示例\",\n    \"valuePromise\": \"示例\"\n  }\n}";

  return prompt;
}

// ============================================
// IP36计提示词构建
// ============================================

/**
 * 构建IP36计系统提示词
 * @param params - 参数对象
 */
export function buildIP36SystemPrompt(params: {
  techniqueId: string;  // 计策ID（字符串）
  category?: string;
  ipPositioning?: {
    identity?: string;      // 身份定位
    field?: string;         // 领域定位
    audience?: string;      // 受众定位
    style?: string;         // 风格定位
  };
  wordCount?: number;
}): string {
  const { techniqueId, ipPositioning, wordCount } = params;
  const technique = getTechniqueById(techniqueId);
  
  if (!technique) {
    return '';
  }
  
  const category = IP36_CATEGORIES.find(c => c.id === technique.categoryId);
  
  let prompt = '';
  
  // ========== 1. 角色定位 ==========
  prompt += `
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
${technique.name}
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
`;
  
  // ========== 2. IP定位约束 ==========
  if (ipPositioning) {
    prompt += `【客户IP定位约束 - 必须严格遵守】

`;
    
    if (ipPositioning.identity) {
      prompt += `身份定位：${ipPositioning.identity}
`;
    }
    if (ipPositioning.field) {
      prompt += `领域定位：${ipPositioning.field}
`;
    }
    if (ipPositioning.audience) {
      prompt += `目标受众：${ipPositioning.audience}
`;
    }
    if (ipPositioning.style) {
      prompt += `内容风格：${ipPositioning.style}
`;
    }
    
    prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";
  }
  
  // ========== 3. 计策核心框架 ==========
  prompt += `【计策核心框架：${technique.name}】

类型归属：${category?.name || ''} - ${category?.desc || ''}

核心逻辑：${technique.logicAnchor}

`;
  
  // ========== 4. 标准结构 ==========
  prompt += `【标准文案结构】

`;
  technique.structure.forEach((step: string, index: number) => {
    prompt += `${index + 1}. ${step}
`;
  });
  
  // ========== 5. 必写元素 ==========
  prompt += `【必须包含的元素】

`;
  technique.requiredElements.forEach((element: string, index: number) => {
    prompt += `${index + 1}. ${element}
`;
  });
  
  prompt += `

`;
  
  // ========== 6. 禁忌红线 ==========
  prompt += `【绝对禁止】

`;
  technique.forbidden.forEach((item: string, index: number) => {
    prompt += `${index + 1}. ${item}
`;
  });
  
  prompt += `

`;
  
  // ========== 7. 语气要求 ==========
  prompt += `【语气风格要求】

${technique.toneRequirement}

`;
  
  // ========== 8. 通用技巧层 ==========
  prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";

  // ========== 9. 输出格式 ==========
  const techniqueName = technique.name;
  prompt += `
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
${techniqueName}
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
${techniqueName}
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
`;

  return prompt;
}

// ============================================
// 导出
// ============================================

export {
  SCRIPT_TYPE_KNOWLEDGE,
  HOOK_KNOWLEDGE,
  PSYCHOLOGICAL_TACTICS_KNOWLEDGE,
};
