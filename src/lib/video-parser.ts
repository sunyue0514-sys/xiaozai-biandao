/**
 * 短视频解析服务
 * 支持：抖音、快手、小红书、B站、微博等
 * 
 * 主要使用 TikHub API（推荐，￥0.007/次）：
 * 1. 注册账号：https://user.tikhub.io/users/sign_up
 * 2. 获取 API Key：个人中心 -> API Keys
 * 3. 配置环境变量：TIKHUB_API_KEY=你的key
 * 
 * 备用方案：apis.uctb.cn（￥1/次）
 * 需要配置：VIDEO_PARSE_API_TOKEN 和 VIDEO_PARSE_API_CKEY
 */

// 默认超时时间（毫秒）- 增加以应对网络不稳定
const DEFAULT_TIMEOUT = 30000;

// TikHub API 专用超时时间
const TIKHUB_TIMEOUT = 30000;

// 短链接解析超时时间
const SHORT_LINK_TIMEOUT = 20000;

/**
 * 带超时的 fetch
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface VideoInfo {
  title: string;       // 视频标题
  author: string;      // 作者昵称
  authorId?: string;   // 作者ID
  authorAvatar?: string; // 作者头像
  likes: number;       // 点赞数
  comments?: number;   // 评论数
  shares?: number;     // 分享数
  collects?: number;   // 收藏数
  views?: number;      // 播放量
  cover?: string;      // 封面图
  videoUrl?: string;   // 无水印视频地址
  videoId?: string;    // 视频ID
  platform: string;    // 平台标识
}

export interface ParseResult {
  success: boolean;
  data?: VideoInfo;
  error?: string;
}

// 检测平台
export function detectPlatform(url: string): string | null {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('douyin.com') || urlLower.includes('iesdouyin.com') || urlLower.includes('v.douyin.com')) {
    return 'douyin';
  }
  if (urlLower.includes('kuaishou.com')) {
    return 'kuaishou';
  }
  if (urlLower.includes('xiaohongshu.com') || urlLower.includes('xhslink.com')) {
    return 'xiaohongshu';
  }
  if (urlLower.includes('bilibili.com') || urlLower.includes('b23.tv')) {
    return 'bilibili';
  }
  if (urlLower.includes('weibo.com') || urlLower.includes('weibo.cn') || urlLower.includes('t.cn')) {
    return 'weibo';
  }
  if (urlLower.includes('pipixia')) {
    return 'pipixia';
  }
  if (urlLower.includes('huoshan')) {
    return 'huoshan';
  }
  
  return null;
}

// 平台名称映射
const PLATFORM_NAMES: Record<string, string> = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  weibo: '微博',
  pipixia: '皮皮虾',
  huoshan: '火山',
};

/**
 * 从抖音短链接解析出视频ID和视频信息
 * 使用多种方法确保成功
 * 
 * @returns 视频ID和可能的错误信息，如果成功解析分享链接API则同时返回视频信息
 */
