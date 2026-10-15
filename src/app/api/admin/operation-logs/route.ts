import { NextRequest, NextResponse } from 'next/server';
import { getOperationLogs, getOperationLogStats } from '@/lib/store';
import { getSessionUserId, hasSession } from '@/lib/session';
import { getUserById } from '@/lib/store';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/security';
import { isSuperAdmin } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 检查是否是最高管理员
async function checkSuperAdmin(request: NextRequest): Promise<{ 
  isSuperAdmin: boolean; 
  userId: number | null;
  user: Awaited<ReturnType<typeof getUserById>> | null;
}> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.replace('Bearer ', '');
  const tokenFromCookie = request.cookies.get('sessionToken')?.value;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token || !(await hasSession(token))) {
    return { isSuperAdmin: false, userId: null, user: null };
  }

  const userId = await getSessionUserId(token);
  if (!userId) {
    return { isSuperAdmin: false, userId: null, user: null };
  }

  const user = await getUserById(userId);
  if (!user) {
    return { isSuperAdmin: false, userId, user: null };
  }
  
  const isSuper = (user.role === 'super_admin');

  return { isSuperAdmin: isSuper, userId, user };
}

// 获取操作日志列表
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    const { allowed, resetTime } = checkRateLimit(`admin:${ip}`, RATE_LIMITS.admin);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '请求过于频繁');
    }
    
    const { isSuperAdmin } = await checkSuperAdmin(request);
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问，仅最高管理员可查看操作日志' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const operatorId = searchParams.get('operatorId') ? parseInt(searchParams.get('operatorId')!, 10) : undefined;
    const actionType = searchParams.get('actionType') || undefined;
    const targetType = searchParams.get('targetType') || undefined;
    const targetId = searchParams.get('targetId') ? parseInt(searchParams.get('targetId')!, 10) : undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const keyword = searchParams.get('keyword') || undefined;

    // 如果请求统计数据
    if (searchParams.get('stats') === 'true') {
      const stats = await getOperationLogStats();
      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    const { logs, total } = await getOperationLogs({
      page,
      pageSize,
      operatorId,
      actionType,
      targetType,
      targetId,
      startDate,
      endDate,
      keyword,
    });

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Get operation logs error:', error);
    return NextResponse.json(
      { success: false, error: '获取操作日志失败' },
      { status: 500 }
    );
  }
}
