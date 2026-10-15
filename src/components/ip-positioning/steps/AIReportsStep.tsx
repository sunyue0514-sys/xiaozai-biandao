'use client';

import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  FileText,
  Target,
  Loader2,
  Copy,
  CheckCircle,
  Download,
  RefreshCw,
  Wand2,
  Edit,
  Save,
  Info,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { CONTENT_STRATEGY_TYPES } from '@/lib/ip-positioning-config';
import { getToken } from '@/lib/api';

// 构建账号策划报告 - 深度格式化
function buildAccountPlanReport(plan: any): string {
  const lines: string[] = [];
  
  lines.push(`【账号运营规划】\n`);
  
  // 账号定位
  if (plan.账号定位) {
    lines.push(`## 一句话定位`);
    lines.push(plan.账号定位);
    lines.push('');
  }
  
  // 核心差异化
  if (plan.核心差异化) {
    lines.push(`## 核心差异化`);
    lines.push(plan.核心差异化);
    lines.push('');
  }
  
  // 内容支柱
  if (plan.内容支柱 && Array.isArray(plan.内容支柱)) {
    lines.push(`## 内容支柱`);
    plan.内容支柱.forEach((pillar: any, index: number) => {
      lines.push(`【${pillar.名称}】占比${pillar.占比}`);
      lines.push(pillar.具体做法);
      lines.push('');
    });
  }
  
  // 起步30天计划
  if (plan.起步30天计划) {
    lines.push(`## 起步30天计划`);
    const weeks = ['第1周', '第2周', '第3周', '第4周'];
    weeks.forEach(week => {
      if (plan.起步30天计划[week]) {
        const w = plan.起步30天计划[week];
        lines.push(`### ${week}：${w.重点}`);
        if (w.具体动作) {
          lines.push('具体动作：');
          w.具体动作.forEach((action: string, i: number) => {
            lines.push(`  ${i + 1}. ${action}`);
          });
        }
        if (w.预期结果) {
          lines.push(`预期结果：${w.预期结果}`);
        }
        lines.push('');
      }
    });
  }
  
  // 阶段目标
  if (plan.第一阶段目标) {
    lines.push(`## 第一阶段目标（${plan.第一阶段目标.时间}）`);
    lines.push(`粉丝目标：${plan.第一阶段目标.粉丝目标}`);
    lines.push(`核心任务：${plan.第一阶段目标.核心任务}`);
    if (plan.第一阶段目标.里程碑) {
      lines.push('里程碑：');
      plan.第一阶段目标.里程碑.forEach((m: string, i: number) => {
        lines.push(`  ${i + 1}. ${m}`);
      });
    }
    lines.push('');
  }
  
  if (plan.第二阶段目标) {
    lines.push(`## 第二阶段目标（${plan.第二阶段目标.时间}）`);
    lines.push(`粉丝目标：${plan.第二阶段目标.粉丝目标}`);
    lines.push(`核心任务：${plan.第二阶段目标.核心任务}`);
    if (plan.第二阶段目标.里程碑) {
      lines.push('里程碑：');
      plan.第二阶段目标.里程碑.forEach((m: string, i: number) => {
        lines.push(`  ${i + 1}. ${m}`);
      });
    }
    lines.push('');
  }
  
  // 变现路径
  if (plan.变现路径) {
    lines.push(`## 变现路径`);
    if (plan.变现路径['0-3个月']) {
      lines.push(`### 0-3个月`);
      lines.push(plan.变现路径['0-3个月']);
    }
    if (plan.变现路径['3-6个月']) {
      lines.push(`### 3-6个月`);
      lines.push(plan.变现路径['3-6个月']);
    }
    if (plan.变现路径['6-12个月']) {
      lines.push(`### 6-12个月`);
      lines.push(plan.变现路径['6-12个月']);
    }
    lines.push('');
  }
  
  // 关键风险
  if (plan.关键风险 && Array.isArray(plan.关键风险)) {
    lines.push(`## 关键风险与应对`);
    plan.关键风险.forEach((risk: any, index: number) => {
      lines.push(`### 风险${index + 1}：${risk.风险}`);
      lines.push(`预防：${risk.预防}`);
      lines.push(`应对：${risk.应对}`);
      lines.push('');
    });
  }
  
  // 爆款密码
  if (plan.爆款密码) {
    lines.push(`## 爆款密码`);
    lines.push(plan.爆款密码);
    lines.push('');
  }
  
  return lines.join('\n');
}

