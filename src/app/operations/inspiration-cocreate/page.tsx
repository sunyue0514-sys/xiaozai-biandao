'use client';

import { useState, useCallback } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Link2, 
  Sparkles, 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Share2, 
  Heart,
  Play,
  Hash,
  Music,
  Loader2,
  Lightbulb,
  Copy,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';

// 苹果风格配色
const APPLE_BLUE = '#007AFF';
const APPLE_GRAY_BG = '#F5F5F7';
const APPLE_TEXT = '#1D1D1F';
const APPLE_GREEN = '#34C759';
const APPLE_RED = '#FF3B30';
const APPLE_ORANGE = '#FF9500';

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

// 平台配置
const PLATFORMS: Record<string, { name: string; icon: string; color: string }> = {
  'douyin': { name: '抖音', icon: '🎵', color: '#000000' },
  'kuaishou': { name: '快手', icon: '⚡', color: '#FF4906' },
  'xiaohongshu': { name: '小红书', icon: '📕', color: '#FF2442' },
  'bilibili': { name: 'B站', icon: '📺', color: '#00A1D6' },
  'weibo': { name: '微博', icon: '📱', color: '#E6162D' },
};

// 视频数据类型
interface VideoData {
  videoId: string;
  title: string;
  description: string;
  coverUrl: string;
  videoUrl: string;
  duration: number;
  author: {
    uid: string;
    name: string;
    avatar: string;
    signature?: string;
    followerCount?: number;
  };
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  views?: number;
  createdAt: string;
  hashtags: string[];
  music?: {
    title: string;
    author: string;
  };
  platform: string;
}

// AI分析结果类型
interface AIAnalysis {
  viralFactors: string[];
  contentStrategy: string[];
  creativeSuggestions: string[];
  targetAudience: string;
}

// 视频深度分析结果类型
interface DeepAnalysis {
  scriptContent: string;
  scriptStructure?: {
    hook: string;
    mainPoints: string[];
    conclusion: string;
  };
  visualDescription?: string;
  emotionalTone?: string;
  targetAudience?: string;
  viralFactors?: string[];
  creativeSuggestions?: string[];
}

