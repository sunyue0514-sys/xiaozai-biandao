'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Crown, ArrowRight, Sparkles } from 'lucide-react';
import { useMember } from '@/contexts/MemberContext';

export function PowerLowModal() {
  const { 
    showPowerLowModal, 
    powerLowRequired, 
    closePowerLowModal,
    computingPower 
  } = useMember();
  
  return (
    <Dialog open={showPowerLowModal} onOpenChange={(open) => !open && closePowerLowModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Zap className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            算力不足
          </DialogTitle>
          <DialogDescription className="text-center">
            您的算力余额不足以完成此操作
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 算力状态 */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">当前算力</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {computingPower?.remaining?.toLocaleString() || 0} 点
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">需要算力</span>
              <span className="font-medium">
                {powerLowRequired > 0 ? `${powerLowRequired.toLocaleString()} 点` : '充足算力'}
              </span>
            </div>
          </div>
          
          {/* 推荐方案 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center">推荐方案</p>
            
            {/* 方案1：充值算力 */}
            <Link href="/member" onClick={closePowerLowModal}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">充值算力</p>
                  <p className="text-sm text-muted-foreground">
                    即刻到账，继续使用
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
            
            {/* 方案2：开通会员 */}
            <Link href="/member" onClick={closePowerLowModal}>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-bl-lg">
                  推荐
                </div>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">开通会员</p>
                  <p className="text-sm text-muted-foreground">
                    享更多算力 + 专属权益
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={closePowerLowModal}>
            稍后再说
          </Button>
          <Link href="/member" className="flex-1" onClick={closePowerLowModal}>
            <Button className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              前往充值
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
