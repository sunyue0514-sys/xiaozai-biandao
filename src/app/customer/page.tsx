'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import Link from 'next/link';
import { customerApi, getToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Customer, Material } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingGuide, MiniGuide, useOnboarding } from '@/components/onboarding/OnboardingGuide';
import { BeginnerTasks } from '@/components/onboarding/BeginnerTasks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Users,
  FileText,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  TrendingUp,
  Target,
  Calendar,
  Video,
  Image,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Star,
  ChevronRight,
  Loader2,
  Download,
  Copy,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Rocket,
  UserPlus,
  Lightbulb,
  PenTool,
  BarChart3,
  Brain,
  Flame,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from '@/lib/error-messages';
import { DataAnalysisDialog } from '@/components/data-report/DataAnalysisDialog';
import { InspirationDialog } from '@/components/inspiration/InspirationDialog';
import { PerformanceFeedback } from '@/components/memory/PerformanceFeedback';
import { StyleProfileDialog } from '@/components/memory/StyleProfileDialog';
import { SCRIPT_TYPE_LABELS } from '@/lib/opening-strategies';

// 脚本类型中文映射（扩展版）
const SCRIPT_TYPE_NAMES: Record<string, string> = {
  story: '讲故事',
  process: '晒过程',
  knowledge: '教知识',
  opinion: '说观点',
  product: '说产品',
  writing: '文案创作',
  insight: '观点洞察',
  dialogue: '对话流',
  interview: '采访',
  review: '测评',
  tutorial: '教程',
  vlog: '生活记录',
  ...SCRIPT_TYPE_LABELS,
};

// 素材类型中文映射
const MATERIAL_TYPE_NAMES: Record<string, string> = {
  topic: '选题',
  topic_batch: '智能选题',
  script: '文案',
  fullscript: '脚本',
  writing: '文案创作',
  scriptless_shooting: '无脚本拍摄',
  qianchuan_copywriting: '千川文案',
  qianchuan_script: '千川脚本',
  feedad_copywriting: '信息流文案',
  feedad_script: '信息流脚本',
  create_opening: '开篇创作',
  opening_batch: '批量开篇',
  dialogue: '对话流',
  insight: '观点洞察',
  story: '故事素材',
  process: '过程素材',
  knowledge: '知识素材',
  opinion: '观点素材',
  product: '产品素材',
  humanize: '口语化处理',
  opening: '开场白',
  benchmark: '对标分析',
  'account-analysis': '账号分析',
  'banned-words': '违禁词检测',
};

// 客户卡片骨架屏
function CustomerCardSkeleton() {
  return (
    <Card className="h-full border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <Skeleton className="h-3 w-32 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16 rounded-lg" />
            <Skeleton className="h-4 w-8 rounded-lg" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-lg" />
          </div>
          <div className="pt-3 border-t flex items-center justify-between">
            <div className="flex gap-1">
              <Skeleton className="h-5 w-14 rounded-lg" />
              <Skeleton className="h-5 w-14 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-4 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 素材卡片骨架屏
function MaterialCardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-12 rounded-lg" />
            <Skeleton className="h-5 w-14 rounded-lg" />
            <Skeleton className="h-5 w-12 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mb-2">
          <Skeleton className="h-4 w-4 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-full mb-2 rounded-lg" />
        <Skeleton className="h-5 w-3/4 mb-3 rounded-lg" />
        <div className="flex items-center justify-between pt-3 border-t">
          <Skeleton className="h-3 w-32 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 统计卡片骨架屏
function StatsCardSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded-lg" />
            <Skeleton className="h-8 w-12 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-lg" />
          </div>
          <Skeleton className="w-12 h-12 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  );
}

// AI 生成进度提示组件 - 苹果风格
function AIGeneratingProgress({ operation }: { operation: string }) {
  const [dots, setDots] = useState('');
  const [tipIndex, setTipIndex] = useState(0);
  
  const tips = [
    '正在分析您的需求...',
    'AI 正在构思内容...',
    '正在生成高质量内容...',
    '即将完成，请稍候...',
  ];
  
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 3000);
    
    return () => {
      clearInterval(dotsInterval);
      clearInterval(tipInterval);
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary animate-pulse" />
        <Sparkles className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="text-center">
        <p className="font-medium text-lg">{operation}中{dots}</p>
        <p className="text-sm text-muted-foreground mt-1">{tips[tipIndex]}</p>
        <p className="text-xs text-muted-foreground mt-2">预计需要 10-30 秒</p>
      </div>
    </div>
  );
}

const SCRIPT_TYPE_COLORS: Record<string, string> = {
  '讲故事': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200',
  '晒过程': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
  '教知识': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200',
  '聊观点': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200',
};

