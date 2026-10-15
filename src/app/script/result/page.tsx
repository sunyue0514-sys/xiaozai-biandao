'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Download, 
  Save,
  Check,
  ArrowLeft,
  RefreshCw,
  Lightbulb,
  PenTool,
  FileText,
  CheckCircle2,
  Zap,
  Plus,
  FileEdit,
  History,
  MessageSquare,
  Users,
  ChevronDown,
  ChevronUp,
  Radio,
  DollarSign,
  Target,
  Tag,
  Heart,
  HelpCircle,
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useGenerationHistory } from '@/hooks/useGenerationHistory';
import { GenerationHistory } from '@/components/history/GenerationHistory';
import { 
  CopywritingCard, 
  DisplayModeToggle, 
  CreationSummary,
  DisplayMode,
  CopywritingAnalysis,
} from '@/components/result';
import { ScriptResultView } from '@/components/script/ScriptResultView';
import { DualVersionScriptView } from '@/components/script/DualVersionScriptView';
import { RewriteMultiFormatView } from '@/components/script/RewriteMultiFormatView';
import type { ScriptResult, DualVersionScriptResult, RewriteScriptResult } from '@/types/script';
import { parseScriptJson, parseRewriteScriptJson } from '@/types/script';
import { GenerationTip } from '@/components/ui/generation-tip';
import { 
  calculateOpeningScoreBasic,
  analyzeMarketing,
  performQualityCheck,
  evaluateCopywritingRating,
  extractOpening,
} from '@/lib/copywriting-analysis';
import { TOPIC_TYPES, TOPIC_CATEGORIES } from '@/lib/topic-types';

// 英文ID转中文标签
const getTopicLabel = (id: string): string => {
  // 新版分类（流量型/变现型/人设型）
  const newCategory = TOPIC_CATEGORIES[id as keyof typeof TOPIC_CATEGORIES];
  if (newCategory) return newCategory.label;
  
  // 旧版分类（说观点/教知识/晒过程/讲故事）
  const oldType = TOPIC_TYPES[id as keyof typeof TOPIC_TYPES];
  if (oldType) return oldType.label;
  
  // 子类型（如 traffic_a, conversion_b）
  if (id.includes('_')) {
    const [categoryId, subType] = id.split('_');
    const category = TOPIC_CATEGORIES[categoryId as keyof typeof TOPIC_CATEGORIES];
    if (category) {
      return `${category.label}${subType === 'a' ? 'A类' : 'B类'}`;
    }
  }
  
  return id; // 兜底返回原值
};

// 生成类型配置
const GENERATION_TYPES: Record<string, { 
  name: string; 
  icon: typeof Lightbulb; 
  color: string;
  bgColor: string;
  apiPath: string;
  supportScript?: boolean; // 是否支持文案转脚本
  isBatchOpening?: boolean; // 是否是批量开篇生成
  isBatchTopic?: boolean; // 是否是批量选题生成
  isDialogue?: boolean; // 是否是对话流生成
  isLiveSpeech?: boolean; // 是否是直播话术生成
}> = {
  topic: { 
    name: '智能选题', 
    icon: Lightbulb, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    apiPath: '/api/ai/topic-recommend',
  },
  topic_batch: { 
    name: '智能选题', 
    icon: Lightbulb, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    apiPath: '/api/ai/topic-recommend-batch',
    isBatchTopic: true,
  },
  writing: { 
    name: '文案创作', 
    icon: PenTool, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    apiPath: '/api/script/writing',
    supportScript: true,
  },
  dialogue: {
    name: '对话流',
    icon: MessageSquare,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    apiPath: '/api/script/dialogue',
    isDialogue: true,
  },
  script: { 
    name: '脚本生成', 
    icon: FileText, 
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    apiPath: '/api/script/generate-structured', // 使用新的结构化脚本API
  },
  opening_batch: { 
    name: '创作开篇', 
    icon: Sparkles, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    apiPath: '/api/script/opening/batch',
    isBatchOpening: true,
  },
  qianchuan_copywriting: { 
    name: '千川文案', 
    icon: Sparkles, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    apiPath: '/api/qianchuan/copywriting',
    supportScript: true,
  },
  qianchuan_script: { 
    name: '千川脚本', 
    icon: FileText, 
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    apiPath: '/api/qianchuan/script',
  },
  feedad_copywriting: { 
    name: '信息流文案', 
    icon: PenTool, 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    apiPath: '/api/feed-ad/copywriting',
    supportScript: true,
  },
  feedad_script: { 
    name: '信息流脚本', 
    icon: FileText, 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    apiPath: '/api/feed-ad/script',
  },
  live_speech: { 
    name: '直播话术', 
    icon: Radio, 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    apiPath: '/api/ai/live-speech',
    isLiveSpeech: true, // 直播话术专用标记
  },
};

// 生成状态
type GenerationStatus = 'preparing' | 'generating' | 'completed' | 'error';

// 解析结果项
interface ResultItem {
  id: number;
  content: string;
  title?: string;
  // 封面标题
  coverTitles?: string[];
  // 开篇相关属性
  strategy?: string;
  strategyName?: string;
  scores?: {
    predictionDisruption: number;
    rewardLoss: number;
    naming: number;
    total: number;
  };
  rating?: 'excellent' | 'good' | 'pass' | 'needs_work';
  ratingLabel?: string;
  wordCount?: number;
  qualityChecks?: {
    concise: boolean;
    colloquial: boolean;
    restrained: boolean;
    userRelated: boolean;
  };
  // 选题相关属性
  topicType?: string;
  typeName?: string;
  method?: string;
  methodName?: string;
  topicScore?: number;
  highlights?: string[];
  // 文案分析结果
  analysis?: CopywritingAnalysis;
  // 创作分析（详细版）
  creationAnalysis?: any;
}

// 分组选题结果（旧版格式兼容）
interface GroupedTopics {
  typeId: string;
  typeInfo: {
    id: string;
    name: string;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
  };
  topics: ResultItem[];
}

// 新版分组选题结果（流量型/变现型/人设型）
interface NewGroupedTopics {
  categoryId: string;
  categoryInfo: {
    id: string;
    name: string;
    label: string;
    icon: string;
    color: string;
    bgColor: string;
  };
  subGroups: {
    subTypeId: string;
    subType: 'A' | 'B';
    name: string;
    goal: string;
    topics: ResultItem[];
  }[];
}

// 人群分析结果
interface AudienceAnalysis {
  profile: string;
  quadrants: Array<{
    id: string;
    name: string;
    desc: string;
    focus: string;
    examples?: string[];
  }>;
  painPoints: {
    demand: string;
    pain: string;
    pleasure: string;
    itch: string;
  };
  businessGoal: string;
  strategy: string;
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const resultRef = useRef<HTMLDivElement>(null);
  const contentBufferRef = useRef<string>('');
  const isGeneratingRef = useRef(false); // 防止重复生成
  const prevTypeRef = useRef<string>(''); // 跟踪上一个 type
  const structuredScriptRef = useRef<ScriptResult | null>(null); // 结构化脚本数据
  
