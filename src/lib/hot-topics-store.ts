// 热点数据存储模块 - 优化版
// 支持：短期缓存（1小时）+ 周期缓存（每周）+ 后台刷新

import fs from 'fs';
import path from 'path';

// 热点数据类型
export interface HotTopic {
  id: string;
  title: string;
  heat: number;           // 热度值 0-100
  trend: 'up' | 'down' | 'stable';
  category: string;
  platform: 'douyin' | 'xiaohongshu' | 'shipinhao' | 'kuaishou';
  views?: string;
  engagement?: string;
  relatedTopics?: string[];
  analysis?: string;
  source?: string;        // 来源链接
  rank?: number;          // 排名
}

// 平台热点数据
export interface PlatformHotTopics {
  platform: string;
  platformName: string;
  updateAt: string;
  topics: HotTopic[];
}

// 缓存数据结构
export interface HotTopicsCache {
  lastUpdate: string;         // 最后更新时间（ISO格式）
  weekNumber: number;
  year: number;
  // 短期缓存控制
  shortTermCacheExpiry: string;  // 短期缓存过期时间（1小时后）
  isRefreshing: boolean;         // 是否正在后台刷新
  platforms: {
    douyin: PlatformHotTopics | null;
    xiaohongshu: PlatformHotTopics | null;
    shipinhao: PlatformHotTopics | null;
    kuaishou: PlatformHotTopics | null;
  };
}

// 数据存储路径
const DATA_DIR = '/app/work/data';
const CACHE_FILE = path.join(DATA_DIR, 'hot-topics-cache.json');

// 短期缓存时长（毫秒）- 1小时
const SHORT_TERM_CACHE_DURATION = 60 * 60 * 1000;

// 获取当前周数
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

// 确保目录存在
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 读取缓存
export function loadCache(): HotTopicsCache | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('读取热点缓存失败:', error);
  }
  return null;
}

// 保存缓存
export function saveCache(cache: HotTopicsCache): void {
  try {
    ensureDataDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存热点缓存失败:', error);
  }
}

/**
 * 检查是否需要更新（综合判断）
 * - 如果没有缓存：需要更新
 * - 如果跨周了：需要更新
 * - 如果短期缓存过期：需要更新
 */
export function needsUpdate(): boolean {
  const cache = loadCache();
  if (!cache) return true;
  
  // 检查周数
  const current = getWeekNumber(new Date());
  if (cache.weekNumber !== current.week || cache.year !== current.year) {
    return true;
  }
  
  // 检查短期缓存
  if (cache.shortTermCacheExpiry) {
    const expiryTime = new Date(cache.shortTermCacheExpiry).getTime();
    if (Date.now() > expiryTime) {
      return true;
    }
  }
  
  return false;
}

/**
 * 检查短期缓存是否有效
 * 用于判断是否可以立即返回缓存数据
 */
export function isShortTermCacheValid(): boolean {
  const cache = loadCache();
  if (!cache) return false;
  
  // 有数据且短期缓存未过期
  if (cache.shortTermCacheExpiry) {
    const expiryTime = new Date(cache.shortTermCacheExpiry).getTime();
    if (Date.now() <= expiryTime) {
      // 还要检查是否有实际数据
      const hasData = Object.values(cache.platforms).some(p => p?.topics && p.topics.length > 0);
      return hasData;
    }
  }
  
  return false;
}

/**
 * 检查是否正在刷新
 */
export function isCurrentlyRefreshing(): boolean {
  const cache = loadCache();
  return cache?.isRefreshing || false;
}

/**
 * 设置刷新状态
 */
export function setRefreshingStatus(status: boolean): void {
  const cache = loadCache();
  if (cache) {
    cache.isRefreshing = status;
    saveCache(cache);
  }
}

// 获取缓存的更新时间
export function getLastUpdateTime(): string | null {
  const cache = loadCache();
  return cache?.lastUpdate || null;
}

/**
 * 获取缓存的剩余有效时间（秒）
 */
export function getCacheRemainingTime(): number {
  const cache = loadCache();
  if (!cache?.shortTermCacheExpiry) return 0;
  
  const expiryTime = new Date(cache.shortTermCacheExpiry).getTime();
  const remaining = Math.max(0, expiryTime - Date.now());
  return Math.ceil(remaining / 1000);
}

// 获取当前周信息
export function getCurrentWeekInfo(): { week: number; year: number; dateRange: string } {
  const now = new Date();
  const { week, year } = getWeekNumber(now);
  
  // 计算本周起止日期
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
  const dateRange = `${formatDate(monday)} - ${formatDate(sunday)}`;
  
  return { week, year, dateRange };
}

// 获取所有缓存的热点
export function getAllCachedTopics(): HotTopic[] {
  const cache = loadCache();
  if (!cache) return [];
  
  const allTopics: HotTopic[] = [];
  for (const platformData of Object.values(cache.platforms)) {
    if (platformData?.topics) {
      allTopics.push(...platformData.topics);
    }
  }
  
  // 按热度排序
  return allTopics.sort((a, b) => b.heat - a.heat);
}

// 获取指定平台的热点
export function getCachedTopicsByPlatform(platform: string): HotTopic[] {
  const cache = loadCache();
  if (!cache || !cache.platforms[platform as keyof typeof cache.platforms]) {
    return [];
  }
  
  return cache.platforms[platform as keyof typeof cache.platforms]?.topics || [];
}

