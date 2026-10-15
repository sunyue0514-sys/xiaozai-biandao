/**
 * 创作分析模块
 * 用于生成选题分析、目标人群画像、四点分析等创作策略指导
 */

// 创作分析结果接口
export interface OpeningAnalysis {
  topicAnalysis: TopicAnalysis;      // 选题分析
  targetAudience: TargetAudience;    // 目标人群画像
  fourPoints: FourPointsAnalysis;    // 四点分析
  videoType: VideoTypeAnalysis;      // 视频类型
  openingDirections: string[];       // 开篇方向建议
}

// 选题分析
export interface TopicAnalysis {
  type: string;          // 选题类型，如"反差对比选题"
  focus: string;         // 聚焦领域
  value: string[];       // 选题价值点
}

// 目标人群画像
export interface TargetAudience {
  demographic: string;   // 人口统计特征
  behaviors: string[];   // 行为特征
  attitudes: string[];   // 态度倾向
}

// 四点分析
export interface FourPointsAnalysis {
  needs: string;         // 需求：用户想要什么
  painPoints: string;    // 痛点：用户困扰什么
  pleasurePoints: string; // 爽点：用户爽在哪里
  itchPoints: string;    // 痒点：用户向往什么
}

// 视频类型分析
export interface VideoTypeAnalysis {
  types: string[];       // 视频类型列表
  features: string[];    // 类型特点
}

// 选题类型识别规则
const TOPIC_TYPE_PATTERNS: Array<{
  type: string;
  keywords: string[];
  description: string;
}> = [
  {
    type: '反差对比选题',
    keywords: ['vs', '对比', '差距', '不同', '区别', '网红', '老店', '月薪', '年薪'],
    description: '通过两个事物的强烈对比，制造认知冲击',
  },
  {
    type: '痛点解决选题',
    keywords: ['怎么办', '如何解决', '为什么', '困扰', '烦恼', '问题'],
    description: '针对用户痛点提供解决方案',
  },
  {
    type: '认知颠覆选题',
    keywords: ['其实', '真相', '误区', '错误', '不对', '假'],
    description: '颠覆大众固有认知，提供新视角',
  },
  {
    type: '技能干货选题',
    keywords: ['方法', '技巧', '教程', '怎么', '如何', '步骤'],
    description: '提供可操作的技能知识',
  },
  {
    type: '故事情感选题',
    keywords: ['经历', '故事', '那年', '曾经', '那一刻'],
    description: '通过故事引发情感共鸣',
  },
  {
    type: '观点态度选题',
    keywords: ['觉得', '认为', '观点', '看法', '态度'],
    description: '表达鲜明观点，引发讨论',
  },
];

/**
 * 分析选题类型
 */
export function analyzeTopicType(topic: string): TopicAnalysis {
  // 匹配选题类型
  for (const pattern of TOPIC_TYPE_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (topic.includes(keyword)) {
        return {
          type: pattern.type,
          focus: `聚焦"${topic}"相关话题`,
          value: [
            '有共鸣：内容贴近用户生活',
            '有话题性：容易引发讨论',
            '有价值：能提供实际帮助',
          ],
        };
      }
    }
  }
  
  // 默认类型
  return {
    type: '通用选题',
    focus: `聚焦"${topic}"相关话题`,
    value: [
      '内容有价值',
      '有传播潜力',
    ],
  };
}

/**
 * 分析目标人群
 */
export function analyzeTargetAudience(topic: string): TargetAudience {
  // 根据话题关键词推断人群特征
  const topicLower = topic.toLowerCase();
  
  // 职场相关
  if (/职场|工作|老板|同事|薪资|升职|加班/.test(topicLower)) {
    return {
      demographic: '25-40岁职场人群',
      behaviors: [
        '每天工作8小时以上',
        '有职场焦虑和困惑',
        '希望通过努力改变现状',
      ],
      attitudes: [
        '看重职业发展',
        '反感职场内卷',
        '期待工作生活平衡',
      ],
    };
  }
  
  // 创业/赚钱相关
  if (/创业|赚钱|副业|项目|生意/.test(topicLower)) {
    return {
      demographic: '25-45岁有创业意向或副业需求的人群',
      behaviors: [
        '关注赚钱机会',
        '尝试过多种副业',
        '对项目有筛选意识',
      ],
      attitudes: [
        '渴望财务自由',
        '反感割韭菜',
        '期待真实可行的方案',
      ],
    };
  }
  
  // 消费/生活相关
  if (/餐厅|美食|网红|购物|消费/.test(topicLower)) {
    return {
      demographic: '20-40岁城市消费人群',
      behaviors: [
        '经常外出就餐或网购',
        '有踩雷经历',
        '看重性价比',
      ],
      attitudes: [
        '反感过度营销',
        '追求真实体验',
        '期待靠谱推荐',
      ],
    };
  }
  
  // 个人成长相关
  if (/成长|学习|提升|改变|习惯/.test(topicLower)) {
    return {
      demographic: '20-35岁自我提升意识强的人群',
      behaviors: [
        '有学习习惯',
        '关注个人成长',
        '愿意为知识付费',
      ],
      attitudes: [
        '追求进步',
        '反感鸡汤',
        '期待可执行方法',
      ],
    };
  }
  
  // 默认人群
  return {
    demographic: '对话题感兴趣的普遍人群',
    behaviors: [
      '关注相关话题',
      '有获取信息的需求',
    ],
    attitudes: [
      '期待有价值的内容',
    ],
  };
}

/**
 * 四点分析
 */
