import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { getToken } from '@/lib/api';

// 内存存储任务（临时方案，实际应使用数据库）
const tasksStore = new Map<string, any>();

// 获取全局任务存储
function getGlobalTasksStore() {
  if (!(global as any).automationTasks) {
    (global as any).automationTasks = new Map<string, any>();
  }
  return (global as any).automationTasks;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    // 获取该用户的所有任务
    const store = getGlobalTasksStore();
    const userTasks = Array.from(store.values())
      .filter((task: any) => task.userId === userId.toString())
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: userTasks,
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { success: false, error: '获取任务列表失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: '缺少任务ID' },
        { status: 400 }
      );
    }

    // 删除任务
    const store = getGlobalTasksStore();
    const task = store.get(taskId);
    
    if (!task || task.userId !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: '任务不存在或无权删除' },
        { status: 404 }
      );
    }

    if (task.status === 'running') {
      return NextResponse.json({ success: false, error: 'Running tasks cannot be deleted' }, { status: 409 });
    }
    store.delete(taskId);

    return NextResponse.json({
      success: true,
      message: '任务删除成功',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { success: false, error: '删除任务失败' },
      { status: 500 }
    );
  }
}
