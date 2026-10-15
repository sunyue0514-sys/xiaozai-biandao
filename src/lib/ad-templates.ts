/**
 * 千川素材 & 信息流广告 - 产品信息与提示词模块
 * 基于真实短视频带货和信息流广告的最佳实践
 */

import { 
  ProductCategory, 
  detectBlackFiveProduct,
  generateCompliancePrompt,
  BlackFiveType 
} from './prohibited-words';
import { 
  generateDiversityInstructions, 
  getRandomTemperature,
  generateRandomSeed,
  generateDiversityReminder 
} from './content-diversity';
import { buildIPConstraints, type IPConstraintOptions } from './prompt-engineering/context/ip-positioning';
import type { IPPositioning } from './system-prompts';
// 导入知识库
import { 
  QIANCHUAN_GOLDEN_5_SECONDS, 
  QIANCHUAN_ORDER_REASONS, 
  QIANCHUAN_SEEDING_TECHNIQUES,
  QIANCHUAN_OPENING_FORMULAS,
  HOOK_CONFIGS,
  PSYCHOLOGICAL_TACTICS,
} from './content-knowledge-base';

// 重新导出ProductCategory供其他模块使用
export type { ProductCategory, BlackFiveType } from './prohibited-words';

/**
 * 产品信息接口
 * 
 * 设计原则：向后兼容
 * - 原有字段保持不变，保证历史记录和旧数据继续可用
 * - 扩展字段全部可选，渐进式增强功能
 */
export interface ProductInfo {
  // ===== 基础信息（原有字段）=====
  productName: string;           // 产品名称
  productCategory: ProductCategory; // 产品类目
  price: string;                 // 价格/优惠
  sellingPoints: string[];       // 核心卖点（3-5个）
  
  // ===== 目标用户（原有字段）=====
  targetUsers: string;           // 目标人群
  userPainPoints: string;        // 用户痛点
  usageScenario: string;         // 使用场景
  
  // ===== 优惠信息（原有字段）=====
  promotion?: string;            // 优惠活动
  limitedOffer?: boolean;        // 是否限时
  ctaType?: CtaType;             // 行动号召类型
  
  // ===== AI分析结果（原有字段）=====
  aiPositioning?: string;        // AI产品定位分析结果

  // ===== 扩展字段（新增，全部可选）=====
  
  // 结构化卖点（按类型分类）
  functionalSellingPoints?: string[];   // 功能卖点
  emotionalSellingPoints?: string[];    // 情感卖点
  socialSellingPoints?: string[];       // 社交卖点
  
  // 用户画像详情
  userAgeRange?: string;         // 年龄段
  userGender?: string;           // 性别
  userOccupation?: string;       // 职业
  userConsumptionLevel?: string; // 消费能力
  userInterests?: string[];      // 兴趣标签
  
  // 价值阶梯
  valueLadderBasic?: string;     // 基础价值
  valueLadderAdvanced?: string;  // 进阶价值
  valueLadderTop?: string;       // 顶层价值
  
  // 痛点详情（JSON字符串，存储 PainPointDetail[]）
  painPointDetailsJson?: string;
  
  // 购买阻力（JSON字符串，存储 PurchaseBarrier[]）
  purchaseBarriersJson?: string;
  
  // 信任背书
  trustProofSales?: string;      // 销量
  trustProofRatings?: string;    // 评价
  trustProofCertifications?: string[]; // 资质认证
  trustProofCases?: string;      // 典型案例
  trustProofEndorsements?: string; // 明星/KOL背书
  
  // 使用场景分类
  usageScenariosDaily?: string[];  // 日常场景
  usageScenariosSpecial?: string[]; // 特殊场景
  usageScenariosSocial?: string[]; // 社交场景
}

/**
 * 行动号召类型
 */
export type CtaType = 'buy' | 'consult' | 'download' | 'register' | 'learn_more';

/**
 * 千川素材类型
 */
export type QianchuanMaterialType = 'product_seeding' | 'review_comparison' | 'story_insertion' | 'talking_head';

/**
 * 千川创作模式 - 五大爆款公式
 */
export type QianchuanCreativeMode = 
  | 'scenario_formula'      // 控制点场景公式化
  | 'effect_visualization'  // 功效可视化
  | 'price_anchoring'       // 价格锚定公式
  | 'emotional_resonance'   // 情感共鸣公式
  | 'contrast_structure';   // 反差结构式公式

/**
 * 千川创作模式配置 - 五大爆款公式详解
 */
