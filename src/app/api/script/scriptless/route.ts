import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { 
  LLMClient, 
  Config, 
  HeaderUtils,
  KnowledgeClient,
  KnowledgeDocument,
  DataSourceType,
  ChunkConfig,
} from 'coze-coding-dev-sdk';

// 无脚本拍摄技巧文档内容（完整版）
const SCRIPTLESS_KNOWLEDGE = `# 无脚本拍摄技巧完整指南

## 一、无脚本拍摄的定义与常见问题

无脚本拍摄是指编导通过提问引导 IP 现场回答的创作方式。实际操作中常遇到三类问题：
1. 问题无延续性：如 "今天开心吗？""饭好吃吗？" 这类傻瓜式提问，IP 只能简单回答 "是 / 否"，无法展开。
2. 问题无重点：提问变成随意聊天，导致拍摄素材冗长（如一小时内容无核心）。
3. IP 无法回答：问题过于抽象或脱离 IP 经验，导致 IP 尬住，无法表达观点或情绪。

## 二、好问题的两个核心类别

### 引导类问题：带着答案问问题
引导类问题的核心是提前获取 IP 信息并筛选有用内容，通过提问引导 IP 自然表达预设答案。
- 操作步骤：拍摄前与 IP 沟通，摄取关键信息（如经历、观点），筛选具有用户触达性和情绪价值的内容，设计针对性问题。
- 示例：已知 IP 2016 年因进货亏损 200 万，可提问："哥，我记得您 2016 年好像因为进货的事遇到过挑战，能不能展开讲讲当时的情况？"

### 激发类问题：带着问题找答案
激发类问题需通过具象化提问引导 IP 自然思考并输出真实内容，更易获得意外优质素材。
- 关键原则：问题越具象，IP 思考越简单，表达越自然。抽象问题会导致 IP 刻意组织语言，失去情绪。
- 示例对比：
  - 抽象问题："装修麻烦吗？"（IP 可能从灯光、地面等多方向回答，缺乏焦点）
  - 具象问题："装修时选乳胶漆花了多久？过程麻烦吗？"（IP 能快速回忆具体细节，表达更有画面感和情绪）

## 三、无脚本拍摄的本质：事件、情绪与文案

无脚本拍摄的核心逻辑可概括为 "事件 - 情绪 - 文案"：
1. 事件是基础：提问与 IP 讲述的本质是诉说具体事件。
2. 情绪是动力：IP 对事件的感受越强烈，表达时情绪越饱满；若对事件无感受，则难以产生情绪。
3. 文案是结果：有情绪的表达会自然带动语言、表情、动作等多维度输出，文案仅是其中最基础的部分。

## 四、编导实战十大核心技巧

### 1. 眼神交流有讲究，对视自然不尴尬
- 痛点：让老板直接面对镜头，他肯定紧张；编导跟老板聊天，老对视又很别扭。
- 方法：老板不看镜头，看编导。编导看老板两个眼睛中间的位置，比如鼻梁上方一点点，这样双方都自然，老板思路也不会被打断。

### 2. 拍摄前先"唠嗑"，拉近距离是王道
- 目的：让老板感觉你是"朋友"，而不是"来拍我干活的"。
- 做法：开拍前，聊点跟工作无关的"私事"。比如："王总，您家孩子最近考试怎么样？""李总，听说您周末去打高尔夫了？赢了没？"
- 效果：老板一放松，话匣子就打开了，戒备心也没了。

### 3. "悄悄"开拍，别让老板有压力
- 痛点：你一说"老板，我们开始拍了啊！"老板瞬间就进入"工作模式"，表情僵硬，说话正经得像念报告，没情绪。
- 方法：编导和摄像师之间定个"暗号"。比如，编导悄悄挠挠耳朵，摄像就知道"可以开始了"。老板还以为在闲聊，状态就特别自然。

### 4. 编导"打了鸡血"，老板才能"热情洋溢"
- 原理：情绪是会传染的。你死气沉沉地提问，老板回答也没啥劲儿。
- 举例：
  - 平淡版："老板，您今年挣了多少钱？"（老板可能也平淡回答）
  - 激情版："老板！我今天来您工厂，好家伙！别家工厂门口冷冷清清，您这儿车水马龙，太厉害了！您是怎么做到的？快给我们传授传授！"
- 关键：提问时，自己先要有情绪，声音洪亮，有感染力。

### 5. 身体"稳住"别乱动，别当"气氛破坏王"
- 注意：老板说话的时候，编导要"稳住"。
- 禁忌：别频繁挠头、抠鼻子、抖腿，或者做其他大幅度动作。这些小动作会分散老板的注意力，他思路一断，灵感就没了。

### 6. 点头微笑"给正反馈"，老板越说越带劲
- 作用：老板说话时，不知道自己说的好不好、对不对你的路子。
- 做法：当老板说到点子上，或者你觉得这段特别好的时候，你就频频点头、给个微笑，或者悄悄竖个大拇指（小动作，别太夸张）。
- 效果：老板一看你这反应，就知道"这部分他爱听"，会更专注、更有情绪地往下说。

### 7. 距离产生"美"，不远不近才舒服
- 太远：老板说话得扯着嗓子，不自然。
- 太近：压迫感太强，老板浑身不自在。
- 建议：大概两米左右的距离，比较适中，双方都放松。

### 8. 提问"带点刺"，激发老板真性情
- 平淡提问："王总，您觉得学历低能创业吗？"（老板可能会说："嗯，也能创吧。"没味道。）
- 刺激提问："王总，听说您当年就上到小学三年级，后来怎么就敢出来创业，还做得这么大呢？"（老板一听，可能就来劲儿了："嘿！三年级咋了？三年级就不能创业了？我跟你说……"）
- 案例：鲁豫采访贫困山区老师，老师说孩子们吃得不好。鲁豫问："那为什么不吃肉呢？"很多人骂她，但从采访技巧看，这是个好问题！它逼着对方说出"我们哪有肉吃啊！"这种更真实、更有冲击力的答案。我们要的就是这种效果。

### 9. 适当"小酌"助放松，氛围到了话就多
- 适用情况：有些老板气场强大，平时说一不二，但面对镜头就"卡壳"，觉得"上电视了，得端着"，怎么劝都放不开。
- 方法：可以提议稍微喝点小酒。比如他平时能喝半斤，今天就喝一两，意思意思。女生的话，可以喝点低度的果酒、气泡酒什么的。
- 效果：酒精能让人放松一点，话也会多起来，亲测有效！但记住，是"适当"，千万别喝多了。

### 10. 编导"穿对衣"，平等对话好沟通
- 老板心理：跟什么人聊天最放松？跟自己"差不多"的人，比如朋友、同行、圈子里的人。
- 男生编导：别穿得太"打工仔"，穿得体面些，衬衫、西裤，或者商务休闲装，显得你专业，也能跟老板形成一种"平等对话"的感觉。
- 女生编导：穿着要讲究点，比如套装。全身颜色最好别超过三种，颜色太多会让老板分心。

## 五、无脚本拍摄的核心优势

1. 避开老板"短板"，发挥"长板"——让老板聊他熟悉的东西
2. 内容独一无二，拒绝同质化——老板的故事是独一份的
3. 老板有情绪，内容才"活"——有情绪的内容观众才爱看
4. 几乎没有创作瓶颈——老板的人生就是个"素材库"
5. 培养老板"分享欲"——让老板自己有想表达的欲望

## 六、短视频核心公式

事件 > 情绪 > 文案

### 事件：短视频的"流量发动机"
不是非要惊天动地的大事，生活里"带冲突、有画面、能让人好奇"的小事都是事件。
- 家里"老三打老大，老大明明打得过却认怂"——这就是事件（有角色、有矛盾、有心理活动）
- 餐饮店遇到差评、服务员摔了盘子、客人吵架——这些"屁大点事"都是事件

### 情绪：事件的"放大器"
- 事件本身会自带情绪，别对着提词器念稿子！
- 音乐比文字更"懂情绪"：BGM一起你就知道是开心还是伤感

## 七、短视频变现逻辑：围绕客户难题做文章

### 挖掘客户难题的三种类型：
1. 还没发生但担心会发生的：比如"还没装修呢，就担心会不会踩坑"
2. 正在发生的：比如"正在装修，发现工人偷工减料怎么办"
3. 想变得更好的：比如"装修完了，想再提升一下档次"

### 针对不同难题的解决方案：
1. 危害/美好法：还没发生的事，展示踩坑的危害或做好的美好
2. 详细方案法：正在发生的事，给出具体的解决方案
3. 成功案例法：想变更好的事，讲成功案例，让他看到可能性

## 八、观点视频拍摄方法

观点类型视频是内容创作中激发粉丝共鸣、增强账号粘性的重要形式。

### 拍摄框架：
1. 观点选择：符合 IP 定位与认同，必须与 IP 的人设、背景高度匹配
2. 引导 IP 表达看法：通过提问引导 IP 阐述对该观点的理解与立场
3. 添加 IP 真实案例：观点类视频需搭配 IP 亲身经历的案例，案例需具体、真实

### 观点视频的核心作用：
激发粉丝共情能力，筛选与 IP 观点一致的受众，从而提升粉丝粘性与信任度。`;