async function extractDouyinVideoId(url: string): Promise<{ videoId: string; videoInfo?: VideoInfo; error?: string } | null> {
  try {
    // 方法1：如果已经是视频详情页链接
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    if (videoIdMatch) {
      console.log('[视频解析] 从详情页链接提取视频ID:', videoIdMatch[1]);
      return { videoId: videoIdMatch[1] };
    }
    
    // 方法2：尝试使用 TikHub 的分享链接解析 API
    const apiKey = process.env.TIKHUB_API_KEY;
    if (apiKey) {
      try {
        console.log('[视频解析] 尝试使用 TikHub 解析分享链接...');
        const apiUrl = `https://api.tikhub.io/api/v1/douyin/web/fetch_one_video_by_share_url?share_url=${encodeURIComponent(url)}`;
        
        const response = await fetchWithTimeout(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
        }, TIKHUB_TIMEOUT);
        
        if (response.ok) {
          const result = await response.json();
          if (result.code === 200 && result.data?.aweme_detail) {
            const aweme = result.data.aweme_detail;
            const videoId = aweme.aweme_id;
            console.log('[视频解析] TikHub 分享链接解析成功，视频ID:', videoId);
            
            // 直接从分享链接解析中提取视频信息（包括 videoUrl）
            const stats = aweme.statistics || {};
            const author = aweme.author || {};
            const video = aweme.video || {};
            
            // 获取视频URL（多种fallback）
            let videoUrl = '';
            if (video.play_addr?.url_list?.length > 0) {
              videoUrl = video.play_addr.url_list[0];
              console.log('[视频解析] 从分享链接解析获取到 play_addr');
            } else if (video.download_addr?.url_list?.length > 0) {
              videoUrl = video.download_addr.url_list[0];
              console.log('[视频解析] 从分享链接解析获取到 download_addr');
            }
            
            console.log('[视频解析] 分享链接解析获取的 videoUrl:', videoUrl ? videoUrl.substring(0, 100) : '空');
            
            const videoInfo: VideoInfo = {
              videoId: videoId,
              title: aweme.desc || '',
              author: author.nickname || '',
              authorId: author.unique_id || author.uid || '',
              authorAvatar: author.avatar_thumb?.url_list?.[0] || '',
              likes: stats.digg_count || 0,
              comments: stats.comment_count || 0,
              shares: stats.share_count || 0,
              collects: stats.collect_count || 0,
              views: stats.play_count || 0,
              cover: video.cover?.url_list?.[0] || '',
              videoUrl: videoUrl,
              platform: 'douyin',
            };
            
            return { videoId, videoInfo };
          }
        }
      } catch (e) {
        console.log('[视频解析] TikHub 分享链接解析失败，尝试备用方法');
      }
    }
    
    // 方法3：使用 GET 请求跟踪重定向（比 HEAD 更可靠）
    console.log('[视频解析] 尝试通过 GET 请求跟踪重定向...');
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    }, SHORT_LINK_TIMEOUT);
    
    const finalUrl = response.url || url;
    console.log('[视频解析] 重定向后URL:', finalUrl.substring(0, 100));
    
    // 检查是否重定向到首页（说明短链接已过期或无效）
    if (finalUrl === 'https://www.douyin.com/' || finalUrl === 'https://www.douyin.com') {
      console.log('[视频解析] 短链接已过期或无效，重定向到了首页');
      return { videoId: '', error: '短链接已过期或无效，请使用视频详情页链接' };
    }
    
    const match = finalUrl.match(/\/video\/(\d+)/) || finalUrl.match(/\/share\/video\/(\d+)/);
    if (match) {
      console.log('[视频解析] 从重定向URL提取视频ID:', match[1]);
      return { videoId: match[1] };
    }
    
    // 方法4：尝试从HTML内容中提取
    const html = await response.text();
    const htmlMatch = html.match(/\/video\/(\d+)/) || html.match(/aweme_id["\s:=]+(\d+)/);
    if (htmlMatch) {
      console.log('[视频解析] 从HTML内容提取视频ID:', htmlMatch[1]);
      return { videoId: htmlMatch[1] };
    }
    
    console.log('[视频解析] 所有方法都无法提取视频ID');
    return { videoId: '', error: '解析链接失败，请稍后重试' };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      console.error('[视频解析] 提取视频ID超时');
      return { videoId: '', error: '解析链接超时，请稍后重试' };
    } else {
      console.error('[视频解析] 提取视频ID失败:', error);
      return { videoId: '', error: `解析链接失败，请稍后重试` };
    }
  }
}

/**
 * 使用 TikHub API 解析抖音视频
 * 文档：https://docs.tikhub.io
 */
