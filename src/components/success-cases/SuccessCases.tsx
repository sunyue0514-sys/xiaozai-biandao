'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, Eye, Users, Store, BookOpen, Utensils, Home, Leaf, Sparkles as SparkleIcon, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessCase {
  id: number;
  user_nickname: string;
  user_avatar: string | null;
  platform: string;
  case_type: string;
  case_data: {
    value: string;
    unit: string;
    time: string;
    industry?: string;
    identity?: string;
    experience?: string;
  };
  used_feature: string;
  testimonial: string;
  sort_order: number;
}

interface SuccessCasesProps {
  className?: string;
  compact?: boolean;
}

// 行业图标配置
const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  '知识付费': BookOpen,
  '美食': Utensils,
  '餐饮': Store,
  '美妆护肤': SparkleIcon,
  '装修': Home,
  '三农': Leaf,
};

// 行业颜色配置
const INDUSTRY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  '知识付费': { bg: 'bg-blue-500', text: 'text-blue-500', icon: 'bg-blue-100' },
  '美食': { bg: 'bg-orange-500', text: 'text-orange-500', icon: 'bg-orange-100' },
  '餐饮': { bg: 'bg-green-500', text: 'text-green-500', icon: 'bg-green-100' },
  '美妆护肤': { bg: 'bg-pink-500', text: 'text-pink-500', icon: 'bg-pink-100' },
  '装修': { bg: 'bg-indigo-500', text: 'text-indigo-500', icon: 'bg-indigo-100' },
  '三农': { bg: 'bg-emerald-500', text: 'text-emerald-500', icon: 'bg-emerald-100' },
};

// 平台配置
const PLATFORM_CONFIG: Record<string, { color: string; bgColor: string }> = {
  '抖音': { color: 'text-pink-600', bgColor: 'bg-pink-50' },
  '视频号': { color: 'text-green-600', bgColor: 'bg-green-50' },
  '快手': { color: 'text-orange-600', bgColor: 'bg-orange-50' },
};

// 案例类型图标
const CASE_TYPE_ICONS: Record<string, typeof TrendingUp> = {
  '涨粉': TrendingUp,
  '播放量': Eye,
  '引流': Users,
  '获客': Store,
};

export function SuccessCases({ className, compact = false }: SuccessCasesProps) {
  const [cases, setCases] = useState<SuccessCase[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/success-cases')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setCases(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 自动轮播
  useEffect(() => {
    if (cases.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % cases.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [cases.length]);

  if (loading || cases.length === 0) return null;

  // 紧凑模式（算力购买页）
  if (compact) {
    const currentCase = cases[currentIndex];
    const industry = currentCase.case_data.industry || '知识付费';
    const IndustryIcon = INDUSTRY_ICONS[industry] || BookOpen;
    const industryColor = INDUSTRY_COLORS[industry] || INDUSTRY_COLORS['知识付费'];
    const platformConfig = PLATFORM_CONFIG[currentCase.platform] || PLATFORM_CONFIG['抖音'];

    return (
      <div className={cn("relative", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">真实案例</span>
          </div>
          <div className="flex items-center gap-1">
            {cases.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  idx === currentIndex ? "bg-primary w-3" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10 transition-all duration-500">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", industryColor.icon)}>
            <IndustryIcon className={cn("h-5 w-5", industryColor.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{currentCase.user_nickname}</span>
              <span className={cn("text-xs px-1.5 py-0.5 rounded", platformConfig.bgColor, platformConfig.color)}>
                {currentCase.platform}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {currentCase.case_data.value}
              </span>
              <span className="text-xs text-muted-foreground">{currentCase.case_data.unit}</span>
              <span className="text-xs text-muted-foreground">· {currentCase.case_data.time}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 登录页 - 单行长条自动轮播（固定宽度）
  const currentCase = cases[currentIndex];
  const industry = currentCase.case_data.industry || '知识付费';
  const IndustryIcon = INDUSTRY_ICONS[industry] || BookOpen;
  const industryColor = INDUSTRY_COLORS[industry] || INDUSTRY_COLORS['知识付费'];
  const platformConfig = PLATFORM_CONFIG[currentCase.platform] || PLATFORM_CONFIG['抖音'];
  const CaseIcon = CASE_TYPE_ICONS[currentCase.case_type] || TrendingUp;

  return (
    <div className={cn("w-full", className)}>
      {/* 标题行 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">案例</span>
        </div>
        <span className="text-sm text-muted-foreground">他们的成功故事</span>
      </div>

      {/* 长条卡片 - 固定布局 */}
      <div className="relative rounded-xl border bg-gradient-to-r from-card to-muted/30 overflow-hidden">
        {/* 内容区域 - 使用 grid 固定布局 */}
        <div 
          key={currentCase.id}
          className="grid grid-cols-[48px_100px_1px_90px_1px_1fr] items-center gap-3 p-3 h-[72px]"
        >
          {/* 行业图标 - 固定48px */}
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", industryColor.icon)}>
            <IndustryIcon className={cn("h-6 w-6", industryColor.text)} />
          </div>

          {/* 用户信息 - 固定100px */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">{currentCase.user_nickname}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={cn("text-xs px-1 py-0.5 rounded", platformConfig.bgColor, platformConfig.color)}>
                {currentCase.platform}
              </span>
              <span className="text-xs text-muted-foreground truncate">{industry}</span>
            </div>
          </div>

          {/* 分割线1 */}
          <div className="h-8 w-px bg-border justify-self-center" />

          {/* 成果数据 - 固定90px */}
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", platformConfig.bgColor)}>
              <CaseIcon className={cn("h-3.5 w-3.5", platformConfig.color)} />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {currentCase.case_data.value}
              </div>
              <div className="text-xs text-muted-foreground truncate">{currentCase.case_data.time}</div>
            </div>
          </div>

          {/* 分割线2 */}
          <div className="h-8 w-px bg-border justify-self-center" />

          {/* 用户评价 - 自适应剩余空间 */}
          <div className="min-w-0 pl-2">
            <div className="text-sm text-muted-foreground line-clamp-2">
              &quot;{currentCase.testimonial}&quot;
            </div>
          </div>
        </div>

        {/* 进度指示器 */}
        <div className="absolute bottom-1.5 right-3 flex items-center gap-1">
          {cases.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "rounded-full transition-all",
                idx === currentIndex ? "w-3 h-1 bg-primary" : "w-1 h-1 bg-muted hover:bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