// 知识库表名
const KNOWLEDGE_TABLE = 'scriptless_shooting';

// 缓存标记，避免重复导入
let knowledgeInitialized = false;

// 初始化知识库
async function initKnowledge(config: Config, customHeaders: Record<string, string>) {
  if (knowledgeInitialized) return;
  
  try {
    const knowledgeClient = new KnowledgeClient(config, customHeaders);
    
    // 先搜索看是否已有内容
    const searchResult = await knowledgeClient.search(
      '编导实战十大核心技巧',
      [KNOWLEDGE_TABLE],
      1,
      0.5
    );
    
    if (searchResult.code === 0 && searchResult.chunks.length > 0) {
      knowledgeInitialized = true;
      return;
    }
    
    // 没有内容则导入
    const documents: KnowledgeDocument[] = [
      {
        source: DataSourceType.TEXT,
        raw_data: SCRIPTLESS_KNOWLEDGE,
      }
    ];
    
    const chunkConfig: ChunkConfig = {
      separator: '\n\n',
      max_tokens: 1000,
      remove_extra_spaces: true,
    };
    
    await knowledgeClient.addDocuments(documents, KNOWLEDGE_TABLE, chunkConfig);
    knowledgeInitialized = true;
  } catch {
    // 忽略初始化错误
  }
}

