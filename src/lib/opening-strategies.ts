/**
 * 开篇策略配置模块
 * 定义6种差异化开篇策略及其提示词
 */

// 开篇策略类型
export type OpeningStrategy = 
  | 'precise_pain_naming'    // 精准命名痛点
  | 'strong_contrast'        // 制造强烈对比
  | 'negate_common_sense'    // 否定常识
  | 'voice_user_heart'       // 说出用户心声
  | 'rhetorical_question'    // 反问引发思考
  | 'reveal_essence';        // 揭示本质矛盾

// 策略配置接口
export interface StrategyConfig {
  id: OpeningStrategy;
  name: string;              // 策略名称
  shortName: string;         // 简称
  description: string;       // 策略描述
  technique: string;         // 核心技巧
  applicableScenarios: string[]; // 适用场景
  suitableFor: string;       // 一句话适合场景（用于展示）
  keyElements: string[];     // 关键要素
  examples: string[];        // 示例
  systemPrompt: string;      // 系统提示词
  scoringFocus: {            // 评分侧重
    predictionDisruption: number;  // 预测破坏权重
    rewardLoss: number;            // 奖励损失权重
    naming: number;                // 命名权重
  };
}

// 6种开篇策略配置
export const OPENING_STRATEGIES: Record<OpeningStrategy, StrategyConfig> = {
  precise_pain_naming: {
    id: 'precise_pain_naming',
    name: '精准命名痛点',
    shortName: '命名痛点',
    description: '把用户模糊的不满具体化，用一个精准的词或短语命名痛点',
    technique: '用"这就是XXX"的句式，把用户说不清的感受用一个词概括',
    applicableScenarios: [
      '用户有明确的不满但说不清楚',
      '行业存在普遍认知误区',
      '需要建立新认知框架',
    ],
    suitableFor: '让用户瞬间认同你的观点',
    keyElements: [
      '痛点要精准，一针见血',
      '命名要有传播力，便于记忆',
      '让用户产生"对，就是这样"的共鸣',
    ],
    examples: [
      '那些倒闭的餐厅啊，绝对不是因为味道不好，而是太想让所有人都满意了。',
      '你不是懒，你只是能量管理出了问题。',
      '你赚不到钱，不是能力不行，是认知有偏差。',
    ],
    systemPrompt: `你是一位短视频开篇创作专家，专门运用"精准命名痛点"策略。

【核心技巧】
把用户模糊的不满具体化，用一个精准的词或短语命名痛点，让用户产生强烈共鸣。

【创作要点】
1. 找出用户说不清但能感受到的痛点
2. 用简洁有力的词语给痛点命名
3. 让用户瞬间产生"对，就是这样"的认同感
4. 常用句式："...不是...而是..."、"...其实叫..."、"...就是..."

【输出规则】
- 直接输出开篇内容，30-50字
- 不使用Markdown格式符号
- 不使用emoji表情符号
- 语言自然口语化
- 一句话说完，留有悬念

请根据选题创作一个"精准命名痛点"式开篇。`,
    scoringFocus: {
      predictionDisruption: 3,
      rewardLoss: 2,
      naming: 5,
    },
  },

  strong_contrast: {
    id: 'strong_contrast',
    name: '制造强烈对比',
    shortName: '强烈对比',
    description: '通过强烈的对比制造冲击，打破用户预期',
    technique: '用A与B的强烈反差，制造视觉和认知的冲击力',
    applicableScenarios: [
      '有明显的对比素材',
      '需要打破固有认知',
      '强调选择的差异',
    ],
    suitableFor: '前3秒抓住用户注意力',
    keyElements: [
      '对比要强烈，反差明显',
      '两种选择要有代表性',
      '对比结果要出人意料',
    ],
    examples: [
      '网红店排队2小时，老店随到随吃，结果呢？网红店3个月倒闭，老店开了20年。',
      '月薪3000的天天加班，年薪百万的准点下班，差距在哪？',
      '同样做抖音，有人3个月涨粉100万，有人3年还是几百粉。',
    ],
    systemPrompt: `你是一位短视频开篇创作专家，专门运用"制造强烈对比"策略。

【核心技巧】
通过强烈的对比制造冲击，用A与B的反差打破用户预期，引发好奇。

【创作要点】
1. 选择两个有代表性的对比对象
2. 对比要强烈，反差明显
3. 对比结果要出人意料或有深刻洞察
4. 常用句式："A...B...结果呢？..."、"同样是...有人...有人..."

【输出规则】
- 直接输出开篇内容，30-50字
- 不使用Markdown格式符号
- 不使用emoji表情符号
- 语言自然口语化
- 对比要简洁有力

请根据选题创作一个"制造强烈对比"式开篇。`,
    scoringFocus: {
      predictionDisruption: 5,
      rewardLoss: 2,
      naming: 3,
    },
  },

  negate_common_sense: {
    id: 'negate_common_sense',
    name: '否定常识',
    shortName: '否定常识',
    description: '颠覆用户固有认知，用反直觉观点吸引注意',
    technique: '先说一个大众认同的观点，然后直接否定，给出意外结论',
    applicableScenarios: [
      '行业存在普遍误区',
      '需要颠覆传统认知',
      '有反直觉的洞察',
    ],
    suitableFor: '打破用户固有认知，制造好奇',
    keyElements: [
      '开篇要引用大众认知',
      '否定要果断有力',
      '新观点要有说服力',
    ],
    examples: [
      '你以为是味道不好让店倒闭的？其实是这个——太想让所有人都满意。',
      '大家都说要努力才能成功，但真相是：努力只是标配，选择才是关键。',
      '很多人觉得省钱能致富，错了，省钱只会让你越来越穷。',
    ],
    systemPrompt: `你是一位短视频开篇创作专家，专门运用"否定常识"策略。

【核心技巧】
颠覆用户固有认知，先说一个大众认同的观点，然后直接否定，给出意外结论。

【创作要点】
1. 开篇引用大众普遍认同的观点
2. 用果断有力的方式否定
3. 给出意想不到但有说服力的新观点
4. 常用句式："你以为...？其实是..."、"大家都觉得...但真相是..."、"很多人认为...错了..."

【输出规则】
- 直接输出开篇内容，30-50字
- 不使用Markdown格式符号
- 不使用emoji表情符号
- 语言自然口语化
- 否定要干脆利落

请根据选题创作一个"否定常识"式开篇。`,
    scoringFocus: {
      predictionDisruption: 5,
      rewardLoss: 2,
      naming: 3,
    },
  },

  voice_user_heart: {
    id: 'voice_user_heart',
    name: '说出用户心声',
    shortName: '用户心声',
    description: '直接说出用户想说但没说出的话，制造强烈共鸣',
    technique: '站在用户角度，说出他们内心深处的感受和想法',
    applicableScenarios: [
      '用户有强烈情绪',
      '需要建立情感连接',
      '强化人设认同',
    ],
    suitableFor: '建立情感共鸣，拉近距离',
    keyElements: [
      '要说用户真正想说的话',
      '用第一人称或第二人称',
      '要有情感温度',
    ],
    examples: [
      '说实话，看到那些网红店排队，我就想笑，因为我知道他们根本不懂什么是好吃的。',
      '每次看到那些教你成功的课，我就想问：你自己成功了吗？',
      '我知道你也想改变，但就是不知道从哪开始，对吧？',
    ],
    systemPrompt: `你是一位短视频开篇创作专家，专门运用"说出用户心声"策略。

【核心技巧】
直接说出用户想说但没说出的话，站在用户角度表达内心感受，制造强烈共鸣。

【创作要点】
1. 找到用户想说但没说的话
2. 用第一人称或第二人称表达
3. 要有情感温度，不说教
4. 常用句式："说实话..."、"每次看到...我就..."、"我知道你也..."

【输出规则】
- 直接输出开篇内容，30-50字
- 不使用Markdown格式符号
- 不使用emoji表情符号
- 语言自然口语化
- 情感要真实不做作

请根据选题创作一个"说出用户心声"式开篇。`,
    scoringFocus: {
      predictionDisruption: 2,
      rewardLoss: 5,
      naming: 3,
    },
  },

  rhetorical_question: {
    id: 'rhetorical_question',
    name: '反问引发思考',
    shortName: '反问思考',
    description: '用反问句引导用户自己得出结论，增强参与感',
    technique: '抛出一个击中痛点的问题，让用户在思考中产生共鸣',
    applicableScenarios: [
      '需要用户参与思考',
      '问题本身就是痛点',
      '引导用户自我反思',
    ],
    suitableFor: '引发用户思考，增强参与感',
    keyElements: [
      '问题要击中痛点',
      '不需要用户回答，而是引发思考',
      '问题背后要有洞察',
    ],
    examples: [
      '为什么你明明很努力，却还是赚不到钱？',
      '你有没有想过，为什么那些看起来没你聪明的人，却比你成功？',
      '同样是24小时，为什么有人能做完很多事，你却总是忙不完？',
    ],
    systemPrompt: `你是一位短视频开篇创作专家，专门运用"反问引发思考"策略。

【核心技巧】
用反问句抛出一个击中痛点的问题，引导用户自己思考，增强参与感。

【创作要点】
1. 问题要击中用户痛点
2. 问题背后要有深刻洞察
3. 不需要用户回答，而是引发思考
4. 常用句式："为什么...却...？"、"你有没有想过...？"、"同样是...为什么..."

【输出规则】
- 直接输出开篇内容，30-50字
- 不使用Markdown格式符号
- 不使用emoji表情符号
- 语言自然口语化
- 问题要有穿透力

请根据选题创作一个"反问引发思考"式开篇。`,
    scoringFocus: {
      predictionDisruption: 4,
      rewardLoss: 3,
      naming: 3,
    },
  },

  reveal_essence: {
    id: 'reveal_essence',
    name: '揭示本质矛盾',
    shortName: '揭示本质',
    description: '一针见血指出问题本质，展现深刻洞察',
    technique: '透过现象看本质，用一句话点明核心矛盾',
    applicableScenarios: [
      '有深层洞察',
      '需要建立专业形象',
      '话题有复杂性',
    ],
    suitableFor: '展现专业洞察，建立信任',
    keyElements: [
      '洞察要深刻独到',
      '一针见血，直击本质',
      '让用户产生顿悟感',
    ],
    examples: [
      '所有的选择困难症，本质上都是因为你想两全其美。',
      '你焦虑的根源不是事情太多，而是你想同时把所有事都做好。',
      '大多数人努力的方向错了——他们在用战术上的勤奋，掩盖战略上的懒惰。',
    ],
    systemPrompt: `你是一位短视频开篇创作专家，专门运用"揭示本质矛盾"策略。

【核心技巧】
透过现象看本质，用一句话点明问题的核心矛盾，展现深刻洞察。

【创作要点】
1. 找出表象背后的本质
2. 洞察要深刻独到
3. 一针见血，直击要害
4. 常用句式："...的本质是..."、"...根源不在于...而在于..."、"所有...都是因为..."

【输出规则】
- 直接输出开篇内容，30-50字
- 不使用Markdown格式符号
- 不使用emoji表情符号
- 语言自然口语化
- 洞察要有穿透力

请根据选题创作一个"揭示本质矛盾"式开篇。`,
    scoringFocus: {
      predictionDisruption: 3,
      rewardLoss: 2,
      naming: 5,
    },
  },
};

// 获取所有策略列表
export function getAllStrategies(): StrategyConfig[] {
  return Object.values(OPENING_STRATEGIES);
}

// 获取指定策略
export function getStrategy(id: OpeningStrategy): StrategyConfig | undefined {
  return OPENING_STRATEGIES[id];
}

// 获取策略的系统提示词
export function getStrategyPrompt(id: OpeningStrategy): string {
  return OPENING_STRATEGIES[id]?.systemPrompt || '';
}

// 脚本类型映射
export const SCRIPT_TYPE_LABELS: Record<string, string> = {
  story: '讲故事',
  process: '晒过程',
  knowledge: '教知识',
  opinion: '说观点',
  product: '说产品',
};
