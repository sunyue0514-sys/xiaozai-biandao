'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarketingAnalysis as MarketingAnalysisType, NATURALNESS_CONFIG } from './types';

interface MarketingAnalysisCardProps {
  analysis: MarketingAnalysisType;
  compact?: boolean;  // 精简模式
  className?: string;
}

/**
 * 营销植入分析卡片
 * 展示营销切入位置、占比和自然度评估
 * compact模式：只显示位置和自然度
 */
export function MarketingAnalysisCard({ analysis, compact = false, className }: MarketingAnalysisCardProps) {
  // 自然度对应的颜色
  const getNaturalnessColor = (level: number) => {
    if (level >= 4) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (level >= 3) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    if (level >= 2) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };
  
  // 自然度星星显示
  const renderNaturalnessStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span 
        key={i} 
        className={cn(
          'text-sm',
          i < level ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
        )}
      >
        ★
      </span>
    ));
  };
  
  // 精简版：只显示位置和自然度
  if (compact) {
    return (
      <div className={cn('flex items-center gap-4 p-3 rounded-lg bg-muted/30', className)}>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-500" />
          <span className="text-sm text-muted-foreground">营销位置：</span>
          <Badge variant="secondary" className="text-xs">{analysis.positionLabel}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">自然度：</span>
          {renderNaturalnessStars(analysis.naturalness)}
        </div>
      </div>
    );
  }
  
  // 详细版
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-indigo-500" />
          营销植入分析
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 切入位置 */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">切入位置</span>
          </div>
          <Badge variant="secondary" className="font-medium">
            {analysis.positionLabel}
          </Badge>
        </div>
        
        {/* 营销占比 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">营销占比</span>
            <span className="text-sm font-medium">{analysis.ratio}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${Math.min(analysis.ratio, 100)}%` }}
            />
          </div>
        </div>
        
        {/* 自然度评估 */}
        <div className="p-3 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">自然度评估</span>
            </div>
            <Badge className={cn('font-medium', getNaturalnessColor(analysis.naturalness))}>
              {analysis.naturalnessLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-1 mb-1">
            {renderNaturalnessStars(analysis.naturalness)}
          </div>
          <p className="text-xs text-muted-foreground">
            {NATURALNESS_CONFIG[analysis.naturalness].description}
          </p>
        </div>
        
        {/* 营销关键词 */}
        {analysis.marketingText && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">检测到的营销关键词</p>
            <p className="text-sm font-medium text-foreground">
              {analysis.marketingText}
            </p>
          </div>
        )}
        
        {/* 优化建议 */}
        {analysis.naturalness < 4 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {analysis.position === 'beginning' 
                ? '建议将营销信息后移至文案中后段，先建立价值再植入产品'
                : '建议在营销信息前增加过渡语，如"所以推荐大家..."，让植入更自然'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
