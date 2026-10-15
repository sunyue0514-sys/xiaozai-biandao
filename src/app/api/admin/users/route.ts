import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, getUserById, deleteUser, updateUser, createOperationLog } from '@/lib/store';
import { getSessionUserId, hasSession } from '@/lib/session';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/security';
import {
  isSuperAdmin,
  canManageUser,
  canCreateAdmin,
  getEffectiveRole,
  UserRole,
} from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 检查是否是管理员（包括最高管理员）
async function checkAdmin(request: NextRequest): Promise<{ 
  isAdmin: boolean; 
  isSuperAdmin: boolean;
  userId: number | null;
  user: Awaited<ReturnType<typeof getUserById>> | null;
}> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.replace('Bearer ', '');
  const tokenFromCookie = request.cookies.get('sessionToken')?.value;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token || !(await hasSession(token))) {
    return { isAdmin: false, isSuperAdmin: false, userId: null, user: null };
  }

  const userId = await getSessionUserId(token);
  if (!userId) {
    return { isAdmin: false, isSuperAdmin: false, userId: null, user: null };
  }

  const user = await getUserById(userId);
  if (!user) {
    return { isAdmin: false, isSuperAdmin: false, userId, user: null };
  }
  
  // 检查是否是最高管理员（UID为10000001）
  const isSuper = (user.role === 'super_admin');
  console.log('[权限检查] 用户UID:', user.uid, '类型:', typeof user.uid, '是否最高管理员:', isSuper);
  
  // 检查是否是管理员（包括最高管理员）
  const effectiveRole = user.role;
  const isAdminRole = effectiveRole === 'super_admin' || effectiveRole === 'admin';

  return { 
    isAdmin: isAdminRole, 
    isSuperAdmin: isSuper,
    userId, 
    user 
  };
}

