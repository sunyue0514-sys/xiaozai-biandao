'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Radio,
  Loader2,
  Sparkles,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Target,
  Film,
  Store,
  Tag,
  Users,
  Lightbulb,
  Shield,
} from 'lucide-react';
import { getToken } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  INDUSTRY_TYPES,
  SCENARIO_TYPES,
  getRecommendedScenarios,
  calculateDiscount,
} from '@/lib/live-speech-types';

// 套餐明细项接口
interface PackageItem {
  name: string;
  originalPrice: number | null;
  description: string;
}

function LivePageContent() {
  const router = useRouter();
  
  // 表单状态
  const [merchantName, setMerchantName] = useState('');
  const [industry, setIndustry] = useState<keyof typeof INDUSTRY_TYPES>('catering');
  const [originalPrice, setOriginalPrice] = useState('');
  const [livePrice, setLivePrice] = useState('');
  const [packageContent, setPackageContent] = useState('');
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [sellingPoints, setSellingPoints] = useState<string[]>(['']);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [afterSalesPolicy, setAfterSalesPolicy] = useState('');
  const [targetScenarios, setTargetScenarios] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  // UI状态
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 添加套餐明细项
  const addPackageItem = () => {
    setPackageItems([...packageItems, { name: '', originalPrice: null, description: '' }]);
  };

  // 移除套餐明细项
  const removePackageItem = (index: number) => {
    setPackageItems(packageItems.filter((_, i) => i !== index));
  };

  // 更新套餐明细项
  const updatePackageItem = (index: number, field: keyof PackageItem, value: string | number | null) => {
    const newItems = [...packageItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setPackageItems(newItems);
  };

  // 添加卖点
  const addSellingPoint = () => {
    if (sellingPoints.length < 5) {
      setSellingPoints([...sellingPoints, '']);
    }
  };

  // 移除卖点
  const removeSellingPoint = (index: number) => {
    setSellingPoints(sellingPoints.filter((_, i) => i !== index));
  };

  // 更新卖点
  const updateSellingPoint = (index: number, value: string) => {
    const newPoints = [...sellingPoints];
    newPoints[index] = value;
    setSellingPoints(newPoints);
  };

  // 添加亮点
  const addHighlight = () => {
    setHighlights([...highlights, '']);
  };

  // 移除亮点
  const removeHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  // 更新亮点
  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    setHighlights(newHighlights);
  };

  // 切换场景选择
  const toggleScenario = (scenarioId: string) => {
    if (targetScenarios.includes(scenarioId)) {
      setTargetScenarios(targetScenarios.filter(s => s !== scenarioId));
    } else {
      setTargetScenarios([...targetScenarios, scenarioId]);
    }
  };

  // 生成话术
  const handleGenerate = () => {
    // 验证必填项
    if (!merchantName.trim()) {
      toast.error('请输入商家名称');
      return;
    }
    if (!packageContent.trim()) {
      toast.error('请输入套餐内容');
      return;
    }
    if (!originalPrice || !livePrice) {
      toast.error('请输入原价和直播价');
      return;
    }
    
    const originalPriceNum = parseFloat(originalPrice);
    const livePriceNum = parseFloat(livePrice);
    
    if (isNaN(originalPriceNum) || isNaN(livePriceNum)) {
      toast.error('价格格式不正确');
      return;
    }
    
    if (livePriceNum >= originalPriceNum) {
      toast.error('直播价应小于原价');
      return;
    }

    // 保存参数到 sessionStorage
    const params = {
      merchantName,
      industry,
      originalPrice: originalPriceNum,
      livePrice: livePriceNum,
      packageContent,
      packageItems: packageItems.filter(item => item.name.trim()),
      sellingPoints: sellingPoints.filter(s => s.trim()),
      highlights: highlights.filter(h => h.trim()),
      afterSalesPolicy,
      targetScenarios,
      targetAudience,
      additionalInfo,
    };
    
    sessionStorage.setItem('generation_params', JSON.stringify(params));
    router.push('/script/result?type=live_speech');
  };

  // 获取推荐的场景
  const recommendedScenarios = getRecommendedScenarios(industry);

  // 计算折扣预览
  const discountPreview = originalPrice && livePrice 
    ? calculateDiscount(parseFloat(originalPrice) || 0, parseFloat(livePrice) || 0)
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary">
            <Radio className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">团购直播话术</h1>
            <p className="text-muted-foreground text-sm mt-0.5">基于五步法框架，生成高转化直播话术</p>
          </div>
        </div>

        {/* 功能说明卡片 */}
        <Card className="border-0 rounded-3xl bg-muted">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  AI 将生成 <strong>三套话术</strong>：爆款冲单版（价格钩）| 精准转化版（痛点钩）| 情感共鸣版（场景钩）
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  五步法框架：开场留人 → 价值塑造 → 场景代入 → 稀缺促单 → 信任保障
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 基础信息 */}
        <Card className="border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Store className="w-5 h-5 text-primary" />
              基础信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="merchantName">商家名称 *</Label>
              <Input
                id="merchantName"
                placeholder="例：老成都火锅（朝阳店）"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>行业类型</Label>
              <Select value={industry} onValueChange={(v) => setIndustry(v as keyof typeof INDUSTRY_TYPES)}>
                <SelectTrigger className="rounded-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INDUSTRY_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.icon} {value.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalPrice">原价（元）*</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  placeholder="例：199"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="livePrice">直播价（元）*</Label>
                <Input
                  id="livePrice"
                  type="number"
                  placeholder="例：99"
                  value={livePrice}
                  onChange={(e) => setLivePrice(e.target.value)}
                />
              </div>
            </div>

            {discountPreview && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-medium">
                  省 {discountPreview.discount} 元，{discountPreview.rate}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 套餐内容 */}
        <Card className="border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <DollarSign className="w-5 h-5 text-primary" />
              套餐内容
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="packageContent">套餐内容描述 *</Label>
              <Textarea
                id="packageContent"
                placeholder="例：双人火锅套餐，包含锅底、肉类、蔬菜、小吃、饮料等"
                value={packageContent}
                onChange={(e) => setPackageContent(e.target.value)}
                rows={3}
              />
            </div>

            {/* 套餐明细（可选） */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">套餐明细（可选，用于算账）</Label>
                <Button variant="outline" size="sm" onClick={addPackageItem} className="rounded-lg">
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </Button>
              </div>
              {packageItems.length > 0 && (
                <div className="space-y-2">
                  {packageItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="项目名称"
                          value={item.name}
                          onChange={(e) => updatePackageItem(index, 'name', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="原价"
                          value={item.originalPrice || ''}
                          onChange={(e) => updatePackageItem(index, 'originalPrice', parseFloat(e.target.value) || null)}
                        />
                        <Input
                          placeholder="描述（选填）"
                          value={item.description}
                          onChange={(e) => updatePackageItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removePackageItem(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 核心卖点 */}
        <Card className="border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Target className="w-5 h-5 text-primary" />
              核心卖点（可选）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sellingPoints.map((point, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`卖点${index + 1}`}
                  value={point}
                  onChange={(e) => updateSellingPoint(index, e.target.value)}
                />
                {sellingPoints.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeSellingPoint(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {sellingPoints.length < 5 && (
              <Button variant="outline" size="sm" onClick={addSellingPoint} className="w-full rounded-lg">
                <Plus className="w-4 h-4 mr-1" />
                添加卖点
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 高级设置 */}
        <Card className="border-0 rounded-3xl">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full p-4 flex items-center justify-between"
          >
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Lightbulb className="w-5 h-5 text-primary" />
              更多设置（可选）
            </CardTitle>
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {showAdvanced && (
            <CardContent className="space-y-4 pt-0">
              {/* 特色亮点 */}
              <div className="space-y-2">
                <Label>特色亮点</Label>
                <div className="flex flex-wrap gap-2">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Input
                        className="w-32"
                        placeholder="亮点"
                        value={h}
                        onChange={(e) => updateHighlight(i, e.target.value)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeHighlight(i)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addHighlight} className="rounded-lg">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* 售后政策 */}
              <div className="space-y-2">
                <Label>售后政策</Label>
                <Input
                  placeholder="例：不约可退，随时退，过期自动退"
                  value={afterSalesPolicy}
                  onChange={(e) => setAfterSalesPolicy(e.target.value)}
                />
              </div>

              {/* 目标场景 */}
              <div className="space-y-2">
                <Label>适用场景</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SCENARIO_TYPES).map(([key, value]) => {
                    const isSelected = targetScenarios.includes(key);
                    const isRecommended = recommendedScenarios.includes(key as keyof typeof SCENARIO_TYPES);
                    return (
                      <button
                        key={key}
                        onClick={() => toggleScenario(key)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all",
                          isSelected
                            ? "bg-primary text-white"
                            : isRecommended
                              ? "bg-primary/10 text-primary hover:bg-primary/20"
                              : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        {value.icon} {value.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 目标人群 */}
              <div className="space-y-2">
                <Label>目标人群</Label>
                <Input
                  placeholder="例：年轻白领、家庭聚餐"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>

              {/* 补充信息 */}
              <div className="space-y-2">
                <Label>补充信息</Label>
                <Textarea
                  placeholder="其他想说的话..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* 生成按钮 */}
        <Button
          onClick={handleGenerate}
          className="w-full h-12 text-white border-0 rounded-[14px] bg-primary hover:bg-primary/90"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          生成话术
        </Button>

        {/* 底部说明 */}
        <Card className="border-0 rounded-3xl bg-muted">
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">话术生成说明</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  填写商家信息和套餐内容后，AI 将为你生成三套不同策略的直播话术，每套话术包含完整的五步法结构。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <LivePageContent />
    </Suspense>
  );
}