export const QIANCHUAN_CREATIVE_MODES: Record<QianchuanCreativeMode, {
  name: string;
  shortName: string;
  description: string;
  technique: string;
  keyPoints: string[];
  strategy: string; // 新增：详细创作策略
  example: string; // 新增：开场示例
}> = {
  scenario_formula: {
    name: '场景公式化',
    shortName: '场景公式',
    description: '将产品解决方案融入用户高频生活场景',
    technique: '将产品解决方案融入用户高频生活场景，通过 "生活场景 + 产品植入 + 效果对比" 的画面呈现，解决用户实际问题，触发需求共鸣。',
    keyPoints: [
      '选择用户日常生活中高频出现的场景',
      '产品作为解决问题的工具自然出现',
      '用效果对比强化产品价值感知',
      '让观众看到"这就是我需要的"',
    ],
    strategy: `【场景公式化创作策略】
1. 开场：直接呈现一个日常生活中的真实痛点场景，让观众有代入感
   - 例如："每天早上起床头发炸毛像鸡窝..."
   - 例如："下班回家累得不想动，厨房乱成一团..."

2. 痛点放大：用细节描述让问题更真实
   - 描述问题的具体表现、带来的困扰
   - 用"每次都..."、"一直困扰我..."等表达

3. 产品自然登场：产品作为解决方案出现，不是硬广
   - "后来朋友推荐了这款..."
   - "直到我发现了这个宝藏..."

4. 效果对比：展示使用前后的明显变化
   - 具体描述变化细节
   - 用时间节点强化效果（"一周后..."）

5. 行动号召：结合场景给出购买引导`,
    example: `"下班回到家累得瘫在沙发上，看着厨房一堆碗盘就头大...每次都想明天再洗，结果越堆越多。直到朋友推荐了这个洗碗机，一键启动，45分钟全搞定，第二天起床碗盘亮得发光！"`,
  },
  effect_visualization: {
    name: '功效可视化',
    shortName: '功效可视',
    description: '把产品效果转化为用户能直观感知的视觉符号',
    technique: '借助实践操作 + 数据佐证的可视化手段，把产品效果转化为用户能直观感知的视觉符号，提升用户对产品的信任感，推动购买行为。',
    keyPoints: [
      '用画面展示产品使用过程',
      '用数据/测量结果证明效果',
      '用前后对比强化视觉冲击',
      '让观众"眼见为实"，建立信任',
    ],
    strategy: `【功效可视化创作策略】
1. 开场：用数据或效果悬念开场，激发好奇
   - 例如："坚持用了28天，体重从128斤到116斤..."
   - 例如："测了一下，皮肤含水量从32%涨到67%..."

2. 过程展示：详细记录使用过程，增加真实感
   - 具体展示怎么用、用了多少
   - 强调"每天坚持"、"严格按照"

3. 数据证明：用具体数字说话
   - 前后对比数据
   - 使用时长和效果
   - 第三方检测报告（如有）

4. 视觉冲击：用画面语言强化效果
   - "大家可以看这个对比图..."
   - "我用尺子量了一下..."

5. 信任背书：增加可信度
   - 用户反馈、真实案例
   - 使用时间线证明`,
    example: `"坚持用了28天，给大家看一下效果。这是第一天的照片，皮肤暗沉毛孔粗大。这是第14天，开始有变化了。这是今天，皮肤状态完全不一样！我用皮肤测试仪测了一下，含水量从32%涨到67%！"`,
  },
  price_anchoring: {
    name: '价格锚定',
    shortName: '价格锚定',
    description: '用明显的价格对比降低消费者对产品价格的顾虑',
    technique: '通过原价对比 + 价值拆解 + 赠品增值的方式做价格铺垫，用明显的价格对比降低消费者对产品价格的顾虑，减少决策阻力。',
    keyPoints: [
      '先展示原价/市场价建立价格锚点',
      '拆解产品价值，凸显性价比',
      '用赠品/福利增加价值感',
      '让观众觉得"买到就是赚到"',
    ],
    strategy: `【价格锚定创作策略】
1. 开场：先抛出高价锚点，建立价格预期
   - 例如："这种配置的扫地机，市面上怎么也得4000起步..."
   - 例如："之前看中的同款要2000多，一直舍不得买..."

2. 价值拆解：详细分析产品值在哪里
   - 核心配置有哪些
   - 品牌溢价在哪
   - 对比竞品的优势

3. 价格反转：揭示实际价格，形成反差
   - "结果我发现了这款，才xxx元..."
   - "今天直播间到手价只要xxx..."

4. 赠品叠加：增加额外价值感
   - "还送xxx"
   - "今天下单再送xxx"

5. 紧迫感：限时限量促进行动`,
    example: `"这款扫地机，我看了一圈，石头、科沃斯同配置都要4000往上，我之前一直想买没舍得下手。结果发现这款，功能配置一模一样，激光导航、自动集尘、自动洗拖布全都有，今天活动价才1999！还送两年质保加耗材大礼包！"`,
  },
  emotional_resonance: {
    name: '情感共鸣',
    shortName: '情感共鸣',
    description: '将产品塑造成情感表达的媒介，引发用户情感认同',
    technique: '以人物故事为载体，结合情感冲突 + 产品治愈的创作思路，将产品塑造成情感表达的媒介，引发用户情感层面的认同。',
    keyPoints: [
      '用真实感的人物故事引发共情',
      '制造情感冲突或困境',
      '产品作为"治愈"或"解决方案"出现',
      '让观众在情感层面认同产品价值',
    ],
    strategy: `【情感共鸣创作策略】
1. 开场：用情感故事或困境开场，引发共情
   - 例如："结婚5年，老公越来越不爱说话了..."
   - 例如："自从当了妈，就再也没睡过一个整觉..."

2. 情感困境：深入描述问题带来的情感困扰
   - 具体细节增加真实感
   - 情感词汇引起共鸣
   - "每次想到这些就..."、"真的很难受..."

3. 转折点：产品的出现改变了故事走向
   - 不是生硬的广告植入
   - 而是故事的自然发展
   - "后来..."、"有一次..."

4. 情感升华：产品带来的情感改变
   - 关系的改善
   - 心态的变化
   - 生活质量的提升

5. 金句收尾：用情感金句强化记忆点`,
    example: `"结婚5年，我和老公的话越来越少，他回来就是玩手机，我做饭他吃，吃完继续玩，感觉自己像个保姆。直到有天我实在受不了了，买了这个投影仪，每天晚上拉着他一起看电影，聊剧情，关系才慢慢缓和。原来不是没话说，是缺少共同话题。"`,
  },
  contrast_structure: {
    name: '反差结构',
    shortName: '反差结构',
    description: '用强视觉反差让素材形成记忆点',
    technique: '采用 "幸运开头 + 强卖点" 的脚本设计，搭配强视觉反差的表达形式，让素材形成记忆点，让用户快速记住产品和内容。',
    keyPoints: [
      '开头用出人意料的内容抓住眼球',
      '用视觉反差（如贫富、美丑、快慢）制造冲击',
      '在反差中植入产品卖点',
      '让观众记住"原来可以这样"',
    ],
    strategy: `【反差结构创作策略】
1. 开场：用出人意料的内容或反转开场
   - 例如："同事都以为我月薪3万，其实..."
   - 例如："花500块和花5万块装修的差别..."

2. 反差制造：呈现强烈的对比效果
   - 之前vs之后
   - 低价vs高价
   - 普通vs惊艳
   - 平民vs富人

3. 卖点植入：在反差中自然带出产品
   - 产品是造成反差的原因
   - 或产品实现了低成本高效果

4. 真相揭秘：解释反差背后的原因
   - "秘密就在..."
   - "关键是因为..."

5. 行动引导：趁热打铁促进行动`,
    example: `"同事都以为我这身行头至少好几千，其实外套89、裤子69、鞋子99，整套加起来不到300！不是衣服贵，是选款有门道。我研究了300多个穿搭博主，总结出这套平价穿搭公式，学会你也能花小钱穿大牌感！"`,
  },
};

