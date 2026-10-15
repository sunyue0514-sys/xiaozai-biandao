import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId, hasSession } from '@/lib/session';
import { getUserById } from '@/lib/store';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/security';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 免费层数据库大小限制 (500 MB)
const FREE_TIER_LIMIT_MB = 500;
const WARNING_THRESHOLD = 0.7; // 70%
const CRITICAL_THRESHOLD = 0.85; // 85%

// 检查是否是管理员
async function checkAdmin(request: NextRequest): Promise<{ isAdmin: boolean; userId: number | null }> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.replace('Bearer ', '');
  const tokenFromCookie = request.cookies.get('sessionToken')?.value;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token || !(await hasSession(token))) {
    return { isAdmin: false, userId: null };
  }

  const userId = await getSessionUserId(token);
  if (!userId) {
    return { isAdmin: false, userId: null };
  }

  const user = await getUserById(userId);
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return { isAdmin: false, userId };
  }

  return { isAdmin: true, userId };
}

// 数据库监控信息接口
interface DatabaseMonitorInfo {
  // 总体信息
  databaseSize: string;
  databaseSizeMB: number;
  limitMB: number;
  usagePercent: number;
  remainingMB: number;
  
  // 告警状态
  alertLevel: 'normal' | 'warning' | 'critical';
  alertMessage: string | null;
  
  // 各表统计
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    sizeKB: number;
  }>;
  
  // 用户相关统计
  userStats: {
    totalUsers: number;
    activeUsersThisMonth: number;
    newUsersThisMonth: number;
  };
  
  // 存储预估
  estimation: {
    avgSizePerUser: number;
    estimatedMaxUsers: number;
    daysUntilWarning: number | null;
  };
}

// 表名列表（与 schema.ts 同步）
const TABLE_NAMES = [
  'users',
  'customers', 
  'materials',
  'sessions',
  'devices',
  'login_records',
  'agent_accounts',
  'agent_invitations',
  'agent_earnings',
  'redemption_codes',
];

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
    
    const { isAdmin } = await checkAdmin(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      );
    }

    const client = getSupabaseClient();
    
    // 1. 获取真实的数据库大小
    let dbSizeBytes = 11 * 1024 * 1024; // 默认 11MB
    try {
      const { data: dbSizeData, error: dbSizeError } = await client.rpc('get_database_size');
      if (!dbSizeError && dbSizeData) {
        dbSizeBytes = Number(dbSizeData);
      }
    } catch (error) {
      console.error('获取数据库大小失败:', error);
    }
    
    // 2. 获取各表真实大小
    const tableSizes: Record<string, number> = {};
    try {
      const { data: tableSizeData, error: tableSizeError } = await client.rpc('get_table_sizes');
      if (!tableSizeError && tableSizeData) {
        for (const row of tableSizeData) {
          tableSizes[row.table_name] = Number(row.size_bytes);
        }
      }
    } catch (error) {
      console.error('获取表大小失败:', error);
    }
    
    // 3. 获取各表行数
    const tableStats: Array<{ tableName: string; rowCount: number; sizeKB: number }> = [];
    
    for (const tableName of TABLE_NAMES) {
      try {
        const { count, error } = await client
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          tableStats.push({
            tableName,
            rowCount: count || 0,
            sizeKB: Math.round((tableSizes[tableName] || 0) / 1024),
          });
        }
      } catch {
        // 忽略查询失败的表
      }
    }
    
    // 4. 获取用户统计
    const { count: totalUsers } = await client
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count: activeUsersThisMonth } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', thirtyDaysAgo.toISOString());
    
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const { count: newUsersThisMonth } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstDayOfMonth.toISOString());
    
    const userStats = {
      totalUsers: totalUsers || 0,
      activeUsersThisMonth: activeUsersThisMonth || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
    };
    
    // 5. 计算数据库大小（使用真实值）
    const dbSizeMB = Math.max(11, Math.round(dbSizeBytes / (1024 * 1024)));
    
    // 6. 计算使用率和告警状态
    const usagePercent = (dbSizeMB / FREE_TIER_LIMIT_MB) * 100;
    const remainingMB = FREE_TIER_LIMIT_MB - dbSizeMB;
    
    let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';
    let alertMessage: string | null = null;
    
    if (usagePercent >= CRITICAL_THRESHOLD * 100) {
      alertLevel = 'critical';
      alertMessage = `数据库使用率已达 ${usagePercent.toFixed(1)}%，超过危险阈值 ${CRITICAL_THRESHOLD * 100}%，请立即清理数据或升级套餐！`;
    } else if (usagePercent >= WARNING_THRESHOLD * 100) {
      alertLevel = 'warning';
      alertMessage = `数据库使用率已达 ${usagePercent.toFixed(1)}%，超过警告阈值 ${WARNING_THRESHOLD * 100}%，建议清理不必要的数据或考虑升级套餐。`;
    }
    
    // 5. 存储预估
    const avgSizePerUser = userStats.totalUsers > 0 
      ? dbSizeMB / userStats.totalUsers 
      : 2; // 默认每用户 2MB
    
    const estimatedMaxUsers = avgSizePerUser > 0 
      ? Math.round(remainingMB / avgSizePerUser) 
      : Math.round((FREE_TIER_LIMIT_MB * 0.8) / 2);
    
    const growthRatePerDay = 0.1; // MB/天，估算值
    const daysUntilWarning = growthRatePerDay > 0 
      ? Math.round((FREE_TIER_LIMIT_MB * WARNING_THRESHOLD - dbSizeMB) / growthRatePerDay)
      : null;
    
    const monitorInfo: DatabaseMonitorInfo = {
      databaseSize: `${dbSizeMB} MB`,
      databaseSizeMB: dbSizeMB,
      limitMB: FREE_TIER_LIMIT_MB,
      usagePercent: Math.round(usagePercent * 10) / 10,
      remainingMB,
      alertLevel,
      alertMessage,
      tableStats,
      userStats,
      estimation: {
        avgSizePerUser: Math.round(avgSizePerUser * 100) / 100,
        estimatedMaxUsers,
        daysUntilWarning: daysUntilWarning && daysUntilWarning > 0 ? daysUntilWarning : null,
      },
    };
    
    return NextResponse.json({
      success: true,
      data: monitorInfo,
    });
  } catch (error) {
    console.error('Database monitor error:', error);
    return NextResponse.json(
      { success: false, error: '获取数据库监控信息失败' },
      { status: 500 }
    );
  }
}
