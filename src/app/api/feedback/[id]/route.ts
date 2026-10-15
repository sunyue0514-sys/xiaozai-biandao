import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { hasSession, getSessionUser } from '@/lib/session';
import { isSuperAdmin } from '@/lib/permissions';

// 从请求中获取用户ID
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const tokenFromCookie = request.cookies.get('sessionToken')?.value;
  const token = tokenFromHeader || tokenFromCookie;
  
  if (!token) return null;
  
  const sessionValid = await hasSession(token);
  if (!sessionValid) return null;
  
  return await getSessionUser(token);
}

// 更新反馈状态/回复
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    const userId = user?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    if (!user || !(user.role === 'admin' || user.role === 'super_admin' || isSuperAdmin(user.uid))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
    const supabase = getSupabaseClient();

    const body = await request.json();
    const { status, admin_reply } = body;
    if ((status !== undefined && !['pending', 'processing', 'resolved', 'ignored'].includes(status)) ||
        (admin_reply !== undefined && admin_reply !== null && (typeof admin_reply !== 'string' || admin_reply.length > 10000))) {
      return NextResponse.json({ error: 'Invalid feedback update' }, { status: 400 });
    }


    // 构建更新数据
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
    }

    if (admin_reply !== undefined) {
      updateData.admin_reply = admin_reply;
      updateData.replied_by = userId;
      updateData.replied_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('user_feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新反馈失败:', error);
      return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新反馈异常:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 删除反馈
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    const userId = user?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    if (!user || !(user.role === 'admin' || user.role === 'super_admin' || isSuperAdmin(user.uid))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid feedback ID' }, { status: 400 });
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('user_feedback')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除反馈失败:', error);
      return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除反馈异常:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
