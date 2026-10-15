'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { SimplePosterGenerator } from '@/components/agent/PosterGenerator';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Link2,
  DollarSign,
  TrendingUp,
  Loader2,
  Search,
  Copy,
  Crown,
  UserPlus,
  Building2,
  UserCog,
  Settings2,
  ChevronDown,
  ImageIcon,
  ChevronRight,
  Coins,
  Send,
  Download,
  Receipt,
} from 'lucide-react';

interface AgentInfo {
  id: number;
  userId: number;
  uid: string;
  agentPath: string;
  parentId: number | null;
  parentUid: string | null;
  agentLevel: number | null;
  commissionRate: number;
  platformRate: number | null;
  canCreateCode: boolean | null;
  canCreateUser: boolean | null;
  status: string;
  pointsBalance: number | null;
  pointsTotal: number | null;
  pointsUsed: number | null;
  inviteCount: number;
  paidUserCount: number;
  totalSales: number;
  totalCommission: number;
  pendingAmount: number;
  settledAmount: number;
  createdAt: string;
  subAgents?: AgentInfo[];
}

interface AvailableUser {
  id: number;
  uid: string;
  username: string;
  role: string;
  memberType: string;
  phone: string;
  createdAt: string;
}

export default function AgentManagePage() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentAgentLevel, setCurrentAgentLevel] = useState<number | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAgents, setExpandedAgents] = useState<Set<number>>(new Set());

  // 创建代理对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [uidSearchTerm, setUidSearchTerm] = useState(''); // 非超级管理员的UID搜索
  const [uidSearchResult, setUidSearchResult] = useState<AvailableUser | null>(null); // UID搜索结果
  const [isSearchingUid, setIsSearchingUid] = useState(false); // 搜索中状态
  const [agentPath, setAgentPath] = useState('');
  const [agentLevel, setAgentLevel] = useState<string>('1');
  const [platformRate, setPlatformRate] = useState('0.5');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [canCreateCode, setCanCreateCode] = useState(true);
  const [canCreateUser, setCanCreateUser] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // 编辑代理对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentInfo | null>(null);
  const [editAgentLevel, setEditAgentLevel] = useState<string>('1');
  const [editPlatformRate, setEditPlatformRate] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editCanCreateCode, setEditCanCreateCode] = useState(true);
  const [editCanCreateUser, setEditCanCreateUser] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // 点数划拨对话框
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [pointsTargetAgent, setPointsTargetAgent] = useState<AgentInfo | null>(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsRemark, setPointsRemark] = useState('');
  const [isAllocatingPoints, setIsAllocatingPoints] = useState(false);

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
  const [loadingConsumption, setLoadingConsumption] = useState(false);
  const [consumptionFilter, setConsumptionFilter] = useState<string>('all'); // all, 或具体代理ID

  // 加载消耗记录
  const loadConsumptionRecords = async (agentId?: number) => {
    setLoadingConsumption(true);
    try {
      const token = getToken();
      let url = '/api/agent/points?action=consumption';
      if (agentId) {
        url += `&agentId=${agentId}`;
      }
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setConsumptionRecords(data.data || []);
      }
    } catch (error) {
      console.error('加载消耗记录失败:', error);
    } finally {
      setLoadingConsumption(false);
    }
  };

  // 加载所有代理的消耗记录（管理员用）
  const loadAllConsumptionRecords = async () => {
    setLoadingConsumption(true);
    try {
      const token = getToken();
      const response = await fetch('/api/admin/agents/consumption', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setConsumptionRecords(data.data || []);
      }
    } catch (error) {
      console.error('加载消耗记录失败:', error);
    } finally {
      setLoadingConsumption(false);
    }
  };

  // 导出消耗记录为CSV
  const exportConsumptionToCSV = () => {
    if (consumptionRecords.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const headers = ['序号', '代理UID', '兑换码', '类型', '消耗点数', '创建时间'];
    const rows = consumptionRecords.map((record, index) => [
      index + 1,
      record.agentUid,
      record.code,
      record.codeType,
      record.pointsCost,
      new Date(record.createdAt).toLocaleString('zh-CN'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `消耗明细_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('导出成功');
  };

  // 导出代理列表为CSV
  const exportAgentsToCSV = () => {
    if (filteredAgents.length === 0) {
      toast.error('没有数据可导出');
      return;
    }

    const headers = ['序号', '推广路径', '用户UID', '层级', '上级', '点数余额', '累计消耗', '邀请数', '付费数', '销售额', '佣金', '状态'];
    const rows = filteredAgents.map((agent, index) => [
      index + 1,
      agent.agentPath,
      agent.uid,
      agent.agentLevel === 0 ? '总代' : agent.agentLevel === 1 ? '一级代理' : '二级代理',
      agent.parentUid || '-',
      agent.pointsBalance || 0,
      agent.pointsUsed || 0,
      agent.inviteCount,
      agent.paidUserCount,
      agent.totalSales,
      agent.totalCommission,
      agent.status === 'active' ? '正常' : '禁用',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `代理列表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('导出成功');
  };

  // 加载代理列表
  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/admin/agents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.data.agents);
        setAvailableUsers(data.data.availableUsers);
        setIsSuperAdmin(data.data.isSuperAdmin);
        setCurrentAgentLevel(data.data.currentAgentLevel);
        setCurrentAgentId(data.data.currentAgentId);
      } else {
        toast.error(data.error || '获取代理列表失败');
      }
    } catch (error) {
      toast.error('获取代理列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    loadAllConsumptionRecords(); // 自动加载消耗记录
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
    };
    return typeNames[codeType] || codeType;
  };

  // 构建代理层级树
  const buildAgentTree = (agents: AgentInfo[]): AgentInfo[] => {
    const agentMap = new Map<number, AgentInfo>();
    const rootAgents: AgentInfo[] = [];

    // 先建立映射
    agents.forEach(agent => {
      agentMap.set(agent.id, { ...agent, subAgents: [] });
    });

    // 构建树
    agents.forEach(agent => {
      const node = agentMap.get(agent.id)!;
      if (agent.parentId && agentMap.has(agent.parentId)) {
        const parent = agentMap.get(agent.parentId)!;
        if (!parent.subAgents) parent.subAgents = [];
        parent.subAgents.push(node);
      } else {
        rootAgents.push(node);
      }
    });

    return rootAgents;
  };

  // 过滤代理
  const filteredAgents = agents.filter(a => 
    a.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.agentPath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 过滤可用用户
  const filteredAvailableUsers = availableUsers.filter(user =>
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.uid.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // 通过UID搜索用户（非超级管理员使用）
  const handleSearchByUid = async () => {
    if (!uidSearchTerm.trim()) {
      toast.error('请输入用户UID');
      return;
    }
    
    setIsSearchingUid(true);
    setUidSearchResult(null);
    setSelectedUserId('');
    
    try {
      const token = getToken();
      const response = await fetch(`/api/admin/users/search?uid=${encodeURIComponent(uidSearchTerm.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        if (data.data.isAgent) {
          toast.error('该用户已经是代理');
        } else {
          setUidSearchResult(data.data);
          setSelectedUserId(data.data.id.toString());
          toast.success('找到用户');
        }
      } else {
        toast.error(data.error || '未找到该用户');
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
      toast.error('搜索失败');
    } finally {
      setIsSearchingUid(false);
    }
  };

  // 一级代理列表（总代和一级代理，用于选择上级代理）
  const level1Agents = agents.filter(a => (a.agentLevel === 0 || a.agentLevel === 1 || (!a.agentLevel && !a.parentId)) && a.status === 'active');

  // 切换代理展开状态
  const toggleExpand = (agentId: number) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  // 创建代理
  const handleCreate = async () => {
    if (!selectedUserId || !agentPath) {
      toast.error('请选择用户并设置推广路径');
      return;
    }

    // 创建二级代理时，必须选择上级代理
    // 最高管理员和总代创建二级代理时都需要选择
    if (agentLevel === '2' && !selectedParentId) {
      toast.error('二级代理必须选择一个上级代理');
      return;
    }

    setIsCreating(true);
    try {
      const token = getToken();
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: parseInt(selectedUserId),
          agentPath: agentPath.trim(),
          agentLevel: parseInt(agentLevel),
          platformRate: parseFloat(platformRate),
          parentId: selectedParentId ? parseInt(selectedParentId) : null,
          canCreateCode: agentLevel === '1' ? canCreateCode : false,
          canCreateUser: agentLevel === '1' ? canCreateUser : false,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('创建代理成功');
        setCreateDialogOpen(false);
        resetCreateForm();
        loadAgents();
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      toast.error('创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  // 重置创建表单
  const resetCreateForm = () => {
    setSelectedUserId('');
    setAgentPath('');
    setAgentLevel('1');
    setPlatformRate('0.5');
    setSelectedParentId('');
    setCanCreateCode(true);
    setCanCreateUser(true);
    setUserSearchTerm('');
    setUidSearchTerm('');
    setUidSearchResult(null);
  };

  // 打开编辑对话框
  const handleEdit = (agent: AgentInfo) => {
    setEditingAgent(agent);
    setEditAgentLevel(String(agent.agentLevel ?? 1));
    setEditPlatformRate((agent.platformRate || 0.5).toString());
    setEditStatus(agent.status);
    setEditParentId(agent.parentId?.toString() || '');
    setEditCanCreateCode(agent.canCreateCode ?? true);
    setEditCanCreateUser(agent.canCreateUser ?? true);
    setEditDialogOpen(true);
  };

  // 更新代理
  const handleUpdate = async () => {
    if (!editingAgent) return;

    setIsUpdating(true);
    try {
      const token = getToken();
      const newLevel = parseInt(editAgentLevel);
      
      const response = await fetch('/api/admin/agents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingAgent.id,
          agentLevel: newLevel,
          platformRate: parseFloat(editPlatformRate),
          status: editStatus,
          parentId: editParentId ? parseInt(editParentId) : null,
          canCreateCode: (newLevel === 0 || newLevel === 1) ? editCanCreateCode : undefined,
          canCreateUser: newLevel === 0 ? editCanCreateUser : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('更新成功');
        setEditDialogOpen(false);
        loadAgents();
      } else {
        toast.error(data.error || '更新失败');
      }
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 删除代理
  const handleDelete = async (agent: AgentInfo) => {
    if (!confirm(`确定要删除代理 "${agent.agentPath}" 吗？\n\n注意：这会解除该用户的代理身份和相关绑定关系。`)) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/agents?id=${agent.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        toast.success('删除成功');
        loadAgents();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 打开点数划拨对话框
  const handleOpenPointsDialog = (agent: AgentInfo) => {
    setPointsTargetAgent(agent);
    setPointsAmount('');
    setPointsRemark('');
    setPointsDialogOpen(true);
  };

  // 执行点数划拨
  const handleAllocatePoints = async () => {
    if (!pointsTargetAgent || !pointsAmount) {
      toast.error('请输入划拨点数');
      return;
    }

    const points = parseInt(pointsAmount);
    if (isNaN(points) || points <= 0) {
      toast.error('请输入有效的点数');
      return;
    }

    setIsAllocatingPoints(true);
    try {
      const token = getToken();
      
      // 最高管理员使用recharge操作，其他代理使用allocate操作
      const action = isSuperAdmin ? 'recharge' : 'allocate';
      const requestBody: Record<string, any> = {
        action,
        points: points,
        remark: pointsRemark || undefined,
      };
      
      if (isSuperAdmin) {
        requestBody.agentId = pointsTargetAgent.id;
      } else {
        requestBody.toAgentId = pointsTargetAgent.id;
      }
      
      const response = await fetch('/api/agent/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`成功划拨 ${points} 点`);
        setPointsDialogOpen(false);
        setPointsTargetAgent(null);
        setPointsAmount('');
        setPointsRemark('');
        loadAgents();
      } else {
        toast.error(data.error || '划拨失败');
      }
    } catch (error) {
      toast.error('划拨失败');
    } finally {
      setIsAllocatingPoints(false);
    }
  };

  // 复制推广链接
  const handleCopyLink = (agentPath: string) => {
    const domain = process.env.NEXT_PUBLIC_DOMAIN || window.location.origin;
    const link = `${domain}/login?ref=${agentPath}`;
    navigator.clipboard.writeText(link);
    toast.success('推广链接已复制');
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  // 渲染代理行
  const renderAgentRow = (agent: AgentInfo, depth: number = 0): React.ReactNode => {
    const hasSubAgents = agent.subAgents && agent.subAgents.length > 0;
    const isExpanded = expandedAgents.has(agent.id);

    return (
      <>
        <TableRow key={agent.id} className={depth > 0 ? 'bg-muted/30' : ''}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: depth * 24 }}>
              {hasSubAgents && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleExpand(agent.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              )}
              {!hasSubAgents && depth > 0 && <div className="w-6" />}
              <Badge variant="outline">{agent.agentPath}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopyLink(agent.agentPath)}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">{agent.uid}</p>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={agent.agentLevel === 0 ? 'default' : agent.agentLevel === 1 ? 'outline' : 'secondary'}>
              {agent.agentLevel === 0 ? '总代' : agent.agentLevel === 1 ? '一级代理' : '二级代理'}
            </Badge>
          </TableCell>
          <TableCell>
            {agent.parentUid ? (
              <span className="text-muted-foreground">{agent.parentUid}</span>
            ) : (
              <Badge variant="secondary">直属</Badge>
            )}
          </TableCell>
          <TableCell>
            <Badge className="ml-1">{agent.platformRate ? Math.round(agent.platformRate * 100) : 0}%</Badge>
          </TableCell>
          <TableCell>
            <span className="font-medium">{agent.pointsBalance ?? 0}</span>
            <span className="text-xs text-muted-foreground ml-1">点</span>
          </TableCell>
          <TableCell>
            {(agent.agentLevel === 0 || agent.agentLevel === 1) && (
              <div className="flex items-center gap-2">
                {agent.canCreateCode && (
                  <Badge variant="outline" className="text-xs">码</Badge>
                )}
                {agent.canCreateUser && (
                  <Badge variant="outline" className="text-xs">用户</Badge>
                )}
              </div>
            )}
          </TableCell>
          <TableCell>
            <span>{agent.inviteCount}</span>
            <span className="text-muted-foreground"> / {agent.paidUserCount}</span>
          </TableCell>
          <TableCell>
            <div>
              <p className="font-medium">¥{agent.totalSales.toFixed(2)}</p>
              <p className="text-sm text-green-600">¥{agent.totalCommission.toFixed(2)}</p>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
              {agent.status === 'active' ? '正常' : '暂停'}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
              <SimplePosterGenerator 
                agentPath={agent.agentPath}
                trigger={
                  <Button variant="ghost" size="sm" title="生成推广海报">
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                }
              />
              {/* 点数划拨按钮 */}
              {/* 最高管理员可以给任何代理划拨；总代/一级代理可以给下级划拨 */}
              {(isSuperAdmin || 
                (currentAgentLevel === 0 && (agent.agentLevel === 1 || agent.agentLevel === 2)) ||
                (currentAgentLevel === 1 && agent.agentLevel === 2 && agent.parentId === currentAgentId)
              ) && (
                <Button
                  variant="ghost"
                  size="sm"
                  title="划拨点数"
                  onClick={() => handleOpenPointsDialog(agent)}
                >
                  <Coins className="w-4 h-4 text-yellow-500" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(agent)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              {/* 删除按钮：超级管理员或上级代理可见 */}
              {(isSuperAdmin || 
                (currentAgentLevel === 0 && agent.parentId === currentAgentId) || // 总代删除一级代理
                (currentAgentLevel === 1 && agent.agentLevel === 2 && agent.parentId === currentAgentId) || // 一级代理删除二级代理
                (currentAgentLevel === 0 && agent.agentLevel === 2 && agent.parentId && 
                  // 总代删除二级代理（需要检查是否是自己的间接下级）
                  agents.find(a => a.id === agent.parentId)?.parentId === currentAgentId
                )
              ) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  title="删除代理"
                  onClick={() => handleDelete(agent)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
        {isExpanded && hasSubAgents && agent.subAgents!.map(subAgent => 
          renderAgentRow(subAgent, depth + 1)
        )}
      </>
    );
  };

  // 统计数据
  const stats = {
    total: agents.length,
    level0: agents.filter(a => a.agentLevel === 0).length,  // 总代
    level1: agents.filter(a => a.agentLevel === 1 || (!a.agentLevel && !a.parentId)).length,
    level2: agents.filter(a => a.agentLevel === 2 || (!a.agentLevel && a.parentId)).length,
    totalSales: agents.reduce((sum, a) => sum + a.totalSales, 0),
    totalCommission: agents.reduce((sum, a) => sum + a.totalCommission, 0),
    pendingAmount: agents.reduce((sum, a) => sum + a.pendingAmount, 0),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-primary" />
              代理管理
              {isSuperAdmin && (
                <Badge className="ml-2 bg-red-500 text-white">最高管理员</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              创建和管理代理账户，设置佣金比例和权限
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                创建代理
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>创建代理</DialogTitle>
                <DialogDescription>
                  为用户创建代理账户，设置代理层级、推广路径和佣金比例
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>选择用户</Label>
                  {isSuperAdmin ? (
                    // 超级管理员：显示用户列表
                    <>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="搜索用户名或UID..."
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择要成为代理的用户" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredAvailableUsers.map(user => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.username} ({user.uid}) - {user.role === 'admin' ? '管理员' : '用户'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableUsers.length === 0 && (
                        <p className="text-sm text-muted-foreground">所有用户都已是代理</p>
                      )}
                    </>
                  ) : (
                    // 非超级管理员：只能通过UID搜索
                    <>
                      <div className="flex gap-2">
                        <Input
                          placeholder="输入用户UID..."
                          value={uidSearchTerm}
                          onChange={(e) => setUidSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchByUid()}
                        />
                        <Button 
                          type="button" 
                          onClick={handleSearchByUid} 
                          disabled={isSearchingUid || !uidSearchTerm.trim()}
                        >
                          {isSearchingUid ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
                        </Button>
                      </div>
                      {uidSearchResult && (
                        <div className="p-3 bg-muted rounded-lg mt-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{uidSearchResult.username}</p>
                              <p className="text-sm text-muted-foreground">UID: {uidSearchResult.uid}</p>
                            </div>
                            <Badge variant="outline">已选中</Badge>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        请输入用户UID进行搜索，只能添加您认识的用户为代理
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>代理层级</Label>
                  {isSuperAdmin ? (
                    // 最高管理员可以选择所有层级
                    <Select value={agentLevel} onValueChange={setAgentLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">总代（可生成体验会员兑换码）</SelectItem>
                        <SelectItem value="1">一级代理（可创建兑换码和用户）</SelectItem>
                        <SelectItem value="2">二级代理（仅推广用户）</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : currentAgentLevel === 0 ? (
                    // 总代可以创建一级代理和二级代理
                    <Select value={agentLevel} onValueChange={setAgentLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">一级代理（可创建兑换码）</SelectItem>
                        <SelectItem value="2">二级代理（仅推广用户）</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : currentAgentLevel === 1 ? (
                    // 一级代理只能创建二级代理
                    <Input value="二级代理（仅推广用户）" disabled />
                  ) : (
                    // 非代理用户不能创建代理
                    <Input value="无权限创建代理" disabled />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isSuperAdmin 
                      ? '总代可生成体验会员兑换码，一级代理可创建普通兑换码，二级代理仅能推广用户'
                      : currentAgentLevel === 0
                      ? '您可以创建一级代理和二级代理，他们将成为您的下级'
                      : currentAgentLevel === 1
                      ? '您只能创建二级代理，将自动绑定为您的下级'
                      : '您还没有代理账户，请联系管理员开通'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>推广路径</Label>
                  <Input
                    placeholder="如: agent001"
                    value={agentPath}
                    onChange={(e) => setAgentPath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    代理的唯一标识，用于生成推广链接
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>我的分成比例 (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="如: 50"
                    value={platformRate === '0' ? '' : (parseFloat(platformRate) * 100).toString()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPlatformRate('0');
                      } else {
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 0 && num <= 100) {
                          setPlatformRate((num / 100).toString());
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    您从该代理推广订单中获得的分成比例
                  </p>
                </div>

                {isSuperAdmin && (agentLevel === '0' || agentLevel === '1') && (
                  <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-sm font-medium">权限设置</Label>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">创建兑换码</Label>
                        <p className="text-xs text-muted-foreground">允许创建会员兑换码</p>
                      </div>
                      <Switch
                        checked={canCreateCode}
                        onCheckedChange={setCanCreateCode}
                      />
                    </div>
                    {agentLevel === '0' && (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-sm">创建用户</Label>
                          <p className="text-xs text-muted-foreground">允许创建用户并绑定兑换码</p>
                        </div>
                        <Switch
                          checked={canCreateUser}
                          onCheckedChange={setCanCreateUser}
                        />
                      </div>
                    )}
                  </div>
                )}

                {(isSuperAdmin || currentAgentLevel === 0) && agentLevel === '2' && (
                  <div className="space-y-2">
                    <Label>上级代理</Label>
                    <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择上级代理" />
                      </SelectTrigger>
                      <SelectContent>
                        {level1Agents
                          .filter(agent => !isSuperAdmin || agent.agentLevel !== 0) // 非最高管理员时，只显示一级代理作为上级选项
                          .map(agent => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              {agent.agentPath} ({agent.uid}) - {agent.agentLevel === 0 ? '总代' : '一级代理'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      二级代理必须选择一个上级代理（总代或一级代理）
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    '创建代理'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">代理总数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.level0}</p>
                  <p className="text-sm text-muted-foreground">总代</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.level1}</p>
                  <p className="text-sm text-muted-foreground">一级代理</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <UserCog className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.level2}</p>
                  <p className="text-sm text-muted-foreground">二级代理</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ¥{stats.totalSales.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">总销售额</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ¥{stats.pendingAmount.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">待结算</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 代理列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>代理列表</CardTitle>
                <CardDescription>点击展开查看下级代理</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索代理..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={exportAgentsToCSV}>
                  <Download className="w-4 h-4 mr-1" />
                  导出列表
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {agents.length === 0 ? '暂无代理，点击上方按钮创建' : '没有匹配的代理'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>推广路径</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>层级</TableHead>
                    <TableHead>上级</TableHead>
                    <TableHead>我的分成</TableHead>
                    <TableHead>点数余额</TableHead>
                    <TableHead>权限</TableHead>
                    <TableHead>邀请/付费</TableHead>
                    <TableHead>销售额/佣金</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildAgentTree(filteredAgents).map(agent => renderAgentRow(agent))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 消耗明细卡片 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  消耗明细
                </CardTitle>
                <CardDescription>
                  查看代理生成兑换码的点数消耗记录
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={consumptionFilter} 
                  onValueChange={(v) => {
                    setConsumptionFilter(v);
                    if (v === 'all') {
                      loadAllConsumptionRecords();
                    } else {
                      loadConsumptionRecords(parseInt(v));
                    }
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="筛选代理" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部代理</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.uid}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exportConsumptionToCSV}
                  disabled={consumptionRecords.length === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  导出
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingConsumption ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : consumptionRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无消耗记录
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>代理UID</TableHead>
                      <TableHead>兑换码</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead className="text-right">消耗点数</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumptionRecords.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.agentUid}</TableCell>
                        <TableCell className="font-mono">{record.code}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCodeTypeName(record.codeType)}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-500 font-medium">
                          -{record.pointsCost}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑对话框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>编辑代理</DialogTitle>
              <DialogDescription>
                修改代理的佣金比例、权限和状态
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>推广路径</Label>
                  <Input value={editingAgent?.agentPath || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>代理层级</Label>
                  {/* 超级管理员或总代可以修改下级代理层级 */}
                  {(isSuperAdmin || currentAgentLevel === 0) ? (
                    <Select value={editAgentLevel} onValueChange={setEditAgentLevel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* 总代不能创建或修改为总代，只有超级管理员可以 */}
                        {isSuperAdmin && <SelectItem value="0">总代</SelectItem>}
                        <SelectItem value="1">一级代理</SelectItem>
                        <SelectItem value="2">二级代理</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      value={editingAgent?.agentLevel === 0 ? '总代' : editingAgent?.agentLevel === 1 ? '一级代理' : '二级代理'} 
                      disabled 
                    />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>我的分成比例 (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="如: 50"
                  value={editPlatformRate === '' || editPlatformRate === '0' ? '' : (parseFloat(editPlatformRate) * 100).toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setEditPlatformRate('');
                    } else {
                      const num = parseFloat(val);
                      if (!isNaN(num) && num >= 0 && num <= 100) {
                        setEditPlatformRate((num / 100).toString());
                      }
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  您从该代理推广订单中获得的分成比例
                </p>
              </div>

              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="suspended">暂停</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 使用新选择的层级来判断权限显示 */}
              {(parseInt(editAgentLevel) === 0 || parseInt(editAgentLevel) === 1) && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">权限设置</Label>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">创建兑换码</Label>
                      <p className="text-xs text-muted-foreground">允许创建会员兑换码</p>
                    </div>
                    <Switch
                      checked={editCanCreateCode}
                      onCheckedChange={setEditCanCreateCode}
                    />
                  </div>
                  {parseInt(editAgentLevel) === 0 && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">创建用户</Label>
                        <p className="text-xs text-muted-foreground">允许创建用户并绑定兑换码</p>
                      </div>
                      <Switch
                        checked={editCanCreateUser}
                        onCheckedChange={setEditCanCreateUser}
                      />
                    </div>
                  )}
                </div>
              )}

              {parseInt(editAgentLevel) === 2 && (
                <div className="space-y-2">
                  <Label>上级代理</Label>
                  <Select value={editParentId} onValueChange={setEditParentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="不选择则为直属代理" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents
                        .filter(a => a.id !== editingAgent?.id && (a.agentLevel === 0 || a.agentLevel === 1 || (!a.agentLevel && !a.parentId)) && a.status === 'active')
                        .map(agent => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.agentPath} ({agent.uid})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 点数划拨对话框 */}
        <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                划拨点数
              </DialogTitle>
              <DialogDescription>
                给代理账户划拨点数，点数可用于生成兑换码
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">目标代理</span>
                  <span className="font-medium">{pointsTargetAgent?.agentPath} ({pointsTargetAgent?.uid})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">当前点数</span>
                  <span className="font-bold text-yellow-600">{pointsTargetAgent?.pointsBalance?.toLocaleString() || 0} 点</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>划拨点数</Label>
                <Input
                  type="number"
                  placeholder="请输入划拨点数"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  输入正数为增加点数，输入负数为扣减点数
                </p>
              </div>
              <div className="space-y-2">
                <Label>备注（可选）</Label>
                <Input
                  placeholder="如：首次充值、补发点数等"
                  value={pointsRemark}
                  onChange={(e) => setPointsRemark(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPointsDialogOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleAllocatePoints} 
                disabled={isAllocatingPoints || !pointsAmount}
              >
                {isAllocatingPoints ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    划拨中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    确认划拨
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
