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
import { 
  Target, 
  Loader2, 
  ArrowLeft,
  Users,
  Eye,
  TrendingUp,
  Lightbulb,
  Sparkles,
  Copy,
  Download,
  Plus,
  X
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

interface BenchmarkAccount {
  name: string;
  url: string;
  followers: string;
  contentStyle: string;
}

export default function BenchmarkAnalysisPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [formData, setFormData] = useState({
    platform: 'douyin',
    myAccount: '',
    myFollowers: '',
    myContentStyle: '',
    myProblems: '',
  });
  const [benchmarkAccounts, setBenchmarkAccounts] = useState<BenchmarkAccount[]>([
    { name: '', url: '', followers: '', contentStyle: '' }
  ]);

  const addBenchmarkAccount = () => {
    if (benchmarkAccounts.length >= 5) {
      toast.error('最多添加5个对标账号');
      return;
    }
    setBenchmarkAccounts(prev => [...prev, { name: '', url: '', followers: '', contentStyle: '' }]);
  };

  const removeBenchmarkAccount = (index: number) => {
    setBenchmarkAccounts(prev => prev.filter((_, i) => i !== index));
  };

  const updateBenchmarkAccount = (index: number, field: keyof BenchmarkAccount, value: string) => {
    setBenchmarkAccounts(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleAnalyze = async () => {
    if (!formData.myAccount) {
      toast.error('请输入您的账号名称');
      return;
    }

    const validBenchmarks = benchmarkAccounts.filter(b => b.name || b.url);
    if (validBenchmarks.length === 0) {
      toast.error('请至少添加一个对标账号');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const token = getToken();
      const platformLabel = PLATFORMS.find(p => p.value === formData.platform)?.label || '抖音';
      
      const response = await fetch('/api/operations/benchmark-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          platformLabel,
          benchmarkAccounts: validBenchmarks,
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
    a.download = `对标分析报告_${new Date().toLocaleDateString('zh-CN')}.txt`;
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
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">对标账号分析</h1>
              <p className="text-sm text-muted-foreground">分析竞品策略，提供可借鉴的运营经验</p>
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
          <div className="space-y-4">
            {/* 我的账号 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  我的账号
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>账号名称 *</Label>
                    <Input 
                      placeholder="输入您的账号名称"
                      value={formData.myAccount}
                      onChange={(e) => setFormData(prev => ({ ...prev, myAccount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>粉丝数量</Label>
                    <Input 
                      placeholder="如：10万"
                      value={formData.myFollowers}
                      onChange={(e) => setFormData(prev => ({ ...prev, myFollowers: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>内容风格/方向</Label>
                  <Textarea 
                    placeholder="描述您的内容类型和风格特点..."
                    value={formData.myContentStyle}
                    onChange={(e) => setFormData(prev => ({ ...prev, myContentStyle: e.target.value }))}
                    className="h-16"
                  />
                </div>
                <div>
                  <Label>想解决的问题</Label>
                  <Textarea 
                    placeholder="如：涨粉慢、变现难、内容没灵感..."
                    value={formData.myProblems}
                    onChange={(e) => setFormData(prev => ({ ...prev, myProblems: e.target.value }))}
                    className="h-16"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 对标账号 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    对标账号
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addBenchmarkAccount}
                    disabled={benchmarkAccounts.length >= 5}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {benchmarkAccounts.map((account, index) => (
                  <div key={index} className="p-3 rounded-lg border space-y-3 relative">
                    {benchmarkAccounts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeBenchmarkAccount(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">账号名称</Label>
                        <Input 
                          placeholder="对标账号名称"
                          value={account.name}
                          onChange={(e) => updateBenchmarkAccount(index, 'name', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">主页链接</Label>
                        <Input 
                          placeholder="主页链接"
                          value={account.url}
                          onChange={(e) => updateBenchmarkAccount(index, 'url', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">粉丝数量</Label>
                        <Input 
                          placeholder="如：50万"
                          value={account.followers}
                          onChange={(e) => updateBenchmarkAccount(index, 'followers', e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">内容风格</Label>
                        <Input 
                          placeholder="风格特点"
                          value={account.contentStyle}
                          onChange={(e) => updateBenchmarkAccount(index, 'contentStyle', e.target.value)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button 
                    onClick={handleAnalyze}
                    disabled={isLoading || !formData.myAccount}
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
                        开始对比分析
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 结果区域 */}
          <Card className="lg:sticky lg:top-4 lg:self-start">
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
                <div className="min-h-[400px] p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm leading-relaxed overflow-y-auto max-h-[600px]">
                  {result}
                </div>
              ) : (
                <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>对标分析报告将显示在这里</p>
                    <p className="text-xs mt-2">输入您的账号和对标账号后点击分析</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 分析说明 */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium mb-2">分析内容</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                  <div>• 粉丝规模对比</div>
                  <div>• 内容策略分析</div>
                  <div>• 爆款规律拆解</div>
                  <div>• 差异化建议</div>
                  <div>• 运营节奏对比</div>
                  <div>• 变现模式分析</div>
                  <div>• 增长路径建议</div>
                  <div>• 可复制经验</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
