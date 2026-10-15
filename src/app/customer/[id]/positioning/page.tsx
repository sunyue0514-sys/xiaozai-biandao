'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  User,
  Heart,
  FileText,
  Target,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { CONTENT_STRATEGY_TYPES } from '@/lib/ip-positioning-config';
import { useKeyboardNavigation, VisuallyHidden, SkipLink, MainContent, Navigation, Landmark } from '@/components/ui/accessibility';

// 导入步骤组件
import {
  BasicInfoStep,
  CoreValueStep,
  LifeStoryStep,
  UserPersonaStep,
  ProductsServicesStep,
  ContentDirectionStep,
  AIReportsStep,
} from '@/components/ip-positioning/steps';

// 8步向导定义
const STEPS = [
  { id: 1, title: '个人基础信息', icon: User, description: '身份定位、性格特点、价值观' },
  { id: 2, title: '内核价值', icon: Heart, description: '兴趣爱好、技能点、擅长方向' },
  { id: 3, title: '人生经历', icon: TrendingUp, description: '至暗时刻、转折点、高光时刻' },
  { id: 4, title: '用户画像', icon: Target, description: '目标客户、需求痛点、发心' },
  { id: 5, title: '产品服务', icon: Briefcase, description: '产品类型、价格、核心卖点' },
  { id: 6, title: '内容方向', icon: FileText, description: '平台选择、内容主题、风格' },
  { id: 7, title: '确认信息', icon: CheckCircle2, description: '确认填写的信息是否正确' },
  { id: 8, title: '生成报告', icon: Sparkles, description: '商业定位与账号策划报告' },
];

// 表单数据类型
interface FormData {
  // Step 1: 个人基础信息
  basicInfo: {
    identity: string[];
    nickname: string;
    age: string;
    education: string;
    location: string;
    appearance: string;
    personality: string[];
    othersEvaluation: string;
    familyInfluence: string;
    values: {
      lifeView: string;
      careerView: string;
      marriageView: string;
    };
  };
  // Step 2: 内核价值
  coreValue: {
    interests: string[];
    skills: string[];
    specialties: string;
    passions: string;
    valueProvided: string;
  };
  // Step 3: 人生经历
  lifeStory: {
    recent10Years: string;
    darkestMoment: string;
    turningPoint: string;
    highlightMoment: string;
    motto: string;
  };
  // Step 4: 用户画像
  userPersona: {
    targetCustomers: string;
    painPoints: string;
    commonQuestions: string[];
    competitiveAdvantage: string;
    motivation: string;
  };
  // Step 5: 产品服务
  productsServices: {
    productTypes: string[];
    mainProducts: string;
    priceRange: string;
    serviceArea: string;
    uniqueValue: string;
  };
  // Step 6: 内容方向
  contentDirection: {
    platforms: string[];
    mainTopics: string[];
    contentStyle: string;
    updateFrequency: string;
  };
  // Step 7: 定位方向
  positioningDirection: {
    nicheField: string;
    contentTrack: string[];
    monetization: string[];
  };
  // Step 8: AI报告
  aiReports: {
    businessPositioning: string;
    accountPlanning: string;
    contentStrategy: typeof CONTENT_STRATEGY_TYPES;
  };
}

// 初始表单数据
const initialFormData: FormData = {
  basicInfo: {
    identity: [],
    nickname: '',
    age: '',
    education: '',
    location: '',
    appearance: '',
    personality: [],
    othersEvaluation: '',
    familyInfluence: '',
    values: {
      lifeView: '',
      careerView: '',
      marriageView: '',
    },
  },
  coreValue: {
    interests: [],
    skills: [],
    specialties: '',
    passions: '',
    valueProvided: '',
  },
  lifeStory: {
    recent10Years: '',
    darkestMoment: '',
    turningPoint: '',
    highlightMoment: '',
    motto: '',
  },
  userPersona: {
    targetCustomers: '',
    painPoints: '',
    commonQuestions: [],
    competitiveAdvantage: '',
    motivation: '',
  },
  productsServices: {
    productTypes: [],
    mainProducts: '',
    priceRange: '',
    serviceArea: '',
    uniqueValue: '',
  },
  contentDirection: {
    platforms: [],
    mainTopics: [],
    contentStyle: '',
    updateFrequency: '',
  },
  positioningDirection: {
    nicheField: '',
    contentTrack: [],
    monetization: [],
  },
  aiReports: {
    businessPositioning: '',
    accountPlanning: '',
    contentStrategy: CONTENT_STRATEGY_TYPES,
  },
};

