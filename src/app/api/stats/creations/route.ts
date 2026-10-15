import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import * as dbStore from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取用户创作统计数据
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

    const uid = String(user.id);

    // 从数据库获取用户的素材
    const userMaterials = await dbStore.getMaterialsByUid(uid);

    // 获取当前月份的开始和结束时间
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 本月创作的素材数量
    const monthlyMaterials = userMaterials.filter((m) => {
      const createdAt = new Date(m.createdAt);
      return createdAt >= monthStart && createdAt <= monthEnd;
    });

    // 计算总创作数量（素材）
    const totalCreations = monthlyMaterials.length;

    // 上月创作数量（用于计算环比）
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const lastMonthMaterials = userMaterials.filter((m) => {
      const createdAt = new Date(m.createdAt);
      return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
    });
    
    const lastMonthTotal = lastMonthMaterials.length;
    
    // 计算环比增长率
    let growthRate = 0;
    if (lastMonthTotal > 0) {
      growthRate = Math.round(((totalCreations - lastMonthTotal) / lastMonthTotal) * 100);
    }

    return NextResponse.json({
      success: true,
      data: {
        monthlyCreations: totalCreations,
        lastMonthCreations: lastMonthTotal,
        growthRate,
        materialsCount: userMaterials.length,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
