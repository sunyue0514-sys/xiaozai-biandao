/**
 * 智能记忆系统 - AI分析服务
 * 分析爆款特征，学习用户风格
 */

import { LLMClient, Config, HeaderUtils, Message } from 'coze-coding-dev-sdk';
import type { ContentPerformance, HitFactors, UserStyleProfile, AIAnalysisResult } from './types';

// 分析爆款特征的提示词
const ANALYSIS_PROMPT = `你是一位资深的内容数据分析专家，擅长从爆款内容中提取可复制的成功因素。

请分析以下内容，识别其爆款特征：

【内容信息】
标题：{title}
选题：{topic}
脚本类型：{scriptType}
内容预览：{contentPreview}

【效果数据】
播放量：{viewCount}
点赞数：{likeCount}
评论数：{commentCount}
转发数：{shareCount}
收藏数：{collectCount}
完播率：{finishRate}%

请从以下维度分析：

1. 标题分析
   - 标题公式：识别使用的标题公式（如"数字+金额"、"疑问悬念"等）
   - 关键词：提取有吸引力的关键词
   - 长度评估：标题长度是否合适

2. 开头分析
   - 开头类型：识别开头属于哪种类型（悬念式/痛点式/反差式/疑问式/故事式/金句式）
   - 钩子强度：评估开头的吸引力（1-10分）
   - 前3秒效果：分析开场是否能在3秒内抓住注意力

3. 情绪分析
   - 主导情绪：识别内容主要激发的情绪（好奇/焦虑/共鸣/惊喜/愤怒等）
   - 情绪强度：评估情绪调动程度（高/中/低）
   - 情绪曲线：描述内容的情绪变化

4. 内容特征
   - 独特性：内容的独特之处
   - 相关性：与目标受众的相关程度
   - 价值点：提供的核心价值

5. 爆款得分
   - 综合评分：0-100分
   - 核心因素：列出3-5个最关键的成功因素

请以JSON格式返回分析结果：
{
  "titleFormula": "标题公式名称",
  "openingType": "开头类型",
  "hookStrength": 数字,
  "emotionType": "主导情绪",
  "emotionIntensity": "强度",
  "uniquenessScore": 数字,
  "relevanceScore": 数字,
  "keywords": ["关键词1", "关键词2"],
  "hitScore": 数字,
  "coreFactors": ["因素1", "因素2", "因素3"],
  "suggestions": ["建议1", "建议2"]
}`;

// 学习用户风格的提示词
const STYLE_LEARNING_PROMPT = `你是一位内容风格分析专家，擅长从用户的创作历史中识别独特的风格特征。

请分析以下用户的创作数据，生成风格画像：

【用户数据】
总内容数：{totalContents}
爆款数：{totalHits}
爆款率：{hitRate}%
平均播放量：{avgViews}
平均点赞数：{avgLikes}

【爆款案例】
{hitExamples}

【失败案例】
{failExamples}

请分析用户的：
1. 写作风格（正式/轻松/幽默/专业）
2. 语气偏好（亲切/权威/中立）
3. 语言风格（简洁/详细/口语化）
4. 标题偏好（常用公式、长度偏好、是否喜欢用数字）
5. 开头偏好（偏好的开头类型）
6. 内容偏好（偏好的脚本类型、平均长度）
7. 情绪偏好（主导情绪、情绪强度）

以JSON格式返回：
{
  "writingStyle": "风格",
  "tonePreference": "语气",
  "languageStyle": "语言风格",
  "titleFormulas": ["公式1", "公式2"],
  "titleLengthPreference": "short/medium/long",
  "titleNumberPreference": true/false,
  "titleEmotionWords": ["词1", "词2"],
  "preferredOpeningTypes": ["类型1", "类型2"],
  "preferredScriptTypes": ["类型1", "类型2"],
  "avgContentLength": 数字,
  "dominantEmotions": ["情绪1", "情绪2"],
  "emotionIntensity": "high/medium/low",
  "confidenceScore": 数字
}`;

/**
 * 分析爆款特征
 */
