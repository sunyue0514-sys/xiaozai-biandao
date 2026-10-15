'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  CheckCircle2,
  Sparkles,
  MessageSquare,
  FileText,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CopywritingItem, DisplayMode } from './types';
import { OpeningScoreCard } from './OpeningScoreCard';
import { MarketingAnalysisCard } from './MarketingAnalysisCard';
import { QualityCheckCard } from './QualityCheckCard';
import { CreationAnalysisCard } from './CreationAnalysisCard';

// 文案类型定义
type CopywritingType = 'writing' | 'qianchuan_copywriting' | 'feedad_copywriting';
// 广告类型定义
type AdType = 'brand_awareness' | 'lead_generation' | 'app_download';

interface CopywritingCardProps {
  item: CopywritingItem;
  index: number;
  displayMode: DisplayMode;
  generationType?: CopywritingType; // 文案类型
  adType?: AdType; // 广告类型（仅信息流广告使用）
  onCopy?: (content: string) => void;
  onSave?: (item: any) => void;
  onGenerateScript?: (item: any) => void;
  saved?: boolean;
  className?: string;
}

/**
 * 文案卡片组件
 * 
 * 精简版：文案内容 + 开篇评分 + 评级
 * 详细版：精简版 + 营销植入 + 质量检查 + 创作分析
 */
export function CopywritingCard({ 
  item, 
  index, 
  displayMode,
  generationType = 'writing',
  adType,
  onCopy,
  onSave,
  onGenerateScript,
  saved = false,
  className 
}: CopywritingCardProps) {
  const [copied, setCopied] = useState(false);
  
  const isDetailed = displayMode === 'detailed';
  const hasAnalysis = item.analysis;
  const hasCreationAnalysis = item.creationAnalysis;
  
  // 复制文案
  const handleCopy = async () => {
    if (onCopy) {
      onCopy(item.content);
    } else {
      await navigator.clipboard.writeText(item.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // 根据评级获取颜色配置（用颜色暗示，不显示"待优化"文字）
  const getRatingConfig = (rating?: string) => {
    switch (rating) {
      case 'excellent':
        return { 
          label: '优秀', 
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          border: 'border-emerald-200 dark:border-emerald-800',
        };
      case 'good':
        return { 
          label: '良好', 
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-400',
          border: 'border-blue-200 dark:border-blue-800',
        };
      case 'pass':
        return { 
          label: '合格', 
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-400',
          border: 'border-amber-200 dark:border-amber-800',
        };
      case 'needs_work':
        return { 
          label: '需优化', 
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-400',
          border: 'border-red-200 dark:border-red-800',
        };
      default:
        return { 
          label: '待分析', 
          bg: 'bg-muted',
          text: 'text-muted-foreground',
          border: 'border-muted',
        };
    }
  };
  
  const ratingConfig = getRatingConfig(item.analysis?.rating);
  
  // 文案风格标签 - 根据文案类型和广告类型区分
  const getStyleTag = (idx: number) => {
    if (generationType === 'feedad_copywriting') {
      // 信息流广告：根据广告类型显示不同风格
      const styleMap: Record<AdType, [string, string]> = {
        brand_awareness: ['风格A - 品牌故事型', '风格B - 情感共鸣型'],
        lead_generation: ['风格A - 痛点解决方案型', '风格B - 行业洞察型'],
        app_download: ['风格A - 场景痛点型', '风格B - 用户证言型'],
      };
      const styles = styleMap[adType || 'brand_awareness'];
      return styles[idx];
    } else {
      // 千川文案/普通文案：直接引导型 + 故事共情型
      return idx === 0 ? '风格A - 直接引导型' : '风格B - 故事共情型';
    }
  };
  
  return (
    <Card className={cn('overflow-hidden transition-all', className, ratingConfig.border)}>
      {/* 卡片头部 */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            文案 {index + 1}
            <Badge variant="outline" className="text-xs font-normal">
              {getStyleTag(index)}
            </Badge>
          </CardTitle>
          
          {/* 评级标签 - 用颜色暗示 */}
          {hasAnalysis && (
            <Badge className={cn(ratingConfig.bg, ratingConfig.text, 'font-medium')}>
              {ratingConfig.label}
            </Badge>
          )}
        </div>
        
        {/* 文案标签 */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 文案内容 */}
        <div className="relative group">
          <div className="p-4 rounded-lg bg-muted/30 text-sm leading-relaxed whitespace-pre-wrap">
            {item.content}
          </div>
          
          {/* 复制按钮 */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
            onClick={handleCopy}
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* 精简版：只显示开篇评分 */}
        {!isDetailed && hasAnalysis && item.analysis && (
          <OpeningScoreCard 
            score={item.analysis.openingScore} 
            compact={true}
          />
        )}
        
        {/* 详细版：显示完整分析 */}
        {isDetailed && (
          <>
            {/* 开篇评分 */}
            {hasAnalysis && item.analysis && (
              <OpeningScoreCard 
                score={item.analysis.openingScore}
                compact={false}
              />
            )}
            
            {/* 营销植入分析 */}
            {hasAnalysis && item.analysis && (
              <MarketingAnalysisCard 
                analysis={item.analysis.marketingAnalysis}
                compact={false}
              />
            )}
            
            {/* 质量检查 */}
            {hasAnalysis && item.analysis && (
              <QualityCheckCard 
                check={item.analysis.qualityCheck}
                compact={false}
              />
            )}
            
            {/* 创作分析（五阶系统、四点分析等） */}
            {hasCreationAnalysis && item.creationAnalysis && (
              <CreationAnalysisCard analysis={item.creationAnalysis} />
            )}
          </>
        )}
        
        {/* 封面标题建议 */}
        {item.coverTitles && item.coverTitles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              封面标题建议
            </div>
            <div className="flex flex-wrap gap-2">
              {item.coverTitles.map((title, i) => (
                <Badge key={i} variant="outline" className="text-sm py-1.5 px-3">
                  {title}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          {/* 生成脚本按钮 */}
          {onGenerateScript && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGenerateScript(item)}
              className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              生成脚本
            </Button>
          )}
          
          {/* 复制按钮 */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            复制
          </Button>
          
          {/* 保存按钮 */}
          {onSave && (
            <Button
              size="sm"
              variant={saved ? 'outline' : 'default'}
              onClick={() => onSave(item)}
              disabled={saved}
              className={saved ? 'bg-green-50 dark:bg-green-900/30 border-green-200 text-green-600' : 'gradient-bg border-0'}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  已添加
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  加入素材库
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
