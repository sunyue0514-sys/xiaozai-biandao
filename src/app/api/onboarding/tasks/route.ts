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
 * GET /api/onboarding/tasks
 * 获取新手任务列表和用户进度
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // 获取所有任务配置
    const { data: tasks, error: tasksError } = await supabase
      .from('onboarding_tasks')
      .select('*')
      .eq('is_active', true)
      .order('step_order', { ascending: true });

    if (tasksError) {
      console.error('获取任务配置失败:', tasksError);
      return NextResponse.json({ error: '获取任务失败' }, { status: 500 });
    }

    // 获取用户进度
    const { data: progress, error: progressError } = await supabase
      .from('user_onboarding_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) {
      console.error('获取用户进度失败:', progressError);
    }

    // 合并任务和进度
    const progressMap = new Map(
      (progress || []).map(p => [p.task_key, p])
    );

    const tasksWithProgress = (tasks || []).map(task => ({
      ...task,
      status: progressMap.get(task.task_key)?.status || 'pending',
      completed_at: progressMap.get(task.task_key)?.completed_at || null,
      claimed_at: progressMap.get(task.task_key)?.claimed_at || null,
    }));

    // 计算总体进度
    const completedCount = tasksWithProgress.filter(t => t.status === 'completed' || t.status === 'claimed').length;
    const totalCount = tasksWithProgress.length;
    const allCompleted = completedCount === totalCount;

    return NextResponse.json({
      success: true,
      rewardsAvailable: false,
      data: {
        tasks: tasksWithProgress,
        progress: {
          completed: completedCount,
          total: totalCount,
          allCompleted,
        },
      },
    });
  } catch (error) {
    console.error('获取新手任务失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
