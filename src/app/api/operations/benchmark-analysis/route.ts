import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `你是一位专业的短视频账号竞品分析师，擅长通过对比分析帮助创作者找到增长突破口。你的任务是提供深度的对标分析报告，帮助创作者学习和超越对标账号。

【分析框架】
你需要从多个维度进行对比分析：

1. 账号规模对比
- 粉丝量级差距
- 增长速度对比
- 发展阶段判断

2. 内容策略对比
- 内容定位差异
- 选题方向对比
- 拍摄手法和风格
- 文案风格差异

3. 运营节奏对比
- 发布频率
- 发布时段规律
- 内容系列化程度

4. 爆款内容拆解
分析对标账号的成功因素：
- 爆款选题特点
- 视频结构分析
- 互动引导方式
- 变现模式

5. 差距诊断
- 内容层面差距
- 运营层面差距
- 资源层面差距

6. 可复制经验
列出可直接借鉴的做法：
- 具体选题方向
- 文案模板和话术
- 拍摄手法
- 互动技巧
- 发布策略

7. 差异化建议
如何在借鉴基础上形成特色：
- 人设打造方向
- 内容差异化切入点
- 独特记忆点设计

8. 行动清单
- 本周要做的3件事
- 本月要完成的目标
- 需要准备的资源

【输出要求】
1. 分析要具体，给出可操作建议
2. 既要学习对标，也要保持差异化
3. 结合平台算法特性
4. 语言自然专业，不要使用"首先、其次、再次"等AI味表达
5. 不要使用Markdown格式符号
6. 不要使用emoji表情`;

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
      myAccount,
      myFollowers,
      myContentStyle,
      myProblems,
      benchmarkAccounts,
    } = body;

    if (!myAccount) {
      return new Response(
        JSON.stringify({ error: '请提供您的账号名称' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!benchmarkAccounts || benchmarkAccounts.length === 0) {
      return new Response(
        JSON.stringify({ error: '请至少提供一个对标账号' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 构建我的账号信息
    const myAccountInfo = `
平台：${platformLabel}
账号名称：${myAccount}
${myFollowers ? `粉丝数量：${myFollowers}` : ''}
${myContentStyle ? `内容风格：${myContentStyle}` : ''}
${myProblems ? `当前问题：${myProblems}` : ''}
`.trim();

    // 构建对标账号信息
    const benchmarkInfo = benchmarkAccounts.map((account: any, index: number) => `
对标账号${index + 1}：
- 名称：${account.name || '未提供'}
- 链接：${account.url || '未提供'}
- 粉丝：${account.followers || '未知'}
- 风格：${account.contentStyle || '未描述'}
`).join('\n');

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: `请进行对标分析：\n\n【我的账号】\n${myAccountInfo}\n\n【对标账号】\n${benchmarkInfo}` }
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