async function parseWithTikHub(url: string, platform: string): Promise<ParseResult> {
  const apiKey = process.env.TIKHUB_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: '未配置 TikHub API Key',
    };
  }
  
  try {
    console.log('[TikHub] 开始解析视频:', url);
    
    if (platform === 'douyin') {
      // 提取视频ID和可能的视频信息
      const extractResult = await extractDouyinVideoId(url);
      if (!extractResult || !extractResult.videoId) {
        return {
          success: false,
          error: extractResult?.error || '短链接可能已过期或被限制，请尝试使用视频详情页链接（如 https://www.douyin.com/video/xxxxxx）',
        };
      }
      
      const { videoId, videoInfo: preFetchedVideoInfo } = extractResult;
      console.log('[TikHub] 视频ID:', videoId, '是否已获取视频信息:', !!preFetchedVideoInfo);
      
      // 如果分享链接解析已经获取了完整的视频信息（包括 videoUrl），直接返回
      if (preFetchedVideoInfo && preFetchedVideoInfo.videoUrl) {
        console.log('[TikHub] 使用分享链接解析获取的视频信息，包含 videoUrl');
        return {
          success: true,
          data: preFetchedVideoInfo,
        };
      }
      
      // 如果分享链接解析没有获取到 videoUrl，需要再调用 fetch_one_video API
      console.log('[TikHub] 分享链接解析未获取到 videoUrl，调用 fetch_one_video API...');
      
      // 调用 TikHub API
      const apiUrl = `https://api.tikhub.io/api/v1/douyin/web/fetch_one_video?aweme_id=${videoId}`;
      
      const response = await fetchWithTimeout(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      }, TIKHUB_TIMEOUT);
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[TikHub] API响应码:', result.code);
      
      if (result.code === 200 && result.data?.aweme_detail) {
        const aweme = result.data.aweme_detail;
        const stats = aweme.statistics || {};
        const author = aweme.author || {};
        const video = aweme.video || {};
        
        // 调试：输出完整的 video 对象结构
        console.log('[TikHub] video 对象结构:', {
          hasPlayAddr: !!video.play_addr,
          playAddrUrlListLength: video.play_addr?.url_list?.length || 0,
          playAddrUri: video.play_addr?.uri || '无',
          hasDownloadAddr: !!video.download_addr,
          downloadAddrUrlListLength: video.download_addr?.url_list?.length || 0,
          hasOriginUrl: !!aweme.origin_url,
          hasVideo: !!aweme.video,
        });
        
        // 如果 play_addr 为空，输出更多调试信息
        if (!video.play_addr?.url_list?.length) {
          console.log('[TikHub] play_addr 为空，尝试其他字段...');
          console.log('[TikHub] aweme 键:', Object.keys(aweme));
          console.log('[TikHub] video 键:', Object.keys(video));
        }
        
        // 尝试多个字段获取视频URL
        // 优先级：play_addr > download_addr > origin_url
        let videoUrl = '';
        
        // 1. 尝试 play_addr（播放地址）
        if (video.play_addr?.url_list?.length > 0) {
          videoUrl = video.play_addr.url_list[0];
          console.log('[TikHub] 使用 play_addr');
        }
        // 2. 尝试 download_addr（下载地址）
        else if (video.download_addr?.url_list?.length > 0) {
          videoUrl = video.download_addr.url_list[0];
          console.log('[TikHub] 使用 download_addr');
        }
        // 3. 尝试 origin_url（原始URL）
        else if (aweme.origin_url) {
          videoUrl = aweme.origin_url;
          console.log('[TikHub] 使用 origin_url');
        }
        // 4. 尝试动态构造视频URL
        else if (video.play_addr?.uri) {
          // 使用 uri 构造 URL
          const uri = video.play_addr.uri;
          videoUrl = `https://v26-web.douyinvod.com/${uri}/video/${uri}.mp4`;
          console.log('[TikHub] 使用构造的 URL:', videoUrl.substring(0, 50));
        }
        
        console.log('[TikHub] videoUrl 获取结果:', {
          hasPlayAddr: !!video.play_addr?.url_list?.length,
          hasDownloadAddr: !!video.download_addr?.url_list?.length,
          hasOriginUrl: !!aweme.origin_url,
          hasUri: !!video.play_addr?.uri,
          finalVideoUrl: videoUrl ? videoUrl.substring(0, 100) : '空',
        });
        
        const videoInfo: VideoInfo = {
          videoId: aweme.aweme_id || videoId,
          title: aweme.desc || '',
          author: author.nickname || '',
          authorId: author.unique_id || author.uid || '',
          authorAvatar: author.avatar_thumb?.url_list?.[0] || '',
          likes: stats.digg_count || 0,
          comments: stats.comment_count || 0,
          shares: stats.share_count || 0,
          collects: stats.collect_count || 0,
          views: stats.play_count || 0,
          cover: video.cover?.url_list?.[0] || '',
          videoUrl: videoUrl,
          platform: platform,
        };
        
        console.log('[TikHub] 解析成功:', {
          title: videoInfo.title.slice(0, 30),
          author: videoInfo.author,
          likes: videoInfo.likes,
        });
        
        return {
          success: true,
          data: videoInfo,
        };
      } else {
        return {
          success: false,
          error: result.message || result.message_zh || 'TikHub API 返回错误',
        };
      }
    }
    
    // 其他平台暂不支持
    return {
      success: false,
      error: `TikHub 暂不支持 ${PLATFORM_NAMES[platform] || platform} 平台`,
    };
    
  } catch (error) {
    console.error('[TikHub] 解析失败:', error);
    return {
      success: false,
      error: `TikHub 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 使用 apis.uctb.cn 解析视频（备用方案）
 */
async function parseWithUctb(url: string, platform: string): Promise<ParseResult> {
  const token = process.env.VIDEO_PARSE_API_TOKEN;
  const ckey = process.env.VIDEO_PARSE_API_CKEY;
  
  if (!token) {
    return {
      success: false,
      error: '未配置 apis.uctb.cn API Token',
    };
  }
  
  try {
    console.log('[uctb] 开始解析视频:', url);
    
    const params = new URLSearchParams({
      url: url,
      token: token,
    });
    
    if (ckey) {
      params.append('ckey', ckey);
    }
    
    const apiUrl = `https://apis.uctb.cn/api/videojx?${params.toString()}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (result.code === 200 || result.code === '200') {
      const data = result.data || result;
      
      const videoInfo: VideoInfo = {
        title: data.title || data.desc || data.text || data.video_title || '',
        author: data.author || data.nickname || data.name || data.author_name || '',
        authorAvatar: data.avatar || data.headimg || data.author_avatar || '',
        likes: parseInt(data.likes || data.like || data.digg_count || data.like_count || data.zan || 0),
        comments: parseInt(data.comments || data.comment || data.comment_count || 0),
        shares: parseInt(data.shares || data.share || data.share_count || 0),
        views: parseInt(data.views || data.view || data.play_count || data.view_count || 0),
        cover: data.cover || data.thumbnail || data.image || data.cover_url || '',
        videoUrl: data.video || data.video_url || data.playAddr || data.download || '',
        platform: platform,
      };
      
      return {
        success: true,
        data: videoInfo,
      };
    } else {
      const errorMap: Record<string, string> = {
        '216': '付费接口需要ckey',
        '217': 'ckey不存在',
        '218': 'ckey无权限调用此接口',
        '223': '积分不足，请充值',
        '224': '余额不足，请充值',
      };
      
      return {
        success: false,
        error: errorMap[String(result.code)] || result.msg || '解析失败',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `uctb 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 判断错误是否可重试
 * 网络错误、超时、限流等可以重试
 * 注意：大多数错误都应该重试，只有明确的业务错误（如链接无效）才不应重试
 */
function isRetryableError(error: string): boolean {
  const errorLower = error.toLowerCase();
  
  // 不可重试的错误（业务逻辑错误）
  const nonRetryableKeywords = [
    '不支持该平台',
    '短链接已过期',
    '链接无效',
    '未配置',
    '视频不存在',
    '视频已删除',
    '私密账号',
    '私密视频',
    '无法获取视频ID',
  ];
  
  // 如果包含不可重试的关键词，则不重试
  if (nonRetryableKeywords.some(keyword => errorLower.includes(keyword.toLowerCase()))) {
    return false;
  }
  
  // 默认情况下都重试（网络问题、API问题等）
  return true;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 解析短视频信息
 * 优先使用 TikHub，失败时回退到 apis.uctb.cn
 * 
 * 新增：自动重试机制
 * - TikHub 失败时自动重试（最多 3 次）
 * - 重试之间有指数退避（1s, 2s, 4s）
 * - 只有网络/超时/限流错误才重试
 */
export async function parseShortVideo(url: string, maxRetries: number = 3): Promise<ParseResult> {
  const platform = detectPlatform(url);
  
  if (!platform) {
    return {
      success: false,
      error: '不支持该平台，请上传抖音、快手、小红书、B站或微博的视频链接',
    };
  }
  
  console.log(`[视频解析] 开始解析 ${PLATFORM_NAMES[platform] || platform} 视频:`, url);
  
  // 优先使用 TikHub（便宜且稳定）
  const tikhubKey = process.env.TIKHUB_API_KEY;
  console.log('[视频解析] TIKHUB_API_KEY 状态:', tikhubKey ? `已配置(${tikhubKey.substring(0, 10)}...)` : '未配置');
  
  if (tikhubKey) {
    // 添加重试机制
    let lastError = '';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[视频解析] TikHub 尝试 ${attempt}/${maxRetries}...`);
      
      const result = await parseWithTikHub(url, platform);
      
      if (result.success) {
        console.log(`[视频解析] TikHub 第 ${attempt} 次尝试成功`);
        return result;
      }
      
      lastError = result.error || '未知错误';
      console.log(`[视频解析] TikHub 第 ${attempt} 次尝试失败:`, lastError);
      
      // 判断是否可重试
      if (!isRetryableError(lastError)) {
        console.log('[视频解析] 错误不可重试，跳出循环');
        break;
      }
      
      // 如果还有重试机会，等待后重试
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt - 1) * 1000; // 指数退避: 1s, 2s, 4s
        console.log(`[视频解析] 等待 ${waitTime}ms 后重试...`);
        await delay(waitTime);
      }
    }
    
    console.log('[视频解析] TikHub 所有重试都失败，尝试备用方案:', lastError);
  }
  
  // 备用方案：apis.uctb.cn
  const uctbToken = process.env.VIDEO_PARSE_API_TOKEN;
  console.log('[视频解析] VIDEO_PARSE_API_TOKEN 状态:', uctbToken ? `已配置(${uctbToken.substring(0, 10)}...)` : '未配置');
  
  if (uctbToken) {
    // 备用方案也添加重试
    let lastError = '';
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[视频解析] uctb 尝试 ${attempt}/${maxRetries}...`);
      
      const result = await parseWithUctb(url, platform);
      
      if (result.success) {
        console.log(`[视频解析] uctb 第 ${attempt} 次尝试成功`);
        return result;
      }
      
      lastError = result.error || '未知错误';
      console.log(`[视频解析] uctb 第 ${attempt} 次尝试失败:`, lastError);
      
      // 判断是否可重试
      if (!isRetryableError(lastError)) {
        console.log('[视频解析] uctb 错误不可重试，跳出循环');
        break;
      }
      
      // 如果还有重试机会，等待后重试
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        console.log(`[视频解析] 等待 ${waitTime}ms 后重试...`);
        await delay(waitTime);
      }
    }
    
    console.log('[视频解析] uctb 所有重试都失败:', lastError);
  }
  
  // 都没有配置
  if (!tikhubKey && !uctbToken) {
    return {
      success: false,
      error: '未配置视频解析API，请联系管理员配置 TIKHUB_API_KEY',
    };
  }
  
  return {
    success: false,
    error: '视频解析失败，请稍后重试（已自动重试多次）',
  };
}

/**
 * 批量解析短视频信息
 */
export async function parseShortVideos(urls: string[]): Promise<ParseResult[]> {
  return Promise.all(urls.map(url => parseShortVideo(url)));
}
