'use client';

import { useState } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Loader2, 
  Copy,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface BannedWord {
  word: string;
  category: string;
  suggestion: string;
  positions: number[];
}

interface DetectionResult {
  hasBannedWords: boolean;
  bannedWords: BannedWord[];
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  processedText?: string;
}

export default function BannedWordsPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDetect = async () => {
    if (!inputText.trim()) {
      toast.error('请输入需要检测的文案');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const token = getToken();
      const response = await fetch('/api/operations/banned-words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setResult(data.result);
      } else {
        toast.error(data.error || '检测失败');
      }
    } catch (error) {
      console.error('Detect error:', error);
      toast.error('检测失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.processedText) {
      navigator.clipboard.writeText(result.processedText);
      toast.success('已复制优化后的文案');
    }
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      default:
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <XCircle className="w-5 h-5" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  const getRiskText = (level: string) => {
    switch (level) {
      case 'high':
        return '高风险';
      case 'medium':
        return '中风险';
      default:
        return '低风险';
    }
  };

  // 高亮显示违禁词
  const highlightText = (text: string, bannedWords: BannedWord[]) => {
    if (!bannedWords.length) return text;
    
    let result = text;
    const sortedWords = [...bannedWords].sort((a, b) => b.word.length - a.word.length);
    
    for (const bw of sortedWords) {
      const regex = new RegExp(bw.word, 'gi');
      result = result.replace(regex, `【${bw.word}】`);
    }
    return result;
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
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">违禁词检测</h1>
              <p className="text-sm text-muted-foreground">智能检测视频文案中的违禁词，确保内容合规</p>
            </div>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 输入区域 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">待检测文案</CardTitle>
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
                placeholder="粘贴需要检测的视频文案...&#10;&#10;支持检测：广告违禁词、敏感词汇、平台限制词等"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[300px] resize-none"
              />
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleDetect}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      检测中...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      开始检测
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
                <CardTitle className="text-base">检测结果</CardTitle>
                {result?.processedText && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleCopy}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    复制优化文案
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>检测结果将显示在这里</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 风险等级 */}
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${getRiskColor(result.riskLevel)}`}>
                    {getRiskIcon(result.riskLevel)}
                    <div>
                      <span className="font-medium">{getRiskText(result.riskLevel)}</span>
                      <span className="text-sm ml-2">发现 {result.bannedWords.length} 个问题词</span>
                    </div>
                  </div>

                  {/* 摘要 */}
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    {result.summary}
                  </div>

                  {/* 违禁词列表 */}
                  {result.bannedWords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">问题词汇详情</h4>
                      <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {result.bannedWords.map((bw, index) => (
                          <div 
                            key={index}
                            className="flex items-start justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-red-600 dark:text-red-400">「{bw.word}」</span>
                                <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                                  {bw.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                建议：{bw.suggestion}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 高亮显示原文 */}
                  {result.bannedWords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">问题标注</h4>
                      <div className="p-3 rounded-lg bg-muted/50 text-sm leading-relaxed max-h-[150px] overflow-y-auto">
                        {highlightText(inputText, result.bannedWords)}
                      </div>
                    </div>
                  )}

                  {/* 优化后的文案 */}
                  {result.processedText && result.bannedWords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-green-600">优化后的文案</h4>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 text-sm leading-relaxed max-h-[150px] overflow-y-auto">
                        {result.processedText}
                      </div>
                    </div>
                  )}
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
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h4 className="font-medium mb-1">检测范围</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>广告法违禁词</strong>：最、第一、顶级、独家等极限词</li>
                  <li>• <strong>平台敏感词</strong>：涉及违规、低俗、政治敏感等内容</li>
                  <li>• <strong>行业限制词</strong>：特定行业的限制性词汇</li>
                  <li>• <strong>虚假宣传词</strong>：可能导致虚假宣传的表述</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
