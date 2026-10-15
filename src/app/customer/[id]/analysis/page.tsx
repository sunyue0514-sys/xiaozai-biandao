'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  User,
  Target,
  Briefcase,
  TrendingUp,
  Heart,
  CheckCircle2,
  Building2,
  Users,
  DollarSign,
  Lightbulb,
  Wand2,
  Info,
  Edit,
  Save,
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';

// 步骤定义
const STEPS = [
  { id: 1, title: '基础信息', icon: User, description: '客户基本身份信息' },
  { id: 2, title: '行业背景', icon: Building2, description: '行业现状与竞争分析' },
  { id: 3, title: '目标用户', icon: Users, description: '目标用户画像分析' },
  { id: 4, title: '产品服务', icon: Briefcase, description: '产品与服务规划' },
  { id: 5, title: '变现目标', icon: DollarSign, description: '变现路径与目标' },
  { id: 6, title: 'AI分析', icon: Sparkles, description: 'AI生成商业定位报告' },
];

// 行业选项
const INDUSTRIES = [
  '教育培训', '餐饮美食', '服装时尚', '美容美妆', '健身运动',
  '房产家居', '汽车服务', '医疗健康', '法律服务', '财税服务',
  'IT互联网', '电商零售', '母婴亲子', '宠物服务', '旅游出行',
  '摄影摄像', '婚庆服务', '文化娱乐', '金融服务', '咨询服务',
  '其他'
];

// 平台选项
const PLATFORMS = ['抖音', '快手', '小红书', '视频号', 'B站', '微博'];

// 年龄范围选项
const AGE_RANGES = ['18岁以下', '18-25岁', '25-35岁', '35-45岁', '45-55岁', '55岁以上'];

// 性别选项
const GENDERS = ['男', '女'];

// 从业年限选项
const YEARS_IN_BUSINESS = ['1年以下', '1-3年', '3-5年', '5-10年', '10年以上'];

// 收入水平选项
const INCOME_LEVELS = ['3000以下', '3000-5000', '5000-10000', '10000-20000', '20000以上'];

// 变现方式选项
const MONETIZATION_MODES = ['知识付费', '电商带货', '广告合作', '直播打赏', '咨询服务', '线下引流', '品牌合作'];