export default function IPPositioningWizardPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // AI辅助填写相关状态
  const [isAiAssistDialogOpen, setIsAiAssistDialogOpen] = useState(false);
  const [aiAssistDescription, setAiAssistDescription] = useState('');
  const [isAiAssistGenerating, setIsAiAssistGenerating] = useState(false);
  const [showAiSuccessDialog, setShowAiSuccessDialog] = useState(false); // AI填写成功后的选择对话框

  useEffect(() => {
    loadCustomerInfo();
  }, [customerId]);

  // 加载客户完整信息（包括 businessFormData）
  const loadCustomerInfo = async () => {
    try {
      const token = getToken();
      const response = await fetch(`/api/customer/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.data) {
        const customer = data.data.find(
          (c: { id: number; name: string; description: string }) => c.id.toString() === customerId
        );
        if (customer) {
          setCustomerInfo({
            name: customer.name,
            description: customer.description || '',
          });
          
          console.log('📥 加载客户数据, businessFormData 存在:', !!customer.businessFormData);
          console.log('📥 加载客户数据, accountPlan 存在:', !!customer.accountPlan);
          
          // 优先从 businessFormData 恢复
          if (customer.businessFormData) {
            try {
              const parsed = JSON.parse(customer.businessFormData);
              console.log('📥 businessFormData 解析成功, aiReports.accountPlanning 存在:', !!parsed.aiReports?.accountPlanning);
              if (parsed.aiReports?.accountPlanning) {
                setFormData(prev => ({
                  ...prev,
                  aiReports: {
                    businessPositioning: parsed.aiReports.businessPositioning || prev.aiReports.businessPositioning,
                    accountPlanning: parsed.aiReports.accountPlanning,
                    contentStrategy: parsed.aiReports.contentStrategy || prev.aiReports.contentStrategy,
                  },
                }));
              }
            } catch (e) {
              console.error('📥 解析 businessFormData 失败:', e);
            }
          }
          // 如果 businessFormData 为空但有 accountPlan（旧的存储格式），也恢复
          else if (customer.accountPlan) {
            console.log('📥 从 accountPlan 恢复（旧格式）');
            setFormData(prev => ({
              ...prev,
              aiReports: {
                ...prev.aiReports,
                accountPlanning: customer.accountPlan,
              },
            }));
          }
        }
      }
    } catch (error) {
      console.error('Load customer info error:', error);
    }
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

  // 键盘导航支持 - 左右箭头键切换步骤
  useKeyboardNavigation({
    onArrowLeft: handleBack,
    onArrowRight: handleNext,
    onEscape: () => {
      // 如果对话框打开，关闭对话框
      if (isAiAssistDialogOpen) {
        setIsAiAssistDialogOpen(false);
      }
      if (showAiSuccessDialog) {
        setShowAiSuccessDialog(false);
      }
    },
  });

  // 用于聚焦主内容的 ref
  const mainContentRef = useRef<HTMLDivElement>(null);

  // AI辅助填写
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
          mode: 'ip-positioning-v2',
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
                // 如果是JSON解析错误，继续尝试下一个
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
        if (data.formData) {
          setFormData((prev) => ({ ...prev, ...data.formData }));
        }
        setIsAiAssistDialogOpen(false);
        setAiAssistDescription('');
        // 显示成功后的选择对话框
        setShowAiSuccessDialog(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI辅助填写失败';
      toast.error(errorMessage);
    } finally {
      setIsAiAssistGenerating(false);
    }
  };

  // 保存数据
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getToken();
      
      console.log('💾 保存数据...');
      
      // 构建IP定位数据 - 同时支持新旧格式
      const ipPositioning = {
        basicInfo: formData.basicInfo,
        coreValue: formData.coreValue,
        // 同时保存 lifeStory 和 lifeExperience 以兼容新旧代码
        lifeStory: formData.lifeStory,
        lifeExperience: {
          last10Years: formData.lifeStory.recent10Years,
          darkMoments: formData.lifeStory.darkestMoment,
          turningPoints: formData.lifeStory.turningPoint,
          highlights: formData.lifeStory.highlightMoment,
          motto: formData.lifeStory.motto,
        },
        userPersona: formData.userPersona,
        productsServices: formData.productsServices,
        contentDirection: formData.contentDirection,
        positioningDirection: formData.positioningDirection,
      };

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
          ipPositioning: JSON.stringify(ipPositioning),
          businessAnalysis: formData.aiReports?.businessPositioning,
          accountPlan: formData.aiReports?.accountPlanning,  // 映射到 API 字段名
          businessFormData: JSON.stringify(formData),
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('✨ 太棒了！IP定位已完成，可以开始选题创作了');
        router.push(`/customer/${customerId}`);
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  // 更新子步骤表单数据
  const updateFormData = <K extends keyof FormData>(step: K, data: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [step]: data }));
  };

  return (
    <DashboardLayout>
      {/* 跳过链接 - 允许键盘用户跳过导航 */}
      <SkipLink href="#wizard-main-content">跳到向导主内容</SkipLink>
      
      {/* 屏幕阅读器公告 */}
      <VisuallyHidden as="div">
        IP定位向导，共8个步骤。使用左右箭头键在步骤之间导航。
      </VisuallyHidden>
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            aria-label="返回上一页"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">IP定位向导</h1>
            <p className="text-muted-foreground">
              {customerInfo.name} - 完善信息后AI将生成专业定位报告
            </p>
          </div>
        </header>

        {/* AI辅助填写 - 苹果风格 */}
        <Card className="relative overflow-hidden border-border shadow-sm">
          <CardContent className="relative pt-6 pb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* 左侧图标区域 */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              
              {/* 中间文字区域 */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    AI一键智能填写
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
                    推荐
                  </span>
                </div>
                <p className="text-muted-foreground text-sm mb-3">
                  只需简单描述您的身份、行业、经历或想做的内容方向，AI会自动帮您填写完整信息
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-full">
                    节省时间
                  </span>
                  <span className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-full">
                    更精准
                  </span>
                  <span className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-full">
                    可编辑修改
                  </span>
                </div>
              </div>
              
              {/* 右侧按钮区域 */}
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white font-medium px-6"
                onClick={() => setIsAiAssistDialogOpen(true)}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                立即使用
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress - 苹果风格 */}
        {/* Progress - 苹果风格 */}
        <Card className="border-border/50" role="navigation" aria-label="向导步骤导航">
          <CardContent className="pt-6">
            <div 
              className="flex items-center justify-between mb-4 overflow-x-auto"
              role="list"
              aria-label={`当前在第${currentStep}步，共${STEPS.length}步`}
            >
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  role="listitem"
                  aria-current={currentStep === step.id ? 'step' : undefined}
                  className={`flex items-center ${index < STEPS.length - 1 ? 'flex-1' : ''} min-w-[80px]`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                        currentStep >= step.id
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                      aria-label={currentStep > step.id ? `${step.title}已完成` : currentStep === step.id ? `${step.title}当前步骤` : `${step.title}未完成`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <step.icon className="w-5 h-5" aria-hidden="true" />
                      )}
                    </div>
                    <span className="text-xs mt-1.5 text-center hidden sm:block font-medium">{step.title}</span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-200 ${
                        currentStep > step.id ? 'bg-primary' : 'bg-border'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
            <Progress 
              value={progress} 
              className="h-1.5 rounded-full" 
              aria-label={`进度：${Math.round(progress)}%`}
            />
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card 
          id="wizard-main-content"
          className="min-h-[500px] border-border/50"
          role="main"
          aria-label={`步骤${currentStep}：${STEPS[currentStep - 1].title}`}
          ref={mainContentRef}
          tabIndex={-1}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {(() => {
                const IconComponent = STEPS[currentStep - 1].icon;
                return IconComponent ? <IconComponent className="w-5 h-5 text-primary" aria-hidden="true" /> : null;
              })()}
              <span>{STEPS[currentStep - 1].title}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
          </CardHeader>
          <CardContent>
            {/* Step 1: 个人基础信息 */}
            {currentStep === 1 && (
              <BasicInfoStep
                formData={formData.basicInfo}
                setFormData={(data) => updateFormData('basicInfo', data)}
              />
            )}

            {/* Step 2: 内核价值 */}
            {currentStep === 2 && (
              <CoreValueStep
                formData={formData.coreValue}
                setFormData={(data) => updateFormData('coreValue', data)}
              />
            )}

            {/* Step 3: 人生经历 */}
            {currentStep === 3 && (
              <LifeStoryStep
                formData={formData.lifeStory}
                setFormData={(data) => updateFormData('lifeStory', data)}
              />
            )}

            {/* Step 4: 用户画像 */}
            {currentStep === 4 && (
              <UserPersonaStep
                formData={formData.userPersona}
                setFormData={(data) => updateFormData('userPersona', data)}
              />
            )}

            {/* Step 5: 产品服务 */}
            {currentStep === 5 && (
              <ProductsServicesStep
                formData={formData.productsServices}
                setFormData={(data) => updateFormData('productsServices', data)}
              />
            )}

            {/* Step 6: 内容方向 */}
            {currentStep === 6 && (
              <ContentDirectionStep
                formData={formData.contentDirection}
                setFormData={(data) => updateFormData('contentDirection', data)}
              />
            )}

            {/* Step 7: 定位方向 - 确认信息 */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium text-blue-800 dark:text-blue-200">
                          信息确认
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          请确认以下信息是否完整准确，点击「下一步」后将生成AI定位报告
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* 信息摘要 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 个人基础信息 */}
                  <Card className="p-4">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      个人基础信息
                    </h5>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>身份定位：{formData.basicInfo.identity?.join('、') || '未填写'}</p>
                      <p>昵称/人设：{formData.basicInfo.nickname || '未填写'}</p>
                      <p>性格特点：{formData.basicInfo.personality?.join('、') || '未填写'}</p>
                    </div>
                  </Card>
                  
                  {/* 内核价值 */}
                  <Card className="p-4">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-600" />
                      内核价值
                    </h5>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>兴趣爱好：{formData.coreValue.interests?.join('、') || '未填写'}</p>
                      <p>擅长技能：{formData.coreValue.skills?.join('、') || '未填写'}</p>
                      <p>专业特长：{formData.coreValue.specialties || '未填写'}</p>
                    </div>
                  </Card>
                  
                  {/* 人生经历 */}
                  <Card className="p-4">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      人生经历
                    </h5>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>近10年经历：{formData.lifeStory.recent10Years?.substring(0, 50) || '未填写'}...</p>
                      <p>转折点：{formData.lifeStory.turningPoint?.substring(0, 30) || '未填写'}...</p>
                    </div>
                  </Card>
                  
                  {/* 用户画像 */}
                  <Card className="p-4">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      用户画像
                    </h5>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>目标客户：{formData.userPersona.targetCustomers || '未填写'}</p>
                      <p>痛点需求：{formData.userPersona.painPoints?.substring(0, 30) || '未填写'}...</p>
                    </div>
                  </Card>
                  
                  {/* 产品服务 */}
                  <Card className="p-4">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-orange-600" />
                      产品服务
                    </h5>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>产品类型：{formData.productsServices.productTypes?.join('、') || '未填写'}</p>
                      <p>核心卖点：{formData.productsServices.uniqueValue?.substring(0, 30) || '未填写'}...</p>
                    </div>
                  </Card>
                  
                  {/* 内容方向 */}
                  <Card className="p-4">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      内容方向
                    </h5>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>平台选择：{formData.contentDirection.platforms?.join('、') || '未填写'}</p>
                      <p>内容主题：{formData.contentDirection.mainTopics?.join('、') || '未填写'}</p>
                      <p>内容风格：{formData.contentDirection.contentStyle || '未填写'}</p>
                    </div>
                  </Card>
                </div>
                
                <div className="text-center text-sm text-muted-foreground">
                  💡 如需修改信息，请点击「上一步」返回
                </div>
              </div>
            )}

            {/* Step 8: AI报告 */}
            {currentStep === 8 && (
              <AIReportsStep
                formData={formData.aiReports}
                setFormData={(data) => updateFormData('aiReports', data)}
                customerId={customerId}
                customerName={customerInfo.name}
                customerDescription={customerInfo.description}
                allFormData={formData}
              />
            )}

            {/* Navigation Buttons */}
            <div 
              className="flex justify-between mt-8 pt-4 border-t"
              role="navigation"
              aria-label="步骤导航按钮"
            >
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="gap-2 btn-focus"
                aria-label={`返回上一步，当前第${currentStep}步`}
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                上一步
              </Button>
              
              {currentStep < STEPS.length ? (
                <Button 
                  className="gradient-bg gap-2 btn-focus" 
                  onClick={handleNext}
                  aria-label={currentStep === 7 ? '生成AI报告并进入下一步' : `前进到第${currentStep + 1}步`}
                >
                  {currentStep === 7 ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" aria-hidden="true" />
                      生成AI报告
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      下一步
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="gradient-bg gap-2 btn-focus"
                  onClick={handleSave}
                  disabled={isSaving || !formData.aiReports.businessPositioning}
                  aria-label={isSaving ? '正在保存' : '完成并保存IP定位'}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                      完成并保存
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* AI辅助填写对话框 */}
        <Dialog open={isAiAssistDialogOpen} onOpenChange={setIsAiAssistDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" aria-describedby="ai-dialog-description">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center" aria-hidden="true">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                AI一键智能填写
              </DialogTitle>
              <DialogDescription id="ai-dialog-description" className="text-base pt-2">
                只需简单描述，AI会自动帮您填写完整的IP定位信息
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 -mr-2">
              {/* 提示卡片 */}
              <div className="bg-accent/50 rounded-xl p-4 border border-border">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  填写提示
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li>• <strong>身份定位</strong>：您目前的职业、角色是什么？</li>
                  <li>• <strong>行业经验</strong>：您有多少年经验？做过什么？</li>
                  <li>• <strong>专业技能</strong>：您擅长什么？有什么特长？</li>
                  <li>• <strong>目标方向</strong>：您想在哪个平台做什么内容？</li>
                  <li>• <strong>独特之处</strong>：您有什么与众不同的经历或优势？</li>
                </ul>
              </div>
              
              {/* 输入区域 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">请描述您的信息</label>
                <Textarea
                  placeholder="例如：我是一名有10年经验的职场培训师，专注于帮助职场新人成长。之前在教育行业工作过5年，后来转型做了企业培训。经历过创业失败，但也积累了丰富的人生经验。我希望在小红书分享职场成长的内容，帮助更多迷茫的年轻人找到方向..."
                  value={aiAssistDescription}
                  onChange={(e) => setAiAssistDescription(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  💬 描述越详细，AI生成的定位越精准。可以随时修改生成的内容。
                </p>
              </div>
              
              {/* 快捷示例 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">快捷示例（点击可填入）</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAiAssistDescription("我是一名摄影师，有8年婚纱摄影和商业摄影经验，在本地有一家工作室，想通过短视频获取更多客户。擅长自然唯美风格，注重情感捕捉。")}
                  >
                    📷 摄影师
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAiAssistDescription("我是全职妈妈，有一个3岁的宝宝。辞职前是互联网公司的产品经理，现在想分享育儿经验和亲子日常，希望能帮助新手妈妈们少走弯路。")}
                  >
                    👶 全职妈妈
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAiAssistDescription("我是健身教练，有6年私教经验，擅长减脂塑形。之前自己也是一个胖子，通过健身成功减重30斤，所以很理解学员的痛点。想分享健身知识和减肥经验。")}
                  >
                    💪 健身教练
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAiAssistDescription("我是心理咨询师，硕士学历，从业5年。专注于职场心理和情感咨询，想通过短视频科普心理学知识，帮助更多人了解自己、解决心理困扰。")}
                  >
                    🧠 心理咨询师
                  </Button>
                </div>
              </div>
            </div>
            
            {/* 操作按钮 - 固定在底部 */}
            <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
              <Button variant="outline" onClick={() => setIsAiAssistDialogOpen(false)}>
                取消
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-white"
                onClick={handleAiAssistFill}
                disabled={isAiAssistGenerating || !aiAssistDescription.trim()}
              >
                {isAiAssistGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI正在分析生成...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始AI生成
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI填写成功后的选择对话框 */}
        <Dialog open={showAiSuccessDialog} onOpenChange={setShowAiSuccessDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                AI辅助填写完成！
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                已为您自动填写所有信息，请选择下一步操作
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 pt-4">
              <Button
                className="w-full justify-start h-auto py-4 px-4"
                variant="outline"
                onClick={() => {
                  setShowAiSuccessDialog(false);
                  setCurrentStep(1);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">逐步确认信息</div>
                    <div className="text-xs text-muted-foreground">从第一步开始，逐步查看和修改AI填写的内容</div>
                  </div>
                </div>
              </Button>
              
              <Button
                className="w-full justify-start h-auto py-4 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                onClick={() => {
                  setShowAiSuccessDialog(false);
                  setCurrentStep(8); // 直接跳转到生成报告步骤
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">直接生成报告</div>
                    <div className="text-xs text-white/80">跳过确认，直接让AI生成定位分析和账号策划报告</div>
                  </div>
                </div>
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center pt-2">
              💡 生成报告后仍可返回修改任何信息
            </p>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
