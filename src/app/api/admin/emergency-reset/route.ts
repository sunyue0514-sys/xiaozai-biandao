import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hashPassword } from '@/lib/password';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 紧急密码重置接口
 * 
 * 仅用于紧急情况重置用户密码
 * 需要：
 * 1. 提供 admin_key（从环境变量获取）
 * 2. 提供目标用户名和新密码
 * 
 * 使用方式：
 * POST /api/admin/emergency-reset
 * {
 *   "adminKey": "xxx",
 *   "username": "目标用户名",
 *   "newPassword": "新密码"
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminKey, username, newPassword } = body;

    // 验证管理密钥
    const validKey = process.env.EMERGENCY_ADMIN_KEY;
    
    if (!validKey || validKey.length < 32 || typeof adminKey !== 'string' || Buffer.byteLength(adminKey) !== Buffer.byteLength(validKey) || !timingSafeEqual(Buffer.from(adminKey), Buffer.from(validKey))) {
      return NextResponse.json(
        { success: false, error: '无效的管理密钥' },
        { status: 403 }
      );
    }

    if (typeof username !== 'string' || typeof newPassword !== 'string' || !username || !newPassword) {
      return NextResponse.json(
        { success: false, error: '用户名和新密码不能为空' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少需要6位' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 查找用户
    const { data: user, error: findError } = await client
      .from('users')
      .select('id, uid, username, role')
      .eq('username', username)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { success: false, error: 'Unable to complete password reset' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 加密新密码
    const hashedPassword = await hashPassword(newPassword);

    // 更新密码
    const { error: updateError } = await client
      .from('users')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Unable to complete password reset' },
        { status: 500 }
      );
    }

    const { error: sessionError } = await client.from('sessions').delete().eq('user_id', user.id);
    if (sessionError) {
      return NextResponse.json({ success: false, error: 'Session revocation failed' }, { status: 500 });
    }

    // 清除登录锁定
    // 注意：由于锁定信息存储在内存中，服务重启后会自动清除
    // 但我们可以返回提示

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
      user: {
        id: user.id,
        uid: user.uid,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('紧急密码重置错误:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to complete password reset' },
      { status: 500 }
    );
  }
}
