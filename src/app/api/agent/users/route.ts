/**
 * 代理用户列表API
 * 获取代理的下级用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import { getAgentAccountByUserId, getAgentUsers } from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const userInfo = await getSessionUser(token);
    if (!userInfo) {
      return NextResponse.json({ success: false, error: '用户信息不存在' }, { status: 401 });
    }

    // 检查是否是代理
    const agent = await getAgentAccountByUserId(userInfo.id);
    if (!agent) {
      return NextResponse.json({ success: false, error: '您不是代理' }, { status: 403 });
    }

    // 获取 URL 参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 获取下级用户
    // 注意：inviter_id 存储的是代理的 user_id，不是 agent_accounts.id
    const users = await getAgentUsers(agent.userId, limit);

    // 格式化用户数据（脱敏手机号）
    const formattedUsers = users.map(u => ({
      id: u.id,
      uid: u.uid,
      username: u.username,
      phone: u.phone ? u.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : null,
      memberType: u.memberType,
      memberExpiry: u.memberExpiry,
      isActive: u.memberExpiry && new Date(u.memberExpiry) > new Date(),
      createdAt: u.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      total: formattedUsers.length,
      page,
      agent: {
        agentPath: agent.agentPath,
        inviteCount: agent.inviteCount,
      },
    });

  } catch (error) {
    console.error('[代理用户列表] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}
