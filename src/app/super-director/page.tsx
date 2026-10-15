'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Send,
  User,
  Bot,
  Loader2,
  Trash2,
  Lightbulb,
  BookOpen,
  Target,
  PenTool,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  Home,
  Users,
  Plus,
  Check,
  Zap,
  ArrowRight,
  ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/api';

// 统一蓝紫色主题
const THEME_COLOR = {
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  bg: '#8B5CF6',
  bgLight: '#F5F3FF',
  text: '#8B5CF6',
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  savedToMaterial?: boolean;
}

interface Customer {
  id: number;
  name: string;
  industry?: string;
  description?: string;
  ipPositioning?: string;
}

// 快捷提问建议 - 带样式配置
const QUICK_SUGGESTIONS = [
  { icon: Target, text: '如何给我的账号做IP定位？', category: 'IP定位', color: 'blue' },
  { icon: PenTool, text: '帮我写一个观点型短视频脚本', category: '脚本创作', color: 'cyan' },
  { icon: TrendingUp, text: '短视频如何快速起号？', category: '运营策略', color: 'emerald' },
  { icon: Lightbulb, text: '如何找到爆款选题？', category: '选题策划', color: 'amber' },
  { icon: BookOpen, text: '短视频爆款的核心要素有哪些？', category: '方法论', color: 'slate' },
  { icon: MessageSquare, text: '如何提高视频的完播率？', category: '内容优化', color: 'teal' },
];

// 建议卡片颜色映射 - 统一主色调
const SUGGESTION_COLORS: Record<string, { bg: string; icon: string; hover: string }> = {
  blue: {
    bg: 'bg-muted/50',
    icon: 'text-primary',
    hover: 'hover:bg-muted',
  },
  cyan: {
    bg: 'bg-muted/50',
    icon: 'text-primary',
    hover: 'hover:bg-muted',
  },
  emerald: {
    bg: 'bg-muted/50',
    icon: 'text-primary',
    hover: 'hover:bg-muted',
  },
  amber: {
    bg: 'bg-muted/50',
    icon: 'text-primary',
    hover: 'hover:bg-muted',
  },
  slate: {
    bg: 'bg-muted/50',
    icon: 'text-primary',
    hover: 'hover:bg-muted',
  },
  teal: {
    bg: 'bg-muted/50',
    icon: 'text-primary',
    hover: 'hover:bg-muted',
  },
};

