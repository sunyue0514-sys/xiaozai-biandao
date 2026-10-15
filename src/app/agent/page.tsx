'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { apiRequest } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserCircle,
  Link2,
  Users,
  Wallet,
  Gift,
  Copy,
  Share2,
  TrendingUp,
  Clock,
  Loader2,
  Crown,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Shield,
  Plus,
  Image as ImageIcon,
  Coins,
  Download,
  Receipt,
  ArrowRightLeft,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { SimplePosterGenerator } from '@/components/agent/PosterGenerator';

interface AgentData {
  isAgent: boolean;
  isSuperAdmin?: boolean;
  level: string;
  agentLevel?: number; // 0=总代, 1=一级代理, 2=二级代理
  totalEarnings: number;
  thisMonthEarnings: number;
  inviteCount: number;
  activeUsers: number;
  commissionRate: number;
  withdrawable: number;
  withdrawn: number;
  inviteCode: string;
  inviteLink: string;
  agentPath: string;
  recentCommissions: Array<{
    id: number;
    userId: number;
    userName: string;
    amount: number;
    commission: number;
    createdAt: string;
  }>;
  invitees: Array<{
    id: number;
    name: string;
    phone: string;
    registerTime: string;
    status: 'active' | 'inactive';
    totalSpent: number;
  }>;
  levelProgress: {
    current: string;
    next: string | null;
    progress: number;
    requirement: string | null;
    currentEarnings: number;
    targetEarnings: number | null;
  };
  users: Array<{
    id: number;
    username: string;
    phone: string | null;
    memberType: string;
    memberExpiry: string | null;
    createdAt: string;
  }>;
  subscriptions: Array<{
    id: number;
    userId: number;
    userName: string;
    planName: string;
    originalPrice: number;
    commissionAmount: number;
    createdAt: string;
  }>;
  commissions: Array<{
    id: number;
    userName: string;
    planName: string;
    amount: number;
    settlementStatus: string;
    createdAt: string;
  }>;
  // 管理员专属数据
  adminStats?: {
    totalAgents: number;
    totalSales: number;
    totalCommission: number;
    pendingSettlements: number;
  };
  allAgents?: Array<{
    id: number;
    uid: string;
    agentPath: string;
    commissionRate: number;
    inviteCount: number;
    paidUserCount: number;
    totalSales: number;
    totalCommission: number;
    pendingAmount: number;
    settledAmount: number;
    status: string;
    createdAt: string;
  }>;
  recentSubscriptions?: Array<{
    id: number;
    agentUid: string;
    userName: string;
    planName: string;
    originalPrice: number;
    commissionAmount: number;
    createdAt: string;
  }>;
}

