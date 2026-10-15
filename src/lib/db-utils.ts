/**
 * 数据库工具函数
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 执行原始 SQL 语句
 * 使用 Supabase 的 rpc 功能执行 SQL
 */
export async function table_exists(tableName: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  try {
    const { data, error } = await client
      .from(tableName)
      .select('id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * 检查列是否存在
 */
export async function column_exists(tableName: string, columnName: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  try {
    // 尝试查询该列，如果失败则列不存在
    const { error } = await client
      .from(tableName)
      .select(columnName)
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}

/**
 * 生成推广码
 * 用于代理邀请用户
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'R';
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 检查推广码是否已存在
 */
export async function referralCodeExists(code: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  try {
    const { data, error } = await client
      .from('agent_accounts')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();
    
    return !!data;
  } catch {
    return false;
  }
}

/**
 * 生成唯一的推广码
 */
export async function generateUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (await referralCodeExists(code) && attempts < maxAttempts) {
    code = generateReferralCode();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    // 如果尝试多次仍未生成唯一码，添加时间戳
    code = 'R' + Date.now().toString(36).toUpperCase().slice(-7);
  }
  
  return code;
}
