/**
 * 密码加密工具
 * 使用 bcryptjs 进行密码哈希和验证
 */

import bcrypt from 'bcryptjs';

// 加密轮数（越高越安全，但越慢）
const SALT_ROUNDS = 10;

/**
 * 加密密码
 * @param password 明文密码
 * @returns 加密后的密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hashedPassword 加密后的密码哈希
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 检查密码是否已被加密（bcrypt哈希通常以$2a$或$2b$开头）
 * @param password 密码字符串
 * @returns 是否为加密后的哈希
 */
export function isHashedPassword(password: string): boolean {
  return password.startsWith('$2a$') || password.startsWith('$2b$');
}
