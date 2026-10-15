'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Lock, User, ArrowRight, Target, Zap, Wrench } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { SuccessCases } from '@/components/success-cases/SuccessCases';

// 登录表单组件 - 使用 useSearchParams
function LoginForm() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref'); // 获取代理邀请码
  
  // 调试日志：追踪 ref 参数
  console.log('[登录页] URL参数 refCode:', refCode, '当前URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
  
  const [activeTab, setActiveTab] = useState('login');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 防止重复提交
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.username || !loginData.password) {
      toast.error('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(loginData.username, loginData.password);
      
      if (result.success) {
        toast.success('登录成功');
        router.push('/customer');
      } else {
        toast.error(result.message || '登录失败');
      }
    } catch {
      toast.error('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 防止重复提交
    if (isSubmitting || isLoading) {
      console.log('[注册] 已有请求进行中，忽略重复提交');
      return;
    }
    
    if (!registerData.username || !registerData.password) {
      toast.error('请填写完整信息');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('两次密码不一致');
      return;
    }

    if (!/^[a-zA-Z0-9_]{4,20}$/.test(registerData.username)) {
      toast.error('用户名需要4-20位字母、数字或下划线');
      return;
    }

    if (registerData.password.length < 6) {
      toast.error('密码至少需要6位');
      return;
    }

    setIsSubmitting(true);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registerData,
          ref: refCode // 传递代理邀请码
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('注册成功，请登录');
        setLoginData({ username: registerData.username, password: '' });
        setRegisterData({ username: '', password: '', confirmPassword: '' });
        setActiveTab('login');
      } else {
        toast.error(result.error || '注册失败');
      }
    } catch {
      toast.error('注册失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  // 功能特性配置
  const features = [
    { icon: User, title: '客户档案', desc: '一键录入，专属 IP 画像永久留存', colorClass: 'bg-warning' },
    { icon: Target, title: '智能定位', desc: 'AI 自动分析客户赛道，生成精准商业定位', colorClass: 'bg-success' },
    { icon: Zap, title: '爆款产出', desc: '选题 + 文案 + 脚本，3 分钟全套出片', colorClass: 'bg-creative' },
    { icon: Wrench, title: '工具合集', desc: '内置全网 AI 工具库，不用再到处找插件', colorClass: 'bg-info' },
  ] as const;

  return (
    <div className="min-h-screen flex">
      {/* Left - Brand Section - 苹果风格 */}
      <div className="hidden lg:flex lg:w-[38%] relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center">
              <img src="/logo.svg" alt="超级编导助手" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">超级编导助手</h1>
              <p className="text-white/70 text-lg font-normal mt-0.5">专业短视频内容创作平台</p>
            </div>
          </div>
          
          <h2 className="text-4xl font-bold leading-tight mb-6">
            AI 先定百万 IP<br />再出十万爆款脚本
          </h2>
          
          <p className="text-lg text-white/80 mb-10">
            从 &quot;死磕方法&quot; 到 &quot;AI 量产&quot;，真正让知识变现
          </p>
          
          <div className="space-y-3">
            {features.map((item) => (
              <div 
                key={item.title} 
                className="flex items-center gap-4 rounded-2xl p-4 bg-white/15"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.colorClass}`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-white/8" />
      </div>

      {/* Right - Form Section - 苹果风格 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary flex items-center justify-center">
              <img src="/logo.svg" alt="超级编导助手" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">超级编导助手</h1>
              <p className="text-muted-foreground text-sm font-normal">专业短视频内容创作平台</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-card rounded-[14px]">
              <TabsTrigger value="login" className="text-base h-10">登录</TabsTrigger>
              <TabsTrigger value="register" className="text-base h-10">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="border-0 rounded-3xl shadow-lg">
                <CardHeader className="space-y-1 pb-4 pt-6">
                  <CardTitle className="text-2xl text-foreground">欢迎回来</CardTitle>
                  <CardDescription>
                    输入您的账号信息登录系统
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">用户名</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="username"
                          type="text"
                          placeholder="请输入用户名"
                          value={loginData.username}
                          onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                          disabled={isLoading}
                          className="pl-11 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="请输入密码"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          disabled={isLoading}
                          className="pl-11 h-11"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-medium border-0 bg-primary rounded-[14px]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          登录中...
                        </>
                      ) : (
                        <>
                          登录
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="border-0 rounded-3xl shadow-lg">
                <CardHeader className="space-y-1 pb-4 pt-6">
                  <CardTitle className="text-2xl text-foreground">创建账号</CardTitle>
                  <CardDescription>
                    注册新账号，赠送3000算力（1天有效）
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">用户名</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-username"
                          type="text"
                          placeholder="4-20位字母、数字或下划线"
                          value={registerData.username}
                          onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                          disabled={isLoading}
                          className="pl-11 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-password"
                          type="password"
                          placeholder="至少6位密码"
                          value={registerData.password}
                          onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                          disabled={isLoading}
                          className="pl-11 h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm">确认密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reg-confirm"
                          type="password"
                          placeholder="请再次输入密码"
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                          disabled={isLoading}
                          className="pl-11 h-11"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-medium border-0 bg-primary rounded-[14px]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          注册中...
                        </>
                      ) : (
                        <>
                          注册
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                  
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    注册即表示同意
                    <Link href="/legal/user-agreement" target="_blank" className="hover:underline mx-1 text-primary">
                      《用户协议》
                    </Link>
                    和
                    <Link href="/legal/privacy-policy" target="_blank" className="hover:underline mx-1 text-primary">
                      《隐私政策》
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 成功案例展示 - 仅在登录页展示 */}
          <div className="mt-8">
            <SuccessCases />
          </div>
        </div>
      </div>
    </div>
  );
}

// 主页面组件 - 包裹 Suspense 边界
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
