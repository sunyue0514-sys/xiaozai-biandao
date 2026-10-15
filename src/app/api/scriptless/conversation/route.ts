import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import {
  getConversationsByUid,
  createConversation,
  updateConversationTitle,
  deleteConversation,
} from '@/lib/scriptless-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取会话列表
export async function GET(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const conversations = await getConversationsByUid(userId.toString());

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '获取会话列表失败' },
      { status: 500 }
    );
  }
}

// 创建新会话
export async function POST(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    console.log('API operation event');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { title } = body;
    
    console.log('API operation event');
    const conversation = await createConversation(userId.toString(), title);
    console.log('API operation event');

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: '系统繁忙，请稍后重试', code: 'CREATE_CONVERSATION_FAILED' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '系统繁忙，请稍后重试', code: 'CREATE_CONVERSATION_ERROR' },
      { status: 503 }
    );
  }
}

// 更新会话标题
export async function PATCH(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, title } = body;

    if (!id || !title) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const success = await updateConversationTitle(id, userId.toString(), title);

    if (!success) {
      return NextResponse.json(
        { success: false, error: '更新会话标题失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '更新会话标题失败' },
      { status: 500 }
    );
  }
}

// 删除会话
export async function DELETE(request: NextRequest) {
  const securityResponse = await guardAIRequest(request, {"paid":false,"body":false});
  if (securityResponse) return securityResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少会话ID' },
        { status: 400 }
      );
    }

    const success = await deleteConversation(Number(id), userId.toString());

    if (!success) {
      return NextResponse.json(
        { success: false, error: '删除会话失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '删除会话失败' },
      { status: 500 }
    );
  }
}
