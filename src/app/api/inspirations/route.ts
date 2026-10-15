import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import {
  createInspiration,
  getInspirationsByUid,
  getInspirationById,
  updateInspiration,
  deleteInspiration,
} from '@/lib/db-store';
import { getUserById } from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取灵感列表
export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    let inspirations = await getInspirationsByUid(user.uid, limit);

    // 过滤
    if (category && category !== 'all') {
      inspirations = inspirations.filter(i => i.category === category);
    }
    if (status && status !== 'all') {
      inspirations = inspirations.filter(i => i.status === status);
    }

    return NextResponse.json({
      success: true,
      data: inspirations,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '获取灵感列表失败' }, { status: 500 });
  }
}

// 创建灵感
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const body = await request.json();
    const { content, imageUrl, link, category, tags, expansionType, expansionResult } = body;

    if (!content && !imageUrl && !link) {
      return NextResponse.json({ error: '请输入灵感内容' }, { status: 400 });
    }

    const inspiration = await createInspiration({
      uid: user.uid,
      content: content || '',
      imageUrl,
      link,
      category: category || 'topic',
      tags: tags || [],
      expansionType,
      expansionResult,
    });

    return NextResponse.json({
      success: true,
      data: inspiration,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '创建灵感失败' }, { status: 500 });
  }
}

// 更新灵感
export async function PUT(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少灵感ID' }, { status: 400 });
    }

    const owned = await getInspirationById(id);
    if (!owned || owned.uid !== user.uid) return NextResponse.json({ error: 'Inspiration not found' }, { status: 404 });
    const updated = await updateInspiration(id, updateData);

    if (!updated) {
      return NextResponse.json({ error: '更新失败' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '更新灵感失败' }, { status: 500 });
  }
}

// 删除灵感
export async function DELETE(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ error: '获取用户信息失败' }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json({ error: '缺少灵感ID' }, { status: 400 });
    }

    const deleted = await deleteInspiration(id, user.uid);

    if (!deleted) {
      return NextResponse.json({ error: '删除失败' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json({ error: '删除灵感失败' }, { status: 500 });
  }
}
