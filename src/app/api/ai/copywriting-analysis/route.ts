import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 文案分析 API
 * 使用AI进行高质量的开篇评分、营销植入分析和质量检查
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractOpening,
  calculateOpeningScoreBasic,
  analyzeMarketing,
  performQualityCheck,
  evaluateCopywritingRating,
} from '@/lib/copywriting-analysis';
import {
  OpeningScore,
  MarketingAnalysis,
  QualityCheck,
  CreationAnalysis,
} from '@/components/result/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalysisRequest {
  content: string;
  topic?: string;
  scriptType?: string;
  targetWordCount?: [number, number];
  useAI?: boolean;
  detailed?: boolean;  // 是否生成详细版创作分析
  industry?: string;   // 行业信息
  productService?: string; // 产品/服务信息
}

/**
 * 使用AI进行开篇评分
 */
async function calculateOpeningScoreWithAI(
  opening: string,
  topic: string,
  token: string
): Promise<OpeningScore> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/llm/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `你是一位专业的短视频内容分析师，擅长评估短视频开篇的吸引力。
请对以下开篇进行评分，从三个维度评估：
1. 好奇心触发（0-100分）：是否引发观众好奇
2. 利益点前置（0-100分）：是否直接关联观众利益
3. 情绪共鸣（0-100分）：是否触动观众情绪

请以JSON格式返回评分结果，格式如下：
{
  "scores": [
    {"name": "好奇心触发", "score": 85, "reason": "有疑问句，引发思考"},
    {"name": "利益点前置", "score": 70, "reason": "提到省钱，直接相关"},
    {"name": "情绪共鸣", "score": 80, "reason": "触及装修痛点"}
  ],
  "comment": "开篇用反问句引发思考，直接关联省钱利益，触及装修踩坑的普遍痛点，整体表现良好。"
}`
          },
          {
            role: 'user',
            content: `请评估以下短视频开篇：
选题：${topic}
开篇内容：
"${opening}"

请给出评分和点评。`
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('AI评分请求失败');
    }

    const data = await response.json();
    
    if (data.success && data.data?.content) {
      // 尝试解析AI返回的JSON
      try {
        // 提取JSON部分
        const content = data.data.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          const items = parsed.scores.map((s: any) => ({
            name: s.name,
            passed: s.score >= 60,
            score: s.score,
            maxScore: 100,
            reason: s.reason,
          }));
          
          const total = items.reduce((sum: number, item: any) => sum + item.score, 0);
          
          return {
            total,
            maxTotal: 300,
            items,
            comment: parsed.comment,
          };
        }
      } catch (parseError) {
        console.warn('API operation event');
      }
    }
    
    // AI评分失败，回退到基础评分
    return calculateOpeningScoreBasic(opening, topic);
  } catch (error) {
    console.error('API operation event');
    return calculateOpeningScoreBasic(opening, topic);
  }
}

/**
 * 使用AI进行营销植入分析
 */
async function analyzeMarketingWithAI(
  content: string,
  token: string
): Promise<MarketingAnalysis> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/llm/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `你是一位专业的营销内容分析师。请分析以下文案中的营销植入情况。

请判断：
1. 切入位置：none(无植入)、beginning(开头)、middle(中间)、end(结尾)、throughout(贯穿全文)
2. 切入方式：描述营销信息是如何植入的
3. 营销占比：估计营销文案占总文案的百分比(0-100)
4. 自然度：1-5分，5分表示极度自然，1分表示生硬
5. 营销文案：提取具体的营销关键词或句子

请以JSON格式返回：
{
  "position": "end",
  "method": "在解决方案中自然植入",
  "ratio": 5,
  "naturalness": 5,
  "marketingText": "找靠谱装修公司"
}`
          },
          {
            role: 'user',
            content: `请分析以下文案的营销植入情况：
"${content.substring(0, 500)}"`
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('AI营销分析请求失败');
    }

    const data = await response.json();
    
    if (data.success && data.data?.content) {
      try {
        const content = data.data.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          const positionMap: Record<string, string> = {
            'none': 'none',
            'beginning': 'beginning',
            'middle': 'middle',
            'end': 'end',
            'throughout': 'throughout',
          };
          
          const position = positionMap[parsed.position] || 'none';
          const positionLabels: Record<string, string> = {
            'none': '无植入',
            'beginning': '开头植入',
            'middle': '中间植入',
            'end': '结尾植入',
            'throughout': '贯穿全文',
          };
          
          const naturalnessLabels: Record<number, string> = {
            1: '生硬',
            2: '略生硬',
            3: '较自然',
            4: '自然',
            5: '极度自然',
          };
          
          return {
            position: position as any,
            positionLabel: positionLabels[position],
            method: parsed.method || '自然植入',
            ratio: Math.min(100, Math.max(0, parsed.ratio || 0)),
            naturalness: Math.min(5, Math.max(1, parsed.naturalness || 3)) as 1|2|3|4|5,
            naturalnessLabel: naturalnessLabels[parsed.naturalness] || '较自然',
            marketingText: parsed.marketingText,
          };
        }
      } catch (parseError) {
        console.warn('API operation event');
      }
    }
    
    return analyzeMarketing(content, []);
  } catch (error) {
    console.error('API operation event');
    return analyzeMarketing(content, []);
  }
}

