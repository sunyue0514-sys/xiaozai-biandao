'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  Save,
  Share2,
  ChevronRight,
  Trophy,
  Star,
  Flame,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerationFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'script' | 'rewrite' | 'topic' | 'opening';
  onSave?: () => void;
  onContinue?: () => void;
  onShare?: () => void;
}

// 成就配置
const ACHIEVEMENTS = [
  { count: 1, title: '🎉 首次创作', description: '恭喜完成首次创作！' },
  { count: 5, title: '🔥 创作新秀', description: '您已累计创作5个内容，继续保持！' },
  { count: 10, title: '⭐ 创作达人', description: '您已累计创作10个内容！' },
  { count: 25, title: '🏆 创作高手', description: '您已累计创作25个内容，太厉害了！' },
  { count: 50, title: '👑 创作大师', description: '您是真正的创作大师！累计创作50个内容！' },
  { count: 100, title: '🚀 传奇创作者', description: '100个内容！您是平台的传奇创作者！' },
];

// 类型标签映射
const TYPE_LABELS: Record<string, string> = {
  script: '脚本',
  rewrite: '仿写脚本',
  topic: '选题',
  opening: '开场白',
};

export function GenerationFeedback({
  isOpen,
  onClose,
  type,
  onSave,
  onContinue,
  onShare,
}: GenerationFeedbackProps) {
  const [stats, setStats] = useState({
    totalCount: 0,
    isNewAchievement: false,
    achievement: null as typeof ACHIEVEMENTS[0] | null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const res = await fetch('/api/generation-stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        const totalCount = data.data.totalCount || 0;
        
        // 检查是否达成新成就
        const achievement = ACHIEVEMENTS.find(a => a.count === totalCount);
        
        setStats({
          totalCount,
          isNewAchievement: !!achievement,
          achievement: achievement || null,
        });
      }
    } catch (error) {
      console.error('获取统计失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 内部使用变量，避免重复声明
  const typeLabel = TYPE_LABELS[type] || '内容';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-amber-500" />
            生成成功！
          </DialogTitle>
          <DialogDescription>
            您的{typeLabel}已生成完毕
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* 统计信息 */}
          {!isLoading && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">累计创作</span>
                  <span className="text-lg font-bold">{stats.totalCount} 个内容</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 成就提示 */}
          {stats.isNewAchievement && stats.achievement && (
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">{stats.achievement.title.split(' ')[0]}</div>
                <div className="font-bold text-amber-700 dark:text-amber-400">
                  {stats.achievement.title.split(' ').slice(1).join(' ')}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stats.achievement.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 小提示 */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">💡 小提示：</p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                保存到素材库，随时查看和修改
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                满意的内容可以分享给朋友
              </li>
              {stats.totalCount < 3 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  完成新手任务可额外获得1000算力
                </li>
              )}
            </ul>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            {onSave && (
              <Button
                onClick={() => {
                  onSave();
                  onClose();
                }}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                保存到素材库
              </Button>
            )}
            {onContinue && (
              <Button
                variant="outline"
                onClick={() => {
                  onContinue();
                  onClose();
                }}
                className="flex-1"
              >
                继续创作
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {/* 分享按钮 */}
          {onShare && (
            <Button
              variant="ghost"
              onClick={onShare}
              className="w-full text-muted-foreground"
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享给朋友
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 简化版反馈条（用于结果页顶部）
interface FeedbackBannerProps {
  type: 'script' | 'rewrite' | 'topic' | 'opening';
  totalCount?: number;
  onSave?: () => void;
  className?: string;
}

export function FeedbackBanner({ type, totalCount = 0, onSave, className }: FeedbackBannerProps) {
  const typeLabel = TYPE_LABELS[type] || '内容';
  
  // 检查成就
  const achievement = ACHIEVEMENTS.find(a => a.count === totalCount);
  
  return (
    <Card className={cn('bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">✨</div>
            <div>
              <div className="font-medium text-green-700 dark:text-green-400">
                {typeLabel}生成成功！
              </div>
              {achievement ? (
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  {achievement.title} - {achievement.description}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  您已累计创作 {totalCount} 个内容
                </div>
              )}
            </div>
          </div>
          {onSave && (
            <Button size="sm" onClick={onSave}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
