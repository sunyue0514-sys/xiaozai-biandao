'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerationTip } from '@/components/ui/generation-tip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Target,
  User,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Sparkles,
  FileText,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  Video,
  Camera,
  Clock,
  ArrowRight,
  AlertCircle,
  Download,
  Copy,
  RefreshCw,
  Lightbulb,
  History,
  Eye,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { INDUSTRY_TEMPLATES } from '@/config/industry-templates';
import { SURVEY_QUESTIONS, SurveyQuestion } from '@/config/account-planning-survey';
import { exportAccountPlanToWord } from '@/lib/docx-export';
import {
  EXAMPLE_CUSTOMER,
  EXAMPLE_IP_POSITIONING,
  EXAMPLE_SURVEY_ANSWERS,
  EXAMPLE_PLAN_RESULT,
} from '@/config/account-planning-example';

interface Customer {
  id: number;
  uid: string;
  name: string;
  description: string;
  personaProfile: string | null;
  accountPlan: string | null;
  ipPositioning: string | null;
  createdAt: string;
  positioningCompleted?: boolean;
}

interface AccountPlanResult {
  accountSetup?: string;
  painPointSolutions?: string;
  firstWeekPlan?: string;
  contentTemplates?: string;
  engagementScripts?: string;
  conversionFlow?: string;
  liveStreamPlan?: string; // 可选：直播运营计划
  sensitiveWordsGuide?: string; // 可选：敏感词规避
  realisticGoals?: string;
}

