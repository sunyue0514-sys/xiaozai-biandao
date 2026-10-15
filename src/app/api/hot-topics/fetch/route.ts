import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { LLMClient } from 'coze-coding-dev-sdk';
import { 
  loadCache, 
  needsUpdate, 
  isShortTermCacheValid,
  isCurrentlyRefreshing,
  setRefreshingStatus,
  getAllCachedTopics,
  getCurrentWeekInfo,
  inferCategory,
  calculateHeat,
  updateAllPlatformTopics,
  HotTopic
} from '@/lib/hot-topics-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 平台搜索关键词配置 - 精简版（每个平台只保留1个核心搜索）
const PLATFORM_SEARCH_CONFIG = {
  douyin: {
    name: '抖音',
    searchQuery: '抖音热榜 本周热门话题 热搜榜',
  },
  xiaohongshu: {
    name: '小红书',
    searchQuery: '小红书热门话题 本周热搜 爆款笔记',
  },
  shipinhao: {
    name: '视频号',
    searchQuery: '微信视频号热门 本周爆款 热门内容',
  },
  kuaishou: {
    name: '快手',
    searchQuery: '快手热榜 本周热门 热搜话题榜',
  }
};

// 使用 AI 解析搜索结果并提取热点
async function extractHotTopicsWithAI(
  searchResults: string,
  platform: string,
  platformName: string
): Promise<HotTopic[]> {
  const config = new Config();
  const client = new LLMClient(config);

  const prompt = `你是一个专业的短视频热点分析专家。请根据以下搜索结果，提取${platformName}平台本周的热点话题。

搜索结果：
${searchResults}

请提取10-15个真实的热点话题，返回JSON数组格式，每个话题包含以下字段：
{
  "title": "话题标题（简洁明了，不超过20字）",
  "category": "分类（美食/旅行/美妆/科技/娱乐/教育/生活/情感/运动/音乐/游戏/汽车/财经/健康/时尚）",
  "heat": 50-99之间的热度值,
  "trend": "up/down/stable",
  "views": "预估播放量（如：2.3亿）",
  "relatedTopics": ["相关话题1", "相关话题2"]
}

注意：
1. 只提取真实存在的热点，不要编造
2. 如果搜索结果信息不足，可以基于常见的平台热点类型推断
3. 标题要具体，不要过于笼统
4. 热度值要根据话题流行程度合理分配

只返回JSON数组，不要其他说明文字。`;

  try {
    const stream = client.stream([{ role: 'user', content: prompt }], {
      model: 'deepseek-v3-2-251201',
      temperature: 0.3,
    });

    let response = '';
    for await (const chunk of stream) {
      if (chunk.content) {
        response += chunk.content.toString();
      }
    }

    // 提取JSON
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const topics = JSON.parse(jsonMatch[0]);
      return topics.map((topic: Record<string, unknown>, index: number) => ({
        id: `${platform}-${Date.now()}-${index}`,
        title: topic.title || '未知话题',
        heat: topic.heat || calculateHeat(index + 1, 15),
        trend: topic.trend || 'stable',
        category: topic.category || inferCategory(topic.title as string || ''),
        platform,
        views: topic.views,
        relatedTopics: topic.relatedTopics || [],
      }));
    }
  } catch (error) {
    console.error('API operation event');
  }

  return [];
}

