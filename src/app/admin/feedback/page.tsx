'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MessageSquare, Search, Clock, User, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { toast } from 'sonner';

const THEME_COLOR = {
  text: '#10B981',
  bgLight: '#10B98110',
  gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
};

interface Feedback {
  id: number;
  user_id: number;
  username: string;
  uid: string;
  type: 'suggestion' | 'bug' | 'other';
  title: string | null;
  content: string;
  contact: string | null;
  screenshots: string[] | null;
  status: 'pending' | 'processing' | 'resolved' | 'ignored';
  admin_reply: string | null;
  replied_by: number | null;
  replier_name: string | null;
  replied_at: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  suggestion: '建议',
  bug: '问题',
  other: '其他',
};

const TYPE_COLORS: Record<string, string> = {
  suggestion: 'bg-blue-500',
  bug: 'bg-red-500',
  other: 'bg-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  ignored: '已忽略',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500',
  resolved: 'bg-green-500',
  ignored: 'bg-gray-500',
};

export default function FeedbackManagementPage() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  
  // 统计
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    resolved: 0,
    ignored: 0,
  });
  
  // 回复对话框
  const [replyDialog, setReplyDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [newStatus, setNewStatus] = useState<string>('pending');
  const [replying, setReplying] = useState(false);
  
  // 详情对话框
  const [detailDialog, setDetailDialog] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [currentPage, statusFilter, typeFilter]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('pageSize', pageSize.toString());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      
      const result = await apiRequest(`/feedback?${params.toString()}`) as any;
      if (result.success) {
        setFeedbackList(result.data.list || []);
        setTotalPages(result.data.totalPages || 1);
        setTotalCount(result.data.total || 0);
        setStats(result.data.stats || stats);
      }
    } catch (error) {
      console.error('获取反馈列表失败:', error);
      toast.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedFeedback) return;
    if (!replyContent.trim() && newStatus === selectedFeedback.status) {
      toast.error('请输入回复内容或更改状态');
      return;
    }
    
    setReplying(true);
    try {
      const result = await apiRequest(`/feedback/${selectedFeedback.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          adminReply: replyContent || undefined,
          status: newStatus,
        }),
      }) as any;
      
      if (result.success) {
        toast.success('回复成功');
        setReplyDialog(false);
        setReplyContent('');
        fetchFeedback();
      } else {
        toast.error(result.error || '回复失败');
      }
    } catch (error) {
      toast.error('回复失败');
    } finally {
      setReplying(false);
    }
  };

  const openReplyDialog = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setReplyContent(feedback.admin_reply || '');
    setNewStatus(feedback.status);
    setReplyDialog(true);
  };

  const openDetailDialog = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setDetailDialog(true);
  };

  const filteredList = feedbackList.filter(f => 
    f.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.title && f.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    f.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.uid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6" style={{ color: THEME_COLOR.text }} />
              用户反馈
            </h1>
            <p className="text-muted-foreground mt-1">
              查看和回复用户提交的建议与问题反馈
            </p>
          </div>
          <Button onClick={fetchFeedback} variant="outline">
            刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">总反馈</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">待处理</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{stats.processing}</p>
                <p className="text-sm text-muted-foreground">处理中</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">已解决</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-500">{stats.ignored}</p>
                <p className="text-sm text-muted-foreground">已忽略</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索内容、用户..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="processing">处理中</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="ignored">已忽略</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="suggestion">建议</SelectItem>
                  <SelectItem value="bug">问题</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 反馈列表 */}
        <Card>
          <CardHeader>
            <CardTitle>反馈列表</CardTitle>
            <CardDescription>共 {totalCount} 条反馈</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无反馈数据
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">ID</TableHead>
                      <TableHead className="w-[100px]">用户</TableHead>
                      <TableHead className="w-[80px]">类型</TableHead>
                      <TableHead className="min-w-[200px]">内容</TableHead>
                      <TableHead className="w-[80px]">状态</TableHead>
                      <TableHead className="w-[140px]">提交时间</TableHead>
                      <TableHead className="w-[120px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((feedback) => (
                      <TableRow key={feedback.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetailDialog(feedback)}>
                        <TableCell>{feedback.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate">{feedback.username}</p>
                            <p className="text-xs text-muted-foreground">{feedback.uid}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${TYPE_COLORS[feedback.type]} text-white`}>
                            {TYPE_LABELS[feedback.type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px]">
                            {feedback.title && (
                              <p className="font-medium truncate">{feedback.title}</p>
                            )}
                            <p className="text-sm text-muted-foreground truncate">{feedback.content}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[feedback.status]} text-white`}>
                            {STATUS_LABELS[feedback.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {new Date(feedback.created_at).toLocaleString('zh-CN', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReplyDialog(feedback)}
                          >
                            处理
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  第 {currentPage} 页，共 {totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 详情对话框 */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>反馈详情</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={`${TYPE_COLORS[selectedFeedback.type]} text-white`}>
                  {TYPE_LABELS[selectedFeedback.type]}
                </Badge>
                <Badge className={`${STATUS_COLORS[selectedFeedback.status]} text-white`}>
                  {STATUS_LABELS[selectedFeedback.status]}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">用户</Label>
                  <p className="font-medium">{selectedFeedback.username} ({selectedFeedback.uid})</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">提交时间</Label>
                  <p>{new Date(selectedFeedback.created_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
              
              {selectedFeedback.title && (
                <div>
                  <Label className="text-muted-foreground">标题</Label>
                  <p className="font-medium">{selectedFeedback.title}</p>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">反馈内容</Label>
                <p className="whitespace-pre-wrap bg-muted p-3 rounded-lg">{selectedFeedback.content}</p>
              </div>
              
              {selectedFeedback.contact && (
                <div>
                  <Label className="text-muted-foreground">联系方式</Label>
                  <p>{selectedFeedback.contact}</p>
                </div>
              )}
              
              {selectedFeedback.screenshots && selectedFeedback.screenshots.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">截图</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedFeedback.screenshots.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`截图${index + 1}`} className="w-32 h-32 object-cover rounded-lg border" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedFeedback.admin_reply && (
                <div>
                  <Label className="text-muted-foreground">管理员回复</Label>
                  <p className="whitespace-pre-wrap bg-green-50 p-3 rounded-lg border border-green-200">
                    {selectedFeedback.admin_reply}
                  </p>
                  {selectedFeedback.replier_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      回复人: {selectedFeedback.replier_name} | {new Date(selectedFeedback.replied_at!).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(false)}>
              关闭
            </Button>
            <Button onClick={() => {
              setDetailDialog(false);
              openReplyDialog(selectedFeedback!);
            }}>
              处理
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 回复对话框 */}
      <Dialog open={replyDialog} onOpenChange={setReplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>处理反馈</DialogTitle>
            <DialogDescription>
              回复用户反馈或更新状态
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFeedback && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">原反馈内容:</p>
                <p className="text-sm line-clamp-3">{selectedFeedback.content}</p>
              </div>
            )}
            
            <div>
              <Label>状态</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="processing">处理中</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="ignored">已忽略</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>回复内容</Label>
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="输入回复内容（可选）"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(false)}>
              取消
            </Button>
            <Button onClick={handleReply} disabled={replying}>
              {replying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
