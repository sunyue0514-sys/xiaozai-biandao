'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  History,
  Trash2,
  Clock,
  FileText,
  ChevronRight,
  AlertCircle,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGenerationHistory, HistoryItem, HISTORY_TYPE_GROUPS, HISTORY_TYPE_ROUTES } from '@/hooks/useGenerationHistory';
import { toast } from 'sonner';
import { useCurrentTime } from '@/hooks/useCurrentTime';

interface GenerationHistoryProps {
  currentType?: string;  // 当前页面类型
  onSelectHistory?: (item: HistoryItem) => void;  // 选择历史回调
  className?: string;
  variant?: 'panel' | 'button';  // 显示模式
}

// 类型颜色配置
const TYPE_COLORS: Record<string, string> = {
  'topic': 'bg-amber-100 text-amber-700',
  'topic_batch': 'bg-amber-100 text-amber-700',
  'writing': 'bg-blue-100 text-blue-700',
  'script': 'bg-purple-100 text-purple-700',
  'qianchuan_copywriting': 'bg-orange-100 text-orange-700',
  'qianchuan_script': 'bg-orange-100 text-orange-700',
  'feedad_copywriting': 'bg-cyan-100 text-cyan-700',
  'feedad_script': 'bg-cyan-100 text-cyan-700',
  'create_opening': 'bg-green-100 text-green-700',
  'opening_batch': 'bg-green-100 text-green-700',
};

// 解析历史记录内容，返回可读的预览文本
function parseHistoryContent(item: HistoryItem | null): string {
  if (!item) return '';
  
  const { type, content } = item;
  
  // 过滤无效内容的辅助函数
  const isValidTopic = (text: string): boolean => {
    if (!text || text.length < 5) return false;
    // 过滤掉 JSON 字段名和无效值
    const invalidPatterns = /^(highlights|method|content|type|id|score|null|undefined|true|false|\[|\]|\{|\}|")$/i;
    if (invalidPatterns.test(text.trim())) return false;
    // 必须包含中文字符
    return /[\u4e00-\u9fa5]/.test(text);
  };
  
  // 对于批量选题类型，解析 JSON 并格式化显示
  if (type === 'topic_batch') {
    try {
      const data = JSON.parse(content);
      
      // 新版格式：version: '2.0'，按流量型/变现型/人设型分组
      if (data.version === '2.0' && data.groupedTopics && Array.isArray(data.groupedTopics)) {
        const lines: string[] = [];
        
        // 添加人群分析摘要
        if (data.audienceAnalysis?.profile) {
          lines.push(`【目标人群】${data.audienceAnalysis.profile.substring(0, 100)}...`);
          lines.push('');
        }
        
        data.groupedTopics.forEach((group: any) => {
          const categoryName = group.categoryInfo?.label || group.categoryId || '选题';
          lines.push(`【${categoryName}】`);
          
          if (group.subGroups && Array.isArray(group.subGroups)) {
            group.subGroups.forEach((subGroup: any) => {
              const subTypeName = subGroup.name || '';
              lines.push(`  └─ ${subTypeName}（${subGroup.goal || ''}）`);
              if (subGroup.topics && Array.isArray(subGroup.topics)) {
                let validIdx = 0;
                subGroup.topics.forEach((topic: any) => {
                  const topicContent = topic.content || topic.title || '';
                  if (isValidTopic(topicContent)) {
                    validIdx++;
                    lines.push(`      ${validIdx}. ${topicContent}`);
                  }
                });
              }
            });
          }
          lines.push(''); // 空行分隔
        });
        return lines.join('\n');
      }
      
      // 旧版格式：按说观点/教知识/晒过程/讲故事分组
      if (data.groupedTopics && Array.isArray(data.groupedTopics)) {
        const lines: string[] = [];
        data.groupedTopics.forEach((group: any) => {
          // 兼容旧版格式：group.typeInfo 或 group.categoryInfo
          const typeName = group.typeInfo?.label || group.categoryInfo?.label || group.typeId || '选题';
          lines.push(`【${typeName}】`);
          if (group.topics && Array.isArray(group.topics)) {
            let validIdx = 0;
            group.topics.forEach((topic: any) => {
              const topicContent = topic.content || topic.title || '';
              // 过滤掉无效的选题内容
              if (isValidTopic(topicContent)) {
                validIdx++;
                lines.push(`${validIdx}. ${topicContent}`);
              }
            });
          }
          lines.push(''); // 空行分隔
        });
        return lines.join('\n');
      }
    } catch {
      // 解析失败，返回原始内容
    }
  }
  
  // 对于普通选题类型，尝试解析
  if (type === 'topic') {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        const validTopics: string[] = [];
        data.forEach((item: any) => {
          const topicContent = item.content || item.title || '';
          if (isValidTopic(topicContent)) {
            validTopics.push(topicContent);
          }
        });
        return validTopics.map((t, idx) => `${idx + 1}. ${t}`).join('\n');
      }
    } catch {
      // 解析失败，返回原始内容
    }
  }
  
  // 对于对话流类型
  if (type === 'dialogue') {
    try {
      const data = JSON.parse(content);
      if (data.rounds && Array.isArray(data.rounds)) {
        return data.rounds.map((round: any) => {
          const q = round.question ? `Q: ${round.question}` : '';
          const a = round.answer ? `A: ${round.answer}` : '';
          return [q, a].filter(Boolean).join('\n');
        }).join('\n\n');
      }
    } catch {
      // 解析失败，返回原始内容
    }
  }
  
  // 对于文案创作/千川文案/信息流文案类型
  if (type === 'writing' || type === 'qianchuan_copywriting' || type === 'feedad_copywriting') {
    try {
      const data = JSON.parse(content);
      const lines: string[] = [];
      
      // 新格式：copywritings数组（多个文案）
      if (data.copywritings && Array.isArray(data.copywritings) && data.copywritings.length > 0) {
        data.copywritings.forEach((item: any, index: number) => {
          lines.push(`【文案${index + 1}】`);
          
          // 封面标题
          if (item.coverTitles && Array.isArray(item.coverTitles) && item.coverTitles.length > 0) {
            lines.push('封面标题：');
            item.coverTitles.forEach((title: string) => {
              lines.push(`  • ${title}`);
            });
          }
          
          // 正文内容
          if (item.content) {
            lines.push('正文：');
            lines.push(item.content);
          }
          lines.push(''); // 空行分隔
        });
        return lines.join('\n');
      }
      
      // 旧格式兼容：单个文案
      if (data.content) {
        if (data.coverTitles && Array.isArray(data.coverTitles) && data.coverTitles.length > 0) {
          lines.push('封面标题：');
          data.coverTitles.forEach((title: string) => {
            lines.push(`  • ${title}`);
          });
          lines.push('');
        }
        lines.push('正文：');
        lines.push(data.content);
        return lines.join('\n');
      }
    } catch {
      // 解析失败，返回原始内容
    }
  }
  
  // 其他类型直接返回原始内容
  return content;
}

