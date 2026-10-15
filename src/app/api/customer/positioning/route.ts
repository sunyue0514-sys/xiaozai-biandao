import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { getCustomerById } from '@/lib/store';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const customerId = parseInt(searchParams.get('customerId') || '0');

    if (!customerId) {
      return NextResponse.json(
        { message: '客户ID不能为空', error: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    // 验证客户属于当前用户
    const customer = await getCustomerById(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: '客户不存在' },
        { status: 404 }
      );
    }

    if (customer.uid !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: '无权访问此客户信息' },
        { status: 403 }
      );
    }

    // 从客户数据中获取IP定位信息
    let ipPositioning = null;
    let accountPlan = null;

    try {
      if (customer.ipPositioning && customer.ipPositioning !== '{}') {
        ipPositioning = JSON.parse(customer.ipPositioning);
      }
    } catch {
      // 解析失败，返回null
    }

    try {
      if (customer.accountPlan && customer.accountPlan !== '{}') {
        accountPlan = JSON.parse(customer.accountPlan);
      }
    } catch {
      // 解析失败，返回null
    }

    return NextResponse.json({
      message: '获取IP定位信息成功',
      data: {
        ipPositioning,
        accountPlan,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '获取定位信息失败' },
      { status: 500 }
    );
  }
}