/**
 * 信息流广告类型
 */
export type FeedAdType = 'brand_awareness' | 'lead_generation' | 'app_download';

/**
 * 投放平台
 */
export type AdPlatform = 'douyin' | 'toutiao' | 'kuaishou' | 'baidu' | 'tencent';

/**
 * 千川素材模板 - 基于真实带货视频结构
 */
export const QIANCHUAN_TEMPLATES: Record<QianchuanMaterialType, {
  name: string;
  description: string;
  structure: string;
}> = {
  product_seeding: {
    name: '产品种草',
    description: '直接展示产品卖点，引导购买',
    structure: `【黄金3秒】痛点钩子，引发共鸣
【产品展示】真实使用场景，卖点视觉化
【效果证明】前后对比/用户反馈
【促单转化】限时优惠+强CTA`,
  },
  review_comparison: {
    name: '测评对比',
    description: '通过对比突出产品优势',
    structure: `【悬念开场】抛出对比结论或悬念
【竞品展示】真实可信的对比
【核心对比】功能/效果/价格/体验
【结论引导】给出选择建议+购买引导`,
  },
  story_insertion: {
    name: '剧情植入',
    description: '通过故事场景自然植入产品',
    structure: `【场景铺垫】设定生活场景，制造冲突
【产品出现】产品作为解决方案出现
【使用过程】展示使用过程和效果
【结局升华】问题解决，软性植入购买引导`,
  },
  talking_head: {
    name: '口播讲解',
    description: '专业讲解，建立信任',
    structure: `【黄金3秒】痛点钩子或利益点
【问题分析】深入分析用户问题
【解决方案】产品如何解决问题
【行动号召】限时优惠+引导下单`,
  },
};

/**
 * 信息流广告模板 - 基于真实信息流广告结构
 */
export const FEED_AD_TEMPLATES: Record<FeedAdType, {
  name: string;
  description: string;
  structure: string;
  platforms: AdPlatform[];
}> = {
  brand_awareness: {
    name: '品牌曝光',
    description: '提升品牌知名度，建立品牌认知',
    platforms: ['douyin', 'toutiao', 'baidu', 'tencent'],
    structure: `【吸睛标题】引发兴趣，建立记忆点
【品牌故事】品牌理念/价值观/差异化
【信任背书】数据支撑/权威认证/用户评价
【品牌记忆】品牌口号/Slogan`,
  },
  lead_generation: {
    name: '线索收集',
    description: '获取潜在客户信息，适用于教育、金融等行业',
    platforms: ['douyin', 'toutiao', 'baidu', 'tencent'],
    structure: `【痛点刺激】击中用户痛点，引发共鸣
【解决方案】展示服务/产品能力，专业度
【信任建立】案例数量/口碑评价/资质认证
【行动引导】免费咨询/领取资料，降低门槛`,
  },
  app_download: {
    name: '应用下载',
    description: '推广APP下载安装',
    platforms: ['douyin', 'toutiao', 'tencent'],
    structure: `【场景切入】用户使用场景/痛点或兴趣点
【功能展示】核心功能演示/使用效果
【利益诱惑】新用户福利/限时优惠
【下载引导】点击下载按钮，一键安装`,
  },
};

