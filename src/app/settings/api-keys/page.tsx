'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ApiKey {
  id: number;
  name: string;
  api_key: string;
  status: string;
  rate_limit: number;
  created_at: string;
  last_used_at: string | null;
}

interface NewKeyData {
  id: number;
  name: string;
  apiKey: string;
  secretKey: string;
  status: string;
  rateLimit: number;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [newKeyData, setNewKeyData] = useState<NewKeyData | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [deleteKeyId, setDeleteKeyId] = useState<number | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/agent/init', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        // 如果返回的是数组
        if (Array.isArray(result.data)) {
          setApiKeys(result.data);
        } else {
          // 如果返回的是单个对象（已存在key）
          setApiKeys([result.data]);
        }
      }
    } catch (error) {
      console.error('加载API Key失败:', error);
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/agent/init', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        if (result.data.secretKey) {
          // 新创建的key，显示secret key
          setNewKeyData(result.data);
          setShowSuccessDialog(true);
          loadApiKeys();
        } else {
          // 已存在的key
          toast.info(result.data.message || '您已有活跃的API Key');
        }
      } else {
        toast.error(result.message || '创建失败');
      }
    } catch (error) {
      console.error('创建API Key失败:', error);
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}已复制`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '从未使用';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Key 管理</h1>
            <p className="text-muted-foreground mt-1">
              管理用于 Coze 智能体接入的 API 密钥
            </p>
          </div>
          <Button onClick={handleCreateKey} disabled={creating || apiKeys.length > 0}>
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            创建 API Key
          </Button>
        </div>

        {/* Warning Card */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">安全提示</p>
                <ul className="mt-1 text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• Secret Key 仅在创建时显示一次，请立即保存到安全位置</li>
                  <li>• 请勿将 Secret Key 提交到代码仓库或分享给他人</li>
                  <li>• 如果密钥泄露，请立即删除并重新创建</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无 API Key</h3>
                <p className="text-muted-foreground mb-4">
                  创建 API Key 以接入 Coze 智能体
                </p>
                <Button onClick={handleCreateKey} disabled={creating}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建第一个 API Key
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <Card key={key.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Key className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{key.name}</CardTitle>
                        <CardDescription>
                          创建于 {formatDate(key.created_at)}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                      {key.status === 'active' ? '活跃' : '已禁用'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* API Key */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">API Key</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={key.api_key}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(key.api_key, 'API Key')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Rate Limit & Last Used */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">频率限制：</span>
                      <span className="ml-2">{key.rate_limit} 次/分钟</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">最后使用：</span>
                      <span className="ml-2">{formatDate(key.last_used_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Usage Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              使用指南
            </CardTitle>
            <CardDescription>如何在 Coze 智能体中配置 API Key</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">复制 API Key</p>
                  <p className="text-sm text-muted-foreground">
                    点击上方复制按钮获取 API Key
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">保存 Secret Key</p>
                  <p className="text-sm text-muted-foreground">
                    创建时显示的 Secret Key 请妥善保存，用于生成请求签名
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">配置 Coze 智能体</p>
                  <p className="text-sm text-muted-foreground">
                    在 Coze 平台创建智能体，配置 HTTP 请求插件调用我们的 API
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" asChild>
                <a href="/docs/coze-agent-integration.md" target="_blank">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  查看完整对接文档
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              API Key 创建成功
            </DialogTitle>
            <DialogDescription>
              请立即保存 Secret Key，关闭后将无法再次查看
            </DialogDescription>
          </DialogHeader>
          
          {newKeyData && (
            <div className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newKeyData.apiKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(newKeyData.apiKey, 'API Key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Secret Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-600">
                  Secret Key（仅显示一次）
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={newKeyData.secretKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(newKeyData.secretKey, 'Secret Key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Secret Key 用于生成请求签名，请勿泄露。如果遗失，需删除并重新创建 API Key。
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>
              我已保存，关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
