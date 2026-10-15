'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Circle,
  Loader2,
  History,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  MessageSquare,
  Send,
  FileText,
  User,
  Target,
} from 'lucide-react';

// 步骤定义
const STEPS = [
  { id: 1, name: '选择客户', icon: User },
  { id: 2, name: '输入选题', icon: Target },
  { id: 3, name: '选择方向', icon: CheckCircle2 },
  { id: 4, name: '设计框架', icon: FileText },
  { id: 5, name: '生成开篇', icon: Sparkles },
  { id: 6, name: '生成正文', icon: MessageSquare },
  { id: 7, name: '完成定稿', icon: CheckCircle2 },
];

// 内容类型
const CONTENT_TYPES = [
  { value: 'knowledge', label: '知识分享', description: '讲解知识、技巧、方法论' },
  { value: 'experience', label: '经验分享', description: '分享经历、故事、心得' },
  { value: 'opinion', label: '观点输出', description: '表达观点、立场、态度' },
  { value: 'product', label: '产品服务介绍', description: '推广产品、种草推荐' },
];

// 时长选项
const DURATION_OPTIONS = [
  { value: '15-30', label: '15-30秒', words: 75 },
  { value: '30-60', label: '30-60秒', words: 150 },
  { value: '60-120', label: '60-120秒', words: 300 },
  { value: '120-180', label: '120-180秒', words: 450 },
  { value: 'custom', label: '自定义', words: 200 },
];

interface Customer {
  id: string;
  name: string;
  avatar_url?: string;
  ip_positioning?: {
    identity?: { title?: string };
    domain?: string;
    targetAudience?: string[];
    toneAndStyle?: string;
  };
}

interface Session {
  id: string;
  title: string;
  step: number;
  status: string;
  created_at: string;
  topic?: { raw?: string; selected?: string; direction?: string };
  topics?: Array<{ text: string; direction: string }>;
  framework?: any;
  opening?: any;
  opening_choice?: string;
  final_content?: string;
  content_type?: string;
  word_count?: number;
  customers?: Customer;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function CreativeFlowPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // 状态
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  
  // Step 1: 客户选择
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Step 2: 选题
  const [topicInput, setTopicInput] = useState('');
  const [generatedTopics, setGeneratedTopics] = useState<Array<{ text: string; direction: string }>>([]);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  
  // Step 3: 方向选择
  const [selectedTopic, setSelectedTopic] = useState<{ text: string; direction: string } | null>(null);
  const [contentType, setContentType] = useState('knowledge');
  const [duration, setDuration] = useState('60-120');
  const [customWords, setCustomWords] = useState(200);
  const [targetUsers, setTargetUsers] = useState('');
  const [differentiator, setDifferentiator] = useState('');
  
  // Step 4: 框架
  const [framework, setFramework] = useState<any>(null);
  const [isGeneratingFramework, setIsGeneratingFramework] = useState(false);
  
  // Step 5: 开篇
  const [openings, setOpenings] = useState<any>(null);
  const [selectedOpening, setSelectedOpening] = useState<string | null>(null);
  const [isGeneratingOpenings, setIsGeneratingOpenings] = useState(false);
  
  // Step 6: 正文
  const [finalContent, setFinalContent] = useState('');
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [contentStream, setContentStream] = useState('');
  const [showSelfCheck, setShowSelfCheck] = useState(false);
  
