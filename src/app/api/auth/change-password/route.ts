/**
 * 修改密码接口
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import { getUserByUsername, updateUser, deleteSessionsByUserId } from '@/lib/db-store';
import { hashPassword, verifyPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '需要登录' },
        { status: 401 }
      );
    }

    // 验证 session
    const isValidSession = await hasSession(token);
    if (!isValidSession) {
      return NextResponse.json(
        { success: false, error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户信息不存在' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '请填写完整信息' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '新密码至少需要6个字符' },
        { status: 400 }
      );
    }

    // 获取用户完整信息（包含密码）
    let fullUser;
    try {
      fullUser = await getUserByUsername(user.username);
    } catch (dbError) {
      console.error('[修改密码] 数据库查询异常:', dbError);
      return NextResponse.json(
        { success: false, error: '系统繁忙，请稍后重试' },
        { status: 503 }
      );
    }
    
    if (!fullUser || !fullUser.password) {
      return NextResponse.json(
        { success: false, error: '用户数据异常' },
        { status: 500 }
      );
    }

    // 验证当前密码
    const isPasswordValid = await verifyPassword(currentPassword, fullUser.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '当前密码错误' },
        { status: 400 }
      );
    }

    // 检查新密码是否与当前密码相同
    const isSamePassword = await verifyPassword(newPassword, fullUser.password);
    if (isSamePassword) {
      return NextResponse.json(
        { success: false, error: '新密码不能与当前密码相同' },
        { status: 400 }
      );
    }

    // 哈希新密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新密码
    const updated = await updateUser(user.id, {
      password: hashedPassword,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Password update failed' }, { status: 500 });
    }
    await deleteSessionsByUserId(user.id);

    return NextResponse.json({
      success: true,
      message: '密码修改成功',
    });

  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json(
      { success: false, error: '修改密码失败，请稍后重试' },
      { status: 500 }
    );
  }
}
