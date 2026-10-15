'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Clock,
  Trash2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

// 统一蓝紫色主题
const THEME_COLOR = {
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  bg: '#8B5CF6',
  bgLight: '#F5F3FF',
  text: '#8B5CF6',
};

// 设备数据类型
interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
}

// 登录记录类型
interface LoginRecord {
  id: string;
  uid: string;
  device: string;
  os: string;
  browser: string;
  location: string;
  ip: string;
  status: 'success' | 'failed';
  createdAt: string;
}

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'mobile':
      return <Smartphone className="w-6 h-6" />;
    case 'tablet':
      return <Tablet className="w-6 h-6" />;
    default:
      return <Monitor className="w-6 h-6" />;
  }
};

export default function UserDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // 加载设备列表和登录记录
  useEffect(() => {
    loadDevices();
    loadLoginRecords();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/device/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setDevices(result.data || []);
      }
    } catch (error) {
      console.error('加载设备列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLoginRecords = async () => {
    try {
      const response = await fetch('/api/login-records?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setLoginRecords(result.data || []);
      }
    } catch (error) {
      console.error('加载登录记录失败:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleRemove = async (deviceId: string) => {
    if (!confirm('确定要移除该设备吗？移除后该设备需要重新登录。')) {
      return;
    }

    setRemoving(deviceId);
    try {
      const response = await fetch(`/api/device/list?deviceId=${deviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setDevices(devices.filter(d => d.id !== deviceId));
      } else {
        alert(result.error || '移除失败');
      }
    } catch (error) {
      console.error('移除设备失败:', error);
      alert('移除失败，请重试');
    } finally {
      setRemoving(null);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">设备管理</h1>
          <p className="text-muted-foreground mt-1">
            查看和管理您的登录设备
          </p>
        </div>

        {/* Warning */}
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="flex items-start gap-4 pt-6">
            <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                安全提示
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                如果发现有陌生设备登录，请立即修改密码并移除该设备。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Device */}
        <Card>
          <CardHeader>
            <CardTitle>当前设备</CardTitle>
            <CardDescription>您正在使用的设备</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : devices.filter((d) => d.current).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无设备信息，请重新登录</p>
            ) : (
              devices.filter((d) => d.current).map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <DeviceIcon type={device.type} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{device.name}</p>
                      <Badge variant="default" className="bg-green-600">
                        当前设备
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {device.os} · {device.browser} · {device.location}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      在线
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Other Devices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>其他设备</CardTitle>
                <CardDescription>曾登录过的设备</CardDescription>
              </div>
              <Badge variant="outline">
                {devices.filter((d) => !d.current).length} 台设备
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : devices.filter((d) => !d.current).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无其他设备</p>
            ) : (
              <div className="space-y-4">
                {devices.filter((d) => !d.current).map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center gap-4 p-4 rounded-lg border"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <DeviceIcon type={device.type} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{device.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {device.os} · {device.browser} · <MapPin className="w-3 h-3 inline" /> {device.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        最后活跃: {formatTime(device.lastActive)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(device.id)}
                        disabled={removing === device.id}
                      >
                        {removing === device.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            移除
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login History */}
        <Card>
          <CardHeader>
            <CardTitle>登录记录</CardTitle>
            <CardDescription>最近的登录活动</CardDescription>
          </CardHeader>
          <CardContent>
            {recordsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : loginRecords.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无登录记录</p>
            ) : (
              <div className="space-y-4">
                {loginRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{record.device}</p>
                      <p className="text-sm text-muted-foreground">{formatTime(record.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 inline" /> {record.location}
                      </p>
                      <Badge variant={record.status === 'success' ? 'default' : 'destructive'}>
                        {record.status === 'success' ? '成功' : '失败'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
