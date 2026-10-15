'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { DataAttributionV2 } from '@/types/analysis-report';

interface DataAttributionCardV2Props {
  data: DataAttributionV2;
}

/**
 * V2 版本 - 数据深度归因卡片
 * 
 * 改进点：
 * - 互动率使用预计算值
 * - 有行业对比和差异分析
 * - 因果链带时间戳
 */
export function DataAttributionCardV2({ data }: DataAttributionCardV2Props) {
  // 解析比率字符串（去掉%号）
  const parseRate = (rate: string | undefined) => {
    if (!rate) return 0;
    return parseFloat(rate.replace('%', '')) || 0;
  };
  
  // 计算与行业平均的对比
  const getComparison = (value: number, avgRange: string) => {
    const [low, high] = avgRange.split('-').map(v => parseFloat(v.trim()));
    const avg = (low + high) / 2;
    if (value > high) return { status: 'high', diff: ((value - avg) / avg * 100).toFixed(0) };
    if (value < low) return { status: 'low', diff: ((avg - value) / avg * 100).toFixed(0) };
    return { status: 'normal', diff: '0' };
  };
  
  const metrics = [
    {
      label: '收藏率',
      key: 'collectRate' as const,
      value: parseRate(data.industryBenchmark.thisVideo.collectRate),
      avg: '15-20',
      color: 'bg-purple-500',
    },
    {
      label: '分享率',
      key: 'shareRate' as const,
      value: parseRate(data.industryBenchmark.thisVideo.shareRate),
      avg: '8-12',
      color: 'bg-blue-500',
    },
    {
      label: '评论率',
      key: 'commentRate' as const,
      value: parseRate(data.industryBenchmark.thisVideo.commentRate),
      avg: '5-10',
      color: 'bg-green-500',
    },
    {
      label: '点赞率',
      key: 'likeRate' as const,
      value: parseRate(data.industryBenchmark.thisVideo.likeRate),
      avg: '5-8',
      color: 'bg-red-500',
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          二、数据深度归因
          <Badge variant="outline" className="ml-auto text-xs">V2</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">分析数据背后的因果关系</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* 行业对标 */}
        <div className="space-y-3">
          <h4 className="font-medium">互动率对比（相对播放量）</h4>
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric) => {
              const comparison = getComparison(metric.value, metric.avg);
              return (
                <div key={metric.key} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{metric.label}</span>
                    <div className="flex items-center gap-1">
                      {comparison.status === 'high' && (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      )}
                      {comparison.status === 'low' && (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-sm font-bold ${
                        comparison.status === 'high' ? 'text-green-600' :
                        comparison.status === 'low' ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {metric.value.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(metric.value * 5, 100)} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    行业平均：{metric.avg}%
                    {comparison.status === 'high' && (
                      <span className="text-green-600 ml-1">（高于{comparison.diff}%）</span>
                    )}
                    {comparison.status === 'low' && (
                      <span className="text-red-600 ml-1">（低于{comparison.diff}%）</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
          
          {/* 差异分析 */}
          {data.industryBenchmark.differenceAnalysis && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">差异原因分析</p>
              <p className="text-muted-foreground">{data.industryBenchmark.differenceAnalysis}</p>
            </div>
          )}
        </div>
        
        {/* 因果链条 */}
        {data.causalityChain && data.causalityChain.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">因果链条</h4>
            <div className="space-y-2">
              {data.causalityChain.map((item, index) => (
                <div key={index} className="flex items-start gap-2 bg-muted/30 rounded-lg p-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-foreground">{item.contentElement}</p>
                    <p className="text-muted-foreground">→ {item.effect}</p>
                    <p className="text-blue-600">→ 数据影响：{item.dataImpact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 算法逻辑 */}
        <div className="space-y-3">
          <h4 className="font-medium">算法推荐逻辑</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">推荐触发点</p>
              <p className="text-sm font-medium">{data.algorithmLogic.recommendationTrigger}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">流量阶段</p>
              <p className="text-sm font-medium">{data.algorithmLogic.trafficStage}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                预警信号
              </p>
              <p className="text-sm font-medium">{data.algorithmLogic.warningSignal}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
