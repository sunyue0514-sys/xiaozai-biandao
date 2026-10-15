'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerationTipProps {
  className?: string;
}

/**
 * 生成提示组件
 * 用于提醒用户生成时间较长，中途不要退出
 * 特点：小巧、整个组件可拖动、可展开/收起
 * 配色：使用苹果风格蓝色，融入整体 UI
 */
export function GenerationTip({ className }: GenerationTipProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 初始化位置（右上角）

  // 处理拖动开始 - 整个组件都可以拖动
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // 如果点击的是展开内容区域，不触发拖动
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-drag]')) return;
    
    e.preventDefault();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // 记录点击位置相对于组件左上角的偏移
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    }
    
    setIsDragging(true);
  }, []);

  // 处理拖动中
  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || dragOffset === null) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, clientX - dragOffset.x));
      const newTop = Math.max(0, Math.min(window.innerHeight - rect.height, clientY - dragOffset.y));
      
      setPosition({ left: newLeft, top: newTop });
    }
  }, [isDragging, dragOffset]);

  // 处理拖动结束
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOffset(null);
  }, []);

  // 绑定全局拖动事件
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // 点击展开/收起（只在非拖动时触发）
  const handleButtonClick = useCallback(() => {
    if (!isDragging) {
      setIsExpanded(prev => !prev);
    }
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      className={cn(
        'fixed z-50 select-none cursor-grab active:cursor-grabbing',
        className
      )}
      style={{
        left: position?.left ?? 'max(0px, calc(100vw - 200px))',
        top: position?.top ?? 80,
      }}
    >
      {/* 胶囊按钮 - 使用苹果风格蓝色 */}
      <div
        onClick={handleButtonClick}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
          'bg-accent dark:bg-primary/20 border border-primary/30 dark:border-primary/40',
          'hover:bg-primary/10 dark:hover:bg-primary/30 transition-colors',
          'shadow-sm cursor-pointer'
        )}
      >
        <Move className="w-3 h-3 text-primary/60" />
        <Lightbulb className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">提示</span>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-primary" />
        ) : (
          <ChevronDown className="w-3 h-3 text-primary" />
        )}
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div 
          data-no-drag
          className={cn(
            'mt-1 p-3 rounded-lg min-w-[180px] max-w-[220px]',
            'bg-accent dark:bg-primary/10 border border-primary/30 dark:border-primary/40',
            'animate-in fade-in-0 slide-in-from-top-1 duration-150',
            'shadow-sm cursor-default'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2.5 text-xs text-primary/80 dark:text-primary/70 leading-relaxed">
            <p>
              因提示词较长，返回需1分钟左右。请您中途不要退出。
            </p>
            <p>
              因大模型返回数据很长，偶尔情况下可能数据返回不完整，可尝试重新生成。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
