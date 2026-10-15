'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Flame,
  Snowflake,
  Minus,
  Loader2,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  MessageSquare,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '@/lib/api';

interface PerformanceFeedbackProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: {
    id: number;
    title?: string;
    topic: string;
    scriptType?: string;
    content?: string;
    customerId?: number;
  };
  onSuccess?: () => void;
}

// 效果类型
type EffectType = 'hit' | 'normal' | 'cold';

// 播放量区间
const VIEW_RANGES = [
  { value: 'under_1k', label: '< 1千', minViews: 0, maxViews: 1000 },
  { value: '1k_1w', label: '1千 - 1万', minViews: 1000, maxViews: 10000 },
  { value: '1w_10w', label: '1万 - 10万', minViews: 10000, maxViews: 100000 },
  { value: '10w_100w', label: '10万 - 100万', minViews: 100000, maxViews: 1000000 },
  { value: 'over_100w', label: '> 100万', minViews: 1000000, maxViews: 999999999 },
];

// 平台列表
const PLATFORMS = [
  { value: 'douyin', label: '抖音', icon: '🎵' },
  { value: 'xiaohongshu', label: '小红书', icon: '📕' },
  { value: 'shipinhao', label: '视频号', icon: '📹' },
  { value: 'kuaishou', label: '快手', icon: '⚡' },
  { value: 'bilibili', label: 'B站', icon: '📺' },
];

