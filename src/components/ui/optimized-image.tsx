'use client';

import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

// 优化的图片组件
// 自动处理加载状态、占位符和错误状态

interface OptimizedImageProps extends Omit<ImageProps, 'onLoadingComplete'> {
  // 是否显示加载动画
  showLoading?: boolean;
  // 加载时的背景色
  loadingBg?: string;
  // 错误时显示的占位图
  fallbackSrc?: string;
  // 容器类名
  containerClassName?: string;
  // 加载完成回调
  onLoaded?: () => void;
}

// 默认占位图（1x1 透明像素）
const defaultFallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNGNUY1RjciLz48L3N2Zz4=';

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  containerClassName,
  showLoading = true,
  loadingBg = 'bg-muted',
  fallbackSrc = defaultFallback,
  onLoaded,
  ...props
}: OptimizedImageProps) {
  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {/* 加载占位背景 */}
      {showLoading && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse',
            loadingBg
          )}
        />
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn('transition-opacity duration-300', className)}
        onLoad={(e) => {
          // 隐藏加载占位
          const target = e.target as HTMLImageElement;
          if (target.parentElement) {
            const placeholder = target.parentElement.querySelector('.loading-placeholder');
            if (placeholder) {
              (placeholder as HTMLElement).style.opacity = '0';
            }
          }
          onLoaded?.();
        }}
        onError={(e) => {
          // 加载失败时使用占位图
          const target = e.target as HTMLImageElement;
          if (fallbackSrc && target.src !== fallbackSrc) {
            target.src = fallbackSrc;
          }
        }}
        {...props}
      />
    </div>
  );
}

// 头像图片组件
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const avatarSizeMap = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export function AvatarImage({
  src,
  alt,
  size = 'md',
  className,
}: AvatarImageProps) {
  const dimension = avatarSizeMap[size];
  
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full bg-muted',
        className
      )}
      style={{ width: dimension, height: dimension }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={dimension}
          height={dimension}
          className="object-cover"
          unoptimized // 第三方头像通常需要 unoptimized
        />
      ) : (
        <div
          className="flex items-center justify-center w-full h-full text-muted-foreground font-medium"
          style={{ fontSize: dimension * 0.4 }}
        >
          {alt.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// 图标图片组件（用于 Logo、图标等小图）
interface IconImageProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}

export function IconImage({
  src,
  alt,
  size = 24,
  className,
}: IconImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('object-contain', className)}
      unoptimized
    />
  );
}

// 背景图片组件
interface BackgroundImageProps {
  src: string;
  alt: string;
  children?: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

export function BackgroundImage({
  src,
  alt,
  children,
  className,
  overlay = false,
  overlayOpacity = 0.5,
}: BackgroundImageProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        priority
      />
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default OptimizedImage;