/**
 * 产品类目配置
 */
export const PRODUCT_CATEGORIES: Record<ProductCategory, {
  name: string;
  description: string;
}> = {
  cosmetic: { name: '美妆护肤', description: '化妆品、护肤品、美容仪器等' },
  food: { name: '食品保健', description: '食品、保健品、营养品等' },
  finance: { name: '金融理财', description: '理财产品、保险、贷款等' },
  education: { name: '教育培训', description: '课程、培训、教育服务等' },
  health: { name: '医疗健康', description: '医疗器械、健康服务等' },
  other: { name: '其他', description: '其他类目产品' },
};

/**
 * 构建千川素材系统提示词 - 生成真正的短视频脚本格式
 * 整合黄金5秒、下单理由、种草感技巧
 * 
 * @param materialType 素材类型
 * @param productInfo 产品信息
 * @param contentType 内容类型（文案/脚本）
 * @param wordCount 字数要求
 * @param creativeMode 创作模式（五大爆款公式）
 * @param ipPositioning IP定位信息（可选，用于强化风格约束）
 * @param customerName 客户名称（可选）
 */
export function buildQianchuanSystemPrompt(
  materialType: QianchuanMaterialType,
  productInfo: ProductInfo,
  contentType: 'copywriting' | 'script' = 'copywriting',
  wordCount?: number,
  creativeMode?: QianchuanCreativeMode,
  ipPositioning?: IPPositioning | null,
  customerName?: string
): string {
  // 防御性代码：确保 template 有默认值
  const template = QIANCHUAN_TEMPLATES[materialType] || QIANCHUAN_TEMPLATES.product_seeding;
  // 防御性代码：确保 productCategory 有默认值
  const category = PRODUCT_CATEGORIES[productInfo.productCategory] || PRODUCT_CATEGORIES.other;
  const targetWordCount = wordCount || 500;
  
  // 获取创作模式配置
  const creativeModeConfig = creativeMode ? QIANCHUAN_CREATIVE_MODES[creativeMode] : null;
  
  // 生成差异化指令
  const diversityInstructions = generateDiversityInstructions();
  const randomSeed = generateRandomSeed();
  
  // 🆕 IP定位约束（flexible模式：作为风格参考）
  const ipConstraints = buildIPConstraints(ipPositioning, customerName, {
    mode: 'flexible',
    emphasis: ['identity', 'tone'],
    includeGuidance: false
  });
  
  // 🔴 黑五类产品检测与合规约束
  const blackFiveDetection = detectBlackFiveProduct(
    productInfo.productName,
    productInfo.sellingPoints,
    productInfo.productCategory
  );
  const compliancePrompt = generateCompliancePrompt(blackFiveDetection.types);
  
  // 🔥 黄金5秒法则 - 来自知识库
  const golden5SecondsPrompt = `
【🔥 黄金5秒法则】

${QIANCHUAN_GOLDEN_5_SECONDS.principles.map(p => `【${p.type}】
公式：${p.formula}
示例：${p.examples.join('、')}`).join('\n\n')}

`;

  // 💰 下单理由公式 - 来自知识库
  const orderReasonsPrompt = `
【💰 下单理由公式】

${QIANCHUAN_ORDER_REASONS.reasons.map(r => `【${r.type}】
公式：${r.formula}
示例：${r.example}`).join('\n\n')}

`;

  // 🌿 种草感技巧 - 来自知识库
  const seedingTechniquesPrompt = `
【🌿 增强种草感技巧】

${QIANCHUAN_SEEDING_TECHNIQUES.techniques.map(t => `【${t.type}】
❌ 错误：${t.wrong}
✅ 正确：${t.right}`).join('\n\n')}

`;

  // 📝 开头文案公式 - 来自知识库
  const openingFormulasPrompt = `
【📝 千川开头文案公式】

${QIANCHUAN_OPENING_FORMULAS.map(f => `【${f.type}】
公式：${f.formula}
示例：${f.example}`).join('\n\n')}

`;

  // 💡 四大心理战术 - 来自知识库
  const psychologicalTacticsPrompt = `
【💡 四大心理战术】

${Object.entries(PSYCHOLOGICAL_TACTICS).map(([key, value]) => `【${value.name}】（强度：${value.intensity}）
公式：${value.formula}
适用：${value.suitableScenarios.join('、')}`).join('\n\n')}

`;
  
  // 构建创作模式指导提示词 - 大幅增强
  const creativeModePrompt = creativeModeConfig ? `
═══════════════════════════════════════════════════════════════
【核心创作模式：${creativeModeConfig.name}】⚠️ 必须严格按照此模式创作
═══════════════════════════════════════════════════════════════

${creativeModeConfig.technique}

【创作策略】
${creativeModeConfig.strategy}

【开场示例 - 参考这种风格】
${creativeModeConfig.example}

【核心要点】
${creativeModeConfig.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

⚠️ 重要：你的文案/脚本必须体现【${creativeModeConfig.name}】的特点：
- 开场方式要符合该模式的特征
- 内容结构要遵循该模式的策略
- 结尾要自然引出产品，符合该模式的逻辑

═══════════════════════════════════════════════════════════════
` : '';

  if (contentType === 'script') {
    // 千川短视频脚本格式 - 必须包含画面、台词、字幕
    return `你是一位专业的抖音带货短视频脚本编导，擅长创作高转化率的千川带货视频脚本。

${golden5SecondsPrompt}
${orderReasonsPrompt}
${seedingTechniquesPrompt}
${psychologicalTacticsPrompt}

【⚠️ 创作约束 - 必须严格遵守】

### 语言风格约束
❌ 禁止使用书面化、作文式表达：
- 不要用长句，每句控制在10-20字
- 不要讲道理，要像跟朋友聊天
- 不要用"的反直觉真相"、"蒙蔽了判断"这种词

✅ 必须使用大白话、接地气的表达：
- 说人话，像跟朋友唠嗑
- 短句为主，念出来顺口
- 有情绪、有态度、有脾气

对比示例：
❌ 这款产品采用了先进的科技...
✅ 这玩意儿，用一个字形容：绝！

### 细节画面约束
❌ 泛泛而谈：
- "效果很好" → 没感觉
- "价格便宜" → 没痛感

✅ 具体数字 + 画面感 + 痛感：
- "原本399，今天99带回家" → 具体数字扎心
- "大夏天停电，这风扇能救你的命" → 有画面感

${creativeModePrompt}
${compliancePrompt}
${diversityInstructions}

【本次创作标识】${randomSeed}

【产品信息】
- 产品名称：${productInfo.productName}
- 产品类目：${category.name}
- 价格信息：${productInfo.price || '未填写'}
- 目标用户：${productInfo.targetUsers || '未填写'}
- 用户痛点：${productInfo.userPainPoints || '未填写'}
- 核心卖点：${productInfo.sellingPoints.join('、')}
${productInfo.promotion ? `- 优惠活动：${productInfo.promotion}` : ''}

【素材类型】${template.name} - ${template.description}
结构框架：${template.structure}

【核心要求】
1. 时间控制：15-60秒短视频，约${targetWordCount}字
2. 黄金5秒法则：开场5秒必须有强吸引力的钩子，完播率>60%
3. 节奏紧凑：每句话都要推进剧情，不要废话
4. 卖点视觉化：用画面展示，不要只靠说的
5. 内容原创：必须与任何现有文案有明显差异，避免套路化表达
${creativeModeConfig ? `6. ⚠️ 必须严格遵循【${creativeModeConfig.name}】的创作策略和风格` : ''}

【输出格式 - 必须严格遵循】

爆款标题：[吸引眼球的标题]

预计时长：[15-60秒]

【画面1】(0-X秒)
镜头：[镜头类型：特写/中景/全景，拍摄角度]
画面：[具体画面描述，包含人物动作、产品展示]
字幕：[画面上要显示的关键文字]
旁白/台词：[配音或人物台词]

【画面2】(X-X秒)
镜头：[镜头类型和角度]
画面：[具体画面描述]
字幕：[关键文字]
旁白/台词：[配音或台词]

... [继续分画面，直到结尾]

【画面N】(最后X秒)
镜头：[镜头类型]
画面：[促单画面，如产品特写+价格/优惠信息]
字幕：[限时优惠/点击购买等CTA]
旁白/台词：[强引导促单话术]

【拍摄建议】
1. [具体的拍摄技巧建议]
2. [剪辑节奏建议]

记住：
- 每个画面都要有明确目的
- 字幕要精简，突出关键信息
- 台词要口语化，符合短视频节奏
- 最后必须有明确的购买引导`;
  } else {
    // 千川短视频文案 - 纯文字口播文案，快节奏、口语化、强促单
    return `你是一位专业的抖音带货文案策划，擅长创作高转化率的短视频口播文案。

${golden5SecondsPrompt}
${orderReasonsPrompt}
${seedingTechniquesPrompt}
${openingFormulasPrompt}
${psychologicalTacticsPrompt}

【⚠️ 创作约束 - 必须严格遵守】

### 语言风格约束
❌ 禁止使用书面化、作文式表达：
- 不要用长句，每句控制在10-20字
- 不要讲道理，要像跟朋友聊天
- 不要用"的反直觉真相"、"蒙蔽了判断"这种词

✅ 必须使用大白话、接地气的表达：
- 说人话，像跟朋友唠嗑
- 短句为主，念出来顺口
- 有情绪、有态度、有脾气

对比示例：
❌ 这款产品采用了先进的科技...
✅ 这玩意儿，用一个字形容：绝！

### 细节画面约束
❌ 泛泛而谈：
- "效果很好" → 没感觉
- "价格便宜" → 没痛感

✅ 具体数字 + 画面感 + 痛感：
- "原本399，今天99带回家" → 具体数字扎心
- "大夏天停电，这风扇能救你的命" → 有画面感

${creativeModePrompt}
${compliancePrompt}
${diversityInstructions}

【本次创作标识】${randomSeed}

【产品信息】
- 产品名称：${productInfo.productName}
- 产品类目：${category.name}
- 价格信息：${productInfo.price || '未填写'}
- 目标用户：${productInfo.targetUsers || '未填写'}
- 用户痛点：${productInfo.userPainPoints || '未填写'}
- 核心卖点：${productInfo.sellingPoints.join('、')}
${productInfo.promotion ? `- 优惠活动：${productInfo.promotion}` : ''}

【素材类型】${template.name} - ${template.description}
结构框架：${template.structure}

【核心要求】
1. 字数要求：约${targetWordCount}字
2. 黄金3秒：开场必须有强钩子，引发好奇或共鸣
3. 快节奏：每句话都要推进，不要废话
4. 口语化：像和朋友聊天，不要书面语
5. 强促单：结尾必须有明确的购买引导
6. 内容原创：必须与任何现有文案有明显差异，避免套路化表达
${creativeModeConfig ? `7. ⚠️ 必须严格遵循【${creativeModeConfig.name}】的创作策略和风格` : ''}

【文案结构】
- 开场（约3秒话术）：痛点钩子，引发共鸣
- 中间（核心部分）：产品卖点展示，场景化表达
- 背书：用户评价/数据证明
- 结尾（约5秒话术）：限时优惠+强CTA

【禁止事项】
- 禁止使用【标题】等格式标签
- 禁止使用绝对化词汇（第一、最好、顶级、唯一等）
- 禁止过于书面化的表达
- 禁止冗长拖沓，每句话都要有价值
- 禁止使用陈词滥调和套路化表达

【输出格式 - 必须严格遵循】
你必须创作**两个不同风格的文案**供用户选择，格式如下：

\`\`\`json
{
  "copywritings": [
    {
      "coverTitles": ["封面标题1", "封面标题2", "封面标题3"],
      "content": "文案1内容（风格A-直接引导型：痛点开场，直击用户需求，强促单）"
    },
    {
      "coverTitles": ["封面标题1", "封面标题2", "封面标题3"],
      "content": "文案2内容（风格B-故事共情型：用故事带入，情感共鸣，软性种草）"
    }
  ]
}
\`\`\`

【两个文案的风格要求】
- 文案1（风格A-直接引导型）：直接呈现痛点，快速引入产品，用数据和效果说话，强促单
- 文案2（风格B-故事共情型）：用真实故事或场景带入，情感共鸣，自然引出产品，软性种草

【封面标题要求】
- 每个文案输出3个封面标题
- 简短有力（8-15字）
- 吸引眼球，突出核心卖点
- 适合打在视频封面上

重要：必须输出完整的JSON格式，不要输出其他内容！`;
  }
}

