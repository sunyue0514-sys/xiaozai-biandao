/**
 * 视频深度分析报告 - 统一类型定义
 * 
 * 版本说明：
 * - V1: 旧版结构（当前线上）
 * - V2: 新版结构（重构后，带时间戳证据）
 * 
 * 前端通过 _version 字段判断版本，选择对应的展示组件
 */

// ============================================
// 版本号
// ============================================
export const ANALYSIS_REPORT_VERSION = "2.0";

// ============================================
// 通用证据类型（支持字符串或对象格式）
// ============================================

/**
 * 证据对象格式（LLM 可能返回的格式）
 * LLM 有时会返回对象格式而不是字符串
 */
export interface EvidenceObject {
  timestamp?: string;
  originalText?: string;
  content?: string;
  [key: string]: unknown;
}

/**
 * 证据字段类型
 * 支持两种格式：
 * 1. 字符串：简单的文本证据
 * 2. 对象：带时间戳的详细证据 { timestamp, originalText }
 */
export type EvidenceField = string | EvidenceObject;

// ============================================
// 带时间戳的文案类型
// ============================================

/**
 * 单个文案片段（带时间戳）
 */
export interface ScriptSegment {
  text: string;           // 这一段的文字
  startTime: number;      // 开始时间（秒）
  endTime: number;        // 结束时间（秒）
}

/**
 * 完整文案数据（带时间戳）
 */
export interface TimestampedScript {
  fullText: string;                    // 完整文案（用于显示）
  segments: ScriptSegment[];           // 分段文案（带时间戳）
  duration: number;                    // 总时长（秒）
}

// ============================================
// V2: 新版分析报告结构
// ============================================

/**
 * 一、核心本质拆解
 */
export interface CoreEssenceV2 {
  coreEmotion: {
    primaryEmotion: string;                              // 主要情绪
    secondaryEmotion: string;                            // 次要情绪
    triggerMechanism: Array<{
      timestamp: string;                                 // 时间点，如 "0-5s"
      originalText: string;                              // 原文引用
      explanation: string;                               // 解释如何触发情绪
    }>;
    emotionalArc?: string;                               // 情绪曲线
  };
  coreDemand: {
    demandType: string;                                  // 需求类型
    demandLevel: '高' | '中' | '低';                     // 需求强度
    demandAnalysis: {
      targetPain: string;                                // 目标痛点
      contentSolution: string;                           // 视频提供的解决方案
      whyItWorks: string;                                // 为什么有效
    };
  };
  timingAnalysis: {
    trendBackground: string;                             // 趋势背景
    whyNow: string;                                      // 为什么现在能火
    timingScore?: number;                                // 时机评分（可选）
    timingReason?: string;                               // 时机原因（可选）
  };
}

/**
 * 二、数据深度归因
 */
export interface DataAttributionV2 {
  industryBenchmark: {
    thisVideo: {
      completionRate?: string;                           // 完播率
      likeRate: string;                                  // 点赞率
      commentRate: string;                               // 评论率
      shareRate: string;                                 // 分享率
      collectRate: string;                               // 收藏率
    };
    industryAvg: {
      completionRate?: string;
      likeRate: string;
      commentRate: string;
      shareRate: string;
      collectRate: string;
    };
    differenceAnalysis: string;                          // 差异原因分析
  };
  causalityChain: Array<{
    contentElement: string;                              // 内容元素（含时间戳）
    effect: string;                                      // 产生效果
    dataImpact: string;                                  // 数据影响
  }>;
  algorithmLogic: {
    recommendationTrigger: string;                       // 推荐触发点
    trafficStage: string;                                // 流量阶段
    warningSignal: string;                               // 预警信号
  };
}

/**
 * 三、用户画像拆解
 */
export interface UserPortraitV2 {
  targetAudience: {
    ageRange: string;                                    // 年龄段
    occupation: string;                                  // 职业/身份
    painProfile: string;                                 // 典型痛点画像（场景化）
    consumptionAbility: string;                          // 消费能力
  };
  painPoints: Array<{
    point: string;                                       // 痛点描述
    scenario: string;                                    // 具体场景
  }>;
  pleasurePoints: Array<{
    point: string;                                       // 爽点描述
    videoEvidence: EvidenceField;                        // 视频证据（支持字符串或对象格式）
  }>;
  userJourney: {
    awareness: string;                                   // 认知阶段
    interest: string;                                    // 兴趣阶段
    desire: string;                                      // 欲望阶段
    action: string;                                      // 行动阶段
    conversion: string;                                  // 转化阶段
  };
}