// 定义返回结果类型
interface ScriptlessResult {
  positioning: string;
  scriptStructure: string;
  qaSession: Array<{ question: string; answer: string }>;
  visualSuggestions: string[];
  opening: string;
  endingSpeech: string;
  goldenQuote: string;
}

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  try {
    const { customerId, instruction } = await request.json();
    
    if (!instruction || typeof instruction !== 'string') {
      return NextResponse.json({ error: '请提供拍摄指令' }, { status: 400 });
    }

    const customHeaders = safeForwardHeaders(request.headers);
    // 增加超时时间到 120 秒
    const config = new Config({ timeout: 120000 });
    
    // 初始化知识库（如果需要）
    await initKnowledge(config, customHeaders);
    
    // 1. 搜索知识库获取相关内容
    const knowledgeClient = new KnowledgeClient(config, customHeaders);
    const searchResponse = await knowledgeClient.search(
      instruction,
      [KNOWLEDGE_TABLE],
      5,
      0.3
    );
    
    // 如果知识库搜索为空，使用内置文档内容
    let knowledgeContext = '';
    if (searchResponse.code === 0 && searchResponse.chunks.length > 0) {
      knowledgeContext = searchResponse.chunks
        .map(chunk => chunk.content)
        .join('\n\n');
    } else {
      // 使用内置文档内容作为备选
      knowledgeContext = SCRIPTLESS_KNOWLEDGE;
    }
    
    // 2. 如果有客户ID，获取客户信息
    let customerInfo = '';
    if (customerId) {
      try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        const customerResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/customer/${customerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const customerData = await customerResponse.json();
        if (customerData.data) {
          customerInfo = `客户名称: ${customerData.data.name}\n`;
          if (customerData.data.ipPositioning) {
            try {
              const positioning = JSON.parse(customerData.data.ipPositioning);
              customerInfo += `IP定位信息: ${JSON.stringify(positioning, null, 2)}`;
            } catch {
              // 忽略解析错误
            }
          }
        }
      } catch {
        // 忽略获取客户信息错误
      }
    }
    
    // 3. 构建 prompt 并调用 LLM
    const llmClient = new LLMClient(config, customHeaders);
    
    const systemPrompt = `你是一位专业的短视频编导，擅长无脚本拍摄。你需要根据用户的拍摄需求和知识库中的技巧，生成完整的拍摄方案。

## 知识库参考（核心技巧文档）
${knowledgeContext}

${customerInfo ? `## 客户信息\n${customerInfo}` : ''}

## 输出要求
请根据用户的拍摄指令，运用上述无脚本拍摄技巧，生成以下内容：

1. **视频定位**：明确这条视频的目标受众、核心价值、传播目的
2. **视频开头**：设计一个吸引眼球的开头文案，能快速抓住观众注意力（参考"编导要有情绪感染力"技巧，用情绪化的语言、惊叹句或具象化的场景描述）
3. **脚本结构**：规划视频的整体结构（开头-主体-结尾），用简洁的语言描述每个部分的核心内容
4. **提问回答环节**：设计编导提问和IP回答的内容（至少3组问答）
   - 问题要具象化，参考"引导类问题"和"激发类问题"技巧
   - 问题要"带点刺"，激发IP的真性情表达
   - 回答要自然、有情绪、有画面感
5. **画面建议**：提供具体的拍摄画面、镜头、角度等建议（至少3条）
6. **结尾口播**：设计视频结尾的口播内容，要自然引导观众行动（点赞、关注、到店等）
7. **金句落点**：提炼一句能被观众记住的金句，用于视频收尾或字幕，要有记忆点、传播力

## 输出格式要求
请严格按照以下 JSON 格式输出，不要输出任何其他内容：
{
  "positioning": "视频定位内容",
  "opening": "视频开头文案（带情绪、有感染力）",
  "scriptStructure": "脚本结构内容",
  "qaSession": [
    {"question": "编导提问1", "answer": "IP回答1"},
    {"question": "编导提问2", "answer": "IP回答2"},
    {"question": "编导提问3", "answer": "IP回答3"}
  ],
  "visualSuggestions": [
    "画面建议1",
    "画面建议2",
    "画面建议3"
  ],
  "endingSpeech": "结尾口播内容",
  "goldenQuote": "金句落点"
}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `拍摄指令：${instruction}` }
    ];
    
    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          
          const llmStream = llmClient.stream(messages, {
            model: 'deepseek-v3-2-251201',
            temperature: 0.8,
          });
          
          for await (const chunk of llmStream) {
            if (chunk.content) {
              fullContent += chunk.content.toString();
            }
          }
          
          // 尝试解析 JSON
          let result: ScriptlessResult;
          try {
            // 提取 JSON 内容（处理可能的前后缀）
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('未找到有效的 JSON 内容');
            }
          } catch (parseError) {
            // 如果解析失败，构造默认结果
            result = {
              positioning: '生成失败，请重试',
              opening: '',
              scriptStructure: '',
              qaSession: [],
              visualSuggestions: [],
              endingSpeech: '',
              goldenQuote: '',
            };
          }
          
          // 发送最终结果
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'result', result })}\n\n`)
          );
          
          controller.close();
        } catch (error) {
          console.error('API operation event');
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: '生成失败' })}\n\n`)
          );
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
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