// 生成默认热点（当搜索失败时）
function generateDefaultTopics(platform: string, platformName: string): HotTopic[] {
  const defaultTopicsByPlatform: Record<string, Partial<HotTopic>[]> = {
    douyin: [
      { title: '春日穿搭分享', category: '时尚', heat: 95, trend: 'up' },
      { title: '美食探店打卡', category: '美食', heat: 92, trend: 'up' },
      { title: '健身减脂打卡', category: '运动', heat: 88, trend: 'stable' },
      { title: '短剧推荐解说', category: '娱乐', heat: 85, trend: 'up' },
      { title: '旅行vlog拍摄', category: '旅行', heat: 82, trend: 'stable' },
      { title: 'AI工具使用教程', category: '科技', heat: 80, trend: 'up' },
      { title: '家居收纳技巧', category: '生活', heat: 78, trend: 'stable' },
      { title: '情感故事分享', category: '情感', heat: 75, trend: 'stable' },
      { title: '搞笑段子合集', category: '娱乐', heat: 72, trend: 'up' },
      { title: '育儿经验分享', category: '生活', heat: 70, trend: 'stable' },
    ],
    xiaohongshu: [
      { title: '春季护肤攻略', category: '美妆', heat: 96, trend: 'up' },
      { title: '平价好物分享', category: '生活', heat: 93, trend: 'up' },
      { title: '显瘦穿搭技巧', category: '时尚', heat: 90, trend: 'stable' },
      { title: '减脂餐食谱', category: '美食', heat: 87, trend: 'up' },
      { title: '考研备考经验', category: '教育', heat: 84, trend: 'stable' },
      { title: '租房改造分享', category: '生活', heat: 81, trend: 'up' },
      { title: '旅行攻略大全', category: '旅行', heat: 78, trend: 'stable' },
      { title: '副业赚钱经验', category: '财经', heat: 75, trend: 'up' },
      { title: '恋爱技巧分享', category: '情感', heat: 72, trend: 'stable' },
      { title: '母婴好物推荐', category: '生活', heat: 70, trend: 'stable' },
    ],
    shipinhao: [
      { title: '正能量故事', category: '生活', heat: 94, trend: 'up' },
      { title: '健康养生知识', category: '健康', heat: 91, trend: 'stable' },
      { title: '家庭美食制作', category: '美食', heat: 88, trend: 'up' },
      { title: '亲子互动游戏', category: '生活', heat: 85, trend: 'stable' },
      { title: '中老年健身操', category: '运动', heat: 82, trend: 'up' },
      { title: '传统文化分享', category: '教育', heat: 79, trend: 'stable' },
      { title: '三农知识科普', category: '生活', heat: 76, trend: 'up' },
      { title: '手工制作教程', category: '生活', heat: 73, trend: 'stable' },
      { title: '生活小妙招', category: '生活', heat: 70, trend: 'stable' },
      { title: '广场舞教学', category: '运动', heat: 68, trend: 'stable' },
    ],
    kuaishou: [
      { title: '三农生活记录', category: '生活', heat: 95, trend: 'up' },
      { title: '美食制作教程', category: '美食', heat: 92, trend: 'stable' },
      { title: '搞笑段子表演', category: '娱乐', heat: 89, trend: 'up' },
      { title: '手工技艺展示', category: '生活', heat: 86, trend: 'stable' },
      { title: '才艺表演展示', category: '娱乐', heat: 83, trend: 'up' },
      { title: '乡村风景记录', category: '旅行', heat: 80, trend: 'stable' },
      { title: '家庭日常分享', category: '生活', heat: 77, trend: 'stable' },
      { title: '民间故事讲述', category: '娱乐', heat: 74, trend: 'up' },
      { title: '宠物日常记录', category: '生活', heat: 71, trend: 'stable' },
      { title: '正能量励志', category: '情感', heat: 68, trend: 'up' },
    ],
  };

  const topics = defaultTopicsByPlatform[platform] || defaultTopicsByPlatform.douyin;
  
  return topics.map((topic, index) => ({
    id: `${platform}-${Date.now()}-${index}`,
    title: topic.title || '热点话题',
    heat: topic.heat || calculateHeat(index + 1, 10),
    trend: topic.trend || 'stable',
    category: topic.category || '生活',
    platform: platform as 'douyin' | 'xiaohongshu' | 'shipinhao' | 'kuaishou',
    views: `${(Math.random() * 5 + 0.5).toFixed(1)}亿`,
    relatedTopics: [],
  }));
}

