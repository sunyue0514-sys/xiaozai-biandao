'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  FileText,
  BarChart3,
  Wrench,
  Radio,
  Crown,
  Smartphone,
  LogOut,
  Sparkles,
  Shield,
  Lock,
  Cog,
  Film,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  ShoppingCart,
  Megaphone,
  Package,
  Settings,
  Lightbulb,
  Video,
} from 'lucide-react';

// 菜单项样式配置 - 苹果风格统一设计
const MENU_STYLES = {
  default: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    activeBg: 'bg-primary/8',
    activeBorder: '',
    hoverBg: 'hover:bg-muted/60',
  },
  ai: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    activeBg: 'bg-primary/8',
    activeBorder: '',
    hoverBg: 'hover:bg-muted/60',
  },
  customer: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    activeBg: 'bg-primary/8',
    activeBorder: '',
    hoverBg: 'hover:bg-muted/60',
  },
  creative: {
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-500 dark:text-purple-400',
    activeBg: 'bg-purple-50/80 dark:bg-purple-900/30',
    activeBorder: '',
    hoverBg: 'hover:bg-purple-50/50 dark:hover:bg-purple-900/10',
  },
  operation: {
    iconBg: 'bg-sky-50 dark:bg-sky-900/20',
    iconColor: 'text-sky-500 dark:text-sky-400',
    activeBg: 'bg-sky-50/80 dark:bg-sky-900/30',
    activeBorder: '',
    hoverBg: 'hover:bg-sky-50/50 dark:hover:bg-sky-900/10',
  },
  qianchuan: {
    iconBg: 'bg-orange-50 dark:bg-orange-900/20',
    iconColor: 'text-orange-500 dark:text-orange-400',
    activeBg: 'bg-orange-50/80 dark:bg-orange-900/30',
    activeBorder: '',
    hoverBg: 'hover:bg-orange-50/50 dark:hover:bg-orange-900/10',
  },
  feedAd: {
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-500 dark:text-blue-400',
    activeBg: 'bg-blue-50/80 dark:bg-blue-900/30',
    activeBorder: '',
    hoverBg: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10',
  },
  tool: {
    iconBg: 'bg-muted/50',
    iconColor: 'text-muted-foreground',
    activeBg: 'bg-muted/70',
    activeBorder: '',
    hoverBg: 'hover:bg-muted/60',
  },
  member: {
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-500 dark:text-amber-400',
    activeBg: 'bg-amber-50/80 dark:bg-amber-900/30',
    activeBorder: '',
    hoverBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-900/10',
  },
  admin: {
    iconBg: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-500 dark:text-red-400',
    activeBg: 'bg-red-50/80 dark:bg-red-900/30',
    activeBorder: '',
    hoverBg: 'hover:bg-red-50/50 dark:hover:bg-red-900/10',
  },
};

const MENU_ITEMS = [
  {
    id: 'scriptless',
    name: '无脚本拍摄',
    href: '/script/scriptless',
    icon: Video,
    description: '根据拍摄场景生成定位、脚本结构、问答环节和画面建议',
    style: 'creative',
    badge: 'NEW',
    badgeStyle: 'new',
    group: 'core',
  },
  {
    id: 'inspiration-cocreate',
    name: '灵感共创',
    href: '/inspiration-cocreate',
    icon: Lightbulb,
    description: '爆款视频库，AI分析爆款特征',
    style: 'creative',
    badge: '热门',
    badgeStyle: 'hot',
    group: 'core',
  },
  {
    id: 'customer',
    name: '客户管理',
    href: '/customer',
    icon: Users,
    description: '客户大盘数据、拍摄计划管理',
    style: 'customer',
    group: 'core',
  },
  {
    id: 'script',
    name: '脚本创作',
    href: '/script',
    icon: FileText,
    description: '选题、文案创作、脚本优化',
    style: 'creative',
    group: 'core',
  },
  {
    id: 'creative-guide',
    name: '智能推导创作',
    href: '/script/creative-guide',
    icon: Sparkles,
    description: 'AI引导式对话，推导出专属爆款口播脚本',
    style: 'creative',
    badge: '新',
    badgeStyle: 'new',
    group: 'core',
  },
  {
    id: 'product-profiles',
    name: '产品档案',
    href: '/product-profiles',
    icon: Package,
    description: '管理产品信息，AI定位分析',
    style: 'customer',
    group: 'core',
  },
  {
    id: 'qianchuan',
    name: '千川素材',
    href: '/qianchuan',
    icon: ShoppingCart,
    description: '抖音电商专属带货素材',
    style: 'qianchuan',
    badge: '新',
    badgeStyle: 'new',
    group: 'core',
  },
  {
    id: 'feed-ad',
    name: '信息流广告',
    href: '/feed-ad',
    icon: Megaphone,
    description: '多平台信息流广告素材',
    style: 'feedAd',
    badge: '新',
    badgeStyle: 'new',
    group: 'core',
  },
  {
    id: 'content-library',
    name: '素材库',
    href: '/operations/content-library',
    icon: Package,
    description: '管理所有创作素材',
    style: 'creative',
    group: 'core',
  },
  {
    id: 'operations',
    name: '运营',
    href: '/operations',
    icon: BarChart3,
    description: '数据分析、对标研究',
    style: 'operation',
    group: 'tools',
  },
  {
    id: 'live',
    name: '直播',
    href: '/live',
    icon: Radio,
    description: '团购直播话术生成',
    style: 'tool',
    badge: '新',
    badgeStyle: 'new',
    group: 'tools',
  },
  {
    id: 'automation',
    name: '自动化任务',
    href: '/automation',
    icon: Cog,
    description: '批量生成选题和文案',
    style: 'tool',
    group: 'tools',
  },
  {
    id: 'admin',
    name: '用户管理',
    href: '/admin',
    icon: Shield,
    description: '管理用户账号和权限',
    style: 'admin',
    group: 'tools',
    adminOnly: true,
  },
  {
    id: 'admin-agents',
    name: '代理管理',
    href: '/admin/agents',
    icon: Users,
    description: '创建和管理代理账户',
    style: 'admin',
    group: 'tools',
    adminOnly: true,
  },
];

