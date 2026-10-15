/**
 * 提示词构建器
 * 
 * 统一管理提示词的组合和输出
 * 确保各层提示词的正确组合和一致性
 */

import { CONTENT_SAFETY_PROMPT } from '@/lib/system-prompts';
import { buildIPConstraints, buildIdentityMappingInstruction } from '../context/ip-positioning';
import { buildRewriteStylePrompt, REWRITE_SOURCE_PROMPT } from '../modes/rewrite-style';
import { getOutputFormatPrompt } from '../formats/output-formats';

// ============================================
// 类型定义
// ============================================

/**
 * 提示词构建选项
 */
export interface PromptBuildOptions {
  /** 是否包含内容安全提示词 */
  includeSafety?: boolean;
  /** 是否包含技巧层（钩子、金句、情绪） */
  includeTechniques?: boolean;
  /** 是否包含方法论层 */
  includeMethodology?: boolean;
  /** IP定位约束选项 */
  ipConstraints?: {
    enabled: boolean;
    mode: 'strict' | 'flexible';
    emphasis: Array<'identity' | 'expertise' | 'audience' | 'tone' | 'content'>;
  };
  /** 创作模式 */
  creationMode?: 'original_humanity' | 'original_8' | 'rewrite_source' | 'rewrite_style' | 'style_simulation' | 'dialogue';
  /** 脚本类型 */
  scriptType?: 'story' | 'process' | 'knowledge' | 'opinion' | 'product';
  /** 输出格式类型 */
  outputFormat?: 'topic' | 'script' | 'fullscript' | 'rewrite';
  /** 是否有创作者档案 */
  hasCustomerProfile?: boolean;
  /** 是否有参考视频 */
  hasReferenceVideo?: boolean;
  /** IP定位信息 */
  ipPositioning?: any;
  /** 客户名称 */
  customerName?: string;
}

/**
 * 提示词构建结果
 */
export interface PromptBuildResult {
  systemPrompt: string;
  userMessage: string;
  metadata: {
    layers: string[];
    estimatedTokens: number;
    constraints: string[];
  };
}

// ============================================
// 技巧层提示词（精简版）
// ============================================

const TECHNIQUES_PROMPT = "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";

// ============================================
// 方法论提示词（精简版）
// ============================================

const METHODOLOGY_PROMPT = "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";

// ============================================
// 文案创作模式提示词
// ============================================

const CREATION_MODE_PROMPTS = {
  original_humanity: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",

  original_8: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",

  rewrite_source: REWRITE_SOURCE_PROMPT,

  rewrite_style: '', // 动态生成，见 buildRewriteStylePrompt

  style_simulation: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",

  dialogue: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。"
};

// ============================================
// 提示词构建器
// ============================================

/**
 * 文案提示词构建器
 */
export class ScriptPromptBuilder {
  private options: PromptBuildOptions;
  private layers: string[] = [];
  private constraints: string[] = [];

  constructor(options: PromptBuildOptions = {}) {
    this.options = {
      includeSafety: true,
      includeTechniques: true,
      includeMethodology: true,
      ipConstraints: { enabled: false, mode: 'flexible', emphasis: ['identity', 'expertise', 'audience'] },
      creationMode: 'original_humanity',
      outputFormat: 'script',
      ...options
    };
  }

  /**
   * 添加安全层
   */
  withSafety(): this {
    this.layers.push('safety');
    return this;
  }

  /**
   * 添加技巧层
   */
  withTechniques(): this {
    this.layers.push('techniques');
    return this;
  }

  /**
   * 添加方法论层
   */
  withMethodology(): this {
    this.layers.push('methodology');
    return this;
  }

  /**
   * 添加IP约束
   */
  withIPConstraints(
    ipPositioning: any,
    customerName?: string,
    mode: 'strict' | 'flexible' = 'strict'
  ): this {
    this.layers.push('ip-constraints');
    this.options.ipConstraints = {
      enabled: true,
      mode,
      emphasis: ['identity', 'expertise', 'audience', 'tone', 'content']
    };
    this.options.ipPositioning = ipPositioning;
    this.options.customerName = customerName;
    if (ipPositioning) {
      this.constraints.push('IP身份约束');
      this.constraints.push('专业领域约束');
      this.constraints.push('目标用户约束');
    }
    return this;
  }

  /**
   * 设置创作模式
   */
  withCreationMode(mode: PromptBuildOptions['creationMode']): this {
    this.layers.push('creation-mode');
    this.options.creationMode = mode;
    return this;
  }

  /**
   * 设置脚本类型
   */
  withScriptType(type: PromptBuildOptions['scriptType']): this {
    this.layers.push('script-type');
    this.options.scriptType = type;
    return this;
  }

  /**
   * 设置输出格式
   */
  withOutputFormat(format: PromptBuildOptions['outputFormat']): this {
    this.layers.push('output-format');
    this.options.outputFormat = format;
    return this;
  }

  /**
   * 设置仿写模式
   */
  withRewriteMode(hasCustomerProfile: boolean, hasReferenceVideo: boolean): this {
    this.options.hasCustomerProfile = hasCustomerProfile;
    this.options.hasReferenceVideo = hasReferenceVideo;
    this.layers.push('rewrite-mode');
    return this;
  }

