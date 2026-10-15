import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { hasSession, getSessionUserId } from '@/lib/session';
import { consumePower, refundPower } from '@/lib/power';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 清理 Markdown 符号，转换为纯文本
function cleanMarkdownText(text: string): string {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // **加粗** -> 文字
    .replace(/\*(.*?)\*/g, '$1')      // *斜体* -> 文字
    .replace(/__(.*?)__/g, '$1')      // __下划线__ -> 文字
    .replace(/_(.*?)_/g, '$1')        // _斜体_ -> 文字
    .replace(/^#+\s+/gm, '')          // # 标题 -> 去掉
    .replace(/^[-*]\s+/gm, (match) => {
      // 保留数组中的列表项符号，只清理非数组上下文中的
      return match;
    });
}

// 递归清理 JSON 对象中的所有字符串字段
function cleanMarkdownFromObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return cleanMarkdownText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanMarkdownFromObject(item));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = cleanMarkdownFromObject(value);
    }
    return result;
  }
  return obj;
}

// 手动解析 JSON 内容的辅助函数
function tryManualParse(content: string): Record<string, unknown> | null {
  try {
    // 定义需要提取的核心字段路径
    const fieldPaths = [
      'basicInfo.identity', 'basicInfo.nickname', 'basicInfo.age',
      'basicInfo.education', 'basicInfo.location', 'basicInfo.appearance',
      'basicInfo.personality', 'basicInfo.othersEvaluation', 'basicInfo.familyInfluence',
      'basicInfo.values.lifeView', 'basicInfo.values.careerView', 'basicInfo.values.marriageView',
      'coreValue.interests', 'coreValue.skills', 'coreValue.specialties',
      'coreValue.passions', 'coreValue.valueProvided',
      'lifeStory.recent10Years', 'lifeStory.darkestMoment', 'lifeStory.turningPoint',
      'lifeStory.highlightMoment', 'lifeStory.motto',
      'userPersona.targetCustomers', 'userPersona.painPoints', 'userPersona.commonQuestions',
      'userPersona.competitiveAdvantage', 'userPersona.motivation',
      'productsServices.productTypes', 'productsServices.mainProducts',
      'productsServices.priceRange', 'productsServices.serviceArea', 'productsServices.uniqueValue',
      'contentDirection.platforms', 'contentDirection.mainTopics',
      'contentDirection.contentStyle', 'contentDirection.updateFrequency',
      'positioningDirection.nicheField', 'positioningDirection.contentTrack',
      'positioningDirection.monetization', 'summary'
    ];
    
    // 使用正则提取字段值
    const result: Record<string, unknown> = {};
    
    // 尝试直接解析完整的JSON（因为前面的策略可能已经修复了格式）
    try {
      return JSON.parse(content);
    } catch {
      // 继续手动解析
    }
    
    // 尝试匹配数组字段如 "identity": ["xxx", "yyy"]
    for (const path of fieldPaths) {
      const key = path.split('.').pop()!;
      const jsonKey = `"${key}"`;
      const jsonKeyWithColon = `"${key}":`;
      
      const idx = content.indexOf(jsonKeyWithColon);
      if (idx !== -1) {
        const afterColon = content.substring(idx + jsonKeyWithColon.length).trim();
        
        // 尝试提取数组 [...]
        if (afterColon.startsWith('[')) {
          let depth = 0;
          let end = -1;
          for (let i = 0; i < afterColon.length; i++) {
            if (afterColon[i] === '[') depth++;
            else if (afterColon[i] === ']') {
              depth--;
              if (depth === 0) {
                end = i;
                break;
              }
            }
          }
          if (end !== -1) {
            try {
              const arrStr = afterColon.substring(0, end + 1);
              result[key] = JSON.parse(arrStr);
            } catch {
              // 尝试提取为字符串
              const strContent = afterColon.substring(1, end).replace(/\n/g, ' ').trim();
              result[key] = strContent;
            }
          }
        }
        // 尝试提取字符串 "..."
        else if (afterColon.startsWith('"')) {
          let end = 1;
          let escaped = false;
          for (let i = 1; i < afterColon.length; i++) {
            if (escaped) {
              escaped = false;
              continue;
            }
            if (afterColon[i] === '\\') {
              escaped = true;
              continue;
            }
            if (afterColon[i] === '"') {
              end = i;
              break;
            }
          }
          const strValue = afterColon.substring(1, end)
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          result[key] = strValue;
        }
        // 尝试提取数字或布尔值
        else {
          const numMatch = afterColon.match(/^(\d+\.?\d*)/);
          if (numMatch) {
            result[key] = parseFloat(numMatch[1]);
          }
          const boolMatch = afterColon.match(/^(true|false)/);
          if (boolMatch) {
            result[key] = boolMatch[1] === 'true';
          }
        }
      }
    }
    
    // 如果提取到足够的字段，返回结果
    if (Object.keys(result).length >= 5) {
      console.log('API operation event');
      return result;
    }
    
    return null;
  } catch (e) {
    console.log('API operation event');
    return null;
  }
}

