'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2,
  CheckCircle2,
  Circle,
  XCircle,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationStep, GenerationStepStatus } from './types';

interface GenerationStatusProps {
  steps: GenerationStep[];
  progress: number;
  className?: string;
}

/**
 * 生成状态追踪组件
 * 展示文案生成的各个步骤状态
 */
export function GenerationStatus({ steps, progress, className }: GenerationStatusProps) {
  // 状态图标
  const getStatusIcon = (status: GenerationStepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground/50" />;
    }
  };
  
  // 状态颜色
  const getStatusColor = (status: GenerationStepStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'generating':
        return 'text-primary';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="w-4 h-4 text-primary" />
            生成状态
          </CardTitle>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 总体进度 */}
        <Progress value={progress} className="h-2" />
        
        {/* 步骤列表 */}
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-colors',
                step.status === 'generating' && 'bg-primary/5'
              )}
            >
              {getStatusIcon(step.status)}
              <div className="flex-1 min-w-0">
                <span className={cn('text-sm font-medium', getStatusColor(step.status))}>
                  {step.name}
                </span>
                {step.message && (
                  <p className="text-xs text-muted-foreground truncate">
                    {step.message}
                  </p>
                )}
              </div>
              {step.status === 'generating' && (
                <span className="text-xs text-primary animate-pulse">
                  处理中...
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
