'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { memberApi } from '@/lib/api';
import { ComputingPower } from '@/types';

// 会员状态接口
interface MemberStatus {
  isMember: boolean;
  memberType: 'none' | 'trial' | 'monthly' | 'yearly' | 'permanent';
  daysRemaining: number;
  expiryDate: string | null;
}

// Context接口
interface MemberContextType {
  // 算力
  computingPower: ComputingPower | null;
  powerLoading: boolean;
  refreshComputingPower: () => Promise<void>;
  
  // 会员状态
  memberStatus: MemberStatus | null;
  memberLoading: boolean;
  refreshMemberStatus: () => Promise<void>;
  
  // 算力不足弹窗
  showPowerLowModal: boolean;
  powerLowRequired: number;
  openPowerLowModal: (required?: number) => void;
  closePowerLowModal: () => void;
  
  // 会员到期提醒
  showExpiryBanner: boolean;
  dismissExpiryBanner: () => void;
  
  // 刷新所有
  refreshAll: () => Promise<void>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

interface MemberProviderProps {
  children: ReactNode;
}

export function MemberProvider({ children }: MemberProviderProps) {
  // 算力状态
  const [computingPower, setComputingPower] = useState<ComputingPower | null>(null);
  const [powerLoading, setPowerLoading] = useState(true);
  
  // 会员状态
  const [memberStatus, setMemberStatus] = useState<MemberStatus | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);
  
  // 算力不足弹窗
  const [showPowerLowModal, setShowPowerLowModal] = useState(false);
  const [powerLowRequired, setPowerLowRequired] = useState(0);
  
  // 会员到期提醒
  const [showExpiryBanner, setShowExpiryBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  // 刷新算力
  const refreshComputingPower = useCallback(async () => {
    try {
      const res = await memberApi.getComputingPower();
      setComputingPower(res.data || null);
    } catch (error) {
      console.error('获取算力失败:', error);
    } finally {
      setPowerLoading(false);
    }
  }, []);
  
  // 刷新会员状态
  const refreshMemberStatus = useCallback(async () => {
    try {
      const res = await memberApi.getSubscription();
      const data = res.data;
      
      if (data) {
        const status: MemberStatus = {
          isMember: data.isMember || false,
          memberType: data.subscription?.plan?.name?.includes('永久') ? 'permanent' :
                      data.subscription?.plan?.name?.includes('年度') ? 'yearly' :
                      data.subscription?.plan?.name?.includes('月度') ? 'monthly' :
                      data.subscription?.plan?.name?.includes('试用') ? 'trial' : 'none',
          daysRemaining: data.subscription?.daysRemaining || 0,
          expiryDate: data.subscription?.endDate || null,
        };
        setMemberStatus(status);
        
        // 判断是否显示到期提醒（3天内到期且未关闭）
        if (status.isMember && 
            status.memberType !== 'permanent' && 
            status.daysRemaining <= 3 && 
            status.daysRemaining > 0 &&
            !bannerDismissed) {
          setShowExpiryBanner(true);
        }
      }
    } catch (error) {
      console.error('获取会员状态失败:', error);
    } finally {
      setMemberLoading(false);
    }
  }, [bannerDismissed]);
  
  // 刷新所有
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshComputingPower(), refreshMemberStatus()]);
  }, [refreshComputingPower, refreshMemberStatus]);
  
  // 算力不足弹窗
  const openPowerLowModal = useCallback((required = 0) => {
    setPowerLowRequired(required);
    setShowPowerLowModal(true);
  }, []);
  
  const closePowerLowModal = useCallback(() => {
    setShowPowerLowModal(false);
    setPowerLowRequired(0);
  }, []);
  
  // 关闭到期提醒
  const dismissExpiryBanner = useCallback(() => {
    setShowExpiryBanner(false);
    setBannerDismissed(true);
  }, []);
  
  // 初始化
  useEffect(() => {
    refreshAll();
    
    // 每5分钟刷新一次
    const interval = setInterval(refreshAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshAll]);
  
  const value: MemberContextType = {
    computingPower,
    powerLoading,
    refreshComputingPower,
    memberStatus,
    memberLoading,
    refreshMemberStatus,
    showPowerLowModal,
    powerLowRequired,
    openPowerLowModal,
    closePowerLowModal,
    showExpiryBanner,
    dismissExpiryBanner,
    refreshAll,
  };
  
  return (
    <MemberContext.Provider value={value}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const context = useContext(MemberContext);
  if (context === undefined) {
    throw new Error('useMember must be used within a MemberProvider');
  }
  return context;
}
