'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Zap, BarChart3, Flag } from 'lucide-react';
import type { ContentStructureV2 } from '@/types/analysis-report';
import { isEvidenceObject, getEvidenceText } from '@/utils/evidence-helper';

interface ContentStructureCardV2Props {
  data: ContentStructureV2;
}

/**
 * V2 版本 - 内容结构拆解卡片
 * 
 * 改进点：
 * - 钩子分析带原文引用
 * - 主体分析带视频证据
 * - 结尾分析更详细
 * - originalText 支持字符串或对象格式
 */
export function ContentStructureCardV2({ data }: ContentStructureCardV2Props) {
  // 评分颜色映射
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 7) return 'text-blue-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 7) return 'bg-blue-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 渲染 originalText 字段（支持字符串或对象格式）
  const renderOriginalText = (originalText: ContentStructureV2['hookAnalysis']['originalText']) => {
    if (!originalText) return null;
    
    if (isEvidenceObject(originalText)) {
      const obj = originalText;
      return (
        <div className="mb-3 p-2 bg-muted/50 rounded-lg">
          {obj.timestamp && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono mr-2">
              {obj.timestamp}
            </span>
          )}
          <span className="text-sm italic text-muted-foreground">
            &quot;{obj.originalText || obj.content || ''}&quot;
          </span>
        </div>
      );
    }
    
    // 字符串格式
    return (
      <div className="mb-3 p-2 bg-muted/50 rounded-lg">
        <p className="text-sm italic text-muted-foreground">&quot;{getEvidenceText(originalText)}&quot;</p>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-cyan-500" />
          四、内容结构拆解
          <Badge variant="outline" className="ml-auto text-xs">V2</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">钩子、主体、结尾技巧分析</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* 钩子分析 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            钩子分析
          </h4>
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary">{data.hookAnalysis.hookType}</Badge>
              <div className="flex items-center gap-2">
                <Progress 
                  value={data.hookAnalysis.score * 10} 
                  className="w-20 h-2"
                />
                <span className={`text-sm font-bold ${getScoreColor(data.hookAnalysis.score)}`}>
                  {data.hookAnalysis.score}/10
                </span>
              </div>
            </div>
            
            {renderOriginalText(data.hookAnalysis.originalText)}
            
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">效果：</span>{data.hookAnalysis.effect}</p>
              {data.hookAnalysis.improvement && (
                <p className="text-amber-600 dark:text-amber-400">
                  <span className="text-muted-foreground">改进建议：</span>{data.hookAnalysis.improvement}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* 主体结构分析 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            主体结构
          </h4>
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary">{data.bodyAnalysis.structureType}</Badge>
              <div className="flex items-center gap-2">
                <Progress 
                  value={data.bodyAnalysis.score * 10} 
                  className="w-20 h-2"
                />
                <span className={`text-sm font-bold ${getScoreColor(data.bodyAnalysis.score)}`}>
                  {data.bodyAnalysis.score}/10
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div className="bg-muted/30 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">节奏控制</p>
                <p className="font-medium">{data.bodyAnalysis.rhythm}</p>
              </div>
            </div>
            
            {/* 视频证据 */}
            {data.bodyAnalysis.videoEvidence && data.bodyAnalysis.videoEvidence.length > 0 && (
              <div className="mb-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">视频证据：</p>
                {data.bodyAnalysis.videoEvidence.map((evidence, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg text-sm">
                    <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono shrink-0">
                      {evidence.timestamp}
                    </span>
                    <p className="text-muted-foreground">{evidence.content}</p>
                  </div>
                ))}
              </div>
            )}
            
            {data.bodyAnalysis.improvement && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <span className="text-muted-foreground">改进建议：</span>{data.bodyAnalysis.improvement}
              </p>
            )}
          </div>
        </div>
        
        {/* 结尾分析 */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Flag className="h-4 w-4 text-green-500" />
            结尾分析
          </h4>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="secondary">{data.endingAnalysis.endingType}</Badge>
              <div className="flex items-center gap-2">
                <Progress 
                  value={data.endingAnalysis.score * 10} 
                  className="w-20 h-2"
                />
                <span className={`text-sm font-bold ${getScoreColor(data.endingAnalysis.score)}`}>
                  {data.endingAnalysis.score}/10
                </span>
              </div>
            </div>
            
            {renderOriginalText(data.endingAnalysis.originalText)}
            
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">效果：</span>{data.endingAnalysis.effect}</p>
              {data.endingAnalysis.improvement && (
                <p className="text-amber-600 dark:text-amber-400">
                  <span className="text-muted-foreground">改进建议：</span>{data.endingAnalysis.improvement}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