// 用户菜单项（整合到头像下拉菜单）
const USER_MENU_ITEMS = [
  {
    id: 'member',
    name: '算力中心',
    href: '/member',
    icon: Crown,
    description: '算力管理、购买充值',
  },
  {
    id: 'agent',
    name: '代理中心',
    href: '/agent',
    icon: Users,
    description: '代理推广、佣金管理',
  },
  {
    id: 'change-password',
    name: '修改密码',
    href: '/settings/password',
    icon: Lock,
    description: '修改登录密码',
  },
  {
    id: 'settings',
    name: '设置',
    href: '/settings/api-keys',
    icon: Settings,
    description: 'API Key 管理、外部系统接入',
    adminOnly: true,
  },
  {
    id: 'help',
    name: '帮助中心',
    href: '/help',
    icon: HelpCircle,
    description: '使用指南、常见问题',
  },
  {
    id: 'user-devices',
    name: '设备管理',
    href: '/user-devices',
    icon: Smartphone,
    description: '管理登录设备',
  },
];

// 分组配置
const GROUPS = [
  { id: 'core', name: '核心功能', defaultExpanded: true },
  { id: 'tools', name: '工具箱', defaultExpanded: false },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    GROUPS.forEach(g => {
      initial[g.id] = g.defaultExpanded;
    });
    return initial;
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // 检查是否是管理员
  const isAdmin = user?.role === 'admin';

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // 渲染菜单项
  const renderMenuItem = (item: typeof MENU_ITEMS[0]) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const style = MENU_STYLES[item.style as keyof typeof MENU_STYLES] || MENU_STYLES.default;
    const isDisabled = (item as any).disabled;
    
    return (
      <Link
        key={item.id}
        href={isDisabled ? '#' : item.href}
        className={cn(
          // 基础样式
          'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
          'transition-all duration-200 ease-out relative',
          // 激活状态
          isActive
            ? `${style.activeBg} text-foreground`
            : 'text-sidebar-foreground hover:bg-muted/50',
          // 禁用状态
          isDisabled && 'opacity-40 cursor-not-allowed',
          // 悬停效果
          !isDisabled && !isActive && style.hoverBg,
          // 激活时的轻微阴影
          isActive && 'shadow-sm'
        )}
        onClick={isDisabled ? (e) => e.preventDefault() : undefined}
      >
        {/* 图标容器 */}
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          'transition-colors duration-200',
          isActive ? style.iconBg : 'bg-transparent group-hover:bg-muted/50'
        )}>
          <Icon className={cn(
            'w-4 h-4 transition-colors duration-200',
            isActive ? style.iconColor : 'text-muted-foreground group-hover:text-foreground'
          )} />
        </div>
        
        {/* 文字 */}
        <span className={cn(
          'flex-1 transition-colors duration-200',
          isActive && 'text-foreground font-semibold'
        )}>
          {item.name}
        </span>
        
        {/* 徽章 */}
        {item.badge && !isDisabled && (
          <span className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-md',
            'transition-colors duration-200',
            item.badgeStyle === 'ai' && 'bg-primary text-white',
            item.badgeStyle === 'hot' && 'bg-orange-500 text-white',
            item.badgeStyle === 'new' && 'bg-green-500 text-white',
          )}>
            {item.badge}
          </span>
        )}
        
        {/* 禁用提示 */}
        {isDisabled && (
          <span className="text-xs text-muted-foreground">敬请期待</span>
        )}
        
        {/* 激活指示器 */}
        {isActive && (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </Link>
    );
  };

  // 渲染分组
  const renderGroup = (groupId: string, items: typeof MENU_ITEMS) => {
    const group = GROUPS.find(g => g.id === groupId);
    if (!group || items.length === 0) return null;
    
    const isExpanded = expandedGroups[groupId];
    
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => toggleGroup(groupId)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3',
            'text-[11px] font-semibold text-muted-foreground uppercase tracking-wider',
            'hover:bg-muted/50 hover:text-foreground',
            'transition-all duration-200 ease-out',
            'border-b border-border'
          )}
        >
          <span>{group.name}</span>
          <ChevronDown className={cn(
            'w-4 h-4 transition-transform duration-200 ease-out',
            isExpanded ? '' : '-rotate-90'
          )} />
        </button>
        
        <div className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="p-2 space-y-1">
            {items.map(renderMenuItem)}
          </div>
        </div>
      </div>
    );
  };

  // 过滤菜单项
  const coreItems = MENU_ITEMS.filter(item => item.group === 'core');
  const toolsItems = MENU_ITEMS.filter(item => 
    item.group === 'tools' && (!item.adminOnly || isAdmin)
  );

  return (
    <div className={cn(
      'flex flex-col h-full bg-sidebar border-r border-sidebar-border',
      'shadow-sm',
      className
    )}>
      {/* Logo - 品牌区域 */}
      <div className="relative">
        <div className="relative flex items-center gap-3 p-5 border-b border-sidebar-border">
          <div className="relative shrink-0">
            <img 
              src="/logo.svg" 
              alt="小仔编导" 
              className="w-11 h-11 rounded-2xl object-cover shadow-sm"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-[15px] text-foreground whitespace-nowrap">
              超级编导助手
            </h1>
            <p className="text-[11px] text-muted-foreground font-normal mt-0.5 whitespace-nowrap">
              专业短视频创作平台
            </p>
          </div>
        </div>
      </div>

      {/* Navigation - 完整边框容器 */}
      <div className="flex-1 p-3 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-2 p-1">
            {renderGroup('core', coreItems)}
            {renderGroup('tools', toolsItems)}
          </div>
        </ScrollArea>
      </div>

      {/* 用户信息区域 */}
      <div className="p-3 border-t border-sidebar-border">
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              'w-full flex flex-col gap-2 p-3 rounded-2xl',
              'border border-border bg-card',
              'transition-all duration-200 ease-out',
              'hover:shadow-md hover:border-primary/20 hover:bg-accent/50',
              userMenuOpen && 'shadow-md border-primary/30 bg-accent/30'
            )}
          >
            {/* 第一行：头像 + 用户名 + 箭头 */}
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 ring-2 ring-border shrink-0">
                <AvatarFallback className="bg-primary text-white text-sm font-semibold">
                  {user?.username?.slice(-4) || user?.phone?.slice(-4) || '用户'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user?.username || user?.phone || '用户'}
                </p>
              </div>
              <ChevronDown className={cn(
                'w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0',
                userMenuOpen ? '-rotate-180' : ''
              )} />
            </div>
            
            {/* 第二行：身份标签 + 菜单提示 */}
            <div className="flex items-center justify-between pl-12">
              <div className="flex items-center gap-2">
                {user?.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20 text-[10px] text-red-600 dark:text-red-400 font-medium">
                    <Shield className="w-2.5 h-2.5" />
                    管理员
                  </span>
                )}
                {user?.uid && (
                  <span className="text-[11px] text-muted-foreground">
                    UID {user.uid}
                  </span>
                )}
              </div>
              
              {/* 菜单提示 - 仅在菜单关闭时显示 */}
              {!userMenuOpen && (
                <span className="text-[11px] text-primary font-medium animate-pulse">
                  点击展开菜单
                </span>
              )}
            </div>
          </button>

          {/* 下拉菜单 */}
          {userMenuOpen && (
            <div className={cn(
              'absolute bottom-full left-0 right-0 mb-2',
              'bg-popover border border-border rounded-2xl shadow-lg',
              'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
              'overflow-hidden'
            )}>
              {/* 菜单项 */}
              <div className="py-2">
                {USER_MENU_ITEMS.filter(item => !item.adminOnly || isAdmin).map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setUserMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm',
                        'transition-colors duration-150',
                        isActive 
                          ? 'bg-accent text-accent-foreground font-medium' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
              
              {/* 分割线 */}
              <div className="border-t border-border" />
              
              {/* 退出登录 */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500',
                    'hover:bg-red-50 dark:hover:bg-red-900/20',
                    'transition-colors duration-150'
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
