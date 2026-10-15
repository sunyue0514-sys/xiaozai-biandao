'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, Copy, CheckSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { CopyableMethodologyV2 } from '@/types/analysis-report';

interface CopyableMethodologyCardV2Props {
  data: CopyableMethodologyV2;
}

/**
 * V2 版本 - 可复制方法论卡片
 * 
 * 改进点：
 * - 选题公式是填空式模板
 * - 结构模板带时间分段
 * - 清单是可打勾格式
 */
export function CopyableMethodologyCardV2({ data }: CopyableMethodologyCardV2Props) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-green-500" />
          五、可复制方法论
          <Badge variant="outline" className="ml-auto text-xs">V2</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">可直接套用的公式和模板</p>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        {/* 选题公式 */}
        <div className="space-y-3">
          <h4 className="font-medium">选题公式（填空式）</h4>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
            <div className="flex items-start justify-between gap-2">
              <code className="text-lg font-mono text-green-700 dark:text-green-400 flex-1">
                {data.topicFormula.template}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(data.topicFormula.template)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {data.topicFormula.examples && data.topicFormula.examples.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">示例：</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.topicFormula.examples.map((example, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-3 text-sm flex items-center justify-between gap-2">
                    <span>{example}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => copyToClipboard(example)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {data.topicFormula.keyElements && data.topicFormula.keyElements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">关键要素：</span>
              {data.topicFormula.keyElements.map((element, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {element}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {/* 结构模板 */}
        {data.structureTemplate && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              结构模板（带时间分段）
            </h4>
            <div className="space-y-2">
              {data.structureTemplate.segments.map((segment, index) => (
                <div key={index} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                  <div className="w-16 text-center shrink-0">
                    <Badge variant="outline" className="font-mono text-xs">
                      {segment.timeRange}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{segment.stage}</p>
                    <p className="text-sm text-muted-foreground">{segment.content}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {data.structureTemplate.keyElements && data.structureTemplate.keyElements.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">关键要素：</span>
                {data.structureTemplate.keyElements.map((element, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {element}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 必备清单 */}
        {data.checklist && data.checklist.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-purple-500" />
              必备要素清单
            </h4>
            <div className="bg-muted/30 rounded-lg p-4">
              <ul className="space-y-2">
                {data.checklist.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-muted-foreground"
                      id={`checklist-${index}`}
                    />
                    <label htmlFor={`checklist-${index}`} className="cursor-pointer">
                      {item.replace('□ ', '')}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