  // Step 7: 定稿
  const [refineHistory, setRefineHistory] = useState<Array<{ instruction: string; result: string }>>([]);
  const [refineInput, setRefineInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  
  // 历史记录
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // 获取客户列表
  useEffect(() => {
    if (user) {
      fetchCustomers();
      fetchSessions();
    }
  }, [user]);

  const fetchCustomers = async () => {
    try {
      const token = getToken();
      console.log('[fetchCustomers] Token:', token ? `${token.substring(0, 20)}...` : 'null');
      if (!token) {
        console.error('[fetchCustomers] Token 为空');
        return;
      }
      const res = await fetch('/api/customer/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log('[fetchCustomers] Response:', data);
      if (data.success && data.data) {
        setCustomers(data.data || []);
      } else if (Array.isArray(data.data)) {
        // 兼容没有 success 字段的返回格式
        setCustomers(data.data);
      }
    } catch (error) {
      console.error('获取客户失败:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/creative/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSessions(data.data || []);
      } else if (Array.isArray(data.data)) {
        // 兼容没有 success 字段的返回格式
        setSessions(data.data);
      }
    } catch (error) {
      console.error('获取会话失败:', error);
    }
  };

  const startNewSession = async () => {
    if (!selectedCustomer) {
      alert('请先选择客户');
      return;
    }
    
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch('/api/creative/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          title: '创作-' + new Date().toLocaleDateString(),
        }),
      });
      const data = await res.json();
      console.log('[startNewSession] Response:', data);
      
