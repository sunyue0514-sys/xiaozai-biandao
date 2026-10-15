'use client';

import { useState } from 'react';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Badge } from '@/components/ui/badge';
import {
  Film,
  ExternalLink,
  Sparkles,
  Star,
  Globe,
  Zap,
  Wand2,
  Subtitles,
  Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// AI剪辑工具数据
const AI_EDITING_TOOLS = [
  // 智能剪辑
  {
    id: 'jianying',
    name: '剪映',
    description: '抖音旗下AI剪辑神器，一键成片，模板丰富',
    url: 'https://www.capcut.cn/',
    category: '智能剪辑',
    features: ['免费', 'AI字幕', '智能抠图', '海量模板'],
    colorClass: 'bg-danger',
    icon: '🎬',
    hot: true,
    platform: '全平台',
    rating: 4.9,
    users: '10亿+',
  },
  {
    id: 'kuaijianji',
    name: '快剪辑',
    description: '快手旗下智能剪辑工具，AI自动剪辑',
    url: 'https://kuai.360.cn/home.html',
    category: '智能剪辑',
    features: ['免费', 'AI字幕', '智能剪辑', '一键成片'],
    colorClass: 'bg-warning',
    icon: '⚡',
    hot: true,
    platform: '全平台',
    rating: 4.7,
    users: '5亿+',
  },
  {
    id: 'bic',
    name: '必剪',
    description: 'B站官方剪辑工具，UP主必备',
    url: 'https://bcut.bilibili.cn/',
    category: '智能剪辑',
    features: ['免费', 'B站生态', 'AI配音', '一键投稿'],
    colorClass: 'bg-info',
    icon: '📺',
    platform: 'PC/移动端',
    rating: 4.6,
    users: '1亿+',
  },
  {
    id: 'capcut',
    name: 'CapCut',
    description: '剪映国际版，全球热门视频编辑工具',
    url: 'https://www.capcut.com/',
    category: '智能剪辑',
    features: ['免费', '全球模板', '多语言', 'TikTok生态'],
    colorClass: 'bg-creative',
    icon: '🌐',
    platform: '全平台',
    rating: 4.8,
    users: '全球5亿+',
  },
  // AI特效
  {
    id: 'runway',
    name: 'Runway',
    description: '专业AI视频编辑，绿幕替换、AI特效',
    url: 'https://runwayml.com/',
    category: 'AI特效',
    features: ['AI绿幕', '视频生成', '特效制作', '专业级'],
    colorClass: 'bg-creative',
    icon: '✨',
    hot: true,
    platform: 'Web',
    rating: 4.8,
    users: '专业创作者首选',
  },
  {
    id: 'dujia',
    name: '度加剪辑',
    description: '百度AI剪辑工具，智能字幕、图文成片',
    url: 'https://dujia.baidu.com/',
    category: 'AI特效',
    features: ['免费', 'AI字幕', '图文成片', '智能剪辑'],
    colorClass: 'bg-success',
    icon: '🎯',
    platform: '全平台',
    rating: 4.5,
    users: '3亿+',
  },
  {
    id: 'jimeng',
    name: '即梦AI',
    description: '字节AI视频创作平台，文生视频',
    url: 'https://jimeng.jianying.com/',
    category: 'AI特效',
    features: ['文生视频', '图生视频', 'AI创作', '高清输出'],
    colorClass: 'bg-danger',
    icon: '🌟',
    hot: true,
    platform: 'Web',
    rating: 4.7,
    users: '火爆全网',
  },
  {
    id: 'bairimeng',
    name: '白日梦AI',
    description: '领先AI视频创作，可生成最长50分钟视频',
    url: 'https://aigc.baidu.com/',
    category: 'AI特效',
    features: ['长视频生成', '人物一致', '多风格', '高清输出'],
    colorClass: 'bg-warning',
    icon: '🌅',
    platform: 'Web',
    rating: 4.6,
    users: '创作者推荐',
  },
  // 字幕配音
  {
    id: 'jianying_subtitle',
    name: '剪映AI配音',
    description: '海量AI音色，文字转语音，情感自然',
    url: 'https://www.capcut.cn/',
    category: '字幕配音',
    features: ['免费', '海量音色', '情感配音', '多语言'],
    colorClass: 'bg-info',
    icon: '🎙️',
    platform: '剪映内置',
    rating: 4.9,
    users: '最热门配音工具',
  },
  {
    id: 'peiyin',
    name: '配音秀',
    description: '专业配音平台，AI配音+真人配音',
    url: 'https://www.peiyinxiu.com/',
    category: '字幕配音',
    features: ['AI配音', '真人配音', '海量素材', '专业级'],
    colorClass: 'bg-danger',
    icon: '🎤',
    platform: 'Web/APP',
    rating: 4.5,
    users: '配音达人首选',
  },
  // 专业剪辑
  {
    id: 'pr',
    name: 'Premiere Pro',
    description: 'Adobe专业剪辑软件，行业标准工具',
    url: 'https://www.adobe.com/products/premiere.html',
    category: '专业剪辑',
    features: ['专业级', '生态完善', 'AI功能', '协同编辑'],
    colorClass: 'bg-creative',
    icon: '🎬',
    platform: 'PC/Mac',
    rating: 4.9,
    users: '行业标准',
  },
  {
    id: 'davinci',
    name: 'DaVinci Resolve',
    description: '专业调色+剪辑，免费且功能强大',
    url: 'https://www.blackmagicdesign.com/products/davinciresolve',
    category: '专业剪辑',
    features: ['免费', '专业调色', '剪辑+特效', '业界顶级'],
    colorClass: 'bg-warning',
    icon: '🎨',
    platform: 'PC/Mac',
    rating: 4.9,
    users: '专业调色首选',
  },
  {
    id: 'finalcut',
    name: 'Final Cut Pro',
    description: '苹果专业剪辑软件，Mac用户首选',
    url: 'https://www.apple.com/final-cut-pro/',
    category: '专业剪辑',
    features: ['苹果生态', '流畅体验', '磁性时间线', '专业级'],
    colorClass: 'bg-foreground',
    icon: '🍎',
    platform: 'Mac',
    rating: 4.8,
    users: 'Mac用户首选',
  },
];

// 分类列表
const CATEGORIES = [
  { id: 'all', name: '全部工具', icon: Sparkles },
  { id: '智能剪辑', name: '智能剪辑', icon: Scissors },
  { id: 'AI特效', name: 'AI特效', icon: Wand2 },
  { id: '字幕配音', name: '字幕配音', icon: Subtitles },
  { id: '专业剪辑', name: '专业剪辑', icon: Film },
];

export default function AIEditingPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTools = activeCategory === 'all' 
    ? AI_EDITING_TOOLS 
    : AI_EDITING_TOOLS.filter(tool => tool.category === activeCategory);

  const hotTools = AI_EDITING_TOOLS.filter(tool => tool.hot);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 - 苹果风格 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-creative">
              <Film className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">AI剪辑工具集</h1>
              <p className="text-muted-foreground text-sm mt-0.5">精选热门AI视频剪辑工具，<span className="text-primary font-medium">不消耗平台积分</span></p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className="text-sm font-medium bg-muted rounded-[10px]"
          >
            精选 {AI_EDITING_TOOLS.length} 款工具
          </Badge>
        </div>

        {/* 热门推荐 - 苹果风格 */}
        <div className="rounded-3xl p-6 bg-creative/10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-semibold text-foreground">热门推荐</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotTools.map((tool) => (
              <a
                key={tool.id}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-white rounded-2xl p-4 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                    tool.colorClass
                  )}>
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate text-foreground">{tool.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{tool.description}</p>
                  </div>
                </div>
                <ExternalLink className="absolute top-3 right-3 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>

        {/* 分类选择 - 苹果风格 */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            const count = category.id === 'all' 
              ? AI_EDITING_TOOLS.length 
              : AI_EDITING_TOOLS.filter(t => t.category === category.id).length;
            
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-[10px]",
                  isActive 
                    ? "bg-primary text-white" 
                    : "bg-muted text-foreground hover:bg-muted/80"
                )}
              >
                <Icon className="w-4 h-4" />
                {category.name}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 工具列表 - 苹果风格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.map((tool) => (
            <a
              key={tool.id}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
            >
              {/* 顶部色条 */}
              <div className={cn("h-1.5", tool.colorClass)} />
              
              <div className="p-5">
                {/* 头部信息 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110",
                      tool.colorClass
                    )}>
                      {tool.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{tool.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3 text-warning" />
                          {tool.rating}
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{tool.users}</span>
                      </div>
                    </div>
                  </div>
                  {tool.hot && (
                    <Badge className="text-white text-xs border-0 bg-danger rounded-md">
                      热门
                    </Badge>
                  )}
                </div>

                {/* 描述 */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                  {tool.description}
                </p>

                {/* 特性标签 */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tool.features.slice(0, 4).map((feature, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs rounded-md"
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>

                {/* 底部信息 */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="w-3.5 h-3.5" />
                    {tool.platform}
                  </div>
                  <span className="text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                    立即使用 →
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* 温馨提示 - 苹果风格 */}
        <div className="rounded-2xl p-5 flex items-start gap-4 bg-muted">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-warning/20">
            <Zap className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">温馨提示</h4>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              以上工具均为第三方平台，点击跳转后将离开本平台。使用这些工具<strong className="text-foreground">不消耗平台积分</strong>，
              但部分工具可能有自己的付费机制，请以各平台实际规则为准。
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
