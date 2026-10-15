/**
 * 提示词工程体系 - 统一导出
 * 
 * 分层架构：
 * - L1: 安全层（safety）
 * - L2: 技巧层（techniques）
 * - L3: 方法论层（methodology）
 * - L4: 创作模式层（modes）
 * - L5: 输出格式层（formats）
 * 
 * 核心组件：
 * - context: 上下文构建（IP定位约束、身份映射等）
 * - builders: 提示词构建器（组合各层提示词）
 */

// ============================================
// 上下文构建
// ============================================
export {
  buildIPConstraints,
  buildIPReference,
  buildIdentityMappingInstruction,
  type IPConstraintOptions
} from './context/ip-positioning';

// ============================================
// 创作模式
// ============================================
export {
  REWRITE_CORE_CONCEPT,
  REWRITE_EXECUTION_STEPS,
  REWRITE_EXAMPLES,
  REWRITE_SOURCE_PROMPT,
  buildRewriteStylePrompt
} from './modes/rewrite-style';

// ============================================
// 智能推导创作（creative-flow）
// ============================================
export {
  // 选题
  buildTopicSystemPrompt,
  buildTopicSelfCheckPrompt,
  CONTENT_TYPES,
  CONTENT_DIRECTIONS,
  type ContentType,
  // 框架
  buildFrameworkSystemPrompt,
  buildFrameworkSelfCheckPrompt,
  FRAMEWORK_TYPES,
  FRAMEWORK_CONTENT_MAP,
  type FrameworkType,
  // 开篇
  buildOpeningSystemPrompt,
  buildOpeningSelfCheckPrompt,
  HOOK_TYPES,
  HOOK_CONTENT_MAP,
  type HookType,
  // 正文
  buildContentSystemPrompt,
  buildRefineSystemPrompt,
  buildContentSelfCheckPrompt,
  GOLDEN_SENTENCE_GUIDE,
  EMOTION_CURVE_GUIDE,
} from './modes/creative-flow';

// ============================================
// 输出格式
// ============================================
export {
  // 类型定义
  type BaseAPIResponse,
  type TopicOutputData,
  type TopicAPIResponse,
  type ScriptOutputData,
  type ScriptAPIResponse,
  type ShotInfo,
  type ScriptVersion,
  type FullScriptOutputData,
  type FullScriptAPIResponse,
  type HookOpening,
  type FullScriptContent,
  type QAItem,
  type DialogueVersion,
  type CallToAction,
  type RewriteMultiFormatData,
  type RewriteAPIResponse,
  // 格式提示词
  TOPIC_OUTPUT_FORMAT,
  TOPIC_JSON_OUTPUT_FORMAT,
  SCRIPT_OUTPUT_FORMAT,
  FULLSCRIPT_OUTPUT_FORMAT,
  REWRITE_OUTPUT_FORMAT,
  // 辅助函数
  getOutputFormatPrompt,
  formatJSONRequirement
} from './formats/output-formats';

// ============================================
// 提示词构建器
// ============================================
export {
  ScriptPromptBuilder,
  createScriptPromptBuilder,
  createRewritePrompt,
  createOriginalPrompt,
  type PromptBuildOptions,
  type PromptBuildResult
} from './builders/script-prompt-builder';

// ============================================
// 使用示例
// ============================================

/**
 * 示例1：仿写模式提示词构建
 * 
 * ```typescript
 * import { createRewritePrompt } from '@/lib/prompt-engineering';
 * 
 * const result = createRewritePrompt(
 *   ipPositioning,      // IP定位信息
 *   customerName,       // 客户名称
 *   true,               // 有档案
 *   topic,              // 主题
 *   referenceContent,   // 参考文案
 *   context             // 补充要求
 * );
 * 
 * // 使用结果
 * const messages = [
 *   { role: 'system', content: result.systemPrompt },
 *   { role: 'user', content: result.userMessage }
 * ];
 * ```
 */

/**
 * 示例2：原创文案提示词构建
 * 
 * ```typescript
 * import { createOriginalPrompt } from '@/lib/prompt-engineering';
 * 
 * const result = createOriginalPrompt(
 *   ipPositioning,      // IP定位信息
 *   customerName,       // 客户名称
 *   'original_humanity',// 创作模式
 *   topic,              // 主题
 *   context             // 补充要求
 * );
 * ```
 */

/**
 * 示例3：自定义构建器
 * 
 * ```typescript
 * import { ScriptPromptBuilder } from '@/lib/prompt-engineering';
 * 
 * const builder = new ScriptPromptBuilder();
 * 
 * const result = builder
 *   .withSafety()
 *   .withTechniques()
 *   .withIPConstraints(ipPositioning, customerName, 'strict')
 *   .withCreationMode('rewrite_style')
 *   .withOutputFormat('rewrite')
 *   .build(topic, context, referenceContent);
 * ```
 */
