'use client';

import { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, Eye, Sparkles, Check, Plus, X } from 'lucide-react';
import {
  IDENTITY_TAGS,
  PERSONALITY_TAGS,
  EDUCATION_OPTIONS,
  STEP_GUIDES,
  STEP_EXAMPLES,
} from '@/lib/ip-positioning-config';

interface BasicInfoStepProps {
  formData: {
    identity: string[];
    nickname: string;
    age: string;
    education: string;
    location: string;
    appearance: string;
    personality: string[];
    othersEvaluation: string;
    familyInfluence: string;
    values: {
      lifeView: string;
      careerView: string;
      marriageView: string;
    };
  };
  setFormData: (data: BasicInfoStepProps['formData']) => void;
}

const BasicInfoStepComponent = ({ formData, setFormData }: BasicInfoStepProps) => {
  const [showGuide, setShowGuide] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [customIdentity, setCustomIdentity] = useState('');
  const [customPersonality, setCustomPersonality] = useState('');

  const toggleTag = (field: 'identity' | 'personality', value: string) => {
    const current = formData[field];
    const newValue = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: newValue });
  };

  const addCustomTag = (field: 'identity' | 'personality', value: string) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData({ ...formData, [field]: [...formData[field], value.trim()] });
      if (field === 'identity') setCustomIdentity('');
      if (field === 'personality') setCustomPersonality('');
    }
  };

  const removeTag = (field: 'identity' | 'personality', value: string) => {
    setFormData({ ...formData, [field]: formData[field].filter((v) => v !== value) });
  };

  return (
    <div className="space-y-6">
      {/* 填写指南 */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-blue-800 dark:text-blue-200">
                  {STEP_GUIDES.basicInfo.title}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => setShowExample(true)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  查看示例
                </Button>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 whitespace-pre-line">
                {STEP_GUIDES.basicInfo.content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 身份定位 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          身份定位
          <span className="text-xs text-muted-foreground">(可多选)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {IDENTITY_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={formData.identity.includes(tag) ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1.5 ${
                formData.identity.includes(tag) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => toggleTag('identity', tag)}
            >
              {formData.identity.includes(tag) && <Check className="w-3 h-3 mr-1" />}
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="自定义身份标签..."
            value={customIdentity}
            onChange={(e) => setCustomIdentity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTag('identity', customIdentity)}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={() => addCustomTag('identity', customIdentity)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.identity.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.identity.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeTag('identity', tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 基础信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>昵称</Label>
          <Input
            placeholder="请输入昵称"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>年龄</Label>
          <Input
            placeholder="请输入年龄"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>学历</Label>
          <div className="flex flex-wrap gap-2">
            {EDUCATION_OPTIONS.map((edu) => (
              <Badge
                key={edu}
                variant={formData.education === edu ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  formData.education === edu ? 'bg-primary text-primary-foreground' : ''
                }`}
                onClick={() => setFormData({ ...formData, education: edu })}
              >
                {edu}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>长居地</Label>
          <Input
            placeholder="请输入长居地"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
      </div>

      {/* 外貌特征 */}
      <div className="space-y-2">
        <Label>外貌特征</Label>
        <Textarea
          placeholder="请描述您的外貌特征，如身高、体型、穿衣风格等（可选）"
          value={formData.appearance}
          onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
          className="min-h-[60px]"
        />
      </div>

      {/* 性格特点 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          性格特点
          <span className="text-xs text-muted-foreground">(可多选)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={formData.personality.includes(tag) ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1.5 ${
                formData.personality.includes(tag) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => toggleTag('personality', tag)}
            >
              {formData.personality.includes(tag) && <Check className="w-3 h-3 mr-1" />}
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="自定义性格标签..."
            value={customPersonality}
            onChange={(e) => setCustomPersonality(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTag('personality', customPersonality)}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={() => addCustomTag('personality', customPersonality)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.personality.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.personality.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeTag('personality', tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 他人评价 */}
      <div className="space-y-2">
        <Label>身边人的评价</Label>
        <Textarea
          placeholder="朋友、家人、同事通常怎么评价您？（可选）"
          value={formData.othersEvaluation}
          onChange={(e) => setFormData({ ...formData, othersEvaluation: e.target.value })}
          className="min-h-[60px]"
        />
      </div>

      {/* 原生家庭影响 */}
      <div className="space-y-2">
        <Label>原生家庭影响</Label>
        <Textarea
          placeholder="原生家庭对您的影响，塑造了您哪些性格特质？（可选）"
          value={formData.familyInfluence}
          onChange={(e) => setFormData({ ...formData, familyInfluence: e.target.value })}
          className="min-h-[60px]"
        />
      </div>

      {/* 价值观 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            价值观
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>人生观</Label>
            <Textarea
              placeholder="您对人生的看法和态度..."
              value={formData.values.lifeView}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  values: { ...formData.values, lifeView: e.target.value },
                })
              }
              className="min-h-[60px]"
            />
          </div>
          <div className="space-y-2">
            <Label>事业观</Label>
            <Textarea
              placeholder="您对事业的看法和追求..."
              value={formData.values.careerView}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  values: { ...formData.values, careerView: e.target.value },
                })
              }
              className="min-h-[60px]"
            />
          </div>
          <div className="space-y-2">
            <Label>婚姻观</Label>
            <Textarea
              placeholder="您对婚姻家庭的看法...（可选）"
              value={formData.values.marriageView}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  values: { ...formData.values, marriageView: e.target.value },
                })
              }
              className="min-h-[60px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 示例对话框 */}
      <Dialog open={showExample} onOpenChange={setShowExample}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>填写示例 - 个人基础信息</DialogTitle>
            <DialogDescription>参考以下示例来填写您的个人信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <Label className="font-medium">身份定位</Label>
              <div className="flex gap-2 mt-1">
                <Badge>{STEP_EXAMPLES.basicInfo.identity}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-medium">昵称</Label>
                <p className="text-muted-foreground">{STEP_EXAMPLES.basicInfo.nickname}</p>
              </div>
              <div>
                <Label className="font-medium">年龄</Label>
                <p className="text-muted-foreground">{STEP_EXAMPLES.basicInfo.age}</p>
              </div>
              <div>
                <Label className="font-medium">学历</Label>
                <p className="text-muted-foreground">{STEP_EXAMPLES.basicInfo.education}</p>
              </div>
              <div>
                <Label className="font-medium">长居地</Label>
                <p className="text-muted-foreground">{STEP_EXAMPLES.basicInfo.location}</p>
              </div>
            </div>
            <div>
              <Label className="font-medium">性格特点</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STEP_EXAMPLES.basicInfo.personality.map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-medium">价值观</Label>
              <div className="space-y-2 mt-1">
                <p>
                  <span className="font-medium">人生观：</span>
                  {STEP_EXAMPLES.basicInfo.values.lifeView}
                </p>
                <p>
                  <span className="font-medium">事业观：</span>
                  {STEP_EXAMPLES.basicInfo.values.careerView}
                </p>
                <p>
                  <span className="font-medium">婚姻观：</span>
                  {STEP_EXAMPLES.basicInfo.values.marriageView}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// 使用 memo 包装组件，避免不必要的重渲染
export const BasicInfoStep = memo(BasicInfoStepComponent);
