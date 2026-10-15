'use client';

import { useState } from 'react';
import { ScriptResultView } from './ScriptResultView';
import { ScriptResult } from '@/types/script';
import { cn } from '@/lib/utils';
import { Zap, FileText, Clock } from 'lucide-react';

interface DualVersionScriptViewProps {
  essentialVersion: ScriptResult;  // 精华版（15-30秒）
  detailedVersion: ScriptResult;   // 详细版（60秒）
  onSave?: () => void;
  isSaved?: boolean;
}

/**
 * 双版本脚本展示组件
 * 支持在精华版和详细版之间切换
 */
export function DualVersionScriptView({ 
  essentialVersion, 
  detailedVersion, 
  onSave, 
  isSaved = false 
}: DualVersionScriptViewProps) {
  const [activeVersion, setActiveVersion] = useState<'essential' | 'detailed'>('detailed');

  // 计算时长（从duration字段提取，支持"120秒"、"2分钟"、"2分30秒"等格式）
  const parseDuration = (duration: string): string => {
    if (!duration) return '';
    
    // 如果包含"分钟"，直接返回（如"2分钟"）
    if (duration.includes('分钟')) {
      return duration;
    }
    
    // 如果包含"秒"，提取数字
    const secondsMatch = duration.match(/(\d+)/);
    if (secondsMatch) {
      const seconds = parseInt(secondsMatch[1]);
      // 如果超过60秒，转换为分钟显示
      if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainSeconds = seconds % 60;
        return remainSeconds > 0 ? `${minutes}分${remainSeconds}秒` : `${minutes}分钟`;
      }
      return `${seconds}秒`;
    }
    
    return duration;
  };

  const essentialDuration = parseDuration(essentialVersion.basicInfo.duration);
  const detailedDuration = parseDuration(detailedVersion.basicInfo.duration);

  return (
    <div className="space-y-4">
      {/* 版本切换器 */}
      <div className="flex items-center justify-center gap-2 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setActiveVersion('essential')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all",
            activeVersion === 'essential'
              ? "bg-background shadow-sm text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="w-4 h-4" />
          <span>精华版</span>
          <span className="text-xs opacity-70">({essentialDuration})</span>
        </button>
        
        <button
          onClick={() => setActiveVersion('detailed')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all",
            activeVersion === 'detailed'
              ? "bg-background shadow-sm text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>详细版</span>
          <span className="text-xs opacity-70">({detailedDuration})</span>
        </button>
      </div>

      {/* 版本提示 */}
      <div className="text-center text-sm text-muted-foreground">
        {activeVersion === 'essential' ? (
          <span className="flex items-center justify-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            精华版：快速出片，适合热点追随时效性内容
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            详细版：深度内容，适合建立专业形象和深度讲解
          </span>
        )}
      </div>

      {/* 脚本内容 */}
      <ScriptResultView
        script={activeVersion === 'essential' ? essentialVersion : detailedVersion}
        onSave={onSave}
        isSaved={isSaved}
      />
    </div>
  );
}
