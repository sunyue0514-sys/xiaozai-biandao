'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target,
  Users,
  TrendingUp,
  Zap,
  Heart,
  Sparkles,
  Video,
  MessageSquare,
  Lightbulb,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreationAnalysis } from './types';

interface CreationAnalysisCardProps {
  analysis: CreationAnalysis;
  className?: string;
}

/**
 * 创作分析卡片（详细版专用）
 * 包含五阶系统、四点分析、目标人群、文案框架等深度分析
 */
export function CreationAnalysisCard({ analysis, className }: CreationAnalysisCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-4 h-4 text-primary" />
          创作分析
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 选题分析 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Target className="w-4 h-4 text-muted-foreground" />
            选题分析
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.topicAnalysis}
          </p>
        </div>
        
        {/* 五阶系统分析 */}
        {analysis.fiveStageSystem && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="w-4 h-4 text-primary" />
              五阶系统分析
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">价值生成：</span>
                <span className="text-foreground">{analysis.fiveStageSystem.valueGeneration}</span>
              </div>
              <div>
                <span className="text-muted-foreground">商业架构：</span>
                <span className="text-foreground">{analysis.fiveStageSystem.businessArchitecture}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* 四点分析 */}
        {analysis.fourPointsAnalysis && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Zap className="w-4 h-4 text-amber-500" />
              四点分析
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20">
                <span className="text-blue-600 dark:text-blue-400 font-medium">需求</span>
                <p className="text-muted-foreground text-xs mt-1">{analysis.fourPointsAnalysis.needs}</p>
              </div>
              <div className="p-2 rounded bg-red-50 dark:bg-red-900/20">
                <span className="text-red-600 dark:text-red-400 font-medium">痛点</span>
                <p className="text-muted-foreground text-xs mt-1">{analysis.fourPointsAnalysis.painPoints}</p>
              </div>
              <div className="p-2 rounded bg-green-50 dark:bg-green-900/20">
                <span className="text-green-600 dark:text-green-400 font-medium">爽点</span>
                <p className="text-muted-foreground text-xs mt-1">{analysis.fourPointsAnalysis.pleasurePoints}</p>
              </div>
              <div className="p-2 rounded bg-purple-50 dark:bg-purple-900/20">
                <span className="text-purple-600 dark:text-purple-400 font-medium">痒点</span>
                <p className="text-muted-foreground text-xs mt-1">{analysis.fourPointsAnalysis.itchPoints}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 目标人群 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Users className="w-4 h-4 text-muted-foreground" />
            目标人群
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {analysis.targetAudience}
          </p>
        </div>
        
        {/* 视频类型 */}
        {analysis.videoType && (
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">视频类型</span>
            <Badge variant="secondary" className="text-xs">{analysis.videoType}</Badge>
          </div>
        )}
        
        {/* 营销策略 */}
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">营销策略</span>
          <Badge variant="outline" className="text-xs">{analysis.marketingStrategy}</Badge>
        </div>
        
        {/* 文案框架 */}
        {analysis.framework && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              文案框架
            </div>
            <p className="text-xs text-muted-foreground mb-2">{analysis.framework.structure}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">开篇{analysis.framework.opening}字</Badge>
              <Badge variant="outline">论据A {analysis.framework.argumentA}字</Badge>
              <Badge variant="outline">论据B {analysis.framework.argumentB}字</Badge>
              <Badge variant="outline">论据C {analysis.framework.argumentC}字</Badge>
              <Badge variant="outline">总结{analysis.framework.conclusion}字</Badge>
            </div>
          </div>
        )}
        
        {/* 拍摄方式 */}
        {analysis.shootingMethod && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Camera className="w-4 h-4 text-muted-foreground" />
              拍摄方式
            </div>
            <div className="text-sm">
              <Badge variant="secondary" className="mr-2">{analysis.shootingMethod.method}</Badge>
              <span className="text-muted-foreground">{analysis.shootingMethod.reason}</span>
            </div>
            {analysis.shootingMethod.alternative && (
              <p className="text-xs text-muted-foreground">
                备选：{analysis.shootingMethod.alternative}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