/**
 * 四、内容结构专属拆解
 */
export interface ContentStructureV2 {
  hookAnalysis: {
    hookType: string;                                    // 钩子类型
    originalText: EvidenceField;                         // 原文引用（支持字符串或对象格式）
    score: number;                                       // 评分 1-10
    effect: string;                                      // 效果分析
    improvement: string;                                 // 改进建议
  };
  bodyAnalysis: {
    structureType: string;                               // 结构类型
    rhythm: string;                                      // 节奏控制
    videoEvidence: Array<{
      timestamp: string;                                 // 时间戳
      content: string;                                   // 内容描述
    }>;
    score: number;                                       // 评分
    improvement: string;                                 // 改进建议
  };
  endingAnalysis: {
    endingType: string;                                  // 结尾类型
    originalText: EvidenceField;                         // 原文引用（支持字符串或对象格式）
    score: number;                                       // 评分
    effect: string;                                      // 效果分析
    improvement: string;                                 // 改进建议
  };
}

/**
 * 五、可复制方法论
 */
export interface CopyableMethodologyV2 {
  topicFormula: {
    template: string;                                    // 模板句式
    examples: string[];                                  // 示例（至少2个）
    keyElements: string[];                               // 关键要素
  };
  structureTemplate: {
    segments: Array<{
      timeRange: string;                                 // 时间范围
      stage: string;                                     // 阶段名称
      content: string;                                   // 内容描述
    }>;
    keyElements: string[];                               // 关键要素
  };
  checklist: string[];                                   // 必备清单（可打勾）
}

/**
 * 六、风险与避坑指南
 */
export interface RiskWarningV2 {
  contentRisks: Array<{
    riskPoint: string;                                   // 风险点
    evidence: string;                                    // 证据
    mitigation: string;                                  // 规避方式
  }>;
  copycatBoundaries: {
    canCopy: string[];                                   // 可复制
    cannotCopy: string[];                                // 不可复制
    adaptationTips: string;                              // 适配修改建议
  };
  complianceWarning: {
    sensitiveWords: string[];                            // 敏感词列表
    platformRisks: string[];                             // 平台规则风险
  };
}

/**
 * 七、变现转化拆解
 */
export interface MonetizationAnalysisV2 {
  monetizationPath: {
    primaryPath: string;                                 // 主要路径
    conversionFunnel: string;                            // 转化漏斗
  };
  conversionHooks: {
    inVideoHooks: string[];                              // 视频内转化点
    problems: string[];                                  // 存在问题
    optimizations: string[];                             // 优化建议
  };
  commercialPotential: {
    potentialScore: number;                              // 潜力评分 1-10
    suitableProducts: string[];                          // 适合产品
    estimatedConversionRate: string;                     // 预估转化率及依据
  };
}

/**
 * 完整的 V2 分析报告
 */
export interface AnalysisReportV2 {
  _version: "2.0";                                       // 版本标识
  
  // 视频基础信息
  videoInfo: {
    title: string;
    author: string;
    duration: number;                                    // 视频时长（秒）
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    collects: number;
    views: number;
  };
  
  // 带时间戳的文案
  scriptWithTimestamps?: TimestampedScript;
  
  // 脚本类型
  scriptType: {
    id: 'story' | 'process' | 'knowledge' | 'opinion';
    name: string;
    confidence: number;
    reason: string;
  };
  
  // 七大模块
  coreEssence: CoreEssenceV2;
  dataAttribution: DataAttributionV2;
  userPortrait: UserPortraitV2;
  contentStructure: ContentStructureV2;
  copyableMethodology: CopyableMethodologyV2;
  riskWarning: RiskWarningV2;
  monetizationAnalysis: MonetizationAnalysisV2;
}

// ============================================
// V1: 旧版分析报告结构（保持兼容）
// ============================================

export interface AnalysisReportV1 {
  // 一、核心本质拆解
  coreEssence: {
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
  };
  