// 解析历史记录标题，返回可读的简短标题
function parseHistoryTitle(item: HistoryItem): string {
  const { type, title, content } = item;
  
  // 对于批量选题类型，提取第一个选题作为标题
  if (type === 'topic_batch') {
    try {
      const data = JSON.parse(content);
      
      // 新版格式
      if (data.version === '2.0' && data.groupedTopics && Array.isArray(data.groupedTopics)) {
        // 尝试从第一个分组的第一个子分组获取选题
        const firstGroup = data.groupedTopics[0];
        if (firstGroup?.subGroups?.[0]?.topics?.[0]?.content) {
          return firstGroup.subGroups[0].topics[0].content.substring(0, 50);
        }
      }
      
      // 旧版格式
      if (data.groupedTopics && Array.isArray(data.groupedTopics)) {
        const firstGroup = data.groupedTopics[0];
        if (firstGroup?.topics?.[0]?.content) {
          return firstGroup.topics[0].content.substring(0, 50);
        }
      }
    } catch {
      // 解析失败，返回原始标题
    }
  }
  
  // 对于普通选题类型
  if (type === 'topic') {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data) && data[0]?.content) {
        return data[0].content.substring(0, 50);
      }
    } catch {
      // 解析失败，返回原始标题
    }
  }
  
  // 对于文案创作/千川文案/信息流文案类型，提取第一个封面标题或正文前50字
  if (type === 'writing' || type === 'qianchuan_copywriting' || type === 'feedad_copywriting') {
    try {
      const data = JSON.parse(content);
      
      // 新格式：copywritings数组
      if (data.copywritings && Array.isArray(data.copywritings) && data.copywritings.length > 0) {
        const firstItem = data.copywritings[0];
        // 优先使用封面标题
        if (firstItem.coverTitles && Array.isArray(firstItem.coverTitles) && firstItem.coverTitles.length > 0) {
          return firstItem.coverTitles[0].substring(0, 50);
        }
        // 否则使用正文前50字
        if (firstItem.content) {
          return firstItem.content.substring(0, 50);
        }
      }
      
      // 旧格式兼容
      if (data.coverTitles && Array.isArray(data.coverTitles) && data.coverTitles.length > 0) {
        return data.coverTitles[0].substring(0, 50);
      }
      if (data.content) {
        return data.content.substring(0, 50);
      }
    } catch {
      // 解析失败，返回原始标题
    }
  }
  
  // 返回原始标题（已经在前50字符内）
  return title;
}

