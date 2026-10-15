import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionUserId, hasSession, getSessionUserInfo } from '@/lib/session';

/**
 * 从请求中获取用户ID
 */
async function getUserIdFromRequest(request: Request): Promise<number | null> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const tokenFromCookie = request.headers.get('cookie')?.match(/sessionToken=([^;]+)/)?.[1];
  const token = tokenFromHeader || tokenFromCookie;
  
  if (!token) return null;
  
  const isValid = await hasSession(token);
  if (!isValid) return null;
  
  return (await getSessionUserInfo(token))?.id ?? null;
}

/**
 * GET /api/generation-stats
 * 获取用户创作统计
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // 获取或创建用户统计记录
    const { data: initialStats, error } = await supabase
      .from('user_generation_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    let stats = initialStats;
    if (error && error.code === 'PGRST116') {
      // 记录不存在，创建新记录
      const { data: newStats, error: createError } = await supabase
        .from('user_generation_stats')
        .insert({
          user_id: userId,
          total_scripts: 0,
          total_rewrites: 0,
          total_materials: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('创建统计记录失败:', createError);
        return NextResponse.json({ error: '创建统计失败' }, { status: 500 });
      }
      stats = newStats;
    } else if (error) {
      console.error('获取统计失败:', error);
      return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
    }

    // 计算总数
    const totalCount = (stats?.total_scripts || 0) + (stats?.total_rewrites || 0) + (stats?.total_materials || 0);

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        totalCount,
      },
    });
  } catch (error) {
    console.error('获取创作统计失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * POST /api/generation-stats
 * 更新用户创作统计
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body; // 'script', 'rewrite', 'material'
    if (!['script', 'rewrite', 'material'].includes(type)) return NextResponse.json({ error: 'Invalid generation type' }, { status: 400 });

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // 获取当前统计
    const { data: currentStats } = await supabase
      .from('user_generation_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const updateData: any = {
      user_id: userId,
      updated_at: now,
      last_generated_at: now,
    };

    // 根据类型更新对应字段
    switch (type) {
      case 'script':
        updateData.total_scripts = (currentStats?.total_scripts || 0) + 1;
        break;
      case 'rewrite':
        updateData.total_rewrites = (currentStats?.total_rewrites || 0) + 1;
        break;
      case 'material':
        updateData.total_materials = (currentStats?.total_materials || 0) + 1;
        break;
      default:
        updateData.total_scripts = (currentStats?.total_scripts || 0) + 1;
    }

    // 更新或创建记录
    const { error } = await supabase
      .from('user_generation_stats')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) {
      console.error('更新统计失败:', error);
      return NextResponse.json({ error: '更新统计失败' }, { status: 500 });
    }

    // 计算新的总数
    const newTotal = 
      (updateData.total_scripts || currentStats?.total_scripts || 0) +
      (updateData.total_rewrites || currentStats?.total_rewrites || 0) +
      (updateData.total_materials || currentStats?.total_materials || 0);

    return NextResponse.json({
      success: true,
      data: {
        totalCount: newTotal,
      },
    });
  } catch (error) {
    console.error('更新创作统计失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
