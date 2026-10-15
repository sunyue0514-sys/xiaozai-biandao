'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Lightbulb,
  Sparkles,
  Image as ImageIcon,
  Link2,
  FileText,
  Video,
  Loader2,
  Plus,
  X,
  ArrowRight,
  Copy,
  Save,
  Wand2,
  Check,
  ListOrdered,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { getToken } from '@/lib/api';

interface InspirationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: number;
}

// 扩展类型 - 简化为3个核心方向
const EXPANSION_TYPES = [
  { 
    value: 'topic', 
    label: '生成选题', 
    description: '把灵感变成3个具体选题', 
    icon: ListOrdered,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
  },
  { 
    value: 'framework', 
    label: '内容框架', 
    description: '生成开头-中间-结尾结构', 
    icon: FileSpreadsheet,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  { 
    value: 'script', 
    label: '口播脚本', 
    description: '直接生成可用脚本', 
    icon: Video,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
  },
];

export function InspirationDialog({ open, onOpenChange, customerId }: InspirationDialogProps) {
  const router = useRouter();
  
  // 表单数据
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // AI扩展
  const [expansionType, setExpansionType] = useState('topic');
  const [expansionResult, setExpansionResult] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [useKnowledge, setUseKnowledge] = useState(true); // 默认使用知识库
  
  // 图片上传
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // 保存状态
  const [isSaving, setIsSaving] = useState(false);

  // 重置表单
  useEffect(() => {
    if (open) {
      setContent('');
      setTags([]);
      setUploadedImage(null);
      setExpansionResult('');
      setExpansionType('topic');
    }
  }, [open]);

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  // 删除标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  // 图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('请上传图片文件');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      toast.success('图片已上传');
    };
    reader.readAsDataURL(file);
  };
  
  // AI扩展
  const handleAIExpansion = async () => {
    if (!content && !uploadedImage) {
      toast.error('请先输入灵感内容');
      return;
    }
    
    setIsExpanding(true);
    setExpansionResult('');
    
    try {
      const token = getToken();
      const response = await fetch('/api/ai/inspiration-expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          type: expansionType,
          imageUrl: uploadedImage,
          useKnowledge,
        }),
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  if (data.content) {
                    setExpansionResult(prev => prev + data.content);
                  }
                  if (data.error) {
                    toast.error(data.error);
                  }
                }
              } catch {
                // 忽略JSON解析错误
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('AI扩展失败:', error);
      toast.error('AI扩展失败，请重试');
    } finally {
      setIsExpanding(false);
    }
  };
  
  // 保存灵感
  const handleSave = async () => {
    if (!content && !uploadedImage) {
      toast.error('请输入灵感内容');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const token = getToken();
      const response = await fetch('/api/inspirations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          imageUrl: uploadedImage,
          category: 'expression',
          tags,
          expansionType,
          expansionResult,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('灵感已保存');
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };
  
  // 复制结果
  const handleCopy = async () => {
    await navigator.clipboard.writeText(expansionResult);
    toast.success('已复制到剪贴板');
  };
  
  // 转为选题
  const handleConvertToTopic = () => {
    handleSave();
    const params = new URLSearchParams({
      inspiration: content,
    });
    if (customerId) {
      params.set('customerId', customerId.toString());
    }
    router.push(`/script/topic?${params.toString()}`);
    onOpenChange(false);
  };
  
  // 转为脚本
  const handleConvertToScript = () => {
    handleSave();
    const params = new URLSearchParams({
      inspiration: content,
      topic: content.slice(0, 50),
    });
    if (customerId) {
      params.set('customerId', customerId.toString());
    }
    router.push(`/script/script?${params.toString()}`);
    onOpenChange(false);
  };

  // 当前扩展类型
  const currentType = EXPANSION_TYPES.find(t => t.value === expansionType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            灵感收集
          </DialogTitle>
          <DialogDescription className="text-base">
            记录灵感，AI帮你快速变成可执行内容
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 pt-2">
          {/* 灵感内容输入 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">灵感内容</Label>
            <Textarea
              placeholder="写下你的灵感...&#10;&#10;例如：今天看到一个有趣的现象，想做一个关于「年轻人为什么不爱打电话」的视频"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="resize-none text-base"
              autoFocus
            />
            
            {/* 图片上传 */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {uploadedImage ? (
                <div className="relative inline-block">
                  <img src={uploadedImage} alt="" className="h-16 rounded-lg border" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => setUploadedImage(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-muted-foreground"
                >
                  <ImageIcon className="w-4 h-4 mr-1" />
                  添加图片
                </Button>
              )}
            </div>
          </div>
          
          {/* 标签 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">标签（可选）</Label>
            <div className="flex gap-2">
              <Input
                placeholder="添加标签"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 font-normal">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* AI扩展类型选择 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">选择扩展方向</Label>
            <div className="grid grid-cols-3 gap-2">
              {EXPANSION_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setExpansionType(type.value)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    expansionType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <type.icon className={`w-5 h-5 mb-1.5 ${type.color}`} />
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{type.description}</div>
                </button>
              ))}
            </div>
          </div>
          
          {/* 知识库开关 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">参考知识库</div>
                <div className="text-xs text-muted-foreground">使用历史内容风格优化生成结果</div>
              </div>
            </div>
            <Switch
              checked={useKnowledge}
              onCheckedChange={setUseKnowledge}
            />
          </div>
          
          {/* AI扩展按钮 */}
          <Button
            onClick={handleAIExpansion}
            className="w-full h-11 text-base bg-gradient-to-r from-primary to-primary/80"
            disabled={isExpanding || (!content && !uploadedImage)}
          >
            {isExpanding ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                AI正在扩展...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                AI扩展灵感
              </>
            )}
          </Button>
          
          {/* 扩展结果 */}
          {expansionResult && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-sm">{currentType?.label}结果</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={handleCopy}>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      复制
                    </Button>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-background whitespace-pre-wrap text-sm max-h-64 overflow-y-auto leading-relaxed">
                  {expansionResult}
                </div>
                
                {/* 下一步操作 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleConvertToTopic}
                    className="flex-1"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    转为选题
                  </Button>
                  <Button
                    onClick={handleConvertToScript}
                    className="flex-1"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    转为脚本
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* 底部按钮 */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || (!content && !uploadedImage)}
              variant="secondary"
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              仅保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
