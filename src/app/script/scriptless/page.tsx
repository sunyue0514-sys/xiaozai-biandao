'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Video,
  Loader2,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Target,
  Clapperboard,
  Camera,
  Copy,
  Check,
  User,
  Quote,
  Mic,
  Pencil,
  CheckCircle,
  XCircle,
  Lightbulb,
  Store,
  Scissors,
  Zap,
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// 类型定义
interface Customer {
  id: number;
  name: string;
  ipPositioning: string | null;
}

interface ScriptlessResult {
  positioning: string;
  opening: string;
  scriptStructure?: string;
  qaSession: Array<{ question: string; answerDirection: string }>;
  visualSuggestions: string[];
  endingSpeech: string;
  goldenQuote: string;
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  customerId?: number;
  result?: ScriptlessResult | null;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

// 示例提示
const EXAMPLE_PROMPTS = [
  {
    icon: Store,
    title: '贴膜店创业拍摄',
    prompt:
      '我现在在小涛店里拍摄，拍摄主题是花30万在兴义开一家贴膜店，帮我设计访谈问题清单',
  },
  {
    icon: Scissors,
    title: '理发店推广',
    prompt:
      '我在一家理发店，店长刚学会了一款新的男士油头发型，帮我想一个开头和访谈问题，吸引周边的男士来体验',
  },
  {
    icon: Video,
    title: '护肤中心拍摄',
    prompt:
      '我现在在锦程护肤中心拍摄，新出来一款护理叫做玫瑰焕肤护理，帮我设计访谈问题清单，出一条进店理由类的视频',
  },
];

// 结果区块组件（简化版，不折叠）
function ResultItem({
  title,
  icon: Icon,
  children,
  highlight = false,
}: {
  title: string;
  icon: typeof Target;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn('w-3.5 h-3.5', highlight ? 'text-amber-500' : 'text-primary')} />
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div className={cn(
        'text-sm leading-relaxed pl-5',
        highlight && 'text-amber-600 dark:text-amber-400 font-medium'
      )}>
        {children}
      </div>
    </div>
  );
}

// 模块定义
const MODULES = [
  { name: '基本盘', icon: Store, color: 'blue', description: '了解业务核心、投入、定位' },
  { name: '人设背景', icon: User, color: 'purple', description: '挖掘创业故事、个人经历' },
  { name: '差异化', icon: Target, color: 'green', description: '对比竞品、突出优势' },
  { name: '人群需求', icon: Lightbulb, color: 'orange', description: '目标客户痛点' },
  { name: '素材背书', icon: Video, color: 'pink', description: '案例、数据、可信度' },
] as const;

