'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Heart, Clock } from 'lucide-react';
import type { CoreEssenceV2 } from '@/types/analysis-report';

interface CoreEssenceCardV2Props {
  data: CoreEssenceV2;
}

/**
 * V2 版本 - 核心本质拆解卡片
 * 
 * 改进点：
 * - 每个观点有原文证据和时间戳
 * - 情绪触发机制是数组形式
 * - 需求分析更结构化
 */
export function CoreEssenceCardV2({ data }: CoreEssenceCardV2Props) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5 text-orange-500" />
          一、核心本质拆解
          <Badge variant="outline" className="ml-auto text-xs">V2</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">回答&quot;为什么这条能爆&quot;</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* 核心情绪 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            核心情绪
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-base px-3 py-1">
              主要：{data.coreEmotion.primaryEmotion}
            </Badge>
            <Badge variant="outline" className="text-base px-3 py-1">
              次要：{data.coreEmotion.secondaryEmotion}
            </Badge>
          </div>
          
          {/* 情绪触发机制（带时间戳证据） */}
          {data.coreEmotion.triggerMechanism && data.coreEmotion.triggerMechanism.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">触发机制：</p>
              <div className="space-y-2">
                {data.coreEmotion.triggerMechanism.map((item, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono shrink-0">
                        {item.timestamp}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">&quot;{item.originalText}&quot;</p>
                        <p className="text-muted-foreground mt-1">{item.explanation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 核心需求 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <span className="text-blue-500">🎯</span>
            核心需求
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">需求类型</p>
              <p className="font-medium">{data.coreDemand.demandType}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">需求强度</p>
              <Badge variant={data.coreDemand.demandLevel === '高' ? 'default' : 'secondary'}>
                {data.coreDemand.demandLevel}需求
              </Badge>
            </div>
          </div>
          
          {data.coreDemand.demandAnalysis && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">目标痛点</p>
                <p className="font-medium">{data.coreDemand.demandAnalysis.targetPain}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">内容解决方案</p>
                <p className="font-medium">{data.coreDemand.demandAnalysis.contentSolution}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">为什么有效</p>
                <p className="font-medium">{data.coreDemand.demandAnalysis.whyItWorks}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* 时机分析 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            时机分析
          </h4>
          <div className="space-y-2">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">趋势背景</p>
              <p className="text-sm">{data.timingAnalysis.trendBackground}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">为什么现在能火</p>
              <p className="text-sm font-medium">{data.timingAnalysis.whyNow}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