  // 二、数据深度归因
  dataAttribution: {
    industryBenchmark: {
      collectRate: { thisVideo: string; industryAvg: string; analysis: string };
      shareRate: { thisVideo: string; industryAvg: string; analysis: string };
      commentRate: { thisVideo: string; industryAvg: string; analysis: string };
      likeRate?: { thisVideo: string; industryAvg: string; analysis: string };
    };
    causalityChain: Array<{
      element: string;
      effect: string;
      dataImpact: string;
    }>;
    algorithmLogic: {
      recommendationTrigger: string;
      trafficDistribution: string;
      warningSignal: string;
    };
  };
  
  // 三、用户画像拆解
  userPortrait: {
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
  };
  
  // 四、内容结构拆解
  contentStructure: {
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
  };
  
  // 五、可复制方法论
  copyableMethodology: {
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
  };
  
  // 六、风险与避坑指南
  riskWarning: {
    contentRisks: Array<{
      riskType: string;
      riskDescription: string;
      mitigation: string;
    }>;
    copycatBoundaries: {
      canCopy: string[];
      cannotCopy: string[];
      adaptationTips: string;
    };
    complianceWarning: {
      sensitiveWords: string;
      platformRules: string;
    };
  };
  
  // 七、变现转化拆解
  monetizationAnalysis: {
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
  };
}

// ============================================
// 联合类型 & 类型守卫
// ============================================

export type AnalysisReport = AnalysisReportV1 | AnalysisReportV2;

/**
 * 判断是否为 V2 版本报告
 */
export function isV2Report(report: AnalysisReport | null | undefined): report is AnalysisReportV2 {
  return report !== null && report !== undefined && (report as AnalysisReportV2)._version === "2.0";
}

/**
 * 判断是否为 V1 版本报告
 */
export function isV1Report(report: AnalysisReport | null | undefined): report is AnalysisReportV1 {
  return report !== null && report !== undefined && !isV2Report(report);
}

/**
 * 从 API 响应中检测版本并返回正确类型
 */
export function detectReportVersion(data: any): { isV2: boolean; report: AnalysisReport | null } {
  if (!data) {
    return { isV2: false, report: null };
  }
  
  // 检查是否有 _version 字段
  const version = data._version || data.analysisReport?._version;
  
  if (version === "2.0") {
    return { isV2: true, report: data.analysisReport || data };
  }
  
  return { isV2: false, report: data.analysisReport || data };
}

/**
 * 确保报告结构完整（V2 版本）
 */
export function ensureV2ReportStructure(data: any): AnalysisReportV2 {
  if (!data) {
    return getEmptyV2Report();
  }
  
  // 如果已经是 V2 格式，直接返回
  if (data._version === "2.0") {
    return data;
  }
  
  // 尝试从 V1 转换到 V2
  return convertV1ToV2(data);
}

/**
 * 获取空的 V2 报告
 */
function getEmptyV2Report(): AnalysisReportV2 {
  return {
    _version: "2.0",
    videoInfo: {
      title: '',
      author: '',
      duration: 0,
      platform: '',
      likes: 0,
      comments: 0,
      shares: 0,
      collects: 0,
      views: 0,
    },
    scriptType: {
      id: 'knowledge',
      name: '教知识',
      confidence: 0.5,
      reason: '默认类型',
    },
    coreEssence: {
      coreEmotion: {
        primaryEmotion: '未知',
        secondaryEmotion: '未知',
        triggerMechanism: [],
      },
      coreDemand: {
        demandType: '学习',
        demandLevel: '中',
        demandAnalysis: {
          targetPain: '',
          contentSolution: '',
          whyItWorks: '',
        },
      },
      timingAnalysis: {
        trendBackground: '',
        whyNow: '',
      },
    },
    dataAttribution: {
      industryBenchmark: {
        thisVideo: {
          likeRate: '0%',
          commentRate: '0%',
          shareRate: '0%',
          collectRate: '0%',
        },
        industryAvg: {
          likeRate: '5-8%',
          commentRate: '5-10%',
          shareRate: '8-12%',
          collectRate: '15-20%',
        },
        differenceAnalysis: '',
      },
      causalityChain: [],
      algorithmLogic: {
        recommendationTrigger: '',
        trafficStage: '',
        warningSignal: '',
      },
    },
    userPortrait: {
      targetAudience: {
        ageRange: '',
        occupation: '',
        painProfile: '',
        consumptionAbility: '',
      },
      painPoints: [],
      pleasurePoints: [],
      userJourney: {
        awareness: '',
        interest: '',
        desire: '',
        action: '',
        conversion: '',
      },
    },
    contentStructure: {
      hookAnalysis: {
        hookType: '',
        originalText: '',
        score: 5,
        effect: '',
        improvement: '',
      },
      bodyAnalysis: {
        structureType: '',
        rhythm: '',
        videoEvidence: [],
        score: 5,
        improvement: '',
      },
      endingAnalysis: {
        endingType: '',
        originalText: '',
        score: 5,
        effect: '',
        improvement: '',
      },
    },
    copyableMethodology: {
      topicFormula: {
        template: '',
        examples: [],
        keyElements: [],
      },
      structureTemplate: {
        segments: [],
        keyElements: [],
      },
      checklist: [],
    },
    riskWarning: {
      contentRisks: [],
      copycatBoundaries: {
        canCopy: [],
        cannotCopy: [],
        adaptationTips: '',
      },
      complianceWarning: {
        sensitiveWords: [],
        platformRisks: [],
      },
    },
    monetizationAnalysis: {
      monetizationPath: {
        primaryPath: '',
        conversionFunnel: '',
      },
      conversionHooks: {
        inVideoHooks: [],
        problems: [],
        optimizations: [],
      },
      commercialPotential: {
        potentialScore: 5,
        suitableProducts: [],
        estimatedConversionRate: '',
      },
    },
  };
}

