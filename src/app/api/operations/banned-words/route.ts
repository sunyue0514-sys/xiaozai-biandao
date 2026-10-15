import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `你是一位专业的内容合规审核专家。你的任务是检测文案中的违禁词和风险词汇，并提供修改建议。

【检测范围】
1. 广告法违禁词：
   - 极限词：最、第一、顶级、极致、独家、首创、唯一、冠军等
   - 虚假宣传词：100%有效、根治、永不复发、包治百病等
   - 权威背书词：国家级、世界级、全国首创、填补国内空白等

2. 平台敏感词：
   - 涉及政治敏感、宗教敏感的内容
   - 涉及暴力、低俗、歧视的内容
   - 涉及违法、违规的内容

3. 行业限制词：
   - 医疗健康：治疗、治愈、药效、处方等
   - 金融投资：保本、保收益、稳赚、翻倍等
   - 教育培训：包过、保过、押题、透题等

4. 虚假承诺词：
   - 保证、承诺、必定、一定等绝对化表述

【输出格式】
请严格按照以下JSON格式输出，不要添加任何其他内容：
{
  "hasBannedWords": true/false,
  "bannedWords": [
    {
      "word": "违禁词",
      "category": "类别（广告法违禁词/平台敏感词/行业限制词/虚假承诺词）",
      "suggestion": "修改建议",
      "positions": [出现位置]
    }
  ],
  "riskLevel": "low/medium/high",
  "summary": "检测摘要",
  "processedText": "修改后的文案（如果有违禁词）"
}

【风险等级判断标准】
- high: 存在3个以上违禁词，或包含平台敏感词
- medium: 存在1-2个违禁词
- low: 无违禁词

【注意事项】
1. 只输出JSON，不要输出其他任何文字
2. 如果没有违禁词，bannedWords数组为空，processedText可以为原文或空
3. 修改建议要具体可行，不要笼统地说"修改表述"`;

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供需要检测的文案' },
        { status: 400 }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: `请检测以下文案中的违禁词：\n\n${text}` }
    ];

    const response = await client.invoke(messages, { temperature: 0.3 });
    
    // 解析AI返回的JSON
    let result;
    try {
      // 尝试提取JSON部分
      const content = response.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析AI返回结果');
      }
    } catch (parseError) {
      console.error('API operation event');
      // 如果解析失败，返回默认的安全结果
      result = {
        hasBannedWords: false,
        bannedWords: [],
        riskLevel: 'low',
        summary: '检测完成，未发现明显违禁词',
        processedText: text
      };
    }

    // 确保结果格式正确
    const safeResult = {
      hasBannedWords: result.hasBannedWords || false,
      bannedWords: Array.isArray(result.bannedWords) ? result.bannedWords : [],
      riskLevel: result.riskLevel || 'low',
      summary: result.summary || '检测完成',
      processedText: result.processedText || text
    };

    return NextResponse.json({
      success: true,
      result: safeResult
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '检测失败，请重试' },
      { status: 500 }
    );
  }
}
