/**
 * 安全防护模块
 * 提供速率限制、IP黑名单、防暴力破解等安全功能
 */

import { NextRequest, NextResponse } from 'next/server';

// ============== 类型定义 ==============

interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 最大请求数
  message?: string;      // 自定义错误消息
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

// ============== 内存存储 ==============

// 速率限制存储
const rateLimitStore = new Map<string, RateLimitEntry>();

// 登录失败追踪
const loginAttemptStore = new Map<string, LoginAttempt>();

// IP黑名单
const ipBlacklist = new Set<string>();

// IP注册追踪（用于防止恶意注册）
interface RegistrationRecord {
  count: number;        // 注册次数
  timestamps: number[]; // 注册时间戳列表
}
const registrationStore = new Map<string, RegistrationRecord>();
const deviceRegistrationStore = new Map<string, RegistrationRecord>(); // 设备注册记录

// 注册限制配置
export const REGISTRATION_LIMITS = {
  windowMs: 168 * 60 * 60 * 1000,  // 168小时（7天）
  maxRegistrations: 3,              // 最多注册3个账号
  dailyWindowMs: 24 * 60 * 60 * 1000,  // 24小时（新增）
  dailyMaxRegistrations: 1,         // 24小时内最多1个账号（新增，防止批量刷号）
  deviceWindowMs: 72 * 60 * 60 * 1000,  // 72小时（新增）
  deviceMaxRegistrations: 5,        // 同一设备最多5个账号（新增）
};

