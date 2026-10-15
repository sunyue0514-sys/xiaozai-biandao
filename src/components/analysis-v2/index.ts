/**
 * V2 版本分析报告组件
 * 
 * 改进点：
 * - 每个观点有原文证据和时间戳
 * - 方法论是填空式模板
 * - 数据有对比和原因解释
 * - 风险分析有敏感词预警
 */

export { CoreEssenceCardV2 } from './core-essence-card-v2';
export { DataAttributionCardV2 } from './data-attribution-card-v2';
export { RiskWarningCardV2 } from './risk-warning-card-v2';
export { CopyableMethodologyCardV2 } from './copyable-methodology-card-v2';
export { UserPortraitCardV2 } from './user-portrait-card-v2';
export { ContentStructureCardV2 } from './content-structure-card-v2';
export { MonetizationCardV2 } from './monetization-card-v2';

// 类型重导出
export type {
  AnalysisReportV2,
  CoreEssenceV2,
  DataAttributionV2,
  RiskWarningV2,
  CopyableMethodologyV2,
  UserPortraitV2,
  ContentStructureV2,
  MonetizationAnalysisV2,
} from '@/types/analysis-report';
