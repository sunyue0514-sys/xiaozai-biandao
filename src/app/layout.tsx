import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '超级编导助手',
    template: '%s | 超级编导助手',
  },
  description:
    '超级编导助手 - 专业短视频内容创作平台，提供脚本创作、运营分析等一站式服务',
  keywords: [
    '短视频',
    '超级编导',
    '内容创作',
    '脚本生成',
    '运营分析',
    'AI创作',
    '小仔',
    '编导',
  ],
  authors: [{ name: '超级编导助手团队' }],
  generator: 'Next.js',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: '超级编导助手',
    description: '专业短视频内容创作平台，一站式智能内容创作服务',
    siteName: '超级编导助手',
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '超级编导助手',
    description: '专业短视频内容创作平台，一站式智能内容创作服务',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
