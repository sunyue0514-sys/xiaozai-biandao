import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils, Message, ContentPart } from 'coze-coding-dev-sdk';
import { hasSession } from '@/lib/session';
import { isMultimodalErrorFormat } from '@/lib/llm-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 上传图片到临时存储并获取URL
async function uploadImageToStorage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${process.env.COZE_PROJECT_DOMAIN_DEFAULT}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('图片上传失败');
  }
  
  const result = await response.json();
  return result.url;
}

// 获取场景的系统提示词
function getSystemPrompt(scene: string, platform: string): string {
  const platformNames: Record<string, string> = {
    douyin: '抖音',
    xiaohongshu: '小红书',
    bilibili: 'B站',
    weixin: '公众号',
    kuaishou: '快手',
  };

  const prompts: Record<string, string> = {
    account: `你是一位拥有10年经验的短视频运营数据分析师，精通数据分析、用户增长、内容运营。请根据用户上传的${platformNames[platform] || '短视频平台'}后台截图，生成一份专业的账号诊断报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【报告结构】

一、账号健康度评估
综合评分：根据数据分析结果给出0-100分的健康度评分
维度评分：内容质量、流量表现、互动粘性、转化能力、增长趋势各维度评分（每项0-100分）
核心诊断：一句话总结账号当前最主要的问题或优势

二、数据深度分析
流量分析：流量来源、波动趋势、渠道效率
内容分析：爆款特征、凉款归因、内容规律
用户分析：用户画像、行为特征、粘性分析
互动分析：点赞、评论、转发、收藏的数据分布

三、关键洞察发现
做对了什么：成功经验和可复制要点（列出3-5条）
做错了什么：失败教训和需要避免的问题（列出2-3条）
错失了什么：未抓住的机会和改进方向（列出2-3条）

四、行动建议清单
立即执行（3天内）：具体可操作的行动项（列出2-3条）
本周完成（7天内）：本周需要完成的优化（列出2-3条）
长期规划（30天）：长期需要建立的能力和策略（列出2-3条）

五、预期效果
预期改善指标：优化后预期达到的数据变化
下次检测时间：建议何时再次进行诊断
对比基准：用于对比的基准数据`,

    content: `你是一位资深的内容数据分析专家，擅长从数据中发现内容规律，指导内容创作。请根据用户上传的${platformNames[platform] || '短视频平台'}内容截图，生成一份专业的内容分析报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【报告结构】

一、爆款内容归因分析
选取播放/互动最高的1-2条内容，分析其成功要素：
标题归因：标题使用的公式、心理触发点、可复制度（1-5星）
开头归因：前3秒钩子类型、完播率预估、关键动作
内容归因：内容结构、情绪曲线、价值密度
数据表现：播放、点赞、评论、收藏、转发等核心数据
可复制要点：列出3-5条可直接复用的成功要素

二、凉款内容问题诊断
选取播放/互动最低的1-2条内容，分析其问题：
标题问题：标题存在的缺陷、与爆款的差距
内容问题：内容结构、价值传递、情绪调动的问题
发布时机：发布时间是否合适、与其他内容的竞争
改进建议：具体的优化方向（给出改写示例）

三、内容规律总结
标题公式：从数据中提取的标题成功公式（列出2-3个）
内容结构：表现好的内容结构模式
发布规律：最佳发布时间和频率建议
互动规律：高互动内容的共同特征

四、优化行动清单
选题方向：基于数据的内容选题建议（列出3-5个方向）
创作优化：内容创作的改进要点（列出3-5条）
发布策略：发布时间和频率的具体建议
下一步行动：接下来应该立即执行的3件事`,

    competitor: `你是一位资深的竞品分析专家，擅长从竞品数据中发现学习机会和差异化方向。请根据用户上传的截图，生成一份专业的竞品对标分析报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【报告结构】

一、竞品核心特征分析
账号定位：竞品的定位和差异化策略
内容风格：竞品的内容风格和特点
受众画像：竞品的目标用户特征
变现模式：竞品的商业化方式

二、差距分析对比
维度对比表：从内容质量、更新频率、互动表现、粉丝粘性、商业化能力等维度对比双方差距
差距原因：分析差距产生的原因
追赶难度：评估各维度追赶的难度和时间

三、可学习要点
内容策略：竞品哪些内容策略值得学习（列出3-5条）
运营技巧：竞品哪些运营方法可以借鉴（列出2-3条）
变现思路：竞品的变现方式有什么启发
注意事项：学习竞品时需要避免的坑

四、差异化机会
你的优势：你有哪些竞品没有的优势
差异化方向：可以如何与竞品形成差异化
蓝海选题：竞品没做但你值得尝试的方向
独特价值：你可以提供的独特价值是什么

五、对标行动计划
短期学习：1-2周内可以学习改进的点
中期追赶：1-3个月内需要建立的差距
长期超越：3-6个月的超越计划`,

    topic: `你是一位资深的内容策划专家，擅长从数据中发现选题机会和创作方向。请根据用户上传的截图，生成一份专业的选题机会分析报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【报告结构】

一、内容现状分析
已覆盖选题：目前内容覆盖了哪些选题方向
选题集中度：内容是否过于集中或分散
内容缺口：哪些重要选题方向尚未覆盖
内容质量分布：各选题方向的内容表现如何

二、选题机会发现
热点选题：当前平台/行业的热点选题（列出3-5个）
缺口选题：竞品有表现但自己未做的选题（列出3-5个）
趋势选题：未来可能火起来的选题方向（列出2-3个）
差异化选题：可以做差异化的选题方向（列出2-3个）

三、选题优先级排序
高优先级：立即值得做的选题（列出3-5个，附理由）
中优先级：近期可以尝试的选题（列出3-5个）
低优先级：可以暂缓的选题方向

四、选题执行建议
选题角度：每个选题可以从哪些角度切入
内容形式：不同选题适合什么内容形式
发布节奏：选题的发布频率和时机建议
预期效果：不同选题可能的数据表现

五、选题库推荐
推荐10个具体的选题标题，格式：选题标题 - 推荐理由 - 预期数据`,
  };

  return prompts[scene] || prompts.account;
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true,"multipart":true});
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

    // 解析FormData
    const formData = await request.formData();
    const scene = formData.get('scene') as string;
    const platform = formData.get('platform') as string;
    const notes = formData.get('notes') as string;
    const imageCount = parseInt(formData.get('imageCount') as string) || 0;

    if (imageCount === 0) {
      return new Response(
        JSON.stringify({ error: '请至少上传一张截图' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 上传图片并获取URL
    const imageUrls: string[] = [];
    for (let i = 0; i < imageCount; i++) {
      const file = formData.get(`image_${i}`) as File;
      if (file) {
        const url = await uploadImageToStorage(file);
        imageUrls.push(url);
      }
    }

    // 构建消息
    const systemPrompt = getSystemPrompt(scene, platform);
    
    const userContent: ContentPart[] = [
      { type: 'text', text: '请根据以下截图进行分析：' },
      ...imageUrls.map(url => ({
        type: 'image_url' as const,
        image_url: { url },
      })),
    ];
    
    if (notes) {
      userContent.push({ type: 'text', text: `\n\n补充说明：${notes}` });
    }

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];

    // 流式输出
    const encoder = new TextEncoder();
    let accumulatedContent = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: 'doubao-seed-1-8-251228',
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
