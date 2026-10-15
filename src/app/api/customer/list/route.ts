import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { getCustomersByUid, createCustomer, deleteCustomer, getUserById, getCustomerCountByUser } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/customer/list] 开始处理请求');
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      console.log('[GET /api/customer/list] Session验证失败');
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

    // 只获取当前用户的客户
    const customers = await getCustomersByUid(userId.toString());
    
    // 计算positioningCompleted字段
    const customersWithStatus = customers.map(customer => ({
      ...customer,
      positioningCompleted: !!(customer.ipPositioning && customer.ipPositioning.trim() !== '' && customer.ipPositioning !== '{}'),
    }));
    
    return NextResponse.json({
      data: customersWithStatus,
    });
  } catch (error) {
    console.error('[GET /api/customer/list] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取客户列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] ========== 创建客户开始 ==========`);
  
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      console.log(`[${requestId}] 错误: 没有token`);
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionValid = await hasSession(token);
    console.log(`[${requestId}] Session验证: ${sessionValid ? '通过' : '失败'}`);
    
    if (!sessionValid) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    console.log(`[${requestId}] 用户ID: ${userId}`);
    
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    // 获取用户信息检查客户数量限制
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      );
    }

    // 检查客户数量限制（管理员不受限制，maxCustomers为-1表示无限制）
    if (user.role !== 'admin' && user.maxCustomers !== -1) {
      const currentCount = await getCustomerCountByUser(userId.toString());
      if (currentCount >= user.maxCustomers) {
        console.log(`[${requestId}] 错误: 达到客户数量上限 (${currentCount}/${user.maxCustomers})`);
        return NextResponse.json(
          { success: false, error: `已达到客户数量上限（${user.maxCustomers}个），请联系管理员升级` },
          { status: 403 }
        );
      }
    }

    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch {
      console.log(`[${requestId}] 错误: 无法解析请求体`);
      return NextResponse.json(
        { success: false, error: '请求数据格式错误' },
        { status: 400 }
      );
    }

    const { name, description } = body;

    if (typeof name !== 'string' || !name.trim() || name.length > 200 || (description !== undefined && typeof description !== 'string')) {
      console.log(`[${requestId}] 错误: 客户名称为空`);
      return NextResponse.json(
        { success: false, error: '客户名称不能为空' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] 创建客户: ${name.trim()}`);
    
    // 创建时绑定到当前用户
    const newCustomer = await createCustomer(
      { name: name.trim(), description: description?.trim() || '' }, 
      userId.toString()
    );

    console.log(`[${requestId}] 创建成功: ID=${newCustomer.id}`);

    return NextResponse.json({
      success: true,
      data: newCustomer,
    });
  } catch (error) {
    console.error(`[${requestId}] 创建客户异常:`, error);
    
    // 判断是否为数据库错误
    const errorMessage = error instanceof Error ? error.message : '创建客户失败';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = Number(searchParams.get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少客户ID' },
        { status: 400 }
      );
    }

    // 删除时验证客户属于当前用户
    const deleted = await deleteCustomer(Number(id), userId.toString());

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '客户不存在或无权删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '客户删除成功',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '删除客户失败' },
      { status: 500 }
    );
  }
}
// trigger rebuild