// 骨架屏组件
function PageSkeleton() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AccountPlanningPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [step, setStep] = useState<'select' | 'survey' | 'generating' | 'result'>('select');
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [planResult, setPlanResult] = useState<AccountPlanResult | null>(null);
  const [ipPositioningData, setIpPositioningData] = useState<{
    industry?: string;
    summary?: string;
  } | null>(null);
  
  // 示例和历史记录状态
  const [showExample, setShowExample] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isExampleMode, setIsExampleMode] = useState(false); // 标记是否在查看示例
  const [historyList, setHistoryList] = useState<Array<{
    id: number;
    customerName: string;
    createdAt: string;
    planResult: AccountPlanResult;
  }>>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 加载客户列表
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      loadCustomers();
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const loadCustomers = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/customer/list', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        // 显示已完成定位的客户（positioningCompleted 或 ipPositioning 存在）
        const customersWithIp = (data.data || []).filter((c: Customer) => 
          c.positioningCompleted || c.ipPositioning
        );
        setCustomers(customersWithIp);
      }
    } catch (error) {
      console.error('加载客户失败:', error);
      toast.error('加载客户失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 加载历史记录
  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token = getToken();
      const response = await fetch('/api/account-planning/history', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data.data || []);
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 查看历史记录详情
  const handleViewHistory = (record: typeof historyList[0]) => {
    setSelectedCustomer({
      id: record.id,
      uid: '',
      name: record.customerName,
      description: '',
      personaProfile: null,
      accountPlan: null,
      ipPositioning: null,
      createdAt: record.createdAt,
    });
    setPlanResult(record.planResult);
    setStep('result');
    setShowHistory(false);
    setIsExampleMode(true); // 历史记录模式也标记为示例模式，返回时直接回到主页
  };

  // 查看示例
  const handleViewExample = () => {
    setSelectedCustomer(EXAMPLE_CUSTOMER as Customer);
    setIpPositioningData(EXAMPLE_IP_POSITIONING);
    setSurveyAnswers(EXAMPLE_SURVEY_ANSWERS);
    setPlanResult(EXAMPLE_PLAN_RESULT);
    setStep('result');
    setShowExample(false);
    setIsExampleMode(true);
  };

  // 选择客户
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    // 解析IP定位数据
    try {
      const ipData = JSON.parse(customer.ipPositioning || '{}');
      setIpPositioningData({
        industry: ipData.industry || ipData.行业 || '',
        summary: ipData.summary || ipData.定位摘要 || '',
      });
    } catch {
      setIpPositioningData(null);
    }
    setStep('survey');
    setIsExampleMode(false); // 正常流程重置示例模式标记
    // 初始化问卷答案
    const initialAnswers: Record<string, string> = {};
    SURVEY_QUESTIONS.forEach(q => {
      initialAnswers[q.id] = '';
    });
    setSurveyAnswers(initialAnswers);
  };

  // 更新问卷答案
  const handleAnswerChange = (questionId: string, value: string) => {
    setSurveyAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // 检查问卷是否完成
  const isSurveyComplete = () => {
    // 必填问题都填写了
    return SURVEY_QUESTIONS.filter(q => q.required).every(q => surveyAnswers[q.id]?.trim());
  };

  // 生成账号规划
  const handleGenerate = async () => {
    if (!selectedCustomer || !isSurveyComplete()) {
      toast.error('请填写必填问题');
      return;
    }

    setStep('generating');
    setIsGenerating(true);

    try {
      // 设置3分钟超时（账号规划生成需要较长时间）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000);

      const token = getToken();
      const response = await fetch('/api/account-planning/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          surveyAnswers,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '生成失败，请重试');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setPlanResult(data.data);
        setStep('result');
        toast.success('账号规划生成成功');
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (error: any) {
      console.error('生成账号规划失败:', error);
      if (error.name === 'AbortError') {
        toast.error('生成超时，请重试');
      } else {
        toast.error(error.message || '生成失败，请重试');
      }
      setStep('survey');
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制内容
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 导出为Word文档
  const handleExport = async () => {
    if (!planResult || !selectedCustomer) return;

    try {
      await exportAccountPlanToWord(planResult, selectedCustomer.name);
      toast.success('已导出Word文档');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    }
  };

  // 获取行业模板
  const getIndustryTemplate = () => {
    const industry = ipPositioningData?.industry || '';
    // 尝试匹配行业模板
    const templateKey = Object.keys(INDUSTRY_TEMPLATES).find(key => 
      industry.includes(key) || key.includes(industry)
    );
    return templateKey ? INDUSTRY_TEMPLATES[templateKey as keyof typeof INDUSTRY_TEMPLATES] : null;
  };

  if (isAuthLoading || isLoading) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (step === 'survey') {
                setStep('select');
                setSelectedCustomer(null);
                setIsExampleMode(false);
              } else if (step === 'result') {
                // 如果是示例模式或历史记录模式，直接返回选择客户页面
                if (isExampleMode) {
                  setStep('select');
                  setSelectedCustomer(null);
                  setPlanResult(null);
                  setIsExampleMode(false);
                } else {
                  setStep('survey');
                  setPlanResult(null);
                }
              } else {
                router.push('/customer');
              }
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">账号规划</h1>
            <p className="text-muted-foreground text-sm">
              基于客户档案和IP定位，生成详细运营方案
            </p>
          </div>
        </div>
        {/* 右侧按钮区域 */}
        <div className="flex gap-2">
          {step === 'select' && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowExample(true)}
                className="gap-1.5"
              >
                <Lightbulb className="w-4 h-4" />
                示例
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  loadHistory();
                  setShowHistory(true);
                }}
                className="gap-1.5"
              >
                <History className="w-4 h-4" />
                历史记录
              </Button>
            </>
          )}
          {step === 'result' && planResult && (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回主页
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(formatPlanResult(planResult))}>
                <Copy className="w-4 h-4 mr-1" />
                复制
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-1" />
                导出Word
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 步骤一：选择客户 */}
      {step === 'select' && (
        <div className="space-y-6">
          {/* 说明卡片 */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">什么是账号规划？</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    账号规划是基于客户档案和IP定位，结合行业特征和运营目标，生成的一套完整的短视频账号运营方案。
                    包含现状诊断、人设定位、内容策略、账号搭建、执行计划、转化路径和预期目标七大模块。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 客户列表 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">选择客户</h2>
            {customers.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">暂无已完成IP定位的客户</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    请先在客户管理中完成IP定位
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/customer')}
                  >
                    前往客户管理
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                      customer.accountPlan 
                        ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' 
                        : 'border-border/50'
                    }`}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
                            {customer.name.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{customer.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {customer.description || '暂无描述'}
                            </CardDescription>
                          </div>
                        </div>
                        {customer.accountPlan && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            已规划
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">IP定位已完成</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 步骤二：深度采集 */}
      {step === 'survey' && selectedCustomer && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：客户信息和行业模板 */}
          <div className="space-y-4">
            {/* 客户信息 */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">客户信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">客户名称</Label>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">客户描述</Label>
                  <p className="text-sm">{selectedCustomer.description || '暂无'}</p>
                </div>
                {ipPositioningData?.industry && (
                  <div>
                    <Label className="text-xs text-muted-foreground">所属行业</Label>
                    <p className="text-sm">{ipPositioningData.industry}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 行业模板 */}
            {getIndustryTemplate() && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    行业参考
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">内容敏感度</Label>
                    <p>{getIndustryTemplate()?.sensitivity === 'high' ? '高' : getIndustryTemplate()?.sensitivity === 'medium' ? '中' : '低'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">决策周期</Label>
                    <p>{getIndustryTemplate()?.decisionCycle === 'long' ? '长' : getIndustryTemplate()?.decisionCycle === 'medium' ? '中' : '短'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">内容配比</Label>
                    <p className="text-xs">
                      人设{getIndustryTemplate()?.contentRatio?.persona || 0}% / 
                      专业{getIndustryTemplate()?.contentRatio?.professional || 0}% / 
                      展示{getIndustryTemplate()?.contentRatio?.showcase || 0}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：问卷 */}
          <div className="lg:col-span-2">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">深度采集</CardTitle>
                <CardDescription>
                  请回答以下问题，帮助AI生成更精准的账号规划方案
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {SURVEY_QUESTIONS.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">
                        {question.title}
                      </Label>
                      {question.required && (
                        <span className="text-xs text-destructive">*</span>
                      )}
                    </div>
                    {question.description && (
                      <p className="text-xs text-muted-foreground">{question.description}</p>
                    )}
                    {question.type === 'text' ? (
                      <Textarea
                        placeholder={question.placeholder}
                        value={surveyAnswers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                    ) : question.type === 'number' ? (
                      <Input
                        type="number"
                        placeholder={question.placeholder}
                        value={surveyAnswers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      />
                    ) : question.type === 'single_select' && question.options ? (
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((option) => (
                          <Badge
                            key={option.value}
                            variant={surveyAnswers[question.id] === option.value ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => handleAnswerChange(question.id, option.value)}
                          >
                            {option.label}
                          </Badge>
                        ))}
                      </div>
                    ) : question.type === 'multi_select' && question.options ? (
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((option) => {
                          const currentValues = (surveyAnswers[question.id] || '').split(',').filter(Boolean);
                          const isSelected = currentValues.includes(option.value);
                          return (
                            <Badge
                              key={option.value}
                              variant={isSelected ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => {
                                const newValues = isSelected
                                  ? currentValues.filter(v => v !== option.value)
                                  : [...currentValues, option.value];
                                handleAnswerChange(question.id, newValues.join(','));
                              }}
                            >
                              {option.label}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}

                <div className="pt-4 flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    * 为必填项
                  </p>
                  <Button
                    onClick={handleGenerate}
                    disabled={!isSurveyComplete()}
                    className="bg-primary"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成规划方案
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 步骤三：生成中 */}
      {step === 'generating' && (
        <>
          <GenerationTip />
          <div className="flex items-center justify-center py-20">
            <Card className="border-border/50 w-full max-w-md">
              <CardContent className="pt-6 pb-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h3 className="font-medium text-lg mb-2">正在生成规划方案...</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  AI正在分析客户数据并生成详细的账号运营方案
                </p>
                <Progress value={66} className="h-2" />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 步骤四：结果展示 */}
      {step === 'result' && planResult && selectedCustomer && (
        <div className="space-y-6">
          {/* 成功提示 */}
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium">账号规划生成完成</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.name} 的运营方案已生成
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 规划内容 - 标签页结构 */}
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-transparent gap-2 p-0 h-auto">
              <TabsTrigger 
                value="account" 
                className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all duration-200"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">账号搭建</span>
              </TabsTrigger>
              <TabsTrigger 
                value="content" 
                className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all duration-200"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">内容规划</span>
              </TabsTrigger>
              <TabsTrigger 
                value="conversion" 
                className="flex items-center gap-1.5 bg-card border border-border rounded-xl px-4 py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary data-[state=active]:shadow-md transition-all duration-200"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">转化运营</span>
              </TabsTrigger>
            </TabsList>

            {/* 账号搭建 */}
            <TabsContent value="account" className="space-y-4">
              {planResult.accountSetup && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      账号搭建建议
                      <Badge variant="secondary" className="text-xs ml-auto">基于方案定制</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.accountSetup}
                    </div>
                  </CardContent>
                </Card>
              )}
              {planResult.realisticGoals && (
                <Card className="border-emerald-200 dark:border-emerald-900/50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-950/20 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                        <Target className="w-4 h-4 text-emerald-600" />
                      </div>
                      现实目标
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.realisticGoals}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 内容规划 */}
            <TabsContent value="content" className="space-y-4">
              {planResult.painPointSolutions && (
                <Card className="border-orange-200 dark:border-orange-900/50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/20 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      </div>
                      痛点解决方案
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.painPointSolutions}
                    </div>
                  </CardContent>
                </Card>
              )}
              {planResult.firstWeekPlan && (
                <Card className="border-blue-200 dark:border-blue-900/50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      第一周执行计划
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.firstWeekPlan}
                    </div>
                  </CardContent>
                </Card>
              )}
              {planResult.contentTemplates && (
                <Card className="border-purple-200 dark:border-purple-900/50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/20 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      内容模板
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.contentTemplates}
                    </div>
                  </CardContent>
                </Card>
              )}
              {planResult.sensitiveWordsGuide && (
                <Card className="border-red-200 dark:border-red-900/50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/20 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      </div>
                      敏感词规避
                      <Badge variant="destructive" className="text-xs ml-auto">重要</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.sensitiveWordsGuide}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 转化运营 */}
            <TabsContent value="conversion" className="space-y-4">
              {planResult.engagementScripts && (
                <Card className="border-cyan-200 dark:border-cyan-900/50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-transparent dark:from-cyan-950/20 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/30 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-cyan-600" />
                      </div>
                      互动话术
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.engagementScripts}
                    </div>
                  </CardContent>
                </Card>
              )}
              {planResult.conversionFlow && (
                <Card className="border-green-200 dark:border-green-900/50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      转化流程
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.conversionFlow}
                    </div>
                  </CardContent>
                </Card>
              )}
              {planResult.liveStreamPlan && (
                <Card className="border-pink-200 dark:border-pink-900/50">
                  <CardHeader className="pb-3 bg-gradient-to-r from-pink-50 to-transparent dark:from-pink-950/20 rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-950/30 flex items-center justify-center">
                        <Video className="w-4 h-4 text-pink-600" />
                      </div>
                      直播运营计划
                      <Badge variant="outline" className="text-xs ml-auto">有直播能力</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                      {planResult.liveStreamPlan}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

          </Tabs>

          {/* 操作按钮 */}
          <div className="flex justify-center gap-4 pt-4">
            <Button variant="outline" onClick={() => {
              setStep('survey');
              setPlanResult(null);
            }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重新生成
            </Button>
            <Button onClick={() => router.push(`/customer/${selectedCustomer.id}`)}>
              查看客户详情
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* 示例弹窗 */}
      <Dialog open={showExample} onOpenChange={setShowExample}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              查看示例效果
            </DialogTitle>
            <DialogDescription>
              以下是一个美妆博主账号规划的完整示例，帮助您了解生成效果
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">客户名称</p>
                <p className="font-medium">{EXAMPLE_CUSTOMER.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">客户描述</p>
                <p className="text-sm">{EXAMPLE_CUSTOMER.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">所属行业</p>
                <p className="text-sm">{EXAMPLE_IP_POSITIONING.industry}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IP定位</p>
                <p className="text-sm">{EXAMPLE_IP_POSITIONING.summary}</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>示例将展示完整的账号规划结果，包括：</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>账号搭建建议</li>
                <li>痛点解决方案</li>
                <li>第一周发布计划</li>
                <li>内容创作模板</li>
                <li>互动话术</li>
                <li>转化路径规划</li>
                <li>直播运营计划</li>
                <li>敏感词规避指南</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowExample(false)}>
              取消
            </Button>
            <Button onClick={handleViewExample} className="gap-1.5">
              <Eye className="w-4 h-4" />
              查看完整示例
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 历史记录弹窗 */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              历史记录
            </DialogTitle>
            <DialogDescription>
              查看之前生成的账号规划记录
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无历史记录</p>
                <p className="text-xs mt-1">生成账号规划后将在此显示</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyList.map((record) => (
                  <Card 
                    key={record.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleViewHistory(record)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{record.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {record.planResult.accountSetup ? '完整规划' : '基础规划'}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 格式化账号规划为可读文本
function formatPlanResult(planResult: AccountPlanResult): string {
  const sections: string[] = [];
  
  const sectionTitles: Record<keyof AccountPlanResult, string> = {
    accountSetup: '【账号搭建建议】',
    painPointSolutions: '【痛点解决方案】',
    firstWeekPlan: '【第一周执行计划】',
    contentTemplates: '【内容模板】',
    engagementScripts: '【互动话术】',
    conversionFlow: '【转化流程】',
    liveStreamPlan: '【直播运营计划】',
    sensitiveWordsGuide: '【敏感词规避指南】',
    realisticGoals: '【现实目标】',
  };
  
  for (const [key, title] of Object.entries(sectionTitles)) {
    const content = planResult[key as keyof AccountPlanResult];
    if (content) {
      sections.push(`${title}\n${content}`);
    }
  }
  
  return sections.join('\n\n' + '─'.repeat(40) + '\n\n');
}

// 辅助函数
function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('已复制到剪贴板');
}
