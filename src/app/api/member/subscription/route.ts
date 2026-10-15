import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getUserById } from '@/lib/store';

// 会员类型定义
type MemberType = 'none' | 'trial' | 'monthly' | 'yearly' | 'permanent';

export async function GET(request: NextRequest) {
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
        { success: false, error: '会话无效' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查是否是管理员
    const isAdmin = ['admin', 'super_admin'].includes(user.role);
    
    // 获取会员类型（兼容旧数据，没有memberType字段的默认为none）
    const memberType: MemberType = (user.memberType as MemberType) || 'none';

    // 管理员视为永久会员
    if (isAdmin) {
      return NextResponse.json({
        success: true,
        data: {
          isMember: true,
          memberType: 'permanent',
          subscription: {
            id: 1,
            status: 'active',
            startDate: user.createdAt,
            endDate: '2099-12-31T23:59:59.000Z',
            planId: 999,
            createdAt: user.createdAt,
            plan: {
              id: 999,
              name: '管理员账号',
              planType: 'membership',
              duration: 99999,
              price: 99999,
            },
            daysRemaining: 99999,
          },
        },
      });
    }

    // 永久会员
    if (memberType === 'permanent') {
      return NextResponse.json({
        success: true,
        data: {
          isMember: true,
          memberType: 'permanent',
          subscription: {
            id: 1,
            status: 'active',
            startDate: user.createdAt,
            endDate: '2099-12-31T23:59:59.000Z',
            planId: 998,
            createdAt: user.createdAt,
            plan: {
              id: 998,
              name: '至尊VIP永久会员',
              planType: 'membership',
              duration: 99999,
              price: 99999,
            },
            daysRemaining: 99999,
          },
        },
      });
    }

    // 年度会员或月度会员 - 检查是否有效
    if ((memberType === 'yearly' || memberType === 'monthly') && user.memberExpiry) {
      const expiryDate = new Date(user.memberExpiry);
      const now = new Date();
      
      if (expiryDate > now) {
        // 会员有效
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const planName = memberType === 'yearly' ? '年度会员' : '月度会员';
        return NextResponse.json({
          success: true,
          data: {
            isMember: true,
            memberType: memberType,
            subscription: {
              id: 1,
              status: 'active',
              startDate: user.createdAt,
              endDate: user.memberExpiry,
              planId: memberType === 'yearly' ? 2 : 1,
              createdAt: user.createdAt,
              plan: {
                id: memberType === 'yearly' ? 2 : 1,
                name: planName,
                planType: 'membership',
                duration: daysRemaining,
                price: memberType === 'yearly' ? 299 : 99,
              },
              daysRemaining: daysRemaining,
            },
          },
        });
      }
    }

    // 非会员或会员已过期
    return NextResponse.json({
      success: true,
      data: {
        isMember: false,
        memberType: 'none',
        subscription: null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '获取订阅信息失败' },
      { status: 500 }
    );
  }
}
