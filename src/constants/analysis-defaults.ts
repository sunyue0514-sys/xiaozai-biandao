/**
 * 视频深度分析 - 默认配置（七大模块结构）
 * 
 * 统一管理前后端默认值，避免多处维护导致不一致
 * 前端 page.tsx 和后端 route.ts 都应该从这里导入
 * 
 * 从"形式拆解"升级为"本质归因"
 */

// 核心本质拆解类型
export interface CoreEssence {
  coreEmotion: {
    primaryEmotion: string;
    secondaryEmotion: string;
    triggerMechanism: string;
  };
  coreDemand: {
    demandType: string;
    demandLevel: string;
    demandAnalysis: string;
  };
  timingAnalysis: {
    whyNow: string;
    trendContext: string;
  };
}

// 数据深度归因类型
export interface DataAttribution {
  industryBenchmark: {
    collectRate: { thisVideo: string; industryAvg: string; analysis: string };
    shareRate: { thisVideo: string; industryAvg: string; analysis: string };
    commentRate: { thisVideo: string; industryAvg: string; analysis: string };
  };
  causalityChain: {
    element: string;
    effect: string;
    dataImpact: string;
  }[];
  algorithmLogic: {
    recommendationTrigger: string;
    trafficDistribution: string;
    warningSignal: string;
  };
}

// 用户画像拆解类型
export interface UserPortrait {
  targetAudience: {
    ageRange: string;
    occupation: string;
    painProfile: string;
    consumptionAbility: string;
  };
  painPoints: string[];
  pleasurePoints: string[];
  userJourney: {
    awareness: string;
    interest: string;
    desire: string;
    action: string;
    conversion: string;
  };
}

// 内容结构拆解类型
export interface ContentStructure {
  hookAnalysis: {
    hookType: string;
    hookFormula: string;
    hookScore: number;
    hookEffect: string;
    improvementSuggestion: string;
  };
  structureAnalysis: {
    structureType: string;
    structureFormula: string;
    rhythmControl: string;
    infoDensity: string;
    structureScore: number;
  };
  endingAnalysis: {
    endingType: string;
    endingContent: string;
    endingScore: number;
    endingEffect: string;
    improvementSuggestion: string;
  };
}

// 可复制方法论类型
export interface CopyableMethodology {
  topicFormula: {
    template: string;
    examples: string[];
    keyElements: string[];
  };
  structureTemplate: {
    template: string;
    timeAllocation: string;
    keyElements: string[];
  };
  checklist: string[];
}

// 风险与避坑指南类型
export interface RiskWarning {
  contentRisks: {
    riskType: string;
    riskDescription: string;
    mitigation: string;
  }[];
  copycatBoundaries: {
    canCopy: string[];
    cannotCopy: string[];
    adaptationTips: string;
  };
  complianceWarning: {
    sensitiveWords: string;
    platformRules: string;
  };
}

// 变现转化拆解类型
export interface MonetizationAnalysis {
  monetizationPath: {
    primaryPath: string;
    pathDescription: string;
    conversionFunnel: string;
  };
  conversionHooks: {
    inVideoHooks: string[];
    optimizationSuggestions: string[];
  };
  commercialPotential: {
    potentialScore: number;
    suitableProducts: string[];
    conversionRateEstimate: string;
  };
}

// 完整的分析报告类型（七大模块）
export interface AnalysisReportDefaults {
  coreEssence: CoreEssence;
  dataAttribution: DataAttribution;
  userPortrait: UserPortrait;
  contentStructure: ContentStructure;
  copyableMethodology: CopyableMethodology;
  riskWarning: RiskWarning;
  monetizationAnalysis: MonetizationAnalysis;
}

/**
 * 默认分析报告（七大模块）
 * 
 * 所有字段都有有意义的默认值
 * 这样即使 LLM 返回不完整的 JSON，用户也能看到有用的内容
 */
