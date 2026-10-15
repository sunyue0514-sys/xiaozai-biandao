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

// 分析图片内容
async function analyzeImages(
  client: LLMClient, 
  imageUrls: string[],
  platform: string
): Promise<string> {
  const platformNames: Record<string, string> = {
    douyin: '抖音',
    xiaohongshu: '小红书',
    bilibili: 'B站',
    weixin: '公众号',
    kuaishou: '快手',
  };

  const messages: Message[] = [
    {
      role: 'system',
      content: `你是一个专业的数据分析专家，擅长从平台后台截图中识别和提取数据。
你的任务是仔细分析用户上传的${platformNames[platform] || '短视频平台'}后台截图，提取所有可见的数据指标。

请按以下格式输出识别到的数据：

【基础指标】
- 粉丝数：xxx
- 总播放量：xxx
- 总点赞数：xxx
- 总评论数：xxx
- 总转发/分享数：xxx
- 总收藏数：xxx

【内容数据】
- 视频数量：xxx
- 平均播放量：xxx
- 平均互动率：xxx%
- 最高播放：xxx（视频标题：xxx）
- 最低播放：xxx（视频标题：xxx）

【用户画像】（如有）
- 性别分布：xxx
- 年龄分布：xxx
- 地域分布：xxx

【时间趋势】（如有）
- 近7天/30天趋势：xxx
- 增长/下降幅度：xxx

注意：
1. 只输出能从截图中明确识别的数据
2. 数据不确定时标注"未能识别"
3. 保持数据格式一致，便于后续分析`,
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: `请分析这些${platformNames[platform] || '短视频平台'}后台截图，提取所有可见的数据指标：` },
        ...imageUrls.map(url => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ],
    },
  ];

  let result = '';
  const stream = client.stream(messages, {
    model: 'doubao-seed-1-8-251228',
    temperature: 0.3,
  });

  for await (const chunk of stream) {
    if (chunk.content) {
      result += chunk.content.toString();
    }
  }

  // 检测错误格式
  if (isMultimodalErrorFormat(result)) {
    console.error('API operation event');
    return '图片识别失败，无法提取有效数据。请确保截图清晰且格式正确。';
  }

  return result;
}

// 分析标题内容
async function analyzeTitles(
  client: LLMClient,
  titles: string
): Promise<string> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    {
      role: 'system',
      content: `你是一个专业的内容分析专家，擅长分析视频标题的特征和规律。
请分析用户提供的标题列表，提取以下信息：

【关键词分析】
- 高频关键词TOP10及其出现次数
- 关键词语境分析

【选题分布】
- 选题类型及占比
- 选题方向建议

【标题公式提取】
- 识别标题使用的公式/模板
- 分析标题的心理触发机制

【优化建议】
- 标题改进建议
- 可复制的标题模式`,
    },
    {
      role: 'user',
      content: `请分析以下视频标题：\n\n${titles}`,
    },
  ];

  let result = '';
  const stream = client.stream(messages, {
    model: 'doubao-seed-1-8-251228',
    temperature: 0.5,
  });

  for await (const chunk of stream) {
    if (chunk.content) {
      result += chunk.content.toString();
    }
  }

  // 检测错误格式
  if (isMultimodalErrorFormat(result)) {
    console.error('API operation event');
    return '封面识别失败，无法提取有效特征。请确保图片清晰且格式正确。';
  }

  return result;
}

// 分析封面图片
async function analyzeCovers(
  client: LLMClient,
  coverUrls: string[]
): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `你是一个专业的视觉设计分析专家，擅长分析视频封面的设计元素和规律。
请分析用户上传的视频封面，提取以下信息：

【视觉风格】
- 整体风格特征
- 配色方案
- 排版特点

【封面文字】
- 文字位置规律
- 字体大小层次
- 关键信息呈现方式

【设计元素】
- 人物/产品展示方式
- 图标/装饰元素
- 对比与焦点设计

【点击优化建议】
- 提升点击率的设计建议
- 可复制的设计模式`,
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: '请分析这些视频封面图的设计特征：' },
        ...coverUrls.map(url => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ],
    },
  ];

  let result = '';
  const stream = client.stream(messages, {
    model: 'doubao-seed-1-8-251228',
    temperature: 0.5,
  });

  for await (const chunk of stream) {
    if (chunk.content) {
      result += chunk.content.toString();
    }
  }

  return result;
}

