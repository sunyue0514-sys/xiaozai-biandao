/**
 * 智能推导创作 - 提示词导出
 */

// 选题相关
export { buildTopicSystemPrompt, buildTopicSelfCheckPrompt, CONTENT_TYPES, CONTENT_DIRECTIONS } from './topic-prompt';
export type { ContentType } from './topic-prompt';

// 框架相关
export { buildFrameworkSystemPrompt, buildFrameworkSelfCheckPrompt, FRAMEWORK_TYPES, FRAMEWORK_CONTENT_MAP } from './framework-prompt';
export type { FrameworkType } from './framework-prompt';

// 开篇相关
export { buildOpeningSystemPrompt, buildOpeningSelfCheckPrompt, HOOK_TYPES, HOOK_CONTENT_MAP } from './opening-prompt';
export type { HookType } from './opening-prompt';

// 正文相关
export {
  buildContentSystemPrompt,
  buildRefineSystemPrompt,
  buildContentSelfCheckPrompt,
  GOLDEN_SENTENCE_GUIDE,
  EMOTION_CURVE_GUIDE,
} from './content-prompt';
