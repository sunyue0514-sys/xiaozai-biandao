/**
 * 千川编导知识体系 - 方法论提示词模块
 * 基于专业短视频带货编导方法论，提升素材生成质量
 */

// ==================== 类型定义 ====================

/**
 * 卖点类型
 */
export type SellingPointType = 'functional' | 'emotional' | 'social';

/**
 * 痛点类型
 */
export type PainPointType = 'functional' | 'emotional' | 'social';

/**
 * 痛点强度
 */
export type PainPointIntensity = 'low' | 'medium' | 'high';

/**
 * 购买阻力类型
 */
export type PurchaseBarrierType = 'price' | 'trust' | 'decision' | 'habit';

/**
 * 结构化卖点
 */
export interface StructuredSellingPoint {
  type: SellingPointType;
  content: string;
  userBenefit?: string;        // 用户感知的利益
  perceptionPath?: string;     // 用户感知路径
}

/**
 * 用户画像详情
 */
export interface UserPortraitDetail {
  description: string;          // 描述（兼容原有字段）
  ageRange?: string;            // 年龄段
  gender?: string;              // 性别
  occupation?: string;          // 职业
  consumptionLevel?: string;    // 消费能力
  interests?: string[];         // 兴趣标签
  behaviorPattern?: string;     // 行为模式
}

/**
 * 价值阶梯
 */
export interface ValueLadder {
  basic: string;                // 基础价值：产品本身解决的问题
  advanced: string;             // 进阶价值：带来的额外收益
  top: string;                  // 顶层价值：情感/身份认同
}

/**
 * 痛点详情
 */
export interface PainPointDetail {
  type: PainPointType;
  intensity: PainPointIntensity;
  description: string;
  triggerScenarios?: string[];  // 触发场景
  currentSolutions?: string[];  // 现有解决方案及不足
}

/**
 * 购买阻力
 */
export interface PurchaseBarrier {
  type: PurchaseBarrierType;
  description: string;
  counterStrategy?: string;     // 应对策略
}

/**
 * 信任背书
 */
export interface TrustProofs {
  sales?: string;               // 销量
  ratings?: string;             // 评价
  certifications?: string[];    // 资质认证
  cases?: string;               // 典型案例
  endorsements?: string;        // 明星/KOL背书
}

/**
 * 使用场景分类
 */
export interface UsageScenarioDetail {
  daily?: string[];             // 日常场景
  special?: string[];           // 特殊场景
  social?: string[];            // 社交场景
}

/**
 * 扩展产品信息 - 向后兼容原有 ProductInfo
 */
export interface EnhancedProductInfo {
  // ===== 原有字段（保持不变）=====
  productName: string;
  productCategory: string;
  price: string;
  sellingPoints: string[];
  targetUsers: string;
  userPainPoints: string;
  usageScenario: string;
  promotion?: string;
  limitedOffer?: boolean;
  ctaType?: string;
  aiPositioning?: string;

  // ===== 扩展字段（全部可选，向后兼容）=====
  // 结构化卖点
  structuredSellingPoints?: StructuredSellingPoint[];

  // 用户画像详情
  userPortrait?: UserPortraitDetail;

  // 价值阶梯
  valueLadder?: ValueLadder;

  // 痛点详情
  painPointDetails?: PainPointDetail[];

  // 购买阻力
  purchaseBarriers?: PurchaseBarrier[];

  // 信任背书
  trustProofs?: TrustProofs;

  // 使用场景分类
  usageScenarioDetail?: UsageScenarioDetail;
}

// ==================== 分析工具配置 ====================

/**
 * 智能分析工具配置
 */