// 生成综合报告
async function generateReport(
  client: LLMClient,
  platform: string,
  reportType: string,
  reportLevel: string,
  dataAnalysis: string,
  titleAnalysis: string,
  coverAnalysis: string,
  metrics: string
): Promise<string> {
  const platformNames: Record<string, string> = {
    douyin: '抖音',
    xiaohongshu: '小红书',
    bilibili: 'B站',
    weixin: '公众号',
    kuaishou: '快手',
  };

  const reportTypeNames: Record<string, string> = {
    operation: '运营诊断',
    content: '内容分析',
    growth: '增长策略',
  };

  const systemPrompt = `你是一位拥有10年经验的短视频运营数据分析师，精通数据分析、用户增长、内容运营。请根据用户提供的分析数据，生成一份专业、深度的${reportTypeNames[reportType]}报告。

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
维度评分：内容质量、流量表现、互动粘性、转化能力、增长趋势
核心诊断：一句话总结账号当前最主要的问题或优势

二、数据深度分析
流量分析：流量来源、波动趋势、渠道效率
内容分析：爆款特征、凉款归因、内容规律
用户分析：用户画像、行为特征、粘性分析
互动分析：点赞、评论、转发、收藏的数据分布

三、关键洞察发现
做对了什么：成功经验和可复制要点
做错了什么：失败教训和需要避免的问题
错失了什么：未抓住的机会和改进方向

四、行动建议清单
立即执行（3天内）：具体可操作的行动项
本周完成（7天内）：本周需要完成的优化
长期规划（30天）：长期需要建立的能力和策略

五、预期效果
预期改善指标：优化后预期达到的数据
下次检测时间：建议何时再次进行诊断
对比基准：用于对比的基准数据

【报告要求】
一、用数据说话，避免主观臆断
二、问题诊断要精准，建议要具体可执行
三、给出明确的优先级和时间节点
四、预期效果要有合理的量化目标`;

  const userContent = `请根据以下分析数据生成${reportTypeNames[reportType]}报告：

平台：${platformNames[platform] || platform}
报告类型：${reportTypeNames[reportType]}
报告级别：${reportLevel === 'deep' ? '深度版' : reportLevel === 'standard' ? '标准版' : '基础版'}

【数据截图分析结果】
${dataAnalysis}

${titleAnalysis ? `【标题内容分析结果】\n${titleAnalysis}\n` : ''}
${coverAnalysis ? `【封面设计分析结果】\n${coverAnalysis}\n` : ''}
${metrics ? `【用户关注的指标】\n${metrics}` : ''}`;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];

  const encoder = new TextEncoder();
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

  return stream as unknown as string;
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
    const platform = formData.get('platform') as string;
    const reportType = formData.get('reportType') as string;
    const titles = formData.get('titles') as string;
    const metrics = formData.get('metrics') as string;
    const reportLevel = formData.get('reportLevel') as string;
    const screenshotCount = parseInt(formData.get('screenshotCount') as string) || 0;
    const coverCount = parseInt(formData.get('coverCount') as string) || 0;

    if (screenshotCount === 0) {
      return new Response(
        JSON.stringify({ error: '请至少上传一张数据截图' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 1. 上传截图并分析
    const screenshotUrls: string[] = [];
    for (let i = 0; i < screenshotCount; i++) {
      const file = formData.get(`screenshot_${i}`) as File;
      if (file) {
        const url = await uploadImageToStorage(file);
        screenshotUrls.push(url);
      }
    }

    // 分析截图数据
    const dataAnalysis = await analyzeImages(client, screenshotUrls, platform);

    // 2. 分析标题（如果有）
    let titleAnalysis = '';
    if (titles && titles.trim().length > 50) {
      titleAnalysis = await analyzeTitles(client, titles);
    }

    // 3. 分析封面（如果有）
    let coverAnalysis = '';
    if (coverCount > 0) {
      const coverUrls: string[] = [];
      for (let i = 0; i < coverCount; i++) {
        const file = formData.get(`cover_${i}`) as File;
        if (file) {
          const url = await uploadImageToStorage(file);
          coverUrls.push(url);
        }
      }
      if (coverUrls.length > 0) {
        coverAnalysis = await analyzeCovers(client, coverUrls);
      }
    }

    // 4. 生成综合报告（流式输出）
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const systemPrompt = getReportSystemPrompt(reportType);
          const userContent = buildUserContent(
            platform, reportType, reportLevel,
            dataAnalysis, titleAnalysis, coverAnalysis, metrics
          );

          const messages: Array<{ role: 'system' | 'user'; content: string }> = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ];

          const llmStream = client.stream(messages, {
            model: 'doubao-seed-1-8-251228',
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

function getReportSystemPrompt(reportType: string): string {
  const prompts: Record<string, string> = {
    operation: `你是一位拥有10年经验的短视频运营数据分析师，精通数据分析、用户增长、内容运营。请根据用户提供的分析数据，生成一份专业、深度的运营诊断报告。

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
维度评分：内容质量、流量表现、互动粘性、转化能力、增长趋势各维度评分
核心诊断：一句话总结账号当前最主要的问题或优势

二、数据深度分析
流量分析：流量来源、波动趋势、渠道效率
内容分析：爆款特征、凉款归因、内容规律
用户分析：用户画像、行为特征、粘性分析
互动分析：点赞、评论、转发、收藏的数据分布

三、关键洞察发现
做对了什么：成功经验和可复制要点
做错了什么：失败教训和需要避免的问题
错失了什么：未抓住的机会和改进方向

四、行动建议清单
立即执行（3天内）：具体可操作的行动项
本周完成（7天内）：本周需要完成的优化
长期规划（30天）：长期需要建立的能力和策略

五、预期效果
预期改善指标：优化后预期达到的数据
下次检测时间：建议何时再次进行诊断
对比基准：用于对比的基准数据

【报告要求】
一、用数据说话，避免主观臆断
二、问题诊断要精准，建议要具体可执行
三、给出明确的优先级和时间节点
四、预期效果要有合理的量化目标`,

    content: `你是一位资深的内容数据分析专家，擅长从数据中发现内容规律，指导内容创作。请根据用户提供的数据，生成一份专业的内容分析报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【报告结构】

一、内容基因分析
高频关键词：TOP10关键词及语境分析
选题分布：内容类型及占比分析
情绪价值：内容传递的情绪类型分布
定位特征：账号内容的核心定位

二、爆款公式提取
标题公式：从高播放内容中提取标题模板
开头钩子：高完播内容的开头特征
结尾CTA：高转化内容的结尾引导方式
爆款模板：可直接复制的内容框架

三、凉款问题诊断
标题问题：低播放内容的标题缺陷
内容问题：低互动内容的内容缺陷
发布时机：发布时间的问题分析
改进建议：具体的优化方向

四、内容优化建议
选题方向：基于数据的选题建议
创作优化：内容创作的改进要点
发布策略：最佳发布时间和频率
标签策略：高效标签的选择建议

五、增长策略
内容增长：如何提升内容质量和数量
用户增长：如何吸引更多目标用户
互动增长：如何提升用户互动率
转化增长：如何提升变现效率

【报告要求】
一、数据分析要深入，找到数据背后的规律
二、建议要具体，可以直接指导创作
三、要有对比分析，找到差距和机会
四、要给出可衡量的优化目标`,

    growth: `你是一位资深的短视频增长专家，擅长制定增长策略、突破增长瓶颈。请根据用户提供的数据，生成一份专业的增长策略报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【报告结构】

一、当前增长状态
增长阶段：账号当前处于哪个增长阶段
增长瓶颈：阻碍增长的核心问题
增长机会：可以突破的方向
增长潜力：综合评估增长空间

二、流量增长策略
流量来源优化：如何提升各渠道流量
推荐算法破解：如何获得更多推荐流量
搜索流量获取：如何优化搜索排名
外部流量引入：如何利用站外流量

三、粉丝增长策略
关注转化优化：如何提升关注转化率
粉丝留存策略：如何降低粉丝流失
粉丝激活策略：如何激活沉睡粉丝
粉丝裂变策略：如何让粉丝帮你传播

四、内容增长策略
爆款内容策略：如何持续产出爆款
内容矩阵策略：如何建立内容体系
内容差异化：如何建立独特风格
内容效率提升：如何提升创作效率

五、30天增长计划
第1周目标及行动：具体执行事项
第2周目标及行动：具体执行事项
第3周目标及行动：具体执行事项
第4周目标及行动：具体执行事项

【报告要求】
一、策略要具体可执行，不空谈
二、目标要量化，可追踪
三、要结合账号实际情况
四、要考虑执行难度和资源`,
  };

  return prompts[reportType] || prompts.operation;
}

function buildUserContent(
  platform: string,
  reportType: string,
  reportLevel: string,
  dataAnalysis: string,
  titleAnalysis: string,
  coverAnalysis: string,
  metrics: string
): string {
  const platformNames: Record<string, string> = {
    douyin: '抖音',
    xiaohongshu: '小红书',
    bilibili: 'B站',
    weixin: '公众号',
    kuaishou: '快手',
  };

  const reportTypeNames: Record<string, string> = {
    operation: '运营诊断',
    content: '内容分析',
    growth: '增长策略',
  };

  let content = `请根据以下分析数据生成${reportTypeNames[reportType]}报告：

平台：${platformNames[platform] || platform}
报告级别：${reportLevel === 'deep' ? '深度版' : reportLevel === 'standard' ? '标准版' : '基础版'}

【数据截图分析结果】
${dataAnalysis}
`;

  if (titleAnalysis) {
    content += `
【标题内容分析结果】
${titleAnalysis}
`;
  }

  if (coverAnalysis) {
    content += `
【封面设计分析结果】
${coverAnalysis}
`;
  }

  if (metrics) {
    content += `
【用户关注的指标】
${metrics}
`;
  }

  return content;
}
