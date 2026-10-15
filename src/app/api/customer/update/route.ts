import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { updateCustomer, getCustomerById } from '@/lib/store';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    // 获取当前用户ID
    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    const updateData = Object.fromEntries(["name","description","personaProfile","accountPlan","ipPositioning","businessAnalysis","businessFormData"]
      .filter(field => body[field] !== undefined).map(field => [field, body[field]]));

    if (!id) {
      return NextResponse.json(
        { success: false, error: '客户ID不能为空' },
        { status: 400 }
      );
    }

    const existingCustomer = await getCustomerById(id);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: '客户不存在' },
        { status: 404 }
      );
    }

    // 验证客户属于当前用户
    if (existingCustomer.uid !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: '无权操作此客户' },
        { status: 403 }
      );
    }

    const updatedCustomer = await updateCustomer(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { success: false, error: '更新客户失败' },
      { status: 500 }
    );
  }
}