// 获取单个平台的热点 - 优化版（只执行1个搜索）
async function fetchPlatformTopics(
  platform: 'douyin' | 'xiaohongshu' | 'shipinhao' | 'kuaishou',
  customHeaders: Record<string, string>
): Promise<HotTopic[]> {
  const config = new Config();
  const searchClient = new SearchClient(config, customHeaders);
  
  const platformConfig = PLATFORM_SEARCH_CONFIG[platform];
  let searchResults = '';
  
  // 只执行1个核心搜索
  try {
    const response = await searchClient.advancedSearch(platformConfig.searchQuery, {
      searchType: 'web',
      count: 10,
      timeRange: '1w',
      needSummary: true,
    });
    
    if (response.web_items) {
      searchResults = response.web_items.map(item => 
        `标题: ${item.title}\n摘要: ${item.snippet}\n`
      ).join('\n');
    }
    
    if (response.summary) {
      searchResults += `\n总结: ${response.summary}\n`;
    }
  } catch (error) {
    console.error('API operation event');
  }
  
  // 如果有搜索结果，使用 AI 解析
  if (searchResults.length > 100) {
    const topics = await extractHotTopicsWithAI(searchResults, platform, platformConfig.name);
    if (topics.length > 0) {
      return topics;
    }
  }
  
  // 如果搜索或解析失败，返回默认热点
  console.log('API operation event');
  return generateDefaultTopics(platform, platformConfig.name);
}

