'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  Cog, 
  Loader2, 
  Play, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText,
  Users,
  Sparkles,
  Trash2,
  Eye,
  Zap,
  Copy,
  Check,
  XCircle as XCircleIcon
} from 'lucide-react';
import { getToken, memberApi } from '@/lib/api';
import { toast } from 'sonner';

// 统一蓝紫色主题
const THEME_COLOR = {
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  bg: '#8B5CF6',
  bgLight: '#F5F3FF',
  text: '#8B5CF6',
};

// 算力消耗规则（对齐 POWER_CONSUMPTION_RULES）
const POWER_COSTS = {
  topic: 250,      // 选题：每次250算力（对齐 topic 规则）
  script: 100,     // 文案：基础100 + 每100字100算力 = 每字1算力（对齐 script 规则）
  fullscript: 150, // 脚本：基础150 + 每100字150算力 = 每字1.5算力（对齐 material 规则）
};

const SCRIPT_TYPES = [
  { id: 'story', label: '讲故事', desc: '立人设', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'process', label: '晒过程', desc: '秀实力', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'knowledge', label: '教知识', desc: '引粉丝', color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'opinion', label: '聊观点', desc: '引共鸣', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'product', label: '说产品', desc: '促转化', color: 'bg-pink-100 text-pink-700 border-pink-300' },
];

// 脚本类型中文名称映射（后端可能存储英文，需要映射显示）
const SCRIPT_TYPE_NAMES: Record<string, string> = {
  'story': '讲故事',
  'process': '晒过程',
  'knowledge': '教知识',
  'opinion': '聊观点',
  'product': '说产品',
  '讲故事': '讲故事',
  '晒过程': '晒过程',
  '教知识': '教知识',
  '聊观点': '聊观点',
  '说产品': '说产品',
};

const CONTENT_TYPES = [
  { id: 'topic', label: '选题', desc: '生成选题方向' },
  { id: 'script', label: '文案', desc: '生成完整文案' },
  { id: 'fullscript', label: '脚本', desc: '生成拍摄脚本' },
];

interface Customer {
  id: number;
  name: string;
  ipPositioning: string | null;
}

interface Task {
  id: string;
  customerId: number;
  customerName: string;
 contentTypes: string[];
  scriptType: string;
  count: number;
  wordCount: string;
  scriptWordCount: string;
  requirements: string;
  executeMode: 'immediate' | 'scheduled';
  scheduledTime?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total: number;
  createdAt: string;
  results: { title: string; content: string; type: string }[];
}

