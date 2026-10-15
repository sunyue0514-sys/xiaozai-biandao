import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getSession, getUserById } from '@/lib/db-store';

// 灵感共创权限接口
interface InspirationPermission {
  id: number;
  user_id: number;
  expires_at: string;
  total_extended_hours: number;
  upload_count: number;
  created_at: string;
  updated_at: string;
}

// 获取用户权限状态
export async function GET(request: NextRequest) {
  try {
    // 从请求头或cookie获取token（服务端正确方式）
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    console.log('API operation event');

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: '未登录',
        hasPermission: false,
        isAdmin: false,
        expiresAt: null,
        remainingHours: 0,
      });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: '会话已过期',
        hasPermission: false,
        isAdmin: false,
        expiresAt: null,
        remainingHours: 0,
      });
    }

    const user = await getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: '用户不存在',
        hasPermission: false,
        isAdmin: false,
        expiresAt: null,
        remainingHours: 0,
      });
    }

    console.log('API operation event');

    // 管理员豁免权限限制
    if (user.role === 'admin') {
      console.log('API operation event');
      return NextResponse.json({
        success: true,
        hasPermission: true,
        isAdmin: true,
        expiresAt: null,
        remainingHours: -1, // -1 表示无限制
        uploadCount: 0,
        totalExtendedHours: 0,
        isNewUser: false,
      });
    }

    const client = getSupabaseClient();

    // 查询用户权限记录
    const { data: permission, error } = await client
      .from('inspiration_permissions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const now = new Date();

    // 如果没有权限记录，创建新用户权限（24小时免费）
    if (!permission || error) {
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后
      
      const { data: newPermission, error: createError } = await client
        .from('inspiration_permissions')
        .insert({
          user_id: user.id,
          expires_at: expiresAt.toISOString(),
          total_extended_hours: 0,
          upload_count: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('API operation event');
        return NextResponse.json({ 
          success: false, 
          error: '初始化权限失败',
          hasPermission: true, // 创建失败也允许查看
          isAdmin: false,
          expiresAt: expiresAt.toISOString(),
          remainingHours: 24,
        });
      }

      return NextResponse.json({
        success: true,
        hasPermission: true,
        isAdmin: false,
        expiresAt: newPermission.expires_at,
        remainingHours: 24,
        uploadCount: 0,
        totalExtendedHours: 0,
        isNewUser: true,
      });
    }

    // 检查是否过期
    const expiresAt = new Date(permission.expires_at);
    const isExpired = now >= expiresAt;
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingHours = Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)));

    return NextResponse.json({
      success: true,
      hasPermission: !isExpired,
      isAdmin: false,
      expiresAt: permission.expires_at,
      remainingHours: isExpired ? 0 : remainingHours,
      uploadCount: permission.upload_count || 0,
      totalExtendedHours: permission.total_extended_hours || 0,
      isNewUser: false,
    });

  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误',
      hasPermission: false,
      isAdmin: false,
      expiresAt: null,
      remainingHours: 0,
    }, { status: 500 });
  }
}