export const ANALYSIS_TOOLS = [
  {
    id: 'selling_point',
    name: '卖点深度拆解',
    icon: 'Lightbulb',
    description: '分析产品核心卖点的用户感知路径',
    prompt: `基于产品信息，深度拆解产品卖点：

【分析维度】
1. 按马斯洛需求层级分类卖点：
   - 生理需求：满足基本生活需要
   - 安全需求：健康、安全、保障
   - 社交需求：人际关系、归属感
   - 尊重需求：自我价值、社会认可
   - 自我实现：个人成长、理想追求

2. 分析每个卖点的用户感知路径：
   - 视觉感知：用户看到什么
   - 触觉感知：用户感受到什么
   - 情感感知：用户心理变化
   - 行为感知：用户会做什么

3. 提炼卖点的表达方式建议：
   - 场景型表达：在XX场景下，产品如何发挥作用
   - 对比型表达：与其他产品/方案对比突出优势
   - 数据型表达：用具体数字证明效果
   - 故事型表达：通过故事传递卖点价值

【输出格式】
## 卖点拆解结果

### 核心卖点1：[卖点内容]
- 马斯洛映射：[对应的需求层级]
- 目标人群：[这个卖点最吸引的目标用户群体]
- 用户痛点：[这个卖点解决的用户痛点]
- 使用场景：[这个卖点的典型使用场景]
- 用户感知路径：[视觉→触觉→情感→行为]
- 推荐表达方式：[场景型/对比型/数据型/故事型]

### 核心卖点2：...
`,
  },
  {
    id: 'user_portrait',
    name: '用户画像构建',
    icon: 'Users',
    description: '生成目标用户的典型一日行为轨迹',
    prompt: `基于产品信息，构建目标用户画像：

【分析维度】
1. 基础画像：
   - 年龄段、性别、职业
   - 消费能力、消费习惯
   - 兴趣爱好、生活方式

2. 典型一日行为轨迹：
   - 早晨：起床、通勤、工作前
   - 白天：工作状态、碎片时间
   - 晚上：下班后、家庭时间、睡前

3. 认知-情感-行为三维地图：
   - 认知层：用户如何看待这类产品
   - 情感层：用户的情绪状态和诉求
   - 行为层：用户的购买和使用习惯

4. 触达场景分析：
   - 用户在什么场景下会接触到这类产品
   - 什么内容会引起用户的兴趣
   - 什么因素会影响用户的决策

【输出格式】
## 用户画像结果

### 基础画像
- 年龄段：[...]
- 性别：[...]
- 职业：[...]
- 消费能力：[...]
- 兴趣标签：[...]

### 典型一日行为轨迹
- 早晨（6:00-9:00）：[...]
- 白天（9:00-18:00）：[...]
- 晚上（18:00-24:00）：[...]

### 认知-情感-行为三维地图
- 认知层：[...]
- 情感层：[...]
- 行为层：[...]

### 触达场景建议
[...]
`,
  },
  {
    id: 'value_ladder',
    name: '价值阶梯搭建',
    icon: 'TrendingUp',
    description: '构建产品的基础-进阶-顶层价值',
    prompt: `基于产品信息，构建产品价值阶梯：

【分析维度】
1. 基础价值（功能层）：
   - 产品最基本的功能价值
   - 解决用户什么具体问题
   - 用户为什么需要这个产品

2. 进阶价值（体验层）：
   - 使用产品带来的额外收益
   - 相比其他方案的独特优势
   - 用户能获得什么惊喜体验

3. 顶层价值（情感层）：
   - 产品如何满足用户的情感需求
   - 产品如何体现用户的身份认同
   - 产品如何帮助用户实现自我价值

【输出格式】
## 价值阶梯结果

### 基础价值（功能层）
[描述产品最基本的价值，解决什么问题]

### 进阶价值（体验层）
[描述使用产品带来的额外收益和惊喜体验]

### 顶层价值（情感层）
[描述产品满足的情感需求和身份认同]

### 价值表达建议
- 开场话术：[如何用价值吸引注意]
- 展开话术：[如何层层递进传递价值]
- 收尾话术：[如何强化价值认知促转化]
`,
  },
  {
    id: 'pain_point',
    name: '痛点深度挖掘',
    icon: 'AlertCircle',
    description: '挖掘用户未被满足的需求',
    prompt: `基于产品信息，深度挖掘用户痛点：

【分析维度】
1. 痛点类型分类：
   - 功能型痛点：产品功能不满足需求
   - 情感型痛点：心理上的焦虑、不安、不满
   - 社交型痛点：社会关系、身份认同相关

2. 痛点强度评估：
   - 高强度：严重影响生活质量，急需解决
   - 中强度：有一定困扰，有解决意愿
   - 低强度：轻微不便，可有可无

3. 痛点触发场景：
   - 在什么情况下会触发这个痛点
   - 痛点出现的频率和时机

4. 现有解决方案分析：
   - 用户目前如何应对这个痛点
   - 现有方案的不足之处

【输出格式】
## 痛点挖掘结果

### 高强度痛点
1. [痛点描述]
   - 类型：[功能型/情感型/社交型]
   - 触发场景：[...]
   - 现有方案不足：[...]

### 中强度痛点
1. [痛点描述]
   - 类型：[...]
   - 触发场景：[...]
   - 现有方案不足：[...]

### 低强度痛点
1. [痛点描述]
   - 类型：[...]
   - 触发场景：[...]

### 痛点话术建议
- 痛点唤起话术：[如何让用户意识到痛点]
- 痛点放大话术：[如何强化痛点感知]
- 解决方案引入：[如何自然引入产品]
`,
  },
] as const;

