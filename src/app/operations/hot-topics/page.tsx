'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  ArrowLeft,
  Flame,
  Eye,
  Heart,
  Sparkles,
  RefreshCw,
  Copy,
  Star,
  Zap,
  BarChart3,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface HotTopic {
  id: string;
  title: string;
  heat: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
  platform: 'douyin' | 'xiaohongshu' | 'shipinhao' | 'kuaishou';
  views?: string;
  engagement?: string;
  relatedTopics?: string[];
  analysis?: string;
}

interface HotTopicsResponse {
  success: boolean;
  data?: {
    topics: HotTopic[];
    cached: boolean;
    cacheType?: 'short-term' | 'expired' | 'fresh';  // 缓存类型
    isRefreshing?: boolean;  // 是否正在后台刷新
    refreshDuration?: number;  // 刷新耗时（秒）
    week: number;
    year: number;
    dateRange: string;
  };
  error?: string;
  message?: string;
}

const PLATFORMS = [
  { value: 'all', label: '全平台', color: 'bg-gradient-to-r from-pink-500 to-purple-500' },
  { value: 'douyin', label: '抖音', color: 'bg-black' },
  { value: 'xiaohongshu', label: '小红书', color: 'bg-red-500' },
  { value: 'shipinhao', label: '视频号', color: 'bg-green-500' },
  { value: 'kuaishou', label: '快手', color: 'bg-orange-500' },
];

const CATEGORIES = [
  '全部', '美食', '旅行', '美妆', '科技', '娱乐', 
  '教育', '生活', '情感', '运动', '音乐',
  '游戏', '汽车', '财经', '健康', '时尚'
];

