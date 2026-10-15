'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/app/(dashboard)/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search,
  Lightbulb,
  Upload,
  Video,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Play,
  Target,
  Sparkles,
  X,
  Gift,
  AlertCircle,
  Star,
  Loader2,
  Copy,
  CheckCircle,
  Zap,
  TrendingUp,
  Heart,
  Flame,
  Users,
  MessageSquare,
  Lock,
  Clock,
  FileText,
  Hash,
  Trash2,
  Camera,
  Mic,
  Hand,
  Monitor,
  ArrowRight,
  RefreshCw,
  BarChart3,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithRetry, getErrorMessage } from '@/lib/request';

// ========== 工具函数 ==========
/**
 * 安全地将数组字段转换为字符串
 * 解决 API 返回数据类型不一致的问题
 */
function safeJoin(arr: unknown, separator: string = '、'): string {
  if (Array.isArray(arr)) {
    return arr.join(separator);
  }
  if (typeof arr === 'string') {
    return arr;
  }
  return '';
}

/**
 * 安全地获取数组字段
 */
function safeArray(arr: unknown): string[] {
  if (Array.isArray(arr)) {
    return arr;
  }
  if (typeof arr === 'string') {
    return [arr];
  }
  return [];
}

// ========== 权限接口类型 ==========
interface PermissionState {
  hasPermission: boolean;
  isAdmin: boolean;  // 管理员豁免
  expiresAt: string | null;
  remainingHours: number;
  uploadCount: number;
  totalExtendedHours: number;
  isNewUser: boolean;
}

// ========== 类型定义 ==========
interface ViralTag {
  id: string;
  label: string;
  color: string;
}

interface VideoCard {
  id: string;
  title: string;
  hashtags: string[];
  cover: string;
  author: {
    name: string;
    avatar: string;
    type?: string;
  };
  category: 'content' | 'presentation';
  industry?: string;  // 行业归类
  track: string;
  contentType: string;
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    collects: number;
  };
  viralTags: ViralTag[];
  highlight?: string;
  createdAt: string;
  scriptContent?: string;
  videoUrl?: string;  // 原视频链接
  platform?: string;  // 平台标识
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';  // 处理状态
  processingError?: string;  // 处理失败原因
}

// ========== 常量 ==========
const TRACKS = ['全部赛道', '心理咨询类/母婴育儿类', '情感故事/知识科普', '理财知识/个人成长', '职场技能/知识科普', '职场成长/情感心理', '社交心理/知识科普', '职场成长/心理情感', '社会热点/知识科普', '生活娱乐/搞笑段子', '美食探店/生活方式', '电商带货/创意展示', '旅行攻略/VLog', '知识科普/教育'];

// 行业分类（必选项）
const INDUSTRIES = [
  { id: 'oral_knowledge', name: '口播知识类', desc: '知识科普、干货分享、技能教学', icon: '📖' },
  { id: 'drama_story', name: '剧情演绎类', desc: '情感故事、搞笑段子、情景剧', icon: '🎬' },
  { id: 'life_record', name: '生活记录类', desc: 'Vlog、日常分享、生活技巧', icon: '📹' },
  { id: 'food_explore', name: '美食探店类', desc: '美食制作、餐厅测评、探店分享', icon: '🍜' },
  { id: 'travel_guide', name: '旅行攻略类', desc: '旅游记录、景点推荐、出行攻略', icon: '✈️' },
  { id: 'parenting', name: '母婴育儿类', desc: '育儿经验、亲子互动、宝妈分享', icon: '👶' },
  { id: 'beauty_fashion', name: '美妆穿搭类', desc: '化妆教程、穿搭分享、时尚种草', icon: '💄' },
  { id: 'fitness_sports', name: '健身运动类', desc: '健身教程、运动记录、减脂增肌', icon: '💪' },
  { id: 'pets_animals', name: '萌宠动物类', desc: '宠物日常、萌宠分享', icon: '🐱' },
  { id: 'career_growth', name: '职场成长类', desc: '职场经验、求职技巧、职业规划', icon: '💼' },
  { id: 'emotion_psychology', name: '情感心理类', desc: '情感咨询、心理疏导、人际关系', icon: '❤️' },
  { id: 'rural_life', name: '三农乡村类', desc: '乡村生活、农事分享、田园风光', icon: '🌾' },
  { id: 'car_review', name: '汽车评测类', desc: '汽车测评、用车知识、自驾游', icon: '🚗' },
  { id: 'tech_digital', name: '科技数码类', desc: '产品评测、科技资讯、数码技巧', icon: '📱' },
  { id: 'no_script', name: '无脚本拍摄', desc: '随手拍、真实记录、无剧本内容', icon: '🎥' },
];

// ========== 工具函数 ==========
function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

/**
 * 估算播放量（基于互动数据）
 * 
 * 行业参考数据（爆款视频）：
 * - 点赞率：5%（播放量的5%会点赞）
 * - 评论率：0.4%
 * - 分享率：0.3%
 * 
 * 算法：多维度加权估算
 * 播放量 = 点赞估算×0.5 + 评论估算×0.2 + 分享估算×0.3
 */
function estimateViews(likes: number, comments: number, shares: number): number {
  if (likes === 0 && comments === 0 && shares === 0) {
    return 0;
  }
  
  // 基于各指标的估算
  const likesBased = likes / 0.05;      // 点赞率 5%
  const commentsBased = comments / 0.004; // 评论率 0.4%
  const sharesBased = shares / 0.003;     // 分享率 0.3%
  
  // 加权平均（点赞权重最高，因为点赞是最稳定的指标）
  const estimated = likesBased * 0.5 + commentsBased * 0.2 + sharesBased * 0.3;
  
  // 四舍五入到百位
  return Math.round(estimated / 100) * 100;
}


