'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Download, 
  FileText,
  Save,
  Check,
  RefreshCw,
  Users,
  Video,
  Camera,
  Mic,
  Eye,
  Hand,
  Monitor,
  ArrowDown,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFormTemplates, getDefaultTemplateName } from '@/hooks/useFormTemplates';
import { TemplateManager } from '@/components/form/TemplateManager';
import { GenerationHistory } from '@/components/history/GenerationHistory';
import { useHistoryRestore } from '@/hooks/useHistoryRestore';
import { useGenerationHistory } from '@/hooks/useGenerationHistory';

// 拍摄方式
const SHOOTING_METHODS = [
  { 
    id: 'talking_head', 
    name: '直面镜头讲述', 
    desc: '正对镜头讲解分享',
    scenes: '教知识、聊观点、讲故事',
    icon: Video,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900'
  },
  { 
    id: 'follow_shot', 
    name: '跟拍记录', 
    desc: '跟随拍摄真实过程',
    scenes: '晒过程、讲故事',
    icon: Camera,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900'
  },
  { 
    id: 'fixed_angle', 
    name: '固定机位展示', 
    desc: '机位不动展示内容',
    scenes: '教知识、晒过程',
    icon: Monitor,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900'
  },
  { 
    id: 'voice_over', 
    name: '画外音配画面', 
    desc: '只出声音不配人像',
    scenes: '教知识',
    icon: Mic,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900'
  },
  { 
    id: 'third_person', 
    name: '第三人称偷拍', 
    desc: '第三方视角记录',
    scenes: '教知识、聊观点',
    icon: Eye,
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900'
  },
  { 
    id: 'selfie', 
    name: '手持自拍', 
    desc: '自己手持手机拍摄',
    scenes: '晒过程、讲故事',
    icon: Hand,
    color: 'text-teal-500',
    bgColor: 'bg-teal-100 dark:bg-teal-900'
  },
];

// 脚本类型
const SCRIPT_TYPES = [
  { 
    id: 'story', 
    name: '讲故事', 
    desc: '立人设、建立信任',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900'
  },
  { 
    id: 'process', 
    name: '晒过程', 
    desc: '秀手艺、展实力',
    icon: Camera,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900'
  },
  { 
    id: 'knowledge', 
    name: '教知识', 
    desc: '引粉丝、建权威',
    icon: Sparkles,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900'
  },
  { 
    id: 'opinion', 
    name: '说观点', 
    desc: '引共鸣、促讨论',
    icon: Mic,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900'
  },
  { 
    id: 'product', 
    name: '说产品', 
    desc: '促转化、提销量',
    icon: FileText,
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900'
  },
];

interface Customer {
  id: number;
  name: string;
  ipPositioning: string | null;
}

// 素材接口
interface Material {
  id: number;
  customerId: number;
  customerName: string;
  topic: string;
  title?: string;
  scriptType: string;
  content?: string;
  status: string;
  createdAt: string;
}

