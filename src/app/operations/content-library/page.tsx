'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  FolderOpen, 
  ArrowLeft,
  Search,
  Grid3X3,
  List,
  Star,
  Copy,
  Trash2,
  Eye,
  FileText,
  Video,
  Sparkles,
  BarChart3,
  Target,
  Shield,
  Users,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  MoreVertical,
  Edit,
  ExternalLink,
  Download,
  Save,
  X,
  Flame,
  CheckCircle2,
  Brain,
  Lightbulb,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getToken } from '@/lib/api';
import { Material, MaterialStats, MaterialSourceType, MaterialStatus } from '@/types';
import { PerformanceFeedback } from '@/components/memory/PerformanceFeedback';
import { StyleProfileDialog } from '@/components/memory/StyleProfileDialog';

// 脚本类型中文映射
const SCRIPT_TYPE_NAMES: Record<string, string> = {
  story: '讲故事',
  process: '晒过程',
  knowledge: '教知识',
  opinion: '说观点',
  product: '说产品',
  '讲故事': '讲故事',
  '晒过程': '晒过程',
  '教知识': '教知识',
  '说观点': '说观点',
  '说产品': '说产品',
};

// 检测是否为错误格式内容（Vision API 返回的图片URL等）
function isErrorFormatContent(content: string): boolean {
  if (!content) return false;
  const errorPatterns = [
    /^File:\s*\[/i,
    /^URL:\s*\[/i,
    /^Image:\s*\[/i,
    /File:\s*\[/i,
    /URL:\s*\[/i,
    /Image:\s*\[/i,
    /coze_coding\/file\/proxy/i,
    /assets\/image/i,
    /^```[\s\S]*(File|URL|Image):/i,
  ];
  return errorPatterns.some(pattern => pattern.test(content));
}

// 过滤错误格式的内容
function filterErrorFormatContent(content: string): string {
  if (!content) return '';
  if (isErrorFormatContent(content)) {
    return '';
  }
  return content;
}

// 来源类型配置
const SOURCE_TYPES: { value: MaterialSourceType | 'all' | 'other' | 'topic_batch' | 'create_opening' | 'opening_batch' | 'scriptless_shooting' | 'dialogue' | 'fullscript' | 'live_speech'; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'all', label: '全部来源', icon: FolderOpen, color: 'bg-gray-100' },
  { value: 'topic', label: '智能选题', icon: Sparkles, color: 'bg-amber-100 text-amber-700' },
  { value: 'topic_batch', label: '智能选题', icon: Sparkles, color: 'bg-amber-100 text-amber-700' },
  { value: 'script', label: '脚本创作', icon: FileText, color: 'bg-blue-100 text-blue-700' },
  { value: 'fullscript', label: '拍摄脚本', icon: Video, color: 'bg-pink-100 text-pink-700' },
  { value: 'writing', label: '文案写作', icon: FileText, color: 'bg-green-100 text-green-700' },
  { value: 'scriptless_shooting', label: '无脚本拍摄', icon: Video, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'dialogue', label: '对话流', icon: FileText, color: 'bg-violet-100 text-violet-700' },
  { value: 'create_opening', label: '开篇创作', icon: Video, color: 'bg-purple-100 text-purple-700' },
  { value: 'opening_batch', label: '批量开篇', icon: Video, color: 'bg-purple-100 text-purple-700' },
  { value: 'qianchuan_copywriting', label: '千川文案', icon: FileText, color: 'bg-orange-100 text-orange-700' },
  { value: 'qianchuan_script', label: '千川脚本', icon: Video, color: 'bg-orange-100 text-orange-700' },
  { value: 'feedad_copywriting', label: '信息流文案', icon: FileText, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'feedad_script', label: '信息流脚本', icon: Video, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'opening', label: '开场白', icon: Video, color: 'bg-purple-100 text-purple-700' },
  { value: 'live_speech', label: '直播话术', icon: Video, color: 'bg-red-100 text-red-700' },
  { value: 'humanize', label: '口语化处理', icon: Sparkles, color: 'bg-pink-100 text-pink-700' },
  { value: 'banned-words', label: '违禁词检测', icon: Shield, color: 'bg-red-100 text-red-700' },
  { value: 'account-analysis', label: '账号分析', icon: BarChart3, color: 'bg-orange-100 text-orange-700' },
  { value: 'benchmark', label: '对标分析', icon: Target, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'other', label: '其他', icon: FileText, color: 'bg-gray-100 text-gray-700' },
];

// 状态配置
const STATUS_OPTIONS: { value: MaterialStatus | 'all'; label: string; className: string }[] = [
  { value: 'all', label: '全部状态', className: '' },
  { value: 'draft', label: '草稿', className: 'bg-yellow-100 text-yellow-700' },
  { value: 'published', label: '已发布', className: 'bg-green-100 text-green-700' },
  { value: 'archived', label: '已归档', className: 'bg-gray-100 text-gray-700' },
];

// 平台配置
const PLATFORMS = [
  { value: 'all', label: '全部平台' },
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'shipinhao', label: '视频号' },
  { value: 'kuaishou', label: '快手' },
];

// 档案类型配置
const ARCHIVE_TYPES = [
  { value: 'all', label: '全部档案' },
  { value: 'customer', label: '客户档案' },
  { value: 'product', label: '产品档案' },
];

export default function ContentLibraryPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<MaterialStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 筛选条件
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceType, setSelectedSourceType] = useState<MaterialSourceType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<MaterialStatus | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 'all'>('all');
  const [selectedArchiveType, setSelectedArchiveType] = useState<string>('all'); // 档案类型
  const [selectedProductId, setSelectedProductId] = useState<number | 'all'>('all'); // 产品档案ID
  const [showStarred, setShowStarred] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());

  // 删除确认
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // 编辑素材
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editForm, setEditForm] = useState({
    topic: '',
    content: '',
    scriptType: '',
    status: 'draft' as MaterialStatus,
  });
  const [isSaving, setIsSaving] = useState(false);

  // 智能记忆标记
  const [markingMaterialId, setMarkingMaterialId] = useState<number | null>(null);
  const [markedMaterialIds, setMarkedMaterialIds] = useState<Set<number>>(new Set());
  const [showStyleProfile, setShowStyleProfile] = useState(false);
  const [learningStats, setLearningStats] = useState<{ totalMarked: number; totalLearned: number } | null>(null);

  // 打开编辑对话框
  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setEditForm({
      topic: material.topic || '',
      content: material.content || '',
      scriptType: material.scriptType || '',
      status: material.status,
    });
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingMaterial) return;
    if (!editForm.topic.trim()) {
      toast.error('请填写标题');
      return;
    }

    setIsSaving(true);
    try {
      const token = getToken();
      const response = await fetch('/api/materials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingMaterial.id,
          topic: editForm.topic,
          content: editForm.content,
          scriptType: editForm.scriptType,
          status: editForm.status,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMaterials(prev => prev.map(m => 
          m.id === editingMaterial.id 
            ? { ...m, topic: editForm.topic, content: editForm.content, scriptType: editForm.scriptType, status: editForm.status }
            : m
        ));
        setEditingMaterial(null);
        toast.success('保存成功');
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 加载素材
  const loadMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (selectedSourceType !== 'all') params.set('sourceType', selectedSourceType);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (selectedPlatform !== 'all') params.set('platform', selectedPlatform);
      if (selectedCustomerId !== 'all') params.set('customerId', selectedCustomerId.toString());
      if (searchQuery) params.set('keyword', searchQuery);
      if (showStarred) params.set('isStarred', 'true');
      // 档案筛选
      if (selectedArchiveType !== 'all') params.set('archiveType', selectedArchiveType);
      if (selectedProductId !== 'all') params.set('productId', selectedProductId.toString());

      const response = await fetch(`/api/materials?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setMaterials(data.data);
        setTotal(data.total);
        setStats(data.stats);
      } else {
        toast.error(data.error || '加载失败');
      }
    } catch (error) {
      console.error('Load materials error:', error);
      toast.error('加载素材失败');
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedSourceType, selectedStatus, selectedPlatform, selectedCustomerId, searchQuery, showStarred, selectedArchiveType, selectedProductId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // 切换收藏
  const handleToggleStar = async (id: number, currentStarred: boolean) => {
    try {
      const token = getToken();
      const response = await fetch('/api/materials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, isStarred: !currentStarred }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, isStarred: !currentStarred } : m));
        toast.success(currentStarred ? '已取消收藏' : '已收藏');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 更新状态
  const handleUpdateStatus = async (id: number, status: MaterialStatus) => {
    try {
      const token = getToken();
      const response = await fetch('/api/materials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, status } : m));
        toast.success('状态已更新');
      }
    } catch (error) {
      toast.error('操作失败');
    }
  };

  // 复制内容
  // 加载已标记素材
  const loadMarkedMaterials = async () => {
    try {
      const response = await fetch('/api/memory/status');
      const result = await response.json();
      if (result.success && result.data) {
        setMarkedMaterialIds(new Set(result.data.markedMaterialIds || []));
        setLearningStats({
          totalMarked: result.data.totalContents || 0,
          totalLearned: result.data.totalHits || 0,
        });
      }
    } catch (error) {
      console.error('Load marked materials error:', error);
    }
  };

  useEffect(() => {
    loadMarkedMaterials();
  }, []);

  // 当页面重新获得焦点时刷新记忆状态（解决跨页面数据不同步问题）
  useEffect(() => {
    const handleFocus = () => {
      loadMarkedMaterials();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // 标记完成回调
  const handleMarkComplete = (materialId: number) => {
    setMarkingMaterialId(null);
    setMarkedMaterialIds(prev => new Set(prev).add(materialId));
    loadMarkedMaterials();
    toast.success('AI正在学习这个内容特征...');
  };

  const handleCopy = async (material: Material) => {
    const content = material.content || material.topic;
    await navigator.clipboard.writeText(content);
    
    // 更新复制次数
    try {
      const token = getToken();
      await fetch('/api/materials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: material.id, copyCount: (material.copyCount || 0) + 1 }),
      });
    } catch {
      // 忽略错误
    }
    
    toast.success('已复制到剪贴板');
  };

  // 删除素材
  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const token = getToken();
      const response = await fetch(`/api/materials?id=${deleteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success) {
        setMaterials(prev => prev.filter(m => m.id !== deleteId));
        toast.success('已删除');
      }
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeleteId(null);
    }
  };

  // 按档案分组（客户档案或产品档案）
  const groupedByArchive = materials.reduce((acc, material) => {
    // 根据档案类型和筛选条件决定分组键
    let key: string | number;
    let name: string;
    
    if (selectedArchiveType === 'product' || material.archiveType === 'product') {
      // 按产品档案分组
      key = material.productId || 0;
      name = material.productName || '未知产品';
    } else {
      // 按客户档案分组
      key = material.customerId;
      name = material.customerName;
    }
    
    if (!acc[key]) {
      acc[key] = {
        name,
        archiveType: material.archiveType || 'customer',
        materials: [],
      };
    }
    acc[key].materials.push(material);
    return acc;
  }, {} as Record<number, { name: string; archiveType: string; materials: Material[] }>);

  // 切换分组展开状态
  const toggleArchiveExpand = (archiveId: number) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(archiveId)) {
        newSet.delete(archiveId);
      } else {
        newSet.add(archiveId);
      }
      return newSet;
    });
  };

  // 获取来源类型信息
  const getSourceTypeInfo = (type: MaterialSourceType) => {
    return SOURCE_TYPES.find(t => t.value === type) || SOURCE_TYPES[0];
  };

  // 获取状态信息
  const getStatusInfo = (status: MaterialStatus) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[1];
  };

  // 获取平台标签
  const getPlatformBadge = (platform?: string) => {
    if (!platform) return null;
    const platforms: Record<string, { label: string; className: string }> = {
      douyin: { label: '抖音', className: 'bg-black text-white' },
      xiaohongshu: { label: '小红书', className: 'bg-red-500 text-white' },
      shipinhao: { label: '视频号', className: 'bg-green-500 text-white' },
      kuaishou: { label: '快手', className: 'bg-orange-500 text-white' },
    };
    const info = platforms[platform];
    if (!info) return null;
    return <Badge className={`text-xs ${info.className}`}>{info.label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/operations')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">内容素材库</h1>
                <p className="text-sm text-muted-foreground">管理各功能生成的素材，支持分类整理</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showStarred ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowStarred(!showStarred)}
              className={showStarred ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
            >
              <Star className={`w-4 h-4 mr-1 ${showStarred ? 'fill-current' : ''}`} />
              收藏
            </Button>
            <div className="flex items-center border rounded-lg p-1">
              <Button 
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 智能记忆引导横幅 */}
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-orange-900">智能记忆系统</span>
                    {learningStats && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                        已学习 {learningStats.totalLearned} 条
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-orange-700">
                    标记素材发布效果，AI 会学习爆款特征，越用越懂你的风格
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-200 text-orange-700 hover:bg-orange-100"
                onClick={() => setShowStyleProfile(true)}
              >
                <Lightbulb className="w-4 h-4 mr-1" />
                查看风格档案
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FolderOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">总素材</span>
                </div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">客户档案</span>
                </div>
                <div className="text-2xl font-bold">{stats.byCustomer.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">产品档案</span>
                </div>
                <div className="text-2xl font-bold">{stats.byProduct?.length || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">已收藏</span>
                </div>
                <div className="text-2xl font-bold">{stats.starredCount}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">近7天新增</span>
                </div>
                <div className="text-2xl font-bold">{stats.recentCount}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">草稿</span>
                </div>
                <div className="text-2xl font-bold">
                  {stats.byStatus.find(s => s.status === 'draft')?.count || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 筛选栏 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* 搜索 */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索选题、标题、标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* 筛选下拉 */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selectedSourceType} onValueChange={(v) => setSelectedSourceType(v as MaterialSourceType | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className="w-4 h-4" />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as MaterialStatus | 'all')}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 档案类型筛选 */}
                <Select value={selectedArchiveType} onValueChange={setSelectedArchiveType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARCHIVE_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 产品档案筛选（仅当选择产品档案时显示） */}
                {selectedArchiveType === 'product' && stats && stats.byProduct && stats.byProduct.length > 0 && (
                  <Select 
                    value={selectedProductId.toString()} 
                    onValueChange={(v) => setSelectedProductId(v === 'all' ? 'all' : Number(v))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部产品</SelectItem>
                      {stats.byProduct.map(p => (
                        <SelectItem key={p.productId} value={p.productId.toString()}>
                          {p.productName} ({p.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {stats && stats.byCustomer.length > 0 && (
                  <Select 
                    value={selectedCustomerId.toString()} 
                    onValueChange={(v) => setSelectedCustomerId(v === 'all' ? 'all' : Number(v))}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部客户</SelectItem>
                      {stats.byCustomer.map(c => (
                        <SelectItem key={c.customerId} value={c.customerId.toString()}>
                          {c.customerName} ({c.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 素材列表 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              加载中...
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>暂无素材</p>
              <p className="text-xs mt-2">使用脚本创作、开场白生成等功能后，素材会自动保存到这里</p>
            </div>
          ) : (
            // 按档案分组展示
            Object.entries(groupedByArchive).map(([archiveId, data]) => {
              const isExpanded = expandedCustomers.has(Number(archiveId)) || (selectedCustomerId !== 'all' || selectedProductId !== 'all');
              const isProductArchive = data.archiveType === 'product';
              
              return (
                <Card key={archiveId} className="overflow-hidden">
                  {/* 档案标题栏 */}
                  <div 
                    className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted/70"
                    onClick={() => toggleArchiveExpand(Number(archiveId))}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      {isProductArchive ? (
                        <FolderOpen className="w-4 h-4 text-primary" />
                      ) : (
                        <Users className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{data.name}</span>
                      <Badge variant="secondary" className={isProductArchive ? 'bg-primary/10 text-primary' : ''}>
                        {isProductArchive ? '产品档案' : '客户档案'}
                      </Badge>
                      <Badge variant="outline">{data.materials.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {Object.entries(
                        data.materials.reduce((acc, m) => {
                          acc[m.sourceType] = (acc[m.sourceType] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {SOURCE_TYPES.find(t => t.value === type)?.label || type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* 素材列表 */}
                  {isExpanded && (
                    <div className="divide-y">
                      {data.materials.map(material => {
                        const sourceType = getSourceTypeInfo(material.sourceType);
                        const statusInfo = getStatusInfo(material.status);
                        const SourceIcon = sourceType.icon;

                        return (
                          <div 
                            key={material.id}
                            className="flex items-start gap-4 p-4 hover:bg-muted/30 group"
                          >
                            {/* 来源图标 */}
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${sourceType.color}`}>
                              <SourceIcon className="w-5 h-5" />
                            </div>

                            {/* 内容 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium truncate">{material.topic}</h3>
                                {material.isStarred && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                )}
                                {getPlatformBadge(material.platform)}
                                <Badge className={`text-xs ${statusInfo.className}`}>
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              
                              {material.summary && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {material.summary}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <SourceIcon className="w-3 h-3" />
                                  {sourceType.label}
                                </span>
                                {material.scriptType && (
                                  <span>类型: {SCRIPT_TYPE_NAMES[material.scriptType] || material.scriptType}</span>
                                )}
                                {material.tags && material.tags.length > 0 && (
                                  <span>标签: {material.tags.slice(0, 3).join(', ')}</span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(material.createdAt).toLocaleDateString('zh-CN')}
                                </span>
                                {material.viewCount && material.viewCount > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {material.viewCount}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex items-center gap-1">
                              {/* 标记效果按钮 - 始终显示 */}
                              {markedMaterialIds.has(material.id) ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-2 py-1">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  已标记
                                </Badge>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                                  onClick={() => setMarkingMaterialId(material.id)}
                                >
                                  <Flame className="w-4 h-4 mr-1" />
                                  标记效果
                                </Button>
                              )}
                              
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(material)}
                                  title="编辑"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleToggleStar(material.id, material.isStarred)}
                                  title="收藏"
                                >
                                  <Star className={`w-4 h-4 ${material.isStarred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleCopy(material)}
                                  title="复制"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500 hover:text-red-600"
                                  onClick={() => setDeleteId(material.id)}
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* 分页 */}
        {total > pageSize && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {page} 页，共 {Math.ceil(total / pageSize)} 页
            </span>
            <Button
              variant="outline"
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage(p => p + 1)}
            >
              下一页
            </Button>
          </div>
        )}

        {/* 删除确认对话框 */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除这个素材吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 编辑素材对话框 */}
        <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑素材</DialogTitle>
              <DialogDescription>
                修改素材的标题、内容和其他信息
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-topic">标题 *</Label>
                <Input
                  id="edit-topic"
                  value={editForm.topic}
                  onChange={(e) => setEditForm(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="请输入素材标题"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-content">内容</Label>
                <Textarea
                  id="edit-content"
                  value={editForm.content}
                  onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="请输入素材内容"
                  rows={12}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-scriptType">素材类型</Label>
                  <Select 
                    value={editForm.scriptType} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, scriptType: v }))}
                  >
                    <SelectTrigger id="edit-scriptType">
                      <SelectValue placeholder="选择素材类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="story">讲故事</SelectItem>
                      <SelectItem value="process">晒过程</SelectItem>
                      <SelectItem value="knowledge">教知识</SelectItem>
                      <SelectItem value="opinion">说观点</SelectItem>
                      <SelectItem value="product">说产品</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">状态</Label>
                  <Select 
                    value={editForm.status} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v as MaterialStatus }))}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="published">已发布</SelectItem>
                      <SelectItem value="archived">已归档</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMaterial(null)}>
                取消
              </Button>
              <Button onClick={handleSaveEdit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 智能记忆效果反馈对话框 */}
        {markingMaterialId && (
          <PerformanceFeedback
            open={!!markingMaterialId}
            onOpenChange={(open) => !open && setMarkingMaterialId(null)}
            material={{
              id: markingMaterialId,
              topic: materials.find(m => m.id === markingMaterialId)?.topic || '',
              title: materials.find(m => m.id === markingMaterialId)?.topic,
              scriptType: materials.find(m => m.id === markingMaterialId)?.scriptType,
              content: materials.find(m => m.id === markingMaterialId)?.content,
              customerId: materials.find(m => m.id === markingMaterialId)?.customerId,
            }}
            onSuccess={() => handleMarkComplete(markingMaterialId)}
          />
        )}

        {/* 风格档案查看对话框 */}
        <StyleProfileDialog
          open={showStyleProfile}
          onOpenChange={setShowStyleProfile}
        />
      </div>
    </DashboardLayout>
  );
}
