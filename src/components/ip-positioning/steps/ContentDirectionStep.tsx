'use client';

import { memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Info, Check, Plus, X, Hash, FileVideo, Calendar } from 'lucide-react';
import { PLATFORM_OPTIONS } from '@/lib/ip-positioning-config';

interface ContentDirectionStepProps {
  formData: {
    platforms: string[];
    mainTopics: string[];
    contentStyle: string;
    updateFrequency: string;
  };
  setFormData: (data: ContentDirectionStepProps['formData']) => void;
}

export const ContentDirectionStep = memo(function ContentDirectionStep({ formData, setFormData }: ContentDirectionStepProps) {
  const [customTopic, setCustomTopic] = useState('');
  const [customPlatform, setCustomPlatform] = useState('');

  const togglePlatform = (platform: string) => {
    const newPlatforms = formData.platforms.includes(platform)
      ? formData.platforms.filter((p) => p !== platform)
      : [...formData.platforms, platform];
    setFormData({ ...formData, platforms: newPlatforms });
  };

  const addTopic = () => {
    if (customTopic.trim() && !formData.mainTopics.includes(customTopic.trim())) {
      setFormData({
        ...formData,
        mainTopics: [...formData.mainTopics, customTopic.trim()],
      });
      setCustomTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setFormData({
      ...formData,
      mainTopics: formData.mainTopics.filter((t) => t !== topic),
    });
  };

  const addCustomPlatform = () => {
    if (customPlatform.trim() && !formData.platforms.includes(customPlatform.trim())) {
      setFormData({
        ...formData,
        platforms: [...formData.platforms, customPlatform.trim()],
      });
      setCustomPlatform('');
    }
  };

  const FREQUENCY_OPTIONS = [
    '每天更新',
    '每周3-5次',
    '每周1-2次',
    '每月4-8次',
    '不固定',
  ];

  const CONTENT_STYLES = [
    '干货分享',
    '故事叙述',
    'Vlog记录',
    '知识科普',
    '情感共鸣',
    '幽默搞笑',
    '专业严谨',
    '轻松活泼',
  ];

  return (
    <div className="space-y-6">
      {/* 平台选择 */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Label className="flex items-center gap-2 text-base font-medium">
            <FileVideo className="w-4 h-4 text-primary" />
            运营平台
            <span className="text-xs text-muted-foreground font-normal">(可多选)</span>
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PLATFORM_OPTIONS.map((platform) => (
              <div
                key={platform.name}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  formData.platforms.includes(platform.name)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => togglePlatform(platform.name)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{platform.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{platform.name}</p>
                    <p className="text-xs text-muted-foreground">{platform.description}</p>
                  </div>
                </div>
                {formData.platforms.includes(platform.name) && (
                  <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="自定义平台..."
              value={customPlatform}
              onChange={(e) => setCustomPlatform(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomPlatform()}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addCustomPlatform}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 内容主题 */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Hash className="w-4 h-4 text-blue-600" />
            内容主题
            <span className="text-xs text-muted-foreground font-normal">(您想创作的内容方向)</span>
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.mainTopics.map((topic, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {topic}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeTopic(topic)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="输入内容主题，如：职场成长、美食制作、旅行分享..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTopic()}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addTopic}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 内容风格 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          内容风格
        </Label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_STYLES.map((style) => (
            <Badge
              key={style}
              variant={formData.contentStyle === style ? 'default' : 'outline'}
              className={`cursor-pointer ${
                formData.contentStyle === style ? 'bg-primary text-primary-foreground' : ''
              }`}
              onClick={() => setFormData({ ...formData, contentStyle: style })}
            >
              {style}
            </Badge>
          ))}
        </div>
        <Input
          placeholder="或自定义风格..."
          value={!CONTENT_STYLES.includes(formData.contentStyle) ? formData.contentStyle : ''}
          onChange={(e) => setFormData({ ...formData, contentStyle: e.target.value })}
          className="mt-2"
        />
      </div>

      {/* 更新频率 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-green-600" />
          更新频率
        </Label>
        <div className="flex flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map((freq) => (
            <Badge
              key={freq}
              variant={formData.updateFrequency === freq ? 'default' : 'outline'}
              className={`cursor-pointer ${
                formData.updateFrequency === freq ? 'bg-primary text-primary-foreground' : ''
              }`}
              onClick={() => setFormData({ ...formData, updateFrequency: freq })}
            >
              {freq}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
});
