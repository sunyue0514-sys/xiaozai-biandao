import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserInfo } from '@/lib/session';

/** Execution is paused until durable task CAS and atomic billing are verified.
 * This handler does not debit credits, mutate task state, or call third parties. */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || request.cookies.get('sessionToken')?.value;
    if (!token || !(await hasSession(token))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await getSessionUserInfo(token);
    if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { taskId } = await request.json();
    if (typeof taskId !== 'string' || !taskId || taskId.length > 100) return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    const store = (global as typeof global & { automationTasks?: Map<string, { userId: string; status: string }> }).automationTasks;
    const task = store?.get(taskId);
    if (!task || task.userId !== String(user.id)) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    if (task.status !== 'pending') return NextResponse.json({ error: 'Task is already running or finished' }, { status: 409 });
    return NextResponse.json({ success: false, executionAvailable: false, error: '执行未启用：数据库原子任务锁与扣费尚未验收，未扣积分', code: 'AUTOMATION_EXECUTION_UNAVAILABLE' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'Unable to inspect task' }, { status: 500 });
  }
}
