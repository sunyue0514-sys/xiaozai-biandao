import { guardAIRequest } from '@/app/api/ai/_security';
import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import {
  getConversationById,
  getMessagesByConversationId,
} from '@/lib/scriptless-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取会话详情（包括消息列表）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const conversationId = Number(id);

    const conversation = await getConversationById(conversationId, userId.toString());
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: '会话不存在' },
        { status: 404 }
      );
    }

    const messages = await getMessagesByConversationId(conversationId);

    return NextResponse.json({
      success: true,
      data: {
        conversation,
        messages,
      },
    });
  } catch (error) {
    console.error('API operation event');
    return NextResponse.json(
      { success: false, error: '获取会话详情失败' },
      { status: 500 }
    );
  }
}
