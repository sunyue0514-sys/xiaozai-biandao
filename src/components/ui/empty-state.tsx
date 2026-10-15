'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Users,
  Search,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Inbox,
  LucideIcon,
} from 'lucide-react';

// 空状态类型
export type EmptyStateVariant = 'default' | 'search' | 'error' | 'success' | 'custom';

// 空状态配置
interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
}

const EMPTY_STATE_PRESETS: Record<string, EmptyStateConfig> = {
  customers: {
    icon: Users,
    title: '暂无客户',
    description: '开始添加您的第一个客户，建立客户档案',
  },
  materials: {
    icon: FileText,
    title: '暂无素材',
    description: '创建您的第一条素材，开始内容创作',
  },
  search: {
    icon: Search,
    title: '未找到结果',
    description: '尝试使用其他关键词搜索',
  },
  folder: {
    icon: FolderOpen,
    title: '文件夹为空',
    description: '当前文件夹没有任何内容',
  },
  error: {
    icon: AlertCircle,
    title: '加载失败',
    description: '数据加载出错，请稍后重试',
  },
  success: {
    icon: CheckCircle,
    title: '操作成功',
    description: '您的操作已成功完成',
  },
  inbox: {
    icon: Inbox,
    title: '收件箱为空',
    description: '您已处理所有待办事项',
  },
  default: {
    icon: Sparkles,
    title: '暂无内容',
    description: '这里还没有任何内容',
  },
};

// 空状态组件属性
interface EmptyStateProps {
  // 预设类型
  type?: keyof typeof EMPTY_STATE_PRESETS;
  // 自定义图标
  icon?: LucideIcon;
  // 自定义标题
  title?: string;
  // 自定义描述
  description?: string;
  // 操作按钮
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  // 次要操作
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  // 自定义类名
  className?: string;
  // 图标容器大小
  iconSize?: 'sm' | 'md' | 'lg';
  // 是否紧凑模式
  compact?: boolean;
}

// 图标大小映射
const iconSizeMap = {
  sm: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  md: { container: 'w-16 h-16', icon: 'w-8 h-8' },
  lg: { container: 'w-20 h-20', icon: 'w-10 h-10' },
};

// 空状态组件
export function EmptyState({
  type = 'default',
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  iconSize = 'md',
  compact = false,
}: EmptyStateProps) {
  const preset = EMPTY_STATE_PRESETS[type] || EMPTY_STATE_PRESETS.default;
  const IconComponent = icon || preset.icon;
  const sizeConfig = iconSizeMap[iconSize];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-16',
        className
      )}
    >
      {/* 图标 */}
      <div
        className={cn(
          'rounded-2xl flex items-center justify-center mb-4 bg-muted',
          sizeConfig.container
        )}
      >
        <IconComponent className={cn('text-muted-foreground', sizeConfig.icon)} />
      </div>

      {/* 标题 */}
      <h3 className={cn('font-medium text-foreground', compact ? 'text-base' : 'text-lg')}>
        {title || preset.title}
      </h3>

      {/* 描述 */}
      {(description || preset.description) && (
        <p
          className={cn(
            'text-muted-foreground mt-1 max-w-sm',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {description || preset.description}
        </p>
      )}

      {/* 操作按钮 */}
      {(action || secondaryAction) && (
        <div className={cn('flex items-center gap-2', compact ? 'mt-3' : 'mt-4')}>
          {secondaryAction && (
            <Button variant="outline" size={compact ? 'sm' : 'default'} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              size={compact ? 'sm' : 'default'}
              onClick={action.onClick}
              className="gap-2"
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// 搜索空状态
export function EmptySearchResult({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      type="search"
      description={
        searchTerm
          ? `未找到与「${searchTerm}」相关的结果`
          : '未找到匹配的结果'
      }
      action={onClear ? { label: '清除搜索', onClick: onClear } : undefined}
      className={className}
    />
  );
}

// 错误状态
export function ErrorState({
  title = '加载失败',
  description = '数据加载出错，请稍后重试',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      type="error"
      title={title}
      description={description}
      action={onRetry ? { label: '重试', onClick: onRetry } : undefined}
      className={className}
    />
  );
}

// 成功状态
export function SuccessState({
  title = '操作成功',
  description,
  onContinue,
  className,
}: {
  title?: string;
  description?: string;
  onContinue?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      type="success"
      title={title}
      description={description}
      action={onContinue ? { label: '继续', onClick: onContinue } : undefined}
      className={className}
    />
  );
}

// 无数据状态（带插图）
export function NoDataState({
  title,
  description,
  action,
  illustration,
  className,
}: {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  illustration?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {illustration || (
        <div className="w-32 h-32 rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
          <Inbox className="w-16 h-16 text-muted-foreground/50" />
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <Button className="mt-4 gap-2" onClick={action.onClick}>
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
