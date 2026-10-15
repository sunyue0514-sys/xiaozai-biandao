/**
 * 知识库辅助模块
 * 提供知识库搜索和方法论提示词
 */

import { KnowledgeClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import type { NextRequest } from 'next/server';

/**
 * 知识库搜索结果
 */
export interface KnowledgeSearchResult {
  success: boolean;
  context: string;
  chunks?: Array<{
    score: number;
    content: string;
  }>;
}

/**
 * 搜索知识库
 * @param query 搜索关键词
 * @param request NextRequest对象（用于提取请求头）
 * @param topK 返回结果数量，默认3
 * @param minScore 最小相似度，默认0.5
 */
export async function searchKnowledge(
  query: string,
  request: NextRequest,
  topK: number = 3,
  minScore: number = 0.5
): Promise<KnowledgeSearchResult> {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const knowledgeClient = new KnowledgeClient(config, customHeaders);

    const searchResult = await knowledgeClient.search(
      query,
      undefined, // 搜索所有数据集
      topK,
      minScore
    );

    if (searchResult.code === 0 && searchResult.chunks && searchResult.chunks.length > 0) {
      const context = searchResult.chunks
        .map((chunk) => chunk.content)
        .join('\n\n---\n\n');

      return {
        success: true,
        context,
        chunks: searchResult.chunks.map((chunk) => ({
          score: chunk.score,
          content: chunk.content,
        })),
      };
    }

    return { success: false, context: '' };
  } catch (error) {
    console.error('Knowledge search error:', error);
    return { success: false, context: '' };
  }
}

/**
 * 构建知识库上下文提示词
 */
export function buildKnowledgePrompt(context: string): string {
  if (!context) return '';
  return `

【相关知识库内容 - 仅供参考】
${context}
---
`;
}

/** 通用创作指导；本次公开准备重写的说明文字。历史导出名保留用于接口兼容。 */
export const XUEHUI_SCRIPT_METHODOLOGY = {
  story: {
    name: '讲故事',
    core: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    structure: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    tips: [
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    ],
  },
  process: {
    name: '晒过程',
    core: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    structure: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    tips: [
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      '自然植入变现引导',
    ],
  },
  knowledge: {
    name: '教知识',
    core: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    structure: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    tips: [
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    ],
  },
  opinion: {
    name: '说观点',
    core: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    structure: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    tips: [
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    ],
  },
  product: {
    name: '说产品',
    core: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    structure: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    tips: [
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    ],
  },
};

/**
 * 获取脚本类型的方法论提示词
 */
export function getScriptMethodologyPrompt(scriptType: string): string {
  const method = XUEHUI_SCRIPT_METHODOLOGY[scriptType as keyof typeof XUEHUI_SCRIPT_METHODOLOGY];
  if (!method) return '';

  return `
请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。
${method.name}类型】
核心价值：${method.core}

${method.structure}

【创作技巧】
${method.tips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}
`;
}

/**
 * 获取选题创作的方法论提示词
 * 
 * @param mode - 创作模式：humanity（人性爆款）/ audience（人群选题）
 * @param subType - 子类型：如 'traffic_a', 'conversion_a' 等
 */
export function getTopicMethodologyPrompt(
  mode?: 'humanity' | 'audience',
  subType?: string
): string {
  let prompt = "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";

  // 人性爆款选题法 - 添加心理战术
  if (mode === 'humanity') {
    prompt += "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。";
  }

  // 根据子类型添加特定指导
  if (subType) {
    const subTypeGuides: Record<string, string> = {
      traffic_a: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      traffic_b: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      conversion_a: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      conversion_b: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      persona_a: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
      persona_b: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    };
    
    if (subTypeGuides[subType]) {
      prompt += subTypeGuides[subType];
    }
  }

  return prompt;
}

/**
 * 获取开篇创作的方法论提示词
 */
export function getOpeningMethodologyPrompt(style: string): string {
  const styleGuides: Record<string, string> = {
    suspense: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    
    pain: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    
    contrast: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    
    question: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    
    story: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
    
    golden: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
  };

  return styleGuides[style] || styleGuides.suspense;
}

/**
 * 获取文案创作的方法论提示词
 */
export function getWritingMethodologyPrompt(creationMode: string): string {
  const modeGuides: Record<string, string> = {
    original_humanity: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",

    original_8: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",

    rewrite_source: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",

    rewrite_style: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",

    style_simulation: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",

    dialogue: "请围绕用户目标说明事实、给出可执行步骤；示例需自行创作，避免未经核实的承诺。",
  };

  return modeGuides[creationMode] || modeGuides.original_humanity;
}
