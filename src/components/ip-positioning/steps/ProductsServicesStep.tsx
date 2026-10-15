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
import { Info, Eye, Check, Package, DollarSign, MapPin, Star } from 'lucide-react';
import {
  PRODUCT_TYPE_TAGS,
  STEP_GUIDES,
  STEP_EXAMPLES,
} from '@/lib/ip-positioning-config';

interface ProductsServicesStepProps {
  formData: {
    productTypes: string[];
    mainProducts: string;
    priceRange: string;
    serviceArea: string;
    uniqueValue: string;
  };
  setFormData: (data: ProductsServicesStepProps['formData']) => void;
}

export const ProductsServicesStep = memo(function ProductsServicesStep({ formData, setFormData }: ProductsServicesStepProps) {
  const [showExample, setShowExample] = useState(false);
  const [customProduct, setCustomProduct] = useState('');

  const toggleProductType = (type: string) => {
    const newTypes = formData.productTypes.includes(type)
      ? formData.productTypes.filter((t) => t !== type)
      : [...formData.productTypes, type];
    setFormData({ ...formData, productTypes: newTypes });
  };

  const addCustomProduct = () => {
    if (customProduct.trim() && !formData.productTypes.includes(customProduct.trim())) {
      setFormData({
        ...formData,
        productTypes: [...formData.productTypes, customProduct.trim()],
      });
      setCustomProduct('');
    }
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
                  {STEP_GUIDES.productsServices.title}
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
                {STEP_GUIDES.productsServices.content}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 产品类型 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          产品/服务类型
          <span className="text-xs text-muted-foreground">(可多选)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_TYPE_TAGS.map((tag) => (
            <Badge
              key={tag}
              variant={formData.productTypes.includes(tag) ? 'default' : 'outline'}
              className={`cursor-pointer px-3 py-1.5 ${
                formData.productTypes.includes(tag) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => toggleProductType(tag)}
            >
              {formData.productTypes.includes(tag) && <Check className="w-3 h-3 mr-1" />}
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="自定义产品类型..."
            value={customProduct}
            onChange={(e) => setCustomProduct(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomProduct()}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={addCustomProduct}>
            添加
          </Button>
        </div>
      </div>

      {/* 主要产品/服务 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          主要产品/服务
        </Label>
        <Textarea
          placeholder="请描述您的主要产品或服务是什么？"
          value={formData.mainProducts}
          onChange={(e) => setFormData({ ...formData, mainProducts: e.target.value })}
          className="min-h-[100px]"
        />
      </div>

      {/* 价格区间 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            价格区间
          </Label>
          <Input
            placeholder="如：99-999元"
            value={formData.priceRange}
            onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-600" />
            服务区域
          </Label>
          <Input
            placeholder="如：全国、某省、某市"
            value={formData.serviceArea}
            onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
          />
        </div>
      </div>

      {/* 核心卖点 */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-600" />
          核心卖点/差异化价值
        </Label>
        <Textarea
          placeholder="您的产品/服务有什么独特优势？与竞争对手相比有什么不同？"
          value={formData.uniqueValue}
          onChange={(e) => setFormData({ ...formData, uniqueValue: e.target.value })}
          className="min-h-[120px]"
        />
      </div>

      {/* 示例对话框 */}
      <Dialog open={showExample} onOpenChange={setShowExample}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>填写示例 - 产品服务</DialogTitle>
            <DialogDescription>参考以下示例来填写您的产品服务</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <Label className="font-medium">产品类型</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STEP_EXAMPLES.productsServices.productTypes.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-medium">价格区间</Label>
              <p className="text-muted-foreground">{STEP_EXAMPLES.productsServices.priceRange}</p>
            </div>
            <div>
              <Label className="font-medium">服务区域</Label>
              <p className="text-muted-foreground">{STEP_EXAMPLES.productsServices.serviceArea}</p>
            </div>
            <div>
              <Label className="font-medium">核心卖点</Label>
              <p className="text-muted-foreground">{STEP_EXAMPLES.productsServices.uniqueValue}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
