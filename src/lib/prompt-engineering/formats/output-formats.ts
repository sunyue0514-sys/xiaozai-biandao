/**
 * 统一输出格式规范
 * 
 * 设计原则：
 * 1. 格式一致性：各API使用统一的JSON结构
 * 2. 可扩展性：便于后续添加新字段
 * 3. 前端友好：减少解析逻辑
 * 4. 向后兼容：支持旧格式自动转换
 */

// ============================================
// 基础类型定义
// ============================================

/**
 * API基础响应结构
 */
export interface BaseAPIResponse {
  success: boolean;
  error?: string;
  code?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
    timestamp?: number;
  };
}

// ============================================
// 选题输出格式
// ============================================

/**
 * 选题输出数据结构
 */
export interface TopicOutputData {
  /** 选题列表 */
  topics: Array<{
    /** 选题标题 */
    title: string;
    /** 选题类型（可选） */
    type?: string;
    /** 选题理由（可选） */
    reasoning?: string;
    /** 推荐指数（可选，1-5） */
    score?: number;
  }>;
}

/**
 * 选题API响应
 */
export interface TopicAPIResponse extends BaseAPIResponse {
  type: 'topic';
  data: TopicOutputData;
}

/**
 * 选题输出格式提示词
 */
export const TOPIC_OUTPUT_FORMAT = `【输出格式要求】

请按以下格式输出选题，每行一个：

标题1
标题2
标题3
...

注意：
- 只输出选题标题，不要输出其他内容
- 不要使用编号、符号或其他格式
- 每个选题独立成行`;

/**
 * 选题JSON输出格式提示词（用于需要结构化数据的场景）
 */
export const TOPIC_JSON_OUTPUT_FORMAT = `【输出格式要求 - JSON格式】

请严格按照以下JSON格式输出：

\`\`\`json
{
  "topics": [
    {
      "title": "选题标题",
      "type": "选题类型（可选）",
      "reasoning": "推荐理由（可选）"
    }
  ]
}
\`\`\`

注意：
- 必须输出有效的JSON格式
- topics数组不能为空
- 每个选题必须包含title字段`;

// ============================================
// 文案输出格式
// ============================================

/**
 * 文案输出数据结构
 */
export interface ScriptOutputData {
  /** 文案列表 */
  copywritings: Array<{
    /** 封面标题（3个） */
    coverTitles: string[];
    /** 文案内容 */
    content: string;
    /** 开篇钩子（可选） */
    hook?: string;
    /** 金句列表（可选） */
    goldenSentences?: string[];
    /** 预估时长（可选） */
    duration?: string;
  }>;
}

/**
 * 文案API响应
 */
export interface ScriptAPIResponse extends BaseAPIResponse {
  type: 'script';
  data: ScriptOutputData;
}

/**
 * 文案输出格式提示词
 */
export const SCRIPT_OUTPUT_FORMAT = `【输出格式要求 - JSON格式】

请严格按照以下JSON格式输出：

\`\`\`json
{
  "copywritings": [
    {
      "coverTitles": ["封面标题1", "封面标题2", "封面标题3"],
      "content": "完整文案内容",
      "hook": "开篇钩子（可选）",
      "goldenSentences": ["金句1", "金句2"]
    }
  ]
}
\`\`\`

重要规则：
1. 必须输出有效的JSON格式
2. copywritings数组必须包含2个文案（不同风格供选择）
3. 每个文案必须包含3个封面标题
4. 封面标题要求：8-15字，吸引眼球，适合视频封面
5. 文案内容要求：口语化、有温度、自然流畅
6. 不要使用Markdown符号（如**、##等）
7. 不要使用emoji表情符号`;

// ============================================
// 脚本输出格式
// ============================================

/**
 * 镜头信息
 */
export interface ShotInfo {
  /** 镜头序号 */
  shotNumber: number;
  /** 时长 */
  duration: string;
  /** 景别 */
  shotType: string;
  /** 机位 */
  cameraPosition?: string;
  /** 画面描述 */
  visual: string;
  /** 文案/台词 */
  copywriting: string;
  /** 字幕内容 */
  subtitle?: string;
  /** 备注 */
  notes?: string;
}

/**
 * 脚本版本信息
 */
export interface ScriptVersion {
  /** 基本信息 */
  basicInfo: {
    /** 标题 */
    title: string;
    /** 发布文案 */
    publishCopywriting?: string;
    /** 预估时长 */
    duration: string;
    /** 话题标签 */
    hashtags: string[];
    /** 合作品牌（可选） */
    brandPartner?: string;
  };
  /** 镜头列表 */
  shots: ShotInfo[];
  /** 拍摄建议 */
  shootingAdvice?: string;
}

/**
 * 脚本输出数据结构（双版本）
 */
export interface FullScriptOutputData {
  /** 精华版（15-30秒） */
  essentialVersion: ScriptVersion;
  /** 详细版（完整版） */
  detailedVersion: ScriptVersion;
}

/**
 * 脚本API响应
 */
export interface FullScriptAPIResponse extends BaseAPIResponse {
  type: 'fullscript';
  data: FullScriptOutputData;
}

