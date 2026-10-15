'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Zap,
  Gift,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Sparkles,
  Shield,
  Crown,
  Infinity,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SuccessCases } from '@/components/success-cases/SuccessCases';

// 算力包配置
const POWER_PACKAGES = [
  {
    id: 'package_1w',
    name: '入门包',
    power: 10000,
    price: 28.9,
    originalPrice: 38.9,
    validDays: 365,
    description: '适合轻度使用',
    badge: null,
  },
  {
    id: 'package_5w',
    name: '主力包',
    power: 50000,
    price: 99.9,
    originalPrice: 139.9,
    validDays: 365,
    description: '最受欢迎的选择',
    badge: '推荐',
  },
  {
    id: 'package_10w',
    name: '进阶包',
    power: 100000,
    price: 199,
    originalPrice: 259,
    validDays: 365,
    description: '重度用户首选',
    badge: null,
  },
  {
    id: 'package_40w',
    name: '专业包',
    power: 400000,
    price: 699,
    originalPrice: 999,
    validDays: 365,
    description: '团队/工作室使用',
    badge: '超值',
  },
];

// 新用户赠送包
const NEW_USER_PACKAGE = {
  power: 3000,
  validDays: 1,
  description: '新用户专属，1天内使用',
};

export default function PowerCenterPage() {
  const { user } = useAuth();
  const [powerBalance, setPowerBalance] = useState<number>(0);
  const [powerExpiry, setPowerExpiry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMessage, setRedeemMessage] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 获取算力信息
      const token = localStorage.getItem('sessionToken');
      const powerRes = await fetch('/api/power/info', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const powerData = await powerRes.json();
      if (powerData.success && powerData.data) {
        setPowerBalance(powerData.data.balance || 0);
        setPowerExpiry(powerData.data.expiry || null);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 兑换码预览
  const fetchPreview = async (code: string) => {
    if (!code || code.length < 6) {
      setPreviewData(null);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/redemption/preview?code=${encodeURIComponent(code)}`);
      const data = await response.json();
      if (data.success && data.preview) {
        setPreviewData(data.preview);
      } else {
        setPreviewData(null);
      }
    } catch (error) {
      console.error('预览失败:', error);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setRedeemCode(upperValue);
    setRedeemMessage('');
    setRedeemSuccess(false);

    if (upperValue.length >= 6) {
      fetchPreview(upperValue);
    } else {
      setPreviewData(null);
    }
  };

  // 兑换码兑换
  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      setRedeemMessage('请输入兑换码');
      setRedeemSuccess(false);
      return;
    }

    setIsRedeeming(true);
    setRedeemMessage('');

    try {
      const response = await fetch('/api/redemption/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setRedeemMessage('兑换成功！');
        setRedeemSuccess(true);
        setRedeemCode('');
        setPreviewData(null);
        loadData();
      } else {
        setRedeemMessage(data.error || '兑换失败');
        setRedeemSuccess(false);
      }
    } catch (error) {
      console.error('兑换失败:', error);
      setRedeemMessage('兑换失败，请稍后重试');
      setRedeemSuccess(false);
    } finally {
      setIsRedeeming(false);
    }
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  // 格式化日期
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '永久有效';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  // 计算剩余天数
  const getRemainingDays = (expiry: string | null) => {
    if (!expiry) return null;
    const now = new Date();
    const expDate = new Date(expiry);
    const diff = expDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const remainingDays = getRemainingDays(powerExpiry);
  const isExpiringSoon = remainingDays !== null && remainingDays <= 7 && remainingDays > 0;
  const isExpired = remainingDays === 0 && powerExpiry;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">算力中心</h1>
          <p className="text-muted-foreground mt-1">
            管理您的算力余额和套餐
          </p>
        </div>

        {/* 新用户提示 */}
        <Alert className="border-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl">
          <Gift className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            <span className="font-medium">新用户赠送 {NEW_USER_PACKAGE.power} 算力</span>
            <span className="text-muted-foreground ml-2">({NEW_USER_PACKAGE.description})</span>
          </AlertDescription>
        </Alert>

        {/* 算力余额卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 算力余额 */}
          <Card className="border-0 rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-white">
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/20">
                  <Zap className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">当前算力</p>
                  <p className="text-4xl font-bold">{formatNumber(powerBalance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 有效期 */}
          <Card className="border-0 rounded-3xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center",
                  isExpired ? "bg-destructive/10" : isExpiringSoon ? "bg-warning/10" : "bg-muted"
                )}>
                  <Clock className={cn(
                    "w-8 h-8",
                    isExpired ? "text-destructive" : isExpiringSoon ? "text-warning" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">有效期至</p>
                  <p className={cn(
                    "text-2xl font-semibold",
                    isExpired && "text-destructive"
                  )}>
                    {isExpired ? '已过期' : formatDate(powerExpiry)}
                  </p>
                  {remainingDays !== null && !isExpired && (
                    <p className={cn(
                      "text-sm",
                      isExpiringSoon ? "text-warning" : "text-muted-foreground"
                    )}>
                      剩余 {remainingDays} 天
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 算力说明 */}
          <Card className="border-0 rounded-3xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-muted">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">如何获取算力</p>
                  <p className="text-lg font-semibold">充值算力包 / 兑换码</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 算力包和兑换码 Tabs */}
        <Tabs defaultValue="packages" className="space-y-6">
          <TabsList className="rounded-xl">
            <TabsTrigger value="packages">算力套餐</TabsTrigger>
            <TabsTrigger value="redeem">兑换码</TabsTrigger>
          </TabsList>

          {/* 算力套餐 Tab */}
          <TabsContent value="packages" className="space-y-6">
            {/* 成功案例 - 紧凑模式 */}
            <SuccessCases compact />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {POWER_PACKAGES.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={cn(
                    "border-0 rounded-3xl relative overflow-hidden transition-all hover:scale-[1.02]",
                    pkg.badge && "ring-2 ring-primary"
                  )}
                >
                  {pkg.badge && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-primary text-white rounded-lg">
                        {pkg.badge}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <span className="text-4xl font-bold text-foreground">
                          {formatNumber(pkg.power)}
                        </span>
                        <span className="text-muted-foreground ml-1">算力</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                          ¥{pkg.price}
                        </span>
                        <span className="text-muted-foreground line-through">
                          ¥{pkg.originalPrice}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        有效期 {pkg.validDays} 天
                      </div>
                      <Button className="w-full rounded-xl" variant="outline">
                        立即购买
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 算力消耗说明 */}
            <Card className="border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  功能算力消耗表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span>视频深度分析</span>
                    <span className="font-medium">1500 算力</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>IP定位分析</span>
                    <span className="font-medium">2000 算力</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>账号规划生成</span>
                    <span className="font-medium">2500 算力</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>智能推导创作</span>
                    <span className="font-medium">900 算力</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>数据分析/报告</span>
                    <span className="font-medium">1000 算力</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>批量开篇/选题生成</span>
                    <span className="font-medium">800 算力</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>直播话术生成</span>
                    <span className="font-medium">450 算力</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>选题推荐</span>
                    <span className="font-medium">375 算力</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>AI对话（每100字）</span>
                    <span className="font-medium">75 算力</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 兑换码 Tab */}
          <TabsContent value="redeem" className="space-y-6">
            <Card className="border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  兑换码兑换
                </CardTitle>
                <CardDescription>
                  输入兑换码即可获得对应算力
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={redeemCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      placeholder="请输入兑换码"
                      className="w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button
                    onClick={handleRedeem}
                    disabled={isRedeeming || !redeemCode.trim()}
                    className="rounded-xl px-8"
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        兑换中...
                      </>
                    ) : (
                      '兑换'
                    )}
                  </Button>
                </div>

                {/* 兑换码预览 */}
                {previewLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载中...
                  </div>
                )}

                {previewData && (
                  <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">兑换码可用</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">类型：</span>
                        <span>{previewData.typeMessage || previewData.type}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">算力：</span>
                        <span className="font-medium text-primary">
                          {previewData.power?.toLocaleString() || previewData.rewardPower?.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">有效期：</span>
                        <span>{previewData.days || previewData.validDays} 天</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">过期时间：</span>
                        <span>{previewData.expiresAt ? new Date(previewData.expiresAt).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 兑换结果提示 */}
                {redeemMessage && (
                  <div className={cn(
                    "p-4 rounded-xl flex items-center gap-2",
                    redeemSuccess
                      ? "bg-green-50 text-green-700"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {redeemSuccess ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                    {redeemMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
