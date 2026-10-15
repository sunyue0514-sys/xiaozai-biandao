'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// 基础骨架屏组件
function SkeletonBase({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-accent animate-pulse rounded-lg', className)}
      {...props}
    />
  );
}

// 导出基础组件（保持兼容性）
export const Skeleton = SkeletonBase;

// 文本骨架屏
function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

// 卡片骨架屏
function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn('border-0', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBase className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <SkeletonBase className="h-5 w-24 rounded-lg" />
              <SkeletonBase className="h-3 w-32 rounded-lg" />
            </div>
          </div>
          <SkeletonBase className="h-6 w-16 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-4 w-16 rounded-lg" />
            <SkeletonBase className="h-4 w-8 rounded-lg" />
          </div>
          <div className="flex items-center justify-between">
            <SkeletonBase className="h-4 w-16 rounded-lg" />
            <SkeletonBase className="h-4 w-20 rounded-lg" />
          </div>
          <div className="pt-3 border-t flex items-center justify-between">
            <div className="flex gap-1">
              <SkeletonBase className="h-5 w-14 rounded-lg" />
              <SkeletonBase className="h-5 w-14 rounded-lg" />
            </div>
            <SkeletonBase className="h-4 w-4 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 表格行骨架屏
function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <SkeletonBase className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

// 列表项骨架屏
function SkeletonListItem({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-4 border-b', className)}>
      <SkeletonBase className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-4 w-1/3" />
        <SkeletonBase className="h-3 w-1/2" />
      </div>
      <SkeletonBase className="h-8 w-20 rounded-lg" />
    </div>
  );
}

// 对话框骨架屏
function SkeletonDialog() {
  return (
    <div className="space-y-4 p-6">
      <div className="space-y-2">
        <SkeletonBase className="h-6 w-1/3" />
        <SkeletonBase className="h-4 w-1/2" />
      </div>
      <div className="space-y-3">
        <SkeletonBase className="h-10 w-full" />
        <SkeletonBase className="h-20 w-full" />
      </div>
      <div className="flex justify-end gap-2">
        <SkeletonBase className="h-9 w-20" />
        <SkeletonBase className="h-9 w-20" />
      </div>
    </div>
  );
}

// 向导步骤骨架屏
function SkeletonWizardStep() {
  return (
    <div className="space-y-6">
      {/* 指南卡片 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <SkeletonBase className="w-5 h-5 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBase className="h-5 w-32" />
              <SkeletonBase className="h-4 w-full" />
              <SkeletonBase className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 表单字段 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <SkeletonBase className="h-4 w-20" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBase key={i} className="h-8 w-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-16" />
            <SkeletonBase className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SkeletonBase className="h-4 w-16" />
            <SkeletonBase className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <SkeletonBase className="h-4 w-20" />
          <SkeletonBase className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

// AI 生成骨架屏（带动画效果）
function SkeletonAIGenerating({ text = 'AI 正在生成...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/30 animate-ping" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground">{text}</p>
        <p className="text-sm text-muted-foreground mt-1">预计需要 10-30 秒</p>
      </div>
    </div>
  );
}

// 页面骨架屏
function SkeletonPage() {
  return (
    <div className="space-y-6 p-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SkeletonBase className="w-14 h-14 rounded-2xl" />
          <div className="space-y-2">
            <SkeletonBase className="h-6 w-40" />
            <SkeletonBase className="h-4 w-56" />
          </div>
        </div>
        <SkeletonBase className="h-6 w-20 rounded-lg" />
      </div>

      {/* 内容卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export {
  SkeletonBase,
  SkeletonText,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonListItem,
  SkeletonDialog,
  SkeletonWizardStep,
  SkeletonAIGenerating,
  SkeletonPage,
};
