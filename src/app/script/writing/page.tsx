'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  FileText, 
  Loader2, 
  Copy, 
  Sparkles,
  PenTool,
  MessageSquare,
  Save,
  Check,
  RefreshCw,
  Users,
  Mic,
  BookOpen,
  Heart,
  Hash,
  Star,
  Lightbulb,
  Video,
  ArrowDown,
  Link2,
  Wand2,
  Quote,
  AlertCircle,
  Layers,
  Gem,
  Target,
  Zap
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFormTemplates, getDefaultTemplateName } from '@/hooks/useFormTemplates';
import { TemplateManager } from '@/components/form/TemplateManager';
import { GenerationHistory } from '@/components/history/GenerationHistory';
import { useGenerationHistory } from '@/hooks/useGenerationHistory';
import { TOPIC_TYPES } from '@/lib/topic-types';
import { IP36_CATEGORIES, getIp36Technique } from '@/lib/ip36-config';

// 选题类型英文ID转中文标签
const getTopicLabel = (id: string): string => {
  const type = TOPIC_TYPES[id as keyof typeof TOPIC_TYPES];
  return type?.label || id || '未分类';
};

// 创作模式
const CREATION_MODES = [
  { 
    id: 'original_humanity', 
    name: '原创文案（人性爆款）', 
    desc: '主打生成"人性爆款"类文案',
    icon: FileText,
  },
  { 
    id: 'ip36', 
    name: 'IP36计', 
    desc: '36种成交文案模板',
    icon: Target,
  },
  { 
    id: 'rewrite_source', 
    name: '洗稿', 
    desc: '基于参考文案进行洗稿创作',
    icon: FileText,
  },
  { 
    id: 'rewrite_style', 
    name: '仿写', 
    desc: '基于参考文案进行仿写创作',
    icon: PenTool,
  },
  { 
    id: 'style_simulation', 
    name: '文风模拟', 
    desc: '可模拟特定博主的文风',
    icon: Heart,
  },
  { 
    id: 'dialogue', 
    name: '对话流（采访）', 
    desc: '编导提问+IP回答，层层递进传递观点',
    icon: MessageSquare,
  },
];

// 对话轮次目标建议
const DIALOGUE_ROUND_SUGGESTIONS = [
  '浅层切入，制造认知反转',
  '中层深入，揭露真相',
  '深层触及，制造共鸣',
  '价值升华，引导行动',
  '案例佐证，增强说服力',
  '情绪渲染，加深印象',
  '反向论证，强化观点',
  '总结收尾，留下悬念',
];

// 洗稿模式
const REWRITE_MODES = [
  { 
    id: 'high_dimension', 
    name: '模式A：高维同题再创作', 
    desc: '保留首句+主题，改写中间内容，重复率控制在10%以内',
    icon: FileText,
  },
  { 
    id: 'differentiation', 
    name: '模式B：定向差异化再创作', 
    desc: '保留开篇底层逻辑，按用户指导或知识库自由创作',
    icon: Wand2,
  },
  { 
    id: 'first_sentence', 
    name: '模式C：首句借势续写', 
    desc: '借用首句钩子，引导到自己的业务方向',
    icon: Quote,
  },
];

// 博主平台
const BLOGGER_PLATFORMS = [
  { id: 'douyin', name: '抖音博主', logo: '🎵' },
  { id: 'xiaohongshu', name: '小红书博主', logo: '📕' },
];