// 更新平台热点
export function updatePlatformTopics(
  platform: 'douyin' | 'xiaohongshu' | 'shipinhao' | 'kuaishou',
  topics: HotTopic[]
): void {
  const cache = loadCache() || createEmptyCache();
  const { week, year } = getWeekNumber(new Date());
  
  const platformNames = {
    douyin: '抖音',
    xiaohongshu: '小红书',
    shipinhao: '视频号',
    kuaishou: '快手',
  };
  
  cache.platforms[platform] = {
    platform,
    platformName: platformNames[platform],
    updateAt: new Date().toISOString(),
    topics,
  };
  
  cache.lastUpdate = new Date().toISOString();
  cache.weekNumber = week;
  cache.year = year;
  cache.shortTermCacheExpiry = new Date(Date.now() + SHORT_TERM_CACHE_DURATION).toISOString();
  cache.isRefreshing = false;
  
  saveCache(cache);
}

// 批量更新所有平台热点
export function updateAllPlatformTopics(
  topicsByPlatform: {
    douyin: HotTopic[];
    xiaohongshu: HotTopic[];
    shipinhao: HotTopic[];
    kuaishou: HotTopic[];
  }
): void {
  const { week, year } = getWeekNumber(new Date());
  
  const cache: HotTopicsCache = {
    lastUpdate: new Date().toISOString(),
    weekNumber: week,
    year: year,
    shortTermCacheExpiry: new Date(Date.now() + SHORT_TERM_CACHE_DURATION).toISOString(),
    isRefreshing: false,
    platforms: {
      douyin: {
        platform: 'douyin',
        platformName: '抖音',
        updateAt: new Date().toISOString(),
        topics: topicsByPlatform.douyin,
      },
      xiaohongshu: {
        platform: 'xiaohongshu',
        platformName: '小红书',
        updateAt: new Date().toISOString(),
        topics: topicsByPlatform.xiaohongshu,
      },
      shipinhao: {
        platform: 'shipinhao',
        platformName: '视频号',
        updateAt: new Date().toISOString(),
        topics: topicsByPlatform.shipinhao,
      },
      kuaishou: {
        platform: 'kuaishou',
        platformName: '快手',
        updateAt: new Date().toISOString(),
        topics: topicsByPlatform.kuaishou,
      },
    },
  };
  
  saveCache(cache);
}

// 创建空缓存
function createEmptyCache(): HotTopicsCache {
  const { week, year } = getWeekNumber(new Date());
  return {
    lastUpdate: new Date().toISOString(),
    weekNumber: week,
    year: year,
    shortTermCacheExpiry: new Date(Date.now() + SHORT_TERM_CACHE_DURATION).toISOString(),
    isRefreshing: false,
    platforms: {
      douyin: null,
      xiaohongshu: null,
      shipinhao: null,
      kuaishou: null,
    },
  };
}

// 分类映射
export const CATEGORIES = [
  '美食', '旅行', '美妆', '科技', '娱乐', 
  '教育', '生活', '情感', '运动', '音乐',
  '游戏', '汽车', '财经', '健康', '时尚'
] as const;

// 根据关键词判断分类
export function inferCategory(title: string): string {
  const categoryKeywords: Record<string, string[]> = {
    '美食': ['美食', '食谱', '做饭', '料理', '餐厅', '美食推荐', '吃货', '烹饪'],
    '旅行': ['旅行', '旅游', '景点', '打卡', '攻略', '酒店', '自驾', '度假'],
    '美妆': ['美妆', '化妆', '护肤', '口红', '粉底', '美容', '彩妆'],
    '科技': ['科技', '数码', '手机', '电脑', 'AI', '人工智能', '芯片', '新品'],
    '娱乐': ['娱乐', '明星', '综艺', '电影', '电视剧', '演员', '歌手', '八卦'],
    '教育': ['教育', '学习', '考试', '考研', '高考', '英语', '培训', '知识'],
    '生活': ['生活', '日常', '居家', '装修', '收纳', '清洁', '省钱', '生活技巧'],
    '情感': ['情感', '恋爱', '婚姻', '情侣', '分手', '相亲', '恋爱技巧'],
    '运动': ['运动', '健身', '减肥', '瑜伽', '跑步', '篮球', '足球'],
    '音乐': ['音乐', '歌曲', '歌手', '演唱会', 'MV', '翻唱'],
    '游戏': ['游戏', '手游', '电竞', '主播', '王者荣耀', '原神'],
    '汽车': ['汽车', '车', '新能源', '驾照', '汽车评测'],
    '财经': ['财经', '股票', '基金', '投资', '理财', '经济'],
    '健康': ['健康', '养生', '医疗', '医院', '保健', '心理健康'],
    '时尚': ['时尚', '穿搭', '衣服', '潮流', '服装', '时尚穿搭'],
  };
  
  const lowerTitle = title.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category;
    }
  }
  
  return '生活'; // 默认分类
}

// 根据排名计算热度值
export function calculateHeat(rank: number, totalTopics: number): number {
  // 排名越靠前，热度越高
  // 第一名热度 98，随排名递减
  const baseHeat = 98;
  const minHeat = 50;
  const decay = (baseHeat - minHeat) / Math.max(totalTopics, 20);
  return Math.max(minHeat, Math.round(baseHeat - (rank - 1) * decay));
}
