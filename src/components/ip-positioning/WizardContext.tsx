'use client';

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { CONTENT_STRATEGY_TYPES } from '@/lib/ip-positioning-config';

// 表单数据类型定义
export interface FormData {
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
export const initialFormData: FormData = {
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

// 步骤定义类型
export interface StepDefinition {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// 向导上下文值类型
export interface WizardContextValue {
  // 当前步骤
  currentStep: number;
  // 表单数据
  formData: FormData;
  // 客户信息
  customerInfo: {
    id: string;
    name: string;
    description: string;
  };
  // 总步骤数
  totalSteps: number;
  // 进度百分比
  progress: number;
  // 是否可以前进
  canGoNext: boolean;
  // 是否可以后退
  canGoBack: boolean;
  // 是否正在保存
  isSaving: boolean;
  // 更新表单数据（泛型方法）
  updateFormData: <K extends keyof FormData>(step: K, data: FormData[K]) => void;
  // 批量更新表单数据
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  // 前进到下一步
  nextStep: () => void;
  // 返回上一步
  prevStep: () => void;
  // 跳转到指定步骤
  goToStep: (step: number) => void;
  // 更新客户信息
  updateCustomerInfo: (info: Partial<WizardContextValue['customerInfo']>) => void;
  // 设置保存状态
  setIsSaving: (saving: boolean) => void;
  // 重置表单
  resetForm: () => void;
}

// 创建上下文
const WizardContext = createContext<WizardContextValue | null>(null);

// Provider 属性类型
interface WizardProviderProps {
  children: ReactNode;
  customerId: string;
  initialData?: Partial<FormData>;
  customerName?: string;
  customerDescription?: string;
}

// 向导 Provider 组件
export function WizardProvider({
  children,
  customerId,
  initialData,
  customerName = '',
  customerDescription = '',
}: WizardProviderProps) {
  // 当前步骤
  const [currentStep, setCurrentStep] = useState(1);
  
  // 表单数据
  const [formData, setFormData] = useState<FormData>(() => ({
    ...initialFormData,
    ...initialData,
  }));
  
  // 客户信息
  const [customerInfo, setCustomerInfo] = useState({
    id: customerId,
    name: customerName,
    description: customerDescription,
  });
  
  // 保存状态
  const [isSaving, setIsSaving] = useState(false);

  // 总步骤数
  const totalSteps = 8;

  // 进度计算（使用 useMemo 缓存）
  const progress = useMemo(() => (currentStep / totalSteps) * 100, [currentStep]);

  // 是否可以前进/后退
  const canGoNext = useMemo(() => currentStep < totalSteps, [currentStep]);
  const canGoBack = useMemo(() => currentStep > 1, [currentStep]);

  // 更新表单数据（使用 useCallback 缓存）
  const updateFormData = useCallback(<K extends keyof FormData>(step: K, data: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [step]: data }));
  }, []);

  // 前进到下一步
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  // 返回上一步
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // 跳转到指定步骤
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }, []);

  // 更新客户信息
  const updateCustomerInfo = useCallback((info: Partial<WizardContextValue['customerInfo']>) => {
    setCustomerInfo((prev) => ({ ...prev, ...info }));
  }, []);

  // 重置表单
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
  }, []);

  // 上下文值（使用 useMemo 缓存整个对象）
  const value = useMemo<WizardContextValue>(
    () => ({
      currentStep,
      formData,
      customerInfo,
      totalSteps,
      progress,
      canGoNext,
      canGoBack,
      isSaving,
      updateFormData,
      setFormData,
      nextStep,
      prevStep,
      goToStep,
      updateCustomerInfo,
      setIsSaving,
      resetForm,
    }),
    [
      currentStep,
      formData,
      customerInfo,
      progress,
      canGoNext,
      canGoBack,
      isSaving,
      updateFormData,
      nextStep,
      prevStep,
      goToStep,
      updateCustomerInfo,
      resetForm,
    ]
  );

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

// 自定义 Hook：使用向导上下文
export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}

// 自定义 Hook：使用步骤表单数据
export function useStepForm<K extends keyof FormData>(
  stepKey: K
): {
  data: FormData[K];
  setData: (data: FormData[K]) => void;
} {
  const { formData, updateFormData } = useWizard();
  
  const data = formData[stepKey];
  const setData = useCallback(
    (newData: FormData[K]) => updateFormData(stepKey, newData),
    [stepKey, updateFormData]
  );

  return useMemo(() => ({ data, setData }), [data, setData]);
}

// 自定义 Hook：使用导航
export function useWizardNavigation() {
  const { currentStep, nextStep, prevStep, goToStep, canGoNext, canGoBack, progress, totalSteps } = useWizard();
  
  return useMemo(
    () => ({
      currentStep,
      nextStep,
      prevStep,
      goToStep,
      canGoNext,
      canGoBack,
      progress,
      totalSteps,
    }),
    [currentStep, nextStep, prevStep, goToStep, canGoNext, canGoBack, progress, totalSteps]
  );
}