  /**
   * 构建系统提示词
   */
  buildSystemPrompt(): string {
    const parts: string[] = [];

    // L1: 安全层
    if (this.options.includeSafety || this.layers.includes('safety')) {
      parts.push(CONTENT_SAFETY_PROMPT);
    }

    // L2: 技巧层
    if (this.options.includeTechniques || this.layers.includes('techniques')) {
      parts.push(TECHNIQUES_PROMPT);
    }

    // L3: 方法论层
    if (this.options.includeMethodology || this.layers.includes('methodology')) {
      parts.push(METHODOLOGY_PROMPT);
    }

    // L4: 创作模式层
    if (this.layers.includes('creation-mode') && this.options.creationMode) {
      const modePrompt = this.options.creationMode === 'rewrite_style'
        ? buildRewriteStylePrompt(this.options.hasCustomerProfile || false)
        : CREATION_MODE_PROMPTS[this.options.creationMode];
      if (modePrompt) {
        parts.push(modePrompt);
      }
    }

    // 仿写模式特殊处理
    if (this.layers.includes('rewrite-mode') && this.options.hasReferenceVideo) {
      if (this.options.hasCustomerProfile) {
        // 有档案 + 有参考视频 = 仿写（身份映射）
        parts.push(buildIdentityMappingInstruction(this.options.ipPositioning));
      }
    }

    // IP约束层（最关键，放在最后强化）
    if (this.layers.includes('ip-constraints') && this.options.ipPositioning) {
      parts.push(buildIPConstraints(
        this.options.ipPositioning,
        this.options.customerName,
        {
          mode: this.options.ipConstraints?.mode || 'strict',
          emphasis: this.options.ipConstraints?.emphasis || ['identity', 'expertise', 'audience']
        }
      ));
    }

    // 输出格式层
    if (this.layers.includes('output-format') && this.options.outputFormat) {
      parts.push(getOutputFormatPrompt(this.options.outputFormat, 'json'));
    }

    return parts.join('\n\n');
  }

  /**
   * 构建用户消息
   */
  buildUserMessage(topic: string, context?: string, referenceContent?: string): string {
    const parts: string[] = [];

    // 主题
    parts.push(`【创作主题】\n${topic}`);

    // 参考内容（仿写/洗稿模式）
    if (referenceContent) {
      if (this.options.creationMode === 'rewrite_style') {
        parts.push(`【参考内容 - 学习结构和技巧】\n${referenceContent}
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
`);
      } else if (this.options.creationMode === 'rewrite_source') {
        parts.push(`【参考内容 - 保留原意改写】\n${referenceContent}`);
      }
    }

    // 补充要求
    if (context) {
      parts.push(`【补充要求】\n${context}`);
    }

    // 创作指令
    parts.push(this.buildCreationInstruction());

    return parts.join('\n\n');
  }

  /**
   * 构建创作指令
   */
  private buildCreationInstruction(): string {
    const instructions: string[] = [];

    if (this.options.hasCustomerProfile && this.options.ipPositioning?.basicInfo?.identity) {
      instructions.push(`【核心要求】
1. 必须以"${this.options.ipPositioning.basicInfo.identity}
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
`);
    }

    instructions.push("请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。");

    return instructions.join('\n\n');
  }

  /**
   * 构建完整提示词
   */
  build(topic: string, context?: string, referenceContent?: string): PromptBuildResult {
    const systemPrompt = this.buildSystemPrompt();
    const userMessage = this.buildUserMessage(topic, context, referenceContent);

    // 估算token数量（粗略估计：中文约1.5字符/token）
    const totalChars = systemPrompt.length + userMessage.length;
    const estimatedTokens = Math.ceil(totalChars / 1.5);

    return {
      systemPrompt,
      userMessage,
      metadata: {
        layers: this.layers,
        estimatedTokens,
        constraints: this.constraints
      }
    };
  }
}

// ============================================
// 便捷工厂函数
// ============================================

/**
 * 创建文案提示词构建器
 */
export function createScriptPromptBuilder(): ScriptPromptBuilder {
  return new ScriptPromptBuilder();
}

/**
 * 创建仿写提示词
 */
export function createRewritePrompt(
  ipPositioning: any,
  customerName: string | undefined,
  hasCustomerProfile: boolean,
  topic: string,
  referenceContent: string,
  context?: string
): PromptBuildResult {
  const builder = new ScriptPromptBuilder();
  
  builder
    .withSafety()
    .withTechniques()
    .withMethodology()
    .withCreationMode('rewrite_style')
    .withRewriteMode(hasCustomerProfile, true)
    .withOutputFormat('rewrite');

  if (hasCustomerProfile && ipPositioning) {
    builder.withIPConstraints(ipPositioning, customerName, 'strict');
  }

  return builder.build(topic, context, referenceContent);
}

/**
 * 创建原创文案提示词
 */
export function createOriginalPrompt(
  ipPositioning: any,
  customerName: string | undefined,
  creationMode: 'original_humanity' | 'original_8',
  topic: string,
  context?: string
): PromptBuildResult {
  const builder = new ScriptPromptBuilder();
  
  builder
    .withSafety()
    .withTechniques()
    .withMethodology()
    .withCreationMode(creationMode)
    .withOutputFormat('script');

  if (ipPositioning) {
    builder.withIPConstraints(ipPositioning, customerName, 'strict');
  }

  return builder.build(topic, context);
}
