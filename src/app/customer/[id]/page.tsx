'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  Target,
  Heart,
  FileText,
  Lightbulb,
  Sparkles,
  Loader2,
  Edit,
  Download,
  Briefcase,
  Users,
  TrendingUp,
  Award,
  Zap,
  Copy,
  CheckCircle,
  Wand2,
  Info,
  Home,
  Video,
  FileDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';

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
  humanize: '口语化处理',
  opening: '开场白',
  benchmark: '对标分析',
  'account-analysis': '账号分析',
  'banned-words': '违禁词检测',
};

// 脚本类型中文映射
const SCRIPT_TYPE_NAMES: Record<string, string> = {
  story: '讲故事',
  process: '晒过程',
  knowledge: '教知识',
  opinion: '说观点',
  product: '说产品',
  writing: '文案创作',
  dialogue: '对话流',
  interview: '采访',
  review: '测评',
  tutorial: '教程',
  vlog: '生活记录',
};

// IP定位数据结构 - 与定位页面表单保持一致
interface IPPositioning {
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
    values?: {
      lifeView: string;
      careerView: string;
      marriageView: string;
    };
  };
  coreValue: {
    interests: string[];
    skills: string[];
    specialties: string; // 字符串，不是数组
    passions: string;
    valueProvided: string;
  };
  lifeStory?: { // 注意：是lifeStory，不是lifeExperience
    recent10Years: string;
    darkestMoment: string;
    turningPoint: string;
    highlightMoment: string;
    motto: string;
  };
  lifeExperience?: { // 兼容旧数据
    last10Years: string;
    darkMoments?: string;
    turningPoints?: string;
    highlights?: string;
    motto?: string;
  };
  positioningDirection?: {
    nicheField: string;
    contentTrack: string[];
    monetization: string[];
  };
  userPersona?: {
    targetCustomers: string; // 注意：是targetCustomers
    painPoints: string; // 注意：是painPoints
    commonQuestions: string[];
    competitiveAdvantage: string;
    motivation?: string;
    // 兼容旧字段
    targetUsers?: string;
    userPainPoints?: string;
  };
  productsServices?: {
    productTypes: string[];
    mainProducts: string;
    priceRange: string;
    serviceArea: string;
    uniqueValue: string;
    // 兼容旧字段
    products?: string[];
    services?: string[];
  };
  contentDirection?: {
    platforms: string[];
    mainTopics: string[];
    contentStyle: string;
    updateFrequency: string;
  };
  // 商业定位报告
  businessPositioning?: string;
}

