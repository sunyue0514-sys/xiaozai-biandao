'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Download, 
  FileSpreadsheet,
  Check,
  Clock,
  Hash,
  Building2,
  FileText,
  Video,
  Camera,
  MessageSquare,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScriptResult, scriptToText, scriptToCSV, exportToExcel } from '@/types/script';

interface ScriptResultViewProps {
  script: ScriptResult;
  onSave?: () => void;
  isSaved?: boolean;
}

/**
 * 结构化脚本结果展示组件
 * 包含：视频基础信息 + 分镜表格 + 拍摄建议
 */
export function ScriptResultView({ script, onSave, isSaved = false }: ScriptResultViewProps) {
  const [copied, setCopied] = useState(false);
  const [expandedShots, setExpandedShots] = useState<Set<number>>(new Set([1, 2, 3]));
  const [showFullCopywriting, setShowFullCopywriting] = useState(false);

  // 复制文本
  const handleCopy = async () => {
    const text = scriptToText(script);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  // 导出Excel
  const handleExportExcel = () => {
    exportToExcel(script);
    toast.success('已导出Excel文件');
  };

  // 切换镜头展开/收起
  const toggleShot = (shotNumber: number) => {
    setExpandedShots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shotNumber)) {
        newSet.delete(shotNumber);
      } else {
        newSet.add(shotNumber);
      }
      return newSet;
    });
  };

  // 展开所有镜头
  const expandAllShots = () => {
    setExpandedShots(new Set(script.shots.map(s => s.shotNumber)));
  };

  // 收起所有镜头
  const collapseAllShots = () => {
    setExpandedShots(new Set());
  };

  return (
    <div className="space-y-6">
      {/* 视频基础信息 */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Video className="w-5 h-5 text-primary" />
            <span className="font-semibold text-lg">视频基础信息</span>
          </div>
          
          <div className="space-y-4">
            {/* 标题 */}
            <div>
              <div className="text-sm text-muted-foreground mb-1">标题</div>
              <div className="text-xl font-bold text-foreground">{script.basicInfo.title}</div>
            </div>
            
            {/* 时长 + 标签 */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{script.basicInfo.duration}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {script.basicInfo.hashtags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* 合作品牌 */}
            {script.basicInfo.brandPartner && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">合作品牌：{script.basicInfo.brandPartner}</span>
              </div>
            )}
            
            {/* 发布文案 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">发布文案</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await navigator.clipboard.writeText(script.basicInfo.publishCopywriting);
                    toast.success('已复制发布文案');
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  复制
                </Button>
              </div>
              <div className={cn(
                "bg-muted/30 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap",
                !showFullCopywriting && "max-h-24 overflow-hidden relative"
              )}>
                {script.basicInfo.publishCopywriting}
                {!showFullCopywriting && script.basicInfo.publishCopywriting.length > 100 && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-muted/30 to-transparent" />
                )}
              </div>
              {script.basicInfo.publishCopywriting.length > 100 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => setShowFullCopywriting(!showFullCopywriting)}
                >
                  {showFullCopywriting ? (
                    <><ChevronUp className="w-4 h-4 mr-1" />收起</>
                  ) : (
                    <><ChevronDown className="w-4 h-4 mr-1" />展开全文</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 分镜表格 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">分镜脚本</span>
              <Badge variant="outline" className="ml-2">{script.shots.length}个镜头</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={expandAllShots}>
                展开全部
              </Button>
              <Button size="sm" variant="ghost" onClick={collapseAllShots}>
                收起全部
              </Button>
            </div>
          </div>

          {/* 表格头部 */}
          <div className="hidden md:grid md:grid-cols-12 gap-2 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground mb-2">
            <div className="col-span-1 text-center">镜号</div>
            <div className="col-span-1 text-center">时长</div>
            <div className="col-span-1 text-center">景别</div>
            <div className="col-span-1 text-center">机位</div>
            <div className="col-span-3">画面</div>
            <div className="col-span-3">文案</div>
            <div className="col-span-2">备注</div>
          </div>

          {/* 镜头列表 */}
          <div className="space-y-2">
            {script.shots.map((shot) => {
              const isExpanded = expandedShots.has(shot.shotNumber);
              
              return (
                <div
                  key={shot.shotNumber}
                  className="border rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
                >
                  {/* 桌面端：表格行 */}
                  <div className="hidden md:grid md:grid-cols-12 gap-2 p-4 items-start cursor-pointer hover:bg-muted/30"
                       onClick={() => toggleShot(shot.shotNumber)}>
                    <div className="col-span-1 text-center font-bold text-primary">
                      {shot.shotNumber}
                    </div>
                    <div className="col-span-1 text-center text-sm">
                      <Badge variant="outline" className="text-xs">{shot.duration}</Badge>
                    </div>
                    <div className="col-span-1 text-center">
                      <Badge variant="secondary" className="text-xs">{shot.shotType}</Badge>
                    </div>
                    <div className="col-span-1 text-center">
                      <Badge variant="outline" className="text-xs">{shot.cameraPosition}</Badge>
                    </div>
                    <div className="col-span-3 text-sm line-clamp-2">{shot.visual}</div>
                    <div className="col-span-3 text-sm line-clamp-2">{shot.copywriting}</div>
                    <div className="col-span-2 text-sm text-muted-foreground line-clamp-2">{shot.notes}</div>
                  </div>
                  
                  {/* 移动端：卡片 */}
                  <div className="md:hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/30"
                      onClick={() => toggleShot(shot.shotNumber)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground">镜头{shot.shotNumber}</Badge>
                        <Badge variant="outline">{shot.duration}</Badge>
                        <Badge variant="secondary">{shot.shotType}</Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t pt-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">机位</div>
                          <Badge variant="outline">{shot.cameraPosition}</Badge>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">画面</div>
                          <p className="text-sm">{shot.visual}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">文案</div>
                          <p className="text-sm">{shot.copywriting}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">备注</div>
                          <p className="text-sm text-muted-foreground">{shot.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 桌面端展开详情 */}
                  {isExpanded && (
                    <div className="hidden md:block border-t bg-muted/20 p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">画面描述</div>
                          <p className="text-sm">{shot.visual}</p>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">台词/旁白</div>
                          <p className="text-sm">{shot.copywriting}</p>
                        </div>
                        <div className="col-span-2">
                          <div className="text-xs text-muted-foreground mb-1">拍摄备注</div>
                          <p className="text-sm text-muted-foreground">{shot.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 拍摄建议 */}
      {script.shootingAdvice && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span className="font-semibold">拍摄建议</span>
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{script.shootingAdvice}</p>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-500" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              复制文本
            </>
          )}
        </Button>
        
        <Button variant="outline" onClick={handleExportExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          导出Excel
        </Button>
        
        {onSave && (
          <Button onClick={onSave} disabled={isSaved}>
            {isSaved ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-500" />
                已保存
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                保存到素材库
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ScriptResultView;