// ==================== 方法论提示词 ====================

/**
 * 产品分析方法论提示词
 */
export const PRODUCT_ANALYSIS_METHODOLOGY = `
【千川编导方法论 - 产品分析】

一、卖点拆解法则
1. 功能卖点 → 具体效果描述
   例：不是"续航长"，而是"充一次电用一周"

2. 情感卖点 → 生活场景绑定
   例：不是"好用"，而是"让老婆夸你会买"

3. 社交卖点 → 身份认同绑定
   例：不是"高端"，而是"同事都问你在哪买的"

二、用户感知路径
视觉感知（看到什么）→ 触觉感知（感受到什么）→ 情感感知（心理变化）→ 行为感知（会做什么）

三、马斯洛需求映射
- 生理需求：吃、穿、住、行相关
- 安全需求：健康、安全、保障相关
- 社交需求：人际关系、归属感相关
- 尊重需求：自我价值、社会认可相关
- 自我实现：个人成长、理想追求相关
`;

/**
 * 内容策划方法论提示词
 */
export const CONTENT_PLANNING_METHODOLOGY = `
【千川编导方法论 - 内容策划】

一、黄金3秒法则
- 痛点钩子：直接击中用户痛点
- 悬念钩子：制造好奇，引发期待
- 反差钩子：出人意料，形成冲击
- 利益钩子：直接展示用户能得到什么

二、情绪曲线设计
开场（焦虑/好奇）→ 中间（共鸣/认同）→ 转折（释然/惊喜）→ 结尾（满足/行动）

三、促单时机选择
- 价值感知最强时
- 情绪认同最高时
- 痛点解决最清晰时
`;

/**
 * 脚本结构方法论
 */
export const SCRIPT_STRUCTURE_METHODOLOGY = `
【千川编导方法论 - 脚本结构】

一、场景公式化脚本结构
【0-3秒】痛点场景开场，引发共鸣
【3-15秒】痛点放大，描述困扰细节
【15-30秒】产品作为解决方案自然出现
【30-45秒】效果展示，前后对比
【45-60秒】促单转化，限时优惠

二、功效可视化脚本结构
【0-3秒】效果悬念开场，激发好奇
【3-20秒】使用过程详细展示
【20-35秒】数据证明，前后对比
【35-50秒】用户反馈，信任背书
【50-60秒】促单转化

三、价格锚定脚本结构
【0-5秒】高价锚点建立
【5-20秒】价值拆解分析
【20-35秒】价格反转，揭示实际价格
【35-50秒】赠品叠加，增加价值感
【50-60秒】紧迫感营造，促单转化

四、情感共鸣脚本结构
【0-5秒】情感故事开场
【5-25秒】情感困境描述
【25-40秒】产品出现，改变故事走向
【40-55秒】情感升华，关系改善
【55-60秒】金句收尾，软性促单

五、反差结构脚本结构
【0-3秒】出人意料的开场
【3-15秒】反差制造，呈现强烈对比
【15-35秒】卖点植入，在反差中带出产品
【35-50秒】真相揭秘，解释反差原因
【50-60秒】行动引导，趁热打铁
`;

// ==================== 辅助函数 ====================

/**
 * 构建增强版系统提示词
 * 将千川方法论融入提示词
 */