/**
 * 脚本输出格式提示词
 */
export const FULLSCRIPT_OUTPUT_FORMAT = `【输出格式要求 - 双版本JSON格式】

请严格按照以下JSON格式输出两个版本：

\`\`\`json
{
  "essentialVersion": {
    "basicInfo": {
      "title": "精华版标题",
      "duration": "20秒",
      "hashtags": ["#标签1", "#标签2"]
    },
    "shots": [
      {
        "shotNumber": 1,
        "duration": "3秒",
        "shotType": "近景",
        "cameraPosition": "固定",
        "visual": "画面描述",
        "copywriting": "台词/旁白",
        "subtitle": "字幕内容",
        "notes": "备注"
      }
    ],
    "shootingAdvice": "拍摄建议"
  },
  "detailedVersion": {
    "basicInfo": {
      "title": "详细版标题",
      "duration": "60秒",
      "hashtags": ["#标签1", "#标签2", "#标签3"]
    },
    "shots": [...],
    "shootingAdvice": "拍摄建议"
  }
}
\`\`\`

重要规则：
1. 必须输出两个版本：精华版（15-30秒）和详细版（60秒左右）
2. 每个镜头必须包含：shotNumber, duration, shotType, visual, copywriting
3. shotType必须从预定义选项中选择（近景/中景/全景/特写/俯拍等）
4. 不要使用Markdown符号和emoji`;

// ============================================
// 仿写多形态输出格式
// ============================================

/**
 * 爆款开头
 */
export interface HookOpening {
  /** 开头内容 */
  content: string;
  /** 钩子技巧 */
  hookTechnique: string;
  /** 情绪触发点 */
  emotionPoint: string;
}

/**
 * 完整口播文案
 */
export interface FullScriptContent {
  /** 文案内容 */
  content: string;
  /** 预估时长 */
  duration: string;
  /** 核心观点 */
  keyPoints: string[];
  /** 情绪曲线 */
  emotionCurve: string;
}

/**
 * 问答对
 */
export interface QAItem {
  /** 问题 */
  question: string;
  /** 回答要点 */
  answerHints: string[];
}

/**
 * 问答对话版
 */
export interface DialogueVersion {
  /** 问答列表 */
  qaList: QAItem[];
  /** 拍摄建议 */
  shootingTips: string;
}

/**
 * 行动号召
 */
export interface CallToAction {
  /** 行动号召内容 */
  content: string;
  /** 引导类型 */
  actionType: string;
  /** 价值承诺 */
  valuePromise: string;
}

/**
 * 仿写多形态输出数据结构
 */
export interface RewriteMultiFormatData {
  /** 爆款开头 */
  hookOpening: HookOpening;
  /** 完整口播文案 */
  fullScript: FullScriptContent;
  /** 问答对话版 */
  dialogueVersion: DialogueVersion;
  /** 行动号召 */
  callToAction: CallToAction;
}

/**
 * 仿写API响应
 */
export interface RewriteAPIResponse extends BaseAPIResponse {
  type: 'rewrite';
  data: RewriteMultiFormatData;
}

/**
 * 仿写多形态输出格式提示词
 */
export const REWRITE_OUTPUT_FORMAT = `【输出格式要求 - 多形态JSON格式】

请严格按照以下JSON格式输出四种形态：

\`\`\`json
{
  "hookOpening": {
    "content": "爆款开头内容（15-30字）",
    "hookTechnique": "钩子技巧（如：信息差、反常识、悬念）",
    "emotionPoint": "情绪触发点（如：好奇、焦虑、认同）"
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

重要规则：
1. 必须输出完整的四种形态
2. hookOpening控制在15-30字，要有冲击力
3. fullScript要完整展开，200-500字
4. dialogueVersion要有5-8个问答
5. callToAction要有明确的价值承诺`;

// ============================================
// 格式辅助函数
// ============================================

/**
 * 获取输出格式提示词
 */
export function getOutputFormatPrompt(
  type: 'topic' | 'script' | 'fullscript' | 'rewrite',
  format: 'simple' | 'json' = 'json'
): string {
  switch (type) {
    case 'topic':
      return format === 'json' ? TOPIC_JSON_OUTPUT_FORMAT : TOPIC_OUTPUT_FORMAT;
    case 'script':
      return SCRIPT_OUTPUT_FORMAT;
    case 'fullscript':
      return FULLSCRIPT_OUTPUT_FORMAT;
    case 'rewrite':
      return REWRITE_OUTPUT_FORMAT;
    default:
      return '';
  }
}

/**
 * 格式化JSON输出要求
 */
export function formatJSONRequirement(
  schema: string,
  examples?: string
): string {
  let prompt = `【输出格式要求】

请严格按照以下JSON格式输出，不要包含任何其他文字：

${schema}`;
  
  if (examples) {
    prompt += `\n\n【输出示例】\n${examples}`;
  }
  
  prompt += `\n\n【重要提醒】
1. 必须输出有效的JSON格式
2. 不要在JSON前后添加任何说明文字
3. 不要使用Markdown代码块标记（\`\`\`）
4. 确保所有字段都已填写`;
  
  return prompt;
}
