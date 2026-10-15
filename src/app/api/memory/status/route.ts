import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { getMemoryStatus } from '@/lib/memory-system/memory-helper';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/memory/status
 * 获取用户记忆系统状态摘要
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    const status = await getMemoryStatus(String(userId));

    // 获取已标记的素材ID列表
    const client = getSupabaseClient();
    const { data: performances } = await client
      .from('content_performance')
      .select('material_id')
      .eq('uid', String(userId))
      .not('material_id', 'is', null);
    
    const markedMaterialIds = performances?.map((p: { material_id: number }) => p.material_id) || [];

    return NextResponse.json({ 
      success: true, 
      data: {
        ...status,
        markedMaterialIds,
      },
    });
  } catch (error) {
    console.error('获取记忆状态失败:', error);
    return NextResponse.json(
      { error: '获取记忆状态失败' },
      { status: 500 }
    );
  }
}
