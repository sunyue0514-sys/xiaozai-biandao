import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 仿写/洗稿/文案 API
 * 
 * POST /api/inspiration-cocreate/rewrite
 * 
 * 请求体：
 * {
 *   type: 'rewrite' | 'polish' | 'extract',  // 仿写 | 洗稿 | 提取文案
 *   videoInfo: {
 *     title: string,
 *     description: string,
 *     viralTags: string[],
 *     highlight?: string,
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { buildRewriteMultiFormatPrompt } from '@/lib/script-templates';
import { parseRewriteScriptJson, RewriteScriptResult } from '@/types/script';
import { logAICall } from '@/lib/ai-quality-logger';

interface RewriteRequest {
  type: 'rewrite' | 'polish' | 'extract';
  videoInfo: {
    title: string;
    description: string;
    viralTags: string[];
    highlight?: string;
    track?: string;
    content_type?: string;
    platform?: string;
  };
}

/**
 * 创建 LLM 客户端
 */
function createLLMClient(headers: Headers): LLMClient {
  const customHeaders = safeForwardHeaders(headers);
  const config = new Config();
  return new LLMClient(config, customHeaders);
}

/**
 * 调用 LLM 获取响应
 */
async function callLLM(
  client: LLMClient,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[]
): Promise<string> {
  let result = '';
  
  const stream = client.stream(messages, {
    model: 'deepseek-v3-2-251201',
    temperature: 0.8,
  });
  
  for await (const chunk of stream) {
    if (chunk.content) {
      result += chunk.content.toString();
    }
  }
  
  return result;
}

/**
 * 使用 AI 模型生成仿写脚本（多形态输出）
 */
async function generateRewriteWithAI(
  client: LLMClient,
  data: RewriteRequest['videoInfo']
): Promise<RewriteScriptResult | null> {
  const { title, description, highlight, track, platform } = data;
  
  // 使用原始文案和视频信息构建提示词
  const originalScript = description || highlight || '';
  
  if (!originalScript) {
    return null;
  }
  
  const prompt = buildRewriteMultiFormatPrompt({
    originalScript,
    referenceVideoTitle: title,
    referenceVideoPlatform: platform || '抖音',
    targetPlatform: '抖音',
    targetAudience: track || '泛娱乐用户',
  });
  
  try {
    // 调用 DeepSeek V3.2 模型
    const response = await callLLM(client, [
      { role: 'user', content: prompt }
    ]);
    
    // 解析 JSON 响应
    const result = parseRewriteScriptJson(response);
    
    if (!result) {
      console.error('API operation event');
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('API operation event');
    return null;
  }
}

/**
 * 使用 AI 模型洗稿（保留核心价值）
 */
async function generatePolishWithAI(
  client: LLMClient,
  data: RewriteRequest['videoInfo']
): Promise<{
  originalTitle: string;
  polishedTitle: string;
  polishedScript: string;
  keyChanges: string[];
} | null> {
  const { title, description, viralTags } = data;
  
  const prompt = `你是一位资深的内容编辑，擅长文案洗稿和优化。

## 任务
请对以下视频文案进行洗稿改写，要求：
1. 保留核心信息和价值点
2. 调整表达方式，换词不换意
3. 使其更加口语化、更适合短视频
4. 保留爆款标签的特性

## 原始信息
标题：${title}
文案：${description}
爆款标签：${viralTags.join('、')}

## 输出格式（JSON）
\`\`\`json
{
  "originalTitle": "原标题",
  "polishedTitle": "改写后的标题（保留吸引力）",
  "polishedScript": "改写后的完整文案（保持原文长度和节奏）",
  "keyChanges": ["改写点1", "改写点2", "改写点3"]
}
\`\`\`

现在开始输出：`;

  try {
    const response = await callLLM(client, [
      { role: 'user', content: prompt }
    ]);
    
    // 提取 JSON
    let jsonContent = response.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    
    const parsed = JSON.parse(jsonContent.trim());
    
    if (parsed.polishedTitle && parsed.polishedScript) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error('API operation event');
    return null;
  }
}

/**
 * 使用 AI 模型提取文案
 */
async function generateExtractWithAI(
  client: LLMClient,
  data: RewriteRequest['videoInfo']
): Promise<{
  title: string;
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  wordCount: number;
} | null> {
  const { title, description } = data;
  
  const prompt = `你是一位文案分析专家，请从以下视频信息中提取核心文案。

## 输入信息
标题：${title}
描述：${description}

## 提取要求
1. 提取视频开头钩子（前3秒）
2. 提取主体内容
3. 提取结尾行动号召
4. 生成相关话题标签

## 输出格式（JSON）
\`\`\`json
{
  "title": "视频标题",
  "hook": "开头钩子（15-30字）",
  "body": "主体文案内容",
  "cta": "结尾行动号召",
  "hashtags": ["#标签1", "#标签2", "#标签3"],
  "wordCount": 字数统计
}
\`\`\`

现在开始输出：`;

  try {
    const response = await callLLM(client, [
      { role: 'user', content: prompt }
    ]);
    
    // 提取 JSON
    let jsonContent = response.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    
    const parsed = JSON.parse(jsonContent.trim());
    
    if (parsed.body) {
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error('API operation event');
    return null;
  }
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  const startTime = Date.now();
  let inputSummary = '';
  let operationType = '';
  
  try {
    const body = await request.json() as RewriteRequest;
    const { type, videoInfo } = body;
    operationType = type;
    inputSummary = videoInfo?.title?.slice(0, 50) || '未知视频';
    
    if (!type || !videoInfo) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }
    
    // 创建 LLM 客户端
    const client = createLLMClient(request.headers);
    
    let result;
    
    switch (type) {
      case 'rewrite':
        // 仿写：输出多形态内容
        result = await generateRewriteWithAI(client, videoInfo);
        if (!result) {
          logAICall({
            feature: 'rewrite_script',
            input: inputSummary,
            success: false,
            errorType: 'model_error',
            errorMessage: 'AI 仿写生成失败',
            durationMs: Date.now() - startTime,
            model: 'deepseek-v3-2-251201',
          });
          return NextResponse.json(
            { success: false, error: 'AI 仿写生成失败，请稍后重试' },
            { status: 500 }
          );
        }
        break;
        
      case 'polish':
        // 洗稿：改写文案
        result = await generatePolishWithAI(client, videoInfo);
        if (!result) {
          logAICall({
            feature: 'rewrite_script',
            input: inputSummary,
            success: false,
            errorType: 'model_error',
            errorMessage: 'AI 洗稿生成失败',
            durationMs: Date.now() - startTime,
            model: 'deepseek-v3-2-251201',
          });
          return NextResponse.json(
            { success: false, error: 'AI 洗稿生成失败，请稍后重试' },
            { status: 500 }
          );
        }
        break;
        
      case 'extract':
        // 提取文案
        result = await generateExtractWithAI(client, videoInfo);
        if (!result) {
          logAICall({
            feature: 'rewrite_script',
            input: inputSummary,
            success: false,
            errorType: 'model_error',
            errorMessage: 'AI 提取文案失败',
            durationMs: Date.now() - startTime,
            model: 'deepseek-v3-2-251201',
          });
          return NextResponse.json(
            { success: false, error: 'AI 提取文案失败，请稍后重试' },
            { status: 500 }
          );
        }
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: '不支持的操作类型' },
          { status: 400 }
        );
    }
    
    // 记录成功的 AI 调用日志
    logAICall({
      feature: 'rewrite_script',
      input: inputSummary,
      output: `操作类型: ${operationType}`,
      success: true,
      durationMs: Date.now() - startTime,
      model: 'deepseek-v3-2-251201',
    });
    
    return NextResponse.json({
      success: true,
      type,
      result,
    });
    
  } catch (error) {
    console.error('API operation event');
    
    // 记录失败的 AI 调用日志
    logAICall({
      feature: 'rewrite_script',
      input: inputSummary,
      success: false,
      errorType: 'unknown_error',
      errorMessage: error instanceof Error ? 'Request failed' : '处理失败',
      durationMs: Date.now() - startTime,
    });
    
    return NextResponse.json(
      { success: false, error: '处理失败，请稍后重试' },
      { status: 500 }
    );
  }
}
