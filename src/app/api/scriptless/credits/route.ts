import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getUserPowerInfo, CREDIT_RULES } from '@/lib/scriptless-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取用户算力余额
export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

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
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const powerInfo = await getUserPowerInfo(userId);

    return NextResponse.json({
      success: true,
      data: {
        // remaining 为 -1 表示无限
        balance: powerInfo?.remaining ?? 0,
        powerQuota: powerInfo?.powerQuota ?? 0,
        usedPower: powerInfo?.usedPower ?? 0,
        isAdmin: powerInfo?.role === 'admin',
        rules: CREDIT_RULES,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '获取算力失败' },
      { status: 500 }
    );
  }
}