export default function CustomerPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false); // 防重复点击
  const [isDeleting, setIsDeleting] = useState(false); // 防重复删除

  // 快速创作
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateForm, setQuickCreateForm] = useState({ topic: '', type: 'story', style: 'casual', customerId: '' });
  const [quickCreateResult, setQuickCreateResult] = useState('');
  const [isQuickCreateLoading, setIsQuickCreateLoading] = useState(false);
  const [isSavingScript, setIsSavingScript] = useState(false);

  // 灵感收集
  const [isInspirationOpen, setIsInspirationOpen] = useState(false);

  // 选题推荐
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const [topicForm, setTopicForm] = useState({ industry: '', position: '', target: '', count: 5, customerId: '', contentType: '' });
  const [topicResult, setTopicResult] = useState('');
  const [isTopicLoading, setIsTopicLoading] = useState(false);
  const [isSavingTopic, setIsSavingTopic] = useState(false);

  // 数据报告
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // 智能记忆系统
  const [isPerformanceFeedbackOpen, setIsPerformanceFeedbackOpen] = useState(false);
  const [selectedMaterialForFeedback, setSelectedMaterialForFeedback] = useState<Material | null>(null);
  const [isStyleProfileOpen, setIsStyleProfileOpen] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState<{
    hasStyleProfile: boolean;
    totalHits: number;
    totalContents: number;
    learningProgress: number;
  } | null>(null);
  const [markedMaterialIds, setMarkedMaterialIds] = useState<Set<number>>(new Set());

  // 功能教程
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // 创作统计
  const [creationStats, setCreationStats] = useState({
    monthlyCreations: 0,
    growthRate: 0,
  });

  // 新手引导
  const { showOnboarding, isOnboardingCompleted, handleOpen: openOnboarding, handleClose: closeOnboarding, handleComplete: completeOnboarding } = useOnboarding(customers.length === 0);

  // 新手任务弹窗
  const [showBeginnerTasks, setShowBeginnerTasks] = useState(false);
  const [beginnerTaskProgress, setBeginnerTaskProgress] = useState<{completed: number, total: number} | null>(null);

  // 检查新手任务进度
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      checkBeginnerTasks();
    }
  }, [isAuthLoading, isAuthenticated]);

  const checkBeginnerTasks = async () => {
    try {
      const token = localStorage.getItem('sessionToken');
      const res = await fetch('/api/onboarding/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const progress = data.data.progress;
        setBeginnerTaskProgress({
          completed: progress.completed,
          total: progress.total,
        });
        // 如果任务未完成，自动弹出
        if (!progress.allCompleted && progress.completed === 0) {
          // 检查是否是首次访问（通过 localStorage 判断）
          const hasSeenTasks = localStorage.getItem('hasSeenBeginnerTasks');
          if (!hasSeenTasks) {
            setShowBeginnerTasks(true);
            localStorage.setItem('hasSeenBeginnerTasks', 'true');
          }
        }
      }
    } catch (error) {
      console.error('检查新手任务失败:', error);
    }
  };

  // 素材库筛选
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [materialCustomerFilter, setMaterialCustomerFilter] = useState('all');
  const [materialStatusFilter, setMaterialStatusFilter] = useState('all');
  const [materialTypeFilter, setMaterialTypeFilter] = useState('all');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState('all'); // 素材类型筛选（选题/文案/脚本）
  
  // 素材编辑
  const [isEditMaterialOpen, setIsEditMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editMaterialContent, setEditMaterialContent] = useState('');
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  // 等待认证加载完成后再加载数据
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      loadData();
    }
  }, [isAuthLoading, isAuthenticated]);

  // 当页面重新获得焦点时刷新数据（解决从其他页面保存后返回的问题）
  useEffect(() => {
    const handleFocus = () => {
      loadMaterialsOnly();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // 仅加载素材数据
  const loadMaterialsOnly = async () => {
    try {
      const token = getToken();
      if (!token) return; // 没有 Token 则跳过
      
      const [materialsRes, memoryRes] = await Promise.all([
        fetch('/api/customer/materials?pageSize=1000', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/memory/status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      const materialsData = await materialsRes.json();
      const memoryData = await memoryRes.json();
      
      if (materialsRes.ok && materialsData.data) {
        setMaterials(materialsData.data);
      }
      
      if (memoryRes.ok && memoryData.data) {
        setMemoryStatus(memoryData.data);
        if (memoryData.data.markedMaterialIds) {
          setMarkedMaterialIds(new Set(memoryData.data.markedMaterialIds));
        }
      }
    } catch (error) {
      console.error('Load materials error:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      
      // 🔴 关键修复：如果 Token 不存在，直接跳转登录页
      if (!token) {
        console.log('[CustomerPage] Token 不存在，跳转到登录页');
        router.push('/login');
        return;
      }
      
      // 并行请求客户列表、素材、创作统计和记忆状态
      const [customersRes, materialsRes, statsRes, memoryRes] = await Promise.all([
        fetch('/api/customer/list', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/customer/materials?pageSize=1000', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/stats/creations', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/memory/status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const customersData = await customersRes.json();
      const materialsData = await materialsRes.json();
      const statsData = await statsRes.json();
      const memoryData = await memoryRes.json();

      if (customersRes.ok && customersData.data) {
        setCustomers(customersData.data);
      } else if (customersRes.status === 401) {
        // 未登录，跳转到登录页
        router.push('/login');
        return;
      }

      if (materialsRes.ok && materialsData.data) {
        setMaterials(materialsData.data);
      }

      if (statsRes.ok && statsData.data) {
        setCreationStats(statsData.data);
      }

      if (memoryRes.ok && memoryData.data) {
        setMemoryStatus(memoryData.data);
        // 设置已标记的素材ID
        if (memoryData.data.markedMaterialIds) {
          setMarkedMaterialIds(new Set(memoryData.data.markedMaterialIds));
        }
      }
    } catch (error) {
      console.error('Load data error:', error);
      toast.error('加载数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    console.log('[创建客户] newCustomer状态:', newCustomer);
    
    if (!newCustomer.name || !newCustomer.name.trim()) {
      toast.error('请输入客户名称');
      return;
    }

    // 防止重复点击
    if (isCreating) {
      console.log('[创建客户] 正在创建中，请勿重复点击');
      return;
    }

    // 检查认证状态
    if (!isAuthenticated) {
      toast.error('登录已过期，请重新登录');
      router.push('/login');
      return;
    }

    setIsCreating(true);
    
    try {
      const token = getToken();
      
      // 如果 Token 不存在，跳转登录页
      if (!token) {
        console.error('[前端创建客户] Token 为空');
        toast.error('登录状态异常，请重新登录');
        router.push('/login');
        return;
      }

      // 使用带重试的请求
      const response = await fetch('/api/customer/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCustomer),
      });

      // 检查响应状态
      if (!response.ok) {
        let errorMsg = `请求失败 (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // 无法解析错误信息
        }
        console.error('[前端创建客户] HTTP错误:', response.status, errorMsg);
        toast.error(getFriendlyErrorMessage(errorMsg) || errorMsg);
        return;
      }

      const result = await response.json();

      if (result.success) {
        const isFirstCustomer = customers.length === 0;
        if (isFirstCustomer) {
          toast.success('🎉 恭喜！第一步完成！接下来进行商业定位分析');
        } else {
          toast.success('客户创建成功');
        }
        setIsCreateOpen(false);
        setNewCustomer({ name: '', description: '' });
        // 创建成功后跳转到IP定位向导页面
        if (result.data?.id) {
          router.push(`/customer/${result.data.id}/positioning`);
        } else {
          loadData();
        }
      } else {
        const errorMsg = result.error || '创建失败';
        console.error('[前端创建客户] 业务错误:', errorMsg);
        toast.error(getFriendlyErrorMessage(errorMsg) || errorMsg);
      }
    } catch (error) {
      console.error('[前端创建客户] 异常:', error);
      toast.error('网络错误，请检查网络连接后重试');
    } finally {
      setIsCreating(false);
    }
  };

  // 删除客户
  const handleDeleteCustomer = async (customerId: number, customerName: string, event: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发Link导航
    event.preventDefault();
    event.stopPropagation();

    // 防止重复点击
    if (isDeleting) {
      return;
    }

    if (!confirm(`确定要删除客户"${customerName}"吗？删除后无法恢复。`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const token = getToken();
      const response = await fetch(`/api/customer/list?id=${customerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('客户已删除');
        // 从本地列表中移除
        setCustomers(prev => prev.filter(c => c.id !== customerId));
      } else {
        toast.error(getFriendlyErrorMessage(result.error) || '删除失败');
      }
    } catch {
      toast.error('网络错误，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  // 快速创作
  const handleQuickCreate = async () => {
    if (!quickCreateForm.topic) {
      toast.error('请输入创作主题');
      return;
    }

    setIsQuickCreateLoading(true);
    setQuickCreateResult('');

    try {
      const token = getToken();
      
      // 获取选中客户的IP定位
      let ipPositioning = null;
      let customerName = '';
      if (quickCreateForm.customerId) {
        const selectedCustomer = customers.find(c => c.id.toString() === quickCreateForm.customerId);
        if (selectedCustomer?.ipPositioning) {
          try {
            ipPositioning = JSON.parse(selectedCustomer.ipPositioning);
            customerName = selectedCustomer.name;
          } catch {
            // 解析失败
          }
        }
      }

      const response = await fetch('/api/ai/quick-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...quickCreateForm,
          customerId: quickCreateForm.customerId ? parseInt(quickCreateForm.customerId) : null,
          customerName,
          ipPositioning,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setQuickCreateResult(prev => prev + data.content);
              }
              if (data.error) {
                toast.error(getFriendlyErrorMessage(data.error));
              }
            }
          }
        }
      }
    } catch {
      toast.error('创作失败');
    } finally {
      setIsQuickCreateLoading(false);
    }
  };

  // 保存脚本到素材库
  const handleSaveScriptToMaterial = async () => {
    if (!quickCreateForm.customerId) {
      toast.error('请先选择客户');
      return;
    }
    if (!quickCreateResult.trim()) {
      toast.error('没有可保存的脚本');
      return;
    }

    setIsSavingScript(true);
    try {
      const token = getToken();
      const selectedCustomer = customers.find(c => c.id.toString() === quickCreateForm.customerId);
      
      // 从脚本内容中提取标题
      const lines = quickCreateResult.split('\n');
      let title = quickCreateForm.topic;
      for (const line of lines) {
        if (line.includes('爆款标题') || line.includes('标题：')) {
          const titleMatch = line.match(/(?:爆款标题|标题)[：:]\s*(.+)/);
          if (titleMatch) {
            title = titleMatch[1].trim();
            break;
          }
        }
      }

      const response = await fetch('/api/customer/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: quickCreateForm.customerId,
          customerName: selectedCustomer?.name || '',
          topic: title,
          scriptType: quickCreateForm.type === 'story' ? '讲故事' : 
                      quickCreateForm.type === 'process' ? '晒过程' :
                      quickCreateForm.type === 'knowledge' ? '教知识' :
                      quickCreateForm.type === 'opinion' ? '说观点' : '说产品',
          content: quickCreateResult,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('脚本已保存到素材库');
        // 刷新素材列表
        loadData();
      } else {
        toast.error(getFriendlyErrorMessage(result.error) || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setIsSavingScript(false);
    }
  };

  // 选题推荐
  const handleTopicRecommend = async () => {
    // 如果选择了客户，则不需要行业字段
    if (!topicForm.customerId && !topicForm.industry) {
      toast.error('请选择客户或输入行业领域');
      return;
    }

    setIsTopicLoading(true);
    setTopicResult('');

    try {
      const token = getToken();
      
      // 获取选中客户的IP定位
      let ipPositioning = null;
      let customerName = '';
      if (topicForm.customerId) {
        const selectedCustomer = customers.find(c => c.id.toString() === topicForm.customerId);
        if (selectedCustomer?.ipPositioning) {
          try {
            ipPositioning = JSON.parse(selectedCustomer.ipPositioning);
            customerName = selectedCustomer.name;
          } catch {
            // 解析失败
          }
        }
      }

      const response = await fetch('/api/ai/topic-recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...topicForm,
          customerId: topicForm.customerId ? parseInt(topicForm.customerId) : null,
          customerName,
          ipPositioning,
          contentType: topicForm.contentType, // 添加内容类型
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setTopicResult(prev => prev + data.content);
              }
            }
          }
        }
      }
    } catch {
      toast.error('推荐失败');
    } finally {
      setIsTopicLoading(false);
    }
  };

  // 保存选题到素材库
  const handleSaveTopicsToMaterial = async () => {
    if (!topicForm.customerId) {
      toast.error('请先选择客户');
      return;
    }
    if (!topicResult.trim()) {
      toast.error('没有可保存的选题');
      return;
    }

    setIsSavingTopic(true);
    try {
      const token = getToken();
      const selectedCustomer = customers.find(c => c.id.toString() === topicForm.customerId);
      
      // 将选题按行分割，每行一个选题
      const topics = topicResult.split('\n').filter(line => line.trim());
      let savedCount = 0;

      for (const topic of topics) {
        const cleanTopic = topic.replace(/^\d+[.、)）\s]*/, '').trim(); // 去掉序号
        if (!cleanTopic) continue;

        const response = await fetch('/api/customer/materials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customerId: topicForm.customerId,
            customerName: selectedCustomer?.name || '',
            topic: cleanTopic,
            scriptType: topicForm.contentType || '未分类',
          }),
        });

        if (response.ok) {
          savedCount++;
        }
      }

      if (savedCount > 0) {
        toast.success(`已保存 ${savedCount} 个选题到素材库`);
        // 刷新素材列表
        loadData();
      } else {
        toast.error('保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setIsSavingTopic(false);
    }
  };

  // 删除素材
  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('确定要删除这个素材吗？')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/customer/materials?id=${materialId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('素材已删除');
        // 从本地列表中移除
        setMaterials(prev => prev.filter(m => m.id !== materialId));
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  // 打开素材编辑对话框
  const openEditMaterial = async (material: Material) => {
    setEditingMaterial(material);
    setEditMaterialContent(material.content || material.topic || '');
    setIsEditMaterialOpen(true);
  };

  // 保存素材编辑
  const handleSaveMaterial = async () => {
    if (!editingMaterial) return;
    
    setIsSavingMaterial(true);
    try {
      const token = getToken();
      const response = await fetch('/api/customer/materials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingMaterial.id,
          topic: editingMaterial.topic,
          content: editMaterialContent,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('素材已保存');
        // 更新本地列表
        setMaterials(prev => prev.map(m => 
          m.id === editingMaterial.id 
            ? { ...m, content: editMaterialContent }
            : m
        ));
        setIsEditMaterialOpen(false);
        setEditingMaterial(null);
      } else {
        toast.error(getFriendlyErrorMessage(result.error) || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setIsSavingMaterial(false);
    }
  };

  // 复制素材内容
  const handleCopyMaterial = async () => {
    try {
      await navigator.clipboard.writeText(editMaterialContent);
      toast.success('已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  // 数据报告
  // 复制结果
  const handleCopyResult = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 导出结果
  const handleExportResult = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toLocaleDateString('zh-CN')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('已导出文件');
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMaterials = materials.filter((m) => {
    // 搜索过滤
    const matchesSearch = m.topic.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
      m.customerName.toLowerCase().includes(materialSearchTerm.toLowerCase());
    
    // 客户过滤
    const matchesCustomer = materialCustomerFilter === 'all' || m.customerId.toString() === materialCustomerFilter;
    
    // 状态过滤
    const matchesStatus = materialStatusFilter === 'all' || m.status === materialStatusFilter;
    
    // 脚本类型过滤
    const matchesType = materialTypeFilter === 'all' || m.scriptType === materialTypeFilter;
    
    // 素材类型过滤（选题/文案/脚本/千川/信息流）
    let matchesCategory = materialCategoryFilter === 'all';
    if (!matchesCategory) {
      // 支持 materialType 和 sourceType 两种字段
      matchesCategory = (m.materialType === materialCategoryFilter) || (m.sourceType === materialCategoryFilter);
    }
    
    return matchesSearch && matchesCustomer && matchesStatus && matchesType && matchesCategory;
  });

  return (
    <DashboardLayout>
      {/* 页面加载状态 */}
      {(isLoading || isAuthLoading) && customers.length === 0 && materials.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">加载数据中...</p>
          </div>
        </div>
      ) : (
      <div className="space-y-6">
        {/* Welcome Banner - 苹果风格 */}
        <div className="relative overflow-hidden rounded-2xl bg-primary p-5 text-white shadow-lg">
          {/* 装饰圆 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  欢迎回来
                </h1>
                <p className="mt-1 text-white/80 text-sm">
                  今天是个创作的好日子，让我们一起打造爆款内容
                </p>
              </div>
              <div className="hidden md:flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="text-center px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <p className="text-xl font-bold">{customers.length}</p>
                    <p className="text-[10px] text-white/70">客户总数</p>
                  </div>
                  <div className="text-center px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                    <p className="text-xl font-bold">{materials.length}</p>
                    <p className="text-[10px] text-white/70">素材数量</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 border border-white/10 text-white w-full h-8"
                  onClick={() => setIsReportOpen(true)}
                >
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  数据分析
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 推荐操作路径 - 新用户引导 */}
        {customers.length === 0 && !isOnboardingCompleted && (
          <MiniGuide onStartOnboarding={openOnboarding} />
        )}

        {/* 老版引导 - 已完成引导但还没创建客户时显示 */}
        {customers.length === 0 && isOnboardingCompleted && (
          <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">开始创建第一个客户</h3>
                  <p className="text-sm text-muted-foreground">按照以下步骤，快速开启您的AI创作之旅</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 步骤1 */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 hover:bg-background transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">创建客户</h4>
                    <p className="text-xs text-muted-foreground mt-1">输入账号基本信息</p>
                    <p className="text-xs text-primary mt-1">→ 产出：客户档案</p>
                  </div>
                </div>
                
                {/* 步骤2 */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 hover:bg-background transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">商业定位</h4>
                    <p className="text-xs text-muted-foreground mt-1">AI分析账号定位</p>
                    <p className="text-xs text-primary mt-1">→ 产出：人设报告</p>
                  </div>
                </div>
                
                {/* 步骤3 */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 hover:bg-background transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">智能选题</h4>
                    <p className="text-xs text-muted-foreground mt-1">生成爆款选题方向</p>
                    <p className="text-xs text-primary mt-1">→ 产出：选题列表</p>
                  </div>
                </div>
                
                {/* 步骤4 */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-background/50 hover:bg-background transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">文案创作</h4>
                    <p className="text-xs text-muted-foreground mt-1">一键生成完整文案</p>
                    <p className="text-xs text-primary mt-1">→ 产出：可用文案</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-dashed">
                <Button 
                  className="bg-primary border-0"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  立即创建第一个客户
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 新手引导弹窗 */}
        <OnboardingGuide
          isOpen={showOnboarding}
          onClose={closeOnboarding}
          onComplete={completeOnboarding}
          hasCustomers={customers.length > 0}
        />

        {/* 新手任务弹窗 */}
        <BeginnerTasks
          isOpen={showBeginnerTasks}
          onClose={() => setShowBeginnerTasks(false)}
        />

        {/* 新手任务进度条 */}
        {beginnerTaskProgress && beginnerTaskProgress.completed < beginnerTaskProgress.total && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-all border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30"
            onClick={() => setShowBeginnerTasks(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎉</span>
                  <span className="font-medium">新手任务</span>
                  <Badge variant="secondary" className="text-xs">
                    {beginnerTaskProgress.completed}/{beginnerTaskProgress.total}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  完成任务领1000算力
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
              <Progress 
                value={(beginnerTaskProgress.completed / beginnerTaskProgress.total) * 100} 
                className="h-2 bg-amber-200 dark:bg-amber-800"
              />
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - 紧凑型单行布局 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card 
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-border/50"
            onClick={() => router.push('/script')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-500 group-hover:scale-105 transition-transform duration-200">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">选题推荐</h3>
                  <p className="text-xs text-muted-foreground truncate">热门选题</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-border/50"
            onClick={() => router.push('/script/topic')}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-purple-500 group-hover:scale-105 transition-transform duration-200">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">脚本创作</h3>
                  <p className="text-xs text-muted-foreground truncate">AI辅助</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-border/50"
            onClick={() => setIsInspirationOpen(true)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-pink-500 group-hover:scale-105 transition-transform duration-200">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">灵感收集</h3>
                  <p className="text-xs text-muted-foreground truncate">记录想法</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-border/50 relative"
            onClick={() => router.push('/account-planning')}
          >
            {customers.filter(c => (c.positioningCompleted || c.ipPositioning) && !c.accountPlan).length > 0 && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm z-10">
                {customers.filter(c => (c.positioningCompleted || c.ipPositioning) && !c.accountPlan).length}
              </div>
            )}
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 group-hover:scale-105 transition-transform duration-200">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-sm truncate">账号规划</h3>
                  <p className="text-xs text-muted-foreground truncate">运营方案</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - 统一风格 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/50 hover:shadow-sm transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-purple-500">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">总客户数</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-2xl font-bold">{customers.length}</p>
                    <p className="text-xs text-green-500">+2本月</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:shadow-sm transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">素材总数</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-2xl font-bold">{materials.length}</p>
                    <p className="text-xs text-green-500">+{materials.length}总计</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:shadow-sm transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-500">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">已定位</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-2xl font-bold">
                      {customers.filter(c => c.positioningCompleted).length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{customers.length}
                    </p>
                  </div>
                  <Progress 
                    value={(customers.filter(c => c.positioningCompleted).length / Math.max(customers.length, 1)) * 100} 
                    className="h-1 mt-1.5 rounded-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:shadow-sm transition-shadow duration-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-500">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">本月创作</p>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <p className="text-2xl font-bold">{creationStats.monthlyCreations}</p>
                    <p className="text-xs text-green-500">
                      {creationStats.growthRate >= 0 ? '+' : ''}{creationStats.growthRate}%环比
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="customers" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="customers" className="gap-2">
                <Users className="w-4 h-4" />
                客户列表
              </TabsTrigger>
              <TabsTrigger value="materials" className="gap-2">
                <FileText className="w-4 h-4" />
                素材库
              </TabsTrigger>
            </TabsList>
            
            {/* 右侧功能按钮区 - 三个按钮并列 */}
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={() => setIsTutorialOpen(true)}
              >
                <BookOpen className="w-4 h-4" />
                功能教程
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Dialog open={isCreateOpen} onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) {
                  // 对话框关闭时重置状态
                  setNewCustomer({ name: '', description: '' });
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-primary border-0">
                    <Plus className="w-4 h-4 mr-2" />
                    新增客户
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新增客户</DialogTitle>
                    <DialogDescription>
                      创建新的客户，开始内容创作之旅
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">客户名称</Label>
                      <Input
                        id="name"
                        placeholder="请输入客户名称"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">客户描述</Label>
                      <Textarea
                        id="description"
                        placeholder="请输入客户描述"
                        value={newCustomer.description}
                        onChange={(e) => setNewCustomer({ ...newCustomer, description: e.target.value })}
                      />
                    </div>
                    <Button 
                      onClick={handleCreateCustomer} 
                      className="w-full bg-primary border-0" 
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          创建中...
                        </>
                      ) : '创建'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <TabsContent value="customers">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <CustomerCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <Card className="border-2 border-dashed border-primary/20">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">还没有客户档案</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    客户档案是您要运营的账号或品牌的基础信息。<br />
                    后续所有AI创作都会基于客户档案进行个性化生成。
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      className="bg-primary border-0"
                      onClick={() => setIsCreateOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      创建第一个客户
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsTutorialOpen(true)}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      查看教程
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map((customer, index) => (
                  <Card 
                    key={customer.id} 
                    className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group relative"
                    onClick={() => router.push(`/customer/${customer.id}`)}
                  >
                    {/* 删除按钮 */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                      onClick={(e) => handleDeleteCustomer(customer.id, customer.name, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{customer.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {customer.description || '暂无描述'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {customer.positioningCompleted ? (
                            <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              已定位
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-600 bg-orange-50 dark:bg-orange-950/30">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              待定位
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">素材数量</span>
                          <span className="font-medium">{customer.materialsCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">创建时间</span>
                          <span className="text-muted-foreground">
                            {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
                          </span>
                        </div>
                        <div className="pt-3 border-t flex items-center justify-between">
                          <div className="flex gap-1">
                            {['讲故事', '晒过程', '教知识'].slice(0, 2).map((type) => (
                              <Badge 
                                key={type} 
                                variant="outline" 
                                className={SCRIPT_TYPE_COLORS[type]}
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="materials">
            {/* 素材库头部 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">素材库</h2>
                <span className="text-sm text-muted-foreground">({filteredMaterials.length}条记录)</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMaterialsOnly}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </Button>
            </div>

            {/* 智能记忆引导横幅 */}
            <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        智能记忆系统
                        {memoryStatus?.totalContents && memoryStatus.totalContents > 0 && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                            已学习 {memoryStatus.totalContents} 条
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        标记发布效果，AI会学习你的爆款规律，越用越精准
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {memoryStatus?.learningProgress && memoryStatus.learningProgress > 0 ? (
                      <div className="text-right">
                        <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          学习进度 {memoryStatus.learningProgress}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {memoryStatus.totalHits} 个爆款经验
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        开始标记，让AI更懂你
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsStyleProfileOpen(true)}
                      className="gap-1.5 border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:hover:bg-purple-900/50"
                    >
                      <Sparkles className="w-4 h-4" />
                      查看画像
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 搜索和筛选栏 */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* 搜索框 */}
              <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索选题..."
                  value={materialSearchTerm}
                  onChange={(e) => setMaterialSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* 客户筛选 */}
              <Select value={materialCustomerFilter} onValueChange={setMaterialCustomerFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="全部客户" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部客户</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* 状态筛选 */}
              <Select value={materialStatusFilter} onValueChange={setMaterialStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="draft">创作中</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                </SelectContent>
              </Select>
              
              {/* 类型筛选 */}
              <Select value={materialTypeFilter} onValueChange={setMaterialTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="story">讲故事</SelectItem>
                  <SelectItem value="process">晒过程</SelectItem>
                  <SelectItem value="knowledge">教知识</SelectItem>
                  <SelectItem value="opinion">聊观点</SelectItem>
                  <SelectItem value="product">说产品</SelectItem>
                  <SelectItem value="writing">文案创作</SelectItem>
                  <SelectItem value="insight">观点洞察</SelectItem>
                </SelectContent>
              </Select>
              
              {/* 素材类型筛选（选题/文案/脚本/千川/信息流） */}
              <Select value={materialCategoryFilter} onValueChange={setMaterialCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="全部素材" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部素材</SelectItem>
                  <SelectItem value="topic">选题</SelectItem>
                  <SelectItem value="script">文案</SelectItem>
                  <SelectItem value="fullscript">脚本</SelectItem>
                  <SelectItem value="qianchuan_copywriting">千川文案</SelectItem>
                  <SelectItem value="qianchuan_script">千川脚本</SelectItem>
                  <SelectItem value="feedad_copywriting">信息流文案</SelectItem>
                  <SelectItem value="feedad_script">信息流脚本</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 素材列表 */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <MaterialCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredMaterials.length === 0 ? (
              <Card className="border-2 border-dashed border-primary/20">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">暂无素材数据</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    素材库用于存储您的选题、文案和脚本。<br />
                    选择一个客户，开始您的第一次创作吧！
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      className="bg-primary border-0"
                      onClick={() => router.push('/script')}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      开始创作
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setIsTutorialOpen(true)}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      查看教程
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMaterials.map((material) => (
                  <Card key={material.id} className="hover:shadow-md transition-all duration-200 border-border/50">
                    <CardContent className="p-4">
                      {/* 标签区 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {/* 素材类型标签 */}
                          <Badge className={
                            (material.materialType || material.sourceType || 'topic') === 'topic' 
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200'
                              : (material.materialType || material.sourceType || 'topic') === 'script'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200'
                                : (material.materialType || material.sourceType || '').startsWith('qianchuan')
                                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200'
                                  : (material.materialType || material.sourceType || '').startsWith('feedad')
                                    ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200'
                                    : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200'
                          }>
                            {MATERIAL_TYPE_NAMES[material.materialType || material.sourceType || ''] || material.materialType || material.sourceType || '素材'}
                          </Badge>
                          {/* 脚本类型标签 */}
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200">
                            {material.scriptType ? (SCRIPT_TYPE_NAMES[material.scriptType] || material.scriptType) : '未分类'}
                          </Badge>
                          {/* 状态标签 */}
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200">
                            {material.status === 'draft' ? '创作中' : 
                             material.status === 'published' ? '已发布' : 
                             material.status === 'archived' ? '已归档' : material.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* 客户名 */}
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                        <Users className="w-4 h-4" />
                        <span>{material.customerName}</span>
                      </div>
                      
                      {/* 选题标题 */}
                      <h3 className="font-medium text-base mb-2 line-clamp-2">{material.topic}</h3>
                      
                      {/* 未标记提醒 - 3天以上的未标记素材显示 */}
                      {(() => {
                        const isMarked = markedMaterialIds.has(material.id);
                        const daysSinceCreated = Math.floor((Date.now() - new Date(material.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                        return !isMarked && daysSinceCreated >= 3 && (
                          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                            <Lightbulb className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="text-xs text-orange-700 dark:text-orange-300">
                              发布了吗？标记效果让AI更懂你
                            </span>
                          </div>
                        );
                      })()}
                      
                      {/* 时间和操作区 */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-xs text-muted-foreground">
                          {new Date(material.createdAt).toLocaleString('zh-CN', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).replace(/\//g, '/')}
                        </span>
                        <div className="flex items-center gap-2">
                          {/* 标记效果按钮 - 根据是否已标记显示不同状态 */}
                          {markedMaterialIds.has(material.id) ? (
                            <Badge className="gap-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              已标记
                            </Badge>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950"
                              onClick={() => {
                                setSelectedMaterialForFeedback(material);
                                setIsPerformanceFeedbackOpen(true);
                              }}
                            >
                              <Flame className="w-4 h-4" />
                              标记效果
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditMaterial(material)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 效果反馈对话框 */}
        {selectedMaterialForFeedback && (
          <PerformanceFeedback
            open={isPerformanceFeedbackOpen}
            onOpenChange={setIsPerformanceFeedbackOpen}
            material={{
              id: selectedMaterialForFeedback.id,
              title: selectedMaterialForFeedback.title || undefined,
              topic: selectedMaterialForFeedback.topic,
              scriptType: selectedMaterialForFeedback.scriptType,
              content: selectedMaterialForFeedback.content,
              customerId: selectedMaterialForFeedback.customerId,
            }}
            onSuccess={() => {
              // 更新已标记的素材ID
              setMarkedMaterialIds(prev => {
                const newSet = new Set(prev);
                newSet.add(selectedMaterialForFeedback.id);
                return newSet;
              });
              // 刷新记忆状态
              loadData();
            }}
          />
        )}

        {/* 风格画像对话框 */}
        <StyleProfileDialog
          open={isStyleProfileOpen}
          onOpenChange={setIsStyleProfileOpen}
        />

        {/* 快速创作对话框 */}
        <Dialog open={isQuickCreateOpen} onOpenChange={setIsQuickCreateOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                快速创作
              </DialogTitle>
              <DialogDescription>
                选择客户后，AI将根据客户IP定位生成个性化脚本
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* 客户选择 */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-900">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    选择客户档案
                    <Badge variant="secondary" className="text-xs">推荐</Badge>
                  </Label>
                  <Select 
                    value={quickCreateForm.customerId} 
                    onValueChange={(v) => setQuickCreateForm({ ...quickCreateForm, customerId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择客户（基于IP定位生成脚本）" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.filter(c => c.ipPositioning).map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>内容类型</Label>
                  <Select value={quickCreateForm.type} onValueChange={(v) => setQuickCreateForm({ ...quickCreateForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Label>创作风格</Label>
                  <Select value={quickCreateForm.style} onValueChange={(v) => setQuickCreateForm({ ...quickCreateForm, style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">专业严谨</SelectItem>
                      <SelectItem value="casual">轻松幽默</SelectItem>
                      <SelectItem value="emotional">情感共鸣</SelectItem>
                      <SelectItem value="practical">实用干货</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>创作主题 *</Label>
                <Input
                  placeholder="例如：如何提高工作效率、我的创业故事、美食推荐..."
                  value={quickCreateForm.topic}
                  onChange={(e) => setQuickCreateForm({ ...quickCreateForm, topic: e.target.value })}
                />
              </div>
              <Button
                onClick={handleQuickCreate}
                className="w-full bg-primary border-0"
                disabled={isQuickCreateLoading || !quickCreateForm.topic}
              >
                {isQuickCreateLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成中...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />开始创作</>
                )}
              </Button>
              
              {/* AI 生成进度提示 */}
              {isQuickCreateLoading && !quickCreateResult && (
                <AIGeneratingProgress operation="创作" />
              )}
              
              {quickCreateResult && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>创作结果</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCopyResult(quickCreateResult)}>
                        <Copy className="w-3 h-3 mr-1" />复制
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportResult(quickCreateResult, '快速创作')}>
                        <Download className="w-3 h-3 mr-1" />导出
                      </Button>
                      {quickCreateForm.customerId && (
                        <Button 
                          size="sm" 
                          className="bg-purple-500 hover:bg-purple-600 text-white"
                          onClick={handleSaveScriptToMaterial}
                          disabled={isSavingScript}
                        >
                          {isSavingScript ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />保存中...</>
                          ) : (
                            <><FileText className="w-3 h-3 mr-1" />保存到素材库</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm max-h-80 overflow-y-auto" ref={resultRef}>
                    {quickCreateResult}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 选题推荐对话框 */}
        <Dialog open={isTopicOpen} onOpenChange={setIsTopicOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-600" />
                选题推荐
              </DialogTitle>
              <DialogDescription>
                选择客户后，AI将根据客户IP定位推荐个性化选题
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* 客户选择 */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border border-orange-200 dark:border-orange-900">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    选择客户档案
                    <Badge variant="secondary" className="text-xs">推荐</Badge>
                  </Label>
                  <Select 
                    value={topicForm.customerId} 
                    onValueChange={(v) => setTopicForm({ ...topicForm, customerId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择客户（基于IP定位推荐选题）" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.filter(c => c.ipPositioning).map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {topicForm.customerId && (() => {
                    const selectedCustomer = customers.find(c => c.id.toString() === topicForm.customerId);
                    if (selectedCustomer?.ipPositioning) {
                      const positioning = JSON.parse(selectedCustomer.ipPositioning);
                      return (
                        <div className="text-xs text-muted-foreground mt-2 p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                          <div className="grid grid-cols-2 gap-1">
                            <div><span className="font-medium">身份：</span>{positioning.basicInfo?.identity || '-'}</div>
                            <div><span className="font-medium">领域：</span>{positioning.positioningDirection?.nicheField || '-'}</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">或手动输入</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>行业领域</Label>
                  <Input
                    placeholder="例如：科技、教育、美食..."
                    value={topicForm.industry}
                    onChange={(e) => setTopicForm({ ...topicForm, industry: e.target.value })}
                    disabled={!!topicForm.customerId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>推荐数量</Label>
                  <Select value={topicForm.count.toString()} onValueChange={(v) => setTopicForm({ ...topicForm, count: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3个</SelectItem>
                      <SelectItem value="5">5个</SelectItem>
                      <SelectItem value="10">10个</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>内容定位（选填）</Label>
                <Input
                  placeholder="例如：干货分享、故事讲述..."
                  value={topicForm.position}
                  onChange={(e) => setTopicForm({ ...topicForm, position: e.target.value })}
                  disabled={!!topicForm.customerId}
                />
              </div>
              <div className="space-y-2">
                <Label>目标效果（选填）</Label>
                <Input
                  placeholder="例如：涨粉、带货、品牌曝光..."
                  value={topicForm.target}
                  onChange={(e) => setTopicForm({ ...topicForm, target: e.target.value })}
                />
              </div>
              
              {/* 内容类型选择 */}
              <div className="space-y-2">
                <Label>内容类型（选填）</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: '讲故事', label: '讲故事', desc: '立人设', color: 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300' },
                    { id: '晒过程', label: '晒过程', desc: '秀实力', color: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300' },
                    { id: '教知识', label: '教知识', desc: '引粉丝', color: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300' },
                    { id: '说观点', label: '说观点', desc: '引共鸣', color: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300' },
                    { id: '说产品', label: '说产品', desc: '促转化', color: 'bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setTopicForm({ 
                        ...topicForm, 
                        contentType: topicForm.contentType === type.id ? '' : type.id 
                      })}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        topicForm.contentType === type.id 
                          ? type.color + ' ring-2 ring-offset-1' 
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                      }`}
                    >
                      {type.label}
                      <span className="text-xs ml-1 opacity-70">({type.desc})</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  选择内容类型，AI会生成对应类型的选题
                </p>
              </div>
              
              <Button
                onClick={handleTopicRecommend}
                className="w-full bg-primary border-0"
                disabled={isTopicLoading || (!topicForm.customerId && !topicForm.industry)}
              >
                {isTopicLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成中...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />获取推荐</>
                )}
              </Button>
              
              {/* AI 推荐进度提示 */}
              {isTopicLoading && !topicResult && (
                <AIGeneratingProgress operation="推荐选题" />
              )}
              
              {topicResult && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>推荐选题</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCopyResult(topicResult)}>
                        <Copy className="w-3 h-3 mr-1" />复制
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportResult(topicResult, '选题推荐')}>
                        <Download className="w-3 h-3 mr-1" />导出
                      </Button>
                      {topicForm.customerId && (
                        <Button 
                          size="sm" 
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={handleSaveTopicsToMaterial}
                          disabled={isSavingTopic}
                        >
                          {isSavingTopic ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" />保存中...</>
                          ) : (
                            <><FileText className="w-3 h-3 mr-1" />保存到素材库</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm max-h-80 overflow-y-auto">
                    {topicResult}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 数据分析中心对话框 */}
        <DataAnalysisDialog open={isReportOpen} onOpenChange={setIsReportOpen} />

        {/* 灵感收集对话框 */}
        <InspirationDialog open={isInspirationOpen} onOpenChange={setIsInspirationOpen} />

        {/* 素材编辑对话框 */}
        <Dialog open={isEditMaterialOpen} onOpenChange={setIsEditMaterialOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-purple-600" />
                编辑素材
              </DialogTitle>
              <DialogDescription>
                {editingMaterial?.customerName} · {(editingMaterial?.materialType || 'topic') === 'topic' ? '选题' : (editingMaterial?.materialType || 'topic') === 'script' ? '文案' : '脚本'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* 选题/标题 */}
              <div className="space-y-2">
                <Label>选题/标题</Label>
                <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                  {editingMaterial?.topic}
                </div>
              </div>
              
              {/* 内容 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>内容</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyMaterial}
                    className="h-7 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    复制内容
                  </Button>
                </div>
                <Textarea
                  value={editMaterialContent}
                  onChange={(e) => setEditMaterialContent(e.target.value)}
                  placeholder="素材内容..."
                  className="min-h-[300px] resize-y"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditMaterialOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveMaterial} disabled={isSavingMaterial}>
                {isSavingMaterial ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />保存中...</>
                ) : (
                  '保存修改'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 功能教程对话框 */}
        <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                功能使用教程
              </DialogTitle>
              <DialogDescription>
                快速上手超级编导助手，打造爆款短视频内容
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* 步骤1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">1</div>
                  <h3 className="font-semibold text-lg">新建客户档案</h3>
                </div>
                <div className="pl-11 space-y-2 text-sm text-muted-foreground">
                  <p>点击右上角 <span className="text-purple-600 font-medium">「新增客户」</span> 按钮，填写客户基本信息。</p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-foreground">小技巧：</span>
                      不知如何填写？点击 <span className="text-purple-600 font-medium">「AI辅助」</span> 按钮自动生成内容
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">2</div>
                  <h3 className="font-semibold text-lg">AI分析生成IP定位</h3>
                </div>
                <div className="pl-11 space-y-2 text-sm text-muted-foreground">
                  <p>进入客户详情页，点击 <span className="text-blue-600 font-medium">「AI分析」</span> 功能卡。</p>
                  <p>输入客户相关信息后，点击 <span className="text-blue-600 font-medium">「完成并保存」</span>，系统将自动生成IP定位报告。</p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-foreground">IP定位包含：</span>
                      人设定位、内容方向、目标受众等
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">3</div>
                  <h3 className="font-semibold text-lg">选题推荐</h3>
                </div>
                <div className="pl-11 space-y-2 text-sm text-muted-foreground">
                  <p>点击首页 <span className="text-orange-600 font-medium">「选题推荐」</span> 功能卡。</p>
                  <p>选择客户档案 → 选择选题方向 → 设置生成数量 → 点击生成</p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs">
                      <span className="font-medium text-foreground">选题方向：</span>
                      讲故事、晒过程、教知识、聊观点、说产品
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">4</div>
                  <h3 className="font-semibold text-lg">一键生成文案</h3>
                </div>
                <div className="pl-11 space-y-2 text-sm text-muted-foreground">
                  <p>在选题推荐结果中，找到满意的选题，点击右侧 <span className="text-green-600 font-medium">「文案创作」</span> 按钮。</p>
                  <p>系统将自动跳转并基于该选题生成完整文案。</p>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-foreground">生成后可：</span>
                      复制、保存到素材库
                    </p>
                  </div>
                </div>
              </div>

              {/* 完整流程图 */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border">
                <h4 className="font-medium mb-3 text-center">完整创作流程</h4>
                <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">新建客户</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">AI分析</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full">选题推荐</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full">文案创作</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full">保存素材</span>
                </div>
              </div>

              {/* 其他功能入口 */}
              <div className="space-y-3">
                <h4 className="font-semibold">更多功能</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <Sparkles className="w-4 h-4 text-purple-500 mt-0.5" />
                    <div>
                      <p className="font-medium">智能超级编导</p>
                      <p className="text-xs text-muted-foreground">AI问答，专业创作指导</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <Video className="w-4 h-4 text-pink-500 mt-0.5" />
                    <div>
                      <p className="font-medium">脚本创作</p>
                      <p className="text-xs text-muted-foreground">短视频脚本生成</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">运营分析</p>
                      <p className="text-xs text-muted-foreground">账号分析、竞品分析</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                    <Zap className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">AI工具箱</p>
                      <p className="text-xs text-muted-foreground">敏感词检测、文案优化等</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      )}
    </DashboardLayout>
  );
}