// 后台刷新所有热点数据
async function refreshAllTopicsInBackground(customHeaders: Record<string, string>): Promise<void> {
  // 检查是否已经在刷新
  if (isCurrentlyRefreshing()) {
    console.log('API operation event');
    return;
  }
  
  // 标记正在刷新
  setRefreshingStatus(true);
  
  console.log('API operation event');
  const startTime = Date.now();
  
  try {
    // 并行获取所有平台热点
    const [douyinTopics, xiaohongshuTopics, shipinhaoTopics, kuaishouTopics] = await Promise.all([
      fetchPlatformTopics('douyin', customHeaders),
      fetchPlatformTopics('xiaohongshu', customHeaders),
      fetchPlatformTopics('shipinhao', customHeaders),
      fetchPlatformTopics('kuaishou', customHeaders),
    ]);
    
    // 批量更新缓存
    updateAllPlatformTopics({
      douyin: douyinTopics,
      xiaohongshu: xiaohongshuTopics,
      shipinhao: shipinhaoTopics,
      kuaishou: kuaishouTopics,
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('API operation event');
  } catch (error) {
    console.error('API operation event');
    setRefreshingStatus(false);
  }
}

/**
 * GET /api/hot-topics/fetch
 * 
 * 优化策略：
 * 1. 如果短期缓存有效（1小时内），直接返回缓存
 * 2. 如果缓存过期但还有数据，先返回缓存，同时触发后台刷新
 * 3. 如果完全没有缓存，同步获取并返回
 */
export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as 'douyin' | 'xiaohongshu' | 'shipinhao' | 'kuaishou' | 'all';
    const force = searchParams.get('force') === 'true';
    
    // 1. 检查短期缓存是否有效
    if (!force && isShortTermCacheValid()) {
      const cache = loadCache();
      const cached = platform === 'all' 
        ? getAllCachedTopics() 
        : cache?.platforms[platform as keyof typeof cache.platforms]?.topics;
      if (cached && cached.length > 0) {
        console.log('API operation event');
        return NextResponse.json({
          success: true,
          data: {
            topics: cached,
            cached: true,
            cacheType: 'short-term', // 短期缓存
            ...getCurrentWeekInfo(),
          },
        });
      }
    }
    
    // 2. 检查是否有旧缓存
    const oldCache = loadCache();
    const hasOldCache = oldCache && Object.values(oldCache.platforms).some(p => p?.topics && p.topics.length > 0);
    
    if (hasOldCache) {
      // 有旧缓存，先返回旧数据，同时触发后台刷新
      const oldTopics = platform === 'all' ? getAllCachedTopics() : oldCache.platforms[platform as keyof typeof oldCache.platforms]?.topics;
      
      // 触发后台刷新（不等待完成）
      const customHeaders = safeForwardHeaders(request.headers);
      refreshAllTopicsInBackground(customHeaders).catch(() => console.error('Hot topic refresh failed'));
      
      console.log('API operation event');
      return NextResponse.json({
        success: true,
        data: {
          topics: oldTopics || [],
          cached: true,
          cacheType: 'expired', // 已过期缓存
          isRefreshing: true, // 告知前端正在刷新
          ...getCurrentWeekInfo(),
        },
      });
    }
    
    // 3. 完全没有缓存，同步获取
    console.log('API operation event');
    const customHeaders = safeForwardHeaders(request.headers);
    
    const [douyinTopics, xiaohongshuTopics, shipinhaoTopics, kuaishouTopics] = await Promise.all([
      fetchPlatformTopics('douyin', customHeaders),
      fetchPlatformTopics('xiaohongshu', customHeaders),
      fetchPlatformTopics('shipinhao', customHeaders),
      fetchPlatformTopics('kuaishou', customHeaders),
    ]);
    
    // 保存到缓存
    updateAllPlatformTopics({
      douyin: douyinTopics,
      xiaohongshu: xiaohongshuTopics,
      shipinhao: shipinhaoTopics,
      kuaishou: kuaishouTopics,
    });
    
    const allTopics = [...douyinTopics, ...xiaohongshuTopics, ...shipinhaoTopics, ...kuaishouTopics]
      .sort((a, b) => b.heat - a.heat);
    
    return NextResponse.json({
      success: true,
      data: {
        topics: platform === 'all' ? allTopics : (platform === 'douyin' ? douyinTopics : platform === 'xiaohongshu' ? xiaohongshuTopics : platform === 'shipinhao' ? shipinhaoTopics : kuaishouTopics),
        cached: false,
        cacheType: 'fresh',
        ...getCurrentWeekInfo(),
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '获取热点数据失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hot-topics/fetch
 * 强制刷新热点（用户手动点击刷新）
 */
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const customHeaders = safeForwardHeaders(request.headers);
    
    // 检查是否已经在刷新
    if (isCurrentlyRefreshing()) {
      const cached = getAllCachedTopics();
      return NextResponse.json({
        success: true,
        data: {
          topics: cached,
          cached: true,
          isRefreshing: true,
          ...getCurrentWeekInfo(),
        },
        message: '正在刷新中，请稍后...',
      });
    }
    
    console.log('API operation event');
    const startTime = Date.now();
    
    // 并行获取所有平台热点
    const [douyinTopics, xiaohongshuTopics, shipinhaoTopics, kuaishouTopics] = await Promise.all([
      fetchPlatformTopics('douyin', customHeaders),
      fetchPlatformTopics('xiaohongshu', customHeaders),
      fetchPlatformTopics('shipinhao', customHeaders),
      fetchPlatformTopics('kuaishou', customHeaders),
    ]);
    
    // 批量更新缓存
    updateAllPlatformTopics({
      douyin: douyinTopics,
      xiaohongshu: xiaohongshuTopics,
      shipinhao: shipinhaoTopics,
      kuaishou: kuaishouTopics,
    });
    
    const allTopics = [...douyinTopics, ...xiaohongshuTopics, ...shipinhaoTopics, ...kuaishouTopics]
      .sort((a, b) => b.heat - a.heat);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('API operation event');
    
    return NextResponse.json({
      success: true,
      data: {
        topics: allTopics,
        cached: false,
        cacheType: 'fresh',
        refreshDuration: parseFloat(duration),
        ...getCurrentWeekInfo(),
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '刷新热点数据失败' },
      { status: 500 }
    );
  }
}
