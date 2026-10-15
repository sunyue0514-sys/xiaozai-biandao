'use client';

import { memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Info, Eye, Sparkles, Heart, Moon, Sun, TrendingUp, Quote } from 'lucide-react';
import { STEP_GUIDES, STEP_EXAMPLES, LIFE_STORY_PROMPTS } from '@/lib/ip-positioning-config';

interface LifeStoryStepProps {
  formData: {
    recent10Years: string;
    darkestMoment: string;
    turningPoint: string;
    highlightMoment: string;
    motto: string;
  };
  setFormData: (data: LifeStoryStepProps['formData']) => void;
}

export const LifeStoryStep = memo(function LifeStoryStep({ formData, setFormData }: LifeStoryStepProps) {
  const [showExample, setShowExample] = useState(false);

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
                  {STEP_GUIDES.lifeStory.title}
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
                {STEP_GUIDES.lifeStory.content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 近10年经历 */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-4 space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <TrendingUp className="w-4 h-4 text-primary" />
            近10年的经历
          </Label>
          <p className="text-sm text-muted-foreground">{LIFE_STORY_PROMPTS.recent10Years}</p>
          <Textarea
            placeholder="请回顾近10年的主要经历，包括学习、工作、创业等方面..."
            value={formData.recent10Years}
            onChange={(e) => setFormData({ ...formData, recent10Years: e.target.value })}
            className="min-h-[120px]"
          />
        </CardContent>
      </Card>

      {/* 至暗时刻 */}
      <Card className="border-l-4 border-l-gray-400">
        <CardContent className="pt-4 space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Moon className="w-4 h-4 text-gray-500" />
            至暗时刻
          </Label>
          <p className="text-sm text-muted-foreground">{LIFE_STORY_PROMPTS.darkestMoment}</p>
          <Textarea
            placeholder="人生中遇到的最大挫折或低谷期..."
            value={formData.darkestMoment}
            onChange={(e) => setFormData({ ...formData, darkestMoment: e.target.value })}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* 转折点 */}
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="pt-4 space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="w-4 h-4 text-amber-500" />
            人生转折点
          </Label>
          <p className="text-sm text-muted-foreground">{LIFE_STORY_PROMPTS.turningPoint}</p>
          <Textarea
            placeholder="人生中最重要的转折点..."
            value={formData.turningPoint}
            onChange={(e) => setFormData({ ...formData, turningPoint: e.target.value })}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* 高光时刻 */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardContent className="pt-4 space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Sun className="w-4 h-4 text-yellow-500" />
            高光时刻
          </Label>
          <p className="text-sm text-muted-foreground">{LIFE_STORY_PROMPTS.highlightMoment}</p>
          <Textarea
            placeholder="人生中最高光的时刻或最大的成就..."
            value={formData.highlightMoment}
            onChange={(e) => setFormData({ ...formData, highlightMoment: e.target.value })}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* 人生信条 */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-4 space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Quote className="w-4 h-4 text-primary" />
            人生信条/座右铭
          </Label>
          <p className="text-sm text-muted-foreground">{LIFE_STORY_PROMPTS.motto}</p>
          <Textarea
            placeholder="指导您人生的一句话或信念..."
            value={formData.motto}
            onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>

      {/* 示例对话框 */}
      <Dialog open={showExample} onOpenChange={setShowExample}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>填写示例 - 人生经历</DialogTitle>
            <DialogDescription>参考以下示例来填写您的人生经历</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <Label className="font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                近10年的经历
              </Label>
              <p className="text-muted-foreground mt-1">{STEP_EXAMPLES.lifeStory.recent10Years}</p>
            </div>
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Moon className="w-4 h-4" />
                至暗时刻
              </Label>
              <p className="text-muted-foreground mt-1">{STEP_EXAMPLES.lifeStory.darkestMoment}</p>
            </div>
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                人生转折点
              </Label>
              <p className="text-muted-foreground mt-1">{STEP_EXAMPLES.lifeStory.turningPoint}</p>
            </div>
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Sun className="w-4 h-4" />
                高光时刻
              </Label>
              <p className="text-muted-foreground mt-1">{STEP_EXAMPLES.lifeStory.highlightMoment}</p>
            </div>
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Quote className="w-4 h-4" />
                人生信条
              </Label>
              <p className="text-muted-foreground mt-1 italic">&ldquo;{STEP_EXAMPLES.lifeStory.motto}&rdquo;</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
