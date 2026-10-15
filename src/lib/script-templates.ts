/**
 * 脚本生成模板
 * 用于生成结构化的分镜脚本输出
 * 
 * 按需取用知识：根据脚本类型只输出相关的钩子和心理战术
 */

import { CONTENT_SAFETY_PROMPT, GOLDEN_SENTENCE_PROMPT, EMOTION_DESIGN_PROMPT } from './system-prompts';
// 导入知识映射
import { 
  SCRIPT_TYPE_KNOWLEDGE, 
  HOOK_KNOWLEDGE, 
  PSYCHOLOGICAL_TACTICS_KNOWLEDGE,
  getKnowledgeForScriptType,
  type ScriptType 
} from './prompt-knowledge-map';

/**
 * 脚本类型配置
 */
export const SCRIPT_TYPE_CONFIG: Record<string, {
  name: string;
  description: string;
  structure: string;
  topicDirection?: string; // 选题方向建议
  example?: string; // 结构示例
}> = {
  story: {
    name: '讲故事',
    description: '通过故事传递观点或情感',
    structure: `开场悬念(0-5秒) → 背景铺垫(5-15秒) → 冲突困境(15-30秒) → 突破解决(30-45秒) → 金句升华(45-55秒) → 互动号召(55-60秒)`,
  },
  process: {
    name: '晒过程',
    description: '展示完整操作过程',
    structure: `结果展示(0-5秒) → 步骤1(5-15秒) → 步骤2(15-25秒) → 步骤3(25-35秒) → 步骤4+技巧(35-45秒) → 关键技巧特写(45-55秒) → 号召行动(55-60秒)`,
  },
  knowledge: {
    name: '教知识',
    description: '传授实用知识和技巧',
    structure: `痛点引入(0-5秒) → 知识点1+案例(5-20秒) → 知识点2+案例(20-35秒) → 知识点3+案例(35-50秒) → 总结+号召(50-60秒)`,
    topicDirection: '适合"如何做"、"几个技巧"、"避坑指南"等知识分享型选题',
  },
  opinion: {
    name: '聊观点',
    description: '表达鲜明观点态度',
    structure: `开头悬念(0-5秒，抛出争议问题) → 预告价值(5-10秒) → 先说结论(10-20秒，直接给出核心观点) → 论据1+案例(20-30秒) → 论据2+案例(30-40秒) → 论据3+案例(40-50秒) → 总结升华(50-55秒，金句收尾) → 互动号召(55-60秒)`,
    topicDirection: '适合有争议性、需要表达立场的话题，如"XX到底该不该"、"XX是好事还是坏事"',
    example: `正确示例（说观点）：
标题："老房翻新，到底该不该全拆重装？"
结构：开头抛出争议问题 → 预告今天说清楚 → 先给结论"90%的人第一步就错了" → 论据1：盲目拆等于埋雷 → 论据2：省钱的关键是规划 → 论据3：真实案例佐证 → 总结升华 → 互动

错误示例（不要写成教知识）：
标题："老房翻新必看的3个避坑点"
结构：知识点1罗列 → 知识点2罗列 → 知识点3罗列（这是教知识的结构，不是说观点！）`,
  },
  product: {
    name: '推产品',
    description: '产品种草和推广',
    structure: `痛点刺激(0-10秒) → 产品展示(10-25秒) → 效果证明(25-40秒) → 优惠信息(40-50秒) → 购买号召(50-60秒)`,
  },
};

/**
 * 拍摄方式配置
 */
