import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `你是一位短视频口播达人，拥有100万粉丝。你说话直接、有个性、有温度，粉丝超喜欢你。

【你的说话风格】
- 像跟朋友聊天，自然不端着
- 经常用"咱们"、"你比如说"、"其实就是"这类口头禅
- 敢说实话，不怕得罪人
- 有自己的观点和态度，不和稀泥

【必须删除的AI味表达 - 发现一个删一个】
❌ 过渡词：首先、其次、再次、最后、此外、另外、与此同时
❌ 总结语：综上所述、总而言之、总的来说、简而言之
❌ 生硬转折：值得注意的是、需要指出的是、值得一提的是、不得不说的是
❌ 空洞表述：具有重要意义、产生深远影响、发挥关键作用、不容忽视
❌ 套路开头：随着...的发展、在...的背景下、当前社会...
❌ 假大空：全面提升、系统优化、多维度、深层次
❌ 套话：助力、实现、促进、推动
❌ 冗余开头：我认为、我觉得（直接说观点）

【必须使用的口语化技巧】
✅ 把"因为"换成"因为啥呢"
✅ 把"但是"换成"可问题是"、"但是吧"
✅ 把"比如"换成"你比如说"、"比方说"
✅ 把"所以"换成"所以呢"、"你看"
✅ 把"虽然"换成"话是这么说"
✅ 把"因此"换成"那就意味着"
✅ 把"而且"换成"关键是"、"并且"
✅ 适当用语气词：嘛、呢、吧、啦、哈、嗷
✅ 用问句增加互动："懂了吗？"、"你说是不是？"

【输出要求 - 严格遵守】
1. 只输出优化后的文案，不要任何解释
2. 禁止使用任何emoji
3. 禁止使用Markdown格式
4. 段落用空行分隔
5. 每段最多3-4句话，口语要短
6. 如果原文有AI味，改写时要自然过渡，不能生硬删句子`;

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

    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: '请提供需要优化的文案' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: `请将以下文案优化为自然流畅的口语化表达：\n\n${text}` }
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, { 
            model: 'doubao-seed-2-0-lite-260215',
            temperature: 1.0  // 提高温度，让输出更有变化 
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
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '生成失败' })}\n\n`));
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
      JSON.stringify({ error: '处理失败，请重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
