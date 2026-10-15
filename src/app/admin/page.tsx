'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, getToken } from '@/lib/api';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  User,
  Crown,
  Calendar,
  Zap,
  Monitor,
  Loader2,
  Search,
  Gift,
  Copy,
  Check,
  Database,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  HardDrive,
  FileText,
  Download,
  MessageSquare,
} from 'lucide-react';

// 统一蓝紫色主题
const THEME_COLOR = {
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  bg: '#8B5CF6',
  bgLight: '#F5F3FF',
  text: '#8B5CF6',
};

interface UserInfo {
  id: number;
  uid: string;              // 用户唯一标识
  username: string;
  role: 'super_admin' | 'admin' | 'user';
  maxCustomers: number;
  maxDevices: number;
  powerQuota: number; // 总配额
  credits: number; // 剩余算力
  powerExpiry?: string | null; // 算力有效期
  usedPower: number;
  lastLoginAt?: string | null; // 最后登录时间
  createdAt: string;
  updatedAt: string;
}

// 权限信息
interface Permissions {
  isSuperAdmin: boolean;
  canCreateAdmin: boolean;
  canViewDatabase: boolean;
  canGenerateCode: boolean;
  canViewLogs: boolean;
  canExportData: boolean;
}

// 最高管理员UID列表（支持多个UID）
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

// 判断是否是最高管理员
function checkIsSuperAdmin(uid: string | number | undefined): boolean {
  if (!uid) return false;
  return SUPER_ADMIN_UIDS.includes(String(uid));
}

// 获取角色显示名称
function getRoleDisplayName(uid: string | number, role: string): string {
  if (checkIsSuperAdmin(uid)) return '最高管理员';
  if (role === 'admin') return '管理员';
  return '普通用户';
}

