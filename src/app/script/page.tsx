'use client';

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  PenLine, 
  FileText, 
  Sparkles,
  ArrowRight,
  Star,
  Zap
} from 'lucide-react';

// 苹果风格配色
const APPLE_BLUE = '#007AFF';
const APPLE_GRAY_BG = '#F5F5F7';
const APPLE_TEXT = '#1D1D1F';

// 功能图标颜色配置 - 苹果风格柔和配色
const FEATURE_COLORS: Record<string, { bg: string; text: string }> = {
  'topic': { bg: '#FFF9E6', text: '#FF9500' },      // 橙黄色
  'opening': { bg: '#E8F4FD', text: '#007AFF' },    // 苹果蓝
  'writing': { bg: '#E8F5E9', text: '#34C759' },    // 苹果绿
  'script': { bg: '#FFF0F5', text: '#FF2D55' },     // 苹果粉
};

const SCRIPT_FEATURES = [
  {
    id: 'topic',
    title: '智能选题',
    description: '根据主题或关键词，生成多个具有爆款潜力的选题',
    icon: Lightbulb,
    tag: '热门',
    isNew: true,
    href: '/script/topic',
  },
  {
    id: 'opening',
    title: '创作开篇',
    description: '根据人设档案、脚本类型和选题，创作吸睛的开篇内容',
    icon: PenLine,
    tag: null,
    isNew: false,
    href: '/script/create-opening',
  },
  {
    id: 'writing',
    title: '文案创作',
    description: '原创文案、对话流、仿写、文风模拟等多种创作模式',
    icon: FileText,
    tag: '推荐',
    isNew: false,
    href: '/script/writing',
  },
  {
    id: 'script',
    title: '脚本生成',
    description: '根据视频文案和人设档案，生成完整的短视频脚本',
    icon: Sparkles,
    tag: null,
    isNew: false,
    href: '/script/script',
  },
];

// 使用建议流程步骤
const USAGE_STEPS = [
  { step: 1, text: '先使用「智能选题」获取创作灵感' },
  { step: 2, text: '再通过「文案创作」丰富内容细节' },
  { step: 3, text: '最后生成完整脚本并优化开篇' },
];

export default function ScriptPage() {
  const router = useRouter();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题区 - 苹果风格 */}
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: APPLE_BLUE }}
          >
            <PenLine className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: APPLE_TEXT }}>脚本创作</h1>
            <p className="text-muted-foreground text-sm mt-0.5">AI 辅助创作，快速产出高质量短视频脚本</p>
          </div>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SCRIPT_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const iconColor = FEATURE_COLORS[feature.id] || { bg: '#E8F4FD', text: APPLE_BLUE };
            return (
              <Card 
                key={feature.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group border-0"
                style={{ borderRadius: '20px', background: 'white' }}
                onClick={() => router.push(feature.href)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: iconColor.bg }}
                    >
                      <Icon className="w-7 h-7" style={{ color: iconColor.text }} />
                    </div>
                    {feature.tag && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs font-medium"
                        style={{ 
                          background: '#F5F5F7', 
                          color: APPLE_TEXT,
                          borderRadius: '6px' 
                        }}
                      >
                        {feature.tag}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: APPLE_TEXT }}>{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{feature.description}</p>
                  <button 
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all group-hover:gap-3"
                    style={{ 
                      background: APPLE_BLUE,
                      borderRadius: '12px'
                    }}
                  >
                    <span>立即使用</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 使用建议 + 快速开始 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* 使用建议 */}
          <div 
            className="rounded-3xl p-6"
            style={{ background: APPLE_GRAY_BG }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: APPLE_BLUE }}
              >
                <Star className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: APPLE_TEXT }}>使用建议</h3>
            </div>
            <div className="space-y-4">
              {USAGE_STEPS.map((item) => (
                <div key={item.step} className="flex items-center gap-4">
                  <div 
                    className="w-7 h-7 rounded-full text-white text-xs flex items-center justify-center font-medium shrink-0"
                    style={{ background: APPLE_BLUE }}
                  >
                    {item.step}
                  </div>
                  <p className="text-sm" style={{ color: APPLE_TEXT }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 快速开始 */}
          <div 
            className="rounded-3xl p-6"
            style={{ background: 'white' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: '#E8F4FD' }}
              >
                <Zap className="w-5 h-5" style={{ color: APPLE_BLUE }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: APPLE_TEXT }}>快速开始</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => router.push('/script/topic')}
                className="text-white border-0 h-11 px-6"
                style={{ background: APPLE_BLUE, borderRadius: '12px' }}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                生成选题
              </Button>
              <Button
                onClick={() => router.push('/script/writing')}
                variant="outline"
                className="h-11 px-6 border-0"
                style={{ background: APPLE_GRAY_BG, borderRadius: '12px', color: APPLE_TEXT }}
              >
                <PenLine className="w-4 h-4 mr-2" />
                创作文案
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
