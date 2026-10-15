import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 清理过期用户数据 API
 * 规则：会员到期超过30天且未登录的用户，清理其数据
 * 
 * 清理范围：
 * 1. 客户数据 (customers)
 * 2. 设备数据 (devices)
 * 3. 登录记录 (login_records)
 * 4. 会话数据 (sessions)
 * 5. 用户账号 (users)
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization');
  if (!secret || secret.length < 32 || !supplied || Buffer.byteLength(supplied) !== Buffer.byteLength('Bearer ' + secret) || !timingSafeEqual(Buffer.from(supplied), Buffer.from('Bearer ' + secret))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: false, error: 'Automatic permanent cleanup is disabled until transactional retention jobs are configured', code: 'RETENTION_SERVICE_UNAVAILABLE' }, { status: 503 });
}

/**
 * GET 请求：预览将要清理的用户（不执行清理）
 */
export async function GET(request: NextRequest) {
  try {
    // 验证授权
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || cronSecret.length < 32 || !authHeader || Buffer.byteLength(authHeader) !== Buffer.byteLength('Bearer ' + cronSecret) || !timingSafeEqual(Buffer.from(authHeader), Buffer.from('Bearer ' + cronSecret))) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }
    
    const client = getSupabaseClient();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // 查找需要清理的用户
    const { data: expiredUsers, error: fetchError } = await client
      .from('users')
      .select('id, uid, username, member_expiry, last_login_at, role, created_at')
      .eq('role', 'user')
      .not('member_expiry', 'is', null);
    
    if (fetchError) {
      console.error('查询过期用户失败:', fetchError);
      return NextResponse.json(
        { success: false, error: '查询用户失败' },
        { status: 500 }
      );
    }
    
    // 过滤出符合条件的用户
    const usersToClean = (expiredUsers || []).filter(user => {
      const memberExpiry = user.member_expiry ? new Date(user.member_expiry) : null;
      const lastLoginAt = user.last_login_at ? new Date(user.last_login_at) : null;
      
      if (!memberExpiry || memberExpiry > thirtyDaysAgo) {
        return false;
      }
      
      if (lastLoginAt && lastLoginAt > thirtyDaysAgo) {
        return false;
      }
      
      return true;
    }).map(user => ({
      id: user.id,
      username: user.username,
      memberExpiry: user.member_expiry,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      daysSinceExpiry: user.member_expiry 
        ? Math.floor((now.getTime() - new Date(user.member_expiry).getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        total: usersToClean.length,
        users: usersToClean,
        cutoffDate: thirtyDaysAgo.toISOString()
      }
    });
  } catch (error) {
    console.error('预览清理用户失败:', error);
    return NextResponse.json(
      { success: false, error: '预览失败' },
      { status: 500 }
    );
  }
}
