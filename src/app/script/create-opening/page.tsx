'use client';

import { useState, useEffect, Suspense } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  PenLine, 
  Loader2, 
  Sparkles,
  BookOpen,
  Star,
  Lightbulb,
  Hash,
  Users,
  Zap,
  Target,
  Award,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { TOPIC_TYPES } from '@/lib/topic-types';

// 选题类型英文ID转中文标签
const getTopicLabel = (id: string): string => {
  const type = TOPIC_TYPES[id as keyof typeof TOPIC_TYPES];
  return type?.label || id || '选题';
};
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useFormTemplates, getDefaultTemplateName } from '@/hooks/useFormTemplates';
import { TemplateManager } from '@/components/form/TemplateManager';
import { GenerationHistory } from '@/components/history/GenerationHistory';

const SCRIPT_TYPES = [
  { value: 'story', label: '讲故事', desc: '通过故事化内容吸引观众', icon: BookOpen },
  { value: 'process', label: '晒过程', desc: '展示某件事完整过程', icon: Star },
  { value: 'knowledge', label: '教知识', desc: '分享有价值专业知识', icon: Lightbulb },
  { value: 'opinion', label: '说观点', desc: '表达独特个人观点', icon: Hash },
];

// 策略预览
const STRATEGIES_PREVIEW = [
  { name: '精准命名痛点', icon: Target },
  { name: '制造强烈对比', icon: TrendingUp },
  { name: '否定常识', icon: Zap },
  { name: '说出用户心声', icon: Users },
  { name: '反问引发思考', icon: Award },
  { name: '揭示本质矛盾', icon: PenLine },
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

function CreateOpeningContent() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  
  const [form, setForm] = useState({
    customerId: '',
    topic: '',
    scriptType: 'opinion',
    requirements: '',
  });

  // UI状态
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // 返回来源信息
  const [returnSource, setReturnSource] = useState<{
    type: string;
    typeName: string;
    historyId: string | null;
    params: Record<string, any>;
    content: string;
  } | null>(null);

  // 模板管理
  const {
    templates,
    saveTemplate,
    deleteTemplate,
    loadTemplate,
    isNameExists,
  } = useFormTemplates<{
    customerId: string;
    topic: string;
    scriptType: string;
    requirements: string;
  }>('create_opening');

  useEffect(() => {
    loadCustomers();
    
    // 读取返回来源信息
    const returnSourceStr = sessionStorage.getItem('return_source');
    if (returnSourceStr) {
      try {
        const source = JSON.parse(returnSourceStr);
        // 只在 5 分钟内的来源有效
        if (source.timestamp && Date.now() - source.timestamp < 5 * 60 * 1000) {
          setReturnSource(source);
        }
      } catch (e) {
        console.error('解析返回来源失败:', e);
      }
    }
    
    // 从 sessionStorage 读取传入的参数（从选题跳转过来时）
    const paramsStr = sessionStorage.getItem('generation_params');
    if (paramsStr) {
      try {
        const params = JSON.parse(paramsStr);
        if (params.topic) {
          setForm(prev => ({ ...prev, topic: params.topic }));
        }
        if (params.customerId) {
          setForm(prev => ({ ...prev, customerId: params.customerId.toString() }));
        }
        if (params.scriptType) {
          setForm(prev => ({ ...prev, scriptType: params.scriptType }));
        }
        // 清理 sessionStorage，避免下次进入时误读
        sessionStorage.removeItem('generation_params');
      } catch (e) {
        console.error('解析参数失败:', e);
      }
    }
  }, []);

  // 监听客户选择变化，加载对应的素材库
  useEffect(() => {
    if (form.customerId) {
      loadMaterials(form.customerId);
    } else {
      setMaterials([]);
    }
  }, [form.customerId]);

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

  // 加载客户的素材库（选题）
  const loadMaterials = async (customerId: string) => {
    if (!customerId) {
      setMaterials([]);
      return;
    }
    
    setIsLoadingMaterials(true);
    try {
      const token = getToken();
      const response = await fetch(`/api/customer/materials?customerId=${customerId}&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.data) {
        // 加载所有有 topic 的素材
        const topics = data.data.filter((m: Material) => m.topic);
        setMaterials(topics);
      }
    } catch (error) {
      console.error('Load materials error:', error);
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // 保存模板
  const handleSaveTemplate = (name: string, data: Record<string, any>) => {
    saveTemplate(name, {
      customerId: data.customerId || form.customerId,
      topic: data.topic || form.topic,
      scriptType: data.scriptType || form.scriptType,
      requirements: data.requirements || form.requirements,
    });
  };

  // 加载模板
  const handleLoadTemplate = (data: Record<string, any>) => {
    if (data.customerId) {
      setForm(prev => ({ ...prev, customerId: data.customerId }));
    }
    if (data.topic) {
      setForm(prev => ({ ...prev, topic: data.topic }));
    }
    if (data.scriptType) {
      setForm(prev => ({ ...prev, scriptType: data.scriptType }));
    }
    if (data.requirements !== undefined) {
      setForm(prev => ({ ...prev, requirements: data.requirements }));
    }
  };

  // 从素材库选择选题
  const handleSelectMaterial = (material: Material) => {
    setForm(prev => ({
      ...prev,
      topic: material.topic,
      scriptType: material.scriptType || prev.scriptType,
    }));
    toast.success(`已选择选题：${material.topic.substring(0, 30)}...`);
  };

  // 生成内容 - 跳转到结果页面
  const handleGenerate = () => {
    // 验证
    if (!form.topic.trim()) {
      toast.error('请输入或选择选题主题');
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
    router.push('/script/result?type=opening_batch');
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-orange-500">
            <PenLine className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">创作开篇</h1>
            <p className="text-muted-foreground text-sm mt-0.5">一键生成6个不同策略的开篇，每个都有专业评分</p>
          </div>
          <div className="flex items-center gap-2">
            {/* 返回上一级按钮 */}
            {returnSource && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // 将来源内容保存到 sessionStorage，然后跳转
                  const historyId = `return_${Date.now()}`;
                  sessionStorage.setItem(`history_${historyId}`, JSON.stringify({
                    id: historyId,
                    type: returnSource.type,
                    content: returnSource.content,
                    params: returnSource.params,
                    createdAt: Date.now(),
                  }));
                  // 清理返回来源信息
                  sessionStorage.removeItem('return_source');
                  // 跳转回结果页
                  router.push(`/script/result?type=${returnSource.type}&historyId=${historyId}`);
                }}
                className="text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回{returnSource.typeName}
              </Button>
            )}
            {/* 历史记录 */}
            <GenerationHistory
              currentType="opening_batch"
              onSelectHistory={(item) => {
                sessionStorage.setItem(`history_${item.id}`, JSON.stringify(item));
                router.push(`/script/result?type=opening_batch&historyId=${item.id}`);
              }}
              variant="button"
            />
            {/* 模板管理 */}
            <TemplateManager
              type="create_opening"
              templates={templates}
              currentData={{
                customerId: form.customerId,
                topic: form.topic,
                scriptType: form.scriptType,
                requirements: form.requirements,
              }}
              onSave={handleSaveTemplate}
              onLoad={handleLoadTemplate}
              onDelete={deleteTemplate}
              isNameExists={isNameExists}
              defaultName={getDefaultTemplateName('create_opening')}
            />
          </div>
        </div>

        {/* 功能说明卡片 */}
        <Card className="border-0 rounded-3xl bg-muted">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10">
                <Lightbulb className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  AI 将生成 <strong>6种策略</strong> 的开篇，每个都有专业评分和质量检查
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {STRATEGIES_PREVIEW.map((strategy, i) => {
                    const Icon = strategy.icon;
                    return (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Icon className="w-3 h-3 mr-1" />
                        {strategy.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 人设档案选择 */}
        <Card className="border-0 rounded-3xl">
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <Label className="text-base font-semibold">人设档案</Label>
                <p className="text-sm text-muted-foreground">选人设，让开篇更贴合你的风格</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger className="w-[180px] rounded-[10px]">
                    <SelectValue placeholder={customers.length === 0 ? "暂无档案" : "选择档案"} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.filter(c => c.ipPositioning).map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/customer')}
                  className="rounded-lg"
                >
                  管理
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 选题主题 */}
        <Card className="border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Target className="w-5 h-5 text-orange-500" />
              选题主题
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>输入选题</Label>
                <Badge variant="secondary" className="text-xs">必填</Badge>
              </div>
              <Input
                placeholder="例如：为什么网红店倒闭得快？"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>

            {/* 素材库选题选择 */}
            {form.customerId && materials.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  从素材库选择
                </Label>
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 border rounded-xl p-2 bg-muted/20">
                  {materials.map((material) => (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => handleSelectMaterial(material)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg transition-all text-sm hover:bg-muted/50",
                        form.topic === material.topic 
                          ? "bg-primary/10 border border-primary/30 text-primary" 
                          : "border border-transparent"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{material.topic}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {getTopicLabel(material.scriptType)}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.customerId && materials.length === 0 && !isLoadingMaterials && (
              <div className="text-sm text-muted-foreground text-center py-3 border rounded-xl bg-muted/20">
                暂无已保存的选题
              </div>
            )}

            {isLoadingMaterials && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 脚本类型 */}
        <Card className="border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Hash className="w-5 h-5 text-purple-500" />
              脚本类型
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {SCRIPT_TYPES.map((type) => {
                const isSelected = form.scriptType === type.value;
                const Icon = type.icon;
                
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm({ ...form, scriptType: type.value })}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <div className={cn('font-medium', isSelected && 'text-primary')}>{type.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{type.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 更多设置（可折叠） */}
        <Card className="border-0 rounded-3xl">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-4 flex items-center justify-between"
          >
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Zap className="w-5 h-5 text-green-500" />
              补充要求（可选）
            </CardTitle>
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {showAdvanced && (
            <CardContent className="space-y-4 pt-0">
              <Textarea
                placeholder="风格幽默、包含关键词、字数限制..."
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                rows={3}
              />
            </CardContent>
          )}
        </Card>

        {/* 生成按钮 */}
        <Button
          onClick={handleGenerate}
          className="w-full h-12 text-white border-0 rounded-[14px] bg-orange-500 hover:bg-orange-500/90"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          生成开篇
        </Button>

        {/* 底部说明 */}
        <Card className="border-0 rounded-3xl bg-muted">
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-orange-500/10">
                <Shield className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">开篇生成说明</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  AI 将为你生成6种不同策略的开篇，每个开篇都有专业评分和质量检查。选择最佳开篇后可直接生成完整文案。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function CreateOpeningPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <CreateOpeningContent />
    </Suspense>
  );
}
