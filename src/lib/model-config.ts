/**
 * 模型配置 - 场景化模型选择策略
 * 
 * 根据不同使用场景选择最优模型，平衡质量与成本
 */

// 可用模型列表
export const AVAILABLE_MODELS = {
  // 文案创作首选 - 中文能力强，创意性好
  COPYWRITING: 'deepseek-v3-2-251201',
  
  // 快速生成 - 高性价比
  FAST: 'doubao-seed-2-0-lite-260215',
  
  // 多模态/视频分析
  VISION: 'doubao-seed-1-8-251228',
  
  // 复杂推理
  REASONING: 'deepseek-v3-2-251201',
  
  // Agent场景
  AGENT: 'doubao-seed-1-8-251228',
} as const;

// 场景配置 - 包含模型和推荐温度
export const SCENE_CONFIGS = {
  // ============ 文案创作类（使用 DeepSeek V3.2）============
  
  /** 脚本生成 - 短视频脚本创作 */
  script_generation: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.75,
    description: '短视频脚本创作',
  },
  
  /** 选题推荐 - 内容选题策划 */
  topic_recommend: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.75,
    description: '内容选题策划',
  },
  
  /** 开篇创作 - 爆款开篇设计 */
  opening_creation: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.85,
    description: '爆款开篇设计',
  },
  
  /** 千川文案 - 广告文案生成 */
  qianchuan_copywriting: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.7,
    description: '千川广告文案',
  },
  
  /** 千川脚本 - 广告分镜脚本 */
  qianchuan_script: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.7,
    description: '千川分镜脚本',
  },
  
  /** Feed广告文案 */
  feed_ad_copywriting: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.7,
    description: 'Feed广告文案',
  },
  
  /** 直播话术 */
  live_speech: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.75,
    description: '直播话术生成',
  },
  
  /** 对话流设计 */
  dialogue_script: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.8,
    description: '对话流脚本设计',
  },
  
  /** 无脚本拍摄 */
  scriptless: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.8,
    description: '无脚本拍摄方案',
  },
  
  /** IP定位分析 */
  ip_positioning: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.7,
    description: 'IP定位分析',
  },
  
  /** 账号规划 */
  account_planning: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.7,
    description: '账号规划方案',
  },
  
  /** 热点分析 */
  hot_topics: {
    model: AVAILABLE_MODELS.COPYWRITING,
    temperature: 0.6,
    description: '热点话题分析',
  },
  
  // ============ 多模态类（使用 Doubao Vision）============
  
  /** 视频深度分析 */
  video_analysis: {
    model: AVAILABLE_MODELS.VISION,
    temperature: 0.5,
    description: '视频深度分析',
  },
  
  /** 图片理解 */
  image_understanding: {
    model: AVAILABLE_MODELS.VISION,
    temperature: 0.5,
    description: '图片内容理解',
  },
  
  /** 数据报告分析 */
  data_report: {
    model: AVAILABLE_MODELS.VISION,
    temperature: 0.5,
    description: '数据报告分析',
  },
  
  // ============ Agent/对话类（使用 Doubao 1.8）============
  
  /** AI对话助手 */
  ai_chat: {
    model: AVAILABLE_MODELS.AGENT,
    temperature: 0.7,
    description: 'AI对话助手',
  },
  
  /** 超级导演 */
  super_director: {
    model: AVAILABLE_MODELS.AGENT,
    temperature: 0.5,
    description: '超级导演助手',
  },
  
  // ============ 快速生成类（使用 Doubao Lite）============
  
  /** 快速创作 */
  quick_create: {
    model: AVAILABLE_MODELS.FAST,
    temperature: 0.7,
    description: '快速内容创作',
  },
  
  /** 运营分析 */
  operations_analysis: {
    model: AVAILABLE_MODELS.FAST,
    temperature: 0.6,
    description: '运营数据分析',
  },
  
  /** 违禁词检测 */
  banned_words: {
    model: AVAILABLE_MODELS.FAST,
    temperature: 0.3,
    description: '违禁词检测',
  },
  
  /** 文案口语化 */
  humanize: {
    model: AVAILABLE_MODELS.FAST,
    temperature: 0.7,
    description: '文案口语化优化',
  },
  
} as const;

// 场景类型
export type SceneType = keyof typeof SCENE_CONFIGS;

/**
 * 获取场景配置
 */
export function getSceneConfig(scene: SceneType) {
  return SCENE_CONFIGS[scene];
}

/**
 * 获取场景模型
 */
export function getSceneModel(scene: SceneType): string {
  return SCENE_CONFIGS[scene].model;
}

/**
 * 获取场景温度
 */
export function getSceneTemperature(scene: SceneType): number {
  return SCENE_CONFIGS[scene].temperature;
}

/**
 * 判断是否为文案创作类场景
 */
export function isCopywritingScene(scene: SceneType): boolean {
  const copywritingScenes: SceneType[] = [
    'script_generation',
    'topic_recommend',
    'opening_creation',
    'qianchuan_copywriting',
    'qianchuan_script',
    'feed_ad_copywriting',
    'live_speech',
    'dialogue_script',
    'scriptless',
    'ip_positioning',
    'account_planning',
    'hot_topics',
  ];
  return copywritingScenes.includes(scene);
}

/**
 * 判断是否为多模态类场景
 */
export function isVisionScene(scene: SceneType): boolean {
  const visionScenes: SceneType[] = [
    'video_analysis',
    'image_understanding',
    'data_report',
  ];
  return visionScenes.includes(scene);
}