// 报告内容渲染组件 - 将纯文本转换为可读格式
function ReportContent({ content }: { content: string | object | null | undefined }) {
  // 防御性处理：确保 content 是字符串
  let textContent: string;
  if (typeof content === 'string') {
    textContent = content;
  } else if (content && typeof content === 'object') {
    // 如果是对象，将其格式化为可读文本
    console.warn('ReportContent 收到对象而非字符串:', content);
    textContent = JSON.stringify(content, null, 2);
  } else {
    textContent = '';
  }
  
  if (!textContent) return null;
  
  // 按段落分割
  const lines = textContent.split('\n');
  
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();
        
        // 空行
        if (!trimmedLine) {
          return <div key={index} className="h-2" />;
        }
        
        // Markdown 一级标题 (# 开头)
        if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('## ')) {
          return (
            <h2 key={index} className="text-lg font-bold text-foreground mt-4 mb-2">
              {trimmedLine.replace(/^#\s*/, '')}
            </h2>
          );
        }
        
        // Markdown 二级标题 (## 开头)
        if (trimmedLine.startsWith('## ') && !trimmedLine.startsWith('### ')) {
          return (
            <h3 key={index} className="text-base font-semibold text-foreground mt-3 mb-2">
              {trimmedLine.replace(/^##\s*/, '')}
            </h3>
          );
        }
        
        // Markdown 三级标题 (### 开头)
        if (trimmedLine.startsWith('### ') && !trimmedLine.startsWith('#### ')) {
          return (
            <h4 key={index} className="font-medium text-foreground mt-2 mb-1">
              {trimmedLine.replace(/^###\s*/, '')}
            </h4>
          );
        }
        
        // 移除其他 Markdown 符号 (####, *, -, 等)
        const cleanLine = trimmedLine
          .replace(/^####\s*/, '')
          .replace(/^\*\*\*(.+)\*\*\*$/, '$1')
          .replace(/^\*\*(.+)\*\*$/, '$1')
          .replace(/^\*(.+)\*$/, '$1');
        
        // 标题行（以【】包裹）
        if (cleanLine.startsWith('【') && cleanLine.endsWith('】')) {
          return (
            <h2 key={index} className="text-lg font-bold text-primary mt-4 mb-2">
              {cleanLine.slice(1, -1)}
            </h2>
          );
        }
        
        // 大标题（一、二、三等）
        if (/^[一二三四五六七八九十]+、/.test(cleanLine)) {
          return (
            <h3 key={index} className="text-base font-semibold text-foreground mt-4 mb-2 pt-2 border-t border-border/50">
              {cleanLine}
            </h3>
          );
        }
        
        // 小标题（以冒号结尾的短行）
        if (cleanLine.length < 20 && cleanLine.endsWith('：')) {
          return (
            <h4 key={index} className="font-medium text-foreground mt-3 mb-1">
              {cleanLine}
            </h4>
          );
        }
        
        // 普通文本
        return (
          <p key={index} className="text-muted-foreground">
            {cleanLine}
          </p>
        );
      })}
    </div>
  );
}

interface AIReportsStepProps {
  formData: {
    businessPositioning: string;
    accountPlanning: string;
    contentStrategy: typeof CONTENT_STRATEGY_TYPES;
  };
  setFormData: (data: AIReportsStepProps['formData']) => void;
  customerId: string;
  customerName: string;
  customerDescription: string;
  allFormData: any;
}

export const AIReportsStep = memo(function AIReportsStep({
  formData,
  setFormData,
  customerId,
  customerName,
  customerDescription,
  allFormData,
}: AIReportsStepProps) {
  // 类型断言，支持回调形式的 setFormData
  const setFormDataCallback = setFormData as React.Dispatch<React.SetStateAction<any>>;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [activeTab, setActiveTab] = useState('positioning');

  // 调试：确保 businessPositioning 不会是 JSON 字符串
  useEffect(() => {
    if (formData.businessPositioning && 
        typeof formData.businessPositioning === 'string' && 
        formData.businessPositioning.trim().startsWith('{')) {
      console.error('❌ 检测到 businessPositioning 是 JSON 格式！');
      console.error('内容前200字符:', formData.businessPositioning.slice(0, 200));
      // 如果是 JSON 格式，清空它并提示用户，传递完整对象
      setFormDataCallback({
        businessPositioning: '【提示】请重新生成报告，上次的 JSON 结果已清空',
        accountPlanning: formData.accountPlanning,
        contentStrategy: formData.contentStrategy,
      });
    }
  }, [formData.businessPositioning, formData, setFormData]);

  // 内容策略配置
  const [strategyConfig, setStrategyConfig] = useState(
    CONTENT_STRATEGY_TYPES.map((s) => ({ ...s, ratio: s.ratio }))
  );

  const generateBusinessPositioning = async () => {
    setIsGenerating(true);
    try {
      const token = getToken();
      
      if (!token) {
        toast.error('请先登录');
        return;
      }

      // 调试：打印传递的数据
      console.log('=== 前端传递的数据 ===');
      console.log('allFormData:', JSON.stringify(allFormData, null, 2));
      console.log('customerName:', customerName);
      console.log('customerDescription:', customerDescription);
      
      const response = await fetch('/api/ai/generate-positioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId,
          customerName,
          customerDescription,
          formData: allFormData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '生成失败');
      }

      // 首先尝试解析为 JSON（非流式响应）
      const contentType = response.headers.get('content-type');
      const finalResult = '';
      
      if (contentType?.includes('application/json')) {
        // 非流式 JSON 响应
        const jsonData = await response.json();
        console.log('收到非流式响应:', jsonData);
        
        // 判断响应格式类型
        // 格式1: { success: true, data: { basicInfo, ... } } - 完整结构
        // 格式2: { success: true, businessPositioning: "纯文本", customerId } - 纯文本
        const isCompleteFormat = jsonData.success && jsonData.data && 
          (jsonData.data.basicInfo || jsonData.data.identity || jsonData.data.nickname);
        const isPlainTextFormat = jsonData.success && jsonData.businessPositioning;
        
        if (isCompleteFormat) {
          // 格式1：完整定位数据结构，自动填充到对应字段
          // 使用 any 类型以支持任意属性访问
          const returnedData: any = jsonData.data;
          console.log('✅ 检测到完整定位数据格式，准备填充表单');
          console.log('returnedData keys:', Object.keys(returnedData));
          
          // 格式化 summary：从数据中生成完整深度的定位报告
          let summaryText = '';
          
          // 始终生成完整的深度报告，不依赖 AI 返回的简短 summary
          // 只有当返回了非常长的完整报告时才使用
          const hasCompleteReport = typeof returnedData.summary === 'string' && 
                                   returnedData.summary.length > 500 &&
                                   (returnedData.summary.includes('近10年') || 
                                    returnedData.summary.includes('至暗时刻') || 
                                    returnedData.summary.includes('命运转折'));
          
          if (hasCompleteReport) {
            summaryText = returnedData.summary;
            console.log('✓ 检测到完整报告（长度>' + returnedData.summary.length + '字符），直接使用');
          } else {
            console.log('! 生成完整深度定位报告');
            
            // 提取所有关键信息 - 优先使用后端返回数据，fallback 到表单数据
            // 同时支持嵌套格式和平铺格式
            const allFormDataData = allFormData as Record<string, unknown> | null;
            
            const nickname = returnedData.basicInfo?.nickname || returnedData.nickname || (allFormDataData?.basicInfo as Record<string, unknown>)?.nickname || '';
            const identity = Array.isArray(returnedData.basicInfo?.identity) 
              ? returnedData.basicInfo.identity 
              : (Array.isArray(returnedData.identity) ? returnedData.identity : (Array.isArray((allFormDataData?.basicInfo as Record<string, unknown>)?.identity) ? (allFormDataData?.basicInfo as Record<string, unknown>).identity as string[] : []));
            const identityText = identity.join('、') || '';
            
            const recent10Years = returnedData.lifeStory?.recent10Years || returnedData.recent10Years || (allFormDataData?.lifeStory as Record<string, unknown>)?.recent10Years || '';
            const darkestMoment = returnedData.lifeStory?.darkestMoment || returnedData.darkestMoment || (allFormDataData?.lifeStory as Record<string, unknown>)?.darkestMoment || '';
            const turningPoint = returnedData.lifeStory?.turningPoint || returnedData.turningPoint || (allFormDataData?.lifeStory as Record<string, unknown>)?.turningPoint || '';
            const highlightMoment = returnedData.lifeStory?.highlightMoment || returnedData.highlightMoment || returnedData.lifeStory?.highlight || (allFormDataData?.lifeStory as Record<string, unknown>)?.highlightMoment || '';
            const motto = returnedData.lifeStory?.motto || returnedData.motto || (allFormDataData?.lifeStory as Record<string, unknown>)?.motto || '';
            
            // coreValue - 尝试嵌套格式、平铺格式、表单数据
            const coreValueData = returnedData.coreValue || {};
            const allCoreValue = (allFormDataData?.coreValue || {}) as Record<string, unknown>;
            const specialties = (coreValueData as Record<string, unknown>)?.specialties || returnedData.specialties || allCoreValue?.specialties || '';
            const valueProvided = (coreValueData as Record<string, unknown>)?.valueProvided || returnedData.valueProvided || allCoreValue?.valueProvided || '';
            const passions = (coreValueData as Record<string, unknown>)?.passions || returnedData.passions || allCoreValue?.passions || '';
            
            // skills - 尝试三种格式
            const skillsRaw = (coreValueData as Record<string, unknown>)?.skills || returnedData.skills || allCoreValue?.skills;
            const skills = Array.isArray(skillsRaw) ? skillsRaw : 
                           (typeof skillsRaw === 'string' ? skillsRaw.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean) : []);
            
            // interests - 尝试三种格式
            const interestsRaw = (coreValueData as Record<string, unknown>)?.interests || returnedData.interests || allCoreValue?.interests;
            const interests = Array.isArray(interestsRaw) ? interestsRaw : 
                              (typeof interestsRaw === 'string' ? interestsRaw.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean) : []);
            
            const allUserPersona = (allFormDataData?.userPersona || {}) as Record<string, unknown>;
            const targetCustomers = (returnedData.userPersona as Record<string, unknown>)?.targetCustomers || returnedData.targetCustomers || allUserPersona?.targetCustomers || '';
            const painPoints = (returnedData.userPersona as Record<string, unknown>)?.painPoints || returnedData.painPoints || allUserPersona?.painPoints || '';
            const commonQuestions = Array.isArray((returnedData.userPersona as Record<string, unknown>)?.commonQuestions) 
              ? (returnedData.userPersona as Record<string, unknown>).commonQuestions 
              : (Array.isArray(returnedData.commonQuestions) ? returnedData.commonQuestions : (Array.isArray(allUserPersona?.commonQuestions) ? allUserPersona?.commonQuestions as string[] : []));
            const competitiveAdvantage = (returnedData.userPersona as Record<string, unknown>)?.competitiveAdvantage || returnedData.competitiveAdvantage || allUserPersona?.competitiveAdvantage || '';
            const motivation = (returnedData.userPersona as Record<string, unknown>)?.motivation || returnedData.motivation || allUserPersona?.motivation || '';
            
            // productsServices - 尝试三种格式
            const productsServicesData = returnedData.productsServices || {};
            const allProductsServices = (allFormDataData?.productsServices || {}) as Record<string, unknown>;
            const productTypesRaw = (productsServicesData as Record<string, unknown>)?.productTypes || returnedData.productTypes || allProductsServices?.productTypes;
            const productTypes = Array.isArray(productTypesRaw) ? productTypesRaw : 
                                (typeof productTypesRaw === 'string' ? productTypesRaw.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean) : []);
            const mainProducts = (productsServicesData as Record<string, unknown>)?.mainProducts || returnedData.mainProducts || allProductsServices?.mainProducts || '';
            const priceRange = (productsServicesData as Record<string, unknown>)?.priceRange || returnedData.priceRange || allProductsServices?.priceRange || '';
            const serviceArea = (productsServicesData as Record<string, unknown>)?.serviceArea || returnedData.serviceArea || allProductsServices?.serviceArea || '';
            const uniqueValue = (productsServicesData as Record<string, unknown>)?.uniqueValue || returnedData.uniqueValue || allProductsServices?.uniqueValue || '';
            
            // contentDirection - 尝试三种格式
            const contentDirectionData = returnedData.contentDirection || {};
            const allContentDirection = (allFormDataData?.contentDirection || {}) as Record<string, unknown>;
            const platformsRaw = (contentDirectionData as Record<string, unknown>)?.platforms || returnedData.platforms || allContentDirection?.platforms;
            const platforms = Array.isArray(platformsRaw) ? platformsRaw : 
                             (typeof platformsRaw === 'string' ? platformsRaw.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean) : []);
            const mainTopicsRaw = (contentDirectionData as Record<string, unknown>)?.mainTopics || returnedData.mainTopics || allContentDirection?.mainTopics;
            const mainTopics = Array.isArray(mainTopicsRaw) ? mainTopicsRaw : 
                               (typeof mainTopicsRaw === 'string' ? mainTopicsRaw.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean) : []);
            const contentStyle = (contentDirectionData as Record<string, unknown>)?.contentStyle || returnedData.contentStyle || allContentDirection?.contentStyle || allUserPersona?.contentStyle || '';
            
            // positioningDirection - 尝试三种格式
            const positioningDirectionData = returnedData.positioningDirection || {};
            const allPositioningDirection = (allFormDataData?.positioningDirection || {}) as Record<string, unknown>;
            const nicheField = (positioningDirectionData as Record<string, unknown>)?.nicheField || returnedData.nicheField || allPositioningDirection?.nicheField || '';
            const contentTrackRaw = (positioningDirectionData as Record<string, unknown>)?.contentTrack || returnedData.contentTrack || allPositioningDirection?.contentTrack;
            const contentTrack = Array.isArray(contentTrackRaw) ? contentTrackRaw : 
                               (typeof contentTrackRaw === 'string' ? contentTrackRaw.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean) : []);
            const monetizationRaw = (positioningDirectionData as Record<string, unknown>)?.monetization || returnedData.monetization || allPositioningDirection?.monetization;
            const monetization = Array.isArray(monetizationRaw) ? monetizationRaw : 
                               (typeof monetizationRaw === 'string' ? monetizationRaw.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean) : []);
            
            // 调试：检查数据提取情况
            console.log('=== 数据提取调试 ===');
            console.log('productTypes:', productTypes.length, productTypes);
            console.log('skills:', skills.length, skills);
            console.log('interests:', interests.length, interests);
            console.log('platforms:', platforms.length, platforms);
            console.log('mainTopics:', mainTopics.length, mainTopics);
            console.log('contentTrack:', contentTrack.length, contentTrack);
            console.log('monetization:', monetization.length, monetization);
            console.log('specialties:', specialties.slice(0, 50));
            console.log('uniqueValue:', uniqueValue.slice(0, 50));
            console.log('========================');
            
            // 生成完整的深度报告（去掉AI装饰线和符号）
            summaryText = `【IP定位报告】${nickname ? `— ${nickname}` : ''}

【一句话定位】
${identityText ? `我是${nickname}，${identityText}。` : `我是${nickname}。`}
${valueProvided ? `核心价值：${valueProvided}` : ''}

【核心人设】
${specialties ? `特长定位：${specialties}` : ''}
${passions ? `内在热情：${passions}` : ''}
${motto ? `人生信条：${motto}` : ''}

【人生故事】
${recent10Years ? `【近10年经历】\n${recent10Years}` : ''}
${darkestMoment ? `\n【至暗时刻】\n${darkestMoment}` : ''}
${turningPoint ? `\n【命运转折】\n${turningPoint}` : ''}
${highlightMoment ? `\n【高光时刻】\n${highlightMoment}` : ''}

【用户画像】
${targetCustomers ? `【目标用户】\n${targetCustomers}` : ''}
${painPoints ? `\n【用户痛点】\n${painPoints}` : ''}
${commonQuestions.length > 0 ? `\n【高频问题】\n${commonQuestions.join('\n')}` : ''}
${competitiveAdvantage ? `\n【竞争优势】\n${competitiveAdvantage}` : ''}
${motivation ? `\n【内在动力】\n${motivation}` : ''}

【产品服务】
${productTypes.length > 0 ? `【产品矩阵】\n${productTypes.join('\n')}` : ''}
${mainProducts ? `\n【核心产品】\n${mainProducts}` : ''}
${priceRange ? `\n【价格区间】${priceRange}` : ''}
${serviceArea ? `\n【服务范围】${serviceArea}` : ''}
${uniqueValue ? `\n【独特价值】\n${uniqueValue}` : ''}

【内容策略】
${platforms.length > 0 ? `【内容平台】\n${platforms.join('\n')}` : ''}
${mainTopics.length > 0 ? `\n【主要内容】\n${mainTopics.join('\n')}` : ''}
${contentStyle ? `\n【内容风格】\n${contentStyle}` : ''}

【账号定位】
${nicheField ? `【细分领域】\n${nicheField}` : ''}
${contentTrack.length > 0 ? `\n【内容赛道】\n${contentTrack.join('\n')}` : ''}
${monetization.length > 0 ? `\n【变现路径】\n${monetization.join('\n')}` : ''}

【个人特质】
${skills.length > 0 ? `【核心技能】\n${skills.join('\n')}` : ''}
${interests.length > 0 ? `\n【兴趣爱好】\n${interests.join('\n')}` : ''}
`;
          }
          
          console.log('最终 summaryText 前100字符:', summaryText.slice(0, 100));
          
          // 构建更新对象 - 同时支持嵌套格式和平铺格式
          // 使用 as any 来绕过 TypeScript 类型检查，因为 allFormData 实际包含完整数据
          const formDataAny = formData as any;
          const updatedFormData = {
            ...formDataAny,
            businessPositioning: summaryText,
            // 填充 basicInfo - 优先使用嵌套格式，fallback 到平铺格式
            basicInfo: returnedData.basicInfo ? {
              ...formDataAny.basicInfo,
              ...returnedData.basicInfo,
              // 处理 personality 可能是数组的情况
              personality: Array.isArray(returnedData.basicInfo.personality) 
                ? returnedData.basicInfo.personality 
                : (typeof returnedData.basicInfo.personality === 'string' 
                  ? returnedData.basicInfo.personality.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.basicInfo?.personality),
              values: returnedData.basicInfo.values || formDataAny.basicInfo?.values,
            } : returnedData.identity || returnedData.nickname ? {
              // 平铺格式转换
              ...formDataAny.basicInfo,
              nickname: returnedData.nickname || formDataAny.basicInfo?.nickname,
              age: returnedData.age || formDataAny.basicInfo?.age,
              education: returnedData.education || formDataAny.basicInfo?.education,
              location: returnedData.location || formDataAny.basicInfo?.location,
              appearance: returnedData.appearance || formDataAny.basicInfo?.appearance,
              personality: Array.isArray(returnedData.identity) 
                ? returnedData.identity 
                : (typeof returnedData.identity === 'string' 
                  ? returnedData.identity.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.basicInfo?.personality),
              othersEvaluation: returnedData.othersEvaluation || formDataAny.basicInfo?.othersEvaluation,
              familyInfluence: returnedData.familyInfluence || formDataAny.basicInfo?.familyInfluence,
              values: returnedData.values || formDataAny.basicInfo?.values,
            } : formDataAny.basicInfo,
            // 填充 coreValue - 优先使用嵌套格式，fallback 到平铺格式  
            coreValue: returnedData.coreValue ? {
              ...formDataAny.coreValue,
              ...returnedData.coreValue,
              interests: Array.isArray(returnedData.coreValue.interests) 
                ? returnedData.coreValue.interests 
                : (typeof returnedData.coreValue.interests === 'string'
                  ? returnedData.coreValue.interests.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.coreValue?.interests),
              skills: Array.isArray(returnedData.coreValue.skills)
                ? returnedData.coreValue.skills
                : (typeof returnedData.coreValue.skills === 'string'
                  ? returnedData.coreValue.skills.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.coreValue?.skills),
            } : returnedData.interests || returnedData.skills ? {
              // 平铺格式转换
              ...formDataAny.coreValue,
              interests: Array.isArray(returnedData.interests) 
                ? returnedData.interests 
                : (typeof returnedData.interests === 'string'
                  ? returnedData.interests.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.coreValue?.interests),
              skills: Array.isArray(returnedData.skills)
                ? returnedData.skills
                : (typeof returnedData.skills === 'string'
                  ? returnedData.skills.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.coreValue?.skills),
              specialties: returnedData.specialties || formDataAny.coreValue?.specialties,
              passions: returnedData.passions || formDataAny.coreValue?.passions,
              valueProvided: returnedData.valueProvided || formDataAny.coreValue?.valueProvided,
            } : formDataAny.coreValue,
            // 填充 lifeStory
            lifeStory: returnedData.lifeStory ? {
              ...formDataAny.lifeStory,
              ...returnedData.lifeStory,
            } : returnedData.recent10Years || returnedData.darkestMoment ? {
              // 平铺格式转换
              ...formDataAny.lifeStory,
              recent10Years: returnedData.recent10Years || formDataAny.lifeStory?.recent10Years,
              darkestMoment: returnedData.darkestMoment || formDataAny.lifeStory?.darkestMoment,
              turningPoint: returnedData.turningPoint || formDataAny.lifeStory?.turningPoint,
              highlightMoment: returnedData.highlightMoment || formDataAny.lifeStory?.highlightMoment,
              motto: returnedData.motto || formDataAny.lifeStory?.motto,
            } : formDataAny.lifeStory,
            // 填充 userPersona
            userPersona: returnedData.userPersona ? {
              ...formDataAny.userPersona,
              ...returnedData.userPersona,
              commonQuestions: Array.isArray(returnedData.userPersona.commonQuestions)
                ? returnedData.userPersona.commonQuestions
                : (typeof returnedData.userPersona.commonQuestions === 'string'
                  ? returnedData.userPersona.commonQuestions.split(/\n/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.userPersona?.commonQuestions),
            } : returnedData.targetCustomers || returnedData.painPoints ? {
              // 平铺格式转换
              ...formDataAny.userPersona,
              targetCustomers: returnedData.targetCustomers || formDataAny.userPersona?.targetCustomers,
              painPoints: returnedData.painPoints || formDataAny.userPersona?.painPoints,
              commonQuestions: Array.isArray(returnedData.commonQuestions)
                ? returnedData.commonQuestions
                : formDataAny.userPersona?.commonQuestions,
              competitiveAdvantage: returnedData.competitiveAdvantage || formDataAny.userPersona?.competitiveAdvantage,
              motivation: returnedData.motivation || formDataAny.userPersona?.motivation,
            } : formDataAny.userPersona,
            // 填充 productsServices
            productsServices: returnedData.productsServices ? {
              ...formDataAny.productsServices,
              ...returnedData.productsServices,
              productTypes: Array.isArray(returnedData.productsServices.productTypes)
                ? returnedData.productsServices.productTypes
                : formDataAny.productsServices?.productTypes,
            } : returnedData.productTypes || returnedData.mainProducts ? {
              // 平铺格式转换
              ...formDataAny.productsServices,
              productTypes: Array.isArray(returnedData.productTypes)
                ? returnedData.productTypes
                : (typeof returnedData.productTypes === 'string'
                  ? returnedData.productTypes.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.productsServices?.productTypes),
              mainProducts: returnedData.mainProducts || formDataAny.productsServices?.mainProducts,
              priceRange: returnedData.priceRange || formDataAny.productsServices?.priceRange,
              serviceArea: returnedData.serviceArea || formDataAny.productsServices?.serviceArea,
              uniqueValue: returnedData.uniqueValue || formDataAny.productsServices?.uniqueValue,
            } : formDataAny.productsServices,
            // 填充 contentDirection
            contentDirection: returnedData.contentDirection ? {
              ...formDataAny.contentDirection,
              ...returnedData.contentDirection,
              platforms: Array.isArray(returnedData.contentDirection.platforms)
                ? returnedData.contentDirection.platforms
                : formDataAny.contentDirection?.platforms,
              mainTopics: Array.isArray(returnedData.contentDirection.mainTopics)
                ? returnedData.contentDirection.mainTopics
                : formDataAny.contentDirection?.mainTopics,
            } : returnedData.platforms || returnedData.mainTopics ? {
              // 平铺格式转换
              ...formDataAny.contentDirection,
              platforms: Array.isArray(returnedData.platforms)
                ? returnedData.platforms
                : (typeof returnedData.platforms === 'string'
                  ? returnedData.platforms.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.contentDirection?.platforms),
              mainTopics: Array.isArray(returnedData.mainTopics)
                ? returnedData.mainTopics
                : formDataAny.contentDirection?.mainTopics,
              contentStyle: returnedData.contentStyle || formDataAny.contentDirection?.contentStyle,
              updateFrequency: returnedData.updateFrequency || formDataAny.contentDirection?.updateFrequency,
            } : formDataAny.contentDirection,
            // 填充 positioningDirection
            positioningDirection: returnedData.positioningDirection ? {
              ...formDataAny.positioningDirection,
              ...returnedData.positioningDirection,
              contentTrack: Array.isArray(returnedData.positioningDirection.contentTrack)
                ? returnedData.positioningDirection.contentTrack
                : formDataAny.positioningDirection?.contentTrack,
              monetization: Array.isArray(returnedData.positioningDirection.monetization)
                ? returnedData.positioningDirection.monetization
                : formDataAny.positioningDirection?.monetization,
            } : returnedData.nicheField || returnedData.contentTrack ? {
              // 平铺格式转换
              ...formDataAny.positioningDirection,
              nicheField: returnedData.nicheField || formDataAny.positioningDirection?.nicheField,
              contentTrack: Array.isArray(returnedData.contentTrack)
                ? returnedData.contentTrack
                : (typeof returnedData.contentTrack === 'string'
                  ? returnedData.contentTrack.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.positioningDirection?.contentTrack),
              monetization: Array.isArray(returnedData.monetization)
                ? returnedData.monetization
                : (typeof returnedData.monetization === 'string'
                  ? returnedData.monetization.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)
                  : formDataAny.positioningDirection?.monetization),
            } : formDataAny.positioningDirection,
          };
          
          setFormDataCallback(updatedFormData);
          console.log('✅ 表单数据已更新');
          console.log('✅ businessPositioning 长度:', summaryText.length);
          console.log('✅ businessPositioning 前50字符:', summaryText.slice(0, 50));
          toast.success('商业定位报告生成完成，数据已自动填充到表单');
        } else if (jsonData.businessPositioning) {
          // 旧格式：只返回 businessPositioning 字段
          const finalResult = jsonData.businessPositioning;
          setFormDataCallback({
            businessPositioning: finalResult,
            accountPlanning: formData.accountPlanning,
            contentStrategy: formData.contentStrategy,
          });
          toast.success('商业定位报告生成完成');
        } else {
          toast.error('返回数据格式异常');
        }
      } else {
        // 流式 SSE 响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let result = '';

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
                    result += data.content;
                    setFormDataCallback({ ...formData, businessPositioning: result });
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        }

        toast.success('商业定位报告生成完成');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAccountPlanning = async () => {
    console.log('🔵 generateAccountPlanning 开始执行');
    setIsGeneratingPlan(true);
    try {
      const token = getToken();
      
      if (!token) {
        toast.error('请先登录');
        return;
      }
      
      console.log('📤 发送账号策划请求...');
      console.log('  customerId:', customerId);
      console.log('  customerName:', customerName);
      console.log('  businessPositioning:', formData.businessPositioning?.substring(0, 100));
      
      const response = await fetch('/api/ai/generate-account-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId,
          customerName,
          customerDescription,
          businessPositioning: formData.businessPositioning,  // 添加这个参数
          formData: allFormData as any,
        }),
      });

      console.log('📥 收到响应，状态:', response.status);

      if (!response.ok) {
        console.error('❌ 请求失败:', response.status);
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '生成失败');
      }

      const contentType = response.headers.get('content-type') || '';
      console.log('📦 Content-Type:', contentType);
      
      if (contentType.includes('text/event-stream')) {
        console.log('📡 使用流式响应处理');
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let result = '';

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
                    result += data.content;
                    // 传递完整的 aiReports 对象
                    setFormDataCallback({
                      businessPositioning: formData.businessPositioning,
                      accountPlanning: result,
                      contentStrategy: formData.contentStrategy,
                    });
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        }
      } else {
        console.log('📋 使用非流式响应处理');
        const data = await response.json();
        console.log('📦 响应状态:', response.status);
        console.log('📦 响应数据 keys:', Object.keys(data));
        console.log('📦 响应数据:', JSON.stringify(data, null, 2).substring(0, 2000));
        
        if (data.success && data.data) {
          console.log('✅ 成功获取 plan 数据');
          console.log('📦 plan 数据 keys:', Object.keys(data.data));
          const plan = data.data;
          
          // 构建深度格式化报告
          const formattedText = buildAccountPlanReport(plan);
          
          console.log('📝 formattedText 前200字:', formattedText.substring(0, 200));
          console.log('📝 formattedText 长度:', formattedText.length);
          // 传递完整的 aiReports 对象
          setFormDataCallback({
            businessPositioning: formData.businessPositioning,
            accountPlanning: formattedText,
            contentStrategy: formData.contentStrategy,
          });
          console.log('✅ accountPlanning 已设置');
        } else {
          console.error('❌ 响应数据格式异常:', data);
          toast.error(data.error || '生成内容格式异常，请重试');
          throw new Error(data.error || '生成失败');
        }
      }

      console.log('✅ 生成流程完成');
      toast.success('账号策划报告生成完成');
      
      // 确保 Tab 保持在 planning
      setActiveTab('planning');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const startEdit = (content: string) => {
    setEditedContent(content);
    setIsEditing(true);
  };

  const saveEdit = () => {
    setFormDataCallback((prev: any) => ({ 
      ...prev, 
      businessPositioning: activeTab === 'positioning' ? editedContent : prev.businessPositioning,
      accountPlanning: activeTab === 'account' ? editedContent : prev.accountPlanning,
    }));
    setIsEditing(false);
    toast.success('保存成功');
  };

  // 如果没有生成报告，显示醒目的生成入口
  if (!formData.businessPositioning && !isGenerating) {
    return (
      <div className="space-y-6">
        {/* 醒目的生成报告入口 - 苹果风格 */}
        <Card className="relative overflow-hidden border-border shadow-sm">
          <CardContent className="relative pt-10 pb-10 text-center">
            {/* 图标 */}
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </div>
            
            {/* 标题 */}
            <h2 className="text-2xl font-semibold mb-3 text-foreground">
              AI智能报告生成
            </h2>
            
            {/* 说明 */}
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              基于您填写的信息，AI将为您生成专业的<span className="text-primary font-medium">商业定位报告</span>和<span className="text-primary font-medium">账号策划报告</span>
            </p>
            
            {/* 特性标签 */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                一键生成
              </Badge>
              <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
                <Target className="w-3.5 h-3.5 mr-1.5 text-primary" />
                精准定位
              </Badge>
              <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
                <Edit className="w-3.5 h-3.5 mr-1.5 text-sky-500" />
                可编辑修改
              </Badge>
            </div>
            
            {/* 生成按钮 */}
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-medium px-10 py-6 text-base rounded-xl transition-all active:scale-[0.98]"
              onClick={generateBusinessPositioning}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              立即生成报告
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            {/* 提示 */}
            <p className="text-xs text-muted-foreground mt-4">
              生成后可随时编辑调整内容
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果正在生成，显示加载状态
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <Card className="border-border/50">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="relative inline-block mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI正在生成报告...</h3>
            <p className="text-muted-foreground text-sm">正在分析您的信息，请稍候</p>
            {formData.businessPositioning && (
              <div className="mt-6 p-4 bg-muted rounded-lg text-left max-h-[400px] overflow-y-auto">
                <ReportContent content={formData.businessPositioning} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // 已生成报告，显示报告内容
  return (
    <div className="space-y-6">
      {/* 报告选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="positioning" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            商业定位报告
            {formData.businessPositioning && <CheckCircle className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            账号策划报告
            {formData.accountPlanning && <CheckCircle className="w-3 h-3 text-green-500" />}
          </TabsTrigger>
          <TabsTrigger value="strategy" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            内容策略
          </TabsTrigger>
        </TabsList>

        {/* 商业定位报告 */}
        <TabsContent value="positioning" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                商业定位报告
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(formData.businessPositioning)}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(formData.businessPositioning)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  编辑
                </Button>
                <Button
                  className="bg-primary"
                  size="sm"
                  onClick={generateBusinessPositioning}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      重新生成
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ReportContent content={formData.businessPositioning} />
            </CardContent>
          </Card>
          
          {/* 提示生成账号策划报告 */}
          {!formData.accountPlanning && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">生成账号策划报告</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">基于商业定位，为您规划账号运营策略</p>
                  </div>
                </div>
                <Button
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={async () => {
                    console.log('🔵 点击了卡片上的生成按钮，切换到 planning tab');
                    setActiveTab('planning');
                    // 等待 Tab 切换动画完成后再生成
                    await new Promise(resolve => setTimeout(resolve, 100));
                    generateAccountPlanning();
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  生成
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 账号策划报告 */}
        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                账号策划报告
              </CardTitle>
              <div className="flex gap-2">
                {formData.accountPlanning && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(formData.accountPlanning)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(formData.accountPlanning)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                  </>
                )}
                <Button
                  className="bg-primary"
                  size="sm"
                  onClick={() => {
                    console.log('🔵 点击了账号策划报告按钮', {
                      businessPositioning: !!formData.businessPositioning,
                      businessPositioningLength: formData.businessPositioning?.length,
                      isGeneratingPlan
                    });
                    generateAccountPlanning();
                  }}
                  disabled={isGeneratingPlan || !formData.businessPositioning}
                >
                  {isGeneratingPlan ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      {formData.accountPlanning ? '重新生成' : '生成报告'}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!formData.businessPositioning ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>请先生成商业定位报告</p>
                </div>
              ) : formData.accountPlanning ? (
                <ReportContent content={formData.accountPlanning} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>点击&quot;生成报告&quot;按钮，AI将为您生成账号策划报告</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 内容策略 */}
        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-green-600" />
                内容策略配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategyConfig.map((strategy, index) => (
                  <div key={strategy.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">{strategy.type}</Label>
                        <p className="text-xs text-muted-foreground">{strategy.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{strategy.ratio}%</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={strategy.ratio}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newConfig = [...strategyConfig];
                            newConfig[index].ratio = parseInt(e.target.value) || 0;
                            setStrategyConfig(newConfig);
                          }}
                          className="w-16 h-8"
                        />
                      </div>
                    </div>
                    <Progress value={strategy.ratio} className="h-2" />
                    <p className="text-xs text-muted-foreground">目标：{strategy.goal}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 编辑对话框 */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              编辑{activeTab === 'positioning' ? '商业定位' : '账号策划'}报告
            </DialogTitle>
            <DialogDescription>
              您可以直接编辑AI生成的内容
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[400px] font-sans"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              取消
            </Button>
            <Button className="bg-primary" onClick={saveEdit}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