// 定期清理过期数据（每5分钟）
setInterval(() => {
  const now = Date.now();
  
  // 清理速率限制
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  // 清理登录尝试记录
  for (const [key, entry] of loginAttemptStore.entries()) {
    if (entry.lockedUntil && now > entry.lockedUntil) {
      loginAttemptStore.delete(key);
    } else if (now - entry.firstAttempt > 30 * 60 * 1000) { // 30分钟未活动
      loginAttemptStore.delete(key);
    }
  }
  
  // 清理过期的注册记录
  const registrationCutoff = now - REGISTRATION_LIMITS.windowMs;
  for (const [ip, record] of registrationStore.entries()) {
    // 过滤掉过期的时间戳
    record.timestamps = record.timestamps.filter(ts => ts > registrationCutoff);
    record.count = record.timestamps.length;
    // 如果没有记录了，删除整个条目
    if (record.count === 0) {
      registrationStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// ============== 工具函数 ==============

/**
 * 获取客户端IP
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * 检查IP是否在黑名单中
 */
export function isIpBlacklisted(ip: string): boolean {
  return ipBlacklist.has(ip);
}

/**
 * 检查IP是否超过注册限制
 * @returns { allowed: boolean, count: number, remaining: number, resetTime: number | null }
 */
export function checkRegistrationLimit(ip: string): {
  allowed: boolean;
  count: number;
  remaining: number;
  resetTime: number | null;
} {
  const now = Date.now();
  const cutoff = now - REGISTRATION_LIMITS.windowMs;
  const record = registrationStore.get(ip);
  
  if (!record) {
    return {
      allowed: true,
      count: 0,
      remaining: REGISTRATION_LIMITS.maxRegistrations,
      resetTime: null,
    };
  }
  
  // 过滤掉过期的时间戳
  const validTimestamps = record.timestamps.filter(ts => ts > cutoff);
  const count = validTimestamps.length;
  
  if (count >= REGISTRATION_LIMITS.maxRegistrations) {
    // 找到最早的注册时间，计算重置时间
    const oldestValid = Math.min(...validTimestamps);
    const resetTime = oldestValid + REGISTRATION_LIMITS.windowMs;
    
    return {
      allowed: false,
      count,
      remaining: 0,
      resetTime,
    };
  }
  
  return {
    allowed: true,
    count,
    remaining: REGISTRATION_LIMITS.maxRegistrations - count,
    resetTime: null,
  };
}

/**
 * 记录一次注册成功
 */
export function recordRegistration(ip: string): void {
  const now = Date.now();
  const cutoff = now - REGISTRATION_LIMITS.windowMs;
  const record = registrationStore.get(ip);
  
  if (!record) {
    registrationStore.set(ip, {
      count: 1,
      timestamps: [now],
    });
    console.log(`[Security] 📝 IP ${ip} 首次注册记录`);
    return;
  }
  
  // 过滤掉过期的时间戳，然后添加新的
  record.timestamps = record.timestamps.filter(ts => ts > cutoff);
  record.timestamps.push(now);
  record.count = record.timestamps.length;
  
  console.log(`[Security] 📝 IP ${ip} 注册次数: ${record.count}/${REGISTRATION_LIMITS.maxRegistrations}`);
}

/**
 * 获取IP的注册记录
 */
export function getRegistrationRecord(ip: string): RegistrationRecord | undefined {
  return registrationStore.get(ip);
}

/**
 * 检查IP每日注册限制（24小时内最多1个）
 */
export function checkDailyRegistrationLimit(ip: string): {
  allowed: boolean;
  count: number;
  remaining: number;
  resetTime: number | null;
} {
  const now = Date.now();
  const dailyCutoff = now - REGISTRATION_LIMITS.dailyWindowMs;
  const record = registrationStore.get(ip);
  
  if (!record) {
    return {
      allowed: true,
      count: 0,
      remaining: REGISTRATION_LIMITS.dailyMaxRegistrations,
      resetTime: null,
    };
  }

  // 过滤掉过期的时间戳（24小时外）
  const recentTimestamps = record.timestamps.filter(ts => ts > dailyCutoff);
  
  if (recentTimestamps.length >= REGISTRATION_LIMITS.dailyMaxRegistrations) {
    // 找到最早的有效时间戳，计算重置时间
    const oldestValid = Math.min(...recentTimestamps);
    const resetTime = oldestValid + REGISTRATION_LIMITS.dailyWindowMs;
    return {
      allowed: false,
      count: recentTimestamps.length,
      remaining: 0,
      resetTime,
    };
  }

  return {
    allowed: true,
    count: recentTimestamps.length,
    remaining: REGISTRATION_LIMITS.dailyMaxRegistrations - recentTimestamps.length,
    resetTime: null,
  };
}

/**
 * 检查设备注册限制（72小时内最多5个账号）
 */
export function checkDeviceRegistrationLimit(deviceFingerprint: string): {
  allowed: boolean;
  count: number;
  remaining: number;
  resetTime: number | null;
} {
  if (!deviceFingerprint) {
    // 如果没有设备指纹，不限制
    return {
      allowed: true,
      count: 0,
      remaining: REGISTRATION_LIMITS.deviceMaxRegistrations,
      resetTime: null,
    };
  }

  const now = Date.now();
  const deviceCutoff = now - REGISTRATION_LIMITS.deviceWindowMs;
  const record = deviceRegistrationStore.get(deviceFingerprint);
  
  if (!record) {
    return {
      allowed: true,
      count: 0,
      remaining: REGISTRATION_LIMITS.deviceMaxRegistrations,
      resetTime: null,
    };
  }

  // 过滤掉过期的时间戳
  const validTimestamps = record.timestamps.filter(ts => ts > deviceCutoff);
  
  if (validTimestamps.length >= REGISTRATION_LIMITS.deviceMaxRegistrations) {
    const oldestValid = Math.min(...validTimestamps);
    const resetTime = oldestValid + REGISTRATION_LIMITS.deviceWindowMs;
    return {
      allowed: false,
      count: validTimestamps.length,
      remaining: 0,
      resetTime,
    };
  }

  return {
    allowed: true,
    count: validTimestamps.length,
    remaining: REGISTRATION_LIMITS.deviceMaxRegistrations - validTimestamps.length,
    resetTime: null,
  };
}

/**
 * 记录设备注册
 */
export function recordDeviceRegistration(deviceFingerprint: string): void {
  if (!deviceFingerprint) return;
  
  const now = Date.now();
  const deviceCutoff = now - REGISTRATION_LIMITS.deviceWindowMs;
  const record = deviceRegistrationStore.get(deviceFingerprint);
  
  if (!record) {
    deviceRegistrationStore.set(deviceFingerprint, {
      count: 1,
      timestamps: [now],
    });
    console.log(`[Security] 📱 设备 ${deviceFingerprint.substring(0, 8)}... 首次注册记录`);
    return;
  }
  
  // 过滤掉过期的时间戳
  record.timestamps = record.timestamps.filter(ts => ts > deviceCutoff);
  record.timestamps.push(now);
  record.count = record.timestamps.length;
  
  console.log(`[Security] 📱 设备 ${deviceFingerprint.substring(0, 8)}... 注册次数: ${record.count}/${REGISTRATION_LIMITS.deviceMaxRegistrations}`);
}

/**
 * 添加IP到黑名单
 */
export function blacklistIp(ip: string): void {
  ipBlacklist.add(ip);
  console.log(`[Security] 🚫 IP ${ip} 已加入黑名单`);
}

/**
 * 从黑名单移除IP
 */
export function unblacklistIp(ip: string): void {
  ipBlacklist.delete(ip);
  console.log(`[Security] ✅ IP ${ip} 已从黑名单移除`);
}

/**
 * 获取黑名单列表
 */
export function getBlacklistedIps(): string[] {
  return Array.from(ipBlacklist);
}

// ============== 速率限制 ==============

// 预设配置
export const RATE_LIMITS = {
  // 通用API：每分钟60次
  general: { windowMs: 60 * 1000, maxRequests: 60 },
  
  // 认证接口：每分钟10次
  auth: { windowMs: 60 * 1000, maxRequests: 10 },
  
  // AI接口：每分钟20次
  ai: { windowMs: 60 * 1000, maxRequests: 20 },
  
  // 管理员接口：每分钟30次
  admin: { windowMs: 60 * 1000, maxRequests: 30 },
  
  // 敏感操作：每分钟5次
  sensitive: { windowMs: 60 * 1000, maxRequests: 5 },
  
  // 脚本生成：每分钟10次
  script: { windowMs: 60 * 1000, maxRequests: 10 },
} as const;

/**
 * 速率限制检查
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    // 创建新记录
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }
  
  if (entry.count >= config.maxRequests) {
    // 超出限制
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  // 增加计数
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * 创建速率限制响应
 */
export function createRateLimitResponse(
  resetTime: number,
  message: string = '请求过于频繁，请稍后再试'
): NextResponse {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  return NextResponse.json(
    {
      success: false,
      error: message,
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.floor(resetTime / 1000)),
      },
    }
  );
}

// ============== 登录保护 ==============

const LOGIN_PROTECTION = {
  maxAttempts: 10,          // 最大失败次数
  lockoutDuration: 5 * 60 * 1000,  // 锁定时长（5分钟）
  autoBlacklistThreshold: 30,      // 自动拉黑阈值（总失败次数）
};

/**
 * 记录登录失败
 */
export function recordLoginFailure(identifier: string, ip: string): {
  locked: boolean;
  remaining: number;
  lockoutUntil: number | null;
} {
  const now = Date.now();
  const key = `${identifier}:${ip}`;
  const entry = loginAttemptStore.get(key);
  
  if (!entry) {
    loginAttemptStore.set(key, {
      count: 1,
      firstAttempt: now,
      lockedUntil: null,
    });
    return {
      locked: false,
      remaining: LOGIN_PROTECTION.maxAttempts - 1,
      lockoutUntil: null,
    };
  }
  
  // 检查是否已锁定
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return {
      locked: true,
      remaining: 0,
      lockoutUntil: entry.lockedUntil,
    };
  }
  
  // 增加失败计数
  entry.count++;
  
  // 检查是否需要锁定
  if (entry.count >= LOGIN_PROTECTION.maxAttempts) {
    entry.lockedUntil = now + LOGIN_PROTECTION.lockoutDuration;
    console.log(`[Security] 🔒 账号 ${identifier} 已锁定至 ${new Date(entry.lockedUntil).toISOString()}`);
    
    // 检查是否需要自动拉黑IP
    if (entry.count >= LOGIN_PROTECTION.autoBlacklistThreshold) {
      blacklistIp(ip);
    }
    
    return {
      locked: true,
      remaining: 0,
      lockoutUntil: entry.lockedUntil,
    };
  }
  
  return {
    locked: false,
    remaining: LOGIN_PROTECTION.maxAttempts - entry.count,
    lockoutUntil: null,
  };
}

/**
 * 清除登录失败记录（登录成功时调用）
 */
export function clearLoginFailure(identifier: string, ip: string): void {
  const key = `${identifier}:${ip}`;
  loginAttemptStore.delete(key);
}

/**
 * 检查登录是否被锁定
 */
export function isLoginLocked(identifier: string, ip: string): {
  locked: boolean;
  lockoutUntil: number | null;
} {
  const key = `${identifier}:${ip}`;
  const entry = loginAttemptStore.get(key);
  
  if (!entry || !entry.lockedUntil) {
    return { locked: false, lockoutUntil: null };
  }
  
  const now = Date.now();
  if (now < entry.lockedUntil) {
    return { locked: true, lockoutUntil: entry.lockedUntil };
  }
  
  // 锁定已过期
  return { locked: false, lockoutUntil: null };
}

// ============== AI调用保护 ==============

interface AICallRecord {
  count: number;
  totalTokens: number;
  lastCall: number;
}

const aiCallStore = new Map<string, AICallRecord>();

export const AI_LIMITS = {
  // 每用户每日AI调用次数上限
  dailyCallLimit: 100,
  // 每用户每小时AI调用次数上限
  hourlyCallLimit: 20,
};

/**
 * 记录AI调用
 */
export function recordAICall(userId: string, tokens: number = 0): void {
  const now = Date.now();
  const entry = aiCallStore.get(userId);
  
  if (!entry) {
    aiCallStore.set(userId, {
      count: 1,
      totalTokens: tokens,
      lastCall: now,
    });
    return;
  }
  
  entry.count++;
  entry.totalTokens += tokens;
  entry.lastCall = now;
}

/**
 * 检查AI调用限制
 */
export function checkAILimit(userId: string): { allowed: boolean; reason?: string } {
  const entry = aiCallStore.get(userId);
  
  if (!entry) {
    return { allowed: true };
  }
  
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  // 检查每小时限制（基于最后调用时间）
  if (entry.lastCall > oneHourAgo && entry.count >= AI_LIMITS.hourlyCallLimit) {
    return {
      allowed: false,
      reason: `每小时AI调用次数已达上限（${AI_LIMITS.hourlyCallLimit}次），请稍后再试`,
    };
  }
  
  // 重置过期的每小时计数（简化处理：超过1小时重置）
  if (entry.lastCall < oneHourAgo) {
    aiCallStore.set(userId, {
      count: 0,
      totalTokens: entry.totalTokens,
      lastCall: now,
    });
  }
  
  return { allowed: true };
}

/**
 * 获取用户AI调用统计
 */
export function getAIStats(userId: string): { count: number; lastCall: number | null } {
  const entry = aiCallStore.get(userId);
  return {
    count: entry?.count || 0,
    lastCall: entry?.lastCall || null,
  };
}

// ============== 中间件函数 ==============

/**
 * 通用速率限制中间件
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = RATE_LIMITS.general
) {
  return async (request: NextRequest) => {
    const ip = getClientIp(request);
    
    // 检查黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 检查速率限制
    const { allowed, remaining, resetTime } = checkRateLimit(`ip:${ip}`, config);
    
    if (!allowed) {
      return createRateLimitResponse(resetTime);
    }
    
    // 调用原始处理器
    const response = await handler(request);
    
    // 添加速率限制头
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.floor(resetTime / 1000)));
    
    return response;
  };
}

/**
 * 认证接口保护中间件
 */
export function withAuthProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const ip = getClientIp(request);
    
    // 检查黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 检查IP级别的速率限制
    const { allowed, resetTime } = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
    
    if (!allowed) {
      return createRateLimitResponse(resetTime, '登录尝试过于频繁，请稍后再试');
    }
    
    return handler(request);
  };
}