/**
 * 构建信息流广告系统提示词 - 根据广告类型生成不同风格的文案
 */
export function buildFeedAdSystemPrompt(
  adType: FeedAdType,
  productInfo: ProductInfo,
  contentType: 'copywriting' | 'script' = 'copywriting',
  platform?: AdPlatform,
  wordCount?: number
): string {
  // 防御性代码：确保 template 有默认值
  const template = FEED_AD_TEMPLATES[adType] || FEED_AD_TEMPLATES.brand_awareness;
  // 防御性代码：确保 productCategory 有默认值
  const category = PRODUCT_CATEGORIES[productInfo.productCategory] || PRODUCT_CATEGORIES.other;
  const targetWordCount = wordCount || 500;
  
  // 生成差异化指令
  const diversityInstructions = generateDiversityInstructions();
  const randomSeed = generateRandomSeed();
  
  // 🔴 黑五类产品检测与合规约束
  const blackFiveDetection = detectBlackFiveProduct(
    productInfo.productName,
    productInfo.sellingPoints,
    productInfo.productCategory
  );
  const compliancePrompt = generateCompliancePrompt(blackFiveDetection.types);

  const platformHint = platform ? `投放平台：${getPlatformName(platform)}` : '';

  // 根据广告类型生成不同的核心指导
  const adTypeGuidance = getAdTypeGuidance(adType, productInfo);

  if (contentType === 'script') {
    // 信息流广告视频脚本
    return `你是一位专业的信息流广告脚本编导，擅长创作高点击率、高转化的信息流广告视频脚本。

${compliancePrompt}
${diversityInstructions}

【本次创作标识】${randomSeed}

【产品/品牌信息】
- 名称：${productInfo.productName}
- 类目：${category.name}
- 目标用户：${productInfo.targetUsers || '未填写'}
${platformHint}

【广告类型】${template.name} - ${template.description}

${adTypeGuidance}

【脚本输出格式】

广告标题：[吸引点击的标题]

预计时长：[15-60秒]

【画面1】(0-X秒)
镜头：[镜头类型和角度]
画面：[具体画面描述]
字幕：[画面上要显示的关键文字]
旁白/台词：[配音或人物台词]

... [继续分画面]

【画面N】(最后X秒)
镜头：[镜头类型]
画面：[转化引导画面]
字幕：[行动号召文字]
旁白/台词：[明确的行动引导]

记住：内容要原生，不要太像广告，不要用"点小黄车"、"立即抢购"等带货话术`;
  } else {
    // 信息流广告文案 - 根据广告类型生成不同风格的文案
    return `你是一位专业的信息流广告文案策划，擅长创作原生性强、点击率高的信息流广告文案。

${compliancePrompt}
${diversityInstructions}

【本次创作标识】${randomSeed}

【产品/品牌信息】
- 名称：${productInfo.productName}
- 类目：${category.name}
- 目标用户：${productInfo.targetUsers || '未填写'}
${platformHint}

【广告类型】${template.name} - ${template.description}

${adTypeGuidance}

【输出格式 - 必须严格遵循】
你必须创作**两个不同风格的文案**供用户选择，格式如下：

\`\`\`json
{
  "copywritings": [
    {
      "coverTitles": ["封面标题1", "封面标题2", "封面标题3"],
      "content": "文案1内容"
    },
    {
      "coverTitles": ["封面标题1", "封面标题2", "封面标题3"],
      "content": "文案2内容"
    }
  ]
}
\`\`\`

重要：必须输出完整的JSON格式，不要输出其他内容！`;
  }
}