export const SHOOTING_METHOD_CONFIG: Record<string, {
  name: string;
  description: string;
  shotTypes: string[];
  cameraPositions: string[];
}> = {
  talking_head: {
    name: '直面镜头讲述',
    description: '正对镜头讲解分享，适合教知识、聊观点、讲故事',
    shotTypes: ['近景', '中景', '特写'],
    cameraPositions: ['固定'],
  },
  follow_shot: {
    name: '跟拍记录',
    description: '跟随拍摄真实过程，适合晒过程、讲故事',
    shotTypes: ['中景', '全景'],
    cameraPositions: ['跟拍', '手持'],
  },
  fixed_angle: {
    name: '固定机位展示',
    description: '机位不动展示内容，适合教知识、晒过程',
    shotTypes: ['全景', '中景', '特写', '俯拍'],
    cameraPositions: ['固定'],
  },
  voice_over: {
    name: '画外音配画面',
    description: '只出声音不配人像，适合教知识',
    shotTypes: ['全景', '中景', '特写'],
    cameraPositions: ['固定'],
  },
  third_person: {
    name: '第三人称偷拍',
    description: '第三方视角记录，适合教知识、聊观点',
    shotTypes: ['中景', '全景'],
    cameraPositions: ['固定', '手持'],
  },
  selfie: {
    name: '手持自拍',
    description: '自己手持手机拍摄，适合晒过程、讲故事',
    shotTypes: ['近景', '中景'],
    cameraPositions: ['自拍', '手持'],
  },
};

/**
 * 构建脚本生成系统提示词（输出结构化JSON）
 * 按需取用知识：根据脚本类型只输出相关的钩子和心理战术
 * @param scriptType 脚本类型
 * @param shootingMethod 拍摄方式
 * @param wordCount 详细版目标字数（由AI根据原视频长度动态计算）
 * @param originalScriptLength 原视频文案长度（用于动态计算时长）
 */