export async function analyzeHitFactors(
  performance: ContentPerformance
): Promise<AIAnalysisResult> {
  const config = new Config();
  const client = new LLMClient(config);
  
  const prompt = ANALYSIS_PROMPT
    .replace('{title}', performance.title || '无标题')
    .replace('{topic}', performance.topic || '无选题')
    .replace('{scriptType}', performance.scriptType || '未分类')
    .replace('{contentPreview}', performance.contentPreview || '无内容')
    .replace('{viewCount}', String(performance.viewCount))
    .replace('{likeCount}', String(performance.likeCount))
    .replace('{commentCount}', String(performance.commentCount))
    .replace('{shareCount}', String(performance.shareCount))
    .replace('{collectCount}', String(performance.collectCount))
    .replace('{finishRate}', String(performance.finishRate || 0));

  const messages: Message[] = [
    { role: 'system', content: '你是一位专业的内容分析专家，请以JSON格式返回分析结果。' },
    { role: 'user', content: prompt },
  ];

  try {
    const stream = await client.stream(messages, {
      model: 'doubao-seed-1-6',
      temperature: 0.3,
    });

    let result = '';
    for await (const chunk of stream) {
      if (chunk.content) {
        result += chunk.content;
      }
    }

    // 解析JSON结果
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      const hitFactors: HitFactors = {
        titleFormula: parsed.titleFormula,
        openingType: parsed.openingType,
        hookStrength: parsed.hookStrength,
        emotionType: parsed.emotionType,
        uniquenessScore: parsed.uniquenessScore,
        relevanceScore: parsed.relevanceScore,
        keywords: parsed.keywords,
      };

      return {
        isHit: (parsed.hitScore || 0) >= 60,
        hitScore: parsed.hitScore || 0,
        hitFactors,
        analysis: generateAnalysisText(parsed),
        suggestions: parsed.suggestions || [],
      };
    }
  } catch (error) {
    console.error('AI分析失败:', error);
  }

  // 返回默认分析
  return {
    isHit: performance.viewCount > 10000,
    hitScore: calculateSimpleHitScore(performance),
    hitFactors: {},
    analysis: '自动分析：播放量达到爆款标准',
    suggestions: [],
  };
}

/**
 * 学习用户风格
 */
export async function learnUserStyle(
  uid: string,
  hits: ContentPerformance[],
  fails: ContentPerformance[],
  stats: {
    totalContents: number;
    totalHits: number;
    hitRate: number;
    avgViews: number;
    avgLikes: number;
  }
): Promise<Partial<UserStyleProfile>> {
  const config = new Config();
  const client = new LLMClient(config);
  
  // 格式化案例
  const hitExamples = hits.slice(0, 5).map(h => 
    `标题：${h.title}\n播放：${h.viewCount} 点赞：${h.likeCount}\n类型：${h.scriptType}`
  ).join('\n\n');
  
  const failExamples = fails.slice(0, 3).map(f => 
    `标题：${f.title}\n播放：${f.viewCount} 点赞：${f.likeCount}\n类型：${f.scriptType}`
  ).join('\n\n');

  const prompt = STYLE_LEARNING_PROMPT
    .replace('{totalContents}', String(stats.totalContents))
    .replace('{totalHits}', String(stats.totalHits))
    .replace('{hitRate}', String(stats.hitRate.toFixed(1)))
    .replace('{avgViews}', String(stats.avgViews))
    .replace('{avgLikes}', String(stats.avgLikes))
    .replace('{hitExamples}', hitExamples)
    .replace('{failExamples}', failExamples);

  const messages: Message[] = [
    { role: 'system', content: '你是一位专业的风格分析专家，请以JSON格式返回分析结果。' },
    { role: 'user', content: prompt },
  ];

  try {
    const stream = await client.stream(messages, {
      model: 'doubao-seed-1-6',
      temperature: 0.3,
    });

    let result = '';
    for await (const chunk of stream) {
      if (chunk.content) {
        result += chunk.content;
      }
    }

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('风格学习失败:', error);
  }

  // 返回基于统计的默认风格
  return {
    writingStyle: 'casual',
    tonePreference: 'friendly',
    languageStyle: 'colloquial',
    learningProgress: Math.min(stats.totalContents * 5, 100),
    confidenceScore: Math.min(stats.totalHits * 10, 100),
  };
}

/**
 * 生成分析文本
 */
function generateAnalysisText(parsed: Record<string, unknown>): string {
  const parts: string[] = [];
  
  if (parsed.titleFormula) {
    parts.push(`标题使用了"${parsed.titleFormula}"公式`);
  }
  if (parsed.openingType) {
    parts.push(`开头采用${parsed.openingType}方式，钩子强度${parsed.hookStrength || '未知'}分`);
  }
  if (parsed.emotionType) {
    parts.push(`主要激发${parsed.emotionType}情绪，强度${parsed.emotionIntensity || '中等'}`);
  }
  if (parsed.coreFactors) {
    parts.push(`核心成功因素：${(parsed.coreFactors as string[]).join('、')}`);
  }
  
  return parts.join('。');
}

/**
 * 简单计算爆款得分
 */
function calculateSimpleHitScore(performance: ContentPerformance): number {
  let score = 0;
  
  // 播放量贡献（最多40分）
  score += Math.min(performance.viewCount / 1000, 40);
  
  // 点赞贡献（最多30分）
  score += Math.min(performance.likeCount / 100, 30);
  
  // 完播率贡献（最多30分）
  if (performance.finishRate) {
    score += performance.finishRate * 0.3;
  }
  
  return Math.min(score, 100);
}
