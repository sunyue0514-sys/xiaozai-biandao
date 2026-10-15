import { guardAIRequest } from '@/app/api/ai/_security';
/**
 * 清理重复视频接口
 * 用于删除重复的视频记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserInfo } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 超级管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const userInfo = await getSessionUserInfo(token);
    if (!userInfo || !SUPER_ADMIN_UIDS.includes(String(userInfo.id))) {
      return NextResponse.json({ success: false, error: '仅超级管理员可访问' }, { status: 403 });
    }

    const client = getSupabaseClient();

    // 获取所有视频
    const { data: videos, error } = await client
      .from('inspiration_videos')
      .select('id, title, author, platform, video_url, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: '获取视频失败' }, { status: 500 });
    }

    // 按标题+作者+平台分组，找出重复的
    const groups: Record<string, typeof videos> = {};
    for (const v of videos || []) {
      const key = `${v.platform}|${v.title}|${v.author}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(v);
    }

    // 找出重复的组
    const duplicates: Array<{
      key: string;
      videos: typeof videos;
      toDelete: number[];
    }> = [];

    for (const [key, group] of Object.entries(groups)) {
      if (group.length > 1) {
        // 保留最早创建的，删除其他的
        const toDelete = group.slice(1).map(v => v.id);
        duplicates.push({
          key,
          videos: group,
          toDelete,
        });
      }
    }

    if (duplicates.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有发现重复视频',
        deleted: 0,
      });
    }

    // 删除重复的视频
    let deletedCount = 0;
    const deletedIds: number[] = [];

    for (const dup of duplicates) {
      for (const id of dup.toDelete) {
        const { error: deleteError } = await client
          .from('inspiration_videos')
          .delete()
          .eq('id', id);

        if (!deleteError) {
          deletedCount++;
          deletedIds.push(id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `已删除 ${deletedCount} 个重复视频`,
      deleted: deletedCount,
      deletedIds,
      details: duplicates.map(d => ({
        title: d.videos[0]?.title,
        kept: d.videos[0]?.id,
        deleted: d.toDelete,
      })),
    });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: error instanceof Error ? 'Request failed' : '清理失败' },
      { status: 500 }
    );
  }
}