export function PerformanceFeedback({
  open,
  onOpenChange,
  material,
  onSuccess,
}: PerformanceFeedbackProps) {
  const [effectType, setEffectType] = useState<EffectType | null>(null);
  const [viewRange, setViewRange] = useState<string>('');
  const [platform, setPlatform] = useState<string>('douyin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [learningResult, setLearningResult] = useState<{
    discoveries: string[];
    totalLearned: number;
    confidence: number;
  } | null>(null);

  // 重置状态
  useEffect(() => {
    if (open) {
      setEffectType(null);
      setViewRange('');
      setPlatform('douyin');
      setShowResult(false);
      setLearningResult(null);
    }
  }, [open]);

  // 根据效果类型估算数据
  const getEstimatedData = () => {
    if (!effectType) return null;
    
    const range = VIEW_RANGES.find(r => r.value === viewRange);
    
    switch (effectType) {
      case 'hit':
        return {
          viewCount: range ? Math.floor((range.minViews + range.maxViews) / 2) : 50000,
          likeCount: range ? Math.floor((range.minViews + range.maxViews) / 2 * 0.05) : 2500,
          isHit: true,
        };
      case 'normal':
        return {
          viewCount: 3000,
          likeCount: 150,
          isHit: false,
        };
      case 'cold':
        return {
          viewCount: 200,
          likeCount: 5,
          isHit: false,
        };
    }
  };

  // 提交反馈
  const handleSubmit = async () => {
    if (!effectType) {
      toast.error('请选择效果类型');
      return;
    }
    
    if (effectType === 'hit' && !viewRange) {
      toast.error('请选择播放量区间');
      return;
    }

    setIsSubmitting(true);

    try {
      const estimatedData = getEstimatedData();
      const token = getToken();
      
      const response = await fetch('/api/memory/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          materialId: material.id,
          customerId: material.customerId,
          title: material.title,
          topic: material.topic,
          scriptType: material.scriptType,
          contentPreview: material.content?.slice(0, 200),
          platform,
          viewCount: estimatedData?.viewCount || 0,
          likeCount: estimatedData?.likeCount || 0,
          commentCount: Math.floor((estimatedData?.likeCount || 0) * 0.1),
          shareCount: Math.floor((estimatedData?.likeCount || 0) * 0.05),
          collectCount: Math.floor((estimatedData?.likeCount || 0) * 0.15),
          userTags: [effectType === 'hit' ? '爆款' : effectType === 'normal' ? '普通' : '失败'],
          enableAnalysis: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 获取学习结果
        await fetchLearningResult();
        setShowResult(true);
        onSuccess?.();
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取学习结果
  const fetchLearningResult = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/memory/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      
      if (result.success) {
        setLearningResult({
          discoveries: generateDiscoveries(material, effectType!),
          totalLearned: result.data?.totalContents || 1,
          confidence: result.data?.confidenceScore || 0,
        });
      }
    } catch (error) {
      // 忽略错误，使用默认值
      setLearningResult({
        discoveries: generateDiscoveries(material, effectType!),
        totalLearned: 1,
        confidence: 10,
      });
    }
  };

  // 生成发现（基于素材特征）
  const generateDiscoveries = (material: any, effectType: EffectType): string[] => {
    const discoveries: string[] = [];
    
    if (effectType === 'hit') {
      if (material.scriptType) {
        const scriptTypeNames: Record<string, string> = {
          story: '讲故事',
          process: '晒过程',
          knowledge: '教知识',
          opinion: '说观点',
          product: '说产品',
        };
        discoveries.push(`「${scriptTypeNames[material.scriptType] || material.scriptType}」类型表现不错`);
      }
      
      if (material.title?.includes('?') || material.topic.includes('?')) {
        discoveries.push('疑问式标题吸引眼球');
      }
      
      if (/\d/.test(material.title || material.topic)) {
        discoveries.push('带数字的标题效果更好');
      }
      
      if (discoveries.length === 0) {
        discoveries.push('内容风格值得继续探索');
      }
    } else if (effectType === 'normal') {
      discoveries.push('记录完成，继续积累经验');
    } else {
      discoveries.push('失败案例也有价值，帮助AI避坑');
    }
    
    return discoveries;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {!showResult ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-white" />
                </div>
                效果怎么样？
              </DialogTitle>
              <DialogDescription>
                简单标记，AI会学习你的爆款经验
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              {/* 素材信息 */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium line-clamp-1">
                  {material.title || material.topic}
                </p>
                {material.scriptType && (
                  <Badge variant="outline" className="mt-1.5 text-xs">
                    {material.scriptType}
                  </Badge>
                )}
              </div>

              {/* 第一步：效果三选一 */}
              <div className="space-y-3">
                <label className="text-sm font-medium">效果如何？</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setEffectType('hit')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      effectType === 'hit'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-border hover:border-orange-300'
                    }`}
                  >
                    <Flame className={`w-8 h-8 mx-auto mb-2 ${
                      effectType === 'hit' ? 'text-orange-500' : 'text-muted-foreground'
                    }`} />
                    <span className={`font-medium ${
                      effectType === 'hit' ? 'text-orange-600' : ''
                    }`}>爆了</span>
                  </button>
                  
                  <button
                    onClick={() => setEffectType('normal')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      effectType === 'normal'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-border hover:border-blue-300'
                    }`}
                  >
                    <Minus className={`w-8 h-8 mx-auto mb-2 ${
                      effectType === 'normal' ? 'text-blue-500' : 'text-muted-foreground'
                    }`} />
                    <span className={`font-medium ${
                      effectType === 'normal' ? 'text-blue-600' : ''
                    }`}>一般</span>
                  </button>
                  
                  <button
                    onClick={() => setEffectType('cold')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      effectType === 'cold'
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30'
                        : 'border-border hover:border-cyan-300'
                    }`}
                  >
                    <Snowflake className={`w-8 h-8 mx-auto mb-2 ${
                      effectType === 'cold' ? 'text-cyan-500' : 'text-muted-foreground'
                    }`} />
                    <span className={`font-medium ${
                      effectType === 'cold' ? 'text-cyan-600' : ''
                    }`}>凉了</span>
                  </button>
                </div>
              </div>

              {/* 第二步：爆款追问播放量 */}
              {effectType === 'hit' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    播放大概多少？
                  </label>
                  <Select value={viewRange} onValueChange={setViewRange}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="选择播放量区间" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_RANGES.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 平台选择 */}
              <div className="space-y-3">
                <label className="text-sm font-medium">发布平台</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="mr-2">{p.icon}</span>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !effectType || (effectType === 'hit' && !viewRange)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 border-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      完成标记
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* 学习结果展示 */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                AI学到了！
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              {/* 发现卡片 */}
              <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">发现规律</span>
                  </div>
                  <ul className="space-y-2">
                    {learningResult?.discoveries.map((d, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        <ChevronRight className="w-4 h-4" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* 学习进度 */}
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">已学习内容</span>
                  <span className="font-medium">{learningResult?.totalLearned} 条</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AI置信度</span>
                  <span className="font-medium">{learningResult?.confidence}%</span>
                </div>
              </div>

              {/* 提示 */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  下次生成内容时，AI会自动应用这些经验，越用越懂你！
                </p>
              </div>

              {/* 按钮 */}
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-primary border-0"
              >
                知道了
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
