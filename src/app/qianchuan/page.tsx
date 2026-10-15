'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  ShoppingCart,
  Loader2, 
  Sparkles,
  FileText,
  Film,
  MessageSquare,
  GitCompare,
  Plus,
  X,
  Shield,
  Package,
  Lightbulb,
  Target,
  TrendingUp,
  Heart,
  Zap,
  Users,
  AlertCircle,
  Copy,
  Check,
  Wand2,
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ProductInfo,
  ProductCategory,
  QianchuanMaterialType,
  QianchuanCreativeMode,
  QIANCHUAN_CREATIVE_MODES,
  PRODUCT_CATEGORIES,
} from '@/lib/ad-templates';
import { ANALYSIS_TOOLS } from '@/lib/qianchuan-methodology';
import { useFormTemplates, getDefaultTemplateName } from '@/hooks/useFormTemplates';
import { TemplateManager } from '@/components/form/TemplateManager';
import { GenerationHistory } from '@/components/history/GenerationHistory';

// 产品档案类型
interface ProductProfile {
  id: number;
  name: string;
  category: string;
  price: string | null;
  sellingPoints: string[];
  targetUsers: string | null;
  userPainPoints: string | null;
  usageScenario: string | null;
  promotion: string | null;
  aiPositioning: string | null;
  // 扩展字段
  analysisCompleted: boolean;
  analysisAt: string | null;
}

// 素材类型配置
const MATERIAL_TYPES: Array<{
  id: QianchuanMaterialType;
  name: string;
  desc: string;
  icon: React.ElementType;
}> = [
  { id: 'product_seeding', name: '产品种草', desc: '直接展示产品卖点', icon: ShoppingCart },
  { id: 'review_comparison', name: '测评对比', desc: '通过对比突出优势', icon: GitCompare },
  { id: 'story_insertion', name: '剧情植入', desc: '故事场景自然植入', icon: Film },
  { id: 'talking_head', name: '口播讲解', desc: '专业讲解建立信任', icon: MessageSquare },
];

// 分析工具图标映射
const ANALYSIS_ICONS: Record<string, React.ElementType> = {
  selling_point: Lightbulb,
  user_portrait: Users,
  value_ladder: TrendingUp,
  pain_point: AlertCircle,
};

function QianchuanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contentType, setContentType] = useState<'copywriting' | 'script'>('copywriting');
  const [creativeMode, setCreativeMode] = useState<QianchuanCreativeMode | ''>('');

  const [productProfiles, setProductProfiles] = useState<ProductProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  const [productInfo, setProductInfo] = useState<ProductInfo>({
    productName: '',
    productCategory: 'other',
    price: '',
    sellingPoints: [''],
    targetUsers: '',
    userPainPoints: '',
    usageScenario: '',
    promotion: '',
  });

  const [materialType, setMaterialType] = useState<QianchuanMaterialType>('product_seeding');
  const [wordCount, setWordCount] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [enableProhibitedCheck, setEnableProhibitedCheck] = useState(true);

  // 智能分析相关状态
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [analysisType, setAnalysisType] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const {
    templates,
    saveTemplate,
    deleteTemplate,
    loadTemplate,
    isNameExists,
  } = useFormTemplates<{
    productInfo: ProductInfo;
    materialType: QianchuanMaterialType;
    creativeMode: QianchuanCreativeMode | '';
    wordCount: string;
    additionalRequirements: string;
    enableProhibitedCheck: boolean;
  }>('qianchuan');

  useEffect(() => {
    loadProductProfiles();
  }, []);

  useEffect(() => {
    const profileId = searchParams.get('profileId');
    if (profileId && productProfiles.length > 0) {
      setSelectedProfileId(profileId);
      const profile = productProfiles.find(p => p.id === Number(profileId));
      if (profile) fillFormWithProfile(profile);
    }
  }, [searchParams, productProfiles]);

  const loadProductProfiles = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/product-profiles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setProductProfiles(data.data);
      }
    } catch (error) {
      console.error('Load product profiles error:', error);
    }
  };

  const fillFormWithProfile = (profile: ProductProfile) => {
    setProductInfo({
      productName: profile.name,
      productCategory: profile.category as ProductCategory,
      price: profile.price || '',
      sellingPoints: profile.sellingPoints.length > 0 ? profile.sellingPoints : [''],
      targetUsers: profile.targetUsers || '',
      userPainPoints: profile.userPainPoints || '',
      usageScenario: profile.usageScenario || '',
      promotion: profile.promotion || '',
      aiPositioning: profile.aiPositioning || undefined,
    });
  };

  const handleProfileChange = async (profileId: string) => {
    setSelectedProfileId(profileId);
    if (profileId) {
      // 重新获取最新的产品档案数据
      try {
        const token = getToken();
        const response = await fetch(`/api/product-profiles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const profile = data.data.find((p: ProductProfile) => p.id === Number(profileId));
          if (profile) {
            setProductProfiles(data.data);
            fillFormWithProfile(profile);
          }
        }
      } catch (error) {
        console.error('Load profile error:', error);
        // 如果获取失败，使用本地缓存的数据
        const profile = productProfiles.find(p => p.id === Number(profileId));
        if (profile) fillFormWithProfile(profile);
      }
    }
  };

  const handleSaveTemplate = (name: string, data: Record<string, any>) => {
    saveTemplate(name, {
      productInfo: data.productInfo || productInfo,
      materialType: data.materialType || materialType,
      creativeMode: data.creativeMode || creativeMode,
      wordCount: data.wordCount || wordCount,
      additionalRequirements: data.additionalRequirements || additionalRequirements,
      enableProhibitedCheck: data.enableProhibitedCheck ?? enableProhibitedCheck,
    });
  };

  const handleLoadTemplate = (data: Record<string, any>) => {
    if (data.productInfo) setProductInfo(data.productInfo);
    if (data.materialType) setMaterialType(data.materialType);
    if (data.creativeMode !== undefined) setCreativeMode(data.creativeMode);
    if (data.wordCount !== undefined) setWordCount(data.wordCount);
    if (data.additionalRequirements !== undefined) setAdditionalRequirements(data.additionalRequirements);
    if (data.enableProhibitedCheck !== undefined) setEnableProhibitedCheck(data.enableProhibitedCheck);
    setSelectedProfileId('');
  };

  const addSellingPoint = () => {
    if (productInfo.sellingPoints.length < 5) {
      setProductInfo({
        ...productInfo,
        sellingPoints: [...productInfo.sellingPoints, ''],
      });
    }
  };

  const removeSellingPoint = (index: number) => {
    const newPoints = productInfo.sellingPoints.filter((_, i) => i !== index);
    setProductInfo({
      ...productInfo,
      sellingPoints: newPoints.length > 0 ? newPoints : [''],
    });
  };

  const updateSellingPoint = (index: number, value: string) => {
    const newPoints = [...productInfo.sellingPoints];
    newPoints[index] = value;
    setProductInfo({ ...productInfo, sellingPoints: newPoints });
  };

  // 执行智能分析
  const handleAnalyze = async (type: string) => {
    if (!productInfo.productName.trim()) {
      toast.error('请先填写产品名称');
      return;
    }
    if (!productInfo.sellingPoints[0]?.trim()) {
      toast.error('请先填写至少一个核心卖点');
      return;
    }

    setAnalysisType(type);
    setAnalysisResult('');
    setIsAnalyzing(true);
    setIsAnalyzeOpen(true);

    try {
      const token = getToken();
      const response = await fetch('/api/qianchuan/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          analysisType: type,
          productInfo: {
            productName: productInfo.productName,
            productCategory: productInfo.productCategory,
            price: productInfo.price,
            sellingPoints: productInfo.sellingPoints.filter(p => p.trim()),
            targetUsers: productInfo.targetUsers,
            userPainPoints: productInfo.userPainPoints,
            usageScenario: productInfo.usageScenario,
            promotion: productInfo.promotion,
          },
        }),
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
                  setAnalysisResult((prev) => prev + data.content);
                }
                if (data.done) {
                  setIsAnalyzing(false);
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
    } catch (error) {
      console.error('Analyze error:', error);
      toast.error(error instanceof Error ? error.message : '分析失败');
      setIsAnalyzing(false);
    }
  };

  // 复制分析结果
  const handleCopyResult = async () => {
    if (!analysisResult) return;
    await navigator.clipboard.writeText(analysisResult);
    setCopied(true);
    toast.success('已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  // 将分析结果应用到表单 - 智能解析并填充
  const applyAnalysisToForm = () => {
    if (!analysisResult) return;

    let updated = false;
    const newProductInfo = { ...productInfo };
    const newAdditionalRequirements = additionalRequirements;

    switch (analysisType) {
      case 'selling_point': {
        // 卖点拆解：提取核心卖点（带✓或数字开头的行）
        const sellingLines = analysisResult
          .split('\n')
          .filter(line => /^[\d\-\•\*]\s*\.?\s*[^\s]/.test(line.trim()) || line.includes('核心卖点'))
          .map(line => line.replace(/^[\d\-\•\*]\s*\.?\s*/, '').replace(/\*\*/g, '').trim())
          .filter(line => line.length > 5 && line.length < 50)
          .slice(0, 3);
        
        if (sellingLines.length > 0) {
          // 只填充空的卖点字段，不覆盖已有的
          const emptyIndices = productInfo.sellingPoints
            .map((sp, idx) => sp.trim() === '' ? idx : -1)
            .filter(idx => idx !== -1);
          
          emptyIndices.forEach((idx, i) => {
            if (sellingLines[i]) {
              newProductInfo.sellingPoints[idx] = sellingLines[i];
            }
          });
          
          // 如果有空位，添加更多卖点
          if (newProductInfo.sellingPoints.length < 5) {
            const remainingPoints = sellingLines.slice(emptyIndices.length);
            remainingPoints.forEach(point => {
              if (newProductInfo.sellingPoints.length < 5) {
                newProductInfo.sellingPoints.push(point);
              }
            });
          }
          updated = true;
        }

        // 提取价值表达建议添加到补充要求
        const expressionLines = analysisResult
          .split('\n')
          .filter(line => line.includes('表达方式') || line.includes('推荐表达'))
          .slice(0, 2)
          .join('；');
        
        if (expressionLines) {
          setAdditionalRequirements(prev => {
            const newReq = prev 
              ? `${prev}\n\n【卖点表达建议】${expressionLines}` 
              : `【卖点表达建议】${expressionLines}`;
            return newReq.substring(0, 500);
          });
          updated = true;
        }
        break;
      }

      case 'user_portrait': {
        // 用户画像：提取基础画像描述
        const portraitMatch = analysisResult.match(/(?:基础画像|目标用户)[：:]\s*([\s\S]*?)(?=\n\n|###|##|$)/);
        if (portraitMatch) {
          const portrait = portraitMatch[1]
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(line => line.replace(/^[\-\•\*]\s*/, '').trim())
            .join('，')
            .substring(0, 100);
          
          if (portrait && !newProductInfo.targetUsers.trim()) {
            newProductInfo.targetUsers = portrait;
            updated = true;
          }
        }

        // 如果没匹配到，尝试提取年龄段和性别
        if (!updated) {
          const ageMatch = analysisResult.match(/(\d{1,3}[-~]\d{1,3}岁?)/);
          const genderMatch = analysisResult.match(/(男性|女性|男女均可)/);
          
          if (ageMatch || genderMatch) {
            const parts = [ageMatch?.[1], genderMatch?.[1]].filter(Boolean);
            if (parts.length > 0 && !newProductInfo.targetUsers.trim()) {
              newProductInfo.targetUsers = parts.join('，');
              updated = true;
            }
          }
        }
        break;
      }

      case 'value_ladder': {
        // 价值阶梯：添加到补充要求作为创作指导
        const valueLines = analysisResult
          .split('\n')
          .filter(line => line.includes('价值') || line.includes('情感') || line.includes('功能'))
          .slice(0, 4)
          .join('；');
        
        if (valueLines) {
          setAdditionalRequirements(prev => {
            const newReq = prev 
              ? `${prev}\n\n【价值阶梯】\n${valueLines}` 
              : `【价值阶梯】\n${valueLines}`;
            return newReq.substring(0, 500);
          });
          updated = true;
        }
        break;
      }

      case 'pain_point': {
        // 痛点挖掘：提取痛点列表
        const painLines = analysisResult
          .split('\n')
          .filter(line => 
            /^[\d\-\•\*]\s*\.?\s*[^\s]/.test(line.trim()) || 
            line.includes('痛点') || 
            line.includes('困扰') ||
            line.includes('问题')
          )
          .map(line => line.replace(/^[\d\-\•\*]\s*\.?\s*/, '').replace(/\*\*/g, '').trim())
          .filter(line => line.length > 5 && line.length < 40)
          .slice(0, 3);
        
        if (painLines.length > 0) {
          const painPoints = painLines.join('；');
          newProductInfo.userPainPoints = painPoints;
          updated = true;
        }
        break;
      }
    }

    if (updated) {
      setProductInfo(newProductInfo);
      toast.success('已智能应用到表单');
      setIsAnalyzeOpen(false);
    } else {
      toast.info('请手动复制需要的内容');
    }
  };

  const handleGenerate = () => {
    if (!productInfo.productName.trim()) {
      toast.error('请填写产品名称');
      return;
    }
    if (!productInfo.sellingPoints[0]?.trim()) {
      toast.error('请至少填写一个核心卖点');
      return;
    }
    if (!productInfo.targetUsers.trim()) {
      toast.error('请填写目标用户');
      return;
    }

    const params = {
      productInfo,
      materialType,
      wordCount: wordCount ? parseInt(wordCount) : undefined,
      additionalRequirements,
      enableProhibitedCheck,
      selectedProfileId,
      creativeMode: creativeMode || undefined,
    };
    sessionStorage.setItem('generation_params', JSON.stringify(params));
    
    const resultType = contentType === 'copywriting' ? 'qianchuan_copywriting' : 'qianchuan_script';
    router.push(`/script/result?type=${resultType}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 - 苹果风格 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-feed">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">千川素材创作</h1>
              <p className="text-muted-foreground text-sm mt-0.5">抖音电商专属带货素材，支持多种创作模式</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GenerationHistory
              currentType="qianchuan_copywriting"
              onSelectHistory={(item) => {
                // 使用正确的历史记录恢复方式：存储完整历史记录，通过 historyId 恢复
                sessionStorage.setItem(`history_${item.id}`, JSON.stringify(item));
                router.push(`/script/result?type=qianchuan_copywriting&historyId=${item.id}`);
              }}
              variant="button"
            />
            <TemplateManager
              type="qianchuan"
              templates={templates}
              currentData={{
                productInfo,
                materialType,
                creativeMode,
                wordCount,
                additionalRequirements,
                enableProhibitedCheck,
              }}
              onSave={handleSaveTemplate}
              onLoad={handleLoadTemplate}
              onDelete={deleteTemplate}
              isNameExists={isNameExists}
              defaultName={getDefaultTemplateName('qianchuan')}
            />
          </div>
        </div>

        {/* 产品档案选择 - 苹果风格 */}
        <Card className="border-0 rounded-3xl bg-muted">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Package className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <Label className="text-sm font-medium">选择产品档案（可选）</Label>
                <p className="text-xs text-muted-foreground">快速加载已保存的产品信息</p>
              </div>
              <Select value={selectedProfileId} onValueChange={handleProfileChange}>
                <SelectTrigger className="w-[200px] rounded-[10px]">
                  <SelectValue placeholder={productProfiles.length === 0 ? "暂无产品档案" : "选择产品档案"} />
                </SelectTrigger>
                <SelectContent>
                  {productProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/product-profiles')}
                className="rounded-[10px]"
              >
                管理
              </Button>
            </div>
            {/* 智能分析状态提示 */}
            {selectedProfileId && (() => {
              const profile = productProfiles.find(p => p.id === Number(selectedProfileId));
              if (!profile) return null;
              return profile.analysisCompleted ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                  <span>已完成智能分析，素材生成质量更优</span>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-xl">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>尚未完成智能分析</span>
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-amber-600 p-0 h-auto"
                    onClick={() => router.push('/product-profiles')}
                  >
                    去分析
                  </Button>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 产品基础信息 */}
          <Card className="border-0 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">产品信息</CardTitle>
              <CardDescription>填写产品基本信息，AI将基于此生成针对性素材</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productName">产品名称 *</Label>
                <Input
                  id="productName"
                  placeholder="例：XX品牌玻尿酸精华液"
                  value={productInfo.productName}
                  onChange={(e) => setProductInfo({ ...productInfo, productName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">产品类目 *</Label>
                <Select
                  value={productInfo.productCategory}
                  onValueChange={(value: ProductCategory) =>
                    setProductInfo({ ...productInfo, productCategory: value })
                  }
                >
                  <SelectTrigger className="rounded-[10px]">
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

              <div className="space-y-2">
                <Label htmlFor="price">价格/优惠</Label>
                <Input
                  id="price"
                  placeholder="例：原价299，限时99元"
                  value={productInfo.price}
                  onChange={(e) => setProductInfo({ ...productInfo, price: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>核心卖点 *（最多5个）</Label>
                  {productInfo.sellingPoints.length < 5 && (
                    <Button variant="outline" size="sm" onClick={addSellingPoint} className="rounded-lg">
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  )}
                </div>
                {productInfo.sellingPoints.map((point, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`卖点${index + 1}`}
                      value={point}
                      onChange={(e) => updateSellingPoint(index, e.target.value)}
                    />
                    {productInfo.sellingPoints.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeSellingPoint(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 目标用户 */}
          <Card className="border-0 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">目标用户</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetUsers">目标人群 *</Label>
                <Input
                  id="targetUsers"
                  placeholder="例：25-35岁关注护肤的都市女性"
                  value={productInfo.targetUsers}
                  onChange={(e) => setProductInfo({ ...productInfo, targetUsers: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="painPoints">用户痛点</Label>
                <Textarea
                  id="painPoints"
                  placeholder="例：皮肤干燥、细纹明显"
                  value={productInfo.userPainPoints}
                  onChange={(e) => setProductInfo({ ...productInfo, userPainPoints: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenario">使用场景</Label>
                <Input
                  id="scenario"
                  placeholder="例：早晚护肤、妆前打底"
                  value={productInfo.usageScenario}
                  onChange={(e) => setProductInfo({ ...productInfo, usageScenario: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotion">优惠活动</Label>
                <Input
                  id="promotion"
                  placeholder="例：买一送一、限时7折"
                  value={productInfo.promotion}
                  onChange={(e) => setProductInfo({ ...productInfo, promotion: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 智能分析助手 - 千川编导方法论 */}
        <Card className="border-0 rounded-3xl bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Wand2 className="w-5 h-5 text-primary" />
              智能分析助手
              <Badge variant="secondary" className="text-xs">千川编导方法论</Badge>
            </CardTitle>
            <CardDescription>一键深度分析产品，提升素材质量</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 已分析状态提示 */}
            {selectedProfileId && (() => {
              const profile = productProfiles.find(p => p.id === Number(selectedProfileId));
              if (profile?.analysisCompleted) {
                return (
                  <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium text-sm">已完成智能分析</span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                      该产品已完成千川编导方法论分析，分析结果已自动应用到素材生成中，无需重复分析
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ANALYSIS_TOOLS.map((tool) => {
                const Icon = ANALYSIS_ICONS[tool.id] || Lightbulb;
                const profile = productProfiles.find(p => p.id === Number(selectedProfileId));
                const isCompleted = profile?.analysisCompleted;
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleAnalyze(tool.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all text-center group",
                      isCompleted 
                        ? "bg-green-50/80 dark:bg-green-950/30 cursor-default" 
                        : "bg-white/80 hover:bg-white"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      isCompleted 
                        ? "bg-green-100 dark:bg-green-900" 
                        : "bg-primary/10 group-hover:bg-primary group-hover:text-white"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isCompleted 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-primary group-hover:text-white"
                      )} />
                    </div>
                    <div className="font-medium text-foreground text-sm">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">{tool.description}</div>
                    {isCompleted && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                        已完成
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 素材类型选择 - 苹果风格 */}
        <Card className="border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">素材类型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MATERIAL_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = materialType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setMaterialType(type.id)}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl text-left transition-all",
                      isSelected 
                        ? "bg-warning/10 ring-2 ring-feed" 
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isSelected ? "bg-feed" : "bg-muted-foreground/20"
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{type.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{type.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 创作模式选择 - 苹果风格 */}
        <Card className="border-0 rounded-3xl bg-warning/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Lightbulb className="w-5 h-5 text-feed" />
              创作模式
              <span className="text-sm font-normal text-muted-foreground">（五大爆款公式）</span>
            </CardTitle>
            <CardDescription>选择创作模式，AI将按照对应技巧生成内容</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(QIANCHUAN_CREATIVE_MODES).map(([key, mode]) => {
                const isSelected = creativeMode === key;
                const IconMap: Record<string, React.ElementType> = {
                  scenario_formula: Target,
                  effect_visualization: TrendingUp,
                  price_anchoring: Zap,
                  emotional_resonance: Heart,
                  contrast_structure: Sparkles,
                };
                const Icon = IconMap[key] || Sparkles;
                
                return (
                  <button
                    key={key}
                    onClick={() => setCreativeMode(creativeMode === key ? '' : key as QianchuanCreativeMode)}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl text-left transition-all",
                      isSelected 
                        ? "bg-white ring-2 ring-feed" 
                        : "bg-white/50 hover:bg-white/70"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      isSelected ? "bg-feed" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        isSelected ? "text-white" : "text-foreground"
                      )} />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{mode.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{mode.shortName}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 生成设置 */}
        <Card className="border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">生成设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>内容类型</Label>
              <div className="flex gap-3">
                <Button
                  variant={contentType === 'copywriting' ? 'default' : 'outline'}
                  onClick={() => setContentType('copywriting')}
                  className="flex-1 rounded-xl"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  文案
                </Button>
                <Button
                  variant={contentType === 'script' ? 'default' : 'outline'}
                  onClick={() => setContentType('script')}
                  className="flex-1 rounded-xl"
                >
                  <Film className="w-4 h-4 mr-2" />
                  脚本
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wordCount">字数要求（可选）</Label>
                <Input
                  id="wordCount"
                  type="number"
                  placeholder="例：200"
                  value={wordCount}
                  onChange={(e) => setWordCount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-muted">
                  <input
                    type="checkbox"
                    id="prohibitedCheck"
                    checked={enableProhibitedCheck}
                    onChange={(e) => setEnableProhibitedCheck(e.target.checked)}
                    className="rounded"
                  />
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm">启用违禁词检测</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">补充要求（可选）</Label>
              <Textarea
                id="requirements"
                placeholder="例：语气要活泼一点，加入一些网络流行语"
                value={additionalRequirements}
                onChange={(e) => setAdditionalRequirements(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              onClick={handleGenerate}
              className="w-full h-12 text-white border-0 rounded-[14px] bg-feed hover:bg-feed/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              生成{contentType === 'copywriting' ? '文案' : '脚本'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 智能分析结果弹窗 */}
      <Dialog open={isAnalyzeOpen} onOpenChange={setIsAnalyzeOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {ANALYSIS_TOOLS.find(t => t.id === analysisType)?.name || '分析结果'}
            </DialogTitle>
            <DialogDescription>
              基于千川编导方法论的深度分析
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-hidden">
            {isAnalyzing && !analysisResult ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">正在分析中...</span>
              </div>
            ) : (
              <div 
                ref={resultRef}
                className="h-[400px] overflow-y-auto p-4 bg-muted rounded-xl text-sm whitespace-pre-wrap"
              >
                {analysisResult}
                {isAnalyzing && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              {analysisResult.length > 0 && `${analysisResult.length} 字`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAnalyzeOpen(false)}>
                关闭
              </Button>
              <Button variant="outline" onClick={handleCopyResult} disabled={!analysisResult}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    复制结果
                  </>
                )}
              </Button>
              <Button 
                onClick={applyAnalysisToForm} 
                disabled={!analysisResult || isAnalyzing}
                className="bg-feed hover:bg-feed/90"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                智能应用到表单
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default function QianchuanPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <QianchuanPageContent />
    </Suspense>
  );
}
