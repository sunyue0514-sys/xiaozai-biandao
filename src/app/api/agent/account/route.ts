/**
 * 代理账户管理API
 * - GET: 获取代理信息
 * - POST: 创建代理（管理员）
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import { getAgentAccountByUserId, createAgentAccount, getAllAgents, getUserById } from '@/lib/db-store';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最高管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

/**
 * GET: 获取代理信息或代理列表
 */
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

    // 检查是否是管理员（管理员可以查看所有代理列表）
    const isAdmin = (userInfo.role === 'super_admin');

    // 获取 URL 参数
    const { searchParams } = new URL(request.url);
    const listAll = searchParams.get('all') === 'true';

    // 如果是管理员且请求列表
    if (isAdmin && listAll) {
      const agents = await getAllAgents();
      
      // 获取每个代理的用户名
      const client = getSupabaseClient();
      const { data: users } = await client
        .from('users')
        .select('id, uid, username')
        .in('id', agents.map(a => a.userId));

      const userMap = new Map((users || []).map(u => [u.id, u.username]));
      
      return NextResponse.json({
        success: true,
        data: agents.map(a => ({
          ...a,
          username: userMap.get(a.userId) || '未知',
        })),
      });
    }

    // 获取当前用户的代理信息
    const agent = await getAgentAccountByUserId(userInfo.id);

    if (!agent) {
      return NextResponse.json({
        success: true,
        data: null,
        isAgent: false,
        message: '您还不是代理',
      });
    }

    return NextResponse.json({
      success: true,
      data: agent,
      isAgent: true,
    });

  } catch (error) {
    console.error('[代理信息] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取代理信息失败' },
      { status: 500 }
    );
  }
}

/**
 * POST: 创建代理（仅管理员）
 */
export async function POST(request: NextRequest) {
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

    // 验证是否是最高管理员
    if (!(userInfo.role === 'super_admin')) {
      return NextResponse.json({ success: false, error: '仅最高管理员可创建代理' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, agentPath, parentId, commissionRate } = body;

    if (!Number.isSafeInteger(userId) || userId <= 0 || typeof agentPath !== 'string' || !agentPath ||
        (parentId !== undefined && parentId !== null && (!Number.isSafeInteger(parentId) || parentId <= 0 || parentId === userId)) ||
        (commissionRate !== undefined && (typeof commissionRate !== 'number' || !Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1))) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    // 验证用户是否存在
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 400 });
    }

    // 验证代理路径格式（只允许字母、数字、下划线，4-20位）
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(agentPath)) {
      return NextResponse.json({ success: false, error: '推广路径格式错误，需要4-20位字母、数字或下划线' }, { status: 400 });
    }

    // 检查代理路径是否已存在
    const client = getSupabaseClient();
    const { data: existingPath } = await client
      .from('agent_accounts')
      .select('id')
      .eq('agent_path', agentPath)
      .single();

    if (existingPath) {
      return NextResponse.json({ success: false, error: '推广路径已被使用' }, { status: 400 });
    }

    // 检查用户是否已经是代理
    const existingAgent = await getAgentAccountByUserId(userId);
    if (existingAgent) {
      return NextResponse.json({ success: false, error: '该用户已是代理' }, { status: 400 });
    }

    // 获取上级代理信息（如果有）
    let parentUid: string | undefined;
    if (parentId) {
      const parentAgent = await getAgentAccountByUserId(parentId);
      if (parentAgent) {
        parentUid = parentAgent.uid;
      }
    }

    // 创建代理账户
    const agent = await createAgentAccount({
      userId,
      uid: user.uid,
      agentPath,
      parentId: parentId || undefined,
      parentUid,
      commissionRate: commissionRate || 0.5,
      createdBy: userInfo.id,
    });

    if (!agent) {
      return NextResponse.json({ success: false, error: '创建代理失败' }, { status: 500 });
    }

    console.log(`[创建代理] 成功: ${user.username} (${user.uid}), 推广路径: ${agentPath}`);

    return NextResponse.json({
      success: true,
      data: agent,
      message: '代理创建成功',
    });

  } catch (error) {
    console.error('[创建代理] 错误:', error);
    return NextResponse.json(
      { success: false, error: '创建代理失败' },
      { status: 500 }
    );
  }
}
