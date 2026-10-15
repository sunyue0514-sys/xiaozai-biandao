'use client';

import { useState } from 'react';
import { MessageSquare, Send, Lightbulb, Bug, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';

type FeedbackType = 'suggestion' | 'bug' | 'other';

const feedbackTypes: { value: FeedbackType; label: string; icon: typeof Lightbulb; color: string }[] = [
  { value: 'suggestion', label: '功能建议', icon: Lightbulb, color: 'text-yellow-500' },
  { value: 'bug', label: '问题反馈', icon: Bug, color: 'text-red-500' },
  { value: 'other', label: '其他', icon: MessageCircle, color: 'text-blue-500' },
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('请输入反馈内容');
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiRequest('/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type,
          content: content.trim(),
          contact: contact.trim() || undefined,
        }),
      }) as any;

      if (result.success) {
        toast.success(result.message || '感谢您的反馈！');
        setOpen(false);
        setContent('');
        setContact('');
        setType('suggestion');
      } else {
        toast.error(result.error || '提交失败，请稍后重试');
      }
    } catch (error) {
      toast.error('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* 固定在右下角的按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        title="意见反馈"
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {/* 反馈对话框 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              意见反馈
            </DialogTitle>
            <DialogDescription>
              我们非常重视您的意见，请告诉我们您的想法或遇到的问题
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 反馈类型 */}
            <div className="space-y-2">
              <Label>反馈类型</Label>
              <div className="flex gap-2">
                {feedbackTypes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setType(item.value)}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-lg border p-3 transition-all ${
                        type === item.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${item.color}`} />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 反馈内容 */}
            <div className="space-y-2">
              <Label htmlFor="content">
                反馈内容 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                placeholder="请详细描述您的建议或遇到的问题..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>

            {/* 联系方式 */}
            <div className="space-y-2">
              <Label htmlFor="contact">
                联系方式 <span className="text-muted-foreground text-xs">(可选)</span>
              </Label>
              <Input
                id="contact"
                placeholder="手机号/微信号/邮箱，方便我们联系您"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !content.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  提交反馈
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
