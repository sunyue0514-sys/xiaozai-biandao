/**
 * 行业模板配置文件
 * 用于账号规划功能的行业参数配置
 */

// ==================== 类型定义 ====================

/** 内容敏感度等级 */
export type SensitivityLevel = 'high' | 'medium' | 'low';

/** 决策周期 */
export type DecisionCycle = 'long' | 'medium' | 'short';

/** 客单价区间 */
export type PriceRange = 'high' | 'medium' | 'low';

/** 转化目标类型 */
export type ConversionGoal = 'to_store' | 'private_domain' | 'online_order' | 'consultation';

/** 流量范围 */
export type TrafficScope = 'local' | 'national';

/** 平台侧重 */
export type PlatformFocus = 'douyin' | 'xiaohongshu' | 'both';

/** 内容类型配比 */
export interface ContentRatio {
  /** 人设类（说过往/叙看法）*/
  persona: number;
  /** 专业类（讲科普/晒专业）*/
  professional: number;
  /** 展示类（拍经过/晒案例）*/
  showcase: number;
  /** 促销类（活动/优惠）*/
  promotion: number;
}

/** 行业模板配置 */
export interface IndustryTemplate {
  /** 行业编码 */
  code: string;
  /** 行业名称 */
  name: string;
  /** 行业图标（lucide图标名）*/
  icon: string;
  /** 行业描述 */
  description: string;
  /** 所属大类 */
  category: string;
  
  // 基础参数
  /** 内容敏感度 */
  sensitivity: SensitivityLevel;
  /** 决策周期 */
  decisionCycle: DecisionCycle;
  /** 客单价区间 */
  priceRange: PriceRange;
  /** 主要转化目标 */
  conversionGoal: ConversionGoal;
  /** 流量范围 */
  trafficScope: TrafficScope;
  /** 平台侧重 */
  platformFocus: PlatformFocus;
  
  // 内容策略参数
  /** 内容类型配比 */
  contentRatio: ContentRatio;
  /** 爆款选题方向 */
  hotTopics: string[];
  /** 内容禁忌 */
  taboos: string[];
  
  // 账号搭建参数
  /** 昵称风格建议 */
  nicknameStyles: string[];
  /** 简介模板 */
  bioTemplate: string;
  /** 人设标签建议 */
  personaTags: string[];
  
  // 转化路径参数
  /** 引流钩子建议 */
  hooks: string[];
  /** 私域话术模板 */
  privateDomainScript: string;
  /** 直播建议 */
  livestreamSuggestion?: string;
  
  /** 第一周选题建议 */
  firstWeekTopics: string[];
}