// 前端表单数据结构
interface FormData {
  basicInfo: {
    identity: string[];
    nickname: string;
    age: string;
    education: string;
    location: string;
    appearance: string;
    personality: string[];
    othersEvaluation: string;
    familyInfluence: string;
    values: {
      lifeView: string;
      careerView: string;
      marriageView: string;
    };
  };
  coreValue: {
    interests: string[];
    skills: string[];
    specialties: string;
    passions: string;
    valueProvided: string;
  };
  lifeStory: {
    recent10Years: string;
    darkestMoment: string;
    turningPoint: string;
    highlightMoment: string;
    motto: string;
  };
  userPersona: {
    targetCustomers: string;
    painPoints: string;
    commonQuestions: string[];
    competitiveAdvantage: string;
    motivation: string;
  };
  productsServices: {
    productTypes: string[];
    mainProducts: string;
    priceRange: string;
    serviceArea: string;
    uniqueValue: string;
  };
  contentDirection: {
    platforms: string[];
    mainTopics: string[];
    contentStyle: string;
    updateFrequency: string;
  };
  positioningDirection: {
    nicheField: string;
    contentTrack: string[];
    monetization: string[];
  };
  aiReports?: {
    businessPositioning?: string;
    accountPlanning?: string;
    contentStrategy?: Array<{
      type: string;
      ratio: number;
      goal: string;
      description: string;
    }>;
  };
  businessPositioning?: string;
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  // 用于失败时返还算力
  let consumedPower = 0;
  const userIdRef = { value: 0 };
  
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

