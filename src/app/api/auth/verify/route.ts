import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getUserByIdSafe, checkPowerLimit } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '会话无效' },
        { status: 401 }
      );
    }

    const user = await getUserByIdSafe(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查算力是否可用
    const powerAvailable = await checkPowerLimit(userId);

    // 兼容旧的返回格式
    return NextResponse.json({
      success: true,
      user: {
        ...user,
        isAdmin: ['admin', 'super_admin'].includes(user.role),
        powerAvailable,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
