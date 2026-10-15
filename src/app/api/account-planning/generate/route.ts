import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';
import { getCustomerById } from '@/lib/db-store';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { 
  getIndustryByCode, 
  getSensitivityLabel, 
  getDecisionCycleLabel,
  getConversionGoalLabel,
  getPlatformFocusLabel,
} from '@/config/industry-templates';
import { 
  getPainPointLabel, 
  getResourceLabel, 
  getTimelineLabel,
} from '@/config/account-planning-survey';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 账号规划输出结构（新版：战术级）
interface AccountPlanResult {
  // 账号搭建建议（基于痛点方案重新设计）
  accountSetup: {
    nicknameSuggestions: string[]; // 3个昵称建议，每个带设计理由
    bioSuggestions: string[]; // 3个简介建议，每个带设计理由  
    avatarGuide: string; // 头像设计指导（不是简单描述，而是具体的设计方案）
    coverGuide: string; // 封面设计指导
  };
  // 痛点解决方案
  painPointSolutions: {
    topPainPoints: string[];
    solutions: Array<{
      painPoint: string;
      whyHappens: string;
      concreteSolution: string;
      quickWin: string;
    }>;
  };
  // 第一周执行计划
  firstWeekPlan: {
    strategyNote: string;
    days: Array<{
      day: number;
      topic: string;
      hook: string;
      keyPoints: string[];
      cta: string;
    }>;
  };
  // 内容模板
  contentTemplates: {
    titleTemplates: string[];
    openingHooks: string[];
    endingHooks: string[];
  };
  // 互动话术
  engagementScripts: {
    commentReplyTemplates: Array<{ when: string; reply: string }>;
    privateDomainGuide: string;
  };
  // 转化流程
  conversionFlow: {
    hookItems: Array<{ name: string; description: string; howToUse: string }>;
    privateDomainScript: string;
    followUpFlow: string[];
  };
  // 直播运营计划（可选，仅当用户有直播能力时）
  liveStreamPlan?: {
    bestTimeSlots: string[];
    streamDuration: string;
    contentStructure: string;
    engagementTips: string[];
    conversionScripts: {
      productIntro: string;
      priceAnchor: string;
      closeDeal: string;
    };
  };
  // 敏感词指南（可选，仅当用户有违规风险或行业敏感时）
  sensitiveWordsGuide?: {
    highRiskWords: string[];
    safeReplacements: Record<string, string>;
    shootingTaboos: string[];
  };
  // 现实目标
  realisticGoals: {
    firstMonth: { fans: string; inquiries: string; focus: string };
    thirdMonth: { fans: string; inquiries: string; focus: string };
  };
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  let userId: number | null = null;
  let consumedAmount = 0;
  try {
    // 验证登录状态
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const userIdValue = await getSessionUserId(token);
    if (!userIdValue) {
      return NextResponse.json({ error: '会话无效' }, { status: 401 });
    }
    userId = userIdValue;

    // 检查算力（账号规划消耗较大）
    const powerCheck = await consumePower(userId!, 'accountPlan', 0);
    if (!powerCheck.success) {
      return NextResponse.json({ 
        error: powerCheck.error, 
        code: powerCheck.code,
        required: powerCheck.required,
        remaining: powerCheck.remaining 
      }, { status: 403 });
    }
    consumedAmount = powerCheck.consumed || powerCheck.consumed || 0;

    // 解析请求体
    const body = await request.json();
    const { customerId, surveyAnswers } = body as {
      customerId: string | number;
      surveyAnswers: Record<string, string>;
    };

    if (!customerId) {
      return NextResponse.json({ error: '缺少客户ID' }, { status: 400 });
    }

    // 获取客户档案
    const customer = await getCustomerById(Number(customerId));
    if (!customer || String(customer.uid) !== String(userId)) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    // 解析IP定位数据获取行业信息
    let ipPositioningData: any = {};
    let industryCode = 'restaurant'; // 默认餐饮
    try {
      if (customer.ipPositioning) {
        ipPositioningData = JSON.parse(customer.ipPositioning);
        // 尝试从IP定位中提取行业信息
        if (ipPositioningData.industry) {
          industryCode = ipPositioningData.industry;
        } else if (ipPositioningData.basicInfo?.identity) {
          // 根据身份推断行业
          const identities: string[] = ipPositioningData.basicInfo.identity || [];
          for (const identity of identities) {
            const matchedIndustry = Object.keys({
              medical_beauty: '医美',
              beauty_salon: '美容美发',
              restaurant: '餐饮',
              fitness: '健身',
              education: '教育培训',
              real_estate: '房产',
              mother_baby: '母婴',
              automotive: '汽车',
              decoration: '装修',
              pet: '宠物',
              wedding: '婚纱',
              foot_bath: '足浴',
            } as Record<string, string>).find(key => 
              identity.includes(key) || key.includes(identity)
            );
            if (matchedIndustry) {
              industryCode = matchedIndustry;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('API operation event');
    }

    // 获取行业模板
    const industryTemplate = getIndustryByCode(industryCode);

    // 构建IP定位摘要
    const ipSummary = buildIPSummary(ipPositioningData);

    // 构建深度采集数据摘要
    const surveySummary = buildSurveySummaryFromAnswers(surveyAnswers);

    // 解析用户能力特征
    const canLivestream = surveyAnswers.canLivestream === 'yes' || surveyAnswers.canLivestream === 'sometimes';
    const hasContentRisk = (surveyAnswers.painPoints || '').includes('content_risk');
    const hasBudget = (surveyAnswers.resources || '').includes('budget');
    // 判断是否需要违禁词指南：有违规痛点 或 行业敏感度高
    const needSensitiveWords = hasContentRisk || (industryTemplate?.sensitivity === 'high');

    // 调用LLM生成账号规划
    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const systemPrompt = buildSystemPrompt(industryTemplate, { canLivestream, needSensitiveWords });
    const userPrompt = buildUserPrompt(customer, ipSummary, surveySummary, industryTemplate, { canLivestream, needSensitiveWords, hasBudget });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, {
      model: 'deepseek-v3-2-251201',
      temperature: 0.7,
    });

    const content = response.content;
    if (!content) {
      return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 });
    }

    // 解析LLM返回的JSON（添加重试机制）
    let planResult: AccountPlanResult;
    let parseSuccess = false;
    let lastError = '';
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        let jsonContent = content.trim();
        console.log('API operation event');
        
        // 移除可能的markdown代码块标记
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.slice(7);
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.slice(3);
        }
        if (jsonContent.endsWith('```')) {
          jsonContent = jsonContent.slice(0, -3);
        }
        
        // 尝试提取 JSON 对象（处理不完整的 markdown 包裹）
        const firstBrace = jsonContent.indexOf('{');
        const lastBrace = jsonContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
        }
        
