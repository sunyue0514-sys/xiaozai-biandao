'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Send, RefreshCw, Check, ChevronRight, ChevronLeft, Lightbulb, Target, Zap, Heart, Users, User, Plus, Edit3, Save, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/api';

// 类型定义
interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  options?: Option[];
}

interface Option {
  id: string;
  label: string;
  description?: string;
  example?: string;  // 示例文案
  icon?: React.ReactNode;
  value: string;
}

interface Customer {
  id: number;
  name: string;
  avatar_url?: string;
  ip_positioning?: string;
  target_users?: string;
}

interface FrameworkPart {
  name: string;
  time: string;
}

interface StepContext {
  customer: Customer | null;
  topic: string;
  audience: string;
  contentType: string;  // 内容类型：讲故事/分享干货/聊观点/种草产品/分享经历
  style: string;
  value: string;
  framework: FrameworkPart[];
}

const TOTAL_STEPS = 6;

// 人群选项
const AUDIENCE_OPTIONS: Option[] = [
  { id: 'comparing', label: '已在对比', description: '正在挑产品/服务，想看真实评价', icon: <Target className="h-5 w-5" />, value: '正在对比产品的人群' },
  { id: 'problem', label: '遇到问题', description: '有需求但不知道怎么办', icon: <Lightbulb className="h-5 w-5" />, value: '遇到问题需要解决方案的人群' },
  { id: 'dormant', label: '还在观望', description: '有需求但还没意识到', icon: <Heart className="h-5 w-5" />, value: '需求未被唤醒的人群' },
  { id: 'casual', label: '随便看看', description: '没明确需求，泛娱乐向', icon: <Users className="h-5 w-5" />, value: '泛娱乐随便看看的人群' },
];

// 风格选项
// 内容类型选项（决定用哪个框架模板）
const contentTypeOptions = [
  { id: 'story', label: '讲故事', description: '分享一个真实经历，有起承转合', example: '你们知道吗，我之前被公司优化了...后来我用这个方法，三个月找到了新工作', icon: <Heart className="h-5 w-5" />, value: '讲故事' },
  { id: 'knowledge', label: '分享干货', description: '传授方法或技巧，有步骤有要点', example: '今天教你三个判断脾胃是否健康的方法，第一看舌苔，第二看大便，第三...', icon: <Lightbulb className="h-5 w-5" />, value: '分享干货' },
  { id: 'opinion', label: '聊观点', description: '表达一个看法，有立场有论据', example: '我觉得职场里最危险的不是被卷死，是35岁还没建立自己的核心竞争力...', icon: <Target className="h-5 w-5" />, value: '聊观点' },
  { id: 'product', label: '种草产品', description: '推荐某个产品，有体验有理由', example: '用了三个月这个精华液，皮肤真的变亮了，今天来分享下我的使用感受...', icon: <Sparkles className="h-5 w-5" />, value: '种草产品' },
  { id: 'experience', label: '分享经历', description: '记录生活片段，有感受有感悟', example: '今天去体检，发现脂肪肝没了！分享一下我这半年都做了什么...', icon: <Users className="h-5 w-5" />, value: '分享经历' },
];

// 步骤标签映射（用于状态摘要显示）
const STEP_LABELS: Record<number, { key: keyof Omit<StepContext, 'customer' | 'framework'>; label: string }> = {
  2: { key: 'contentType', label: '内容类型' },
  3: { key: 'audience', label: '目标人群' },
  4: { key: 'style', label: '创作风格' },
  5: { key: 'value', label: '价值承诺' },
};

const getStyleOptions = (audience: string): Option[] => {
  const styles: Record<string, Option[]> = {
    '正在对比产品的人群': [
      { id: 'compare', label: '测评对比型', description: '客观分析优缺点，帮你做决策', icon: <Target className="h-5 w-5" />, value: '测评对比' },
      { id: 'truth', label: '真实体验型', description: '分享真实使用感受', icon: <Heart className="h-5 w-5" />, value: '真实体验' },
      { id: 'fun', label: '轻松测评型', description: '测评不枯燥，看完就懂', icon: <Sparkles className="h-5 w-5" />, value: '轻松测评' },
      { id: 'quick', label: '快速结论型', description: '直接给结论，不废话', icon: <Zap className="h-5 w-5" />, value: '快速结论' },
    ],
    '遇到问题需要解决方案的人群': [
      { id: 'tutorial', label: '干货教程型', description: '手把手教你解决', icon: <Lightbulb className="h-5 w-5" />, value: '干货教程' },
      { id: 'story', label: '经历分享型', description: '用故事带你走出困境', icon: <Heart className="h-5 w-5" />, value: '经历分享' },
      { id: 'fun', label: '轻松解决型', description: '问题不难，换个思路', icon: <Sparkles className="h-5 w-5" />, value: '轻松解决' },
      { id: 'quick', label: '速战速决型', description: '3分钟搞定', icon: <Zap className="h-5 w-5" />, value: '速战速决' },
    ],
    '需求未被唤醒的人群': [
      { id: 'scene', label: '场景共鸣型', description: '让你觉得"这就是我"', icon: <Sparkles className="h-5 w-5" />, value: '场景共鸣' },
      { id: 'emotion', label: '情感触达型', description: '触动内心，引发思考', icon: <Heart className="h-5 w-5" />, value: '情感触达' },
      { id: 'knowledge', label: '知识科普型', description: '让你知道还有这回事', icon: <Lightbulb className="h-5 w-5" />, value: '知识科普' },
      { id: 'share', label: '利他分享型', description: '分享有价值的信息', icon: <Users className="h-5 w-5" />, value: '利他分享' },
    ],
    '泛娱乐随便看看的人群': [
      { id: 'fun', label: '轻松娱乐型', description: '看完心情好', icon: <Sparkles className="h-5 w-5" />, value: '轻松娱乐' },
      { id: 'knowledge', label: '涨知识型', description: '有趣又有料', icon: <Lightbulb className="h-5 w-5" />, value: '涨知识' },
      { id: 'emotion', label: '情感治愈型', description: '温暖人心', icon: <Heart className="h-5 w-5" />, value: '情感治愈' },
      { id: 'twist', label: '神转折型', description: '猜不到结局', icon: <Zap className="h-5 w-5" />, value: '神转折' },
    ],
  };
  return styles[audience] || styles['泛娱乐随便看看的人群'];
};

// 价值点选项
const VALUE_OPTIONS: Option[] = [
  { id: 'skill', label: '学到一招', description: '获得实用的技巧或方法', icon: <Target className="h-5 w-5" />, value: '学到一招' },
  { id: 'insight', label: '认知刷新', description: '知道原来是这样的', icon: <Lightbulb className="h-5 w-5" />, value: '认知刷新' },
  { id: 'template', label: '直接能用', description: '拿到模板直接用', icon: <Zap className="h-5 w-5" />, value: '直接能用' },
  { id: 'action', label: '马上行动', description: '知道下一步该做什么', icon: <Check className="h-5 w-5" />, value: '马上行动' },
];