/**
 * 使用AI生成创作分析（详细版专用）
 */
async function generateCreationAnalysisWithAI(
  content: string,
  topic: string,
  industry: string,
  productService: string,
  token: string
): Promise<CreationAnalysis> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/llm/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `你是一位专业的短视频内容策划师。请分析以下文案的创作策略，以JSON格式返回。

返回格式：
{
  "topicAnalysis": "选题分析：这个选题为什么好，切中了什么",
  "fiveStageSystem": {
    "valueGeneration": "如何生成价值",
    "businessArchitecture": "商业架构如何设计"
  },
  "fourPointsAnalysis": {
    "needs": "用户需求是什么",
    "painPoints": "痛点是什么",
    "pleasurePoints": "爽点是什么",
    "itchPoints": "痒点是什么"
  },
  "targetAudience": "目标人群画像",
  "videoType": "视频类型（如：知识科普、情感共鸣、产品种草等）",
  "marketingStrategy": "营销策略简述",
  "framework": {
    "structure": "文案结构说明",
    "opening": 50,
    "argumentA": 80,
    "argumentB": 80,
    "argumentC": 80,
    "conclusion": 60
  },
  "shootingMethod": {
    "method": "推荐拍摄方式",
    "reason": "推荐理由",
    "alternative": "备选方式"
  }
}`
          },
          {
            role: 'user',
            content: `请分析以下短视频文案的创作策略：

选题：${topic}
行业：${industry || '通用'}
产品/服务：${productService || '无'}

文案内容：
"${content}"

请给出详细的创作分析。`
          }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('AI创作分析请求失败');
    }

    const data = await response.json();
    
    if (data.success && data.data?.content) {
      try {
        const aiContent = data.data.content;
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          return {
            topicAnalysis: parsed.topicAnalysis || '',
            fiveStageSystem: parsed.fiveStageSystem,
            fourPointsAnalysis: parsed.fourPointsAnalysis,
            targetAudience: parsed.targetAudience || '',
            videoType: parsed.videoType,
            marketingStrategy: parsed.marketingStrategy || '',
            framework: parsed.framework,
            shootingMethod: parsed.shootingMethod,
          };
        }
      } catch (parseError) {
        console.warn('API operation event');
      }
    }
    
    // 返回默认值
    return {
      topicAnalysis: `选题"${topic}"紧扣用户需求，具有较强的实用性`,
      targetAudience: '对该话题感兴趣的短视频用户',
      marketingStrategy: '内容中自然植入产品价值',
    };
  } catch (error) {
    console.error('API operation event');
    return {
      topicAnalysis: `选题"${topic}"紧扣用户需求，具有较强的实用性`,
      targetAudience: '对该话题感兴趣的短视频用户',
      marketingStrategy: '内容中自然植入产品价值',
    };
  }
}

/**
 * POST /api/ai/copywriting-analysis
 * 分析文案的开篇评分、营销植入和质量检查
 */
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const body: AnalysisRequest = await request.json();
    const { 
      content, 
      topic = '', 
      scriptType = '',
      targetWordCount = [300, 500],
      useAI = true,
      detailed = false,
      industry = '',
      productService = '',
    } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      );
    }

    // 提取开篇（仅用于返回数据展示）
    const opening = extractOpening(content);

    // 并行执行分析
    // 注意：calculateOpeningScoreBasic 现在基于整个文案评分，不再只评分开篇
    const [openingScore, marketingAnalysis, qualityCheck, creationAnalysis] = await Promise.all([
      // 文案综合评分（基于整个文案，包含薛辉方法论）
      useAI 
        ? calculateOpeningScoreWithAI(content, topic, token)
        : Promise.resolve(calculateOpeningScoreBasic(content, topic)),
      
      // 营销植入分析
      useAI
        ? analyzeMarketingWithAI(content, token)
        : Promise.resolve(analyzeMarketing(content, [])),
      
      // 质量检查（不需要AI）
      Promise.resolve(performQualityCheck(content, targetWordCount[0], targetWordCount[1])),
      
      // 创作分析（仅在详细模式下）
      detailed && useAI
        ? generateCreationAnalysisWithAI(content, topic, industry, productService, token)
        : Promise.resolve(undefined),
    ]);

    // 计算综合评级
    const rating = evaluateCopywritingRating(
      openingScore.total,
      openingScore.maxTotal,
      qualityCheck
    );

    return NextResponse.json({
      success: true,
      data: {
        opening,
        openingScore,
        marketingAnalysis,
        qualityCheck,
        creationAnalysis,
        rating,
        wordCount: content.replace(/\s/g, '').length,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { 
        success: false, 
        error: '分析失败: ' + (error instanceof Error ? 'Request failed' : '未知错误') 
      },
      { status: 500 }
    );
  }
}
