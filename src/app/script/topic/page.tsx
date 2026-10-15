'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Lightbulb, 
  Loader2, 
  Copy, 
  Download, 
  FileText,
  Check,
  PenTool,
  ArrowRight,
  Users,
  Sparkles,
  Target,
  TrendingUp,
  Compass,
  Zap,
  Flame,
  RefreshCw,
  Briefcase,
  Star,
  DollarSign,
  UserPlus,
  Heart,
  Settings,
  Wand2,
  Layers,
  Gem
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFormTemplates, getDefaultTemplateName } from '@/hooks/useFormTemplates';
import { TemplateManager } from '@/components/form/TemplateManager';
import { GenerationHistory } from '@/components/history/GenerationHistory';
import { useGenerationHistory } from '@/hooks/useGenerationHistory';

// 创作模式 - 统一图标颜色
const CREATION_MODES = [
  {
    id: 'humanity',
    name: '人性爆款选题法',
    desc: '从人性需求出发，挖掘引发共鸣的选题',
    icon: Sparkles,
  },
  {
    id: 'audience',
    name: '人群选题法',
    desc: '按人群特征分类，精准定位目标受众',
    icon: Users,
  },
];

// 生成策略 - 统一图标颜色
const GENERATE_STRATEGIES = [
  { id: 'normal', name: '常规模式', desc: '平衡多样性和实用性', icon: Target },
  { id: 'differentiation', name: '高差异化模式', desc: '追求独特性，避免同质化', icon: Zap },
  { id: 'exploration', name: '探索模式', desc: '挖掘新领域，突破现有框架', icon: Compass },
  { id: 'hotspot', name: '热点模式', desc: '结合热点话题，快速获取流量', icon: Flame },
];

// 目标人群四象限
const AUDIENCE_QUADRANTS = [
  { id: 'intention', name: '意向用户', desc: '已有购买意向，关注性价比、对比测评' },
  { id: 'awareness', name: '意识用户', desc: '有痛点意识但未考虑解决方案' },
  { id: 'potential', name: '潜在用户', desc: '有潜在需求但未意识到' },
  { id: 'mass', name: '大众用户', desc: '无明确需求，泛娱乐向' },
];

// 分析模式
const ANALYSIS_MODES = [
  {
    id: 'quick',
    name: '快速模式',
    desc: '一键生成选题，适合有经验的创作者',
    icon: Zap,
    highlight: '默认推荐',
  },
  {
    id: 'deep',
    name: '深度分析',
    desc: '先分析用户画像和痛点，再生成策略性选题',
    icon: Target,
    highlight: '新手友好',
  },
];

  // 深度分析 - 用户画像维度
const USER_PROFILE_DIMENSIONS = [
  { id: 'age', name: '年龄区间', placeholder: '如：25-40岁' },
  { id: 'gender', name: '性别', placeholder: '如：女性' },
  { id: 'identity', name: '身份标签', placeholder: '如：上班族、宝妈' },
  { id: 'income', name: '收入水平', placeholder: '如：5000-15000元' },
  { id: 'traits', name: '特征标签', placeholder: '如：梨型身材、微胖、大码' },
];

// 从IP定位解析用户画像
function parseUserProfileFromIP(ipPositioning: any) {
  const profile = {
    age: '',
    gender: '',
    identity: '',
    income: '',
    traits: '',
  };
  
  if (!ipPositioning) return profile;
  
  // 年龄
  if (ipPositioning.basicInfo?.age) {
    profile.age = ipPositioning.basicInfo.age;
  }
  
  // 性别
  if (ipPositioning.basicInfo?.gender) {
    profile.gender = ipPositioning.basicInfo.gender;
  }
  
  // 身份标签 - 组合identity和personality
  const identityParts: string[] = [];
  if (ipPositioning.basicInfo?.identity) {
    identityParts.push(ipPositioning.basicInfo.identity);
  }
  if (Array.isArray(ipPositioning.basicInfo?.personality) && ipPositioning.basicInfo.personality.length > 0) {
    identityParts.push(...ipPositioning.basicInfo.personality);
  }
  profile.identity = identityParts.join('、');
  
  // 特征标签 - 从appearance提取
  if (ipPositioning.basicInfo?.appearance) {
    profile.traits = ipPositioning.basicInfo.appearance;
  }
  
  return profile;
}

