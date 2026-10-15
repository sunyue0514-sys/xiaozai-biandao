'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, AlertOctagon } from 'lucide-react';
import type { RiskWarningV2 } from '@/types/analysis-report';

interface RiskWarningCardV2Props {
  data: RiskWarningV2;
}

/**
 * V2 版本 - 风险与避坑指南卡片
 * 
 * 改进点：
 * - 风险点带原文证据
 * - 敏感词预警是数组
 * - 可复制边界更清晰
 */
export function RiskWarningCardV2({ data }: RiskWarningCardV2Props) {
  const hasSensitiveWords = data.complianceWarning?.sensitiveWords && data.complianceWarning.sensitiveWords.length > 0;
  const hasPlatformRisks = data.complianceWarning?.platformRisks && data.complianceWarning.platformRisks.length > 0;
  const canCopyList = data.copycatBoundaries?.canCopy || [];
  const cannotCopyList = data.copycatBoundaries?.cannotCopy || [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-red-50 dark:from-amber-950/20 dark:to-red-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          六、风险与避坑指南
          <Badge variant="outline" className="ml-auto text-xs">V2</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">风险识别与合规建议</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* 敏感词预警（重要） */}
        {hasSensitiveWords && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertOctagon className="h-5 w-5 text-red-500" />
              <h4 className="font-medium text-red-700 dark:text-red-400">敏感词预警</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.complianceWarning?.sensitiveWords?.map((word, index) => (
                <Badge key={index} variant="destructive" className="text-sm">
                  {word}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              ⚠️ 以上敏感词可能导致视频被限流或下架，建议修改或避免使用
            </p>
          </div>
        )}
        
        {/* 平台规则风险 */}
        {hasPlatformRisks && (
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium">平台规则风险</h4>
            </div>
            <ul className="space-y-1">
              {data.complianceWarning?.platformRisks?.map((risk, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 内容风险 */}
        {data.contentRisks && data.contentRisks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">内容风险分析</h4>
            <div className="space-y-2">
              {data.contentRisks.map((risk, index) => (
                <div key={index} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{risk.riskPoint}</p>
                      {risk.evidence && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          证据：{risk.evidence}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        规避建议：{risk.mitigation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 可复制边界 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h4 className="font-medium text-green-700 dark:text-green-400">可以复制</h4>
            </div>
            <ul className="space-y-1">
              {canCopyList.map((item, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <h4 className="font-medium text-red-700 dark:text-red-400">不可复制</h4>
            </div>
            <ul className="space-y-1">
              {cannotCopyList.map((item, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* 适配修改建议 */}
        {data.copycatBoundaries?.adaptationTips && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <h4 className="font-medium mb-2">适配修改建议</h4>
            <p className="text-sm text-muted-foreground">{data.copycatBoundaries.adaptationTips}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