// 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 速率限制
    const { allowed, resetTime } = checkRateLimit(`admin:${ip}`, RATE_LIMITS.admin);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '请求过于频繁');
    }
    
    const { isAdmin, isSuperAdmin, user: currentUser } = await checkAdmin(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      );
    }

    const allUsers = await getUsers();
    
    // 权限过滤：
    // - 最高管理员（UID=10000001）：可以看到所有用户
    // - 普通管理员：只能看到自己创建的用户（inviterId === 当前管理员id）
    let filteredUsers = allUsers;
    if (!isSuperAdmin && currentUser) {
      // 普通管理员只能看到自己创建的用户
      filteredUsers = allUsers.filter(u => u.inviterId === currentUser.id);
      console.log(`[GET /api/admin/users] 普通管理员 ${currentUser.username}(id=${currentUser.id}) 只能看自己创建的用户，共 ${filteredUsers.length} 个`);
    } else {
      console.log(`[GET /api/admin/users] 最高管理员可看所有用户，共 ${allUsers.length} 个`);
    }
    
    // 计算会员统计数据（排除已过期会员）
    const now = new Date();
    const memberStats = {
      trial: filteredUsers.filter(u => 
        u.memberType === 'trial' && 
        (!u.memberExpiry || new Date(u.memberExpiry) > now)
      ).length,
      monthly: filteredUsers.filter(u => 
        u.memberType === 'monthly' && 
        (!u.memberExpiry || new Date(u.memberExpiry) > now)
      ).length,
      yearly: filteredUsers.filter(u => 
        u.memberType === 'yearly' && 
        (!u.memberExpiry || new Date(u.memberExpiry) > now)
      ).length,
      permanent: filteredUsers.filter(u => u.memberType === 'permanent').length,
      expired: filteredUsers.filter(u => 
        u.memberExpiry && new Date(u.memberExpiry) <= now
      ).length,
    };
    
    // 返回用户列表和权限信息
    console.log('[GET /api/admin/users] 返回权限:', {
      isSuperAdmin,
      canCreateAdmin: isSuperAdmin,
      memberStats,
    });
    
    return NextResponse.json({
      success: true,
      data: filteredUsers,
      permissions: {
        isSuperAdmin,
        canCreateAdmin: isSuperAdmin,
        canViewDatabase: isSuperAdmin,
        canGenerateCode: isSuperAdmin,
        canViewLogs: isSuperAdmin,
        canExportData: isSuperAdmin,
      },
      memberStats,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建新用户
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 速率限制
    const { allowed, resetTime } = checkRateLimit(`admin:${ip}`, RATE_LIMITS.admin);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '请求过于频繁');
    }
    
    const { isAdmin, isSuperAdmin, user: operator } = await checkAdmin(request);
    
    if (!isAdmin || !operator) {
      console.log('[创建用户] 权限检查失败');
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      username: rawUsername, 
      password: rawPassword, 
      role, 
      memberType,
      maxCustomers, 
      maxDevices, 
      powerQuota, 
      memberExpiry 
    } = body;

    // 对用户名和密码进行 trim 处理
    const username = typeof rawUsername === 'string' ? rawUsername.trim() : rawUsername;
    const password = rawPassword;

    console.log('[创建用户] 接收参数:', { username, role, memberType });

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || password.length > 72) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 用户名格式验证
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: '用户名需要4-20位字母、数字或下划线' },
        { status: 400 }
      );
    }

    // 密码长度验证
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少需要6位' },
        { status: 400 }
      );
    }

    // 如果要创建管理员，检查是否有权限
    for (const value of [maxCustomers, maxDevices, powerQuota]) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < -1 || value > 1000000000)) return NextResponse.json({ success: false, error: 'Invalid user quota' }, { status: 400 });
    }
    if (memberType !== undefined && !['none', 'trial', 'monthly', 'yearly', 'permanent'].includes(memberType)) return NextResponse.json({ success: false, error: 'Invalid membership type' }, { status: 400 });
    if (memberExpiry !== undefined && memberExpiry !== null && (typeof memberExpiry !== 'string' || (memberExpiry.trim() && !Number.isFinite(Date.parse(memberExpiry))))) return NextResponse.json({ success: false, error: 'Invalid membership expiry' }, { status: 400 });
    if (!isSuperAdmin && ((memberType !== undefined && memberType !== 'none') || (powerQuota !== undefined && powerQuota !== 100) || (maxCustomers !== undefined && (maxCustomers < 0 || maxCustomers > 10)) || (maxDevices !== undefined && (maxDevices < 0 || maxDevices > 1)) || memberExpiry)) return NextResponse.json({ success: false, error: 'Only platform administrators grant account entitlements' }, { status: 403 });
    const targetRole = role || 'user';
    if (!['user', 'admin', 'super_admin'].includes(targetRole)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    if ((targetRole === 'admin' || targetRole === 'super_admin') && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限创建管理员，仅最高管理员可创建' },
        { status: 403 }
      );
    }

    // 禁止创建最高管理员角色
    const finalRole = targetRole === 'super_admin' ? 'admin' : targetRole;

    // 普通管理员权限限制
    if (!isSuperAdmin) {
      // 禁止创建永久会员
      if (memberType === 'permanent') {
        return NextResponse.json(
          { success: false, error: '无权限创建永久会员，仅最高管理员可操作' },
          { status: 403 }
        );
      }
      // 禁止设置无限配额
      if (maxCustomers === -1 || maxDevices === -1 || powerQuota === -1) {
        return NextResponse.json(
          { success: false, error: '无权限设置无限配额，仅最高管理员可操作' },
          { status: 403 }
        );
      }
    }

    console.log('[创建用户] 开始创建用户:', username);
    const result = await createUser({
      username,
      password,
      role: finalRole,
      memberType: memberType || 'none',
      maxCustomers: maxCustomers ?? 10,
      maxDevices: maxDevices ?? 1,
      powerQuota: powerQuota ?? 100,
      memberExpiry: memberExpiry && memberExpiry.trim() !== '' ? memberExpiry : null,
      inviterId: operator.id,  // 记录创建者（管理员）的ID
    });

    if ('error' in result) {
      console.log('[创建用户] 创建失败:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    console.log('[创建用户] 创建成功:', result.username, 'UID:', result.uid);
    
    // 设置用户初始算力：同时设置 credits（新系统）和 powerQuota（兼容旧系统）
    const initialPower = powerQuota ?? 100;
    if (initialPower > 0) {
      await updateUser(result.id, {
        credits: initialPower,  // 新系统算力（主要使用）
        powerQuota: initialPower,  // 旧系统算力（兼容）
      });
    }
    
    // 记录操作日志
    await createOperationLog({
      operatorId: operator.id,
      operatorUid: operator.uid,
      operatorName: operator.username,
      operatorRole: operator.role,
      actionType: finalRole === 'admin' ? 'create_admin' : 'create_user',
      targetType: 'user',
      targetId: result.id,
      targetName: result.username,
      targetUid: result.uid,
      details: {
        role: finalRole,
        memberType: memberType || 'none',
        maxCustomers: maxCustomers ?? 10,
        maxDevices: maxDevices ?? 1,
        powerQuota: powerQuota ?? 100,
        memberExpiry: memberExpiry && memberExpiry.trim() !== '' ? memberExpiry : null,
        createdByAdmin: !isSuperAdmin,  // 标记是否由普通管理员创建
      },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    // 返回用户信息（不含密码）
    const { password: _, ...safeUser } = result;
    return NextResponse.json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    console.error('[创建用户] 异常错误:', error);
    return NextResponse.json(
      { success: false, error: 'User creation failed' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 速率限制
    const { allowed, resetTime } = checkRateLimit(`admin:${ip}`, RATE_LIMITS.admin);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '请求过于频繁');
    }
    
    const { isAdmin, isSuperAdmin, user: operator } = await checkAdmin(request);
    
    if (!isAdmin || !operator) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      id, 
      password: rawPassword, 
      role, 
      memberType,
      maxCustomers, 
      maxDevices, 
      powerQuota, 
      memberExpiry,
      usedPower,
      credits,
      powerExpiry
    } = body;

    // 对密码进行 trim 处理（如果有）
    const password = rawPassword;

    if (password !== undefined && (typeof password !== 'string' || (password && (password.length < 6 || password.length > 72)))) return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 400 });
    for (const value of [maxCustomers, maxDevices, powerQuota, usedPower, credits]) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < -1 || value > 1000000000)) return NextResponse.json({ success: false, error: 'Invalid user quota' }, { status: 400 });
    }
    if (usedPower !== undefined && usedPower < 0) return NextResponse.json({ success: false, error: 'Invalid usage count' }, { status: 400 });
    if (memberType !== undefined && !['none', 'trial', 'monthly', 'yearly', 'permanent'].includes(memberType)) return NextResponse.json({ success: false, error: 'Invalid membership type' }, { status: 400 });
    for (const value of [memberExpiry, powerExpiry]) {
      if (value !== undefined && value !== null && (typeof value !== 'string' || (value.trim() && !Number.isFinite(Date.parse(value))))) return NextResponse.json({ success: false, error: 'Invalid expiry' }, { status: 400 });
    }
    if (!isSuperAdmin && [memberType, memberExpiry, powerQuota, usedPower, credits, powerExpiry].some(value => value !== undefined)) return NextResponse.json({ success: false, error: 'Only platform administrators grant account entitlements' }, { status: 403 });
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 获取目标用户信息
    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 禁止修改最高管理员账号（仅最高管理员自己可以修改）
    if (targetUser.role === 'super_admin' && targetUser.id !== operator.id) {
      return NextResponse.json(
        { success: false, error: '无权限修改最高管理员账号' },
        { status: 403 }
      );
    }

    // 检查是否有权限管理该用户
    if (!isSuperAdmin && targetUser.inviterId !== operator.id) {
      return NextResponse.json({ success: false, error: 'Forbidden target user' }, { status: 403 });
    }
    if ((!isSuperAdmin && targetUser.role !== 'user')) {
      return NextResponse.json(
        { success: false, error: '无权限修改该用户' },
        { status: 403 }
      );
    }

    // 如果要修改角色为管理员，检查是否有权限
    if (role !== undefined && !['user', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    if ((role === 'admin' || role === 'super_admin') && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限设置管理员角色，仅最高管理员可操作' },
        { status: 403 }
      );
    }

    // 普通管理员权限限制
    if (!isSuperAdmin) {
      // 禁止设置永久会员
      if (memberType === 'permanent') {
        return NextResponse.json(
          { success: false, error: '无权限设置永久会员，仅最高管理员可操作' },
          { status: 403 }
        );
      }
      // 禁止设置无限配额
      if (maxCustomers === -1 || maxDevices === -1 || powerQuota === -1) {
        return NextResponse.json(
          { success: false, error: '无权限设置无限配额，仅最高管理员可操作' },
          { status: 403 }
        );
      }
      // 禁止设置无限算力
      if (credits === -1) {
        return NextResponse.json(
          { success: false, error: '无权限设置无限算力，仅最高管理员可操作' },
          { status: 403 }
        );
      }
    }

    if (!isSuperAdmin && ((maxCustomers !== undefined && (maxCustomers < 0 || (targetUser.maxCustomers !== -1 && maxCustomers > targetUser.maxCustomers))) || (maxDevices !== undefined && (maxDevices < 0 || (targetUser.maxDevices !== -1 && maxDevices > targetUser.maxDevices))))) return NextResponse.json({ success: false, error: 'Delegated administrators cannot increase quotas' }, { status: 403 });
    const updateData: Record<string, unknown> = {};
    
    if (password !== undefined && password !== '') updateData.password = password;
    if (role !== undefined) updateData.role = role === 'super_admin' ? 'admin' : role;
    if (memberType !== undefined) updateData.memberType = memberType;
    if (maxCustomers !== undefined) updateData.maxCustomers = maxCustomers;
    if (maxDevices !== undefined) updateData.maxDevices = maxDevices;
    if (powerQuota !== undefined) updateData.powerQuota = powerQuota;
    if (memberExpiry !== undefined) {
      updateData.memberExpiry = memberExpiry && memberExpiry.trim() !== '' ? memberExpiry : null;
    }
    if (usedPower !== undefined) updateData.usedPower = usedPower;
    if (credits !== undefined) updateData.credits = credits;
    if (powerExpiry !== undefined) {
      updateData.powerExpiry = powerExpiry && powerExpiry.trim() !== '' ? powerExpiry : null;
    }

    const result = await updateUser(id, updateData);

    if (!result) {
      return NextResponse.json(
        { success: false, error: '更新用户失败' },
        { status: 400 }
      );
    }

    // 记录操作日志
    await createOperationLog({
      operatorId: operator.id,
      operatorUid: operator.uid,
      operatorName: operator.username,
      operatorRole: operator.role,
      actionType: 'update_user',
      targetType: 'user',
      targetId: result.id,
      targetName: result.username,
      targetUid: result.uid,
      details: {
        changes: Object.fromEntries(Object.entries(updateData).filter(([key]) => key !== 'password')),
        before: {
          role: targetUser.role,
          memberType: targetUser.memberType,
          maxCustomers: targetUser.maxCustomers,
          maxDevices: targetUser.maxDevices,
          powerQuota: targetUser.powerQuota,
        },
      },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // 返回用户信息（不含密码）
    const { password: _, ...safeUser } = result;
    return NextResponse.json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 速率限制
    const { allowed, resetTime } = checkRateLimit(`admin:${ip}`, RATE_LIMITS.admin);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '请求过于频繁');
    }
    
    const { isAdmin, isSuperAdmin, user: operator } = await checkAdmin(request);
    
    if (!isAdmin || !operator) {
      return NextResponse.json(
        { success: false, error: '无权限访问' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '用户ID不能为空' },
        { status: 400 }
      );
    }

    // 获取目标用户信息
    const targetUser = await getUserById(Number(id));
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 禁止删除最高管理员
    if (targetUser.role === 'super_admin') {
      return NextResponse.json(
        { success: false, error: '最高管理员账号不能被删除' },
        { status: 403 }
      );
    }

    // 检查是否有权限管理该用户
    if (!isSuperAdmin && targetUser.inviterId !== operator.id) {
      return NextResponse.json({ success: false, error: 'Forbidden target user' }, { status: 403 });
    }
    if (!canManageUser(operator.uid, operator.role as UserRole, targetUser.uid, targetUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: '无权限删除该用户' },
        { status: 403 }
      );
    }

    // 禁止删除自己
    if (operator.id === targetUser.id) {
      return NextResponse.json(
        { success: false, error: '不能删除自己的账号' },
        { status: 400 }
      );
    }

    const result = await deleteUser(Number(id));

    if (!result) {
      return NextResponse.json(
        { success: false, error: '删除用户失败（可能是最后一个管理员）' },
        { status: 400 }
      );
    }

    // 记录操作日志
    await createOperationLog({
      operatorId: operator.id,
      operatorUid: operator.uid,
      operatorName: operator.username,
      operatorRole: operator.role,
      actionType: 'delete_user',
      targetType: 'user',
      targetId: targetUser.id,
      targetName: targetUser.username,
      targetUid: targetUser.uid,
      details: {
        deletedUser: {
          role: targetUser.role,
          memberType: targetUser.memberType,
          maxCustomers: targetUser.maxCustomers,
          maxDevices: targetUser.maxDevices,
          powerQuota: targetUser.powerQuota,
        },
      },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: '用户已删除',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: '删除用户失败' },
      { status: 500 }
    );
  }
}