export function buildScriptSystemPrompt(
  scriptType: string,
  shootingMethod: string,
  wordCount: number = 500,
  originalScriptLength?: number
): string {
  const typeConfig = SCRIPT_TYPE_CONFIG[scriptType] || SCRIPT_TYPE_CONFIG.story;
  const methodConfig = SHOOTING_METHOD_CONFIG[shootingMethod] || SHOOTING_METHOD_CONFIG.talking_head;
  
  // 🎯 按需取用：只获取与当前脚本类型相关的知识
  const knowledge = getKnowledgeForScriptType(scriptType as ScriptType);
  
  return `你是一位专业的短视频分镜头脚本编导，擅长创作可直接拍摄的专业脚本。

${CONTENT_SAFETY_PROMPT}

【📝 脚本结构：${knowledge.script.name}】

模型：${knowledge.script.model}

结构：
${knowledge.script.structure.map((s, i) => `${i + 1}. ${s}`).join('\n')}

关键要点：
${knowledge.script.keyPoints.map(p => `• ${p}`).join('\n')}

【🔥 推荐钩子 - 针对${knowledge.script.name}】
（前3秒定生死！使用以下钩子之一开头）

${knowledge.hooks.map(h => `【${h.name}】
公式：${h.formula}
模板：${h.templates[0]}
示例：${h.examples[0]}`).join('\n\n')}

【💡 心理战术】

${knowledge.tactics.map(t => `【${t.name}】（强度：${t.intensity}）
公式：${t.formula}`).join('\n\n')}

${GOLDEN_SENTENCE_PROMPT}

${EMOTION_DESIGN_PROMPT}

【脚本类型】${typeConfig.name} - ${typeConfig.description}
结构框架：${typeConfig.structure}
${typeConfig.topicDirection ? `选题方向：${typeConfig.topicDirection}` : ''}

【拍摄方式】${methodConfig.name} - ${methodConfig.description}
适用景别：${methodConfig.shotTypes.join('、')}
适用机位：${methodConfig.cameraPositions.join('、')}

【时长与字数计算规则 - 根据原视频动态调整】
${originalScriptLength ? `
原视频文案长度：${originalScriptLength}字
原视频大致时长：约${Math.round(originalScriptLength / 180)}分钟（按180字/分钟语速计算）

时长分配：
1. 精华版 = 原视频时长的 30%-40%（约${Math.round(originalScriptLength * 0.35 / 180 * 60)}秒）
   - 保留核心观点和结构
   - 精简细节和案例
   - 字数约${Math.round(originalScriptLength * 0.35)}字

2. 详细版 = 原视频时长的 90%-100%（约${Math.round(originalScriptLength * 0.95 / 180 * 60)}秒）
   - 完整展开所有细节
   - 字数约${Math.round(originalScriptLength * 0.95)}字
` : `
未提供原视频长度，按标准短视频时长计算：

时长分配：
1. 精华版：15-30秒，字数约150-200字
2. 详细版：60秒左右，字数约${wordCount}字
`}

═══════════════════════════════════════════════════════════════
【输出格式 - 双版本输出】
═══════════════════════════════════════════════════════════════

请直接输出JSON，不要包含任何其他文字说明。输出两个版本：

**版本一：精华版（15-30秒）**
- 字数约150-200字
- 保留核心观点和结构
- 适合快速拍摄、短视频平台传播

**版本二：详细版（完整版）**
- 字数约${wordCount}字
- 完整展开所有细节
- 适合深度内容、建立人设

JSON格式如下：

\`\`\`json
{
  "essentialVersion": {
    "basicInfo": {
      "title": "精华版标题",
      "publishCopywriting": "精华版发布文案",
      "duration": "20秒",
      "hashtags": ["#标签1", "#标签2"],
      "brandPartner": ""
    },
    "shots": [
      {
        "shotNumber": 1,
        "duration": "3秒",
        "shotType": "近景",
        "cameraPosition": "固定",
        "visual": "画面描述",
        "copywriting": "台词",
        "notes": "备注"
      }
    ],
    "shootingAdvice": "精华版拍摄建议"
  },
  "detailedVersion": {
    "basicInfo": {
      "title": "详细版标题",
      "publishCopywriting": "详细版发布文案",
      "duration": "60秒",
      "hashtags": ["#标签1", "#标签2", "#标签3"],
      "brandPartner": ""
    },
    "shots": [
      {
        "shotNumber": 1,
        "duration": "5秒",
        "shotType": "近景",
        "cameraPosition": "固定",
        "visual": "画面描述",
        "copywriting": "台词",
        "notes": "备注"
      }
    ],
    "shootingAdvice": "详细版拍摄建议"
  }
}
\`\`\`

═══════════════════════════════════════════════════════════════
【重要约束】
═══════════════════════════════════════════════════════════════

1. 必须输出完整的双版本JSON格式
${originalScriptLength ? `2. essentialVersion 字数约${Math.round(originalScriptLength * 0.35)}字，shots约5-8个
3. detailedVersion 字数约${Math.round(originalScriptLength * 0.95)}字，shots根据实际需要调整` : `2. essentialVersion 字数控制在150-200字，shots约5-8个
3. detailedVersion 字数约${wordCount}字，shots约10-15个`}
4. shotType必须从以下选项中选择：${methodConfig.shotTypes.join('、')}
5. cameraPosition必须从以下选项中选择：${methodConfig.cameraPositions.join('、')}
6. 台词要口语化，符合短视频节奏
7. 两个版本的核心观点和结构保持一致，只是详略不同

【禁止事项】
- 禁止使用emoji表情符号
- 禁止使用绝对化词汇（第一、最好、顶级、唯一等）
- 禁止生成违法违规内容
`;
}

/**
 * 参考视频对象类型
 */
interface ReferenceVideoObject {
  title?: string;
  scriptContent?: string;
  hashtags?: string[];
  stats?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
  track?: string;
  contentType?: string;
  highlight?: string;
  viralTags?: string[];
  platform?: string;
}

/**
 * 构建脚本生成用户消息
 * @param hasCustomerProfile 是否有客户档案（有档案时，应基于档案创作新内容）
 * @param generationMode 生成模式：'rewrite' 仿写模式输出多形态，'script' 脚本模式输出双版本
 */