/**
 * 根据广告类型获取具体的创作指导
 */
function getAdTypeGuidance(adType: FeedAdType, productInfo: ProductInfo): string {
  switch (adType) {
    case 'brand_awareness':
      return getBrandAwarenessGuidance(productInfo);
    case 'lead_generation':
      return getLeadGenerationGuidance(productInfo);
    case 'app_download':
      return getAppDownloadGuidance(productInfo);
    default:
      return getBrandAwarenessGuidance(productInfo);
  }
}

/**
 * 品牌曝光类广告指导
 */
function getBrandAwarenessGuidance(productInfo: ProductInfo): string {
  return `═══════════════════════════════════════════════════════════════
【品牌曝光广告 - 核心要求】⚠️ 关键
═══════════════════════════════════════════════════════════════

【目标】提升品牌认知度，建立品牌印象，不是卖产品！

【文案核心】
- 传达品牌价值、品牌理念、品牌故事
- 让用户记住品牌，对品牌产生好感
- 不强调具体产品功能、价格、促销信息

【文案风格】
- 文案1（品牌故事型）：讲述品牌的初心、理念、发展历程
- 文案2（情感共鸣型）：用用户视角呈现品牌带来的美好改变

【封面标题方向】
- 品牌口号/Slogan
- 品牌印象/用户感受
- 品牌价值观表达
- 示例："用心做好每一张纸"、"温柔守护30年"、"值得信赖的品牌"

【行动引导】
- "关注【品牌名】了解更多"
- "点击了解品牌故事"
- "发现更多美好"

【禁止事项】⚠️
- ❌ 禁止强调产品功能细节（如"摩擦系数低60%"）
- ❌ 禁止提价格和促销（如"原价8.8现价4.8"）
- ❌ 禁止用"购买"、"下单"、"抢购"等销售词汇
- ❌ 禁止像带货视频一样促单

【正确示例】
文案："在心相印看来，每一寸肌肤都值得被温柔对待。30年来，我们只做一件事——用最柔软的棉柔巾，守护你和家人的肌肤健康。因为我们相信，真正的温柔，是日复一日的坚持。心相印，温柔的力量。"

═══════════════════════════════════════════════════════════════`;
}