        jsonContent = jsonContent.trim();
        console.log('API operation event');
        
        planResult = JSON.parse(jsonContent);
        parseSuccess = true;
        console.log('API operation event');
        break;
      } catch (e: any) {
        lastError = 'Request failed';
        console.error('API operation event');
        if (attempt === 1) {
          console.error('API operation event');
        }
      }
    }
    
    if (!parseSuccess) {
      console.error('API operation event');
      return NextResponse.json({ 
        error: '生成内容格式错误，请重试',
        debug: content.substring(0, 500) // 调试用
      }, { status: 500 });
    }
    
    // 扣除算力（放在JSON解析成功后，避免解析失败还扣费）
    await consumePower(userId!, 'accountPlan', 1);

    // 转换为前端需要的格式
    const p = planResult!;
    console.log('API operation event');
    
    let formattedResult;
    try {
      formattedResult = {
      // 账号搭建建议
      accountSetup: `【昵称建议】\n${(p.accountSetup?.nicknameSuggestions || []).map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n【简介建议】\n${(p.accountSetup?.bioSuggestions || []).map((b, i) => `${i + 1}. ${b}`).join('\n')}\n\n【头像设计】\n${p.accountSetup?.avatarGuide || ''}\n\n【封面设计】\n${p.accountSetup?.coverGuide || ''}`,
      
      // 痛点解决方案
      painPointSolutions: `【核心痛点】\n${(p.painPointSolutions?.topPainPoints || []).join('、')}\n\n${(p.painPointSolutions?.solutions || []).map((s, i) => 
        `【痛点${i + 1}：${s.painPoint}】\n原因：${s.whyHappens}\n解决方案：${s.concreteSolution}\n立即可做：${s.quickWin}`
      ).join('\n\n')}`,
      
      // 第一周执行计划
      firstWeekPlan: `【策略说明】${p.firstWeekPlan?.strategyNote || ''}\n\n${(p.firstWeekPlan?.days || []).map(d => 
        `【第${d.day}天】\n选题：${d.topic}\n开头话术：${d.hook}\n要点：${(d.keyPoints || []).join('、')}\n结尾钩子：${d.cta}`
      ).join('\n\n')}`,
      
      // 内容模板
      contentTemplates: `【爆款标题模板】\n${(p.contentTemplates?.titleTemplates || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n【开头留人话术】\n${(p.contentTemplates?.openingHooks || []).map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\n【结尾钩子话术】\n${(p.contentTemplates?.endingHooks || []).map((h, i) => `${i + 1}. ${h}`).join('\n')}`,
      
      // 互动话术
      engagementScripts: `【评论回复模板】\n${(p.engagementScripts?.commentReplyTemplates || []).map(r => `• ${r.when}：${r.reply}`).join('\n')}\n\n【引导私信话术】\n${p.engagementScripts?.privateDomainGuide || ''}`,
      
      // 转化流程
      conversionFlow: `【引流钩子】\n${(p.conversionFlow?.hookItems || []).map((h, i) => `${i + 1}. ${h.name}：${h.description}\n   使用方法：${h.howToUse}`).join('\n')}\n\n【加微信后第一句话】\n${p.conversionFlow?.privateDomainScript || ''}\n\n【后续跟进流程】\n${(p.conversionFlow?.followUpFlow || []).map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
      
      // 直播运营计划（可选）
      ...(p.liveStreamPlan ? {
        liveStreamPlan: `【最佳直播时段】\n${(p.liveStreamPlan.bestTimeSlots || []).join('、')}\n\n【建议直播时长】\n${p.liveStreamPlan.streamDuration || ''}\n\n【直播内容结构】\n${p.liveStreamPlan.contentStructure || ''}\n\n【互动技巧】\n${(p.liveStreamPlan.engagementTips || []).map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n【直播转化话术】\n产品介绍：${p.liveStreamPlan.conversionScripts?.productIntro || ''}\n价格锚定：${p.liveStreamPlan.conversionScripts?.priceAnchor || ''}\n促单话术：${p.liveStreamPlan.conversionScripts?.closeDeal || ''}`,
      } : {}),
      
      // 敏感词指南（可选）
      ...(p.sensitiveWordsGuide ? {
        sensitiveWordsGuide: `【高风险敏感词】\n${(p.sensitiveWordsGuide.highRiskWords || []).join('、')}\n\n【安全替代词】\n${Object.entries(p.sensitiveWordsGuide.safeReplacements || {}).map(([k, v]) => `• "${k}" → "${v}"`).join('\n')}\n\n【拍摄禁忌】\n${(p.sensitiveWordsGuide.shootingTaboos || []).join('、')}`,
      } : {}),
      
      // 现实目标
      realisticGoals: `【第一个月】\n粉丝目标：${p.realisticGoals?.firstMonth?.fans || ''}\n咨询量：${p.realisticGoals?.firstMonth?.inquiries || ''}\n核心任务：${p.realisticGoals?.firstMonth?.focus || ''}\n\n【第三个月】\n粉丝目标：${p.realisticGoals?.thirdMonth?.fans || ''}\n咨询量：${p.realisticGoals?.thirdMonth?.inquiries || ''}\n核心任务：${p.realisticGoals?.thirdMonth?.focus || ''}`,
    };
    } catch (formatError) {
      console.error('API operation event');
      return NextResponse.json({ error: '输出格式化失败，请重试' }, { status: 500 });
    }

    // 保存账号规划到数据库
    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          account_plan: JSON.stringify(formattedResult),
          updated_at: new Date().toISOString(),
        })
        .eq('id', Number(customerId)).eq('uid', String(userId));

      if (updateError) {
        console.error('API operation event');
      } else {
        console.log('API operation event');
      }
    } catch (saveError) {
      console.error('API operation event');
      // 不影响返回结果，继续返回
    }

    console.log('API operation event');
    return NextResponse.json({
      success: true,
      data: formattedResult,
      meta: {
        industry: industryTemplate?.name || '通用',
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('API operation event');
    await refundPower(userId!, consumedAmount, `账号规划失败: ${(error instanceof Error ? 'Request failed' : '未知').slice(0, 50)}`);
    return NextResponse.json(
      { error: '生成失败，如已扣费请联系管理员核对，自动退款尚未启用，请稍后重试' },
      { status: 500 }
    );
  }
}

// 构建IP定位摘要
function buildIPSummary(ipPositioning: any): string {
  if (!ipPositioning || Object.keys(ipPositioning).length === 0) {
    return '暂无IP定位信息';
  }

  const parts: string[] = [];

  // 基本信息
  if (ipPositioning.basicInfo) {
    const { nickname, identity, location, personality } = ipPositioning.basicInfo;
    if (nickname) parts.push(`昵称: ${nickname}`);
    if (identity && Array.isArray(identity) && identity.length) parts.push(`身份: ${identity.join('、')}`);
    else if (identity && typeof identity === 'string') parts.push(`身份: ${identity}`);
    if (location) parts.push(`所在地: ${location}`);
    if (personality && Array.isArray(personality) && personality.length) parts.push(`性格特点: ${personality.join('、')}`);
    else if (personality && typeof personality === 'string') parts.push(`性格特点: ${personality}`);
  }

  // 核心价值
  if (ipPositioning.coreValue) {
    const { skills, specialties, valueProvided } = ipPositioning.coreValue;
    if (skills && Array.isArray(skills) && skills.length) parts.push(`技能: ${skills.join('、')}`);
    else if (skills && typeof skills === 'string') parts.push(`技能: ${skills}`);
    if (specialties) parts.push(`专长: ${specialties}`);
    if (valueProvided) parts.push(`能提供的价值: ${valueProvided}`);
  }

  // 用户画像
  if (ipPositioning.userPersona) {
    const { targetCustomers, painPoints } = ipPositioning.userPersona;
    if (targetCustomers) parts.push(`目标用户: ${targetCustomers}`);
    if (painPoints) parts.push(`用户痛点: ${painPoints}`);
  }

  // 产品服务
  if (ipPositioning.productsServices) {
    const { mainProducts, priceRange, serviceArea } = ipPositioning.productsServices;
    if (mainProducts) parts.push(`主营产品: ${mainProducts}`);
    if (priceRange) parts.push(`价格区间: ${priceRange}`);
    if (serviceArea) parts.push(`服务范围: ${serviceArea}`);
  }

  // 内容方向
  if (ipPositioning.contentDirection) {
    const { mainTopics, contentStyle } = ipPositioning.contentDirection;
    if (mainTopics && Array.isArray(mainTopics) && mainTopics.length) parts.push(`内容方向: ${mainTopics.join('、')}`);
    else if (mainTopics && typeof mainTopics === 'string') parts.push(`内容方向: ${mainTopics}`);
    if (contentStyle) parts.push(`内容风格: ${contentStyle}`);
  }

  return parts.join('\n');
}

// 构建深度采集数据摘要
function buildSurveySummary(surveyData: any): string {
  const parts: string[] = [];

  if (surveyData.painPoints?.length) {
    parts.push(`当前痛点: ${surveyData.painPoints.map((p: string) => getPainPointLabel(p)).join('、')}`);
  }

  if (surveyData.resources?.length) {
    parts.push(`核心资源: ${surveyData.resources.map(getResourceLabel).join('、')}`);
  }

  if (surveyData.weeklyPosts) {
    parts.push(`每周可发布: ${surveyData.weeklyPosts}条`);
  }

  if (surveyData.expectedTimeline) {
    parts.push(`期望见效时间: ${getTimelineLabel(surveyData.expectedTimeline)}`);
  }

  parts.push(`团队情况: ${surveyData.hasTeam ? '有团队协助' : '一个人运营'}`);
  
  // 处理直播能力字段（可能是boolean或string）
  const livestreamAbility = typeof surveyData.canLivestream === 'boolean' 
    ? (surveyData.canLivestream ? '可以直播' : '暂时不行')
    : (surveyData.canLivestream === 'yes' ? '可以直播' : surveyData.canLivestream === 'sometimes' ? '偶尔可以' : '暂时不行');
  parts.push(`直播能力: ${livestreamAbility}`);

  if (surveyData.additionalInfo) {
    parts.push(`补充信息: ${surveyData.additionalInfo}`);
  }

  return parts.join('\n');
}

// 构建深度采集数据摘要（从页面的答案格式）
function buildSurveySummaryFromAnswers(surveyAnswers: Record<string, string>): string {
  const parts: string[] = [];

  if (surveyAnswers.painPoints) {
    const values = surveyAnswers.painPoints.split(',').filter(Boolean);
    parts.push(`当前痛点: ${values.map(getPainPointLabel).join('、')}`);
  }

  if (surveyAnswers.resources) {
    const values = surveyAnswers.resources.split(',').filter(Boolean);
    parts.push(`核心资源: ${values.map(getResourceLabel).join('、')}`);
  }

  if (surveyAnswers.weeklyPosts) {
    parts.push(`每周可发布: ${surveyAnswers.weeklyPosts}条`);
  }

  if (surveyAnswers.expectedTimeline) {
    parts.push(`期望见效时间: ${getTimelineLabel(surveyAnswers.expectedTimeline)}`);
  }

  if (surveyAnswers.hasTeam) {
    parts.push(`团队情况: ${surveyAnswers.hasTeam === 'yes' ? '有团队协助' : '一个人运营'}`);
  }
  
  if (surveyAnswers.canLivestream) {
    const livestreamAbility = surveyAnswers.canLivestream === 'yes' ? '可以直播' : 
      surveyAnswers.canLivestream === 'sometimes' ? '偶尔可以' : '暂时不行';
    parts.push(`直播能力: ${livestreamAbility}`);
  }

  if (surveyAnswers.additionalInfo) {
    parts.push(`补充信息: ${surveyAnswers.additionalInfo}`);
  }

  return parts.join('\n');
}

// 构建系统提示词
function buildSystemPrompt(
  industryTemplate: any, 
  options: { canLivestream: boolean; needSensitiveWords: boolean }
): string {
  const industryInfo = industryTemplate ? `
【行业参考信息】
行业: ${industryTemplate.name}
内容敏感度: ${getSensitivityLabel(industryTemplate.sensitivity)}
决策周期: ${getDecisionCycleLabel(industryTemplate.decisionCycle)}
主要转化目标: ${getConversionGoalLabel(industryTemplate.conversionGoal)}
平台侧重: ${getPlatformFocusLabel(industryTemplate.platformFocus)}

行业内容禁忌: ${industryTemplate.taboos?.join('、')}
` : '';

  // 直播模块（仅当用户有直播能力时输出）- 注意逗号在开头
  const liveStreamSection = options.canLivestream ? `,
  "liveStreamPlan": {
    "bestTimeSlots": ["时间段1", "时间段2"],
    "streamDuration": "建议直播时长",
    "contentStructure": "直播内容结构（开场-互动-转化-收尾的具体流程）",
    "engagementTips": ["互动技巧1", "互动技巧2", "互动技巧3"],
    "conversionScripts": {
      "productIntro": "产品介绍话术（完整话术）",
      "priceAnchor": "价格锚定话术",
      "closeDeal": "促单话术"
    }
  }` : '';

  // 敏感词模块（仅当需要时输出）- 注意逗号在开头
  const sensitiveWordsSection = options.needSensitiveWords ? `,
  "sensitiveWordsGuide": {
    "highRiskWords": ["高风险词1", "高风险词2", "高风险词3"],
    "safeReplacements": {"高风险词": "安全替代词"},
    "shootingTaboos": ["拍摄禁忌1", "拍摄禁忌2"]
  }` : '';

  // 直播能力说明
  const liveStreamNote = options.canLivestream 
    ? `\n【直播运营】用户有直播能力，必须输出直播运营计划（开播时间、话术、转化技巧）`
    : `\n【直播运营】用户暂无直播能力，无需输出直播相关内容`;

  // 敏感词说明
  const sensitiveWordsNote = options.needSensitiveWords
    ? `\n【敏感词规避】用户有内容违规痛点或行业敏感度高，必须输出敏感词规避指南`
    : `\n【敏感词规避】用户纯视频运营、无投流、无直播，且行业敏感度不高，无需输出敏感词模块（可省略）`;

  return `你是一位实战派短视频运营专家，擅长帮助本地商家和个人IP从0到1起号。

${industryInfo}

【核心原则】
账号规划不是重复IP定位，而是给出"明天就能执行"的落地方案。IP定位已经告诉用户"你是谁"，你要告诉用户"具体怎么干"。
${liveStreamNote}
${sensitiveWordsNote}

【账号搭建的关键要求】
账号搭建（昵称、简介、头像、封面）必须基于痛点方案和内容策略重新设计，不能简单重复IP定位的结果：
- 如果IP定位建议"专业xx"，你要根据痛点方案给出更精准的定位（如"XX问题解决专家"）
- 如果IP定位的简介偏"个人介绍"，你要设计成"价值主张型"简介
- 头像和封面设计要呼应内容策略（如主打"避坑"内容，头像就要体现专业可信）

【昵称和简介的特殊要求】
⚠️ 3个昵称建议必须完全不同，不能出现重复或高度相似的昵称！
⚠️ 3个简介建议必须完全不同，体现不同的价值主张！
- 昵称1：突出地域+身份（如"北京装修老张"）
- 昵称2：突出解决问题（如"装修避坑张师傅"）
- 昵称3：突出差异化特点（如"老房翻新老张"）
每个昵称都要有独特的设计理由，不能只是换个顺序或加个词。

【必须输出的JSON结构】
{
  "accountSetup": {
    "nicknameSuggestions": [
      "昵称建议1 - 设计理由（为什么这个昵称能吸引目标用户）",
      "昵称建议2 - 设计理由",
      "昵称建议3 - 设计理由"
    ],
    "bioSuggestions": [
      "简介建议1 - 设计理由（突出什么价值主张）",
      "简介建议2 - 设计理由",
      "简介建议3 - 设计理由"
    ],
    "avatarGuide": "头像设计方案（不是简单描述，而是具体到：穿什么衣服、什么表情、什么背景、突出什么感觉，与内容策略如何呼应）",
    "coverGuide": "封面设计方案（具体到：背景选择、文字内容、视觉风格，如何与账号定位统一）"
  },
  "painPointSolutions": {
    "topPainPoints": ["痛点1", "痛点2"],
    "solutions": [
      {
        "painPoint": "痛点名称",
        "whyHappens": "为什么会有这个问题（50字内）",
        "concreteSolution": "具体解决方案（200字内，要具体到怎么做）",
        "quickWin": "一个立即可执行的小动作"
      }
    ]
  },
  "firstWeekPlan": {
    "strategyNote": "一句话说明为什么这样安排",
    "days": [
      {
        "day": 1,
        "topic": "选题标题（要有钩子，如'装修工人不会告诉你的3件事'）",
        "hook": "开头3秒话术（要能留人，如'北京装修老房，这3个坑我踩过，赔了10万'）",
        "keyPoints": ["要点1", "要点2", "要点3"],
        "cta": "结尾钩子话术（如'评论区扣1，我发你避坑清单'）"
      }
    ]
  },
  "contentTemplates": {
    "titleTemplates": ["可套用的标题模板1", "标题模板2", "标题模板3", "标题模板4", "标题模板5"],
    "openingHooks": ["开头留人话术1", "开头留人话术2", "开头留人话术3"],
    "endingHooks": ["结尾钩子话术1", "结尾钩子话术2", "结尾钩子话术3"]
  },
  "engagementScripts": {
    "commentReplyTemplates": [
      {"when": "当评论问价格时", "reply": "回复话术模板"},
      {"when": "当评论问细节时", "reply": "回复话术模板"},
      {"when": "当评论表示认可时", "reply": "回复话术模板"}
    ],
    "privateDomainGuide": "引导私信的评论区话术"
  },
  "conversionFlow": {
    "hookItems": [
      {"name": "钩子名称", "description": "描述", "howToUse": "怎么用"}
    ],
    "privateDomainScript": "加微信后的第一句话（完整话术，不是概括）",
    "followUpFlow": ["第一天发什么", "第三天发什么", "第七天发什么"]
  }${liveStreamSection}${sensitiveWordsSection}
  "realisticGoals": {
    "firstMonth": { "fans": "粉丝目标", "inquiries": "咨询量", "focus": "本月核心任务" },
    "thirdMonth": { "fans": "粉丝目标", "inquiries": "咨询量", "focus": "本月核心任务" }
  }
}

【写作要求】
1. 一切以"可执行"为标准：用户看完知道明天拍什么、怎么说
2. 痛点解决方案要具体：用户说"内容违规风险"，你要给出具体的敏感词清单和替代话术
3. 第一周选题要有钩子：标题和开头要能让人停下来看
4. 语言风格：口语化、接地气，像老朋友手把手教你
5. 结合用户的实际情况：时间少就给最优内容组合，有团队就给协作建议
6. ⚠️ 必须使用纯中文输出：所有内容、标题、话术、术语都必须是中文，禁止使用英文单词或英文专业术语（如testimonial、hook等），如有专业概念用中文解释或替换
${options.canLivestream ? '6. 直播运营要具体：给出开播时间段、直播时长、话术模板、互动技巧' : ''}`;
}

// 构建用户提示词
function buildUserPrompt(
  customer: any, 
  ipSummary: string, 
  surveySummary: string,
  industryTemplate: any,
  options: { canLivestream: boolean; needSensitiveWords: boolean; hasBudget: boolean }
): string {
  // 提取每周发布数量
  const weeklyPostsMatch = surveySummary.match(/每周可发布: (\d+)条/);
  const weeklyPosts = weeklyPostsMatch ? weeklyPostsMatch[1] : '5';

  // 根据用户能力动态生成重点要求
  const focusPoints: string[] = [
    '1. 账号搭建建议：根据用户的痛点和内容策略，重新设计昵称、简介、头像、封面方案（不要重复IP定位的建议）',
    '2. 针对用户填写的痛点，给出具体到"怎么说、怎么拍"的解决方案',
    '3. 第一周选题要具体到标题、开头3秒话术、结尾钩子',
    '4. 转化流程要具体到"评论区怎么回、加微信后怎么聊"',
  ];

  if (options.canLivestream) {
    focusPoints.push('5. 直播运营：用户有直播能力，必须给出开播时间建议、直播话术、互动技巧、转化方法');
  }

  if (options.needSensitiveWords) {
    focusPoints.push(`${options.canLivestream ? '6' : '5'}. 敏感词规避：用户有违规风险痛点或行业敏感度高，必须给出敏感词清单和替代方案`);
  }

  return `请为以下客户生成一份"明天就能执行"的账号运营规划。

【客户基本信息】
- 名称: ${customer.name || '未命名'}
- 行业: ${industryTemplate?.name || '未指定'}
- 地域: ${surveySummary.match(/所在地: ([^\n]+)/)?.[1] || '未指定'}

【已完成的IP定位（仅供参考，不要重复输出类似内容）】
${ipSummary}

【用户真实痛点与资源（重点针对这些给出解决方案）】
${surveySummary}

【关键约束】
- 每周只能发 ${weeklyPosts} 条内容，必须精准
- 用户痛点必须在方案中给出具体的解决方案
- 第一周选题要考虑用户的时间限制
${options.canLivestream ? '- 用户有直播能力，必须包含直播运营计划' : '- 用户暂无直播能力，无需直播相关内容'}
${options.needSensitiveWords ? '- 用户有内容违规风险或行业敏感度高，必须包含敏感词规避指南' : '- 用户纯视频运营、无投流，可省略敏感词模块'}

【输出格式要求 - 重要！！！】
你必须且只能输出一个有效的JSON对象，不要输出任何其他内容（不要有"以下是方案"之类的文字，不要有markdown代码块）。
直接输出JSON格式的回答，确保：
1. JSON格式完全正确，可以被JSON.parse()直接解析
2. 不要在JSON前后添加任何说明文字
3. 不要使用markdown代码块包裹
4. 确保所有引号都是英文引号
5. 确保中文字符正确转义`;
}