export function buildScriptUserMessage(
  topic: string,
  scriptType: string,
  shootingMethod: string,
  context?: string,
  referenceVideo?: string | ReferenceVideoObject,
  hasCustomerProfile?: boolean,
  generationMode?: 'rewrite' | 'script'
): string {
  // 调试日志：确认参数传递
  console.log('[buildScriptUserMessage] 参数检查:', {
    hasTopic: !!topic,
    hasReferenceVideo: !!referenceVideo,
    referenceVideoIsObject: typeof referenceVideo === 'object',
    hasCustomerProfile,
    generationMode,
  });
  
  const typeConfig = SCRIPT_TYPE_CONFIG[scriptType] || SCRIPT_TYPE_CONFIG.story;
  const methodConfig = SHOOTING_METHOD_CONFIG[shootingMethod] || SHOOTING_METHOD_CONFIG.talking_head;
  
  let message = `请根据以下信息创作分镜头脚本：

【选题主题】
${topic}

【脚本类型】${typeConfig.name}

【拍摄方式】${methodConfig.name}
`;

  // 添加参考视频/文案
  if (referenceVideo) {
    console.log('[buildScriptUserMessage] 进入referenceVideo分支, generationMode:', generationMode);
    // 仿写模式：输出多形态格式
    if (generationMode === 'rewrite') {
      console.log('[buildScriptUserMessage] 进入多形态提示词分支!');
      // 有客户档案时，基于档案改写
      if (hasCustomerProfile) {
        message += `
【仿写模式 - 基于创作者档案改写】

你正在为特定的创作者IP仿写爆款脚本。

**仿写的核心原则：**
1. **保留话题**：原视频讲什么话题，新视频就讲什么话题
2. **保留结构**：原视频的逻辑流程和起承转合
3. **替换身份**：用创作者档案的身份替换原视频身份
4. **调整细节**：用创作者身份的行业背景和经历替换原行业细节

【参考爆款】
`;
      } else {
        // 无客户档案时，保留原风格改写
        message += `
【仿写模式 - 保留原风格改写】

你需要基于参考爆款进行仿写，保留其核心价值和爆款基因。

**仿写的核心原则：**
1. **保留话题**：原视频讲什么话题，新视频就讲什么话题
2. **保留结构**：原视频的逻辑流程和起承转合
3. **降维打击**：用更简洁、更有力的语言重构
4. **本土化表达**：符合中文短视频用户的阅读和听觉习惯

【参考爆款】
`;
      }
      
      if (typeof referenceVideo === 'object' && referenceVideo !== null) {
        const ref = referenceVideo as ReferenceVideoObject;
        if (ref.title) message += `标题：${ref.title}\n`;
        if (ref.scriptContent) {
          message += `\n完整文案：
${ref.scriptContent}
\n`;
        }
        if (ref.stats) {
          const statsParts: string[] = [];
          if (ref.stats.likes) statsParts.push(`点赞${ref.stats.likes}`);
          if (ref.stats.comments) statsParts.push(`评论${ref.stats.comments}`);
          if (ref.stats.shares) statsParts.push(`分享${ref.stats.shares}`);
          if (statsParts.length > 0) message += `\n数据表现：${statsParts.join('、')}（爆款验证，结构值得学习）\n`;
        }
      }
      
      message += `
【输出格式 - 仿写多形态】
请输出以下四种形态（JSON格式）：

**1️⃣ 爆款开头（黄金3秒钩子）**
- 长度：15-30字，1-2句话
- 目的：在前3秒抓住注意力，制造信息差或好奇心
- 技巧：使用钩子句式，直接抛出冲突或悬念，避免问好和自我介绍

**2️⃣ 完整口播文案**
- 长度：200-500字，适合1-3分钟视频
- 要求：完整保留核心观点和逻辑，口语化表达，自然融入情绪起伏

**3️⃣ 问答对话版（适合无脚本拍摄）**
- 格式：5-8个问答
- 用途：创作者可以用问答卡片引导拍摄，适合访谈类、Vlog类内容

**4️⃣ 行动号召**
- 长度：20-40字
- 目的：引导用户点赞、关注、评论、转发

输出格式：
\`\`\`json
{
  "hookOpening": {
    "content": "爆款开头的具体内容（15-30字）",
    "hookTechnique": "使用的钩子技巧（如：信息差、反常识、悬念等）",
    "emotionPoint": "情绪触发点（如：好奇、焦虑、认同等）"
  },
  "fullScript": {
    "content": "完整口播文案（200-500字）",
    "duration": "预估时长（如：1分30秒）",
    "keyPoints": ["核心观点1", "核心观点2", "核心观点3"],
    "emotionCurve": "情绪曲线描述"
  },
  "dialogueVersion": {
    "qaList": [
      {
        "question": "问题1",
        "answerHints": ["回答要点1", "回答要点2"]
      }
    ],
    "shootingTips": "拍摄建议"
  },
  "callToAction": {
    "content": "行动号召文案（20-40字）",
    "actionType": "引导类型",
    "valuePromise": "给用户的价值承诺"
  }
}
\`\`\`

现在开始输出（多形态格式 - JSON）：
\`\`\`json
`;
    }
  } else {
    console.log('[buildScriptUserMessage] 进入双版本分支! hasCustomerProfile:', hasCustomerProfile);
      // 脚本模式 + 有/无客户档案：输出双版本格式
      if (hasCustomerProfile) {
      message += `
【仿写模式 - 重要！】

你正在为特定的创作者IP仿写爆款脚本。

**仿写的核心原则：**
1. **保留话题**：原视频讲什么话题，新视频就讲什么话题
   - 原视频讲"创业故事"，新视频也讲"创业故事"
   - 原视频讲"行业观点"，新视频也讲"行业观点"
   
2. **保留结构**：原视频的逻辑流程和起承转合
   - 如果原视频是"抛问题→说结论→论据1→论据2→论据3→升华"
   - 新视频也用同样的结构流程
   
3. **替换身份**：原视频身份 → 创作者档案身份
   - 原视频：烧烤店老板
   - 新视频：美容店老板（从创作者档案中获取）
   
4. **调整细节**：用创作者身份的行业背景和经历替换原行业细节
   - 原细节：烤串、夜市、烧烤摊
   - 新细节：美容、护肤、美容院

【参考爆款】
`;
      if (typeof referenceVideo === 'object' && referenceVideo !== null) {
        const ref = referenceVideo as ReferenceVideoObject;
        if (ref.title) message += `标题：${ref.title}\n`;
        if (ref.scriptContent) {
          message += `\n完整文案（重点学习结构和话题）：
${ref.scriptContent}
\n`;
        }
        if (ref.stats) {
          const statsParts: string[] = [];
          if (ref.stats.likes) statsParts.push(`点赞${ref.stats.likes}`);
          if (ref.stats.comments) statsParts.push(`评论${ref.stats.comments}`);
          if (ref.stats.shares) statsParts.push(`分享${ref.stats.shares}`);
          if (statsParts.length > 0) message += `\n数据表现：${statsParts.join('、')}（爆款验证，结构值得学习）\n`;
        }
      }
      
      message += `
【仿写要求】
1. 深入理解原视频的话题和结构
2. 用创作者档案中的身份、行业、人设替换原视频的身份
3. 保持原视频的核心逻辑和情感节奏
4. 确保新内容与创作者档案完全匹配

【输出格式 - 必须输出两个版本】
请输出两个JSON对象：

**版本一：精华版（15-30秒，适合快速拍摄）**
- 字数约150-200字
- 保留核心观点和结构
- 适合短视频平台快节奏传播

**版本二：详细版（按原视频长度）**
- 字数与原视频相近
- 完整展开所有细节
- 适合深度内容、建立人设

输出格式：
\`\`\`json
{
  "essentialVersion": {
    "basicInfo": { ... },
    "shots": [ ... ],
    "shootingAdvice": "..."
  },
  "detailedVersion": {
    "basicInfo": { ... },
    "shots": [ ... ],
    "shootingAdvice": "..."
  }
}
\`\`\`

现在开始输出：`;
    } else {
      // 没有客户档案时，可以参考素材的内容进行仿写
      message += `
【参考素材】
`;
      if (typeof referenceVideo === 'string' && referenceVideo.trim()) {
        message += referenceVideo.trim();
      } else if (typeof referenceVideo === 'object' && referenceVideo !== null) {
        const ref = referenceVideo as ReferenceVideoObject;
        if (ref.title) message += `原标题：${ref.title}\n`;
        if (ref.scriptContent) {
          message += `提取文案：${ref.scriptContent.substring(0, 500)}${ref.scriptContent.length > 500 ? '...' : ''}\n`;
        }
        if (ref.contentType) message += `类型：${ref.contentType}\n`;
        if (ref.hashtags && ref.hashtags.length > 0) {
          message += `话题标签：${ref.hashtags.join(' ')}\n`;
        }
        if (ref.stats) {
          const statsParts: string[] = [];
          if (ref.stats.likes) statsParts.push(`点赞${ref.stats.likes}`);
          if (ref.stats.comments) statsParts.push(`评论${ref.stats.comments}`);
          if (ref.stats.shares) statsParts.push(`分享${ref.stats.shares}`);
          if (statsParts.length > 0) message += `数据表现：${statsParts.join('、')}\n`;
        }
        if (ref.track) message += `赛道：${ref.track}\n`;
        if (ref.highlight) message += `亮点：${ref.highlight}\n`;
        if (ref.viralTags && ref.viralTags.length > 0) {
          message += `爆款标签：${ref.viralTags.join('、')}\n`;
        }
      }
      message += `
请参考以上素材的风格、结构和表达方式，结合主题创作新的脚本。
`;
    }
  }

  // 只有在非仿写模式下才追加双版本格式
  if (generationMode !== 'rewrite') {
    if (context) {
      message += `
【补充要求】
${context}
`;
    }

    message += `
【输出格式 - 必须输出两个版本】
请输出两个JSON对象：

**版本一：精华版（15-30秒，适合快速拍摄）**
- 字数约150-200字
- 保留核心观点和结构
- 适合短视频平台快节奏传播

**版本二：详细版（按原视频长度）**
- 字数与原视频相近
- 完整展开所有细节
- 适合深度内容、建立人设

输出格式：
\`\`\`json
{
  "essentialVersion": {
    "basicInfo": { ... },
    "shots": [ ... ],
    "shootingAdvice": "..."
  },
  "detailedVersion": {
    "basicInfo": { ... },
    "shots": [ ... ],
    "shootingAdvice": "..."
  }
}
\`\`\`

现在开始输出（双版本格式 - JSON）：
\`\`\`json
`;
  } // 结束 if (generationMode !== 'rewrite')

  return message;
}

