// Mock 数据 - 用于开发和测试

// 客户数据
export const mockCustomers = [
  {
    id: 1,
    name: '张三',
    phone: '138****8888',
    industry: '电商',
    status: 'active',
    createdAt: '2025-03-01',
    memberLevel: 'VIP',
    avatar: null,
    wechat: 'zhangsan888',
    email: 'zhangsan@example.com',
    company: '杭州优品电商有限公司',
    notes: '重点客户，有大量短视频需求',
  },
  {
    id: 2,
    name: '李四',
    phone: '139****6666',
    industry: '教育',
    status: 'active',
    createdAt: '2025-03-05',
    memberLevel: '普通',
    avatar: null,
    wechat: 'lisi_edu',
    email: 'lisi@example.com',
    company: '北京智慧教育科技',
    notes: '教育行业客户，主要做知识分享',
  },
  {
    id: 3,
    name: '王五',
    phone: '137****5555',
    industry: '餐饮',
    status: 'inactive',
    createdAt: '2025-02-20',
    memberLevel: '普通',
    avatar: null,
    wechat: 'wangwu_food',
    email: 'wangwu@example.com',
    company: '成都美食坊',
    notes: '餐饮行业，需要展示菜品视频',
  },
  {
    id: 4,
    name: '赵六',
    phone: '136****4444',
    industry: '服装',
    status: 'active',
    createdAt: '2025-03-10',
    memberLevel: 'VIP',
    avatar: null,
    wechat: 'zhaoliu_fashion',
    email: 'zhaoliu@example.com',
    company: '广州时尚服饰',
    notes: '服装品牌，需要大量产品展示视频',
  },
  {
    id: 5,
    name: '钱七',
    phone: '135****3333',
    industry: '美妆',
    status: 'active',
    createdAt: '2025-03-12',
    memberLevel: 'SVIP',
    avatar: null,
    wechat: 'qianqi_beauty',
    email: 'qianqi@example.com',
    company: '上海美妆集团',
    notes: '高端美妆品牌，预算充足',
  },
];

// 素材库数据
export const mockMaterials = [
  {
    id: 1,
    customerId: 1,
    title: '春季新品上市宣传',
    type: 'video',
    url: 'https://example.com/video1.mp4',
    thumbnail: 'https://picsum.photos/seed/spring/300/200',
    createdAt: '2025-03-10',
  },
  {
    id: 2,
    customerId: 1,
    title: '产品使用教程',
    type: 'video',
    url: 'https://example.com/video2.mp4',
    thumbnail: 'https://picsum.photos/seed/tutorial/300/200',
    createdAt: '2025-03-08',
  },
  {
    id: 3,
    customerId: 1,
    title: '品牌Logo',
    type: 'image',
    url: 'https://example.com/logo.png',
    thumbnail: 'https://picsum.photos/seed/logo/300/200',
    createdAt: '2025-03-05',
  },
  {
    id: 4,
    customerId: 2,
    title: '课程介绍视频',
    type: 'video',
    url: 'https://example.com/course.mp4',
    thumbnail: 'https://picsum.photos/seed/course/300/200',
    createdAt: '2025-03-09',
  },
];

// 脚本数据
export const mockScripts = [
  {
    id: 1,
    customerId: 1,
    title: '春季新品推广脚本',
    category: 'product',
    content: `【开场】
镜头：产品特写，光影流转
文案：春日焕新，从遇见它开始...

【产品展示】
镜头：多角度展示产品细节
文案：精选面料，匠心工艺...

【结尾】
镜头：品牌Logo + 购买链接
文案：限时优惠，点击下方链接购买`,
    createdAt: '2025-03-10',
    status: 'published',
  },
  {
    id: 2,
    customerId: 2,
    title: '英语课程推广脚本',
    category: 'education',
    content: `【开场】
镜头：学员学习场景
文案：还在为英语发愁吗？

【课程介绍】
镜头：课程界面展示
文案：AI智能学习系统，个性化学习方案...

【结尾】
镜头：学员好评 + 报名二维码
文案：限时免费试听，扫码报名`,
    createdAt: '2025-03-08',
    status: 'draft',
  },
];

// 运营数据
export const mockOperationData = {
  overview: {
    totalViews: 1289563,
    totalLikes: 89623,
    totalComments: 12543,
    totalShares: 8567,
    viewsGrowth: 23.5,
    likesGrowth: 18.2,
    commentsGrowth: 15.8,
    sharesGrowth: 12.3,
  },
  trend: [
    { date: '03-01', views: 45000, likes: 3200, comments: 450 },
    { date: '03-02', views: 52000, likes: 3800, comments: 520 },
    { date: '03-03', views: 48000, likes: 3500, comments: 480 },
    { date: '03-04', views: 61000, likes: 4200, comments: 580 },
    { date: '03-05', views: 55000, likes: 3900, comments: 510 },
    { date: '03-06', views: 67000, likes: 4800, comments: 650 },
    { date: '03-07', views: 72000, likes: 5100, comments: 720 },
  ],
  topVideos: [
    { id: 1, title: '春季新品发布', views: 156000, likes: 12300, platform: '抖音' },
    { id: 2, title: '产品使用教程', views: 98000, likes: 8700, platform: '抖音' },
    { id: 3, title: '用户好评合集', views: 76000, likes: 6500, platform: '快手' },
    { id: 4, title: '品牌故事', views: 65000, likes: 5400, platform: '抖音' },
    { id: 5, title: '幕后花絮', views: 52000, likes: 4300, platform: '小红书' },
  ],
};

