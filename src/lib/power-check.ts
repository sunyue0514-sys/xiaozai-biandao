'use client';

import { useMember } from '@/contexts/MemberContext';
import type { ComputingPower } from '@/types';

/**
 * 检查算力是否足够
 * @param required 需要的算力数量
 * @returns 是否足够
 */
export function checkPowerEnough(required: number, computingPower: ComputingPower | null): boolean {
  
  if (!computingPower) return false;
  if (computingPower.unlimited) return true;
  
  return computingPower.remaining >= required;
}

/**
 * 消耗算力前的检查函数
 * 如果不足，会自动打开弹窗
 * @param required 需要的算力数量
 * @returns 是否可以继续操作
 */
export function usePowerCheck() {
  const { computingPower, openPowerLowModal } = useMember();
  
  const checkAndConsume = (required: number): boolean => {
    if (!checkPowerEnough(required, computingPower)) {
      openPowerLowModal(required);
      return false;
    }
    
    return true;
  };
  
  return { checkAndConsume };
}