export default function InspirationCoCreatePage() {
  const [link, setLink] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // 解析视频链接
  const handleParse = useCallback(async () => {
    if (!link.trim()) {
      setError('请粘贴视频链接');
      return;
    }

    setIsParsing(true);
    setError(null);
    setVideoData(null);
    setAiAnalysis(null);

    try {
      const response = await fetch('/api/douyin/parse-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || '解析失败');
        return;
      }

      setVideoData(result.data);

      // 自动开始AI分析
      handleAnalyze(result.data);

    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsParsing(false);
    }
  }, [link]);

  // AI分析爆款特征
  const handleAnalyze = async (data: VideoData) => {
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/ai/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'viral_analysis',
          data: {
            title: data.title,
            description: data.description,
            hashtags: data.hashtags,
            likes: data.likes,
            comments: data.comments,
            shares: data.shares,
            collects: data.collects,
            views: data.views,
            author: data.author,
            platform: data.platform,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiAnalysis(result.analysis);
      }
    } catch (err) {
      console.error('AI分析失败:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 深度分析 - 提取口播文案
  const handleDeepAnalyze = async () => {
    if (!link.trim()) return;
    
    setIsDeepAnalyzing(true);
    setDeepAnalysis(null);

    try {
      const response = await fetch('/api/video/deep-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setDeepAnalysis({
          scriptContent: result.data.scriptContent,
          scriptStructure: result.data.scriptStructure,
          visualDescription: result.data.visualDescription,
          emotionalTone: result.data.emotionalTone,
          targetAudience: result.data.targetAudience,
          viralFactors: result.data.viralFactors,
          creativeSuggestions: result.data.creativeSuggestions,
        });
      } else {
        console.error('深度分析失败:', result.error);
      }
    } catch (err) {
      console.error('深度分析失败:', err);
    } finally {
      setIsDeepAnalyzing(false);
    }
  };

  // 复制功能
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // 重置
  const handleReset = () => {
    setLink('');
    setVideoData(null);
    setAiAnalysis(null);
    setDeepAnalysis(null);
    setError(null);
  };

  const platformInfo = videoData ? PLATFORMS[videoData.platform] : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${APPLE_BLUE}, #5856D6)` }}
          >
            <Lightbulb className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: APPLE_TEXT }}>灵感共创</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              粘贴爆款视频链接，AI分析爆款特征，生成创作灵感
            </p>
          </div>
        </div>

        {/* 主要内容区 */}
        {!videoData ? (
          /* 输入区 */
          <Card 
            className="border-0"
            style={{ 
              borderRadius: '24px',
              background: 'white',
            }}
          >
            <CardContent className="p-8">
              {/* 粘贴区域 */}
              <div 
                className="relative rounded-2xl p-6 border-2 border-dashed transition-all duration-200 cursor-pointer hover:border-solid"
                style={{ 
                  borderColor: error ? APPLE_RED : APPLE_BLUE + '40',
                  background: APPLE_GRAY_BG,
                }}
              >
                <div className="flex flex-col items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: APPLE_BLUE + '15' }}
                  >
                    <Link2 className="w-8 h-8" style={{ color: APPLE_BLUE }} />
                  </div>
                  <div className="text-center">
                    <p className="font-medium" style={{ color: APPLE_TEXT }}>
                      粘贴视频链接
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      支持抖音、快手、小红书、B站、微博等平台
                    </p>
                  </div>
                  
                  <Textarea
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://v.douyin.com/xxx 或直接粘贴分享口令"
                    className="w-full h-24 resize-none text-center"
                    style={{ 
                      background: 'white',
                      borderRadius: '16px',
                      fontSize: '14px',
                    }}
                  />

                  {/* 支持平台标签 */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {Object.entries(PLATFORMS).map(([key, platform]) => (
                      <Badge 
                        key={key}
                        variant="secondary"
                        className="gap-1.5 font-normal"
                        style={{ 
                          background: 'white',
                          borderRadius: '8px',
                          padding: '6px 12px',
                        }}
                      >
                        <span>{platform.icon}</span>
                        {platform.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div 
                  className="flex items-center gap-2 p-4 rounded-xl mt-4"
                  style={{ background: APPLE_RED + '10' }}
                >
                  <AlertCircle className="w-5 h-5" style={{ color: APPLE_RED }} />
                  <span className="text-sm" style={{ color: APPLE_RED }}>{error}</span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-center mt-6">
                <Button
                  onClick={handleParse}
                  disabled={isParsing || !link.trim()}
                  className="gap-2 px-8 py-6 text-base font-medium"
                  style={{ 
                    background: APPLE_BLUE,
                    borderRadius: '14px',
                  }}
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在解析...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      开始解析
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* 结果展示区 */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：视频信息 */}
            <div className="space-y-5">
              {/* 视频卡片 */}
              <Card 
                className="border-0 overflow-hidden"
                style={{ borderRadius: '24px' }}
              >
                {/* 封面 */}
                <div className="relative aspect-[9/12]">
                  <img 
                    src={videoData.coverUrl} 
                    alt={videoData.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* 平台标签 */}
                  {platformInfo && (
                    <div 
                      className="absolute top-4 left-4 px-3 py-1.5 rounded-full flex items-center gap-1.5"
                      style={{ background: 'white' }}
                    >
                      <span>{platformInfo.icon}</span>
                      <span className="text-sm font-medium" style={{ color: platformInfo.color }}>
                        {platformInfo.name}
                      </span>
                    </div>
                  )}

                  {/* 播放按钮 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                      style={{ background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
                    >
                      <Play className="w-7 h-7 ml-1" style={{ color: APPLE_TEXT }} fill={APPLE_TEXT} />
                    </div>
                  </div>

                  {/* 底部标题 */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-white text-base font-medium line-clamp-2">
                      {videoData.title}
                    </p>
                  </div>
                </div>

                <CardContent className="p-5">
                  {/* 作者信息 */}
                  <div className="flex items-center gap-3 mb-5">
                    <img 
                      src={videoData.author.avatar}
                      alt={videoData.author.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" style={{ color: APPLE_TEXT }}>
                        {videoData.author.name}
                      </p>
                      {videoData.author.followerCount && (
                        <p className="text-xs text-muted-foreground">
                          粉丝 {formatNumber(videoData.author.followerCount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 数据指标 */}
                  <div className="grid grid-cols-4 gap-3">
                    <div 
                      className="text-center p-3 rounded-xl"
                      style={{ background: APPLE_GRAY_BG }}
                    >
                      <Heart className="w-5 h-5 mx-auto mb-1" style={{ color: APPLE_RED }} />
                      <p className="text-sm font-semibold" style={{ color: APPLE_TEXT }}>
                        {formatNumber(videoData.likes)}
                      </p>
                      <p className="text-xs text-muted-foreground">点赞</p>
                    </div>
                    <div 
                      className="text-center p-3 rounded-xl"
                      style={{ background: APPLE_GRAY_BG }}
                    >
                      <MessageCircle className="w-5 h-5 mx-auto mb-1" style={{ color: APPLE_BLUE }} />
                      <p className="text-sm font-semibold" style={{ color: APPLE_TEXT }}>
                        {formatNumber(videoData.comments)}
                      </p>
                      <p className="text-xs text-muted-foreground">评论</p>
                    </div>
                    <div 
                      className="text-center p-3 rounded-xl"
                      style={{ background: APPLE_GRAY_BG }}
                    >
                      <Share2 className="w-5 h-5 mx-auto mb-1" style={{ color: APPLE_GREEN }} />
                      <p className="text-sm font-semibold" style={{ color: APPLE_TEXT }}>
                        {formatNumber(videoData.shares)}
                      </p>
                      <p className="text-xs text-muted-foreground">分享</p>
                    </div>
                    <div 
                      className="text-center p-3 rounded-xl"
                      style={{ background: APPLE_GRAY_BG }}
                    >
                      <TrendingUp className="w-5 h-5 mx-auto mb-1" style={{ color: APPLE_ORANGE }} />
                      <p className="text-sm font-semibold" style={{ color: APPLE_TEXT }}>
                        {formatNumber(videoData.collects)}
                      </p>
                      <p className="text-xs text-muted-foreground">收藏</p>
                    </div>
                  </div>

                  {/* 标签 */}
                  {videoData.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {videoData.hashtags.map((tag, index) => (
                        <Badge 
                          key={index}
                          variant="secondary"
                          className="gap-1"
                          style={{ 
                            background: APPLE_BLUE + '10',
                            color: APPLE_BLUE,
                            borderRadius: '8px',
                          }}
                        >
                          <Hash className="w-3 h-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 音乐 */}
                  {videoData.music && (
                    <div 
                      className="flex items-center gap-2 mt-4 p-3 rounded-xl"
                      style={{ background: APPLE_GRAY_BG }}
                    >
                      <Music className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">
                        {videoData.music.title}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 深度分析 - 提取口播文案 */}
              <Button
                onClick={handleDeepAnalyze}
                disabled={isDeepAnalyzing}
                className="w-full gap-2"
                style={{ 
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${APPLE_BLUE}, #5856D6)`,
                }}
              >
                {isDeepAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    正在提取文案...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    提取口播文案
                  </>
                )}
              </Button>

              {/* 重新解析 */}
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full gap-2"
                style={{ borderRadius: '12px' }}
              >
                <RefreshCw className="w-4 h-4" />
                解析其他视频
              </Button>
            </div>

            {/* 右侧：AI分析 */}
            <div className="space-y-5">
              {/* AI分析卡片 */}
              <Card 
                className="border-0"
                style={{ borderRadius: '24px' }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${APPLE_ORANGE}, #FF6B6B)` }}
                    >
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base" style={{ color: APPLE_TEXT }}>爆款特征分析</CardTitle>
                      <CardDescription className="text-xs">AI 解析视频成功要素</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: APPLE_BLUE }} />
                      <p className="text-sm text-muted-foreground mt-3">AI 正在分析...</p>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-5">
                      {/* 爆款因素 */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: APPLE_TEXT }}>
                          <TrendingUp className="w-4 h-4" style={{ color: APPLE_RED }} />
                          爆款因素
                        </h4>
                        <div className="space-y-2">
                          {aiAnalysis.viralFactors.map((factor, index) => (
                            <div 
                              key={index}
                              className="flex items-start gap-3 p-3 rounded-xl"
                              style={{ background: APPLE_GRAY_BG }}
                            >
                              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: APPLE_GREEN }} />
                              <span className="text-sm" style={{ color: APPLE_TEXT }}>{factor}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 创作建议 */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2" style={{ color: APPLE_TEXT }}>
                          <Lightbulb className="w-4 h-4" style={{ color: APPLE_ORANGE }} />
                          创作建议
                        </h4>
                        <div className="space-y-2">
                          {aiAnalysis.creativeSuggestions.map((suggestion, index) => (
                            <div 
                              key={index}
                              className="flex items-start justify-between gap-2 p-3 rounded-xl group"
                              style={{ background: APPLE_GRAY_BG }}
                            >
                              <span className="text-sm" style={{ color: APPLE_TEXT }}>{suggestion}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                                onClick={() => handleCopy(suggestion, `suggestion-${index}`)}
                              >
                                {copied === `suggestion-${index}` ? (
                                  <CheckCircle className="w-4 h-4" style={{ color: APPLE_GREEN }} />
                                ) : (
                                  <Copy className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      等待 AI 分析...
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 目标受众 */}
              {aiAnalysis && (
                <Card 
                  className="border-0"
                  style={{ borderRadius: '24px' }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: APPLE_BLUE + '15' }}
                      >
                        <Users className="w-5 h-5" style={{ color: APPLE_BLUE }} />
                      </div>
                      <div>
                        <CardTitle className="text-base" style={{ color: APPLE_TEXT }}>目标受众</CardTitle>
                        <CardDescription className="text-xs">适合哪类人群</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm" style={{ color: APPLE_TEXT }}>{aiAnalysis.targetAudience}</p>
                  </CardContent>
                </Card>
              )}

              {/* 深度分析结果 - 口播文案 */}
              {deepAnalysis && (
                <Card 
                  className="border-0"
                  style={{ borderRadius: '24px' }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${APPLE_GREEN}, #30D158)` }}
                        >
                          <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base" style={{ color: APPLE_TEXT }}>口播文案</CardTitle>
                          <CardDescription className="text-xs">Vision AI 提取的视频文案</CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(deepAnalysis.scriptContent, 'script')}
                        className="gap-1"
                      >
                        {copied === 'script' ? (
                          <>
                            <CheckCircle className="w-4 h-4" style={{ color: APPLE_GREEN }} />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            复制
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 完整文案 */}
                    <div 
                      className="p-4 rounded-xl"
                      style={{ background: APPLE_GRAY_BG }}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: APPLE_TEXT }}>
                        {deepAnalysis.scriptContent}
                      </p>
                    </div>

                    {/* 文案结构 */}
                    {deepAnalysis.scriptStructure && (
                      <div className="space-y-3">
                        {deepAnalysis.scriptStructure.hook && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1.5">开头钩子</h5>
                            <p className="text-sm p-3 rounded-xl" style={{ background: APPLE_GRAY_BG, color: APPLE_TEXT }}>
                              {deepAnalysis.scriptStructure.hook}
                            </p>
                          </div>
                        )}
                        {deepAnalysis.scriptStructure.mainPoints && deepAnalysis.scriptStructure.mainPoints.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1.5">主要观点</h5>
                            <div className="space-y-1.5">
                              {deepAnalysis.scriptStructure.mainPoints.map((point, index) => (
                                <div key={index} className="flex items-start gap-2 text-sm p-2 rounded-lg" style={{ background: APPLE_GRAY_BG }}>
                                  <span className="font-medium" style={{ color: APPLE_BLUE }}>{index + 1}.</span>
                                  <span style={{ color: APPLE_TEXT }}>{point}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {deepAnalysis.scriptStructure.conclusion && (
                          <div>
                            <h5 className="text-xs font-medium text-muted-foreground mb-1.5">结尾</h5>
                            <p className="text-sm p-3 rounded-xl" style={{ background: APPLE_GRAY_BG, color: APPLE_TEXT }}>
                              {deepAnalysis.scriptStructure.conclusion}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 画面描述 */}
                    {deepAnalysis.visualDescription && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground mb-1.5">画面描述</h5>
                        <p className="text-sm p-3 rounded-xl" style={{ background: APPLE_GRAY_BG, color: APPLE_TEXT }}>
                          {deepAnalysis.visualDescription}
                        </p>
                      </div>
                    )}

                    {/* 情感基调 */}
                    {deepAnalysis.emotionalTone && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground mb-1.5">情感基调</h5>
                        <p className="text-sm p-3 rounded-xl" style={{ background: APPLE_GRAY_BG, color: APPLE_TEXT }}>
                          {deepAnalysis.emotionalTone}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