export default function AgentPage() {
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedCodeType, setSelectedCodeType] = useState<'power_10000' | 'power_50000' | 'power_100000' | 'power_400000'>('power_10000');
  const [generateCount, setGenerateCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [pointsInfo, setPointsInfo] = useState<{
    pointsBalance: number;
    pointsTotal: number;
    pointsUsed: number;
    agentLevel: number | null;
  } | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementRemark, setSettlementRemark] = useState('');

  useEffect(() => {
    loadAgentData();
    loadPointsInfo();
  }, []);

  const loadPointsInfo = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/agent/points', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setPointsInfo(result.data);
      }
    } catch (error) {
      console.error('加载点数信息失败:', error);
    }
  };

  const loadAgentData = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/agent/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setAgentData(result.data);
      }
    } catch (error) {
      console.error('加载代理数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (agentData?.inviteLink) {
      navigator.clipboard.writeText(agentData.inviteLink);
      toast.success('邀请链接已复制');
    }
  };

  // 算力包配置
  const POWER_PACKAGES = [
    { type: 'power_10000' as const, name: '1万算力', power: 10000, points: 29, price: '¥28.9' },
    { type: 'power_50000' as const, name: '5万算力', power: 50000, points: 100, price: '¥99.9' },
    { type: 'power_100000' as const, name: '10万算力', power: 100000, points: 199, price: '¥199' },
    { type: 'power_400000' as const, name: '40万算力', power: 400000, points: 699, price: '¥699' },
  ];

  const getSelectedPointsCost = () => {
    const pkg = POWER_PACKAGES.find(p => p.type === selectedCodeType);
    return pkg?.points || 29;
  };

  const handleGenerateCodes = async () => {
    const totalCost = getSelectedPointsCost() * generateCount;

    if (!pointsInfo || pointsInfo.pointsBalance < totalCost) {
      toast.error(`点数不足，需要${totalCost}点，当前余额${pointsInfo?.pointsBalance || 0}点`);
      return;
    }

    setGenerating(true);
    try {
      // 使用统一的 apiRequest 函数，确保认证方式与 auth/me 一致
      const result = await apiRequest<{ success: boolean; data?: { code: string }[]; error?: string; pointsConsumed?: number }>('/redemption/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: selectedCodeType,
          count: generateCount,
        }),
      });

      if (result.success && result.data) {
        // result.data 是兑换码数组
        const codes = Array.isArray(result.data) ? result.data.map((c) => c.code) : [];
        setGeneratedCodes(codes);
        toast.success(`成功生成${codes.length}个兑换码，消耗${result.pointsConsumed || 0}点`);
        loadPointsInfo();
      } else {
        toast.error(result.error || '生成失败');
      }
    } catch (error) {
      console.error('生成兑换码失败:', error);
      toast.error(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCodes = () => {
    if (generatedCodes.length > 0) {
      navigator.clipboard.writeText(generatedCodes.join('\n'));
      toast.success('兑换码已复制');
    }
  };

  const handleSettlement = async () => {
    const amount = parseFloat(settlementAmount);
    if (!amount || amount <= 0) {
      toast.error('请输入有效的结算金额');
      return;
    }

    if (!bankName || !bankAccount || !accountName) {
      toast.error('请填写完整的银行账户信息');
      return;
    }

    if (agentData && amount > agentData.withdrawable) {
      toast.error(`可结算金额不足，当前待结算: ¥${agentData.withdrawable.toFixed(2)}`);
      return;
    }

    setWithdrawing(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/agent/settlements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          bankName,
          bankAccount,
          accountName,
          remark: settlementRemark,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('结算申请已提交');
        setSettlementDialogOpen(false);
        setSettlementAmount('');
        setBankName('');
        setBankAccount('');
        setAccountName('');
        setSettlementRemark('');
        loadAgentData();
      } else {
        toast.error(result.error || '申请失败');
      }
    } catch (error) {
      console.error('申请结算失败:', error);
      toast.error('申请失败，请重试');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!agentData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">暂无代理数据</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!agentData.isAgent) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-12">
          <Crown className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">您还不是代理</h2>
          <p className="text-muted-foreground mb-4">
            联系管理员开通代理资格，即可开始推广赚钱
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // 最高管理员专属视图（全局数据）
  if (agentData.isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">代理中心</h1>
              <p className="text-muted-foreground mt-1">
                最高管理员视角 - 管理您的代理网络
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => window.location.href = '/admin/agents'}>
                <Plus className="w-4 h-4 mr-2" />
                创建代理
              </Button>
              <Badge variant="default" className="text-lg px-4 py-2 bg-red-500">
                <Shield className="w-4 h-4 mr-2" />
                最高管理员
              </Badge>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">代理总数</p>
                    <p className="text-2xl font-bold mt-1">{agentData.adminStats?.totalAgents || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">总销售额</p>
                    <p className="text-2xl font-bold mt-1">¥{(agentData.adminStats?.totalSales || 0).toFixed(2)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">总佣金</p>
                    <p className="text-2xl font-bold mt-1">¥{(agentData.adminStats?.totalCommission || 0).toFixed(2)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">待结算</p>
                    <p className="text-2xl font-bold mt-1">¥{(agentData.adminStats?.pendingSettlements || 0).toFixed(2)}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="agents">
            <TabsList>
              <TabsTrigger value="agents">
                <Users className="w-4 h-4 mr-2" />
                代理列表
              </TabsTrigger>
              <TabsTrigger value="subscriptions">
                <Calendar className="w-4 h-4 mr-2" />
                开通记录
              </TabsTrigger>
              <TabsTrigger value="settlements">
                <Wallet className="w-4 h-4 mr-2" />
                结算审核
              </TabsTrigger>
            </TabsList>

            {/* Agents Tab */}
            <TabsContent value="agents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>所有代理</CardTitle>
                  <CardDescription>共 {agentData.allAgents?.length || 0} 位代理</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!agentData.allAgents || agentData.allAgents.length === 0) ? (
                    <p className="text-center text-muted-foreground py-8">暂无代理</p>
                  ) : (
                    <div className="space-y-2">
                      {agentData.allAgents.map(agent => (
                        <div key={agent.id} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div>
                            <p className="font-medium">{agent.agentPath} <span className="text-muted-foreground text-sm">({agent.uid})</span></p>
                            <p className="text-sm text-muted-foreground">
                              佣金比例: {Math.round(agent.commissionRate * 100)}% | 
                              邀请: {agent.inviteCount} | 
                              付费: {agent.paidUserCount}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">¥{agent.totalCommission.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              销售 ¥{agent.totalSales.toFixed(2)} | 待结算 ¥{agent.pendingAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subscriptions Tab */}
            <TabsContent value="subscriptions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>最近开通记录</CardTitle>
                  <CardDescription>所有代理的开通记录</CardDescription>
                </CardHeader>
                <CardContent>
                  {(!agentData.recentSubscriptions || agentData.recentSubscriptions.length === 0) ? (
                    <p className="text-center text-muted-foreground py-8">暂无开通记录</p>
                  ) : (
                    <div className="space-y-2">
                      {agentData.recentSubscriptions.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div>
                            <p className="font-medium">{sub.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              代理: {sub.agentUid} | {sub.planName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">+¥{sub.commissionAmount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sub.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settlements Tab */}
            <TabsContent value="settlements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>结算审核</CardTitle>
                  <CardDescription>待审核的结算申请</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Button onClick={() => window.location.href = '/admin'}>
                      前往管理后台审核
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">代理中心</h1>
            <p className="text-muted-foreground mt-1">
              代理路径: {agentData.agentPath} | 佣金比例: {Math.round(agentData.commissionRate * 100)}%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={
                agentData.agentLevel === 0 ? 'default' : 
                agentData.agentLevel === 1 ? 'secondary' : 
                'outline'
              } 
              className="text-lg px-4 py-2"
            >
              <Crown className="w-4 h-4 mr-2" />
              {agentData.agentLevel === 0 ? '总代' : 
               agentData.agentLevel === 1 ? '一级代理' : 
               agentData.agentLevel === 2 ? '二级代理' : agentData.level}
            </Badge>
          </div>
        </div>

        {/* 代理层级说明 */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                {agentData.agentLevel === 0 && (
                  <p>您是<strong className="text-foreground">总代</strong>，可生成算力包兑换码，可创建一级代理和二级代理。</p>
                )}
                {agentData.agentLevel === 1 && (
                  <p>您是<strong className="text-foreground">一级代理</strong>，可生成算力包兑换码，可创建二级代理。</p>
                )}
                {agentData.agentLevel === 2 && (
                  <p>您是<strong className="text-foreground">二级代理</strong>，仅能推广用户获取佣金分成，无法生成兑换码。</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">邀请人数</p>
                  <p className="text-2xl font-bold mt-1">{agentData.inviteCount}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">付费会员</p>
                  <p className="text-2xl font-bold mt-1">{agentData.activeUsers}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <UserCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">累计佣金</p>
                  <p className="text-2xl font-bold mt-1">¥{agentData.totalEarnings.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待结算</p>
                  <p className="text-2xl font-bold mt-1">¥{agentData.withdrawable.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              代理等级
            </CardTitle>
            <CardDescription>
              当前等级：{agentData.levelProgress.current}
              {agentData.levelProgress.next && ` | 距离下一级：${agentData.levelProgress.requirement}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{agentData.levelProgress.current}</span>
                <span>{agentData.levelProgress.next || '已满级'}</span>
              </div>
              <Progress value={agentData.levelProgress.progress} className="h-2" />
              {agentData.levelProgress.targetEarnings && (
                <p className="text-xs text-muted-foreground text-center">
                  累计佣金 ¥{agentData.levelProgress.currentEarnings.toFixed(2)} / ¥{agentData.levelProgress.targetEarnings}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invite Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  邀请好友，赚取佣金
                </h2>
                <p className="mt-2 text-muted-foreground">
                  分享专属链接给好友注册，好友购买会员后您可获得 {Math.round(agentData.commissionRate * 100)}% 佣金
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  您的推广路径：{agentData.agentPath}（好友注册时会自动绑定为您下级）
                </p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Input
                  value={agentData.inviteLink}
                  readOnly
                  className="bg-background"
                />
                <Button onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </Button>
                <SimplePosterGenerator 
                  agentPath={agentData.agentPath}
                  trigger={
                    <Button variant="default">
                      <ImageIcon className="w-4 h-4 mr-1" />
                      海报
                    </Button>
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              下级用户
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <Calendar className="w-4 h-4 mr-2" />
              开通记录
            </TabsTrigger>
            <TabsTrigger value="commissions">
              <DollarSign className="w-4 h-4 mr-2" />
              佣金记录
            </TabsTrigger>
            <TabsTrigger value="settlements">
              <Wallet className="w-4 h-4 mr-2" />
              结算管理
            </TabsTrigger>
            <TabsTrigger value="points">
              <Coins className="w-4 h-4 mr-2" />
              点数管理
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>下级用户列表</CardTitle>
                    <CardDescription>共 {agentData.users.length} 位用户</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {agentData.users.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">暂无下级用户</p>
                ) : (
                  <div className="space-y-2">
                    {agentData.users.map(user => (
                      <div key={user.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.phone || '未绑定手机'}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={user.memberExpiry && new Date(user.memberExpiry) > new Date() ? 'default' : 'secondary'}>
                            {user.memberType === 'none' ? '普通用户' : 
                             user.memberExpiry && new Date(user.memberExpiry) > new Date() ? '会员有效' : '会员已过期'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            注册: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>开通记录</CardTitle>
                <CardDescription>您为下级开通会员的记录</CardDescription>
              </CardHeader>
              <CardContent>
                {!agentData.subscriptions || agentData.subscriptions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">暂无开通记录</p>
                ) : (
                  <div className="space-y-2">
                    {agentData.subscriptions.map(sub => (
                      <div key={sub.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{sub.userName}</p>
                          <p className="text-sm text-muted-foreground">{sub.planName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">+¥{sub.commissionAmount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sub.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>佣金记录</CardTitle>
                <CardDescription>您的所有佣金记录</CardDescription>
              </CardHeader>
              <CardContent>
                {!agentData.commissions || agentData.commissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">暂无佣金记录</p>
                ) : (
                  <div className="space-y-2">
                    {agentData.commissions.map(commission => (
                      <div key={commission.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{commission.userName || '用户'}</p>
                          <p className="text-sm text-muted-foreground">{commission.planName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">+¥{commission.amount.toFixed(2)}</p>
                          <Badge variant={commission.settlementStatus === 'pending' ? 'secondary' : 'default'}>
                            {commission.settlementStatus === 'pending' ? '待结算' : '已结算'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settlements Tab */}
          <TabsContent value="settlements" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>结算管理</CardTitle>
                    <CardDescription>已结算: ¥{agentData.withdrawn.toFixed(2)} | 待结算: ¥{agentData.withdrawable.toFixed(2)}</CardDescription>
                  </div>
                  <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
                    <DialogTrigger asChild>
                      <Button disabled={agentData.withdrawable <= 0}>
                        申请结算
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>申请结算</DialogTitle>
                        <DialogDescription>
                          可结算金额: ¥{agentData.withdrawable.toFixed(2)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>结算金额</Label>
                          <Input
                            type="number"
                            placeholder="请输入结算金额"
                            value={settlementAmount}
                            onChange={(e) => setSettlementAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>开户银行</Label>
                          <Input
                            placeholder="如：中国工商银行"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>银行账号</Label>
                          <Input
                            placeholder="请输入银行账号"
                            value={bankAccount}
                            onChange={(e) => setBankAccount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>开户名</Label>
                          <Input
                            placeholder="请输入开户人姓名"
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>备注 (可选)</Label>
                          <Textarea
                            placeholder="如有特殊说明请填写"
                            value={settlementRemark}
                            onChange={(e) => setSettlementRemark(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSettlementDialogOpen(false)}>
                          取消
                        </Button>
                        <Button onClick={handleSettlement} disabled={withdrawing}>
                          {withdrawing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              提交中...
                            </>
                          ) : (
                            '提交申请'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">结算记录将在管理员审核后显示</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Points Tab */}
          <TabsContent value="points" className="space-y-4">
            <PointsManagement />
          </TabsContent>
        </Tabs>

        {/* 生成兑换码对话框 */}
        <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-500" />
                生成兑换码
              </DialogTitle>
              <DialogDescription>
                选择算力包类型和数量，生成兑换码
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 当前点数 */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">当前可用点数</span>
                  <span className="font-bold text-yellow-600">{pointsInfo?.pointsBalance.toLocaleString() || 0}</span>
                </div>
              </div>
              
              {/* 算力包类型选择 */}
              <div className="space-y-2">
                <Label>选择算力包类型</Label>
                <div className="grid grid-cols-2 gap-3">
                  {POWER_PACKAGES.map(pkg => (
                    <button
                      key={pkg.type}
                      type="button"
                      onClick={() => setSelectedCodeType(pkg.type)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedCodeType === pkg.type
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        消耗{pkg.points}点 · 售价{pkg.price}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 生成数量 */}
              <div className="space-y-2">
                <Label>生成数量</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={generateCount}
                  onChange={(e) => setGenerateCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>

              {/* 消耗点数提示 */}
              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-700 dark:text-orange-300">本次消耗点数</span>
                  <span className="font-bold text-orange-600">{getSelectedPointsCost() * generateCount}</span>
                </div>
              </div>

              {/* 生成的兑换码列表 */}
              {generatedCodes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>生成的兑换码</Label>
                    <Button variant="outline" size="sm" onClick={handleCopyCodes}>
                      <Copy className="w-4 h-4 mr-1" />
                      复制全部
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-3 bg-muted rounded-lg">
                    {generatedCodes.map((code, index) => (
                      <div key={index} className="text-sm font-mono">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setGenerateDialogOpen(false);
                setGeneratedCodes([]);
              }}>
                关闭
              </Button>
              <Button 
                onClick={handleGenerateCodes} 
                disabled={generating || !pointsInfo || pointsInfo.pointsBalance < getSelectedPointsCost() * generateCount}
                className="gradient-bg border-0"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  '确认生成'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// 点数管理组件
function PointsManagement() {
  const [pointsInfo, setPointsInfo] = useState<{
    pointsBalance: number;
    pointsTotal: number;
    pointsUsed: number;
    agentLevel: number | null;
  } | null>(null);
  const [subAgents, setSubAgents] = useState<Array<{
    agentId: number;
    agentUid: string;
    agentLevel: number | null;
    pointsBalance: number;
    pointsTotal: number;
    pointsUsed: number;
    consumptionTotal: number;
    consumptionCount: number;
  }>>([]);
  // 消耗记录
  const [consumptionRecords, setConsumptionRecords] = useState<Array<{
    id: number;
    agentId: number;
    agentUid: string;
    code: string;
    codeType: string;
    pointsCost: number;
    createdAt: string;
  }>>([]);
  const [subConsumptionRecords, setSubConsumptionRecords] = useState<Array<{
    id: number;
    agentId: number;
    agentUid: string;
    code: string;
    codeType: string;
    pointsCost: number;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [selectedSubAgent, setSelectedSubAgent] = useState<number | null>(null);
  const [allocatePoints, setAllocatePoints] = useState('');
  const [allocateRemark, setAllocateRemark] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [activeRecordTab, setActiveRecordTab] = useState<'self' | 'sub'>('self');
  
  // 生成兑换码相关状态
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedCodeType, setSelectedCodeType] = useState<'power_10000' | 'power_50000' | 'power_100000' | 'power_400000'>('power_10000');
  const [generateCount, setGenerateCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  useEffect(() => {
    loadPointsData();
  }, []);

  // 兑换码类型中文名映射
  const getCodeTypeName = (codeType: string): string => {
    const typeNames: Record<string, string> = {
      trial: '体验会员',
      monthly: '月度会员',
      yearly: '年度会员',
      power_3000: '算力包3000',
      power_5000: '算力包5000',
      power_10000: '算力包10000',
      power_50000: '算力包50000',
      power_100000: '算力包100000',
      power_400000: '算力包400000',
    };
    return typeNames[codeType] || codeType;
  };

  // 算力包配置
  const POWER_PACKAGES = [
    { type: 'power_10000' as const, name: '1万算力', power: 10000, points: 29, price: '¥28.9' },
    { type: 'power_50000' as const, name: '5万算力', power: 50000, points: 100, price: '¥99.9' },
    { type: 'power_100000' as const, name: '10万算力', power: 100000, points: 199, price: '¥199' },
    { type: 'power_400000' as const, name: '40万算力', power: 400000, points: 699, price: '¥699' },
  ];

  // 获取当前选中算力包的点数消耗
  const getSelectedPointsCost = () => {
    const pkg = POWER_PACKAGES.find(p => p.type === selectedCodeType);
    return pkg?.points || 0;
  };

  // 生成兑换码
  const handleGenerateCodes = async () => {
    const totalCost = getSelectedPointsCost() * generateCount;
    
    if (!pointsInfo || pointsInfo.pointsBalance < totalCost) {
      toast.error(`点数不足，需要${totalCost}点，当前余额${pointsInfo?.pointsBalance || 0}点`);
      return;
    }

    setGenerating(true);
    setGeneratedCodes([]);
    
    try {
      // 使用统一的 apiRequest 函数，确保认证方式与 auth/me 一致
      const result = await apiRequest<{ success: boolean; data?: { code: string }[]; error?: string; pointsConsumed?: number }>('/redemption/generate', {
        method: 'POST',
        body: JSON.stringify({
          count: generateCount,
          type: selectedCodeType,
          maxUses: 1,
        }),
      });
      
      if (result.success && Array.isArray(result.data)) {
        // result.data 是兑换码数组
        const codes = result.data.map((c) => c.code);
        setGeneratedCodes(codes);
        toast.success(`成功生成${codes.length}个兑换码，消耗${result.pointsConsumed || 0}点`);
        // 刷新点数数据
        loadPointsData();
      } else {
        toast.error(result.error || '生成失败');
      }
    } catch (error) {
      console.error('生成兑换码失败:', error);
      toast.error(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  // 复制兑换码
  const handleCopyCodes = () => {
    if (generatedCodes.length > 0) {
      navigator.clipboard.writeText(generatedCodes.join('\n'));
      toast.success('已复制所有兑换码');
    }
  };

  const loadPointsData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      
      // 获取点数信息
      const pointsRes = await fetch('/api/agent/points?action=points', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const pointsData = await pointsRes.json();
      if (pointsData.success && pointsData.agentInfo) {
        setPointsInfo(pointsData.agentInfo);
      }

      // 获取下级代理统计
      const subRes = await fetch('/api/agent/points?action=sub_stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const subData = await subRes.json();
      if (subData.success) {
        setSubAgents(subData.data || []);
      }

      // 获取自己的消耗记录
      const consumptionRes = await fetch('/api/agent/points?action=consumption', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const consumptionData = await consumptionRes.json();
      if (consumptionData.success) {
        setConsumptionRecords(consumptionData.data || []);
      }

      // 获取下级代理的消耗记录
      const subConsumptionRes = await fetch('/api/agent/points?action=sub_consumption', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const subConsumptionData = await subConsumptionRes.json();
      if (subConsumptionData.success) {
        setSubConsumptionRecords(subConsumptionData.data || []);
      }
    } catch (error) {
      console.error('加载点数数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 导出消耗记录为CSV
  const exportToCSV = (records: typeof consumptionRecords, filename: string) => {
    if (records.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const headers = ['序号', '代理UID', '兑换码', '类型', '消耗点数', '创建时间'];
    const rows = records.map((record, index) => [
      index + 1,
      record.agentUid,
      record.code,
      getCodeTypeName(record.codeType),
      record.pointsCost,
      new Date(record.createdAt).toLocaleString('zh-CN'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // 添加BOM以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('导出成功');
  };

  // 导出下级代理统计为CSV
  const exportSubAgentsToCSV = () => {
    if (subAgents.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const headers = ['序号', '代理UID', '代理级别', '点数余额', '累计获得', '累计消耗', '兑换码消耗', '兑换码数量'];
    const rows = subAgents.map((agent, index) => [
      index + 1,
      agent.agentUid,
      agent.agentLevel === 0 ? '总代' : agent.agentLevel === 1 ? '一级代理' : '二级代理',
      agent.pointsBalance,
      agent.pointsTotal,
      agent.pointsUsed,
      agent.consumptionTotal,
      agent.consumptionCount,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `下级代理统计_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('导出成功');
  };

  const handleAllocate = async () => {
    if (!selectedSubAgent || !allocatePoints) {
      return;
    }

    const points = parseInt(allocatePoints);
    if (isNaN(points) || points <= 0) {
      return;
    }

    if (pointsInfo && points > pointsInfo.pointsBalance) {
      return;
    }

    setAllocating(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/agent/points', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'allocate',
          toAgentId: selectedSubAgent,
          points: points,
          remark: allocateRemark,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`成功划拨 ${points} 点`);
        setAllocateDialogOpen(false);
        setSelectedSubAgent(null);
        setAllocatePoints('');
        setAllocateRemark('');
        loadPointsData();
      } else {
        toast.error(result.error || '划拨失败');
      }
    } catch (error) {
      console.error('划拨失败:', error);
      toast.error('划拨失败，请重试');
    } finally {
      setAllocating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* 点数余额卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            点数余额
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {pointsInfo?.pointsBalance.toLocaleString() || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">可用点数</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {pointsInfo?.pointsTotal.toLocaleString() || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">累计获得</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {pointsInfo?.pointsUsed.toLocaleString() || 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">累计消耗</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 生成兑换码卡片 - 仅总代和一级代理可见 */}
      {pointsInfo?.agentLevel !== null && pointsInfo?.agentLevel !== 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-500" />
                  生成兑换码
                </CardTitle>
                <CardDescription>
                  生成算力包兑换码，用户兑换后获得对应算力
                </CardDescription>
              </div>
              <Button onClick={() => setGenerateDialogOpen(true)} className="gradient-bg border-0">
                <Plus className="w-4 h-4 mr-2" />
                生成兑换码
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              {POWER_PACKAGES.map(pkg => (
                <div key={pkg.type} className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold text-purple-600">{pkg.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">消耗{pkg.points}点</p>
                  <p className="text-xs text-muted-foreground">售价{pkg.price}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
              <p className="text-blue-700 dark:text-blue-300">
                💡 兑换码无有效期限制，用户兑换后算力有效期365天。生成时会扣除对应点数。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 下级代理点数 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                下级代理点数
              </CardTitle>
              <CardDescription>
                查看下级代理点数情况，并进行点数划拨
              </CardDescription>
            </div>
            {subAgents.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportSubAgentsToCSV}>
                <Download className="w-4 h-4 mr-1" />
                导出统计
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {subAgents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无下级代理</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subAgents.map(agent => (
                <div 
                  key={agent.agentId} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.agentUid}</p>
                      <p className="text-sm text-muted-foreground">
                        {agent.agentLevel === 0 ? '总代' : agent.agentLevel === 1 ? '一级代理' : '二级代理'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-bold text-lg">{agent.pointsBalance.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">点数余额</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{agent.consumptionTotal.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">已消耗</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSubAgent(agent.agentId);
                        setAllocateDialogOpen(true);
                      }}
                      disabled={!pointsInfo || pointsInfo.pointsBalance <= 0}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      划拨
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 消耗明细 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              消耗明细
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tabs value={activeRecordTab} onValueChange={(v) => setActiveRecordTab(v as 'self' | 'sub')}>
                <TabsList className="h-8">
                  <TabsTrigger value="self" className="text-xs px-3">我的消耗</TabsTrigger>
                  <TabsTrigger value="sub" className="text-xs px-3">下级消耗</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToCSV(
                  activeRecordTab === 'self' ? consumptionRecords : subConsumptionRecords,
                  activeRecordTab === 'self' ? '我的消耗明细' : '下级消耗明细'
                )}
                disabled={(activeRecordTab === 'self' ? consumptionRecords : subConsumptionRecords).length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeRecordTab === 'self' && (
            consumptionRecords.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无消耗记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">兑换码</th>
                      <th className="text-left py-3 px-2">类型</th>
                      <th className="text-right py-3 px-2">消耗点数</th>
                      <th className="text-left py-3 px-2">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumptionRecords.map(record => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-mono">{record.code}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{getCodeTypeName(record.codeType)}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right text-red-500 font-medium">
                          -{record.pointsCost}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          {activeRecordTab === 'sub' && (
            subConsumptionRecords.length === 0 ? (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无下级消耗记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">代理UID</th>
                      <th className="text-left py-3 px-2">兑换码</th>
                      <th className="text-left py-3 px-2">类型</th>
                      <th className="text-right py-3 px-2">消耗点数</th>
                      <th className="text-left py-3 px-2">创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subConsumptionRecords.map(record => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{record.agentUid}</td>
                        <td className="py-3 px-2 font-mono">{record.code}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline">{getCodeTypeName(record.codeType)}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right text-red-500 font-medium">
                          -{record.pointsCost}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* 点数划拨对话框 */}
      <Dialog open={allocateDialogOpen} onOpenChange={setAllocateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              划拨点数
            </DialogTitle>
            <DialogDescription>
              将点数划拨给下级代理，划拨后不可撤销
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">当前可用点数</span>
                <span className="font-bold">{pointsInfo?.pointsBalance.toLocaleString() || 0}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>划拨点数</Label>
              <Input
                type="number"
                placeholder="请输入划拨点数"
                value={allocatePoints}
                onChange={(e) => setAllocatePoints(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>备注 (可选)</Label>
              <Textarea
                placeholder="如有特殊说明请填写"
                value={allocateRemark}
                onChange={(e) => setAllocateRemark(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleAllocate} 
              disabled={allocating || !allocatePoints || parseInt(allocatePoints) <= 0}
            >
              {allocating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  划拨中...
                </>
              ) : (
                '确认划拨'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 生成兑换码对话框 */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              生成兑换码
            </DialogTitle>
            <DialogDescription>
              选择算力包类型和数量，生成兑换码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 当前点数 */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">当前可用点数</span>
                <span className="font-bold text-yellow-600">{pointsInfo?.pointsBalance.toLocaleString() || 0}</span>
              </div>
            </div>
            
            {/* 算力包类型选择 */}
            <div className="space-y-2">
              <Label>选择算力包类型</Label>
              <div className="grid grid-cols-2 gap-3">
                {POWER_PACKAGES.map(pkg => (
                  <button
                    key={pkg.type}
                    type="button"
                    onClick={() => setSelectedCodeType(pkg.type)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedCodeType === pkg.type
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium">{pkg.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      消耗{pkg.points}点 · 售价{pkg.price}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 生成数量 */}
            <div className="space-y-2">
              <Label>生成数量</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={generateCount}
                onChange={(e) => setGenerateCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>

            {/* 消耗点数提示 */}
            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-orange-700 dark:text-orange-300">本次消耗点数</span>
                <span className="font-bold text-orange-600">{getSelectedPointsCost() * generateCount}</span>
              </div>
            </div>

            {/* 生成的兑换码列表 */}
            {generatedCodes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>生成的兑换码</Label>
                  <Button variant="outline" size="sm" onClick={handleCopyCodes}>
                    <Copy className="w-4 h-4 mr-1" />
                    复制全部
                  </Button>
                </div>
                <div className="max-h-40 overflow-y-auto p-3 bg-muted rounded-lg">
                  {generatedCodes.map((code, index) => (
                    <div key={index} className="text-sm font-mono">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setGenerateDialogOpen(false);
              setGeneratedCodes([]);
            }}>
              关闭
            </Button>
            <Button 
              onClick={handleGenerateCodes} 
              disabled={generating || !pointsInfo || pointsInfo.pointsBalance < getSelectedPointsCost() * generateCount}
              className="gradient-bg border-0"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                '确认生成'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
