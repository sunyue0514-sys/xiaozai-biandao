import { guardAIRequest, sessionToken, isVideoShareUrl } from '@/app/api/ai/_security';
import { getSessionUserId, getSessionUserInfo } from '@/lib/session';
/**
 * 灵感共创 - 后台处理接口
 * 
 * 由 upload 接口异步触发，执行：
 * 1. 视频解析（获取点赞、标题等）
 * 2. 验证审核条件
 * 3. 文案提取
 * 4. 更新最终状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { parseShortVideo, detectPlatform } from '@/lib/video-parser';
import { extractScript, cleanScriptContent } from '@/lib/script-extractor';

// 处理状态
type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// 最小点赞数要求
const MIN_LIKES = 1000;

/**
 * 后台处理视频
 * 
 * 请求体：
 * - videoId: 视频记录ID
 * - url: 视频链接
 * - userId: 用户ID
 * - isAdmin: 是否管理员
 * - token: 用户认证token（用于 LLM 纠错等需要认证的 API）
 */
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true});
  if (securityResponse) return securityResponse;

  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { videoId } = body;
    const token = sessionToken(request)!;
    const callerId = await getSessionUserId(token);
    const isAdmin = (await getSessionUserInfo(token))?.role === 'admin';
    const client = getSupabaseClient();
    const { data: video, error: videoError } = await client.from('inspiration_videos')
      .select('id, uploaded_by, video_url, processing_status').eq('id', videoId).single();
    if (videoError || !video || (!isAdmin && Number(video.uploaded_by) !== callerId)) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }
    if (video.processing_status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Video is not pending processing' }, { status: 409 });
    }
    const url = video.video_url;
    const userId = video.uploaded_by;
    if (!isVideoShareUrl(url)) return NextResponse.json({ success: false, error: 'Invalid video URL' }, { status: 400 });
    
    if (!videoId || !url || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必要参数' 
      }, { status: 400 });
    }
    
    console.log('API operation event');
    
    
    // 更新状态为处理中
    const { data: claimed, error: claimError } = await client
      .from('inspiration_videos')
      .update({
        processing_status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', videoId).eq('processing_status', 'pending').select('id').single();
    if (claimError || !claimed) return NextResponse.json({ success: false, error: 'Video processing already started' }, { status: 409 });
    
    // 获取平台信息
    const platform = detectPlatform(url);
    
    let videoLikes = 0;
    let videoTitle = '';
    let videoAuthor = '';
    let videoCover = '';
    let videoComments = 0;
    let videoShares = 0;
    let videoViews = 0;
    let videoCollects = 0;
    let videoAuthorAvatar = '';
    let videoUrl = '';
    let parsedVideoId = '';  // 用于保存解析出的视频ID
    
    // 步骤1：解析视频
    console.log('API operation event');
    const parseResult = await parseShortVideo(url);
    
    if (parseResult.success && parseResult.data) {
      videoLikes = parseResult.data.likes || 0;
      videoTitle = parseResult.data.title || '';
      videoAuthor = parseResult.data.author || '';
      videoCover = parseResult.data.cover || '';
      videoComments = parseResult.data.comments || 0;
      videoShares = parseResult.data.shares || 0;
      videoViews = parseResult.data.views || 0;
      videoCollects = parseResult.data.collects || 0;
      videoAuthorAvatar = parseResult.data.authorAvatar || '';
      videoUrl = parseResult.data.videoUrl || '';
      parsedVideoId = parseResult.data.videoId || '';  // 保存视频ID
      
      console.log('API operation event');
      
      // ========== 检查视频是否重复 ==========
      // 方法1：通过视频ID检测（最准确）
      // 方法2：通过标题检测（兜底方案）
      let isDuplicate = false;
      let existingVideoId = null;
      
      if (parsedVideoId) {
        // 尝试通过视频ID检测（需要数据库有 video_id 字段）
        const { data: existingById } = await client
          .from('inspiration_videos')
          .select('id, title')
          .eq('platform', 'douyin')
          .eq('video_id', parsedVideoId)
          .neq('id', videoId)
          .limit(1)
          .single();
        
        if (existingById) {
          isDuplicate = true;
          existingVideoId = existingById.id;
          console.log('API operation event');
        }
      }
      
      // 方法2：通过标题检测重复（标题相同且作者相同）
      if (!isDuplicate && videoTitle && videoAuthor) {
        const { data: existingByTitle } = await client
          .from('inspiration_videos')
          .select('id, title, author')
          .eq('platform', 'douyin')
          .eq('title', videoTitle)
          .eq('author', videoAuthor)
          .neq('id', videoId)
          .limit(1)
          .single();
        
        if (existingByTitle) {
          isDuplicate = true;
          existingVideoId = existingByTitle.id;
          console.log('API operation event');
        }
      }
      
      if (isDuplicate && existingVideoId) {
        console.log('API operation event');
        
        // 删除当前记录
        await client
          .from('inspiration_videos')
          .delete()
          .eq('id', videoId);
        
        // 标记上传记录为失败
        await client
          .from('inspiration_uploads')
          .update({
            status: 'rejected',
            reject_reason: `该视频已存在`,
          })
          .eq('video_url', url);
        
        return NextResponse.json({ 
          success: false, 
          error: `该视频已存在，无需重复上传`,
          existingVideoId: existingVideoId,
        });
      }
      
      // 注意：如果解析成功但没有 videoUrl，不使用原始链接作为 fallback
      // 因为原始链接是分享链接，SDK 无法处理（会返回 403）
      if (!videoUrl) {
        console.log('API operation event');
      }
    } else {
      console.log('API operation event');
      
      // 管理员可以继续，普通用户失败
      if (!isAdmin) {
        await updateFailedStatus(client, videoId, parseResult.error || '视频解析失败');
        return NextResponse.json({ 
          success: false, 
          error: parseResult.error || '视频解析失败' 
        });
      }
      
      // 管理员上传时，记录解析失败原因作为标题的一部分
      videoTitle = `管理员上传 (${parseResult.error || '解析失败'})`;
      console.log('API operation event');
    }
    
    // 步骤2：验证点赞数（非管理员）
    if (!isAdmin && videoLikes < MIN_LIKES) {
      console.log('API operation event');
      await updateFailedStatus(client, videoId, `点赞数不足 ${MIN_LIKES}（当前: ${videoLikes}）`);
      return NextResponse.json({ 
        success: false, 
        error: `审核未通过：点赞数需达到 ${MIN_LIKES} 以上` 
      });
    }
    
    // 步骤3：提取文案
    let scriptContent = videoTitle;
    
    // 只有当 videoUrl 存在时才进行文案提取（不使用原始分享链接）
    if (videoUrl) {
      console.log('API operation event');
      
      // 关键修复：不要添加用户的 session token
      // SDK 有自己的认证机制（通过环境变量 COZE_LOOP_API_TOKEN 等）
      // customHeaders 只用于传递追踪信息，不包含认证信息
      const customHeaders: Record<string, string> = {};
      
      // 如果有 forwardHeaders（追踪信息），添加进去
      
      // 注意：不要添加 Authorization 头！
      // 用户的 session token 格式（token_xxx）不是 SDK 需要的格式
      // SDK 会自动使用环境变量中的认证信息
      
      console.log('API operation event');
      
      const extractResult = await extractScript(videoUrl, customHeaders);
      
      console.log('API operation event');
      
      if (extractResult.success && extractResult.scriptContent) {
        // 检测 Vision API 返回的错误格式
        // 错误格式示例: File: [assets/image.png]``URL: [https://code.coze.cn/api/sandbox/coze_coding/file/proxy?...]``Image: [...]
        const errorPatterns = [
          /^File:\s*\[/i,
          /^URL:\s*\[/i,
          /^Image:\s*\[/i,                     // 新增：检测 Image: [ 开头
          /File:\s*\[/i,                       // 任何位置出现 File: [
          /URL:\s*\[/i,                        // 任何位置出现 URL: [
          /Image:\s*\[/i,                      // 任何位置出现 Image: [
          /coze_coding\/file\/proxy/i,         // 包含 coze_coding/file/proxy
          /assets\/image/i,                    // 包含 assets/image
          /^```[\s\S]*(File|URL|Image):/i,    // Markdown代码块中的错误
        ];
        const isErrorFormat = errorPatterns.some(pattern => pattern.test(extractResult.scriptContent));
        
        if (isErrorFormat) {
          console.log('API operation event');
          scriptContent = videoTitle || '';
        } else {
          scriptContent = cleanScriptContent(extractResult.scriptContent);
          console.log('API operation event');
          
          // 如果有 LLM 纠错信息，详细输出
          if (extractResult.metadata?.llmCorrection) {
            const correction = extractResult.metadata.llmCorrection;
            console.log('API operation event');
          }
        }
      } else {
        console.log('API operation event');
        // 继续使用标题作为文案
      }
    } else {
      console.log('API operation event');
    }
    
    // 步骤4：更新最终状态
    console.log('API operation event');
    
    const { error: updateError } = await client
      .from('inspiration_videos')
      .update({
        // 视频信息
        title: videoTitle || '待补充标题',
        author: videoAuthor || '未知作者',
        author_avatar: videoAuthorAvatar,
        likes: videoLikes,
        views: videoViews,
        comments: videoComments,
        shares: videoShares,
        collects: videoCollects,
        cover: videoCover,
        description: videoTitle || '',
        script_content: scriptContent,
        // 视频ID（用于构造更稳定的视频链接）
        video_id: parsedVideoId || null,
        // 状态
        status: 'approved',
        approved_at: new Date().toISOString(),
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
      })
      .eq('id', videoId);
    
    if (updateError) {
      console.error('API operation event');
      await updateFailedStatus(client, videoId, '数据库更新失败');
      return NextResponse.json({ 
        success: false, 
        error: '数据库更新失败' 
      });
    }
    
    // 更新上传记录状态
    await client
      .from('inspiration_uploads')
      .update({ status: 'approved' })
      .eq('video_url', url)
      .eq('user_id', userId);
    
    console.log('API operation event');
    
    return NextResponse.json({
      success: true,
      message: '处理完成',
      videoId,
      processingTime: Date.now() - startTime,
    });
    
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? 'Request failed' : '处理失败' 
    }, { status: 500 });
  }
}

/**
 * 更新失败状态
 */
async function updateFailedStatus(
  client: ReturnType<typeof getSupabaseClient>,
  videoId: string,
  error: string
) {
  await client
    .from('inspiration_videos')
    .update({
      status: 'rejected',
      processing_status: 'failed',
      processing_error: error,
      processing_completed_at: new Date().toISOString(),
    })
    .eq('id', videoId);
  
  // 更新上传记录
  await client
    .from('inspiration_uploads')
    .update({
      status: 'rejected',
      reject_reason: error,
    })
    .eq('video_url', videoId)
    .limit(1);
}
