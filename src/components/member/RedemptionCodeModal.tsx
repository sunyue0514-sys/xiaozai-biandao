'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Gift, 
  Zap, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { POINTS_COST, CODE_TYPE_NAMES, type CodeType } from '@/lib/points-config';

// 兑换码预览接口
interface RedemptionPreview {
  code: string;
  type: string;
  typeCode: string;
  days: number;
  durationText: string;
  power: number;
  status: string;
  statusMessage: string;
  canUse: boolean;
  expiresAt?: string;
  maxUses: number;
  usedCount: number;
}

// 兑换码兑换弹窗（普通用户）
interface RedeemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RedeemModal({ open, onOpenChange, onSuccess }: RedeemModalProps) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<RedemptionPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [redeemed, setRedeemed] = useState(false);

  // 预览兑换码
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (code.trim().length >= 6) {
        setIsPreviewLoading(true);
        try {
          const response = await fetch(`/api/redemption/preview?code=${encodeURIComponent(code.trim())}`);
          const data = await response.json();
          if (data.success) {
            setPreview(data.preview);
          } else {
            setPreview(null);
          }
        } catch (error) {
          setPreview(null);
        } finally {
          setIsPreviewLoading(false);
        }
      } else {
        setPreview(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [code]);

  // 兑换
  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error('请输入兑换码');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/redemption/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setRedeemed(true);
        onSuccess?.();
        setTimeout(() => {
          onOpenChange(false);
          setCode('');
          setPreview(null);
          setRedeemed(false);
        }, 2000);
      } else {
        toast.error(data.error || '兑换失败');
      }
    } catch (error) {
      toast.error('兑换失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setPreview(null);
    setRedeemed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            兑换码
          </DialogTitle>
          <DialogDescription>
            输入兑换码获取算力
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* 输入框 */}
          <div className="relative">
            <Input
              placeholder="请输入兑换码"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="h-12 text-center text-lg tracking-wider uppercase"
              disabled={isLoading || redeemed}
            />
            {isPreviewLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* 预览信息 */}
          {preview && (
            <div className={cn(
              'p-4 rounded-xl border',
              preview.canUse 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-muted border-border'
            )}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{preview.type}</span>
                <span className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  preview.canUse 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                )}>
                  {preview.statusMessage}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {preview.days > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{preview.durationText}</span>
                  </div>
                )}
                {preview.power > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="w-4 h-4" />
                    <span>{preview.power.toLocaleString()} 算力</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 兑换成功 */}
          {redeemed && (
            <div className="flex items-center justify-center gap-2 py-4 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">兑换成功！</span>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={handleClose}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80"
              onClick={handleRedeem}
              disabled={!preview?.canUse || isLoading || redeemed}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  兑换中...
                </>
              ) : '确认兑换'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 兑换码生成弹窗（管理员）
interface GenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 代理点数信息
interface AgentPointsInfo {
  agentId: number;
  agentUid: string;
  pointsBalance: number;
  pointsTotal: number;
  pointsUsed: number;
  agentLevel: number | null;
}

export function GenerateModal({ open, onOpenChange }: GenerateModalProps) {
  const [form, setForm] = useState({
    count: 1,
    type: 'power_10000' as CodeType,
    rewardDays: 365,
    rewardPower: 10000,
    maxUses: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [agentInfo, setAgentInfo] = useState<AgentPointsInfo | null>(null);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);

  // 获取代理点数信息
  useEffect(() => {
    if (open) {
      fetchAgentPoints();
    }
  }, [open]);

  const fetchAgentPoints = async () => {
    setIsLoadingPoints(true);
    try {
      const response = await fetch('/api/agent/points');
      const data = await response.json();
      if (data.success && data.agentInfo) {
        setAgentInfo(data.agentInfo);
      }
    } catch (error) {
      console.error('获取点数信息失败:', error);
    } finally {
      setIsLoadingPoints(false);
    }
  };

  // 计算本次消耗点数
  const pointsCost = POINTS_COST[form.type] ?? 0;
  const totalCost = pointsCost * form.count;
  const hasEnoughPoints = agentInfo ? agentInfo.pointsBalance >= totalCost : true;

  // 是否可以生成（点数检查）
  const canGenerate = agentInfo ? hasEnoughPoints : true;

  // 生成兑换码
  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/redemption/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: form.count,
          type: form.type,
          rewardDays: form.rewardDays,
          rewardPower: form.rewardPower,
          maxUses: form.maxUses,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setGeneratedCodes(data.data.map((c: { code: string }) => c.code));
      } else {
        toast.error(data.error || '生成失败');
      }
    } catch (error) {
      toast.error('生成失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 复制所有兑换码
  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(generatedCodes.join('\n'));
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setForm({ count: 1, type: 'power_10000', rewardDays: 365, rewardPower: 10000, maxUses: 1 });
    setGeneratedCodes([]);
    onOpenChange(false);
  };

  // 兑换码类型选项（纯算力模式，无会员）
  const codeTypeOptions: { value: CodeType; label: string; points: number; days: number; power: number }[] = [
    { value: 'power_10000', label: '算力包10000（1万算力）', points: 29, days: 365, power: 10000 },
    { value: 'power_50000', label: '算力包50000（5万算力）', points: 100, days: 365, power: 50000 },
    { value: 'power_100000', label: '算力包100000（10万算力）', points: 199, days: 365, power: 100000 },
    { value: 'power_400000', label: '算力包400000（40万算力）', points: 699, days: 365, power: 400000 },
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            生成兑换码
          </DialogTitle>
          <DialogDescription>
            为用户生成算力兑换码
          </DialogDescription>
        </DialogHeader>

        {generatedCodes.length === 0 ? (
          <div className="space-y-4 pt-4">
            {/* 点数余额提示 */}
            {agentInfo && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">点数余额</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{agentInfo.pointsBalance.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">点</span>
                </div>
              </div>
            )}

            {/* 生成数量 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">生成数量</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.count}
                onChange={(e) => setForm({ ...form, count: parseInt(e.target.value) || 1 })}
                className="h-10"
              />
            </div>

            {/* 兑换码类型 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const option = codeTypeOptions.find(o => o.value === e.target.value);
                  if (option) {
                    setForm({ 
                      ...form, 
                      type: option.value,
                      rewardDays: option.days,
                      rewardPower: option.power,
                    });
                  }
                }}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background"
              >
                {codeTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} {option.points > 0 ? `(${option.points}点/个)` : '(免费)'}
                  </option>
                ))}
              </select>
            </div>

            {/* 点数消耗提示 */}
            {agentInfo && pointsCost > 0 && (
              <div className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                hasEnoughPoints 
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                  : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
              )}>
                <div className="flex items-center gap-2">
                  {hasEnoughPoints ? (
                    <Coins className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">本次消耗</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    'font-bold',
                    hasEnoughPoints ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-700 dark:text-red-400'
                  )}>
                    {totalCost.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">点</span>
                  {!hasEnoughPoints && (
                    <span className="text-xs text-red-600 ml-2">(余额不足)</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* 会员天数 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">有效期（天）</label>
                <Input
                  type="number"
                  min={0}
                  value={form.rewardDays}
                  onChange={(e) => setForm({ ...form, rewardDays: parseFloat(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>

              {/* 算力值 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">算力值</label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={form.rewardPower}
                  onChange={(e) => setForm({ ...form, rewardPower: parseInt(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={handleClose}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90"
                onClick={handleGenerate}
                disabled={isLoading || !canGenerate}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : !canGenerate ? (
                  '点数不足'
                ) : (
                  `生成兑换码${totalCost > 0 ? ` (消耗${totalCost}点)` : ''}`
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {/* 成功提示 */}
            <div className="flex items-center justify-center gap-2 py-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">成功生成 {generatedCodes.length} 个兑换码</span>
              {totalCost > 0 && (
                <span className="text-sm text-muted-foreground ml-1">
                  (消耗 {totalCost} 点)
                </span>
              )}
            </div>

            {/* 兑换码列表 */}
            <div className="max-h-60 overflow-y-auto p-3 bg-muted rounded-xl">
              <div className="space-y-1 font-mono text-sm">
                {generatedCodes.map((code, idx) => (
                  <div key={idx} className="py-1 text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onClick={handleClose}
              >
                关闭
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl"
                onClick={handleCopyAll}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    复制全部
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
