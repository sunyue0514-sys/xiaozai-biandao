'use client';

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Shield, 
  BarChart3, 
  Target, 
  TrendingUp,
  ArrowRight,
  Zap,
  CheckCircle,
  Video
} from 'lucide-react';

// 苹果风格配色
const APPLE_BLUE = '#007AFF';
const APPLE_GRAY_BG = '#F5F5F7';
const APPLE_TEXT = '#1D1D1F';

// 功能图标颜色配置 - 苹果风格柔和配色
const FEATURE_COLORS: Record<string, { bg: string; text: string }> = {
  'humanize': { bg: '#FFF9E6', text: '#FF9500' },      // 橙黄色
  'banned-words': { bg: '#E8F4FD', text: '#007AFF' },  // 苹果蓝
  'account-analysis': { bg: '#E8F5E9', text: '#34C759' }, // 苹果绿
  'benchmark-analysis': { bg: '#FFF0F5', text: '#FF2D55' }, // 苹果粉
  'hot-topics': { bg: '#FFEBE6', text: '#FF3B30' },    // 苹果红
  'video-analysis': { bg: '#F3E8FF', text: '#8B5CF6' }, // 紫色
};

// 已上线功能
const LIVE_FEATURES = [
  {
    id: 'humanize',
    title: '口语化去AI味',
    description: '将AI生成的文案转换成自然流畅的口语化表达',
    icon: Sparkles,
    path: '/operations/humanize',
    isNew: false,
    features: ['智能改写', '保留原意', '多种风格'],
  },
  {
    id: 'video-analysis',
    title: '视频深度分析',
    description: '八维体检、内容结构、优化建议一站式分析',
    icon: Video,
    path: '/operations/video-analysis',
    isNew: true,
    highlight: true,
    features: ['八维体检', '开头分析', '优化建议'],
  },
  {
    id: 'banned-words',
    title: '违禁词检测',
    description: '智能检测视频文案中的违禁词，确保内容合规',
    icon: Shield,
    path: '/operations/banned-words',
    isNew: true,
    features: ['多平台词库', '一键替换', '风险提示'],
  },
  {
    id: 'account-analysis',
    title: '账号运营分析',
    description: '全方位分析账号数据，提供专业的优化建议',
    icon: BarChart3,
    path: '/operations/account-analysis',
    isNew: true,
    features: ['数据看板', '趋势分析', '优化建议'],
  },
  {
    id: 'benchmark-analysis',
    title: '对标账号分析',
    description: '分析竞品策略，提供可借鉴的运营经验',
    icon: Target,
    path: '/operations/benchmark-analysis',
    isNew: false,
    features: ['竞品对比', '策略拆解', '经验借鉴'],
  },
  {
    id: 'hot-topics',
    title: '热点追踪',
    description: '实时追踪平台热点，把握内容创作时机',
    icon: TrendingUp,
    path: '/operations/hot-topics',
    isNew: true,
    highlight: true,
    features: ['实时热榜', '趋势预测', '选题推荐'],
  },
];

// 平台配置
const PLATFORMS = [
  { name: '抖音', icon: '🎵' },
  { name: '小红书', icon: '📕' },
  { name: '视频号', icon: '📺' },
  { name: '快手', icon: '⚡' },
];

export default function OperationsPage() {
  const router = useRouter();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面头部 - 苹果风格 */}
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: APPLE_BLUE }}
          >
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: APPLE_TEXT }}>运营分析</h1>
            <p className="text-muted-foreground text-sm mt-0.5">多平台数据分析工具，助力短视频账号高效运营</p>
          </div>
        </div>

        {/* 平台支持说明 - 苹果风格 */}
        <div 
          className="flex items-center gap-4 p-4 rounded-2xl"
          style={{ background: APPLE_GRAY_BG }}
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: APPLE_BLUE }} />
            <span className="text-sm font-medium" style={{ color: APPLE_TEXT }}>支持平台：</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {PLATFORMS.map((platform) => (
              <Badge 
                key={platform.name}
                variant="secondary" 
                className="gap-1.5 font-medium"
                style={{ 
                  background: 'white', 
                  color: APPLE_TEXT,
                  borderRadius: '8px',
                  padding: '6px 12px'
                }}
              >
                <span>{platform.icon}</span>
                {platform.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* 功能卡片 - 苹果风格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {LIVE_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const iconColor = FEATURE_COLORS[feature.id] || { bg: '#E8F4FD', text: APPLE_BLUE };
            
            return (
              <Card 
                key={feature.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-0"
                style={{ 
                  borderRadius: '20px',
                  background: 'white',
                  boxShadow: feature.highlight ? '0 0 0 1px rgba(0, 122, 255, 0.1)' : 'none'
                }}
                onClick={() => router.push(feature.path)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: iconColor.bg }}
                    >
                      <Icon className="w-6 h-6" style={{ color: iconColor.text }} />
                    </div>
                    {feature.isNew && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs font-medium"
                        style={{ 
                          background: APPLE_GRAY_BG, 
                          color: APPLE_BLUE,
                          borderRadius: '6px' 
                        }}
                      >
                        新功能
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-3 font-semibold" style={{ color: APPLE_TEXT }}>{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {feature.features.map((feat) => (
                      <Badge 
                        key={feat} 
                        variant="outline" 
                        className="text-xs font-normal"
                        style={{ 
                          borderColor: APPLE_GRAY_BG,
                          color: APPLE_TEXT,
                          borderRadius: '6px'
                        }}
                      >
                        {feat}
                      </Badge>
                    ))}
                  </div>
                  <button 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-all group-hover:gap-3"
                    style={{ 
                      background: APPLE_BLUE,
                      borderRadius: '10px'
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

        {/* 功能说明 - 苹果风格 */}
        <div 
          className="rounded-3xl p-6"
          style={{ background: 'white' }}
        >
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle className="w-5 h-5" style={{ color: APPLE_BLUE }} />
            <h3 className="text-lg font-semibold" style={{ color: APPLE_TEXT }}>功能说明</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="p-5 rounded-2xl"
              style={{ background: APPLE_GRAY_BG }}
            >
              <h4 className="font-medium mb-2" style={{ color: APPLE_TEXT }}>数据安全</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">所有数据本地存储，确保您的账号信息安全</p>
            </div>
            <div 
              className="p-5 rounded-2xl"
              style={{ background: APPLE_GRAY_BG }}
            >
              <h4 className="font-medium mb-2" style={{ color: APPLE_TEXT }}>实时更新</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">热点数据实时同步，把握最佳创作时机</p>
            </div>
            <div 
              className="p-5 rounded-2xl"
              style={{ background: APPLE_GRAY_BG }}
            >
              <h4 className="font-medium mb-2" style={{ color: APPLE_TEXT }}>智能分析</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">AI驱动的数据分析，提供专业运营建议</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