// ==================== 行业模板数据 ====================

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  // ==================== 美业健康 ====================
  
  medical_beauty: {
    code: 'medical_beauty',
    name: '医美',
    icon: 'Sparkles',
    description: '医疗美容机构、整形医院、皮肤管理中心等',
    category: '美业健康',
    sensitivity: 'high',
    decisionCycle: 'medium',
    priceRange: 'high',
    conversionGoal: 'private_domain',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 20,
      professional: 40,
      showcase: 30,
      promotion: 10,
    },
    hotTopics: [
      '避坑揭秘：哪些项目不值得做',
      '专业科普：不同肤质的正确护理方式',
      '效果对比：真实案例分享（需谨慎）',
      '价格解析：为什么有些项目这么贵',
      '行业内幕：教你识破营销套路',
    ],
    taboos: [
      '直接宣传具体效果',
      '使用前后对比图（可能违规）',
      '承诺具体价格和效果',
      '涉及医疗术语需谨慎',
      '不要贬低同行',
    ],
    nicknameStyles: [
      '{名字}姐·皮肤管理师',
      '{名字}｜{年数}年美业不踩坑',
      '{城市}{名字}变美日记',
    ],
    bioTemplate: '美业{年数}年，从{经历}到{城市}，见过太多花冤枉钱的姐妹。现在专门帮你把钱花对地方。私信我，领《{城市}皮肤管理避坑手册》。',
    personaTags: ['专业靠谱', '说真话', '不踩坑', '懂行', '实在人'],
    hooks: [
      '《皮肤管理避坑手册》',
      '免费面诊评估',
      '肤质检测体验',
      '一对一变美方案',
    ],
    privateDomainScript: '您好，我是{名字}，很高兴认识您！这是我们整理的《皮肤管理避坑手册》，希望对您有帮助。有任何问题随时问我，不推销不骚扰，纯交流~',
    livestreamSuggestion: '每周1-2场"皮肤管理答疑直播"，提前收集问题，现场解答，不卖货纯科普，建立信任后再转化。',
    firstWeekTopics: [
      '花了几千块做皮肤管理，为什么越做越差？这3个坑你踩了吗',
      '我在行业做了{年数}年，见过最离谱的营销套路是...',
      '不同年龄段，最值得投资的护肤项目是什么',
      '{城市}女性必看：本地皮肤管理避坑指南',
      '为什么我劝你别急着做项目，先搞清楚这3件事',
    ],
  },

  beauty_salon: {
    code: 'beauty_salon',
    name: '美容院',
    icon: 'Heart',
    description: '美容院、皮肤护理中心、SPA会所等',
    category: '美业健康',
    sensitivity: 'medium',
    decisionCycle: 'short',
    priceRange: 'medium',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 15,
      professional: 35,
      showcase: 35,
      promotion: 15,
    },
    hotTopics: [
      '护肤误区：90%的人都做错了',
      '真实案例：客户皮肤改善全过程',
      '手法展示：专业美容师的操作细节',
      '产品解析：贵妇平替怎么选',
      '店内日常：带你看看美容院的一天',
    ],
    taboos: [
      '夸大效果承诺',
      '贬低其他品牌产品',
      '使用未经授权的案例图片',
    ],
    nicknameStyles: [
      '{名字}·美容护肤',
      '{城市}{名字}皮肤管理',
      '{名字}老师｜护肤干货',
    ],
    bioTemplate: '{年数}年美容师，专注皮肤管理。不卖焦虑，只讲干货。关注我，带你科学护肤少走弯路。',
    personaTags: ['专业美容师', '护肤达人', '实在人', '耐心细致'],
    hooks: [
      '免费皮肤检测',
      '首次体验价',
      '护肤方案定制',
      '《护肤入门指南》',
    ],
    privateDomainScript: '您好！感谢关注~这是为您准备的护肤小贴士，有问题随时问我。我们店在{地址}，欢迎来喝茶聊天~',
    firstWeekTopics: [
      '护肤10年，我发现90%的人都踩过这些坑',
      '带你看看美容院的一天，我们是怎么做护理的',
      '为什么你在家护肤没效果？问题出在这里',
      '客户护肤3个月的变化，方法对了真的很重要',
      '美容师告诉你：这些护肤误区你中了几个',
    ],
  },

  hair_salon: {
    code: 'hair_salon',
    name: '美发/理发店',
    icon: 'Scissors',
    description: '理发店、美发沙龙、发型工作室等',
    category: '美业健康',
    sensitivity: 'low',
    decisionCycle: 'short',
    priceRange: 'medium',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'douyin',
    contentRatio: {
      persona: 15,
      professional: 30,
      showcase: 40,
      promotion: 15,
    },
    hotTopics: [
      '发型改造：路人变女神的全过程',
      '脸型分析：你适合什么发型',
      '染发避坑：这些颜色千万别染',
      '发型教程：在家也能打理的造型',
      '真实案例：客人发型前后对比',
    ],
    taboos: [
      '贬低其他发型师作品',
      '未经客户同意使用案例',
    ],
    nicknameStyles: [
      '发型师{名字}',
      '{名字}造发型',
      '{城市}发型师{名字}',
    ],
    bioTemplate: '专注发型设计{年数}年，擅长{特长}。改变从头开始，让我帮你找到最适合的发型。',
    personaTags: ['发型设计师', '审美在线', '技术过硬', '耐心沟通'],
    hooks: [
      '免费发型设计',
      '首次剪发优惠',
      '发型脸型匹配测试',
    ],
    privateDomainScript: '您好！我是发型师{名字}，可以发张照片给我，帮您分析适合什么发型~',
    firstWeekTopics: [
      '圆脸、方脸、长脸，分别适合什么发型',
      '客人发型改造全过程，变化太大了',
      '染发前必看：这些颜色显白又高级',
      '发型师告诉你：为什么你的发型总是做不对',
      '今日作品分享，这个发型太适合她了',
    ],
  },

  foot_massage: {
    code: 'foot_massage',
    name: '足浴/按摩',
    icon: 'Hand',
    description: '足浴店、推拿按摩店、养生馆等',
    category: '美业健康',
    sensitivity: 'medium',
    decisionCycle: 'short',
    priceRange: 'low',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'douyin',
    contentRatio: {
      persona: 20,
      professional: 30,
      showcase: 30,
      promotion: 20,
    },
    hotTopics: [
      '养生干货：上班族必知的放松技巧',
      '穴位科普：这些穴位太神奇了',
      '店内环境：带你看看我们的服务',
      '按摩手法：简单的自我放松方法',
      '养生误区：这些做法其实伤身体',
    ],
    taboos: [
      '涉及医疗治疗效果宣传',
      '低俗暗示性内容',
    ],
    nicknameStyles: [
      '{名字}养生馆',
      '{城市}足疗按摩',
      '{名字}推拿',
    ],
    bioTemplate: '专注养生保健{年数}年，专业技师团队，帮您缓解疲劳、放松身心。欢迎预约体验~',
    personaTags: ['专业技师', '养生达人', '服务周到'],
    hooks: [
      '首次体验价',
      '会员专属福利',
      '养生小礼包',
    ],
    privateDomainScript: '您好！欢迎咨询，我们店营业时间是{时间}，位置在{地址}。有问题随时问我~',
    firstWeekTopics: [
      '久坐腰酸背痛？这几个动作每天做，轻松缓解',
      '带你看看我们的服务环境，放松从这里开始',
      '足底按摩的好处，比你想象的更多',
      '上班族必看：下班后怎么快速恢复精力',
      '养生小知识：这些习惯正在伤害你的身体',
    ],
  },

  fitness_yoga: {
    code: 'fitness_yoga',
    name: '健身/瑜伽',
    icon: 'Dumbbell',
    description: '健身房、瑜伽馆、普拉提工作室等',
    category: '美业健康',
    sensitivity: 'low',
    decisionCycle: 'medium',
    priceRange: 'medium',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 20,
      professional: 40,
      showcase: 25,
      promotion: 15,
    },
    hotTopics: [
      '动作教程：小白也能学会的基础动作',
      '身材蜕变：会员真实变化记录',
      '健身误区：这些动作可能伤身体',
      '饮食科普：健身期间怎么吃',
      '日常训练：带你跟练一组',
    ],
    taboos: [
      '夸大效果承诺',
      '不科学的训练方法',
    ],
    nicknameStyles: [
      '{名字}健身',
      '{名字}瑜伽',
      '{城市}健身教练{名字}',
    ],
    bioTemplate: '健身/瑜伽{年数}年，专注帮助{目标人群}。关注我，带你科学训练，遇见更好的自己。',
    personaTags: ['健身教练', '瑜伽老师', '身材管理', '健康生活'],
    hooks: [
      '免费体验课',
      '体测评估',
      '训练计划定制',
      '《新手入门指南》',
    ],
    privateDomainScript: '您好！感谢关注~我可以帮您做一个简单的身体状况评估，给您一些训练建议。有需要可以预约体验课哦~',
    livestreamSuggestion: '每周2-3场直播跟练，互动性强，观众可以直接跟着练，建立信任后再推销课程。',
    firstWeekTopics: [
      '零基础健身必看：这几个动作新手必学',
      '会员3个月变化记录，坚持真的有回报',
      '这些健身误区你可能每天都在犯',
      '每天10分钟，在家也能练出好身材',
      '健身餐怎么吃？一周食谱分享',
    ],
  },

  // ==================== 餐饮酒旅 ====================

  restaurant: {
    code: 'restaurant',
    name: '餐饮',
    icon: 'Utensils',
    description: '餐厅、火锅店、烧烤店、奶茶店等',
    category: '餐饮酒旅',
    sensitivity: 'low',
    decisionCycle: 'short',
    priceRange: 'low',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'douyin',
    contentRatio: {
      persona: 10,
      professional: 20,
      showcase: 45,
      promotion: 25,
    },
    hotTopics: [
      '招牌菜品：必点美食展示',
      '制作过程：后厨大揭秘',
      '食客反应：真实顾客评价',
      '挑战活动：特色挑战吸流量',
      '店铺日常：老板/员工的日常',
    ],
    taboos: [
      '食品卫生问题',
      '虚假宣传菜品',
    ],
    nicknameStyles: [
      '{店名}｜{城市}美食',
      '{城市}{名字}探店',
      '{名字}的美食日记',
    ],
    bioTemplate: '{城市}本地美食，专注{特色菜品}。人均{价格}，好吃不贵。欢迎来打卡~',
    personaTags: ['美食达人', '本地特色', '性价比高'],
    hooks: [
      '新客优惠',
      '打卡送小吃',
      '团购套餐',
      '会员福利',
    ],
    privateDomainScript: '您好！欢迎关注{店名}~我们店在{地址}，营业时间是{时间}。有问题随时问我，期待您的光临！',
    livestreamSuggestion: '午餐/晚餐高峰期直播，展示菜品制作过程，限时团购优惠，刺激冲动消费。',
    firstWeekTopics: [
      '我们的招牌菜，每天卖出{数量}份',
      '后厨大揭秘：这道菜是这样做的',
      '今天来了个特别可爱的客人',
      '{城市}本地人最爱的这道菜，你吃过吗',
      '老板亲自下厨，教大家做这道家常菜',
    ],
  },

  bar_pub: {
    code: 'bar_pub',
    name: '酒馆/酒吧',
    icon: 'Wine',
    description: '酒吧、小酒馆、清吧、Livehouse等',
    category: '餐饮酒旅',
    sensitivity: 'low',
    decisionCycle: 'short',
    priceRange: 'low',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'douyin',
    contentRatio: {
      persona: 20,
      professional: 20,
      showcase: 40,
      promotion: 20,
    },
    hotTopics: [
      '氛围展示：店内的环境和氛围',
      '挑战活动：酒鬼挑战、龙虾挑战等',
      '故事分享：客人的有趣故事',
      '调酒展示：特色鸡尾酒制作',
      '主题派对：特色活动预告',
    ],
    taboos: [
      '过度饮酒内容',
      '未成年人饮酒相关',
    ],
    nicknameStyles: [
      '{店名}小酒馆',
      '{城市}酒馆{名字}',
      '{名字}的深夜食堂',
    ],
    bioTemplate: '{城市}年轻人的聚集地，主打{特色}。人均{价格}，氛围感拉满。今晚约吗？',
    personaTags: ['氛围感', '适合聚会', '年轻人最爱'],
    hooks: [
      '新客优惠',
      '挑战免单',
      '主题派对门票',
    ],
    privateDomainScript: '您好！欢迎关注~今晚有{活动}，要不要来坐坐？位置在{地址}~',
    livestreamSuggestion: '晚间直播店内氛围，展示活动过程，限时优惠刺激到店。',
    firstWeekTopics: [
      '今晚的客人太有意思了',
      '挑战第5杯免单，第10杯拿888，你敢来吗',
      '在{位置}开了一家酒馆，为什么选择这里',
      '我们的招牌鸡尾酒，颜值和味道都在线',
      '周末主题派对预告，穿{主题}进场有惊喜',
    ],
  },

  fruit_shop: {
    code: 'fruit_shop',
    name: '水果店',
    icon: 'Apple',
    description: '水果店、果切店、鲜果铺等',
    category: '餐饮酒旅',
    sensitivity: 'low',
    decisionCycle: 'short',
    priceRange: 'low',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'douyin',
    contentRatio: {
      persona: 10,
      professional: 25,
      showcase: 45,
      promotion: 20,
    },
    hotTopics: [
      '当季推荐：最新鲜的水果',
      '挑选技巧：怎么选水果',
      '果切展示：新鲜切好的水果',
      '新品上架：新到的货品',
      '促销活动：今日特价',
    ],
    taboos: [],
    nicknameStyles: [
      '{店名}鲜果',
      '{城市}{名字}水果',
      '{名字}果铺',
    ],
    bioTemplate: '新鲜水果每日直达，品质保证。{特色产品}，欢迎选购~',
    personaTags: ['新鲜直供', '品质保证', '价格实惠'],
    hooks: [
      '新客优惠',
      '果切体验装',
      '会员折扣',
    ],
    privateDomainScript: '您好！今天刚到的{水果}特别新鲜，要不要来尝尝？',
    firstWeekTopics: [
      '今天刚到的{水果}，新鲜度满分',
      '怎么挑{水果}？老板教你几招',
      '果切展示，看着就想吃',
      '今日特价：{水果}只要{价格}',
      '夏天必备水果，补水又解暑',
    ],
  },

  // ==================== 教育培训 ====================

  education_training: {
    code: 'education_training',
    name: '教育培训',
    icon: 'GraduationCap',
    description: 'K12教育、职业培训、兴趣培训、语言培训等',
    category: '教育培训',
    sensitivity: 'low',
    decisionCycle: 'long',
    priceRange: 'medium',
    conversionGoal: 'consultation',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 15,
      professional: 45,
      showcase: 25,
      promotion: 15,
    },
    hotTopics: [
      '学习方法：高效学习技巧',
      '学员案例：进步/成果展示',
      '教育观点：对教育的思考',
      '教学日常：课堂/教学过程',
      '家长答疑：常见问题解答',
    ],
    taboos: [
      '夸大培训效果',
      '制造教育焦虑',
      '违规学科培训内容',
    ],
    nicknameStyles: [
      '{名字}老师',
      '{机构名}教育',
      '{名字}｜{学科}老师',
    ],
    bioTemplate: '专注{领域}教学{年数}年，帮助{数量}+学员实现{目标}。用心教好每一节课。',
    personaTags: ['专业老师', '耐心负责', '教学经验丰富'],
    hooks: [
      '免费试听课',
      '学习资料包',
      '学习规划咨询',
      '能力测评',
    ],
    privateDomainScript: '您好！感谢关注~我可以帮您做一个简单的学习情况评估，给您一些建议。有需要可以预约试听课~',
    livestreamSuggestion: '每周1-2场直播答疑，解答家长/学员问题，展示教学能力，建立信任。',
    firstWeekTopics: [
      '为什么有些孩子学得轻松，有些却很吃力',
      '学员{时间}的进步，方法对了真的很重要',
      '家长最关心的{数量}个问题，今天统一解答',
      '作为老师，我想对家长说...',
      '分享一个高效学习的方法，亲测有效',
    ],
  },

  // ==================== 房产家居 ====================

  real_estate: {
    code: 'real_estate',
    name: '房产中介',
    icon: 'Building',
    description: '房产中介、二手房销售、新房代理等',
    category: '房产家居',
    sensitivity: 'low',
    decisionCycle: 'long',
    priceRange: 'high',
    conversionGoal: 'consultation',
    trafficScope: 'local',
    platformFocus: 'douyin',
    contentRatio: {
      persona: 20,
      professional: 35,
      showcase: 35,
      promotion: 10,
    },
    hotTopics: [
      '房源推荐：优质房源展示',
      '购房知识：买房必知事项',
      '市场分析：本地房价走势',
      '避坑指南：购房常见陷阱',
      '看房日记：带客户看房过程',
    ],
    taboos: [
      '虚假房源信息',
      '价格误导',
      '承诺投资回报',
    ],
    nicknameStyles: [
      '{名字}｜{城市}房产',
      '{城市}房产{名字}',
      '{名字}看房日记',
    ],
    bioTemplate: '{城市}房产{年数}年，熟悉{区域}所有楼盘。帮你找到心仪的家，不忽悠不套路。',
    personaTags: ['房产专家', '本地通', '诚实靠谱'],
    hooks: [
      '免费房价评估',
      '购房手册',
      '看房预约',
      '贷款咨询',
    ],
    privateDomainScript: '您好！我是{城市}房产经纪人{名字}，可以帮您找找合适的房源。您有具体需求可以告诉我~',
    firstWeekTopics: [
      '{城市}{区域}房价最新走势，看完再决定买不买',
      '带客户看了{数量}套房，最后选了这套',
      '买房必知的{数量}个坑，血泪经验总结',
      '这套房子性价比超高，房东急售',
      '为什么我劝客户不要买这类房子',
    ],
  },

  renovation: {
    code: 'renovation',
    name: '装修公司',
    icon: 'Hammer',
    description: '装修公司、设计工作室、建材商家等',
    category: '房产家居',
    sensitivity: 'low',
    decisionCycle: 'long',
    priceRange: 'high',
    conversionGoal: 'consultation',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 15,
      professional: 30,
      showcase: 45,
      promotion: 10,
    },
    hotTopics: [
      '完工案例：真实装修效果',
      '装修干货：避坑指南',
      '施工过程：施工现场展示',
      '设计理念：设计师的思考',
      '材料科普：建材选购知识',
    ],
    taboos: [
      '虚假效果展示',
      '恶意低价引流',
    ],
    nicknameStyles: [
      '{名字}设计',
      '{公司名}装饰',
      '{城市}装修{名字}',
    ],
    bioTemplate: '专注{城市}装修{年数}年，{特色}。用心装好每一个家。',
    personaTags: ['设计师', '施工专业', '性价比高'],
    hooks: [
      '免费量房',
      '装修报价',
      '设计方案',
      '《装修避坑指南》',
    ],
    privateDomainScript: '您好！感谢关注~我可以帮您做个装修预算评估，有需要可以预约免费量房~',
    firstWeekTopics: [
      '刚完工的{面积}平{风格}，业主很满意',
      '装修{年数}年，我总结的{数量}条避坑经验',
      '施工现场实拍，看我们怎么装',
      '这个户型怎么改？设计师的思路',
      '装修预算怎么分配？一分钱一分货',
    ],
  },

  wedding_photo: {
    code: 'wedding_photo',
    name: '婚纱摄影',
    icon: 'Camera',
    description: '婚纱摄影、婚礼跟拍、写真摄影等',
    category: '房产家居',
    sensitivity: 'low',
    decisionCycle: 'medium',
    priceRange: 'high',
    conversionGoal: 'consultation',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 10,
      professional: 20,
      showcase: 55,
      promotion: 15,
    },
    hotTopics: [
      '客片展示：真实客片分享',
      '拍摄花絮：幕后故事',
      '风格推荐：流行风格介绍',
      '选片攻略：婚纱照怎么选',
      '新人故事：客人的爱情故事',
    ],
    taboos: [
      '使用未经授权的客片',
      '虚假样片宣传',
    ],
    nicknameStyles: [
      '{店名}婚纱摄影',
      '{城市}婚纱照{名字}',
      '{名字}摄影工作室',
    ],
    bioTemplate: '专注婚纱摄影{年数}年，{特色风格}。用镜头记录你们最美的时刻。',
    personaTags: ['摄影师', '审美在线', '服务周到'],
    hooks: [
      '免费试拍',
      '婚纱照报价',
      '档期查询',
      '风格咨询',
    ],
    privateDomainScript: '您好！恭喜备婚~可以了解一下我们的拍摄风格，有需要可以预约档期哦~',
    firstWeekTopics: [
      '昨天拍完的客片，这个风格太美了',
      '拍摄花絮：新人们都太会了',
      '{城市}拍婚纱照去哪里？推荐这几个地方',
      '婚纱照风格怎么选？看完这篇就懂了',
      '这套婚纱照，客人看哭了',
    ],
  },

  // ==================== 生活服务 ====================

  pet_shop: {
    code: 'pet_shop',
    name: '宠物店/医院',
    icon: 'Dog',
    description: '宠物店、宠物医院、宠物美容等',
    category: '生活服务',
    sensitivity: 'low',
    decisionCycle: 'short',
    priceRange: 'medium',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 15,
      professional: 35,
      showcase: 35,
      promotion: 15,
    },
    hotTopics: [
      '萌宠日常：可爱宠物内容',
      '养宠知识：科学养宠科普',
      '服务展示：美容/医疗过程',
      '宠物故事：客人的宠物故事',
      '新手指南：养宠入门知识',
    ],
    taboos: [
      '展示宠物痛苦画面',
      '不当医疗宣传',
    ],
    nicknameStyles: [
      '{店名}宠物',
      '{城市}宠物医院',
      '{名字}宠物生活馆',
    ],
    bioTemplate: '专注宠物{服务}{年数}年，用心呵护每一个毛孩子。',
    personaTags: ['爱宠人士', '专业服务', '有爱心'],
    hooks: [
      '免费体检',
      '新手养宠指南',
      '首次美容优惠',
    ],
    privateDomainScript: '您好！欢迎关注~有宠物相关问题可以随时问我，看到都会回复~',
    firstWeekTopics: [
      '今天来了只超可爱的{宠物品种}',
      '养{宠物品种}必知的{数量}件事',
      '宠物美容前后对比，变化太大了',
      '新手养宠入门指南，建议收藏',
      '这些食物千万别给宠物吃',
    ],
  },

  car_beauty: {
    code: 'car_beauty',
    name: '汽车美容',
    icon: 'Car',
    description: '汽车美容、洗车店、汽修店等',
    category: '生活服务',
    sensitivity: 'low',
    decisionCycle: 'short',
    priceRange: 'low',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'douyin',
    contentRatio: {
      persona: 10,
      professional: 30,
      showcase: 45,
      promotion: 15,
    },
    hotTopics: [
      '服务展示：洗车/美容过程',
      '效果对比：前后对比展示',
      '汽车知识：养车干货',
      '产品科普：汽车用品推荐',
      '日常记录：店内日常',
    ],
    taboos: [],
    nicknameStyles: [
      '{店名}汽车美容',
      '{城市}洗车{名字}',
      '{名字}汽车服务',
    ],
    bioTemplate: '专业汽车美容{年数}年，用心服务每一辆车。',
    personaTags: ['技术专业', '服务细致', '性价比高'],
    hooks: [
      '首次洗车优惠',
      '免费检测',
      '会员福利',
    ],
    privateDomainScript: '您好！欢迎关注~我们店在{地址}，有需要可以随时过来~',
    firstWeekTopics: [
      '洗车不只是冲水，看看我们怎么洗',
      '这台车来做镀晶，效果太惊艳了',
      '汽车保养{数量}个误区，你中了几个',
      '内饰深度清洁，焕然一新',
      '今天店里来了台好车',
    ],
  },

  maternity_center: {
    code: 'maternity_center',
    name: '月子中心',
    icon: 'Baby',
    description: '月子中心、产后康复、母婴护理等',
    category: '生活服务',
    sensitivity: 'medium',
    decisionCycle: 'medium',
    priceRange: 'high',
    conversionGoal: 'consultation',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 15,
      professional: 35,
      showcase: 35,
      promotion: 15,
    },
    hotTopics: [
      '环境展示：房间/设施介绍',
      '月子餐：营养餐食展示',
      '宝妈故事：客人的入住体验',
      '育儿知识：新生儿护理科普',
      '产后恢复：康复知识分享',
    ],
    taboos: [
      '夸大服务效果',
      '制造产后焦虑',
    ],
    nicknameStyles: [
      '{店名}月子中心',
      '{城市}月子会所',
      '{名字}母婴护理',
    ],
    bioTemplate: '专注母婴护理{年数}年，为{城市}妈妈提供专业的月子服务。',
    personaTags: ['专业护理', '温馨舒适', '服务周到'],
    hooks: [
      '免费参观',
      '孕妈礼包',
      '入住咨询',
    ],
    privateDomainScript: '您好！恭喜备孕~可以了解一下我们的月子服务，有需要可以预约参观哦~',
    firstWeekTopics: [
      '带您看看我们的月子房环境',
      '月子餐长这样，营养又美味',
      '宝妈入住{数量}天的真实感受',
      '新生儿护理{数量}个小知识',
      '产后恢复这样做，恢复更快',
    ],
  },

  // ==================== 零售百货 ====================

  clothing_store: {
    code: 'clothing_store',
    name: '服装店',
    icon: 'Shirt',
    description: '服装店、女装店、男装店、鞋店等',
    category: '零售百货',
    sensitivity: 'low',
    decisionCycle: 'short',
    priceRange: 'low',
    conversionGoal: 'to_store',
    trafficScope: 'local',
    platformFocus: 'both',
    contentRatio: {
      persona: 15,
      professional: 25,
      showcase: 45,
      promotion: 15,
    },
    hotTopics: [
      '穿搭展示：新品穿搭look',
      '搭配技巧：不同身材怎么穿',
      '新品上架：新款推荐',
      '顾客反馈：真实买家秀',
      '促销活动：优惠信息',
    ],
    taboos: [],
    nicknameStyles: [
      '{店名}服饰',
      '{城市}{名字}穿搭',
      '{名字}女装/男装',
    ],
    bioTemplate: '专注{风格}服饰{年数}年，帮你找到最适合的穿搭。',
    personaTags: ['穿搭达人', '审美在线', '性价比高'],
    hooks: [
      '新客优惠',
      '穿搭咨询',
      '会员福利',
    ],
    privateDomainScript: '您好！欢迎关注~有穿搭问题可以问我，也可以来店里试穿~',
    firstWeekTopics: [
      '今日穿搭分享，这套太好看了',
      '{身材类型}怎么穿显瘦？搭配技巧',
      '新品上架，这个颜色太美了',
      '顾客试穿反馈，上身效果超好',
      '今天店里来了位气质超好的客人',
    ],
  },
};

