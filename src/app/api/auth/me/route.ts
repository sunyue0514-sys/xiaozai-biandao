import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getUserByIdSafe, checkPowerLimit } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[GET /api/auth/me] ========== 验证登录状态 ==========');
  
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;


    if (!token) {
      console.log('[GET /api/auth/me] 没有token');
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionValid = await hasSession(token);
    console.log('[GET /api/auth/me] Session验证结果:', sessionValid);

    if (!sessionValid) {
      console.log('[GET /api/auth/me] Session验证失败');
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    console.log('[GET /api/auth/me] 用户ID:', userId);
    
    if (!userId) {
      console.log('[GET /api/auth/me] 用户ID为空');
      return NextResponse.json(
        { success: false, error: '会话无效' },
        { status: 401 }
      );
    }

    const user = await getUserByIdSafe(userId);
    if (!user) {
      console.log('[GET /api/auth/me] 用户不存在');
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    console.log('[GET /api/auth/me] 验证成功, 用户:', user.username);

    // 检查算力是否可用
    const powerAvailable = await checkPowerLimit(userId);

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        powerAvailable,
      },
    });
  } catch (error) {
    console.error('[GET /api/auth/me] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
