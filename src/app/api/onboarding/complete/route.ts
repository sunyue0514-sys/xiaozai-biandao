import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionUserId, hasSession, getSessionUserInfo } from '@/lib/session';

// 邀请奖励配置

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
 * POST /api/onboarding/complete
 * 标记任务完成
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { taskKey } = body;

    if (typeof taskKey !== 'string' || !['extract_script', 'generate_rewrite', 'save_material'].includes(taskKey)) {
      return NextResponse.json({ error: '缺少任务标识' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查任务是否存在
    const { data: task, error: taskError } = await supabase
      .from('onboarding_tasks')
      .select('*')
      .eq('task_key', taskKey)
      .eq('is_active', true)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 检查是否已完成
    const { data: existingProgress } = await supabase
      .from('user_onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('task_key', taskKey)
      .single();

    if (existingProgress?.status === 'completed' || existingProgress?.status === 'claimed') {
      return NextResponse.json({
        success: true,
        message: '任务已完成',
        data: existingProgress,
        rewardsAvailable: false,
      });
    }

    // 更新或创建进度记录
    const now = new Date().toISOString();
    const progressData = {
      user_id: userId,
      task_key: taskKey,
      status: 'completed',
      completed_at: now,
    };

    const { error: upsertError } = await supabase
      .from('user_onboarding_progress')
      .upsert(progressData, { onConflict: 'user_id,task_key' });

    if (upsertError) {
      console.error('更新任务进度失败:', upsertError);
      return NextResponse.json({ error: '更新进度失败' }, { status: 500 });
    }

    // 更新用户生成统计（如果是相关任务）
    if (taskKey === 'generate_rewrite') {
      await supabase
        .from('user_generation_stats')
        .upsert({
          user_id: userId,
          total_rewrites: 1,
          updated_at: now,
        }, { onConflict: 'user_id' });
    }

    // 如果是最后一个任务（save_material），检查并发放邀请奖励
    return NextResponse.json({
      success: true,
      message: '任务完成',
      data: {
        taskKey,
        status: 'completed',
        completedAt: now,
        rewardsAvailable: false,
        reward: null,
        inviteReward: null,
        rewardMessage: '任务进度已保存；积分与邀请奖励发放未启用',
      },
    });
  } catch (error) {
    console.error('标记任务完成失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

/**
 * 处理邀请奖励
 * 当被邀请人完成新手任务后，给双方发放奖励
 */
