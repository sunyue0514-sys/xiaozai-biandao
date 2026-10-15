'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Tag,
  Users,
  Target,
  ShoppingBag,
  Gift,
  BookOpen,
  TrendingUp,
  X,
  FileText,
} from 'lucide-react';
import { PRODUCT_CATEGORIES, ProductCategory } from '@/lib/ad-templates';
import AnalysisReportCard from '@/components/analysis-report-card';

interface ProductProfile {
  id: number;
  uid: string;
  name: string;
  category: string;
  price: string | null;
  sellingPoints: string[];
  targetUsers: string | null;
  userPainPoints: string | null;
  usageScenario: string | null;
  promotion: string | null;
  brandStory: string | null;
  competitorAnalysis: string | null;
  aiPositioning: string | null;
  // 扩展字段（智能分析结果）
  userAgeRange: string | null;
  userGender: string | null;
  userConsumptionLevel: string | null;
  userInterests: string[] | null;
  valueLadderBasic: string | null;
  valueLadderAdvanced: string | null;
  valueLadderTop: string | null;
  painPointsJson: string | null;
  purchaseBarriersJson: string | null;
  trustProofSales: string | null;
  trustProofRatings: string | null;
  trustProofCertifications: string[] | null;
  trustProofCases: string | null;
  trustProofEndorsements: string | null;
  analysisCompleted: boolean;
  analysisAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  beauty: ShoppingBag,
  food: Tag,
  clothing: Tag,
  electronics: Tag,
  home: Tag,
  maternal: Tag,
  sports: Tag,
  education: Tag,
  other: Package,
};

