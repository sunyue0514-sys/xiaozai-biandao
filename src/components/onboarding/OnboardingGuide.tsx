'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocalStorageValue, writeLocalStorage } from '@/hooks/useLocalStorageValue';
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
  Rocket, 
  Users, 
  Target, 
  Sparkles, 
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  Lightbulb,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 引导步骤配置
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: '欢迎使用超级编导助手',
    subtitle: 'AI 驱动的短视频创作助手',
    description: '我们将用 1 分钟带你了解核心功能，帮助你快速上手。完成引导后可立即开始创作！',
    icon: Rocket,
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'customer',
    title: '第一步：创建客户档案',
    subtitle: '为你的账号建立档案',
    description: '客户档案是所有创作的基础。填写账号基本信息后，AI 将自动分析商业定位，生成专属人设报告。',
    icon: Users,
    color: 'from-blue-500 to-cyan-500',
    feature: '智能分析账号定位、目标人群、内容方向',
    action: '创建客户档案',
    actionPath: '/customer',
  },
  {
    id: 'positioning',
    title: '第二步：商业定位分析',
    subtitle: 'AI 深度分析账号价值',
    description: '基于客户信息，AI 将自动生成商业定位报告，包括人设定位、目标人群、内容方向、变现路径等核心要素。',
    icon: Target,
    color: 'from-orange-500 to-amber-500',
    feature: '人设定位、目标人群、内容方向、变现路径',
    action: '查看定位分析',
    actionPath: '/customer',
  },
  {
    id: 'creation',
    title: '第三步：选题与创作',
    subtitle: '一键生成爆款内容',
    description: '基于定位分析，AI 可为你智能推荐选题、生成文案、创作脚本。支持多种创作模式，满足不同场景需求。',
    icon: Sparkles,
    color: 'from-pink-500 to-rose-500',
    feature: '智能选题推荐、文案一键生成、脚本创作',
    action: '开始创作',
    actionPath: '/script',
  },
  {
    id: 'materials',
    title: '第四步：素材管理',
    subtitle: '沉淀你的创作资产',
    description: '所有生成的选题、文案、脚本都会自动保存到素材库，支持随时查看、编辑、复用，让创作更高效。',
    icon: FileText,
    color: 'from-green-500 to-emerald-500',
    feature: '自动保存、智能分类、快速检索',
    action: '查看素材库',
    actionPath: '/customer',
  },
];

// 功能亮点
const HIGHLIGHTS = [
  { icon: Zap, text: 'AI 智能选题推荐', color: 'text-orange-500' },
  { icon: FileText, text: '文案一键生成', color: 'text-blue-500' },
  { icon: Sparkles, text: '脚本智能创作', color: 'text-purple-500' },
  { icon: Target, text: '商业定位分析', color: 'text-green-500' },
];

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  hasCustomers: boolean;
}

export function OnboardingGuide(props: OnboardingGuideProps) {
  return props.isOpen ? <OnboardingGuideContent {...props} /> : null;
}

