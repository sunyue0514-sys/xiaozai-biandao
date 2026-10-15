'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  ArrowLeft,
  Clock,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// 格式化时间
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 历史记录类型
interface VideoAnalysisHistoryItem {
  id: number;
  userId: number;
  videoUrl: string;
  videoTitle: string | null;
  videoCover: string | null;
  platform: string;
  platformName: string | null;
  author: string | null;
  authorId: string | null;
  authorAvatar: string | null;
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  views: number;
  scriptContent: string | null;
  analysisReport: string | null;
  totalScore: number | null;
  createdAt: string;
}

// 平台颜色映射
const PLATFORM_COLORS: Record<string, string> = {
  douyin: 'bg-black text-white',
  kuaishou: 'bg-orange-500 text-white',
  xiaohongshu: 'bg-red-500 text-white',
  bilibili: 'bg-blue-500 text-white',
  weibo: 'bg-orange-600 text-white',
};

export default function VideoAnalysisHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<VideoAnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载历史记录
  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/video-analysis-history', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setHistory(data.data);
      } else {
        setError(data.error || '加载失败');
      }
    } catch (err) {
      console.error('加载历史记录失败:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // 删除记录
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条分析记录吗？')) return;
    
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch(`/api/video-analysis-history?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHistory(prev => prev.filter(item => item.id !== id));
        toast.success('删除成功');
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (err) {
      console.error('删除失败:', err);
      toast.error('删除失败');
    }
  };

  // 查看详情
  const handleViewDetail = (id: number) => {
    router.push(`/operations/video-analysis?historyId=${id}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">分析历史</h1>
                <p className="text-sm text-muted-foreground">查看历史视频分析记录</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/operations/video-analysis')}
            className="gap-2"
          >
            <Video className="w-4 h-4" />
            新建分析
          </Button>
        </div>

        {/* 历史列表 */}
        {isLoading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">加载中...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="py-8">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        ) : history.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <Video className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">暂无分析记录</p>
              <p className="text-sm text-muted-foreground/70 mt-1">分析过的视频会保存在这里</p>
              <Button
                className="mt-4"
                onClick={() => router.push('/operations/video-analysis')}
              >
                去分析视频
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* 封面 */}
                    <div className="relative w-32 h-44 shrink-0 rounded-lg overflow-hidden bg-muted">
                      {item.videoCover ? (
                        <img
                          src={item.videoCover}
                          alt={item.videoTitle || '视频封面'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <Badge className={`absolute bottom-2 left-2 ${PLATFORM_COLORS[item.platform] || 'bg-gray-500 text-white'}`}>
                        {item.platformName || item.platform}
                      </Badge>
                      {item.totalScore && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                          {item.totalScore.toFixed(1)}分
                        </div>
                      )}
                    </div>
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground line-clamp-2 mb-2">
                        {item.videoTitle || '未知标题'}
                      </h3>
                      
                      {item.author && (
                        <p className="text-sm text-muted-foreground mb-3">
                          作者：{item.author}
                        </p>
                      )}
                      
                      {/* 数据 */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {formatNumber(item.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {formatNumber(item.comments)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="w-4 h-4" />
                          {formatNumber(item.shares)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bookmark className="w-4 h-4" />
                          {formatNumber(item.collects)}
                        </span>
                      </div>
                      
                      {/* 时间 */}
                      <p className="text-xs text-muted-foreground/70">
                        分析时间：{formatDate(item.createdAt)}
                      </p>
                    </div>
                    
                    {/* 操作 */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleViewDetail(item.id)}
                      >
                        <Eye className="w-4 h-4" />
                        查看详情
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
