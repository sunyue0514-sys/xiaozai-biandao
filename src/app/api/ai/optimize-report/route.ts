import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const { positioning, customerName, industry } = await request.json();
    
    if (!positioning) {
      return new Response(
        JSON.stringify({ error: '缺少IP定位数据' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位拥有10年经验的IP定位报告撰写专家，曾为超过500位创作者撰写IP定位报告。请根据提供的IP定位数据，生成一份专业、完整、易读的IP定位报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 不要使用制表符和框线字符，如╔═══╗等
5. 使用自然的段落和空行分隔内容
6. 用数字序号或中文数字来组织内容
7. 语言要专业、自然、口语化，像一位资深策划师在给客户做报告
8. 直接切入内容，不要有任何开场白

【报告撰写原则】
一、结构清晰：层次分明，逻辑连贯
二、语言精准：专业但不晦涩，用词准确
三、突出亮点：强调核心价值和差异化优势
四、可执行性：提供具体、可落地的建议

【报告结构】

一、核心定位
用一句话概括这个IP的核心定位和差异化价值

二、人设画像
基本身份
身份定位：xxx
昵称建议：xxx
年龄段：xxx
地域标签：xxx

性格特点
用3-5个词概括核心性格，并简要说明为什么选择这些性格标签

成长故事
基于人生经历，讲述一个简短但打动人的成长故事

三、核心能力
专业技能
列出核心技能，并说明这些技能如何转化为内容价值

擅长领域
明确细分领域，说明为什么选择这个领域

独特价值
一句话说清楚能为用户解决什么问题、带来什么改变

四、目标受众
用户画像
年龄段：xxx
职业：xxx
兴趣：xxx

核心痛点
列出3-5个用户最关心的痛点

常见问题
列出用户经常问的3-5个问题

五、内容策略
内容方向
列出4-6个核心内容方向，并说明每个方向的内容价值

内容风格
描述内容风格特点，如何保持一致性

更新节奏
建议的更新频率和发布时间

六、变现路径
短期变现（1-3个月）
快速可以实现的变现方式

中期变现（3-6个月）
需要一定粉丝基础后才能实现的变现方式

长期变现（6个月以上）
需要较大影响力才能实现的变现方式

七、竞争优势
差异化优势
与竞品相比的独特优势

护城河
如何建立竞争壁垒

八、行动计划
第1周任务
具体可执行的任务列表

第2-4周任务
具体可执行的任务列表

第2-3个月目标
阶段性的目标和关键指标`;

    const positioningSummary = `
客户名称：${customerName || '未命名'}
所属行业：${industry || '综合'}

基本信息
身份：${positioning.basicInfo?.identity || ''}
昵称：${positioning.basicInfo?.nickname || ''}
性格：${positioning.basicInfo?.personality?.join('、') || ''}

核心价值
兴趣：${positioning.coreValue?.interests?.join('、') || ''}
技能：${positioning.coreValue?.skills?.join('、') || ''}
擅长：${positioning.coreValue?.specialties?.join('、') || ''}

定位方向
细分领域：${positioning.positioningDirection?.nicheField || ''}
内容赛道：${positioning.positioningDirection?.contentTrack?.join('、') || ''}

用户画像
目标用户：${positioning.userPersona?.targetUsers || ''}
用户痛点：${positioning.userPersona?.userPainPoints || ''}

内容方向
主要话题：${positioning.contentDirection?.mainTopics?.join('、') || ''}
内容风格：${positioning.contentDirection?.contentStyle || ''}
`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `请根据以下IP定位数据，生成完整的分析报告：\n\n${positioningSummary}` },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: 'doubao-seed-2-0-lite-260215',
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`));
          controller.close();
        }
      },
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
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