export const DEFAULT_ANALYSIS_REPORT: AnalysisReportDefaults = {
  // 一、核心本质拆解
  coreEssence: {
    coreEmotion: {
      primaryEmotion: '好奇心',
      secondaryEmotion: '获得感',
      triggerMechanism: '通过标题和内容激发用户探索欲'
    },
    coreDemand: {
      demandType: '学习需求',
      demandLevel: '中需求',
      demandAnalysis: '内容解决用户获取信息或知识的需求'
    },
    timingAnalysis: {
      whyNow: '内容符合当前用户关注点',
      trendContext: '该类型内容在平台有一定需求'
    }
  },
  
  // 二、数据深度归因
  dataAttribution: {
    industryBenchmark: {
      collectRate: { thisVideo: '0%', industryAvg: '15-20%', analysis: '收藏率处于正常水平' },
      shareRate: { thisVideo: '0%', industryAvg: '8-12%', analysis: '分享率处于正常水平' },
      commentRate: { thisVideo: '0%', industryAvg: '5-10%', analysis: '评论率处于正常水平' }
    },
    causalityChain: [
      { element: '内容质量', effect: '用户获得价值', dataImpact: '影响收藏率' }
    ],
    algorithmLogic: {
      recommendationTrigger: '基于互动数据进行推荐',
      trafficDistribution: '内容进入正常流量池',
      warningSignal: '暂无明显风险'
    }
  },
  
  // 三、用户画像拆解
  userPortrait: {
    targetAudience: {
      ageRange: '18-35岁',
      occupation: '内容消费者',
      painProfile: '寻求有价值的内容',
      consumptionAbility: '中等'
    },
    painPoints: ['信息获取需求', '娱乐或学习需求'],
    pleasurePoints: ['获得有价值信息', '内容满足需求'],
    userJourney: {
      awareness: '通过推荐或搜索发现',
      interest: '标题吸引点击',
      desire: '内容产生价值感',
      action: '可能的互动行为',
      conversion: '持续关注或转化'
    }
  },
  
  // 四、内容结构拆解
  contentStructure: {
    hookAnalysis: {
      hookType: '信息型钩子',
      hookFormula: '标题传达核心价值',
      hookScore: 7,
      hookEffect: '吸引用户点击观看',
      improvementSuggestion: '可在开头增加更具冲击力的表达'
    },
    structureAnalysis: {
      structureType: '信息传递型',
      structureFormula: '开场 → 内容 → 结尾',
      rhythmControl: '节奏适中',
      infoDensity: '信息密度中等',
      structureScore: 7
    },
    endingAnalysis: {
      endingType: '总结型',
      endingContent: '内容自然收尾',
      endingScore: 7,
      endingEffect: '用户获得完整信息',
      improvementSuggestion: '可增加互动引导'
    }
  },
  
  // 五、可复制方法论
  copyableMethodology: {
    topicFormula: {
      template: '[领域] + [价值点] 的内容结构',
      examples: ['分享该领域的实用知识', '提供解决用户问题的方法'],
      keyElements: ['清晰的主题', '有价值的内容', '良好的表达']
    },
    structureTemplate: {
      template: '开场引入 → 核心内容 → 总结收尾',
      timeAllocation: '开场10-15秒，核心内容为主，收尾5-10秒',
      keyElements: ['吸引人的开场', '有价值的内容', '清晰的结尾']
    },
    checklist: ['标题传达核心价值', '内容有实质信息', '表达清晰流畅']
  },
  
  // 六、风险与避坑指南
  riskWarning: {
    contentRisks: [
      { riskType: '内容同质化', riskDescription: '该类型内容较多', mitigation: '增加个人特色和差异化' }
    ],
    copycatBoundaries: {
      canCopy: ['内容结构', '表达方式'],
      cannotCopy: ['原创观点', '个人特色'],
      adaptationTips: '结合自身领域特点进行适配'
    },
    complianceWarning: {
      sensitiveWords: '暂无',
      platformRules: '遵守平台内容规范'
    }
  },
  
  // 七、变现转化拆解
  monetizationAnalysis: {
    monetizationPath: {
      primaryPath: '内容变现',
      pathDescription: '通过优质内容获取流量和关注',
      conversionFunnel: '观看 → 关注 → 持续互动 → 转化'
    },
    conversionHooks: {
      inVideoHooks: ['内容价值吸引', '持续更新引导'],
      optimizationSuggestions: ['可增加关注引导', '可设置互动钩子']
    },
    commercialPotential: {
      potentialScore: 6,
      suitableProducts: ['知识付费', '内容服务', '相关产品推广'],
      conversionRateEstimate: '基于内容质量和受众匹配度评估'
    }
  }
};

/**
 * 深度合并两个对象，确保嵌套对象也被正确合并
 * 用于合并 LLM 返回的部分数据与默认值
 */
export function deepMergeWithDefaults<T extends Record<string, any>>(
  partial: Partial<T> | undefined,
  defaults: T
): T {
  if (!partial) return defaults;

  const result = { ...defaults };

  for (const key of Object.keys(partial) as (keyof T)[]) {
    const partialValue = partial[key];
    const defaultValue = defaults[key];

    if (
      partialValue !== undefined &&
      partialValue !== null &&
      typeof partialValue === 'object' &&
      !Array.isArray(partialValue) &&
      typeof defaultValue === 'object' &&
      !Array.isArray(defaultValue)
    ) {
      // 递归合并嵌套对象
      result[key] = deepMergeWithDefaults(
        partialValue as Record<string, any>,
        defaultValue as Record<string, any>
      ) as T[keyof T];
    } else if (Array.isArray(partialValue) && Array.isArray(defaultValue)) {
      // 对于数组，如果部分值非空则使用部分值
      result[key] = (partialValue.length > 0 ? partialValue : defaultValue) as T[keyof T];
    } else if (partialValue !== undefined) {
      if (typeof partialValue === 'string' && typeof defaultValue === 'string') {
        // 对于字符串，如果为空则使用默认值
        result[key] = (partialValue.trim() !== '' ? partialValue : defaultValue) as T[keyof T];
      } else {
        result[key] = partialValue as T[keyof T];
      }
    }
  }

  return result;
}