/**
 * 构建仿写多形态输出提示词（对标国外模型能力）
 * 输出四种形态：爆款开头、完整口播、问答对话版、行动号召
 */
export function buildRewriteMultiFormatPrompt(params: {
  originalScript: string;
  referenceVideoTitle?: string;
  referenceVideoPlatform?: string;
  targetPlatform?: string;
  targetAudience?: string;
}): string {
  const { originalScript, referenceVideoTitle, referenceVideoPlatform, targetPlatform = '抖音', targetAudience } = params;

  let prompt = `你是一位顶尖的内容创作者和脚本仿写专家，擅长将爆款视频脚本改造成多种呈现形式。

## 📋 任务说明
你需要基于原始爆款视频的文案，输出**四种不同形态**的脚本版本，让创作者可以根据拍摄场景和风格自由选择。

## 🎯 核心原则
1. **保留爆款基因**：提炼原视频的钩子、情绪点、转折点
2. **降维打击**：用更简洁、更有力的语言重构
3. **本土化表达**：符合中文短视频用户的阅读和听觉习惯
4. **去模板化**：避免生硬的"大家好""今天我们来聊"等开场白

## ⚠️ 创作约束（必须严格遵守）

### 语言风格约束
❌ 禁止使用书面化、作文式表达：
- 不要用长句，每句控制在10-20字
- 不要讲道理，要像跟朋友聊天
- 不要用"的反直觉真相"、"蒙蔽了判断"这种词

✅ 必须使用大白话、接地气的表达：
- 说人话，像跟朋友唠嗑
- 短句为主，念出来顺口
- 有情绪、有态度、有脾气

对比示例：
❌ 装修这件事，贪小便宜往往是吃大亏的开始
✅ 装修这块儿，你越想省钱，最后花得越多

### 细节画面约束
❌ 泛泛而谈，没有痛感：
- "淹了楼下" → 没感觉
- "贵了30%" → 没痛感

✅ 具体数字 + 画面感 + 痛感：
- "淹了楼下，赔了8万" → 有数字有痛感
- "原本10万，最后干到14万6" → 具体数字扎心

### 金句设计约束
✅ 文案中必须植入1-2句金句：
- 10个字左右，短狠记得住
- 一针见血，念出来顺口
- 有身份感，换人说了没那个味儿

示例：
- "装修第一步不是设计，是排雷"
- "你省的那点钱，最后都变成了教训"

## 📹 叠加信息
- 参考视频标题：${referenceVideoTitle || '未知'}
- 参考平台：${referenceVideoPlatform || '未知'}
- 目标平台：${targetPlatform}
- 目标受众：${targetAudience || '泛娱乐用户'}
`;

  prompt += `
## 📝 原始文案
\`\`\`
${originalScript}
\`\`\`

## ✨ 输出要求

请输出以下四种形态（JSON格式）：

### 1️⃣ 爆款开头（黄金3秒钩子）
- **长度**：15-30字，1-2句话
- **目的**：在前3秒抓住注意力，制造信息差或好奇心
- **技巧**：
  - 使用"你绝对想不到""很多人不知道""真相是..."等钩子句式
  - 直接抛出冲突、反常识、悬念
  - 避免问好、自我介绍等无效开场
- **示例风格**：
  - "这条视频可能会让你重新认识xxx"
  - "90%的人都搞错了xxx的真相"
  - "花了两周时间，终于找到了xxx的秘密"

### 2️⃣ 完整口播文案
- **长度**：200-500字，适合1-3分钟视频
- **要求**：
  - 完整保留原视频的核心观点和逻辑
  - 使用口语化、对话式表达
  - 自然融入情绪起伏：铺垫→高潮→收尾
  - 适合单人出镜直接口播

### 3️⃣ 问答对话版（适合无脚本拍摄）
- **格式**：Q&A问答列表
- **用途**：
  - 创作者可以用问答卡片引导拍摄
  - 适合访谈类、探店类、Vlog类内容
  - 降低拍摄难度，提升自然度
- **要求**：
  - 生成5-8个核心问题
  - 每个问题配简短的回答要点
  - 问题设计要有对话感和互动感

### 4️⃣ 行动号召（CTA）
- **长度**：20-40字
- **目的**：引导用户点赞、关注、评论、转发
- **技巧**：
  - 给出明确的价值承诺
  - 创造互动动机
  - 避免生硬的"记得点赞关注"
- **示例**：
  - "想知道更多xxx技巧？评论区告诉我"
  - "关注我，下期分享xxx的秘密"
  - "有用的话点个赞，让更多人看到"

## 🚫 避免的错误
1. ❌ 照搬原文，没有重新创作
2. ❌ 使用"大家好""我是xxx"等无效开场
3. ❌ 输出英文或代码块
4. ❌ 过于冗长或过于简略
5. ❌ 缺少情绪张力和节奏感

## 📤 输出格式（必须严格遵循）

\`\`\`json
{
  "hookOpening": {
    "content": "爆款开头的具体内容（15-30字）",
    "hookTechnique": "使用的钩子技巧（如：信息差、反常识、悬念等）",
    "emotionPoint": "情绪触发点（如：好奇、焦虑、认同等）"
  },
  "fullScript": {
    "content": "完整口播文案（200-500字）",
    "duration": "预估时长（如：1分30秒）",
    "keyPoints": ["核心观点1", "核心观点2", "核心观点3"],
    "emotionCurve": "情绪曲线描述（如：铺垫→质疑→揭示→升华）"
  },
  "dialogueVersion": {
    "qaList": [
      {
        "question": "问题1",
        "answerHints": ["回答要点1", "回答要点2"]
      }
    ],
    "shootingTips": "拍摄建议（如：镜头切换方式、语速建议等）"
  },
  "callToAction": {
    "content": "行动号召文案（20-40字）",
    "actionType": "引导类型（如：评论互动、关注预告、点赞分享）",
    "valuePromise": "给用户的价值承诺"
  }
}
\`\`\`

现在开始输出你的仿写结果：`;

  return prompt;
}

