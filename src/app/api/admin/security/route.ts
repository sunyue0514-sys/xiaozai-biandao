import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/store';
import { hasSession, getSessionUserId } from '@/lib/session';
import {
  getSecurityStats,
  getBlacklistedIps,
  blacklistIp,
  unblacklistIp,
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 获取安全状态（仅管理员）
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 速率限制
    const { allowed, resetTime } = checkRateLimit(`admin:${ip}`, RATE_LIMITS.admin);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '请求过于频繁');
    }
    
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录' },
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
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      );
    }

    // 获取安全统计信息
    const stats = getSecurityStats();
    const blacklistedIps = getBlacklistedIps();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        blacklistedIps,
        rateLimits: {
          general: RATE_LIMITS.general,
          auth: RATE_LIMITS.auth,
          ai: RATE_LIMITS.ai,
          admin: RATE_LIMITS.admin,
          sensitive: RATE_LIMITS.sensitive,
          script: RATE_LIMITS.script,
        },
      },
    });
  } catch (error) {
    console.error('Get security stats error:', error);
    return NextResponse.json(
      { success: false, error: '获取安全状态失败' },
      { status: 500 }
    );
  }
}

/**
 * 管理IP黑名单（仅管理员）
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 敏感操作速率限制
    const { allowed, resetTime } = checkRateLimit(`sensitive:${ip}`, RATE_LIMITS.sensitive);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '操作过于频繁');
    }
    
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录' },
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, targetIp } = body;

    if (!action || !targetIp) {
      return NextResponse.json(
        { success: false, error: '参数不完整' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'blacklist':
        blacklistIp(targetIp);
        return NextResponse.json({
          success: true,
          message: `IP ${targetIp} 已加入黑名单`,
        });
        
      case 'unblacklist':
        unblacklistIp(targetIp);
        return NextResponse.json({
          success: true,
          message: `IP ${targetIp} 已从黑名单移除`,
        });
        
      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security action error:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
