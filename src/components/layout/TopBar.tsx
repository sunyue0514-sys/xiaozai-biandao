'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useMember } from '@/contexts/MemberContext';
import { Progress } from '@/components/ui/progress';
import { RedeemModal, GenerateModal } from '@/components/member/RedemptionCodeModal';
import {
  Crown,
  Zap,
  Infinity,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Gift,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 会员类型配置
const MEMBER_TYPE_CONFIG = {
  none: {
    label: '开通会员',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50 hover:bg-muted',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  trial: {
    label: '试用会员',
    color: 'text-primary',
    bgColor: 'bg-primary/5 hover:bg-primary/10',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  monthly: {
    label: '月度会员',
    color: 'text-primary',
    bgColor: 'bg-primary/5 hover:bg-primary/10',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  yearly: {
    label: '年度会员',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-500',
  },
  permanent: {
    label: '永久会员',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    iconColor: 'text-white',
  },
};

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const { user } = useAuth();
  const { computingPower, memberStatus, powerLoading, memberLoading, refreshComputingPower, refreshMemberStatus } = useMember();
  
  // 兑换码弹窗状态
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  // 是否为管理员
  const isAdmin = user?.role === 'admin';
  
  // 获取会员类型配置
  const memberConfig = MEMBER_TYPE_CONFIG[memberStatus?.memberType || 'none'];
  
  // 算力不足提示
  const isPowerLow = computingPower && 
                     !computingPower.unlimited && 
                     computingPower.remaining < 100;
  
  // 算力进度百分比
  const powerPercent = computingPower && !computingPower.unlimited
    ? Math.round((computingPower.remaining / computingPower.total) * 100)
    : 100;
  
  return (
    <header className={cn(
      'h-14 border-b border-border bg-background/80 backdrop-blur-md',
      'flex items-center justify-between px-4',
      'shadow-sm',
      className
    )}>
      {/* 左侧 - 可放置面包屑或其他内容 */}
      <div className="flex items-center gap-4">
        {/* 预留位置 */}
      </div>
      
      {/* 右侧 - 会员状态 */}
      <div className="flex items-center gap-2">
        {/* 兑换码按钮 - 在算力左侧 */}
        <button
          onClick={() => isAdmin ? setShowGenerateModal(true) : setShowRedeemModal(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl',
            'transition-all duration-200 ease-out',
            'hover:shadow-sm cursor-pointer',
            'border border-transparent hover:border-border',
            isAdmin 
              ? 'bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30'
              : 'bg-primary/5 hover:bg-primary/10'
          )}
        >
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center',
            isAdmin 
              ? 'bg-primary'
              : 'bg-primary/10'
          )}>
            <Gift className={cn(
              'w-4 h-4',
              isAdmin ? 'text-white' : 'text-primary'
            )} />
          </div>
          <span className={cn(
            'text-[13px] font-medium',
            isAdmin ? 'text-primary' : 'text-primary'
          )}>
            {isAdmin ? '兑换码生成' : '兑换码'}
          </span>
        </button>
        
        {/* 算力状态 */}
        <Link href="/member" className="no-underline">
          <div className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-xl',
            'transition-all duration-200 ease-out',
            'hover:shadow-sm cursor-pointer',
            'border border-transparent hover:border-border',
            isPowerLow && 'animate-pulse bg-amber-50 dark:bg-amber-900/20'
          )}>
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center',
              'transition-colors duration-200',
              computingPower?.unlimited 
                ? 'bg-primary'
                : isPowerLow 
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-primary/10'
            )}>
              {computingPower?.unlimited ? (
                <Infinity className="w-4 h-4 text-white" />
              ) : (
                <Zap className={cn(
                  'w-4 h-4',
                  isPowerLow 
                    ? 'text-amber-500'
                    : 'text-primary'
                )} />
              )}
            </div>
            
            <div className="flex flex-col min-w-[90px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground font-medium">算力</span>
                {powerLoading ? (
                  <span className="text-[11px] text-muted-foreground">...</span>
                ) : computingPower?.unlimited ? (
                  <span className="text-[11px] font-semibold text-primary">
                    无限
                  </span>
                ) : (
                  <span className={cn(
                    'text-[11px] font-semibold',
                    isPowerLow 
                      ? 'text-amber-500'
                      : 'text-foreground'
                  )}>
                    {computingPower?.remaining?.toLocaleString() || 0}
                    <span className="text-muted-foreground font-normal ml-0.5">
                      /{computingPower?.total?.toLocaleString() || 0}
                    </span>
                  </span>
                )}
              </div>
              
              {/* 算力进度条 */}
              {!computingPower?.unlimited && (
                <Progress 
                  value={powerPercent}
                  className={cn(
                    'h-1 mt-1.5 rounded-full',
                    isPowerLow && '[&>div]:bg-amber-500'
                  )}
                />
              )}
              
              {/* 算力不足提示 */}
              {isPowerLow && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-medium">
                    算力不足
                  </span>
                </div>
              )}
            </div>
            
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </Link>
        
        {/* 功能更新小喇叭 */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('show-update-announcement'));
          }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          title="功能更新"
        >
          <Bell className="w-5 h-5 text-white" />
        </button>
      </div>
      
      {/* 兑换码弹窗 */}
      <RedeemModal 
        open={showRedeemModal} 
        onOpenChange={setShowRedeemModal}
        onSuccess={() => {
          refreshComputingPower();
          refreshMemberStatus();
        }}
      />
      
      {/* 生成兑换码弹窗（管理员） */}
      <GenerateModal 
        open={showGenerateModal} 
        onOpenChange={setShowGenerateModal}
      />
    </header>
  );
}