/**
 * 线索收集类广告指导
 */
function getLeadGenerationGuidance(productInfo: ProductInfo): string {
  return `═══════════════════════════════════════════════════════════════
【线索收集广告 - 核心要求】⚠️ 关键
═══════════════════════════════════════════════════════════════

【目标】获取潜在客户信息，引导用户免费咨询或领取资料！

【文案核心】
- 突出专业服务/解决方案能力
- 降低行动门槛，提供免费价值
- 建立信任感，让用户愿意留下联系方式

【文案风格】
- 文案1（专业咨询型）：展现专业度，提供免费咨询服务
- 文案2（问题解决型）：直击痛点，提供免费解决方案

【封面标题方向】
- 免费资源/服务
- 专家咨询/诊断
- 解决方案
- 示例："免费肌肤诊断"、"专家1对1咨询"、"领取护肤指南"、"你的肌肤适合什么？"

【行动引导】
- "免费咨询专家"
- "领取【XX资料/指南】"
- "预约免费体验"
- "点击获取专属方案"

【禁止事项】⚠️
- ❌ 禁止强调产品价格和促销
- ❌ 禁止用"购买"、"下单"、"抢购"等销售词汇
- ❌ 禁止像带货视频一样促单
- ✅ 强调"免费"、"专业"、"咨询"、"领取"

【正确示例】
文案："敏感肌总是反反复复？不知道该怎么选护肤品？我们的肌肤护理专家提供免费1对1咨询服务，帮你分析肌肤问题，定制专属护理方案。已有超过50000人获得专业建议，点击下方，免费获取你的肌肤诊断报告。"

═══════════════════════════════════════════════════════════════`;
}

