'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Brain,
  Target,
  TrendingUp,
  Star,
  Lightbulb,
  PenTool,
  MessageSquare,
  Heart,
  Loader2,
  RefreshCw,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '@/lib/api';

interface StyleProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StyleProfile {
  id: number;
  uid: string;
  writingStyle?: string;
  tonePreference?: string;
  languageStyle?: string;
  titleFormulas?: string[];
  preferredOpeningTypes?: string[];
  preferredScriptTypes?: string[];
  dominantEmotions?: string[];
  totalContents: number;
  totalHits: number;
  hitRate?: number;
  avgViews?: number;
  avgLikes?: number;
  learningProgress: number;
  confidenceScore?: number;
  lastLearnedAt?: string;
}

// 中文映射
const STYLE_NAMES: Record<string, string> = {
  formal: '正式专业',
  casual: '轻松自然',
  humorous: '幽默风趣',
  professional: '专业权威',
};

const TONE_NAMES: Record<string, string> = {
  friendly: '亲切友好',
  authoritative: '权威专业',
  neutral: '客观中立',
};

const LANGUAGE_NAMES: Record<string, string> = {
  concise: '简洁明了',
  detailed: '详尽细致',
  colloquial: '口语化表达',
};

const OPENING_NAMES: Record<string, string> = {
  suspense: '悬念式',
  pain: '痛点式',
  contrast: '反差式',
  question: '疑问式',
  story: '故事式',
  golden: '金句式',
};

const EMOTION_NAMES: Record<string, string> = {
  curiosity: '好奇心',
  anxiety: '焦虑感',
  resonance: '共鸣感',
  surprise: '惊喜感',
  anger: '愤怒感',
};

export function StyleProfileDialog({ open, onOpenChange }: StyleProfileDialogProps) {
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLearning, setIsLearning] = useState(false);

  // 加载风格画像
  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/memory/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      
      if (result.success) {
        setProfile(result.data);
      }
    } catch (error) {
      console.error('加载风格画像失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 触发学习
  const handleLearn = async () => {
    setIsLearning(true);
    try {
      const token = getToken();
      const response = await fetch('/api/memory/profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      
      if (result.success) {
        setProfile(result.data);
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error) {
      toast.error('学习失败，请稍后重试');
    } finally {
      setIsLearning(false);
    }
  };

  // 计算学习进度
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            我的风格画像
          </DialogTitle>
          <DialogDescription>
            AI学习你的创作经验，生成专属于你的写作风格
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !profile ? (
            // 无画像状态
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">还没有风格画像</h3>
              <p className="text-sm text-muted-foreground mb-4">
                记录发布效果后，AI会学习你的爆款经验
              </p>
              <Button onClick={handleLearn} variant="outline">
                开始学习
              </Button>
            </div>
          ) : (
            <>
              {/* 学习进度 */}
              <Card className="border-border/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      <span className="font-medium">学习进度</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{profile.learningProgress}%</span>
                  </div>
                  <Progress value={profile.learningProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    基于 {profile.totalContents} 条内容，{profile.totalHits} 个爆款
                  </p>
                </CardContent>
              </Card>

              {/* 核心数据 */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="border-border/50">
                  <CardContent className="pt-4 text-center">
                    <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-2" />
                    <div className="text-2xl font-bold">{profile.hitRate?.toFixed(1) || 0}%</div>
                    <div className="text-xs text-muted-foreground">爆款率</div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="pt-4 text-center">
                    <BarChart3 className="w-5 h-5 mx-auto text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{formatNumber(profile.avgViews || 0)}</div>
                    <div className="text-xs text-muted-foreground">平均播放</div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="pt-4 text-center">
                    <Heart className="w-5 h-5 mx-auto text-red-500 mb-2" />
                    <div className="text-2xl font-bold">{formatNumber(profile.avgLikes || 0)}</div>
                    <div className="text-xs text-muted-foreground">平均点赞</div>
                  </CardContent>
                </Card>
              </div>

              {/* 风格特征 */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-primary" />
                    写作风格
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">风格</div>
                      <Badge variant="outline">
                        {STYLE_NAMES[profile.writingStyle || ''] || '自然流畅'}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">语气</div>
                      <Badge variant="outline">
                        {TONE_NAMES[profile.tonePreference || ''] || '亲切友好'}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">语言</div>
                      <Badge variant="outline">
                        {LANGUAGE_NAMES[profile.languageStyle || ''] || '口语化'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 标题技巧 */}
              {profile.titleFormulas && profile.titleFormulas.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      标题技巧
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.titleFormulas.map((formula, i) => (
                        <Badge key={i} variant="secondary">
                          {formula}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 开头偏好 */}
              {profile.preferredOpeningTypes && profile.preferredOpeningTypes.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                      开头偏好
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferredOpeningTypes.map((type, i) => (
                        <Badge key={i} variant="secondary">
                          {OPENING_NAMES[type] || type}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 情绪调动 */}
              {profile.dominantEmotions && profile.dominantEmotions.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      情绪调动
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.dominantEmotions.map((emotion, i) => (
                        <Badge key={i} variant="secondary">
                          {EMOTION_NAMES[emotion] || emotion}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI置信度 */}
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {profile.confidenceScore && profile.confidenceScore > 50 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      AI置信度：{profile.confidenceScore || 0}%
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {profile.lastLearnedAt 
                      ? `上次学习：${new Date(profile.lastLearnedAt).toLocaleDateString()}`
                      : '尚未学习'
                    }
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleLearn}
                  disabled={isLearning}
                  className="flex-1"
                >
                  {isLearning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      学习中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      重新学习
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 bg-primary border-0"
                >
                  完成
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return String(num);
}
