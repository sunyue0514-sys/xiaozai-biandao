'use client';

import { useState } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  Search,
  ExternalLink,
  Video,
  FileText,
  Image,
  MessageSquare,
  Mic,
  Presentation,
  Sparkles,
  Bot,
  Code,
  BookOpen,
  Palette,
  PenTool,
  LucideIcon,
} from 'lucide-react';

// 工具类型定义
interface AITool {
  id: number;
  name: string;
  description: string;
  url: string;
  category: string;
  icon: LucideIcon;
  colorClass: string;
  hot?: boolean;
  free?: boolean;
}

// 热门AI工具数据
const AI_TOOLS: AITool[] = [
  // 对话AI
  {
    id: 1,
    name: '豆包AI助手',
    description: '豆包是你的AI聊天智能对话问答助手',
    url: 'https://www.doubao.com/',
    category: '对话AI',
    icon: MessageSquare,
    colorClass: 'bg-primary',
    hot: true,
    free: true,
  },
  {
    id: 2,
    name: '讯飞星火',
    description: '深度推理能力全新升级，全面对标OpenAI o1',
    url: 'https://xinghuo.xfyun.cn/',
    category: '对话AI',
    icon: Sparkles,
    colorClass: 'bg-creative',
    hot: true,
    free: true,
  },
  {
    id: 3,
    name: '小浣熊AI助手',
    description: '基于商汤大语言模型的智能助手',
    url: 'https://xiaohuanxiong.com/',
    category: '对话AI',
    icon: Bot,
    colorClass: 'bg-warning',
    hot: true,
  },
  {
    id: 4,
    name: 'DeepSeek',
    description: '深度求索，深度推理AI助手',
    url: 'https://www.deepseek.com/',
    category: '对话AI',
    icon: Code,
    colorClass: 'bg-feed',
    hot: true,
  },
  // 视频创作
  {
    id: 5,
    name: '即梦AI',
    description: '以AI驱动图文/视频一站式创作',
    url: 'https://jimeng.jianying.com/',
    category: '视频创作',
    icon: Video,
    colorClass: 'bg-destructive',
    hot: true,
    free: true,
  },
  {
    id: 6,
    name: '有言AI',
    description: '一站式AI视频创作和3D数字人生成平台',
    url: 'https://www.youyan3d.com/',
    category: '视频创作',
    icon: Video,
    colorClass: 'bg-info',
    hot: true,
  },
  {
    id: 7,
    name: '白日梦AI',
    description: '领先AI创作平台，可生成最长50分钟的视频',
    url: 'https://aigc.baidu.com/',
    category: '视频创作',
    icon: Video,
    colorClass: 'bg-warning',
    hot: true,
  },
  // AI绘画
  {
    id: 8,
    name: 'LiblibAI',
    description: '国内领先的AI创意平台，海量模型',
    url: 'https://www.liblib.art/',
    category: 'AI绘画',
    icon: Image,
    colorClass: 'bg-destructive',
    hot: true,
  },
  {
    id: 9,
    name: '堆友AI设计',
    description: '阿里出品的AI绘画+电商神器',
    url: 'https://www.d.id/',
    category: 'AI绘画',
    icon: Palette,
    colorClass: 'bg-success',
    hot: true,
    free: true,
  },
  // PPT制作
  {
    id: 10,
    name: '博思AIPPT',
    description: '白板+AI，一键生成PPT、思维导图',
    url: 'https://boardmix.cn/',
    category: 'PPT制作',
    icon: Presentation,
    colorClass: 'bg-success',
    hot: true,
    free: true,
  },
  {
    id: 11,
    name: '咔片PPT',
    description: 'AI深度赋能的PPT在线制作工具',
    url: 'https://www.kapian.cn/',
    category: 'PPT制作',
    icon: Presentation,
    colorClass: 'bg-info',
    hot: true,
  },
  {
    id: 12,
    name: 'AiPPT',
    description: 'AI一键生成精美PPT，3分钟生成专业级PPT',
    url: 'https://www.aippt.cn/',
    category: 'PPT制作',
    icon: Presentation,
    colorClass: 'bg-creative',
    hot: true,
  },
  // 写作工具
  {
    id: 13,
    name: '讯飞公文写作',
    description: '国产AI公文写作工具，海量素材库',
    url: 'https://gw.iflydocs.com/',
    category: '写作工具',
    icon: FileText,
    colorClass: 'bg-danger',
    hot: true,
    free: true,
  },
  {
    id: 14,
    name: 'AI论文',
    description: '高质量论文写作平台，免费生成大纲',
    url: 'https://www.aipaper.com/',
    category: '写作工具',
    icon: BookOpen,
    colorClass: 'bg-warning',
    hot: true,
  },
  {
    id: 15,
    name: '笔启AI论文',
    description: '专业AI论文写作，毕业论文、千字大纲免费生成',
    url: 'https://www.biqi.com/',
    category: '写作工具',
    icon: PenTool,
    colorClass: 'bg-success',
  },
  // 编程开发
  {
    id: 16,
    name: 'Trae',
    description: '免费编程工具，AI辅助编程，代码自动修复',
    url: 'https://www.trae.ai/',
    category: '编程开发',
    icon: Code,
    colorClass: 'bg-gray-500',
    hot: true,
    free: true,
  },
  {
    id: 17,
    name: '码上飞',
    description: '零代码AI应用开发平台',
    url: 'https://www.mashangfei.com/',
    category: '编程开发',
    icon: Code,
    colorClass: 'bg-creative',
  },
  // 配音音频
  {
    id: 18,
    name: '琅琅配音',
    description: '全网性价比遥遥领先的配音平台',
    url: 'https://www.langlangpeiyin.com/',
    category: '配音音频',
    icon: Mic,
    colorClass: 'bg-info',
    hot: true,
  },
  // 创意设计
  {
    id: 19,
    name: '讯飞星辰Agent',
    description: '新一代智能体Agent开发平台',
    url: 'https://agent.xfyun.cn/',
    category: '创意设计',
    icon: Sparkles,
    colorClass: 'bg-creative',
    hot: true,
  },
];

