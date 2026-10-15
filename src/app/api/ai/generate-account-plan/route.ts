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

    const body = await request.json();
    
    const platform = body.platform || body.contentDirection?.platforms?.[0] || '抖音';
    const accountName = body.accountName || body.customerName || '';
    const ipPositioning = body.ipPositioning || body.formData || null;
    const businessPositioning = body.businessPositioning || '';
    
    if (!accountName) {
      return new Response(
        JSON.stringify({ error: '请输入账号名称' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = `你是一位资深的短视频账号运营专家，有10年+经验，服务过数百个达人账号。

【核心原则】
1. 输出的内容必须是有血有肉的真实经验，不是套话模板
2. 每个建议都要具体到"做什么、怎么做、做到什么程度"
3. 要结合账号主理人的真实背景和经历，给出量身定制的方案
4. 变现规划要接地气，考虑普通人从0开始的实际路径
5. 避免使用"暂无"、"待定"、"持续优化"这类敷衍表述

【格式要求】
输出纯JSON格式，不要有markdown代码块包裹：
{
  "账号定位": "一段有画面感的定位描述，50字以内",
  "核心差异化": "一句话说明这个账号和其他同类账号最大的不同",
  "内容支柱": [
    {"名称": "支柱名称", "占比": "30%", "具体做法": "100字左右的详细说明，包含具体选题方向、拍摄手法、呈现风格"},
    {"名称": "支柱名称", "占比": "40%", "具体做法": "100字左右的详细说明，包含具体选题方向、拍摄手法、呈现风格"},
    {"名称": "支柱名称", "占比": "30%", "具体做法": "100字左右的详细说明，包含具体选题方向、拍摄手法、呈现风格"}
  ],
  "起步30天计划": {
    "第1周": {"重点": "本周核心任务", "具体动作": ["动作1", "动作2", "动作3"], "预期结果": "达到什么状态"},
    "第2周": {"重点": "本周核心任务", "具体动作": ["动作1", "动作2", "动作3"], "预期结果": "达到什么状态"},
    "第3周": {"重点": "本周核心任务", "具体动作": ["动作1", "动作2", "动作3"], "预期结果": "达到什么状态"},
    "第4周": {"重点": "本周核心任务", "具体动作": ["动作1", "动作2", "动作3"], "预期结果": "达到什么状态"}
  },
  "第一阶段目标": {
    "时间": "1-3个月",
    "粉丝目标": "具体数字",
    "核心任务": "这阶段最重要的一件事是什么",
    "里程碑": ["里程碑1", "里程碑2", "里程碑3"]
  },
  "第二阶段目标": {
    "时间": "3-6个月",
    "粉丝目标": "具体数字",
    "核心任务": "这阶段最重要的一件事是什么",
    "里程碑": ["里程碑1", "里程碑2", "里程碑3"]
  },
  "变现路径": {
    "0-3个月": "具体怎么开始变现，哪怕只赚第一块钱，要写清楚从哪来",
    "3-6个月": "稳定后怎么扩大收入",
    "6-12个月": "规模化后的方向"
  },
  "关键风险": [
    {"风险": "具体风险描述", "预防": "怎么避免", "应对": "如果发生了怎么办"}
  ],
  "爆款密码": "分析这个账号为什么能出爆款，给出3-5个具体原因"
}`;

    // 提取关键信息构建用户消息
    const basicInfo = ipPositioning?.basicInfo || {};
    const lifeStory = ipPositioning?.lifeStory || {};
    const userPersona = ipPositioning?.userPersona || {};
    const productsServices = ipPositioning?.productsServices || {};
    
    const userMessage = `请为以下账号生成运营规划：

## 账号基本信息
- 账号名称：${accountName}
- 平台：${platform}
- 主理人背景：${basicInfo.nickname || '未提供'}，${basicInfo.identity?.join('、') || '身份待定'}
${basicInfo.appearance ? `- 外在形象：${basicInfo.appearance}` : ''}
${basicInfo.personality ? `- 性格特点：${basicInfo.personality.join('、')}` : ''}

## 人生经历
${lifeStory.recent10Years ? `- 近10年：${lifeStory.recent10Years}` : ''}
${lifeStory.darkestMoment ? `- 至暗时刻：${lifeStory.darkestMoment}` : ''}
${lifeStory.turningPoint ? `- 命运转折：${lifeStory.turningPoint}` : ''}
${lifeStory.highlightMoment ? `- 高光时刻：${lifeStory.highlightMoment}` : ''}
${lifeStory.motto ? `- 人生信条：${lifeStory.motto}` : ''}

## 用户画像
${userPersona.targetCustomers ? `- 目标用户：${userPersona.targetCustomers}` : ''}
${userPersona.painPoints ? `- 用户痛点：${userPersona.painPoints}` : ''}
${userPersona.competitiveAdvantage ? `- 竞争优势：${userPersona.competitiveAdvantage}` : ''}

## 产品/变现
${productsServices.productTypes ? `- 产品类型：${productsServices.productTypes.join('、')}` : ''}
${productsServices.priceRange ? `- 价格区间：${productsServices.priceRange}` : ''}

## 商业定位参考
${businessPositioning ? businessPositioning.substring(0, 800) : '暂无详细商业定位'}

请基于以上真实信息，生成一份有深度、可落地、个性化的账号运营规划。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.7,
    });

    // 清理markdown符号
    let content = response.content.trim();
    content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    // 替换特殊Unicode引号为标准ASCII引号
    content = content.replace(/[\u201c\u201d]/g, '"');  // " " → "
    content = content.replace(/[\u2018\u2019]/g, "'");  // ' ' → '
    content = content.replace(/：/g, ':');               // 全角冒号 → 半角
    content = content.replace(/，/g, ',');               // 全角逗号 → 半角
    content = content.replace(/。/g, '.');               // 全角句号 → 半角
    content = content.replace(/【/g, '[');              // 方括号转换
    content = content.replace(/】/g, ']');
    content = content.replace(/（/g, '(');              // 括号转换
    content = content.replace(/）/g, ')');

    let accountPlan;
    try {
      accountPlan = JSON.parse(content);
    } catch (e: any) {
      console.error('API operation event');
      console.error('API operation event');
      
      // 尝试提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          accountPlan = JSON.parse(jsonMatch[0]);
        } catch (e2: any) {
          console.error('API operation event');
          return new Response(
            JSON.stringify({ error: '生成内容格式异常，请重试' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: '生成内容格式异常，请重试' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: accountPlan }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API operation event');
    return new Response(
      JSON.stringify({ error: '服务暂时不可用' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
