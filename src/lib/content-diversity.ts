/**
 * 内容差异化工具模块
 * 用于增加AI生成内容的多样性和独特性
 */

// 开头钩子类型
export const HOOK_TYPES = [
  {
    type: 'question',
    name: '提问钩子',
    examples: [
      '你知道为什么...吗？',
      '有没有想过...',
      '很多人问我...',
      '你有没有遇到过...',
      '为什么...',
    ],
  },
  {
    type: 'counter_intuitive',
    name: '反常识钩子',
    examples: [
      '大多数人都搞错了...',
      '真相其实是...',
      '你以为...但其实...',
      '别再...了，这才是正确做法',
      '一直以为...结果发现...',
    ],
  },
  {
    type: 'benefit',
    name: '利益钩子',
    examples: [
      '今天教你...',
      '学会这一招...',
      '只要X分钟让你...',
      '掌握了这个方法...',
      '一个简单的方法帮你...',
    ],
  },
  {
    type: 'story',
    name: '故事钩子',
    examples: [
      '我有一个朋友...',
      '昨天发生了一件事...',
      '记得有一次...',
      '前两天看到一个...',
      '说起这个我就想起...',
    ],
  },
  {
    type: 'data',
    name: '数据钩子',
    examples: [
      '90%的人不知道...',
      '我测试了X次发现...',
      '这个方法帮了X万人...',
      '据统计...',
      '数据显示...',
    ],
  },
  {
    type: 'negative',
    name: '负面钩子',
    examples: [
      '千万别...',
      '如果你还在...那就危险了',
      '再不...就晚了',
      '很多人踩过这个坑...',
      '这个错误很多人都犯过...',
    ],
  },
  {
    type: 'contrast',
    name: '对比钩子',
    examples: [
      '别人花X年，我只用X天...',
      '同样是...为什么他能...',
      '以前我也...直到...',
      '以前觉得...现在发现...',
      '对比了一下...',
    ],
  },
  {
    type: 'reveal',
    name: '揭秘钩子',
    examples: [
      '终于有人敢说实话了...',
      '今天曝光一个秘密...',
      '内部消息...',
      '其实很多人不知道...',
      '今天告诉你一个真相...',
    ],
  },
];

// 切入角度
export const ANGLE_TYPES = [
  {
    type: 'pain_point',
    name: '痛点切入',
    description: '直接击中用户最头疼的问题',
  },
  {
    type: 'scenario',
    name: '场景切入',
    description: '带入具体使用场景，建立代入感',
  },
  {
    type: 'contrast',
    name: '对比切入',
    description: '通过前后对比、竞品对比突出优势',
  },
  {
    type: 'story',
    name: '故事切入',
    description: '用真实故事或案例引发共鸣',
  },
  {
    type: 'data',
    name: '数据切入',
    description: '用具体数字和数据建立可信度',
  },
  {
    type: 'emotion',
    name: '情感切入',
    description: '触及用户情感，建立情感连接',
  },
  {
    type: 'curiosity',
    name: '好奇切入',
    description: '制造悬念，激发探索欲',
  },
  {
    type: 'benefit',
    name: '利益切入',
    description: '直接展示用户能获得的好处',
  },
];

// 表达风格
export const STYLE_TYPES = [
  {
    type: 'casual',
    name: '轻松口语',
    description: '像和朋友聊天一样自然',
    markers: ['其实', '说实话', '真的', '我觉得', '你想想'],
  },
  {
    type: 'professional',
    name: '专业权威',
    description: '展现专业度，建立信任',
    markers: ['根据', '实际上', '从专业角度', '经过测试', '数据表明'],
  },
  {
    type: 'emotional',
    name: '情感共鸣',
    description: '触动用户情感，引发共情',
    markers: ['说实话我也', '真的特别', '那时候我', '现在想想', '每次看到'],
  },
  {
    type: 'humorous',
    name: '幽默风趣',
    description: '轻松有趣，拉近与用户的距离',
    markers: ['说起来挺逗的', '有意思的是', '搞笑的是', '有意思', '哈哈哈'],
  },
  {
    type: 'sincere',
    name: '真诚分享',
    description: '像老朋友分享经验一样真诚',
    markers: ['说实话', '真心推荐', '我自己也', '不骗你', '亲测'],
  },
  {
    type: 'urgent',
    name: '紧迫感',
    description: '制造紧迫感，促进行动',
    markers: ['真的要抓紧', '别再犹豫了', '趁现在', '赶紧', '马上'],
  },
];