// 根据风格获取默认框架
const getDefaultFramework = (style: string): FrameworkPart[] => {
  const frameworks: Record<string, FrameworkPart[]> = {
    '测评对比': [
      { name: '开场钩子', time: '3秒' },
      { name: '痛点引入', time: '5秒' },
      { name: '核心对比', time: '35秒' },
      { name: '总结建议', time: '5秒' },
      { name: '行动引导', time: '5秒' },
    ],
    '干货教程': [
      { name: '痛点开场', time: '3秒' },
      { name: '问题确认', time: '5秒' },
      { name: '步骤讲解', time: '40秒' },
      { name: '效果展示', time: '5秒' },
      { name: '行动引导', time: '5秒' },
    ],
    '真实体验': [
      { name: '场景带入', time: '3秒' },
      { name: '经历讲述', time: '25秒' },
      { name: '干货植入', time: '20秒' },
      { name: '总结升华', time: '5秒' },
      { name: '互动引导', time: '5秒' },
    ],
    '知识科普': [
      { name: '悬念开场', time: '3秒' },
      { name: '问题抛出', time: '10秒' },
      { name: '知识讲解', time: '35秒' },
      { name: '总结要点', time: '5秒' },
      { name: '行动引导', time: '5秒' },
    ],
    '轻松测评': [
      { name: '趣味开场', time: '3秒' },
      { name: '场景铺垫', time: '10秒' },
      { name: '测评过程', time: '35秒' },
      { name: '结果揭晓', time: '5秒' },
      { name: '轻松互动', time: '5秒' },
    ],
    '快速结论': [
      { name: '直击要点', time: '3秒' },
      { name: '核心结论', time: '40秒' },
      { name: '补充说明', time: '10秒' },
      { name: '行动建议', time: '5秒' },
    ],
    '经历分享': [
      { name: '情感钩子', time: '3秒' },
      { name: '故事铺垫', time: '15秒' },
      { name: '转折点', time: '15秒' },
      { name: '经验总结', time: '15秒' },
      { name: '共情互动', time: '10秒' },
    ],
    '轻松解决': [
      { name: '轻松开场', time: '3秒' },
      { name: '问题描述', time: '10秒' },
      { name: '解决方案', time: '35秒' },
      { name: '效果展示', time: '5秒' },
      { name: '轻松收尾', time: '5秒' },
    ],
    '速战速决': [
      { name: '速成钩子', time: '3秒' },
      { name: '核心技巧', time: '45秒' },
      { name: '总结回顾', time: '5秒' },
      { name: '行动号召', time: '5秒' },
    ],
    '场景共鸣': [
      { name: '场景钩子', time: '3秒' },
      { name: '共鸣深化', time: '20秒' },
      { name: '价值传递', time: '25秒' },
      { name: '情感升华', time: '5秒' },
      { name: '互动邀请', time: '5秒' },
    ],
    '情感触达': [
      { name: '情感开场', time: '3秒' },
      { name: '情感铺垫', time: '20秒' },
      { name: '核心内容', time: '25秒' },
      { name: '情感升华', time: '5秒' },
      { name: '温暖收尾', time: '5秒' },
    ],
    '利他分享': [
      { name: '价值预告', time: '3秒' },
      { name: '内容分享', time: '40秒' },
      { name: '要点总结', time: '10秒' },
      { name: '行动引导', time: '5秒' },
    ],
    '轻松娱乐': [
      { name: '趣味开场', time: '3秒' },
      { name: '内容铺垫', time: '25秒' },
      { name: '高潮点', time: '15秒' },
      { name: '轻松收尾', time: '10秒' },
      { name: '互动引导', time: '5秒' },
    ],
    '涨知识': [
      { name: '知识钩子', time: '3秒' },
      { name: '问题引入', time: '10秒' },
      { name: '知识讲解', time: '35秒' },
      { name: '总结要点', time: '5秒' },
      { name: '互动引导', time: '5秒' },
    ],
    '情感治愈': [
      { name: '温暖开场', time: '3秒' },
      { name: '情感铺垫', time: '25秒' },
      { name: '治愈内容', time: '20秒' },
      { name: '温暖收尾', time: '5秒' },
      { name: '共情互动', time: '5秒' },
    ],
    '神转折': [
      { name: '铺垫内容', time: '30秒' },
      { name: '转折点', time: '5秒' },
      { name: '反差内容', time: '15秒' },
      { name: '意外收尾', time: '5秒' },
      { name: '悬念互动', time: '3秒' },
    ],
  };
  return frameworks[style] || frameworks['干货教程'];
};

