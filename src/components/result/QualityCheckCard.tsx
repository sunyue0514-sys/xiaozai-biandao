'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  MessageCircle,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QualityCheck as QualityCheckType, COLLOQUIAL_CONFIG } from './types';

interface QualityCheckCardProps {
  check: QualityCheckType;
  compact?: boolean;  // 精简模式
  className?: string;
}

/**
 * 质量检查卡片
 * 展示字数校验、违禁词检测、口语化程度等
 * compact模式：只显示关键指标状态
 */
export function QualityCheckCard({ check, compact = false, className }: QualityCheckCardProps) {
  const { wordCountCheck, bannedWordsCheck, colloquialScore, suggestions } = check;
  
  // 口语化程度对应的颜色
  const getColloquialColor = (level: number) => {
    if (level >= 4) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (level >= 3) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    if (level >= 2) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };
  
  // 精简版：只显示关键指标状态
  if (compact) {
    const allPassed = wordCountCheck.passed && bannedWordsCheck.passed && colloquialScore >= 3;
    
    return (
      <div className={cn('flex items-center gap-3 p-2 rounded-lg', 
        allPassed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-muted/30', 
        className
      )}>
        <div className="flex items-center gap-1.5">
          {wordCountCheck.passed ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          )}
          <span className="text-xs text-muted-foreground">{wordCountCheck.actual}字</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {bannedWordsCheck.passed ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className="text-xs text-muted-foreground">违禁词</span>
        </div>
        
        <Badge className={cn('text-xs', getColloquialColor(colloquialScore))}>
          {check.colloquialLabel}
        </Badge>
      </div>
    );
  }
  
  // 详细版
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-4 h-4 text-emerald-500" />
          质量检查
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 字数校验 */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {wordCountCheck.passed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            <div>
              <span className="text-sm text-muted-foreground">字数校验</span>
              <p className="text-xs text-muted-foreground">
                目标：{wordCountCheck.targetMin}-{wordCountCheck.targetMax}字
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge 
              variant={wordCountCheck.passed ? 'secondary' : 'outline'}
              className={cn(
                'font-medium',
                wordCountCheck.passed 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
              )}
            >
              {wordCountCheck.actual}字
            </Badge>
            {!wordCountCheck.passed && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {wordCountCheck.deviation > 0 ? '+' : ''}{wordCountCheck.deviation}%
              </p>
            )}
          </div>
        </div>
        
        {/* 违禁词检测 */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            {bannedWordsCheck.passed ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-muted-foreground">违禁词检测</span>
          </div>
          <Badge 
            variant={bannedWordsCheck.passed ? 'secondary' : 'destructive'}
            className="font-medium"
          >
            {bannedWordsCheck.passed ? '通过' : `${bannedWordsCheck.found.length}个`}
          </Badge>
        </div>
        
        {/* 违禁词列表 */}
        {!bannedWordsCheck.passed && bannedWordsCheck.found.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bannedWordsCheck.found.map((word, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
              >
                {word}
              </Badge>
            ))}
          </div>
        )}
        
        {/* 口语化程度 */}
        <div className="p-3 rounded-lg border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">口语化程度</span>
            </div>
            <Badge className={cn('font-medium', getColloquialColor(colloquialScore))}>
              {check.colloquialLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {COLLOQUIAL_CONFIG[colloquialScore].description}
          </p>
        </div>
        
        {/* 优化建议 */}
        {suggestions.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">优化建议</span>
            </div>
            <ul className="space-y-1.5">
              {suggestions.map((suggestion, index) => (
                <li 
                  key={index}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-amber-500 shrink-0">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