// 分类配置
const CATEGORIES = [
  { id: 'all', name: '全部工具', icon: Wrench },
  { id: '对话AI', name: '对话AI', icon: MessageSquare },
  { id: '视频创作', name: '视频创作', icon: Video },
  { id: 'AI绘画', name: 'AI绘画', icon: Image },
  { id: 'PPT制作', name: 'PPT制作', icon: Presentation },
  { id: '写作工具', name: '写作工具', icon: FileText },
  { id: '编程开发', name: '编程开发', icon: Code },
  { id: '配音音频', name: '配音音频', icon: Mic },
  { id: '创意设计', name: '创意设计', icon: Sparkles },
];

export default function ToolsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTools = AI_TOOLS.filter((tool) => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = 
      selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedTools = CATEGORIES.reduce((acc, cat) => {
    if (cat.id === 'all') return acc;
    const tools = filteredTools.filter((t) => t.category === cat.id);
    if (tools.length > 0) {
      acc[cat.id] = tools;
    }
    return acc;
  }, {} as Record<string, AITool[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 - 苹果风格 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">AI工具集</h1>
              <p className="text-muted-foreground text-sm mt-0.5">精选热门AI工具，助力内容创作与效率提升</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm font-medium bg-muted rounded-[10px]">
            共收录 {AI_TOOLS.length} 款工具
          </Badge>
        </div>

        {/* 搜索框 - 苹果风格 */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="搜索工具名称或功能..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-[14px]"
          />
        </div>

        {/* 分类标签 - 苹果风格 */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === 'all' 
              ? AI_TOOLS.length 
              : AI_TOOLS.filter((t) => t.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-[10px] ${
                  isSelected 
                    ? 'bg-primary text-white' 
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 工具列表 */}
        {selectedCategory === 'all' ? (
          <div className="space-y-8">
            {Object.entries(groupedTools).map(([category, tools]) => {
              const catConfig = CATEGORIES.find((c) => c.id === category);
              const CatIcon = catConfig?.icon || Wrench;
              return (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <CatIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">{catConfig?.name}</h2>
                    <Badge variant="outline" className="text-xs rounded-md">
                      {tools.length}款
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        {/* 无结果提示 */}
        {filteredTools.length === 0 && (
          <Card className="border-0 rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Search className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">未找到匹配的工具</p>
              <p className="text-sm text-muted-foreground mt-1">试试其他关键词或分类</p>
            </CardContent>
          </Card>
        )}

        {/* 底部提示 - 苹果风格 */}
        <div className="rounded-3xl p-5 flex items-center gap-4 bg-muted">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">发现更多好用的AI工具？</p>
            <p className="text-sm text-muted-foreground">欢迎推荐，一起打造最全的AI工具库</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// 工具卡片组件 - 苹果风格
function ToolCard({ tool }: { tool: AITool }) {
  const Icon = tool.icon;
  
  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group"
    >
      <Card className="h-full border-0 transition-all duration-300 cursor-pointer overflow-hidden group-hover:shadow-lg rounded-3xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tool.colorClass}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              {tool.hot && (
                <Badge className="text-[10px] px-2 border-0 bg-red-50 text-danger rounded-md">
                  热门
                </Badge>
              )}
              {tool.free && (
                <Badge className="text-[10px] px-2 border-0 bg-green-50 text-success rounded-md">
                  免费
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-base mt-3 flex items-center gap-1 text-foreground">
            {tool.name}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {tool.description}
          </p>
          <Badge variant="outline" className="mt-3 text-xs rounded-md">
            {tool.category}
          </Badge>
        </CardContent>
      </Card>
    </a>
  );
}
