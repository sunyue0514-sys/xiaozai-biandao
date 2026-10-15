'use client';

import { memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Info, Eye, Check, Plus, X } from 'lucide-react';
import {
  INTEREST_TAGS,
  SKILL_TAGS,
  STEP_GUIDES,
  STEP_EXAMPLES,
} from '@/lib/ip-positioning-config';

interface CoreValueStepProps {
  formData: {
    interests: string[];
    skills: string[];
    specialties: string;
    passions: string;
    valueProvided: string;
  };
  setFormData: (data: CoreValueStepProps['formData']) => void;
}

export const CoreValueStep = memo(function CoreValueStep({ formData, setFormData }: CoreValueStepProps) {
  const [showExample, setShowExample] = useState(false);
  const [customInterest, setCustomInterest] = useState('');
  const [customSkill, setCustomSkill] = useState('');

  const toggleTag = (field: 'interests' | 'skills', value: string) => {
    const current = formData[field];
    const newValue = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: newValue });
  };

  const addCustomTag = (field: 'interests' | 'skills', value: string) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData({ ...formData, [field]: [...formData[field], value.trim()] });
      if (field === 'interests') setCustomInterest('');
      if (field === 'skills') setCustomSkill('');
    }
  };

  const removeTag = (field: 'interests' | 'skills', value: string) => {
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
                  {STEP_GUIDES.coreValue.title}
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
                {STEP_GUIDES.coreValue.content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 兴趣爱好 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          兴趣爱好
          <span className="text-xs text-muted-foreground">(可多选)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={formData.interests.includes(tag) ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1.5 ${
                formData.interests.includes(tag) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => toggleTag('interests', tag)}
            >
              {formData.interests.includes(tag) && <Check className="w-3 h-3 mr-1" />}
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="自定义兴趣爱好..."
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTag('interests', customInterest)}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={() => addCustomTag('interests', customInterest)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.interests.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeTag('interests', tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 技能点 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          技能点
          <span className="text-xs text-muted-foreground">(可多选)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {SKILL_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={formData.skills.includes(tag) ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1.5 ${
                formData.skills.includes(tag) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => toggleTag('skills', tag)}
            >
              {formData.skills.includes(tag) && <Check className="w-3 h-3 mr-1" />}
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="自定义技能..."
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomTag('skills', customSkill)}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={() => addCustomTag('skills', customSkill)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.skills.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeTag('skills', tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 擅长的方向 */}
      <div className="space-y-2">
        <Label>擅长的方向</Label>
        <Textarea
          placeholder="您最有把握、最能帮助他人的领域是什么？"
          value={formData.specialties}
          onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
          className="min-h-[80px]"
        />
      </div>

      {/* 热爱的事情 */}
      <div className="space-y-2">
        <Label>热爱的事情</Label>
        <Textarea
          placeholder="让您充满激情的事业或爱好是什么？"
          value={formData.passions}
          onChange={(e) => setFormData({ ...formData, passions: e.target.value })}
          className="min-h-[80px]"
        />
      </div>

      {/* 能为用户提供的价值 */}
      <div className="space-y-2">
        <Label>能为用户提供的价值</Label>
        <Textarea
          placeholder="您能解决用户的哪些问题？能为他们带来什么价值？"
          value={formData.valueProvided}
          onChange={(e) => setFormData({ ...formData, valueProvided: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      {/* 示例对话框 */}
      <Dialog open={showExample} onOpenChange={setShowExample}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>填写示例 - 内核价值</DialogTitle>
            <DialogDescription>参考以下示例来填写您的内核价值</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <Label className="font-medium">兴趣爱好</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STEP_EXAMPLES.coreValue.interests.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-medium">技能点</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STEP_EXAMPLES.coreValue.skills.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-medium">擅长的方向</Label>
              <p className="text-muted-foreground">{STEP_EXAMPLES.coreValue.expertise}</p>
            </div>
            <div>
              <Label className="font-medium">热爱的事情</Label>
              <p className="text-muted-foreground">{STEP_EXAMPLES.coreValue.passion}</p>
            </div>
            <div>
              <Label className="font-medium">能为用户提供的价值</Label>
              <p className="text-muted-foreground">{STEP_EXAMPLES.coreValue.valueProvided}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
