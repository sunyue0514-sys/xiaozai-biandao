'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Crown, X, AlertTriangle, Sparkles } from 'lucide-react';
import { useMember } from '@/contexts/MemberContext';
import { cn } from '@/lib/utils';

export function ExpiryBanner() {
  const { showExpiryBanner, dismissExpiryBanner, memberStatus } = useMember();
  
  if (!showExpiryBanner) return null;
  
  const days = memberStatus?.daysRemaining || 0;
  
  // 根据剩余天数决定紧急程度
  const isUrgent = days <= 1;
  
  return (
    <div className={cn(
      'relative flex items-center justify-between px-4 py-2.5',
      isUrgent 
        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
    )}>
      {/* 左侧图标和文字 */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isUrgent ? 'bg-white/20' : 'bg-white/10'
        )}>
          {isUrgent ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Crown className="w-4 h-4" />
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className="font-medium">
            {isUrgent ? (
              '您的会员即将到期！'
            ) : (
              `会员还剩 ${days} 天到期`
            )}
          </span>
          <span className="text-sm opacity-90">
            续费享8折优惠，保持您的专属权益
          </span>
        </div>
      </div>
      
      {/* 右侧操作 */}
      <div className="flex items-center gap-2">
        <Link href="/member" onClick={dismissExpiryBanner}>
          <Button 
            size="sm" 
            variant="secondary"
            className="bg-white text-amber-600 hover:bg-white/90 font-medium"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            立即续费
          </Button>
        </Link>
        
        <button
          onClick={dismissExpiryBanner}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