  const [status, setStatus] = useState<GenerationStatus>('preparing');
  const [result, setResult] = useState('');
  const [displayResult, setDisplayResult] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedItems, setSavedItems] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [generationType, setGenerationType] = useState<string>('topic');
  const [taskInfo, setTaskInfo] = useState<Record<string, any>>({});
  // 润色相关状态
  const [polishingId, setPolishingId] = useState<number | null>(null);
  const [polishedResult, setPolishedResult] = useState<string | null>(null);
  const [showPolishModal, setShowPolishModal] = useState(false);
  const [polishingText, setPolishingText] = useState('');
  const [progress, setProgress] = useState(0);
  const [resultItems, setResultItems] = useState<ResultItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  
  // 展示模式（精简/详细）
  const [displayMode, setDisplayMode] = useState<DisplayMode>('compact');
  
  // 分析加载状态
  const [analyzingItems, setAnalyzingItems] = useState<Set<number>>(new Set());
  
  // 分组选题状态
  const [groupedTopics, setGroupedTopics] = useState<GroupedTopics[]>([]);
  const [currentGeneratingType, setCurrentGeneratingType] = useState<string>('');
  
  // 新版分组选题状态（流量型/变现型/人设型）
  const [newGroupedTopics, setNewGroupedTopics] = useState<NewGroupedTopics[]>([]);
  const [audienceAnalysis, setAudienceAnalysis] = useState<AudienceAnalysis | null>(null);
  const [dataVersion, setDataVersion] = useState<'1.0' | '2.0'>('1.0');
  
  // 对话流状态
  const [dialogueResult, setDialogueResult] = useState<{
    ipInfo?: {
      industry?: string;
      persona?: string;
      coreAngle?: string;
      productService?: string;
      businessGoal?: string;
      targetAudience?: string;
    };
    opening?: { question: string; answer: string };
    rounds?: Array<{ round: number; goal: string; question: string; answer: string }>;
    monologue?: string;
  } | null>(null);
  const [expandedDialogueRounds, setExpandedDialogueRounds] = useState<Set<number>>(new Set([1, 2, 3]));
  const [showDialogueMonologue, setShowDialogueMonologue] = useState(true);
  
  // 直播话术状态
  const [liveSpeechResult, setLiveSpeechResult] = useState<{
    merchantName: string;
    industry: string;
    industryName: string;
    priceInfo: {
      originalPrice: number;
      livePrice: number;
      discount: number;
      discountRate: string;
    };
    packageValue: {
      totalItems: number;
      estimatedValue: number;
      savings: number;
    };
    speeches: Array<{
      hookType: string;
      hookName: string;
      hookLabel: string;
      hookDescription: string;
      steps: Array<{
        stepId: string;
        stepName: string;
        order: number;
        content: string;
        tips?: string[];
      }>;
      analysis: {
        hookType: string;
        coreTechnique: string;
        copyableFormula: string;
      };
      fullScript: string;
    }>;
    suggestions: {
      missingInfo: string[];
      versionSwitch: string;
      industryTips: string;
    };
  } | null>(null);
  const [activeSpeechTab, setActiveSpeechTab] = useState<string>('price');
  const [expandedSpeechSteps, setExpandedSpeechSteps] = useState<Set<string>>(new Set());
  
  // 结构化脚本状态
  const [structuredScriptResult, setStructuredScriptResult] = useState<ScriptResult | null>(null);
  const [dualVersionScriptResult, setDualVersionScriptResult] = useState<DualVersionScriptResult | null>(null);
  const [rewriteScriptResult, setRewriteScriptResult] = useState<RewriteScriptResult | null>(null);
  const [isStructuredScript, setIsStructuredScript] = useState(false);
  
  // 历史记录
  const { addHistory, getTypeHistory } = useGenerationHistory();
  const [showHistory, setShowHistory] = useState(false);
  
  // 解析结果为独立项
  const parseResultItems = useCallback((text: string, type: string): ResultItem[] => {
    const items: ResultItem[] = [];
    
    if (type === 'topic') {
      // 智能选题：按行分割，每行一个选题
      const lines = text.split('\n').filter(line => line.trim());
      
      lines.forEach((line, index) => {
        // 移除可能的前缀编号（如 "1. "、"1、"等）
        const content = line.replace(/^\d+[.、）]\s*/, '').trim();
        if (content) {
          items.push({
            id: index,
            content,
            title: content.substring(0, 50)
          });
        }
      });
      
      // 如果没有解析出任何项，把整体作为一个项目
      if (items.length === 0) {
        items.push({ id: 0, content: text, title: '选题列表' });
      }
    } else if (type === 'writing' || type === 'qianchuan_copywriting' || type === 'feedad_copywriting') {
      // 文案创作/千川文案/信息流文案：尝试解析JSON格式
      try {
        // 清理文本，移除可能的markdown代码块标记
        let cleanText = text.trim();
        
        // 移除开头的 markdown 代码块标记
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.slice(7);
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.slice(3);
        }
        
        // 移除结尾的 markdown 代码块标记
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.slice(0, -3);
        }
        
        cleanText = cleanText.trim();
        
        // 方法1：先尝试直接解析整个文本
        try {
          const parsed = JSON.parse(cleanText);
          
          // 新格式：copywritings数组（多个文案）
          if (parsed.copywritings && Array.isArray(parsed.copywritings) && parsed.copywritings.length > 0) {
            parsed.copywritings.forEach((item: any, index: number) => {
              items.push({
                id: index,
                content: item.content || '',
                title: `文案内容${index + 1}`,
                coverTitles: Array.isArray(item.coverTitles) ? item.coverTitles : [],
              });
            });
            console.log('[文案解析] 多文案格式解析成功，共', items.length, '个文案');
            return items;
          }
          
          // 旧格式兼容：单个文案
          if (parsed.content) {
            items.push({
              id: 0,
              content: parsed.content,
              title: '文案内容',
              coverTitles: Array.isArray(parsed.coverTitles) ? parsed.coverTitles : [],
            });
            console.log('[文案解析] 单文案格式解析成功');
            return items;
          }
        } catch {
          // 直接解析失败，继续尝试其他方法
        }
        
        // 方法2：找到 JSON 对象的边界并提取
        const jsonStart = cleanText.indexOf('{');
        const jsonEnd = cleanText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = cleanText.substring(jsonStart, jsonEnd + 1);
          
          try {
            const parsed = JSON.parse(jsonStr);
            
            // 新格式：copywritings数组
            if (parsed.copywritings && Array.isArray(parsed.copywritings) && parsed.copywritings.length > 0) {
              parsed.copywritings.forEach((item: any, index: number) => {
                items.push({
                  id: index,
                  content: item.content || '',
                  title: `文案内容${index + 1}`,
                  coverTitles: Array.isArray(item.coverTitles) ? item.coverTitles : [],
                });
              });
              console.log('[文案解析] 多文案格式解析成功');
              return items;
            }
            
            // 旧格式兼容
            if (parsed.content) {
              items.push({
                id: 0,
                content: parsed.content,
                title: '文案内容',
                coverTitles: Array.isArray(parsed.coverTitles) ? parsed.coverTitles : [],
              });
              console.log('[文案解析] JSON提取解析成功');
              return items;
            }
          } catch (parseError) {
            console.warn('[文案解析] JSON提取解析失败:', parseError);
            
            // 方法3：尝试清理 JSON 字符串中的特殊字符
            try {
              // 移除可能的控制字符和特殊空格
              const cleanedJson = jsonStr
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
                .replace(/\u00A0/g, ' ') // 替换不间断空格为普通空格
                .replace(/\u200B/g, '') // 移除零宽空格
                .replace(/\uFEFF/g, ''); // 移除 BOM
              
              const parsed = JSON.parse(cleanedJson);
              
              // 新格式
              if (parsed.copywritings && Array.isArray(parsed.copywritings) && parsed.copywritings.length > 0) {
                parsed.copywritings.forEach((item: any, index: number) => {
                  items.push({
                    id: index,
                    content: item.content || '',
                    title: `文案内容${index + 1}`,
                    coverTitles: Array.isArray(item.coverTitles) ? item.coverTitles : [],
                  });
                });
                console.log('[文案解析] 清理后多文案解析成功');
                return items;
              }
              
              // 旧格式
              if (parsed.content) {
                items.push({
                  id: 0,
                  content: parsed.content,
                  title: '文案内容',
                  coverTitles: Array.isArray(parsed.coverTitles) ? parsed.coverTitles : [],
                });
                console.log('[文案解析] 清理后解析成功');
                return items;
              }
            } catch (cleanError) {
              console.warn('[文案解析] 清理后解析仍失败:', cleanError);
            }
          }
        }
        
        // 所有解析方法都失败，作为普通文本显示
        console.warn('[文案解析] 所有解析方法失败，显示原始文本');
        items.push({ id: 0, content: text, title: '完整内容' });
      } catch (e) {
        // JSON解析失败，作为普通文本处理
        console.warn('[文案解析] 异常:', e);
        items.push({ id: 0, content: text, title: '完整内容' });
      }
    } else {
      // 其他类型：作为整体显示
      items.push({ id: 0, content: text, title: '完整内容' });
    }
    
    return items.length > 0 ? items : [{ id: 0, content: text, title: '生成结果' }];
  }, []);
  
  useEffect(() => {
    // 等待认证完成
    if (isAuthLoading) return;
    
    // 如果未认证，跳转登录页
    if (!isAuthenticated) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    
    const type = searchParams.get('type') || 'topic';
    const historyId = searchParams.get('historyId');
    
    // 如果是历史记录恢复，直接处理，不需要 type 变化检测
    if (historyId) {
      const historyData = sessionStorage.getItem(`history_${historyId}`);
      if (historyData) {
        try {
          const historyItem = JSON.parse(historyData);
          
          // 设置类型
          setGenerationType(historyItem.type);
          prevTypeRef.current = historyItem.type;
          isGeneratingRef.current = true;
          
          // 重置所有状态
          setStatus('preparing'); // 先设置为 preparing，防止显示"生成中"
          setResult('');
          setDisplayResult('');
          setResultItems([]);
          setGroupedTopics([]);
          setNewGroupedTopics([]);
          setDialogueResult(null);
          setLiveSpeechResult(null);
          setAudienceAnalysis(null);
          setDataVersion('1.0');
          setStructuredScriptResult(null);
          setDualVersionScriptResult(null);
          setRewriteScriptResult(null);
          setIsStructuredScript(false);
          structuredScriptRef.current = null;
          setProgress(0);
          contentBufferRef.current = '';
          
          // 恢复内容
          setResult(historyItem.content);
          
          // 恢复参数
          if (historyItem.params) {
            setTaskInfo(historyItem.params);
            if (historyItem.params.customerId) {
              setCustomerId(historyItem.params.customerId.toString());
            }
          }
          
          // 根据类型解析结果
          if (historyItem.type === 'topic_batch') {
            // 批量选题：解析 JSON 并设置 groupedTopics
            try {
              const topicData = JSON.parse(historyItem.content);
              
              // 判断版本
              const version = topicData.version || '1.0';
              setDataVersion(version);
              
              // 新版格式：人群分析
              if (topicData.audienceAnalysis) {
                setAudienceAnalysis(topicData.audienceAnalysis);
              }
              
              // 新版格式：流量型/变现型/人设型分组
              if (version === '2.0' && topicData.groupedTopics && Array.isArray(topicData.groupedTopics)) {
                setNewGroupedTopics(topicData.groupedTopics);
                
                // 解析为 resultItems
                const allItems: ResultItem[] = [];
                topicData.groupedTopics.forEach((group: any) => {
                  if (group.subGroups && Array.isArray(group.subGroups)) {
                    group.subGroups.forEach((subGroup: any) => {
                      subGroup.topics.forEach((topic: any) => {
                        allItems.push({
                          id: allItems.length,
                          content: topic.content,
                          topicType: group.categoryId,
                          typeName: subGroup.name,
                          topicScore: topic.score,
                          highlights: topic.highlights,
                        });
                      });
                    });
                  }
                });
                setResultItems(allItems);
              } 
              // 旧版格式：说观点/教知识/晒过程/讲故事分组
              else if (topicData.groupedTopics && Array.isArray(topicData.groupedTopics)) {
                setGroupedTopics(topicData.groupedTopics);
                
                // 解析为 resultItems
                const allItems: ResultItem[] = [];
                topicData.groupedTopics.forEach((group: GroupedTopics) => {
                  group.topics.forEach((topic: any) => {
                    allItems.push({
                      id: allItems.length,
                      content: topic.content,
                      topicType: group.typeId,
                      typeName: group.typeInfo?.label,
                      method: topic.method,
                      methodName: topic.methodName,
                      topicScore: topic.score,
                      highlights: topic.highlightNames || topic.highlights,
                    });
                  });
                });
                setResultItems(allItems);
              }
            } catch (e) {
              console.error('解析批量选题数据失败:', e);
            }
          } else if (historyItem.type === 'opening_batch') {
            // 批量开篇：解析 JSON 并设置 resultItems
            try {
              const openingData = JSON.parse(historyItem.content);
              if (openingData.openings && Array.isArray(openingData.openings)) {
                setResultItems(openingData.openings.map((o: any, index: number) => ({
                  id: index,
                  content: o.content,
                  title: `开篇${index + 1} - ${o.strategyName}`,
                  ...o,
                })));
              }
            } catch (e) {
              console.error('解析批量开篇数据失败:', e);
            }
          } else if (historyItem.type === 'dialogue') {
            // 对话流：解析 JSON 并设置 dialogueResult
            try {
              const dialogueData = JSON.parse(historyItem.content);
              setDialogueResult(dialogueData);
              if (dialogueData.rounds) {
                setExpandedDialogueRounds(new Set(dialogueData.rounds.map((r: any) => r.round)));
              }
            } catch (e) {
              console.error('解析对话流数据失败:', e);
            }
          } else if (historyItem.type === 'live_speech') {
            // 直播话术：解析 JSON 并设置 liveSpeechResult
            try {
              const speechData = JSON.parse(historyItem.content);
              setLiveSpeechResult(speechData);
              if (speechData.speeches) {
                const items: ResultItem[] = speechData.speeches.map((speech: any, index: number) => ({
                  id: index,
                  content: speech.fullScript || speech.steps.map((s: any) => s.content).join('\n\n'),
                  title: `${speech.hookLabel}（${speech.hookName}）`,
                }));
                setResultItems(items);
              }
            } catch (e) {
              console.error('解析直播话术数据失败:', e);
            }
          } else if (historyItem.type === 'writing' || historyItem.type === 'qianchuan_copywriting' || historyItem.type === 'feedad_copywriting') {
            // 文案创作/千川文案/信息流文案：解析 JSON 并设置 resultItems（带封面标题）
            try {
              // 清理可能存在的 markdown 代码块标记
              let cleanContent = historyItem.content.trim();
              if (cleanContent.startsWith('```json')) {
                cleanContent = cleanContent.slice(7);
              } else if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.slice(3);
              }
              if (cleanContent.endsWith('```')) {
                cleanContent = cleanContent.slice(0, -3);
              }
              cleanContent = cleanContent.trim();
              
              const writingData = JSON.parse(cleanContent);
              // 新格式：copywritings数组（多个文案）
              if (writingData.copywritings && Array.isArray(writingData.copywritings) && writingData.copywritings.length > 0) {
                setResultItems(writingData.copywritings.map((item: any, index: number) => ({
                  id: index,
                  content: item.content || '',
                  title: `文案${index + 1}`,
                  coverTitles: Array.isArray(item.coverTitles) ? item.coverTitles : [],
                })));
              } else if (writingData.content) {
                setResultItems([{
                  id: 0,
                  content: writingData.content,
                  title: '文案内容',
                  coverTitles: Array.isArray(writingData.coverTitles) ? writingData.coverTitles : [],
                }]);
              } else {
                // 如果没有content字段，作为普通文本
                setResultItems([{ id: 0, content: historyItem.content, title: '文案内容' }]);
              }
            } catch (e) {
              // JSON解析失败，尝试使用 parseResultItems 解析（它会处理更多情况）
              const items = parseResultItems(historyItem.content, historyItem.type);
              setResultItems(items);
            }
          } else if (historyItem.type === 'script') {
            // 脚本生成：尝试解析结构化格式
            try {
              const scriptData = JSON.parse(historyItem.content);
              
              // 检查是否是仿写多形态格式
              if (scriptData.hookOpening || scriptData.fullScript) {
                console.log('[历史恢复-URL] 检测到仿写多形态格式');
                setRewriteScriptResult(scriptData);
                setIsStructuredScript(true);
                setResultItems([]);
              }
              // 检查是否是双版本格式
              else if (scriptData.essentialVersion && scriptData.detailedVersion) {
                console.log('[历史恢复-URL] 检测到双版本格式');
                setDualVersionScriptResult(scriptData);
                setStructuredScriptResult(scriptData.detailedVersion);
                setIsStructuredScript(true);
                setResultItems([]);
              }
              // 检查是否是单版本格式
              else if (scriptData.basicInfo && scriptData.shots && Array.isArray(scriptData.shots)) {
                console.log('[历史恢复-URL] 检测到单版本格式');
                setStructuredScriptResult(scriptData);
                setIsStructuredScript(true);
                setResultItems([]);
              } else {
                // 旧格式：作为普通文本
                setIsStructuredScript(false);
                setResultItems([{ id: 0, content: historyItem.content, title: '脚本内容' }]);
              }
            } catch (e) {
              // JSON解析失败，作为普通文本
              setIsStructuredScript(false);
              setResultItems([{ id: 0, content: historyItem.content, title: '脚本内容' }]);
            }
          } else {
            // 其他类型：使用通用解析
            const items = parseResultItems(historyItem.content, historyItem.type);
            setResultItems(items);
          }
          
          // 设置状态为完成
          setStatus('completed');
          
          // 延迟清理 URL 参数，避免触发 useEffect 重新执行导致状态竞争
          setTimeout(() => {
            const url = new URL(window.location.href);
            // 确保 type 参数正确，防止后续 useEffect 检测到 type 变化
            url.searchParams.set('type', historyItem.type);
            url.searchParams.delete('historyId');
            window.history.replaceState({}, '', url.toString());
            
            // 清理 sessionStorage
            sessionStorage.removeItem(`history_${historyId}`);
          }, 100);
          
          toast.success('已恢复历史记录');
          return;
        } catch (e) {
          console.error('恢复历史记录失败:', e);
          toast.error('历史记录恢复失败');
        }
      } else {
        toast.error('历史记录不存在或已过期');
        router.back();
        return;
      }
    }
    
    // 如果 type 变化了（通过 ref 跟踪），重置状态并允许重新生成
    console.log('[初始化] type:', type, 'prevTypeRef.current:', prevTypeRef.current);
    if (type !== prevTypeRef.current) {
      console.log('[初始化] type 变化，更新 generationType 为:', type);
      isGeneratingRef.current = false;
      prevTypeRef.current = type;
      setGenerationType(type);
      setStatus('preparing');
      setResult('');
      setDisplayResult('');
      setResultItems([]);
      setProgress(0);
      contentBufferRef.current = '';
    } else {
      console.log('[初始化] type 未变化，generationType 保持:', generationType);
    }
    
    // 防止 React StrictMode 双重调用
    if (isGeneratingRef.current) return;
    
    // 从 sessionStorage 读取生成参数
    const paramsStr = sessionStorage.getItem('generation_params');
    if (paramsStr) {
      try {
        const params = JSON.parse(paramsStr);
        setTaskInfo(params);
        if (params.customerId) {
          setCustomerId(params.customerId.toString());
        }
        // 标记开始生成
        isGeneratingRef.current = true;
        // 开始生成
        startGeneration(type, params);
      } catch (e) {
        console.error('解析参数失败:', e);
        setStatus('error');
        toast.error('参数解析失败');
      }
    } else {
      // 没有参数，返回上一页
      toast.error('未找到生成参数');
      router.back();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, isAuthLoading, isAuthenticated]);
  
  const startGeneration = async (type: string, params: Record<string, any>) => {
    setStatus('generating');
    setProgress(0);
    contentBufferRef.current = '';
    structuredScriptRef.current = null; // 重置结构化脚本ref
    setStructuredScriptResult(null);
    setDualVersionScriptResult(null);
    setRewriteScriptResult(null);
    setIsStructuredScript(false);
    
    // 从配置获取 API 路径
    const typeConfig = GENERATION_TYPES[type];
    const apiPath = typeConfig?.apiPath;
    
    if (!apiPath) {
      setStatus('error');
      toast.error('未知的生成类型');
      return;
    }
    
    try {
      const token = getToken();
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        // 尝试读取错误信息
        let errorMessage = '请求失败';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // 无法解析错误响应
        }
        
        // 根据状态码处理不同错误
        if (response.status === 401) {
          toast.error('登录已过期，请重新登录');
          isGeneratingRef.current = false;
          router.push('/login');
          return;
        } else if (response.status === 403) {
          toast.error(errorMessage || '权限不足');
          setStatus('error');
          isGeneratingRef.current = false;
          return;
        } else if (response.status === 429) {
          toast.error(errorMessage || '操作过于频繁，请稍后再试');
          setStatus('error');
          isGeneratingRef.current = false;
          return;
        } else {
          toast.error(errorMessage);
          setStatus('error');
          isGeneratingRef.current = false;
          return;
        }
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; // 用于处理不完整的行
      
      if (reader) {
        // 直播话术生成需要特殊处理
        if (typeConfig?.isLiveSpeech) {
          let speechData: typeof liveSpeechResult = null;
          const speeches: any[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE标准：按双换行符分割事件
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            
            for (const event of events) {
              const line = event.trim();
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'progress') {
                    setProgress(data.progress);
                    if (data.stage === 'analyzing') {
                      setDisplayResult('正在分析套餐信息...');
                    } else if (data.stage === 'generating_price') {
                      setDisplayResult('正在生成爆款冲单版话术（价格钩）...');
                    } else if (data.stage === 'generating_pain') {
                      setDisplayResult('正在生成精准转化版话术（痛点钩）...');
                    } else if (data.stage === 'generating_scenario') {
                      setDisplayResult('正在生成情感共鸣版话术（场景钩）...');
                    } else if (data.stage === 'finalizing') {
                      setDisplayResult('正在整理话术...');
                    } else {
                      setDisplayResult(data.message || '正在生成话术...');
                    }
                  } else if (data.type === 'hook_speech') {
                    speeches.push(data.speech);
                    setDisplayResult(`已生成 ${speeches.length}/3 套话术...`);
                  } else if (data.type === 'done') {
                    speechData = data.output;
                    setLiveSpeechResult(data.output);
                    if (data.output.speeches) {
                      const items: ResultItem[] = data.output.speeches.map((speech: any, index: number) => ({
                        id: index,
                        content: speech.fullScript || speech.steps.map((s: any) => s.content).join('\n\n'),
                        title: `${speech.hookLabel}（${speech.hookName}）`,
                      }));
                      setResultItems(items);
                      setActiveSpeechTab(data.output.speeches[0]?.hookType || 'price');
                    }
                  }
                } catch (parseError) {
                  console.warn('SSE事件解析失败:', line.substring(0, 100));
                }
              }
            }
          }
          
          setProgress(100);
          setStatus('completed');
          setDisplayResult('');
          
          if (speechData) {
            const speechJson = JSON.stringify(speechData);
            setResult(speechJson);
            toast.success('直播话术生成成功');
            
            try {
              addHistory(type, speechJson, {
                title: `${speechData.merchantName} - 直播话术`,
                merchantName: speechData.merchantName,
                industry: speechData.industry,
                ...params,
              });
            } catch (e) {
              console.error('保存历史记录失败:', e);
            }
          } else {
            setStatus('error');
            toast.error('生成结果为空，请检查参数后重试');
          }
          
          sessionStorage.removeItem('generation_params');
          return;
        }
        
        // 批量开篇生成需要特殊处理
        if (typeConfig?.isBatchOpening) {
          // 开篇专用状态
          let openings: any[] = [];
          let analysis: any = null;
          let currentProgress = 0;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE标准：按双换行符分割事件
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            
            for (const event of events) {
              const line = event.trim();
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'analysis') {
                    analysis = data.analysis;
                  } else if (data.type === 'progress') {
                    currentProgress = Math.round((data.current / data.total) * 100);
                    setProgress(currentProgress);
                    setDisplayResult(`正在生成第 ${data.current}/${data.total} 个开篇（${data.strategy}）...`);
                  } else if (data.type === 'opening') {
                    openings.push(data.opening);
                    setDisplayResult(`已生成 ${openings.length} 个开篇...`);
                  } else if (data.type === 'done') {
                    openings = data.openings;
                  }
                } catch (parseError) {
                  console.warn('SSE事件解析失败:', line.substring(0, 100));
                }
              }
            }
          }
          
          setProgress(100);
          
          // 检查结果是否为空
          if (openings.length === 0) {
            setStatus('error');
            toast.error('生成结果为空，请检查参数后重试');
            sessionStorage.removeItem('generation_params');
            return;
          }
          
          setStatus('completed');
          
          // 将开篇结果存储为特殊格式
          const openingsData = { analysis, openings };
          const openingsJson = JSON.stringify(openingsData);
          setResult(openingsJson);
          setDisplayResult('');
          setResultItems(openings.map((o: any, index: number) => ({
            id: index,
            content: o.content,
            title: `开篇${index + 1} - ${o.strategyName}`,
            ...o,
          })));
          
          toast.success(`成功生成 ${openings.length} 个开篇`);
          
          // 保存到历史记录
          try {
            addHistory(type, openingsJson, {
              title: (params.topic || '开篇创作').substring(0, 100),
              topic: params.topic,
              customerId: params.customerId,
              customerName: params.customerName,
              scriptType: params.scriptType,
            });
          } catch (e) {
            console.error('保存历史记录失败:', e);
          }
          
          sessionStorage.removeItem('generation_params');
          return;
        }
        
        // 批量选题生成需要特殊处理
        if (typeConfig?.isBatchTopic) {
          const allTopics: any[] = [];
          let grouped: GroupedTopics[] = [];
          let newGrouped: NewGroupedTopics[] = [];
          let audience: AudienceAnalysis | null = null;
          let version: '1.0' | '2.0' = '1.0';
          let currentProgress = 0;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE标准：按双换行符分割事件
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // 保留不完整的部分
            
            for (const event of events) {
              const line = event.trim();
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'progress') {
                    // 新版进度格式
                    if (data.stage === 'analysis') {
                      setDisplayResult(data.message || '正在分析目标人群...');
                    } else if (data.stage === 'generating') {
                      setDisplayResult(data.message || `正在生成选题...`);
                      setCurrentGeneratingType(data.currentCategory || data.currentSubType || '');
                    } else {
                      // 旧版进度格式
                      currentProgress = Math.round((data.current / data.total) * 100);
                      setProgress(currentProgress);
                      setCurrentGeneratingType(data.currentType);
                      setDisplayResult(`正在生成「${getTopicLabel(data.currentType)}」选题...`);
                    }
                  } else if (data.type === 'audience_analysis') {
                    // 新版：人群分析结果
                    audience = data.data;
                    setAudienceAnalysis(data.data);
                    setDataVersion('2.0');
                    version = '2.0';
                  } else if (data.type === 'topics') {
                    const { categoryId, categoryInfo, subTypeId, subTypeInfo, topics, typeId, typeInfo } = data;
                    
                    // 判断是新版还是旧版格式
                    if (categoryId && subTypeId) {
                      // 新版格式
                      allTopics.push(...topics);
                      version = '2.0';
                      setDataVersion('2.0');
                      
                      // 更新新版分组
                      setNewGroupedTopics(prev => {
                        const existing = prev.find(g => g.categoryId === categoryId);
                        if (existing) {
                          const existingSub = existing.subGroups.find(s => s.subTypeId === subTypeId);
                          if (existingSub) {
                            existingSub.topics = topics.map((t: any) => ({
                              id: t.id,
                              content: t.content,
                              topicType: categoryId,
                              typeName: subTypeInfo?.name || '',
                              topicScore: t.score,
                              highlights: t.highlights,
                              subType: subTypeInfo?.subType,
                              subTypeName: subTypeInfo?.name,
                              subTypeGoal: subTypeInfo?.goal,
                            }));
                          } else {
                            existing.subGroups.push({
                              subTypeId,
                              subType: subTypeInfo?.subType || 'A',
                              name: subTypeInfo?.name || '',
                              goal: subTypeInfo?.goal || '',
                              topics: topics.map((t: any) => ({
                                id: t.id,
                                content: t.content,
                                topicType: categoryId,
                                typeName: subTypeInfo?.name || '',
                                topicScore: t.score,
                                highlights: t.highlights,
                              })),
                            });
                          }
                          return [...prev];
                        }
                        return [...prev, {
                          categoryId,
                          categoryInfo,
                          subGroups: [{
                            subTypeId,
                            subType: subTypeInfo?.subType || 'A',
                            name: subTypeInfo?.name || '',
                            goal: subTypeInfo?.goal || '',
                            topics: topics.map((t: any) => ({
                              id: t.id,
                              content: t.content,
                              topicType: categoryId,
                              typeName: subTypeInfo?.name || '',
                              topicScore: t.score,
                              highlights: t.highlights,
                            })),
                          }],
                        }];
                      });
                    } else if (typeId && typeInfo) {
                      // 旧版格式
                      allTopics.push(...topics);
                      
                      setGroupedTopics(prev => {
                        const existing = prev.find(g => g.typeId === typeId);
                        if (existing) {
                          existing.topics = topics;
                          return [...prev];
                        }
                        return [...prev, { typeId, typeInfo, topics }];
                      });
                    }
                    
                    setDisplayResult(`已生成 ${allTopics.length} 个选题...`);
                  } else if (data.type === 'done') {
                    version = data.version || '1.0';
                    setDataVersion(version);
                    
                    // 新版格式
                    if (data.version === '2.0' && data.groupedTopics) {
                      newGrouped = data.groupedTopics;
                      setNewGroupedTopics(data.groupedTopics);
                      if (data.audienceAnalysis) {
                        audience = data.audienceAnalysis;
                        setAudienceAnalysis(data.audienceAnalysis);
                      }
                    }
                    
                    // 旧版格式
                    if (data.groupedResults) {
                      const finalGrouped: GroupedTopics[] = Object.entries(data.groupedResults).map(
                        ([typeId, value]: [string, any]) => ({
                          typeId,
                          typeInfo: value.typeInfo,
                          topics: value.topics,
                        })
                      );
                      grouped = finalGrouped;
                      setGroupedTopics(finalGrouped);
                    }
                  }
                } catch (parseError) {
                  console.warn('SSE事件解析失败:', line.substring(0, 100));
                }
              }
            }
          }
          
          setProgress(100);
          setCurrentGeneratingType('');
          setStatus('completed');
          
          // 检查结果是否为空
          if (allTopics.length === 0 && grouped.length === 0 && newGrouped.length === 0) {
            setStatus('error');
            toast.error('生成结果为空，请检查参数后重试');
            sessionStorage.removeItem('generation_params');
            return;
          }
          
          // 存储结果（新版格式）
          const topicsData = { 
            version,
            audienceAnalysis: audience,
            groupedTopics: version === '2.0' ? newGrouped : grouped, 
            total: allTopics.length 
          };
          const topicsJson = JSON.stringify(topicsData);
          setResult(topicsJson);
          setDisplayResult('');
          
          // 将所有选题合并为resultItems
          const allItems: ResultItem[] = [];
          if (version === '2.0' && newGrouped.length > 0) {
            newGrouped.forEach(group => {
              group.subGroups.forEach(subGroup => {
                subGroup.topics.forEach((topic: any) => {
                  allItems.push({
                    id: allItems.length,
                    content: topic.content,
                    topicType: group.categoryId,
                    typeName: subGroup.name,
                    topicScore: topic.score,
                    highlights: topic.highlights,
                  });
                });
              });
            });
          } else {
            grouped.forEach(group => {
              group.topics.forEach((topic: any) => {
                allItems.push({
                  id: allItems.length,
                  content: topic.content,
                  topicType: group.typeId,
                  typeName: group.typeInfo?.label,
                  method: topic.method,
                  methodName: topic.methodName,
                  topicScore: topic.score,
                  highlights: topic.highlightNames || topic.highlights,
                });
              });
            });
          }
          setResultItems(allItems);
          
          toast.success(`成功生成 ${allTopics.length || allItems.length} 个选题`);
          
          // 保存到历史记录
          try {
            addHistory(type, topicsJson, {
              title: (params.industry || params.featureTheme || '智能选题').substring(0, 100),
              ...params,
            });
          } catch (e) {
            console.error('保存历史记录失败:', e);
          }
          
          sessionStorage.removeItem('generation_params');
          return;
        }
        
        // 对话流生成需要特殊处理
        if (typeConfig?.isDialogue) {
          let dialogueData: typeof dialogueResult = null;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE标准：按双换行符分割事件
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            
            for (const event of events) {
              const line = event.trim();
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'progress') {
                    setProgress(data.progress);
                    setDisplayResult(data.step || '正在生成对话流...');
                  } else if (data.type === 'result') {
                    dialogueData = data.result;
                    setDialogueResult(data.result);
                    if (data.result.rounds) {
                      setExpandedDialogueRounds(new Set(data.result.rounds.map((r: any) => r.round)));
                    }
                  }
                } catch (parseError) {
                  console.warn('SSE事件解析失败:', line.substring(0, 100));
                }
              }
            }
          }
          
          setProgress(100);
          setStatus('completed');
          setDisplayResult('');
          
          if (dialogueData) {
            const dialogueJson = JSON.stringify(dialogueData);
            setResult(dialogueJson);
            toast.success('对话流解析生成成功');
            
            try {
              addHistory(type, dialogueJson, {
                title: (params.topic || '对话流解析').substring(0, 100),
                topic: params.topic,
                customerId: params.customerId,
                customerName: params.customerName,
                roundCount: params.dialogueRoundCount,
              });
            } catch (e) {
              console.error('保存历史记录失败:', e);
            }
          }
          
          sessionStorage.removeItem('generation_params');
          return;
        }
        
        // 直播话术生成需要特殊处理
        if (generationType === 'live_speech') {
          let speechData: typeof liveSpeechResult = null;
          const speeches: any[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // SSE标准：按双换行符分割事件
            const events = buffer.split('\n\n');
            buffer = events.pop() || '';
            
            for (const event of events) {
              const line = event.trim();
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'progress') {
                    setProgress(data.progress || 0);
                    setDisplayResult(data.message || '正在生成话术...');
                  } else if (data.type === 'hook_speech' && data.speech) {
                    speeches.push(data.speech);
                    setDisplayResult(`已生成 ${speeches.length}/3 套话术...`);
                  } else if (data.type === 'done' && data.output) {
                    speechData = data.output;
                    setLiveSpeechResult(data.output);
                  }
                } catch (parseError) {
                  console.warn('SSE事件解析失败:', line.substring(0, 100));
                }
              }
            }
          }
          
          setProgress(100);
          setStatus('completed');
          setDisplayResult('');
          
          if (speechData) {
            const speechJson = JSON.stringify(speechData);
            setResult(speechJson);
            
            // 将话术转为 resultItems
            const items: ResultItem[] = speechData.speeches.map((speech, index) => ({
              id: index,
              content: speech.fullScript || speech.steps.map((s: any) => s.content).join('\n\n'),
              title: `${speech.hookLabel}（${speech.hookName}）`,
            }));
            setResultItems(items);
            
            toast.success('话术生成成功');
            
            try {
              addHistory(type, speechJson, {
                title: speechData.merchantName,
                merchantName: speechData.merchantName,
                industry: speechData.industry,
                originalPrice: speechData.priceInfo.originalPrice,
                livePrice: speechData.priceInfo.livePrice,
              });
            } catch (e) {
              console.error('保存历史记录失败:', e);
            }
          } else {
            setStatus('error');
            toast.error('话术生成失败，请重试');
          }
          
          sessionStorage.removeItem('generation_params');
          return;
        }
        
        // 常规流式处理
        const progressInterval = setInterval(() => {
          setProgress(prev => Math.min(prev + 3, 90));
        }, 300);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[脚本生成] 流读取完成, buffer长度:', buffer.length);
            break;
          }
          
          // 解码当前 chunk
          buffer += decoder.decode(value, { stream: true });
          
          // SSE标准：按双换行符分割事件
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          
          console.log('[脚本生成] 处理事件数:', events.length, '剩余buffer长度:', buffer.length);
          
          for (const event of events) {
            const line = event.trim();
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6);
                const data = JSON.parse(jsonStr);
                
                // 调试：检查每个事件的 keys
                const eventKeys = Object.keys(data);
                if (eventKeys.includes('done') || eventKeys.includes('structured') || eventKeys.includes('script')) {
                  console.log('[脚本生成] 发现包含特殊字段的事件! keys:', eventKeys);
                  console.log('[脚本生成] 事件内容(前200字符):', JSON.stringify(data).substring(0, 200));
                }
                
                // 调试：检查是否包含 done 字段
                if (data.done !== undefined) {
                  console.log('[脚本生成] ========== 发现done事件! ==========');
                  console.log('[脚本生成] done:', data.done, '类型:', typeof data.done);
                  console.log('[脚本生成] structured:', data.structured, '类型:', typeof data.structured);
                  console.log('[脚本生成] script存在:', !!data.script);
                  console.log('[脚本生成] script类型:', typeof data.script);
                  if (data.script) {
                    console.log('[脚本生成] script.basicInfo存在:', !!data.script.basicInfo);
                    console.log('[脚本生成] script.shots存在:', !!data.script.shots);
                    console.log('[脚本生成] script.shots是数组:', Array.isArray(data.script.shots));
                  }
                  console.log('[脚本生成] 条件判断: data.done && data.structured && data.script =', 
                    !!(data.done && data.structured && data.script));
                }
                
                if (data.content) {
                  contentBufferRef.current += data.content;
                  // 脚本类型不显示原始JSON，显示进度提示
                  if (type === 'script') {
                    const charCount = contentBufferRef.current.length;
                    setDisplayResult(`正在生成结构化脚本... (${charCount}字)`);
                  } else if (type === 'writing' || type === 'qianchuan_copywriting' || type === 'feedad_copywriting') {
                    // 文案类型：隐藏JSON格式，显示进度提示
                    const charCount = contentBufferRef.current.length;
                    setDisplayResult(`正在生成文案... (${charCount}字)`);
                  } else {
                    // 其他类型直接更新显示
                    setDisplayResult(contentBufferRef.current);
                  }
                }
                // 处理结构化脚本的最终响应
                if (data.done && data.structured && data.script) {
                  // 直接保存结构化脚本对象，不需要再解析
                  structuredScriptRef.current = data.script;
                  console.log('[脚本生成] 循环中收到结构化脚本:', data.script?.basicInfo?.title);
                  console.log('[脚本生成] 脚本shots数量:', data.script?.shots?.length);
                }
              } catch (parseError) {
                // JSON解析失败，可能是数据截断
                console.warn('[脚本生成] SSE事件解析失败:', line.substring(0, 100));
                console.warn('[脚本生成] 解析错误:', (parseError as Error).message);
              }
            } else if (line.length > 0) {
              // 检查是否有不以 data: 开头的事件（可能是截断的 done 事件）
              console.log('[脚本生成] 发现不以data:开头的事件:', line.substring(0, 100));
              // 尝试直接解析
              try {
                const data = JSON.parse(line);
                console.log('[脚本生成] 直接解析成功! keys:', Object.keys(data));
                if (data.done !== undefined) {
                  console.log('[脚本生成] 发现done字段!');
                }
              } catch (e) {
                // 忽略
              }
            }
          }
        }
        
        // 处理剩余的 buffer（可能包含最终的 done 事件）
        console.log('[脚本生成] ========== 处理剩余buffer ==========');
        console.log('[脚本生成] type:', type);
        console.log('[脚本生成] 剩余buffer长度:', buffer?.length || 0);
        console.log('[脚本生成] 剩余buffer是否以data:开头:', buffer?.trim().startsWith('data: '));
        console.log('[脚本生成] 剩余buffer前500字符:', buffer?.substring(0, 500));
        
        // 即使buffer不以data:开头，也尝试查找done事件
        if (buffer.includes('"done":true')) {
          console.log('[脚本生成] 在buffer中找到done事件！');
          // 尝试提取完整的JSON
          const doneMatch = buffer.match(/\{"done":true[^}]*"script":\{[\s\S]*\}\}/);
          if (doneMatch) {
            try {
              const data = JSON.parse(doneMatch[0]);
              if (data.done && data.structured && data.script) {
                structuredScriptRef.current = data.script;
                console.log('[脚本生成] 通过正则匹配解析成功:', data.script?.basicInfo?.title);
              }
            } catch (e) {
              console.error('[脚本生成] 正则匹配解析失败:', e);
            }
          }
        }
        
        if (buffer.trim().startsWith('data: ')) {
          try {
            const jsonStr = buffer.trim().slice(6);
            console.log('[脚本生成] 尝试解析JSON, 长度:', jsonStr.length);
            const data = JSON.parse(jsonStr);
            console.log('[脚本生成] JSON解析成功, done:', data.done, 'structured:', data.structured);
            if (data.content) {
              contentBufferRef.current += data.content;
            }
            // 处理结构化脚本的最终响应
            if (data.done && data.structured && data.script) {
              structuredScriptRef.current = data.script;
              console.log('[脚本生成] buffer中收到结构化脚本:', data.script?.basicInfo?.title);
            }
          } catch (e) {
            console.error('[脚本生成] buffer解析失败:', e);
            console.error('[脚本生成] buffer内容(前500字符):', buffer?.substring(0, 500));
          }
        }
        
        clearInterval(progressInterval);
        setProgress(100);
        
        // 最终结果
        const finalResult = contentBufferRef.current;
        
        // 调试日志 - 详细输出
        console.log('[脚本生成] ========== 最终结果检查 ==========');
        console.log('[脚本生成] type:', type);
        console.log('[脚本生成] type === "script":', type === 'script');
        console.log('[脚本生成] finalResult长度:', finalResult?.length || 0);
        console.log('[脚本生成] finalResult前100字符:', finalResult?.substring(0, 100));
        console.log('[脚本生成] structuredScriptRef.current:', structuredScriptRef.current ? '有数据' : '无数据');
        
        if (structuredScriptRef.current) {
          console.log('[脚本生成] structuredScriptRef.current.basicInfo:', structuredScriptRef.current.basicInfo);
          console.log('[脚本生成] structuredScriptRef.current.shots:', structuredScriptRef.current.shots ? `${structuredScriptRef.current.shots.length}个` : '无');
          console.log('[脚本生成] structuredScriptRef.current.hookOpening:', !!(structuredScriptRef.current as any).hookOpening);
          console.log('[脚本生成] structuredScriptRef.current.fullScript:', !!(structuredScriptRef.current as any).fullScript);
        }
        
        // 脚本类型：优先检查结构化数据
        if (type === 'script' && structuredScriptRef.current) {
          const scriptData = structuredScriptRef.current as any;
          
          // 检查是否是仿写多形态格式（有 hookOpening 或 fullScript）
          if (scriptData.hookOpening || scriptData.fullScript) {
            console.log('[脚本生成] ✅ 检测到仿写多形态格式');
            setRewriteScriptResult(scriptData);
            setIsStructuredScript(true);
            setResultItems([]);
            setStatus('completed');
            toast.success('仿写完成（多形态输出）');
            
            // 保存到历史记录
            try {
              addHistory(type, JSON.stringify(scriptData), {
                title: '✨ 仿写脚本（多形态）',
                topic: params.topic,
                productInfo: params.productInfo,
                customerId: params.customerId,
                customerName: params.customerName,
                scriptType: params.scriptType,
              });
            } catch (e) {
              console.error('保存历史记录失败:', e);
            }
            
            sessionStorage.removeItem('generation_params');
            return;
          }
          
          // 检查是否是标准脚本格式（有 basicInfo 和 shots）
          if (scriptData.basicInfo && scriptData.shots) {
            console.log('[脚本生成] ✅ 条件满足，设置结构化脚本结果');
            console.log('[脚本生成] scriptData:', JSON.stringify(scriptData).substring(0, 200) + '...');
            console.log('[脚本生成] 当前 generationType:', generationType);
            console.log('[脚本生成] 当前 isStructuredScript:', isStructuredScript);
            console.log('[脚本生成] type 变量:', type);
            setStructuredScriptResult(scriptData);
            setIsStructuredScript(true);
            console.log('[脚本生成] 已调用 setIsStructuredScript(true)');
            setResultItems([]);
            setStatus('completed');
            toast.success('生成完成');
            
            // 验证状态更新
            setTimeout(() => {
              console.log('[脚本生成] 状态更新后的验证 - structuredScriptResult 应该已设置');
              console.log('[脚本生成] (setTimeout) generationType:', generationType);
              console.log('[脚本生成] (setTimeout) isStructuredScript:', isStructuredScript);
            }, 100);
            
            // 保存到历史记录
            try {
              addHistory(type, JSON.stringify(scriptData), {
                title: scriptData.basicInfo.title || '脚本生成',
                topic: params.topic,
                productInfo: params.productInfo,
                customerId: params.customerId,
                customerName: params.customerName,
                scriptType: params.scriptType,
              });
            } catch (e) {
              console.error('保存历史记录失败:', e);
            }
            
            sessionStorage.removeItem('generation_params');
            return; // 直接返回，不继续处理
          }
        }
        
        // 检查结果是否为空
        console.log('[脚本生成] ========== 检查 finalResult ==========');
        console.log('[脚本生成] finalResult 长度:', finalResult?.length || 0);
        console.log('[脚本生成] finalResult 前100字符:', finalResult?.substring(0, 100));
        
        if (!finalResult || finalResult.trim().length === 0) {
          console.log('[脚本生成] ❌ finalResult 为空，显示错误');
          setStatus('error');
          toast.error('生成结果为空，请检查参数后重试');
          sessionStorage.removeItem('generation_params');
          return;
        }
        
        setResult(finalResult);
        setDisplayResult(''); // 清空，让resultItems展示
        
        // 脚本类型：尝试解析结构化格式（包含markdown代码块）
        if (type === 'script') {
          // 首先尝试解析仿写多形态格式
          const rewriteData = parseRewriteScriptJson(finalResult);
          
          if (rewriteData) {
            // 仿写多形态格式
            console.log('[脚本生成] 检测到仿写多形态格式');
            setRewriteScriptResult(rewriteData);
            setIsStructuredScript(true);
            setResultItems([]);
            setStatus('completed');
            toast.success('仿写完成（多形态输出）');
            
            // 保存到历史记录
            try {
              addHistory(type, JSON.stringify(rewriteData), {
                title: '✨ 仿写脚本（多形态）',
                topic: params.topic,
                productInfo: params.productInfo,
                customerId: params.customerId,
                customerName: params.customerName,
                scriptType: params.scriptType,
              });
            } catch (e) {
              console.error('保存历史记录失败:', e);
            }
            
            sessionStorage.removeItem('generation_params');
            return;
          }
          
          // 尝试解析标准脚本格式
          const scriptData = parseScriptJson(finalResult);
          console.log('[脚本生成] parseScriptJson结果:', scriptData ? '解析成功' : '解析失败');
          
          // 检查是否是双版本格式
          if (scriptData && 'essentialVersion' in scriptData && 'detailedVersion' in scriptData) {
            // 双版本格式：保存完整双版本数据
            const dualVersionData = scriptData as DualVersionScriptResult;
            const detailedVersion = dualVersionData.detailedVersion;
            const essentialVersion = dualVersionData.essentialVersion;
            
            if (detailedVersion && detailedVersion.basicInfo && detailedVersion.shots &&
                essentialVersion && essentialVersion.basicInfo && essentialVersion.shots) {
              // 保存双版本数据
              setDualVersionScriptResult(dualVersionData);
              // 仍然设置详细版为默认显示（兼容旧逻辑）
              setStructuredScriptResult(detailedVersion);
              setIsStructuredScript(true);
              setResultItems([]);
              setStatus('completed');
              toast.success('生成完成（双版本：精华版 + 详细版）');
              
              console.log('[脚本生成] 双版本数据已保存:', dualVersionData);
              
              // 保存到历史记录
              try {
                addHistory(type, JSON.stringify(scriptData), {
                  title: detailedVersion.basicInfo.title || '脚本生成',
                  topic: params.topic,
                  productInfo: params.productInfo,
                  customerId: params.customerId,
                  customerName: params.customerName,
                  scriptType: params.scriptType,
                });
              } catch (e) {
                console.error('保存历史记录失败:', e);
              }
              
              sessionStorage.removeItem('generation_params');
              return; // 提前返回，不执行后续逻辑
            }
          }
          
          // 单版本格式
          if (scriptData && 'basicInfo' in scriptData && 'shots' in scriptData) {
            const singleVersionData = scriptData as ScriptResult;
            setStructuredScriptResult(singleVersionData);
            setIsStructuredScript(true);
            setResultItems([]);
            setStatus('completed');
            toast.success('生成完成');
            
            // 保存到历史记录
            try {
              addHistory(type, JSON.stringify(singleVersionData), {
                title: singleVersionData.basicInfo.title || '脚本生成',
                topic: params.topic,
                productInfo: params.productInfo,
                customerId: params.customerId,
                customerName: params.customerName,
                scriptType: params.scriptType,
              });
            } catch (e) {
              console.error('保存历史记录失败:', e);
            }
            
            sessionStorage.removeItem('generation_params');
            return;
          }
          
          // 解析失败，尝试直接解析（可能没有markdown包裹）
          try {
            const directData = JSON.parse(finalResult);
            
            // 首先检查是否是仿写多形态格式
            if (directData.hookOpening && directData.fullScript && directData.callToAction) {
              console.log('[脚本生成] 直接解析检测到仿写多形态格式');
              setRewriteScriptResult(directData as RewriteScriptResult);
              setIsStructuredScript(true);
              setResultItems([]);
              setStatus('completed');
              toast.success('仿写完成（多形态输出）');
              
              // 保存到历史记录
              try {
                addHistory(type, JSON.stringify(directData), {
                  title: '✨ 仿写脚本（多形态）',
                  topic: params.topic,
                  productInfo: params.productInfo,
                  customerId: params.customerId,
                  customerName: params.customerName,
                  scriptType: params.scriptType,
                });
              } catch (e) {
                console.error('保存历史记录失败:', e);
              }
              
              sessionStorage.removeItem('generation_params');
              return;
            }
            
            // 检查是否是双版本格式
            if (directData.essentialVersion && directData.detailedVersion) {
              // 双版本格式：保存完整双版本数据
              const dualVersionData = directData as DualVersionScriptResult;
              const detailedVersion = dualVersionData.detailedVersion;
              const essentialVersion = dualVersionData.essentialVersion;
              
              if (detailedVersion && detailedVersion.basicInfo && detailedVersion.shots &&
                  essentialVersion && essentialVersion.basicInfo && essentialVersion.shots) {
                // 保存双版本数据
                setDualVersionScriptResult(dualVersionData);
                // 仍然设置详细版为默认显示（兼容旧逻辑）
                setStructuredScriptResult(detailedVersion);
                setIsStructuredScript(true);
                setResultItems([]);
                setStatus('completed');
                toast.success('生成完成（双版本：精华版 + 详细版）');
                console.log('[脚本生成] 双版本数据已保存:', dualVersionData);
                sessionStorage.removeItem('generation_params');
                return;
              }
            }
            
            // 单版本格式
            if (directData.basicInfo && directData.shots) {
              setStructuredScriptResult(directData);
              setIsStructuredScript(true);
              setResultItems([]);
              setStatus('completed');
              toast.success('生成完成');
              sessionStorage.removeItem('generation_params');
              return;
            }
          } catch (e) {
            console.log('[脚本生成] 直接JSON解析也失败');
          }
          
          // 都失败了，显示错误
          setIsStructuredScript(false);
          console.log('[脚本生成] 脚本解析失败，无法显示');
          setStatus('error');
          toast.error('脚本解析失败，请重试');
          sessionStorage.removeItem('generation_params');
          return;
        }
        
        const parsedItems = parseResultItems(finalResult, type);
        setResultItems(parsedItems);
        setStatus('completed');
        toast.success('生成完成');
        
        // 文案类型自动分析
        if (type === 'writing' && parsedItems.length > 0) {
          // 异步分析文案，不阻塞UI
          (async () => {
            const analyzedItems = await Promise.all(
              parsedItems.map(item => analyzeCopywritingItem(item))
            );
            setResultItems(analyzedItems);
          })();
        }
        
        // 保存到历史记录
        try {
          const typeConfig = GENERATION_TYPES[type];
          const title = type === 'topic' 
            ? finalResult.split('\n')[0].substring(0, 50)
            : (params.topic || params.productInfo?.productName || '生成内容');
          
          addHistory(type, finalResult, {
            title: title.substring(0, 100),
            topic: params.topic,
            productInfo: params.productInfo,
            customerId: params.customerId,
            customerName: params.customerName,
            scriptType: params.scriptType,
            shootingMethod: params.shootingMethod,
            materialType: params.materialType,
            creativeMode: params.creativeMode,
          });
        } catch (e) {
          console.error('保存历史记录失败:', e);
        }
        
        // 清除 sessionStorage
        sessionStorage.removeItem('generation_params');
      }
    } catch (error) {
      console.error('生成失败:', error);
      setStatus('error');
      isGeneratingRef.current = false;
      toast.error('生成失败，请重试');
    }
  };
  
  // 生成批量选题的格式化文本
  const generateTopicBatchText = () => {
    const lines: string[] = [];
    
    // 新版格式
    if (dataVersion === '2.0' && newGroupedTopics.length > 0) {
      newGroupedTopics.forEach((group) => {
        lines.push(`【${group.categoryInfo.icon} ${group.categoryInfo.label}】`);
        lines.push('');
        group.subGroups.forEach((subGroup) => {
          const typeLabel = subGroup.subType === 'A' ? 'A类' : 'B类';
          lines.push(`  ${typeLabel} - ${subGroup.name}（${subGroup.goal}）`);
          subGroup.topics.forEach((topic, index) => {
            lines.push(`    ${index + 1}. ${topic.content}`);
          });
          lines.push('');
        });
      });
    } 
    // 旧版格式
    else if (groupedTopics.length > 0) {
      groupedTopics.forEach((group) => {
        lines.push(`【${group.typeInfo.label}】`);
        group.topics.forEach((topic, index) => {
          lines.push(`  ${index + 1}. ${topic.content}`);
        });
        lines.push('');
      });
    }
    
    return lines.join('\n');
  };

  const handleCopy = async (text?: string) => {
    let contentToCopy = text;
    if (!contentToCopy) {
      // 文案类型：复制解析后的内容
      if (generationType === 'writing' && resultItems.length > 0 && resultItems[0].content) {
        contentToCopy = resultItems[0].content;
      } 
      // 批量选题类型：生成格式化文本
      else if (generationType === 'topic_batch' && (newGroupedTopics.length > 0 || groupedTopics.length > 0)) {
        contentToCopy = generateTopicBatchText();
      }
      // 其他类型：复制原始结果
      else {
        contentToCopy = result;
      }
    }
    try {
      if (typeof contentToCopy !== 'string' || !contentToCopy.trim()) {
        toast.error('暂无可复制的内容');
        return;
      }
      await navigator.clipboard.writeText(contentToCopy);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };
  
  // 生成脚本格式化文本
  const generateScriptText = (): string => {
    let text = '';
    
    // 双版本脚本
    if (dualVersionScriptResult) {
      const { essentialVersion, detailedVersion } = dualVersionScriptResult;
      
      // 精华版
      text += `【精华版】${essentialVersion.basicInfo.title}\n`;
      text += `${'='.repeat(50)}\n\n`;
      text += `预计时长：${essentialVersion.basicInfo.duration}\n`;
      text += `发布文案：${essentialVersion.basicInfo.publishCopywriting}\n`;
      text += `话题标签：${essentialVersion.basicInfo.hashtags?.join(' ')}\n\n`;
      text += `【分镜脚本】\n`;
      text += `${'-'.repeat(40)}\n`;
      essentialVersion.shots?.forEach((shot: any) => {
        text += `\n镜${shot.shotNumber} | ${shot.duration} | ${shot.shotType}\n`;
        text += `画面：${shot.visual}\n`;
        text += `台词：${shot.copywriting}\n`;
        if (shot.notes) text += `备注：${shot.notes}\n`;
      });
      if (essentialVersion.shootingAdvice) {
        text += `\n【拍摄建议】\n${essentialVersion.shootingAdvice}\n`;
      }
      
      text += `\n\n${'='.repeat(50)}\n`;
      text += `\n【详细版】${detailedVersion.basicInfo.title}\n`;
      text += `${'='.repeat(50)}\n\n`;
      text += `预计时长：${detailedVersion.basicInfo.duration}\n`;
      text += `发布文案：${detailedVersion.basicInfo.publishCopywriting}\n`;
      text += `话题标签：${detailedVersion.basicInfo.hashtags?.join(' ')}\n\n`;
      text += `【分镜脚本】\n`;
      text += `${'-'.repeat(40)}\n`;
      detailedVersion.shots?.forEach((shot: any) => {
        text += `\n镜${shot.shotNumber} | ${shot.duration} | ${shot.shotType}\n`;
        text += `画面：${shot.visual}\n`;
        text += `台词：${shot.copywriting}\n`;
        if (shot.notes) text += `备注：${shot.notes}\n`;
      });
      if (detailedVersion.shootingAdvice) {
        text += `\n【拍摄建议】\n${detailedVersion.shootingAdvice}\n`;
      }
    }
    // 单版本脚本
    else if (structuredScriptResult) {
      text += `${structuredScriptResult.basicInfo.title}\n`;
      text += `${'='.repeat(50)}\n\n`;
      text += `预计时长：${structuredScriptResult.basicInfo.duration}\n`;
      text += `发布文案：${structuredScriptResult.basicInfo.publishCopywriting}\n`;
      text += `话题标签：${structuredScriptResult.basicInfo.hashtags?.join(' ')}\n`;
      if (structuredScriptResult.basicInfo.brandPartner) {
        text += `合作品牌：${structuredScriptResult.basicInfo.brandPartner}\n`;
      }
      
      text += `\n【分镜脚本】\n`;
      text += `${'-'.repeat(40)}\n`;
      structuredScriptResult.shots?.forEach((shot: any) => {
        text += `\n镜${shot.shotNumber} | ${shot.duration} | ${shot.shotType} | ${shot.cameraPosition || ''}\n`;
        text += `画面：${shot.visual}\n`;
        text += `台词：${shot.copywriting}\n`;
        if (shot.notes) text += `备注：${shot.notes}\n`;
      });
      
      if (structuredScriptResult.shootingAdvice) {
        text += `\n【拍摄建议】\n${structuredScriptResult.shootingAdvice}\n`;
      }
    }
    // 仿写脚本
    else if (rewriteScriptResult) {
      // 使用已经导入的 rewriteScriptToText 函数
      text += generateRewriteScriptText(rewriteScriptResult);
    }
    
    return text;
  };
  
  // 生成仿写脚本格式化文本（内联实现，避免类型问题）
  const generateRewriteScriptText = (script: any): string => {
    let text = '';
    
    text += '═══════════════════════════════════════\n';
    text += '【仿写脚本 - 多形态输出】\n';
    text += '═══════════════════════════════════════\n\n';
    
    if (script.title) {
      text += `标题：${script.title}\n\n`;
    }
    
    // 爆款开头
    text += '─────────────────────────────────────\n';
    text += '【爆款开头（黄金3秒钩子）】\n';
    text += '─────────────────────────────────────\n';
    const hookContent = typeof script.hookOpening === 'string' 
      ? script.hookOpening 
      : (script.hookOpening?.content || '');
    text += hookContent + '\n\n';
    
    // 新格式额外信息
    if (typeof script.hookOpening === 'object') {
      if (script.hookOpening.hookTechnique) {
        text += `钩子技巧：${script.hookOpening.hookTechnique}\n`;
      }
      if (script.hookOpening.emotionPoint) {
        text += `情绪触发点：${script.hookOpening.emotionPoint}\n`;
      }
      text += '\n';
    }
    
    // 完整口播文案
    text += '─────────────────────────────────────\n';
    text += '【完整口播文案】\n';
    text += '─────────────────────────────────────\n';
    const fullScriptContent = typeof script.fullScript === 'string'
      ? script.fullScript
      : (script.fullScript?.content || '');
    text += fullScriptContent + '\n\n';
    
    // 新格式额外信息
    if (typeof script.fullScript === 'object') {
      if (script.fullScript.duration) {
        text += `预估时长：${script.fullScript.duration}\n`;
      }
      if (script.fullScript.keyPoints && script.fullScript.keyPoints.length > 0) {
        text += `核心观点：\n${script.fullScript.keyPoints.map((p: string) => '• ' + p).join('\n')}\n`;
      }
      if (script.fullScript.emotionCurve) {
        text += `情绪曲线：${script.fullScript.emotionCurve}\n`;
      }
      text += '\n';
    }
    
    // 问答对话版
    if (script.dialogueVersion) {
      text += '─────────────────────────────────────\n';
      text += '【问答对话版（适合无脚本拍摄）】\n';
      text += '─────────────────────────────────────\n';
      
      if (script.dialogueVersion.intro) {
        text += `【开场引入】\n${script.dialogueVersion.intro}\n\n`;
      }
      
      if (script.dialogueVersion.qaList && script.dialogueVersion.qaList.length > 0) {
        text += '【问答内容】\n';
        script.dialogueVersion.qaList.forEach((qa: any, index: number) => {
          text += `\nQ${index + 1}：${qa.question || qa.q || ''}\n`;
          text += `A${index + 1}：${qa.answer || qa.a || ''}\n`;
          if (qa.tips || qa.shootingTips) {
            text += `提示：${qa.tips || qa.shootingTips}\n`;
          }
        });
      }
      
      if (script.dialogueVersion.shootingTips) {
        text += `\n【拍摄建议】\n${script.dialogueVersion.shootingTips}\n`;
      }
      if (script.dialogueVersion.closing) {
        text += `\n【结尾升华】\n${script.dialogueVersion.closing}\n`;
      }
      text += '\n';
    }
    
    // 行动号召
    if (script.callToAction) {
      text += '─────────────────────────────────────\n';
      text += '【行动号召】\n';
      text += '─────────────────────────────────────\n';
      const ctaContent = typeof script.callToAction === 'string'
        ? script.callToAction
        : (script.callToAction?.content || '');
      text += ctaContent + '\n\n';
      
      if (typeof script.callToAction === 'object') {
        if (script.callToAction.urgency) {
          text += `紧迫性：${script.callToAction.urgency}\n`;
        }
        if (script.callToAction.valueProposition) {
          text += `价值主张：${script.callToAction.valueProposition}\n`;
        }
      }
    }
    
    return text;
  };
  
  // 生成对话流格式化文本
  const generateDialogueText = (): string => {
    let text = '';
    
    if (!dialogueResult) return text;
    
    text += '对话流脚本\n';
    text += `${'='.repeat(50)}\n\n`;
    
    // IP信息
    if (dialogueResult.ipInfo) {
      text += '【IP定位信息】\n';
      text += `${'-'.repeat(40)}\n`;
      if (dialogueResult.ipInfo.industry) text += `行业：${dialogueResult.ipInfo.industry}\n`;
      if (dialogueResult.ipInfo.persona) text += `人设：${dialogueResult.ipInfo.persona}\n`;
      if (dialogueResult.ipInfo.coreAngle) text += `核心角度：${dialogueResult.ipInfo.coreAngle}\n`;
      if (dialogueResult.ipInfo.productService) text += `产品服务：${dialogueResult.ipInfo.productService}\n`;
      if (dialogueResult.ipInfo.targetAudience) text += `目标受众：${dialogueResult.ipInfo.targetAudience}\n`;
      text += '\n';
    }
    
    // 开场引入
    if (dialogueResult.opening) {
      text += '【开场引入】\n';
      text += `${'-'.repeat(40)}\n`;
      text += `问题：${dialogueResult.opening.question}\n`;
      text += `回答：${dialogueResult.opening.answer}\n\n`;
    }
    
    // 对话内容
    if (dialogueResult.rounds && Array.isArray(dialogueResult.rounds)) {
      text += '【对话内容】\n';
      text += `${'-'.repeat(40)}\n`;
      
      dialogueResult.rounds.forEach((round) => {
        text += `\n第${round.round}轮\n`;
        if (round.goal) text += `目标：${round.goal}\n`;
        if (round.question) text += `问题：${round.question}\n`;
        if (round.answer) text += `回答：${round.answer}\n`;
      });
      text += '\n';
    }
    
    // 独白发话
    if (dialogueResult.monologue) {
      text += '【独白发话】\n';
      text += `${'-'.repeat(40)}\n`;
      text += `${dialogueResult.monologue}\n`;
    }
    
    return text;
  };
  
  const handleDownload = () => {
    const typeConfig = GENERATION_TYPES[generationType];
    const filename = `${typeConfig?.name || '生成结果'}_${new Date().toISOString().slice(0, 10)}.txt`;
    let downloadContent = result;
    
    // 文案类型：下载解析后的内容
    if (generationType === 'writing' && resultItems.length > 0 && resultItems[0].content) {
      downloadContent = resultItems[0].content;
    }
    // 批量选题类型：生成格式化文本
    else if (generationType === 'topic_batch' && (newGroupedTopics.length > 0 || groupedTopics.length > 0)) {
      downloadContent = generateTopicBatchText();
    }
    // 直播话术类型：生成格式化文本
    else if (generationType === 'live_speech' && liveSpeechResult?.speeches) {
      const merchantName = liveSpeechResult.merchantName || '商家';
      downloadContent = `${merchantName} - 团购直播话术\n${'='.repeat(50)}\n\n`;
      
      liveSpeechResult.speeches.forEach((speech: any, index: number) => {
        downloadContent += `\n【话术${index + 1}】${speech.hookLabel || speech.hookName}\n`;
        downloadContent += `${'-'.repeat(40)}\n`;
        
        // 添加完整脚本
        if (speech.fullScript) {
          downloadContent += speech.fullScript;
        } else if (speech.steps && Array.isArray(speech.steps)) {
          // 如果没有完整脚本，拼接步骤内容
          speech.steps.forEach((step: any) => {
            if (step.stepName) {
              downloadContent += `\n【${step.stepName}】\n`;
            }
            if (step.content) {
              downloadContent += `${step.content}\n`;
            }
            if (step.tips && step.tips.length > 0) {
              downloadContent += `提示：${step.tips.join('; ')}\n`;
            }
          });
        }
        
        downloadContent += `\n\n`;
      });
    }
    // 脚本类型：生成格式化文本
    else if (generationType === 'script' && isStructuredScript) {
      downloadContent = generateScriptText();
    }
    // 对话流类型：生成格式化文本
    else if (generationType === 'dialogue' && dialogueResult) {
      downloadContent = generateDialogueText();
    }
    // 开场白类型：生成格式化文本
    else if (generationType === 'opening' && resultItems.length > 0 && resultItems[0].content) {
      downloadContent = resultItems[0].content;
    }
    
    const blob = new Blob([downloadContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('下载成功');
  };
  
  const handleSaveItem = async (item: ResultItem) => {
    // 检查认证状态
    if (!isAuthenticated) {
      toast.error('登录已过期，请重新登录');
      router.push('/login');
      return;
    }
    
    const token = getToken();
    if (!token) {
      toast.error('登录状态异常，请重新登录');
      router.push('/login');
      return;
    }
    
    setIsSaving(true);
    try {
      // 判断素材类型
      const isQianchuan = generationType.startsWith('qianchuan');
      const isFeedAd = generationType.startsWith('feedad');
      const hasProductProfile = taskInfo.selectedProfileId && Number(taskInfo.selectedProfileId) > 0;
      const hasCustomerProfile = customerId && parseInt(customerId) > 0;
      
      // 确定档案类型和相关信息
      let archiveType: 'customer' | 'product' | 'general' = 'general';
      let archiveId: number | null = null;
      let archiveName = '';
      
      if (isQianchuan || isFeedAd) {
        // 千川和信息流素材
        if (hasProductProfile) {
          archiveType = 'product';
          archiveId = Number(taskInfo.selectedProfileId);
          archiveName = taskInfo.productInfo?.productName || '未命名产品';
        }
      } else {
        // 选题、文案、脚本
        if (hasCustomerProfile) {
          archiveType = 'customer';
          archiveId = parseInt(customerId);
          archiveName = taskInfo.customerName || '';
        }
      }
      
      // 确定 topic 和 title
      let topicText: string;
      let titleText: string;
      
      if (generationType === 'topic') {
        topicText = item.content.split('\n')[0].substring(0, 200);
        titleText = topicText;
      } else if (isQianchuan || isFeedAd) {
        const productName = taskInfo.productInfo?.productName || '未命名产品';
        const typeConfig = GENERATION_TYPES[generationType];
        topicText = productName;
        titleText = `${productName} - ${typeConfig?.name || '生成结果'}`;
      } else {
        topicText = taskInfo.topic || item.content.substring(0, 50) || '创作内容';
        titleText = topicText.substring(0, 100);
      }
      
      // 确定 scriptType
      const typeConfig = GENERATION_TYPES[generationType];
      const scriptTypeValue = generationType === 'script' 
        ? (taskInfo.scriptType || '讲故事')
        : (typeConfig?.name || '文案');
      
      // 统一调用 /api/materials 保存
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: archiveType === 'customer' ? archiveId : 0,
          customerName: archiveType === 'customer' ? archiveName : '',
          topic: topicText,
          title: titleText,
          content: item.content,
          scriptType: scriptTypeValue,
          materialType: generationType,
          sourceType: generationType,
          status: 'draft',
          archiveType: archiveType,
          productId: archiveType === 'product' ? archiveId : null,
          productName: archiveType === 'product' ? archiveName : null,
        }),
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setSavedItems(prev => new Set(prev).add(item.id));
        // 根据档案类型显示不同的成功提示
        const successMessages: Record<string, string> = {
          'customer': '已添加到素材库（客户档案）',
          'product': '已添加到素材库（产品档案）',
          'general': '已添加到素材库',
        };
        toast.success(successMessages[archiveType] || '已添加到素材库');
      } else {
        console.error('保存素材失败:', data.error);
        toast.error(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存素材异常:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 润色功能 - 在当前页面内调用
  const handlePolish = async (content: string) => {
    setPolishingText(content);
    setPolishedResult(null);
    setShowPolishModal(true);
  };

  const submitPolish = async () => {
    if (!polishingText.trim()) return;
    
    setPolishingId(0);
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/operations/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: polishingText }),
      });
      
      const data = await response.json();
      if (data.success) {
        setPolishedResult(data.data);
      } else {
        toast.error(data.error || '润色失败');
      }
    } catch (error) {
      console.error('润色失败:', error);
      toast.error('润色失败，请重试');
    } finally {
      setPolishingId(null);
    }
  };

  const copyPolishedResult = () => {
    if (polishedResult) {
      navigator.clipboard.writeText(polishedResult);
      toast.success('已复制');
    }
  };
  
  // 分析文案（使用规则算法 + 可选的AI详细分析）
  const analyzeCopywritingItem = useCallback(async (item: ResultItem, detailed: boolean = false) => {
    // 如果已经有分析结果，不再重复分析
    if (item.analysis && (!detailed || item.creationAnalysis)) return item;
    
    try {
      const content = item.content;
      const topic = taskInfo.topic || '';
      const wordCount = taskInfo.wordCount || 300;
      
      // 使用新的综合评分函数（基于整个文案，包含薛辉方法论）
      // 直接传入完整内容，函数内部会提取开篇
      const openingScore = calculateOpeningScoreBasic(content, topic);
      const marketingAnalysis = analyzeMarketing(content, []);
      const qualityCheck = performQualityCheck(content, wordCount, wordCount + 200);
      
      // 计算综合评级
      const rating = evaluateCopywritingRating(
        openingScore.total,
        openingScore.maxTotal,
        qualityCheck
      );
      
      // 如果需要详细分析，调用API
      let creationAnalysis = item.creationAnalysis;
      if (detailed) {
        try {
          const token = getToken();
          const response = await fetch('/api/ai/copywriting-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content,
              topic,
              targetWordCount: [wordCount, wordCount + 200],
              useAI: true,
              detailed: true,
              industry: taskInfo.ipPositioning?.industry || '',
              productService: taskInfo.ipPositioning?.productService || '',
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.creationAnalysis) {
              creationAnalysis = data.data.creationAnalysis;
            }
          }
        } catch (error) {
          console.warn('[详细分析] 获取创作分析失败:', error);
        }
      }
      
      return {
        ...item,
        analysis: {
          openingScore,
          marketingAnalysis,
          qualityCheck,
          rating: rating.rating,
          ratingLabel: rating.label,
        },
        creationAnalysis,
      };
    } catch (error) {
      console.error('[文案分析] 错误:', error);
      return item;
    }
  }, [taskInfo]);
  
  // 当切换到详细模式时，自动触发详细分析
  useEffect(() => {
    if (displayMode === 'detailed' && generationType === 'writing' && resultItems.length > 0) {
      // 找出需要详细分析的文案
      const itemsNeedingAnalysis = resultItems.filter(item => !item.creationAnalysis);
      
      if (itemsNeedingAnalysis.length > 0) {
        // 标记正在分析的项
        setAnalyzingItems(new Set(itemsNeedingAnalysis.map(i => i.id)));
        
        (async () => {
          const analyzedItems = await Promise.all(
            itemsNeedingAnalysis.map(item => analyzeCopywritingItem(item, true))
          );
          
          // 更新结果
          setResultItems(prev => {
            const newItems = [...prev];
            analyzedItems.forEach(analyzed => {
              const idx = newItems.findIndex(i => i.id === analyzed.id);
              if (idx !== -1) {
                newItems[idx] = analyzed;
              }
            });
            return newItems;
          });
          
          setAnalyzingItems(new Set());
        })();
      }
    }
  }, [displayMode, generationType, resultItems.length, analyzeCopywritingItem]);
  
  const handleCreateWriting = (item: ResultItem) => {
    // 检查认证状态
    if (!isAuthenticated) {
      toast.error('登录已过期，请重新登录');
      router.push('/login');
      return;
    }
    
    // 存储选题到 sessionStorage，跳转到文案创作页
    const topic = item.content.split('\n')[0].replace(/^\d+[.、）\]]\s*/, '');
    
    // 存储来源信息，用于返回功能
    sessionStorage.setItem('return_source', JSON.stringify({
      type: generationType,
      typeName: typeConfig?.name || '生成结果',
      historyId: null, // 当前结果可能没有历史记录ID
      params: taskInfo,
      content: result, // 保存当前结果内容
      timestamp: Date.now(),
    }));
    
    sessionStorage.setItem('generation_params', JSON.stringify({
      topic,
      customerId,
      creationMode: 'original_humanity',
    }));
    router.push(`/script/writing?topic=${encodeURIComponent(topic)}&customerId=${customerId}`);
  };
  
  // 从选题创建开篇
  const handleCreateOpening = (item: ResultItem) => {
    // 检查认证状态
    if (!isAuthenticated) {
      toast.error('登录已过期，请重新登录');
      router.push('/login');
      return;
    }
    
    // 存储选题到 sessionStorage，跳转到创作开篇页
    const topic = item.content.split('\n')[0].replace(/^\d+[.、）\]]\s*/, '');
    
    // 根据选题类型推断开篇类型
    let scriptType = 'opinion'; // 默认说观点
    if (item.topicType === 'knowledge' || item.typeName?.includes('教知识')) {
      scriptType = 'knowledge';
    } else if (item.topicType === 'story' || item.typeName?.includes('讲故事')) {
      scriptType = 'story';
    } else if (item.topicType === 'process' || item.typeName?.includes('晒过程')) {
      scriptType = 'process';
    }
    
    // 存储来源信息，用于返回功能
    sessionStorage.setItem('return_source', JSON.stringify({
      type: generationType,
      typeName: typeConfig?.name || '生成结果',
      historyId: null,
      params: taskInfo,
      content: result,
      timestamp: Date.now(),
    }));
    
    sessionStorage.setItem('generation_params', JSON.stringify({
      topic,
      customerId,
      scriptType,
    }));
    router.push('/script/create-opening');
  };
  
  // 文案转脚本
  const handleGenerateScript = (item: ResultItem) => {
    // 检查认证状态
    if (!isAuthenticated) {
      toast.error('登录已过期，请重新登录');
      router.push('/login');
      return;
    }
    
    // 确定脚本类型
    let scriptType: string;
    if (generationType === 'qianchuan_copywriting') {
      scriptType = 'qianchuan_script';
    } else if (generationType === 'feedad_copywriting') {
      scriptType = 'feedad_script';
    } else if (generationType === 'writing') {
      scriptType = 'script';
    } else {
      scriptType = 'script';
    }
    
    // 存储参数到 sessionStorage，跳转到结果页生成脚本
    const params = {
      ...taskInfo,
      copywriting: item.content, // 将文案作为参数传递
      contentType: 'script',
    };
    sessionStorage.setItem('generation_params', JSON.stringify(params));
    router.push(`/script/result?type=${scriptType}`);
  };
  
  const handleRegenerate = () => {
    sessionStorage.setItem('generation_params', JSON.stringify(taskInfo));
    setResult('');
    setDisplayResult('');
    setResultItems([]);
    setStructuredScriptResult(null);
    setDualVersionScriptResult(null);
    setRewriteScriptResult(null);
    setIsStructuredScript(false);
    structuredScriptRef.current = null;
    setStatus('preparing');
    setSavedItems(new Set());
    contentBufferRef.current = '';
    startGeneration(generationType, taskInfo);
  };
  
  const handleBack = () => {
    router.back();
  };
  
  const typeConfig = GENERATION_TYPES[generationType];
  const TypeIcon = typeConfig?.icon || Lightbulb;
  
  // 从历史记录恢复
  const handleRestoreHistory = (historyItem: { content: string; params: Record<string, any>; type: string }) => {
    const histTypeConfig = GENERATION_TYPES[historyItem.type as keyof typeof GENERATION_TYPES];
    
    // 防止 useEffect 重新触发生成
    isGeneratingRef.current = true;
    prevTypeRef.current = historyItem.type;
    
    // 重置所有状态
    setResult('');
    setDisplayResult('');
    setResultItems([]);
    setGroupedTopics([]);
    setNewGroupedTopics([]);
    setDialogueResult(null);
    setLiveSpeechResult(null);
    setAudienceAnalysis(null);
    setDataVersion('1.0');
    setStructuredScriptResult(null);
    setDualVersionScriptResult(null);
    setRewriteScriptResult(null);
    setIsStructuredScript(false);
    structuredScriptRef.current = null;
    setProgress(0);
    setStatus('preparing'); // 先设置为 preparing，防止显示"生成中"
    
    // 设置生成类型
    setGenerationType(historyItem.type);
    
    // 对话流需要特殊处理：解析JSON并设置dialogueResult
    if (histTypeConfig?.isDialogue) {
      try {
        const parsedDialogue = JSON.parse(historyItem.content);
        setDialogueResult(parsedDialogue);
        if (parsedDialogue.rounds) {
          setExpandedDialogueRounds(new Set(parsedDialogue.rounds.map((r: any) => r.round)));
        }
        setShowDialogueMonologue(true);
        // 对话流不需要设置resultItems，避免显示原始JSON
        setResultItems([]);
      } catch (e) {
        console.error('解析对话流历史记录失败:', e);
        setDialogueResult(null);
        // 解析失败时，也不显示原始JSON
        setResultItems([]);
      }
    } else if (histTypeConfig?.isBatchTopic) {
      // 批量选题需要特殊处理：解析JSON并设置groupedTopics/newGroupedTopics
      try {
        const topicData = JSON.parse(historyItem.content);
        
        // 检测版本
        const version = topicData.version || '1.0';
        setDataVersion(version);
        
        // 解析人群分析
        if (topicData.audienceAnalysis) {
          setAudienceAnalysis(topicData.audienceAnalysis);
        } else {
          setAudienceAnalysis(null);
        }
        
        // 解析分组选题
        if (version === '2.0' && topicData.groupedTopics && Array.isArray(topicData.groupedTopics)) {
          // 新版格式：流量型/变现型/人设型
          setNewGroupedTopics(topicData.groupedTopics);
          setGroupedTopics([]);
          
          // 设置 resultItems 用于统计
          const allItems: ResultItem[] = [];
          topicData.groupedTopics.forEach((group: any) => {
            if (group.subGroups && Array.isArray(group.subGroups)) {
              group.subGroups.forEach((subGroup: any) => {
                if (subGroup.topics && Array.isArray(subGroup.topics)) {
                  subGroup.topics.forEach((topic: any) => {
                    allItems.push({
                      id: allItems.length,
                      content: topic.content,
                      topicType: group.categoryId,
                      typeName: subGroup.name,
                      topicScore: topic.score,
                      highlights: topic.highlights,
                    });
                  });
                }
              });
            }
          });
          setResultItems(allItems);
        } else if (topicData.groupedTopics && Array.isArray(topicData.groupedTopics)) {
          // 旧版格式：说观点/教知识/晒过程/讲故事
          setGroupedTopics(topicData.groupedTopics);
          setNewGroupedTopics([]);
          
          // 设置 resultItems 用于统计
          const allItems: ResultItem[] = [];
          topicData.groupedTopics.forEach((group: any) => {
            if (group.topics && Array.isArray(group.topics)) {
              group.topics.forEach((topic: any) => {
                allItems.push({
                  id: allItems.length,
                  content: topic.content,
                  topicType: group.typeId,
                  typeName: group.typeInfo?.label,
                  method: topic.method,
                  methodName: topic.methodName,
                  topicScore: topic.score,
                  highlights: topic.highlightNames || topic.highlights,
                });
              });
            }
          });
          setResultItems(allItems);
        } else {
          setNewGroupedTopics([]);
          setGroupedTopics([]);
          setResultItems([]);
        }
      } catch (e) {
        console.error('解析批量选题历史记录失败:', e);
        setNewGroupedTopics([]);
        setGroupedTopics([]);
        setResultItems([]);
      }
    } else if (histTypeConfig?.isBatchOpening) {
      // 批量开篇需要特殊处理：解析JSON并设置resultItems
      try {
        const openingData = JSON.parse(historyItem.content);
        if (openingData.openings && Array.isArray(openingData.openings)) {
          setResultItems(openingData.openings.map((o: any, index: number) => ({
            id: index,
            content: o.content,
            title: `开篇${index + 1} - ${o.strategyName}`,
            ...o,
          })));
        } else {
          setResultItems([]);
        }
      } catch (e) {
        console.error('解析批量开篇历史记录失败:', e);
        setResultItems([]);
      }
    } else if (historyItem.type === 'script') {
      // 脚本类型需要特殊处理：尝试解析结构化格式
      try {
        const scriptData = JSON.parse(historyItem.content);
        
        // 检查是否是仿写多形态格式
        if (scriptData.hookOpening || scriptData.fullScript) {
          console.log('[历史恢复] 检测到仿写多形态格式');
          setRewriteScriptResult(scriptData);
          setIsStructuredScript(true);
          setResultItems([]);
          // 脚本类型不需要设置result和displayResult
          setTaskInfo(historyItem.params);
          if (historyItem.params.customerId) {
            setCustomerId(historyItem.params.customerId.toString());
          }
          setStatus('completed');
          setShowHistory(false);
          toast.success('已恢复历史记录');
          return; // 直接返回，不继续执行后面的逻辑
        }
        // 检查是否是双版本格式
        else if (scriptData.essentialVersion && scriptData.detailedVersion) {
          console.log('[历史恢复] 检测到双版本格式');
          setDualVersionScriptResult(scriptData);
          setStructuredScriptResult(scriptData.detailedVersion);
          setIsStructuredScript(true);
          setResultItems([]);
          setTaskInfo(historyItem.params);
          if (historyItem.params.customerId) {
            setCustomerId(historyItem.params.customerId.toString());
          }
          setStatus('completed');
          setShowHistory(false);
          toast.success('已恢复历史记录');
          return;
        }
        // 检查是否是单版本格式
        else if (scriptData.basicInfo && scriptData.shots) {
          console.log('[历史恢复] 检测到单版本格式');
          setStructuredScriptResult(scriptData);
          setIsStructuredScript(true);
          setResultItems([]);
          setTaskInfo(historyItem.params);
          if (historyItem.params.customerId) {
            setCustomerId(historyItem.params.customerId.toString());
          }
          setStatus('completed');
          setShowHistory(false);
          toast.success('已恢复历史记录');
          return;
        }
        else {
          // 无法识别的格式，显示原始内容
          setResultItems([]);
        }
      } catch (e) {
        console.error('解析脚本历史记录失败:', e);
        setResultItems([]);
      }
    } else {
      setDialogueResult(null);
      setResultItems(parseResultItems(historyItem.content, historyItem.type));
    }
    
    setResult(historyItem.content);
    setDisplayResult('');
    setTaskInfo(historyItem.params);
    if (historyItem.params.customerId) {
      setCustomerId(historyItem.params.customerId.toString());
    }
    setStatus('completed');
    setShowHistory(false);
    toast.success('已恢复历史记录');
  };
  
  return (
    <DashboardLayout>
      {/* 润色弹窗 */}
      {showPolishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                口语化润色
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowPolishModal(false)}>
                <span className="sr-only">关闭</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-140px)]">
              {/* 原始文案 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">原始文案</label>
                <div className="p-4 bg-muted/50 rounded-lg border text-sm">
                  {polishingText}
                </div>
              </div>
              
              {/* 润色按钮 */}
              {!polishedResult && (
                <Button
                  onClick={submitPolish}
                  disabled={polishingId !== null}
                  className="w-full gradient-bg"
                >
                  {polishingId !== null ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      正在润色...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      开始润色
                    </>
                  )}
                </Button>
              )}
              
              {/* 润色结果 */}
              {polishedResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    润色完成
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{polishedResult}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={copyPolishedResult} className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      复制结果
                    </Button>
                    <Button variant="outline" onClick={submitPolish} className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      重新润色
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 生成提示组件 - 固定在右上角，可拖动 */}
      {(status === 'preparing' || status === 'generating') && (
        <GenerationTip />
      )}
      
      <div className="max-w-5xl mx-auto space-y-6 pb-24">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          
          <div className="flex items-center gap-3">
            {/* 历史记录按钮 */}
            <GenerationHistory
              currentType={generationType}
              onSelectHistory={handleRestoreHistory}
              variant="button"
            />
            {status === 'completed' && (
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                已完成
              </Badge>
            )}
          </div>
        </div>
        
        {/* 主内容区 */}
        <Card className="min-h-[500px] relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          
          {/* 准备中状态 */}
          {status === 'preparing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <p className="text-muted-foreground">正在准备...</p>
              </div>
            </div>
          )}
          
          {/* 生成中状态 */}
          {status === 'generating' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden z-20">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          <CardContent className="p-6">
            {/* 生成中提示 */}
            {status === 'generating' && !displayResult && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                  </div>
                  <div>
                    <p className="font-medium">AI 正在创作中...</p>
                    <p className="text-sm text-muted-foreground mt-1">请稍候，精彩内容即将呈现</p>
                    {currentGeneratingType && (
                      <p className="text-xs text-muted-foreground mt-2">
                        正在生成：{getTopicLabel(currentGeneratingType)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* 结果展示区 */}
            {status === 'completed' && (resultItems.length > 0 || dialogueResult || (generationType === 'script' && isStructuredScript && (structuredScriptResult || rewriteScriptResult))) ? (
              <div ref={resultRef} className="space-y-4">
                {/* 文案类型显示展示模式切换和创作需求回顾 */}
                {generationType === 'writing' && (
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <DisplayModeToggle 
                      mode={displayMode} 
                      onChange={setDisplayMode} 
                    />
                    <div className="text-sm text-muted-foreground">
                      共 {resultItems.length} 个文案
                    </div>
                  </div>
                )}
                
                {/* 分组选题展示 */}
                {generationType === 'topic_batch' && (newGroupedTopics.length > 0 || groupedTopics.length > 0) ? (
                  <div className="space-y-6">
                    {/* 人群分析卡片（新版格式） */}
                    {audienceAnalysis && dataVersion === '2.0' && (
                      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800/30">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold text-blue-700 dark:text-blue-400">目标人群分析</span>
                        </div>
                        
                        {/* 人群画像 */}
                        <div className="mb-4 p-3 bg-white/50 dark:bg-white/5 rounded-lg">
                          <p className="text-sm text-foreground/80">{audienceAnalysis.profile}</p>
                        </div>
                        
                        {/* 四象限分析 */}
                        {audienceAnalysis.quadrants && audienceAnalysis.quadrants.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {audienceAnalysis.quadrants.map((q) => (
                              <div key={q.id} className="p-2 bg-white/30 dark:bg-white/5 rounded-lg">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Badge variant="outline" className="text-xs">{q.name}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{q.focus}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* 四痛点分析 */}
                        {audienceAnalysis.painPoints && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {audienceAnalysis.painPoints.demand && (
                              <div className="p-2 bg-green-100/50 dark:bg-green-950/20 rounded-lg border border-green-200/50">
                                <span className="text-xs font-medium text-green-700 dark:text-green-400">需求</span>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{audienceAnalysis.painPoints.demand}</p>
                              </div>
                            )}
                            {audienceAnalysis.painPoints.pain && (
                              <div className="p-2 bg-red-100/50 dark:bg-red-950/20 rounded-lg border border-red-200/50">
                                <span className="text-xs font-medium text-red-700 dark:text-red-400">痛点</span>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{audienceAnalysis.painPoints.pain}</p>
                              </div>
                            )}
                            {audienceAnalysis.painPoints.pleasure && (
                              <div className="p-2 bg-yellow-100/50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200/50">
                                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">爽点</span>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{audienceAnalysis.painPoints.pleasure}</p>
                              </div>
                            )}
                            {audienceAnalysis.painPoints.itch && (
                              <div className="p-2 bg-purple-100/50 dark:bg-purple-950/20 rounded-lg border border-purple-200/50">
                                <span className="text-xs font-medium text-purple-700 dark:text-purple-400">痒点</span>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{audienceAnalysis.painPoints.itch}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 新版格式：流量型/变现型/人设型 */}
                    {dataVersion === '2.0' && newGroupedTopics.length > 0 ? (
                      newGroupedTopics.map((group) => (
                        <div key={group.categoryId} className="space-y-3">
                          {/* 类型标题 */}
                          <div className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-lg",
                            group.categoryInfo.bgColor
                          )}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{group.categoryInfo.icon}</span>
                              <span className="font-semibold">{group.categoryInfo.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {group.subGroups.reduce((acc, sg) => acc + sg.topics.length, 0)}个选题
                              </Badge>
                            </div>
                          </div>
                          
                          {/* 子分组 */}
                          {group.subGroups.map((subGroup) => (
                            <div key={subGroup.subTypeId} className="ml-4 space-y-2">
                              {/* 子类型标题 */}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                                <Badge variant="outline" className="text-xs">
                                  {subGroup.subType === 'A' ? 'A类' : 'B类'}
                                </Badge>
                                <span className="font-medium">{subGroup.name}</span>
                                <span className="text-xs">· {subGroup.goal}</span>
                              </div>
                              
                              {/* 选题列表 */}
                              {subGroup.topics.map((topic, index) => (
                                <div
                                  key={topic.id}
                                  className="group flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                >
                                  {/* 序号 */}
                                  <span className="text-sm font-mono text-muted-foreground w-6 shrink-0 pt-0.5">
                                    {index + 1}.
                                  </span>
                                  
                                  {/* 内容 */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm leading-relaxed">{topic.content}</p>
                                    
                                    {/* 标签 */}
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                      <Badge variant="outline" className="text-[10px]">
                                        {subGroup.name}
                                      </Badge>
                                      {topic.highlights?.map((h: string, i: number) => (
                                        <Badge key={i} variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/30">
                                          {h}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* 操作按钮 */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => {
                                        navigator.clipboard.writeText(topic.content);
                                        toast.success('已复制');
                                      }}
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      复制
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleSaveItem(topic)}
                                      disabled={savedItems.has(topic.id)}
                                    >
                                      {savedItems.has(topic.id) ? (
                                        <><Check className="w-3 h-3 mr-1 text-green-500" />已保存</>
                                      ) : (
                                        <><Plus className="w-3 h-3 mr-1" />保存</>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-orange-500 hover:text-orange-600"
                                      onClick={() => handleCreateOpening(topic)}
                                    >
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      创作开篇
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs text-primary"
                                      onClick={() => handleCreateWriting(topic)}
                                    >
                                      <FileEdit className="w-3 h-3 mr-1" />
                                      创作文案
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      // 旧版格式：说观点/教知识/晒过程/讲故事
                      groupedTopics.map((group) => (
                        <div key={group.typeId} className="space-y-3">
                          {/* 类型标题 */}
                          <div className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-lg",
                            group.typeInfo.bgColor
                          )}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{group.typeInfo.icon}</span>
                              <span className="font-semibold">{group.typeInfo.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {group.topics.length}个选题
                              </Badge>
                            </div>
                          </div>
                          
                          {/* 选题列表 */}
                          <div className="space-y-2">
                            {group.topics.map((topic, index) => (
                              <div
                                key={topic.id}
                                className="group flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                              >
                                {/* 序号 */}
                                <span className="text-sm font-mono text-muted-foreground w-6 shrink-0 pt-0.5">
                                  {index + 1}.
                                </span>
                                
                                {/* 内容 */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm leading-relaxed">{topic.content}</p>
                                  
                                  {/* 标签 */}
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    <Badge variant="outline" className="text-[10px]">
                                      {group.typeInfo.label}
                                    </Badge>
                                    {topic.methodName && (
                                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                        {topic.methodName}
                                      </Badge>
                                    )}
                                    {topic.highlights?.map((h: string, i: number) => (
                                      <Badge key={i} variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/30">
                                        {h}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* 操作按钮 */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(topic.content);
                                      toast.success('已复制');
                                    }}
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    复制
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleSaveItem(topic)}
                                    disabled={savedItems.has(topic.id)}
                                  >
                                    {savedItems.has(topic.id) ? (
                                      <><Check className="w-3 h-3 mr-1 text-green-500" />已保存</>
                                    ) : (
                                      <><Plus className="w-3 h-3 mr-1" />保存</>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-orange-500 hover:text-orange-600"
                                    onClick={() => handleCreateOpening(topic)}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    创作开篇
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-primary"
                                    onClick={() => handleCreateWriting(topic)}
                                  >
                                    <FileEdit className="w-3 h-3 mr-1" />
                                    创作文案
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : generationType === 'dialogue' && dialogueResult ? (
                  // 对话流展示
                  <div className="space-y-4">
                    {/* IP基本信息 */}
                    {dialogueResult.ipInfo && Object.keys(dialogueResult.ipInfo).some(k => dialogueResult.ipInfo?.[k as keyof typeof dialogueResult.ipInfo]) && (
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="font-medium">IP基本信息</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {dialogueResult.ipInfo.industry && <div><span className="text-muted-foreground">行业：</span>{typeof dialogueResult.ipInfo.industry === 'object' ? JSON.stringify(dialogueResult.ipInfo.industry) : dialogueResult.ipInfo.industry}</div>}
                          {dialogueResult.ipInfo.persona && <div><span className="text-muted-foreground">人设：</span>{typeof dialogueResult.ipInfo.persona === 'object' ? JSON.stringify(dialogueResult.ipInfo.persona) : dialogueResult.ipInfo.persona}</div>}
                          {dialogueResult.ipInfo.coreAngle && <div><span className="text-muted-foreground">核心切点：</span>{typeof dialogueResult.ipInfo.coreAngle === 'object' ? JSON.stringify(dialogueResult.ipInfo.coreAngle) : dialogueResult.ipInfo.coreAngle}</div>}
                          {dialogueResult.ipInfo.targetAudience && <div><span className="text-muted-foreground">目标观众：</span>{typeof dialogueResult.ipInfo.targetAudience === 'object' ? JSON.stringify(dialogueResult.ipInfo.targetAudience) : dialogueResult.ipInfo.targetAudience}</div>}
                        </div>
                      </div>
                    )}
                    
                    {/* 开篇前2秒 */}
                    {dialogueResult.opening && (
                      <div className="p-4 border border-yellow-500/30 rounded-lg bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="font-medium">开篇前2秒</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleCopy(`编导：${typeof dialogueResult.opening?.question === 'object' ? JSON.stringify(dialogueResult.opening.question) : dialogueResult.opening?.question}\nIP：${typeof dialogueResult.opening?.answer === 'object' ? JSON.stringify(dialogueResult.opening.answer) : dialogueResult.opening?.answer}`)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-xs text-muted-foreground">编导：</span>
                            <p className="font-medium">{typeof dialogueResult.opening.question === 'object' ? JSON.stringify(dialogueResult.opening.question) : dialogueResult.opening.question}</p>
                          </div>
                          <div className="p-3 bg-primary/5 rounded-lg">
                            <span className="text-xs text-muted-foreground">IP：</span>
                            <p className="font-medium">{typeof dialogueResult.opening.answer === 'object' ? JSON.stringify(dialogueResult.opening.answer) : dialogueResult.opening.answer}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 多轮对话 */}
                    {dialogueResult.rounds && dialogueResult.rounds.length > 0 && (
                      <div className="space-y-3">
                        {dialogueResult.rounds.map((round) => (
                          <div key={round.round} className="p-4 border rounded-lg bg-card">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary">第{round.round}轮</Badge>
                                <span className="text-sm text-muted-foreground">{typeof round.goal === 'object' ? JSON.stringify(round.goal) : round.goal}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" onClick={() => handleCopy(`【第${round.round}轮：${typeof round.goal === 'object' ? JSON.stringify(round.goal) : round.goal}】\n编导：${typeof round.question === 'object' ? JSON.stringify(round.question) : round.question}\nIP：${typeof round.answer === 'object' ? JSON.stringify(round.answer) : round.answer}`)}>
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => {
                                  setExpandedDialogueRounds(prev => {
                                    const newSet = new Set(prev);
                                    if (newSet.has(round.round)) newSet.delete(round.round);
                                    else newSet.add(round.round);
                                    return newSet;
                                  });
                                }}>
                                  {expandedDialogueRounds.has(round.round) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </div>
                            </div>
                            {expandedDialogueRounds.has(round.round) && (
                              <div className="space-y-2">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                  <span className="text-xs text-muted-foreground">编导：</span>
                                  <p className="mt-1">{typeof round.question === 'object' ? JSON.stringify(round.question) : round.question}</p>
                                </div>
                                <div className="p-3 bg-primary/5 rounded-lg">
                                  <span className="text-xs text-muted-foreground">IP：</span>
                                  <p className="mt-1 whitespace-pre-wrap">{typeof round.answer === 'object' ? JSON.stringify(round.answer) : round.answer}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 整合独白文案 */}
                    {dialogueResult.monologue && (
                      <div className="p-4 border border-green-500/30 rounded-lg bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-500" />
                            <span className="font-medium">整合独白文案</span>
                            <span className="text-xs text-muted-foreground">适合IP单独输出</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setShowDialogueMonologue(!showDialogueMonologue)}>
                              {showDialogueMonologue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleCopy(typeof dialogueResult.monologue === 'object' ? JSON.stringify(dialogueResult.monologue) : dialogueResult.monologue || '')}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {showDialogueMonologue && (
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <p className="whitespace-pre-wrap leading-relaxed">{typeof dialogueResult.monologue === 'object' ? JSON.stringify(dialogueResult.monologue) : dialogueResult.monologue}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : generationType === 'opening_batch' ? (
                  // 开篇结果展示 - 场景化单列卡片布局
                  // 先计算评分，然后按评分排序
                  (() => {
                    const scoredItems = resultItems.map((item: any, index: number) => {
                      // 模拟评分：基于内容质量给正向评分（80-98分）
                      const baseScore = 85;
                      const lengthBonus = item.content && item.content.length > 30 ? 5 : 0;
                      const strategyBonus = ['痛点共鸣', '对比冲击', '数据震撼'].includes(item.strategyName) ? 8 : 3;
                      const score = Math.min(baseScore + lengthBonus + strategyBonus, 98);
                      const rating = score >= 95 ? '金牌' : score >= 90 ? '优质' : '良好';
                      const ratingColor = score >= 95 ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' : score >= 90 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white';
                      return { ...item, score, rating, ratingColor };
                    });
                    return scoredItems.sort((a, b) => b.score - a.score);
                  })().map((item: any, sortedIndex: number) => (
                      <div
                        key={item.id}
                        className="relative rounded-xl border overflow-hidden transition-all hover:shadow-lg bg-card hover:border-primary/30"
                      >
                        {/* 卡片头部 - 评分徽章 + 策略名 + 适合场景 */}
                        <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* 评分徽章 - 视觉突出 */}
                              <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.ratingColor} shadow-sm`}>
                                {item.rating}
                              </div>
                              <span className="font-bold text-lg text-primary">开篇{sortedIndex + 1}</span>
                              <Badge variant="secondary" className="font-medium">
                                {item.strategyName}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{item.wordCount}字</span>
                              {/* 策略说明悬停 */}
                              <div className="group relative">
                                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 rounded-lg bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                  <p className="font-medium mb-1">{item.strategyName}</p>
                                  <p className="text-gray-300">{item.suitableFor}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">适合：</span>
                            <span className="text-sm font-medium text-foreground">{item.suitableFor}</span>
                          </div>
                        </div>
                        
                        {/* 开篇内容 */}
                        <div className="p-4">
                          <p className="text-base leading-relaxed text-foreground">
                            &quot;{item.content}&quot;
                          </p>
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="px-4 py-3 border-t flex items-center justify-between bg-muted/30">
                          <div className="flex items-center gap-2">
                            {/* 收藏按钮 */}
                            <Button
                              size="sm"
                              variant={savedItems.has(item.id) ? "secondary" : "ghost"}
                              onClick={() => handleSaveItem(item)}
                              className="h-8 text-xs"
                            >
                              {savedItems.has(item.id) ? (
                                <>
                                  <Heart className="w-3.5 h-3.5 mr-1.5 text-red-500 fill-current" />
                                  已收藏
                                </>
                              ) : (
                                <>
                                  <Heart className="w-3.5 h-3.5 mr-1.5" />
                                  收藏
                                </>
                              )}
                            </Button>
                            {/* 一键润色 */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePolish(item.content)}
                              className="h-8 text-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                              润色
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopy(item.content)}
                              className="h-8 text-xs"
                            >
                              <Copy className="w-3.5 h-3.5 mr-1.5" />
                              复制
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                sessionStorage.setItem('generation_params', JSON.stringify({
                                  topic: taskInfo.topic,
                                  opening: item.content,
                                  openingStrategy: item.strategyName,
                                  customerId: taskInfo.customerId,
                                  customerName: taskInfo.customerName,
                                  scriptType: taskInfo.scriptType,
                                  creationMode: 'original_humanity',
                                }));
                                router.push('/script/result?type=writing');
                              }}
                              className="h-8 text-xs gradient-bg border-0"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              生成文案
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                ) : generationType === 'live_speech' && liveSpeechResult ? (
                  // 直播话术展示
                  <div className="space-y-6">
                    {/* 使用提示 */}
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-2 text-sm">
                          <p className="font-medium text-foreground">话术使用建议</p>
                          <ul className="text-muted-foreground space-y-1">
                            <li>• <strong>爆款冲单版</strong>：适合优惠力度大的套餐，开场直接抛价格冲击</li>
                            <li>• <strong>精准转化版</strong>：适合解决用户痛点，先共鸣再推销</li>
                            <li>• <strong>情感共鸣版</strong>：适合营造场景氛围，让用户产生向往</li>
                          </ul>
                          <p className="text-xs text-muted-foreground pt-1">
                            💡 可以根据实际直播情况，灵活组合三套话术的片段使用
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* 价格信息概览 */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border">
                      <div className="flex items-center gap-4 mb-4">
                        <Radio className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-lg">{liveSpeechResult.merchantName}</span>
                        <Badge variant="outline">{liveSpeechResult.industryName}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-2xl font-bold text-foreground">{liveSpeechResult.priceInfo.originalPrice}元</div>
                          <div className="text-xs text-muted-foreground">原价</div>
                        </div>
                        <div className="p-3 rounded-lg bg-success/10">
                          <div className="text-2xl font-bold text-success">{liveSpeechResult.priceInfo.livePrice}元</div>
                          <div className="text-xs text-muted-foreground">直播价</div>
                        </div>
                        <div className="p-3 rounded-lg bg-destructive/10">
                          <div className="text-2xl font-bold text-destructive">省{liveSpeechResult.priceInfo.discount}元</div>
                          <div className="text-xs text-muted-foreground">{liveSpeechResult.priceInfo.discountRate}</div>
                        </div>
                      </div>
                    </div>

                    {/* 三套话术Tab */}
                    <div className="space-y-4">
                      {/* Tab导航 */}
                      <div className="flex gap-2 p-1 bg-muted rounded-xl">
                        {liveSpeechResult.speeches.map((speech) => (
                          <button
                            key={speech.hookType}
                            onClick={() => setActiveSpeechTab(speech.hookType)}
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                              activeSpeechTab === speech.hookType
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {speech.hookLabel}
                          </button>
                        ))}
                      </div>

                      {/* 话术内容 */}
                      {liveSpeechResult.speeches.filter(s => s.hookType === activeSpeechTab).map((speech) => (
                        <div key={speech.hookType} className="space-y-4">
                          {/* 钩子类型说明 */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                              <span className="font-medium">{speech.hookName}</span>
                              <span className="text-muted-foreground ml-2">· {speech.hookDescription}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(speech.fullScript)}
                            >
                              <Copy className="w-3.5 h-3.5 mr-1.5" />
                              复制完整话术
                            </Button>
                          </div>

                          {/* 完整话术 */}
                          {speech.fullScript && (
                            <div className="p-4 rounded-xl border bg-card">
                              <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                                {speech.fullScript}
                              </p>
                            </div>
                          )}

                          {/* 五步话术拆解 */}
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">话术拆解</div>
                            {speech.steps.map((step) => {
                              const stepKey = `${speech.hookType}-${step.stepId}`;
                              const isExpanded = expandedSpeechSteps.has(stepKey);
                              
                              return (
                                <div key={step.stepId} className="rounded-xl border overflow-hidden">
                                  <button
                                    onClick={() => {
                                      setExpandedSpeechSteps(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(stepKey)) newSet.delete(stepKey);
                                        else newSet.add(stepKey);
                                        return newSet;
                                      });
                                    }}
                                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{step.order}</Badge>
                                      <span className="font-medium">{step.stepName}</span>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                  {isExpanded && (
                                    <div className="px-4 pb-4 space-y-2">
                                      <p className="text-sm text-foreground">{step.content}</p>
                                      {step.tips && step.tips.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {step.tips.map((tip, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                              {tip}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* 技巧解析 */}
                          {speech.analysis && (
                            <div className="p-4 rounded-xl bg-primary/5 space-y-2">
                              <div className="text-sm font-medium">技巧解析</div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><strong>钩子类型：</strong>{speech.analysis.hookType}</p>
                                <p><strong>核心技巧：</strong>{speech.analysis.coreTechnique}</p>
                                <p><strong>可复制公式：</strong>{speech.analysis.copyableFormula}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 优化建议 */}
                    {liveSpeechResult.suggestions && (
                      <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                        <div className="text-sm font-medium">优化建议</div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {liveSpeechResult.suggestions.missingInfo?.map((s, i) => (
                            <p key={i}>• {s}</p>
                          ))}
                          {liveSpeechResult.suggestions.versionSwitch && (
                            <p>• {liveSpeechResult.suggestions.versionSwitch}</p>
                          )}
                          {liveSpeechResult.suggestions.industryTips && (
                            <p>• {liveSpeechResult.suggestions.industryTips}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : generationType === 'script' && isStructuredScript && (structuredScriptResult || rewriteScriptResult) ? (
                  // 结构化脚本展示
                  rewriteScriptResult ? (
                    // 仿写多形态展示
                    <RewriteMultiFormatView
                      script={rewriteScriptResult}
                      onSave={() => {
                        toast.success('保存成功');
                      }}
                    />
                  ) : dualVersionScriptResult ? (
                    // 双版本脚本展示
                    <DualVersionScriptView
                      essentialVersion={dualVersionScriptResult.essentialVersion}
                      detailedVersion={dualVersionScriptResult.detailedVersion}
                      onSave={() => {
                        toast.success('保存成功');
                      }}
                    />
                  ) : structuredScriptResult ? (
                    // 单版本脚本展示
                    <ScriptResultView
                      script={structuredScriptResult}
                      onSave={() => {
                        toast.success('保存成功');
                      }}
                    />
                  ) : null
                ) : (
                  // 常规结果展示
                  (generationType === 'writing' || generationType === 'qianchuan_copywriting' || generationType === 'feedad_copywriting') ? (
                    // 文案创作使用新组件（包含普通文案、千川文案、信息流文案）
                    <div className="space-y-4">
                      {resultItems.map((item, index) => (
                        <CopywritingCard
                          key={item.id}
                          item={item}
                          index={index}
                          displayMode={displayMode}
                          generationType={generationType as 'writing' | 'qianchuan_copywriting' | 'feedad_copywriting'}
                          adType={taskInfo.adType as 'brand_awareness' | 'lead_generation' | 'app_download' | undefined}
                          onCopy={(content) => {
                            navigator.clipboard.writeText(content);
                            toast.success('已复制到剪贴板');
                          }}
                          onSave={handleSaveItem}
                          onGenerateScript={handleGenerateScript}
                          saved={savedItems.has(item.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    // 其他类型保持原有展示
                    resultItems.map((item) => (
                      <div
                        key={item.id}
                        className="relative p-4 rounded-lg border border-border bg-card"
                      >
                        {/* 封面标题 - 仅文案创作显示 */}
                        {generationType === 'writing' && item.coverTitles && item.coverTitles.length > 0 && (
                          <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800">
                            <div className="flex items-center gap-2 mb-3">
                              <Zap className="w-4 h-4 text-orange-500" />
                              <span className="font-medium text-orange-700 dark:text-orange-300">建议视频封面标题</span>
                              <Badge variant="outline" className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-300 border-orange-200 dark:border-orange-700">
                                3个可选
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {item.coverTitles.map((title, idx) => (
                                <div
                                  key={idx}
                                  className="group relative p-3 rounded-lg bg-white dark:bg-card border border-orange-100 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-600 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-medium text-foreground">{title}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(title);
                                        toast.success('已复制封面标题');
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded"
                                    >
                                      <Copy className="w-3 h-3 text-orange-500" />
                                    </button>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {title.length}字
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 内容 */}
                        <div className="whitespace-pre-wrap leading-relaxed text-foreground/90 mb-3">
                          {item.content}
                        </div>
                        
                        {/* 操作按钮 - 始终显示 */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                          {generationType === 'topic' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateWriting(item)}
                              className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            >
                              <FileEdit className="w-3.5 h-3.5 mr-1.5" />
                              创作文案
                            </Button>
                          )}
                          {/* 文案转脚本按钮 */}
                          {GENERATION_TYPES[generationType]?.supportScript && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateScript(item)}
                              className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              生成脚本
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(item.content)}
                          >
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            复制
                          </Button>
                          <Button
                            size="sm"
                            variant={savedItems.has(item.id) ? 'outline' : 'default'}
                            onClick={() => handleSaveItem(item)}
                            disabled={savedItems.has(item.id)}
                            className={savedItems.has(item.id) ? 'bg-green-50 dark:bg-green-900/30 border-green-200 text-green-600' : 'gradient-bg border-0'}
                          >
                            {savedItems.has(item.id) ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                                已添加
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                加入素材库
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            ) : status === 'generating' && displayResult ? (
              // 文案创作类型不显示原始JSON，显示加载提示
              generationType === 'writing' ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">正在创作文案，请稍候...</p>
                </div>
              ) : (
                <div ref={resultRef} className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                  {displayResult}
                </div>
              )
            ) : status === 'completed' && !resultItems.length && !dialogueResult && !(generationType === 'script' && isStructuredScript && (structuredScriptResult || rewriteScriptResult)) ? (
              <div className="text-center py-20 text-muted-foreground">
                生成结果为空
              </div>
            ) : null}
            
            {/* 错误状态 */}
            {status === 'error' && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-destructive">生成失败</p>
                    <p className="text-sm text-muted-foreground mt-1">请检查参数后重试</p>
                  </div>
                  <Button onClick={handleRegenerate} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新生成
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* 底部操作栏 */}
      {status === 'completed' && result && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t z-30">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回编辑
            </Button>
            
            <Button variant="outline" onClick={() => handleCopy()}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-green-500" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  复制全部
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              下载
            </Button>
            
            {/* 加入素材库按钮 - 对于单个结果项的类型显示 */}
            {resultItems.length > 0 && !GENERATION_TYPES[generationType]?.isBatchOpening && !GENERATION_TYPES[generationType]?.isBatchTopic && !GENERATION_TYPES[generationType]?.isDialogue && (
              <Button
                variant={savedItems.has(resultItems[0].id) ? 'outline' : 'default'}
                onClick={() => handleSaveItem(resultItems[0])}
                disabled={savedItems.has(resultItems[0].id)}
                className={savedItems.has(resultItems[0].id) ? 'bg-green-50 dark:bg-green-900/30 border-green-200 text-green-600' : 'gradient-bg border-0'}
              >
                {savedItems.has(resultItems[0].id) ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已添加
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    加入素材库
                  </>
                )}
              </Button>
            )}
            
            <Button 
              onClick={handleRegenerate}
              className="gradient-bg border-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重新生成
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    }>
      <ResultContent />
    </Suspense>
  );
}
