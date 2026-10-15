import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import * as dbStore from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取登录记录列表
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

    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户信息不存在' },
        { status: 401 }
      );
    }

    // 获取limit参数，默认10条
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '10');
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });

    // 从数据库获取登录记录
    const records = await dbStore.getLoginRecordsByUid(String(user.id), limit);

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('获取登录记录失败:', error);
    return NextResponse.json(
      { success: false, error: '获取登录记录失败' },
      { status: 500 }
    );
  }
}