export function GenerationHistory({
  currentType,
  onSelectHistory,
  className,
  variant = 'button',
}: GenerationHistoryProps) {
  const router = useRouter();
  const now = useCurrentTime();
  const {
    history,
    isLoaded,
    deleteHistory,
    clearTypeHistory,
    getTypeHistory,
    getTypeName,
    formatTime,
  } = useGenerationHistory();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<HistoryItem | null>(null);
  const [clearConfirm, setClearConfirm] = useState<string | null>(null);

  // 获取当前类型的历史或全部历史
  const displayHistory = currentType 
    ? getTypeHistory(currentType)
    : [...history].sort((a, b) => b.createdAt - a.createdAt);

  // 未读数量
  const recentCount = displayHistory.filter(
    item => now > 0 && now - item.createdAt < 24 * 60 * 60 * 1000
  ).length;

  // 复制内容
  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  // 确认删除
  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      deleteHistory(deleteConfirm.id);
      toast.success('已删除');
      setDeleteConfirm(null);
      if (selectedItem?.id === deleteConfirm.id) {
        setSelectedItem(null);
      }
    }
  };

  // 确认清空
  const handleConfirmClear = () => {
    if (clearConfirm) {
      clearTypeHistory(clearConfirm);
      toast.success('已清空该类型的历史');
      setClearConfirm(null);
    }
  };

  // 选择历史并回调
  const handleSelect = (item: HistoryItem) => {
    if (onSelectHistory) {
      onSelectHistory(item);
      setIsHistoryOpen(false);
    } else {
      setSelectedItem(item);
    }
  };

  // 跳转到历史记录详情页面
  const handleViewDetail = (item: HistoryItem) => {
    const route = HISTORY_TYPE_ROUTES[item.type];
    if (route) {
      // 将历史记录数据存储到 sessionStorage，供目标页面读取
      sessionStorage.setItem(`history_${item.id}`, JSON.stringify(item));
      // 跳转到对应页面，带上 type 和 historyId 参数
      router.push(`${route}?type=${item.type}&historyId=${item.id}`);
      setIsHistoryOpen(false);
    } else {
      toast.error('无法跳转到该类型的历史记录');
    }
  };

  if (variant === 'panel') {
    // 面板模式 - 直接显示列表
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              历史记录
            </CardTitle>
            {currentType && displayHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setClearConfirm(currentType)}
              >
                清空
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {displayHistory.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              暂无历史记录
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {displayHistory.map((item) => (
                  <div
                    key={item.id}
                    className="group p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={cn('text-xs', TYPE_COLORS[item.type])}>
                            {getTypeName(item.type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2 break-words">{parseHistoryTitle(item)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(item);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>

        {/* 清空确认 */}
        <AlertDialog open={!!clearConfirm} onOpenChange={() => setClearConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认清空</AlertDialogTitle>
              <AlertDialogDescription>
                确定要清空「{clearConfirm ? getTypeName(clearConfirm) : ''}」的所有历史记录吗？此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                确认清空
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  // 按钮模式 - 弹窗显示
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn('relative', className)}
        onClick={() => setIsHistoryOpen(true)}
      >
        <History className="w-4 h-4 mr-2" />
        历史记录
        {recentCount > 0 && (
          <Badge className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
            {recentCount > 9 ? '9+' : recentCount}
          </Badge>
        )}
      </Button>

      {/* 历史记录弹窗 */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              历史记录
            </DialogTitle>
            <DialogDescription>
              查看过去 7 天内生成的{currentType ? getTypeName(currentType) : '所有'}内容
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
            {/* 历史列表 */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {displayHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mb-3 opacity-50" />
                  <p>暂无历史记录</p>
                  <p className="text-xs mt-1">生成的内容将在这里保存 7 天</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {displayHistory.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'group p-3 rounded-lg border cursor-pointer transition-colors overflow-hidden',
                          selectedItem?.id === item.id ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                        )}
                        onClick={() => {
                          if (onSelectHistory) {
                            handleSelect(item);
                          } else {
                            handleViewDetail(item);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {!currentType && (
                                <Badge variant="secondary" className={cn('text-xs', TYPE_COLORS[item.type])}>
                                  {getTypeName(item.type)}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatTime(item.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2 break-words overflow-hidden">{parseHistoryTitle(item)}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* 内容预览 */}
            {selectedItem && (
              <div className="w-[280px] min-w-0 shrink-0 border-l pl-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <span className="text-sm font-medium">内容预览</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopy(selectedItem.content)}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(selectedItem)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 -mx-2 px-2 overflow-hidden">
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words overflow-hidden max-w-full">
                    {parseHistoryContent(selectedItem)}
                  </div>
                </ScrollArea>
                {/* 操作按钮区域 */}
                <div className="mt-3 shrink-0 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleViewDetail(selectedItem)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    查看详情
                  </Button>
                  {onSelectHistory && (
                    <Button
                      className="flex-1"
                      onClick={() => handleSelect(selectedItem)}
                    >
                      使用此内容
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {currentType && displayHistory.length > 0 && (
            <DialogFooter className="border-t pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setClearConfirm(currentType)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清空此类型历史
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条历史记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清空确认 */}
      <AlertDialog open={!!clearConfirm} onOpenChange={() => setClearConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空</AlertDialogTitle>
            <AlertDialogDescription>
              确定要清空「{clearConfirm ? getTypeName(clearConfirm) : ''}」的所有历史记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