// AI消息内容组件
function AIContent({
  content,
  result: propResult,
}: {
  content: string;
  result?: ScriptlessResult | null;
}) {
  const [copied, setCopied] = useState(false);
  const [showAnswerDirections, setShowAnswerDirections] = useState(true);

  // 尝试从 content 中解析 result（如果 propResult 无效）
  const result = useMemo(() => {
    // 如果 propResult 有效且有内容，直接使用
    if (propResult && (propResult.positioning || propResult.qaSession?.length > 0 || propResult.goldenQuote)) {
      return propResult;
    }
    
    // 否则尝试从 content 中解析 JSON
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // 兼容旧的 answer 字段和新的 answerDirection 字段
          if (parsed.qaSession) {
            parsed.qaSession = parsed.qaSession.map((qa: any) => ({
              question: qa.question,
              answerDirection: qa.answerDirection || qa.answer || '',
            }));
          }
          if (parsed && (parsed.positioning || parsed.qaSession?.length > 0 || parsed.goldenQuote)) {
            console.log('前端成功解析JSON');
            return parsed as ScriptlessResult;
          }
        }
      } catch (e) {
        console.warn('前端JSON解析失败:', e);
      }
    }
    
    return null;
  }, [propResult, content]);

  const handleCopy = async () => {
    if (!result) return;
    
    // 组织问题
    const questions = result.qaSession.map((qa, i) => {
      const questionModule = MODULES[i];
      return `【${questionModule?.name || '模块'}】Q${i + 1}: ${qa.question}`;
    }).join('\n\n');
    
    // 组织答案方向
    const answerDirections = result.qaSession.map((qa, i) => {
      return `Q${i + 1}: ${qa.answerDirection}`;
    }).join('\n\n');
    
    const text = `
【核心宣传语】
${result.goldenQuote}

【视频开头】
${result.opening}

【视频定位】
${result.positioning}

═══════════════════════════════
【访谈问题清单】（共${result.qaSession.length}题）
═══════════════════════════════

${questions}

═══════════════════════════════
【回答方向提示】
═══════════════════════════════

${answerDirections}

═══════════════════════════════

【拍摄建议】
${result.visualSuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

【结尾口播】
${result.endingSpeech}
    `.trim();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  // 如果没有结构化结果，直接显示文本
  if (!result || !result.positioning) {
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 金句落点 - 最重要 */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <Quote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 leading-relaxed">
            {result.goldenQuote}
          </p>
        </div>
      </div>

      {/* 视频开头 */}
      <div className="pl-4 border-l-2 border-primary/30">
        <ResultItem title="视频开头" icon={Clapperboard}>
          {result.opening}
        </ResultItem>
      </div>

      {/* 视频定位 */}
      <ResultItem title="视频定位" icon={Target}>
        {result.positioning}
      </ResultItem>

      {/* 访谈问题清单 - 问题和答案方向分开 */}
      {result.qaSession && result.qaSession.length > 0 && (
        <div className="space-y-4">
          {/* 问题区块 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">访谈问题清单</span>
              <Badge variant="secondary" className="text-xs">{result.qaSession.length}题</Badge>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              {result.qaSession.map((qa, index) => {
                const questionModule = MODULES[index];
                const IconComponent = questionModule?.icon || MessageSquare;
                const colorClass = {
                  blue: 'text-blue-500 bg-blue-500',
                  purple: 'text-purple-500 bg-purple-500',
                  green: 'text-green-500 bg-green-500',
                  orange: 'text-orange-500 bg-orange-500',
                  pink: 'text-pink-500 bg-pink-500',
                }[questionModule?.color || 'blue'];
                
                return (
                  <div key={index} className="flex items-start gap-3 py-2 border-b last:border-b-0">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${colorClass} text-white text-xs font-bold shrink-0`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <IconComponent className={`w-3.5 h-3.5 ${colorClass.split(' ')[0]}`} />
                        <span className="text-xs text-muted-foreground">{questionModule?.name}</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{qa.question}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 答案方向区块 - 可折叠 */}
          {result.qaSession.some(qa => qa.answerDirection) && (
            <div className="space-y-2">
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAnswerDirections(!showAnswerDirections)}
              >
                <Target className="w-4 h-4" />
                <span>回答方向提示</span>
                <Badge variant="outline" className="text-xs">
                  {showAnswerDirections ? '点击收起' : '点击展开'}
                </Badge>
              </button>
              
              {showAnswerDirections && (
                <div className="bg-blue-50/30 dark:bg-blue-950/10 rounded-lg p-3 space-y-3 border border-blue-100/50 dark:border-blue-900/50">
                  {result.qaSession.map((qa, index) => (
                    qa.answerDirection && (
                      <div key={index} className="flex gap-3 text-sm">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium shrink-0">
                          Q{index + 1}
                        </span>
                        <p className="text-muted-foreground leading-relaxed">{qa.answerDirection}</p>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 画面建议 */}
      {result.visualSuggestions && result.visualSuggestions.length > 0 && (
        <ResultItem title="拍摄建议" icon={Camera}>
          <ul className="space-y-1">
            {result.visualSuggestions.map((s, i) => (
              <li key={i}>{i + 1}. {s}</li>
            ))}
          </ul>
        </ResultItem>
      )}

      {/* 结尾口播 */}
      {result.endingSpeech && (
        <ResultItem title="结尾口播" icon={Mic}>
          {result.endingSpeech}
        </ResultItem>
      )}

      {/* 复制按钮 */}
      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="w-3 h-3 mr-1" />
          ) : (
            <Copy className="w-3 h-3 mr-1" />
          )}
          {copied ? '已复制' : '复制全部内容'}
        </Button>
      </div>
    </div>
  );
}

export default function ScriptlessShootingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // 状态
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [editingTitle, setEditingTitle] = useState<number | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载客户列表
  useEffect(() => {
    // 等待认证完成
    if (isAuthLoading) return;
    
    // 如果未认证，跳转登录页
    if (!isAuthenticated) {
      toast.error('请先登录');
      router.push('/login');
      return;
    }
    
    loadCustomers();
    loadConversations();
    loadCredits();
  }, [isAuthLoading, isAuthenticated]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadCredits = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/scriptless/credits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setCreditsBalance(data.data.balance);
      }
    } catch (error) {
      console.error('Load credits error:', error);
    }
  };

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

  const loadConversations = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/scriptless/conversation', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    }
  };

  const loadConversationMessages = useCallback(async (conversationId: number) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/scriptless/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data) {
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  }, []);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setCurrentConversation(conv);
    loadConversationMessages(conv.id);
  }, [loadConversationMessages]);

  const handleNewConversation = async () => {
    setCurrentConversation(null);
    setMessages([]);
    setSelectedCustomerId(null);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = getToken();
      const response = await fetch(`/api/scriptless/conversation?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversation?.id === id) {
          handleNewConversation();
        }
        toast.success('删除成功');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleRenameConversation = async (id: number) => {
    if (!editTitleValue.trim()) return;
    try {
      const token = getToken();
      const response = await fetch('/api/scriptless/conversation', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, title: editTitleValue.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: editTitleValue.trim() } : c))
        );
        if (currentConversation?.id === id) {
          setCurrentConversation((prev) => prev ? { ...prev, title: editTitleValue.trim() } : null);
        }
        setEditingTitle(null);
        toast.success('重命名成功');
      }
    } catch (error) {
      toast.error('重命名失败');
    }
  };

  const handleSend = async (messageOverride?: string) => {
    const messageToSend = messageOverride || inputValue.trim();
    if (!messageToSend || isLoading) return;

    if (!messageOverride) {
      setInputValue('');
    }
    setIsLoading(true);

    // 添加用户消息（使用真实ID，不会被移除）
    const userMsgId = Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: messageToSend,
      customerId: selectedCustomerId || undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 添加一个临时的AI消息用于显示加载状态
    const tempAiMsg: Message = {
      id: -1,
      role: 'assistant',
      content: '',
      result: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempAiMsg]);

    try {
      const token = getToken();
      const response = await fetch('/api/scriptless/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: currentConversation?.id || null,
          message: messageToSend,
          customerId: selectedCustomerId,
        }),
      });

      // 处理HTTP错误（如算力不足、未登录）
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // 移除临时AI消息和最后添加的用户消息
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== -1);
          // 移除最后一条用户消息
          const lastUserMsgIndex = filtered.map(m => m.role).lastIndexOf('user');
          if (lastUserMsgIndex !== -1) {
            filtered.splice(lastUserMsgIndex, 1);
          }
          return filtered;
        });
        if (response.status === 401) {
          toast.error('登录已过期，请重新登录');
          router.push('/login');
        } else if (response.status === 402) {
          toast.error(errorData.error || '算力不足，请充值后继续使用');
          loadCredits();
        } else {
          toast.error(errorData.error || '请求失败');
        }
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                
                if (data.type === 'start') {
                  // 开始生成，更新会话列表
                  if (!currentConversation && data.conversationId) {
                    loadConversations();
                    setCurrentConversation({
                      id: data.conversationId,
                      title: messageToSend.length > 30 ? messageToSend.substring(0, 30) + '...' : messageToSend,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                  }
                } else if (data.type === 'result') {
                  // 最终结果
                  const aiMsg: Message = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: data.content,
                    result: data.result,
                    createdAt: new Date().toISOString(),
                  };
                  
                  // 只移除临时AI消息，保留用户消息
                  setMessages((prev) => [...prev.filter((m) => m.id !== -1), aiMsg]);
                  
                  // 更新算力余额
                  if (data.remaining !== undefined) {
                    setCreditsBalance(data.remaining);
                    toast.success(`生成成功，消耗 ${data.creditsUsed} 点算力`);
                  }
                } else if (data.type === 'error') {
                  toast.error(data.message);
                  // 移除临时AI消息和最后添加的用户消息
                  setMessages((prev) => {
                    const filtered = prev.filter((m) => m.id !== -1);
                    const lastUserMsgIndex = filtered.map(m => m.role).lastIndexOf('user');
                    if (lastUserMsgIndex !== -1) {
                      filtered.splice(lastUserMsgIndex, 1);
                    }
                    return filtered;
                  });
                  // 如果是算力不足，刷新余额
                  if (data.code === 'INSUFFICIENT_CREDITS') {
                    loadCredits();
                  }
                }
              } catch (parseError) {
                // JSON 解析错误，可能是 LLM 输出中包含未转义的特殊字符
                console.warn('JSON parse error:', parseError, 'Line:', line.substring(0, 100));
                // 尝试作为纯文本处理
                if (line.includes('"type":"chunk"')) {
                  // 尝试提取 content 字段
                  const contentMatch = line.match(/"content":"([^"]*)"/);
                  if (contentMatch) {
                    // 添加到临时消息
                    setMessages((prev) => {
                      const tempMsg = prev.find((m) => m.id === -1);
                      if (tempMsg) {
                        return prev.map((m) => 
                          m.id === -1 ? { ...m, content: tempMsg.content + contentMatch[1] } : m
                        );
                      }
                      return prev;
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('发送失败');
      // 移除临时AI消息和最后添加的用户消息
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== -1);
        const lastUserMsgIndex = filtered.map(m => m.role).lastIndexOf('user');
        if (lastUserMsgIndex !== -1) {
          filtered.splice(lastUserMsgIndex, 1);
        }
        return filtered;
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)] bg-background">
        {/* 左侧会话列表 */}
        <div className="w-72 border-r bg-muted/20 flex flex-col shrink-0">
          {/* 新建会话按钮 */}
          <div className="p-3 border-b bg-background">
            <Button
              className="w-full h-10 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md"
              onClick={handleNewConversation}
            >
              <Plus className="w-4 h-4 mr-2" />
              新建会话
            </Button>
          </div>

          {/* 会话列表 */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    'group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all',
                    currentConversation?.id === conv.id
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                      : 'hover:bg-muted border border-transparent'
                  )}
                  onClick={() => handleSelectConversation(conv)}
                >
                  {editingTitle === conv.id ? (
                    <>
                      <div className={cn(
                        'p-1.5 rounded-md shrink-0',
                        currentConversation?.id === conv.id
                          ? 'bg-primary/20'
                          : 'bg-muted'
                      )}>
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        <Input
                          value={editTitleValue}
                          onChange={(e) => setEditTitleValue(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameConversation(conv.id);
                            } else if (e.key === 'Escape') {
                              setEditingTitle(null);
                            }
                          }}
                        />
                        <CheckCircle
                          className="w-4 h-4 text-green-500 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameConversation(conv.id);
                          }}
                        />
                        <XCircle
                          className="w-4 h-4 text-red-500 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(null);
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 删除按钮放在前面 */}
                      <button
                        className="shrink-0 p-1 rounded hover:bg-destructive/10 transition-colors"
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        title="删除会话"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                      <div className={cn(
                        'p-1.5 rounded-md shrink-0',
                        currentConversation?.id === conv.id
                          ? 'bg-primary/20'
                          : 'bg-muted'
                      )}>
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="flex-1 truncate text-sm font-medium">
                        {conv.title || '未命名会话'}
                      </span>
                      <Pencil
                        className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTitle(conv.id);
                          setEditTitleValue(conv.title || '');
                        }}
                      />
                    </>
                  )}
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-12">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  暂无会话记录
                  <p className="text-xs mt-1">点击上方按钮开始新对话</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/10 overflow-hidden">
          {/* 标题栏 */}
          <div className="h-14 border-b flex items-center justify-between px-6 gap-3 shrink-0 bg-background">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">无脚本拍摄助手</h1>
                <p className="text-xs text-muted-foreground">
                  {currentConversation?.title || '输入拍摄需求，AI生成完整方案'}
                </p>
              </div>
            </div>
            {/* 消耗算力显示 */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-muted-foreground">消耗算力：300点/次</span>
            </div>
          </div>

          {/* 消息区域 - 固定高度，可滚动 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="max-w-3xl mx-auto space-y-4 pb-4">
              {messages.length === 0 && !isLoading ? (
                <div className="py-8">
                  {/* 欢迎区域 */}
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">开始新的拍摄方案</h2>
                    <p className="text-muted-foreground">
                      输入您的拍摄场景和需求，AI 将为您生成完整的拍摄方案
                    </p>
                  </div>

                  {/* 示例提示区域 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                      <span>试试这些示例，快速开始</span>
                    </div>
                    {EXAMPLE_PROMPTS.map((example, index) => (
                      <button
                        key={index}
                        className="w-full text-left p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
                        onClick={() => handleSend(example.prompt)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <example.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1">{example.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {example.prompt}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  // 流式消息显示（临时AI消息，id === -1）
                  const isStreaming = msg.id === -1 && msg.role === 'assistant';
                  
                  return (
                    <div
                      key={msg.id || index}
                      className={cn(
                        'flex',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-3 border shadow-sm',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border'
                        )}
                      >
                        {msg.role === 'user' ? (
                          <div>
                            {msg.customerId && (
                              <div className="text-xs opacity-70 mb-1 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {customers.find((c) => c.id === msg.customerId)?.name}
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            {/* 复制按钮 - 常驻显示 */}
                            <button
                              className="mt-2 flex items-center gap-1 text-xs opacity-80 hover:opacity-100 transition-opacity"
                              onClick={async () => {
                                await navigator.clipboard.writeText(msg.content);
                                toast.success('已复制到剪贴板');
                              }}
                            >
                              <Copy className="w-3 h-3" />
                              <span>复制</span>
                            </button>
                          </div>
                        ) : isStreaming ? (
                          // 流式消息显示 - 不显示原始JSON，只显示加载状态
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <div>
                              <p className="text-sm font-medium text-foreground">正在生成拍摄方案...</p>
                              <p className="text-xs mt-0.5">AI正在为您规划视频内容</p>
                            </div>
                          </div>
                        ) : (
                          <AIContent content={msg.content} result={msg.result} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {isLoading && messages.every(m => m.id !== -2) && (
                <div className="flex justify-start">
                  <div className="bg-card rounded-2xl px-4 py-3 border shadow-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">正在生成拍摄方案...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* 输入区域 - 固定在底部 */}
          <div className="border-t p-4 shrink-0 bg-background">
            <div className="max-w-3xl mx-auto">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl p-2 border-2 transition-all bg-card',
                  isInputFocused
                    ? 'border-primary shadow-md ring-2 ring-primary/10'
                    : 'border-border'
                )}
              >
                {/* 客户选择按钮 */}
                <Dialog open={showCustomerSelect} onOpenChange={setShowCustomerSelect}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'shrink-0 h-9 border-2',
                      selectedCustomerId
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-dashed'
                    )}
                    onClick={() => setShowCustomerSelect(true)}
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    {selectedCustomer ? (
                      <span className="max-w-[80px] truncate">{selectedCustomer.name}</span>
                    ) : (
                      '选择客户'
                    )}
                  </Button>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>选择客户档案</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2 p-2">
                        {customers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            暂无客户档案
                          </p>
                        ) : (
                          customers.map((customer) => (
                            <div
                              key={customer.id}
                              className={cn(
                                'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                                selectedCustomerId === customer.id
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-primary/50'
                              )}
                              onClick={() => {
                                setSelectedCustomerId(customer.id);
                                setShowCustomerSelect(false);
                              }}
                            >
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                {customer.ipPositioning && (
                                  <p className="text-xs text-muted-foreground">
                                    已配置IP定位
                                  </p>
                                )}
                              </div>
                              {selectedCustomerId === customer.id && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomerId(null);
                          setShowCustomerSelect(false);
                        }}
                      >
                        清除选择
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* 输入框 */}
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder="输入拍摄场景和需求，按 Enter 发送..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-sm"
                  disabled={isLoading}
                />

                {/* 发送按钮 */}
                <Button
                  size="sm"
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  className={cn(
                    'shrink-0 h-9 px-4',
                    inputValue.trim() && !isLoading
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'
                      : ''
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-1.5" />
                  )}
                  发送
                </Button>
              </div>

              {/* 提示文字 */}
              <div className="mt-2 text-xs text-muted-foreground text-center">
                💡 提示：选择客户档案可以让AI根据客户IP定位生成更精准的内容
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
