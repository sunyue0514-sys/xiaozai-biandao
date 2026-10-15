'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Gift,
  Sparkles,
  FileVideo,
  Save,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: number;
  task_key: string;
  task_name: string;
  task_description: string;
  step_order: number;
  reward_power: number;
  reward_valid_days: number;
  status: 'pending' | 'completed' | 'claimed';
  completed_at: string | null;
  claimed_at: string | null;
}

interface TaskProgress {
  completed: number;
  total: number;
  allCompleted: boolean;
}

interface BeginnerTasksProps {
  isOpen: boolean;
  onClose: () => void;
}

// 任务图标映射
const TASK_ICONS: Record<string, typeof FileVideo> = {
  extract_script: FileVideo,
  generate_rewrite: Sparkles,
  save_material: Save,
};

// 任务路径映射
const TASK_PATHS: Record<string, string> = {
  extract_script: '/inspiration-cocreate',
  generate_rewrite: '/inspiration-cocreate',
  save_material: '/operations/content-library',
};

export function BeginnerTasks({ isOpen, onClose }: BeginnerTasksProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<TaskProgress>({ completed: 0, total: 0, allCompleted: false });
  const [isLoading, setIsLoading] = useState(true);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [rewardData, setRewardData] = useState<any>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const res = await fetch('/api/onboarding/tasks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.data.tasks);
        setProgress(data.data.progress);
      }
    } catch (error) {
      console.error('获取任务失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (task.status === 'completed' || task.status === 'claimed') {
      return;
    }

    // 跳转到对应页面
    const path = TASK_PATHS[task.task_key];
    if (path) {
      // 关闭弹窗
      onClose();
      // 跳转
      router.push(path);
    }
  };

  const handleClaimReward = async () => {
    if (isClaiming) return;
    setIsClaiming(true);

    try {
      const token = localStorage.getItem('sessionToken');
      const res = await fetch('/api/onboarding/claim-reward', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setRewardData(data.data);
        setShowRewardDialog(true);
        // 刷新任务状态
        await fetchTasks();
      } else {
        alert(data.error || '领取失败');
      }
    } catch (error) {
      console.error('领取奖励失败:', error);
      alert('领取失败，请稍后重试');
    } finally {
      setIsClaiming(false);
    }
  };

  const getTaskIcon = (taskKey: string) => {
    return TASK_ICONS[taskKey] || FileVideo;
  };

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="text-2xl">🎉</span>
              新手任务
              {progress.allCompleted && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  已完成
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              完成以下任务，熟悉平台核心功能，并获得算力奖励
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* 进度条 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">完成进度</span>
              <span className="text-sm font-medium">
                {progress.completed}/{progress.total}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* 任务列表 */}
          <div className="mt-6 space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : (
              tasks.map((task) => {
                const isCompleted = task.status === 'completed' || task.status === 'claimed';
                const Icon = getTaskIcon(task.task_key);

                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer',
                      isCompleted
                        ? 'bg-muted/50 border-muted'
                        : 'bg-card hover:bg-accent hover:border-primary/50 border-border'
                    )}
                  >
                    {/* 状态图标 */}
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* 任务信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className={cn(
                          'font-medium',
                          isCompleted && 'text-muted-foreground'
                        )}>
                          {task.task_name}
                        </span>
                      </div>
                      <p className={cn(
                        'text-sm mt-1',
                        isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'
                      )}>
                        {task.task_description}
                      </p>
                      {task.reward_power > 0 && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          奖励 {task.reward_power} 算力
                        </p>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    {!isCompleted && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 领取奖励按钮 */}
          {progress.allCompleted && !tasks.some(t => t.status === 'claimed') && (
            <div className="mt-6">
              <Button
                onClick={handleClaimReward}
                disabled={isClaiming}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Gift className="w-4 h-4 mr-2" />
                {isClaiming ? '领取中...' : '领取 1000 算力奖励'}
              </Button>
            </div>
          )}

          {/* 已领取提示 */}
          {tasks.some(t => t.status === 'claimed') && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              ✓ 奖励已领取，快去创作吧！
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 奖励成功弹窗 */}
      <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="py-4">
            <div className="text-6xl mb-4">🎊</div>
            <DialogHeader>
              <DialogTitle className="text-2xl">恭喜完成任务！</DialogTitle>
              <DialogDescription className="text-lg mt-2">
                你已获得 <span className="text-amber-500 font-bold">{rewardData?.rewardPower || 1000}</span> 算力奖励
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mt-2">
              有效期 {rewardData?.validDays || 7} 天
            </p>
            <Button
              onClick={() => {
                setShowRewardDialog(false);
                onClose();
              }}
              className="mt-6 bg-gradient-to-r from-primary to-primary/80"
            >
              开始创作 <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