export function analyzeFourPoints(topic: string, targetAudience: TargetAudience): FourPointsAnalysis {
  const topicLower = topic.toLowerCase();
  
  // 职场相关
  if (/职场|工作|老板|同事|薪资|升职|加班/.test(topicLower)) {
    return {
      needs: '想要职场顺利、升职加薪、工作生活平衡',
      painPoints: '被PUA、加班太多、职场内卷、领导难搞',
      pleasurePoints: '被认可、能力提升、拿到结果、升职加薪',
      itchPoints: '想成为职场高手、实现财务自由',
    };
  }
  
  // 创业/赚钱相关
  if (/创业|赚钱|副业|项目|生意/.test(topicLower)) {
    return {
      needs: '想找到靠谱的赚钱方式、实现副业增收',
      painPoints: '被割韭菜、项目不靠谱、没有方向、信息差',
      pleasurePoints: '赚到钱、找到好项目、获得真实信息',
      itchPoints: '想成为有钱人、实现财务自由',
    };
  }
  
  // 消费/生活相关
  if (/餐厅|美食|网红|购物|消费/.test(topicLower)) {
    return {
      needs: '想找到好吃好用的东西、物有所值',
      painPoints: '被网红推荐坑过、踩雷经历、浪费钱',
      pleasurePoints: '发现宝藏、省钱省心、被种草成功',
      itchPoints: '想成为有品位的消费者、不被忽悠',
    };
  }
  
  // 个人成长相关
  if (/成长|学习|提升|改变|习惯/.test(topicLower)) {
    return {
      needs: '想要改变现状、提升自己、获得成长',
      painPoints: '知道但做不到、缺乏动力、没有方法',
      pleasurePoints: '真的改变、获得正向反馈、看到进步',
      itchPoints: '想成为更好的自己、实现人生目标',
    };
  }
  
  // 默认分析
  return {
    needs: `想了解"${topic}"相关信息和解决方案`,
    painPoints: '信息过载、难以选择、担心踩坑',
    pleasurePoints: '获得有价值的信息、找到解决方案',
    itchPoints: '想成为该领域的懂行人',
  };
}

/**
 * 分析视频类型
 */
export function analyzeVideoType(topic: string): VideoTypeAnalysis {
  const topicLower = topic.toLowerCase();
  
  // 根据话题判断视频类型
  if (/观点|认为|觉得|看法/.test(topicLower)) {
    return {
      types: ['人设型', '流量型'],
      features: ['表达观点立人设', '话题性强引共鸣讨论'],
    };
  }
  
  if (/方法|技巧|教程|怎么|如何|步骤/.test(topicLower)) {
    return {
      types: ['干货型', '知识型'],
      features: ['提供实用价值', '建立专业形象'],
    };
  }
  
  if (/故事|经历|曾经|那年/.test(topicLower)) {
    return {
      types: ['故事型', '情感型'],
      features: ['引发情感共鸣', '建立人设连接'],
    };
  }
  
  // 默认
  return {
    types: ['人设型', '流量型'],
    features: ['表达观点立人设', '话题性强引共鸣讨论'],
  };
}

/**
 * 生成开篇方向建议
 */
export function generateOpeningDirections(fourPoints: FourPointsAnalysis): string[] {
  return [
    `精准命名痛点：把"${fourPoints.painPoints.slice(0, 10)}"具体化`,
    '制造强烈对比：用反差打破用户预期',
    '否定常识：颠覆大众固有认知',
    `说出用户心声：站在用户角度表达"${fourPoints.needs.slice(0, 10)}"`,
    '反问引发思考：用问题击中痛点',
    '揭示本质矛盾：一针见血指出问题核心',
  ];
}

/**
 * 综合创作分析
 */
export function analyzeOpeningCreation(topic: string): OpeningAnalysis {
  const topicAnalysis = analyzeTopicType(topic);
  const targetAudience = analyzeTargetAudience(topic);
  const fourPoints = analyzeFourPoints(topic, targetAudience);
  const videoType = analyzeVideoType(topic);
  const openingDirections = generateOpeningDirections(fourPoints);
  
  return {
    topicAnalysis,
    targetAudience,
    fourPoints,
    videoType,
    openingDirections,
  };
}

/**
 * 将分析结果转换为可读文本
 */
export function formatAnalysisForDisplay(analysis: OpeningAnalysis): string {
  const parts: string[] = [];
  
  // 选题分析
  parts.push(`【选题分析】`);
  parts.push(`类型：${analysis.topicAnalysis.type}`);
  parts.push(`聚焦：${analysis.topicAnalysis.focus}`);
  parts.push(`价值：${analysis.topicAnalysis.value.join('、')}`);
  parts.push('');
  
  // 目标人群
  parts.push(`【目标人群】`);
  parts.push(`画像：${analysis.targetAudience.demographic}`);
  if (analysis.targetAudience.behaviors.length > 0) {
    parts.push(`行为：${analysis.targetAudience.behaviors.join('、')}`);
  }
  if (analysis.targetAudience.attitudes.length > 0) {
    parts.push(`态度：${analysis.targetAudience.attitudes.join('、')}`);
  }
  parts.push('');
  
  // 四点分析
  parts.push(`【四点分析】`);
  parts.push(`需求：${analysis.fourPoints.needs}`);
  parts.push(`痛点：${analysis.fourPoints.painPoints}`);
  parts.push(`爽点：${analysis.fourPoints.pleasurePoints}`);
  parts.push(`痒点：${analysis.fourPoints.itchPoints}`);
  
  return parts.join('\n');
}
