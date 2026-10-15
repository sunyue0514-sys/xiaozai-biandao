'use client';

import { useState } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {
  HelpCircle,
  BookOpen,
  Zap,
  Crown,
  MessageCircle,
  Sparkles,
  PlayCircle,
  FileText,
  BarChart3,
  Users,
  ChevronRight,
  Check,
  Rocket,
  Target,
  Video,
  PenTool,
  Brain,
  Clock,
  Shield,
  Gift,
  ArrowLeft,
} from 'lucide-react';

// 快速入门步骤
const quickStartSteps = [
  {
    step: 1,
    title: '注册并完善资料',
    description: '注册账号后，系统将赠送3000算力体验金，有效期1天',
    icon: Users,
    link: '/member',
    linkText: '前往算力中心',
    colorClass: 'text-warning bg-warning',
  },
  {
    step: 2,
    title: '选择创作工具',
    description: '根据创作需求，选择「选题推荐」「文案创作」或「脚本生成」等功能',
    icon: Sparkles,
    link: '/script',
    linkText: '开始创作',
    colorClass: 'text-success bg-success',
  },
  {
    step: 3,
    title: '输入创作要求',
    description: '填写行业、产品、目标人群等信息，AI将生成个性化内容',
    icon: PenTool,
    link: null,
    linkText: null,
    colorClass: 'text-creative bg-creative',
  },
  {
    step: 4,
    title: '查看并优化结果',
    description: '查看生成的内容，可继续对话优化，或一键复制使用',
    icon: Check,
    link: null,
    linkText: null,
    colorClass: 'text-primary bg-primary',
  },
];

// 功能模块介绍
const featureModules = [
  {
    title: '选题推荐',
    description: '基于热点趋势和行业数据，智能推荐爆款选题方向',
    icon: Target,
    colorClass: 'bg-warning',
    link: '/script/topic',
    features: ['热点选题挖掘', '行业趋势分析', '竞品选题追踪', '个性化推荐'],
    power: '50点/次',
  },
  {
    title: '文案创作',
    description: '一键生成吸引人的营销文案、产品介绍、广告语等',
    icon: PenTool,
    colorClass: 'bg-primary',
    link: '/script/writing',
    features: ['多风格文案', 'SEO优化', '情感共鸣', '一键改写'],
    power: '20点起',
  },
  {
    title: '脚本生成',
    description: '专业的短视频脚本创作，包含镜头语言、场景描述、台词等',
    icon: Video,
    colorClass: 'bg-creative',
    link: '/script',
    features: ['完整脚本结构', '镜头分镜设计', '时长估算', '场景描述'],
    power: '20点起',
  },
  {
    title: '运营分析',
    description: '账号诊断、内容分析、粉丝画像，数据驱动增长',
    icon: BarChart3,
    colorClass: 'bg-success',
    link: '/operations',
    features: ['账号诊断', '内容分析', '粉丝画像', '增长建议'],
    power: '100点/次',
  },
  {
    title: '客户管理',
    description: '客户数据管理、分析报告生成、运营策略制定',
    icon: Users,
    colorClass: 'bg-info',
    link: '/customer',
    features: ['客户数据导入', '智能分析报告', '运营策略', '客户定位'],
    power: '100-150点',
  },
  {
    title: '智能超级编导',
    description: 'AI导演助手，从创意到执行的全程智能陪伴',
    icon: Brain,
    colorClass: 'bg-destructive',
    link: '/super-director',
    features: ['创意策划', '脚本优化', '拍摄建议', '后期指导'],
    power: '10点/次',
  },
];

// 算力消耗详情
const powerConsumption = [
  {
    category: '基础功能',
    items: [
      { name: 'AI对话', cost: '50点 + 50点/百字', description: '基础费用 + 按字数计费' },
      { name: '开场白生成', cost: '50点 + 50点/百字', description: '基础费用 + 按字数计费' },
      { name: '批量开篇生成', cost: '300点/次', description: '生成6个开篇' },
      { name: 'AI辅助填充', cost: '150点/次', description: '每次操作固定消耗' },
    ],
  },
  {
    category: '选题推荐',
    items: [
      { name: '选题推荐', cost: '250点/次', description: '单次选题推荐' },
      { name: '批量选题生成', cost: '400点/次', description: '生成24个选题（4类×6个）' },
    ],
  },
  {
    category: '脚本/文案生成',
    items: [
      { name: '脚本生成', cost: '100点 + 100点/百字', description: '基础费用 + 按字数计费' },
      { name: '文案创作', cost: '100点 + 100点/百字', description: '基础费用 + 按字数计费' },
      { name: '快速创作', cost: '100点 + 100点/百字', description: '基础费用 + 按字数计费' },
    ],
  },
  {
    category: '本地生活',
    items: [
      { name: '直播话术生成', cost: '300点/次', description: '生成三套话术' },
      { name: '千川文案', cost: '150点 + 150点/百字', description: '基础费用 + 按字数计费' },
      { name: '千川脚本', cost: '200点 + 200点/百字', description: '基础费用 + 按字数计费' },
    ],
  },
  {
    category: '信息流广告',
    items: [
      { name: '信息流广告文案', cost: '150点 + 150点/百字', description: '基础费用 + 按字数计费' },
      { name: '信息流广告脚本', cost: '200点 + 200点/百字', description: '基础费用 + 按字数计费' },
    ],
  },
  {
    category: '灵感共创',
    items: [
      { name: '视频上传', cost: '免费', description: '上传爆款视频素材' },
      { name: '视频深度分析', cost: '500点/次', description: '使用Vision模型深度分析' },
    ],
  },
  {
    category: '数据分析',
    items: [
      { name: '业务分析', cost: '500点/次', description: '业务数据分析' },
      { name: '客户定位分析', cost: '750点/次', description: 'IP定位与目标人群分析' },
      { name: '数据报告', cost: '500点/次', description: '生成数据报告' },
      { name: '账号规划', cost: '800点/次', description: '生成完整账号运营方案' },
    ],
  },
];

