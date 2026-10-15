/**
 * LLM调用工具函数
 * 统一处理系统提示词注入，确保内容安全
 * 支持场景化模型选择
 */

import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { CONTENT_SAFETY_PROMPT } from './system-prompts';
import { 
  SCENE_CONFIGS, 
  SceneType, 
  getSceneModel, 
  getSceneTemperature 
} from './model-config';

// LLM调用选项
export interface LLMOptions {
  model?: string;
  temperature?: number;
  thinking?: 'enabled' | 'disabled';
  stream?: boolean;
  scene?: SceneType;  // 新增：场景类型
}

// 消息类型
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 创建带有内容审核约束的LLM客户端
 */
export function createLLMClient(headers: Parameters<typeof HeaderUtils.extractForwardHeaders>[0]): LLMClient {
  const customHeaders = HeaderUtils.extractForwardHeaders(headers);
  const config = new Config();
  return new LLMClient(config, customHeaders);
}

/**
 * 注入内容审核系统提示词
 * 如果消息中已有系统消息，在前面添加内容审核约束
 * 如果没有系统消息，添加默认的内容审核提示词
 */
export function injectSafetyPrompt(
  messages: Message[],
  customSystemPrompt?: string
): Message[] {
  const finalMessages = [...messages];
  const systemIndex = finalMessages.findIndex(msg => msg.role === 'system');
  
  if (systemIndex !== -1) {
    // 已有系统消息，在前面添加内容审核约束
    finalMessages[systemIndex] = {
      role: 'system',
      content: CONTENT_SAFETY_PROMPT + finalMessages[systemIndex].content,
    };
  } else {
    // 没有系统消息，添加完整的系统提示词
    finalMessages.unshift({
      role: 'system',
      content: customSystemPrompt 
        ? CONTENT_SAFETY_PROMPT + customSystemPrompt 
        : CONTENT_SAFETY_PROMPT,
    });
  }
  
  return finalMessages;
}

/**
 * 解析LLM配置选项
 * 优先级：显式参数 > 场景配置 > 默认值
 */
export function resolveLLMOptions(options: LLMOptions = {}): {
  model: string;
  temperature: number;
  thinking: 'enabled' | 'disabled';
} {
  // 如果指定了场景，使用场景配置
  const sceneConfig = options.scene ? SCENE_CONFIGS[options.scene] : null;
  
  return {
    model: options.model || (sceneConfig?.model) || 'doubao-seed-1-8-251228',
    temperature: options.temperature ?? (sceneConfig?.temperature) ?? 0.7,
    thinking: options.thinking || 'disabled',
  };
}

/**
 * 流式调用LLM（推荐使用）
 * 自动注入内容审核约束
 * 支持场景化模型选择
 */
export async function* streamLLM(
  client: LLMClient,
  messages: Message[],
  options: LLMOptions = {},
  customSystemPrompt?: string
): AsyncGenerator<string, void, unknown> {
  // 注入内容审核约束
  const finalMessages = injectSafetyPrompt(messages, customSystemPrompt);
  
  // 解析配置（支持场景）
  const resolvedOptions = resolveLLMOptions(options);
  
  const stream = client.stream(finalMessages, {
    model: resolvedOptions.model,
    temperature: resolvedOptions.temperature,
    thinking: resolvedOptions.thinking,
  });

  for await (const chunk of stream) {
    if (chunk.content) {
      yield chunk.content.toString();
    }
  }
}

/**
 * 非流式调用LLM（获取完整响应）
 * 自动注入内容审核约束
 * 支持场景化模型选择
 */
export async function callLLM(
  client: LLMClient,
  messages: Message[],
  options: LLMOptions = {},
  customSystemPrompt?: string
): Promise<string> {
  let result = '';
  
  for await (const chunk of streamLLM(client, messages, options, customSystemPrompt)) {
    result += chunk;
  }
  
  return result;
}

/**
 * 基于场景创建LLM调用配置
 * 便捷函数，用于快速获取场景配置
 */
export function createSceneLLMConfig(scene: SceneType): {
  model: string;
  temperature: number;
} {
  return {
    model: getSceneModel(scene),
    temperature: getSceneTemperature(scene),
  };
}

/**
 * 检测多模态模型返回的错误格式
 * 
 * 错误格式示例:
 * - "File: [assets/xxx.png]"
 * - "URL: [https://...]"
 * - 多行组合:
 *   File: [assets/image.png]
 *   URL: [https://...]
 * 
 * @param content 模型返回的内容
 * @returns 如果是错误格式返回 true
 */
export function isMultimodalErrorFormat(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  
  const trimmedContent = content.trim();
  
  // 模式1: 以 File: [ 或 URL: [ 开头
  const errorFormatPattern1 = /^(File:\s*\[|URL:\s*\[)/i;
  
  // 模式2: 内容中包含 File: [xxx] 和 URL: [xxx] 的组合
  const errorFormatPattern2 = /File:\s*\[.*?\][\s\S]*URL:\s*\[/i;
  
  // 模式3: 任意位置包含 File: [ 或 URL: [ (更宽松的检测)
  const errorFormatPattern3 = /File:\s*\[|URL:\s*\[/i;
  
  // 模式4: 检测是否包含 assets/ 路径或 coze_coding/file/proxy
  const errorFormatPattern4 = /assets\/|coze_coding\/file\/proxy/i;
  
  return errorFormatPattern1.test(trimmedContent) || 
         errorFormatPattern2.test(trimmedContent) ||
         errorFormatPattern3.test(trimmedContent) ||
         errorFormatPattern4.test(trimmedContent);
}

/**
 * 检测并处理多模态模型返回的错误格式
 * 如果检测到错误格式，返回 null 表示内容无效
 * 
 * @param content 模型返回的内容
 * @returns 如果是有效内容返回原内容，否则返回 null
 */
export function validateMultimodalContent(content: string): string | null {
  if (!content || typeof content !== 'string') return null;
  
  if (isMultimodalErrorFormat(content)) {
    console.error('[多模态错误] 检测到错误格式:', content.slice(0, 200));
    return null;
  }
  
  return content;
}

// 导出模型配置，方便直接使用
export { AVAILABLE_MODELS, SCENE_CONFIGS, type SceneType } from './model-config';