function ScriptPageContent() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState('');
  const [savedResult, setSavedResult] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  
  const [form, setForm] = useState({
    customerId: '',
    topic: '',
    scriptType: 'story',
    shootingMethod: 'talking_head',
    context: '',
  });

  // 模板管理
  const {
    templates,
    saveTemplate,
    deleteTemplate,
    loadTemplate,
    isNameExists,
  } = useFormTemplates('script');

  // 历史记录管理
  const { addHistory } = useGenerationHistory();

  // 历史记录恢复
  useHistoryRestore({
    supportedTypes: ['script'],
    onRestore: (item) => {
      setResult(item.content);
      if (item.params && Object.keys(item.params).length > 0) {
        setForm(prev => ({ ...prev, ...item.params }));
      }
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      toast.success('已恢复历史记录');
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  // 保存模板
  const handleSaveTemplate = (name: string, data: Record<string, unknown>) => {
    saveTemplate(name, data);
  };

  // 加载模板
  const handleLoadTemplate = (data: Record<string, unknown>) => {
    setForm(prev => ({ ...prev, ...data }));
  };

  useEffect(() => {
    loadCustomers();
  }, []);

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

  // 加载客户的素材库（文案）
  const loadMaterials = async (customerId: string) => {
    if (!customerId) {
      setMaterials([]);
      return;
    }
    
    setIsLoadingMaterials(true);
    try {
      const token = getToken();
      const response = await fetch(`/api/customer/materials?customerId=${customerId}&pageSize=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.data) {
        // 只要有 content 字段的素材（文案）
        const scripts = data.data.filter((m: Material) => m.content);
        setMaterials(scripts);
      }
    } catch (error) {
      console.error('Load materials error:', error);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // 监听客户选择变化，加载对应的素材库
  useEffect(() => {
    if (form.customerId) {
      loadMaterials(form.customerId);
    } else {
      setMaterials([]);
    }
  }, [form.customerId]);

  const handleGenerate = async () => {
    // 如果没有从素材库选择且没有输入选题，则提示
    if (!form.topic && !selectedMaterialId) {
      toast.error('请输入选题主题或从素材库选择');
      return;
    }

    // 获取客户信息
    let ipPositioning = null;
    let customerName = '';
    if (form.customerId) {
      const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
      if (selectedCustomer?.ipPositioning) {
        try {
          ipPositioning = JSON.parse(selectedCustomer.ipPositioning);
          customerName = selectedCustomer.name;
        } catch {}
      }
    }

    // 存储生成参数到 sessionStorage
    const params = {
      ...form,
      customerId: form.customerId ? parseInt(form.customerId) : null,
      customerName,
      ipPositioning,
    };
    sessionStorage.setItem('generation_params', JSON.stringify(params));
    
    // 跳转到结果页面
    router.push('/script/result?type=script');
  };

  const handleSave = async () => {
    if (!form.customerId) {
      toast.error('请先选择客户档案');
      return;
    }
    if (!result.trim()) {
      toast.error('没有可保存的脚本');
      return;
    }

    setIsSaving(true);
    try {
      const token = getToken();
      const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
      
      // 从脚本内容中提取标题
      const lines = result.split('\n');
      let title = form.topic;
      for (const line of lines) {
        if (line.includes('爆款标题') || line.includes('标题：')) {
          const titleMatch = line.match(/(?:爆款标题|标题)[：:]\s*(.+)/);
          if (titleMatch) {
            title = titleMatch[1].trim();
            break;
          }
        }
      }

      const scriptTypeLabel = SCRIPT_TYPES.find(t => t.id === form.scriptType)?.name || '讲故事';

      const response = await fetch('/api/customer/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: parseInt(form.customerId),
          customerName: selectedCustomer?.name || '',
          topic: title,
          scriptType: scriptTypeLabel,
          content: result,
        }),
      });

      const res = await response.json();
      if (response.ok && res.success) {
        toast.success('脚本已保存到素材库');
        setSavedResult(true);
      } else {
        toast.error(res.error || '保存失败');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success('已复制到剪贴板');
  };

  const handleExport = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `脚本_${form.topic}_${new Date().toLocaleDateString('zh-CN')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setForm({
      customerId: '',
      topic: '',
      scriptType: 'story',
      shootingMethod: 'talking_head',
      context: '',
    });
    setResult('');
    setSavedResult(false);
  };

  const scrollToResult = () => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-5 pb-8">
        {/* 返回按钮 */}
        <button
          onClick={() => router.push('/script')}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          返回脚本创作
        </button>

        {/* 顶部标题区 */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">脚本生成</h1>
              <p className="text-muted-foreground text-sm">根据您的视频文案和人设，快速生成专业短视频脚本</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 历史记录 */}
            <GenerationHistory
              currentType="script"
              onSelectHistory={(item) => {
                // 使用正确的历史记录恢复方式：存储完整历史记录，通过 historyId 恢复
                sessionStorage.setItem(`history_${item.id}`, JSON.stringify(item));
                router.push(`/script/result?type=script&historyId=${item.id}`);
              }}
              variant="button"
            />
            {/* 模板管理 */}
            <TemplateManager
              type="script"
              templates={templates}
              currentData={form}
              onSave={handleSaveTemplate}
              onLoad={handleLoadTemplate}
              onDelete={deleteTemplate}
              isNameExists={isNameExists}
              defaultName={getDefaultTemplateName('script')}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="shrink-0"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* 模块1：拍摄方式 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold">拍摄方式</h2>
            <Badge variant="destructive" className="text-xs font-normal">必选</Badge>
          </div>
          <p className="text-sm text-muted-foreground">选择视频的拍摄方式</p>
          
          <div className="grid grid-cols-3 gap-3">
            {SHOOTING_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = form.shootingMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setForm({ ...form, shootingMethod: method.id })}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected 
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30' 
                      : 'border-gray-200 bg-white dark:bg-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${method.bgColor}`}>
                      <Icon className={`w-4 h-4 ${method.color}`} />
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className={`font-medium text-sm ${isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'}`}>
                    {method.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{method.desc}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{method.scenes}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 模块2：脚本类型 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold">脚本类型</h2>
            <Badge variant="destructive" className="text-xs font-normal">必选</Badge>
          </div>
          <p className="text-sm text-muted-foreground">选择脚本的内容类型</p>
          
          <div className="grid grid-cols-5 gap-3">
            {SCRIPT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = form.scriptType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm({ ...form, scriptType: type.id })}
                  className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected 
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30' 
                      : 'border-gray-200 bg-white dark:bg-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 ${type.bgColor}`}>
                    <Icon className={`w-5 h-5 ${type.color}`} />
                  </div>
                  <div className={`font-medium text-sm ${isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'}`}>
                    {type.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{type.desc}</div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 模块3：客户档案 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              <h2 className="text-lg font-semibold">客户档案</h2>
              <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
            </div>
            <button 
              onClick={loadCustomers}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="刷新客户列表"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">选择客户档案，让脚本更贴合人设</p>
          
          {/* 客户卡片列表 */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {customers.filter(c => c.ipPositioning).length === 0 ? (
              <div className="w-full py-6 text-center text-muted-foreground text-sm border-2 border-dashed border-gray-200 rounded-xl">
                暂无客户档案，请先添加客户
              </div>
            ) : (
              customers.filter(c => c.ipPositioning).map((customer) => {
                const isSelected = form.customerId === customer.id.toString();
                let ipInfo = null;
                try {
                  ipInfo = customer.ipPositioning ? JSON.parse(customer.ipPositioning) : null;
                } catch {}
                
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setForm({ ...form, customerId: customer.id.toString() })}
                    className={`relative flex-shrink-0 w-36 p-3 rounded-xl border-2 transition-all text-center ${
                      isSelected 
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30' 
                        : 'border-gray-200 bg-white dark:bg-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                      isSelected ? 'bg-teal-100 dark:bg-teal-900' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <Users className={`w-5 h-5 ${isSelected ? 'text-teal-600' : 'text-gray-400'}`} />
                    </div>
                    
                    <div className={`font-medium text-sm mb-1 truncate ${
                      isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {customer.name}
                    </div>
                    
                    {ipInfo?.coreBusiness && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {ipInfo.coreBusiness}
                      </div>
                    )}
                    
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 素材库选择 - 选择客户后显示 */}
        {form.customerId && materials.length > 0 && (
          <div className="space-y-3 p-4 rounded-xl border-2 border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-500" />
              <h2 className="text-lg font-semibold">从素材库选择文案</h2>
              <Badge variant="secondary" className="text-xs font-normal">推荐</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              已有 {materials.length} 个文案，选择一个快速生成脚本
            </p>
            
            {isLoadingMaterials ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {materials.map((material) => {
                  const isSelected = selectedMaterialId === material.id;
                  return (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          // 取消选择
                          setSelectedMaterialId(null);
                          setForm({ ...form, topic: '', context: '' });
                        } else {
                          // 选择素材
                          setSelectedMaterialId(material.id);
                          setForm({ 
                            ...form, 
                            topic: material.topic,
                            context: material.content?.substring(0, 200) || ''
                          });
                        }
                      }}
                      className={`flex-shrink-0 w-72 p-3 rounded-xl border-2 transition-all text-left ${
                        isSelected 
                          ? 'border-teal-500 bg-teal-100 dark:bg-teal-900/30' 
                          : 'border-gray-200 bg-white dark:bg-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-teal-500' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium line-clamp-2 ${
                            isSelected ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {material.topic}
                          </div>
                          {material.content && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {material.content.substring(0, 80)}...
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 模块4：选题主题 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold">选题主题</h2>
            {selectedMaterialId ? (
              <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs font-normal">必填</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedMaterialId ? '已从素材库选择，可在此修改' : '输入脚本的核心主题'}
          </p>
          <Input
            placeholder="输入选题主题..."
            value={form.topic}
            onChange={(e) => {
              setForm({ ...form, topic: e.target.value });
              // 如果用户手动修改了选题，清除素材库选择状态
              if (selectedMaterialId) {
                setSelectedMaterialId(null);
              }
            }}
          />
        </div>

        {/* 模块5：补充要求（可选） */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-500" />
            <h2 className="text-lg font-semibold">补充要求</h2>
            <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
          </div>
          <p className="text-sm text-muted-foreground">如时长要求、特定元素等</p>
          <Textarea
            placeholder="输入补充要求，如：时长控制在1分钟以内、需要加入xx元素..."
            value={form.context}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
            rows={3}
          />
        </div>

        {/* 底部生成按钮 */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleGenerate}
            size="lg"
            className="px-16 py-6 text-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />生成中...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" />生成脚本</>
            )}
          </Button>
        </div>

        {/* 结果区域 */}
        {result && (
          <div ref={resultRef} className="border rounded-xl overflow-hidden mt-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b">
              <h2 className="text-base font-semibold">脚本结果</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="w-3 h-3 mr-1" />复制
                </Button>
                <Button size="sm" variant="outline" onClick={handleExport}>
                  <Download className="w-3 h-3 mr-1" />导出
                </Button>
                {form.customerId && (
                  <Button 
                    size="sm" 
                    className={`${savedResult ? 'bg-green-500 hover:bg-green-600' : 'bg-teal-500 hover:bg-teal-600'} text-white`}
                    onClick={handleSave}
                    disabled={isSaving || savedResult}
                  >
                    {savedResult ? (
                      <><Check className="w-3 h-3 mr-1" />已保存</>
                    ) : isSaving ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" />保存中...</>
                    ) : (
                      <><Save className="w-3 h-3 mr-1" />保存到素材库</>
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 whitespace-pre-wrap text-sm max-h-[600px] overflow-y-auto">
                {result}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 浮动按钮：查看结果 */}
      {(isLoading || result) && (
        <button
          onClick={scrollToResult}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full shadow-lg hover:from-teal-600 hover:to-cyan-600 transition-all animate-bounce"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>生成中...</span>
            </>
          ) : (
            <>
              <ArrowDown className="w-4 h-4" />
              <span>查看结果</span>
            </>
          )}
        </button>
      )}
    </DashboardLayout>
  );
}

export default function ScriptPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ScriptPageContent />
    </Suspense>
  );
}