// 常见问题
const faqs = [
  {
    question: '算力是什么？如何计算消耗？',
    answer: '算力是平台AI服务的使用额度。计算方式：基础费用 + 按字数计费。例如：AI对话基础50点 + 每100字50点；脚本生成基础100点 + 每100字100点；选题推荐每次固定250点。生成内容越长，消耗的算力越多。您可以在算力中心查看剩余算力。',
  },
  {
    question: '算力和会员有什么区别？',
    answer: '目前平台已取消会员体系，所有功能均通过算力消费。算力包一次性购买永久有效，不存在到期清零的问题。购买算力后，所有功能均可使用。',
  },
  {
    question: '如何提高AI生成内容的质量？',
    answer: '1. 提供详细准确的背景信息（行业、产品、目标人群）\n2. 明确创作目的和风格偏好\n3. 使用具体的关键词而非模糊描述\n4. 通过多轮对话持续优化',
  },
  {
    question: '生成的内容可以商用吗？',
    answer: '可以。您使用本平台生成的内容归您所有，可以自由用于商业用途。但请注意，AI生成的内容可能存在相似性，建议进行二次创作和优化，以确保内容的独特性。',
  },
  {
    question: '如何联系客服？',
    answer: '您可以通过平台内「在线客服」功能（工作时间即时响应）或发送邮件至客服邮箱联系我们。月度及以上会员享有优先客服特权。',
  },
];

// 新手路径配置
const beginnerPaths = [
  { icon: Target, title: '我想找选题方向', desc: '不知道拍什么？使用选题推荐功能', colorClass: 'bg-warning', link: '/script/topic' },
  { icon: PenTool, title: '我有选题想写文案', desc: '输入选题方向，AI生成文案', colorClass: 'bg-primary', link: '/script/writing' },
  { icon: Video, title: '我要拍完整视频', desc: '从选题到脚本，一站式创作', colorClass: 'bg-success', link: '/script' },
] as const;

// 算力信息配置
const powerInfo = [
  { icon: Gift, title: '新用户赠送', value: '3,000', desc: '注册即送算力', colorClass: 'text-warning' },
  { icon: Clock, title: '长期有效', value: '1年+', desc: '算力包有效期', colorClass: 'text-primary' },
  { icon: Shield, title: '永久有效', value: '用多少扣多少', desc: '算力永久有效', colorClass: 'text-success' },
] as const;

