'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Loader2,
  Copy,
  Download,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '@/lib/api';

// 平台配置
const PLATFORMS = [
  { id: 'douyin', name: '抖音', icon: '🎵' },
  { id: 'xiaohongshu', name: '小红书', icon: '📕' },
  { id: 'bilibili', name: 'B站', icon: '📺' },
  { id: 'weixin', name: '公众号', icon: '💬' },
  { id: 'kuaishou', name: '快手', icon: '⚡' },
];

// 报告类型
const REPORT_TYPES = [
  { id: 'operation', name: '运营诊断', desc: '分析账号运营健康度' },
  { id: 'content', name: '内容分析', desc: '分析内容表现规律' },
  { id: 'growth', name: '增长策略', desc: '提供增长方向建议' },
];

interface DataReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UploadedImage {
  id: string;
  url: string;
  file?: File;
  type: 'screenshot' | 'cover';
}

export function DataReportDialog({ open, onOpenChange }: DataReportDialogProps) {
  // 步骤状态
  const [activeStep, setActiveStep] = useState(1);
  
  // 表单数据
  const [platform, setPlatform] = useState('douyin');
  const [reportType, setReportType] = useState('operation');
  const [screenshotImages, setScreenshotImages] = useState<UploadedImage[]>([]);
  const [coverImages, setCoverImages] = useState<UploadedImage[]>([]);
  const [titles, setTitles] = useState('');
  const [metrics, setMetrics] = useState('');
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState('');
  const [reportLevel, setReportLevel] = useState<'basic' | 'standard' | 'deep'>('basic');
  
  // 文件上传ref
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // 展开/折叠状态
  const [showOptional, setShowOptional] = useState(false);

  // 处理截图上传
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newImages.push({
        id: `screenshot-${Date.now()}-${i}`,
        url,
        file,
        type: 'screenshot',
      });
    }
    
    setScreenshotImages(prev => [...prev, ...newImages].slice(0, 5)); // 最多5张
  };

  // 处理封面上传
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newImages.push({
        id: `cover-${Date.now()}-${i}`,
        url,
        file,
        type: 'cover',
      });
    }
    
    setCoverImages(prev => [...prev, ...newImages].slice(0, 10)); // 最多10张
  };

  // 删除图片
  const removeImage = (id: string, type: 'screenshot' | 'cover') => {
    if (type === 'screenshot') {
      setScreenshotImages(prev => {
        const img = prev.find(i => i.id === id);
        if (img?.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
        return prev.filter(i => i.id !== id);
      });
    } else {
      setCoverImages(prev => {
        const img = prev.find(i => i.id === id);
        if (img?.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
        return prev.filter(i => i.id !== id);
      });
    }
  };

  // 计算报告级别
  const calculateReportLevel = (): 'basic' | 'standard' | 'deep' => {
    if (screenshotImages.length > 0 && titles.trim().length > 50 && coverImages.length > 0) {
      return 'deep';
    } else if (screenshotImages.length > 0 && titles.trim().length > 50) {
      return 'standard';
    }
    return 'basic';
  };

  // 生成报告
  const handleGenerateReport = async () => {
    if (screenshotImages.length === 0) {
      toast.error('请至少上传一张数据截图');
      return;
    }

    const level = calculateReportLevel();
    setReportLevel(level);
    setIsGenerating(true);
    setReportResult('');

    try {
      const token = getToken();
      
      // 构建FormData
      const formData = new FormData();
      formData.append('platform', platform);
      formData.append('reportType', reportType);
      formData.append('titles', titles);
      formData.append('metrics', metrics);
      formData.append('reportLevel', level);
      
      // 添加截图文件
      screenshotImages.forEach((img, index) => {
        if (img.file) {
          formData.append(`screenshot_${index}`, img.file);
        }
      });
      formData.append('screenshotCount', screenshotImages.length.toString());
      
      // 添加封面文件
      coverImages.forEach((img, index) => {
        if (img.file) {
          formData.append(`cover_${index}`, img.file);
        }
      });
      formData.append('coverCount', coverImages.length.toString());

      const response = await fetch('/api/ai/data-report-v2', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成失败');
      }

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
                  setReportResult(prev => prev + data.content);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }

      toast.success('报告生成完成');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 复制结果
  const handleCopy = () => {
    navigator.clipboard.writeText(reportResult);
    toast.success('已复制到剪贴板');
  };

  // 导出结果
  const handleExport = () => {
    const blob = new Blob([reportResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `数据诊断报告_${new Date().toLocaleDateString('zh-CN')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('已导出文件');
  };

  // 重置表单
  const resetForm = () => {
    setScreenshotImages([]);
    setCoverImages([]);
    setTitles('');
    setMetrics('');
    setReportResult('');
    setActiveStep(1);
  };

  // 关闭时重置
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const canGenerate = screenshotImages.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ImageIcon className="w-5 h-5 text-primary" />
            数据诊断报告
          </DialogTitle>
          <DialogDescription>
            上传数据截图，AI自动识别并生成专业诊断报告
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* 第一步：数据截图（必填） */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center font-medium">
                1
              </div>
              <Label className="text-base font-semibold">数据截图</Label>
              <span className="text-xs text-red-500">*必填</span>
            </div>
            
            {/* 平台选择 */}
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    platform === p.id
                      ? 'bg-primary text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>

            {/* 截图上传区 */}
            <div className="grid grid-cols-5 gap-3">
              {screenshotImages.map(img => (
                <div key={img.id} className="relative group aspect-square">
                  <img
                    src={img.url}
                    alt="截图"
                    className="w-full h-full object-cover rounded-xl border"
                  />
                  <button
                    onClick={() => removeImage(img.id, 'screenshot')}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {screenshotImages.length < 5 && (
                <button
                  onClick={() => screenshotInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">添加截图</span>
                </button>
              )}
            </div>
            
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleScreenshotUpload}
            />

            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                建议上传：平台后台的「数据总览页」和「内容数据页」截图，AI将自动识别粉丝数、播放量、互动数据等指标
              </p>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-border" />

          {/* 第二步：内容分析（选填） */}
          <div className="space-y-4">
            <button
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-2 w-full text-left"
            >
              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm flex items-center justify-center font-medium">
                2
              </div>
              <Label className="text-base font-semibold">内容分析</Label>
              <span className="text-xs text-muted-foreground">（选填，可获得更深度分析）</span>
              {showOptional ? (
                <ChevronUp className="w-4 h-4 ml-auto text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
              )}
            </button>

            {showOptional && (
              <div className="space-y-4 pl-8">
                {/* 标题列表 */}
                <div className="space-y-2">
                  <Label className="text-sm">视频标题列表</Label>
                  <Textarea
                    placeholder="粘贴你的视频标题，每行一个，建议10-20条&#10;&#10;例如：&#10;一个人赚不到钱的核心原因就是：上班上多了&#10;副业思维锁死了一个人的财富上限&#10;AI短视频平台真的来了！"
                    value={titles}
                    onChange={e => setTitles(e.target.value)}
                    className="min-h-[120px] text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    提供标题可分析：关键词提取、标题公式、选题分布
                  </p>
                </div>

                {/* 视频封面 */}
                <div className="space-y-2">
                  <Label className="text-sm">视频封面图（可选）</Label>
                  <div className="grid grid-cols-5 gap-3">
                    {coverImages.map(img => (
                      <div key={img.id} className="relative group aspect-video">
                        <img
                          src={img.url}
                          alt="封面"
                          className="w-full h-full object-cover rounded-lg border"
                        />
                        <button
                          onClick={() => removeImage(img.id, 'cover')}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {coverImages.length < 10 && (
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        className="aspect-video border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <Plus className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">封面</span>
                      </button>
                    )}
                  </div>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <p className="text-xs text-muted-foreground">
                    上传封面可分析：封面设计风格、封面文字规律、点击率优化
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div className="border-t border-border" />

          {/* 报告配置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm flex items-center justify-center font-medium">
                3
              </div>
              <Label className="text-base font-semibold">报告配置</Label>
            </div>

            <div className="grid grid-cols-2 gap-4 pl-8">
              <div className="space-y-2">
                <Label className="text-sm">报告类型</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div>
                          <div className="font-medium">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">关注指标（选填）</Label>
                <Textarea
                  placeholder="如：粉丝增长、转化率..."
                  value={metrics}
                  onChange={e => setMetrics(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              </div>
            </div>
          </div>

          {/* 报告级别提示 */}
          {canGenerate && (
            <div className={`p-4 rounded-xl ${
              calculateReportLevel() === 'deep' 
                ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                : calculateReportLevel() === 'standard'
                ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800'
                : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {calculateReportLevel() === 'deep' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : calculateReportLevel() === 'standard' ? (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
                <span className="font-medium">
                  {calculateReportLevel() === 'deep' 
                    ? '深度诊断报告' 
                    : calculateReportLevel() === 'standard'
                    ? '标准诊断报告'
                    : '基础诊断报告'}
                </span>
              </div>
              <ul className="text-xs space-y-1 text-muted-foreground ml-7">
                {calculateReportLevel() === 'basic' && (
                  <>
                    <li>✓ 账号健康度评分</li>
                    <li>✓ 数据趋势分析</li>
                    <li>✓ 爆款/凉款识别</li>
                    <li className="text-amber-600 dark:text-amber-400">○ 添加标题可获得内容分析</li>
                  </>
                )}
                {calculateReportLevel() === 'standard' && (
                  <>
                    <li>✓ 账号健康度评分</li>
                    <li>✓ 数据趋势分析</li>
                    <li>✓ 爆款/凉款识别</li>
                    <li>✓ 关键词分析</li>
                    <li>✓ 标题公式提取</li>
                    <li className="text-blue-600 dark:text-blue-400">○ 添加封面可获得视觉分析</li>
                  </>
                )}
                {calculateReportLevel() === 'deep' && (
                  <>
                    <li>✓ 账号健康度评分</li>
                    <li>✓ 数据趋势分析</li>
                    <li>✓ 爆款/凉款识别</li>
                    <li>✓ 关键词分析</li>
                    <li>✓ 标题公式提取</li>
                    <li>✓ 封面设计分析</li>
                    <li>✓ 完整行动清单</li>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* 生成按钮 */}
          <Button
            onClick={handleGenerateReport}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6 text-base rounded-xl transition-all active:scale-[0.98]"
            disabled={!canGenerate || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                AI正在分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                生成报告
              </>
            )}
          </Button>

          {/* 报告结果 */}
          {reportResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <Label className="font-medium">诊断报告</Label>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {reportLevel === 'deep' ? '深度版' : reportLevel === 'standard' ? '标准版' : '基础版'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    <Copy className="w-3 h-3 mr-1" />复制
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExport}>
                    <Download className="w-3 h-3 mr-1" />导出
                  </Button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border text-sm max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {reportResult}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
