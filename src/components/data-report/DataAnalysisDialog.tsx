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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Image as ImageIcon,
  FileText,
  Sparkles,
  Loader2,
  Copy,
  Download,
  X,
  Plus,
  Info,
  Activity,
  Search,
  Target,
  Lightbulb,
  CheckCircle,
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

// 分析场景配置
const ANALYSIS_SCENES = [
  {
    id: 'account',
    name: '账号诊断',
    desc: '分析账号整体健康度',
    icon: Activity,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    uploadHint: '上传平台后台的「数据总览页」和「内容数据页」截图',
    uploadTypes: ['总览数据', '内容列表'],
    outputHint: ['健康度评分', '数据趋势', '问题诊断', '行动建议'],
  },
  {
    id: 'content',
    name: '内容分析',
    desc: '爆款/凉款归因分析',
    icon: Search,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    uploadHint: '上传内容列表页和单条内容详情页截图',
    uploadTypes: ['内容列表', '爆款详情', '凉款详情'],
    outputHint: ['爆款归因', '凉款诊断', '成功公式', '改进建议'],
  },
  {
    id: 'competitor',
    name: '竞品对标',
    desc: '分析差距与学习方向',
    icon: Target,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    uploadHint: '上传竞品主页截图和竞品内容列表截图',
    uploadTypes: ['竞品主页', '竞品内容', '我的内容'],
    outputHint: ['差距分析', '学习要点', '差异化机会', '对标建议'],
  },
  {
    id: 'topic',
    name: '选题机会',
    desc: '发现创作方向和机会',
    icon: Lightbulb,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    uploadHint: '上传自己的内容列表和竞品内容列表截图',
    uploadTypes: ['我的内容', '竞品内容', '热点内容'],
    outputHint: ['选题机会', '内容差距', '趋势洞察', '创作建议'],
  },
];

interface DataAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultScene?: string;
}

interface UploadedImage {
  id: string;
  url: string;
  file?: File;
}

export function DataAnalysisDialog({ open, onOpenChange, defaultScene }: DataAnalysisDialogProps) {
  // 场景选择
  const [scene, setScene] = useState(defaultScene || 'account');
  
  // 表单数据
  const [platform, setPlatform] = useState('douyin');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [notes, setNotes] = useState('');
  
  // 生成状态
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportResult, setReportResult] = useState('');
  
  // 文件上传ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取当前场景配置
  const currentScene = ANALYSIS_SCENES.find(s => s.id === scene) || ANALYSIS_SCENES[0];

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages: UploadedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newImages.push({
        id: `img-${Date.now()}-${i}`,
        url,
        file,
      });
    }
    
    setImages(prev => [...prev, ...newImages].slice(0, 8)); // 最多8张
  };

  // 删除图片
  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img?.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  // 生成分析报告
  const handleGenerate = async () => {
    if (images.length === 0) {
      toast.error('请至少上传一张截图');
      return;
    }

    setIsGenerating(true);
    setReportResult('');

    try {
      const token = getToken();
      
      // 构建FormData
      const formData = new FormData();
      formData.append('scene', scene);
      formData.append('platform', platform);
      formData.append('notes', notes);
      
      // 添加图片文件
      images.forEach((img, index) => {
        if (img.file) {
          formData.append(`image_${index}`, img.file);
        }
      });
      formData.append('imageCount', images.length.toString());

      const response = await fetch('/api/ai/data-analysis', {
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

      toast.success('分析报告生成完成');
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
    link.download = `${currentScene.name}报告_${new Date().toLocaleDateString('zh-CN')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('已导出文件');
  };

  // 重置表单
  const resetForm = () => {
    setImages([]);
    setNotes('');
    setReportResult('');
  };

  // 关闭时重置
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // 切换场景时重置
  const handleSceneChange = (newScene: string) => {
    setScene(newScene);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ImageIcon className="w-5 h-5 text-primary" />
            数据分析中心
          </DialogTitle>
          <DialogDescription>
            上传截图，AI自动识别并生成专业分析报告
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* 分析场景选择 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">选择分析场景</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ANALYSIS_SCENES.map(s => {
                const Icon = s.icon;
                const isActive = scene === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSceneChange(s.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? `${s.borderColor} ${s.bgColor}`
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${isActive ? s.color : 'text-muted-foreground'}`} />
                      <span className={`font-medium ${isActive ? s.color : ''}`}>{s.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-border" />

          {/* 平台选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">选择平台</Label>
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
          </div>

          {/* 分隔线 */}
          <div className="border-t border-border" />

          {/* 截图上传区 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">上传截图</Label>
              <span className="text-xs text-muted-foreground">最多上传8张</span>
            </div>

            {/* 上传提示 */}
            <div className={`p-3 rounded-xl ${currentScene.bgColor} ${currentScene.borderColor} border`}>
              <div className="flex items-start gap-2">
                <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${currentScene.color}`} />
                <div className="text-xs space-y-1">
                  <p className={currentScene.color}>{currentScene.uploadHint}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentScene.uploadTypes.map((type, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 图片列表 */}
            <div className="grid grid-cols-4 gap-3">
              {images.map(img => (
                <div key={img.id} className="relative group aspect-video">
                  <img
                    src={img.url}
                    alt="截图"
                    className="w-full h-full object-cover rounded-xl border"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {images.length < 8 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Plus className="w-8 h-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">上传截图</span>
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* 补充说明 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">补充说明（选填）</Label>
            <Textarea
              placeholder="例如：想重点分析粉丝增长问题、想了解为什么最近播放下降..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </div>

          {/* 输出预览 */}
          <div className="p-4 rounded-xl bg-muted/50 border">
            <p className="text-sm font-medium mb-2">分析报告将包含：</p>
            <div className="flex flex-wrap gap-2">
              {currentScene.outputHint.map((hint, i) => (
                <span key={i} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {hint}
                </span>
              ))}
            </div>
          </div>

          {/* 生成按钮 */}
          <Button
            onClick={handleGenerate}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-6 text-base rounded-xl transition-all active:scale-[0.98]"
            disabled={images.length === 0 || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                AI正在分析中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                开始分析
              </>
            )}
          </Button>

          {/* 报告结果 */}
          {reportResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <Label className="font-medium">{currentScene.name}报告</Label>
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
              <div className="p-4 rounded-xl bg-muted/50 border text-sm max-h-[500px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {reportResult}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