    const userId = await getSessionUserId(token);
    userIdRef.value = userId || 0;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '会话无效' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查算力
    const powerCheck = await consumePower(userId, 'positioning', 0);
    if (!powerCheck.success) {
      return new Response(
        JSON.stringify({ 
          error: powerCheck.error, 
          code: powerCheck.code,
          required: powerCheck.required,
          remaining: powerCheck.remaining
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 记录本次消耗的算力，用于失败时返还
    consumedPower = powerCheck.consumed || 750;

    const body = await request.json();
    const { customerId, name, customerName, industry, description, customerDescription, formData } = body as {
      customerId?: string;
      name?: string;
      customerName?: string;
      industry?: string;
      description?: string;
      customerDescription?: string;
      formData?: FormData;
    };

    // 调试：打印收到的数据
    console.log('API operation event');
    console.log('API operation event');
    console.log('API operation event');
    console.log('API operation event');
    if (formData) {
      console.log('API operation event');
      console.log('API operation event');
      console.log('API operation event');
      console.log('API operation event');
      console.log('API operation event');
      console.log('API operation event');
      console.log('API operation event');
    }

    // 兼容两种参数命名方式
    const finalName = name || customerName;
    const finalDescription = description || customerDescription;

    // 检测是否为AIReportsStep调用（已有完整定位数据，只需生成businessPositioning）
    const hasCompleteData = formData?.basicInfo && formData?.coreValue;
    const needsBusinessPositioning = formData?.aiReports?.businessPositioning === '' || 
                                     formData?.businessPositioning === '' ||
                                     (hasCompleteData && !formData?.aiReports?.businessPositioning);
    
    console.log('API operation event');
    console.log('API operation event');
    console.log('API operation event');
    
    if (!finalName && !hasCompleteData) {
      return new Response(
        JSON.stringify({ error: '客户名称不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customHeaders = safeForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 根据是否有完整数据决定生成内容
    let systemPrompt: string;
    let userMessage: string;
    
    if (needsBusinessPositioning && hasCompleteData) {
      // 已有完整定位数据，在已有数据基础上深度挖掘，生成完整的定位报告
      systemPrompt = `你是一位资深IP定位顾问，正在给客户做一对一深度咨询。

【核心任务】
基于客户已有的定位信息，进行深度挖掘和升华，生成一份有血有肉、有故事性、有感染力的IP定位报告。

【内容深度要求 - 必须满足】
每个描述性字段（string类型）至少写80-200字，要：
1. 有具体细节和场景，不是空洞的套话
2. 有情感和温度，能让读者产生共鸣
3. 有真实感，像是在讲一个真实的人的故事
4. 语言口语化，像在跟朋友聊天

【写作风格要求】
- 禁止使用"基于""通过""从而""综上所述"等AI腔
- 禁止模板化的套话（如"提供优质的服务"）
- 禁止空洞的口号（如"帮助用户实现目标"）
- 要用具体的故事、案例、数字、场景来支撑
- 像写人物传记一样写人生故事

【严格禁止】
- 禁止使用 **加粗**（用括号或直接文字强调）
- 禁止使用 *斜体*
- 禁止使用 --- 或 ___ 等分隔线
- 禁止使用 # 标题符号
- 禁止使用 - 或 * 作为列表前缀（数组字段除外）
- 所有描述性文字直接书写，不要任何装饰符号

【输出格式】
输出必须是有效的JSON，不要输出任何其他内容。

{
  "basicInfo": {
    "identity": ["身份标签1", "身份标签2", "身份标签3"],
    "nickname": "昵称",
    "age": "年龄段",
    "education": "学历",
    "location": "所在地",
    "appearance": "外在形象描述（50字左右）",
    "personality": ["性格特点1", "特点2", "特点3"],
    "othersEvaluation": "他人对Ta的评价（要有具体评价内容）",
    "familyInfluence": "家庭背景对Ta的影响（要有具体故事）",
    "values": {
      "lifeView": "人生观（用一两句话说明）",
      "careerView": "职业观（用一两句话说明）",
      "marriageView": "婚姻观（用一两句话说明）"
    }
  },
  "coreValue": {
    "interests": ["兴趣1", "兴趣2", "兴趣3"],
    "skills": ["技能1", "技能2", "技能3"],
    "specialties": "专长描述（80-150字，要有具体说明）",
    "passions": "热情所在（80-150字，要有故事感）",
    "valueProvided": "核心价值（80-150字，要有具体能解决什么问题）"
  },
  "lifeStory": {
    "recent10Years": "近10年经历（150-300字，要有具体年份、事件、转折，像讲故事一样）",
    "darkestMoment": "至暗时刻（100-200字，要有具体场景和感受，情感要真实）",
    "turningPoint": "命运转折（100-200字，要说明是什么触发了改变，怎么改变的）",
    "highlightMoment": "高光时刻（100-200字，要有具体的成就感和满足感）",
    "motto": "座右铭/人生信条（一句话，朗朗上口）"
  },
  "userPersona": {
    "targetCustomers": "目标用户（100-150字，描述具体的人群画像）",
    "painPoints": "用户痛点（100-200字，用具体场景说明）",
    "commonQuestions": ["常见问题1", "问题2", "问题3", "问题4", "问题5"],
    "competitiveAdvantage": "竞争优势（100-150字，要有具体优势点）",
    "motivation": "创作动力（80-120字，要有故事感）"
  },
  "productsServices": {
    "productTypes": ["产品类型1", "类型2", "类型3"],
    "mainProducts": "主要产品（100-200字，要有具体产品名称和描述）",
    "priceRange": "价格区间（如：99-999元）",
    "serviceArea": "服务范围",
    "uniqueValue": "独特价值（100-150字，要说明与竞品的差异）"
  },
  "contentDirection": {
    "platforms": ["平台1", "平台2"],
    "mainTopics": ["选题方向1", "方向2", "方向3", "方向4", "方向5"],
    "contentStyle": "内容风格（80-120字，描述具体的内容风格特点）",
    "updateFrequency": "更新频率（如：每周3-4次）"
  },
  "positioningDirection": {
    "nicheField": "细分领域",
    "contentTrack": ["赛道1", "赛道2"],
    "monetization": ["变现方式1", "方式2", "方式3"]
  },
  "summary": "一句话定位（30-50字，要说明你是谁、帮谁、解决什么问题）"
}`;

      // 构建用户消息 - 基于已有数据深度完善
      const existingData = JSON.stringify(formData, null, 2);
      userMessage = `请在以下已有IP定位数据的基础上，进行深度挖掘和完善：

${existingData}

请根据以上信息，生成一份完整的JSON格式IP定位报告。要求每个描述性字段至少80-200字，要有具体细节、情感、场景，像写人物传记一样有故事感。不要模板化套话，要让读者感受到这是一个真实的人。必须输出有效的JSON，不要输出任何其他文字说明。`;
    } else {
      // 首次生成 - 根据客户名称和描述生成完整IP定位报告
      systemPrompt = `你是一位资深IP定位顾问，正在给客户做一对一深度咨询。

【核心任务】
根据客户提供的名称和描述，创作一份有血有肉、有故事性、有感染力的IP定位报告。如果信息不足，要合理推断填充，但推断的内容也要符合逻辑、有细节。

【内容深度要求 - 必须满足】
每个描述性字段（string类型）至少写80-200字，要：
1. 有具体细节和场景，不是空洞的套话
2. 有情感和温度，能让读者产生共鸣
3. 有真实感，像是在讲一个真实的人的故事
4. 语言口语化，像在跟朋友聊天

【写作风格要求】
- 禁止使用"基于""通过""从而""综上所述"等AI腔
- 禁止模板化的套话（如"提供优质的服务"）
- 禁止空洞的口号（如"帮助用户实现目标"）
- 要用具体的故事、案例、数字、场景来支撑
- 像写人物传记一样写人生故事

【严格禁止】
- 禁止使用 **加粗**（用括号或直接文字强调）
- 禁止使用 *斜体*
- 禁止使用 --- 或 ___ 等分隔线
- 禁止使用 # 标题符号
- 禁止使用 - 或 * 作为列表前缀（数组字段除外）
- 所有描述性文字直接书写，不要任何装饰符号

【输出格式】
输出必须是有效的JSON，不要输出任何其他内容。

{
  "basicInfo": {
    "identity": ["身份标签1", "身份标签2", "身份标签3"],
    "nickname": "昵称",
    "age": "年龄段",
    "education": "学历",
    "location": "所在地",
    "appearance": "外在形象描述（50字左右）",
    "personality": ["性格特点1", "特点2", "特点3"],
    "othersEvaluation": "他人对Ta的评价（要有具体评价内容）",
    "familyInfluence": "家庭背景对Ta的影响（要有具体故事）",
    "values": {
      "lifeView": "人生观（用一两句话说明）",
      "careerView": "职业观（用一两句话说明）",
      "marriageView": "婚姻观（用一两句话说明）"
    }
  },
  "coreValue": {
    "interests": ["兴趣1", "兴趣2", "兴趣3"],
    "skills": ["技能1", "技能2", "技能3"],
    "specialties": "专长描述（80-150字，要有具体说明）",
    "passions": "热情所在（80-150字，要有故事感）",
    "valueProvided": "核心价值（80-150字，要有具体能解决什么问题）"
  },
  "lifeStory": {
    "recent10Years": "近10年经历（150-300字，要有具体年份、事件、转折，像讲故事一样）",
    "darkestMoment": "至暗时刻（100-200字，要有具体场景和感受，情感要真实）",
    "turningPoint": "命运转折（100-200字，要说明是什么触发了改变，怎么改变的）",
    "highlightMoment": "高光时刻（100-200字，要有具体的成就感和满足感）",
    "motto": "座右铭/人生信条（一句话，朗朗上口）"
  },
  "userPersona": {
    "targetCustomers": "目标用户（100-150字，描述具体的人群画像）",
    "painPoints": "用户痛点（100-200字，用具体场景说明）",
    "commonQuestions": ["常见问题1", "问题2", "问题3", "问题4", "问题5"],
    "competitiveAdvantage": "竞争优势（100-150字，要有具体优势点）",
    "motivation": "创作动力（80-120字，要有故事感）"
  },
  "productsServices": {
    "productTypes": ["产品类型1", "类型2", "类型3"],
    "mainProducts": "主要产品（100-200字，要有具体产品名称和描述）",
    "priceRange": "价格区间（如：99-999元）",
    "serviceArea": "服务范围",
    "uniqueValue": "独特价值（100-150字，要说明与竞品的差异）"
  },
  "contentDirection": {
    "platforms": ["平台1", "平台2"],
    "mainTopics": ["选题方向1", "方向2", "方向3", "方向4", "方向5"],
    "contentStyle": "内容风格（80-120字，描述具体的内容风格特点）",
    "updateFrequency": "更新频率（如：每周3-4次）"
  },
  "positioningDirection": {
    "nicheField": "细分领域",
    "contentTrack": ["赛道1", "赛道2"],
    "monetization": ["变现方式1", "方式2", "方式3"]
  },
  "summary": "一句话定位（30-50字，要说明你是谁、帮谁、解决什么问题）"
}`;

      userMessage = `请为以下客户生成商业定位分析报告：

客户名称：${finalName}
所属行业：${industry || '综合'}
客户描述：${finalDescription || '暂无'}

请根据以上信息，生成一份完整的JSON格式IP定位报告。要求每个描述性字段至少80-200字，要有具体细节、情感、场景，像写人物传记一样有故事感。不要模板化套话，要让读者感受到这是一个真实的人。必须输出有效的JSON，不要输出任何其他文字说明。`;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userMessage },
    ];

    // 调用 AI 获取完整 JSON（使用 invoke 非流式方法）
    try {
      const result = await client.invoke(messages, {
        model: 'deepseek-v3-2-251201',
        temperature: 0.7,
      });

      let content = '';
      const rawContent = result.content as unknown;
      console.log('API operation event');
      console.log('API operation event');
      console.log('API operation event');
      
      if (typeof rawContent === 'string') {
        content = rawContent;
      } else if (Array.isArray(rawContent)) {
        content = (rawContent as Array<{ text?: string }>).map(c => c.text || '').join('');
      }
      
      console.log('API operation event');
      console.log('API operation event');

      // 清理特殊字符
      let cleanedContent = content.trim();
      
      // 清理 markdown 代码块
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      
      // 【关键修复】如果是生成 businessPositioning，且内容是纯文本（不以 { 开头），直接返回
      if (needsBusinessPositioning && !cleanedContent.trim().startsWith('{')) {
        console.log('API operation event');
        return new Response(
          JSON.stringify({ 
            success: true, 
            businessPositioning: cleanedContent.trim(),
            customerId 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 提取 JSON 部分（从第一个 { 到最后一个 }）
      const firstBrace = cleanedContent.indexOf('{');
      const lastBrace = cleanedContent.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        // 如果是生成 businessPositioning，这里也直接返回原文
        if (needsBusinessPositioning) {
          console.log('API operation event');
          return new Response(
            JSON.stringify({ 
              success: true, 
              businessPositioning: cleanedContent.trim(),
              customerId 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        throw new Error('无法找到有效的JSON结构');
      }
      
      cleanedContent = cleanedContent.substring(firstBrace, lastBrace + 1);
      
      // 使用更健壮的 JSON 解析策略
      const parseStrategies = [
        // 策略1：直接解析（清理首尾空白）
        () => JSON.parse(cleanedContent.trim()),
        
        // 策略2：移除注释和多余空白
        () => {
          // 移除 // 注释
          let s = cleanedContent.replace(/\/\/[^\n]*/g, '');
          // 移除 /* */ 注释
          s = s.replace(/\/\*[\s\S]*?\*\//g, '');
          // 移除多余的空白字符（保留必要的）
          s = s.replace(/[ \t]+/g, ' ');
          s = s.replace(/\s*([{}\[\],:])\s*/g, '$1');
          return JSON.parse(s);
        },
        
        // 策略3：将未转义的换行符和多余空白转为单空格
        () => {
          let s = cleanedContent;
          // 匹配字符串内容并处理其中的换行符
          s = s.replace(/"([^"\\]|\\.)*"/g, (match) => {
            // 对于字符串值，将内部换行和多余空白替换为单个空格
            return match.replace(/\s+/g, ' ');
          });
          return JSON.parse(s);
        },
        
        // 策略4：激进清理 - 移除所有换行和多余空白
        () => {
          // 先将所有非字符串内容中的换行替换为空格
          let s = cleanedContent
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .replace(/\t/g, ' ');
          // 移除连续多个空格
          s = s.replace(/\s{2,}/g, ' ');
          // 移除字符串外的多余空白
          s = s.replace(/\s*([{}\[\],:])\s*/g, '$1');
          return JSON.parse(s);
        },
        
        // 策略5：只保留JSON有效字符
        () => {
          // 提取所有JSON有效字符
          let s = '';
          let inString = false;
          let escaped = false;
          
          for (let i = 0; i < cleanedContent.length; i++) {
            const char = cleanedContent[i];
            
            if (escaped) {
              s += char;
              escaped = false;
              continue;
            }
            
            if (char === '\\' && inString) {
              s += char;
              escaped = true;
              continue;
            }
            
            if (char === '"') {
              inString = !inString;
              s += char;
              continue;
            }
            
            // 如果不在字符串内，跳过空白和换行
            if (!inString) {
              if (/[a-zA-Z0-9\u4e00-\u9fa5{}\[\],:]/.test(char)) {
                s += char;
              }
            } else {
              s += char;
            }
          }
          
          // 清理多余的空白
          s = s.replace(/\s*([{}\[\],:])\s*/g, '$1');
          return JSON.parse(s);
        },
      ];
      
      // 尝试所有策略
      for (let i = 0; i < parseStrategies.length; i++) {
        try {
          const parsed = parseStrategies[i]();
          console.log('API operation event');
          
          // 如果是生成 businessPositioning，提取文本内容
          if (needsBusinessPositioning) {
            let businessPositioningText = '';
            
            // 如果 parsed 是字符串，直接使用
            if (typeof parsed === 'string') {
              businessPositioningText = parsed;
            }
            // 如果 parsed 有 text 或 content 字段，提取它
            else if (parsed && typeof parsed === 'object') {
              const p = parsed as Record<string, unknown>;
              if (p.text && typeof p.text === 'string') {
                businessPositioningText = p.text;
              } else if (p.content && typeof p.content === 'string') {
                businessPositioningText = p.content;
              } else {
                // 否则将整个对象转为格式化字符串
                businessPositioningText = JSON.stringify(parsed, null, 2);
              }
            }
            
            console.log('API operation event');
            
            // 如果 businessPositioningText 是 JSON 格式（对象被字符串化），改为返回 data 格式
            if (businessPositioningText.trim().startsWith('{') && parsed && typeof parsed === 'object' && !(parsed as Record<string, unknown>).text && !(parsed as Record<string, unknown>).content) {
              // 清理 Markdown 符号
              const cleanedData = cleanMarkdownFromObject(parsed);
              // 返回完整数据格式，让前端能够正确解析和填充
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  data: cleanedData,
                  customerId 
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            }
            
            // 清理 businessPositioningText 中的 Markdown 符号
            const cleanedBusinessPositioning = cleanMarkdownText(businessPositioningText);
            return new Response(
              JSON.stringify({ 
                success: true, 
                businessPositioning: cleanedBusinessPositioning,
                customerId 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          
          // 清理 Markdown 符号
          const cleanedData = cleanMarkdownFromObject(parsed);
          
          return new Response(
            JSON.stringify({ success: true, data: cleanedData, customerId }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } catch (e) {
          console.log('API operation event');
        }
      }
      
      // 所有策略都失败，尝试手动解析核心字段
      console.log('API operation event');
      const manualParsed = tryManualParse(cleanedContent);
      if (manualParsed) {
        // 如果是生成 businessPositioning，提取文本内容
        if (needsBusinessPositioning) {
          let businessPositioningText = '';
          
          if (typeof manualParsed === 'string') {
            businessPositioningText = manualParsed;
          } else if (manualParsed && typeof manualParsed === 'object') {
            const parsed = manualParsed as Record<string, unknown>;
            if (parsed.text && typeof parsed.text === 'string') {
              businessPositioningText = parsed.text;
            } else if (parsed.content && typeof parsed.content === 'string') {
              businessPositioningText = parsed.content;
            } else {
              // 如果是对象且没有 text/content 字段，返回 data 格式
              // 清理 Markdown 符号
              const cleanedData = cleanMarkdownFromObject(manualParsed);
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  data: cleanedData,
                  customerId 
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
              );
            }
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              businessPositioning: businessPositioningText,
              customerId 
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, data: manualParsed, customerId }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // 如果是生成 businessPositioning 且解析失败，检查是否返回了纯文本或JSON包装
      if (needsBusinessPositioning) {
        console.log('API operation event');
        
        // 尝试从各种格式中提取纯文本
        const textContent = cleanedContent.trim();
        
        // 情况1：已经是纯文本（不以 { 开头）
        if (!textContent.startsWith('{')) {
          if (textContent.length > 50) {
            console.log('API operation event');
            return new Response(
              JSON.stringify({ 
                success: true, 
                businessPositioning: textContent,
                customerId 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // 情况2：可能是 {"text": "..."} 格式
        try {
          const parsed = JSON.parse(textContent) as Record<string, unknown>;
          if (parsed.text && typeof parsed.text === 'string') {
            console.log('API operation event');
            return new Response(
              JSON.stringify({ 
                success: true, 
                businessPositioning: parsed.text,
                customerId 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (parsed.content && typeof parsed.content === 'string') {
            console.log('API operation event');
            return new Response(
              JSON.stringify({ 
                success: true, 
                businessPositioning: parsed.content,
                customerId 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          // 如果JSON中没有text/content字段，整个JSON转字符串
          const jsonStr = JSON.stringify(parsed, null, 2);
          if (jsonStr.length > 50) {
            console.log('API operation event');
            return new Response(
              JSON.stringify({ 
                success: true, 
                businessPositioning: jsonStr,
                customerId 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } catch {
          // JSON解析失败，继续
        }
        
        // 情况3：尝试提取 JSON 中的字符串值
        const textMatch = textContent.match(/"text"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (textMatch && textMatch[1]) {
          const extractedText = textMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          if (extractedText.length > 50) {
            console.log('API operation event');
            return new Response(
              JSON.stringify({ 
                success: true, 
                businessPositioning: extractedText,
                customerId 
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
        
        // 情况4：返回原文作为兜底（即使不理想也比报错好）
        console.log('API operation event');
        return new Response(
          JSON.stringify({ 
            success: true, 
            businessPositioning: textContent,
            customerId 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.error('API operation event');
      const errorMsg = error instanceof Error ? 'Request failed' : '生成失败';
      
      // 失败时返还算力
      await refundPower(userIdRef.value, consumedPower, `IP定位生成失败: ${errorMsg.slice(0, 50)}`);
      
      return new Response(
        JSON.stringify({ error: `生成失败: ${errorMsg.slice(0, 100)}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('API operation event');
    // 失败时返还算力（如果还没返的话）
    if (consumedPower > 0 && userIdRef.value) {
      await refundPower(userIdRef.value, consumedPower, `IP定位异常: ${(error instanceof Error ? 'Request failed' : '未知错误').slice(0, 50)}`);
    }
    return new Response(
      JSON.stringify({ error: '服务暂时不可用，请稍后重试' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
