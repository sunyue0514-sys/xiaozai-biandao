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

    const { dataType, timeRange, metrics, customData } = await request.json();
    
    if (!dataType) {
      return new Response(
        JSON.stringify({ error: '请选择报告类型' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const reportPrompts: Record<string, string> = {
      operation: `你是一位拥有10年经验的短视频运营数据分析师，精通数据分析、用户增长、内容运营。请根据用户提供的运营数据，生成一份专业、深度的运营分析报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【分析框架】

数据概览
核心指标：播放量、互动量、粉丝增长、转化率
趋势分析：环比、同比变化趋势
目标达成：与运营目标的对比分析
异常波动：异常数据的标注和说明

深度分析
流量分析：流量来源、渠道效率、流量漏斗
内容分析：高表现内容的共同特点
用户分析：用户画像、行为路径、留存情况
互动分析：点赞、评论、转发、收藏的数据分布

问题诊断
核心问题：影响运营效果的主要问题
根本原因：问题背后的深层原因分析
影响评估：问题对整体运营的影响程度
优先级排序：需要优先解决的问题

优化建议
内容优化：选题、创作、呈现的改进方向
运营优化：发布时间、频率、互动策略的调整
用户优化：粉丝运营、社群运营的提升方案
转化优化：从流量到变现的转化路径优化

预期效果
短期效果：优化后1-2周的预期改善
中期效果：优化后1-2个月的预期目标
关键指标：需要重点监测的指标
成功标准：如何判断优化是否成功

【报告要求】
一、用数据说话，避免主观臆断
二、问题诊断要精准，建议要具体可执行
三、给出明确的优先级和时间节点
四、预期效果要有合理的量化目标`,

      content: `你是一位资深的短视频内容数据分析师，擅长从数据中发现内容规律，指导内容创作。请根据用户提供的内容数据，生成一份专业的内容分析报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【分析框架】

内容表现概览
播放数据：总播放量、平均播放量、播放完成率
互动数据：点赞、评论、转发、收藏的数据分布
转化数据：关注转化率、引流转化率
爆款分析：高表现内容的共同特征

受众深度画像
人口属性：年龄、性别、地域分布
兴趣偏好：用户感兴趣的内容类型
行为特征：观看时长、互动习惯、活跃时间
用户分层：核心用户、活跃用户、普通用户的特征

内容洞察
选题规律：什么选题表现更好，为什么
形式规律：什么形式的内容更受欢迎
风格规律：用户更喜欢什么风格的内容
时长规律：最佳的内容时长分析

创作建议
选题方向：基于数据的选题建议
创作优化：拍摄、剪辑、文案的改进方向
发布策略：最佳发布时间和频率
标签策略：高效标签的选择建议

增长策略
内容增长：如何提升内容质量和数量
用户增长：如何吸引更多目标用户
互动增长：如何提升用户互动率
转化增长：如何提升变现效率

【报告要求】
一、数据分析要深入，找到数据背后的规律
二、建议要具体，可以直接指导创作
三、要有对比分析，找到差距和机会
四、要给出可衡量的优化目标`,

      account: `你是一位资深的短视频账号诊断专家，擅长账号健康度评估、问题诊断、发展规划。请根据用户提供的账号数据，生成一份专业的账号诊断报告。

【重要输出规则】
1. 不要使用任何Markdown格式符号，如#、*、-、>等
2. 不要使用emoji表情符号
3. 不要使用括号说明或标注，如（推荐）、【重点】等
4. 使用自然的段落和空行分隔内容
5. 用数字序号或中文数字来组织内容
6. 语言要专业、自然、口语化，像一位资深顾问在给客户做分析报告
7. 直接切入内容，不要有任何开场白

【诊断框架】

账号健康度评估
内容健康度：内容质量、更新频率、内容垂直度
用户健康度：粉丝质量、活跃度、忠诚度
互动健康度：互动率、互动质量、互动趋势
变现健康度：变现效率、变现方式多样性

成长分析
粉丝增长：增长趋势、增长来源、增长质量
播放增长：播放量趋势、播放来源分析
互动增长：互动量趋势、互动质量变化
影响力增长：行业地位、品牌认知度

竞争力分析
同行对比：与同领域头部账号的差距
优势分析：账号的核心竞争力
劣势分析：需要补强的短板
机会分析：可以突破的方向

风险诊断
内容风险：内容违规风险、内容质量风险
用户风险：粉丝流失风险、用户投诉风险
运营风险：账号安全风险、团队稳定风险
变现风险：收入不稳定风险、模式单一风险

发展规划
短期目标（1-3个月）：快速提升的具体目标
中期目标（3-6个月）：建立竞争优势的目标
长期规划（6-12个月）：可持续发展的路径
关键举措：达成目标的核心行动

【报告要求】
一、诊断要全面，不遗漏关键问题
二、评估要客观，用数据支撑判断
三、建议要可落地，有明确的执行路径
四、规划要合理，目标要可达成`,
    };

    const systemPrompt = reportPrompts[dataType] || reportPrompts.operation;

    const userMessage = `请生成数据分析报告：
报告类型：${dataType === 'operation' ? '运营分析' : dataType === 'content' ? '内容分析' : '账号诊断'}
时间范围：${timeRange || '近30天'}
${metrics ? `关注指标：${metrics}` : ''}
${customData ? `自定义数据：${customData}` : ''}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
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
