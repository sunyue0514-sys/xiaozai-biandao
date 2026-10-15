import { guardAIRequest, safeForwardHeaders } from '@/app/api/ai/_security';
/**
 * 灵感共创 - 上传视频接口（异步版）
 * 
 * 流程：
 * 1. 快速验证（登录、冷却期、平台格式）
 * 2. 创建 pending 记录
 * 3. 异步触发后台处理
 * 4. 立即返回，让用户可以离开
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { detectPlatform } from '@/lib/video-parser';
import { HeaderUtils } from 'coze-coding-dev-sdk';

// 上传视频审核接口
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":true,"video":true});
  if (securityResponse) return securityResponse;

  try {
    // 从请求头或cookie获取token
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    console.log('API operation event');

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: '请先登录后再上传' 
      }, { status: 401 });
    }

    // 验证会话
    const sessionValid = await hasSession(token);
    if (!sessionValid) {
      return NextResponse.json({ 
        success: false, 
        error: '会话已过期，请重新登录' 
      }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: '会话无效' 
      }, { status: 401 });
    }

    // 获取用户信息
    const userInfo = await getSessionUserInfo(token);
    if (!userInfo) {
      return NextResponse.json({ 
        success: false, 
        error: '用户不存在' 
      }, { status: 401 });
    }

    const user = {
      id: userId,
      role: userInfo.role,
      username: userInfo.username,
    };

    console.log('API operation event');

    const body = await request.json();
    const { url, category, industry } = body;

    if (!url) {
      return NextResponse.json({ 
        success: false, 
        error: '请输入视频链接' 
      });
    }

    if (!category || !['content', 'presentation'].includes(category)) {
      return NextResponse.json({ 
        success: false, 
        error: '请选择视频类型' 
      });
    }

    if (!industry) {
      return NextResponse.json({ 
        success: false, 
        error: '请选择行业归类' 
      });
    }

    const client = getSupabaseClient();

    // 检查是否已上传过该视频
    const { data: existingVideo } = await client
      .from('inspiration_videos')
      .select('id, processing_status')
      .eq('video_url', url)
      .eq('uploaded_by', user.id)
      .single();

    if (existingVideo) {
      return NextResponse.json({ 
        success: false, 
        error: '您已上传过该视频，请勿重复提交',
        videoId: existingVideo.id,
        processingStatus: existingVideo.processing_status,
      });
    }

    // 管理员豁免审核限制
    const isAdmin = user.role === 'admin';

    // 非管理员：检查72小时内是否已分享过视频
    if (!isAdmin) {
      const COOLDOWN_HOURS = 72;
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
      const cooldownThreshold = new Date(Date.now() - cooldownMs);

      const { data: recentUpload } = await client
        .from('inspiration_uploads')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('created_at', cooldownThreshold.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentUpload) {
        const lastUploadTime = new Date(recentUpload.created_at);
        const nextAvailableTime = new Date(lastUploadTime.getTime() + cooldownMs);
        const remainingMs = nextAvailableTime.getTime() - Date.now();
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

        return NextResponse.json({ 
          success: false, 
          error: `每72小时只能分享一条视频，您还需等待 ${remainingHours} 小时`,
          cooldown: {
            lastUploadAt: recentUpload.created_at,
            nextAvailableAt: nextAvailableTime.toISOString(),
            remainingHours: remainingHours,
          }
        });
      }
    }

    // 验证平台
    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json({ 
        success: false, 
        error: '不支持该平台，请上传抖音、快手、小红书、B站或微博的视频链接' 
      });
    }

    // ========== 快速验证通过，创建记录 ==========
    
    // 创建视频记录（pending 状态）
    const { data: newVideo, error: videoError } = await client
      .from('inspiration_videos')
      .insert({
        video_url: url,
        platform,
        category,
        industry,
        title: '处理中...',
        author: '处理中...',
        script_content: '',
        likes: 0,
        views: 0,
        comments: 0,
        shares: 0,
        collects: 0,
        uploaded_by: user.id,
        status: 'pending',
        processing_status: 'pending',
      })
      .select()
      .single();

    if (videoError || !newVideo) {
      console.error('API operation event');
      
      // 如果是主键冲突，提示用户重试
      if ('Request failed'?.includes('duplicate key') || 'Request failed'?.includes('unique constraint')) {
        return NextResponse.json({ 
          success: false, 
          error: '系统繁忙，请稍后重试',
          retryable: true,
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: '上传失败，请稍后重试' 
      });
    }

    // 创建上传记录
    await client.from('inspiration_uploads').insert({
      user_id: user.id,
      video_url: url,
      platform,
      category,
      title: '处理中...',
      status: 'pending',
    });

    console.log('API operation event');

    // ========== 异步触发后台处理 ==========
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `http://localhost:5000`;
    const processUrl = `${domain}/api/inspiration-cocreate/process`;
    
    // 提取原始请求的所有必要头信息，用于SDK调用
    const forwardHeaders = safeForwardHeaders(request.headers);
    const headerKeys = Object.keys(forwardHeaders);
    console.log('API operation event');
    
    // 将转发头序列化为JSON字符串，通过请求体传递
    const forwardHeadersJson = JSON.stringify(forwardHeaders);
    
    console.log('API operation event');
    
    // 异步调用，不等待结果（传递完整的认证信息）
    fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        // 确保 Authorization 头存在
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        videoId: newVideo.id,
        url,
        
        
        
        // 传递原始请求的转发头，供SDK调用使用
        
      }),
    }).then(response => {
      console.log('API operation event');
    }).catch(error => {
      console.error('API operation event');
    });

    // ========== 延长用户权限 ==========
    const EXTENDED_HOURS = 72;
    const now = new Date();
    
    const { data: permission } = await client
      .from('inspiration_permissions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let newExpiresAt: Date;

    if (permission) {
      const currentExpires = new Date(permission.expires_at);
      const baseTime = currentExpires > now ? currentExpires : now;
      newExpiresAt = new Date(baseTime.getTime() + EXTENDED_HOURS * 60 * 60 * 1000);

      await client
        .from('inspiration_permissions')
        .update({
          expires_at: newExpiresAt.toISOString(),
          total_extended_hours: (permission.total_extended_hours || 0) + EXTENDED_HOURS,
          upload_count: (permission.upload_count || 0) + 1,
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id);
    } else {
      newExpiresAt = new Date(now.getTime() + (24 + EXTENDED_HOURS) * 60 * 60 * 1000);
      
      await client
        .from('inspiration_permissions')
        .insert({
          user_id: user.id,
          expires_at: newExpiresAt.toISOString(),
          total_extended_hours: EXTENDED_HOURS,
          upload_count: 1,
        });
    }

    // ========== 立即返回 ==========
    return NextResponse.json({
      success: true,
      message: '已提交，后台正在处理中',
      videoId: newVideo.id,
      processingStatus: 'pending',
      permission: {
        expiresAt: newExpiresAt.toISOString(),
        extendedHours: EXTENDED_HOURS,
      },
      // 提示用户可以离开
      tip: '视频解析和文案提取需要1-3分钟，您可以离开此页面，处理完成后会自动更新',
    });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误，请稍后重试' 
    }, { status: 500 });
  }
}