export default function ProductProfilePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ProductProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPositioningOpen, setIsPositioningOpen] = useState(false);
  
  // 智能分析助手状态
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState<'selling_point' | 'user_portrait' | 'value_ladder' | 'pain_point'>('selling_point');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  
  // 分析报告弹窗状态
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProductProfile | null>(null);
  const [positioningResult, setPositioningResult] = useState('');
  const [isPositioningLoading, setIsPositioningLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const analysisResultRef = useRef<string>('');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    category: 'other' as ProductCategory,
    price: '',
    sellingPoints: [''],
    targetUsers: '',
    userPainPoints: '',
    usageScenario: '',
    promotion: '',
    brandStory: '',
    competitorAnalysis: '',
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/api/product-profiles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setProfiles(data.data);
      }
    } catch (error) {
      console.error('Load profiles error:', error);
      toast.error('加载产品档案失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 添加卖点
  const addSellingPoint = () => {
    if (formData.sellingPoints.length < 5) {
      setFormData({
        ...formData,
        sellingPoints: [...formData.sellingPoints, ''],
      });
    }
  };

  // 删除卖点
  const removeSellingPoint = (index: number) => {
    const newPoints = formData.sellingPoints.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      sellingPoints: newPoints.length > 0 ? newPoints : [''],
    });
  };

  // 更新卖点
  const updateSellingPoint = (index: number, value: string) => {
    const newPoints = [...formData.sellingPoints];
    newPoints[index] = value;
    setFormData({
      ...formData,
      sellingPoints: newPoints,
    });
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      category: 'other',
      price: '',
      sellingPoints: [''],
      targetUsers: '',
      userPainPoints: '',
      usageScenario: '',
      promotion: '',
      brandStory: '',
      competitorAnalysis: '',
    });
  };

  // 创建产品档案
  const handleCreate = async (openAnalysis: boolean = true) => {
    if (!formData.name.trim()) {
      toast.error('请填写产品名称');
      return;
    }

    try {
      const token = getToken();
      const response = await fetch('/api/product-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          sellingPoints: formData.sellingPoints.filter(p => p.trim()),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('产品档案创建成功');
        setIsCreateOpen(false);
        resetForm();
        
        // 根据用户选择决定是否打开智能分析
        if (openAnalysis) {
          const profiles = await loadProfilesReturn();
          if (profiles && data.data) {
            const newProfile = profiles.find(p => p.id === data.data.id);
            if (newProfile) {
              setSelectedProfile(newProfile);
              setIsAnalysisOpen(true);
              setAnalysisResult('');
              analysisResultRef.current = '';
            }
          }
        } else {
          // 仅创建，刷新列表
          loadProfiles();
        }
      } else {
        toast.error(data.error || '创建失败');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('创建失败');
    }
  };

  // 加载并返回产品档案列表
  const loadProfilesReturn = async (): Promise<ProductProfile[] | null> => {
    try {
      const token = getToken();
      const response = await fetch('/api/product-profiles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setProfiles(data.data);
        return data.data;
      }
    } catch (error) {
      console.error('Load profiles error:', error);
    }
    return null;
  };

  // 带参数的AI定位分析
  const runPositioningWithProfile = async (profile: ProductProfile) => {
    setIsPositioningLoading(true);
    setPositioningResult('');

    try {
      const token = getToken();
      const response = await fetch('/api/product-profiles/positioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productProfileId: profile.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '分析失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setPositioningResult((prev) => prev + data.content);
                }
                if (data.done) {
                  setIsPositioningLoading(false);
                  loadProfiles(); // 刷新列表以获取最新的aiPositioning
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }

      toast.success('AI定位分析完成');
    } catch (error) {
      console.error('Positioning error:', error);
      toast.error(error instanceof Error ? error.message : '分析失败');
      setIsPositioningLoading(false);
    }
  };

  // 编辑产品档案
  const handleEdit = async () => {
    if (!selectedProfile) return;
    if (!formData.name.trim()) {
      toast.error('请填写产品名称');
      return;
    }

    try {
      const token = getToken();
      const response = await fetch('/api/product-profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: selectedProfile.id,
          ...formData,
          sellingPoints: formData.sellingPoints.filter(p => p.trim()),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('更新成功');
        setIsEditOpen(false);
        setSelectedProfile(null);
        resetForm();
        loadProfiles();
      } else {
        toast.error(data.error || '更新失败');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('更新失败');
    }
  };

  // 删除产品档案
  const handleDelete = async () => {
    if (!selectedProfile) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/product-profiles?id=${selectedProfile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('删除成功');
        setIsDeleteOpen(false);
        setSelectedProfile(null);
        loadProfiles();
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('删除失败');
    }
  };

  // 智能分析助手
  const handleOpenAnalysis = (profile: ProductProfile) => {
    setSelectedProfile(profile);
    setAnalysisResult('');
    analysisResultRef.current = '';
    setIsAnalysisOpen(true);
  };

  // 执行智能分析
  const runAnalysis = async (type: 'selling_point' | 'user_portrait' | 'value_ladder' | 'pain_point') => {
    if (!selectedProfile) return;

    setAnalysisType(type);
    setIsAnalysisLoading(true);
    setAnalysisResult('');
    analysisResultRef.current = '';

    const token = getToken();
    
    try {
      const response = await fetch('/api/qianchuan/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysisType: type,
          productInfo: {
            productName: selectedProfile.name,
            productCategory: selectedProfile.category,
            price: selectedProfile.price || '',
            sellingPoints: selectedProfile.sellingPoints || [],
            targetUsers: selectedProfile.targetUsers || '',
            userPainPoints: selectedProfile.userPainPoints || '',
            usageScenario: selectedProfile.usageScenario || '',
            promotion: selectedProfile.promotion || '',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '分析失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentResult = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // 按行处理SSE数据
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个不完整的行
          
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const jsonStr = line.slice(5).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  if (data.content) {
                    currentResult += data.content;
                    analysisResultRef.current = currentResult;
                    setAnalysisResult(currentResult);
                  }
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
        
        // 处理最后剩余的buffer
        if (buffer.startsWith('data:')) {
          try {
            const jsonStr = buffer.slice(5).trim();
            if (jsonStr) {
              const data = JSON.parse(jsonStr);
              if (data.content) {
                currentResult += data.content;
                analysisResultRef.current = currentResult;
                setAnalysisResult(currentResult);
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      // 保存分析结果到产品档案
      if (currentResult && selectedProfile) {
        try {
          const saveResponse = await fetch(`/api/product-profiles/${selectedProfile.id}/save-analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              analysisType: type,
              result: currentResult,
            }),
          });
          
          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            console.log('分析结果已保存:', saveData);
            toast.success('分析完成，结果已自动保存');
            // 更新本地产品档案数据
            if (saveData.profile) {
              setSelectedProfile(saveData.profile);
            }
            loadProfiles();
          } else {
            const saveError = await saveResponse.json();
            console.error('保存失败:', saveError);
            toast.success('分析完成，但保存失败');
          }
        } catch (e) {
          console.error('保存分析结果失败:', e);
          toast.success('分析完成');
        }
      } else {
        toast.success('分析完成');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : '分析失败');
    } finally {
      setIsAnalysisLoading(false);
      setAnalysisProgress('');
    }
  };

  // 一键全部分析
  const runAllAnalysis = async () => {
    if (!selectedProfile) return;

    setIsAnalysisLoading(true);
    setAnalysisResult('');
    analysisResultRef.current = '';

    const analysisTypes: Array<{ type: typeof analysisType; name: string }> = [
      { type: 'selling_point', name: '卖点拆解' },
      { type: 'user_portrait', name: '用户画像' },
      { type: 'value_ladder', name: '价值阶梯' },
      { type: 'pain_point', name: '痛点挖掘' },
    ];

    const token = getToken();
    let currentProfile = selectedProfile;

    for (let i = 0; i < analysisTypes.length; i++) {
      const { type, name } = analysisTypes[i];
      setAnalysisType(type);
      setAnalysisProgress(`正在分析: ${name} (${i + 1}/${analysisTypes.length})`);

      try {
        const response = await fetch('/api/qianchuan/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            analysisType: type,
            productInfo: {
              productName: currentProfile.name,
              productCategory: currentProfile.category,
              price: currentProfile.price || '',
              sellingPoints: currentProfile.sellingPoints || [],
              targetUsers: currentProfile.targetUsers || '',
              userPainPoints: currentProfile.userPainPoints || '',
              usageScenario: currentProfile.usageScenario || '',
              promotion: currentProfile.promotion || '',
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '分析失败');
        }

        // 读取流式数据
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let singleResult = '';

        if (reader) {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const jsonStr = line.slice(5).trim();
                  if (jsonStr) {
                    const data = JSON.parse(jsonStr);
                    if (data.content) {
                      singleResult += data.content;
                      // 追加到总结果
                      const newTotal = analysisResultRef.current + data.content;
                      analysisResultRef.current = newTotal;
                      setAnalysisResult(newTotal);
                    }
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        }

        // 保存当前分析结果并更新profile
        if (singleResult) {
          const saveResponse = await fetch(`/api/product-profiles/${currentProfile.id}/save-analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              analysisType: type,
              result: singleResult,
            }),
          });
          
          if (saveResponse.ok) {
            const saveData = await saveResponse.json();
            if (saveData.profile) {
              currentProfile = saveData.profile;
              setSelectedProfile(currentProfile);
            }
          }
        }

      } catch (error) {
        console.error(`${name}分析失败:`, error);
      }
      
      // 添加分隔符（除了最后一个）
      if (i < analysisTypes.length - 1) {
        const separator = '\n\n---\n\n';
        analysisResultRef.current += separator;
        setAnalysisResult(analysisResultRef.current);
      }
    }

    toast.success('全部智能分析已完成，结果已自动保存到产品档案');
    setIsAnalysisLoading(false);
    setAnalysisProgress('');
    loadProfiles();
  };

  // AI定位分析
  const handlePositioning = async (profile: ProductProfile) => {
    setSelectedProfile(profile);
    setIsPositioningOpen(true);
    setPositioningResult(profile.aiPositioning || '');
  };

  // 执行AI定位分析
  const runPositioning = async () => {
    if (!selectedProfile) return;

    setIsPositioningLoading(true);
    setPositioningResult('');

    try {
      const token = getToken();
      const response = await fetch('/api/product-profiles/positioning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productProfileId: selectedProfile.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '分析失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setPositioningResult((prev) => prev + data.content);
                }
                if (data.done) {
                  setIsPositioningLoading(false);
                  loadProfiles(); // 刷新列表以获取最新的aiPositioning
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }

      toast.success('分析完成');
    } catch (error) {
      console.error('Positioning error:', error);
      toast.error(error instanceof Error ? error.message : '分析失败');
      setIsPositioningLoading(false);
    }
  };

  // 复制分析结果
  const handleCopy = async () => {
    if (!positioningResult) return;
    await navigator.clipboard.writeText(positioningResult);
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  // 打开编辑对话框
  const openEdit = (profile: ProductProfile) => {
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      category: profile.category as ProductCategory,
      price: profile.price || '',
      sellingPoints: profile.sellingPoints.length > 0 ? profile.sellingPoints : [''],
      targetUsers: profile.targetUsers || '',
      userPainPoints: profile.userPainPoints || '',
      usageScenario: profile.usageScenario || '',
      promotion: profile.promotion || '',
      brandStory: profile.brandStory || '',
      competitorAnalysis: profile.competitorAnalysis || '',
    });
    setIsEditOpen(true);
  };

  // 筛选产品档案
  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      PRODUCT_CATEGORIES[profile.category as ProductCategory]?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">产品档案</h1>
              <p className="text-muted-foreground">管理产品信息，快速生成千川素材和信息流广告</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            新建产品档案
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="搜索产品名称或类目..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 产品档案列表 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">暂无产品档案</p>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                创建第一个产品档案
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfiles.map((profile) => {
              const CategoryIcon = CATEGORY_ICONS[profile.category] || Package;
              return (
                <Card key={profile.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-muted rounded-lg">
                          <CategoryIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{profile.name}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {PRODUCT_CATEGORIES[profile.category as ProductCategory]?.name || '其他'}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(profile)}>
                            <Edit className="w-4 h-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenAnalysis(profile)}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            智能分析
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePositioning(profile)}>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            AI定位分析
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setSelectedProfile(profile); setIsDeleteOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 卖点 */}
                    {profile.sellingPoints.length > 0 && (
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Tag className="w-3 h-3" />
                          核心卖点
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {profile.sellingPoints.slice(0, 3).map((point, i) => (
                            <Badge key={i} variant="outline" className="text-xs max-w-[120px] truncate">
                              {point}
                            </Badge>
                          ))}
                          {profile.sellingPoints.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.sellingPoints.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 目标人群 */}
                    {profile.targetUsers && (
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Users className="w-3 h-3" />
                          目标人群
                        </p>
                        <p className="text-sm truncate">{profile.targetUsers}</p>
                      </div>
                    )}

                    {/* 价格 */}
                    {profile.price && (
                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <Gift className="w-3 h-3" />
                          价格/优惠
                        </p>
                        <p className="text-sm font-medium text-orange-600 truncate">{profile.price}</p>
                      </div>
                    )}

                    {/* 智能分析状态 */}
                    {profile.analysisCompleted && (
                      <div 
                        className="flex items-center gap-1 text-sm text-green-600 cursor-pointer hover:text-green-700"
                        onClick={() => {
                          setSelectedProfile(profile);
                          setIsReportOpen(true);
                        }}
                      >
                        <Sparkles className="w-3 h-3" />
                        已完成智能分析
                        <span className="text-xs text-primary ml-1">[查看报告]</span>
                      </div>
                    )}

                    {/* AI定位状态 */}
                    {profile.aiPositioning && !profile.analysisCompleted && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        已完成AI定位分析
                      </div>
                    )}

                    {/* 快捷操作 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/qianchuan?profileId=${profile.id}`)}
                      >
                        千川素材
                      </Button>
                      {profile.analysisCompleted && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedProfile(profile);
                            setIsReportOpen(true);
                          }}
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          分析报告
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/feed-ad?profileId=${profile.id}`)}
                      >
                        信息流广告
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 创建对话框 */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建产品档案</DialogTitle>
              <DialogDescription>填写产品信息，用于生成千川素材和信息流广告</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* 基本信息 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>产品名称 *</Label>
                      <Input
                        placeholder="例：XX品牌玻尿酸精华液"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>产品类目</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value: ProductCategory) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRODUCT_CATEGORIES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>价格/优惠</Label>
                    <Input
                      placeholder="例：原价299，限时99元"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 核心卖点 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">核心卖点</CardTitle>
                    {formData.sellingPoints.length < 5 && (
                      <Button variant="outline" size="sm" onClick={addSellingPoint}>
                        <Plus className="w-4 h-4 mr-1" />
                        添加
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formData.sellingPoints.map((point, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`卖点${index + 1}`}
                        value={point}
                        onChange={(e) => updateSellingPoint(index, e.target.value)}
                      />
                      {formData.sellingPoints.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeSellingPoint(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 目标用户 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">目标用户</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>目标人群</Label>
                    <Input
                      placeholder="例：25-35岁关注护肤的都市女性"
                      value={formData.targetUsers}
                      onChange={(e) => setFormData({ ...formData, targetUsers: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>用户痛点</Label>
                    <Textarea
                      placeholder="例：皮肤干燥、细纹明显、护肤品吸收差"
                      value={formData.userPainPoints}
                      onChange={(e) => setFormData({ ...formData, userPainPoints: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>使用场景</Label>
                    <Input
                      placeholder="例：早晚护肤、妆前打底"
                      value={formData.usageScenario}
                      onChange={(e) => setFormData({ ...formData, usageScenario: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 营销信息 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">营销信息（选填）</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>优惠活动</Label>
                    <Input
                      placeholder="例：买一送一、限时7折"
                      value={formData.promotion}
                      onChange={(e) => setFormData({ ...formData, promotion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>品牌故事</Label>
                    <Textarea
                      placeholder="品牌背景、创立初衷等"
                      value={formData.brandStory}
                      onChange={(e) => setFormData({ ...formData, brandStory: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>竞品分析</Label>
                    <Textarea
                      placeholder="主要竞品及差异化优势"
                      value={formData.competitorAnalysis}
                      onChange={(e) => setFormData({ ...formData, competitorAnalysis: e.target.value })}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 智能分析提示 */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">创建后可进行智能分析</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        基于千川编导方法论，提供卖点拆解、用户画像、价值阶梯、痛点挖掘四大分析工具，一次分析永久复用
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  取消
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleCreate(false)}>
                    仅创建
                  </Button>
                  <Button onClick={() => handleCreate(true)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    创建并分析
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 编辑对话框 */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑产品档案</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic" className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  基础信息
                </TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  智能分析报告
                </TabsTrigger>
              </TabsList>
              
              {/* 基础信息 Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* 基本信息 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>产品名称 *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>产品类目</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value: ProductCategory) =>
                            setFormData({ ...formData, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRODUCT_CATEGORIES).map(([key, value]) => (
                              <SelectItem key={key} value={key}>
                                {value.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>价格/优惠</Label>
                      <Input
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 核心卖点 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">核心卖点</CardTitle>
                      {formData.sellingPoints.length < 5 && (
                        <Button variant="outline" size="sm" onClick={addSellingPoint}>
                          <Plus className="w-4 h-4 mr-1" />
                          添加
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {formData.sellingPoints.map((point, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={point}
                          onChange={(e) => updateSellingPoint(index, e.target.value)}
                        />
                        {formData.sellingPoints.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeSellingPoint(index)}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 目标用户 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">目标用户</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>目标人群</Label>
                      <Input
                        value={formData.targetUsers}
                        onChange={(e) => setFormData({ ...formData, targetUsers: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>用户痛点</Label>
                      <Textarea
                        value={formData.userPainPoints}
                        onChange={(e) => setFormData({ ...formData, userPainPoints: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>使用场景</Label>
                      <Input
                        value={formData.usageScenario}
                        onChange={(e) => setFormData({ ...formData, usageScenario: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 营销信息 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">营销信息（选填）</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>优惠活动</Label>
                      <Input
                        value={formData.promotion}
                        onChange={(e) => setFormData({ ...formData, promotion: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>品牌故事</Label>
                      <Textarea
                        value={formData.brandStory}
                        onChange={(e) => setFormData({ ...formData, brandStory: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>竞品分析</Label>
                      <Textarea
                        value={formData.competitorAnalysis}
                        onChange={(e) => setFormData({ ...formData, competitorAnalysis: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleEdit}>保存</Button>
                </div>
              </TabsContent>
              
              {/* 智能分析报告 Tab */}
              <TabsContent value="analysis" className="space-y-4 mt-4">
                {selectedProfile ? (
                  <>
                    {/* 智能分析报告卡片 */}
                    <AnalysisReportCard profile={selectedProfile} />
                    
                    {/* 智能分析助手按钮 */}
                    <Card className="border-primary/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          执行智能分析
                        </CardTitle>
                        <CardDescription>
                          千川编导方法论智能分析，一次分析永久复用
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleOpenAnalysis(selectedProfile)}
                          >
                            <Target className="w-4 h-4 mr-1" />
                            卖点拆解
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleOpenAnalysis(selectedProfile)}
                          >
                            <Users className="w-4 h-4 mr-1" />
                            用户画像
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleOpenAnalysis(selectedProfile)}
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            价值阶梯
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleOpenAnalysis(selectedProfile)}
                          >
                            <Target className="w-4 h-4 mr-1" />
                            痛点挖掘
                          </Button>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full"
                          onClick={() => handleOpenAnalysis(selectedProfile)}
                        >
                          <Sparkles className="w-4 h-4 mr-1" />
                          一键全部分析
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        请先保存产品档案后查看智能分析报告
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* 智能分析助手对话框 */}
        <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                智能分析助手
              </DialogTitle>
              <DialogDescription>
                {selectedProfile?.name} - 千川编导方法论智能分析
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* 分析类型选择 + 一键全部分析 */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'selling_point', label: '卖点拆解', icon: Target },
                    { key: 'user_portrait', label: '用户画像', icon: Users },
                    { key: 'value_ladder', label: '价值阶梯', icon: TrendingUp },
                    { key: 'pain_point', label: '痛点挖掘', icon: Target },
                  ].map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      variant={analysisType === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => runAnalysis(key as typeof analysisType)}
                      disabled={isAnalysisLoading}
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="flex-1" />
                <Button
                  variant="default"
                  size="sm"
                  onClick={runAllAnalysis}
                  disabled={isAnalysisLoading}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  一键全部分析
                </Button>
              </div>

              {/* 分析结果 - 固定高度可滚动 */}
              <Card className="min-h-[400px] max-h-[400px] overflow-hidden">
                <CardContent className="pt-4 h-full overflow-y-auto">
                  {analysisResult ? (
                    <div>
                      {/* 保存成功提示 */}
                      {!isAnalysisLoading && (
                        <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <Check className="w-4 h-4" />
                            <span className="font-medium text-sm">分析结果已自动保存到产品档案</span>
                          </div>
                          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                            关闭窗口后可跳转到素材创作页面使用分析结果
                          </p>
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                        {analysisResult}
                      </div>
                    </div>
                  ) : isAnalysisLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[350px]">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                      <p className="text-muted-foreground">正在分析中...</p>
                      {analysisProgress && (
                        <p className="text-sm text-muted-foreground mt-2">{analysisProgress}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[350px]">
                      <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        点击上方按钮开始智能分析
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        单次分析消耗 50 算力，一键全部分析消耗 200 算力
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setIsAnalysisOpen(false)} disabled={isAnalysisLoading}>
                  {analysisResult && !isAnalysisLoading ? '完成' : '关闭'}
                </Button>
                {selectedProfile?.analysisCompleted && !isAnalysisLoading && (
                  <Button onClick={() => router.push(`/qianchuan?profileId=${selectedProfile.id}`)}>
                    去创作素材
                    <Sparkles className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI定位分析对话框 */}
        <Dialog open={isPositioningOpen} onOpenChange={setIsPositioningOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI产品定位分析
              </DialogTitle>
              <DialogDescription>
                {selectedProfile?.name} - 基于产品信息生成精准的市场定位建议
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {positioningResult ? (
                <>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={runPositioning}
                      disabled={isPositioningLoading}
                    >
                      {isPositioningLoading ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1" />
                      )}
                      重新分析
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <Check className="w-4 h-4 mr-1" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      复制
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                        {positioningResult}
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => {
                        setIsPositioningOpen(false);
                        setSelectedProfile(null);
                        setPositioningResult('');
                      }}
                    >
                      完成并返回
                    </Button>
                  </div>
                </>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground mb-4">
                      点击下方按钮开始AI定位分析
                    </p>
                    <Button onClick={runPositioning} disabled={isPositioningLoading}>
                      {isPositioningLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      开始分析
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* 智能分析报告弹窗 */}
        <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                智能分析报告
              </DialogTitle>
              <DialogDescription>
                {selectedProfile?.name} - 千川编导方法论结构化分析结果
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedProfile && <AnalysisReportCard profile={selectedProfile} />}
              
              {/* 操作按钮 */}
              <div className="flex justify-between gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsReportOpen(false);
                    if (selectedProfile) {
                      handleOpenAnalysis(selectedProfile);
                    }
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  重新分析
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                    关闭
                  </Button>
                  <Button onClick={() => {
                    setIsReportOpen(false);
                    router.push(`/qianchuan?profileId=${selectedProfile?.id}`);
                  }}>
                    去创作素材
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除产品档案「{selectedProfile?.name}」吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