export function buildEnhancedSystemPrompt(
  basePrompt: string,
  productInfo: EnhancedProductInfo,
  creativeMode?: string
): string {
  let enhancedPrompt = basePrompt;

  // 如果有结构化卖点，添加详细分析
  if (productInfo.structuredSellingPoints?.length) {
    const sellingPointAnalysis = productInfo.structuredSellingPoints
      .map((sp) => {
        const typeLabel = {
          functional: '功能卖点',
          emotional: '情感卖点',
          social: '社交卖点',
        }[sp.type];
        return `- 【${typeLabel}】${sp.content}${sp.userBenefit ? ` → 用户利益：${sp.userBenefit}` : ''}`;
      })
      .join('\n');
    enhancedPrompt += `\n\n【结构化卖点分析】\n${sellingPointAnalysis}`;
  }

  // 如果有价值阶梯，添加到提示词
  if (productInfo.valueLadder) {
    enhancedPrompt += `\n\n【价值阶梯】
- 基础价值：${productInfo.valueLadder.basic}
- 进阶价值：${productInfo.valueLadder.advanced}
- 顶层价值：${productInfo.valueLadder.top}`;
  }

  // 如果有痛点详情，添加到提示词
  if (productInfo.painPointDetails?.length) {
    const painPointAnalysis = productInfo.painPointDetails
      .map((pp) => {
        const typeLabel = {
          functional: '功能型',
          emotional: '情感型',
          social: '社交型',
        }[pp.type];
        const intensityLabel = {
          low: '低强度',
          medium: '中强度',
          high: '高强度',
        }[pp.intensity];
        return `- 【${typeLabel}·${intensityLabel}】${pp.description}${pp.triggerScenarios ? ` | 触发场景：${pp.triggerScenarios.join('、')}` : ''}`;
      })
      .join('\n');
    enhancedPrompt += `\n\n【痛点详情】\n${painPointAnalysis}`;
  }

  // 如果有购买阻力，添加应对策略
  if (productInfo.purchaseBarriers?.length) {
    const barrierAnalysis = productInfo.purchaseBarriers
      .map((pb) => {
        const typeLabel = {
          price: '价格敏感',
          trust: '信任缺失',
          decision: '决策犹豫',
          habit: '习惯阻力',
        }[pb.type];
        return `- 【${typeLabel}】${pb.description}${pb.counterStrategy ? ` | 应对：${pb.counterStrategy}` : ''}`;
      })
      .join('\n');
    enhancedPrompt += `\n\n【购买阻力分析】\n${barrierAnalysis}`;
  }

  // 如果有信任背书，添加到提示词
  if (productInfo.trustProofs) {
    const proofs: string[] = [];
    if (productInfo.trustProofs.sales) proofs.push(`销量：${productInfo.trustProofs.sales}`);
    if (productInfo.trustProofs.ratings) proofs.push(`评价：${productInfo.trustProofs.ratings}`);
    if (productInfo.trustProofs.certifications?.length) proofs.push(`资质：${productInfo.trustProofs.certifications.join('、')}`);
    if (productInfo.trustProofs.cases) proofs.push(`案例：${productInfo.trustProofs.cases}`);
    if (productInfo.trustProofs.endorsements) proofs.push(`背书：${productInfo.trustProofs.endorsements}`);
    
    if (proofs.length > 0) {
      enhancedPrompt += `\n\n【信任背书】\n${proofs.join('\n')}`;
    }
  }

  return enhancedPrompt;
}

/**
 * 构建智能分析API的提示词
 */
export function buildAnalysisPrompt(
  analysisType: 'selling_point' | 'user_portrait' | 'value_ladder' | 'pain_point',
  productInfo: EnhancedProductInfo
): string {
  const tool = ANALYSIS_TOOLS.find((t) => t.id === analysisType);
  if (!tool) return '';

  return `${tool.prompt}

【产品信息】
- 产品名称：${productInfo.productName}
- 产品类目：${productInfo.productCategory}
- 价格信息：${productInfo.price || '未填写'}
- 核心卖点：${productInfo.sellingPoints.join('、')}
- 目标用户：${productInfo.targetUsers || '未填写'}
- 用户痛点：${productInfo.userPainPoints || '未填写'}
- 使用场景：${productInfo.usageScenario || '未填写'}
${productInfo.promotion ? `- 优惠活动：${productInfo.promotion}` : ''}

请严格按照输出格式进行分析，确保结果可直接应用到素材创作中。`;
}
