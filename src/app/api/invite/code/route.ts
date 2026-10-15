import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSessionUserId, hasSession } from '@/lib/session';

/**
 * 从请求中获取用户ID
 */
async function getUserIdFromRequest(request: Request): Promise<number | null> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.replace('Bearer ', '');
  const tokenFromCookie = request.headers.get('cookie')?.match(/sessionToken=([^;]+)/)?.[1];
  const token = tokenFromHeader || tokenFromCookie;
  
  if (!token) return null;
  
  const isValid = await hasSession(token);
  if (!isValid) return null;
  
  return getSessionUserId(token);
}

/**
 * GET /api/invite/code
 * 获取用户的邀请码和邀请统计
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // 获取用户信息
    const { data: user } = await supabase
      .from('users')
      .select('uid, username')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 生成或获取邀请码（使用用户UID作为邀请码）
    const inviteCode = user.uid;

    // 获取邀请记录
    const { data: inviteRecords } = await supabase
      .from('invite_records')
      .select('*')
      .eq('inviter_id', userId);

    // 统计
    const totalInvites = inviteRecords?.length || 0;
    const totalRewardPower = inviteRecords?.reduce((sum, r) => sum + (r.reward_power || 0), 0) || 0;

    // 生成邀请链接
    const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
    const inviteLink = `${baseUrl}/login?invite=${inviteCode}`;

    return NextResponse.json({
      success: true,
      data: {
        inviteCode,
        inviteLink,
        stats: {
          totalInvites,
          totalRewardPower,
        },
      },
    });
  } catch (error) {
    console.error('获取邀请码失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