/**
 * AI接口保护中间件
 */
export function withAIProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  getUserId: (request: NextRequest) => string | null
) {
  return async (request: NextRequest) => {
    const ip = getClientIp(request);
    
    // 检查黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // IP级别速率限制
    const { allowed: ipAllowed, resetTime } = checkRateLimit(`ai-ip:${ip}`, RATE_LIMITS.ai);
    if (!ipAllowed) {
      return createRateLimitResponse(resetTime, 'AI调用过于频繁，请稍后再试');
    }
    
    // 用户级别限制（如果有用户ID）
    const userId = getUserId(request);
    if (userId) {
      const { allowed: userAllowed, reason } = checkAILimit(userId);
      if (!userAllowed) {
        return NextResponse.json(
          { success: false, error: reason || 'AI调用次数已达上限' },
          { status: 429 }
        );
      }
    }
    
    return handler(request);
  };
}

/**
 * 管理员接口保护中间件（可选IP白名单）
 */
export function withAdminProtection(
  handler: (request: NextRequest) => Promise<NextResponse>,
  whitelist?: string[]
) {
  return async (request: NextRequest) => {
    const ip = getClientIp(request);
    
    // IP白名单检查（如果配置了）
    if (whitelist && whitelist.length > 0 && !whitelist.includes(ip)) {
      console.log(`[Security] ⛔ 管理员接口拒绝非白名单IP: ${ip}`);
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      );
    }
    
    // 检查黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 速率限制
    const { allowed, resetTime } = checkRateLimit(`admin:${ip}`, RATE_LIMITS.admin);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '管理员操作过于频繁');
    }
    
    return handler(request);
  };
}

/**
 * 敏感操作保护中间件
 */
export function withSensitiveProtection(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const ip = getClientIp(request);
    
    // 检查黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 敏感操作速率限制
    const { allowed, resetTime } = checkRateLimit(`sensitive:${ip}`, RATE_LIMITS.sensitive);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '操作过于频繁，请稍后再试');
    }
    
    return handler(request);
  };
}

// ============== 导出统计信息 ==============

export function getSecurityStats() {
  return {
    rateLimitEntries: rateLimitStore.size,
    loginAttemptEntries: loginAttemptStore.size,
    blacklistedIps: ipBlacklist.size,
    aiCallRecords: aiCallStore.size,
  };
}