export default function AdminPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [permissions, setPermissions] = useState<Permissions>({
    isSuperAdmin: false,
    canCreateAdmin: false,
    canViewDatabase: false,
    canGenerateCode: false,
    canViewLogs: false,
    canExportData: false,
  });
  
  // 算力统计数据
  const [powerStats, setPowerStats] = useState<{
    totalPower: number;
    usedPower: number;
    expiringSoon: number; // 即将过期（7天内）
    expired: number;
  }>({
    totalPower: 0,
    usedPower: 0,
    expiringSoon: 0,
    expired: 0,
  });
  
  // 创建/编辑用户对话框
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    maxCustomers: 10,
    maxDevices: 1,
    credits: 0,
    powerExpiry: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 兑换码相关状态
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeType, setCodeType] = useState<'trial' | 'monthly' | 'yearly'>('trial');
  const [codeCount, setCodeCount] = useState(1);
  const [codeRewardDays, setCodeRewardDays] = useState(1);
  const [codeRewardPower, setCodeRewardPower] = useState(1000);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [generatedCodesData, setGeneratedCodesData] = useState<any[]>([]); // 存储完整数据用于导出
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 根据兑换码类型自动设置奖励
  const updateCodeType = (type: 'trial' | 'monthly' | 'yearly') => {
    setCodeType(type);
    switch (type) {
      case 'trial':
        setCodeRewardDays(1);
        setCodeRewardPower(10000);
        break;
      case 'monthly':
        setCodeRewardDays(30);
        setCodeRewardPower(30000);
        break;
      case 'yearly':
        setCodeRewardDays(365);
        setCodeRewardPower(400000);
        break;
    }
  };

  // 数据库监控相关状态
  const [dbMonitor, setDbMonitor] = useState<{
    databaseSize: string;
    databaseSizeMB: number;
    limitMB: number;
    usagePercent: number;
    remainingMB: number;
    alertLevel: 'normal' | 'warning' | 'critical';
    alertMessage: string | null;
    tableStats: Array<{ tableName: string; rowCount: number; sizeKB: number }>;
    userStats: {
      totalUsers: number;
      activeUsersThisMonth: number;
      newUsersThisMonth: number;
    };
    estimation: {
      avgSizePerUser: number;
      estimatedMaxUsers: number;
      daysUntilWarning: number | null;
    };
  } | null>(null);
  const [isLoadingMonitor, setIsLoadingMonitor] = useState(false);

  // 代理数据统计相关状态
  const [agentStats, setAgentStats] = useState<{
    summary: {
      totalAdmins: number;
      totalCodesGenerated: number;
      totalCodesUsed: number;
      totalUsersCreatedByAdmins: number;
      totalRewardPowerDistributed: number;
    };
    adminStats: Array<{
      adminId: number;
      adminUid: string;
      adminUsername: string;
      totalCodesGenerated: number;
      codesByType: { trial: number; monthly: number; yearly: number; permanent: number; power: number; power_10000: number; power_50000: number; power_100000: number; power_400000: number };
      totalCodesUsed: number;
      codesUsedByType: { trial: number; monthly: number; yearly: number; permanent: number; power: number; power_10000: number; power_50000: number; power_100000: number; power_400000: number };
      usersCreated: number;
      totalRewardPower: number;
    }>;
    recentRedemptions: Array<{
      code: string;
      codeType: string;
      rewardDays: number;
      rewardPower: number;
      usedByUserId: number;
      usedByUsername: string;
      usedAt: string;
      createdByAdminId: number;
      createdByAdminUsername: string;
    }>;
    usersCreatedByAdmins: Array<{
      userId: number;
      username: string;
      createdAt: string;
      credits: number;
      powerQuota: number;
      powerExpiry: string | null;
      createdByAdminId: number;
      createdByAdminUsername: string;
    }>;
  } | null>(null);
  const [isLoadingAgentStats, setIsLoadingAgentStats] = useState(false);

  // 加载代理数据统计
  const loadAgentStats = async () => {
    setIsLoadingAgentStats(true);
    try {
      const token = getToken();
      const response = await fetch('/api/admin/agent-stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAgentStats(data.data);
      }
    } catch (error) {
      console.error('Load agent stats error:', error);
    } finally {
      setIsLoadingAgentStats(false);
    }
  };

  // 加载数据库监控信息
  const loadDbMonitor = async () => {
    setIsLoadingMonitor(true);
    try {
      const token = getToken();
      const response = await fetch('/api/admin/database-monitor', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setDbMonitor(data.data);
      }
    } catch (error) {
      console.error('Load db monitor error:', error);
    } finally {
      setIsLoadingMonitor(false);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('[Admin] API返回数据:', data);
      console.log('[Admin] 当前用户:', user);
      console.log('[Admin] API返回权限:', data.permissions);
      
      if (data.success) {
        setUsers(data.data);
        // 设置权限信息
        if (data.permissions) {
          console.log('[Admin] 设置权限:', data.permissions);
          setPermissions(data.permissions);
        } else {
          // 兼容旧API返回，根据当前用户判断
          const isSuper = checkIsSuperAdmin(user?.uid);
          console.log('[Admin] 兼容模式，本地判断是否超管:', isSuper, '用户UID:', user?.uid);
          setPermissions({
            isSuperAdmin: isSuper,
            canCreateAdmin: isSuper,
            canViewDatabase: isSuper,
            canGenerateCode: isSuper,
            canViewLogs: isSuper,
            canExportData: isSuper,
          });
        }
        // 设置算力统计
        if (data.powerStats) {
          setPowerStats(data.powerStats);
        }
      } else {
        toast.error(data.error || '获取用户列表失败');
      }
    } catch (error) {
      toast.error('获取用户列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 只有在认证加载完成且用户是管理员时才加载用户列表
    // 最高管理员通过UID判断，普通管理员通过role判断
    const isUserAdmin = user?.role === 'admin' || checkIsSuperAdmin(user?.uid);
    if (!isAuthLoading && isUserAdmin) {
      loadUsers();
      // 只有最高管理员才能加载监控数据
      if (checkIsSuperAdmin(user?.uid)) {
        loadDbMonitor();
        loadAgentStats();
      }
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthLoading]);

  // 过滤用户（支持用户名和UID搜索）
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 打开创建对话框
  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'user',
      maxCustomers: 10,
      maxDevices: 1,
      credits: 0,
      powerExpiry: '',
    });
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (userInfo: UserInfo) => {
    setEditingUser(userInfo);
    // 最高管理员角色不能被修改，普通用户和管理员可以编辑
    const editableRole = checkIsSuperAdmin(userInfo.uid) ? 'admin' : (userInfo.role === 'super_admin' ? 'admin' : userInfo.role);
    setFormData({
      username: userInfo.username,
      password: '', // 密码留空表示不修改
      role: editableRole as 'admin' | 'user',
      maxCustomers: userInfo.maxCustomers,
      maxDevices: userInfo.maxDevices,
      credits: userInfo.credits || 0,
      powerExpiry: userInfo.powerExpiry ? userInfo.powerExpiry.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!editingUser && !formData.password) {
      toast.error('请输入密码');
      return;
    }
    if (!formData.username) {
      toast.error('请输入用户名');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getToken();
      const url = '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { id: editingUser.id, ...formData, password: formData.password || undefined }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingUser ? '用户已更新' : '用户已创建');
        setDialogOpen(false);
        loadUsers();
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      toast.error('操作失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除用户
  const handleDelete = async (user: UserInfo) => {
    if (!confirm(`确定要删除用户 "${user.username}" 吗？`)) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast.success('用户已删除');
        loadUsers();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 生成兑换码
  const handleGenerateCodes = async () => {
    if (codeCount < 1 || codeCount > 100) {
      toast.error('生成数量需在1-100之间');
      return;
    }

    setIsGeneratingCodes(true);
    try {
      // 使用统一的 apiRequest 函数，确保认证方式与 auth/me 一致
      const data = await apiRequest<{ success: boolean; data?: any[]; error?: string } & any[]>('/redemption/generate', {
        method: 'POST',
        body: JSON.stringify({
          count: codeCount,
          type: codeType,
          rewardType: 'membership',
          rewardDays: codeRewardDays,
          rewardPower: codeRewardPower,
          maxUses: 1,
        }),
      });

      if (data.success && Array.isArray(data.data)) {
        setGeneratedCodes(data.data.map((c: any) => c.code));
        setGeneratedCodesData(data.data); // 存储完整数据
        toast.success(`成功生成${data.data.length}个兑换码`);
      } else {
        toast.error(data.error || '生成失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  // 复制兑换码
  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 复制所有兑换码
  const handleCopyAllCodes = async () => {
    try {
      await navigator.clipboard.writeText(generatedCodes.join('\n'));
      toast.success('已复制所有兑换码');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  // 导出兑换码为Excel (CSV格式，兼容Excel打开)
  const handleExportCodesToExcel = () => {
    if (generatedCodesData.length === 0) {
      toast.error('没有可导出的兑换码');
      return;
    }

    // 类型映射
    const typeMap: Record<string, string> = {
      'trial': '体验会员',
      'monthly': '月度会员',
      'yearly': '年度会员',
      'permanent': '永久会员',
    };

    // 构建CSV内容 (使用UTF-8 BOM确保Excel正确识别中文)
    const BOM = '\uFEFF';
    const headers = ['兑换码', '类型', '会员天数', '算力', '状态', '创建时间'];
    const rows = generatedCodesData.map(code => [
      code.code,
      typeMap[code.type] || code.type,
      code.rewardDays,
      code.rewardPower,
      code.status === 'active' ? '可用' : '已使用',
      new Date(code.createdAt).toLocaleString('zh-CN'),
    ]);

    const csvContent = BOM + [headers, ...rows].map(row => row.join(',')).join('\n');

    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `兑换码_${codeType}_${new Date().toISOString().slice(0, 10)}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('导出成功');
  };

  // 格式化日期
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  // 检查是否过期
  const isExpired = (expiry: string | null | undefined) => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };

  // 认证加载中，显示加载状态
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 非管理员显示无权限提示
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">无权限访问</h2>
            <p className="text-muted-foreground">您不是管理员，无法访问此页面</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 判断当前用户角色
  const currentUserRole = getRoleDisplayName(user.uid, user.role);
  const isSuperAdmin = permissions.isSuperAdmin;

  // 导出用户数据
  const handleExportUsers = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/export?type=users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || '导出失败');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
    }
  };

  // 导出操作日志
  const handleExportLogs = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/export?type=logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || '导出失败');
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `operation_logs_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (error) {
      toast.error('导出失败');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" style={{ color: THEME_COLOR.text }} />
              用户管理
              {isSuperAdmin && (
                <Badge className="ml-2 bg-amber-500 text-white">最高管理员</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              管理用户账号、权限和配额
              {!isSuperAdmin && '（部分功能仅最高管理员可访问）'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/admin/feedback'}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  用户反馈
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/admin/logs'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  操作日志
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleExportUsers}
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出用户
                </Button>
              </>
            )}
            <Button 
              onClick={handleCreate} 
              className="text-white border-0"
              style={{ background: THEME_COLOR.gradient }}
            >
              <Plus className="w-4 h-4 mr-2" />
              创建用户
            </Button>
          </div>
        </div>

        {/* 统计卡片 - 基础统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: THEME_COLOR.bgLight }}
                >
                  <Users className="w-6 h-6" style={{ color: THEME_COLOR.text }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">总用户数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: THEME_COLOR.bgLight }}
                >
                  <Shield className="w-6 h-6" style={{ color: THEME_COLOR.text }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                  <p className="text-sm text-muted-foreground">管理员</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: THEME_COLOR.bgLight }}
                >
                  <User className="w-6 h-6" style={{ color: THEME_COLOR.text }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.role === 'user').length}</p>
                  <p className="text-sm text-muted-foreground">普通用户</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{powerStats.expiringSoon}</p>
                  <p className="text-sm text-muted-foreground">即将过期(7天内)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 数据库监控面板 - 仅最高管理员可见 */}
        {isSuperAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  数据库监控
                </CardTitle>
                <CardDescription>实时监控数据库使用情况，使用率超过70%时自动告警</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadDbMonitor}
                disabled={isLoadingMonitor}
              >
                {isLoadingMonitor ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '刷新'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dbMonitor && (
              <>
                {/* 告警提示 */}
                {dbMonitor.alertLevel !== 'normal' && (
                  <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
                    dbMonitor.alertLevel === 'critical' 
                      ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900' 
                      : 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900'
                  }`}>
                    {dbMonitor.alertLevel === 'critical' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        dbMonitor.alertLevel === 'critical' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {dbMonitor.alertLevel === 'critical' ? '危险告警' : '容量警告'}
                      </p>
                      <p className={`text-sm ${
                        dbMonitor.alertLevel === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {dbMonitor.alertMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* 使用情况概览 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">数据库大小</span>
                    </div>
                    <p className="text-2xl font-bold">{dbMonitor.databaseSize}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">使用率</span>
                    </div>
                    <p className={`text-2xl font-bold ${
                      dbMonitor.usagePercent >= 85 ? 'text-red-500' :
                      dbMonitor.usagePercent >= 70 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {dbMonitor.usagePercent}%
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">剩余空间</span>
                    </div>
                    <p className="text-2xl font-bold">{dbMonitor.remainingMB} MB</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">预估可容纳用户</span>
                    </div>
                    <p className="text-2xl font-bold">{dbMonitor.estimation.estimatedMaxUsers.toLocaleString()}</p>
                  </div>
                </div>

                {/* 使用率进度条 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">存储使用进度</span>
                    <span className="text-sm text-muted-foreground">
                      {dbMonitor.databaseSizeMB} MB / {dbMonitor.limitMB} MB
                    </span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={dbMonitor.usagePercent} 
                      className={`h-3 ${
                        dbMonitor.usagePercent >= 85 ? '[&>div]:bg-red-500' :
                        dbMonitor.usagePercent >= 70 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
                      }`}
                    />
                    {/* 警告线和危险线 */}
                    <div 
                      className="absolute top-0 h-3 w-0.5 bg-yellow-500"
                      style={{ left: '70%' }}
                      title="警告阈值 70%"
                    />
                    <div 
                      className="absolute top-0 h-3 w-0.5 bg-red-500"
                      style={{ left: '85%' }}
                      title="危险阈值 85%"
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>0%</span>
                    <span className="text-yellow-500">70% 警告</span>
                    <span className="text-red-500">85% 危险</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* 各表统计 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {dbMonitor.tableStats.map((table) => (
                    <div key={table.tableName} className="p-3 rounded-lg border border-border bg-card">
                      <p className="text-xs text-muted-foreground truncate">{table.tableName}</p>
                      <p className="text-lg font-semibold">{table.rowCount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {table.rowCount} 条 · {table.sizeKB >= 1024 ? `${(table.sizeKB / 1024).toFixed(1)} MB` : `${table.sizeKB} KB`}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}

        {/* 兑换码管理 - 仅最高管理员可见 */}
        {isSuperAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-500" />
                  兑换码管理
                </CardTitle>
                <CardDescription>生成算力兑换码，支持体验版、月度版、年度版套餐</CardDescription>
              </div>
              <Button onClick={() => setCodeDialogOpen(true)} className="gradient-bg border-0">
                <Gift className="w-4 h-4 mr-2" />
                生成兑换码
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">体验版</p>
                <p className="text-sm text-muted-foreground">1天有效期 + 10000算力</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">月度版</p>
                <p className="text-sm text-muted-foreground">30天有效期 + 30000算力</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">年度版</p>
                <p className="text-sm text-muted-foreground">365天有效期 + 400000算力</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
              <p className="text-blue-700 dark:text-blue-300">
                💡 会员时长按小时计算：体验版24小时，月度版720小时(30天)，年度版8760小时(365天)。用户兑换后从当前时间开始计算权益。
              </p>
            </div>
          </CardContent>
        </Card>
        )}

        {/* 代理数据统计 - 仅最高管理员可见 */}
        {isSuperAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  代理数据统计
                </CardTitle>
                <CardDescription>查看各管理员的业绩数据，包括兑换码生成、使用情况和用户创建</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadAgentStats} disabled={isLoadingAgentStats}>
                {isLoadingAgentStats ? <Loader2 className="w-4 h-4 animate-spin" /> : '刷新数据'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAgentStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : agentStats ? (
              <div className="space-y-6">
                {/* 总览统计 */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{agentStats.summary.totalAdmins}</p>
                    <p className="text-sm text-muted-foreground">管理员数量</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{agentStats.summary.totalCodesGenerated}</p>
                    <p className="text-sm text-muted-foreground">兑换码生成总数</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{agentStats.summary.totalCodesUsed}</p>
                    <p className="text-sm text-muted-foreground">兑换码使用总数</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">{agentStats.summary.totalUsersCreatedByAdmins}</p>
                    <p className="text-sm text-muted-foreground">管理员创建用户数</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{agentStats.summary.totalRewardPowerDistributed.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">已分发算力总量</p>
                  </div>
                </div>

                {/* 各管理员统计表格 */}
                <div>
                  <h4 className="font-medium mb-3 text-foreground">各管理员业绩详情</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>管理员</TableHead>
                          <TableHead className="text-center">生成兑换码</TableHead>
                          <TableHead className="text-center">已使用</TableHead>
                          <TableHead className="text-center">创建用户</TableHead>
                          <TableHead className="text-center">分发算力</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentStats.adminStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              暂无管理员数据
                            </TableCell>
                          </TableRow>
                        ) : (
                          agentStats.adminStats.map((admin) => (
                            <TableRow key={admin.adminId}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{admin.adminUsername}</p>
                                  <p className="text-xs text-muted-foreground">UID: {admin.adminUid}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="space-y-1">
                                  <p className="font-medium">{admin.totalCodesGenerated}</p>
                                  <p className="text-xs text-muted-foreground">
                                    体验:{admin.codesByType.trial} 1万:{admin.codesByType.power_10000 || 0} 5万:{admin.codesByType.power_50000 || 0} 10万:{admin.codesByType.power_100000 || 0} 40万:{admin.codesByType.power_400000 || 0}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="space-y-1">
                                  <p className="font-medium text-green-600">{admin.totalCodesUsed}</p>
                                  <p className="text-xs text-muted-foreground">
                                    体验:{admin.codesUsedByType.trial} 1万:{admin.codesUsedByType.power_10000 || 0} 5万:{admin.codesUsedByType.power_50000 || 0} 10万:{admin.codesUsedByType.power_100000 || 0} 40万:{admin.codesUsedByType.power_400000 || 0}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <p className="font-medium">{admin.usersCreated}</p>
                              </TableCell>
                              <TableCell className="text-center">
                                <p className="font-medium text-red-600">{admin.totalRewardPower.toLocaleString()}</p>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 最近兑换记录 */}
                <div>
                  <h4 className="font-medium mb-3 text-foreground">最近兑换记录</h4>
                  <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>兑换码</TableHead>
                          <TableHead>类型</TableHead>
                          <TableHead>兑换用户</TableHead>
                          <TableHead>创建管理员</TableHead>
                          <TableHead className="text-right">奖励算力</TableHead>
                          <TableHead className="text-right">时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentStats.recentRedemptions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                              暂无兑换记录
                            </TableCell>
                          </TableRow>
                        ) : (
                          agentStats.recentRedemptions.map((record, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">{record.code}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {record.codeType === 'trial' ? '体验' : 
                                   record.codeType === 'monthly' ? '月度' : 
                                   record.codeType === 'yearly' ? '年度' : 
                                   record.codeType === 'permanent' ? '永久' :
                                   record.codeType === 'power_10000' ? '1万算力' :
                                   record.codeType === 'power_50000' ? '5万算力' :
                                   record.codeType === 'power_100000' ? '10万算力' :
                                   record.codeType === 'power_400000' ? '40万算力' :
                                   record.codeType.startsWith('power') ? '算力包' : record.codeType}
                                </Badge>
                              </TableCell>
                              <TableCell>{record.usedByUsername}</TableCell>
                              <TableCell>{record.createdByAdminUsername}</TableCell>
                              <TableCell className="text-right">{record.rewardPower.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {new Date(record.usedAt).toLocaleString('zh-CN')}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 管理员创建的用户 */}
                <div>
                  <h4 className="font-medium mb-3 text-foreground">管理员创建的用户</h4>
                  <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>用户名</TableHead>
                          <TableHead className="text-right">算力余额</TableHead>
                          <TableHead>创建管理员</TableHead>
                          <TableHead className="text-right">创建时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agentStats.usersCreatedByAdmins.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                              暂无数据
                            </TableCell>
                          </TableRow>
                        ) : (
                          agentStats.usersCreatedByAdmins.map((u) => (
                            <TableRow key={u.userId}>
                              <TableCell className="font-medium">{u.username}</TableCell>
                              <TableCell className="text-right">{(u.credits || 0).toLocaleString()}</TableCell>
                              <TableCell>{u.createdByAdminUsername}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无数据，请点击刷新按钮加载数据
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* 用户列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>用户列表</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用户名/UID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UID</TableHead>
                    <TableHead>用户名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>客户数</TableHead>
                    <TableHead>设备数</TableHead>
                    <TableHead>算力余额</TableHead>
                    <TableHead>算力有效期</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-sm">{u.uid || '-'}</TableCell>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role === 'admin' ? '管理员' : '用户'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {u.maxCustomers === -1 ? '无限制' : u.maxCustomers}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          {u.maxDevices === -1 ? '无限制' : u.maxDevices}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-muted-foreground" />
                          {u.credits === -1 ? '无限制' : (u.credits || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${isExpired(u.powerExpiry) ? 'text-red-500' : ''}`}>
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(u.powerExpiry)}
                          {isExpired(u.powerExpiry) && <span className="text-xs">(已过期)</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(u)}
                            disabled={checkIsSuperAdmin(u.uid) && !isSuperAdmin}
                            title={checkIsSuperAdmin(u.uid) && !isSuperAdmin ? '仅最高管理员可编辑' : '编辑'}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(u)}
                            disabled={
                              checkIsSuperAdmin(u.uid) || 
                              (u.role === 'admin' && users.filter(x => x.role === 'admin' || checkIsSuperAdmin(x.uid)).length <= 1)
                            }
                            title={checkIsSuperAdmin(u.uid) ? '最高管理员不能被删除' : '删除'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 创建/编辑用户对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? '编辑用户' : '创建用户'}</DialogTitle>
            <DialogDescription>
              {editingUser ? '修改用户信息和权限设置' : '创建新用户并设置权限'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingUser?.uid && (
              <div className="space-y-2">
                <Label>用户UID</Label>
                <Input
                  value={editingUser.uid}
                  disabled
                  className="bg-muted"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="请输入用户名"
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label>{editingUser ? '新密码（留空不修改）' : '密码'}</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '留空表示不修改密码' : '请输入密码'}
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'user' })}
                disabled={!!(editingUser && checkIsSuperAdmin(editingUser.uid))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">普通用户</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="admin">管理员</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!isSuperAdmin && !editingUser && (
                <p className="text-xs text-muted-foreground">仅最高管理员可创建管理员账号</p>
              )}
              {editingUser && checkIsSuperAdmin(editingUser.uid) && (
                <p className="text-xs text-amber-600">最高管理员角色不可修改</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>最大客户数量</Label>
                <Input
                  type="number"
                  value={formData.maxCustomers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    // 普通管理员不能设置负数（无限）
                    if (!isSuperAdmin && value < 0) return;
                    setFormData({ ...formData, maxCustomers: value });
                  }}
                  min={isSuperAdmin ? undefined : 1}
                />
                {isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">输入 -1 表示无限制</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>最大设备数量</Label>
                <Input
                  type="number"
                  value={formData.maxDevices}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    // 普通管理员不能设置负数（无限）
                    if (!isSuperAdmin && value < 0) return;
                    setFormData({ ...formData, maxDevices: value });
                  }}
                  min={isSuperAdmin ? undefined : 1}
                />
                {isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">输入 -1 表示无限制</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>算力余额</Label>
              <Input
                type="number"
                value={formData.credits}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  // 普通管理员不能设置负数（无限）
                  if (!isSuperAdmin && value < 0) return;
                  setFormData({ ...formData, credits: value });
                }}
                min={isSuperAdmin ? undefined : 0}
              />
              {isSuperAdmin && (
                <p className="text-xs text-muted-foreground">输入 -1 表示无限制</p>
              )}
              {!isSuperAdmin && (
                <p className="text-xs text-muted-foreground">仅最高管理员可设置无限制</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>算力有效期</Label>
              <Input
                type="date"
                value={formData.powerExpiry}
                onChange={(e) => setFormData({ ...formData, powerExpiry: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                留空表示不限制到期时间
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="gradient-bg border-0">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 兑换码生成对话框 */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" />
              生成兑换码
            </DialogTitle>
            <DialogDescription>
              批量生成兑换码，用户可兑换会员权益和算力
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 类型选择 */}
            <div className="space-y-2">
              <Label>兑换码类型</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => updateCodeType('trial')}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    codeType === 'trial'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">体验套餐</div>
                  <div className="text-xs text-muted-foreground mt-1">默认1天+10000算力</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateCodeType('monthly')}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    codeType === 'monthly'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">月度套餐</div>
                  <div className="text-xs text-muted-foreground mt-1">默认30天+30000算力</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateCodeType('yearly')}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    codeType === 'yearly'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">年度套餐</div>
                  <div className="text-xs text-muted-foreground mt-1">默认365天+40万算力</div>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 点击类型可快速设置默认值，您也可以在下方手动调整天数和算力
              </p>
            </div>

            {/* 当前配置预览 */}
            <div className="bg-muted/50 rounded-lg p-3 border">
              <div className="text-sm font-medium mb-2">当前配置预览</div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">有效期延长：</span>
                  <span className="font-medium">{codeRewardDays}天</span>
                </div>
                <div>
                  <span className="text-muted-foreground">赠送算力：</span>
                  <span className="font-medium">{codeRewardPower.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">生成数量：</span>
                  <span className="font-medium">{codeCount}个</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>生成数量</Label>
                <Input
                  type="number"
                  value={codeCount}
                  onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>会员天数</Label>
                <Input
                  type="number"
                  value={codeRewardDays}
                  onChange={(e) => setCodeRewardDays(parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>赠送算力</Label>
                <Input
                  type="number"
                  value={codeRewardPower}
                  onChange={(e) => setCodeRewardPower(parseInt(e.target.value) || 1000)}
                  min={0}
                  step={100}
                />
              </div>
            </div>
            
            {generatedCodes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>生成的兑换码</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExportCodesToExcel}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      导出Excel
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCopyAllCodes}
                      className="text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      复制全部
                    </Button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {generatedCodes.map((code, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm font-mono"
                    >
                      <span>{code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(code, index)}
                        className="h-6 w-6 p-0"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCodeDialogOpen(false);
              setGeneratedCodes([]);
            }}>
              关闭
            </Button>
            <Button 
              onClick={handleGenerateCodes} 
              disabled={isGeneratingCodes} 
              className="gradient-bg border-0"
            >
              {isGeneratingCodes && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              生成兑换码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
