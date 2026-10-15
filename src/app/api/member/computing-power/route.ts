import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getUserById } from '@/lib/store';

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

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查是否是管理员或无限算力
    const isAdmin = ['admin', 'super_admin'].includes(user.role);
    const isUnlimited = isAdmin || user.powerQuota === -1 || user.credits === -1;

    if (isUnlimited) {
      // 管理员或无限算力用户
      return NextResponse.json({
        success: true,
        data: {
          balance: -1, // -1 表示无限
          remaining: -1,
          total: -1,
          used: user.usedPower,
          credits: user.credits ?? user.powerQuota,
          unlimited: true,
        },
      });
    }

    // 普通用户：优先使用 credits 字段
    const currentCredits = user.credits ?? user.powerQuota;
    const remainingFromQuota = Math.max(0, user.powerQuota - user.usedPower);
    const remaining = user.credits !== undefined ? currentCredits : remainingFromQuota;
    
    return NextResponse.json({
      success: true,
      data: {
        balance: remaining, // 用于前端显示
        remaining: remaining,
        total: user.powerQuota,
        used: user.usedPower,
        credits: currentCredits,
        unlimited: false,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '获取算力信息失败' },
      { status: 500 }
    );
  }
}