export default function HotTopicsPage() {
  const router = useRouter();
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [weekInfo, setWeekInfo] = useState({ week: 0, year: 0, dateRange: '' });
  const [isCached, setIsCached] = useState(false);
  const [cacheType, setCacheType] = useState<'short-term' | 'expired' | 'fresh'>('fresh');
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取热点数据
  const fetchTopics = useCallback(async (force = false) => {
    // 如果正在后台刷新，不重复请求
    if (isBackgroundRefreshing && !force) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const url = force 
        ? '/api/hot-topics/fetch' 
        : `/api/hot-topics/fetch?platform=${selectedPlatform}`;
      
      const method = force ? 'POST' : 'GET';
      
      const response = await fetch(url, { method });
      const data: HotTopicsResponse = await response.json();
      
      if (data.success && data.data) {
        setTopics(data.data.topics);
        setWeekInfo({ 
          week: data.data.week, 
          year: data.data.year, 
          dateRange: data.data.dateRange 
        });
        setIsCached(data.data.cached);
        setCacheType(data.data.cacheType || 'fresh');
        
        // 如果后端正在后台刷新，设置轮询
        if (data.data.isRefreshing) {
          setIsBackgroundRefreshing(true);
          // 3秒后再次检查
          setTimeout(() => {
            fetchTopics(false);
          }, 3000);
        } else {
          setIsBackgroundRefreshing(false);
        }
        
        if (force && data.data.refreshDuration) {
          toast.success(`热点数据已更新（耗时 ${data.data.refreshDuration.toFixed(1)}秒）`);
        } else if (force) {
          toast.success('热点数据已更新');
        }
      } else {
        setError(data.error || '获取热点数据失败');
        if (data.message) {
          toast.info(data.message);
        }
      }
    } catch (err) {
      setError('网络请求失败，请稍后重试');
      console.error('获取热点失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlatform, isBackgroundRefreshing]);

  // 初始加载
  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // 刷新热点
  const handleRefresh = async () => {
    await fetchTopics(true);
  };

  // 切换展开状态
  const handleToggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // 切换收藏状态
  const handleToggleStar = (id: string) => {
    setStarredIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        toast.success('已取消收藏');
      } else {
        newSet.add(id);
        toast.success('已收藏');
      }
      return newSet;
    });
  };

  // 复制话题
  const handleCopy = (title: string) => {
    navigator.clipboard.writeText(title);
    toast.success('已复制到剪贴板');
  };

  // 跳转到脚本生成
  const handleGenerateScript = (topic: HotTopic) => {
    // 跳转到文案创作页面，带上话题和平台参数
    router.push(`/script/writing?topic=${encodeURIComponent(topic.title)}&platform=${topic.platform}`);
  };

  // 筛选话题
  const filteredTopics = topics.filter(t => {
    const matchesPlatform = selectedPlatform === 'all' || t.platform === selectedPlatform;
    const matchesCategory = selectedCategory === '全部' || t.category === selectedCategory;
    return matchesPlatform && matchesCategory;
  });

  // 获取平台信息
  const getPlatformInfo = (platform: string) => {
    return PLATFORMS.find(p => p.value === platform) || PLATFORMS[0];
  };

  // 获取趋势图标
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />;
      default:
        return <div className="w-4 h-0.5 bg-muted-foreground" />;
    }
  };

  // 获取热度颜色
  const getHeatColor = (heat: number) => {
    if (heat >= 90) return 'text-red-500';
    if (heat >= 70) return 'text-orange-500';
    return 'text-yellow-500';
  };

  // 计算统计数据
  const stats = {
    totalTopics: topics.length,
    upTrends: topics.filter(t => t.trend === 'up').length,
    platformCount: PLATFORMS.length - 1,
    highHeat: topics.filter(t => t.heat >= 80).length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面头部 */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push('/operations')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">热点追踪</h1>
                <p className="text-sm text-muted-foreground">
                  {weekInfo.dateRange ? `第${weekInfo.week}周 (${weekInfo.dateRange})` : '加载中...'}
                  {isCached && cacheType === 'short-term' && <span className="ml-2 text-green-500">· 缓存有效</span>}
                  {isCached && cacheType === 'expired' && <span className="ml-2 text-yellow-500">· 正在更新...</span>}
                  {isBackgroundRefreshing && <span className="ml-2 text-blue-500 animate-pulse">· 后台刷新中</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isBackgroundRefreshing}
            >
              {(isLoading || isBackgroundRefreshing) ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              {isBackgroundRefreshing ? '刷新中...' : '刷新热点'}
            </Button>
          </div>
        </div>

        {/* 平台和分类选择 */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">平台：</span>
            {PLATFORMS.map(p => (
              <Button
                key={p.value}
                variant={selectedPlatform === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPlatform(p.value)}
                className={selectedPlatform === p.value ? 'bg-gradient-to-r from-pink-500 to-purple-500' : ''}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">分类：</span>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 热点统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-red-500" />
                <span className="text-sm text-muted-foreground">热门话题</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalTopics}</div>
              <div className="text-xs text-muted-foreground mt-1">本周热点总数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">上升趋势</span>
              </div>
              <div className="text-2xl font-bold">{stats.upTrends}</div>
              <div className="text-xs text-green-500 mt-1">热度上升中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">超高热度</span>
              </div>
              <div className="text-2xl font-bold">{stats.highHeat}</div>
              <div className="text-xs text-muted-foreground mt-1">热度80+话题</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">更新周期</span>
              </div>
              <div className="text-2xl font-bold">每周</div>
              <div className="text-xs text-muted-foreground mt-1">自动更新热点</div>
            </CardContent>
          </Card>
        </div>

        {/* 加载状态 */}
        {isLoading && topics.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="ml-2 text-muted-foreground">正在获取最新热点...</span>
          </div>
        )}

        {/* 错误状态 */}
        {error && !isLoading && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={handleRefresh} className="ml-auto">
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 热点列表 */}
        {!isLoading && !error && filteredTopics.length > 0 && (
          <div className="space-y-4">
            {filteredTopics.map((topic, index) => {
              const platformInfo = getPlatformInfo(topic.platform);
              const isExpanded = expandedId === topic.id;
              const isStarred = starredIds.has(topic.id);

              return (
                <Card 
                  key={topic.id}
                  className={`hover:shadow-lg transition-all cursor-pointer ${
                    isExpanded ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => handleToggleExpand(topic.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* 排名 */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                        index < 3 ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-medium text-base">{topic.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {topic.category}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(topic.trend)}
                            <span className="text-xs text-muted-foreground">
                              {topic.trend === 'up' ? '上升' : topic.trend === 'down' ? '下降' : '稳定'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded ${platformInfo.color}`} />
                            {platformInfo.label}
                          </div>
                          {topic.views && (
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {topic.views}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            热度: <span className={`font-bold ${getHeatColor(topic.heat)}`}>{topic.heat}</span>
                          </div>
                        </div>

                        {/* 展开内容 */}
                        {isExpanded && (
                          <div className="mt-4 space-y-4 pt-4 border-t" onClick={e => e.stopPropagation()}>
                            {/* 相关话题 */}
                            {topic.relatedTopics && topic.relatedTopics.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">相关话题</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {topic.relatedTopics.map(t => (
                                    <Badge key={t} variant="secondary">
                                      #{t}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* AI分析 */}
                            {topic.analysis && (
                              <div className="p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Sparkles className="w-4 h-4 text-purple-500" />
                                  <h4 className="text-sm font-medium">创作建议</h4>
                                </div>
                                <p className="text-sm text-muted-foreground">{topic.analysis}</p>
                              </div>
                            )}

                            {/* 操作按钮 */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => handleCopy(topic.title)}>
                                <Copy className="w-4 h-4 mr-1" />
                                复制话题
                              </Button>
                              <Button 
                                size="sm" 
                                variant={isStarred ? 'default' : 'outline'}
                                onClick={() => handleToggleStar(topic.id)}
                              >
                                <Star className={`w-4 h-4 mr-1 ${isStarred ? 'fill-current' : ''}`} />
                                {isStarred ? '已收藏' : '收藏'}
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-gradient-to-r from-pink-500 to-purple-500"
                                onClick={() => handleGenerateScript(topic)}
                              >
                                <Sparkles className="w-4 h-4 mr-1" />
                                生成脚本
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 收藏按钮 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(topic.id);
                        }}
                      >
                        <Star className={`w-5 h-5 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && !error && filteredTopics.length === 0 && topics.length > 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>没有找到相关热点</p>
            <p className="text-sm mt-2">尝试切换平台或分类筛选</p>
          </div>
        )}

        {/* 使用说明 */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium mb-2">如何利用热点</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">1. 发现热点</span>
                    <p className="mt-1">通过平台和分类筛选，快速找到适合自己领域的热点话题</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">2. 分析趋势</span>
                    <p className="mt-1">查看热度指数和相关话题，了解话题的生命周期和传播趋势</p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">3. 借势创作</span>
                    <p className="mt-1">使用AI生成脚本功能，快速产出热点内容，抢占流量红利</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
