'use client';

import { useState } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Loader2, 
  ArrowLeft,
  Users,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Copy,
  Download
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const PLATFORMS = [
  { value: 'douyin', label: '抖音', color: 'bg-black' },
  { value: 'xiaohongshu', label: '小红书', color: 'bg-red-500' },
  { value: 'shipinhao', label: '视频号', color: 'bg-green-500' },
  { value: 'kuaishou', label: '快手', color: 'bg-orange-500' },
];

export default function AccountAnalysisPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [formData, setFormData] = useState({
    platform: 'douyin',
    accountName: '',
    accountUrl: '',
    followers: '',
    avgViews: '',
    avgLikes: '',
    contentCount: '',
    mainContent: '',
    problems: '',
  });

  const handleAnalyze = async () => {
    if (!formData.accountName && !formData.accountUrl) {
      toast.error('请输入账号名称或主页链接');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const token = getToken();
      const platformLabel = PLATFORMS.find(p => p.value === formData.platform)?.label || '抖音';
      
      const response = await fetch('/api/operations/account-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          platformLabel,
        }),
      });

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
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setResult(prev => prev + data.content);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('分析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast.success('已复制到剪贴板');
  };

  const handleExport = () => {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `账号分析报告_${formData.accountName}_${new Date().toLocaleDateString('zh-CN')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出文件');
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 页面头部 */}
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
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">账号运营分析</h1>
              <p className="text-sm text-muted-foreground">全方位分析账号数据，提供专业的优化建议</p>
            </div>
          </div>
        </div>

        {/* 平台选择 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">选择平台：</span>
          <Select value={formData.platform} onValueChange={(v) => setFormData(prev => ({ ...prev, platform: v }))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${p.color}`} />
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 输入区域 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">账号信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>账号名称 *</Label>
                  <Input 
                    placeholder="输入账号名称"
                    value={formData.accountName}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>主页链接</Label>
                  <Input 
                    placeholder="输入账号主页链接"
                    value={formData.accountUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>粉丝数量</Label>
                  <Input 
                    placeholder="如：10万"
                    value={formData.followers}
                    onChange={(e) => setFormData(prev => ({ ...prev, followers: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>作品数量</Label>
                  <Input 
                    placeholder="如：200"
                    value={formData.contentCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, contentCount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>平均播放量</Label>
                  <Input 
                    placeholder="如：5000"
                    value={formData.avgViews}
                    onChange={(e) => setFormData(prev => ({ ...prev, avgViews: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>平均点赞数</Label>
                  <Input 
                    placeholder="如：300"
                    value={formData.avgLikes}
                    onChange={(e) => setFormData(prev => ({ ...prev, avgLikes: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>主要内容方向</Label>
                <Textarea 
                  placeholder="描述账号的主要内容类型、风格特点..."
                  value={formData.mainContent}
                  onChange={(e) => setFormData(prev => ({ ...prev, mainContent: e.target.value }))}
                  className="h-20"
                />
              </div>

              <div>
                <Label>遇到的问题</Label>
                <Textarea 
                  placeholder="描述账号运营中遇到的问题，如涨粉慢、互动低等..."
                  value={formData.problems}
                  onChange={(e) => setFormData(prev => ({ ...prev, problems: e.target.value }))}
                  className="h-20"
                />
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={handleAnalyze}
                  disabled={isLoading || (!formData.accountName && !formData.accountUrl)}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      分析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      开始分析
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 结果区域 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">分析报告</CardTitle>
                {result && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                      <Download className="w-4 h-4 mr-1" />
                      导出
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="min-h-[400px] p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm leading-relaxed overflow-y-auto max-h-[500px]">
                  {result}
                </div>
              ) : (
                <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>分析报告将显示在这里</p>
                    <p className="text-xs mt-2">输入账号信息后点击&quot;开始分析&quot;</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 分析维度说明 */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium mb-2">分析维度</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>粉丝画像分析</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>内容表现评估</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>增长潜力预测</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>问题诊断分析</span>
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