/**
 * 应用下载类广告指导
 */
function getAppDownloadGuidance(productInfo: ProductInfo): string {
  return `═══════════════════════════════════════════════════════════════
【应用下载广告 - 核心要求】⚠️ 关键
═══════════════════════════════════════════════════════════════

【目标】推广APP下载安装，强调APP的功能价值！

【文案核心】
- 突出APP的功能价值和使用场景
- 强调下载APP能获得什么好处
- 提供下载激励（新人福利、专属功能等）

【文案风格】
- 文案1（功能价值型）：展示APP核心功能和使用价值
- 文案2（场景体验型）：用生活场景展示APP如何解决问题

【封面标题方向】
- APP核心功能
- 使用场景
- 下载福利
- 示例："一键管理家庭库存"、"新人下载送好礼"、"智能提醒不遗漏"、"你的生活小助手"

【行动引导】
- "下载APP体验"
- "立即下载，解锁更多功能"
- "新人下载送【XX福利】"
- "扫码下载APP"

【禁止事项】⚠️
- ❌ 禁止像带货视频一样卖产品
- ❌ 禁止强调产品价格和促销（除非是APP专属福利）
- ❌ 禁止用"购买"、"下单"、"抢购"等销售词汇
- ✅ 强调"下载"、"体验"、"功能"、"福利"

【正确示例】
文案："还在用纸笔记库存？心相印APP帮你一键管理家庭日用品，智能提醒补货时间，专属会员优惠不错过。新人下载还送10元无门槛券，更有护肤小知识、会员积分等精彩内容等你发现。点击下载，让生活更简单。"

═══════════════════════════════════════════════════════════════`;
}

/**
 * 获取平台名称
 */
function getPlatformName(platform: AdPlatform): string {
  const names: Record<AdPlatform, string> = {
    douyin: '抖音',
    toutiao: '今日头条',
    kuaishou: '快手',
    baidu: '百度',
    tencent: '腾讯（微信/QQ）',
  };
  return names[platform];
}

/**
 * 构建产品信息用户消息
 */
export function buildProductUserMessage(
  productInfo: ProductInfo,
  contentType: 'copywriting' | 'script',
  additionalRequirements?: string,
  creativeMode?: QianchuanCreativeMode
): string {
  const typeLabel = contentType === 'copywriting' ? '文案' : '脚本';
  
  // 获取创作模式名称
  const creativeModeName = creativeMode ? QIANCHUAN_CREATIVE_MODES[creativeMode]?.name : null;
  
  // 构建AI定位分析上下文
  const positioningContext = productInfo.aiPositioning 
    ? `\n\n【产品定位分析】\n${productInfo.aiPositioning}`
    : '';
  
  // 创作模式强调
  const creativeModeEmphasis = creativeModeName 
    ? `\n\n⚠️ 创作模式强调：
你正在使用【${creativeModeName}】创作模式，请确保：
1. 开场方式符合该模式的特点（参考系统提示词中的示例）
2. 内容结构遵循该模式的策略
3. 不要与其他模式的风格混淆`
    : '';
  
  return `请创作一段${typeLabel}，严格按照格式要求输出。

产品：${productInfo.productName}
卖点：${productInfo.sellingPoints.join('、')}
用户：${productInfo.targetUsers}${positioningContext}
${additionalRequirements ? `要求：${additionalRequirements}` : ''}${creativeModeEmphasis}

重要提醒：
${contentType === 'script' 
  ? '脚本必须包含【画面X】格式，每个画面要有镜头、画面描述、字幕、台词' 
  : '文案是纯文字内容，直接输出可用的口播文案，不要包含画面/镜头描述'}
${creativeModeName ? `创作模式：${creativeModeName} - 请严格按照该模式的风格创作，不要跑偏` : ''}
不要重复内容，写一遍即可`;
}

/**
 * 构建信息流广告用户消息
 */
export function buildFeedAdUserMessage(
  productInfo: ProductInfo,
  adType: FeedAdType,
  adObjective: string,
  contentType: 'copywriting' | 'script',
  additionalRequirements?: string
): string {
  const typeLabel = contentType === 'copywriting' ? '文案' : '脚本';
  // 防御性代码：确保 adTypeLabel 有默认值
  const adTypeLabel = FEED_AD_TEMPLATES[adType]?.name || '品牌曝光';
  
  // 构建AI定位分析上下文
  const positioningContext = productInfo.aiPositioning 
    ? `\n\n【产品定位分析】\n${productInfo.aiPositioning}`
    : '';
  
  return `请创作一段${typeLabel}，严格按照格式要求输出。

产品：${productInfo.productName}
优势：${productInfo.sellingPoints.join('、')}
用户：${productInfo.targetUsers}
类型：${adTypeLabel}
目标：${adObjective}${positioningContext}
${additionalRequirements ? `要求：${additionalRequirements}` : ''}

重要提醒：
${contentType === 'script' 
  ? '脚本必须包含【画面X】格式，每个画面要有镜头、画面描述、字幕、台词' 
  : '文案是纯文字内容，直接输出可用的广告文案，不要包含画面/镜头描述'}
不要重复内容，写一遍即可`;
}
