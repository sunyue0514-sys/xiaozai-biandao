'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText,
  User,
  Building2,
  Target,
  Hash,
} from 'lucide-react';
import { CreationRequirements } from './types';

interface CreationSummaryProps {
  requirements: CreationRequirements;
  className?: string;
}

// 创作模式映射
const CREATION_MODE_MAP: Record<string, string> = {
  original_humanity: '原创文案（人性爆款）',
  original_8: '原创文案八法',
  rewrite_source: '洗稿',
  rewrite_style: '仿写',
  style_simulation: '文风模拟',
  dialogue: '对话流',
};

// 脚本类型映射
const SCRIPT_TYPE_MAP: Record<string, string> = {
  opinion: '聊观点',
  knowledge: '教知识',
  story: '讲故事',
  process: '晒过程',
};

/**
 * 创作需求回顾组件
 * 显示创作时的核心参数，帮助用户理解生成结果
 */
export function CreationSummary({ requirements, className }: CreationSummaryProps) {
  const {
    topic,
    mode,
    creationMode,
    scriptType,
    industry,
    wordCount,
    customerName,
    ipPositioning,
  } = requirements;
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-4 h-4 text-primary" />
          创作需求
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* 选题/主题 */}
        {topic && (
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground">选题</span>
              <p className="text-sm font-medium truncate" title={topic}>
                {topic}
              </p>
            </div>
          </div>
        )}
        
        {/* 创作模式 */}
        {creationMode && (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">创作模式</span>
            <Badge variant="secondary" className="text-xs">
              {CREATION_MODE_MAP[creationMode] || creationMode}
            </Badge>
          </div>
        )}
        
        {/* 脚本类型 */}
        {scriptType && (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">脚本类型</span>
            <Badge variant="secondary" className="text-xs">
              {SCRIPT_TYPE_MAP[scriptType] || scriptType}
            </Badge>
          </div>
        )}
        
        {/* 行业领域 */}
        {industry && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">行业</span>
            <Badge variant="outline" className="text-xs">
              {industry}
            </Badge>
          </div>
        )}
        
        {/* 字数要求 */}
        {wordCount && (
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">目标字数</span>
            <Badge variant="outline" className="text-xs">
              {wordCount}字
            </Badge>
          </div>
        )}
        
        {/* 客户名称 */}
        {customerName && (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">客户</span>
            <Badge variant="outline" className="text-xs">
              {customerName}
            </Badge>
          </div>
        )}
        
        {/* IP定位信息 */}
        {ipPositioning && (
          <div className="pt-2 border-t space-y-2">
            <span className="text-xs text-muted-foreground">IP定位</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {ipPositioning.persona && (
                <div>
                  <span className="text-muted-foreground">人设：</span>
                  <span className="font-medium">{ipPositioning.persona}</span>
                </div>
              )}
              {ipPositioning.coreAngle && (
                <div>
                  <span className="text-muted-foreground">切点：</span>
                  <span className="font-medium">{ipPositioning.coreAngle}</span>
                </div>
              )}
              {ipPositioning.productService && (
                <div>
                  <span className="text-muted-foreground">产品：</span>
                  <span className="font-medium truncate" title={ipPositioning.productService}>
                    {ipPositioning.productService}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