function OnboardingGuideContent({ isOpen, onClose, onComplete, hasCustomers }: OnboardingGuideProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (transitionTimer.current !== null) clearTimeout(transitionTimer.current);
  }, []);

  const step = ONBOARDING_STEPS[currentStep];
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const isWelcome = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (transitionTimer.current !== null) return;
    if (isLastStep) {
      handleComplete();
      return;
    }
    
    setIsAnimating(true);
    transitionTimer.current = setTimeout(() => {
      transitionTimer.current = null;
      setCurrentStep(prev => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
      setIsAnimating(false);
    }, 150);
  };

  const handlePrev = () => {
    if (transitionTimer.current !== null) return;
    if (currentStep > 0) {
      setIsAnimating(true);
      transitionTimer.current = setTimeout(() => {
        transitionTimer.current = null;
        setCurrentStep(prev => Math.max(prev - 1, 0));
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    if (transitionTimer.current !== null) {
      clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
    setIsAnimating(false);
    // 标记为跳过
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try { writeLocalStorage('onboarding_skipped', 'true'); } catch { /* Storage may be disabled. */ }
    }
    onClose();
  };

  const handleComplete = () => {
    if (transitionTimer.current !== null) {
      clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
    setIsAnimating(false);
    // 标记为已完成
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try { writeLocalStorage('onboarding_completed', 'true'); } catch { /* Storage may be disabled. */ }
    }
    onComplete();
  };

  const handleAction = () => {
    handleComplete();
    if (step.actionPath) {
      router.push(step.actionPath);
    }
  };

  if (!step) return null;

  const Icon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden gap-0">
        {/* 进度条 */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 跳过按钮 */}
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* 内容区域 */}
        <div className={cn(
          "p-6 transition-opacity duration-150",
          isAnimating && "opacity-0"
        )}>
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentStep 
                    ? "w-6 bg-gradient-to-r from-purple-500 to-indigo-600" 
                    : index < currentStep 
                      ? "bg-purple-500" 
                      : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* 欢迎页特殊布局 */}
          {isWelcome ? (
            <div className="text-center">
              {/* Logo/图标 */}
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Icon className="w-10 h-10 text-white" />
              </div>

              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl">{step.title}</DialogTitle>
                <DialogDescription className="text-base">{step.subtitle}</DialogDescription>
              </DialogHeader>

              <p className="text-muted-foreground mb-6">{step.description}</p>

              {/* 功能亮点 */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {HIGHLIGHTS.map((highlight, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <highlight.icon className={cn("w-4 h-4", highlight.color)} />
                    <span className="text-sm">{highlight.text}</span>
                  </div>
                ))}
              </div>

              {/* 开始按钮 */}
              <Button 
                className="w-full h-12 text-lg bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                onClick={handleNext}
                disabled={isAnimating}
              >
                开始引导
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <p className="text-xs text-muted-foreground mt-3">
                约 1 分钟完成，可随时跳过
              </p>
            </div>
          ) : (
            /* 步骤详情布局 */
            <div>
              <div className="flex items-start gap-4">
                {/* 步骤图标 */}
                <div className={cn(
                  "w-14 h-14 rounded-xl bg-gradient-to-br shrink-0 flex items-center justify-center",
                  step.color
                )}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <div className="flex-1">
                  <DialogHeader className="mb-2">
                    <DialogTitle className="text-xl">{step.title}</DialogTitle>
                    <DialogDescription>{step.subtitle}</DialogDescription>
                  </DialogHeader>
                </div>
              </div>

              <p className="text-muted-foreground mt-4 mb-4">{step.description}</p>

              {/* 功能特点 */}
              {step.feature && (
                <div className="p-3 rounded-lg bg-muted/50 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">核心能力：</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.feature}</p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 0 || isAnimating}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  上一步
                </Button>

                <div className="flex-1" />

                {step.action && (
                  <Button
                    variant="secondary"
                    onClick={handleAction}
                    disabled={isAnimating}
                    className="bg-gradient-to-r from-purple-500/10 to-indigo-600/10 hover:from-purple-500/20 hover:to-indigo-600/20"
                  >
                    {step.action}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}

                <Button
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                  onClick={handleNext}
                  disabled={isAnimating}
                >
                  {isLastStep ? (
                    <>
                      开始使用
                      <CheckCircle2 className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      下一步
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        {!isWelcome && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>步骤 {currentStep + 1} / {ONBOARDING_STEPS.length}</span>
              <button 
                onClick={handleSkip}
                className="hover:text-foreground transition-colors"
              >
                跳过引导
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 迷你引导卡片（用于首页空状态）
interface MiniGuideProps {
  onStartOnboarding: () => void;
}

export function MiniGuide({ onStartOnboarding }: MiniGuideProps) {
  return (
    <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">新用户？开始快速引导</h3>
            <p className="text-sm text-muted-foreground">1 分钟了解核心功能，快速上手创作</p>
          </div>
          <Button onClick={onStartOnboarding} className="gradient-bg border-0">
            <Play className="w-4 h-4 mr-2" />
            开始引导
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 首次访问检查 Hook
export function useOnboarding(hasCustomers: boolean) {
  const [openMode, setOpenMode] = useState<'automatic' | 'manual' | null>(null);
  const [autoDismissed, setAutoDismissed] = useState(false);
  const [completedByAction, setCompletedByAction] = useState(false);
  const completed = useLocalStorageValue('onboarding_completed');
  const skipped = useLocalStorageValue('onboarding_skipped');
  const isOnboardingCompleted = completedByAction || !!completed;
  const showOnboarding = openMode === 'manual' ||
    (openMode === 'automatic' && !isOnboardingCompleted && !skipped && !hasCustomers);

  useEffect(() => {
    if (completed === undefined || skipped === undefined || isOnboardingCompleted || skipped || hasCustomers || autoDismissed || openMode !== null) return;
    const timer = setTimeout(() => setOpenMode('automatic'), 500);
    return () => clearTimeout(timer);
  }, [completed, skipped, isOnboardingCompleted, hasCustomers, autoDismissed, openMode]);

  const handleComplete = () => {
    setOpenMode(null);
    setAutoDismissed(true);
    setCompletedByAction(true);
    try { writeLocalStorage('onboarding_completed', 'true'); } catch { /* Keep completion for this mounted session. */ }
  };
  const handleOpen = () => {
    setAutoDismissed(true);
    setOpenMode('manual');
  };
  const handleClose = () => {
    setAutoDismissed(true);
    setOpenMode(null);
  };

  return { showOnboarding, isOnboardingCompleted, handleOpen, handleClose, handleComplete };
}