// 算力包配置
const powerPackages: Array<{
  name: string;
  price: string;
  power: string;
  duration: string;
  highlight: boolean;
  badge?: string;
}> = [
  { name: '新人体验', price: '免费', power: '3,000', duration: '1天', highlight: false },
  { name: '基础版', price: '¥28.9', power: '10,000', duration: '1年', highlight: false },
  { name: '标准版', price: '¥99.9', power: '50,000', duration: '1年', highlight: true, badge: '推荐' },
  { name: '专业版', price: '¥199', power: '100,000', duration: '1年', highlight: false },
  { name: '团队版', price: '¥699', power: '400,000', duration: '1年', highlight: false },
];

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState('quickstart');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 - 苹果风格 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary">
              <HelpCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">帮助中心</h1>
              <p className="text-muted-foreground text-sm mt-0.5">快速了解平台功能，掌握使用技巧</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" className="gap-2 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
              返回主页
            </Button>
          </Link>
        </div>

        {/* 主要内容区 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-12 p-1 bg-muted rounded-[14px]">
            <TabsTrigger value="quickstart" className="flex items-center gap-2 h-10 text-sm">
              <Rocket className="w-4 h-4" />
              快速入门
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2 h-10 text-sm">
              <Sparkles className="w-4 h-4" />
              功能介绍
            </TabsTrigger>
            <TabsTrigger value="power" className="flex items-center gap-2 h-10 text-sm">
              <Zap className="w-4 h-4" />
              算力说明
            </TabsTrigger>
            <TabsTrigger value="member" className="flex items-center gap-2 h-10 text-sm">
              <Crown className="w-4 h-4" />
              会员权益
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2 h-10 text-sm">
              <MessageCircle className="w-4 h-4" />
              常见问题
            </TabsTrigger>
          </TabsList>

          {/* 快速入门 */}
          <TabsContent value="quickstart" className="space-y-6">
            <Card className="border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <BookOpen className="w-5 h-5 text-primary" />
                  新手入门指南
                </CardTitle>
                <CardDescription>4步开启您的AI创作之旅</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickStartSteps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div 
                        key={step.step} 
                        className="relative p-5 rounded-2xl transition-all hover:shadow-md bg-muted"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${step.colorClass}`}>
                            {step.step}
                          </div>
                          <Icon className={`w-5 h-5 ${step.colorClass.split(' ')[0]}`} />
                        </div>
                        <h3 className="font-medium mb-2 text-foreground">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{step.description}</p>
                        {step.link && (
                          <Link
                            href={step.link}
                            className="inline-flex items-center text-sm font-medium text-primary"
                          >
                            {step.linkText}
                            <ChevronRight className="w-4 h-4 ml-0.5" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 推荐新手路径 */}
            <Card className="border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Target className="w-5 h-5 text-primary" />
                  推荐新手路径
                </CardTitle>
                <CardDescription>根据您的使用场景，选择最合适的功能入口</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-5">
                  {beginnerPaths.map((item) => (
                    <div 
                      key={item.title}
                      className="p-5 rounded-2xl transition-all hover:shadow-md bg-muted"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.colorClass}`}>
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{item.desc}</p>
                      <Link href={item.link}>
                        <Button variant="outline" size="sm" className="w-full rounded-[10px]">
                          立即使用
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 功能介绍 */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featureModules.map((module) => {
                const Icon = module.icon;
                return (
                  <Card 
                    key={module.title} 
                    className="border-0 transition-all hover:shadow-md rounded-3xl"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${module.colorClass}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-foreground">{module.title}</CardTitle>
                          <Badge variant="secondary" className="text-xs mt-1 rounded-md">
                            {module.power}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{module.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {module.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs rounded-md">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                      <Link href={module.link}>
                        <Button variant="outline" size="sm" className="w-full rounded-[10px]">
                          立即使用
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 算力说明 */}
          <TabsContent value="power" className="space-y-6">
            <Card className="border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="w-5 h-5 text-primary" />
                  算力是什么？
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  算力是平台AI服务的使用额度，类似「积分」或「点数」。不同的AI功能消耗不同的算力。
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {powerInfo.map((item) => (
                    <div key={item.title} className="p-5 rounded-2xl bg-muted">
                      <div className="flex items-center gap-2 mb-3">
                        <item.icon className={`w-4 h-4 ${item.colorClass}`} />
                        <span className="font-medium text-sm text-foreground">{item.title}</span>
                      </div>
                      <p className={`text-2xl font-bold ${item.colorClass}`}>{item.value}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-foreground">算力消耗明细</CardTitle>
                <CardDescription>不同功能的算力消耗标准</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {powerConsumption.map((category) => (
                    <div key={category.category}>
                      <Badge variant="secondary" className="mb-3 rounded-lg">
                        {category.category}
                      </Badge>
                      <div className="space-y-2">
                        {category.items.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between p-4 rounded-xl bg-muted"
                          >
                            <div>
                              <span className="font-medium text-foreground">{item.name}</span>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                            <Badge className="border-0 bg-accent text-primary rounded-lg">
                              {item.cost}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 会员权益 */}
          <TabsContent value="member" className="space-y-6">
            <Card className="border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-foreground">会员套餐对比</CardTitle>
                <CardDescription>选择适合您的会员方案</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-5">
                  {powerPackages.map((pkg) => (
                    <div
                      key={pkg.name}
                      className={`relative rounded-2xl p-6 ${
                        pkg.highlight 
                          ? 'bg-card shadow-md ring-2 ring-primary' 
                          : 'bg-muted'
                      }`}
                    >
                      {pkg.highlight && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="text-white border-0 bg-primary rounded-lg">
                            推荐
                          </Badge>
                        </div>
                      )}
                      <div className="text-center mb-4 pt-2">
                        <h3 className="font-semibold text-lg mb-2 text-foreground">{pkg.name}</h3>
                        <p className="text-3xl font-bold text-foreground">{pkg.price === '免费' ? '免费' : `¥${pkg.price}`}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          含 {pkg.power.toLocaleString()} 算力 · 有效期{pkg.duration}
                        </p>
                      </div>
                      <Separator className="my-4" />
                      <Link href="/power-center">
                        <Button 
                          className={`w-full rounded-xl ${pkg.highlight ? 'bg-primary text-white' : ''}`}
                          variant={pkg.highlight ? 'default' : 'outline'}
                        >
                          立即充值
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 常见问题 */}
          <TabsContent value="faq" className="space-y-6">
            <Card className="border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  常见问题
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-3">
                  {faqs.map((faq, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`item-${index}`}
                      className="border-0"
                    >
                      <AccordionTrigger className="px-5 py-4 rounded-xl hover:no-underline bg-muted">
                        <span className="font-medium text-left text-foreground">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 py-4 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