// 结尾话术
export const CTA_TYPES = [
  {
    type: 'direct',
    name: '直接促单',
    examples: [
      '点击下方链接，立即抢购！',
      '现在下单还有优惠，别错过了！',
      '限时活动，赶紧下手吧！',
    ],
  },
  {
    type: 'curiosity',
    name: '好奇引导',
    examples: [
      '想知道效果？自己试试就知道了！',
      '反正有保障，试试又不亏！',
      '好不好用，你说了算！',
    ],
  },
  {
    type: 'scarcity',
    name: '稀缺紧迫',
    examples: [
      '库存不多了，手慢无！',
      '活动最后X小时，错过等一年！',
      '限量X份，抢完即止！',
    ],
  },
  {
    type: 'social_proof',
    name: '社会证明',
    examples: [
      '已经有X万人入手了！',
      '好评如潮，放心入！',
      '大家都在用，你也试试！',
    ],
  },
  {
    type: 'guarantee',
    name: '保障承诺',
    examples: [
      '不满意包退，放心下单！',
      '官方正品保障，售后无忧！',
      '有运费险，放心买！',
    ],
  },
];

// 金句库
export const GOLDEN_SENTENCES = [
  '选择比努力更重要',
  '省钱不是目的，花对钱才是',
  '不是买不起，而是不值得',
  '好的东西，值得等待',
  '贵有贵的道理',
  '一分钱一分货',
  '好东西从来不需要解释',
  '用过才知道什么是真正的...',
  '有些东西，一旦用过就回不去了',
  '品质生活，从选择开始',
  '聪明的女人/男人都知道...',
  '真正的改变，从一个决定开始',
  '不是所有...都值得拥有',
  '懂得生活的人，都明白这个道理',
  '与其犹豫，不如行动',
];

/**
 * 从数组中随机选择一个元素
 */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 从数组中随机选择N个不重复的元素
 */
function randomPickMultiple<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 生成随机数
 */
function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成差异化指令
 */
export function generateDiversityInstructions(): string {
  const hook = randomPick(HOOK_TYPES);
  const hookExample = randomPick(hook.examples);
  
  const angle = randomPick(ANGLE_TYPES);
  const style = randomPick(STYLE_TYPES);
  const cta = randomPick(CTA_TYPES);
  const ctaExample = randomPick(cta.examples);
  
  const goldenSentence = randomPick(GOLDEN_SENTENCES);
  
  // 随机选择表达风格标记词
  const styleMarkers = randomPickMultiple(style.markers, 2);
  
  return `
═══════════════════════════════════════════════════════════════
【本次创作差异化要求】⚠️ 必须严格执行
═══════════════════════════════════════════════════════════════

【开场方式】使用「${hook.name}」
参考示例："${hookExample}"
注意：这是参考示例，请根据产品特点创新，不要照搬！

【切入角度】${angle.name} - ${angle.description}

【表达风格】${style.name} - ${style.description}
建议使用这些口语化表达：${styleMarkers.join('、')}
注意：自然融入，不要刻意堆砌

【结尾促单】使用「${cta.name}」
参考示例："${ctaExample}"

【金句植入】请在文案中自然植入以下金句或类似风格：
"${goldenSentence}"
注意：金句要自然融入，不要生硬插入

═══════════════════════════════════════════════════════════════

【差异化强调】
1. 本次生成必须与之前的文案有明显的表达差异
2. 不要使用套话模板，要用独特的视角和表达
3. 每句话都要有信息增量，避免空洞
4. 用词要丰富多样，避免重复使用相同的表达
5. 节奏要有变化，长短句交替，不要句式单一
`;
}

/**
 * 生成随机温度参数（0.85-1.0之间）
 */
export function getRandomTemperature(): number {
  return 0.85 + Math.random() * 0.15;
}

/**
 * 生成随机种子（用于增加多样性）
 */
export function generateRandomSeed(): string {
  const elements = [
    `创作编号：${Date.now().toString(36)}`,
    `风格代号：${randomPick(STYLE_TYPES).type}`,
    `角度代号：${randomPick(ANGLE_TYPES).type}`,
  ];
  return elements.join(' | ');
}

/**
 * 获取随机开头示例（用于指导模型）
 */
export function getRandomHookExample(): string {
  const hook = randomPick(HOOK_TYPES);
  const example = randomPick(hook.examples);
  return `${hook.name}：${example}`;
}

/**
 * 获取随机数据元素（增加真实感）
 */
export function getRandomDataElements(): { numbers: string[]; timeframes: string[] } {
  const numbers = [
    randomNumber(7, 30).toString(),
    randomNumber(100, 999).toString(),
    `${randomNumber(1, 9)}.${randomNumber(1, 9)}万`,
  ];
  
  const timeframes = [
    '坚持使用一周后',
    '用了半个月',
    '一个月后',
    '坚持了28天',
    '连续用了两周',
  ];
  
  return { numbers, timeframes };
}

/**
 * 生成差异化提醒（用于用户消息）
 */
export function generateDiversityReminder(): string {
  const reminders = [
    '请务必创作出与以往不同的全新表达，避免套路化',
    '这次要用一个全新的视角来写，不要走老路',
    '请打破常规，用创新的表达方式来呈现',
    '要有创意，不要千篇一律，让用户眼前一亮',
    '请用独特的表达方式，让这篇文案与众不同',
  ];
  
  return randomPick(reminders);
}
