import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/store';
import { createNewSession } from '@/lib/session';
import * as dbStore from '@/lib/db-store';
import { verifyPassword, isHashedPassword } from '@/lib/password';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  isLoginLocked,
  recordLoginFailure,
  clearLoginFailure,
  createRateLimitResponse,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 解析User-Agent获取设备信息
function parseUserAgent(userAgent: string): { os: string; browser: string; device: string; deviceType: string } {
  const ua = userAgent.toLowerCase();
  
  // 解析操作系统
  let os = 'Unknown';
  if (ua.includes('windows nt 10')) os = 'Windows 10/11';
  else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
  else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
  else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os x')) {
    const match = ua.match(/mac os x (\d+)[._](\\d+)/);
    if (match) os = `macOS ${match[1]}.${match[2]}`;
    else os = 'macOS';
  }
  else if (ua.includes('android')) {
    const match = ua.match(/android (\d+(\.\d+)?)/);
    if (match) os = `Android ${match[1]}`;
    else os = 'Android';
  }
  else if (ua.includes('iphone os') || ua.includes('ipad os')) {
    const match = ua.match(/(iphone|ipad) os (\d+)[._](\d+)/);
    if (match) os = `iOS ${match[2]}.${match[3]}`;
    else os = 'iOS';
  }
  else if (ua.includes('linux')) os = 'Linux';
  
  // 解析浏览器
  let browser = 'Unknown';
  if (ua.includes('edg/') || ua.includes('edge')) {
    const match = ua.match(/edg[e]?\/(\d+(\.\d+)?)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  }
  else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    const match = ua.match(/chrome\/(\d+(\.\d+)?)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  }
  else if (ua.includes('firefox/')) {
    const match = ua.match(/firefox\/(\d+(\.\d+)?)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  }
  else if (ua.includes('safari/') && !ua.includes('chrome')) {
    const match = ua.match(/version\/(\d+(\.\d+)?)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  }
  
  // 解析设备类型
  let deviceType = 'desktop';
  if (ua.includes('mobile') || ua.includes('iphone')) deviceType = 'mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet';
  
  const device = `${browser} / ${os}`;
  
  return { os, browser, device, deviceType };
}

// 从IP获取位置（简化版，实际应调用IP定位API）
async function getLocationFromIP(ip: string): Promise<string> {
  // 简化处理，实际可调用第三方IP定位API
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return '本地网络';
  }
  return '未知位置';
}

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
    
    // 检查IP级别速率限制
    const { allowed: ipAllowed, resetTime } = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
    if (!ipAllowed) {
      return createRateLimitResponse(resetTime, '登录尝试过于频繁，请稍后再试');
    }
    
    const { username: rawUsername, password: rawPassword } = await request.json();
    
    // 对用户名和密码进行 trim 处理，避免前后空格导致验证失败
    const username = typeof rawUsername === 'string' ? rawUsername.trim() : rawUsername;
    const password = rawPassword;

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 检查登录锁定状态
    const { locked, lockoutUntil } = isLoginLocked(username, ip);
    if (locked && lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `账号已被锁定，请 ${remainingSeconds} 秒后重试`,
          lockoutUntil,
        },
        { status: 429 }
      );
    }

    // 查找用户
    let user;
    try {
      user = await getUserByUsername(username);
    } catch (dbError) {
      // 数据库连接失败，返回更明确的错误信息
      console.error('[登录] 数据库查询异常:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: '系统繁忙，请稍后重试',
          code: 'DATABASE_ERROR',
        },
        { status: 503 }
      );
    }
    
    if (!user) {
      // 记录登录失败
      const { remaining } = recordLoginFailure(username, ip);
      return NextResponse.json(
        {
          success: false,
          error: '用户名或密码错误',
          remaining: Math.max(0, remaining),
        },
        { status: 401 }
      );
    }

    // 验证密码
    // 支持加密密码和明文密码（兼容旧数据）
    let passwordValid = false;
    let verifyMethod = '';
    
    // 记录密码格式信息（用于诊断）
    const passwordInDb = user.password;
    const isHashed = isHashedPassword(passwordInDb);
    
    if (isHashed) {
      // 新版加密密码验证
      passwordValid = await verifyPassword(password, user.password);
      verifyMethod = 'bcrypt';
    } else {
      // 旧版明文密码验证（兼容）
      passwordValid = user.password === password;
      verifyMethod = 'plaintext';
    }
    
    // 详细诊断日志（生产环境保留，用于排查登录问题）
    console.log(`[登录验证] 用户: "${username}" | 方法: ${verifyMethod} | 结果: ${passwordValid} | IP: ${ip}`);
    
    if (!passwordValid) {
      console.warn(`[登录失败] 用户: "${username}", 密码验证失败, 方法: ${verifyMethod}, IP: ${ip}`);
      // 记录登录失败
      const { remaining, locked: nowLocked } = recordLoginFailure(username, ip);
      
      // 记录登录失败日志
      try {
        const userAgent = request.headers.get('user-agent') || '';
        const { os, browser, device } = parseUserAgent(userAgent);
        const location = await getLocationFromIP(ip);
        
        await dbStore.createLoginRecord({
          uid: String(user.id),
          device,
          os,
          browser,
          location,
          ip,
          status: 'failed',
        });
      } catch (e) {
        console.warn('记录登录失败信息失败:', e instanceof Error ? e.message : e);
      }
      
      const errorMsg = nowLocked 
        ? '登录失败次数过多，账号已被锁定5分钟' 
        : `用户名或密码错误，剩余尝试次数: ${remaining}`;
      
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          remaining: Math.max(0, remaining),
          locked: nowLocked,
        },
        { status: 401 }
      );
    }

    // 登录成功，清除失败记录
    clearLoginFailure(username, ip);

    // 注意：会员过期不应阻止登录，只影响会员功能权限
    // 移除之前的会员过期阻止登录逻辑，允许所有用户登录

    // 创建session
    const token = await createNewSession(user.id);
    
    // 更新最后登录时间（不阻塞登录流程）
    try {
      await dbStore.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    } catch (e) {
      console.warn('更新最后登录时间失败（不影响登录）:', e instanceof Error ? e.message : e);
    }
    
    // 获取设备信息
    const userAgent = request.headers.get('user-agent') || '';
    const { os, browser, device, deviceType } = parseUserAgent(userAgent);
    const location = await getLocationFromIP(ip);
    
    // 记录登录成功（不阻塞登录流程）
    try {
      await dbStore.createLoginRecord({
        uid: String(user.id),
        device,
        os,
        browser,
        location,
        ip,
        status: 'success',
      });
    } catch (e) {
      console.warn('记录登录信息失败（不影响登录）:', e instanceof Error ? e.message : e);
    }
    
    // 记录或更新设备（不阻塞登录流程）
    try {
      const deviceId = `device_${String(user.id)}_${Date.now()}`;
      
      // 检查是否已有相同设备
      const existingDevices = await dbStore.getDevicesByUid(String(user.id));
      const sameDevice = existingDevices.find(d => 
        d.browser === browser && d.os === os
      );
      
      if (sameDevice) {
        // 更新设备的最后活跃时间和当前状态
        await dbStore.updateDeviceCurrent(sameDevice.id, String(user.id));
      } else {
        // 创建新设备记录
        await dbStore.createDevice({
          id: deviceId,
          uid: String(user.id),
          name: device,
          type: deviceType,
          os,
          browser,
          location,
          ip,
        });
      }
    } catch (e) {
      console.warn('记录设备信息失败（不影响登录）:', e instanceof Error ? e.message : e);
    }

    // 返回用户信息（不含密码）
    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });

    // 设置cookie
    response.cookies.set('sessionToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24小时
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
