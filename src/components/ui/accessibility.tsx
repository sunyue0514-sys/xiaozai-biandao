'use client';

import { useEffect, useRef, useCallback, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';

/* ========================================
   跳过链接组件
   ======================================== */

interface SkipLinkProps {
  href?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * 跳过链接 - 允许键盘用户跳过导航直接到达主内容
 * 用法：<SkipLink href="#main-content" />
 */
export function SkipLink({ 
  href = '#main-content', 
  children = '跳到主要内容',
  className 
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // 默认隐藏在屏幕外
        'sr-only focus:not-sr-only',
        // 获得焦点时显示
        'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
        'focus:px-4 focus:py-2 focus:rounded-lg',
        'focus:bg-primary focus:text-white',
        'focus:shadow-lg focus:outline-none',
        'focus:ring-2 focus:ring-primary focus:ring-offset-2',
        // 动画
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}

/* ========================================
   视觉隐藏组件
   ======================================== */

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'p';
  className?: string;
}

/**
 * 视觉隐藏 - 元素在视觉上隐藏，但屏幕阅读器可访问
 * 用法：<VisuallyHidden>加载中</VisuallyHidden>
 */
export function VisuallyHidden({ 
  children, 
  as: Component = 'span',
  className 
}: VisuallyHiddenProps) {
  return (
    <Component 
      className={cn('sr-only', className)}
    >
      {children}
    </Component>
  );
}

/* ========================================
   焦点陷阱 Hook
   ======================================== */

/**
 * 焦点陷阱 - 将焦点限制在指定容器内
 * 用于模态框、对话框等需要阻止焦点逃逸的场景
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isActive: boolean = true
): RefObject<T | null> {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // 保存之前聚焦的元素
    const previouslyFocused = document.activeElement as HTMLElement;

    // 聚焦到容器内第一个可聚焦元素
    if (firstElement) {
      firstElement.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // 恢复之前的焦点
      previouslyFocused?.focus?.();
    };
  }, [isActive]);

  return containerRef;
}

/* ========================================
   焦点陷阱组件
   ======================================== */

interface FocusTrapProps {
  children: ReactNode;
  isActive?: boolean;
  className?: string;
}

/**
 * 焦点陷阱组件包装器
 */
export function FocusTrap({ children, isActive = true, className }: FocusTrapProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(isActive);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

/* ========================================
   键盘导航 Hook
   ======================================== */

interface KeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onSpace?: () => void;
  enabled?: boolean;
}

/**
 * 键盘导航 Hook
 * 用法：
 * useKeyboardNavigation({
 *   onEscape: () => closeModal(),
 *   onEnter: () => handleSubmit(),
 * });
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onHome,
    onEnd,
    onSpace,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          onEnter?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          onArrowRight?.();
          break;
        case 'Home':
          onHome?.();
          break;
        case 'End':
          onEnd?.();
          break;
        case ' ':
          e.preventDefault();
          onSpace?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onHome, onEnd, onSpace]);
}

/* ========================================
   屏幕阅读器通知组件
   ======================================== */

interface LiveRegionProps {
  children: ReactNode;
  /** aria-live 值 */
  mode?: 'polite' | 'assertive' | 'off';
  /** 是否原子性更新 */
  atomic?: boolean;
  /** 相关性 */
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  className?: string;
}

/**
 * 实时区域 - 向屏幕阅读器通知内容变化
 * 用法：<LiveRegion mode="polite">已保存</LiveRegion>
 */
export function LiveRegion({
  children,
  mode = 'polite',
  atomic = true,
  relevant = 'all',
  className,
}: LiveRegionProps) {
  return (
    <div
      aria-live={mode}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

/* ========================================
   可访问图标按钮
   ======================================== */

import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 无障碍标签（必需） */
  'aria-label': string;
  /** 可选的额外描述 */
  'aria-describedby'?: string;
  /** 是否按下状态 */
  'aria-pressed'?: boolean;
  /** 是否展开状态 */
  'aria-expanded'?: boolean;
  /** 控制的元素 ID */
  'aria-controls'?: string;
}

/**
 * 图标按钮 - 自动添加焦点样式和无障碍属性
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // 基础样式
          'inline-flex items-center justify-center',
          'rounded-lg p-2',
          // 焦点样式
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-primary focus-visible:ring-offset-2',
          // 悬停样式
          'hover:bg-muted transition-colors',
          // 禁用状态
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

/* ========================================
   主内容区域包装器
   ======================================== */

interface MainContentProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

/**
 * 主内容区域 - 提供正确的地标角色和 ID
 * 用法：<MainContent><YourContent /></MainContent>
 */
export function MainContent({ 
  children, 
  id = 'main-content',
  className 
}: MainContentProps) {
  return (
    <main 
      id={id} 
      role="main"
      tabIndex={-1}
      className={cn('outline-none', className)}
    >
      {children}
    </main>
  );
}

/* ========================================
   导航地标组件
   ======================================== */

interface NavigationProps {
  children: ReactNode;
  label: string;
  className?: string;
}

/**
 * 导航地标 - 提供正确的导航角色和标签
 */
export function Navigation({ children, label, className }: NavigationProps) {
  return (
    <nav aria-label={label} className={className}>
      {children}
    </nav>
  );
}

/* ========================================
   区域地标组件
   ======================================== */

interface LandmarkProps {
  children: ReactNode;
  /** 地标类型 */
  as?: 'section' | 'article' | 'aside';
  /** 无障碍标签 */
  label: string;
  className?: string;
}

/**
 * 区域地标 - 提供正确的区域角色和标签
 */
export function Landmark({ children, as: Component = 'section', label, className }: LandmarkProps) {
  return (
    <Component aria-label={label} className={className}>
      {children}
    </Component>
  );
}

export default {
  SkipLink,
  VisuallyHidden,
  FocusTrap,
  useFocusTrap,
  useKeyboardNavigation,
  LiveRegion,
  IconButton,
  MainContent,
  Navigation,
  Landmark,
};
