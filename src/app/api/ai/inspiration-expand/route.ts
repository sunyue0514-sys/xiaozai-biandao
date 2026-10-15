import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, KnowledgeClient, Config, HeaderUtils, Message, ContentPart } from 'coze-coding-dev-sdk';
import { hasSession } from '@/lib/session';
import { isMultimodalErrorFormat } from '@/lib/llm-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 灵感扩展提示词 - 更简洁实用
const EXPANSION_PROMPTS: Record<string, string> = {
  topic: `你是一位短视频选题专家。请基于用户的灵感和参考信息，快速生成3个可直接使用的选题建议。

【输出格式要求】
1. 不要使用Markdown格式符号（#、*、-、>等）
2. 不要使用emoji表情
3. 使用自然的段落和空行分隔
4. 用数字序号组织内容

请按以下格式输出：

选题建议

1. [标题]
核心卖点：一句话说明为什么这个选题会火
建议形式：推荐用什么形式表现（vlog/口播/剧情等）

2. [标题]
核心卖点：...
建议形式：...

3. [标题]
核心卖点：...
建议形式：...`,

  framework: `你是一位短视频脚本架构师。请基于用户的灵感和参考信息，生成一个简洁的内容框架。

【输出格式要求】
1. 不要使用Markdown格式符号
2. 不要使用emoji表情
3. 用中文数字组织结构

请按以下格式输出：

内容框架

一、开场（前3秒）
钩子话术：[直接可用的开场白]
目的：抓住注意力

二、核心内容（中间部分）
要点1：[具体内容]
要点2：[具体内容]
要点3：[具体内容]

三、结尾（最后5秒）
总结：[一句话总结]
引导：[引导互动的话术]`,

  script: `你是一位短视频脚本创作专家。请基于用户的灵感和参考信息，生成一个简短的口播脚本。

【输出格式要求】
1. 不要使用Markdown格式符号
2. 不要使用emoji表情
3. 语言要口语化、自然流畅

请按以下格式输出：

口播脚本

【时长】约30秒

【开场】
（直接写开场白，约5秒）

【正文】
（核心内容，约20秒）

【结尾】
（引导互动，约5秒）

【拍摄建议】
镜头1：...
镜头2：...`,
};

// 搜索知识库获取相关参考信息
async function searchKnowledge(
  query: string,
  customHeaders: Record<string, string>
): Promise<string | null> {
  try {
    const config = new Config();
    const knowledgeClient = new KnowledgeClient(config, customHeaders);
    
    // 搜索相关知识（历史内容、爆款特征、内容风格等）
    const searchResponse = await knowledgeClient.search(
      query,
      undefined, // 搜索所有数据集
      3,   // topK
      0.5  // minScore
    );

    if (searchResponse.code === 0 && searchResponse.chunks.length > 0) {
      const contexts = searchResponse.chunks
        .map(chunk => `[相关度: ${(chunk.score * 100).toFixed(0)}%]\n${chunk.content}`)
        .join('\n\n---\n\n');
      return contexts;
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
    const { content, type = 'topic', imageUrl, useKnowledge = true } = body;

    if (!content && !imageUrl) {
      return NextResponse.json({ error: '请输入灵感内容' }, { status: 400 });
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // 构建系统提示词
    const systemPrompt = EXPANSION_PROMPTS[type] || EXPANSION_PROMPTS.topic;
    
    // 搜索知识库获取相关参考
    let knowledgeContext = '';
    if (useKnowledge && content) {
      const searchQuery = `短视频 ${type === 'topic' ? '选题' : type === 'framework' ? '内容框架' : '脚本'} ${content}`;
      const knowledgeResult = await searchKnowledge(searchQuery, customHeaders);
      if (knowledgeResult) {
        knowledgeContext = `\n\n【用户的历史内容和风格参考】\n${knowledgeResult}\n\n请参考以上内容风格，但不要直接复制，要创新。`;
      }
    }
    
    // 构建消息
    const userContent: ContentPart[] = [];
    
    // 文本内容
    if (content) {
      userContent.push({ 
        type: 'text', 
        text: `灵感内容：\n${content}${knowledgeContext}` 
      });
    }
    
    // 图片内容
    if (imageUrl) {
      userContent.push({ 
        type: 'image_url' as const, 
        image_url: { url: imageUrl } 
      });
      if (!content) {
        userContent.unshift({ 
          type: 'text', 
          text: `请分析这张图片中的灵感，并按照要求扩展。${knowledgeContext}` 
        });
      }
    }

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    // 流式输出
    const encoder = new TextEncoder();
    let accumulatedContent = '';
    
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = llmClient.stream(messages, {
            temperature: 0.7,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              accumulatedContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }
          
          // 最终检测：如果累积内容是错误格式，发送错误消息
          if (isMultimodalErrorFormat(accumulatedContent)) {
            console.error('API operation event');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '图片识别失败，请确保图片清晰且格式正确' })}\n\n`));
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: '生成失败，请重试' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { error: '灵感扩展失败，请稍后重试' },
      { status: 500 }
    );
  }
}
