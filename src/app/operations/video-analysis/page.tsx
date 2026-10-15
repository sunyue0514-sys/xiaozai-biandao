'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DEFAULT_ANALYSIS_REPORT } from '@/constants/analysis-defaults';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import { 
  Video, 
  Loader2, 
  ArrowLeft,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Copy,
  CheckCircle,
  Zap,
  Play,
  FileText,
  Target,
  Users,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  Award,
  AlertTriangle,
  ChevronRight,
  Clock,
  Sparkles,
  History,
  Download,
  FileSpreadsheet,
  Flame,
  BarChart3,
  Heart,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

// 导入V2组件和类型检测函数
import { 
  CoreEssenceCardV2, 
  DataAttributionCardV2, 
  CopyableMethodologyCardV2,
  RiskWarningCardV2,
  UserPortraitCardV2,
  ContentStructureCardV2,
  MonetizationCardV2
} from '@/components/analysis-v2';
import { isV2Report, ensureV2ReportStructure } from '@/types/analysis-report';
import type { AnalysisReportV2, AnalysisReportV1 } from '@/types/analysis-report';

// 格式化数字
function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// 平台名称映射
const PLATFORM_NAMES: Record<string, string> = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  weibo: '微博',
};

// 七大模块深度分析报告接口（本质归因）
interface AnalysisReport {
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

// 分析结果接口（兼容V1和V2）
interface AnalysisResult {
  _version?: "2.0";  // 版本标识（V2新增）
  title: string;
  author: string;
  authorAvatar?: string;
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  views: number;
  cover: string;
  platform: string;
  platformName: string;
  scriptContent: string;
  scriptWithTimestamps?: {  // V2新增
    fullText: string;
    segments: Array<{
      text: string;
      startTime: number;
      endTime: number;
    }>;
    duration: number;
  };
  analysisReport: AnalysisReport | AnalysisReportV2;
}

// 默认报告结构（用于补全缺失字段）
// 计算互动比率
function calculateRelativeMetrics(likes: number, collects: number, shares: number, comments: number) {
  const safeLikes = likes || 1; // 避免除以0
  
  const collectRatio = ((collects || 0) / safeLikes * 100).toFixed(1);
  const shareRatio = ((shares || 0) / safeLikes * 100).toFixed(1);
  const commentRatio = ((comments || 0) / safeLikes * 100).toFixed(1);
  
  const getEvaluation = (ratio: number) => {
    if (ratio >= 40) return '优秀';
    if (ratio >= 15) return '良好';
    return '一般';
  };
  
  const getExplanation = (type: string, ratio: number) => {
    if (type === 'collect') {
      if (ratio >= 40) return '收藏率极高，内容实用性非常强';
      if (ratio >= 15) return '收藏率良好，内容有价值';
      return '收藏率一般，建议增强内容实用性';
    }
    if (type === 'share') {
      if (ratio >= 15) return '分享率极高，传播价值强';
      if (ratio >= 5) return '分享率良好，有传播潜力';
      return '分享率一般，建议增强传播点';
    }
    if (type === 'comment') {
      if (ratio >= 15) return '评论率极高，互动性强';
      if (ratio >= 5) return '评论率良好，有讨论价值';
      return '评论率一般，建议增加互动引导';
    }
    return '';
  };
  
  return {
    collectLikeRatio: {
      value: `${collectRatio}%`,
      evaluation: getEvaluation(parseFloat(collectRatio)),
      explanation: getExplanation('collect', parseFloat(collectRatio)),
    },
    shareLikeRatio: {
      value: `${shareRatio}%`,
      evaluation: getEvaluation(parseFloat(shareRatio) * 2.67), // 分享标准调整为15%
      explanation: getExplanation('share', parseFloat(shareRatio)),
    },
    commentLikeRatio: {
      value: `${commentRatio}%`,
      evaluation: getEvaluation(parseFloat(commentRatio) * 2.67), // 评论标准调整为15%
      explanation: getExplanation('comment', parseFloat(commentRatio)),
    },
  };
}

// 使用公共常量作为默认报告
const DEFAULT_REPORT: AnalysisReport = DEFAULT_ANALYSIS_REPORT as AnalysisReport;

// 确保报告结构完整（防止 undefined 错误）- 七大模块版本
function ensureReportStructure(data: any): AnalysisResult {
  if (!data) {
    return {
      title: '未知视频',
      author: '未知作者',
      likes: 0,
      comments: 0,
      shares: 0,
      collects: 0,
      views: 0,
      cover: '',
      platform: 'douyin',
      platformName: '抖音',
      scriptContent: '',
      analysisReport: DEFAULT_REPORT,
    };
  }

  // 确保 analysisReport 存在
  const report = data.analysisReport || DEFAULT_REPORT;
  
  // 检测版本：如果是 V2，直接深拷贝返回，保持 V2 结构不变
  // 增加类型安全检查，确保 V2 数据结构完整
  const isV2 = report._version === "2.0";
  if (isV2) {
    // V2 格式：确保数据完整性，防止组件渲染崩溃
    const safeReport = {
      ...report,
      // 确保数组字段不为空字符串或非数组
      coreEssence: {
        ...(report.coreEssence || {}),
        coreEmotion: {
          ...(report.coreEssence?.coreEmotion || {}),
          triggerMechanism: Array.isArray(report.coreEssence?.coreEmotion?.triggerMechanism) 
            ? report.coreEssence.coreEmotion.triggerMechanism 
            : [],
        },
      },
      coreDemand: {
        ...(report.coreEssence?.coreDemand || {}),
        demandAnalysis: {
          targetPain: report.coreEssence?.coreDemand?.demandAnalysis?.targetPain || '',
          contentSolution: report.coreEssence?.coreDemand?.demandAnalysis?.contentSolution || '',
          whyItWorks: report.coreEssence?.coreDemand?.demandAnalysis?.whyItWorks || '',
        },
      },
      dataAttribution: {
        ...(report.dataAttribution || {}),
        industryBenchmark: {
          thisVideo: {
            completionRate: report.dataAttribution?.industryBenchmark?.thisVideo?.completionRate || '0%',
            likeRate: report.dataAttribution?.industryBenchmark?.thisVideo?.likeRate || '0%',
            commentRate: report.dataAttribution?.industryBenchmark?.thisVideo?.commentRate || '0%',
            shareRate: report.dataAttribution?.industryBenchmark?.thisVideo?.shareRate || '0%',
            collectRate: report.dataAttribution?.industryBenchmark?.thisVideo?.collectRate || '0%',
          },
          industryAvg: {
            completionRate: report.dataAttribution?.industryBenchmark?.industryAvg?.completionRate || '0%',
            likeRate: report.dataAttribution?.industryBenchmark?.industryAvg?.likeRate || '5-8%',
            commentRate: report.dataAttribution?.industryBenchmark?.industryAvg?.commentRate || '5-10%',
            shareRate: report.dataAttribution?.industryBenchmark?.industryAvg?.shareRate || '8-12%',
            collectRate: report.dataAttribution?.industryBenchmark?.industryAvg?.collectRate || '15-20%',
          },
          differenceAnalysis: report.dataAttribution?.industryBenchmark?.differenceAnalysis || '',
        },
        causalityChain: Array.isArray(report.dataAttribution?.causalityChain) 
          ? report.dataAttribution.causalityChain 
          : [],
        algorithmLogic: {
          recommendationTrigger: report.dataAttribution?.algorithmLogic?.recommendationTrigger || '',
          trafficStage: report.dataAttribution?.algorithmLogic?.trafficStage || '',
          warningSignal: report.dataAttribution?.algorithmLogic?.warningSignal || '',
        },
      },
      userPortrait: {
        ...(report.userPortrait || {}),
        targetAudience: {
          ageRange: report.userPortrait?.targetAudience?.ageRange || '',
          occupation: report.userPortrait?.targetAudience?.occupation || '',
          painProfile: report.userPortrait?.targetAudience?.painProfile || '',
          consumptionAbility: report.userPortrait?.targetAudience?.consumptionAbility || '',
        },
        painPoints: Array.isArray(report.userPortrait?.painPoints) 
          ? report.userPortrait.painPoints 
          : [],
        pleasurePoints: Array.isArray(report.userPortrait?.pleasurePoints) 
          ? report.userPortrait.pleasurePoints 
          : [],
        userJourney: {
          ...(report.userPortrait?.userJourney || {}),
        },
      },
      contentStructure: {
        ...(report.contentStructure || {}),
        hookAnalysis: {
          hookType: report.contentStructure?.hookAnalysis?.hookType || '',
          originalText: report.contentStructure?.hookAnalysis?.originalText || '',
          score: report.contentStructure?.hookAnalysis?.score || 5,
          effect: report.contentStructure?.hookAnalysis?.effect || '',
          improvement: report.contentStructure?.hookAnalysis?.improvement || '',
        },
        bodyAnalysis: {
          structureType: report.contentStructure?.bodyAnalysis?.structureType || '',
          rhythm: report.contentStructure?.bodyAnalysis?.rhythm || '',
          videoEvidence: Array.isArray(report.contentStructure?.bodyAnalysis?.videoEvidence) 
            ? report.contentStructure.bodyAnalysis.videoEvidence 
            : [],
          score: report.contentStructure?.bodyAnalysis?.score || 5,
          improvement: report.contentStructure?.bodyAnalysis?.improvement || '',
        },
        endingAnalysis: {
          endingType: report.contentStructure?.endingAnalysis?.endingType || '',
          originalText: report.contentStructure?.endingAnalysis?.originalText || '',
          score: report.contentStructure?.endingAnalysis?.score || 5,
          effect: report.contentStructure?.endingAnalysis?.effect || '',
          improvement: report.contentStructure?.endingAnalysis?.improvement || '',
        },
      },
      copyableMethodology: {
        ...(report.copyableMethodology || {}),
        topicFormula: {
          template: report.copyableMethodology?.topicFormula?.template || '',
          examples: Array.isArray(report.copyableMethodology?.topicFormula?.examples) 
            ? report.copyableMethodology.topicFormula.examples 
            : [],
          keyElements: Array.isArray(report.copyableMethodology?.topicFormula?.keyElements) 
            ? report.copyableMethodology.topicFormula.keyElements 
            : [],
        },
        structureTemplate: {
          segments: Array.isArray(report.copyableMethodology?.structureTemplate?.segments) 
            ? report.copyableMethodology.structureTemplate.segments 
            : [],
          keyElements: Array.isArray(report.copyableMethodology?.structureTemplate?.keyElements) 
            ? report.copyableMethodology.structureTemplate.keyElements 
            : [],
        },
        checklist: Array.isArray(report.copyableMethodology?.checklist) 
          ? report.copyableMethodology.checklist 
          : [],
      },
      riskWarning: {
        ...(report.riskWarning || {}),
        contentRisks: Array.isArray(report.riskWarning?.contentRisks) 
          ? report.riskWarning.contentRisks 
          : [],
        copycatBoundaries: {
          canCopy: Array.isArray(report.riskWarning?.copycatBoundaries?.canCopy) 
            ? report.riskWarning.copycatBoundaries.canCopy 
            : [],
          cannotCopy: Array.isArray(report.riskWarning?.copycatBoundaries?.cannotCopy) 
            ? report.riskWarning.copycatBoundaries.cannotCopy 
            : [],
          adaptationTips: report.riskWarning?.copycatBoundaries?.adaptationTips || '',
        },
        complianceWarning: {
          sensitiveWords: Array.isArray(report.riskWarning?.complianceWarning?.sensitiveWords) 
            ? report.riskWarning.complianceWarning.sensitiveWords 
            : [],
          platformRisks: Array.isArray(report.riskWarning?.complianceWarning?.platformRisks) 
            ? report.riskWarning.complianceWarning.platformRisks 
            : [],
        },
      },
      monetizationAnalysis: {
        ...(report.monetizationAnalysis || {}),
        monetizationPath: {
          primaryPath: report.monetizationAnalysis?.monetizationPath?.primaryPath || '',
          conversionFunnel: report.monetizationAnalysis?.monetizationPath?.conversionFunnel || '',
        },
        conversionHooks: {
          inVideoHooks: Array.isArray(report.monetizationAnalysis?.conversionHooks?.inVideoHooks) 
            ? report.monetizationAnalysis.conversionHooks.inVideoHooks 
            : [],
          problems: Array.isArray(report.monetizationAnalysis?.conversionHooks?.problems) 
            ? report.monetizationAnalysis.conversionHooks.problems 
            : [],
          optimizations: Array.isArray(report.monetizationAnalysis?.conversionHooks?.optimizations) 
            ? report.monetizationAnalysis.conversionHooks.optimizations 
            : [],
        },
        commercialPotential: {
          potentialScore: report.monetizationAnalysis?.commercialPotential?.potentialScore || 5,
          suitableProducts: Array.isArray(report.monetizationAnalysis?.commercialPotential?.suitableProducts) 
            ? report.monetizationAnalysis.commercialPotential.suitableProducts 
            : [],
          estimatedConversionRate: report.monetizationAnalysis?.commercialPotential?.estimatedConversionRate || '',
        },
      },
    };
    
    const result: AnalysisResult = {
      ...data,
      analysisReport: safeReport as AnalysisReport,
    };
    return result;
  }
  
  // V1 格式：深度合并七大模块（保持原有逻辑）
  const mergedReport: AnalysisReport = {
    
    // 一、核心本质拆解
    coreEssence: {
      coreEmotion: {
        ...DEFAULT_REPORT.coreEssence.coreEmotion,
        ...(report.coreEssence?.coreEmotion || {}),
      },
      coreDemand: {
        ...DEFAULT_REPORT.coreEssence.coreDemand,
        ...(report.coreEssence?.coreDemand || {}),
      },
      timingAnalysis: {
        ...DEFAULT_REPORT.coreEssence.timingAnalysis,
        ...(report.coreEssence?.timingAnalysis || {}),
      },
    },
    
    // 二、数据深度归因
    dataAttribution: {
      industryBenchmark: {
        collectRate: report.dataAttribution?.industryBenchmark?.collectRate || DEFAULT_REPORT.dataAttribution.industryBenchmark.collectRate,
        shareRate: report.dataAttribution?.industryBenchmark?.shareRate || DEFAULT_REPORT.dataAttribution.industryBenchmark.shareRate,
        commentRate: report.dataAttribution?.industryBenchmark?.commentRate || DEFAULT_REPORT.dataAttribution.industryBenchmark.commentRate,
      },
      causalityChain: report.dataAttribution?.causalityChain?.length > 0 
        ? report.dataAttribution.causalityChain 
        : DEFAULT_REPORT.dataAttribution.causalityChain,
      algorithmLogic: {
        ...DEFAULT_REPORT.dataAttribution.algorithmLogic,
        ...(report.dataAttribution?.algorithmLogic || {}),
      },
    },
    
    // 三、用户画像拆解
    userPortrait: {
      targetAudience: {
        ...DEFAULT_REPORT.userPortrait.targetAudience,
        ...(report.userPortrait?.targetAudience || {}),
      },
      painPoints: report.userPortrait?.painPoints?.length > 0 
        ? report.userPortrait.painPoints 
        : DEFAULT_REPORT.userPortrait.painPoints,
      pleasurePoints: report.userPortrait?.pleasurePoints?.length > 0 
        ? report.userPortrait.pleasurePoints 
        : DEFAULT_REPORT.userPortrait.pleasurePoints,
      userJourney: {
        ...DEFAULT_REPORT.userPortrait.userJourney,
        ...(report.userPortrait?.userJourney || {}),
      },
    },
    
    // 四、内容结构拆解
    contentStructure: {
      hookAnalysis: {
        ...DEFAULT_REPORT.contentStructure.hookAnalysis,
        ...(report.contentStructure?.hookAnalysis || {}),
      },
      structureAnalysis: {
        ...DEFAULT_REPORT.contentStructure.structureAnalysis,
        ...(report.contentStructure?.structureAnalysis || {}),
      },
      endingAnalysis: {
        ...DEFAULT_REPORT.contentStructure.endingAnalysis,
        ...(report.contentStructure?.endingAnalysis || {}),
      },
    },
    
    // 五、可复制方法论
    copyableMethodology: {
      topicFormula: {
        ...DEFAULT_REPORT.copyableMethodology.topicFormula,
        ...(report.copyableMethodology?.topicFormula || {}),
        examples: report.copyableMethodology?.topicFormula?.examples?.length > 0 
          ? report.copyableMethodology.topicFormula.examples 
          : DEFAULT_REPORT.copyableMethodology.topicFormula.examples,
        keyElements: report.copyableMethodology?.topicFormula?.keyElements?.length > 0 
          ? report.copyableMethodology.topicFormula.keyElements 
          : DEFAULT_REPORT.copyableMethodology.topicFormula.keyElements,
      },
      structureTemplate: {
        ...DEFAULT_REPORT.copyableMethodology.structureTemplate,
        ...(report.copyableMethodology?.structureTemplate || {}),
        keyElements: report.copyableMethodology?.structureTemplate?.keyElements?.length > 0 
          ? report.copyableMethodology.structureTemplate.keyElements 
          : DEFAULT_REPORT.copyableMethodology.structureTemplate.keyElements,
      },
      checklist: report.copyableMethodology?.checklist?.length > 0 
        ? report.copyableMethodology.checklist 
        : DEFAULT_REPORT.copyableMethodology.checklist,
    },
    
    // 六、风险与避坑指南
    riskWarning: {
      contentRisks: report.riskWarning?.contentRisks?.length > 0 
        ? report.riskWarning.contentRisks 
        : DEFAULT_REPORT.riskWarning.contentRisks,
      copycatBoundaries: {
        ...DEFAULT_REPORT.riskWarning.copycatBoundaries,
        ...(report.riskWarning?.copycatBoundaries || {}),
        canCopy: report.riskWarning?.copycatBoundaries?.canCopy?.length > 0 
          ? report.riskWarning.copycatBoundaries.canCopy 
          : DEFAULT_REPORT.riskWarning.copycatBoundaries.canCopy,
        cannotCopy: report.riskWarning?.copycatBoundaries?.cannotCopy?.length > 0 
          ? report.riskWarning.copycatBoundaries.cannotCopy 
          : DEFAULT_REPORT.riskWarning.copycatBoundaries.cannotCopy,
      },
      complianceWarning: {
        ...DEFAULT_REPORT.riskWarning.complianceWarning,
        ...(report.riskWarning?.complianceWarning || {}),
      },
    },
    
    // 七、变现转化拆解
    monetizationAnalysis: {
      monetizationPath: {
        ...DEFAULT_REPORT.monetizationAnalysis.monetizationPath,
        ...(report.monetizationAnalysis?.monetizationPath || {}),
      },
      conversionHooks: {
        inVideoHooks: report.monetizationAnalysis?.conversionHooks?.inVideoHooks?.length > 0 
          ? report.monetizationAnalysis.conversionHooks.inVideoHooks 
          : DEFAULT_REPORT.monetizationAnalysis.conversionHooks.inVideoHooks,
        optimizationSuggestions: report.monetizationAnalysis?.conversionHooks?.optimizationSuggestions?.length > 0 
          ? report.monetizationAnalysis.conversionHooks.optimizationSuggestions 
          : DEFAULT_REPORT.monetizationAnalysis.conversionHooks.optimizationSuggestions,
      },
      commercialPotential: {
        ...DEFAULT_REPORT.monetizationAnalysis.commercialPotential,
        ...(report.monetizationAnalysis?.commercialPotential || {}),
        suitableProducts: report.monetizationAnalysis?.commercialPotential?.suitableProducts?.length > 0 
          ? report.monetizationAnalysis.commercialPotential.suitableProducts 
          : DEFAULT_REPORT.monetizationAnalysis.commercialPotential.suitableProducts,
      },
    },
  };

  const result: AnalysisResult = {
    ...data,
    analysisReport: mergedReport,
  };
  return result;
}

// 评分圆环组件（简化版）
function ScoreRing({ score, size = 80, strokeWidth = 6 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 10) * circumference;
  
  const getScoreColor = (s: number) => {
    if (s >= 8) return 'text-green-500';
    if (s >= 7) return 'text-blue-500';
    if (s >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getStrokeColor = (s: number) => {
    if (s >= 8) return '#22c55e';
    if (s >= 7) return '#3b82f6';
    if (s >= 6) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getStrokeColor(score)}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${getScoreColor(score ?? 7)}`}>{(score ?? 7).toFixed(1)}</span>
      </div>
    </div>
  );
}

// 七大模块展示组件 - 一、核心本质拆解
function CoreEssenceCard({ data }: { data: AnalysisReport['coreEssence'] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <CardTitle className="text-lg">一、核心本质拆解</CardTitle>
            <CardDescription>为什么这条能爆？核心情绪与需求驱动</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 核心情绪 */}
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800">
          <h4 className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            核心情绪
          </h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">主情绪：</span>{data.coreEmotion.primaryEmotion}</p>
            <p><span className="text-muted-foreground">次情绪：</span>{data.coreEmotion.secondaryEmotion}</p>
            <p><span className="text-muted-foreground">触发机制：</span>{data.coreEmotion.triggerMechanism}</p>
          </div>
        </div>
        
        {/* 核心需求 */}
        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-800">
          <h4 className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            核心需求
          </h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">需求类型：</span>{data.coreDemand.demandType}</p>
            <p><span className="text-muted-foreground">需求层级：</span>{data.coreDemand.demandLevel}</p>
            <p><span className="text-muted-foreground">需求分析：</span>{data.coreDemand.demandAnalysis}</p>
          </div>
        </div>
        
        {/* 时机分析 */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            时机分析
          </h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">为什么是现在：</span>{data.timingAnalysis.whyNow}</p>
            <p><span className="text-muted-foreground">趋势背景：</span>{data.timingAnalysis.trendContext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 七大模块展示组件 - 二、数据深度归因
function DataAttributionCard({ data }: { data: AnalysisReport['dataAttribution'] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">二、数据深度归因</CardTitle>
            <CardDescription>行业对标与因果链分析</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 行业基准 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-muted-foreground mb-1">收藏率</p>
            <p className="text-lg font-bold text-blue-600">{data.industryBenchmark.collectRate.thisVideo}</p>
            <p className="text-xs text-muted-foreground">行业均值: {data.industryBenchmark.collectRate.industryAvg}</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs text-muted-foreground mb-1">分享率</p>
            <p className="text-lg font-bold text-green-600">{data.industryBenchmark.shareRate.thisVideo}</p>
            <p className="text-xs text-muted-foreground">行业均值: {data.industryBenchmark.shareRate.industryAvg}</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-muted-foreground mb-1">评论率</p>
            <p className="text-lg font-bold text-purple-600">{data.industryBenchmark.commentRate.thisVideo}</p>
            <p className="text-xs text-muted-foreground">行业均值: {data.industryBenchmark.commentRate.industryAvg}</p>
          </div>
        </div>
        
        {/* 因果链 */}
        <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
          <h4 className="text-sm font-medium mb-3">因果链分析</h4>
          <div className="space-y-2">
            {data.causalityChain.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                <div>
                  <p className="font-medium">{item.element}</p>
                  <p className="text-muted-foreground">{item.effect} → {item.dataImpact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 算法逻辑 */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">算法推流逻辑</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">推荐触发：</span>{data.algorithmLogic.recommendationTrigger}</p>
            <p><span className="text-muted-foreground">流量分配：</span>{data.algorithmLogic.trafficDistribution}</p>
            <p><span className="text-muted-foreground">预警信号：</span>{data.algorithmLogic.warningSignal}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 七大模块展示组件 - 三、用户画像拆解
function UserPortraitCard({ data }: { data: AnalysisReport['userPortrait'] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-lg">三、用户画像拆解</CardTitle>
            <CardDescription>核心受众与痛点爽点分析</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 目标受众 */}
        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-200 dark:border-purple-800">
          <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">目标受众</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">年龄：</span>{data.targetAudience.ageRange}</p>
            <p><span className="text-muted-foreground">职业：</span>{data.targetAudience.occupation}</p>
            <p><span className="text-muted-foreground">痛点画像：</span>{data.targetAudience.painProfile}</p>
            <p><span className="text-muted-foreground">消费能力：</span>{data.targetAudience.consumptionAbility}</p>
          </div>
        </div>
        
        {/* 痛点与爽点 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
            <h5 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">痛点</h5>
            <ul className="space-y-1">
              {data.painPoints.map((point, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
            <h5 className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">爽点</h5>
            <ul className="space-y-1">
              {data.pleasurePoints.map((point, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 七大模块展示组件 - 四、内容结构拆解
function ContentStructureCard({ data }: { data: AnalysisReport['contentStructure'] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <CardTitle className="text-lg">四、内容结构拆解</CardTitle>
            <CardDescription>钩子、主体、结尾技巧分析</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 钩子分析 */}
        <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-cyan-700 dark:text-cyan-300">钩子分析</h4>
            <ScoreRing score={data.hookAnalysis.hookScore} size={50} strokeWidth={4} />
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">钩子类型：</span>{data.hookAnalysis.hookType}</p>
            <p><span className="text-muted-foreground">钩子公式：</span>{data.hookAnalysis.hookFormula}</p>
            <p><span className="text-muted-foreground">效果：</span>{data.hookAnalysis.hookEffect}</p>
            <p className="text-amber-600 dark:text-amber-400"><span className="text-muted-foreground">改进建议：</span>{data.hookAnalysis.improvementSuggestion}</p>
          </div>
        </div>
        
        {/* 结构分析 */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">主体结构</h4>
            <ScoreRing score={data.structureAnalysis.structureScore} size={50} strokeWidth={4} />
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">结构类型：</span>{data.structureAnalysis.structureType}</p>
            <p><span className="text-muted-foreground">结构公式：</span>{data.structureAnalysis.structureFormula}</p>
            <p><span className="text-muted-foreground">节奏控制：</span>{data.structureAnalysis.rhythmControl}</p>
            <p><span className="text-muted-foreground">信息密度：</span>{data.structureAnalysis.infoDensity}</p>
          </div>
        </div>
        
        {/* 结尾分析 */}
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-green-700 dark:text-green-300">结尾分析</h4>
            <ScoreRing score={data.endingAnalysis.endingScore} size={50} strokeWidth={4} />
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">结尾类型：</span>{data.endingAnalysis.endingType}</p>
            <p><span className="text-muted-foreground">结尾内容：</span>{data.endingAnalysis.endingContent}</p>
            <p><span className="text-muted-foreground">效果：</span>{data.endingAnalysis.endingEffect}</p>
            <p className="text-amber-600 dark:text-amber-400"><span className="text-muted-foreground">改进建议：</span>{data.endingAnalysis.improvementSuggestion}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 七大模块展示组件 - 五、可复制方法论
function CopyableMethodologyCard({ data }: { data: AnalysisReport['copyableMethodology'] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg">五、可复制方法论</CardTitle>
            <CardDescription>同赛道1:1复刻指南</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 选题公式 */}
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
          <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">选题公式</h4>
          <p className="text-sm font-medium mb-2">{data.topicFormula.template}</p>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">示例：</p>
            <ul className="space-y-1 ml-4">
              {data.topicFormula.examples.map((ex, i) => (
                <li key={i} className="text-muted-foreground">• {ex}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* 结构模板 */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">结构模板</h4>
          <p className="text-sm font-medium mb-2">{data.structureTemplate.template}</p>
          <p className="text-sm text-muted-foreground">{data.structureTemplate.timeAllocation}</p>
        </div>
        
        {/* Checklist */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-2">复刻清单</h4>
          <ul className="space-y-1">
            {data.checklist.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// 七大模块展示组件 - 六、风险与避坑指南
function RiskWarningCard({ data }: { data: AnalysisReport['riskWarning'] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-lg">六、风险与避坑指南</CardTitle>
            <CardDescription>内容风险与合规提醒</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 内容风险 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">内容风险</h4>
          {data.contentRisks.map((risk, i) => (
            <div key={i} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{risk.riskType}</p>
              <p className="text-sm text-muted-foreground">{risk.riskDescription}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">规避方法：{risk.mitigation}</p>
            </div>
          ))}
        </div>
        
        {/* 复制边界 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <h5 className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">可复制元素</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {data.copycatBoundaries.canCopy.map((item, i) => (
                <li key={i}>✓ {item}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
            <h5 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">不可复制元素</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {data.copycatBoundaries.cannotCopy.map((item, i) => (
                <li key={i}>✗ {item}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* 合规警告 */}
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h5 className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">合规提醒</h5>
          <p className="text-sm text-muted-foreground">{data.complianceWarning.platformRules}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// 七大模块展示组件 - 七、变现转化拆解
function MonetizationCard({ data }: { data: AnalysisReport['monetizationAnalysis'] }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle className="text-lg">七、变现转化拆解</CardTitle>
            <CardDescription>变现路径与转化钩子</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 变现路径 */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">主要变现路径</h4>
          <p className="text-sm font-medium">{data.monetizationPath.primaryPath}</p>
          <p className="text-sm text-muted-foreground">{data.monetizationPath.pathDescription}</p>
          <p className="text-sm text-muted-foreground mt-2">转化漏斗：{data.monetizationPath.conversionFunnel}</p>
        </div>
        
        {/* 转化钩子 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h5 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">视频内转化钩子</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {data.conversionHooks.inVideoHooks.map((hook, i) => (
                <li key={i}>• {hook}</li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <h5 className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">优化建议</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {data.conversionHooks.optimizationSuggestions.map((suggestion, i) => (
                <li key={i}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* 商业潜力 */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-amber-700 dark:text-amber-300">商业潜力</h4>
            <ScoreRing score={data.commercialPotential.potentialScore} size={50} strokeWidth={4} />
          </div>
          <p className="text-sm text-muted-foreground">适合产品：{data.commercialPotential.suitableProducts.join('、')}</p>
          <p className="text-sm text-muted-foreground mt-1">转化率预估：{data.commercialPotential.conversionRateEstimate}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function VideoAnalysisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFromParams = searchParams.get('url') || '';
  const historyIdFromParams = searchParams.get('historyId') || '';
  
  const [videoUrl, setVideoUrl] = useState(urlFromParams);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showExample, setShowExample] = useState(false);
  
  // 异步任务相关状态
  const [taskId, setTaskId] = useState<number | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskMessage, setTaskMessage] = useState('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 重新分析状态
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  
  // 使用 ref 来避免闭包问题和防止重复触发
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletedRef = useRef(false);

  // 示例数据（七大模块结构）
  const exampleResult: AnalysisResult = {
    title: '拿捏人性才能拍出爆款，6个心理效应助你千万播放。',
    author: '菜狗军师',
    authorAvatar: 'https://picsum.photos/seed/author1/100/100',
    likes: 62019,
    comments: 642,
    shares: 14431,
    collects: 44071,
    views: 890000,
    cover: 'https://picsum.photos/seed/video1/400/600',
    platform: 'douyin',
    platformName: '抖音',
    scriptContent: `短视频的本质是心理学，懂人性才能做出大爆款，千万播放的视频都用到了这六个心理学效应越往后越重要。

第六，蔡格尼克效应，人对未完成的事情比对已完成的事情印象更深刻。比如没考上的学校，为什么一定要努力学习，考上更好的大学？没在一起的恋人。所以大元哥聊遗憾，涨粉500万。二百哲也曲见梅在一起的初恋收获350万点赞。痛苦选题一定比快乐选题更深刻。

第五，损失厌恶心理。所有的钩子作用方式都是损失厌恶心理。干货类的内容要强调自己的折现价值。我这视频至少值10万，而我行我素瞎折腾你可能会万劫不复。

第四，蔡加尼克效应，先看这个视频，再看这个什么感受。人类天生有完成事情的愿望，所以结果不要给完，故事不要讲完，画面不要播完。

第三，巴纳姆效应。这个人非常懂你，你看他说的准不准。每个人都容易相信一个笼统的一般性的人格描述适合自己，这就是巴纳姆效应，是最容易拉用户共鸣和认可的效应用法。

第二，富兰克林效应，越是什么都不会的人，越适合做抖音，比如这个小伙靠听劝收获200万点赞。普通人做抖音最简单的方式就是做个听劝博主，因为你帮过的人未必会帮你，但是帮过你的人一定会继续帮你，用短板做抖音，寻求网友的帮助，做一个养成系博主，你还有机会。

第一，从众效应，从家人们谁懂呢？大貔貅，从科目三再无聊的内容，只要形成趋势就会有人跟风。一本书一本999人推荐，一本九人推荐，你选哪个？跟着热点做视频，付出小收益高，傻子才不做。`,
    analysisReport: {
      // 一、核心本质拆解
      coreEssence: {
        coreEmotion: {
          primaryEmotion: '求知欲',
          secondaryEmotion: '获得感',
          triggerMechanism: '"懂人性才能做出大爆款"直击创作者痛点，结合心理学专业背书激发强烈求知欲'
        },
        coreDemand: {
          demandType: '技能提升需求',
          demandLevel: '高需求',
          demandAnalysis: '短视频创作者渴望找到可复制的方法论，该内容提供系统化的心理学效应框架，精准匹配需求'
        },
        timingAnalysis: {
          whyNow: '短视频赛道竞争白热化，创作者迫切需要方法论突破瓶颈',
          trendContext: '知识类短视频持续走红，心理学+实操结合的内容形式正当时'
        }
      },
      
      // 二、数据深度归因
      dataAttribution: {
        industryBenchmark: {
          collectRate: { thisVideo: '71.06%', industryAvg: '15-20%', analysis: '远超行业均值，说明内容实用性极强，用户愿意反复学习' },
          shareRate: { thisVideo: '23.27%', industryAvg: '8-12%', analysis: '显著高于均值，内容具有强传播价值' },
          commentRate: { thisVideo: '1.03%', industryAvg: '5-10%', analysis: '低于均值，互动深度有提升空间' }
        },
        causalityChain: [
          { element: '选题精准', effect: '直击创作者痛点', dataImpact: '高完播率' },
          { element: '结构化内容', effect: '信息密度高', dataImpact: '高收藏率' },
          { element: '倒序排列', effect: '悬念感强', dataImpact: '持续观看' }
        ],
        algorithmLogic: {
          recommendationTrigger: '高收藏分享比触发知识类内容推荐机制',
          trafficDistribution: '进入知识赛道精准流量池',
          warningSignal: '评论率偏低可能影响二次推荐'
        }
      },
      
      // 三、用户画像拆解
      userPortrait: {
        targetAudience: {
          ageRange: '25-40岁',
          occupation: '短视频创作者/运营人员',
          painProfile: '内容不温不火，缺乏方法论，渴望突破',
          consumptionAbility: '中高，愿意为有价值内容付费'
        },
        painPoints: ['视频播放量低', '不懂用户心理', '缺乏系统方法论', '选题没方向'],
        pleasurePoints: ['获得可复制的技巧', '专业背书增强信任', '案例验证可行'],
        userJourney: {
          awareness: '看到"千万播放"标题产生好奇',
          interest: '心理学角度新颖，继续观看',
          desire: '6个效应有实用价值',
          action: '收藏反复学习',
          conversion: '关注账号获取更多内容'
        }
      },
      
      // 四、内容结构拆解
      contentStructure: {
        hookAnalysis: {
          hookType: '价值承诺型钩子',
          hookFormula: '核心观点 + 数字量化 + 价值承诺',
          hookScore: 8,
          hookEffect: '"懂人性才能做出大爆款"+"六个心理学效应"组合，既有专业感又有方法论暗示',
          improvementSuggestion: '可在开头加入具体案例截图或数据冲击，增强可信度'
        },
        structureAnalysis: {
          structureType: '倒序清单型',
          structureFormula: '引入观点 → 倒序列举(6→1) → 每个效应包含定义+原理+案例',
          rhythmControl: '每个效应约15-20秒，节奏紧凑',
          infoDensity: '高密度，每个效应都有干货',
          structureScore: 8.5
        },
        endingAnalysis: {
          endingType: '价值强化型',
          endingContent: '从众效应总结，强调"跟着热点做视频"',
          endingScore: 7,
          endingEffect: '鼓励行动，但缺少明确互动引导',
          improvementSuggestion: '增加明确CTA，如"评论区告诉我你用过哪个效应"'
        }
      },
      
      // 五、可复制方法论
      copyableMethodology: {
        topicFormula: {
          template: '[领域] + [数字] + [核心方法] + 可量化效果',
          examples: ['电商运营5个技巧助你月销百万', '理财3个方法让你的钱生钱'],
          keyElements: ['数字量化', '专业背书', '价值承诺']
        },
        structureTemplate: {
          template: '开场观点 → 倒序/顺序列举 → 每点包含:定义→原理→案例',
          timeAllocation: '开场10秒，每点15-20秒，总计1-2分钟',
          keyElements: ['悬念排序', '案例支撑', '信息密度']
        },
        checklist: ['标题包含数字和效果承诺', '每个知识点有定义+原理+案例', '结尾有行动引导']
      },
      
      // 六、风险与避坑指南
      riskWarning: {
        contentRisks: [
          { riskType: '内容同质化风险', riskDescription: '心理学效应类内容较多，容易撞题', mitigation: '结合自身领域特色，加入独特案例' }
        ],
        copycatBoundaries: {
          canCopy: ['倒序清单结构', '定义+原理+案例框架', '数字量化标题'],
          cannotCopy: ['具体案例内容', '个人表达风格', '独家数据洞察'],
          adaptationTips: '保留结构框架，替换为自身领域的案例和观点'
        },
        complianceWarning: {
          sensitiveWords: '暂无',
          platformRules: '知识类内容需确保信息准确，避免过度承诺效果'
        }
      },
      
      // 七、变现转化拆解
      monetizationAnalysis: {
        monetizationPath: {
          primaryPath: '知识付费',
          pathDescription: '通过方法论内容建立专家人设，引流至付费课程或社群',
          conversionFunnel: '观看 → 收藏 → 关注 → 付费课程/社群'
        },
        conversionHooks: {
          inVideoHooks: ['收藏反复学习', '关注获取更多干货'],
          optimizationSuggestions: ['视频内植入课程案例', '评论区置顶课程链接', '个人简介引导私域']
        },
        commercialPotential: {
          potentialScore: 8,
          suitableProducts: ['短视频运营课程', '创作者社群', '1v1咨询'],
          conversionRateEstimate: '基于高收藏率，预计引流转化率3-5%'
        }
      }
    }
  };

  useEffect(() => {
    if (urlFromParams) {
      setVideoUrl(urlFromParams);
    }
    // 如果有 historyId，加载历史记录
    if (historyIdFromParams) {
      loadHistoryRecord(historyIdFromParams);
    }
  }, [urlFromParams, historyIdFromParams]);

  // 加载历史记录
  const loadHistoryRecord = async (id: string) => {
    setIsLoadingHistory(true);
    setError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
      const response = await fetch(`/api/video-analysis-history/${id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // 历史记录返回的结构：{ id, likes, collects, ..., analysisReport }
        // 需要组装成正确的结构传给 ensureReportStructure
        const historyData = {
          title: data.data.videoTitle,
          author: data.data.author,
          authorId: data.data.authorId,
          authorAvatar: data.data.authorAvatar,
          likes: data.data.likes,
          comments: data.data.comments,
          shares: data.data.shares,
          collects: data.data.collects,
          views: data.data.views,
          cover: data.data.videoCover,
          platform: data.data.platform,
          platformName: data.data.platformName,
          scriptContent: data.data.scriptContent,
          analysisReport: data.data.analysisReport,
        };
        // 确保数据结构完整
        const safeData = ensureReportStructure(historyData);
        setResult(safeData);
        setVideoUrl(data.data.videoUrl);
        setCurrentHistoryId(id);
        toast.success('已加载历史记录');
      } else {
        setError(data.error || '加载历史记录失败');
        toast.error(data.error || '加载历史记录失败');
      }
    } catch (err) {
      console.error('加载历史记录失败:', err);
      setError('网络错误，请稍后重试');
      toast.error('网络错误，请稍后重试');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 查看示例
  const handleShowExample = () => {
    setResult(exampleResult);
    setShowExample(true);
    setError(null);
    toast.success('已加载示例分析报告');
  };

  // 开始分析（异步模式）
  const handleAnalyze = async () => {
    if (!videoUrl.trim()) {
      toast.error('请输入视频链接');
      return;
    }

    // 重置完成标志
    isCompletedRef.current = false;
    
    // 清理之前的轮询
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setPollingInterval(null);
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setTaskProgress(0);
    setTaskMessage('正在提交任务...');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
      
      // 步骤1: 提交任务
      const submitResponse = await fetch('/api/video/deep-analysis/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ url: videoUrl }),
      });

      const submitData = await submitResponse.json();

      if (!submitData.success || !submitData.taskId) {
        setError(submitData.error || '任务提交失败');
        toast.error(submitData.error || '任务提交失败');
        setIsLoading(false);
        return;
      }

      const newTaskId = submitData.taskId;
      setTaskId(newTaskId);
      setTaskProgress(5);
      setTaskMessage('任务已提交，开始处理...');

      // 步骤2: 开始轮询
      const pollTask = async () => {
        // 如果已经完成，不再处理
        if (isCompletedRef.current) {
          return;
        }
        
        try {
          const statusResponse = await fetch(`/api/video/deep-analysis/status/${newTaskId}`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });

          const statusData = await statusResponse.json();

          if (statusData.status === 'completed') {
            // 标记为已完成，防止重复触发
            isCompletedRef.current = true;
            
            // 清理轮询
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
              setPollingInterval(null);
            }
            
            // 任务完成
            setTaskProgress(100);
            setTaskMessage('分析完成！');
            // 确保数据结构完整
            const safeData = ensureReportStructure(statusData.data);
            setResult(safeData);
            setIsLoading(false);
            
            // 只弹出一次 toast
            toast.success('分析完成');
          } else if (statusData.status === 'failed') {
            // 标记为已完成
            isCompletedRef.current = true;
            
            // 清理轮询
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
              setPollingInterval(null);
            }
            
            // 任务失败
            setError(statusData.error || '分析失败');
            setIsLoading(false);
            toast.error(statusData.error || '分析失败');
          } else if (statusData.status === 'processing') {
            // 处理中，更新进度
            setTaskProgress(statusData.progress || 10);
            setTaskMessage(statusData.progressMessage || '正在处理...');
          }
        } catch (pollError) {
          console.error('轮询失败:', pollError);
          // 不中断轮询，继续尝试
        }
      };

