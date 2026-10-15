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

// 获取反馈列表（管理员）
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const userId = user?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    if (!user || !(user.role === 'admin' || user.role === 'super_admin' || isSuperAdmin(user.uid))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const supabase = getSupabaseClient();

    // 获取筛选参数
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '20');
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 });

    // 构建查询
    let query = supabase
      .from('user_feedback')
      .select(`
        id,
        type,
        title,
        content,
        contact,
        screenshots,
        status,
        admin_reply,
        replied_at,
        created_at,
        user:users!user_feedback_user_id_fkey (id, uid, username),
        replier:users!user_feedback_replied_by_fkey (id, uid, username)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('获取反馈列表失败:', error);
      return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
    }

    // 获取统计
    const { data: stats } = await supabase
      .from('user_feedback')
      .select('status')
      .then(({ data }) => {
        if (!data) return { data: null };
        const result = {
          total: data.length,
          pending: data.filter(f => f.status === 'pending').length,
          processing: data.filter(f => f.status === 'processing').length,
          resolved: data.filter(f => f.status === 'resolved').length,
          ignored: data.filter(f => f.status === 'ignored').length,
        };
        return { data: result };
      });

    return NextResponse.json({
      success: true,
      data: {
        list: data,
        total: count,
        page,
        pageSize,
        stats,
      },
    });
  } catch (error) {
    console.error('获取反馈列表异常:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 提交反馈（用户）
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const userId = user?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, content, contact, screenshots } = body;

    if (typeof content !== 'string' || !content.trim() || content.length > 10000 || (screenshots != null && (!Array.isArray(screenshots) || screenshots.length > 10 || screenshots.some(value => typeof value !== 'string' || value.length > 2000)))) {
      return NextResponse.json({ success: false, error: '请输入反馈内容' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('user_feedback')
      .insert({
        user_id: userId,
        type: type || 'suggestion',
        title: title || null,
        content: content.trim(),
        contact: contact || null,
        screenshots: screenshots || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('提交反馈失败:', error);
      return NextResponse.json({ success: false, error: '提交失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: '感谢您的反馈！我们会认真处理您的建议。',
    });
  } catch (error) {
    console.error('提交反馈异常:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
