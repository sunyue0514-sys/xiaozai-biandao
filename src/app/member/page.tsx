'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到算力中心
    router.replace('/power-center');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">正在跳转到算力中心...</p>
      </div>
    </div>
  );
}
