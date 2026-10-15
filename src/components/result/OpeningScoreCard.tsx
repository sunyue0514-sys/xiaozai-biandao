'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpeningScore as OpeningScoreType } from './types';

interface OpeningScoreCardProps {
  score: OpeningScoreType;
  compact?: boolean;  // 精简模式
  className?: string;
}

/**
 * 开篇评分卡片
 * 展示好奇心触发、利益点前置、情绪共鸣三个维度的评分
 * compact模式：只显示总分和简要评价
 */
export function OpeningScoreCard({ score, compact = false, className }: OpeningScoreCardProps) {
  const percentage = Math.round((score.total / score.maxTotal) * 100);
  
  // 根据分数确定评级颜色
  const getScoreColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600 dark:text-green-400';
    if (percent >= 60) return 'text-blue-600 dark:text-blue-400';
    if (percent >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 60) return 'bg-blue-500';
    if (percent >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // 精简版：只显示总分和简要评价
  if (compact) {
    return (
      <div className={cn('p-3 rounded-lg bg-muted/30', className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">文案评分</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={cn('text-lg font-bold', getScoreColor(percentage))}>
              {score.total}
            </span>
            <span className="text-xs text-muted-foreground">/{score.maxTotal}</span>
          </div>
        </div>
        <Progress value={percentage} className="h-1.5 mb-2" />
        <p className="text-xs text-muted-foreground">{score.comment}</p>
      </div>
    );
  }
  
  // 详细版
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-amber-500" />
            文案评分
          </CardTitle>
          <div className="flex items-baseline gap-1">
            <span className={cn('text-2xl font-bold', getScoreColor(percentage))}>
              {score.total}
            </span>
            <span className="text-sm text-muted-foreground">
              /{score.maxTotal}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 总分进度条 */}
        <div className="space-y-1.5">
          <Progress 
            value={percentage} 
            className="h-2"
          />
          <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
        </div>
        
        {/* 各维度评分 */}
        <div className="space-y-3">
          {score.items.map((item, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'text-sm font-semibold',
                    item.passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  )}>
                    {item.score}
                  </span>
                  <span className="text-xs text-muted-foreground">/{item.maxScore}</span>
                </div>
              </div>
              <Progress 
                value={(item.score / item.maxScore) * 100} 
                className={cn('h-1.5', item.passed ? '' : 'opacity-60')}
              />
              <p className="text-xs text-muted-foreground pl-6">
                {item.reason}
              </p>
            </div>
          ))}
        </div>
        
        {/* 点评 */}
        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {score.comment}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
