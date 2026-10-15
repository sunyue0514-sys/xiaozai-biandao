import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasSession, getSessionUserInfo } from '@/lib/session';

// 删除视频（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const { id } = await params;
    
    // 验证登录状态
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({
        success: false,
        error: '未登录或登录已过期',
      }, { status: 401 });
    }

    // 验证管理员权限
    const userInfo = await getSessionUserInfo(token);
    if (userInfo?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: '无权限删除视频，仅管理员可操作',
      }, { status: 403 });
    }

    // 执行删除
    const client = getSupabaseClient();
    const { error } = await client
      .from('inspiration_videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('API operation event');
      return NextResponse.json({
        success: false,
        error: '删除失败',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '视频已删除',
    });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({
      success: false,
      error: '服务器错误',
    }, { status: 500 });
  }
}
