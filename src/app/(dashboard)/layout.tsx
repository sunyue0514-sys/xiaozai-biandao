'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { MemberProvider } from '@/contexts/MemberContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { ExpiryBanner } from '@/components/member/ExpiryBanner';
import { PowerLowModal } from '@/components/member/PowerLowModal';
import { UpdateAnnouncement } from '@/components/UpdateAnnouncement';
import { FeedbackButton } from '@/components/FeedbackButton';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          <p className="text-muted-foreground">验证登录状态...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 侧边栏 */}
      <Sidebar className="w-64 shrink-0" />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <TopBar />
        
        {/* 会员到期提醒横幅 */}
        <ExpiryBanner />
        
        {/* 主内容 */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
      
      {/* 算力不足弹窗 */}
      <PowerLowModal />
      
      {/* 功能更新公告 */}
      <UpdateAnnouncement />
      
      {/* 意见反馈按钮 */}
      <FeedbackButton />
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <MemberProvider>
      <DashboardContent>{children}</DashboardContent>
    </MemberProvider>
  );
}
