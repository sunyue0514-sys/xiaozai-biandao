// 权限管理模块

import { getUserById } from './store';

// 用户角色类型
export type UserRole = 'super_admin' | 'admin' | 'user';

// 权限级别定义
export const ROLE_LEVELS: Record<UserRole, number> = {
  super_admin: 100,  // 最高管理员
  admin: 50,         // 普通管理员
  user: 10,          // 普通用户
};

// 最高管理员UID列表（支持多个UID）
export const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

// 判断是否是最高管理员
export function isSuperAdmin(uid: string | number | undefined | null): boolean {
  if (!uid) return false;
  const uidStr = String(uid);
  return SUPER_ADMIN_UIDS.includes(uidStr);
}

// 根据UID判断用户角色（最高管理员特殊处理）
export function getEffectiveRole(uid: string | number, role: UserRole): UserRole {
  if (isSuperAdmin(uid)) {
    return 'super_admin';
  }
  return role;
}

// 检查用户是否有指定权限级别
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_LEVELS[userRole] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

// 检查是否可以管理目标用户
export function canManageUser(operatorUid: string | number, operatorRole: UserRole, targetUid: string | number, targetRole: UserRole): boolean {
  const effectiveOperatorRole = getEffectiveRole(operatorUid, operatorRole);
  const effectiveTargetRole = getEffectiveRole(targetUid, targetRole);
  
  // 最高管理员可以管理所有人
  if (effectiveOperatorRole === 'super_admin') {
    return true;
  }
  
  // 普通管理员不能管理最高管理员和其他管理员
  if (effectiveOperatorRole === 'admin') {
    if (effectiveTargetRole === 'super_admin') return false;
    if (effectiveTargetRole === 'admin') return false;
    return true;
  }
  
  return false;
}

// 检查是否可以创建管理员
export function canCreateAdmin(operatorUid: string | number, operatorRole: UserRole): boolean {
  const effectiveRole = getEffectiveRole(operatorUid, operatorRole);
  return effectiveRole === 'super_admin';
}

// 检查是否可以访问数据库监控
export function canAccessDatabase(operatorUid: string | number, operatorRole: UserRole): boolean {
  const effectiveRole = getEffectiveRole(operatorUid, operatorRole);
  return effectiveRole === 'super_admin';
}

// 检查是否可以生成兑换码（新版本：基于代理身份和点数）
// 注意：管理员身份不再自动拥有生成兑换码的权限
// 需要有代理身份 + 点数余额充足
export function canGenerateRedemptionCode(
  operatorUid: string | number, 
  operatorRole: UserRole,
  options?: {
    isAgent?: boolean;
    pointsBalance?: number;
    codeType?: string;
    agentLevel?: number | null;
  }
): boolean {
  // 最高管理员永远可以生成
  const effectiveRole = getEffectiveRole(operatorUid, operatorRole);
  if (effectiveRole === 'super_admin') {
    return true;
  }
  
  // 如果没有传入代理信息，使用旧的逻辑（向后兼容）
  if (!options) {
    return effectiveRole === 'admin';
  }
  
  // 新逻辑：需要有代理身份
  if (!options.isAgent) {
    return false;
  }
  
  // 体验会员只有总代（level=0）可以生成
  if (options.codeType === 'trial') {
    return options.agentLevel === 0;
  }
  
  // 其他类型：有代理身份即可，点数检查在生成时进行
  return true;
}

// 检查是否可以查看操作日志
export function canViewOperationLogs(operatorUid: string | number, operatorRole: UserRole): boolean {
  const effectiveRole = getEffectiveRole(operatorUid, operatorRole);
  return effectiveRole === 'super_admin';
}

// 检查是否可以导出数据
export function canExportData(operatorUid: string, operatorRole: UserRole): boolean {
  const effectiveRole = getEffectiveRole(operatorUid, operatorRole);
  return effectiveRole === 'super_admin';
}

// 获取角色显示名称
export function getRoleDisplayName(uid: string, role: UserRole): string {
  const effectiveRole = getEffectiveRole(uid, role);
  switch (effectiveRole) {
    case 'super_admin':
      return '最高管理员';
    case 'admin':
      return '管理员';
    case 'user':
      return '普通用户';
    default:
      return '未知';
  }
}

// 权限检查函数（用于API）
export async function checkPermission(
  userId: number,
  requiredLevel: 'super_admin' | 'admin'
): Promise<{ hasPermission: boolean; user: Awaited<ReturnType<typeof getUserById>> | undefined }> {
  const user = await getUserById(userId);
  
  if (!user) {
    return { hasPermission: false, user: undefined };
  }
  
  const effectiveRole = getEffectiveRole(user.uid, user.role as UserRole);
  
  if (requiredLevel === 'super_admin') {
    return { hasPermission: effectiveRole === 'super_admin', user };
  }
  
  if (requiredLevel === 'admin') {
    return { hasPermission: hasPermission(effectiveRole, 'admin'), user };
  }
  
  return { hasPermission: false, user };
}