// 商业目标
const BUSINESS_GOALS = [
  { id: 'none', name: '不选择', desc: '不指定特定商业目标', icon: Settings },
  { id: 'conversion', name: '精准转化', desc: '注重带货和销售转化', icon: DollarSign },
  { id: 'growth', name: '快速涨粉', desc: '注重粉丝增长和曝光', icon: UserPlus },
  { id: 'brand', name: '品牌影响力', desc: '注重品牌建设和认知度', icon: Star },
  { id: 'community', name: '社群运营', desc: '注重社群建设和用户互动', icon: Heart },
];

interface Customer {
  id: number;
  name: string;
  ipPositioning: string | null;
}

export default function TopicPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState('');
  const [savedTopics, setSavedTopics] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);
  
  const [form, setForm] = useState({
    analysisMode: 'quick', // 'quick' | 'deep'
    creationMode: 'humanity',
    strategy: 'normal',
    audienceType: 'intention',
    customerId: '',
    industry: '',
    featureTheme: '',
    otherInfo: '',
    businessGoal: 'none',
    count: 10,
    hotspotKeyword: '',
    // 深度分析字段
    userProfile: {
      age: '',
      gender: '',
      identity: '',
      income: '',
      traits: '',
    },
    painPoints: '', // 痛点
    pleasurePoints: '', // 爽点
    itchPoints: '', // 痒点
    demandPoints: '', // 需求点
  });

  // 模板管理
  const {
    templates,
    saveTemplate,
    deleteTemplate,
    loadTemplate,
    isNameExists,
  } = useFormTemplates('topic');

  // 历史记录管理
  const { addHistory } = useGenerationHistory();

  // 判断是否选择了有定位信息的客户档案
  const hasCustomerPositioning = form.customerId && 
    customers.find(c => c.id.toString() === form.customerId)?.ipPositioning;

  // 获取当前选中的客户信息
  const selectedCustomer = form.customerId 
    ? customers.find(c => c.id.toString() === form.customerId) 
    : null;
  
  // 解析当前客户的IP定位
  const customerIPPositioning = selectedCustomer?.ipPositioning 
    ? (() => {
        try {
          return JSON.parse(selectedCustomer.ipPositioning);
        } catch {
          return null;
        }
      })()
    : null;

  useEffect(() => {
    loadCustomers();
  }, []);

  // 处理客户档案选择 - 自动填充用户画像和四点分析
  const handleCustomerSelect = (customerId: string) => {
    if (!customerId) {
      // 清空选择时，清空用户画像和四点分析
      setForm(prev => ({
        ...prev,
        customerId: '',
        userProfile: { age: '', gender: '', identity: '', income: '', traits: '' },
        painPoints: '',
        demandPoints: '',
        pleasurePoints: '',
        itchPoints: '',
      }));
      return;
    }
    
    const customer = customers.find(c => c.id.toString() === customerId);
    if (customer?.ipPositioning) {
      try {
        const ip = JSON.parse(customer.ipPositioning);
        const userProfile = parseUserProfileFromIP(ip);
        
        // 构建需求点：目标用户 + 常见问题
        const demandParts: string[] = [];
        if (ip.userPersona?.targetUsers) {
          demandParts.push(`目标用户：${ip.userPersona.targetUsers}`);
        }
        if (ip.userPersona?.commonQuestions?.length) {
          demandParts.push(`常见问题：${ip.userPersona.commonQuestions.join('、')}`);
        }
        if (ip.productsServices?.products?.length) {
          demandParts.push(`产品：${ip.productsServices.products.join('、')}`);
        }
        
        // 构建爽点：提供的价值 + 竞争优势
        const pleasureParts: string[] = [];
        if (ip.coreValue?.valueProvided) {
          pleasureParts.push(`价值提供：${ip.coreValue.valueProvided}`);
        }
        if (ip.userPersona?.competitiveAdvantage) {
          pleasureParts.push(`竞争优势：${ip.userPersona.competitiveAdvantage}`);
        }
        
        // 构建痒点：细分领域 + 内容方向
        const itchParts: string[] = [];
        if (ip.positioningDirection?.nicheField) {
          itchParts.push(`细分领域：${ip.positioningDirection.nicheField}`);
        }
        if (ip.contentDirection?.mainTopics?.length) {
          itchParts.push(`内容方向：${ip.contentDirection.mainTopics.join('、')}`);
        }
        
        setForm(prev => ({
          ...prev,
          customerId,
          userProfile,
          // 自动填充四点分析
          painPoints: ip.userPersona?.userPainPoints || prev.painPoints,
          demandPoints: demandParts.length > 0 ? demandParts.join('\n') : prev.demandPoints,
          pleasurePoints: pleasureParts.length > 0 ? pleasureParts.join('\n') : prev.pleasurePoints,
          itchPoints: itchParts.length > 0 ? itchParts.join('\n') : prev.itchPoints,
        }));
      } catch {
        setForm(prev => ({ ...prev, customerId }));
      }
    } else {
      setForm(prev => ({ ...prev, customerId }));
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

  const handleGenerate = async () => {
    // 获取客户信息
    let ipPositioning = null;
    let customerName = '';
    let hasCustomerPositioning = false;
    
    if (form.customerId) {
      const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
      if (selectedCustomer?.ipPositioning) {
        try {
          ipPositioning = JSON.parse(selectedCustomer.ipPositioning);
          customerName = selectedCustomer.name;
          hasCustomerPositioning = true;
        } catch {}
      }
    }
    
    // 如果没有客户档案定位信息，则需要填写其他信息
    if (!hasCustomerPositioning && !form.industry && !form.featureTheme && !form.otherInfo) {
      toast.error('请选择客户档案或填写行业、特色主题、其他信息中的至少一项');
      return;
    }

    if (form.strategy === 'hotspot' && !form.hotspotKeyword) {
      toast.error('热点模式需要输入热点关键词');
      return;
    }

    // 存储生成参数到 sessionStorage
    const params = {
      ...form,
      customerId: form.customerId ? parseInt(form.customerId) : null,
      customerName,
      ipPositioning,
      countPerType: 5, // 每种类型生成5个
    };
    console.log('传递给API的参数:', params);
    sessionStorage.setItem('generation_params', JSON.stringify(params));
    
    // 跳转到结果页面（使用批量选题API）
    router.push('/script/result?type=topic_batch');
  };

  const handleSaveTopic = async (topic: string) => {
    setIsSaving(true);
    try {
      const token = getToken();
      const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
      
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: form.customerId ? parseInt(form.customerId) : 0,
          customerName: selectedCustomer?.name || '',
          topic: topic,
          title: topic.substring(0, 100),
          scriptType: '选题',
          materialType: 'topic',
          sourceType: 'topic',
          status: 'draft',
          archiveType: form.customerId ? 'customer' : 'general',
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('🎯 选题已保存！可以去文案创作继续下一步');
        setSavedTopics(prev => [...prev, topic]);
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllTopics = async () => {
    const topics = result.split('\n').filter(line => line.trim());
    let savedCount = 0;
    let failedCount = 0;

    setIsSaving(true);
    for (const topic of topics) {
      const cleanTopic = topic.replace(/^\d+[.、)）\s]*/, '').trim();
      if (!cleanTopic) continue;

      try {
        const token = getToken();
        const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
        
        const response = await fetch('/api/materials', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customerId: form.customerId ? parseInt(form.customerId) : 0,
            customerName: selectedCustomer?.name || '',
            topic: cleanTopic,
            title: cleanTopic.substring(0, 100),
            scriptType: '选题',
            materialType: 'topic',
            sourceType: 'topic',
            status: 'draft',
            archiveType: form.customerId ? 'customer' : 'general',
          }),
        });

        const result = await response.json();
        if (response.ok && result.success) {
          savedCount++;
          setSavedTopics(prev => [...prev, cleanTopic]);
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }
    setIsSaving(false);

    if (savedCount > 0) {
      toast.success(`已保存 ${savedCount} 个选题到素材库${failedCount > 0 ? `，${failedCount}个失败` : ''}`);
    } else {
      toast.error('保存失败，请重试');
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
    a.download = `选题推荐_${new Date().toLocaleDateString('zh-CN')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goToWriting = (topic: string) => {
    const cleanTopic = topic.replace(/^\d+[.、)）\s]*/, '').trim();
    const params = new URLSearchParams({
      topic: encodeURIComponent(cleanTopic),
      autoGenerate: 'true',
    });
    if (form.customerId) {
      params.append('customerId', form.customerId);
    }
    router.push(`/script/writing?${params.toString()}`);
  };

  const topics = result.split('\n').filter(line => line.trim());

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">智能选题助手</h1>
              <p className="text-muted-foreground">选择创作模式，AI为你生成爆款选题</p>
            </div>
          </div>
          {/* 历史记录 */}
          <div className="flex items-center gap-2">
            <GenerationHistory
              currentType="topic_batch"
              onSelectHistory={(item) => {
                // 使用正确的历史记录恢复方式：存储完整历史记录，通过 historyId 恢复
                sessionStorage.setItem(`history_${item.id}`, JSON.stringify(item));
                router.push(`/script/result?type=topic_batch&historyId=${item.id}`);
              }}
              variant="button"
            />
            <TemplateManager
              type="topic"
              templates={templates}
              currentData={form}
              onSave={(name, data) => saveTemplate(name, data)}
              onLoad={(data) => {
                const newForm: Partial<typeof form> = {};
                if (data.analysisMode) newForm.analysisMode = data.analysisMode;
                if (data.creationMode) newForm.creationMode = data.creationMode;
                if (data.strategy) newForm.strategy = data.strategy;
                if (data.audienceType) newForm.audienceType = data.audienceType;
                if (data.customerId) newForm.customerId = data.customerId;
                if (data.industry) newForm.industry = data.industry;
                if (data.featureTheme) newForm.featureTheme = data.featureTheme;
                if (data.otherInfo) newForm.otherInfo = data.otherInfo;
                if (data.businessGoal) newForm.businessGoal = data.businessGoal;
                if (data.hotspotKeyword) newForm.hotspotKeyword = data.hotspotKeyword;
                setForm(prev => ({ ...prev, ...newForm }));
              }}
              onDelete={deleteTemplate}
              isNameExists={isNameExists}
              defaultName={getDefaultTemplateName('topic')}
            />
          </div>
        </div>

        {/* ⭐ 1. 客户档案选择 - 信息来源优先 */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              客户档案
              <Badge className="bg-primary/10 text-primary text-xs">第一步：选择信息来源</Badge>
            </CardTitle>
            <CardDescription>
              {form.analysisMode === 'deep' 
                ? '选择客户档案后，系统将自动填充用户画像，你也可以手动修改'
                : '选择客户档案，生成个性化选题'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                暂无客户档案，请先添加客户
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => handleCustomerSelect('')}
                  className={cn(
                    'flex-shrink-0 w-36 p-3 rounded-lg border-2 transition-all text-center',
                    !form.customerId 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2',
                    !form.customerId ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Users className={cn('w-5 h-5', !form.customerId ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className={cn('font-medium text-sm', !form.customerId && 'text-primary')}>
                    不选择客户
                  </div>
                </button>
                {customers.filter(c => c.ipPositioning).map((customer) => {
                  const isSelected = form.customerId === customer.id.toString();
                  let ipInfo = null;
                  try {
                    ipInfo = customer.ipPositioning ? JSON.parse(customer.ipPositioning) : null;
                  } catch {}
                  
                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleCustomerSelect(customer.id.toString())}
                      className={cn(
                        'flex-shrink-0 w-36 p-3 rounded-lg border-2 transition-all text-center',
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2',
                        isSelected ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <Users className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      
                      <div className={cn('font-medium text-sm mb-1 truncate', isSelected && 'text-primary')}>
                        {customer.name}
                      </div>
                      
                      {ipInfo?.positioningDirection?.nicheField && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {ipInfo.positioningDirection.nicheField}
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* 显示已选客户的IP定位摘要 */}
            {customerIPPositioning && (
              <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">已加载客户定位信息</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {customerIPPositioning.basicInfo?.identity && (
                    <p>• 身份定位：{customerIPPositioning.basicInfo.identity}</p>
                  )}
                  {customerIPPositioning.positioningDirection?.nicheField && (
                    <p>• 细分领域：{customerIPPositioning.positioningDirection.nicheField}</p>
                  )}
                  {customerIPPositioning.userPersona?.targetUsers && (
                    <p>• 目标用户：{customerIPPositioning.userPersona.targetUsers}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ⭐ 2. 分析模式切换 */}
        <Card className={cn(
          "border-2 transition-all",
          form.analysisMode === 'quick' ? "border-primary/20" : "border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10"
        )}>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 gap-0">
              {ANALYSIS_MODES.map((mode, index) => {
                const Icon = mode.icon;
                const isSelected = form.analysisMode === mode.id;
                
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setForm({ ...form, analysisMode: mode.id })}
                    className={cn(
                      "relative p-6 text-left transition-all",
                      index === 0 ? "rounded-l-xl" : "rounded-r-xl",
                      isSelected 
                        ? mode.id === 'quick' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-amber-500 text-white"
                        : "bg-transparent hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all",
                        isSelected 
                          ? "bg-white/20" 
                          : mode.id === 'quick' ? "bg-primary/10" : "bg-amber-500/10"
                      )}>
                        <Icon className={cn(
                          "w-7 h-7 transition-all",
                          isSelected 
                            ? "text-white" 
                            : mode.id === 'quick' ? "text-primary" : "text-amber-500"
                        )} />
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-lg font-bold transition-colors",
                            isSelected ? "text-white" : "text-foreground"
                          )}>
                            {mode.name}
                          </span>
                          <Badge className={cn(
                            "text-[10px] px-2 py-0.5",
                            isSelected 
                              ? "bg-white/20 text-white hover:bg-white/30" 
                              : mode.id === 'quick' 
                                ? "bg-primary/10 text-primary" 
                                : "bg-amber-500/10 text-amber-600"
                          )}>
                            {mode.highlight}
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-sm transition-colors",
                          isSelected ? "text-white/80" : "text-muted-foreground"
                        )}>
                          {mode.desc}
                        </p>
                      </div>
                    </div>
                    {/* 选中指示器 */}
                    {isSelected && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-t-full bg-white/50" />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 深度分析模式 - 用户画像输入 */}
        {form.analysisMode === 'deep' && (
          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                目标用户画像
                <Badge className="bg-amber-500/10 text-amber-600 text-xs">深度分析核心</Badge>
              </CardTitle>
              <CardDescription>精准描述你的目标用户，AI将基于此进行四点分析</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {USER_PROFILE_DIMENSIONS.map((dim) => (
                  <div key={dim.id}>
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                      {dim.name}
                    </label>
                    <Input
                      placeholder={dim.placeholder}
                      value={form.userProfile[dim.id as keyof typeof form.userProfile]}
                      onChange={(e) => setForm({
                        ...form,
                        userProfile: { ...form.userProfile, [dim.id]: e.target.value }
                      })}
                      className="bg-white/60 dark:bg-black/20"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 深度分析模式 - 四点分析输入 */}
        {form.analysisMode === 'deep' && (
          <Card className="border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                四点分析
                <Badge variant="outline" className="text-xs">可选填写，AI会自动补充</Badge>
              </CardTitle>
              <CardDescription>如果你了解用户，可以预先填写；AI会帮你完善</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <ArrowRight className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="font-medium text-green-700 dark:text-green-400">需求点</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">用户的基础行动需求</p>
                  <textarea
                    placeholder="如：想穿得显瘦显高..."
                    value={form.demandPoints}
                    onChange={(e) => setForm({ ...form, demandPoints: e.target.value })}
                    className="w-full min-h-[60px] text-sm p-2 rounded-md border border-green-200 dark:border-green-800/50 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                
                <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Heart className="w-3 h-3 text-pink-600" />
                    </div>
                    <span className="font-medium text-pink-700 dark:text-pink-400">痛点</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">用户的负面情绪和困扰</p>
                  <textarea
                    placeholder="如：试衣间崩溃、买不到合适尺码..."
                    value={form.painPoints}
                    onChange={(e) => setForm({ ...form, painPoints: e.target.value })}
                    className="w-full min-h-[60px] text-sm p-2 rounded-md border border-pink-200 dark:border-pink-800/50 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                </div>
                
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-yellow-600" />
                    </div>
                    <span className="font-medium text-yellow-700 dark:text-yellow-400">爽点</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">用户的正向反馈满足</p>
                  <textarea
                    placeholder="如：穿上裤子瞬间显瘦5斤..."
                    value={form.pleasurePoints}
                    onChange={(e) => setForm({ ...form, pleasurePoints: e.target.value })}
                    className="w-full min-h-[60px] text-sm p-2 rounded-md border border-yellow-200 dark:border-yellow-800/50 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
                
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Star className="w-3 h-3 text-purple-600" />
                    </div>
                    <span className="font-medium text-purple-700 dark:text-purple-400">痒点</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">用户的精神向往</p>
                  <textarea
                    placeholder="如：穿出高级感、自信气场..."
                    value={form.itchPoints}
                    onChange={(e) => setForm({ ...form, itchPoints: e.target.value })}
                    className="w-full min-h-[60px] text-sm p-2 rounded-md border border-purple-200 dark:border-purple-800/50 bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 创作模式选择 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              创作模式
            </CardTitle>
            <CardDescription>选择一种选题创作模式</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {CREATION_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = form.creationMode === mode.id;
                
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setForm({ ...form, creationMode: mode.id })}
                    className={cn(
                      'relative p-4 rounded-lg border-2 transition-all text-left',
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn('font-medium', isSelected && 'text-primary')}>
                          {mode.name}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">{mode.desc}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 人群选题法 - 目标人群选择 */}
        {form.creationMode === 'audience' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                目标人群
              </CardTitle>
              <CardDescription>选择目标人群类型，针对性生成选题</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {AUDIENCE_QUADRANTS.map((quadrant) => {
                  const isSelected = form.audienceType === quadrant.id;
                  
                  return (
                    <button
                      key={quadrant.id}
                      type="button"
                      onClick={() => setForm({ ...form, audienceType: quadrant.id })}
                      className={cn(
                        'relative p-4 rounded-lg border-2 transition-all text-left',
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('font-medium', isSelected && 'text-primary')}>
                          {quadrant.name}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{quadrant.desc}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 生成策略选择 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              生成策略
              <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
            </CardTitle>
            <CardDescription>不同策略会产出不同风格的选题</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {GENERATE_STRATEGIES.map((strategy) => {
                const Icon = strategy.icon;
                const isSelected = form.strategy === strategy.id;
                
                return (
                  <button
                    key={strategy.id}
                    type="button"
                    onClick={() => setForm({ ...form, strategy: strategy.id })}
                    className={cn(
                      'relative p-3 rounded-lg border-2 transition-all text-left',
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('font-medium', isSelected && 'text-primary')}>
                        {strategy.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{strategy.desc}</p>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* 热点模式关键词输入 */}
            {form.strategy === 'hotspot' && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <label className="text-sm font-medium mb-2 block">热点关键词</label>
                <Input
                  placeholder="输入热点关键词，如：春节、情人节、618..."
                  value={form.hotspotKeyword}
                  onChange={(e) => setForm({ ...form, hotspotKeyword: e.target.value })}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 行业与特色主题 */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                您的行业
                {!hasCustomerPositioning && (
                  <Badge variant="destructive" className="text-xs font-normal">必填</Badge>
                )}
                {hasCustomerPositioning && (
                  <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {hasCustomerPositioning 
                  ? '已使用客户档案信息，行业可补充或修改' 
                  : '例如：美妆、教育、科技、美食等'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="输入您的行业..."
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                特色主题
                <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
              </CardTitle>
              <CardDescription>您的核心定位或特色内容</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="例如：护肤知识、编程教程..."
                value={form.featureTheme}
                onChange={(e) => setForm({ ...form, featureTheme: e.target.value })}
              />
            </CardContent>
          </Card>
        </div>

        {/* 其他信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              其他信息
              <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
            </CardTitle>
            <CardDescription>补充信息帮助AI更好地理解你的需求</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="例如：目标观众是25-35岁的职场女性，内容偏向干货分享..."
              value={form.otherInfo}
              onChange={(e) => setForm({ ...form, otherInfo: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* 商业目标 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gem className="w-4 h-4 text-primary" />
              商业目标
              <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
            </CardTitle>
            <CardDescription>选择商业目标，帮助AI更好地制定选题策略</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {BUSINESS_GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = form.businessGoal === goal.id;
                
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setForm({ ...form, businessGoal: goal.id })}
                    className={cn(
                      'relative p-3 rounded-lg border-2 transition-all text-left',
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('font-medium text-sm', isSelected && 'text-primary')}>
                        {goal.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{goal.desc}</p>
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 生成按钮 */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleGenerate}
            size="lg"
            className="px-12 py-6 text-base"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />生成中...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" />生成选题</>
            )}
          </Button>
        </div>

        {/* 结果区域 */}
        {result && (
          <Card ref={resultRef}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">选题结果</h2>
                <Badge variant="secondary" className="text-xs">{topics.length} 个选题</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="w-3 h-3 mr-1" />复制
                </Button>
                <Button size="sm" variant="outline" onClick={handleExport}>
                  <Download className="w-3 h-3 mr-1" />导出
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleSaveAllTopics}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />保存中...</>
                  ) : (
                    <><FileText className="w-3 h-3 mr-1" />全部保存</>
                  )}
                </Button>
              </div>
            </div>
            <CardContent className="p-4 space-y-2">
              {topics.map((topic, index) => {
                const cleanTopic = topic.replace(/^\d+[.、)）\s]*/, '').trim();
                const isSaved = savedTopics.includes(cleanTopic);
                
                return (
                  <div 
                    key={index}
                    className="group flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-mono text-muted-foreground w-6 shrink-0">
                      {index + 1}.
                    </span>
                    <p className="text-sm flex-1">{cleanTopic}</p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleSaveTopic(cleanTopic)}
                        disabled={isSaved || isSaving}
                      >
                        {isSaved ? (
                          <><Check className="w-3 h-3 mr-1" />已保存</>
                        ) : (
                          <><FileText className="w-3 h-3 mr-1" />保存</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => goToWriting(topic)}
                      >
                        <PenTool className="w-3 h-3 mr-1" />
                        写文案
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