// ==================== 辅助函数 ====================

/** 获取所有行业列表 */
export function getAllIndustries(): IndustryTemplate[] {
  return Object.values(INDUSTRY_TEMPLATES);
}

/** 获取所有行业分类 */
export function getIndustryCategories(): { name: string; industries: IndustryTemplate[] }[] {
  const categories: Record<string, IndustryTemplate[]> = {};
  
  Object.values(INDUSTRY_TEMPLATES).forEach(industry => {
    if (!categories[industry.category]) {
      categories[industry.category] = [];
    }
    categories[industry.category].push(industry);
  });
  
  return Object.entries(categories).map(([name, industries]) => ({
    name,
    industries,
  }));
}

/** 根据编码获取行业模板 */
export function getIndustryByCode(code: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES[code];
}

/** 获取内容敏感度标签 */
export function getSensitivityLabel(level: SensitivityLevel): string {
  const labels: Record<SensitivityLevel, string> = {
    high: '高（需特别注意平台规则）',
    medium: '中（需适度注意）',
    low: '低（内容限制较少）',
  };
  return labels[level];
}

/** 获取决策周期标签 */
export function getDecisionCycleLabel(cycle: DecisionCycle): string {
  const labels: Record<DecisionCycle, string> = {
    long: '长周期（1个月以上）',
    medium: '中周期（1-4周）',
    short: '短周期（即时消费）',
  };
  return labels[cycle];
}

/** 获取转化目标标签 */
export function getConversionGoalLabel(goal: ConversionGoal): string {
  const labels: Record<ConversionGoal, string> = {
    to_store: '到店消费',
    private_domain: '私域转化',
    online_order: '线上下单',
    consultation: '咨询预约',
  };
  return labels[goal];
}

/** 获取平台侧重标签 */
export function getPlatformFocusLabel(focus: PlatformFocus): string {
  const labels: Record<PlatformFocus, string> = {
    douyin: '抖音为主',
    xiaohongshu: '小红书为主',
    both: '双平台运营',
  };
  return labels[focus];
}
