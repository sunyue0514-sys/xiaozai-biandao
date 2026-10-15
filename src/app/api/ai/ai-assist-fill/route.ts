import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession } from '@/lib/session';
import { safeParseLLMJson } from '@/lib/json-repair';

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
    const { customerId, userDescription, mode } = body;

    if (!userDescription || !userDescription.trim()) {
      return new Response(
        JSON.stringify({ error: '请填写您的描述信息' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 根据模式选择不同的提示词
    const isFullForm = mode === 'business-analysis';
    
    const systemPrompt = isFullForm 
      ? getBusinessAnalysisPrompt()
      : getIPPositioningPrompt();

    const userPrompt = `用户描述：
${userDescription}

请根据以上描述，生成${isFullForm ? '商业定位分析表单数据' : 'IP定位信息'}。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullContent = '';
        try {
          const llmStream = client.stream(messages, {
            model: 'doubao-seed-2-0-lite-260215',
            temperature: 0.3,
          });

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
            }
          }
          
          // 尝试解析JSON
          let result;
          try {
            // 清理可能的多余内容
            let jsonStr = fullContent.trim();
            
            // 如果有markdown代码块，提取其中的JSON
            if (jsonStr.includes('```')) {
              const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (match) {
                jsonStr = match[1].trim();
              }
            }
            
            // 清理 Markdown 格式（如 # 标题、** 加粗等）
            jsonStr = jsonStr
              .replace(/^#+\s+/gm, '')  // 移除 # 开头的标题行
              .replace(/\*\*(.*?)\*\*/g, '$1')  // 移除 ** 加粗
              .replace(/\*(.*?)\*/g, '$1')  // 移除 * 斜体
              .replace(/`{1,3}/g, '')  // 移除反引号
              .trim();
            
            // 使用增强的JSON解析器
            result = safeParseLLMJson(jsonStr, '[AI辅助填写]');
            
            if (!result) {
              console.error('API operation event');
              console.log('API operation event');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI返回格式异常，请重试', raw: fullContent.slice(0, 500) })}\n\n`));
              controller.close();
              return;
            }
            
            // 调试：打印解析后的结果
            console.log('API operation event');
            console.log('API operation event');
          } catch (parseError) {
            console.error('API operation event');
            console.log('API operation event');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI返回格式异常，请重试', raw: fullContent.slice(0, 500) })}\n\n`));
            controller.close();
            return;
          }
          
          // 返回成功结果
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            success: true, 
            data: result
          })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('API operation event');
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI分析过程中出现错误，请重试' })}\n\n`));
          } catch {
            // Controller might already be closed
          }
          try {
            controller.close();
          } catch {
            // Already closed
          }
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
      JSON.stringify({ error: '服务暂时不可用，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 商业定位分析表单数据提示词（精简版）
function getBusinessAnalysisPrompt(): string {
  return `你是短视频IP定位专家。根据用户描述生成商业分析JSON。

规则：纯JSON输出，无markdown，字段根据描述推断。

{
  "formData": {
    "contactPerson": "姓名",
    "phone": "",
    "city": "城市",
    "platforms": ["抖音"],
    "currentAccounts": "",
    "industry": "行业：教育培训/餐饮美食/房产家居/美容美妆/健身运动/汽车服务/医疗健康/财税服务/IT互联网/电商零售/母婴亲子/摄影摄像/婚庆服务/咨询服务/其他",
    "yearsInBusiness": ["3-5年"],
    "competitors": "竞品描述",
    "industryAdvantages": "优势",
    "industryChallenges": "挑战",
    "targetAgeRange": ["25-35岁"],
    "targetGender": ["女"],
    "targetOccupation": "职业",
    "targetIncome": ["5000-10000"],
    "targetPainPoints": "痛点",
    "targetNeeds": "需求",
    "mainProducts": "产品",
    "serviceAreas": "服务区",
    "priceRange": "价格",
    "uniqueValue": "卖点",
    "targetFollowers": "目标粉丝",
    "targetRevenue": "目标收入",
    "preferredMonetization": ["知识付费"],
    "monetizationGoal": "变现目标"
  },
  "analysisReport": "简短分析报告(200字内)"
}`;
}

// IP定位提示词 - 匹配前端表单结构
function getIPPositioningPrompt(): string {
  return `你是短视频IP定位专家。根据用户描述生成IP定位JSON。

【重要规则】
1. 必须严格按以下字段名输出，不要改名！
2. 必须根据用户描述合理推断并填充所有字段，不要留空！
3. 如果用户没有提到某方面信息，根据描述合理推断！

{
  "formData": {
    "basicInfo": {
      "identity": ["身份标签1", "身份标签2"],
      "nickname": "IP昵称，根据用户描述取一个合适的",
      "age": "年龄段如25-35岁",
      "education": "学历",
      "location": "城市",
      "appearance": "形象描述",
      "personality": ["性格特点1", "性格特点2", "性格特点3"],
      "othersEvaluation": "他人评价",
      "familyInfluence": "家庭影响",
      "values": {
        "lifeView": "人生观",
        "careerView": "职业观",
        "marriageView": "婚姻观"
      }
    },
    "coreValue": {
      "interests": ["兴趣1", "兴趣2"],
      "skills": ["技能1", "技能2"],
      "specialties": "专长描述",
      "passions": "热爱之事",
      "valueProvided": "能提供的价值"
    },
    "lifeStory": {
      "recent10Years": "近10年经历概述，必须填写，根据用户描述推断",
      "darkestMoment": "人生低谷经历，根据用户情况推断",
      "turningPoint": "人生转折点，根据用户情况推断",
      "highlightMoment": "高光时刻，根据用户情况推断",
      "motto": "人生格言，符合人设的金句"
    },
    "userPersona": {
      "targetCustomers": "目标用户描述",
      "painPoints": "用户痛点",
      "commonQuestions": ["常见问题1", "常见问题2"],
      "competitiveAdvantage": "竞争优势",
      "motivation": "创作动力"
    },
    "productsServices": {
      "productTypes": ["产品类型1", "产品类型2"],
      "mainProducts": "主要产品",
      "priceRange": "价格区间",
      "serviceArea": "服务范围",
      "uniqueValue": "独特价值"
    },
    "contentDirection": {
      "platforms": ["抖音"],
      "mainTopics": ["选题1", "选题2", "选题3"],
      "contentStyle": "内容风格",
      "updateFrequency": "更新频率如每周3次"
    },
    "positioningDirection": {
      "nicheField": "细分领域",
      "contentTrack": ["赛道1", "赛道2"],
      "monetization": ["变现方式1", "变现方式2"]
    }
  }
}

【字段名对照表】
- lifeStory 不是 lifeExperience
- recent10Years 不是 last10Years  
- darkestMoment 不是 darkMoments
- turningPoint 不是 turningPoints
- highlightMoment 不是 highlights
- targetCustomers 不是 targetUsers
- painPoints 不是 userPainPoints

【特别注意】
lifeStory下的所有字段都必须填写内容，不能为空！根据用户描述合理推断。`;
}