function AutomationPageContent() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [computingPower, setComputingPower] = useState<{ remaining: number; unlimited: boolean } | null>(null);
  
  // 表单状态
  const [form, setForm] = useState({
    customerId: '',
    contentTypes: [] as string[],
    scriptType: '',
    count: 1,
    wordCount: '',
    scriptWordCount: '',
    requirements: '',
    executeMode: 'immediate' as 'immediate' | 'scheduled',
    scheduledTime: '',
  });

  // 当前运行的任务
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  
  // 查看任务结果对话框
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // 计算预计消耗的算力
  const calculateEstimatedPower = () => {
    let totalCost = 0;
    const count = form.count || 1;
    
    form.contentTypes.forEach(type => {
      if (type === 'topic') {
        // 选题：每次250算力
        totalCost += POWER_COSTS.topic * count;
      } else if (type === 'script') {
        // 文案：基础100 + 每100字100算力（每字1算力），假设平均500字
        const avgWords = form.wordCount ? parseInt(form.wordCount.replace(/[^0-9]/g, '')) || 500 : 500;
        totalCost += (POWER_COSTS.script + Math.ceil(avgWords * 1)) * count;
      } else if (type === 'fullscript') {
        // 脚本：基础150 + 每100字150算力（每字1.5算力），假设平均800字
        const avgWords = form.scriptWordCount ? parseInt(form.scriptWordCount.replace(/[^0-9]/g, '')) || 800 : 800;
        totalCost += (POWER_COSTS.fullscript + Math.ceil(avgWords * 1.5)) * count;
      }
    });
    
    return totalCost;
  };

  // 检查算力是否足够
  const isPowerEnough = () => {
    if (!computingPower || computingPower.unlimited) return true;
    const estimated = calculateEstimatedPower();
    return computingPower.remaining >= estimated;
  };

  useEffect(() => {
    loadCustomers();
    loadTasks();
    loadComputingPower();
  }, []);

  // 页面可见时自动刷新任务列表，并恢复正在执行任务的轮询
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTasks();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 检查并恢复正在执行的任务轮询
  useEffect(() => {
    const runningTask = tasks.find(t => t.status === 'running');
    if (runningTask && !runningTaskId) {
      // 恢复轮询
      setRunningTaskId(runningTask.id);
      const token = getToken();
      
      const pollInterval = setInterval(async () => {
        try {
          const tasksResponse = await fetch('/api/automation/tasks', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const tasksData = await tasksResponse.json();
          
          if (tasksData.data) {
            const currentTask = tasksData.data.find((t: Task) => t.id === runningTask.id);
            
            if (currentTask && (currentTask.status === 'completed' || currentTask.status === 'failed')) {
              clearInterval(pollInterval);
              setRunningTaskId(null);
              setTasks(tasksData.data);
              
              if (currentTask.status === 'completed' && currentTask.results?.length > 0) {
                setSelectedTask(currentTask);
                setIsResultDialogOpen(true);
                toast.success('任务执行完成！');
              } else if (currentTask.status === 'completed') {
                toast.info('任务执行完成，但未生成有效内容');
              } else if (currentTask.status === 'failed') {
                toast.error('任务执行失败，请重试');
              }
            }
          }
        } catch (pollError) {
          console.error('Poll error:', pollError);
        }
      }, 2000);
      
      // 5分钟超时保护
      setTimeout(() => {
        clearInterval(pollInterval);
        setRunningTaskId(null);
      }, 5 * 60 * 1000);
    }
  }, [tasks, runningTaskId]);

  const loadComputingPower = async () => {
    try {
      const res = await memberApi.getComputingPower();
      setComputingPower({
        remaining: res.data?.remaining || 0,
        unlimited: res.data?.unlimited || false,
      });
    } catch (error) {
      console.error('Load computing power error:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/customer/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.data) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error('Load customers error:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/automation/tasks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.data) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('Load tasks error:', error);
    }
  };

  const handleCreateTask = async () => {
    // 验证表单
    if (!form.customerId) {
      toast.error('请选择客户档案');
      return;
    }
    if (form.contentTypes.length === 0) {
      toast.error('请至少选择一种内容类型');
      return;
    }
    if (!form.scriptType) {
      toast.error('请选择脚本类型');
      return;
    }
    if (form.count < 1 || form.count > 20) {
      toast.error('生成数量请设置在1-20之间');
      return;
    }
    if (form.executeMode === 'scheduled' && !form.scheduledTime) {
      toast.error('请设置定时执行时间');
      return;
    }
    
    // 检查算力是否足够
    if (!isPowerEnough()) {
      toast.error('算力不足，请充值后继续');
      return;
    }

    setIsLoading(true);
    try {
      const token = getToken();
      const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
      
      const response = await fetch('/api/automation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          customerId: parseInt(form.customerId),
          customerName: selectedCustomer?.name || '',
          ipPositioning: selectedCustomer?.ipPositioning,
          estimatedPower: calculateEstimatedPower(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // 根据执行模式显示不同提示
        if (form.executeMode === 'immediate') {
          toast.success('任务已开始执行，请稍候...');
        } else {
          toast.success('定时任务创建成功，将在指定时间自动执行');
        }
        
        // 刷新算力状态
        loadComputingPower();
        
        // 立即刷新任务列表，显示新创建的任务
        loadTasks();
        
        // 如果是立即执行，开始执行任务
        if (form.executeMode === 'immediate') {
          // 延迟执行，确保任务列表已经刷新
          setTimeout(() => executeTask(data.taskId), 500);
        }
        
        // 重置表单
        setForm({
          customerId: '',
          contentTypes: [],
          scriptType: '',
          count: 1,
          wordCount: '',
          scriptWordCount: '',
          requirements: '',
          executeMode: 'immediate',
          scheduledTime: '',
        });
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      console.error('Create task error:', error);
      toast.error('创建失败');
    } finally {
      setIsLoading(false);
    }
  };

  const executeTask = async (taskId: string) => {
    setRunningTaskId(taskId);
    
    try {
      const token = getToken();
      const response = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // 开始轮询任务状态
        const pollInterval = setInterval(async () => {
          try {
            const tasksResponse = await fetch('/api/automation/tasks', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const tasksData = await tasksResponse.json();
            
            if (tasksData.data) {
              const currentTask = tasksData.data.find((t: Task) => t.id === taskId);
              
              if (currentTask && (currentTask.status === 'completed' || currentTask.status === 'failed')) {
                clearInterval(pollInterval);
                setRunningTaskId(null);
                setTasks(tasksData.data);
                
                if (currentTask.status === 'completed' && currentTask.results?.length > 0) {
                  // 自动打开结果弹窗
                  setSelectedTask(currentTask);
                  setIsResultDialogOpen(true);
                } else if (currentTask.status === 'completed') {
                  toast.info('任务执行完成，但未生成有效内容');
                } else if (currentTask.status === 'failed') {
                  toast.error('任务执行失败，请重试');
                }
              }
            }
          } catch (pollError) {
            console.error('Poll error:', pollError);
          }
        }, 2000); // 每2秒轮询一次
        
        // 设置超时保护（最多等待5分钟）
        setTimeout(() => {
          clearInterval(pollInterval);
          setRunningTaskId(null);
        }, 5 * 60 * 1000);
        
      } else {
        toast.error(data.error || '执行失败');
        setRunningTaskId(null);
      }
    } catch (error) {
      console.error('Execute task error:', error);
      toast.error('执行失败');
      setRunningTaskId(null);
    }
  };

  // 打开任务结果对话框
  const openResultDialog = (task: Task) => {
    setSelectedTask(task);
    setIsResultDialogOpen(true);
  };

  // 复制内容到剪贴板
  const handleCopyContent = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('复制失败');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    
    try {
      const token = getToken();
      const response = await fetch(`/api/automation/tasks?id=${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('任务已删除');
        loadTasks();
      }
    } catch (error) {
      console.error('Delete task error:', error);
      toast.error('删除失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />等待执行</Badge>;
      case 'running':
        return <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300 bg-blue-50"><Loader2 className="w-3 h-3 animate-spin" />执行中</Badge>;
      case 'completed':
        return <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50"><CheckCircle2 className="w-3 h-3" />已完成</Badge>;
      case 'failed':
        return <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50"><XCircle className="w-3 h-3" />失败</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: THEME_COLOR.gradient }}
        >
          <Cog className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">自动化任务</h1>
          <p className="text-muted-foreground">批量生成选题和文案，自动保存到素材库</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：创建任务 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: THEME_COLOR.text }} />
              创建自动化任务
            </CardTitle>
            <CardDescription>选择客户档案和生成参数，一键批量生成内容</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 客户档案选择 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                选择客户档案 *
              </Label>
              <Select 
                value={form.customerId} 
                onValueChange={(v) => setForm({ ...form, customerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择客户档案" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                      {customer.ipPositioning && (
                        <span className="ml-2 text-xs text-green-600">已定位</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 内容类型 - 多选 */}
            <div className="space-y-2">
              <Label>内容类型 *（可多选）</Label>
              <div className="grid grid-cols-3 gap-2">
                {CONTENT_TYPES.map((type) => {
                  const isSelected = form.contentTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setForm({ ...form, contentTypes: form.contentTypes.filter(t => t !== type.id) });
                        } else {
                          setForm({ ...form, contentTypes: [...form.contentTypes, type.id] });
                        }
                      }}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{type.desc}</div>
                    </button>
                  );
                })}
              </div>
              {/* 动态显示执行顺序：根据选择的内容类型，按优先级排序显示 */}
              {form.contentTypes.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  将按顺序执行：{(() => {
                    // 按优先级排序：选题 > 文案 > 脚本
                    const order = ['topic', 'script', 'fullscript'];
                    const selected = form.contentTypes
                      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
                      .map(id => CONTENT_TYPES.find(t => t.id === id)?.label);
                    return selected.join(' → ');
                  })()}
                </p>
              )}
            </div>

            {/* 脚本类型 */}
            <div className="space-y-2">
              <Label>脚本类型 *</Label>
              <div className="flex flex-wrap gap-2">
                {SCRIPT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setForm({ ...form, scriptType: type.id })}
                    className={`px-3 py-2 rounded-full text-sm border transition-all ${
                      form.scriptType === type.id 
                        ? type.color + ' ring-2 ring-offset-1' 
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 dark:bg-gray-800'
                    }`}
                  >
                    {type.label}
                    <span className="ml-1 text-xs opacity-70">{type.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 生成数量 */}
            <div className="space-y-2">
              <Label>生成数量</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.count}
                  onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) || 1 })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">条（1-20条）</span>
              </div>
            </div>

            {/* 文案字数要求 */}
            {form.contentTypes.includes('script') && (
              <div className="space-y-2">
                <Label>文案字数要求（可选）</Label>
                <Input
                  placeholder="例如：500-800字"
                  value={form.wordCount}
                  onChange={(e) => setForm({ ...form, wordCount: e.target.value })}
                />
              </div>
            )}

            {/* 脚本字数要求 */}
            {form.contentTypes.includes('fullscript') && (
              <div className="space-y-2">
                <Label>脚本字数要求（可选）</Label>
                <Input
                  placeholder="例如：800-1200字"
                  value={form.scriptWordCount}
                  onChange={(e) => setForm({ ...form, scriptWordCount: e.target.value })}
                />
              </div>
            )}

            {/* 其他要求 */}
            <div className="space-y-2">
              <Label>其他要求（可选）</Label>
              <Textarea
                placeholder="例如：语气要活泼、包含具体案例..."
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                rows={2}
              />
            </div>

            {/* 执行方式 */}
            <div className="space-y-3">
              <Label>执行方式</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, executeMode: 'immediate' })}
                  className={`flex-1 p-3 rounded-lg border transition-all text-left ${
                    form.executeMode === 'immediate' 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-green-600" />
                    <span className="font-medium">立即执行</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">创建后立即开始生成</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, executeMode: 'scheduled' })}
                  className={`flex-1 p-3 rounded-lg border transition-all text-left ${
                    form.executeMode === 'scheduled' 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">定时执行</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">指定时间自动执行</div>
                </button>
              </div>
              
              {form.executeMode === 'scheduled' && (
                <Input
                  type="datetime-local"
                  value={form.scheduledTime}
                  onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>

            {/* 算力消耗提示 */}
            {form.contentTypes.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium text-sm">算力消耗</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600">
                      预计消耗 {calculateEstimatedPower()} 算力
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {computingPower?.unlimited 
                        ? '无限算力' 
                        : `剩余 ${computingPower?.remaining || 0} 算力`
                      }
                    </div>
                  </div>
                </div>
                
                {/* 算力消耗明细 */}
                <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                  {form.contentTypes.includes('topic') && (
                    <div className="flex justify-between">
                      <span>选题 × {form.count}条</span>
                      <span>{POWER_COSTS.topic * form.count} 算力</span>
                    </div>
                  )}
                  {form.contentTypes.includes('script') && (
                    <div className="flex justify-between">
                      <span>文案 × {form.count}条</span>
                      <span>约 {POWER_COSTS.script * form.count}+ 算力</span>
                    </div>
                  )}
                  {form.contentTypes.includes('fullscript') && (
                    <div className="flex justify-between">
                      <span>脚本 × {form.count}条</span>
                      <span>约 {POWER_COSTS.fullscript * form.count}+ 算力</span>
                    </div>
                  )}
                </div>
                
                {/* 算力不足警告 */}
                {!isPowerEnough() && (
                  <div className="mt-2 p-2 rounded bg-red-50 text-red-600 text-xs flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    算力不足，请充值后继续
                  </div>
                )}
              </div>
            )}

            {/* 创建按钮 */}
            <Button
              onClick={handleCreateTask}
              className="w-full gradient-bg border-0"
              disabled={isLoading || runningTaskId !== null || !isPowerEnough()}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />创建中...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />创建任务</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 右侧：任务列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              任务列表
            </CardTitle>
            <CardDescription>查看和管理已创建的自动化任务</CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Cog className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无任务</p>
                <p className="text-sm">创建任务后将显示在这里</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {tasks.map((task) => (
                  <div 
                    key={task.id}
                    className="p-4 rounded-lg border bg-muted/30 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{task.customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {(task.contentTypes || []).map((t: string) => 
                            t === 'topic' ? '选题' : t === 'script' ? '文案' : '脚本'
                          ).join(' → ')} · {SCRIPT_TYPE_NAMES[task.scriptType] || task.scriptType} · {task.count}条
                        </div>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                    
                    {task.status === 'running' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>执行进度</span>
                          <span>{task.progress}/{task.total}</span>
                        </div>
                        <Progress value={(task.progress / task.total) * 100} />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>创建时间：{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
                      <div className="flex gap-2">
                        {task.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => executeTask(task.id)}
                            disabled={runningTaskId !== null}
                          >
                            <Play className="w-3 h-3 mr-1" />执行
                          </Button>
                        )}
                        {task.status === 'completed' && task.results.length > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openResultDialog(task)}
                          >
                            <Eye className="w-3 h-3 mr-1" />查看素材
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 任务结果对话框 */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              任务执行完成
            </DialogTitle>
            <DialogDescription>
              <span className="text-green-600 font-medium">已生成 {selectedTask?.results?.length || 0} 条素材并自动保存到素材库</span>
              <span className="text-muted-foreground ml-2">
                · {selectedTask?.customerName} · {selectedTask?.contentTypes?.map(t => 
                  t === 'topic' ? '选题' : t === 'script' ? '文案' : '脚本'
                ).join(' → ')}
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {selectedTask?.results?.map((result, index) => (
              <div key={index} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={
                      result.type === '选题' 
                        ? 'bg-orange-100 text-orange-700' 
                        : result.type === '文案' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-pink-100 text-pink-700'
                    }>
                      {result.type}
                    </Badge>
                    <span className="font-medium text-sm line-clamp-1">{result.title}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyContent(result.content, index)}
                    className="shrink-0"
                  >
                    {copiedIndex === index ? (
                      <><Check className="w-3 h-3 mr-1 text-green-500" />已复制</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-1" />复制</>
                    )}
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words max-h-60 overflow-y-auto bg-background p-3 rounded border">
                  {result.content}
                </div>
              </div>
            ))}
            
            {(!selectedTask?.results || selectedTask.results.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <XCircleIcon className="w-12 h-12 mb-3 opacity-50" />
                <p>暂无生成结果</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsResultDialogOpen(false)}>
              关闭
            </Button>
            <Button 
              className="bg-primary border-0"
              onClick={() => {
                setIsResultDialogOpen(false);
                router.push('/operations/content-library');
              }}
            >
              <FileText className="w-4 h-4 mr-2" />
              前往素材库查看
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AutomationPageFallback() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Cog className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">自动化任务</h1>
          <p className="text-muted-foreground">批量生成选题和文案，自动保存到素材库</p>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    </div>
  );
}

export default function AutomationPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<AutomationPageFallback />}>
        <AutomationPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
