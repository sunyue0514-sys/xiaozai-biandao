import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `你是一位专业的短视频账号运营分析师，拥有丰富的新媒体平台运营经验。你的任务是提供专业、详细、可执行的账号分析报告。

【分析框架】
你需要从多个维度对账号进行深度分析：

1. 账号整体评估
- 定位清晰度
- 内容垂直度
- 发展阶段判断

2. 数据表现分析
- 播放量转化比
- 互动率评估
- 粉丝活跃度

3. 内容策略分析
- 选题方向评估
- 风格与受众匹配度
- 发布频率和时段

4. 粉丝画像分析
- 目标受众特征
- 粉丝需求洞察
- 用户粘性评估

5. 问题诊断
- 问题根因分析
- 对标同类账号差距

6. 优化建议
- 短期策略（1-2周）
- 中期策略（1-3个月）
- 长期规划（3-6个月）

7. 内容创作建议
- 推荐选题方向
- 拍摄和剪辑风格
- 文案风格建议

【输出要求】
1. 分析要客观专业，避免空洞建议
2. 每个建议都要有可执行性
3. 结合平台特性和算法机制
4. 语言要自然专业，不要使用"首先、其次、再次"等AI味表达
5. 给出具体的数据指标和目标
6. 不要使用Markdown格式符号
7. 不要使用emoji表情`;

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return new Response(
        JSON.stringify({ error: '未登录或登录已过期' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const {
      platformLabel,
      accountName,
      accountUrl,
      followers,
      avgViews,
      avgLikes,
      contentCount,
      mainContent,
      problems,
    } = body;

    if (!accountName && !accountUrl) {
      return new Response(
        JSON.stringify({ error: '请提供账号名称或主页链接' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构建用户消息
    const accountInfo = `
平台：${platformLabel}
账号名称：${accountName}
${accountUrl ? `主页链接：${accountUrl}` : ''}
${followers ? `粉丝数量：${followers}` : ''}
${contentCount ? `作品数量：${contentCount}` : ''}
${avgViews ? `平均播放量：${avgViews}` : ''}
${avgLikes ? `平均点赞数：${avgLikes}` : ''}
${mainContent ? `内容方向：${mainContent}` : ''}
${problems ? `遇到的问题：${problems}` : ''}
`.trim();

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: `请分析以下账号：\n\n${accountInfo}` }
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, { 
            model: 'doubao-seed-2-0-lite-260215',
            temperature: 0.7 
          });
          
          for await (const chunk of llmStream) {
            if (chunk.content) {
              const content = chunk.content.toString();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '分析失败' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API operation event');
    return new Response(
      JSON.stringify({ error: '分析失败，请重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
