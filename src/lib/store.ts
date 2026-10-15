// 数据存储模块 - Supabase 数据库版本
// 所有数据存储在 Supabase 数据库中，实现真正的数据持久化

import * as dbStore from './db-store';

// 重新导出类型
export type { Customer, User, Session } from './db-store';

// ========== 客户相关 API ==========

export function getCustomers() {
  return dbStore.getCustomers();
}

export function getCustomersByUid(uid: string) {
  return dbStore.getCustomersByUid(uid);
}

export function getCustomerById(id: number) {
  return dbStore.getCustomerById(id);
}

export function createCustomer(data: { name: string; description?: string }, uid?: string) {
  return dbStore.createCustomer(data, uid);
}

export function updateCustomer(id: number, data: Partial<Omit<dbStore.Customer, 'id' | 'uid' | 'createdAt'>>) {
  return dbStore.updateCustomer(id, data);
}

export function deleteCustomer(id: number, uid?: string) {
  return dbStore.deleteCustomer(id, uid);
}

export function getCustomerCountByUser(uid: string) {
  return dbStore.getCustomerCountByUser(uid);
}

// ========== 用户相关 API ==========

export function getUsers() {
  return dbStore.getUsers();
}

export function getUserById(id: number) {
  return dbStore.getUserById(id);
}

export function getUserByIdSafe(id: number) {
  return dbStore.getUserByIdSafe(id);
}

export function getUserByUsername(username: string) {
  return dbStore.getUserByUsername(username);
}

export function getUserByUid(uid: string) {
  return dbStore.getUserByUid(uid);
}

export function createUser(data: {
  username: string;
  password: string;
  role?: 'admin' | 'user';
  memberType?: 'none' | 'trial' | 'monthly' | 'yearly' | 'permanent';
  phone?: string;
  maxCustomers?: number;
  maxDevices?: number;
  powerQuota?: number;
  memberExpiry?: string | null;
  inviterId?: number;
}) {
  return dbStore.createUser(data);
}

export function updateUser(id: number, data: Partial<Omit<dbStore.User, 'id' | 'createdAt'>>) {
  return dbStore.updateUser(id, data);
}

export function deleteUser(id: number) {
  return dbStore.deleteUser(id);
}

// ========== Session 相关 ==========

export function getSessions() {
  return dbStore.getSessions();
}

export function getSession(token: string) {
  return dbStore.getSession(token);
}

export function createSession(userId: number) {
  return dbStore.createSession(userId);
}

export function deleteSession(token: string) {
  return dbStore.deleteSession(token);
}

export function deleteSessionsByUserId(userId: number) {
  return dbStore.deleteSessionsByUserId(userId);
}

export function cleanExpiredSessions() {
  return dbStore.cleanExpiredSessions();
}

export function getSessionUser(token: string) {
  return dbStore.getSessionUser(token);
}

// ========== 算力相关 ==========

export function checkPowerLimit(userId: number) {
  return dbStore.checkPowerLimit(userId);
}

// ========== 初始化 ==========

export function ensureDefaultAdmin() {
  return dbStore.ensureDefaultAdmin();
}

// ========== 代理相关 API ==========

export const {
  getAgentAccount,
  createOrUpdateAgentAccount,
  getAgentInvitations,
  createAgentInvitation,
  getAgentEarnings,
  createAgentEarning,
} = dbStore;

// ========== 操作日志相关 API ==========

export const {
  createOperationLog,
  getOperationLogs,
  getOperationLogById,
  getAllOperationLogs,
  getOperationLogStats,
} = dbStore;