// 脚本类型
const SCRIPT_TYPES = [
  { 
    id: 'opinion', 
    name: '聊观点', 
    desc: '表达独特个人观点和见解',
    icon: Hash,
  },
  { 
    id: 'process', 
    name: '晒过程', 
    desc: '展示某件事完整过程',
    icon: Star,
  },
  { 
    id: 'knowledge', 
    name: '教知识', 
    desc: '分享有价值专业知识',
    icon: Lightbulb,
  },
  { 
    id: 'story', 
    name: '讲故事', 
    desc: '通过故事化内容吸引观众',
    icon: BookOpen,
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

function WritingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState('');
  const [savedResult, setSavedResult] = useState(false);
  const [showCustomPersona, setShowCustomPersona] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  
  const [form, setForm] = useState({
    creationMode: 'original_humanity',
    scriptType: 'opinion',
    customerId: '',
    customPersona: '',
    industry: '',
    wordCount: '',
    topic: '',
    openingText: '',
    otherInfo: '',
    // 对话流专属
    dialogueRoundCount: 3,
    dialogueRoundGoals: [] as string[], // 不预填，让用户自己填写
    rewriteMode: 'high_dimension',
    videoLink: '',
    reference: '',
    bloggerPlatform: '',
    bloggerLink: '',
    bloggerSampleText: '',
    // IP36计专属
    ip36Category: '',
    ip36Technique: '',
  });
  
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
  } = useFormTemplates('writing');

  // 历史记录管理
  const { addHistory } = useGenerationHistory();

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
    
    const topicParam = searchParams.get('topic');
    const customerIdParam = searchParams.get('customerId');
    const autoGenerate = searchParams.get('autoGenerate');
    
    // 处理来自灵感共创页面的参数
    const modeParam = searchParams.get('mode');
    const titleParam = searchParams.get('title');
    const contentParam = searchParams.get('content');
    const hashtagsParam = searchParams.get('hashtags');
    const trackParam = searchParams.get('track');
    const fromParam = searchParams.get('from');
    
    if (fromParam === 'inspiration') {
      // 来自灵感共创页面
      if (modeParam) {
        setForm(prev => ({ ...prev, creationMode: modeParam }));
      }
      if (titleParam) {
        setForm(prev => ({ ...prev, topic: decodeURIComponent(titleParam) }));
      }
      if (contentParam) {
        setForm(prev => ({ ...prev, reference: decodeURIComponent(contentParam) }));
      }
      if (hashtagsParam) {
        setForm(prev => ({ 
          ...prev, 
          otherInfo: (prev.otherInfo ? prev.otherInfo + '\n' : '') + '话题标签：' + decodeURIComponent(hashtagsParam)
        }));
      }
      if (trackParam) {
        setForm(prev => ({ 
          ...prev, 
          otherInfo: (prev.otherInfo ? prev.otherInfo + '\n' : '') + '赛道：' + decodeURIComponent(trackParam)
        }));
      }
      // 显示提示
      toast.success('已加载爆款视频信息，请补充创作需求后生成');
    } else {
      // 原有逻辑
      if (topicParam) {
        setForm(prev => ({ ...prev, topic: decodeURIComponent(topicParam) }));
      }
      if (customerIdParam) {
        setForm(prev => ({ ...prev, customerId: customerIdParam }));
      }
      
      if (autoGenerate === 'true' && topicParam) {
        setTimeout(() => {
          handleGenerateWithTopic(decodeURIComponent(topicParam), customerIdParam);
        }, 500);
      }
    }
  }, [searchParams]);

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
        // 加载所有有 topic 的素材（选题和文案都可以作为参考）
        const topics = data.data.filter((m: Material) => m.topic);
        setMaterials(topics);
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

  const handleGenerateWithTopic = async (topic: string, customerId: string | null) => {
    // 获取客户信息
    let ipPositioning = null;
    let customerName = '';
    if (customerId) {
      const selectedCustomer = customers.find(c => c.id.toString() === customerId);
      if (selectedCustomer?.ipPositioning) {
        try {
          ipPositioning = JSON.parse(selectedCustomer.ipPositioning);
          customerName = selectedCustomer.name;
        } catch {}
      }
    }

    // 存储生成参数到 sessionStorage
    const params = {
      topic,
      mode: 'original',
      customerId: customerId ? parseInt(customerId) : null,
      customerName,
      ipPositioning,
      scriptType: 'opinion',
      creationMode: 'original_humanity',
    };
    sessionStorage.setItem('generation_params', JSON.stringify(params));
    
    // 跳转到结果页面
    router.push('/script/result?type=writing');
  };

  const scrollToResult = () => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleGenerate = async () => {
    if (form.creationMode === 'rewrite_source') {
      if (!form.reference.trim()) {
        toast.error('请输入参考文案');
        return;
      }
      // 洗稿模式下选题必填
      if (!form.topic.trim()) {
        toast.error('请输入选题或口水话');
        return;
      }
    }
    
    if (form.creationMode === 'rewrite_style') {
      if (!form.reference.trim()) {
        toast.error('请输入参考文案');
        return;
      }
      // 仿写模式下选题必填
      if (!form.topic.trim()) {
        toast.error('请输入选题或口水话');
        return;
      }
    }

    if (form.creationMode === 'style_simulation') {
      if (!form.bloggerPlatform) {
        toast.error('请选择博主平台');
        return;
      }
      if (form.bloggerPlatform === 'douyin' && !form.bloggerSampleText.trim()) {
        toast.error('请粘贴博主的文案样本');
        return;
      }
      if (form.bloggerPlatform === 'xiaohongshu' && !form.bloggerLink.trim()) {
        toast.error('请输入博主主页链接');
        return;
      }
    }

    // 如果是原创模式且没有从素材库选择，则需要输入选题
    if ((form.creationMode === 'original_humanity' || form.creationMode === 'original_8' || form.creationMode === 'dialogue') && !form.topic && !selectedMaterialId) {
      toast.error('请输入选题或从素材库选择');
      return;
    }

    // IP36计模式验证
    if (form.creationMode === 'ip36') {
      if (!form.ip36Category) {
        toast.error('请选择计策类别');
        return;
      }
      if (!form.ip36Technique) {
        toast.error('请选择具体计策');
        return;
      }
      if (!form.topic && !selectedMaterialId) {
        toast.error('请输入选题或从素材库选择');
        return;
      }
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
      customPersona: form.customPersona || undefined,
      reference: form.reference || undefined,
      videoLink: form.videoLink || undefined,
      ip36Category: form.ip36Category || undefined,
      ip36Technique: form.ip36Technique || undefined,
    };
    sessionStorage.setItem('generation_params', JSON.stringify(params));
    
    // 跳转到结果页面（对话流使用独立的类型）
    const resultType = form.creationMode === 'dialogue' ? 'dialogue' : 'writing';
    router.push(`/script/result?type=${resultType}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success('已复制到剪贴板');
  };

  const handleSaveToMaterial = async () => {
    if (!result) {
      toast.error('没有内容可保存');
      return;
    }

    setIsSaving(true);
    try {
      const token = getToken();
      const selectedCustomer = customers.find(c => c.id.toString() === form.customerId);
      
      const response = await fetch('/api/customer/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: form.customerId ? parseInt(form.customerId) : 0,
          customerName: selectedCustomer?.name || '',
          topic: form.topic || '文案创作',
          title: result.substring(0, 50) + (result.length > 50 ? '...' : ''),
          scriptType: '文案创作',
          content: result,
          status: 'draft',
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('📝 文案已保存！可以继续创作或导出使用');
        setSavedResult(true);
      } else {
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
      creationMode: 'original_humanity',
      scriptType: 'opinion',
      customerId: '',
      customPersona: '',
      industry: '',
      wordCount: '',
      topic: '',
      openingText: '',
      otherInfo: '',
      dialogueRoundCount: 3,
      dialogueRoundGoals: [] as string[], // 不预填，让用户自己填写
      rewriteMode: 'high_dimension',
      videoLink: '',
      reference: '',
      bloggerPlatform: '',
      bloggerLink: '',
      bloggerSampleText: '',
      ip36Category: '',
      ip36Technique: '',
    });
    setResult('');
    setSavedResult(false);
    setShowCustomPersona(false);
  };

  const isRewriteMode = form.creationMode === 'rewrite_source' || form.creationMode === 'rewrite_style';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* 返回按钮 */}
        <div className="flex items-center gap-4">
          {returnSource ? (
            <button
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
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowDown className="w-4 h-4 rotate-90" />
              返回{returnSource.typeName}
            </button>
          ) : (
            <button
              onClick={() => router.push('/script')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowDown className="w-4 h-4 rotate-90" />
              返回脚本创作
            </button>
          )}
        </div>

        {/* 顶部标题区 */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
              <PenTool className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                智能文案助手
              </h1>
              <p className="text-muted-foreground text-sm">告诉我你想创作什么，我来帮你写出精彩的内容</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 历史记录 */}
            <GenerationHistory
              currentType="writing"
              onSelectHistory={(item) => {
                // 使用正确的历史记录恢复方式：存储完整历史记录，通过 historyId 恢复
                sessionStorage.setItem(`history_${item.id}`, JSON.stringify(item));
                router.push(`/script/result?type=writing&historyId=${item.id}`);
              }}
              variant="button"
            />
            {/* 模板管理 */}
            <TemplateManager
              type="writing"
              templates={templates}
              currentData={form}
              onSave={handleSaveTemplate}
              onLoad={handleLoadTemplate}
              onDelete={deleteTemplate}
              isNameExists={isNameExists}
              defaultName={getDefaultTemplateName('writing')}
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

        {/* 模块1：创作模式 */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              创作模式
              <Badge variant="destructive" className="text-xs font-normal">必选</Badge>
            </CardTitle>
            <CardDescription>选择你想要的创作方向</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {CREATION_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = form.creationMode === mode.id;
                
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setForm({ ...form, creationMode: mode.id })}
                    className={cn(
                      'relative p-3 rounded-xl border-2 transition-all text-left',
                      isSelected 
                        ? 'bg-primary/5 border-primary' 
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary/10' : 'bg-muted/50'
                      )}>
                        <Icon className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <div className={cn('font-medium text-sm', isSelected && 'text-primary')}>
                      {mode.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{mode.desc}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* IP36计专属：类别和计策选择 */}
        {form.creationMode === 'ip36' && (
          <>
            {/* 类别选择 */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  选择类别
                  <Badge variant="destructive" className="text-xs font-normal">必选</Badge>
                </CardTitle>
                <CardDescription>选择文案的成交逻辑类型</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {IP36_CATEGORIES.map((category) => {
                    const isSelected = form.ip36Category === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setForm({ ...form, ip36Category: category.id, ip36Technique: '' })}
                        className={cn(
                          'relative p-3 rounded-xl border-2 transition-all text-left',
                          isSelected 
                            ? 'bg-primary/5 border-primary' 
                            : 'border-border bg-card hover:border-primary/50'
                        )}
                      >
                        <div className="font-medium text-sm">{category.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">{category.purpose}</div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 计策选择 */}
            {form.ip36Category && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    选择计策
                    <Badge variant="destructive" className="text-xs font-normal">必选</Badge>
                  </CardTitle>
                  <CardDescription>
                    当前类别：{IP36_CATEGORIES.find(c => c.id === form.ip36Category)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {IP36_CATEGORIES
                      .find(c => c.id === form.ip36Category)
                      ?.techniques.map((technique) => {
                        const isSelected = form.ip36Technique === technique.id;
                        return (
                          <button
                            key={technique.id}
                            type="button"
                            onClick={() => setForm({ ...form, ip36Technique: technique.id })}
                            className={cn(
                              'w-full p-3 rounded-xl border-2 transition-all text-left flex items-center gap-3',
                              isSelected 
                                ? 'bg-primary/5 border-primary' 
                                : 'border-border bg-card hover:border-primary/50'
                            )}
                          >
                            <div className="flex-1">
                              <div className={cn('font-medium', isSelected && 'text-primary')}>
                                {technique.name}
                              </div>
                              <div className="text-sm text-muted-foreground mt-0.5">{technique.desc}</div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* 洗稿模式专属：洗稿模式选择 */}
        {form.creationMode === 'rewrite_source' && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                洗稿模式
                <Badge variant="destructive" className="text-xs font-normal">必选</Badge>
              </CardTitle>
              <CardDescription>选择洗稿创作的方式</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {REWRITE_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = form.rewriteMode === mode.id;
                  
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setForm({ ...form, rewriteMode: mode.id })}
                      className={cn(
                        'w-full p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3',
                        isSelected 
                          ? 'bg-primary/5 border-primary' 
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isSelected ? 'bg-primary/10' : 'bg-muted/50'
                      )}>
                        <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1">
                        <div className={cn('font-medium', isSelected && 'text-primary')}>
                          {mode.name}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{mode.desc}</div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 洗稿/仿写模式：内容输入源 */}
        {isRewriteMode && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                参考文案
                <Badge variant="destructive" className="text-xs font-normal">必填</Badge>
              </CardTitle>
              <CardDescription>粘贴您要参考的文案内容，AI 将基于此进行创作</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="粘贴您要参考的文案内容...&#10;&#10;💡 提示：&#10;• 可直接复制爆款视频的文案&#10;• 可从「灵感共创」页面找到优质参考&#10;• 使用「轻抖」微信小程序可快速提取抖音视频文案"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                rows={6}
                className="bg-card resize-none"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>请粘贴完整的参考文案，AI 将分析文案风格并进行创作</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 文风模拟模式专属 */}
        {form.creationMode === 'style_simulation' && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                博主信息
                <Badge variant="destructive" className="text-xs font-normal">必填</Badge>
              </CardTitle>
              <CardDescription>选择博主平台并提供必要信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 博主平台选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">博主平台</label>
                <div className="relative w-full max-w-xs">
                  <select
                    value={form.bloggerPlatform}
                    onChange={(e) => setForm({ ...form, bloggerPlatform: e.target.value, bloggerLink: '', bloggerSampleText: '' })}
                    className="w-full h-10 px-3 pr-8 rounded-xl border border-border bg-card text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">选择平台</option>
                    {BLOGGER_PLATFORMS.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.logo} {platform.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 抖音博主 - 手动输入文案样本 */}
              {form.bloggerPlatform === 'douyin' && (
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-700 dark:text-orange-300">抖音博主文案获取说明</p>
                      <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
                        由于平台限制，无法自动抓取。请打开抖音APP，选择博主的2-3条代表性视频，使用「轻抖」提取文案后粘贴到下方。
                      </p>
                    </div>
                  </div>
                  <Textarea
                    placeholder="粘贴博主的视频文案内容，多条文案用空行分隔..."
                    value={form.bloggerSampleText}
                    onChange={(e) => setForm({ ...form, bloggerSampleText: e.target.value })}
                    className="min-h-[120px] bg-white dark:bg-card border-orange-200 dark:border-orange-800"
                  />
                </div>
              )}

              {/* 小红书博主 */}
              {form.bloggerPlatform === 'xiaohongshu' && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-red-700 dark:text-red-300">小红书博主链接</p>
                      <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                        输入博主主页链接，系统将自动抓取博主最近的笔记内容进行分析。
                      </p>
                    </div>
                  </div>
                  <Input
                    placeholder="输入小红书博主主页链接..."
                    value={form.bloggerLink}
                    onChange={(e) => setForm({ ...form, bloggerLink: e.target.value })}
                    className="bg-card"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 模块2：脚本类型 */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              脚本类型
              <Badge variant="destructive" className="text-xs font-normal">必选</Badge>
            </CardTitle>
            <CardDescription>选择内容框架，AI会根据类型调整文案风格</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {SCRIPT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = form.scriptType === type.id;
                
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setForm({ ...form, scriptType: type.id })}
                    className={cn(
                      'relative p-3 rounded-xl border-2 transition-all text-center',
                      isSelected 
                        ? 'bg-primary/5 border-primary' 
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2',
                      isSelected ? 'bg-primary/10' : 'bg-muted/50'
                    )}>
                      <Icon className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className={cn('font-medium text-sm', isSelected && 'text-primary')}>
                      {type.name}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 对话流专属设置 */}
        {form.creationMode === 'dialogue' && (
          <Card className="overflow-hidden border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                对话轮次设置
                <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
              </CardTitle>
              <CardDescription>
                默认生成3轮对话，最多支持8轮。可在下方填写每轮想要探讨的方向，不填则由AI自动规划
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 轮次数量调节 */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <span className="text-sm font-medium">对话轮次</span>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => {
                      if (form.dialogueRoundCount > 1) {
                        setForm({
                          ...form,
                          dialogueRoundCount: form.dialogueRoundCount - 1,
                          dialogueRoundGoals: form.dialogueRoundGoals.slice(0, -1),
                        });
                      }
                    }}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-semibold">{form.dialogueRoundCount}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => {
                      if (form.dialogueRoundCount < 8) {
                        setForm({
                          ...form,
                          dialogueRoundCount: form.dialogueRoundCount + 1,
                          dialogueRoundGoals: [...form.dialogueRoundGoals, ''],
                        });
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
              
              {/* 每轮目标建议（可编辑） */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  💡 建议方向：浅层切入 → 深入分析 → 情感共鸣，以下内容选填即可
                </p>
                {Array.from({ length: form.dialogueRoundCount }, (_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0 w-16 justify-center">
                      第{index + 1}轮
                    </Badge>
                    <Input
                      value={form.dialogueRoundGoals[index] || ''}
                      onChange={(e) => {
                        const newGoals = [...form.dialogueRoundGoals];
                        newGoals[index] = e.target.value;
                        setForm({ ...form, dialogueRoundGoals: newGoals });
                      }}
                      placeholder={DIALOGUE_ROUND_SUGGESTIONS[index] || `第${index + 1}轮对话方向`}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 模块3：客户档案 */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  客户档案
                  <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
                </CardTitle>
                <CardDescription>选择客户档案，让文案更贴合创作者身份</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={loadCustomers}
                className="shrink-0"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {customers.filter(c => c.ipPositioning).length === 0 ? (
                <div className="w-full py-6 text-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
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
                      className={cn(
                        'relative flex-shrink-0 w-36 p-3 rounded-xl border-2 transition-all text-center',
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      <div className={cn(
                        'w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2',
                        isSelected ? 'bg-primary/10' : 'bg-muted/50'
                      )}>
                        <Users className={cn('w-5 h-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                      </div>
                      
                      <div className={cn(
                        'font-medium text-sm mb-1 truncate',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}>
                        {customer.name}
                      </div>
                      
                      {ipInfo?.coreBusiness && (
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {ipInfo.coreBusiness}
                        </div>
                      )}
                      
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            
            {/* 自定义人设按钮 */}
            <button
              type="button"
              onClick={() => setShowCustomPersona(!showCustomPersona)}
              className="w-full mt-3 p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm"
            >
              + 使用自定义人设
            </button>
            
            {showCustomPersona && (
              <Textarea
                placeholder="输入您的自定义人设信息，如：我是xx领域的博主，主要做xx内容..."
                value={form.customPersona}
                onChange={(e) => setForm({ ...form, customPersona: e.target.value })}
                rows={3}
                className="mt-3"
              />
            )}
          </CardContent>
        </Card>

        {/* 素材库选择 - 选择客户后显示 */}
        {form.customerId && materials.length > 0 && (
          <Card className="overflow-hidden border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Gem className="w-4 h-4 text-primary" />
                从素材库选择
                <Badge variant="secondary" className="text-xs font-normal">推荐</Badge>
              </CardTitle>
              <CardDescription>
                已有 {materials.length} 个素材，选择一个快速开始创作
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                            setForm({ ...form, topic: '' });
                          } else {
                            // 选择素材
                            setSelectedMaterialId(material.id);
                            setForm({ ...form, topic: material.topic });
                          }
                        }}
                        className={cn(
                          'flex-shrink-0 w-64 p-3 rounded-xl border-2 transition-all text-left',
                          isSelected 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border bg-card hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                            isSelected ? 'bg-primary' : 'bg-muted/50'
                          )}>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-primary-foreground" />
                            ) : (
                              <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              'text-sm font-medium line-clamp-2',
                              isSelected && 'text-primary'
                            )}>
                              {material.topic}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <span>{getTopicLabel(material.scriptType)}</span>
                              {material.content && <span className="text-primary">· 文案</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 模块4：可选参数 */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">您的行业</CardTitle>
              <CardDescription>已选人设可跳过</CardDescription>
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
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">文案字数</CardTitle>
              <CardDescription>平均口播一分钟300字</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="如：300、500、1000"
                value={form.wordCount}
                onChange={(e) => setForm({ ...form, wordCount: e.target.value })}
              />
            </CardContent>
          </Card>
        </div>

        {/* 模块5：选题或口水话 */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              选题或口水话
              {(form.creationMode === 'rewrite_source' || form.creationMode === 'rewrite_style') ? (
                <Badge variant="destructive" className="text-xs font-normal">必填</Badge>
              ) : (isRewriteMode || selectedMaterialId) ? (
                <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs font-normal">必填</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedMaterialId 
                ? '已从素材库选择选题，可在此修改或补充' 
                : (form.creationMode === 'rewrite_source' || form.creationMode === 'rewrite_style')
                  ? '请输入选题或用口语描述你想创作的方向'
                  : isRewriteMode 
                    ? '想调整创作方向？可以告诉我你的想法' 
                    : '想写什么主题？可以直接说选题，也可以用口语表达'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={selectedMaterialId 
                ? "已选择素材库选题，可在此修改..." 
                : (form.creationMode === 'rewrite_source' || form.creationMode === 'rewrite_style')
                  ? "必填：比如想写护肤的三个误区，或者：哎呀，你们知道吗，我今天发现了一个护肤的坑..."
                  : isRewriteMode 
                    ? "可选：比如想往哪个方向调整，有什么特别要求..." 
                    : "今天要讲的是护肤的三个误区～ 或者：哎呀，你们知道吗，我今天发现了一个护肤的坑..."}
              value={form.topic}
              onChange={(e) => {
                setForm({ ...form, topic: e.target.value });
                // 如果用户手动修改了选题，清除素材库选择状态
                if (selectedMaterialId) {
                  setSelectedMaterialId(null);
                }
              }}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* 模块6：开篇文案 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              开篇文案
              <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
            </CardTitle>
            <CardDescription>已经有开篇了吗？也可以告诉我</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="大家好，今天我想跟大家聊一个很现实的问题..."
              value={form.openingText}
              onChange={(e) => setForm({ ...form, openingText: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* 模块7：其他信息 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              其他想说的
              <Badge variant="secondary" className="text-xs font-normal">可选</Badge>
            </CardTitle>
            <CardDescription>还有什么想补充的？比如目标观众、内容风格等等</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="目标观众是25-35岁的职场女性，风格轻松幽默一点..."
              value={form.otherInfo}
              onChange={(e) => setForm({ ...form, otherInfo: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* 底部生成按钮 */}
        <div className="flex justify-center pt-6">
          <Button
            onClick={handleGenerate}
            size="lg"
            className="px-16 py-6 text-base rounded-full shadow-lg transition-all hover:scale-105"
            disabled={isLoading}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />正在创作中...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" />开始创作</>
            )}
          </Button>
        </div>

        {/* 结果区域 */}
        {result && (
          <Card ref={resultRef} className="overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold">创作结果</h2>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <Copy className="w-3 h-3 mr-1" />复制
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSaveToMaterial}
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
              </div>
            </div>
            <CardContent className="p-4">
              <div className="p-4 rounded-xl bg-muted/30 whitespace-pre-wrap text-sm max-h-[500px] overflow-y-auto">
                {result}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* 浮动按钮：查看结果 */}
      {(isLoading || result) && (
        <button
          onClick={scrollToResult}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-full shadow-lg transition-all animate-bounce"
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

export default function WritingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <WritingPageContent />
    </Suspense>
  );
}