/**
 * 从 V1 格式转换为 V2 格式
 */
function convertV1ToV2(v1: any): AnalysisReportV2 {
  const v2 = getEmptyV2Report();
  
  // 转换核心本质
  if (v1.coreEssence) {
    v2.coreEssence = {
      coreEmotion: {
        primaryEmotion: v1.coreEssence.coreEmotion?.primaryEmotion || '未知',
        secondaryEmotion: v1.coreEssence.coreEmotion?.secondaryEmotion || '未知',
        triggerMechanism: v1.coreEssence.coreEmotion?.triggerMechanism ? [{
          timestamp: '0-5s',
          originalText: v1.coreEssence.coreEmotion.triggerMechanism,
          explanation: '情绪触发机制',
        }] : [],
      },
      coreDemand: {
        demandType: v1.coreEssence.coreDemand?.demandType || '学习',
        demandLevel: (v1.coreEssence.coreDemand?.demandLevel?.includes('强') ? '高' : 
                     v1.coreEssence.coreDemand?.demandLevel?.includes('弱') ? '低' : '中') as '高' | '中' | '低',
        demandAnalysis: {
          targetPain: '',
          contentSolution: '',
          whyItWorks: v1.coreEssence.coreDemand?.demandAnalysis || '',
        },
      },
      timingAnalysis: {
        trendBackground: v1.coreEssence.timingAnalysis?.trendContext || '',
        whyNow: v1.coreEssence.timingAnalysis?.whyNow || '',
      },
    };
  }
  
  // 转换数据归因
  if (v1.dataAttribution) {
    const benchmark = v1.dataAttribution.industryBenchmark;
    v2.dataAttribution = {
      industryBenchmark: {
        thisVideo: {
          collectRate: benchmark?.collectRate?.thisVideo || '0%',
          shareRate: benchmark?.shareRate?.thisVideo || '0%',
          commentRate: benchmark?.commentRate?.thisVideo || '0%',
          likeRate: benchmark?.likeRate?.thisVideo || '0%',
        },
        industryAvg: {
          collectRate: benchmark?.collectRate?.industryAvg || '15-20%',
          shareRate: benchmark?.shareRate?.industryAvg || '8-12%',
          commentRate: benchmark?.commentRate?.industryAvg || '5-10%',
          likeRate: benchmark?.likeRate?.industryAvg || '5-8%',
        },
        differenceAnalysis: benchmark?.collectRate?.analysis || '',
      },
      causalityChain: (v1.dataAttribution.causalityChain || []).map((item: any) => ({
        contentElement: item.element || '',
        effect: item.effect || '',
        dataImpact: item.dataImpact || '',
      })),
      algorithmLogic: {
        recommendationTrigger: v1.dataAttribution.algorithmLogic?.recommendationTrigger || '',
        trafficStage: v1.dataAttribution.algorithmLogic?.trafficDistribution || '',
        warningSignal: v1.dataAttribution.algorithmLogic?.warningSignal || '',
      },
    };
  }
  
  // 转换用户画像
  if (v1.userPortrait) {
    v2.userPortrait = {
      targetAudience: v1.userPortrait.targetAudience || v2.userPortrait.targetAudience,
      painPoints: (v1.userPortrait.painPoints || []).map((p: string) => ({
        point: p,
        scenario: '',
      })),
      pleasurePoints: (v1.userPortrait.pleasurePoints || []).map((p: string) => ({
        point: p,
        videoEvidence: '',
      })),
      userJourney: v1.userPortrait.userJourney || v2.userPortrait.userJourney,
    };
  }
  
  // 转换内容结构
  if (v1.contentStructure) {
    v2.contentStructure = {
      hookAnalysis: {
        hookType: v1.contentStructure.hookAnalysis?.hookType || '',
        originalText: v1.contentStructure.hookAnalysis?.hookFormula || '',
        score: v1.contentStructure.hookAnalysis?.hookScore || 5,
        effect: v1.contentStructure.hookAnalysis?.hookEffect || '',
        improvement: v1.contentStructure.hookAnalysis?.improvementSuggestion || '',
      },
      bodyAnalysis: {
        structureType: v1.contentStructure.structureAnalysis?.structureType || '',
        rhythm: v1.contentStructure.structureAnalysis?.rhythmControl || '',
        videoEvidence: [],
        score: v1.contentStructure.structureAnalysis?.structureScore || 5,
        improvement: '',
      },
      endingAnalysis: {
        endingType: v1.contentStructure.endingAnalysis?.endingType || '',
        originalText: v1.contentStructure.endingAnalysis?.endingContent || '',
        score: v1.contentStructure.endingAnalysis?.endingScore || 5,
        effect: v1.contentStructure.endingAnalysis?.endingEffect || '',
        improvement: v1.contentStructure.endingAnalysis?.improvementSuggestion || '',
      },
    };
  }
  
  // 转换方法论
  if (v1.copyableMethodology) {
    v2.copyableMethodology = {
      topicFormula: {
        template: v1.copyableMethodology.topicFormula?.template || '',
        examples: v1.copyableMethodology.topicFormula?.examples || [],
        keyElements: v1.copyableMethodology.topicFormula?.keyElements || [],
      },
      structureTemplate: {
        segments: [],
        keyElements: v1.copyableMethodology.structureTemplate?.keyElements || [],
      },
      checklist: v1.copyableMethodology.checklist || [],
    };
  }
  
  // 转换风险
  if (v1.riskWarning) {
    v2.riskWarning = {
      contentRisks: (v1.riskWarning.contentRisks || []).map((r: any) => ({
        riskPoint: r.riskType || r.riskPoint || '',
        evidence: '',
        mitigation: r.mitigation || '',
      })),
      copycatBoundaries: v1.riskWarning.copycatBoundaries || v2.riskWarning.copycatBoundaries,
      complianceWarning: {
        sensitiveWords: v1.riskWarning.complianceWarning?.sensitiveWords?.split(/[,、，]/).filter(Boolean) || [],
        platformRisks: v1.riskWarning.complianceWarning?.platformRules?.split('，').filter(Boolean) || [],
      },
    };
  }
  
  // 转换变现
  if (v1.monetizationAnalysis) {
    v2.monetizationAnalysis = {
      monetizationPath: {
        primaryPath: v1.monetizationAnalysis.monetizationPath?.primaryPath || '',
        conversionFunnel: v1.monetizationAnalysis.monetizationPath?.conversionFunnel || '',
      },
      conversionHooks: {
        inVideoHooks: v1.monetizationAnalysis.conversionHooks?.inVideoHooks || [],
        problems: [],
        optimizations: v1.monetizationAnalysis.conversionHooks?.optimizationSuggestions || [],
      },
      commercialPotential: {
        potentialScore: v1.monetizationAnalysis.commercialPotential?.potentialScore || 5,
        suitableProducts: v1.monetizationAnalysis.commercialPotential?.suitableProducts || [],
        estimatedConversionRate: v1.monetizationAnalysis.commercialPotential?.conversionRateEstimate || '',
      },
    };
  }
  
  return v2;
}
