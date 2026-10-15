'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import type { MonetizationAnalysisV2 } from '@/types/analysis-report';

interface MonetizationCardV2Props {
  data: MonetizationAnalysisV2;
}

/**
 * V2 版本 - 变现转化拆解卡片
 * 
 * 改进点：
 * - 转化点更详细
 * - 问题与优化分开展示
 * - 商业潜力评分
 */
export function MonetizationCardV2({ data }: MonetizationCardV2Props) {
  // 评分颜色映射
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-emerald-500" />
          七、变现转化拆解
          <Badge variant="outline" className="ml-auto text-xs">V2</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">商业化路径与转化分析</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* 变现路径 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            变现路径
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">主要路径</p>
              <p className="font-medium">{data.monetizationPath.primaryPath}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">转化漏斗</p>
              <p className="font-medium">{data.monetizationPath.conversionFunnel}</p>
            </div>
          </div>
        </div>
        
        {/* 转化点 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            视频内转化点
          </h4>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            {data.conversionHooks.inVideoHooks && data.conversionHooks.inVideoHooks.length > 0 ? (
              <ul className="space-y-2">
                {data.conversionHooks.inVideoHooks.map((hook, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {hook}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">暂无明显转化点</p>
            )}
          </div>
        </div>
        
        {/* 问题与优化 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 存在问题 */}
          <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <h5 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              存在问题
            </h5>
            {data.conversionHooks.problems && data.conversionHooks.problems.length > 0 ? (
              <ul className="space-y-2">
                {data.conversionHooks.problems.map((problem, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {problem}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">暂无问题</p>
            )}
          </div>
          
          {/* 优化建议 */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
            <h5 className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              优化建议
            </h5>
            {data.conversionHooks.optimizations && data.conversionHooks.optimizations.length > 0 ? (
              <ul className="space-y-2">
                {data.conversionHooks.optimizations.map((optimization, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {optimization}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">暂无建议</p>
            )}
          </div>
        </div>
        
        {/* 商业潜力 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            商业潜力
          </h4>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Progress 
                  value={data.commercialPotential.potentialScore * 10} 
                  className="w-24 h-2"
                />
                <span className={`text-lg font-bold ${getScoreColor(data.commercialPotential.potentialScore)}`}>
                  {data.commercialPotential.potentialScore}/10
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">适合产品</p>
                <div className="flex flex-wrap gap-1">
                  {data.commercialPotential.suitableProducts && data.commercialPotential.suitableProducts.length > 0 ? (
                    data.commercialPotential.suitableProducts.map((product, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{product}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">暂无</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">预估转化</p>
                <p className="font-medium">{data.commercialPotential.estimatedConversionRate}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