      // 立即执行一次
      await pollTask();

      // 如果已经完成，不需要创建轮询
      if (isCompletedRef.current) {
        return;
      }

      // 每2秒轮询一次
      const interval = setInterval(pollTask, 2000);
      pollingIntervalRef.current = interval;
      setPollingInterval(interval);

      // 设置超时保护（5分钟）
      setTimeout(() => {
        if (!isCompletedRef.current && pollingIntervalRef.current) {
          isCompletedRef.current = true;
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setPollingInterval(null);
          setError('分析超时，请稍后查看历史记录');
          toast.error('分析超时，请稍后查看历史记录');
          setIsLoading(false);
        }
      }, 5 * 60 * 1000);

    } catch (err) {
      console.error('视频分析失败:', err);
      setError('网络错误，请稍后重试');
      toast.error('网络错误，请稍后重试');
      setIsLoading(false);
    }
  };

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // 复制功能
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('已复制到剪贴板');
  };

  // 导出报告为Excel
  const handleExportExcel = () => {
    if (!result) return;
    
    try {
      const workbook = generateExcelReport(result);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      // 安全文件名：移除特殊字符，限制长度
      const safeTitle = result.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 20);
      const fileName = `视频分析报告_${safeTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(blob, fileName);
      toast.success('报告已导出为Excel');
    } catch (error) {
      console.error('导出Excel失败:', error);
      toast.error(`导出失败: ${error instanceof Error ? error.message : '请重试'}`);
    }
  };

  // 重新分析（修复"文案提取失败"的历史数据）
  const handleReanalyze = async () => {
    if (!currentHistoryId) {
      toast.error('无法获取记录ID');
      return;
    }

    setIsReanalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/video/deep-analysis/reanalyze/${currentHistoryId}`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '重新分析失败');
      }

      // 更新结果
      if (data.analysisReport) {
        setResult(prev => prev ? {
          ...prev,
          analysisReport: data.analysisReport,
        } : null);
        toast.success('重新分析完成，报告已更新');
      }
    } catch (err) {
      console.error('重新分析失败:', err);
      const errorMsg = err instanceof Error ? err.message : '重新分析失败';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsReanalyzing(false);
    }
  };

  // 生成Excel报告
  const generateExcelReport = (data: AnalysisResult): XLSX.WorkBook => {
    const report = data.analysisReport;
    const workbook = XLSX.utils.book_new();
    const isV2 = isV2Report(report);
    
    // ========== 样式定义 ==========
    // 主标题样式：深色背景，白色加粗字体
    const titleStyle: XLSX.CellStyle = {
      font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F2937' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    
    // 七大板块标题样式（不同颜色）
    const sectionStyles: Record<string, XLSX.CellStyle> = {
      '一': { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'E11D48' }, patternType: 'solid' }, alignment: { horizontal: 'left', vertical: 'center' } }, // 玫红
      '二': { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '2563EB' }, patternType: 'solid' }, alignment: { horizontal: 'left', vertical: 'center' } }, // 蓝色
      '三': { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '7C3AED' }, patternType: 'solid' }, alignment: { horizontal: 'left', vertical: 'center' } }, // 紫色
      '四': { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '0891B2' }, patternType: 'solid' }, alignment: { horizontal: 'left', vertical: 'center' } }, // 青色
      '五': { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' }, patternType: 'solid' }, alignment: { horizontal: 'left', vertical: 'center' } }, // 绿色
      '六': { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'D97706' }, patternType: 'solid' }, alignment: { horizontal: 'left', vertical: 'center' } }, // 橙色
      '七': { font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: 'DC2626' }, patternType: 'solid' }, alignment: { horizontal: 'left', vertical: 'center' } }, // 红色
    };
    
    // 字段名样式：浅灰背景，加粗
    const labelStyle: XLSX.CellStyle = {
      font: { bold: true, sz: 11, color: { rgb: '374151' } },
      fill: { fgColor: { rgb: 'F3F4F6' }, patternType: 'solid' },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: { top: { style: 'thin', color: { rgb: 'E5E7EB' } }, bottom: { style: 'thin', color: { rgb: 'E5E7EB' } }, left: { style: 'thin', color: { rgb: 'E5E7EB' } }, right: { style: 'thin', color: { rgb: 'E5E7EB' } } },
    };
    
    // 内容样式
    const contentStyle: XLSX.CellStyle = {
      font: { sz: 11, color: { rgb: '1F2937' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: { top: { style: 'thin', color: { rgb: 'E5E7EB' } }, bottom: { style: 'thin', color: { rgb: 'E5E7EB' } }, left: { style: 'thin', color: { rgb: 'E5E7EB' } }, right: { style: 'thin', color: { rgb: 'E5E7EB' } } },
    };
    
    // 表头样式（互动数据区）
    const headerStyle: XLSX.CellStyle = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4B5563' }, patternType: 'solid' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { top: { style: 'thin', color: { rgb: 'E5E7EB' } }, bottom: { style: 'thin', color: { rgb: 'E5E7EB' } }, left: { style: 'thin', color: { rgb: 'E5E7EB' } }, right: { style: 'thin', color: { rgb: 'E5E7EB' } } },
    };
    
    // ========== 辅助函数 ==========
    // 安全获取证据文本（支持字符串或对象格式）
    const getEvidenceText = (value: unknown): string => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value !== null) {
        const obj = value as { timestamp?: string; originalText?: string; content?: string };
        const timestamp = obj.timestamp || '';
        const text = obj.originalText || obj.content || '';
        if (timestamp && text) return `[${timestamp}] ${text}`;
        return text || timestamp || '';
      }
      return String(value);
    };

    // 安全获取数组文本
    const getArrayText = (arr: unknown[] | undefined | null): string => {
      if (!arr || !Array.isArray(arr)) return '暂无';
      return arr.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          // 处理痛点/爽点对象
          const obj = item as Record<string, unknown>;
          if (obj.point) {
            const scenario = obj.scenario ? `（场景：${obj.scenario}）` : '';
            const evidence = obj.videoEvidence ? ` [证据：${getEvidenceText(obj.videoEvidence)}]` : '';
            return `${obj.point}${scenario}${evidence}`;
          }
          return JSON.stringify(item);
        }
        return String(item);
      }).join('\n');
    };

    // ========== 构建单页报告数据 ==========
    const rows: any[][] = [];
    
    // 第1行：大标题
    rows.push(['视频深度分析报告（七大模块）']);
    rows.push([]); // 空行
    
    // 第3-4行：视频基本信息
    rows.push(['视频标题', data.title]);
    rows.push(['作者/平台', `${data.author} | ${data.platformName}`]);
    rows.push([]); // 空行
    
    // 互动数据区（4列布局）
    rows.push(['互动数据', '数量', '互动率', '行业均值']);
    const v2Report = isV2 ? report as AnalysisReportV2 : null;
    const v1Report = !isV2 ? report as AnalysisReportV1 : null;
    
    // 点赞
    rows.push([
      '点赞', 
      formatNumber(data.likes),
      v2Report ? `${v2Report.dataAttribution.industryBenchmark.thisVideo.likeRate}` : '-',
      v2Report ? `${v2Report.dataAttribution.industryBenchmark.industryAvg.likeRate}` : '5-8%'
    ]);
    // 评论
    rows.push([
      '评论', 
      formatNumber(data.comments),
      v2Report ? `${v2Report.dataAttribution.industryBenchmark.thisVideo.commentRate}` : 
        (v1Report ? v1Report.dataAttribution.industryBenchmark.commentRate.thisVideo : '-'),
      v2Report ? `${v2Report.dataAttribution.industryBenchmark.industryAvg.commentRate}` : '5-10%'
    ]);
    // 分享
    rows.push([
      '分享', 
      formatNumber(data.shares),
      v2Report ? `${v2Report.dataAttribution.industryBenchmark.thisVideo.shareRate}` :
        (v1Report ? v1Report.dataAttribution.industryBenchmark.shareRate.thisVideo : '-'),
      v2Report ? `${v2Report.dataAttribution.industryBenchmark.industryAvg.shareRate}` : '8-12%'
    ]);
    // 收藏
    rows.push([
      '收藏', 
      formatNumber(data.collects),
      v2Report ? `${v2Report.dataAttribution.industryBenchmark.thisVideo.collectRate}` :
        (v1Report ? v1Report.dataAttribution.industryBenchmark.collectRate.thisVideo : '-'),
      v2Report ? `${v2Report.dataAttribution.industryBenchmark.industryAvg.collectRate}` : '15-20%'
    ]);
    // 播放量
    rows.push(['预估播放', formatNumber(data.views), '-', '-']);
    rows.push([]); // 空行
    
    // ========== 一、核心本质拆解 ==========
    rows.push(['一、核心本质拆解']);
    rows.push(['核心情绪', `${report.coreEssence.coreEmotion.primaryEmotion} + ${report.coreEssence.coreEmotion.secondaryEmotion}`]);
    // 触发机制（V2是数组，V1是字符串）
    if (isV2 && Array.isArray(report.coreEssence.coreEmotion.triggerMechanism)) {
      const triggers = (report.coreEssence.coreEmotion.triggerMechanism as Array<{timestamp?: string; originalText?: string; explanation?: string}>)
        .map(t => `[${t.timestamp || ''}] "${t.originalText || ''}" → ${t.explanation || ''}`)
        .join('\n');
      rows.push(['触发机制', triggers]);
    } else {
      rows.push(['触发机制', String(report.coreEssence.coreEmotion.triggerMechanism)]);
    }
    rows.push(['核心需求', `${report.coreEssence.coreDemand.demandType}（${report.coreEssence.coreDemand.demandLevel}）`]);
    // 需求分析
    if (isV2 && typeof report.coreEssence.coreDemand.demandAnalysis === 'object') {
      const da = report.coreEssence.coreDemand.demandAnalysis as { targetPain?: string; contentSolution?: string; whyItWorks?: string };
      rows.push(['目标痛点', da.targetPain || '-']);
      rows.push(['内容解决方案', da.contentSolution || '-']);
      rows.push(['为何有效', da.whyItWorks || '-']);
    } else {
      rows.push(['需求分析', String(report.coreEssence.coreDemand.demandAnalysis)]);
    }
    rows.push(['时机分析', report.coreEssence.timingAnalysis.whyNow]);
    rows.push([]); // 空行
    
    // ========== 二、数据深度归因 ==========
    rows.push(['二、数据深度归因']);
    rows.push(['差异分析', v2Report ? v2Report.dataAttribution.industryBenchmark.differenceAnalysis : '-']);
    // 因果链条
    if (v2Report?.dataAttribution.causalityChain && Array.isArray(v2Report.dataAttribution.causalityChain)) {
      const chain = v2Report.dataAttribution.causalityChain
        .map(c => `${c.contentElement} → ${c.effect}（${c.dataImpact}）`)
        .join('\n');
      rows.push(['因果链条', chain]);
    }
    rows.push(['推荐触发点', report.dataAttribution.algorithmLogic.recommendationTrigger]);
    // 流量阶段（V2是trafficStage，V1是trafficDistribution）
    const trafficStage = v2Report?.dataAttribution.algorithmLogic.trafficStage || 
      (v1Report?.dataAttribution.algorithmLogic as { trafficDistribution?: string })?.trafficDistribution || '-';
    rows.push(['流量阶段', trafficStage]);
    rows.push(['预警信号', report.dataAttribution.algorithmLogic.warningSignal]);
    rows.push([]); // 空行
    
    // ========== 三、用户画像拆解 ==========
    rows.push(['三、用户画像拆解']);
    rows.push(['年龄段', report.userPortrait.targetAudience.ageRange]);
    rows.push(['职业/身份', report.userPortrait.targetAudience.occupation]);
    rows.push(['痛点画像', report.userPortrait.targetAudience.painProfile]);
    rows.push(['消费能力', report.userPortrait.targetAudience.consumptionAbility]);
    // 痛点（V2是对象数组）
    rows.push(['痛点', getArrayText(report.userPortrait.painPoints as unknown[])]);
    // 爽点（V2是对象数组）
    rows.push(['爽点', getArrayText(report.userPortrait.pleasurePoints as unknown[])]);
    // 用户旅程
    if (report.userPortrait.userJourney) {
      rows.push(['用户旅程', `认知→${report.userPortrait.userJourney.awareness} | 兴趣→${report.userPortrait.userJourney.interest} | 欲望→${report.userPortrait.userJourney.desire} | 行动→${report.userPortrait.userJourney.action} | 转化→${report.userPortrait.userJourney.conversion}`]);
    }
    rows.push([]); // 空行
    
    // ========== 四、内容结构拆解 ==========
    rows.push(['四、内容结构拆解']);
    // 钩子分析
    if (v2Report) {
      rows.push(['钩子类型', `${v2Report.contentStructure.hookAnalysis.hookType}（${v2Report.contentStructure.hookAnalysis.score}/10分）`]);
      rows.push(['钩子原文', getEvidenceText(v2Report.contentStructure.hookAnalysis.originalText)]);
      rows.push(['钩子效果', v2Report.contentStructure.hookAnalysis.effect]);
      rows.push(['钩子改进', v2Report.contentStructure.hookAnalysis.improvement]);
    } else if (v1Report) {
      rows.push(['钩子类型', `${v1Report.contentStructure.hookAnalysis.hookType}（${v1Report.contentStructure.hookAnalysis.hookScore}/10分）`]);
      rows.push(['钩子公式', v1Report.contentStructure.hookAnalysis.hookFormula || '-']);
    }
    // 主体分析
    if (v2Report) {
      rows.push(['主体结构', `${v2Report.contentStructure.bodyAnalysis.structureType}（${v2Report.contentStructure.bodyAnalysis.score}/10分）`]);
      rows.push(['节奏控制', v2Report.contentStructure.bodyAnalysis.rhythm]);
      if (v2Report.contentStructure.bodyAnalysis.videoEvidence?.length) {
        const evidence = v2Report.contentStructure.bodyAnalysis.videoEvidence
          .map(e => `[${e.timestamp}] ${e.content}`)
          .join('\n');
        rows.push(['视频证据', evidence]);
      }
      rows.push(['主体改进', v2Report.contentStructure.bodyAnalysis.improvement]);
    } else if (v1Report) {
      rows.push(['结构类型', `${v1Report.contentStructure.structureAnalysis.structureType}（${v1Report.contentStructure.structureAnalysis.structureScore}/10分）`]);
    }
    // 结尾分析
    if (v2Report) {
      rows.push(['结尾类型', `${v2Report.contentStructure.endingAnalysis.endingType}（${v2Report.contentStructure.endingAnalysis.score}/10分）`]);
      rows.push(['结尾示例', getEvidenceText(v2Report.contentStructure.endingAnalysis.originalText)]);
      rows.push(['结尾效果', v2Report.contentStructure.endingAnalysis.effect]);
      rows.push(['结尾改进', v2Report.contentStructure.endingAnalysis.improvement]);
    } else if (v1Report) {
      rows.push(['结尾类型', `${v1Report.contentStructure.endingAnalysis.endingType}（${v1Report.contentStructure.endingAnalysis.endingScore}/10分）`]);
      rows.push(['结尾内容', v1Report.contentStructure.endingAnalysis.endingContent || '-']);
    }
    rows.push([]); // 空行
    
    // ========== 五、可复制方法论 ==========
    rows.push(['五、可复制方法论']);
    rows.push(['选题公式', v2Report ? v2Report.copyableMethodology.topicFormula.template : v1Report?.copyableMethodology.topicFormula.template || '-']);
    // 示例
    if (v2Report?.copyableMethodology.topicFormula.examples?.length) {
      rows.push(['选题示例', v2Report.copyableMethodology.topicFormula.examples.join('\n')]);
    }
    // 关键要素
    const keyElements = v2Report?.copyableMethodology.topicFormula.keyElements || v1Report?.copyableMethodology.topicFormula.keyElements;
    if (keyElements?.length) {
      rows.push(['关键要素', keyElements.join('、')]);
    }
    // 结构模板
    if (v2Report?.copyableMethodology.structureTemplate?.segments?.length) {
      const segments = v2Report.copyableMethodology.structureTemplate.segments
        .map(s => `${s.timeRange}【${s.stage}】${s.content}`)
        .join('\n');
      rows.push(['结构模板', segments]);
    }
    // 执行清单
    const checklist = v2Report?.copyableMethodology.checklist || v1Report?.copyableMethodology.checklist;
    if (checklist?.length) {
      rows.push(['执行清单', checklist.join('\n')]);
    }
    rows.push([]); // 空行
    
    // ========== 六、风险与避坑指南 ==========
    rows.push(['六、风险与避坑指南']);
    // 内容风险（从riskWarning中获取）
    if (v2Report?.riskWarning?.contentRisks?.length) {
      const risks = v2Report.riskWarning.contentRisks
        .map((r: { riskPoint: string; evidence: string; mitigation: string }) => `⚠️ ${r.riskPoint}\n证据：${r.evidence}\n规避：${r.mitigation}`)
        .join('\n\n');
      rows.push(['内容风险', risks]);
    }
    // 可复制边界
    const canCopy = report.riskWarning.copycatBoundaries.canCopy;
    const cannotCopy = report.riskWarning.copycatBoundaries.cannotCopy;
    rows.push(['可以复制', canCopy?.length ? canCopy.join('\n') : '无']);
    rows.push(['不可复制', cannotCopy?.length ? cannotCopy.join('\n') : '无']);
    rows.push(['适配建议', report.riskWarning.copycatBoundaries.adaptationTips]);
    // 敏感词（从riskWarning.complianceWarning获取）
    if (v2Report?.riskWarning?.complianceWarning?.sensitiveWords?.length) {
      rows.push(['敏感词预警', v2Report.riskWarning.complianceWarning.sensitiveWords.join('、')]);
    }
    // 平台风险
    if (v2Report?.riskWarning?.complianceWarning?.platformRisks?.length) {
      rows.push(['平台风险', v2Report.riskWarning.complianceWarning.platformRisks.join('\n')]);
    }
    rows.push([]); // 空行
    
    // ========== 七、变现转化拆解 ==========
    rows.push(['七、变现转化拆解']);
    rows.push(['主要变现路径', report.monetizationAnalysis.monetizationPath.primaryPath]);
    rows.push(['转化漏斗', report.monetizationAnalysis.monetizationPath.conversionFunnel]);
    // 视频内转化点
    if (v2Report?.monetizationAnalysis.conversionHooks?.inVideoHooks?.length) {
      rows.push(['视频内转化点', v2Report.monetizationAnalysis.conversionHooks.inVideoHooks.join('\n')]);
    }
    // 存在问题
    if (v2Report?.monetizationAnalysis.conversionHooks?.problems?.length) {
      rows.push(['存在问题', v2Report.monetizationAnalysis.conversionHooks.problems.join('\n')]);
    }
    // 优化建议
    if (v2Report?.monetizationAnalysis.conversionHooks?.optimizations?.length) {
      rows.push(['优化建议', v2Report.monetizationAnalysis.conversionHooks.optimizations.join('\n')]);
    }
    rows.push(['商业潜力', `${report.monetizationAnalysis.commercialPotential.potentialScore}/10分`]);
    rows.push(['适合产品', report.monetizationAnalysis.commercialPotential.suitableProducts?.join('\n') || '-']);
    rows.push(['预估转化率', v2Report?.monetizationAnalysis.commercialPotential.estimatedConversionRate || '-']);
    rows.push([]); // 空行
    
    // 底部信息
    rows.push(['报告生成时间', new Date().toLocaleString('zh-CN')]);
    
    // ========== 创建工作表 ==========
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    
    // 设置列宽
    sheet['!cols'] = [
      { wch: 15 },  // 第一列：标题
      { wch: 60 },  // 第二列：内容
      { wch: 12 },  // 第三列：互动率（仅互动数据区）
      { wch: 12 },  // 第四列：行业均值（仅互动数据区）
    ];
    
    // 设置合并单元格和样式
    const merges: XLSX.Range[] = [];
    
    // 遍历所有行，设置样式
    rows.forEach((row, rowIndex) => {
      const cellValue = String(row[0] || '');
      
      // 主标题行（第0行）
      if (rowIndex === 0 && row[0] === '视频深度分析报告（七大模块）') {
        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 3 } });
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        if (sheet[cellAddress]) {
          sheet[cellAddress].s = titleStyle;
        }
      }
      
      // 七大板块标题行：合并单元格 + 彩色背景
      const sectionMatch = cellValue.match(/^[一二三四五六七]、/);
      if (sectionMatch) {
        merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 3 } });
        const sectionNum = sectionMatch[0].charAt(0);
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        if (sheet[cellAddress] && sectionStyles[sectionNum]) {
          sheet[cellAddress].s = sectionStyles[sectionNum];
        }
      }
      
      // 互动数据表头行
      if (cellValue === '互动数据') {
        // 给4个单元格都应用表头样式
        for (let col = 0; col < 4; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
          if (sheet[cellAddress]) {
            sheet[cellAddress].s = headerStyle;
          }
        }
      }
      
      // 普通数据行：第一列（字段名）用labelStyle，第二列用contentStyle
      if (rowIndex > 0 && !sectionMatch && cellValue && cellValue !== '互动数据' && row[1] !== undefined && row[2] === undefined) {
        const labelAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        const contentAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 1 });
        if (sheet[labelAddress]) {
          sheet[labelAddress].s = labelStyle;
        }
        if (sheet[contentAddress]) {
          sheet[contentAddress].s = contentStyle;
        }
      }
      
      // 互动数据区的数据行（有4列）
      if (rowIndex > 0 && !sectionMatch && cellValue && cellValue !== '互动数据' && row[2] !== undefined) {
        const labelAddress = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        if (sheet[labelAddress]) {
          sheet[labelAddress].s = labelStyle;
        }
        for (let col = 1; col < 4; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
          if (sheet[cellAddress]) {
            sheet[cellAddress].s = contentStyle;
          }
        }
      }
    });
    
    sheet['!merges'] = merges;
    
    // 添加到工作簿
    XLSX.utils.book_append_sheet(workbook, sheet, '深度分析报告');
    
    return workbook;
  };

  // 复制完整报告
  const handleCopyFullReport = () => {
    if (!result) return;
    
    const exportContent = generateExportText(result);
    navigator.clipboard.writeText(exportContent);
    setCopied('fullReport');
    setTimeout(() => setCopied(null), 2000);
    toast.success('完整报告已复制到剪贴板');
  };

  // 生成导出文本
  const generateExportText = (data: AnalysisResult): string => {
    const report = data.analysisReport;
    const isV2 = isV2Report(report);
    
    let content = `# 视频深度分析报告（七大模块）\n\n`;
    content += `## 基本信息\n`;
    content += `- 标题: ${data.title}\n`;
    content += `- 作者: ${data.author}\n`;
    content += `- 平台: ${data.platformName}\n`;
    content += `- 点赞: ${formatNumber(data.likes)}\n`;
    content += `- 评论: ${formatNumber(data.comments)}\n`;
    content += `- 分享: ${formatNumber(data.shares)}\n`;
    content += `- 收藏: ${formatNumber(data.collects)}\n`;
    content += `- 预估播放: ${formatNumber(data.views)}\n\n`;
    
    content += `## 一、核心本质拆解\n`;
    content += `- 核心情绪: ${report.coreEssence.coreEmotion.primaryEmotion} + ${report.coreEssence.coreEmotion.secondaryEmotion}\n`;
    content += `- 触发机制: ${report.coreEssence.coreEmotion.triggerMechanism}\n`;
    content += `- 核心需求: ${report.coreEssence.coreDemand.demandType} (${report.coreEssence.coreDemand.demandLevel})\n`;
    content += `- 时机分析: ${report.coreEssence.timingAnalysis.whyNow}\n\n`;
    
    content += `## 二、数据深度归因\n`;
    if (isV2) {
      const v2Report = report as AnalysisReportV2;
      content += `- 收藏率: ${v2Report.dataAttribution.industryBenchmark.thisVideo.collectRate} (行业: ${v2Report.dataAttribution.industryBenchmark.industryAvg.collectRate})\n`;
      content += `- 分享率: ${v2Report.dataAttribution.industryBenchmark.thisVideo.shareRate} (行业: ${v2Report.dataAttribution.industryBenchmark.industryAvg.shareRate})\n`;
      content += `- 评论率: ${v2Report.dataAttribution.industryBenchmark.thisVideo.commentRate} (行业: ${v2Report.dataAttribution.industryBenchmark.industryAvg.commentRate})\n\n`;
    } else {
      const v1Report = report as AnalysisReportV1;
      content += `- 收藏率: ${v1Report.dataAttribution.industryBenchmark.collectRate.thisVideo} (行业: ${v1Report.dataAttribution.industryBenchmark.collectRate.industryAvg})\n`;
      content += `- 分享率: ${v1Report.dataAttribution.industryBenchmark.shareRate.thisVideo} (行业: ${v1Report.dataAttribution.industryBenchmark.shareRate.industryAvg})\n`;
      content += `- 评论率: ${v1Report.dataAttribution.industryBenchmark.commentRate.thisVideo} (行业: ${v1Report.dataAttribution.industryBenchmark.commentRate.industryAvg})\n\n`;
    }
    
    content += `## 三、用户画像拆解\n`;
    content += `- 目标受众: ${report.userPortrait.targetAudience.ageRange}, ${report.userPortrait.targetAudience.occupation}\n`;
    content += `- 痛点: ${report.userPortrait.painPoints.join('；')}\n`;
    content += `- 爽点: ${report.userPortrait.pleasurePoints.join('；')}\n\n`;
    
    content += `## 四、内容结构拆解\n`;
    if (isV2) {
      const v2Report = report as AnalysisReportV2;
      content += `- 钩子: ${v2Report.contentStructure.hookAnalysis.hookType} (${v2Report.contentStructure.hookAnalysis.score}/10)\n`;
      content += `- 结尾: ${v2Report.contentStructure.endingAnalysis.endingType} (${v2Report.contentStructure.endingAnalysis.score}/10)\n\n`;
    } else {
      const v1Report = report as AnalysisReportV1;
      content += `- 钩子: ${v1Report.contentStructure.hookAnalysis.hookType} (${v1Report.contentStructure.hookAnalysis.hookScore}/10)\n`;
      content += `- 结构: ${v1Report.contentStructure.structureAnalysis.structureType} (${v1Report.contentStructure.structureAnalysis.structureScore}/10)\n`;
      content += `- 结尾: ${v1Report.contentStructure.endingAnalysis.endingType} (${v1Report.contentStructure.endingAnalysis.endingScore}/10)\n\n`;
    }
    
    content += `## 五、可复制方法论\n`;
    if (isV2) {
      const v2Report = report as AnalysisReportV2;
      content += `- 选题公式: ${v2Report.copyableMethodology.topicFormula.template}\n`;
      content += `- 执行清单: ${v2Report.copyableMethodology.checklist.join('；')}\n\n`;
    } else {
      const v1Report = report as AnalysisReportV1;
      content += `- 选题公式: ${v1Report.copyableMethodology.topicFormula.template}\n`;
      content += `- 复刻清单: ${v1Report.copyableMethodology.checklist.join('；')}\n\n`;
    }
    
    content += `## 六、风险与避坑指南\n`;
    content += `- 可复制: ${report.riskWarning.copycatBoundaries.canCopy.join('；')}\n`;
    content += `- 不可复制: ${report.riskWarning.copycatBoundaries.cannotCopy.join('；')}\n\n`;
    
    content += `## 七、变现转化拆解\n`;
    content += `- 变现路径: ${report.monetizationAnalysis.monetizationPath.primaryPath}\n`;
    content += `- 商业潜力: ${report.monetizationAnalysis.commercialPotential.potentialScore}/10\n`;
    content += `- 适合产品: ${report.monetizationAnalysis.commercialPotential.suitableProducts.join('；')}\n\n`;
    
    content += `---\n`;
    content += `*本报告由系统生成于 ${new Date().toLocaleString('zh-CN')}*\n`;
    
    return content;
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">视频深度分析</h1>
                <p className="text-sm text-muted-foreground">八维体检、内容结构、优化建议一站式分析</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/operations/video-analysis/history')}
              className="gap-2"
            >
              <History className="w-4 h-4" />
              历史记录
            </Button>
            <Button
              variant="outline"
              onClick={handleShowExample}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              查看示例
            </Button>
          </div>
        </div>

        {/* 输入区域 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">输入视频信息</CardTitle>
            <CardDescription>请输入视频链接，系统将进行深度分析</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="videoUrl">视频链接 <span className="text-red-500">*</span></Label>
              <Input
                id="videoUrl"
                placeholder="粘贴抖音、快手、小红书、B站等视频链接..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="mt-2 h-11"
              />
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  支持抖音、快手、小红书、B站、微博等平台的视频链接
                </p>
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-medium">提示：</span>请只粘贴纯链接，去掉多余的分享文案。例如：
                    <code className="block mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-800 dark:text-blue-200 break-all">
                      https://v.douyin.com/RV2hqF9xsJs/
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* 算力提示 */}
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                消耗算力：<span className="font-semibold text-amber-600">500</span>
              </span>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isLoading || isLoadingHistory || !videoUrl.trim()}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {taskMessage || '正在分析中...'}
                  {taskProgress > 0 && taskProgress < 100 && (
                    <span className="ml-2 text-sm opacity-90">({taskProgress}%)</span>
                  )}
                </>
              ) : isLoadingHistory ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在加载历史记录...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5 mr-2" />
                  开始深度分析
                </>
              )}
            </Button>

            {/* 进度条 */}
            {isLoading && taskProgress > 0 && (
              <div className="space-y-2">
                <Progress value={taskProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {taskMessage} - 您可以切换到其他页面，稍后在历史记录中查看结果
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分析结果 */}
        {result && (
          <div className="space-y-6">
            {/* 导出操作栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentHistoryId && (
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    已保存
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyFullReport}
                  className="gap-2"
                >
                  {copied === 'fullReport' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  复制报告
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  导出Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReanalyze}
                  disabled={isReanalyzing}
                  className="gap-2"
                >
                  {isReanalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      重新分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      重新分析
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 综合评分卡片 */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* 视频封面 */}
                  <div className="relative w-48 shrink-0">
                    <div className="aspect-[9/12] relative rounded-xl overflow-hidden shadow-lg">
                      <img 
                        src={result.cover} 
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <Badge className="absolute top-2 left-2 bg-black/70 text-white border-0">
                        {result.platformName}
                      </Badge>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                          <Play className="w-5 h-5 text-gray-800 ml-0.5" fill="#333" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 综合信息 */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground mb-2">{result.title}</h2>
                      <div className="flex items-center gap-2">
                        {result.authorAvatar && (
                          <img src={result.authorAvatar} alt={result.author} className="w-6 h-6 rounded-full" />
                        )}
                        <span className="text-sm text-muted-foreground">{result.author}</span>
                      </div>
                    </div>

                    {/* 互动数据 */}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <ThumbsUp className="w-4 h-4 text-red-500" />
                        <span className="font-medium">{formatNumber(result.likes)}</span>
                        <span className="text-muted-foreground">点赞</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <MessageCircle className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{formatNumber(result.comments)}</span>
                        <span className="text-muted-foreground">评论</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Share2 className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{formatNumber(result.shares)}</span>
                        <span className="text-muted-foreground">分享</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Bookmark className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">{formatNumber(result.collects)}</span>
                        <span className="text-muted-foreground">收藏</span>
                      </div>
                    </div>

                    {/* 核心洞察 */}
                    <div className="flex items-center gap-6 pt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                          <Flame className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">核心情绪</p>
                          <p className="text-lg font-bold">{result.analysisReport.coreEssence.coreEmotion.primaryEmotion}</p>
                        </div>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">核心需求</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.analysisReport.coreEssence.coreDemand.demandType} ({result.analysisReport.coreEssence.coreDemand.demandLevel})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 口播文案 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">口播文案</CardTitle>
                      <CardDescription>Vision AI 提取的视频文案</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(result.scriptContent, 'script')}
                    className="gap-1"
                  >
                    {copied === 'script' ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        复制
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-200 dark:border-cyan-800 max-h-60 overflow-y-auto">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {result.scriptContent}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 七大模块展示 - 根据版本号选择组件 */}
            {isV2Report(result.analysisReport) ? (
              // V2 版本组件
              <>
                <CoreEssenceCardV2 data={(result.analysisReport as AnalysisReportV2).coreEssence} />
                <DataAttributionCardV2 data={(result.analysisReport as AnalysisReportV2).dataAttribution} />
                <UserPortraitCardV2 data={(result.analysisReport as AnalysisReportV2).userPortrait} />
                <ContentStructureCardV2 data={(result.analysisReport as AnalysisReportV2).contentStructure} />
                <CopyableMethodologyCardV2 data={(result.analysisReport as AnalysisReportV2).copyableMethodology} />
                <RiskWarningCardV2 data={(result.analysisReport as AnalysisReportV2).riskWarning} />
                <MonetizationCardV2 data={(result.analysisReport as AnalysisReportV2).monetizationAnalysis} />
              </>
            ) : (
              // V1 版本组件（兼容旧数据）
              <>
                <CoreEssenceCard data={result.analysisReport.coreEssence as any} />
                <DataAttributionCard data={result.analysisReport.dataAttribution as any} />
                <UserPortraitCard data={result.analysisReport.userPortrait as any} />
                <ContentStructureCard data={result.analysisReport.contentStructure as any} />
                <CopyableMethodologyCard data={result.analysisReport.copyableMethodology as any} />
                <RiskWarningCard data={result.analysisReport.riskWarning as any} />
                <MonetizationCard data={result.analysisReport.monetizationAnalysis as any} />
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function VideoAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <VideoAnalysisContent />
    </Suspense>
  );
}