interface AccountPlan {
  // 新格式：markdown 字符串
  plan?: string;
  // 旧格式：结构化对象
  platform?: string;
  accountName?: string;
  positioning?: string;
  contentDirection?: string[];
  postingSchedule?: string;
  goals?: string[];
  kpis?: string[];
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  
  const [positioning, setPositioning] = useState<IPPositioning | null>(null);
  const [accountPlan, setAccountPlan] = useState<AccountPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [streamingContent, setStreamingContent] = useState(''); // 流式生成的内容
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    description: '',
  });
  const [editForm, setEditForm] = useState({
    // 客户基本信息
    name: '',
    description: '',
    // IP定位 - 基本信息
    identity: '',
    nickname: '',
    age: '',
    education: '',
    location: '',
    appearance: '',
    personality: '',
    othersEvaluation: '',
    familyInfluence: '',
    lifeView: '',
    careerView: '',
    marriageView: '',
    // IP定位 - 核心价值
    interests: '',
    skills: '',
    specialties: '',
    passions: '',
    valueProvided: '',
    // IP定位 - 人生故事
    recent10Years: '',
    darkestMoment: '',
    turningPoint: '',
    highlightMoment: '',
    motto: '',
    // IP定位 - 定位方向
    nicheField: '',
    contentTrack: '',
    monetization: '',
    // IP定位 - 用户画像
    targetCustomers: '',
    painPoints: '',
    commonQuestions: '',
    competitiveAdvantage: '',
    motivation: '',
    // IP定位 - 产品服务
    productTypes: '',
    mainProducts: '',
    priceRange: '',
    serviceArea: '',
    uniqueValue: '',
    // IP定位 - 内容方向
    platforms: '',
    mainTopics: '',
    contentStyle: '',
    updateFrequency: '',
  });
  const [generateForm, setGenerateForm] = useState({
    name: '',
    industry: '综合',
    description: '',
  });
  const [planForm, setPlanForm] = useState({
    platform: '抖音',
    accountName: '',
    targetFollowers: '',
  });
  const [activeTab, setActiveTab] = useState('positioning');
  
  // AI辅助填写相关状态
  const [aiAssistDescription, setAiAssistDescription] = useState('');
  const [isAiAssistGenerating, setIsAiAssistGenerating] = useState(false);
  const [showAiAssist, setShowAiAssist] = useState(false); // 默认折叠，有数据时不自动展开
  
  // 素材相关状态
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  // 归一化定位数据格式（兼容平铺格式和嵌套格式）
  const normalizePositioningData = (data: any): any => {
    if (!data) return null;
    
    // 辅助函数：确保字段是数组格式
    const toArray = (val: any): string[] => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(String);
      if (typeof val === 'string') {
        // 如果是逗号分隔的字符串，拆分
        if (val.includes('、') || val.includes(',')) {
          return val.split(/[、,]/).map(s => s.trim()).filter(Boolean);
        }
        return [val];
      }
      return [String(val)];
    };
    
    // 辅助函数：确保字段是字符串
    const toString = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.join('、');
      return String(val);
    };
    
    // 如果已经有 basicInfo，说明是新的嵌套格式，规范化数组字段后返回
    if (data.basicInfo) {
      return {
        ...data,
        basicInfo: {
          ...data.basicInfo,
          identity: toArray(data.basicInfo.identity),
          personality: toArray(data.basicInfo.personality),
        },
        coreValue: data.coreValue ? {
          ...data.coreValue,
          interests: toArray(data.coreValue.interests),
          skills: toArray(data.coreValue.skills),
        } : undefined,
        contentDirection: data.contentDirection ? {
          ...data.contentDirection,
          platforms: toArray(data.contentDirection.platforms),
          mainTopics: toArray(data.contentDirection.mainTopics),
        } : undefined,
        userPersona: data.userPersona ? {
          ...data.userPersona,
          targetCustomers: toArray(data.userPersona.targetCustomers),
          painPoints: toArray(data.userPersona.painPoints),
          commonQuestions: toArray(data.userPersona.commonQuestions),
        } : undefined,
        productsServices: data.productsServices ? {
          ...data.productsServices,
          productTypes: toArray(data.productsServices.productTypes),
        } : undefined,
      };
    }
    
    // 否则是旧的平铺格式，转换为嵌套格式
    return {
      basicInfo: {
        identity: data.identity,
        nickname: data.nickname,
        age: data.age,
        education: data.education,
        location: data.location,
        appearance: data.appearance,
        personality: data.personality,
        othersEvaluation: data.othersEvaluation,
        familyInfluence: data.familyInfluence,
        values: data.values || {
          lifeView: data.lifeView,
          careerView: data.careerView,
          marriageView: data.marriageView,
        },
      },
      coreValue: {
        interests: data.interests,
        skills: data.skills,
        specialties: data.specialties,
        passions: data.passions,
        valueProvided: data.valueProvided,
      },
      lifeStory: data.lifeStory || data.lifeExperience || {
        recent10Years: data.recent10Years,
        last10Years: data.last10Years,
        darkestMoment: data.darkestMoment,
        darkMoments: data.darkMoments,
        turningPoint: data.turningPoint,
        turningPoints: data.turningPoints,
        highlightMoment: data.highlightMoment,
        highlights: data.highlights,
        motto: data.motto,
      },
      userPersona: data.userPersona || {
        targetCustomers: data.targetCustomers,
        painPoints: data.painPoints,
        commonQuestions: data.commonQuestions,
        competitiveAdvantage: data.competitiveAdvantage,
        motivation: data.motivation,
      },
      productsServices: data.productsServices || {
        productTypes: data.productTypes,
        mainProducts: data.mainProducts,
        priceRange: data.priceRange,
        serviceArea: data.serviceArea,
        uniqueValue: data.uniqueValue,
      },
      contentDirection: data.contentDirection || {
        platforms: data.platforms,
        mainTopics: data.mainTopics,
        contentStyle: data.contentStyle,
        updateFrequency: data.updateFrequency,
      },
      positioningDirection: data.positioningDirection || {
        nicheField: data.nicheField,
        contentTrack: data.contentTrack,
        monetization: data.monetization,
      },
      summary: data.summary,
    };
  };

  useEffect(() => {
    loadPositioning();
  }, [customerId]);

  const loadPositioning = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      
      // 加载客户列表找到当前客户
      const listResponse = await fetch('/api/customer/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listData = await listResponse.json();
      
      if (listData.data) {
        const customer = listData.data.find((c: { id: number; name: string; description: string; ipPositioning?: string }) => c.id.toString() === customerId);
        if (customer) {
          setCustomerInfo({
            name: customer.name,
            description: customer.description || '',
          });
          // 初始化编辑表单（空值，后续通过handleOpenEdit填充）
          setEditForm({
            name: customer.name,
            description: customer.description || '',
            identity: '',
            nickname: '',
            age: '',
            education: '',
            location: '',
            appearance: '',
            personality: '',
            othersEvaluation: '',
            familyInfluence: '',
            lifeView: '',
            careerView: '',
            marriageView: '',
            interests: '',
            skills: '',
            specialties: '',
            passions: '',
            valueProvided: '',
            recent10Years: '',
            darkestMoment: '',
            turningPoint: '',
            highlightMoment: '',
            motto: '',
            nicheField: '',
            contentTrack: '',
            monetization: '',
            targetCustomers: '',
            painPoints: '',
            commonQuestions: '',
            competitiveAdvantage: '',
            motivation: '',
            productTypes: '',
            mainProducts: '',
            priceRange: '',
            serviceArea: '',
            uniqueValue: '',
            platforms: '',
            mainTopics: '',
            contentStyle: '',
            updateFrequency: '',
          });
          
          if (customer.ipPositioning) {
            const ipData = typeof customer.ipPositioning === 'string' 
              ? JSON.parse(customer.ipPositioning) 
              : customer.ipPositioning;
            console.log('[loadPositioning] 原始数据是否有basicInfo:', !!ipData.basicInfo);
            
            // 兼容两种数据格式：平铺格式 vs 嵌套格式
            const normalizedData = normalizePositioningData(ipData);
            console.log('[loadPositioning] 归一化后数据:', JSON.stringify(normalizedData)?.substring(0, 200));
            setPositioning(normalizedData);
            
            // 填充编辑表单
            const basicInfo = normalizedData.basicInfo || normalizedData;
            if (basicInfo) {
              // identity 可能是数组或字符串
              const identityValue = Array.isArray(basicInfo.identity) 
                ? basicInfo.identity.join('、') 
                : (basicInfo.identity || '');
              setEditForm(prev => ({
                ...prev,
                identity: identityValue,
                nickname: basicInfo.nickname || '',
                location: basicInfo.location || '',
                personality: Array.isArray(basicInfo.personality) ? basicInfo.personality.join('、') : (basicInfo.personality || ''),
                othersEvaluation: basicInfo.othersEvaluation || '',
                familyInfluence: basicInfo.familyInfluence || '',
              }));
            }
          }
          
          // 加载账号策划报告（从 businessFormData 中恢复）
          console.log('[loadPositioning] businessFormData 存在:', !!customer.businessFormData);
          console.log('[loadPositioning] accountPlan 存在:', !!customer.accountPlan);
          if (customer.businessFormData) {
            try {
              const businessFormData = typeof customer.businessFormData === 'string'
                ? JSON.parse(customer.businessFormData)
                : customer.businessFormData;
              console.log('[loadPositioning] businessFormData.aiReports.accountPlanning 存在:', !!businessFormData.aiReports?.accountPlanning);
              if (businessFormData.aiReports?.accountPlanning) {
                setAccountPlan({ plan: businessFormData.aiReports.accountPlanning });
              }
              // 同时设置 businessAnalysis (商业定位报告)
              if (businessFormData.aiReports?.businessPositioning) {
                setPositioning(prev => prev ? { ...prev, businessPositioning: businessFormData.aiReports.businessPositioning } : prev);
              }
            } catch (e) {
              console.error('[loadPositioning] 解析 businessFormData 失败:', e);
            }
          }
          // 如果 businessFormData 为空但有 accountPlan（旧格式），也恢复
          else if (customer.accountPlan) {
            console.log('[loadPositioning] 从 accountPlan 恢复（旧格式）');
            setAccountPlan({ plan: customer.accountPlan });
          }
        }
      }
    } catch (error) {
      toast.error('加载定位信息失败');
    } finally {
      setIsLoading(false);
    }
    
    // 加载素材数据
    loadMaterials();
  };
  
  // 加载素材数据
  const loadMaterials = async () => {
    setIsLoadingMaterials(true);
    try {
      const token = getToken();
      const response = await fetch(`/api/materials?customerId=${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      
      if (data.success && data.data) {
        setMaterials(data.data);
      }
    } catch (error) {
      console.error('加载素材失败:', error);
    } finally {
      setIsLoadingMaterials(false);
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
          customerId: parseInt(customerId),
          userDescription: aiAssistDescription,
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
                  // API 返回的 data.data 本身就是表单数据（formData）
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
              // API 返回的 data.data 本身就是表单数据（formData）
              result = JSON.stringify(data.data);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      if (result) {
        const ipPositioning = JSON.parse(result);
        
        // 自动保存到数据库
        const saveResponse = await fetch('/api/customer/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: parseInt(customerId),
            name: customerInfo.name,
            description: aiAssistDescription,
            ipPositioning: result,
            businessAnalysis: positioning?.businessPositioning || null,
            accountPlan: accountPlan?.plan || null,
          }),
        });

        const saveData = await saveResponse.json();
        if (saveData.success) {
          setPositioning(ipPositioning);
          setCustomerInfo(prev => ({
            ...prev,
            description: aiAssistDescription,
          }));
          setAiAssistDescription('');
          setShowAiAssist(false);
          toast.success('AI辅助填写完成，已自动保存');
        } else {
          throw new Error(saveData.error || '保存失败');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI辅助填写失败';
      toast.error(errorMessage);
    } finally {
      setIsAiAssistGenerating(false);
    }
  };

  // 快捷键提交 (Ctrl/Cmd + Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAiAssistFill();
    }
  };

  const handleGeneratePositioning = async () => {
    if (!generateForm.name) {
      toast.error('请输入客户名称');
      return;
    }

    setIsGenerating(true);
    setStreamingContent(''); // 清空之前的流式内容
    
    try {
      const token = getToken();
      const response = await fetch('/api/ai/generate-positioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: parseInt(customerId),
          ...generateForm,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.success && data.data) {
        console.log('[AI定位] 生成成功，数据:', JSON.stringify(data.data).substring(0, 500));
        
        // 生成成功后自动保存到数据库
        toast.loading('正在保存定位数据...');
        
        const saveResponse = await fetch('/api/customer/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: parseInt(customerId),
            name: generateForm.name,
            description: generateForm.description || customerInfo.description,
            ipPositioning: JSON.stringify(data.data),
            businessAnalysis: accountPlan?.plan ? null : positioning?.businessPositioning || null,
            accountPlan: accountPlan?.plan || null,
          }),
        });
        
        const saveData = await saveResponse.json();
        console.log('[AI定位] 保存结果:', saveData);
        
        if (saveData.success) {
          console.log('[AI定位] 设置positioning状态');
          // 更新本地状态
          setPositioning(data.data);
          setCustomerInfo(prev => ({
            ...prev,
            name: generateForm.name,
            description: generateForm.description || prev.description,
          }));
          setStreamingContent(data.data.summary || '定位生成完成');
          toast.dismiss();
          toast.success('定位生成并保存成功');
          setIsGenerateDialogOpen(false);
        } else {
          // 保存失败，但数据已在内存中
          setPositioning(data.data);
          setStreamingContent(data.data.summary || '定位生成完成');
          toast.dismiss();
          toast.warning('定位生成成功，但保存失败，请稍后手动保存');
        }
      } else {
        throw new Error('生成结果格式错误');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('AI定位生成失败');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // 打开编辑对话框
  const handleOpenEdit = () => {
    // 辅助函数：数组转顿号分隔字符串
    const arrayToString = (arr: string[] | undefined) => arr?.join('、') || '';
    
    // identity 可能是数组或字符串
    const identityValue = Array.isArray(positioning?.basicInfo?.identity) 
      ? positioning.basicInfo.identity.join('、') 
      : (positioning?.basicInfo?.identity || '');
    
    setEditForm({
      // 客户基本信息
      name: customerInfo.name,
      description: customerInfo.description,
      // IP定位 - 基本信息
      identity: identityValue,
      nickname: positioning?.basicInfo?.nickname || '',
      age: positioning?.basicInfo?.age || '',
      education: positioning?.basicInfo?.education || '',
      location: positioning?.basicInfo?.location || '',
      appearance: positioning?.basicInfo?.appearance || '',
      personality: arrayToString(positioning?.basicInfo?.personality),
      othersEvaluation: positioning?.basicInfo?.othersEvaluation || '',
      familyInfluence: positioning?.basicInfo?.familyInfluence || '',
      lifeView: positioning?.basicInfo?.values?.lifeView || '',
      careerView: positioning?.basicInfo?.values?.careerView || '',
      marriageView: positioning?.basicInfo?.values?.marriageView || '',
      // IP定位 - 核心价值
      interests: arrayToString(positioning?.coreValue?.interests),
      skills: arrayToString(positioning?.coreValue?.skills),
      specialties: positioning?.coreValue?.specialties || '',
      passions: positioning?.coreValue?.passions || '',
      valueProvided: positioning?.coreValue?.valueProvided || '',
      // IP定位 - 人生故事
      recent10Years: positioning?.lifeStory?.recent10Years || positioning?.lifeExperience?.last10Years || '',
      darkestMoment: positioning?.lifeStory?.darkestMoment || positioning?.lifeExperience?.darkMoments || '',
      turningPoint: positioning?.lifeStory?.turningPoint || positioning?.lifeExperience?.turningPoints || '',
      highlightMoment: positioning?.lifeStory?.highlightMoment || positioning?.lifeExperience?.highlights || '',
      motto: positioning?.lifeStory?.motto || positioning?.lifeExperience?.motto || '',
      // IP定位 - 定位方向
      nicheField: positioning?.positioningDirection?.nicheField || '',
      contentTrack: arrayToString(positioning?.positioningDirection?.contentTrack),
      monetization: arrayToString(positioning?.positioningDirection?.monetization),
      // IP定位 - 用户画像
      targetCustomers: positioning?.userPersona?.targetCustomers || positioning?.userPersona?.targetUsers || '',
      painPoints: positioning?.userPersona?.painPoints || positioning?.userPersona?.userPainPoints || '',
      commonQuestions: arrayToString(positioning?.userPersona?.commonQuestions),
      competitiveAdvantage: positioning?.userPersona?.competitiveAdvantage || '',
      motivation: positioning?.userPersona?.motivation || '',
      // IP定位 - 产品服务
      productTypes: arrayToString(positioning?.productsServices?.productTypes),
      mainProducts: positioning?.productsServices?.mainProducts || '',
      priceRange: positioning?.productsServices?.priceRange || '',
      serviceArea: positioning?.productsServices?.serviceArea || '',
      uniqueValue: positioning?.productsServices?.uniqueValue || '',
      // IP定位 - 内容方向
      platforms: arrayToString(positioning?.contentDirection?.platforms),
      mainTopics: arrayToString(positioning?.contentDirection?.mainTopics),
      contentStyle: positioning?.contentDirection?.contentStyle || '',
      updateFrequency: positioning?.contentDirection?.updateFrequency || '',
    });
    setIsEditDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editForm.name) {
      toast.error('客户名称不能为空');
      return;
    }

    setIsSaving(true);
    try {
      const token = getToken();
      
      // 辅助函数：顿号分隔字符串转数组
      const stringToArray = (str: string) => str.split('、').filter(s => s.trim());
      
      // 构建更新后的IP定位数据
      const updatedPositioning: IPPositioning | null = positioning ? {
        ...positioning,
        basicInfo: {
          ...positioning.basicInfo,
          identity: stringToArray(editForm.identity),
          nickname: editForm.nickname,
          age: editForm.age,
          education: editForm.education,
          location: editForm.location,
          appearance: editForm.appearance,
          personality: stringToArray(editForm.personality),
          othersEvaluation: editForm.othersEvaluation,
          familyInfluence: editForm.familyInfluence,
          values: {
            lifeView: editForm.lifeView,
            careerView: editForm.careerView,
            marriageView: editForm.marriageView,
          },
        },
        coreValue: {
          interests: stringToArray(editForm.interests),
          skills: stringToArray(editForm.skills),
          specialties: editForm.specialties,
          passions: editForm.passions,
          valueProvided: editForm.valueProvided,
        },
        lifeStory: {
          recent10Years: editForm.recent10Years,
          darkestMoment: editForm.darkestMoment,
          turningPoint: editForm.turningPoint,
          highlightMoment: editForm.highlightMoment,
          motto: editForm.motto,
        },
        positioningDirection: {
          nicheField: editForm.nicheField,
          contentTrack: stringToArray(editForm.contentTrack),
          monetization: stringToArray(editForm.monetization),
        },
        userPersona: {
          targetCustomers: editForm.targetCustomers,
          painPoints: editForm.painPoints,
          commonQuestions: stringToArray(editForm.commonQuestions),
          competitiveAdvantage: editForm.competitiveAdvantage,
          motivation: editForm.motivation,
        },
        productsServices: {
          productTypes: stringToArray(editForm.productTypes),
          mainProducts: editForm.mainProducts,
          priceRange: editForm.priceRange,
          serviceArea: editForm.serviceArea,
          uniqueValue: editForm.uniqueValue,
        },
        contentDirection: {
          platforms: stringToArray(editForm.platforms),
          mainTopics: stringToArray(editForm.mainTopics),
          contentStyle: editForm.contentStyle,
          updateFrequency: editForm.updateFrequency,
        },
      } : null;
      
      // 更新客户基本信息
      const response = await fetch('/api/customer/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: parseInt(customerId),
          name: editForm.name,
          description: editForm.description,
          ipPositioning: updatedPositioning ? JSON.stringify(updatedPositioning) : null,
          businessAnalysis: positioning?.businessPositioning || null,
          accountPlan: accountPlan?.plan || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCustomerInfo({
          name: editForm.name,
          description: editForm.description,
        });
        if (updatedPositioning) {
          setPositioning(updatedPositioning);
        }
        toast.success('保存成功');
        setIsEditDialogOpen(false);
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  // 导出报告 - 支持PDF（打印）和TXT格式
  const handleExportReport = async (format: 'pdf' | 'txt') => {
    if (!positioning) {
      toast.error('暂无IP定位数据，无法导出报告');
      return;
    }

    setIsExporting(true);

    try {
      if (format === 'pdf') {
        // PDF导出 - 使用预生成的HTML报告
        setActiveTab('positioning');
        
        // 生成报告HTML
        let reportHtml: string;
        try {
          reportHtml = generatePrintReport(positioning);
        } catch (genError) {
          console.error('生成报告失败:', genError);
          toast.error('生成报告失败，请重试');
          setIsExporting(false);
          return;
        }
        
        // 创建打印窗口
        const printWindow = window.open('', '_blank', 'width=900,height=1200');
        if (!printWindow) {
          toast.error('无法打开打印窗口，请检查浏览器弹窗设置');
          setIsExporting(false);
          return;
        }
        
        try {
          printWindow.document.write(reportHtml);
          printWindow.document.close();
        } catch (writeError) {
          console.error('写入打印窗口失败:', writeError);
          toast.error('写入打印内容失败');
          setIsExporting(false);
          return;
        }
        
        // 等待页面加载后打印
        setTimeout(() => {
          try {
            if (!printWindow.closed) {
              printWindow.focus();
              printWindow.print();
            }
          } catch (printError) {
            console.error('打印失败:', printError);
          }
        }, 500);
        
        setIsExporting(false);
        toast.success('打印窗口已打开，请取消勾选"页眉和页脚"后保存为PDF');
      } else {
        // TXT导出 - 原有逻辑
        toast.loading('AI正在优化报告...');
        
        const token = getToken();
        const response = await fetch('/api/ai/optimize-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            positioning,
            customerName: positioning.basicInfo?.nickname || '客户',
            industry: positioning.positioningDirection?.nicheField || '综合',
          }),
        });

        let optimizedReport = '';
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
                  optimizedReport += data.content;
                }
              }
            }
          }
        }

        toast.dismiss();

        const reportContent = optimizedReport || generateReportContent();
        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileName = `IP定位报告_${positioning.basicInfo?.nickname || '客户'}_${new Date().toLocaleDateString('zh-CN')}`;
        link.href = url;
        link.download = `${fileName}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(optimizedReport ? 'AI优化报告已导出' : '报告已导出');
      }
    } catch (error) {
      toast.dismiss();
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // 生成打印报告HTML
  const generatePrintReport = (data: IPPositioning): string => {
    const customerName = data.basicInfo?.nickname || '客户';
    
    // 安全获取数组
    const identity = Array.isArray(data.basicInfo?.identity) ? data.basicInfo.identity : [];
    const personality = Array.isArray(data.basicInfo?.personality) ? data.basicInfo.personality : [];
    const interests = Array.isArray(data.coreValue?.interests) ? data.coreValue.interests : [];
    const skills = Array.isArray(data.coreValue?.skills) ? data.coreValue.skills : [];
    const contentTrack = Array.isArray(data.positioningDirection?.contentTrack) ? data.positioningDirection.contentTrack : [];
    const monetization = Array.isArray(data.positioningDirection?.monetization) ? data.positioningDirection.monetization : [];
    const mainTopics = Array.isArray(data.contentDirection?.mainTopics) ? data.contentDirection.mainTopics : [];
    const productTypes = Array.isArray(data.productsServices?.productTypes) ? data.productsServices.productTypes : [];
    const commonQuestions = Array.isArray(data.userPersona?.commonQuestions) ? data.userPersona.commonQuestions : [];
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${customerName} IP定位与账号规划</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e5e5e5;
    }
    .section {
      margin-bottom: 25px;
      padding: 20px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      background: #fff;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1a1a1a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 18px;
      background: #3b82f6;
      border-radius: 2px;
    }
    .grid { display: grid; gap: 12px; }
    .grid-2 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .field { margin-bottom: 10px; }
    .field-label { font-size: 13px; color: #666; margin-bottom: 4px; }
    .field-value { font-size: 14px; color: #1a1a1a; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag {
      display: inline-block;
      padding: 4px 12px;
      background: #f0f9ff;
      color: #0369a1;
      border-radius: 20px;
      font-size: 13px;
    }
    .tag-green { background: #dcfce7; color: #166534; }
    .tag-orange { background: #fef3c7; color: #92400e; }
    .tag-purple { background: #f3e8ff; color: #7c3aed; }
    .text-content { font-size: 14px; color: #333; white-space: pre-wrap; }
    .divider { height: 1px; background: #e5e5e5; margin: 15px 0; }
    @media print {
      body { padding: 20px; }
      .section { break-inside: avoid; }
      @page { 
        margin: 10mm; 
        size: A4;
      }
    }
    @page {
      margin: 10mm;
      size: A4;
    }
  </style>
</head>
<body>
  <h1>${customerName} IP定位与账号规划</h1>
  
  <!-- 基本信息 -->
  <div class="section">
    <div class="section-title">基本信息</div>
    <div class="grid grid-2">
      <div class="field">
        <div class="field-label">身份定位</div>
        <div class="field-value">${identity.length > 0 ? identity.join('、') : '未填写'}</div>
      </div>
      <div class="field">
        <div class="field-label">昵称</div>
        <div class="field-value">${data.basicInfo?.nickname || '未填写'}</div>
      </div>
      <div class="field">
        <div class="field-label">年龄</div>
        <div class="field-value">${data.basicInfo?.age || '未填写'}</div>
      </div>
      <div class="field">
        <div class="field-label">学历</div>
        <div class="field-value">${data.basicInfo?.education || '未填写'}</div>
      </div>
      <div class="field">
        <div class="field-label">所在地</div>
        <div class="field-value">${data.basicInfo?.location || '未填写'}</div>
      </div>
      <div class="field">
        <div class="field-label">外貌特征</div>
        <div class="field-value">${data.basicInfo?.appearance || '未填写'}</div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="field">
      <div class="field-label">性格标签</div>
      <div class="tags">
        ${personality.map((p: string) => `<span class="tag">${p}</span>`).join('')}
      </div>
    </div>
    <div class="field">
      <div class="field-label">他人评价</div>
      <div class="text-content">${data.basicInfo?.othersEvaluation || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">家庭影响</div>
      <div class="text-content">${data.basicInfo?.familyInfluence || '未填写'}</div>
    </div>
  </div>

  <!-- 核心价值 -->
  <div class="section">
    <div class="section-title">核心价值</div>
    <div class="grid grid-2">
      <div class="field">
        <div class="field-label">兴趣爱好</div>
        <div class="tags">
          ${interests.map((i: string) => `<span class="tag">${i}</span>`).join('')}
        </div>
      </div>
      <div class="field">
        <div class="field-label">专业技能</div>
        <div class="tags">
          ${skills.map((s: string) => `<span class="tag tag-green">${s}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="divider"></div>
    <div class="field">
      <div class="field-label">擅长领域</div>
      <div class="text-content">${data.coreValue?.specialties || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">热情所在</div>
      <div class="text-content">${data.coreValue?.passions || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">提供的价值</div>
      <div class="text-content">${data.coreValue?.valueProvided || '未填写'}</div>
    </div>
  </div>

  <!-- 人生经历 -->
  <div class="section">
    <div class="section-title">人生经历</div>
    <div class="field">
      <div class="field-label">近10年经历</div>
      <div class="text-content">${data.lifeStory?.recent10Years || data.lifeExperience?.last10Years || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">人生低谷</div>
      <div class="text-content">${data.lifeStory?.darkestMoment || data.lifeExperience?.darkMoments || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">转折点</div>
      <div class="text-content">${data.lifeStory?.turningPoint || data.lifeExperience?.turningPoints || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">高光时刻</div>
      <div class="text-content">${data.lifeStory?.highlightMoment || data.lifeExperience?.highlights || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">人生格言</div>
      <div class="text-content" style="font-style: italic; color: #0369a1;">"${data.lifeStory?.motto || data.lifeExperience?.motto || '未填写'}"</div>
    </div>
  </div>

  <!-- 定位方向 -->
  <div class="section">
    <div class="section-title">定位方向</div>
    <div class="field">
      <div class="field-label">细分领域</div>
      <div class="text-content">${data.positioningDirection?.nicheField || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">内容赛道</div>
      <div class="tags">
        ${contentTrack.map((t: string) => `<span class="tag tag-orange">${t}</span>`).join('')}
      </div>
    </div>
    <div class="field">
      <div class="field-label">变现方式</div>
      <div class="tags">
        ${monetization.map((m: string) => `<span class="tag tag-purple">${m}</span>`).join('')}
      </div>
    </div>
  </div>

  <!-- 用户画像 -->
  ${data.userPersona ? `
  <div class="section">
    <div class="section-title">用户画像</div>
    <div class="grid grid-2">
      <div class="field">
        <div class="field-label">目标用户</div>
        <div class="text-content">${data.userPersona.targetCustomers || data.userPersona.targetUsers || '未填写'}</div>
      </div>
      <div class="field">
        <div class="field-label">用户痛点</div>
        <div class="text-content">${data.userPersona.painPoints || data.userPersona.userPainPoints || '未填写'}</div>
      </div>
    </div>
    <div class="field">
      <div class="field-label">竞争优势</div>
      <div class="text-content">${data.userPersona.competitiveAdvantage || '未填写'}</div>
    </div>
  </div>
  ` : ''}

  <!-- 内容方向 -->
  ${data.contentDirection ? `
  <div class="section">
    <div class="section-title">内容方向</div>
    <div class="field">
      <div class="field-label">选题方向</div>
      <div class="tags">
        ${mainTopics.map((t: string) => `<span class="tag">${t}</span>`).join('')}
      </div>
    </div>
    <div class="field">
      <div class="field-label">内容风格</div>
      <div class="text-content">${data.contentDirection.contentStyle || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">更新频率</div>
      <div class="text-content">${data.contentDirection.updateFrequency || '未填写'}</div>
    </div>
  </div>
  ` : ''}

  <!-- 产品与服务 -->
  ${data.productsServices ? `
  <div class="section">
    <div class="section-title">产品与服务</div>
    <div class="field">
      <div class="field-label">核心产品</div>
      <div class="text-content">${data.productsServices.mainProducts || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">产品类型</div>
      <div class="tags">
        ${productTypes.map((t: string) => `<span class="tag tag-green">${t}</span>`).join('')}
      </div>
    </div>
    <div class="field">
      <div class="field-label">服务区域</div>
      <div class="text-content">${data.productsServices.serviceArea || '未填写'}</div>
    </div>
    <div class="field">
      <div class="field-label">独特价值</div>
      <div class="text-content">${data.productsServices.uniqueValue || '未填写'}</div>
    </div>
  </div>
  ` : ''}

</body>
</html>`;
  };

  // 生成报告内容（备用）
  const generateReportContent = () => {
    if (!positioning) return '';

    let content = `========================================\n`;
    content += `         IP定位报告\n`;
    content += `========================================\n\n`;
    content += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n`;

    // 基本信息
    content += `【基本信息】\n`;
    // identity 可能是数组或字符串
    const identityStr = Array.isArray(positioning.basicInfo.identity) 
      ? positioning.basicInfo.identity.join('、') 
      : (positioning.basicInfo.identity || '');
    content += `身份定位：${identityStr}\n`;
    content += `昵称：${positioning.basicInfo.nickname}\n`;
    if (positioning.basicInfo.location) content += `地域：${positioning.basicInfo.location}\n`;
    if (positioning.basicInfo.age) content += `年龄：${positioning.basicInfo.age}\n`;
    content += `性格特点：${(Array.isArray(positioning.basicInfo.personality) ? positioning.basicInfo.personality.join('、') : positioning.basicInfo.personality) || '未填写'}\n`;
    content += `他人评价：${positioning.basicInfo.othersEvaluation || '未填写'}\n`;
    content += `家庭影响：${positioning.basicInfo.familyInfluence || '未填写'}\n\n`;

    // 核心价值
    content += `【核心价值】\n`;
    // interests 可能是字符串或数组
    const interests = positioning.coreValue.interests;
    content += `兴趣爱好：${Array.isArray(interests) ? interests.join('、') : interests}\n`;
    // skills 可能是字符串或数组
    const skills = positioning.coreValue.skills;
    content += `专业技能：${Array.isArray(skills) ? skills.join('、') : skills}\n`;
    // specialties 可能是字符串或数组
    const specialties = positioning.coreValue.specialties;
    content += `擅长领域：${Array.isArray(specialties) ? specialties.join('、') : specialties}\n`;
    content += `热情所在：${positioning.coreValue.passions}\n`;
    content += `提供的价值：${positioning.coreValue.valueProvided}\n\n`;

    // 人生经历 - 兼容 lifeStory 和 lifeExperience
    const lifeData = positioning.lifeStory || positioning.lifeExperience;
    if (lifeData) {
      content += `【人生经历】\n`;
      const recentYears = (lifeData as any).recent10Years || (lifeData as any).last10Years || '';
      content += `近10年经历：${recentYears}\n`;
      const turningPoint = (lifeData as any).turningPoint || (lifeData as any).turningPoints;
      if (turningPoint) {
        content += `转折点：${turningPoint}\n`;
      }
      const highlight = (lifeData as any).highlightMoment || (lifeData as any).highlights;
      if (highlight) {
        content += `高光时刻：${highlight}\n`;
      }
      const darkMoment = (lifeData as any).darkestMoment || (lifeData as any).darkMoments;
      if (darkMoment) {
        content += `人生低谷：${darkMoment}\n`;
      }
      if (lifeData.motto) {
        content += `座右铭："${lifeData.motto}"\n`;
      }
      content += `\n`;
    }

    // 定位方向
    if (positioning.positioningDirection) {
      content += `【定位方向】\n`;
      content += `细分领域：${positioning.positioningDirection.nicheField}\n`;
      content += `内容赛道：${positioning.positioningDirection.contentTrack.join('、')}\n`;
      content += `变现方式：${positioning.positioningDirection.monetization.join('、')}\n\n`;
    }

    // 用户画像
    if (positioning.userPersona) {
      content += `【用户画像】\n`;
      content += `目标用户：${positioning.userPersona.targetCustomers || positioning.userPersona.targetUsers || ''}\n`;
      const painPoints = positioning.userPersona.painPoints || positioning.userPersona.userPainPoints;
      if (painPoints) {
        content += `用户痛点：${painPoints}\n`;
      }
      if (positioning.userPersona.commonQuestions?.length) {
        content += `常见问题：\n${positioning.userPersona.commonQuestions.map(q => `  - ${q}`).join('\n')}\n`;
      }
      if (positioning.userPersona.competitiveAdvantage) {
        content += `竞争优势：${positioning.userPersona.competitiveAdvantage}\n`;
      }
      content += `\n`;
    }

    // 产品与服务 - 兼容新旧格式
    if (positioning.productsServices) {
      content += `【产品与服务】\n`;
      const ps = positioning.productsServices as any;
      if (ps.productTypes?.length) {
        content += `产品类型：${ps.productTypes.join('、')}\n`;
      } else if (ps.products?.length) {
        content += `产品：${ps.products.join('、')}\n`;
      }
      if (ps.mainProducts) {
        content += `主要产品：${ps.mainProducts}\n`;
      }
      if (ps.services?.length) {
        content += `服务：${ps.services.join('、')}\n`;
      }
      if (ps.serviceArea) {
        content += `服务范围：${ps.serviceArea}\n`;
      }
      content += `\n`;
    }

    content += `========================================\n`;
    content += `    报告生成完毕 - 超级编导助手\n`;
    content += `========================================\n`;

    return content;
  };

  // 生成账号规划
  const handleGenerateAccountPlan = async () => {
    if (!planForm.accountName) {
      toast.error('请输入账号名称');
      return;
    }

    setIsGeneratingPlan(true);
    try {
      // 模拟生成账号规划
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newPlan: AccountPlan = {
        platform: planForm.platform,
        accountName: planForm.accountName,
        positioning: positioning?.positioningDirection?.nicheField || '综合领域创作者',
        contentDirection: positioning?.positioningDirection?.contentTrack || ['日常分享', '专业知识', '互动问答'],
        postingSchedule: '每周更新3-5次，黄金时段发布',
        goals: [
          `首月粉丝目标：${planForm.targetFollowers || '1000'}人`,
          '建立稳定的粉丝群体',
          '形成独特的内容风格',
          '实现初步的变现转化'
        ],
        kpis: [
          '粉丝增长率 ≥ 10%/月',
          '内容互动率 ≥ 5%',
          '完播率 ≥ 60%',
          '变现转化率 ≥ 2%'
        ]
      };
      
      setAccountPlan(newPlan);
      toast.success('账号规划生成成功');
      setIsPlanDialogOpen(false);
    } catch {
      toast.error('账号规划生成失败');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{customerInfo.name || '客户详情'}</h1>
              <p className="text-muted-foreground">IP定位与账号规划</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenEdit}>
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/')}
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Home className="w-4 h-4 mr-2" />
              返回主页
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="gradient-bg border-0"
                  disabled={!positioning || isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  导出报告
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportReport('pdf')}>
                  <FileDown className="w-4 h-4 mr-2" />
                  导出为 PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportReport('txt')}>
                  <FileText className="w-4 h-4 mr-2" />
                  导出为 TXT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="positioning">
              <User className="w-4 h-4 mr-2" />
              IP定位
            </TabsTrigger>
            <TabsTrigger value="account-plan">
              <Target className="w-4 h-4 mr-2" />
              账号规划
            </TabsTrigger>
            <TabsTrigger value="materials">
              <FileText className="w-4 h-4 mr-2" />
              素材库
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positioning" className="space-y-4">
            {positioning ? (
              <div id="ip-positioning-content">
                {/* Basic Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      基本信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">身份定位</p>
                          {/* identity 可能是数组或字符串 */}
                          <p className="font-medium">
                            {Array.isArray(positioning.basicInfo?.identity) 
                              ? positioning.basicInfo.identity.join('、') 
                              : (positioning.basicInfo?.identity || '未填写')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">昵称</p>
                          <p className="font-medium">{positioning.basicInfo?.nickname || '未填写'}</p>
                        </div>
                        {positioning.basicInfo?.location && (
                          <div>
                            <p className="text-sm text-muted-foreground">地域</p>
                            <p className="font-medium">{positioning.basicInfo.location}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-muted-foreground">性格特点</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {(positioning.basicInfo?.personality || []).map((p, i) => (
                              <Badge key={i} variant="secondary">{p}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground">他人评价</p>
                          <p className="text-sm leading-relaxed">{positioning.basicInfo?.othersEvaluation || '未填写'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">家庭影响</p>
                          <p className="text-sm leading-relaxed">{positioning.basicInfo?.familyInfluence || '未填写'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Core Value */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      核心价值
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-500" />
                          兴趣爱好
                        </p>
                        <div className="space-y-2">
                          {(positioning.coreValue?.interests || []).map((i, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              {i}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-500" />
                          专业技能
                        </p>
                        <div className="space-y-2">
                          {(positioning.coreValue?.skills || []).map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4 text-green-500" />
                          擅长领域
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {positioning.coreValue?.specialties || '未填写'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">热情所在</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {positioning.coreValue?.passions || '未填写'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">提供的价值</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {positioning.coreValue?.valueProvided || '未填写'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Life Experience / Life Story */}
                {(positioning.lifeExperience || positioning.lifeStory) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        人生经历
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div>
                        <p className="text-sm font-medium mb-2">近10年经历</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {positioning.lifeStory?.recent10Years || positioning.lifeExperience?.last10Years || '未填写'}
                        </p>
                      </div>
                      
                      {(positioning.lifeStory?.turningPoint || positioning.lifeExperience?.turningPoints) && (
                        <div>
                          <p className="text-sm font-medium mb-2">转折点</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {positioning.lifeStory?.turningPoint || positioning.lifeExperience?.turningPoints}
                          </p>
                        </div>
                      )}
                      
                      {(positioning.lifeStory?.highlightMoment || positioning.lifeExperience?.highlights) && (
                        <div>
                          <p className="text-sm font-medium mb-2">高光时刻</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {positioning.lifeStory?.highlightMoment || positioning.lifeExperience?.highlights}
                          </p>
                        </div>
                      )}
                      
                      {(positioning.lifeStory?.darkestMoment || positioning.lifeExperience?.darkMoments) && (
                        <div>
                          <p className="text-sm font-medium mb-2">人生低谷</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {positioning.lifeStory?.darkestMoment || positioning.lifeExperience?.darkMoments}
                          </p>
                        </div>
                      )}
                      
                      {(positioning.lifeStory?.motto || positioning.lifeExperience?.motto) && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm font-medium mb-1">座右铭</p>
                          <p className="text-base italic">&quot;{positioning.lifeStory?.motto || positioning.lifeExperience?.motto}&quot;</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Positioning Direction */}
                {positioning.positioningDirection && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        定位方向
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <p className="text-sm font-medium mb-2">细分领域</p>
                          <p className="text-sm">{positioning.positioningDirection.nicheField || '未填写'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">内容赛道</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(positioning.positioningDirection?.contentTrack) 
                              ? positioning.positioningDirection.contentTrack.slice(0, 6).map((t: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                              ))
                              : <span className="text-sm text-muted-foreground">{positioning.positioningDirection?.contentTrack || '未填写'}</span>
                            }
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">变现方式</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(positioning.positioningDirection?.monetization)
                              ? positioning.positioningDirection.monetization.slice(0, 4).map((m: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                              ))
                              : <span className="text-sm text-muted-foreground">{positioning.positioningDirection?.monetization || '未填写'}</span>
                            }
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Content Direction */}
                {positioning.contentDirection && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5" />
                        内容方向
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* 平台 */}
                        {Array.isArray(positioning.contentDirection?.platforms) && positioning.contentDirection.platforms.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">目标平台</p>
                            <div className="flex flex-wrap gap-2">
                              {positioning.contentDirection.platforms.map((p: string, i: number) => (
                                <Badge key={i} variant="default">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 主要选题 */}
                        {Array.isArray(positioning.contentDirection?.mainTopics) && positioning.contentDirection.mainTopics.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">主要选题</p>
                            <div className="flex flex-wrap gap-1">
                              {positioning.contentDirection.mainTopics.map((t: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 内容风格 */}
                        {(positioning.contentDirection as any).contentStyle && (
                          <div>
                            <p className="text-sm font-medium mb-2">内容风格</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {(positioning.contentDirection as any).contentStyle}
                            </p>
                          </div>
                        )}
                        
                        {/* 更新频率 */}
                        {(positioning.contentDirection as any).updateFrequency && (
                          <div>
                            <p className="text-sm font-medium mb-2">更新频率</p>
                            <p className="text-sm text-muted-foreground">
                              {(positioning.contentDirection as any).updateFrequency}
                            </p>
                          </div>
                        )}
                        
                        {/* 兼容旧数据 - mainTopics */}
                        {!(positioning.contentDirection as any).mainTopics && 
                         !(positioning.contentDirection as any).platforms && 
                         !(positioning.contentDirection as any).contentStyle && (
                          <p className="text-sm text-muted-foreground">暂无内容方向信息</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* User Persona */}
                {positioning.userPersona && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        用户画像
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">目标用户</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {positioning.userPersona.targetCustomers || positioning.userPersona.targetUsers || '未填写'}
                        </p>
                      </div>
                      
                      {Array.isArray(positioning.userPersona?.painPoints) && positioning.userPersona.painPoints.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">用户痛点</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {Array.isArray(positioning.userPersona.painPoints) 
                              ? positioning.userPersona.painPoints.join('\n') 
                              : positioning.userPersona.painPoints}
                          </p>
                        </div>
                      )}
                      
                      {Array.isArray(positioning.userPersona?.commonQuestions) && positioning.userPersona.commonQuestions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">常见问题</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {positioning.userPersona.commonQuestions.map((q: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                {q}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {positioning.userPersona.competitiveAdvantage && (
                        <div>
                          <p className="text-sm font-medium mb-2">竞争优势</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {positioning.userPersona.competitiveAdvantage}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Products & Services */}
                {positioning.productsServices && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        产品与服务
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* 产品类型 */}
                        {Array.isArray(positioning.productsServices?.productTypes) && positioning.productsServices.productTypes.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">产品类型</p>
                            <div className="flex flex-wrap gap-2">
                              {positioning.productsServices.productTypes.map((p: string, i: number) => (
                                <Badge key={i} variant="secondary">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 主要产品 */}
                        {(positioning.productsServices as any).mainProducts && (
                          <div>
                            <p className="text-sm font-medium mb-2">主要产品</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {(positioning.productsServices as any).mainProducts}
                            </p>
                          </div>
                        )}
                        
                        {/* 价格区间 */}
                        {(positioning.productsServices as any).priceRange && (
                          <div>
                            <p className="text-sm font-medium mb-2">价格区间</p>
                            <p className="text-sm text-muted-foreground">
                              {(positioning.productsServices as any).priceRange}
                            </p>
                          </div>
                        )}
                        
                        {/* 服务范围 */}
                        {(positioning.productsServices as any).serviceArea && (
                          <div>
                            <p className="text-sm font-medium mb-2">服务范围</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {(positioning.productsServices as any).serviceArea}
                            </p>
                          </div>
                        )}
                        
                        {/* 独特价值 */}
                        {(positioning.productsServices as any).uniqueValue && (
                          <div>
                            <p className="text-sm font-medium mb-2">独特价值</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {(positioning.productsServices as any).uniqueValue}
                            </p>
                          </div>
                        )}
                        
                        {/* 兼容旧数据 */}
                        {Array.isArray(positioning.productsServices?.products) && positioning.productsServices.products.length > 0 && !Array.isArray(positioning.productsServices?.productTypes) && (
                          <div>
                            <p className="text-sm font-medium mb-2">产品</p>
                            <div className="space-y-2">
                              {positioning.productsServices.products.map((p: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  {p}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {Array.isArray(positioning.productsServices?.services) && positioning.productsServices.services.length > 0 && !positioning.productsServices?.serviceArea && (
                          <div>
                            <p className="text-sm font-medium mb-2">服务</p>
                            <div className="space-y-2">
                              {positioning.productsServices.services.map((s: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 如果没有任何数据，显示提示 */}
                        {!((positioning.productsServices as any).productTypes?.length > 0 || 
                           (positioning.productsServices as any).mainProducts ||
                           (positioning.productsServices as any).priceRange ||
                           (positioning.productsServices as any).serviceArea ||
                           (positioning.productsServices as any).uniqueValue ||
                           (positioning.productsServices as any).products?.length > 0 ||
                           (positioning.productsServices as any).services?.length > 0) && (
                          <p className="text-sm text-muted-foreground">暂无产品服务信息</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Regenerate Button */}
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">重新生成定位</p>
                        <p className="text-sm text-muted-foreground">使用AI重新生成或辅助填写IP定位</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          className="gradient-bg border-0"
                          onClick={() => router.push(`/customer/${customerId}/positioning`)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          使用向导重新定位
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowAiAssist(!showAiAssist)}
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          AI辅助填写
                        </Button>
                        <Button
                          className="gradient-bg border-0"
                          onClick={() => setIsGenerateDialogOpen(true)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          完全重新生成
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* AI辅助填写区域（有数据时显示） */}
                {showAiAssist && positioning && (
                  <Card className="border-purple-200 dark:border-purple-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Wand2 className="w-5 h-5 text-purple-600" />
                        AI辅助重新填写
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* 使用说明 */}
                      <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
                            <p className="font-medium">使用说明</p>
                            <ul className="space-y-1 text-purple-700 dark:text-purple-300">
                              <li>• 简单描述您的身份、行业或想做的内容方向</li>
                              <li>• 可以包含您的经历、特长、目标等信息</li>
                              <li>• AI会根据您的描述自动生成完整的IP定位信息</li>
                              <li>• 生成后您可以继续编辑和修改内容</li>
                              <li>• 按 Ctrl/Cmd + Enter 快速提交</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      {/* 输入区域 */}
                      <div className="space-y-2">
                        <Label htmlFor="ai-assist-input-2" className="text-sm font-medium">
                          请描述您的信息
                        </Label>
                        <Textarea
                          id="ai-assist-input-2"
                          placeholder="例如：我是一名有10年经验的摄影师，主要做婚纱摄影和商业摄影，在长春有一家工作室，想通过短视频获取更多客户。我的风格偏自然唯美，擅长捕捉情感瞬间..."
                          value={aiAssistDescription}
                          onChange={(e) => setAiAssistDescription(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="min-h-[120px] resize-none"
                          disabled={isAiAssistGenerating}
                        />
                        <p className="text-xs text-muted-foreground">
                          提示：描述越详细，AI生成的定位越精准
                        </p>
                      </div>
                      
                      {/* 提交按钮 */}
                      <Button
                        onClick={handleAiAssistFill}
                        disabled={isAiAssistGenerating || !aiAssistDescription.trim()}
                        className="w-full gradient-bg border-0"
                      >
                        {isAiAssistGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            AI正在分析生成...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            开始AI分析并更新定位
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <>
                {/* AI一键智能填写 - 超级明显入口 */}
                <Card className="relative overflow-hidden border-2 border-purple-400 dark:border-purple-600 shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
                  {/* 动态背景 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-10 animate-pulse" />
                  
                  <CardContent className="relative pt-6 pb-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* 左侧图标区域 */}
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                          <Sparkles className="w-10 h-10 text-white animate-pulse" />
                        </div>
                        {/* 闪烁光点 */}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
                        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-pink-400 rounded-full animate-pulse" />
                      </div>
                      
                      {/* 中间文字区域 */}
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            ⚡ AI一键智能填写
                          </h3>
                          <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full animate-bounce">
                            推荐
                          </span>
                        </div>
                        <p className="text-muted-foreground mb-3">
                          只需简单描述您的身份、行业、经历，AI会自动帮您填写完整信息！
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                            ✨ 节省时间
                          </span>
                          <span className="text-xs px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full">
                            🎯 更精准
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                            📝 可编辑修改
                          </span>
                        </div>
                      </div>
                      
                      {/* 右侧按钮区域 */}
                      <div className="flex flex-col gap-3">
                        <Button
                          size="lg"
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold shadow-lg shadow-purple-300 dark:shadow-purple-900/50 px-8 py-6 text-lg"
                          onClick={() => router.push(`/customer/${customerId}/positioning`)}
                        >
                          <Sparkles className="w-5 h-5 mr-2" />
                          开始AI向导
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-purple-600 border-purple-300 hover:bg-purple-50"
                          onClick={() => setIsGenerateDialogOpen(true)}
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          快速AI生成
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* AI辅助填写卡片 - 快速模式 */}
                <Card className="border-purple-200 dark:border-purple-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wand2 className="w-5 h-5 text-purple-600" />
                      快速AI生成（简单描述即可）
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 使用说明 */}
                    <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-100 dark:border-purple-900">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
                          <p className="font-medium">💡 填写提示</p>
                          <ul className="space-y-1 text-purple-700 dark:text-purple-300">
                            <li>• 您的身份、职业、从业年限</li>
                            <li>• 您的专业技能和特长</li>
                            <li>• 您想做的内容方向和目标用户</li>
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
                        className="min-h-[120px] resize-none"
                        disabled={isAiAssistGenerating}
                      />
                      <p className="text-xs text-muted-foreground">
                        提示：描述越详细，AI生成的定位越精准
                      </p>
                    </div>
                    
                    {/* 提交按钮 */}
                    <Button
                      onClick={handleAiAssistFill}
                      disabled={isAiAssistGenerating || !aiAssistDescription.trim()}
                      className="w-full gradient-bg border-0"
                    >
                      {isAiAssistGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          AI正在分析生成...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          开始AI分析并生成定位
                        </>
                      )}
                    </Button>
                    
                    {/* 分隔线 */}
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        或者
                      </span>
                    </div>
                    
                    {/* 传统方式按钮 */}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsGenerateDialogOpen(true)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      手动填写生成定位
                    </Button>
                  </CardContent>
                </Card>
                
                {/* 完成并返回主页 */}
                <Card className="mt-6 border-green-200 dark:border-green-900 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">IP定位已保存</p>
                          <p className="text-sm text-green-600 dark:text-green-400">您可以随时返回修改定位信息</p>
                        </div>
                      </div>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white border-0"
                        onClick={() => router.push('/')}
                      >
                        <Home className="w-4 h-4 mr-2" />
                        完成并返回主页
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="account-plan">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  账号规划
                </CardTitle>
              </CardHeader>
              <CardContent>
                {accountPlan ? (
                  <div className="space-y-6">
                    {/* 新格式：直接显示 markdown 内容 */}
                    {accountPlan.plan ? (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-muted/30 p-4 rounded-lg font-sans">
                          {accountPlan.plan}
                        </pre>
                      </div>
                    ) : (
                      <>
                        {/* 旧格式：结构化显示 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-muted/30">
                            <p className="text-sm text-muted-foreground mb-1">平台</p>
                            <p className="font-medium">{accountPlan.platform || '-'}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/30">
                            <p className="text-sm text-muted-foreground mb-1">账号名称</p>
                            <p className="font-medium">{accountPlan.accountName || '-'}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-muted/30">
                            <p className="text-sm text-muted-foreground mb-1">定位</p>
                            <p className="font-medium">{accountPlan.positioning || '-'}</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* 旧格式：结构化显示（有 plan 时隐藏） */}
                    {!accountPlan.plan && (
                      <>
                        {/* 内容方向 */}
                        {accountPlan.contentDirection && accountPlan.contentDirection.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">内容方向</p>
                            <div className="flex flex-wrap gap-2">
                              {accountPlan.contentDirection.map((dir, i) => (
                                <Badge key={i} variant="secondary">{dir}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 发布计划 */}
                        {accountPlan.postingSchedule && (
                          <div>
                            <p className="text-sm font-medium mb-2">发布计划</p>
                            <p className="text-sm text-muted-foreground">{accountPlan.postingSchedule}</p>
                          </div>
                        )}

                        {/* 目标 */}
                        {accountPlan.goals && accountPlan.goals.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">阶段目标</p>
                            <div className="space-y-2">
                              {accountPlan.goals.map((goal, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  {goal}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* KPI */}
                        {accountPlan.kpis && accountPlan.kpis.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">核心指标</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {accountPlan.kpis.map((kpi, i) => (
                                <div key={i} className="p-3 rounded-lg bg-muted/30 text-center">
                                  <p className="text-xs text-muted-foreground">{kpi}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* 重新生成按钮 */}
                    <div className="pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsPlanDialogOpen(true)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        重新生成规划
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暂无账号规划</p>
                    <Button 
                      className="mt-4 gradient-bg border-0"
                      onClick={() => setIsPlanDialogOpen(true)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成规划
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">内容素材库</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{materials.length} 个素材</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingMaterials ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin mb-4" />
                    <p className="text-muted-foreground">加载素材中...</p>
                  </div>
                ) : materials.length > 0 ? (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div 
                        key={material.id} 
                        className="p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {MATERIAL_TYPE_NAMES[material.materialType || ''] || material.materialType || '素材'}
                              </Badge>
                              {material.scriptType && (
                                <Badge variant="secondary" className="text-xs">
                                  {SCRIPT_TYPE_NAMES[material.scriptType] || material.scriptType}
                                </Badge>
                              )}
                              {material.status && (
                                <Badge 
                                  variant={material.status === 'published' || material.status === '已发布' ? 'default' : 'secondary'} 
                                  className="text-xs"
                                >
                                  {material.status === 'draft' ? '草稿' :
                                   material.status === 'published' ? '已发布' :
                                   material.status === 'archived' ? '已归档' :
                                   material.status}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-medium truncate">{material.topic || material.title || '无标题'}</h4>
                            {material.content && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {material.content}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              创建于 {new Date(material.createdAt).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(material.content || material.topic || '');
                                toast.success('已复制到剪贴板');
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">暂无素材</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      可通过选题推荐或文案创作添加素材
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Generate Positioning Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI生成IP定位
            </DialogTitle>
            <DialogDescription>
              填写客户基本信息，AI将智能生成专业的IP定位方案
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">客户名称 *</Label>
              <Input
                id="name"
                placeholder="请输入客户名称"
                value={generateForm.name}
                onChange={(e) => setGenerateForm({ ...generateForm, name: e.target.value })}
                disabled={isGenerating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">所属行业</Label>
              <Select
                value={generateForm.industry}
                onValueChange={(value) => setGenerateForm({ ...generateForm, industry: value })}
                disabled={isGenerating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择行业" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="综合">综合</SelectItem>
                  <SelectItem value="科技">科技</SelectItem>
                  <SelectItem value="教育">教育</SelectItem>
                  <SelectItem value="电商">电商</SelectItem>
                  <SelectItem value="房地产">房地产</SelectItem>
                  <SelectItem value="金融">金融</SelectItem>
                  <SelectItem value="医疗">医疗</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">客户描述</Label>
              <Textarea
                id="description"
                placeholder="请输入客户描述（选填）"
                value={generateForm.description}
                onChange={(e) => setGenerateForm({ ...generateForm, description: e.target.value })}
                disabled={isGenerating}
              />
            </div>
            
            {/* 流式内容显示区域 */}
            {isGenerating && streamingContent && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI正在生成...
                </Label>
                <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                    {streamingContent}
                  </pre>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleGeneratePositioning}
              className="w-full gradient-bg border-0"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中，请稍候...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始生成
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Account Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              AI生成账号规划
            </DialogTitle>
            <DialogDescription>
              填写账号基本信息，AI将智能生成专业的账号运营规划
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="platform">平台 *</Label>
              <Select
                value={planForm.platform}
                onValueChange={(value) => setPlanForm({ ...planForm, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="抖音">抖音</SelectItem>
                  <SelectItem value="快手">快手</SelectItem>
                  <SelectItem value="小红书">小红书</SelectItem>
                  <SelectItem value="视频号">视频号</SelectItem>
                  <SelectItem value="B站">B站</SelectItem>
                  <SelectItem value="微博">微博</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">账号名称 *</Label>
              <Input
                id="accountName"
                placeholder="请输入账号名称"
                value={planForm.accountName}
                onChange={(e) => setPlanForm({ ...planForm, accountName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetFollowers">目标粉丝数</Label>
              <Input
                id="targetFollowers"
                placeholder="例如：10000"
                value={planForm.targetFollowers}
                onChange={(e) => setPlanForm({ ...planForm, targetFollowers: e.target.value })}
              />
            </div>
            <Button
              onClick={handleGenerateAccountPlan}
              className="w-full gradient-bg border-0"
              disabled={isGeneratingPlan}
            >
              {isGeneratingPlan ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始生成
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog - 完整IP定位编辑 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-purple-600" />
              编辑IP定位信息
            </DialogTitle>
            <DialogDescription>
              修改客户的完整IP定位信息，所有字段均可编辑
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="mt-4">
            <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1">
              <TabsTrigger value="basic" className="text-xs">基本信息</TabsTrigger>
              <TabsTrigger value="value" className="text-xs">核心价值</TabsTrigger>
              <TabsTrigger value="story" className="text-xs">人生故事</TabsTrigger>
              <TabsTrigger value="direction" className="text-xs">定位方向</TabsTrigger>
              <TabsTrigger value="persona" className="text-xs">用户画像</TabsTrigger>
              <TabsTrigger value="product" className="text-xs">产品服务</TabsTrigger>
              <TabsTrigger value="content" className="text-xs">内容方向</TabsTrigger>
            </TabsList>
            
            {/* 基本信息 */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>客户名称 *</Label>
                  <Input
                    placeholder="客户/企业名称"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>昵称</Label>
                  <Input
                    placeholder="IP昵称/账号名"
                    value={editForm.nickname}
                    onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>客户描述</Label>
                <Textarea
                  placeholder="简要描述客户背景"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>身份定位</Label>
                  <Textarea
                    placeholder="身份/职业定位"
                    value={editForm.identity}
                    onChange={(e) => setEditForm({ ...editForm, identity: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>地域</Label>
                  <Input
                    placeholder="所在城市/地区"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>年龄</Label>
                  <Input
                    placeholder="年龄段"
                    value={editForm.age}
                    onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>学历</Label>
                  <Input
                    placeholder="教育背景"
                    value={editForm.education}
                    onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>外貌特征</Label>
                <Input
                  placeholder="外貌描述、形象特点"
                  value={editForm.appearance}
                  onChange={(e) => setEditForm({ ...editForm, appearance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>性格特点</Label>
                <Input
                  placeholder="用顿号分隔，如：沉稳内敛、务实靠谱"
                  value={editForm.personality}
                  onChange={(e) => setEditForm({ ...editForm, personality: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>他人评价</Label>
                <Textarea
                  placeholder="他人对你的评价"
                  value={editForm.othersEvaluation}
                  onChange={(e) => setEditForm({ ...editForm, othersEvaluation: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>家庭影响</Label>
                <Textarea
                  placeholder="家庭背景对个人的影响"
                  value={editForm.familyInfluence}
                  onChange={(e) => setEditForm({ ...editForm, familyInfluence: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="border-t pt-3 mt-3">
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">价值观</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>人生观</Label>
                    <Input
                      placeholder="对人生的看法"
                      value={editForm.lifeView}
                      onChange={(e) => setEditForm({ ...editForm, lifeView: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>事业观</Label>
                    <Input
                      placeholder="对事业的看法"
                      value={editForm.careerView}
                      onChange={(e) => setEditForm({ ...editForm, careerView: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>婚姻观</Label>
                    <Input
                      placeholder="对婚姻家庭的看法"
                      value={editForm.marriageView}
                      onChange={(e) => setEditForm({ ...editForm, marriageView: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* 核心价值 */}
            <TabsContent value="value" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>兴趣爱好</Label>
                <Textarea
                  placeholder="用顿号分隔，如：摄影、旅行、阅读"
                  value={editForm.interests}
                  onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>专业技能</Label>
                <Textarea
                  placeholder="用顿号分隔，如：视频剪辑、文案撰写、数据分析"
                  value={editForm.skills}
                  onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>特长领域</Label>
                <Textarea
                  placeholder="最擅长的领域或方向"
                  value={editForm.specialties}
                  onChange={(e) => setEditForm({ ...editForm, specialties: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>热情所在</Label>
                <Textarea
                  placeholder="最热爱、最有激情的事情"
                  value={editForm.passions}
                  onChange={(e) => setEditForm({ ...editForm, passions: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>能提供的价值</Label>
                <Textarea
                  placeholder="能为用户/客户提供什么价值"
                  value={editForm.valueProvided}
                  onChange={(e) => setEditForm({ ...editForm, valueProvided: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>
            
            {/* 人生故事 */}
            <TabsContent value="story" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>近10年经历</Label>
                <Textarea
                  placeholder="过去10年的主要经历"
                  value={editForm.recent10Years}
                  onChange={(e) => setEditForm({ ...editForm, recent10Years: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>至暗时刻</Label>
                <Textarea
                  placeholder="人生中最艰难的时刻"
                  value={editForm.darkestMoment}
                  onChange={(e) => setEditForm({ ...editForm, darkestMoment: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>转折点</Label>
                <Textarea
                  placeholder="改变人生轨迹的关键时刻"
                  value={editForm.turningPoint}
                  onChange={(e) => setEditForm({ ...editForm, turningPoint: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>高光时刻</Label>
                <Textarea
                  placeholder="人生中最骄傲的成就"
                  value={editForm.highlightMoment}
                  onChange={(e) => setEditForm({ ...editForm, highlightMoment: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>人生格言</Label>
                <Input
                  placeholder="座右铭或人生信念"
                  value={editForm.motto}
                  onChange={(e) => setEditForm({ ...editForm, motto: e.target.value })}
                />
              </div>
            </TabsContent>
            
            {/* 定位方向 */}
            <TabsContent value="direction" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>赛道领域</Label>
                <Input
                  placeholder="选择的细分赛道/领域"
                  value={editForm.nicheField}
                  onChange={(e) => setEditForm({ ...editForm, nicheField: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>内容赛道</Label>
                <Textarea
                  placeholder="用顿号分隔，如：知识分享、vlog、剧情"
                  value={editForm.contentTrack}
                  onChange={(e) => setEditForm({ ...editForm, contentTrack: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>变现方式</Label>
                <Textarea
                  placeholder="用顿号分隔，如：带货、知识付费、接广告"
                  value={editForm.monetization}
                  onChange={(e) => setEditForm({ ...editForm, monetization: e.target.value })}
                  rows={2}
                />
              </div>
            </TabsContent>
            
            {/* 用户画像 */}
            <TabsContent value="persona" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>目标客户</Label>
                <Textarea
                  placeholder="想要吸引的目标用户群体"
                  value={editForm.targetCustomers}
                  onChange={(e) => setEditForm({ ...editForm, targetCustomers: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>用户痛点</Label>
                <Textarea
                  placeholder="目标用户的核心痛点"
                  value={editForm.painPoints}
                  onChange={(e) => setEditForm({ ...editForm, painPoints: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>常见问题</Label>
                <Textarea
                  placeholder="用顿号分隔，目标用户常见的问题"
                  value={editForm.commonQuestions}
                  onChange={(e) => setEditForm({ ...editForm, commonQuestions: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>竞争优势</Label>
                <Textarea
                  placeholder="相比同行的独特优势"
                  value={editForm.competitiveAdvantage}
                  onChange={(e) => setEditForm({ ...editForm, competitiveAdvantage: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>用户动机</Label>
                <Textarea
                  placeholder="用户关注你的动机"
                  value={editForm.motivation}
                  onChange={(e) => setEditForm({ ...editForm, motivation: e.target.value })}
                  rows={2}
                />
              </div>
            </TabsContent>
            
            {/* 产品服务 */}
            <TabsContent value="product" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>产品类型</Label>
                <Textarea
                  placeholder="用顿号分隔，如：实物产品、虚拟课程、服务"
                  value={editForm.productTypes}
                  onChange={(e) => setEditForm({ ...editForm, productTypes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>主要产品</Label>
                <Textarea
                  placeholder="核心产品/服务介绍"
                  value={editForm.mainProducts}
                  onChange={(e) => setEditForm({ ...editForm, mainProducts: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>价格区间</Label>
                  <Input
                    placeholder="如：99-999元"
                    value={editForm.priceRange}
                    onChange={(e) => setEditForm({ ...editForm, priceRange: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>服务区域</Label>
                  <Input
                    placeholder="服务覆盖范围"
                    value={editForm.serviceArea}
                    onChange={(e) => setEditForm({ ...editForm, serviceArea: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>独特价值</Label>
                <Textarea
                  placeholder="产品/服务的独特卖点"
                  value={editForm.uniqueValue}
                  onChange={(e) => setEditForm({ ...editForm, uniqueValue: e.target.value })}
                  rows={2}
                />
              </div>
            </TabsContent>
            
            {/* 内容方向 */}
            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>运营平台</Label>
                <Textarea
                  placeholder="用顿号分隔，如：抖音、小红书、视频号"
                  value={editForm.platforms}
                  onChange={(e) => setEditForm({ ...editForm, platforms: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>主要内容</Label>
                <Textarea
                  placeholder="用顿号分隔，主要内容话题"
                  value={editForm.mainTopics}
                  onChange={(e) => setEditForm({ ...editForm, mainTopics: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>内容风格</Label>
                <Textarea
                  placeholder="内容呈现风格"
                  value={editForm.contentStyle}
                  onChange={(e) => setEditForm({ ...editForm, contentStyle: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>更新频率</Label>
                <Input
                  placeholder="如：每日更新、每周3篇"
                  value={editForm.updateFrequency}
                  onChange={(e) => setEditForm({ ...editForm, updateFrequency: e.target.value })}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="flex-1 gradient-bg border-0"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存修改'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