export default function CreativeGuidePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState('');
  const [isEditingFramework, setIsEditingFramework] = useState(false);
  const [editableFramework, setEditableFramework] = useState<FrameworkPart[]>([]);
  const [context, setContext] = useState<StepContext>({
    customer: null,
    topic: '',
    audience: '',
    contentType: '',
    style: '',
    value: '',
    framework: [],
  });
  
  // 历史记录 - 用于返回上一步
  const [history, setHistory] = useState<{
    step: number;
    context: StepContext;
    messages: Message[];
    inputValue: string;
  }[]>([]);
  
  // 生成历史记录
  const [generateHistory, setGenerateHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // 算力
  const [powerBalance, setPowerBalance] = useState<number | null>(null);
  
  // 段落编辑相关
  const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null);
  const [selectedParagraphs, setSelectedParagraphs] = useState<number[]>([]);
  const [editRequest, setEditRequest] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingParagraphs, setEditingParagraphs] = useState<string[]>([]);
  const [editScript, setEditScript] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState<number | null>(null);
  
  // 版本历史
  const [versionChain, setVersionChain] = useState<any[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 解析脚本为段落
  const parseScriptToParagraphs = (script: string): { id: string; label: string; content: string }[] => {
    // 按空行分割段落
    const paragraphs = script.split(/\n\n+/).filter(p => p.trim());
    
    // 段落标签映射
    const labels = ['开场钩子', '痛点引入', '核心内容', '干货植入', '案例分享', '总结升华', '行动引导', '结尾收尾'];
    
    return paragraphs.map((p, i) => ({
      id: `paragraph-${i}`,
      label: labels[i] || `段落${i + 1}`,
      content: p.trim(),
    }));
  };
  
  // 快捷修改选项
  const QUICK_EDIT_OPTIONS = [
    { id: 'more_fun', label: '更有趣', prompt: '让这段话更有趣、更轻松，加点幽默感' },
    { id: 'more_professional', label: '更专业', prompt: '让这段话更专业、更有说服力' },
    { id: 'shorter', label: '更精简', prompt: '精简这段话，去除冗余' },
    { id: 'add_example', label: '加案例', prompt: '在这段话中加入一个具体的真实案例' },
  ];
  
  // 加载算力余额
  const fetchPowerBalance = async () => {
    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      const res = await fetch('/api/member/computing-power', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPowerBalance(data.data.balance);
      }
    } catch (error) {
      console.error('获取算力余额失败:', error);
    }
  };
  
  // 获取历史记录（带版本链）
  const fetchGenerateHistory = async () => {
    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      const res = await fetch('/api/creative/records?limit=50&withVersions=true', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      if (data.success) {
        setGenerateHistory(data.data || []);
        
        // 如果当前有生成的脚本，尝试设置版本链
        if (generatedScript && data.data?.length > 0) {
          const latestRecord = data.data[0];
          if (latestRecord.versionChain) {
            setVersionChain(latestRecord.versionChain);
          }
          setCurrentRecordId(latestRecord.id);
        }
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
    }
  };
  
  // 加载历史记录详情
  const loadHistoryDetail = async (id: number) => {
    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      const res = await fetch(`/api/creative/records/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('获取历史详情失败:', error);
      return null;
    }
  };

  // 保存当前状态到历史记录
  const saveToHistory = () => {
    setHistory(prev => [...prev, {
      step: currentStep,
      context: { ...context },
      messages: [...messages],
      inputValue,
    }]);
  };

  // 返回上一步
  const goBack = () => {
    if (history.length === 0) return;
    
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentStep(lastState.step);
    setContext(lastState.context);
    setMessages(lastState.messages);
    setInputValue(lastState.inputValue);
    setGeneratedScript('');
    setIsEditingFramework(false);
  };

  // 加载客户档案
  const fetchCustomers = async () => {
    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      const res = await fetch('/api/customer/list', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      const list = data.data || data || [];
      setCustomers(list);
    } catch (error) {
      console.error('获取客户档案失败:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchPowerBalance();
    fetchGenerateHistory();
  }, []);

  // 加载草稿
  useEffect(() => {
    const savedDraft = localStorage.getItem('creative-guide-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.context && draft.currentStep > 0) {
          setContext(draft.context);
          setMessages(draft.messages);
          setCurrentStep(draft.currentStep);
          setInputValue(draft.inputValue || '');
        }
      } catch (e) {
        console.error('加载草稿失败:', e);
      }
    }
  }, []);

  // 保存草稿
  useEffect(() => {
    const draft = {
      context,
      messages,
      currentStep,
      inputValue,
    };
    localStorage.setItem('creative-guide-draft', JSON.stringify(draft));
  }, [context, messages, currentStep, inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: Date.now().toString() }]);
  };

  const typeMessage = async (content: string, options?: Message['options']) => {
    setIsTyping(true);
    const tempMessage: Message = { id: 'temp', role: 'assistant', content: '' };
    setMessages(prev => [...prev, tempMessage]);
    
    for (let i = 0; i < content.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
      setMessages(prev => 
        prev.map(msg => 
          msg.id === 'temp' ? { ...msg, content: content.substring(0, i + 1) } : msg
        )
      );
    }
    
    setMessages(prev => 
      prev.map(msg => 
        msg.id === 'temp' ? { ...msg, options, id: Date.now().toString() } : msg
      )
    );
    setIsTyping(false);
  };

  const handleCustomerSelect = (customer: Customer) => {
    setContext(prev => ({ ...prev, customer }));
    setCurrentStep(1);
    
    addMessage({
      role: 'assistant',
      content: `你好 ${customer.name}！我是你的创作搭档。\n\n${customer.ip_positioning ? `你的IP定位是：${customer.ip_positioning}` : '我们先通过几个问题，推导出适合你的口播脚本。'}\n\n告诉我，你想做什么主题的短视频？`,
    });
  };

  const handleTopicSubmit = async () => {
    if (!inputValue.trim()) return;
    
    const topic = inputValue.trim();
    saveToHistory(); // 保存当前状态
    setContext(prev => ({ ...prev, topic }));
    addMessage({ role: 'user', content: topic });
    setInputValue('');
    setCurrentStep(2);  // 跳到内容类型选择
    
    await typeMessage(
      `👍 "${topic}"是个好方向！\n\n你今天想讲什么类型的内容？`,
      contentTypeOptions
    );
  };

  // 新增：选择内容类型
  const handleContentTypeSelect = async (option: Option) => {
    saveToHistory(); // 保存当前状态
    setContext(prev => ({ ...prev, contentType: option.value }));
    addMessage({ role: 'user', content: option.label });
    setCurrentStep(3);  // 跳到人群选择
    
    await typeMessage(
      `📝 "${option.label}"——${option.description}\n\n你的内容最想帮助哪类人？`,
      AUDIENCE_OPTIONS
    );
  };

  const handleAudienceSelect = async (option: Option) => {
    saveToHistory(); // 保存当前状态
    setContext(prev => ({ ...prev, audience: option.value }));
    addMessage({ role: 'user', content: option.label });
    
    const styleOptions = getStyleOptions(option.value);
    await typeMessage(
      `💡 "${option.value}"——${option.description}\n\n你想用什么风格来吸引他们？`,
      styleOptions
    );
    setCurrentStep(4);  // 跳到风格选择
  };

  const handleStyleSelect = async (option: Option) => {
    saveToHistory(); // 保存当前状态
    setContext(prev => ({ ...prev, style: option.value }));
    addMessage({ role: 'user', content: option.label });
    
    await typeMessage(
      `🎯 "${option.value}"——${option.description}\n\n你希望观众看完后能带走什么？`,
      VALUE_OPTIONS
    );
    setCurrentStep(5);  // 跳到价值选择
  };

  const handleValueSelect = async (option: Option) => {
    saveToHistory(); // 保存当前状态
    const defaultFramework = getDefaultFramework(context.style);
    setContext(prev => ({ 
      ...prev, 
      value: option.value,
      framework: defaultFramework,
    }));
    setEditableFramework(defaultFramework);
    addMessage({ role: 'user', content: option.label });
    
    const frameworkList = defaultFramework.map((p, i) => `${i + 1}. ${p.name}（${p.time}）`).join('\n');
    
    await typeMessage(
      `✨ "${option.value}"——很好！\n\n📋 脚本框架（可调整）：\n${frameworkList}\n\n如需调整，点击"调整框架"按钮，确认后点击"生成脚本"。`
    );
    setCurrentStep(6);  // 跳到框架调整
  };

  // 开始编辑框架
  const startEditFramework = () => {
    setEditableFramework([...context.framework]);
    setIsEditingFramework(true);
  };

  // 保存框架
  const saveFramework = () => {
    setContext(prev => ({ ...prev, framework: editableFramework }));
    setIsEditingFramework(false);
    
    const frameworkList = editableFramework.map((p, i) => `${i + 1}. ${p.name}（${p.time}）`).join('\n');
    addMessage({
      role: 'assistant',
      content: `✅ 框架已更新：\n${frameworkList}\n\n点击下方按钮生成完整脚本~`,
    });
  };

  // 添加框架段落
  const addFrameworkPart = () => {
    setEditableFramework(prev => [...prev, { name: '新段落', time: '10秒' }]);
  };

  // 删除框架段落
  const removeFrameworkPart = (index: number) => {
    setEditableFramework(prev => prev.filter((_, i) => i !== index));
  };

  // 更新框架段落
  const updateFrameworkPart = (index: number, field: 'name' | 'time', value: string) => {
    setEditableFramework(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  // 生成完整脚本
  const generateScript = async () => {
    setIsGenerating(true);
    setGeneratedScript('');
    setCurrentStep(6);
    
    // 显示加载状态
    const loadingId = Date.now().toString();
    const loadingMessages = [
      '✨ 正在构思精彩开场...',
      '💡 结合你的「' + context.style + '」风格...',
      '📝 根据「' + context.contentType + '」结构组织内容...',
      '🎯 聚焦「' + context.audience + '」的需求...',
    ];
    let msgIndex = 0;
    
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant' as const,
      content: loadingMessages[0],
    }]);
    
    // 定时更新加载提示
    const loadingInterval = setInterval(() => {
      msgIndex++;
      if (msgIndex < loadingMessages.length) {
        setMessages(prev => prev.map(msg => 
          msg.id === loadingId 
            ? { ...msg, content: loadingMessages[msgIndex] }
            : msg
        ));
      }
    }, 2000);
    
    // 调用智能推导创作专用 API
    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      const res = await fetch('/api/creative/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: context.topic,
          contentType: context.contentType,
          style: context.style,
          audience: context.audience,
          value: context.value,
          framework: context.framework,
          ipPositioning: context.customer?.ip_positioning,
          customerName: context.customer?.name,
        }),
      });
      
      // 停止加载提示更新
      clearInterval(loadingInterval);
      
      const contentType = res.headers.get('content-type');
      
      if (res.ok && contentType?.includes('text/event-stream')) {
        // 处理 SSE 流式响应 - 直接更新到结果区域
        const reader = res.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');
        
        const decoder = new TextDecoder();
        let buffer = '';
        let aiContent = '';
        let isDone = false;
        
        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  aiContent += parsed.content;
                  // 直接更新生成的脚本内容
                  setGeneratedScript(aiContent);
                }
                if (parsed.done) {
                  isDone = true;
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
        
        // 如果 AI 没有生成内容，使用本地生成
        if (!aiContent.trim()) {
          const script = buildLocalScript();
          setGeneratedScript(script);
        }
        
        // 更新加载消息为完成状态
        setMessages(prev => prev.map(msg => 
          msg.id === loadingId 
            ? { ...msg, content: '✅ 脚本已生成' }
            : msg
        ));
      } else if (res.status === 401) {
        throw new Error('请先登录');
      } else {
        const data = await res.json();
        throw new Error(data.error || '生成失败');
      }
    } catch (error) {
      // 停止加载提示更新
      clearInterval(loadingInterval);
      console.error('生成脚本失败:', error);
      
      // 区分错误类型
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      let displayMessage = '';
      let useFallback = true;
      
      if (errorMessage.includes('未登录') || errorMessage.includes('401')) {
        displayMessage = '⚠️ 请先登录后再生成';
        useFallback = false;
      } else if (errorMessage.includes('算力') || errorMessage.includes('power')) {
        displayMessage = '⚠️ 算力不足，请充值后重试';
        useFallback = false;
      } else if (errorMessage.includes('频繁')) {
        displayMessage = '⚠️ 生成过于频繁，请稍后再试';
        useFallback = false;
      } else {
        displayMessage = '⚠️ AI生成遇到问题，使用备用方案';
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === loadingId 
          ? { ...msg, content: displayMessage }
          : msg
      ));
      
      // API 失败，使用本地生成（现在内容更丰富了）
      if (useFallback) {
        const script = buildLocalScriptFallback();
        setGeneratedScript(script);
      }
    }
    
    setIsGenerating(false);
  };

  // 映射风格到脚本类型
  const mapStyleToScriptType = (style: string): string => {
    const map: Record<string, string> = {
      '测评对比': 'knowledge',
      '真实体验': 'story',
      '轻松测评': 'story',
      '快速结论': 'knowledge',
      '干货教程': 'process',
      '经历分享': 'story',
      '轻松解决': 'process',
      '速战速决': 'knowledge',
      '场景共鸣': 'story',
      '情感触达': 'story',
      '知识科普': 'knowledge',
      '利他分享': 'knowledge',
      '轻松娱乐': 'story',
      '涨知识': 'knowledge',
      '情感治愈': 'story',
      '神转折': 'story',
    };
    return map[style] || 'process';
  };

  // 生成完整正文内容（根据主题生成真实文案）
  const buildBodyContent = (topic: string, style: string, value: string): { opening: string; body: string; ending: string } => {
    // 开场钩子库
    const openings: Record<string, string[]> = {
      '测评对比': [
        `${topic}的水有多深？我花3个月踩完所有坑，今天全告诉你`,
        `选${topic}，90%的人都踩过这3个坑，今天一次说清楚`,
        `${topic}商家不会告诉你的5个秘密，今天全部扒出来`,
      ],
      '干货教程': [
        `${topic}记住这3步，小白也能轻松搞定`,
        `做${topic}最怕什么？不是技术，是方向`,
        `${topic}的核心就一个字，看完你就懂了`,
      ],
      '真实体验': [
        `我做${topic}整整5年，踩过的坑比你想象的多得多`,
        `关于${topic}，有些话商家打死都不会告诉你`,
        `${topic}这件事，让我亏了至少3万块`,
      ],
      '知识科普': [
        `关于${topic}，90%的人都理解错了`,
        `${topic}的真相，很多人一辈子都不知道`,
        `你以为${topic}很简单？看完这个再说`,
      ],
      '轻松娱乐': [
        `做${topic}这件事，翻车合集来了`,
        `笑死，${topic}还能这么搞？`,
        `${topic}翻车现场，第3个太真实了`,
      ],
      '经历分享': [
        `我做${topic}的那些年，踩过的坑比走过的路还多`,
        `${topic}这条路，我走了整整8年`,
        `从${topic}小白到现在，我经历了什么`,
      ],
      '轻松解决': [
        `${topic}其实不难，换个思路就好`,
        `搞定${topic}，记住这3点就够了`,
        `${topic}问题多？看完这个轻松解决`,
      ],
      '速战速决': [
        `3分钟讲清楚${topic}，全是干货`,
        `${topic}的核心，1句话就说清楚`,
        `做${topic}，最快的方法在这里`,
      ],
      '场景共鸣': [
        `${topic}的时候，你是不是也这样？`,
        `说到${topic}，这不就是我吗`,
        `${topic}的痛苦，只有经历过的人才懂`,
      ],
      '情感触达': [
        `${topic}这些年，有些话想跟你说`,
        `关于${topic}，我有一些心里话`,
        `${topic}的意义，不只是结果`,
      ],
      '利他分享': [
        `整理了一份${topic}攻略，看完少走弯路`,
        `${topic}最全指南，建议收藏`,
        `关于${topic}，你需要的都在这里`,
      ],
      '涨知识': [
        `${topic}背后隐藏的秘密，今天一次说清楚`,
        `关于${topic}，你不知道的太多了`,
        `${topic}这个知识点，90%的人都错过了`,
      ],
      '情感治愈': [
        `${topic}的路上，你不是一个人`,
        `做${topic}这些年，我学会了这件事`,
        `${topic}的意义，比你想的更大`,
      ],
      '神转折': [
        `我做${topic}好几年，本来以为...结果`,
        `关于${topic}，所有人都觉得...但其实`,
        `你以为${topic}很难？直到我发现了...`,
      ],
    };

    // 正文内容库（真实可用的文案）
    const bodies: Record<string, string> = {
      '测评对比': `
各位好，今天把${topic}说透。

市面上产品那么多，区别到底在哪？

我对比了十几家，总结出几个关键点。

第一，看材质。不要只看外观，材质才是核心。

第二，看做工。细节决定品质，缝边、五金都要检查。

第三，看售后。出了问题能找到人，才是真保障。

记住这三点，谁都坑不了你。`,
      
      '干货教程': `
大家好，今天分享${topic}的核心方法。

其实没那么复杂，记住三个步骤就行。

第一步，先搞清楚需求。很多人做了一半才发现不对，就是需求没想清楚。

第二步，再找专业的人。别图便宜，找个有经验的能省很多麻烦。

第三步，最后做好验收。不懂就找人陪，减少后期问题。

做到这三点，你就已经超过80%的人了。`,
      
      '真实体验': `
各位好，说说我的真实经历。

之前做${topic}的时候，我也是一头雾水。

后来踩过坑、亏过钱、返过工，才慢慢摸索出一些经验。

第一，别贪便宜。价格低的有套路，最后算下来更贵。

第二，提前规划。把需求想清楚，改来改去最费钱。

第三，找对人。专业的事情交给专业的人做。

现在把这些经验分享给大家，希望能帮你们少走弯路。`,
      
      '知识科普': `
各位好，今天说个关于${topic}的重要知识。

很多人一直搞错了方向，今天我来纠正一下。

其实${topic}的核心是需求导向，不是产品导向。

先要搞清楚自己要什么，再去找对应的方案。

第一，明确预算。有多少钱办多少事。

第二，确定需求优先级。哪些是必须，哪些是加分。

第三，选择适合的方案。不是最贵的就是最好的。

总结一下：先想清楚需求，再去做选择。`,
      
      'story': `
各位好，说说我的经历。

之前做${topic}的时候，我也是一头雾水。

后来踩过坑、亏过钱、返过工，才慢慢摸索出一些经验。

现在分享给大家，希望能帮到你们。`,
      
      '经历分享': `
各位好，说说我的经历。

之前做${topic}的时候，我也是一头雾水。

后来踩过坑、亏过钱、返过工，才慢慢摸索出一些经验。

现在把这些经验分享给大家，希望能帮你们少走弯路。`,
      
      '轻松解决': `
大家好，${topic}其实没那么难。

很多人把它想复杂了，今天换个思路。

第一，别追求完美。先解决有没有，再解决好不好。

第二，分步去做。一口气吃不成胖子，分成小目标更容易。

第三，及时调整。发现问题不要拖，越早改越省事。

换个思路，你会发现简单很多。`,
      
      '速战速决': `
各位好，3分钟讲清楚${topic}的核心。

记住一句话：搞清楚需求再动手。

具体怎么做？三点。

第一，明确目标。不要模棱两可，越具体越好。

第二，拆解任务。把大目标分成小步骤。

第三，优先做重要的。不是所有事情都同样重要。

记住这三点就够了。`,
      
      '场景共鸣': `
说到${topic}，你是不是也遇到过这种情况？

做了很多功课，还是不知道该怎么选。

其实这是因为没抓住核心。

${topic}的关键，不是选什么，而是先想清楚自己要什么。

当你把需求想清楚了，选择就变得简单了。`,
      
      '情感触达': `
各位好，关于${topic}，我有些心里话想说。

做了这么多年，见过太多人踩坑。

其实${topic}不只是解决一个问题，更是一种生活态度。

希望你在这个过程中，也能找到自己的节奏。`,
      
      '利他分享': `
各位好，整理了一份${topic}攻略。

今天把这些经验分享出来，希望能帮到你们。

核心三点：搞清楚需求、找对方法、做好验收。

建议收藏起来，需要的时候翻出来看看。`,
      
      '轻松娱乐': `
各位好，今天说说${topic}的那些坑。

你们有没有遇到过这种情况？

我做的时候也是这样，踩过的坑比走过的路还多。

今天把这些经历分享出来，大家笑笑之余也要注意避坑。`,
      
      '涨知识': `
各位好，今天说个关于${topic}的冷知识。

很多人不知道的是，${topic}其实有技巧。

掌握了这些技巧，能少走很多弯路。

今天就把这些经验分享给大家。`,
      
      '情感治愈': `
各位好，关于${topic}这件事，我想说几句。

过程比结果更重要。

每个人的情况不同，不用和别人比较。

相信自己，慢慢来，会好的。`,
      
      '神转折': `
我做${topic}好几年，本来以为...

结果发现，完全不是想象的那样。

你们有没有遇到过这种情况？

表面看起来很简单，实际做了才发现...

所以别被表面迷惑，深入了解才知道真相。`,
    };

    // 结尾库
    const endings: Record<string, string> = {
      '测评对比': `觉得有用就收藏起来，让算法推给更多需要的人。有什么问题评论区见，有问必答。`,
      '干货教程': `今天的干货就到这里，收藏起来慢慢消化。有问题评论区聊，看到回复你。`,
      '真实体验': `觉得有帮助就点个赞，让算法推给更多需要的人。有疑问评论区见。`,
      '知识科普': `今天的知识点记住了吗？没记住也没关系，收藏起来下次看。`,
      '经历分享': `有收获的点个赞，让算法推给更多需要的人。你们的经历也可以评论区分享。`,
      '轻松解决': `搞定了就点个赞，有问题评论区见。`,
      '速战速决': `记住了就收藏，用的时候翻出来看。有补充的评论区见。`,
      'scene': `说中了的评论区扣1，让算法推给更多有共鸣的人。`,
      'emotion': `有同感的点个赞，我们都在路上。`,
      'knowledge': `学到了就收藏，让更多人知道。有问题评论区见。`,
      'share': `觉得有用就收藏，让更多人看到。有补充的评论区见。`,
      'fun': `笑了的评论区扣1，还有什么翻车经历也来分享。`,
      'twist': `猜到结局了吗？评论区说说你的想法。`,
      'default': `有收获的点个赞，有问题评论区见。收藏起来，需要的时候翻出来看。`,
    };

    const styleHooks = openings[style] || openings['干货教程'];
    const opening = styleHooks[Math.floor(Math.random() * styleHooks.length)];
    const body = bodies[style] || bodies['default'];
    const ending = endings[style] || endings['default'];

    return { opening, body, ending };
  };

  // 本地生成脚本（备用）- 根据是否有客户档案调整
  const buildLocalScriptFallback = (): string => {
    const { customer, topic, audience, style, value, framework } = context;
    
    // 是否有客户档案
    const hasCustomer = customer && customer.name && customer.name !== '未选择';
    const customerName = hasCustomer ? customer.name : '我';
    
    // 主题关键词提取
    const topicKeywords = topic.replace(/[指南|技巧|方法|攻略|教程]/g, '').trim();
    
    // 根据风格和人设生成对应内容
    const generateContent = (): string => {
      // 测评对比型
      if (style === '测评对比') {
        if (hasCustomer) {
          return `
各位好，干了这么多年${topicKeywords}，今天把最容易踩的坑说清楚，市面上常见的有3种做法，我帮你分析哪个最靠谱。

第一种，便宜方案。
很多人贪便宜选这个，但后期维护成本高。我见过太多人选了这个，结果用不到一年就出问题，换新的反而花更多钱。

第二种，主流方案。
我建议大部分人选这个。价格适中，质量够用，关键是售后有保障。干了这么多年，主流方案经过验证，最稳定。

第三种，高端方案。
有钱可以选，但对普通人来说，提升效果跟多花的钱不成正比。除非有特殊需求，没必要。

总结一下：选主流方案，性价比最高。记住，${topicKeywords}这事，货比三家不吃亏。`;
        } else {
          return `
各位好，今天把${topicKeywords}说清楚，市面上常见的有3种做法，我帮你分析哪个最划算。

第一种是便宜方案。
很多人贪便宜选这个，但后期维护成本高，用不了多久就出问题。比如材料成本是省了300块，但使用寿命短了一半，长期算下来反而亏了。

第二种是主流方案。
性价比最高，我建议大部分人选这个。价格适中，质量够用，售后也有保障。关键是找对渠道，别被中间商赚差价。

第三种是高端方案。
有钱任性可以选，但没必要。对普通人来说，提升的效果跟多花的钱不成正比。

总结一下：选主流方案，性价比最高。记住货比三家不吃亏。`;
        }
      }
      
      // 干货教程型
      if (style === '干货教程') {
        if (hasCustomer) {
          return `
各位好，做了这么多年${topicKeywords}，今天分享几个我总结出来的经验，学会了你也能做好。

第一，先搞清楚自己的需求。
很多人做不好就是因为没想清楚自己要什么。做之前问自己3个问题：预算多少？想要什么效果？能接受什么程度？这3个问题答清楚，再开始动手。

第二，找对方法。
方法不对，努力白费。我这么多年总结下来，有一个特别实用的技巧，等会告诉你们。

第三，坚持做。
做好了不难，难的是一直做好。我能坚持这么多年，就是因为掌握了对的方法。

记住这3点，你也能做好${topicKeywords}。`;
        } else {
          return `
各位好，今天分享${topicKeywords}的核心步骤，学会了你也能做到。

第一步，先搞清楚自己的需求。
很多人做不好就是因为没想清楚自己要什么。做之前问自己3个问题：预算多少？想要什么效果？能用多久？

第二步，找专业的人做专业的事。
不要什么都自己来，时间成本也是成本。找一个靠谱的人或机构，能省一半的精力。

第三步，做好验收和后期维护。
做完不等于结束，验收不过关要及时返工。

记住这3步，你就已经超过80%的人了。`;
        }
      }
      
      // 真实体验型
      if (style === '真实体验') {
        if (hasCustomer) {
          return `
各位好，说说我做${topicKeywords}的经历。

一开始我也踩过坑。
那时候刚入行，什么都不懂，觉得这事很简单。结果做了一半发现不对，推倒重来，白白浪费了半个月和几千块钱。那次教训让我印象特别深。

后来我学聪明了。
先去找有经验的人问问，大概知道是什么情况。再去现场看看，心里有数。最后才开始动手，效率高多了。

最让我后悔的是当初没听人劝。
如果一开始就找人问问，能省下不少钱和精力。所以你们别走我的老路，多问多学再动手。

这些年下来，我发现${topicKeywords}这事，关键在于细节。细节做好了，效果自然就好。

希望我的教训能帮你们少踩坑。`;
        } else {
          return `
各位好，说说我做${topicKeywords}的经历。

一开始我也踩过坑。
当时觉得很简单，自己研究了一下就开始做。结果做了一半发现不对，推倒重来，白白浪费了半个月和几千块钱。

后来我学聪明了。
先去找有经验的人问问，大概知道是什么情况。再去网上看看教程，心里有数。最后才开始动手，效率高多了。

最让我后悔的是当初没听人劝。
如果一开始就找人问问，能省下不少钱和精力。所以你们别走我的老路，多问多学再动手。

希望我的教训能帮你们少踩坑。`;
        }
      }
      
      // 知识科普型
      if (style === '知识科普') {
        if (hasCustomer) {
          return `
各位好，干了这么多年${topicKeywords}，今天说个很多人不知道的秘密。

第一个真相：成本是透明的。
很多人觉得水深，其实不然。贵的不一定好，但太便宜一定有猫腻。正常的市场价是多少，干这么多年我心里有数。

第二个真相：细节决定成败。
很多人忽略了小问题，结果小问题变成大麻烦。比如验收环节，看似可有可无，其实特别重要。我见过太多人因为验收没做好，后期返工花了大价钱。

第三个真相：售后比售前更重要。
卖的时候说得天花乱坠，出了问题找不到人，这才是最坑的。找靠谱的，比找便宜的更重要。

记住了，干了这么多年，这些都是我的经验总结。`;
        } else {
          return `
各位好，今天说个很多人不知道的秘密。

关于${topicKeywords}，90%的人都存在误解。
最大的误区是什么？以为越贵越好，或者以为随便弄弄就行。其实都不是，关键看你懂不懂行。

第一个真相：成本是透明的。
贵的不一定好，但太便宜一定有猫腻。正常的市场价是多少，提前做做功课就知道。

第二个真相：细节决定成败。
很多人忽略了小问题，结果小问题变成大麻烦。比如验收环节，看似可有可无，其实特别重要。

第三个真相：售后比售前更重要。
卖的时候说得天花乱坠，出了问题找不到人，这才是最坑的。

记住了，${topicKeywords}这事，多做功课少吃亏。`;
        }
      }
      
      // 经历分享型
      if (style === '经历分享') {
        return `
各位好，说说我和${topicKeywords}的故事。

那是我第一次接触这事。
当时什么都不懂，就想着试试看。结果可想而知，踩了不少坑，交了不少学费。

最难忘的是那次教训。
那天我折腾了一整天，什么都没做成，还把之前的成果毁了。那一刻真的特别沮丧。

后来我换了思路。
不再闷头自己搞，而是先去看看别人怎么做的。加入一些圈子，问问有经验的人，慢慢就摸出门道了。

现在回头看，那些踩过的坑都是财富。
让我对${topicKeywords}有了更深的理解，也让我知道什么才是真正重要的。

希望我的经历能给你一些启发。`;
      }
      
      // 轻松解决型
      if (style === '轻松解决') {
        return `
各位好，${topicKeywords}其实没那么难。

很多人把它想复杂了，今天换个思路。

第一，别追求一步到位。
很多人总想着一次性做到完美，结果迟迟不敢开始。其实先做起来，边做边调整，比完美计划更有用。

第二，把它拆成小目标。
大目标看着吓人，小目标就简单多了。比如"搞定${topicKeywords}"太虚，换成"今天了解清楚情况"就容易多了。

第三，遇到问题很正常。
遇到问题别慌，这是正常的。解决方法永远比问题多，不会就问，不懂就学。

换个思路，你会发现简单很多。`;
      }
      
      // 快速结论型
      if (style === '快速结论') {
        return `
各位好，3分钟讲清楚${topicKeywords}。

核心就一句话：搞清楚需求再动手。

展开说3点。

第一，明确目标。你想要什么效果？预算是多少？这些想清楚，再去找方案。

第二，选对渠道。别被中间商坑，找靠谱的源头，或者找有口碑的机构。

第三，做好验收。别稀里糊涂就收工，仔细检查，有问题及时提。

记住了：目标清晰、渠道靠谱、验收仔细。做到这3点，${topicKeywords}就不难。`;
      }
      
      // 默认通用型
      return `
各位好，今天聊聊${topic}这个话题。

说实话，${topicKeywords}这事，说难不难，说简单也不简单。

关键在于3点：
第一，搞清楚自己要什么。别盲目跟风，根据自己的情况来。
第二，找对方法。方法不对，努力白费。花时间研究一下值不值。
第三，坚持做下去。做好一次容易，持续做好才难。

希望今天说的对你们有帮助。`;
    };
    
    const content = generateContent();
    
    const ending = style === '测评对比' 
      ? `觉得有用就收藏起来，需要的时候翻出来看。有什么问题评论区问我。`
      : style === '干货教程'
      ? `今天的分享就到这里，觉得有用点个赞，让算法推给更多需要的人。`
      : style === '真实体验' || style === '经历分享'
      ? `有类似经历的评论区说说，你们踩过什么坑？`
      : `觉得有帮助的点个赞，有问题评论区见。`;
    
    return `${content}

${ending}`;
  };

  // 保留旧函数但标记为deprecated
  const buildLocalScript = () => {
    return buildLocalScriptFallback();
  };

  const handleRestart = () => {
    setMessages([]);
    setInputValue('');
    setCurrentStep(0);
    setContext({ customer: null, topic: '', audience: '', contentType: '', style: '', value: '', framework: [] });
    setGeneratedScript('');
    setIsEditingFramework(false);
    setHistory([]); // 清空历史记录
    localStorage.removeItem('creative-guide-draft'); // 清除草稿
  };

  // 确认使用 - 保存到素材库
  const handleConfirmUse = async () => {
    if (!generatedScript) return;

    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      
      // 构建保存数据
      const saveData: any = {
        topic: context.topic,
        title: `${context.topic} - ${context.style}风格`,
        scriptType: context.style,
        shootingMethod: 'talking_head',
        status: 'draft',
        sourceType: 'script', // 来源类型：脚本生成
        materialType: 'script',
        content: generatedScript,
      };

      // 如果有选择客户档案，关联到客户档案
      if (context.customer) {
        saveData.customerId = context.customer.id;
        saveData.customerName = context.customer.name;
      }

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(saveData),
      });

      const data = await res.json();
      
      if (data.success) {
        // 保存记录ID用于后续修改
        setCurrentRecordId(data.data?.id || null);
        
        // 显示成功提示
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '✅ 已保存到素材库！\n\n' + 
            (context.customer 
              ? `该脚本已关联到「${context.customer.name}」客户档案。` 
              : '该脚本已保存到您的素材库中。'),
        }]);
        
        // 清空生成的脚本，允许重新开始
        setGeneratedScript('');
        
        // 滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (error) {
      console.error('保存素材失败:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ 保存失败：' + (error instanceof Error ? error.message : '请重试'),
      }]);
    }
  };

  // 开始编辑段落 - 悬停时点击编辑按钮
  const startEditParagraph = (paragraphIndex: number) => {
    const paragraphs = parseScriptToParagraphs(generatedScript);
    const paragraph = paragraphs[paragraphIndex];
    if (paragraph) {
      setSelectedParagraphs([paragraphIndex]);
      setEditRequest('');
      setIsEditing(true);
    }
  };

  // 提交段落修改
  const submitParagraphEdit = async () => {
    if (selectedParagraphs.length === 0 || !editRequest.trim()) return;
    
    setIsEditing(true);
    setIsGenerating(true);
    
    const paragraphs = parseScriptToParagraphs(generatedScript);
    const paragraphLabels = selectedParagraphs.map(i => paragraphs[i]?.label).filter(Boolean);
    
    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      const res = await fetch('/api/creative/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recordId: currentRecordId,
          originalScript: generatedScript,  // 传入当前脚本内容
          paragraphs: paragraphLabels,
          request: editRequest,
          context: {
            topic: context.topic,
            style: context.style,
            audience: context.audience,
            customerName: context.customer?.name,
            ipPositioning: context.customer?.ip_positioning,
          },
        }),
      });
      
      if (res.ok) {
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        let newContent = '';
        let isDone = false;
        
        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                newContent += data.content;
                setEditScript(newContent);
              }
              if (data.done) {
                isDone = true;
              }
              if (data.error) {
                throw new Error(data.error);
              }
            }
          }
        }
        
        // 更新脚本
        if (newContent) {
          setGeneratedScript(newContent);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ 已修改「${paragraphLabels.join('、')}」：${editRequest}`,
          }]);
        }
        
        // 刷新算力和历史
        fetchPowerBalance();
      } else {
        const data = await res.json();
        throw new Error(data.error || '修改失败');
      }
    } catch (error) {
      console.error('段落修改失败:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ 修改失败：' + (error instanceof Error ? error.message : '请重试'),
      }]);
    } finally {
      setIsEditing(false);
      setIsGenerating(false);
      setSelectedParagraphs([]);
      setEditRequest('');
      setEditScript('');
    }
  };

  // 一键润色
  const handlePolish = async (polishType: string) => {
    setIsGenerating(true);
    
    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      const res = await fetch('/api/creative/polish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recordId: currentRecordId,
          originalScript: generatedScript,  // 传入当前脚本内容
          polishType,
          context: {
            topic: context.topic,
            style: context.style,
            audience: context.audience,
            customerName: context.customer?.name,
            ipPositioning: context.customer?.ip_positioning,
          },
        }),
      });
      
      if (res.ok) {
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('无法读取响应');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        let newContent = '';
        let isDone = false;
        
        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                newContent += data.content;
                setEditScript(newContent);
              }
              if (data.done) {
                isDone = true;
              }
              if (data.error) {
                throw new Error(data.error);
              }
            }
          }
        }
        
        // 更新脚本
        if (newContent) {
          setGeneratedScript(newContent);
          const polishNames: Record<string, string> = {
            'more_fun': '更有趣',
            'more_professional': '更专业',
            'shorter': '更精简',
            'add_examples': '加案例',
          };
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ 已优化为「${polishNames[polishType] || '优化'}」风格`,
          }]);
        }
        
        // 刷新算力和历史
        fetchPowerBalance();
      } else {
        const data = await res.json();
        throw new Error(data.error || '润色失败');
      }
    } catch (error) {
      console.error('一键润色失败:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ 润色失败：' + (error instanceof Error ? error.message : '请重试'),
      }]);
    } finally {
      setIsGenerating(false);
      setEditScript('');
    }
  };

  // 获取指定主题的版本历史
  const fetchVersionHistory = async (topic: string) => {
    try {
      const token = getToken() || localStorage.getItem('sessionToken');
      const res = await fetch(`/api/creative/records?limit=100&withVersions=true&topic=${encodeURIComponent(topic)}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        // 使用第一条记录的版本链
        setVersionChain(data.data[0].versionChain || []);
      } else {
        setVersionChain([]);
      }
    } catch (error) {
      console.error('获取版本历史失败:', error);
      setVersionChain([]);
    }
  };

  // 撤销到指定版本
  const restoreToVersion = async (versionRecord: any) => {
    if (versionRecord.script_content) {
      setGeneratedScript(versionRecord.script_content);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `📌 已恢复到版本${versionRecord.version}（${versionRecord.action === 'generate' ? '初始生成' : '修改' + (versionRecord.edit_request || '')}）`,
      }]);
      setShowVersionHistory(false);
    }
  };

  const renderOptions = (options: Option[]) => (
    <div className="space-y-3 mt-3">
      {options.map(option => (
        <div key={option.id}>
          <Button
            variant="outline"
            className={cn(
              "w-full flex items-start gap-3 px-4 py-3 h-auto text-left",
              "border-2 hover:border-primary hover:bg-primary/5 transition-all"
            )}
            onClick={() => {
              if (currentStep === 2) handleContentTypeSelect(option);
              else if (currentStep === 3) handleAudienceSelect(option);
              else if (currentStep === 4) handleStyleSelect(option);
              else if (currentStep === 5) handleValueSelect(option);
            }}
          >
            {option.icon}
            <div className="flex-1 min-w-0">
              <div className="font-medium">{option.label}</div>
              {option.description && (
                <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
              )}
            </div>
          </Button>
          {/* 示例展示 */}
          {option.example && (
            <div className="mt-1 ml-9 px-3 py-2 bg-muted/50 rounded-lg border-l-2 border-primary/30">
              <div className="text-xs text-muted-foreground mb-1">示例开头：</div>
              <div className="text-xs text-foreground italic">&quot;{option.example.slice(0, 60)}...&quot;</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderFrameworkEditor = () => (
    <Card className="mt-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            调整脚本框架
          </h4>
          <Button size="sm" variant="ghost" onClick={addFrameworkPart}>
            + 添加段落
          </Button>
        </div>
        
        <div className="space-y-2">
          {editableFramework.map((part, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
              <Input
                value={part.name}
                onChange={(e) => updateFrameworkPart(index, 'name', e.target.value)}
                placeholder="段落名称"
                className="flex-1"
              />
              <Input
                value={part.time}
                onChange={(e) => updateFrameworkPart(index, 'time', e.target.value)}
                placeholder="时长"
                className="w-24"
              />
              <Button size="icon" variant="ghost" onClick={() => removeFrameworkPart(index)}>
                ×
              </Button>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={saveFramework}>
            <Save className="h-4 w-4 mr-1" />
            确认框架
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsEditingFramework(false)}>
            取消
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderMessage = (msg: Message) => {
    if (msg.role === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 max-w-[85%]">
          <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.options && msg.options.length > 0 && renderOptions(msg.options)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {/* 左侧：返回按钮 */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = '/'}
            className="p-2"
            title="返回首页"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* 中间：Logo + 标题 + 进度 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm">智能推导创作</h1>
              <p className="text-xs text-muted-foreground">
                {currentStep > 0 ? `步骤 ${currentStep}/${TOTAL_STEPS}` : '选择客户开始'}
              </p>
            </div>
          </div>

          {/* 右侧：功能按钮 */}
          <div className="flex items-center gap-2">
            {/* 算力余额 - 直接显示说明 */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] text-amber-700 font-medium">算力 {powerBalance}</span>
            </div>
            
            {/* 返回上一步 */}
            {currentStep > 0 && history.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={goBack} 
                className="text-xs px-2 py-1 h-7 border-primary/50 text-primary"
                title="返回上一步"
              >
                <ChevronLeft className="h-3 w-3 mr-0.5" />
                上一步
              </Button>
            )}
            
            {/* 历史记录 */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHistory(true)}
              className="p-2"
              title="历史记录"
            >
              <History className="h-4 w-4" />
            </Button>
            
            {/* 重新开始 */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRestart}
              className="p-2"
              title="重新开始"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      {currentStep > 0 && (
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      )}

      {/* 状态摘要条 - 显示当前选择 */}
      {currentStep >= 2 && !generatedScript && (
        <div className="bg-muted/30 border-b px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs overflow-x-auto flex-1 min-w-0">
              <span className="text-muted-foreground shrink-0">已选：</span>
              {Object.entries(STEP_LABELS).map(([step, { key, label }]) => {
                const value = context[key];
                if (!value) return null;
                return (
                  <span
                    key={step}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-background border text-muted-foreground shrink-0"
                  >
                    <span>{label}：</span>
                    <span className="text-foreground font-medium">{value}</span>
                  </span>
                );
              })}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              如需修改，点击上方「上一步」
            </span>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          
          {/* 客户选择 */}
          {currentStep === 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">选择创作身份</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  选择客户档案，系统将基于其IP定位生成更贴合的内容。
                </p>
                
                {loadingCustomers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">暂无客户档案</p>
                    <Button variant="outline" onClick={() => window.location.href = '/customer'}>
                      <Plus className="h-4 w-4 mr-2" />
                      创建客户档案
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {customers.map(customer => (
                      <button
                        key={customer.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all",
                          "hover:border-primary hover:bg-primary/5"
                        )}
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">
                            {customer.name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{customer.name}</h3>
                          {customer.ip_positioning ? (
                            <p className="text-sm text-muted-foreground truncate">{customer.ip_positioning}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground/60 italic">暂无IP定位</p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 对话消息 */}
          {messages.map(msg => renderMessage(msg))}
          
          {/* 框架编辑器 */}
          {isEditingFramework && renderFrameworkEditor()}
          
          {/* 生成的脚本 */}
          {(generatedScript || editScript) && (
            <Card className="bg-card border-primary/20 mt-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">专属口播脚本</span>
                  {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
                
                {/* 段落展示 */}
                <div className="space-y-2">
                  {parseScriptToParagraphs(editScript || generatedScript).map((para, index) => (
                    <div 
                      key={para.id}
                      className={cn(
                        "group relative rounded-lg p-3 transition-all",
                        "hover:bg-muted/50 cursor-pointer",
                        hoveredParagraph === index && "bg-muted/50 ring-2 ring-primary/30"
                      )}
                      onMouseEnter={() => setHoveredParagraph(index)}
                      onMouseLeave={() => setHoveredParagraph(null)}
                      onClick={() => !isGenerating && startEditParagraph(index)}
                    >
                      {/* 段落编号和标签 */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">{para.label}</span>
                      </div>
                      
                      {/* 段落内容 */}
                      <p className="text-sm pl-8">{para.content}</p>
                      
                      {/* 悬停编辑按钮 */}
                      {hoveredParagraph === index && !isGenerating && (
                        <div className="absolute right-2 top-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditParagraph(index);
                            }}
                            className="h-8 px-2 text-xs"
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            修改
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* 编辑输入区域 */}
                {isEditing && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        修改「{parseScriptToParagraphs(generatedScript)[selectedParagraphs[0]]?.label}」
                      </span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedParagraphs([]);
                          setEditRequest('');
                        }}
                      >
                        取消
                      </Button>
                    </div>
                    
                    {/* 快捷选项 */}
                    <div className="flex flex-wrap gap-2">
                      {QUICK_EDIT_OPTIONS.map(opt => (
                        <Button
                          key={opt.id}
                          size="sm"
                          variant="outline"
                          onClick={() => setEditRequest(opt.prompt)}
                          className={editRequest === opt.prompt ? "bg-primary/10 border-primary" : ""}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                    
                    {/* 输入框 */}
                    <div className="flex gap-2">
                      <Input
                        value={editRequest}
                        onChange={(e) => setEditRequest(e.target.value)}
                        placeholder="描述你的修改要求，如：加一个真实案例、更口语化..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitParagraphEdit();
                          }
                        }}
                      />
                      <Button onClick={submitParagraphEdit} disabled={!editRequest.trim() || isGenerating}>
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* 快捷润色按钮 */}
                {!isEditing && !isGenerating && (
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
                      <History className="h-4 w-4 mr-1" />
                      版本历史
                    </Button>
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" onClick={() => handlePolish('more_fun')}>
                      更有趣
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePolish('more_professional')}>
                      更专业
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePolish('shorter')}>
                      更精简
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePolish('add_examples')}>
                      加案例
                    </Button>
                  </div>
                )}
                
                {/* 底部按钮 */}
                {!isEditing && (
                  <div className="flex gap-3 mt-4">
                    <Button onClick={generateScript} variant="outline" disabled={isGenerating}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重新生成
                    </Button>
                    <Button onClick={handleConfirmUse} disabled={isGenerating}>
                      <Check className="h-4 w-4 mr-2" />
                      确认使用
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入/操作区域 */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {currentStep === 1 ? (
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="输入短视频主题，如：装修避坑指南、职场沟通技巧..."
                className="min-h-[56px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTopicSubmit();
                  }
                }}
              />
              <Button size="icon" onClick={handleTopicSubmit} disabled={!inputValue.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : currentStep === 6 ? (
            <div className="space-y-3">
              {!isEditingFramework && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={startEditFramework} className="flex-1">
                    <Edit3 className="h-4 w-4 mr-2" />
                    调整框架
                  </Button>
                  <Button onClick={generateScript} className="flex-1" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        生成脚本
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : currentStep === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              👆 请选择客户档案开始
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              {isTyping ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI思考中...
                </span>
              ) : (
                <span>👆 请从上方选择</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 历史记录弹窗 */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>创作历史记录</DialogTitle>
            <DialogDescription>
              显示7天内的创作记录，点击可查看详情并恢复
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {generateHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">暂无历史记录</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {generateHistory.map((record: any) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={async () => {
                      const detail = await loadHistoryDetail(record.id);
                      if (detail) {
                        // 恢复内容
                        if (detail.context) {
                          setContext(detail.context);
                        }
                        if (detail.theme) {
                          setInputValue(detail.theme);
                          setCurrentStep(2);
                          setMessages([{
                            id: '1',
                            role: 'assistant',
                            content: `好的！您选择的主题是「${detail.theme}」。\n\n接下来，请选择目标受众群体：`,
                          }]);
                        }
                        if (detail.script_content) {
                          setGeneratedScript(detail.script_content);
                        }
                        setShowHistory(false);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{record.theme || '未命名主题'}</span>
                          {record.customer_name && (
                            <Badge variant="secondary" className="text-xs">
                              {record.customer_name}
                            </Badge>
                          )}
                        </div>
                        {record.script_content && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {record.script_content.substring(0, 100)}...
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-2">
                          {new Date(record.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 版本历史弹窗 */}
      <Dialog open={showVersionHistory} onOpenChange={(open) => {
        setShowVersionHistory(open);
        if (open && context.topic) {
          // 打开时获取当前主题的版本历史
          fetchVersionHistory(context.topic);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>版本历史</DialogTitle>
            <DialogDescription>
              查看并恢复到之前的版本
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {versionChain.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">暂无版本记录</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                {versionChain.map((version: any, index: number) => (
                  <div
                    key={version.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-colors",
                      index === 0 ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    )}
                    onClick={() => restoreToVersion(version)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        v{version.version || index + 1}
                      </Badge>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted">
                        {version.action === 'generate' ? '初始生成' : 
                         version.action === 'edit' ? '段落修改' : '一键润色'}
                      </span>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">当前版本</Badge>
                      )}
                    </div>
                    {version.edit_request && (
                      <p className="text-sm text-muted-foreground mb-2">
                        修改要求：{version.edit_request}
                      </p>
                    )}
                    {version.script_content && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {version.script_content.substring(0, 80)}...
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(version.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
