'use client';

import { useState } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Download,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function HumanizePage() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleHumanize = async () => {
    if (!inputText.trim()) {
      toast.error('请输入需要优化的文案');
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const token = getToken();
      const response = await fetch('/api/operations/humanize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: inputText }),
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
      console.error('Humanize error:', error);
      toast.error('处理失败，请重试');
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
    a.download = `口语化文案_${new Date().toLocaleDateString('zh-CN')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('已导出文件');
  };

  const handleClear = () => {
    setInputText('');
    setResult('');
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
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
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">口语化去AI味</h1>
              <p className="text-sm text-muted-foreground">将AI生成的文案转换成自然流畅的口语化表达</p>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 输入区域 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">原始文案</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {inputText.length} 字
                  </Badge>
                  {inputText && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleClear}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      清空
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="粘贴需要优化的AI文案...&#10;&#10;例如：人工智能技术的快速发展为各行各业带来了革命性的变革，推动了产业升级和转型..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[300px] resize-none"
              />
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleHumanize}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      开始优化
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
                <CardTitle className="text-base">优化结果</CardTitle>
                {result && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-green-600">
                      已优化
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleCopy}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleExport}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      导出
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="min-h-[300px] p-4 rounded-lg bg-muted/50 whitespace-pre-wrap text-sm leading-relaxed">
                  {result}
                </div>
              ) : (
                <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>优化后的文案将显示在这里</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 使用说明 */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium mb-1">使用技巧</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 适合处理AI生成的营销文案、脚本、文章等</li>
                  <li>• 保留原文核心意思，调整为更自然的口语表达</li>
                  <li>• 自动去除&quot;首先、其次、总之&quot;等AI常用句式</li>
                  <li>• 添加适当的语气词，让文案更有温度</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
