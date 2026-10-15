import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionUserId } from '@/lib/session';

/**
 * GET /api/power/info
 * 获取用户算力信息（用于前端显示）
 */
export async function GET(request: NextRequest) {
  try {
    // 获取用户 session
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '会话已过期' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    
    // 查询用户算力信息
    const { data: user, error } = await supabase
      .from('users')
      .select('credits, power_quota, used_power, power_expiry, role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查是否是无限算力用户
    const isAdmin = ['admin', 'super_admin'].includes(user.role);
    const isUnlimited = isAdmin || user.power_quota === -1 || user.credits === -1;

    if (isUnlimited) {
      return NextResponse.json({
        success: true,
        data: {
          balance: -1, // 无限算力
          remaining: -1,
          total: -1,
          used: user.used_power || 0,
          expiry: user.power_expiry,
          unlimited: true,
        },
      });
    }

    // 计算剩余算力（优先使用 credits 字段）
    const currentCredits = user.credits ?? user.power_quota;
    const remainingFromQuota = Math.max(0, (user.power_quota || 0) - (user.used_power || 0));
    const remaining = user.credits !== undefined && user.credits !== null 
      ? currentCredits 
      : remainingFromQuota;

    return NextResponse.json({
      success: true,
      data: {
        balance: remaining, // 用于前端显示
        remaining: remaining,
        total: user.power_quota || 0,
        used: user.used_power || 0,
        credits: currentCredits,
        expiry: user.power_expiry,
        unlimited: false,
      },
    });
  } catch (error) {
    console.error('获取算力信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取算力信息失败' },
      { status: 500 }
    );
  }
}