// AI 模型列表
export const mockModels = [
  {
    id: 'doubao-pro-32k',
    name: 'Doubao Pro 32K',
    description: '豆包大模型，支持32K上下文，适合长文本生成',
    maxTokens: 32768,
    type: 'chat',
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'DeepSeek对话模型，推理能力强',
    maxTokens: 16384,
    type: 'chat',
  },
  {
    id: 'kimi-chat',
    name: 'Kimi Chat',
    description: '月之暗面对话模型，支持超长上下文',
    maxTokens: 200000,
    type: 'chat',
  },
  {
    id: 'doubao-seed',
    name: 'Doubao Seed',
    description: '豆包创意模型，适合内容创作',
    maxTokens: 8192,
    type: 'creative',
  },
];

// 会员套餐
export const mockMemberPlans = [
  {
    id: 1,
    name: '体验版',
    planType: 'membership',
    planCategory: 'trial',
    price: 0,
    originalPrice: null,
    discountPrice: null,
    duration: 1,
    computingPower: 10000,
    maxConcurrentSessions: 1,
    features: ['基础AI功能', '每日10次对话', '基础模板'],
    isActive: true,
  },
  {
    id: 2,
    name: '月度会员',
    planType: 'membership',
    planCategory: 'monthly',
    price: 199,
    originalPrice: '398',
    discountPrice: '199',
    duration: 30,
    computingPower: 30000,
    maxConcurrentSessions: 3,
    features: ['全部AI功能', '无限对话', '高级模板', '优先客服'],
    isActive: true,
  },
  {
    id: 3,
    name: '年度会员',
    planType: 'membership',
    planCategory: 'yearly',
    price: 1980,
    originalPrice: '4760',
    discountPrice: '1980',
    duration: 365,
    computingPower: 400000,
    maxConcurrentSessions: 10,
    features: ['全部AI功能', '无限对话', '高级模板', '优先客服', '专属顾问', 'API接口'],
    isActive: true,
  },
  {
    id: 4,
    name: '基础算力包',
    planType: 'computing',
    planCategory: 'basic',
    price: 29,
    originalPrice: null,
    discountPrice: null,
    duration: 0,
    computingPower: 1000,
    maxConcurrentSessions: 0,
    features: ['1000算力点', '永久有效', '无使用限制'],
    isActive: true,
  },
  {
    id: 5,
    name: '进阶算力包',
    planType: 'computing',
    planCategory: 'advanced',
    price: 99,
    originalPrice: null,
    discountPrice: null,
    duration: 0,
    computingPower: 5000,
    maxConcurrentSessions: 0,
    features: ['5000算力点', '永久有效', '赠送500额外算力'],
    isActive: true,
  },
  {
    id: 6,
    name: '专业算力包',
    planType: 'computing',
    planCategory: 'professional',
    price: 299,
    originalPrice: null,
    discountPrice: null,
    duration: 0,
    computingPower: 20000,
    maxConcurrentSessions: 0,
    features: ['20000算力点', '永久有效', '赠送3000额外算力', '专属客服'],
    isActive: true,
  },
];

// AI 工具预设提示词
export const mockToolPrompts = [
  {
    id: 'script-writer',
    name: '短视频脚本生成',
    description: '根据产品信息生成专业的短视频脚本',
    prompt: '你是一位专业的短视频脚本创作专家。请根据用户提供的主题和要求，创作一个吸引人的短视频脚本。脚本应包含：场景描述、镜头语言、文案内容、时长建议等。',
  },
  {
    id: 'copywriter',
    name: '营销文案生成',
    description: '生成吸引人的营销推广文案',
    prompt: '你是一位资深的营销文案专家。请根据用户提供的产品信息和目标受众，创作具有说服力的营销文案。文案应简洁有力，突出产品卖点。',
  },
  {
    id: 'title-optimizer',
    name: '标题优化助手',
    description: '优化视频标题，提高点击率',
    prompt: '你是一位短视频标题优化专家。请根据用户提供的视频内容和目标，生成多个吸引眼球的标题方案，并分析每个标题的优势。',
  },
  {
    id: 'qa-assistant',
    name: '内容问答助手',
    description: '回答内容创作相关问题',
    prompt: '你是一位短视频内容创作顾问。请回答用户关于内容创作、运营推广、平台规则等方面的问题，提供专业建议。',
  },
];

// IP 定位数据
export const mockIPPositioning = {
  coreAdvantage: '10年电商运营经验，专注服装时尚领域',
  contentDirection: ['穿搭教程', '新品发布', '品牌故事', '用户口碑'],
  targetAudience: {
    ageRange: '25-35岁',
    gender: '女性为主',
    interests: ['时尚穿搭', '品质生活', '高性价比'],
    consumptionCapacity: '中高端消费',
  },
  personalityTraits: ['专业', '亲和', '时尚', '可信'],
  brandKeywords: ['品质', '时尚', '高性价比', '专业'],
  contentStyle: {
    tone: '专业但不生硬，亲切但不随意',
    visual: '简约高级，突出产品质感',
    music: '轻快时尚，符合品牌调性',
  },
};