// ========== 主组件 ==========
export default function InspirationCocreatePage() {
  const router = useRouter();
  
  // 视频列表状态
  const [videos, setVideos] = useState<VideoCard[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'content' | 'presentation'>('all');
  const [selectedTrack, setSelectedTrack] = useState('全部赛道');
  const [sortBy, setSortBy] = useState<'time' | 'views' | 'likes'>('time');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false); // 文案弹窗
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoCard | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // 权限相关状态
  const [permission, setPermission] = useState<PermissionState>({
    hasPermission: true,
    isAdmin: false,
    expiresAt: null,
    remainingHours: 0,
    uploadCount: 0,
    totalExtendedHours: 0,
    isNewUser: false,
  });
  const [isLoadingPermission, setIsLoadingPermission] = useState(true);
  
  // 上传相关状态
  const [shareLink, setShareLink] = useState('');
  const [shareCategory, setShareCategory] = useState<'content' | 'presentation'>('content');
  const [shareIndustry, setShareIndustry] = useState<string>('');
  const [selectedIndustryFilter, setSelectedIndustryFilter] = useState<string>('all'); // 行业筛选
  const [shareTitle, setShareTitle] = useState('');
  const [shareAuthor, setShareAuthor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 提取口播文案相关状态
  const [isExtractingScript, setIsExtractingScript] = useState(false);
  const [extractedScript, setExtractedScript] = useState<string | null>(null);
  
  // 仿写配置弹窗相关状态
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteVideo, setRewriteVideo] = useState<VideoCard | null>(null);
  const [customers, setCustomers] = useState<{id: number; name: string; ipPositioning: string | null}[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [rewriteForm, setRewriteForm] = useState({
    customerId: '',
    scriptType: 'knowledge',
    shootingMethod: 'talking_head',
    industry: '',
    additionalInfo: '',
  });

  // 脚本类型选项
  const SCRIPT_TYPES = [
    { id: 'story', name: '讲故事', desc: '立人设、建立信任', topic: '个人经历、情感故事' },
    { id: 'process', name: '晒过程', desc: '秀手艺、展实力', topic: '实操过程、技艺展示' },
    { id: 'knowledge', name: '教知识', desc: '引粉丝、建权威', topic: '技巧分享、避坑指南、干货教学' },
    { id: 'opinion', name: '说观点', desc: '树专业、引共鸣', topic: '争议话题、立场表达、行业观点' },
  ];

  // 拍摄方式选项
  const SHOOTING_METHODS = [
    { id: 'talking_head', name: '直面镜头讲述', desc: '正对镜头讲解分享' },
    { id: 'follow_shot', name: '跟拍记录', desc: '跟随拍摄真实过程' },
    { id: 'fixed_angle', name: '固定机位展示', desc: '机位不动展示内容' },
    { id: 'voice_over', name: '画外音配画面', desc: '只出声音不配人像' },
    { id: 'third_person', name: '第三人称偷拍', desc: '第三方视角记录' },
    { id: 'selfie', name: '手持自拍', desc: '自己手持手机拍摄' },
  ];

  // 获取客户列表
  const loadCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/customer/list', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await response.json();
      // API返回格式: { data: customers } 或 { success: false, error: ... }
      const customerList = data.data || (data.success ? data.customers : null);
      if (customerList && Array.isArray(customerList)) {
        setCustomers(customerList.map((c: {id: number; name: string; ipPositioning: string | null}) => ({
          id: c.id,
          name: c.name,
          ipPositioning: c.ipPositioning,
        })));
      }
    } catch (error) {
      console.error('加载客户列表失败:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // 当弹窗打开时加载客户列表
  useEffect(() => {
    if (showRewriteModal && customers.length === 0) {
      loadCustomers();
    }
  }, [showRewriteModal]);

  // 提取口播文案
  const handleExtractScript = async () => {
    if (!shareLink.trim()) {
      toast.error('请先输入视频链接');
      return;
    }
    
    setIsExtractingScript(true);
    setExtractedScript(null);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
      
      const response = await fetch('/api/video/deep-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ url: shareLink }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.scriptContent) {
        setExtractedScript(data.data.scriptContent);
        toast.success('口播文案提取成功');
      } else {
        toast.error(data.error || '提取失败，请稍后重试');
      }
    } catch (error) {
      console.error('提取口播文案失败:', error);
      toast.error('提取失败，请稍后重试');
    } finally {
      setIsExtractingScript(false);
    }
  };

  // 加载视频列表
  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true);
    try {
      // 从 localStorage 获取 token 并传递给 API
      const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
      const response = await fetch('/api/inspiration-cocreate/videos', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      const data = await response.json();
      console.log('[灵感共创] 视频列表响应:', data);
      if (data.success && data.videos) {
        console.log('[灵感共创] 设置视频列表:', data.videos.length, '个视频');
        // 合并公开视频和用户自己上传的处理中视频，并去重
        const allVideos = [...data.videos];
        if (data.pendingVideos && data.pendingVideos.length > 0) {
          // 将处理中的视频添加到列表开头
          allVideos.unshift(...data.pendingVideos);
          console.log('[灵感共创] 添加处理中视频:', data.pendingVideos.length, '个');
        }
        // 去重：优先保留处理中的视频（后出现的覆盖先出现的）
        const uniqueVideos = Array.from(
          new Map(allVideos.map((v: any) => [v.id, v])).values()
        );
        console.log('[灵感共创] 去重后视频数量:', uniqueVideos.length);
        setVideos(uniqueVideos);
      } else {
        console.log('[灵感共创] 无视频数据:', data);
      }
    } catch (error) {
      console.error('加载视频列表失败:', error);
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // 定期刷新视频列表（检查处理状态）
  useEffect(() => {
    // 每30秒刷新一次，检查是否有处理完成的视频
    const interval = setInterval(() => {
      loadVideos();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadVideos]);

  // 检查权限
  useEffect(() => {
    const checkPermission = async () => {
      setIsLoadingPermission(true);
      try {
        // 从localStorage获取token并添加到请求头
        const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
        const response = await fetch('/api/inspiration-cocreate/permission', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include', // 确保携带 cookie
        });
        const data = await response.json();
        console.log('[灵感共创] 权限检查结果:', data);
        setPermission(data);
      } catch (error) {
        console.error('检查权限失败:', error);
        // 默认允许查看（降级处理）
        setPermission({
          hasPermission: true,
          isAdmin: false,
          expiresAt: null,
          remainingHours: 0,
          uploadCount: 0,
          totalExtendedHours: 0,
          isNewUser: false,
        });
      } finally {
        setIsLoadingPermission(false);
      }
    };
    
    checkPermission();
  }, []);

  const filteredVideos = useMemo(() => {
    console.log('[灵感共创] 筛选参数:', { 
      videosCount: videos.length, 
      selectedCategory, 
      selectedTrack,
      selectedIndustryFilter,
      searchQuery 
    });
    const result = videos.filter(video => {
      if (searchQuery && !video.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategory !== 'all' && video.category !== selectedCategory) return false;
      if (selectedTrack !== '全部赛道' && video.track !== selectedTrack) return false;
      if (selectedIndustryFilter !== 'all' && video.industry !== selectedIndustryFilter) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'views') return b.stats.views - a.stats.views;
      if (sortBy === 'likes') return b.stats.likes - a.stats.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    console.log('[灵感共创] 筛选结果:', result.length, '个视频');
    return result;
  }, [searchQuery, selectedCategory, selectedTrack, selectedIndustryFilter, sortBy, videos]);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 上传视频
  const handleShare = async () => {
    if (!shareLink.trim()) {
      toast.error('请输入视频链接');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 从localStorage获取token
      const token = typeof window !== 'undefined' ? localStorage.getItem('sessionToken') : null;
      
      // 使用带超时和重试的请求
      const { data } = await fetchWithRetry<{ 
        success: boolean; 
        message?: string; 
        tip?: string;
        error?: string;
        videoId?: number;
        processingStatus?: string;
      }>('/api/inspiration-cocreate/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ 
          url: shareLink, 
          category: shareCategory,
          industry: shareIndustry,
        }),
        timeout: 60000,      // 60秒超时（增加以应对数据库慢查询）
        retries: 2,          // 失败重试2次
        retryDelay: 1000,    // 1秒后重试
      });
      
      if (data.success) {
        // 关闭弹窗
        setShowShareModal(false);
        setShareLink('');
        setShareTitle('');
        setShareAuthor('');
        
        // 显示异步处理提示
        if (data.tip) {
          toast.success(
            <div className="space-y-2">
              <div className="font-medium">{data.message}</div>
              <div className="text-sm text-muted-foreground">{data.tip}</div>
            </div>,
            { duration: 5000 }
          );
        } else {
          toast.success(data.message || '上传成功');
        }
        
        // 刷新视频列表
        loadVideos();
        // 刷新权限
        const permResponse = await fetch('/api/inspiration-cocreate/permission', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        });
        const permData = await permResponse.json();
        setPermission(permData);
      } else {
        toast.error(data.error || '上传失败');
      }
    } catch (error) {
      console.error('分享失败:', error);
      // 使用友好的错误提示
      const errorMsg = getErrorMessage(error, '上传视频');
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = (video: VideoCard) => {
    setSelectedVideo(video);
    setShowAnalysisModal(true);
  };

  // 深度分析 - 跳转到视频分析页面
  const handleDeepAnalyze = (video: VideoCard) => {
    if (video.videoUrl) {
      // 跳转到视频分析页面，带上视频URL
      router.push(`/operations/video-analysis?url=${encodeURIComponent(video.videoUrl)}`);
    } else {
      toast.error('该视频暂无链接，无法分析');
    }
  };

  // 显示文案弹窗
  const handleShowScript = (video: VideoCard) => {
    setSelectedVideo(video);
    setShowContentModal(true);
  };

  // 标题灵感 - 显示标题生成弹窗
  const handleRewrite = (video: VideoCard) => {
    setSelectedVideo(video);
    setShowTitleModal(true);
  };

  // 选题推荐 - 显示选题推荐弹窗
  const handlePolish = (video: VideoCard) => {
    setSelectedVideo(video);
    setShowTopicModal(true);
  };

  // 话题标签 - 显示话题弹窗
  const handleCreateScript = (video: VideoCard) => {
    setSelectedVideo(video);
    // 这里可以导航到话题标签页面或显示弹窗
  };

  // 仿写脚本 - 弹出配置弹窗
  const handleRewriteScript = (video: VideoCard) => {
    setRewriteVideo(video);
    
    // 使用默认类型，AI会在生成时根据原视频自动判断
    // 不需要在前端显式识别
    const defaultScriptType = 'knowledge';
    
    setRewriteForm({
      customerId: '',
      scriptType: defaultScriptType,
      shootingMethod: 'talking_head',
      industry: video.industry || '',
      additionalInfo: '',
    });
    setShowAnalysisModal(false);
    setShowRewriteModal(true);
  };

  // 确认仿写 - 跳转到脚本生成页面
  const handleConfirmRewrite = () => {
    if (!rewriteVideo) return;
    
    // 获取选中客户的IP定位信息
    let ipPositioning = null;
    let customerName = '';
    if (rewriteForm.customerId) {
      const selectedCustomer = customers.find(c => c.id.toString() === rewriteForm.customerId);
      if (selectedCustomer?.ipPositioning) {
        try {
          ipPositioning = JSON.parse(selectedCustomer.ipPositioning);
          customerName = selectedCustomer.name;
        } catch {}
      }
    }
    
    // 存储视频信息到 sessionStorage，供脚本生成页面使用
    // 如果选择了客户档案，topic 使用客户档案相关的主题方向
    // 如果没有选择客户档案，topic 使用提取的文案内容
    let topic = '';
    if (ipPositioning) {
      // 有客户档案时，从档案中提取主题方向
      const nicheField = ipPositioning.positioningDirection?.nicheField || '';
      const contentTrack = ipPositioning.positioningDirection?.contentTrack?.[0] || '';
      const coreBusiness = ipPositioning.coreBusiness || '';
      const identity = ipPositioning.basicInfo?.identity || '';
      
      // 组合成主题提示
      topic = `${identity ? identity + ' - ' : ''}${nicheField || contentTrack || coreBusiness || '内容创作'}`;
    } else {
      // 没有客户档案时，使用提取的文案或标题
      topic = rewriteVideo.scriptContent || rewriteVideo.title;
    }
    
    sessionStorage.setItem('generation_params', JSON.stringify({
      topic,
      customerId: rewriteForm.customerId ? parseInt(rewriteForm.customerId) : null,
      customerName,
      ipPositioning,
      scriptType: rewriteForm.scriptType,
      shootingMethod: rewriteForm.shootingMethod,
      industry: rewriteForm.industry,
      additionalInfo: rewriteForm.additionalInfo,
      referenceVideo: {
        title: rewriteVideo.title,
        scriptContent: rewriteVideo.scriptContent, // 提取的完整文案（仅供结构参考）
        hashtags: rewriteVideo.hashtags,
        stats: rewriteVideo.stats,
        track: rewriteVideo.track,
        contentType: rewriteVideo.contentType,
        highlight: rewriteVideo.highlight,
        viralTags: rewriteVideo.viralTags,
        platform: rewriteVideo.platform,
      },
      source: 'inspiration-cocreate',
      hasCustomerProfile: !!ipPositioning, // 标记是否有客户档案
      generationMode: 'rewrite', // 标记为仿写模式（输出多形态）
    }));
    
    // 关闭弹窗
    setShowRewriteModal(false);
    setRewriteVideo(null);
    
    // 跳转到脚本生成页面
    router.push('/script/result?type=script');
  };

  // 删除视频（管理员权限）
  const handleDelete = async (video: VideoCard) => {
    if (!confirm(`确定要删除这条视频吗？\n\n${video.title}`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch(`/api/inspiration-cocreate/videos/${video.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast.success('视频已删除');
        // 从列表中移除
        setVideos(prev => prev.filter(v => v.id !== video.id));
      } else {
        toast.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('[删除视频] 错误:', error);
      toast.error('删除失败，请稍后重试');
    }
  };

  // 重新提取文案（管理员权限）
  const handleReprocess = async (video: VideoCard) => {
    if (!confirm(`确定要重新提取这条视频的文案吗？\n\n${video.title}\n\n这将覆盖现有的文案内容。`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/inspiration-cocreate/reprocess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ videoId: video.id }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('已开始重新提取，请稍后刷新查看结果');
      } else {
        toast.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error('[重新提取] 错误:', error);
      toast.error('操作失败，请稍后重试');
    }
  };

  // 加载中
  if (isLoadingPermission) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">正在加载...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 无权限 - 显示过期遮罩（管理员豁免）
  if (!permission.hasPermission && !permission.isAdmin) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 relative">
          {/* 模糊背景 */}
          <div className="max-w-7xl mx-auto px-6 py-6 filter blur-sm pointer-events-none select-none">
            {/* 标题行 */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Lightbulb className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">灵感共创</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">发现爆款规律，共创优质内容</p>
                </div>
              </div>
            </div>
            
            {/* 模糊卡片 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-64 bg-muted/30 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
          
          {/* 过期遮罩 - 只覆盖内容区域，不覆盖导航栏 */}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
              <div className="p-6 text-center">
                {/* 图标 */}
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-amber-600" />
                </div>
                
                <h2 className="text-xl font-bold text-foreground mb-2">体验已结束</h2>
                <p className="text-muted-foreground mb-4">
                  您的免费查看权限已过期
                </p>
                
                {/* 规则说明 */}
                <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Gift className="w-4 h-4 text-emerald-500" />
                    <span>新用户免费体验 <strong className="text-foreground">24小时</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span>每上传一条爆款视频延长 <strong className="text-foreground">72小时</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>需点赞 ≥1000 且符合类型要求</span>
                  </div>
                </div>
                
                {/* 上传按钮 */}
                <Button 
                  onClick={() => setShowShareModal(true)} 
                  className="w-full h-12 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl border-0"
                >
                  <Upload className="w-5 h-5" />
                  上传爆款视频延长权限
                </Button>
                
                <p className="text-xs text-muted-foreground mt-4">
                  已上传 <strong>{permission.uploadCount}</strong> 个视频，累计延长 <strong>{permission.totalExtendedHours}</strong> 小时
                </p>
              </div>
            </div>
          </div>
          
          {/* 上传弹窗 */}
          {showShareModal && (
            <ShareModal 
              shareLink={shareLink}
              setShareLink={setShareLink}
              shareCategory={shareCategory}
              setShareCategory={setShareCategory}
              shareIndustry={shareIndustry}
              setShareIndustry={setShareIndustry}
              shareTitle={shareTitle}
              setShareTitle={setShareTitle}
              shareAuthor={shareAuthor}
              setShareAuthor={setShareAuthor}
              isSubmitting={isSubmitting}
              onClose={() => {
                setShowShareModal(false);
                setExtractedScript(null);
              }}
              onSubmit={handleShare}
              isExtractingScript={isExtractingScript}
              extractedScript={extractedScript}
              onExtractScript={handleExtractScript}
              onCopyScript={(text) => {
                navigator.clipboard.writeText(text);
                setCopiedId('extracted-script');
                setTimeout(() => setCopiedId(null), 2000);
              }}
              copiedScriptId={copiedId}
            />
          )}
        </div>
      </DashboardLayout>
    );
  }

  // 有权限 - 正常显示
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-7xl mx-auto px-6 pt-6">
          {/* 标题行 */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Lightbulb className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">灵感共创</h1>
                <p className="text-sm text-muted-foreground mt-0.5">发现爆款规律，共创优质内容</p>
              </div>
            </div>
            <Button onClick={() => setShowShareModal(true)} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl px-5 shadow-lg shadow-orange-500/20 border-0">
              <Upload className="w-4 h-4" />
              分享爆款
            </Button>
          </div>

          {/* 说明卡片 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 p-5 mb-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-2xl"></div>
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">众智成城，共享灵感。</span>
                  <span className="text-muted-foreground"> 汇聚优质爆款案例，助力创作者洞察内容密码，激发无限创作可能！</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">共建共享，共同成长</span>
                  <span className="ml-1">✨</span>
                </p>
              </div>
            </div>
          </div>

          {/* 权限提示条 */}
          {permission.isAdmin ? (
            // 管理员提示
            <div className="rounded-xl p-3.5 mb-5 flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-purple-600 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-purple-700 dark:text-purple-400">
                    ⭐ 管理员特权
                  </span>
                  <span className="text-purple-600 dark:text-purple-500 ml-2">无限期使用灵感共创功能</span>
                </div>
              </div>
            </div>
          ) : (
            // 普通用户提示
            <div className={`rounded-xl p-3.5 mb-5 flex items-center justify-between ${
              permission.remainingHours <= 6 
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' 
                : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
            }`}>
              <div className="flex items-center gap-3">
                {permission.remainingHours <= 6 ? (
                  <>
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        剩余 {permission.remainingHours} 小时
                      </span>
                      <span className="text-amber-600 dark:text-amber-500 ml-2">权限即将到期，上传爆款视频可延长 72 小时</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        🎁 {permission.isNewUser ? '新用户福利' : `剩余 ${permission.remainingHours} 小时`}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-500 ml-2">您正在体验免费查看权限，上传爆款视频可延长查看时间</span>
                    </div>
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)} className={`shrink-0 gap-1.5 ${
                permission.remainingHours <= 6 
                  ? 'border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400' 
                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400'
              }`}>
                <Upload className="w-3.5 h-3.5" />
                上传延长
              </Button>
            </div>
          )}

          {/* 筛选器 */}
          <div className="flex items-center gap-4 flex-wrap mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索视频标题..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl bg-background border-border/50 focus:border-primary" />
            </div>
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
              <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>全部</button>
              <button onClick={() => setSelectedCategory('content')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === 'content' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>内容型</button>
              <button onClick={() => setSelectedCategory('presentation')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === 'presentation' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>展示型</button>
            </div>
            <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value)} className="h-10 px-4 rounded-xl bg-muted/50 border-0 text-sm font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
              {TRACKS.map(track => <option key={track} value={track}>{track}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'time' | 'views' | 'likes')} className="h-10 px-4 rounded-xl bg-muted/50 border-0 text-sm font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option value="time">按上传时间</option>
              <option value="views">按播放量</option>
              <option value="likes">按点赞数</option>
            </select>
            <select value={selectedIndustryFilter} onChange={(e) => setSelectedIndustryFilter(e.target.value)} className="h-10 px-4 rounded-xl bg-muted/50 border-0 text-sm font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <option value="all">全部行业</option>
              {INDUSTRIES.map(industry => <option key={industry.id} value={industry.id}>{industry.icon} {industry.name}</option>)}
            </select>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-5 mb-6 text-sm">
            <span className="text-muted-foreground">共 <strong className="text-foreground">{filteredVideos.length}</strong> 个爆款视频</span>
            <div className="h-4 w-px bg-border"></div>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              内容型：选题好、文案好、观点/干货/故事
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              展示型：创意好、拍摄好、剪辑好、画面感
            </span>
          </div>
        </div>

        {/* 视频列表 - 双列布局 */}
        <div className="max-w-7xl mx-auto px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredVideos.map(video => (
              <VideoCardItem 
                key={video.id} 
                video={video} 
                isAdmin={permission.isAdmin}
                onDeepAnalyze={handleDeepAnalyze}
                onAnalyze={handleAnalyze}
                onRewrite={handleRewrite}
                onPolish={handlePolish}
                onCreateScript={handleCreateScript}
                onDelete={handleDelete}
                onScript={handleShowScript}
                onReprocess={handleReprocess}
              />
            ))}
          </div>
          {filteredVideos.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">暂无符合条件的视频</p>
            </div>
          )}
        </div>
      </div>

      {/* 分享弹窗 */}
      {showShareModal && (
        <ShareModal 
          shareLink={shareLink}
          setShareLink={setShareLink}
          shareCategory={shareCategory}
          setShareCategory={setShareCategory}
          shareIndustry={shareIndustry}
          setShareIndustry={setShareIndustry}
          shareTitle={shareTitle}
          setShareTitle={setShareTitle}
          shareAuthor={shareAuthor}
          setShareAuthor={setShareAuthor}
          isSubmitting={isSubmitting}
          onClose={() => {
            setShowShareModal(false);
            setExtractedScript(null);
          }}
          onSubmit={handleShare}
          isExtractingScript={isExtractingScript}
          extractedScript={extractedScript}
          onExtractScript={handleExtractScript}
          onCopyScript={(text) => {
            navigator.clipboard.writeText(text);
            setCopiedId('extracted-script');
            setTimeout(() => setCopiedId(null), 2000);
          }}
          copiedScriptId={copiedId}
        />
      )}

      {/* 分析弹窗 */}
      {showAnalysisModal && selectedVideo && (
        <AnalysisModal 
          video={selectedVideo} 
          onClose={() => { setShowAnalysisModal(false); setSelectedVideo(null); }} 
          onCopy={handleCopy} 
          onRewrite={handleRewriteScript}
          copiedId={copiedId} 
        />
      )}

      {/* 仿写配置弹窗 */}
      {showRewriteModal && rewriteVideo && (
        <RewriteModal
          video={rewriteVideo}
          customers={customers}
          isLoadingCustomers={isLoadingCustomers}
          form={rewriteForm}
          setForm={setRewriteForm}
          onClose={() => { setShowRewriteModal(false); setRewriteVideo(null); }}
          onConfirm={handleConfirmRewrite}
          shootingMethods={SHOOTING_METHODS}
        />
      )}

      {/* 话题弹窗 */}
      {showScriptModal && selectedVideo && (
        <ScriptModal 
          video={selectedVideo} 
          onClose={() => { setShowScriptModal(false); setSelectedVideo(null); }} 
          onCopy={handleCopy} 
          copiedId={copiedId} 
        />
      )}

      {/* 文案弹窗 */}
      {showContentModal && selectedVideo && (
        <ContentModal 
          video={selectedVideo} 
          onClose={() => { setShowContentModal(false); setSelectedVideo(null); }} 
          onCopy={handleCopy} 
          copiedId={copiedId} 
        />
      )}

      {/* 标题灵感弹窗 */}
      {showTitleModal && selectedVideo && (
        <TitleModal 
          video={selectedVideo} 
          onClose={() => { setShowTitleModal(false); setSelectedVideo(null); }} 
          onCopy={handleCopy} 
          copiedId={copiedId} 
        />
      )}

      {/* 选题推荐弹窗 */}
      {showTopicModal && selectedVideo && (
        <TopicModal 
          video={selectedVideo} 
          onClose={() => { setShowTopicModal(false); setSelectedVideo(null); }} 
          onCopy={handleCopy} 
          copiedId={copiedId} 
        />
      )}
    </DashboardLayout>
  );
}

// ========== 视频卡片组件 ==========
interface VideoCardItemProps {
  video: VideoCard;
  isAdmin: boolean;
  onDeepAnalyze: (video: VideoCard) => void;
  onAnalyze: (video: VideoCard) => void;
  onRewrite: (video: VideoCard) => void;
  onPolish: (video: VideoCard) => void;
  onCreateScript: (video: VideoCard) => void;
  onDelete: (video: VideoCard) => void;
  onScript: (video: VideoCard) => void;
  onReprocess?: (video: VideoCard) => void;
}

function VideoCardItem({ video, isAdmin, onDeepAnalyze, onAnalyze, onRewrite, onPolish, onCreateScript, onDelete, onScript, onReprocess }: VideoCardItemProps) {
  // 点击跳转到原视频
  const handleVideoClick = () => {
    if (video.videoUrl) {
      window.open(video.videoUrl, '_blank');
    }
  };

  return (
    <div className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex">
        <div className="relative w-40 shrink-0 cursor-pointer" onClick={handleVideoClick}>
          <div className="aspect-[3/4] relative overflow-hidden">
            <img src={video.cover} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-2.5 left-2.5">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm ${
                video.category === 'content' 
                  ? 'bg-amber-500/90 text-white' 
                  : 'bg-purple-500/90 text-white'
              }`}>
                {video.category === 'content' ? '内容' : '展示'}
              </span>
            </div>
            {/* 平台标签 */}
            {video.platform && (
              <div className="absolute top-2.5 right-2.5">
                <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-black/50 text-white backdrop-blur-sm">
                  {video.platform === 'douyin' ? '抖音' : video.platform}
                </span>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/40">
              <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                <Play className="w-5 h-5 text-primary ml-0.5" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col min-w-0">
          <h3 className="font-semibold text-foreground text-base leading-snug mb-1.5 line-clamp-2" title={video.title}>{video.title}</h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {video.hashtags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="text-xs text-primary font-medium">{tag}</span>
            ))}
          </div>
          {/* 作者信息 */}
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground truncate">{video.author.name}</span>
            <span className="text-border">|</span>
            <span className="truncate">{video.track}</span>
            <span className="text-border">|</span>
            <span>{video.contentType}</span>
            {video.industry && (
              <>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1">
                  <span>{INDUSTRIES.find(i => i.id === video.industry)?.icon || '📁'}</span>
                  <span>{INDUSTRIES.find(i => i.id === video.industry)?.name || video.industry}</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 mb-2.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ThumbsUp className="w-3.5 h-3.5" />{formatNumber(video.stats.likes)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageCircle className="w-3.5 h-3.5" />{formatNumber(video.stats.comments)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Share2 className="w-3.5 h-3.5" />{formatNumber(video.stats.shares)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground" title={video.stats.views > 0 ? '实际播放量' : '基于互动数据估算'}>
              <Eye className="w-3.5 h-3.5" />
              {video.stats.views > 0 
                ? formatNumber(video.stats.views) 
                : formatNumber(estimateViews(video.stats.likes, video.stats.comments, video.stats.shares))
              }
              <span className="text-[10px] opacity-60">{video.stats.views > 0 ? '' : '~'}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {video.viralTags.slice(0, 4).map(tag => (
              <span key={tag.id} className={`px-2 py-0.5 rounded-md text-xs font-medium ${tag.color}`}>{tag.label}</span>
            ))}
          </div>
          {video.highlight && (
            <div className="flex items-center gap-1.5 mb-3 text-xs">
              <span className="text-base">💡</span>
              <span className="text-muted-foreground">{video.highlight}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1 mt-auto pt-2.5 border-t border-border/50">
            <Button variant="ghost" size="sm" onClick={() => onDeepAnalyze(video)} className="gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 h-7 text-xs px-2">
              <Video className="w-3 h-3" />深度分析
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onScript(video)} className="gap-1 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 h-7 text-xs px-2">
              <FileText className="w-3 h-3" />文案
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onAnalyze(video)} className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 h-7 text-xs px-2">
              <Flame className="w-3 h-3" />爆款分析
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRewrite(video)} className="gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 h-7 text-xs px-2">
              <Sparkles className="w-3 h-3" />标题灵感
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onPolish(video)} className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 h-7 text-xs px-2">
              <Target className="w-3 h-3" />选题推荐
            </Button>
            {isAdmin && (
              <>
                {onReprocess && (
                  <Button variant="ghost" size="sm" onClick={() => onReprocess(video)} className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 h-7 text-xs px-2">
                    <RefreshCw className="w-3 h-3" />重新提取
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onDelete(video)} className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 text-xs px-2 ml-auto">
                  <Trash2 className="w-3 h-3" />删除
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== 分享弹窗 ==========
interface ShareModalProps {
  shareLink: string;
  setShareLink: (link: string) => void;
  shareCategory: 'content' | 'presentation';
  setShareCategory: (category: 'content' | 'presentation') => void;
  shareIndustry: string;
  setShareIndustry: (industry: string) => void;
  shareTitle: string;
  setShareTitle: (title: string) => void;
  shareAuthor: string;
  setShareAuthor: (author: string) => void;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  // 提取口播文案相关
  isExtractingScript?: boolean;
  extractedScript?: string | null;
  onExtractScript?: () => void;
  onCopyScript?: (text: string) => void;
  copiedScriptId?: string | null;
}

function ShareModal({ 
  shareLink, 
  setShareLink, 
  shareCategory, 
  setShareCategory, 
  shareIndustry,
  setShareIndustry,
  shareTitle, 
  setShareTitle, 
  shareAuthor, 
  setShareAuthor, 
  isSubmitting, 
  onClose, 
  onSubmit,
  isExtractingScript = false,
  extractedScript = null,
  onExtractScript,
  onCopyScript,
  copiedScriptId,
}: ShareModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">分享爆款视频</h2>
            <p className="text-sm text-muted-foreground mt-0.5">上传成功可延长 72 小时查看权限</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">视频链接 <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <Input placeholder="粘贴抖音、快手、小红书等视频链接..." value={shareLink} onChange={(e) => setShareLink(e.target.value)} className="rounded-xl h-11 flex-1" />
              {onExtractScript && (
                <Button 
                  onClick={onExtractScript} 
                  disabled={!shareLink.trim() || isExtractingScript} 
                  className="rounded-xl h-11 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 border-0 shrink-0"
                >
                  {isExtractingScript ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />提取中</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-1.5" />提取文案</>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {/* 提取的口播文案显示区 */}
          {extractedScript && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">口播文案</span>
                </div>
                {onCopyScript && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onCopyScript(extractedScript)} 
                    className="h-7 px-2 text-xs"
                  >
                    {copiedScriptId === 'extracted-script' ? (
                      <><CheckCircle className="w-3 h-3 mr-1 text-green-500" />已复制</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-1" />复制</>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {extractedScript}
              </p>
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">这个视频好在哪里？</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShareCategory('content')} className={`p-4 rounded-xl border-2 text-left transition-all ${shareCategory === 'content' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <div className="font-medium text-foreground mb-1">内容型</div>
                <div className="text-xs text-muted-foreground">选题好、文案好、观点/干货/故事</div>
              </button>
              <button onClick={() => setShareCategory('presentation')} className={`p-4 rounded-xl border-2 text-left transition-all ${shareCategory === 'presentation' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <div className="font-medium text-foreground mb-1">展示型</div>
                <div className="text-xs text-muted-foreground">创意好、拍摄好、剪辑好、画面感</div>
              </button>
            </div>
          </div>
          
          {/* 行业归类选择 */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">行业归类 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => setShareIndustry(industry.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all text-center ${
                    shareIndustry === industry.id 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="text-lg mb-0.5">{industry.icon}</div>
                  <div className="text-xs font-medium">{industry.name}</div>
                </button>
              ))}
            </div>
            {shareIndustry && (
              <p className="text-xs text-muted-foreground mt-2">
                {INDUSTRIES.find(i => i.id === shareIndustry)?.desc}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">视频标题</label>
              <Input placeholder="系统自动解析" value={shareTitle} onChange={(e) => setShareTitle(e.target.value)} className="rounded-xl h-10 bg-muted/30" disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">作者</label>
              <Input placeholder="系统自动解析" value={shareAuthor} onChange={(e) => setShareAuthor(e.target.value)} className="rounded-xl h-10 bg-muted/30" disabled />
            </div>
          </div>
          
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">自动审核说明</div>
                <p className="text-xs text-muted-foreground mt-1">系统将自动解析视频信息并审核：点赞数 ≥1000 且属于所选类型</p>
              </div>
            </div>
          </div>
          
          {/* 提示文案 */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed space-y-1.5">
            <p>请分享您认可的优质爆款内容，共同维护素材库的高质量标准，感谢您的用心参与 ✨</p>
            <p className="text-foreground font-medium">愿每位创作者都能产出爆款，收获满满 🎉</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-5 border-t border-border bg-muted/30 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">取消</Button>
          <Button onClick={onSubmit} disabled={!shareLink.trim() || !shareIndustry || isSubmitting} className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-11 border-0">
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />解析中...</> : '提交审核'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========== 分析弹窗 ==========
interface AnalysisModalProps {
  video: VideoCard;
  onClose: () => void;
  onCopy: (text: string, id: string) => void;
  onRewrite: (video: VideoCard) => void;
  copiedId: string | null;
}

// 轻量分析结果接口
interface QuickAnalysisData {
  title: string;
  author: string;
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  views: number;
  platform: string;
  platformName: string;
  analysis: {
    coreEssence: {
      primaryEmotion: string;
      secondaryEmotion: string;
      triggerMechanism: string;
      coreDemand: string;
      whyNow: string;
    };
    dataAttribution: {
      collectRate: string;
      shareRate: string;
      commentRate: string;
      whyHighOrLow: string;
      algorithmTrigger: string;
    };
    userPortrait: {
      targetAudience: string;
      painPoints: string[];
      pleasurePoints: string[];
    };
    contentStructure: {
      hookType: string;
      hookFormula: string;
      hookScore: number;
      structureType: string;
      endingHook: string;
    };
    copyableMethodology: {
      topicFormula: string;
      keyElements: string[];
      quickCopy: string;
    };
    riskWarning: {
      canCopy: string[];
      cannotCopy: string[];
      adaptationTip: string;
    };
    monetization: {
      path: string;
      potential: number;
      suitableProducts: string[];
    };
  };
}

function AnalysisModal({ video, onClose, onCopy, onRewrite, copiedId }: AnalysisModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<QuickAnalysisData | null>(null);

  // 调用后端 API 获取分析数据
  useEffect(() => {
    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('sessionToken');
        
        // 直接传递视频元数据，不依赖后端解析
        const response = await fetch('/api/video/quick-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            title: video.title,
            author: video.author.name,
            likes: video.stats.likes,
            collects: video.stats.collects || 0,
            shares: video.stats.shares,
            comments: video.stats.comments,
            views: video.stats.views,
            platform: video.platform || 'douyin',
            track: video.track,
            category: video.category,
            scriptContent: video.scriptContent, // 传递已有的文案内容
            videoId: video.id, // 传递视频ID用于缓存
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '分析失败');
        }

        if (!data.success || !data.data) {
          throw new Error(data.error || '分析失败，请稍后重试');
        }

        setAnalysisData(data.data);
      } catch (err: any) {
        console.error('[爆款分析] 失败:', err);
        setError(err.message || '分析失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [video]);

  // 生成完整分析文本（用于复制）
  const fullAnalysis = analysisData ? `【爆款深度分析报告 - 七大模块本质归因】

【一、核心本质拆解】
核心情绪：${analysisData.analysis.coreEssence?.primaryEmotion || ''} + ${analysisData.analysis.coreEssence?.secondaryEmotion || ''}
触发机制：${analysisData.analysis.coreEssence?.triggerMechanism || ''}
核心需求：${analysisData.analysis.coreEssence?.coreDemand || ''}
时机分析：${analysisData.analysis.coreEssence?.whyNow || ''}

【二、数据深度归因】
收藏率：${analysisData.analysis.dataAttribution?.collectRate || ''}
分享率：${analysisData.analysis.dataAttribution?.shareRate || ''}
评论率：${analysisData.analysis.dataAttribution?.commentRate || ''}
数据分析：${analysisData.analysis.dataAttribution?.whyHighOrLow || ''}
算法触发：${analysisData.analysis.dataAttribution?.algorithmTrigger || ''}

【三、用户画像拆解】
目标受众：${analysisData.analysis.userPortrait?.targetAudience || ''}
痛点：${safeJoin(analysisData.analysis.userPortrait?.painPoints, '；')}
爽点：${safeJoin(analysisData.analysis.userPortrait?.pleasurePoints, '；')}

【四、内容结构拆解】
钩子类型：${analysisData.analysis.contentStructure?.hookType || ''}（${analysisData.analysis.contentStructure?.hookScore || 0}/10分）
钩子公式：${analysisData.analysis.contentStructure?.hookFormula || ''}
结构类型：${analysisData.analysis.contentStructure?.structureType || ''}
结尾钩子：${analysisData.analysis.contentStructure?.endingHook || ''}

【五、可复制方法论】
选题公式：${analysisData.analysis.copyableMethodology?.topicFormula || ''}
必备要素：${safeJoin(analysisData.analysis.copyableMethodology?.keyElements, '、')}
快速复制：${analysisData.analysis.copyableMethodology?.quickCopy || ''}

【六、风险与避坑指南】
可复制：${safeJoin(analysisData.analysis.riskWarning?.canCopy, '、')}
不可复制：${safeJoin(analysisData.analysis.riskWarning?.cannotCopy, '、')}
适配建议：${analysisData.analysis.riskWarning?.adaptationTip || ''}

【七、变现转化拆解】
变现路径：${analysisData.analysis.monetization?.path || ''}
商业潜力：${analysisData.analysis.monetization?.potential || 0}/10分
适合产品：${safeJoin(analysisData.analysis.monetization?.suitableProducts, '、')}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">爆款深度分析</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">{video.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">正在分析视频...</p>
              <p className="text-xs text-muted-foreground/70 mt-2">AI 正在深度拆解爆款逻辑</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-500 font-medium">{error}</p>
              <Button variant="outline" onClick={onClose} className="mt-4">关闭</Button>
            </div>
          ) : analysisData ? (
            <>
              {/* 视频基础数据 */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span>数据表现</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{analysisData.platformName}</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                    <div className="text-lg font-bold text-foreground">{(analysisData.likes / 10000).toFixed(1)}w</div>
                    <div className="text-xs text-muted-foreground">点赞</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                    <div className="text-lg font-bold text-foreground">{(analysisData.collects / 10000).toFixed(1)}w</div>
                    <div className="text-xs text-muted-foreground">收藏</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                    <div className="text-lg font-bold text-foreground">{(analysisData.shares / 10000).toFixed(1)}w</div>
                    <div className="text-xs text-muted-foreground">分享</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                    <div className="text-lg font-bold text-foreground">{(analysisData.views / 10000).toFixed(1)}w</div>
                    <div className="text-xs text-muted-foreground">预估播放</div>
                  </div>
                </div>
              </div>

              {/* 模块一：核心本质拆解 */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>一、核心本质拆解</span>
                  <span className="text-xs text-muted-foreground">（为什么能爆）</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-medium shrink-0">核心情绪</span>
                    <span className="text-muted-foreground">{analysisData.analysis.coreEssence?.primaryEmotion || ''} + {analysisData.analysis.coreEssence?.secondaryEmotion || ''}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-medium shrink-0">触发机制</span>
                    <span className="text-muted-foreground">{analysisData.analysis.coreEssence?.triggerMechanism || ''}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-medium shrink-0">核心需求</span>
                    <span className="text-muted-foreground">{analysisData.analysis.coreEssence?.coreDemand || ''}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-medium shrink-0">时机分析</span>
                    <span className="text-muted-foreground">{analysisData.analysis.coreEssence?.whyNow || ''}</span>
                  </div>
                </div>
              </div>

              {/* 模块二：数据深度归因 */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span>二、数据深度归因</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                    <div className="text-lg font-bold text-foreground">{analysisData.analysis.dataAttribution?.collectRate || '0%'}</div>
                    <div className="text-xs text-muted-foreground">收藏率</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                    <div className="text-lg font-bold text-foreground">{analysisData.analysis.dataAttribution?.shareRate || '0%'}</div>
                    <div className="text-xs text-muted-foreground">分享率</div>
                  </div>
                  <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                    <div className="text-lg font-bold text-foreground">{analysisData.analysis.dataAttribution?.commentRate || '0%'}</div>
                    <div className="text-xs text-muted-foreground">评论率</div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-blue-500 mt-0.5">→</span>
                    <span><strong className="text-foreground">原因分析：</strong>{analysisData.analysis.dataAttribution?.whyHighOrLow || ''}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-blue-500 mt-0.5">→</span>
                    <span><strong className="text-foreground">算法触发：</strong>{analysisData.analysis.dataAttribution?.algorithmTrigger || ''}</span>
                  </div>
                </div>
              </div>

              {/* 模块三：用户画像拆解 */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <Users className="w-4 h-4 text-green-500" />
                  <span>三、用户画像拆解</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span><strong className="text-foreground">目标受众：</strong>{analysisData.analysis.userPortrait?.targetAudience || ''}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span><strong className="text-foreground">痛点：</strong>{safeJoin(analysisData.analysis.userPortrait?.painPoints, '；')}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong className="text-foreground">爽点：</strong>{safeJoin(analysisData.analysis.userPortrait?.pleasurePoints, '；')}</span>
                  </div>
                </div>
              </div>

              {/* 模块四：内容结构拆解 */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span>四、内容结构拆解</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span><strong className="text-foreground">钩子类型：</strong>{analysisData.analysis.contentStructure?.hookType || ''}（{analysisData.analysis.contentStructure?.hookScore || 0}/10分）</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span><strong className="text-foreground">钩子公式：</strong>{analysisData.analysis.contentStructure?.hookFormula || ''}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span><strong className="text-foreground">结构类型：</strong>{analysisData.analysis.contentStructure?.structureType || ''}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span><strong className="text-foreground">结尾钩子：</strong>{analysisData.analysis.contentStructure?.endingHook || ''}</span>
                  </div>
                </div>
              </div>

              {/* 模块五：可复制方法论 */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <span>五、可复制方法论</span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-background rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">选题公式</div>
                    <div className="text-sm font-medium text-foreground">{analysisData.analysis.copyableMethodology?.topicFormula || ''}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {safeArray(analysisData.analysis.copyableMethodology?.keyElements).map((item, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs">✓ {item}</span>
                    ))}
                  </div>
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="text-xs text-primary font-medium mb-1">快速复制</div>
                    <div className="text-sm text-foreground">{analysisData.analysis.copyableMethodology?.quickCopy || ''}</div>
                  </div>
                </div>
              </div>

              {/* 模块六：风险与避坑指南 */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>六、风险与避坑指南</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span><strong className="text-foreground">可复制：</strong>{safeJoin(analysisData.analysis.riskWarning?.canCopy, '、')}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-red-500 mt-0.5">✗</span>
                    <span><strong className="text-foreground">不可复制：</strong>{safeJoin(analysisData.analysis.riskWarning?.cannotCopy, '、')}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-blue-500 mt-0.5">💡</span>
                    <span><strong className="text-foreground">适配建议：</strong>{analysisData.analysis.riskWarning?.adaptationTip || ''}</span>
                  </div>
                </div>
              </div>

              {/* 模块七：变现转化拆解 */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span>七、变现转化拆解</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong className="text-foreground">变现路径：</strong>{analysisData.analysis.monetization?.path || ''}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong className="text-foreground">商业潜力：</strong>{analysisData.analysis.monetization?.potential || 0}/10分</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span><strong className="text-foreground">适合产品：</strong>{safeJoin(analysisData.analysis.monetization?.suitableProducts, '、')}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3 p-5 border-t border-border bg-muted/30 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">关闭</Button>
          <Button 
            onClick={() => analysisData && onCopy(fullAnalysis, 'full')} 
            variant="outline" 
            className="flex-1 rounded-xl h-11 gap-2"
            disabled={isLoading || !!error || !analysisData}
          >
            {copiedId === 'full' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copiedId === 'full' ? '已复制' : '复制分析'}
          </Button>
          <Button 
            className="flex-1 rounded-xl h-11 gap-2" 
            onClick={() => onRewrite(video)}
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4" />
            仿写脚本
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========== 仿写配置弹窗 ==========
interface RewriteModalProps {
  video: VideoCard | null;
  customers: {id: number; name: string; ipPositioning: string | null}[];
  isLoadingCustomers: boolean;
  form: {
    customerId: string;
    scriptType: string;
    shootingMethod: string;
    industry: string;
    additionalInfo: string;
  };
  setForm: (form: RewriteModalProps['form']) => void;
  onClose: () => void;
  onConfirm: () => void;
  shootingMethods: {id: string; name: string; desc: string}[];
}

function RewriteModal({
  video,
  customers,
  isLoadingCustomers,
  form,
  setForm,
  onClose,
  onConfirm,
  shootingMethods,
}: RewriteModalProps) {
  if (!video) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        {/* 标题 */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">仿写脚本配置</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">{video.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 参考视频信息 */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">参考爆款</span>
            </div>
            <p className="text-sm text-foreground">{video.title}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>👍 {video.stats.likes.toLocaleString()}</span>
              <span>💬 {video.stats.comments.toLocaleString()}</span>
              <span>🔗 {video.stats.shares.toLocaleString()}</span>
            </div>
          </div>
          
          {/* 提取的文案预览 */}
          {video.scriptContent && video.scriptContent !== video.title && (
            <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">提取的口播文案（参考）</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                {video.scriptContent}
              </p>
              <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-2">
                共 {video.scriptContent.length} 字
              </p>
            </div>
          )}
          
          {/* 客户档案选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              选择客户档案
              <span className="text-muted-foreground font-normal ml-1">(可选，选择后自动填充行业信息)</span>
            </label>
            {isLoadingCustomers ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">加载客户列表...</span>
              </div>
            ) : customers.length > 0 ? (
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-muted/50 border-0 text-sm font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">不选择客户档案</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-xl bg-muted/50 text-sm text-muted-foreground">
                暂无客户档案，可手动填写行业信息
              </div>
            )}
          </div>
          
          {/* 行业信息 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              行业/赛道
              {form.customerId && <span className="text-muted-foreground font-normal ml-1">(已从客户档案读取)</span>}
            </label>
            <Input
              placeholder="如：美妆、美食、知识付费..."
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="h-11 rounded-xl"
              disabled={!!form.customerId}
            />
          </div>
          
          {/* 拍摄方式 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">拍摄方式</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {shootingMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setForm({ ...form, shootingMethod: method.id })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.shootingMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="font-medium text-sm">{method.name}</div>
                  <div className="text-xs text-muted-foreground">{method.desc}</div>
                </button>
              ))}
            </div>
          </div>
          
          {/* 补充说明 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              补充说明
              <span className="text-muted-foreground font-normal ml-1">(可选)</span>
            </label>
            <textarea
              placeholder="例如：希望突出产品特点、适合新手观看..."
              value={form.additionalInfo}
              onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })}
              className="w-full h-20 px-4 py-3 rounded-xl bg-muted/50 border-0 text-sm resize-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        
        {/* 底部按钮 */}
        <div className="flex items-center gap-3 p-5 border-t border-border bg-muted/30 shrink-0">
          <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={onClose}>
            取消
          </Button>
          <Button className="flex-1 rounded-xl h-11" onClick={onConfirm}>
            开始生成
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========== 话题标签弹窗 ==========
interface ScriptModalProps {
  video: VideoCard;
  onClose: () => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

function ScriptModal({ video, onClose, onCopy, copiedId }: ScriptModalProps) {
  const hashtags = video.hashtags;
  
  // 相关话题推荐
  const relatedTopics = [
    { tag: '口播技巧', desc: '提升口播表达能力', heat: '高' },
    { tag: '短视频运营', desc: '涨粉变现攻略', heat: '高' },
    { tag: '内容创作', desc: '爆款内容方法论', heat: '中' },
    { tag: '个人IP打造', desc: '建立个人品牌', heat: '中' },
    { tag: '视频脚本', desc: '脚本写作技巧', heat: '低' },
  ];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">话题标签</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">{video.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* 当前话题 */}
          {hashtags.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4 text-primary" />
                当前话题
              </h3>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">#{tag}</span>
                ))}
              </div>
            </div>
          )}
          
          {/* 相关话题推荐 */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              相关话题推荐
            </h3>
            <div className="space-y-2">
              {relatedTopics.map((topic, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-sm">#{topic.tag}</span>
                    <span className="text-sm text-muted-foreground">{topic.desc}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${topic.heat === '高' ? 'bg-red-100 text-red-600' : topic.heat === '中' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                    {topic.heat}热度
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* 使用建议 */}
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">话题使用技巧</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>选择2-5个相关话题，提高曝光精准度</li>
                  <li>优先选择高热度话题，增加流量池</li>
                  <li>结合垂直领域话题，吸引目标用户</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-5 border-t border-border bg-muted/30 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">关闭</Button>
          <Button onClick={() => onCopy(hashtags.map(t => `#${t}`).join(' '), 'hashtags')} variant="outline" className="flex-1 rounded-xl h-11 gap-2">
            {copiedId === 'hashtags' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copiedId === 'hashtags' ? '已复制' : '复制话题'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========== 文案弹窗 ==========
interface ContentModalProps {
  video: VideoCard;
  onClose: () => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

function ContentModal({ video, onClose, onCopy, copiedId }: ContentModalProps) {
  const scriptContent = video.scriptContent || video.title;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">口播文案</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">{video.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1">
          {/* 视频信息 */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/30 rounded-xl">
            <img src={video.cover} alt={video.title} className="w-16 h-16 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm line-clamp-2">{video.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{video.author.name}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span>👍 {formatNumber(video.stats.likes)}</span>
                <span>💬 {formatNumber(video.stats.comments)}</span>
                <span>🔗 {formatNumber(video.stats.shares)}</span>
              </div>
            </div>
          </div>
          
          {/* 文案内容 */}
          <div className="mb-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-600" />
              提取的口播文案
            </h3>
            <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {scriptContent}
              </p>
            </div>
          </div>
          
          {/* 使用提示 */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-1">使用提示</p>
                <p>此文案由 Vision AI 从视频中自动提取，可用于参考学习。建议结合爆款分析功能，深入理解文案结构和表达技巧。</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-5 border-t border-border bg-muted/30 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">关闭</Button>
          <Button onClick={() => onCopy(scriptContent, 'script-content')} className="flex-1 rounded-xl h-11 gap-2 bg-cyan-600 hover:bg-cyan-700 text-white">
            {copiedId === 'script-content' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedId === 'script-content' ? '已复制' : '复制文案'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========== 标题灵感弹窗 ==========
interface TitleModalProps {
  video: VideoCard;
  onClose: () => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

function TitleModal({ video, onClose, onCopy, copiedId }: TitleModalProps) {
  // 基于原标题生成灵感标题
  const titleTemplates = useMemo(() => {
    const title = video.title;
    const numbers = title.match(/\d+/g) || [];
    const keywords = ['必看', '干货', '收藏', '分享', '建议', '技巧'];
    
    // 智能截取标题，保持语义完整
    const smartSlice = (str: string, maxLen: number) => {
      if (str.length <= maxLen) return str;
      // 尝试在标点符号处截断
      const puncts = ['，', '。', '！', '？', '、', ' '];
      for (let i = maxLen; i > maxLen - 5 && i > 0; i--) {
        if (puncts.includes(str[i])) {
          return str.slice(0, i);
        }
      }
      return str.slice(0, maxLen);
    };
    
    return [
      {
        title: `【干货】${smartSlice(title, 18)}，建议收藏`,
        pattern: '干货标签型',
        desc: '添加干货标签，强调实用价值'
      },
      {
        title: `${numbers[0] || '3'}个方法帮你搞定${smartSlice(title, 10)}`,
        pattern: '数字公式型',
        desc: '数字开头，信息量清晰'
      },
      {
        title: `建议收藏！${smartSlice(title, 18)}`,
        pattern: '行动号召型',
        desc: '开头呼吁行动，提高互动'
      },
      {
        title: `千万别错过｜${smartSlice(title, 16)}`,
        pattern: '紧迫感型',
        desc: '制造紧迫感，激发点击'
      },
      {
        title: `小白必看：${smartSlice(title, 18)}`,
        pattern: '人群定向型',
        desc: '明确目标人群，精准吸引'
      },
    ];
  }, [video.title]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">标题灵感</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">基于爆款标题模式生成</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* 原标题参考 */}
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <div className="text-xs text-muted-foreground mb-1">原标题参考</div>
            <p className="text-sm font-medium text-foreground">{video.title}</p>
          </div>
          
          {/* 灵感标题 */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              标题灵感推荐
            </h3>
            <div className="space-y-3">
              {titleTemplates.map((item, idx) => (
                <div key={idx} className="p-4 bg-muted/30 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <p className="text-sm font-medium text-foreground mb-2">{item.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary">{item.pattern}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 标题技巧 */}
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">爆款标题公式</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>数字+关键词：如「3个技巧让你...」</li>
                  <li>痛点+方案：如「xx问题？一招解决」</li>
                  <li>人群+收益：如「小白必看，xx必备」</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-5 border-t border-border bg-muted/30 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">关闭</Button>
        </div>
      </div>
    </div>
  );
}

// ========== 选题推荐弹窗 ==========
interface TopicModalProps {
  video: VideoCard;
  onClose: () => void;
  onCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

function TopicModal({ video, onClose, onCopy, copiedId }: TopicModalProps) {
  // 基于话题生成选题推荐
  const topicSuggestions = useMemo(() => {
    const hashtags = video.hashtags;
    
    return [
      {
        topic: '新手如何快速上手口播',
        angle: '入门指南',
        difficulty: '简单',
        reason: '针对新手痛点，容易产生共鸣'
      },
      {
        topic: '口播常见错误及避免方法',
        angle: '避坑指南',
        difficulty: '中等',
        reason: '负面信息传播性强，用户爱看'
      },
      {
        topic: '从0到1打造个人IP口播风格',
        angle: '成长路径',
        difficulty: '中等',
        reason: '长期价值内容，用户愿意收藏'
      },
      {
        topic: '口播变现：普通人如何赚到第一桶金',
        angle: '变现方法',
        difficulty: '较难',
        reason: '变现话题永远是刚需'
      },
      {
        topic: '不同赛道口播脚本模板分享',
        angle: '工具资源',
        difficulty: '中等',
        reason: '工具类内容实用性强，易传播'
      },
    ];
  }, [video.hashtags]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">选题推荐</h2>
              <p className="text-sm text-muted-foreground line-clamp-1">基于话题拓展相关选题</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* 当前话题 */}
          {video.hashtags.length > 0 && (
            <div className="p-4 bg-muted/30 rounded-xl border border-border">
              <div className="text-xs text-muted-foreground mb-2">基于话题</div>
              <div className="flex flex-wrap gap-2">
                {video.hashtags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-sm">#{tag}</span>
                ))}
              </div>
            </div>
          )}
          
          {/* 选题推荐 */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              推荐选题方向
            </h3>
            <div className="space-y-3">
              {topicSuggestions.map((item, idx) => (
                <div key={idx} className="p-4 bg-muted/30 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-foreground flex-1">{item.topic}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ml-2 shrink-0 ${
                      item.difficulty === '简单' ? 'bg-green-100 text-green-600' : 
                      item.difficulty === '中等' ? 'bg-amber-100 text-amber-600' : 
                      'bg-red-100 text-red-600'
                    }`}>{item.difficulty}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-primary">{item.angle}</span>
                    <span>·</span>
                    <span>{item.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 选题技巧 */}
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">选题技巧</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>结合自身经历，增加真实感</li>
                  <li>选择有争议的话题，引发讨论</li>
                  <li>关注热点事件，借势传播</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-5 border-t border-border bg-muted/30 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">关闭</Button>
        </div>
      </div>
    </div>
  );
}