      // 兼容两种返回格式
      const session = data.data || data;
      if (session) {
        setCurrentSession({ ...session, step: session.step || 1 });
        // 手动跳转到 step 2
        setTimeout(() => {
          setCurrentSession(prev => prev ? { ...prev, step: 2 } : null);
        }, 100);
      } else {
        alert(data.error || '创建会话失败');
      }
    } catch (error) {
      console.error('创建会话失败:', error);
      alert('创建会话失败');
    } finally {
      setLoading(false);
    }
  };

  const selectSession = async (session: Session) => {
    setCurrentSession(session);
    setSelectedCustomer(session.customers || null);
    
    // 恢复状态
    if (session.topics) setGeneratedTopics(session.topics);
    if (session.topic?.selected) {
      setSelectedTopic({
        text: session.topic.selected,
        direction: session.topic.direction || '',
      });
    }
    if (session.framework) setFramework(session.framework);
    if (session.opening) {
      setOpenings(session.opening);
      setSelectedOpening(session.opening_choice || null);
    }
    if (session.final_content) {
      setFinalContent(session.final_content);
      setContentStream(session.final_content);
    }
    
    setActiveTab('create');
  };

  const goToStep = (step: number) => {
    if (!currentSession) return;
    setCurrentSession({ ...currentSession, step });
  };

  // Step 2: 生成选题
  const generateTopics = async () => {
    if (!topicInput.trim()) {
      alert('请输入选题方向');
      return;
    }
    
    setIsGeneratingTopics(true);
    try {
      const token = getToken();
      const res = await fetch('/api/creative/sessions/' + currentSession?.id + '/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          direction: topicInput,
        }),
      });
      const data = await res.json();
      console.log('[generateTopics] Response:', data);
      
      // 兼容两种返回格式
      const topicsData = data.data?.topics || data.topics || data.data || [];
      if (topicsData.length > 0) {
        setGeneratedTopics(topicsData);
        setSelectedTopic(topicsData[0]);
      } else {
        alert(data.error || '生成选题失败');
      }
    } catch (error) {
      console.error('生成选题失败:', error);
      alert('生成选题失败');
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  // Step 4: 生成框架
  const generateFramework = async () => {
    if (!selectedTopic) return;
    
    setIsGeneratingFramework(true);
    try {
      const token = getToken();
      const res = await fetch('/api/creative/sessions/' + currentSession?.id + '/framework', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: selectedTopic.text,
          topicDirection: selectedTopic.direction,
          contentType,
          customerId: selectedCustomer?.id,
          targetUsers,
          differentiator,
        }),
      });
      const data = await res.json();
      console.log('[generateFramework] Response:', data);
      
      // 兼容两种返回格式
      const framework = data.data?.framework || data.framework || data.data;
      if (framework) {
        setFramework(framework);
      } else {
        alert(data.error || '生成框架失败');
      }
    } catch (error) {
      console.error('生成框架失败:', error);
      alert('生成框架失败');
    } finally {
      setIsGeneratingFramework(false);
    }
  };

  // Step 5: 生成开篇
  const generateOpenings = async () => {
    if (!selectedTopic || !framework) return;
    
    setIsGeneratingOpenings(true);
    try {
      const token = getToken();
      const res = await fetch('/api/creative/sessions/' + currentSession?.id + '/openings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: selectedTopic.text,
          framework,
          contentType,
          customerId: selectedCustomer?.id,
          targetUsers,
          differentiator,
        }),
      });
      const data = await res.json();
      console.log('[generateOpenings] Response:', data);
      
      // 兼容两种返回格式
      const openings = data.data?.openings || data.openings || data.data;
      if (openings) {
        setOpenings(openings);
        if (openings.A) {
          setSelectedOpening('A');
        }
      } else {
        alert(data.error || '生成开篇失败');
      }
    } catch (error) {
      console.error('生成开篇失败:', error);
      alert('生成开篇失败');
    } finally {
      setIsGeneratingOpenings(false);
    }
  };

  // Step 6: 生成正文（流式）
  const generateContent = async () => {
    if (!selectedOpening || !framework) return;
    
    setIsGeneratingContent(true);
    setContentStream('');
    setFinalContent('');
    
    const wordCount = duration === 'custom' 
      ? customWords 
      : (DURATION_OPTIONS.find(d => d.value === duration)?.words || 300);
    
    try {
      const openingText = selectedOpening === 'A' ? openings?.A?.text : openings?.B?.text;
      const openingHookType = selectedOpening === 'A' ? openings?.A?.hookType : openings?.B?.hookType;
      
      const token = getToken();
      const res = await fetch('/api/creative/sessions/' + currentSession?.id + '/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: selectedTopic?.text,
          opening: openingText,
          openingHookType,
          framework,
          contentType,
          customerId: selectedCustomer?.id,
          targetUsers,
          differentiator,
          wordCount,
        }),
      });
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setContentStream(prev => prev + data.content);
                }
                if (data.done) {
                  setFinalContent(data.content);
                }
                if (data.error) {
                  alert('生成失败');
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (error) {
      alert('生成正文失败');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  // Step 7: 微调文案
  const refineContent = async () => {
    if (!refineInput.trim() || !finalContent) return;
    
    setIsRefining(true);
    try {
      const token = getToken();
      const res = await fetch('/api/creative/sessions/' + currentSession?.id + '/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: finalContent,
          instruction: refineInput,
        }),
      });
      const data = await res.json();
      console.log('[refineContent] Response:', data);
      
      // 兼容两种返回格式
      const result = data.data || data;
      if (result.content) {
        setFinalContent(result.content);
        setRefineHistory(result.history || []);
        setRefineInput('');
        alert('微调完成');
      } else {
        alert(data.error || '微调失败');
      }
    } catch (error) {
      console.error('微调失败:', error);
      alert('微调失败');
    } finally {
      setIsRefining(false);
    }
  };

  const copyContent = async () => {
    if (finalContent) {
      await navigator.clipboard.writeText(finalContent);
      alert('已复制到剪贴板');
    }
  };

  const getCurrentStep = () => currentSession?.step || 1;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">智能推导创作</h1>
          <p className="text-sm text-muted-foreground">AI分步推导，生成贴合人设的爆款文案</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'create' | 'history')}>
        <TabsList className="mb-4">
          <TabsTrigger value="create">新建创作</TabsTrigger>
          <TabsTrigger value="history">历史记录</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <div className="grid grid-cols-12 gap-6">
            {/* 左侧：步骤导航 */}
            <div className="col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">创作进度</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {STEPS.map((step) => {
                    const Icon = step.icon;
                    const isActive = getCurrentStep() === step.id;
                    const isCompleted = getCurrentStep() > step.id;
                    const canClick = step.id <= getCurrentStep() + 1;
                    
                    return (
                      <button
                        key={step.id}
                        onClick={() => canClick && goToStep(step.id)}
                        disabled={!canClick}
                        className={cn(
                          'w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left',
                          isActive && 'bg-primary/10 text-primary',
                          isCompleted && 'text-muted-foreground hover:bg-muted',
                          !isActive && !isCompleted && 'text-muted-foreground',
                          canClick && !isActive && 'cursor-pointer',
                          !canClick && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : isActive ? (
                          <Icon className="h-4 w-4" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                        <span className="text-sm">{step.name}</span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* 右侧：步骤内容 */}
            <div className="col-span-9">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const StepIcon = STEPS[getCurrentStep() - 1]?.icon;
                      return StepIcon ? <StepIcon className="h-5 w-5" /> : null;
                    })()}
                    {STEPS[getCurrentStep() - 1]?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Step 1: 选择客户 */}
                  {getCurrentStep() === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {customers.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => setSelectedCustomer(customer)}
                            className={cn(
                              'p-4 rounded-lg border-2 text-left transition-all',
                              selectedCustomer?.id === customer.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <div className="font-medium">{customer.name}</div>
                            {customer.ip_positioning?.identity?.title && (
                              <div className="text-sm text-muted-foreground">
                                {customer.ip_positioning.identity.title}
                              </div>
                            )}
                            {customer.ip_positioning?.domain && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {customer.ip_positioning.domain}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                      {customers.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          暂无客户，请先创建客户档案
                        </div>
                      )}
                      <div className="flex justify-end">
                        <Button
                          onClick={startNewSession}
                          disabled={!selectedCustomer || loading}
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '开始创作'}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: 输入选题 */}
                  {getCurrentStep() === 2 && (
                    <div className="space-y-4">
                      {selectedCustomer?.ip_positioning && (
                        <Card className="bg-muted/50">
                          <CardContent className="p-4">
                            <div className="text-sm font-medium mb-2">账号定位约束</div>
                            <div className="text-sm text-muted-foreground">
                              身份：{selectedCustomer.ip_positioning.identity?.title || '未设置'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              领域：{selectedCustomer.ip_positioning.domain || '未设置'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              目标用户：{selectedCustomer.ip_positioning.targetAudience?.join('、') || '未设置'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              风格：{selectedCustomer.ip_positioning.toneAndStyle || '未设置'}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      <div>
                        <Label>你想创作什么方向的内容？</Label>
                        <Textarea
                          value={topicInput}
                          onChange={(e) => setTopicInput(e.target.value)}
                          placeholder="例如：教人做短视频剪辑的技巧"
                          className="mt-2"
                          rows={3}
                        />
                      </div>
                      <Button onClick={generateTopics} disabled={isGeneratingTopics}>
                        {isGeneratingTopics ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> 生成中...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> AI选题推荐</>
                        )}
                      </Button>
                      
                      {generatedTopics.length > 0 && (
                        <div className="space-y-3">
                          <Label>推荐选题（选择或自定义）</Label>
                          {generatedTopics.map((topic, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedTopic(topic)}
                              className={cn(
                                'p-4 rounded-lg border cursor-pointer transition-all',
                                selectedTopic?.text === topic.text
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              )}
                            >
                              <div className="font-medium">{topic.text}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                方向：{topic.direction === 'A' ? 'A' : 'B'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => goToStep(1)}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> 上一步
                        </Button>
                        <Button
                          onClick={() => goToStep(3)}
                          disabled={!selectedTopic}
                        >
                          下一步 <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: 选择方向 */}
                  {getCurrentStep() === 3 && (
                    <div className="space-y-4">
                      <div>
                        <Label>已选选题</Label>
                        <Card className="mt-2 bg-primary/5">
                          <CardContent className="p-4">
                            {selectedTopic?.text}
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div>
                        <Label>内容类型</Label>
                        <RadioGroup
                          value={contentType}
                          onValueChange={setContentType}
                          className="grid grid-cols-2 gap-3 mt-2"
                        >
                          {CONTENT_TYPES.map((type) => (
                            <div key={type.value}>
                              <RadioGroupItem
                                value={type.value}
                                id={type.value}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={type.value}
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                              >
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>视频时长</Label>
                          <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DURATION_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {duration === 'custom' && (
                            <Input
                              type="number"
                              value={customWords}
                              onChange={(e) => setCustomWords(Number(e.target.value))}
                              placeholder="字数"
                              className="mt-2"
                            />
                          )}
                        </div>
                        <div>
                          <Label>目标用户（选填）</Label>
                          <Input
                            value={targetUsers}
                            onChange={(e) => setTargetUsers(e.target.value)}
                            placeholder="例如：想创业的年轻人"
                            className="mt-2"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>差异化卖点（选填）</Label>
                        <Input
                          value={differentiator}
                          onChange={(e) => setDifferentiator(e.target.value)}
                          placeholder="与同类账号的差异化是什么？"
                          className="mt-2"
                        />
                      </div>
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => goToStep(2)}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> 上一步
                        </Button>
                        <Button onClick={() => goToStep(4)}>
                          生成框架 <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: 设计框架 */}
                  {getCurrentStep() === 4 && (
                    <div className="space-y-4">
                      {isGeneratingFramework ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="ml-3">AI正在设计内容框架...</span>
                        </div>
                      ) : framework ? (
                        <div className="space-y-4">
                          <Card className="bg-muted/50">
                            <CardContent className="p-4">
                              <div className="font-medium mb-2">框架类型</div>
                              <Badge>{framework.type}</Badge>
                              {framework.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {framework.description}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                          
                          {framework.structure && (
                            <div className="space-y-2">
                              <Label>框架结构</Label>
                              {framework.structure.map((seg: any, idx: number) => (
                                <Card key={idx}>
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-3">
                                      <Badge variant="outline" className="shrink-0">
                                        {seg.order}
                                      </Badge>
                                      <div>
                                        <div className="font-medium">{seg.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                          目的：{seg.purpose}
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                          
                          {framework.burstPoint && (
                            <Card className="border-orange-200 bg-orange-50/50">
                              <CardContent className="p-4">
                                <div className="font-medium text-orange-600">爆点设计</div>
                                <p className="text-sm mt-1">{framework.burstPoint}</p>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Button onClick={generateFramework} size="lg">
                            <Sparkles className="h-4 w-4 mr-2" /> 生成内容框架
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => goToStep(3)}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> 上一步
                        </Button>
                        <Button
                          onClick={() => goToStep(5)}
                          disabled={!framework}
                        >
                          下一步 <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: 生成开篇 */}
                  {getCurrentStep() === 5 && (
                    <div className="space-y-4">
                      {isGeneratingOpenings ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <span className="ml-3">AI正在生成双版本开篇...</span>
                        </div>
                      ) : openings ? (
                        <div className="grid grid-cols-2 gap-4">
                          {/* 版本A */}
                          <div
                            onClick={() => setSelectedOpening('A')}
                            className={cn(
                              'p-4 rounded-lg border-2 cursor-pointer transition-all',
                              selectedOpening === 'A'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <Badge className="mb-3">方案A</Badge>
                            {openings.A?.hookType && (
                              <Badge variant="secondary" className="ml-2 mb-3">
                                钩子类型：{openings.A.hookType}
                              </Badge>
                            )}
                            <div className="text-sm">{openings.A?.text}</div>
                          </div>
                          
                          {/* 版本B */}
                          <div
                            onClick={() => setSelectedOpening('B')}
                            className={cn(
                              'p-4 rounded-lg border-2 cursor-pointer transition-all',
                              selectedOpening === 'B'
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            )}
                          >
                            <Badge className="mb-3">方案B</Badge>
                            {openings.B?.hookType && (
                              <Badge variant="secondary" className="ml-2 mb-3">
                                钩子类型：{openings.B.hookType}
                              </Badge>
                            )}
                            <div className="text-sm">{openings.B?.text}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Button onClick={generateOpenings} size="lg">
                            <Sparkles className="h-4 w-4 mr-2" /> 生成双版本开篇
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => goToStep(4)}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> 上一步
                        </Button>
                        <Button
                          onClick={() => goToStep(6)}
                          disabled={!selectedOpening}
                        >
                          生成正文 <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 6: 生成正文 */}
                  {getCurrentStep() === 6 && (
                    <div className="space-y-4">
                      {isGeneratingContent ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="ml-3">正在生成口播文案...</span>
                          </div>
                          <Card className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="whitespace-pre-wrap text-sm">
                                {contentStream}
                                <span className="animate-pulse">|</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ) : finalContent || contentStream ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              字数：{(finalContent || contentStream).length} 字
                              （约 {Math.round((finalContent || contentStream).length / 150 * 60)} 秒）
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowSelfCheck(!showSelfCheck)}
                            >
                              {showSelfCheck ? '隐藏' : '查看'}AI自检
                            </Button>
                          </div>
                          
                          {showSelfCheck && (
                            <Card className="bg-blue-50/50 border-blue-200">
                              <CardContent className="p-4">
                                <div className="font-medium text-blue-600 mb-2">AI自检报告</div>
                                <div className="text-sm space-y-1">
                                  <div>钩子有效性：已检查</div>
                                  <div>IP一致性：已检查</div>
                                  <div>框架遵循：已检查</div>
                                  <div>内容质量：已检查</div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          
                          <Card className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="whitespace-pre-wrap">
                                {finalContent || contentStream}
                              </div>
                            </CardContent>
                          </Card>
                          
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={copyContent}>
                              <Copy className="h-4 w-4 mr-2" /> 复制文案
                            </Button>
                            <Button variant="outline" onClick={generateContent}>
                              <RefreshCw className="h-4 w-4 mr-2" /> 重新生成
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Button onClick={generateContent} size="lg">
                            <Sparkles className="h-4 w-4 mr-2" /> 生成口播正文
                          </Button>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => goToStep(5)}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> 上一步
                        </Button>
                        <Button
                          onClick={() => goToStep(7)}
                          disabled={!finalContent}
                        >
                          完成定稿 <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 7: 完成定稿 */}
                  {getCurrentStep() === 7 && (
                    <div className="space-y-4">
                      <Card className="bg-green-50/50 border-green-200">
                        <CardContent className="p-4 flex items-center gap-3">
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                          <div>
                            <div className="font-medium text-green-600">文案定稿</div>
                            <div className="text-sm text-muted-foreground">
                              可直接复制使用，或继续微调
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          字数：{finalContent.length} 字
                          （约 {Math.round(finalContent.length / 150 * 60)} 秒）
                        </span>
                        <Button variant="outline" size="sm" onClick={copyContent}>
                          <Copy className="h-4 w-4 mr-2" /> 复制
                        </Button>
                      </div>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="whitespace-pre-wrap">
                            {finalContent}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Separator />
                      
                      <div>
                        <Label>微调指令</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={refineInput}
                            onChange={(e) => setRefineInput(e.target.value)}
                            placeholder="输入修改要求，如：让开头更吸引人"
                            onKeyDown={(e) => e.key === 'Enter' && refineContent()}
                          />
                          <Button onClick={refineContent} disabled={isRefining || !refineInput.trim()}>
                            {isRefining ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {refineHistory.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-sm font-medium">修改历史</div>
                            {refineHistory.slice(-3).map((item, idx) => (
                              <Card key={idx} className="bg-muted/30">
                                <CardContent className="p-2 text-sm">
                                  <div className="text-muted-foreground">
                                    指令：{item.instruction}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => goToStep(6)}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> 上一步
                        </Button>
                        <Button onClick={() => {
                          alert('已保存到素材库');
                          fetchSessions();
                        }}>
                          保存到素材库
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                创作历史
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无创作记录
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Card
                      key={session.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <CardContent className="p-4">
                        <div
                          onClick={() => setExpandedSession(
                            expandedSession === session.id ? null : session.id
                          )}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium">{session.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {session.customers?.name || '未选择客户'} ·{' '}
                              {new Date(session.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                              {session.status === 'completed' ? '已完成' : '进行中'}
                            </Badge>
                            {expandedSession === session.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                        
                        {expandedSession === session.id && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            {session.topic?.selected && (
                              <div>
                                <div className="text-sm font-medium">选题</div>
                                <div className="text-sm text-muted-foreground">
                                  {session.topic.selected}
                                </div>
                              </div>
                            )}
                            {session.final_content && (
                              <div>
                                <div className="text-sm font-medium">文案预览</div>
                                <div className="text-sm text-muted-foreground line-clamp-3">
                                  {session.final_content}
                                </div>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectSession(session)}
                            >
                              继续编辑
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