// 去除markdown符号的函数
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/___(.*?)___/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s]*[-*+]\s+/gm, '• ')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/^[-*_]{3,}$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function SuperDirectorPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none');
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // 是否显示滚动到底部按钮
  const [showScrollButton, setShowScrollButton] = useState(false);
  // 是否允许自动滚动（用户在底部或刚发送消息时为true）
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // 认证检查
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // 加载客户列表
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch('/api/customer/list');
        if (res.ok) {
          const data = await res.json();
          setCustomers(data.data || []);
        }
      } catch (error) {
        console.error('加载客户列表失败:', error);
      }
    };

    if (isAuthenticated) {
      fetchCustomers();
    }
  }, [isAuthenticated]);

  // 检测滚动位置
  const checkScrollPosition = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // 距离底部150px以内视为在底部
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      
      // 用户手动滚动到底部附近时，恢复自动滚动
      if (isNearBottom) {
        setAutoScrollEnabled(true);
        setShowScrollButton(false);
      } else {
        // 用户向上滚动查看历史，禁用自动滚动
        setAutoScrollEnabled(false);
        setShowScrollButton(true);
      }
    }
  };

  // 滚动到底部（使用 scrollTop 只滚动聊天区域，不影响整个页面）
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
    setAutoScrollEnabled(true);
    setShowScrollButton(false);
  };

  // 监听滚动事件
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, []);

  // 当有新消息或流式内容更新时，如果允许自动滚动则滚动
  useEffect(() => {
    if (autoScrollEnabled && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages, streamingContent, autoScrollEnabled]);

  // 欢迎消息
  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `你好呀！我是小仔仔，你的专属短视频创作小伙伴 👋

很高兴能在这里陪你一起搞定短视频创作的各种事儿～

我可以陪你一起做这些：

🎯 IP 定位：帮你挖掘专属特色，找到最适合你的创作方向
💡 内容策划：一起脑暴爆款选题，找准内容发力点
✍️ 脚本创作：帮你打磨各类短视频脚本，让内容更出彩
📈 运营指导：聊聊账号运营和流量获取的小技巧
💰 商业咨询：一起探讨变现路径，让创作更有价值

有什么想发挥的创意，尽管告诉我呀～`,
          timestamp: new Date()
        }
      ]);
    }
  }, [isAuthenticated, messages.length]);

  // 获取选中的客户信息
  const getSelectedCustomerInfo = () => {
    if (!selectedCustomerId || selectedCustomerId === 'none') return null;
    const customer = customers.find(c => c.id.toString() === selectedCustomerId);
    return customer || null;
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');
    // 用户发送消息时，启用自动滚动以查看AI回复
    setAutoScrollEnabled(true);

    const customerInfo = getSelectedCustomerInfo();

    try {
      const token = getToken();
      const response = await fetch('/api/ai/super-director', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: messageText.trim(),
          history: messages
            .filter(m => m.id !== 'welcome')
            .map(m => ({ role: m.role, content: m.content })),
          customerInfo: customerInfo ? {
            name: customerInfo.name,
            industry: customerInfo.industry,
            description: customerInfo.description,
            positioning: customerInfo.ipPositioning
          } : null
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let fullContent = '';

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
                fullContent += data.content;
                setStreamingContent(stripMarkdown(fullContent));
              }
              if (data.done) {
                const assistantMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: stripMarkdown(fullContent),
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
                setStreamingContent('');
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              // 解析错误，继续处理
            }
          }
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `抱歉，我遇到了一些问题：${error instanceof Error ? error.message : '请稍后重试'}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '对话已清空。有什么新问题，尽管问我！',
        timestamp: new Date()
      }
    ]);
  };

  const goToHome = () => {
    router.push('/customer');
  };

  // 添加到素材库
  const addToMaterial = async (message: Message) => {
    if (message.savedToMaterial || savingMessageId === message.id) return;
    
    setSavingMessageId(message.id);
    
    try {
      const customer = getSelectedCustomerInfo();
      
      const response = await fetch('/api/customer/materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer?.id || 0,
          customerName: customer?.name || '',
          topic: '智能编导创作',
          title: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
          scriptType: 'insight',
          status: 'draft',
          content: message.content,
        }),
      });

      if (response.ok) {
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, savedToMaterial: true } : m
        ));
      } else {
        const error = await response.json();
        console.error('保存素材失败:', error);
      }
    } catch (error) {
      console.error('保存素材失败:', error);
    } finally {
      setSavingMessageId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background">
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                智能超级编导
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                小仔仔随时为你服务
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToHome} className="gap-2">
              <Home className="w-4 h-4" />
              返回主页
            </Button>
            <Button variant="outline" size="sm" onClick={clearChat} className="gap-2 text-orange-600 hover:text-orange-700">
              <Trash2 className="w-4 h-4" />
              清空对话
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Quick Suggestions */}
          <div className="lg:col-span-1 space-y-4">
            {/* 客户档案选择 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  客户档案
                </CardTitle>
                <CardDescription className="text-xs">
                  选择客户，生成个性化内容
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择客户档案（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不选择客户</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomerId && selectedCustomerId !== 'none' && (
                  <div className="mt-2 p-2 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-primary" />
                      已选择客户，将生成个性化内容
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 快捷提问 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  快捷提问
                </CardTitle>
                <CardDescription className="text-xs">
                  点击快速发起对话
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {QUICK_SUGGESTIONS.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  const colorStyle = SUGGESTION_COLORS[suggestion.color] || SUGGESTION_COLORS.violet;
                  
                  return (
                    <button
                      key={index}
                      className={cn(
                        'w-full group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 cursor-pointer',
                        colorStyle.bg,
                        colorStyle.hover
                      )}
                      onClick={() => sendMessage(suggestion.text)}
                      disabled={isStreaming}
                    >
                      <div className="p-1.5 rounded-lg bg-white/50 dark:bg-white/10">
                        <Icon className={cn('w-4 h-4', colorStyle.icon)} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {suggestion.text}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{suggestion.category}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* 知识库来源 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  知识库来源
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="secondary">短视频方法论</Badge>
                  <Badge variant="secondary">IP定位</Badge>
                  <Badge variant="secondary">内容创作</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  已导入2025年最新课程内容，支持智能检索
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-220px)] flex flex-col overflow-hidden shadow-sm">
              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 p-4 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-transparent to-muted/10 relative"
              >
                <div className="space-y-4 w-full">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3 w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
                        message.role === 'user' && 'justify-end'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="w-8 h-8 shrink-0 mt-1 ring-2 ring-blue-500/20">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn(
                        'flex flex-col gap-1.5 max-w-[85%]',
                        message.role === 'user' ? 'items-end' : 'items-start'
                      )}>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-3 overflow-hidden',
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                              : 'bg-card border border-border/50 shadow-sm'
                          )}
                        >
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[10px] text-muted-foreground">
                            {message.timestamp.toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {message.role === 'assistant' && message.id !== 'welcome' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-5 text-[10px] px-2",
                                message.savedToMaterial && "text-emerald-600"
                              )}
                              onClick={() => addToMaterial(message)}
                              disabled={message.savedToMaterial || savingMessageId === message.id}
                            >
                              {message.savedToMaterial ? (
                                <>
                                  <Check className="w-3 h-3 mr-1" />
                                  已添加
                                </>
                              ) : savingMessageId === message.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  添加中
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3 mr-1" />
                                  添加到素材库
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="w-8 h-8 shrink-0 mt-1">
                          <AvatarFallback className="bg-secondary">
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}

                  {/* Streaming Content */}
                  {isStreaming && streamingContent && (
                    <div className="flex gap-3 w-full animate-in fade-in-0 duration-200">
                      <Avatar className="w-8 h-8 shrink-0 mt-1 ring-2 ring-blue-500/20">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-2xl px-4 py-3 bg-card border border-border/50 shadow-sm max-w-[85%]">
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {streamingContent}
                          <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5 rounded-sm" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading Indicator */}
                  {isStreaming && !streamingContent && (
                    <div className="flex gap-3 w-full animate-in fade-in-0 duration-200">
                      <Avatar className="w-8 h-8 shrink-0 mt-1 ring-2 ring-blue-500/20">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="rounded-2xl px-4 py-3 bg-card border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                          <span className="text-blue-600 dark:text-blue-400 font-medium">正在思考中...</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
                
                {/* Scroll to Bottom Button */}
                {showScrollButton && (
                  <button
                    onClick={scrollToBottom}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-colors animate-in fade-in-0 zoom-in-95 duration-200"
                  >
                    <ArrowDown className="w-4 h-4" />
                    <span className="text-sm">滚动到最新</span>
                  </button>
                )}
              </div>

              <Separator />

              {/* Input Area */}
              <div className="p-4 shrink-0 bg-card">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="输入你的问题，例如：如何给我的账号做IP定位？"
                      className="min-h-[56px] max-h-[120px] resize-none pr-12 border-blue-100 dark:border-blue-900/50 focus:border-blue-300 dark:focus:border-blue-700"
                      disabled={isStreaming}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0 h-[56px] w-[56px] bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg shadow-blue-500/20"
                    disabled={!input.trim() || isStreaming}
                  >
                    {isStreaming ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>
                  <span>发送</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Shift + Enter</kbd>
                  <span>换行</span>
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