export default function BusinessAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isEditingReport, setIsEditingReport] = useState(false); // 是否正在编辑报告
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    description: '',
  });

  // AI辅助填写相关状态
  const [isAiAssistDialogOpen, setIsAiAssistDialogOpen] = useState(false);
  const [aiAssistDescription, setAiAssistDescription] = useState('');
  const [isAiAssistGenerating, setIsAiAssistGenerating] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    // 基础信息
    contactPerson: '',
    phone: '',
    city: '',
    platforms: [] as string[],
    currentAccounts: '',
    
    // 行业背景
    industry: '',
    yearsInBusiness: [] as string[],
    competitors: '',
    industryAdvantages: '',
    industryChallenges: '',
    
    // 目标用户
    targetAgeRange: [] as string[],
    targetGender: [] as string[],
    targetOccupation: '',
    targetIncome: [] as string[],
    targetPainPoints: '',
    targetNeeds: '',
    
    // 产品服务
    mainProducts: '',
    serviceAreas: '',
    priceRange: '',
    uniqueValue: '',
    
    // 变现目标
    monetizationGoal: '',
    targetFollowers: '',
    targetRevenue: '',
    preferredMonetization: [] as string[],
  });

  useEffect(() => {
    // 加载客户基本信息
    loadCustomerInfo();
  }, [customerId]);

  const loadCustomerInfo = async () => {
    try {
      const token = getToken();
      const response = await fetch(`/api/customer/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.data) {
        const customer = data.data.find((c: { id: number; name: string; description: string }) => c.id.toString() === customerId);
        if (customer) {
          setCustomerInfo({
            name: customer.name,
            description: customer.description || '',
          });
        }
      }
    } catch (error) {
      console.error('Load customer info error:', error);
    }
  };

  const toggleArrayValue = (field: string, value: string) => {
    setFormData(prev => {
      const current = prev[field as keyof typeof prev] as string[];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: newValue };
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // AI辅助填写处理
  const handleAiAssistFill = async () => {
    if (!aiAssistDescription.trim()) {
      toast.error('请填写您的描述信息');
      return;
    }

    setIsAiAssistGenerating(true);
    try {
      const token = getToken();
      const response = await fetch('/api/ai/ai-assist-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId,
          userDescription: aiAssistDescription,
          mode: 'business-analysis', // 商业定位分析模式
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';
      let buffer = ''; // 添加缓冲区处理跨分片的JSON

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个可能不完整的行

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  throw new Error(data.error);
                }
                if (data.success && data.data) {
                  result = JSON.stringify(data.data);
                }
              } catch (parseError) {
                console.error('JSON parse error:', parseError, 'Line:', line.slice(6, 100));
              }
            }
          }
        }
        
        // 处理最后可能剩余的buffer
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.success && data.data) {
              result = JSON.stringify(data.data);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      if (result) {
        const data = JSON.parse(result);
        
        // 填充表单数据
        if (data.formData) {
          setFormData({
            contactPerson: data.formData.contactPerson || '',
            phone: data.formData.phone || '',
            city: data.formData.city || '',
            platforms: Array.isArray(data.formData.platforms) ? data.formData.platforms : [],
            currentAccounts: data.formData.currentAccounts || '',
            industry: data.formData.industry || '',
            yearsInBusiness: Array.isArray(data.formData.yearsInBusiness) ? data.formData.yearsInBusiness : [],
            competitors: data.formData.competitors || '',
            industryAdvantages: data.formData.industryAdvantages || '',
            industryChallenges: data.formData.industryChallenges || '',
            targetAgeRange: Array.isArray(data.formData.targetAgeRange) ? data.formData.targetAgeRange : [],
            targetGender: Array.isArray(data.formData.targetGender) ? data.formData.targetGender : [],
            targetOccupation: data.formData.targetOccupation || '',
            targetIncome: Array.isArray(data.formData.targetIncome) ? data.formData.targetIncome : [],
            targetPainPoints: data.formData.targetPainPoints || '',
            targetNeeds: data.formData.targetNeeds || '',
            mainProducts: data.formData.mainProducts || '',
            serviceAreas: data.formData.serviceAreas || '',
            priceRange: data.formData.priceRange || '',
            uniqueValue: data.formData.uniqueValue || '',
            monetizationGoal: data.formData.monetizationGoal || '',
            targetFollowers: data.formData.targetFollowers || '',
            targetRevenue: data.formData.targetRevenue || '',
            preferredMonetization: Array.isArray(data.formData.preferredMonetization) ? data.formData.preferredMonetization : [],
          });
        }
        
        // 设置分析报告
        if (data.analysisReport) {
          setAnalysisResult(data.analysisReport);
        }
        
        // 关闭对话框
        setIsAiAssistDialogOpen(false);
        setAiAssistDescription('');
        
        // 跳转到最后一步让用户确认
        setCurrentStep(6);
        
        toast.success('AI辅助填写完成，请确认信息后保存');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI辅助填写失败';
      toast.error(errorMessage);
    } finally {
      setIsAiAssistGenerating(false);
    }
  };

  // 快捷键提交
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAiAssistFill();
    }
  };

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult('');

    try {
      const token = getToken();
      
      // 检查客户信息是否已加载
      if (!customerId || !customerInfo.name) {
        toast.error('客户信息未加载，请刷新页面重试');
        setIsAnalyzing(false);
        return;
      }
      
      // 构建分析请求
      const response = await fetch('/api/ai/business-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId,
          customerName: customerInfo.name,
          customerDescription: customerInfo.description,
          formData: {
            ...formData,
            // 将数组转换为字符串用于AI分析
            yearsInBusiness: formData.yearsInBusiness.join('、') || '未选择',
            targetAgeRange: formData.targetAgeRange.join('、') || '未选择',
            targetGender: formData.targetGender.join('、') || '不限',
            targetIncome: formData.targetIncome.join('、') || '未选择',
            platforms: formData.platforms.join('、') || '未选择',
            preferredMonetization: formData.preferredMonetization.join('、') || '未选择',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分析请求失败');
      }

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
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setAnalysisResult(prev => prev + data.content);
                }
                if (data.done) {
                  toast.success('商业定位分析完成');
                }
                if (data.error) {
                  toast.error(data.error);
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      } else {
        toast.error('无法获取响应流');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : '分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComplete = async () => {
    if (!analysisResult) {
      toast.error('请先生成分析报告');
      return;
    }

    setIsAnalyzing(true);
    toast.loading('正在生成IP定位...');

    try {
      const token = getToken();
      
      // 调用AI生成IP定位
      const ipResponse = await fetch('/api/ai/ai-assist-fill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId,
          userDescription: `${customerInfo.description}\n\n商业定位分析：\n${analysisResult}`,
          mode: 'ip-positioning',
        }),
      });

      let ipPositioning = null;
      const reader = ipResponse.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; // 添加缓冲区处理跨分片的JSON

      if (reader) {
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个可能不完整的行

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.success && data.data?.ipPositioning) {
                  result = JSON.stringify(data.data.ipPositioning);
                }
              } catch (parseError) {
                console.error('JSON parse error:', parseError);
              }
            }
          }
        }
        
        // 处理最后可能剩余的buffer
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.success && data.data?.ipPositioning) {
              result = JSON.stringify(data.data.ipPositioning);
            }
          } catch {
            // 忽略解析错误
          }
        }
        
        if (result) {
          ipPositioning = result;
        }
      }

      toast.dismiss();
      
      // 保存商业定位分析数据和IP定位
      const response = await fetch('/api/customer/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: parseInt(customerId),
          name: customerInfo.name,
          description: customerInfo.description,
          businessAnalysis: analysisResult,
          businessFormData: JSON.stringify(formData),
          ipPositioning: ipPositioning,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('✨ 太棒了！商业定位已完成，可以开始选题创作了');
        router.push(`/customer/${customerId}`);
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">商业定位分析</h1>
            <p className="text-muted-foreground">
              {customerInfo.name} - 完善信息后AI将生成专业分析报告
            </p>
          </div>
        </div>

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        currentStep >= step.id
                          ? 'gradient-bg text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded ${
                        currentStep > step.id ? 'gradient-bg' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="min-h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const IconComponent = STEPS[currentStep - 1].icon;
                return IconComponent ? <IconComponent className="w-5 h-5 text-purple-600" /> : null;
              })()}
              {STEPS[currentStep - 1].title}
            </CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 1: 基础信息 */}
            {currentStep === 1 && (
              <>
                {/* AI辅助填写入口 */}
                <div className="mb-6 p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30">
                  <div className="flex items-start gap-3">
                    <Wand2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-purple-800 dark:text-purple-200">AI辅助填写</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                        简单描述您的身份、行业或想做的内容方向，AI会自动生成完整的商业定位信息
                      </p>
                      <Button
                        onClick={() => setIsAiAssistDialogOpen(true)}
                        className="mt-3 gradient-bg border-0"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        开始AI辅助填写
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">或手动填写以下信息</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>联系人</Label>
                    <Input
                      placeholder="请输入联系人姓名"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>联系电话</Label>
                    <Input
                      placeholder="请输入联系电话"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>所在城市</Label>
                    <Input
                      placeholder="请输入所在城市"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>现有账号粉丝数</Label>
                    <Input
                      placeholder="如有账号请填写粉丝数"
                      value={formData.currentAccounts}
                      onChange={(e) => setFormData({ ...formData, currentAccounts: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>运营平台（可多选）</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(platform => (
                      <Badge
                        key={platform}
                        variant={formData.platforms.includes(platform) ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          formData.platforms.includes(platform) ? 'gradient-bg border-0' : ''
                        }`}
                        onClick={() => toggleArrayValue('platforms', platform)}
                      >
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: 行业背景 */}
            {currentStep === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>所属行业</Label>
                    <div className="flex flex-wrap gap-2">
                      {INDUSTRIES.map(industry => (
                        <Badge
                          key={industry}
                          variant={formData.industry === industry ? 'default' : 'outline'}
                          className={`cursor-pointer ${
                            formData.industry === industry ? 'gradient-bg border-0' : ''
                          }`}
                          onClick={() => setFormData({ ...formData, industry })}
                        >
                          {industry}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>从业年限（可多选）</Label>
                  <div className="flex flex-wrap gap-2">
                    {YEARS_IN_BUSINESS.map(years => (
                      <Badge
                        key={years}
                        variant={formData.yearsInBusiness.includes(years) ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          formData.yearsInBusiness.includes(years) ? 'gradient-bg border-0' : ''
                        }`}
                        onClick={() => toggleArrayValue('yearsInBusiness', years)}
                      >
                        {years}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>主要竞争对手</Label>
                  <Textarea
                    placeholder="请描述您的主要竞争对手有哪些？他们的优势是什么？"
                    value={formData.competitors}
                    onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>行业优势</Label>
                  <Textarea
                    placeholder="您在行业中有什么独特优势？如资源、人脉、专业技能等"
                    value={formData.industryAdvantages}
                    onChange={(e) => setFormData({ ...formData, industryAdvantages: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>行业挑战</Label>
                  <Textarea
                    placeholder="您目前在行业中面临的主要挑战是什么？"
                    value={formData.industryChallenges}
                    onChange={(e) => setFormData({ ...formData, industryChallenges: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
              </>
            )}

            {/* Step 3: 目标用户 */}
            {currentStep === 3 && (
              <>
                <div className="space-y-2">
                  <Label>目标年龄（可多选）</Label>
                  <div className="flex flex-wrap gap-2">
                    {AGE_RANGES.map(age => (
                      <Badge
                        key={age}
                        variant={formData.targetAgeRange.includes(age) ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          formData.targetAgeRange.includes(age) ? 'gradient-bg border-0' : ''
                        }`}
                        onClick={() => toggleArrayValue('targetAgeRange', age)}
                      >
                        {age}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>目标性别（可多选）</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENDERS.map(gender => (
                      <Badge
                        key={gender}
                        variant={formData.targetGender.includes(gender) ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          formData.targetGender.includes(gender) ? 'gradient-bg border-0' : ''
                        }`}
                        onClick={() => toggleArrayValue('targetGender', gender)}
                      >
                        {gender}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>收入水平（可多选）</Label>
                  <div className="flex flex-wrap gap-2">
                    {INCOME_LEVELS.map(income => (
                      <Badge
                        key={income}
                        variant={formData.targetIncome.includes(income) ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          formData.targetIncome.includes(income) ? 'gradient-bg border-0' : ''
                        }`}
                        onClick={() => toggleArrayValue('targetIncome', income)}
                      >
                        {income}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>目标职业</Label>
                  <Input
                    placeholder="请输入目标用户职业，如：职场白领、宝妈、学生等"
                    value={formData.targetOccupation}
                    onChange={(e) => setFormData({ ...formData, targetOccupation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>用户痛点</Label>
                  <Textarea
                    placeholder="目标用户在您所在领域面临的主要痛点是什么？"
                    value={formData.targetPainPoints}
                    onChange={(e) => setFormData({ ...formData, targetPainPoints: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>用户需求</Label>
                  <Textarea
                    placeholder="目标用户最希望获得什么样的价值或解决什么问题？"
                    value={formData.targetNeeds}
                    onChange={(e) => setFormData({ ...formData, targetNeeds: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
              </>
            )}

            {/* Step 4: 产品服务 */}
            {currentStep === 4 && (
              <>
                <div className="space-y-2">
                  <Label>主要产品/服务</Label>
                  <Textarea
                    placeholder="请描述您的主要产品或服务是什么？"
                    value={formData.mainProducts}
                    onChange={(e) => setFormData({ ...formData, mainProducts: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>服务区域</Label>
                  <Input
                    placeholder="您的服务覆盖哪些区域？如：全国、某省、某市等"
                    value={formData.serviceAreas}
                    onChange={(e) => setFormData({ ...formData, serviceAreas: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>价格区间</Label>
                  <Input
                    placeholder="您的产品/服务价格区间是多少？如：99-999元"
                    value={formData.priceRange}
                    onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>核心卖点/差异化价值</Label>
                  <Textarea
                    placeholder="您的产品/服务有什么独特优势？与竞争对手相比有什么不同？"
                    value={formData.uniqueValue}
                    onChange={(e) => setFormData({ ...formData, uniqueValue: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>
              </>
            )}

            {/* Step 5: 变现目标 */}
            {currentStep === 5 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>目标粉丝数</Label>
                    <Input
                      placeholder="您希望达到多少粉丝？如：1万、10万"
                      value={formData.targetFollowers}
                      onChange={(e) => setFormData({ ...formData, targetFollowers: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>目标月收入</Label>
                    <Input
                      placeholder="您希望通过短视频实现多少月收入？"
                      value={formData.targetRevenue}
                      onChange={(e) => setFormData({ ...formData, targetRevenue: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>期望的变现方式（可多选）</Label>
                  <div className="flex flex-wrap gap-2">
                    {MONETIZATION_MODES.map(mode => (
                      <Badge
                        key={mode}
                        variant={formData.preferredMonetization.includes(mode) ? 'default' : 'outline'}
                        className={`cursor-pointer ${
                          formData.preferredMonetization.includes(mode) ? 'gradient-bg border-0' : ''
                        }`}
                        onClick={() => toggleArrayValue('preferredMonetization', mode)}
                      >
                        {mode}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>变现目标描述</Label>
                  <Textarea
                    placeholder="请详细描述您的变现目标和期望，如希望在多长时间内实现什么效果"
                    value={formData.monetizationGoal}
                    onChange={(e) => setFormData({ ...formData, monetizationGoal: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>
              </>
            )}

            {/* Step 6: AI分析 */}
            {currentStep === 6 && (
              <>
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">准备好生成分析报告</h3>
                  <p className="text-muted-foreground mb-6">
                    AI将根据您填写的信息，生成专业的商业定位分析报告
                  </p>
                  <Button
                    className="gradient-bg border-0 px-8"
                    onClick={handleAnalysis}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        AI分析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        开始AI分析
                      </>
                    )}
                  </Button>
                </div>

                {analysisResult && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>商业定位分析报告</Label>
                      {!isAnalyzing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (isEditingReport) {
                              // 保存编辑
                              setIsEditingReport(false);
                              toast.success('报告已更新');
                            } else {
                              // 进入编辑模式
                              setIsEditingReport(true);
                            }
                          }}
                        >
                          {isEditingReport ? (
                            <>
                              <Save className="w-4 h-4 mr-1" />
                              保存修改
                            </>
                          ) : (
                            <>
                              <Edit className="w-4 h-4 mr-1" />
                              编辑报告
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    {isEditingReport ? (
                      <Textarea
                        value={analysisResult}
                        onChange={(e) => setAnalysisResult(e.target.value)}
                        className="min-h-80 text-sm"
                        placeholder="商业定位分析报告..."
                      />
                    ) : (
                      <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
                        {analysisResult}
                        {isAnalyzing && (
                          <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                        )}
                      </div>
                    )}
                    {isEditingReport && (
                      <p className="text-xs text-muted-foreground">
                        提示：您可以直接编辑报告内容，点击&quot;保存修改&quot;后生效
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            上一步
          </Button>
          
          {currentStep < STEPS.length ? (
            <Button
              className="gradient-bg border-0"
              onClick={handleNext}
            >
              下一步
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="gradient-bg border-0"
              onClick={handleComplete}
              disabled={!analysisResult}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              完成并保存
            </Button>
          )}
        </div>
      </div>

      {/* AI辅助填写对话框 */}
      <Dialog open={isAiAssistDialogOpen} onOpenChange={setIsAiAssistDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              AI辅助填写
            </DialogTitle>
            <DialogDescription>
              简单描述您的信息，AI会自动生成完整的商业定位分析
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* 使用说明 */}
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
                  <p className="font-medium">使用说明</p>
                  <ul className="space-y-1 text-purple-700 dark:text-purple-300">
                    <li>• 简单描述您的身份、行业或想做的内容方向</li>
                    <li>• 可以包含您的经历、特长、目标等信息</li>
                    <li>• AI会根据您的描述自动生成完整的商业定位信息</li>
                    <li>• 生成后您可以继续编辑和修改内容</li>
                    <li>• 按 Ctrl/Cmd + Enter 快速提交</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* 输入区域 */}
            <div className="space-y-2">
              <Label htmlFor="ai-assist-input" className="text-sm font-medium">
                请描述您的信息
              </Label>
              <Textarea
                id="ai-assist-input"
                placeholder="例如：我是一名有10年经验的摄影师，主要做婚纱摄影和商业摄影，在长春有一家工作室，想通过短视频获取更多客户。我的风格偏自然唯美，擅长捕捉情感瞬间..."
                value={aiAssistDescription}
                onChange={(e) => setAiAssistDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[150px] resize-none"
                disabled={isAiAssistGenerating}
              />
              <p className="text-xs text-muted-foreground">
                提示：描述越详细，AI生成的定位越精准
              </p>
            </div>
            
            {/* 提交按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsAiAssistDialogOpen(false)}
                disabled={isAiAssistGenerating}
              >
                取消
              </Button>
              <Button
                onClick={handleAiAssistFill}
                disabled={isAiAssistGenerating || !aiAssistDescription.trim()}
                className="flex-1 gradient-bg border-0"
              >
                {isAiAssistGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始AI分析
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
