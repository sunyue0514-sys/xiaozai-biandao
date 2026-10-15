'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Gift,
  Copy,
  Share2,
  Users,
  Zap,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface InviteStats {
  totalInvites: number;
  totalRewardPower: number;
}

interface InviteShareProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteShare({ isOpen, onClose }: InviteShareProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [stats, setStats] = useState<InviteStats>({ totalInvites: 0, totalRewardPower: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInviteCode();
    }
  }, [isOpen]);

  const fetchInviteCode = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const res = await fetch('/api/invite/code', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setInviteCode(data.data.inviteCode);
        setInviteLink(data.data.inviteLink);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('获取邀请码失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '邀请你使用超级编导助手',
          text: 'AI驱动的短视频创作助手，注册即送2000算力！',
          url: inviteLink,
        });
      } catch (error) {
        console.log('分享取消或失败:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="w-5 h-5 text-amber-500" />
            邀请好友
          </DialogTitle>
          <DialogDescription>
            邀请好友注册，双方各得2000算力（7天有效）
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              加载中...
            </div>
          ) : (
            <>
              {/* 邀请链接 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">您的专属邀请链接</label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1 text-sm"
                  />
                  <Button onClick={handleCopyLink} variant="outline" size="icon">
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 邀请码 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">邀请码</label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="font-mono text-lg font-bold">{inviteCode}</span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button onClick={handleShare} className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  分享链接
                </Button>
                <Button onClick={handleCopyLink} variant="outline" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />
                  复制链接
                </Button>
              </div>

              {/* 邀请统计 */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">已邀请</span>
                    </div>
                    <span className="font-bold">{stats.totalInvites} 人</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm">累计奖励</span>
                    </div>
                    <span className="font-bold text-amber-500">{stats.totalRewardPower} 算力</span>
                  </div>
                </CardContent>
              </Card>

              {/* 说明 */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• 好友通过您的链接注册，双方各得2000算力</p>
                <p>• 奖励算力有效期为7天</p>
                <p>• 邀请人数无上限，多邀多得</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 简化版邀请入口（用于侧边栏或个人中心）
export function InviteButton({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium">邀请好友</h3>
              <p className="text-xs text-muted-foreground">双方各得2000算力</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
