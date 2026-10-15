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
import { Info, Eye, Check, Plus, X, Users, Target, HelpCircle, Trophy, Heart } from 'lucide-react';
import {
  TARGET_CUSTOMER_TAGS,
  PAIN_POINT_TAGS,
  STEP_GUIDES,
  STEP_EXAMPLES,
} from '@/lib/ip-positioning-config';

interface UserPersonaStepProps {
  formData: {
    targetCustomers: string;
    painPoints: string;
    commonQuestions: string[];
    competitiveAdvantage: string;
    motivation: string;
  };
  setFormData: (data: UserPersonaStepProps['formData']) => void;
}

export const UserPersonaStep = memo(function UserPersonaStep({ formData, setFormData }: UserPersonaStepProps) {
  const [showExample, setShowExample] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');

  const addQuestion = () => {
    if (customQuestion.trim() && !formData.commonQuestions.includes(customQuestion.trim())) {
      setFormData({
        ...formData,
        commonQuestions: [...formData.commonQuestions, customQuestion.trim()],
      });
      setCustomQuestion('');
    }
  };

  const removeQuestion = (question: string) => {
    setFormData({
      ...formData,
      commonQuestions: formData.commonQuestions.filter((q) => q !== question),
    });
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
                  {STEP_GUIDES.userPersona.title}
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
                {STEP_GUIDES.userPersona.content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 目标客户 */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4 space-y-3">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Users className="w-4 h-4 text-blue-500" />
            目标客户
          </Label>
          <p className="text-sm text-muted-foreground">您最想服务的人群是谁？</p>
          <div className="flex flex-wrap gap-2">
            {TARGET_CUSTOMER_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={formData.targetCustomers.includes(tag) ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  formData.targetCustomers.includes(tag) ? 'bg-primary text-primary-foreground' : ''
                }`}
                onClick={() => {
                  if (formData.targetCustomers.includes(tag)) {
                    setFormData({
                      ...formData,
                      targetCustomers: formData.targetCustomers.replace(tag, '').replace(/、+/g, '、').replace(/^、|、$/g, ''),
                    });
                  } else {
                    setFormData({
                      ...formData,
                      targetCustomers: formData.targetCustomers
                        ? `${formData.targetCustomers}、${tag}`
                        : tag,
                    });
                  }
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
          <Textarea
            placeholder="或手动输入目标客户的详细描述..."
            value={formData.targetCustomers}
            onChange={(e) => setFormData({ ...formData, targetCustomers: e.target.value })}
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>

      {/* 需求痛点 */}
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="pt-4 space-y-3">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Target className="w-4 h-4 text-red-500" />
            客户需求和痛点
          </Label>
          <p className="text-sm text-muted-foreground">他们最迫切需要解决的问题是什么？</p>
          <div className="flex flex-wrap gap-2">
            {PAIN_POINT_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={formData.painPoints.includes(tag) ? 'default' : 'outline'}
                className={`cursor-pointer ${
                  formData.painPoints.includes(tag) ? 'bg-primary text-primary-foreground' : ''
                }`}
                onClick={() => {
                  if (formData.painPoints.includes(tag)) {
                    setFormData({
                      ...formData,
                      painPoints: formData.painPoints.replace(tag, '').replace(/、+/g, '、').replace(/^、|、$/g, ''),
                    });
                  } else {
                    setFormData({
                      ...formData,
                      painPoints: formData.painPoints
                        ? `${formData.painPoints}、${tag}`
                        : tag,
                    });
                  }
                }}
              >
                {tag}
              </Badge>
            ))}
          </div>
          <Textarea
            placeholder="或手动输入客户痛点的详细描述..."
            value={formData.painPoints}
            onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* 常见问题 */}
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="pt-4 space-y-3">
          <Label className="flex items-center gap-2 text-base font-medium">
            <HelpCircle className="w-4 h-4 text-amber-500" />
            客户经常问的问题
          </Label>
          <p className="text-sm text-muted-foreground">客户经常向您咨询的问题有哪些？</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.commonQuestions.map((question, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {question}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeQuestion(question)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="输入一个常见问题..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 同行优势 */}
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="pt-4 space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Trophy className="w-4 h-4 text-green-500" />
            相对同行的优势
          </Label>
          <p className="text-sm text-muted-foreground">您相比竞争对手有什么独特优势？</p>
          <Textarea
            placeholder="您相比竞争对手的独特优势..."
            value={formData.competitiveAdvantage}
            onChange={(e) => setFormData({ ...formData, competitiveAdvantage: e.target.value })}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* 发心 */}
      <Card className="border-l-4 border-l-pink-500">
        <CardContent className="pt-4 space-y-2">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Heart className="w-4 h-4 text-pink-500" />
            您的发心
          </Label>
          <p className="text-sm text-muted-foreground">您做这件事的初心和动力是什么？</p>
          <Textarea
            placeholder="您做这件事的初心和动力..."
            value={formData.motivation}
            onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* 示例对话框 */}
      <Dialog open={showExample} onOpenChange={setShowExample}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>填写示例 - 用户画像</DialogTitle>
            <DialogDescription>参考以下示例来填写用户画像</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                目标客户
              </Label>
              <p className="text-muted-foreground mt-1">{STEP_EXAMPLES.userPersona.targetCustomers}</p>
            </div>
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                需求痛点
              </Label>
              <p className="text-muted-foreground mt-1">{STEP_EXAMPLES.userPersona.painPoints}</p>
            </div>
            <div>
              <Label className="font-medium flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                常见问题
              </Label>
              <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                {STEP_EXAMPLES.userPersona.commonQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                同行优势
              </Label>
              <p className="text-muted-foreground mt-1">{STEP_EXAMPLES.userPersona.competitiveAdvantage}</p>
            </div>
            <div>
              <Label className="font-medium flex items-center gap-2">
                <Heart className="w-4 h-4" />
                发心
              </Label>
              <p className="text-muted-foreground mt-1">{STEP_EXAMPLES.userPersona.motivation}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
