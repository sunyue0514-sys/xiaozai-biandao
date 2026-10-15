/**
 * 通过UID搜索用户API
 * 用于非超级管理员在创建代理时搜索用户
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasSession, getSessionUser } from '@/lib/session';
import { SUPER_ADMIN_UIDS } from '@/lib/permissions';

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
    const client = getSupabaseClient();

    const userInfo = await getSessionUser(token);
    if (!userInfo) {
      return NextResponse.json({ success: false, error: '用户信息不存在' }, { status: 401 });
    }

    // 检查是否是管理员或代理
    const isSuperAdmin = (userInfo.role === 'super_admin');
    const isAdmin = ['admin', 'super_admin'].includes(userInfo.role);
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid || !uid.trim()) {
      return NextResponse.json({ success: false, error: '请输入UID' }, { status: 400 });
    }

    // 搜索用户
    const { data: user, error } = await client
      .from('users')
      .select('id, uid, username, role, member_type, phone, created_at, inviter_id')
      .eq('uid', uid.trim())
      .single();

    if (error || !user) {
      return NextResponse.json({ success: false, error: '未找到该用户' }, { status: 404 });
    }

    // 检查用户是否已经是代理
    if (!isSuperAdmin && user.inviter_id !== userInfo.id) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    const { data: existingAgent } = await client
      .from('agent_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        uid: user.uid,
        username: user.username,
        role: user.role,
        memberType: user.member_type,
        phone: user.phone,
        createdAt: user.created_at,
        isAgent: !!existingAgent,
      },
    });

  } catch (error) {
    console.error('[用户搜索] 错误:', error);
    return NextResponse.json({ success: false, error: '搜索失败' }, { status: 500 });
  }
}
