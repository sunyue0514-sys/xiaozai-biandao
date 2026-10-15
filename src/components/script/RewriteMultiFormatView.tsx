'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  FileText, 
  MessageSquare, 
  Zap,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Heart,
  Lightbulb,
  Video,
  Users,
  Download,
} from 'lucide-react';
import { 
  RewriteScriptResult,
  getHookOpeningContent,
  getFullScriptContent,
  getCallToActionContent,
  rewriteScriptToText,
} from '@/types/script';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface RewriteMultiFormatViewProps {
  script: RewriteScriptResult;
  onSave?: () => void;
  isSaved?: boolean;
}

/**
 * 导出仿写脚本为Excel文件（通过后端API）
 */
const exportToExcel = async (script: RewriteScriptResult) => {
  try {
    toast.loading('正在生成Excel...', { id: 'export-excel' });
    
    const response = await fetch('/api/rewrite-script/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    
    if (!response.ok) {
      throw new Error('导出失败');
    }
    
    // 获取文件名
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = `仿写脚本_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (match) {
        fileName = decodeURIComponent(match[1]);
      }
    }
    
    // 下载文件
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.dismiss('export-excel');
    toast.success('Excel导出成功');
  } catch (error) {
    toast.dismiss('export-excel');
    toast.error('导出失败，请重试');
    console.error('导出Excel失败:', error);
  }
};

/**
 * 仿写多形态展示组件
 * 支持四种形态：爆款开头、完整口播、问答对话版、行动号召
 */
export function RewriteMultiFormatView({ 
  script, 
  onSave, 
  isSaved = false 
}: RewriteMultiFormatViewProps) {
  const [activeTab, setActiveTab] = useState<'hook' | 'full' | 'dialogue' | 'cta'>('hook');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showAllQA, setShowAllQA] = useState(false);

  // 复制功能
  const handleCopy = async (content: string, section: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(section);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      toast.error('复制失败');
    }
  };

  // 复制全部内容
  const handleCopyAll = async () => {
    const text = rewriteScriptToText(script);
    await handleCopy(text, 'all');
  };

  // 获取内容
  const hookContent = getHookOpeningContent(script.hookOpening);
  const fullContent = getFullScriptContent(script.fullScript);
  const ctaContent = getCallToActionContent(script.callToAction);

  // 标签页配置
  const tabs = [
    { 
      id: 'hook' as const, 
      label: '爆款开头', 
      icon: Zap, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      desc: '黄金3秒钩子'
    },
    { 
      id: 'full' as const, 
      label: '完整口播', 
      icon: FileText, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      desc: '单人口播文案'
    },
    { 
      id: 'dialogue' as const, 
      label: '问答对话', 
      icon: MessageSquare, 
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      desc: '无脚本拍摄',
      disabled: !script.dialogueVersion?.qaList?.length
    },
    { 
      id: 'cta' as const, 
      label: '行动号召', 
      icon: Target, 
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      desc: '引导互动'
    },
  ];

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">选择形态查看：</span>
        <button
          onClick={() => exportToExcel(script)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>导出Excel</span>
        </button>
      </div>
      <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-xl overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;
          
          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all whitespace-nowrap cursor-pointer",
                isActive
                  ? `${tab.bgColor} ${tab.color} font-semibold shadow-sm ring-1 ring-current/20`
                  : isDisabled
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.desc && (
                <span className="text-xs opacity-60">({tab.desc})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 内容区域 */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
        
        {/* 爆款开头 */}
        {activeTab === 'hook' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">爆款开头（黄金3秒钩子）</h3>
                <Badge variant="secondary" className="text-xs">15-30字</Badge>
              </div>
              <button
                onClick={() => handleCopy(hookContent, 'hook')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {copiedSection === 'hook' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-lg font-medium text-foreground leading-relaxed">
                {hookContent}
              </p>
            </div>
            
            {/* 新格式的额外信息 */}
            {typeof script.hookOpening === 'object' && (
              <div className="flex flex-wrap gap-3">
                {script.hookOpening.hookTechnique && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg text-sm">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-muted-foreground">钩子技巧：</span>
                    <span className="font-medium">{script.hookOpening.hookTechnique}</span>
                  </div>
                )}
                {script.hookOpening.emotionPoint && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg text-sm">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-muted-foreground">情绪触发点：</span>
                    <span className="font-medium">{script.hookOpening.emotionPoint}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 完整口播 */}
        {activeTab === 'full' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">完整口播文案</h3>
                <Badge variant="secondary" className="text-xs">200-500字</Badge>
              </div>
              <button
                onClick={() => handleCopy(fullContent, 'full')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {copiedSection === 'full' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            
            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {fullContent}
              </p>
            </div>
            
            {/* 新格式的额外信息 */}
            {typeof script.fullScript === 'object' && (
              <div className="space-y-3">
                {script.fullScript.duration && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg text-sm w-fit">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-muted-foreground">预估时长：</span>
                    <span className="font-medium">{script.fullScript.duration}</span>
                  </div>
                )}
                
                {script.fullScript.keyPoints && script.fullScript.keyPoints.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Target className="w-4 h-4" />
                      核心观点
                    </h4>
                    <div className="grid gap-2">
                      {script.fullScript.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                            {index + 1}
                          </span>
                          <span className="text-sm text-foreground">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {script.fullScript.emotionCurve && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg text-sm">
                    <span className="text-muted-foreground">情绪曲线：</span>
                    <span className="font-medium">{script.fullScript.emotionCurve}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 问答对话版 */}
        {activeTab === 'dialogue' && script.dialogueVersion?.qaList && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">问答对话版</h3>
                <Badge variant="secondary" className="text-xs">无脚本拍摄</Badge>
              </div>
              <button
                onClick={() => {
                  const qaText = script.dialogueVersion?.qaList
                    .map((qa, i) => `Q${i + 1}: ${qa.question}\n${qa.answerHints?.join('\n') || qa.answer || ''}`)
                    .join('\n\n') || '';
                  handleCopy(qaText, 'dialogue');
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {copiedSection === 'dialogue' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            
            {/* 开场介绍 */}
            {script.dialogueVersion.intro && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">开场介绍</span>
                </div>
                <p className="text-foreground">{script.dialogueVersion.intro}</p>
              </div>
            )}
            
            {/* 问答列表 */}
            <div className="space-y-3">
              {(showAllQA ? script.dialogueVersion.qaList : script.dialogueVersion.qaList.slice(0, 3)).map((qa, index) => (
                <div key={index} className="p-4 bg-muted/30 rounded-xl space-y-3">
                  {/* 问题 */}
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                      Q{index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{qa.question}</p>
                    </div>
                  </div>
                  
                  {/* 回答要点 */}
                  {qa.answerHints && qa.answerHints.length > 0 && (
                    <div className="ml-10 space-y-2">
                      <span className="text-xs text-muted-foreground">回答要点：</span>
                      <div className="space-y-1.5">
                        {qa.answerHints.map((hint, hintIndex) => (
                          <div key={hintIndex} className="flex items-start gap-2 text-sm">
                            <span className="text-purple-500 mt-0.5">•</span>
                            <span className="text-muted-foreground">{hint}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 完整回答（兼容旧格式） */}
                  {qa.answer && !qa.answerHints && (
                    <div className="ml-10 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-foreground">{qa.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 展开更多 */}
            {script.dialogueVersion.qaList.length > 3 && (
              <button
                onClick={() => setShowAllQA(!showAllQA)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                {showAllQA ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    查看全部 {script.dialogueVersion.qaList.length} 个问答
                  </>
                )}
              </button>
            )}
            
            {/* 结尾升华 */}
            {script.dialogueVersion.closing && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">结尾升华</span>
                </div>
                <p className="text-foreground">{script.dialogueVersion.closing}</p>
              </div>
            )}
            
            {/* 拍摄建议 */}
            {script.dialogueVersion.shootingTips && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">拍摄建议：</span>
                <span className="text-sm font-medium">{script.dialogueVersion.shootingTips}</span>
              </div>
            )}
          </div>
        )}

        {/* 行动号召 */}
        {activeTab === 'cta' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">行动号召</h3>
                <Badge variant="secondary" className="text-xs">20-40字</Badge>
              </div>
              <button
                onClick={() => handleCopy(ctaContent, 'cta')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                {copiedSection === 'cta' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <p className="text-lg font-medium text-foreground leading-relaxed">
                {ctaContent}
              </p>
            </div>
            
            {/* 新格式的额外信息 */}
            {typeof script.callToAction === 'object' && (
              <div className="flex flex-wrap gap-3">
                {script.callToAction.actionType && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg text-sm">
                    <Users className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-muted-foreground">引导类型：</span>
                    <span className="font-medium">{script.callToAction.actionType}</span>
                  </div>
                )}
                {script.callToAction.valuePromise && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg text-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-muted-foreground">价值承诺：</span>
                    <span className="font-medium">{script.callToAction.valuePromise}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
        <div className="flex items-center gap-3">
          {script.hashtags && script.hashtags.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>话题：</span>
              <div className="flex gap-1">
                {script.hashtags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium"
          >
            <Copy className="w-4 h-4" />
            复制全部
          </button>
          
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaved}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                isSaved
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  已保存
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  保存
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
