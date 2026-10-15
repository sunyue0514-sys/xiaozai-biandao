import { NextRequest, NextResponse } from 'next/server';
import { getAllOperationLogs, getUsers } from '@/lib/store';
import { getSessionUserId, hasSession } from '@/lib/session';
import { getUserById } from '@/lib/store';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/security';
import { isSuperAdmin, getRoleDisplayName, UserRole } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 检查是否是最高管理员
async function checkSuperAdmin(request: NextRequest): Promise<{ 
  isSuperAdmin: boolean; 
  userId: number | null;
}> {
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.replace('Bearer ', '');
  const tokenFromCookie = request.cookies.get('sessionToken')?.value;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token || !(await hasSession(token))) {
    return { isSuperAdmin: false, userId: null };
  }

  const userId = await getSessionUserId(token);
  if (!userId) {
    return { isSuperAdmin: false, userId: null };
  }

  const user = await getUserById(userId);
  if (!user) {
    return { isSuperAdmin: false, userId };
  }
  
  return { isSuperAdmin: (user.role === 'super_admin'), userId };
}

// 获取操作类型显示名称
function getActionTypeDisplayName(actionType: string): string {
  const actionNames: Record<string, string> = {
    create_user: '创建用户',
    update_user: '更新用户',
    delete_user: '删除用户',
    create_admin: '创建管理员',
    update_admin: '更新管理员',
    delete_admin: '删除管理员',
    login: '登录',
    logout: '登出',
    change_password: '修改密码',
    redemption_code_generate: '生成兑换码',
  };
  return actionNames[actionType] || actionType;
}

// 获取会员类型显示名称
function getMemberTypeDisplayName(memberType: string): string {
  const memberNames: Record<string, string> = {
    none: '普通用户',
    trial: '体验会员',
    monthly: '月度会员',
    yearly: '年度会员',
    permanent: '永久会员',
  };
  return memberNames[memberType] || memberType || '-';
}

// 导出操作日志为CSV格式
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    const { allowed, resetTime } = checkRateLimit(`admin:${ip}`, RATE_LIMITS.admin);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '请求过于频繁');
    }
    
    const { isSuperAdmin } = await checkSuperAdmin(request);
    
    if (!isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: '无权限访问，仅最高管理员可导出数据' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get('type') || 'logs';

    if (exportType === 'users') {
      // 导出用户列表
      const users = await getUsers();
      
      // 获取所有创建用户的操作日志，用于查找创建者
      const allLogs = await getAllOperationLogs({});
      const createUserLogs = allLogs.filter(log => 
        log.actionType === 'create_user' || log.actionType === 'create_admin'
      );
      
      // 创建一个映射：目标UID -> 创建者用户名
      const creatorMap = new Map<string, string>();
      for (const log of createUserLogs) {
        if (log.targetUid) {
          creatorMap.set(String(log.targetUid), log.operatorName || log.operatorUid);
        }
      }
      
      // 生成CSV内容
      const headers = ['UID', '用户名', '角色', '会员类型', '客户数限制', '设备数限制', '算力额度', '已用算力', '会员到期时间', '创建人', '创建时间', '最后登录'];
      const csvRows = [headers.join(',')];
      
      for (const user of users) {
        const roleDisplay = getRoleDisplayName(user.uid, user.role as UserRole);
        const memberTypeDisplay = user.memberType === 'permanent' ? '永久会员' :
                                  user.memberType === 'yearly' ? '年度会员' :
                                  user.memberType === 'monthly' ? '月度会员' :
                                  user.memberType === 'trial' ? '体验会员' : '普通用户';
        // 获取创建人
        const creator = creatorMap.get(String(user.uid)) || '系统初始化';
        
        const row = [
          user.uid || '',
          user.username || '',
          roleDisplay,
          memberTypeDisplay,
          user.maxCustomers === -1 ? '无限制' : String(user.maxCustomers),
          user.maxDevices === -1 ? '无限制' : String(user.maxDevices),
          user.powerQuota === -1 ? '无限制' : String(user.powerQuota),
          String(user.usedPower),
          user.memberExpiry ? new Date(user.memberExpiry).toLocaleDateString('zh-CN') : '永久',
          creator,
          new Date(user.createdAt).toLocaleString('zh-CN'),
          user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未登录',
        ].map(v => `"${v}"`).join(',');
        csvRows.push(row);
      }
      
      const csvContent = '\uFEFF' + csvRows.join('\n'); // 添加BOM以支持中文
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="users_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
    
    // 导出操作日志
    const operatorId = searchParams.get('operatorId') ? parseInt(searchParams.get('operatorId')!, 10) : undefined;
    const actionType = searchParams.get('actionType') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    const logs = await getAllOperationLogs({
      operatorId,
      actionType,
      startDate,
      endDate,
    });
    
    // 生成CSV内容 - 添加会员类型、算力等单独列
    const headers = [
      'ID', 
      '操作时间', 
      '操作人UID', 
      '操作人用户名', 
      '操作人角色', 
      '操作类型', 
      '目标类型', 
      '目标ID', 
      '目标UID', 
      '目标名称',
      '会员类型',
      '会员到期时间',
      '算力额度',
      '客户数限制',
      '设备数限制',
      '创建者类型',
      'IP地址', 
      '详细信息'
    ];
    const csvRows = [headers.join(',')];
    
    for (const log of logs) {
      const details = log.details as Record<string, unknown> | undefined;
      const changes = details?.changes as Record<string, unknown> | undefined;
      
      // 提取会员类型和算力信息
      const memberType = details?.memberType || changes?.memberType || '';
      const memberExpiry = details?.memberExpiry || changes?.memberExpiry || '';
      const powerQuota = details?.powerQuota ?? changes?.powerQuota ?? '';
      const maxCustomers = details?.maxCustomers ?? changes?.maxCustomers ?? '';
      const maxDevices = details?.maxDevices ?? changes?.maxDevices ?? '';
      const createdByAdmin = details?.createdByAdmin;
      
      const row = [
        String(log.id),
        new Date(log.createdAt).toLocaleString('zh-CN'),
        log.operatorUid || '',
        log.operatorName || '',
        getRoleDisplayName(log.operatorUid, log.operatorRole as UserRole),
        getActionTypeDisplayName(log.actionType),
        log.targetType || '',
        log.targetId ? String(log.targetId) : '',
        log.targetUid || '',
        log.targetName || '',
        memberType ? getMemberTypeDisplayName(String(memberType)) : '',
        memberExpiry ? String(memberExpiry) : '',
        powerQuota !== '' ? (powerQuota === -1 ? '无限制' : String(powerQuota)) : '',
        maxCustomers !== '' ? (maxCustomers === -1 ? '无限制' : String(maxCustomers)) : '',
        maxDevices !== '' ? (maxDevices === -1 ? '无限制' : String(maxDevices)) : '',
        createdByAdmin !== undefined ? (createdByAdmin ? '普通管理员' : '最高管理员') : '',
        log.ipAddress || '',
        log.details ? JSON.stringify(log.details) : '',
      ].map(v => `"${v}"`).join(',');
      csvRows.push(row);
    }
    
    const csvContent = '\uFEFF' + csvRows.join('\n'); // 添加BOM以支持中文
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="operation_logs_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export data error:', error);
    return NextResponse.json(
      { success: false, error: '导出数据失败' },
      { status: 500 }
    );
  }
}
