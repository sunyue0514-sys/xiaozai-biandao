import { randomBytes } from 'node:crypto';
// 数据存储模块 - Supabase 数据库版本
// 所有数据存储在 Supabase 数据库中，实现真正的数据持久化

import { getSupabaseClient, resetSupabaseClient, waitForSequenceCheck } from '@/storage/database/supabase-client';
import { hashPassword, isHashedPassword } from '@/lib/password';

// 类型定义

/**
 * 客户档案
 * 
 * ⚠️ 重要字段说明：
 * - uid: 存储的是用户的【数字ID】（即 user.id），不是用户的 uid 字符串
 *   - 查询用户的所有客户：.eq('uid', String(userId))
 *   - 错误示例：.eq('uid', user.uid) ← 这是错的！
 */
export interface Customer {
  id: number;
  uid: string;          // 用户数字ID（user.id），如 "1", "2"
  name: string;
  description: string;
  personaProfile: string | null;
  accountPlan: string | null;
  ipPositioning: string | null;
  businessAnalysis?: string | null;
  businessFormData?: string | null;
  createdAt: string;
  updatedAt: string;
}

// 用户角色类型
export type UserRole = 'super_admin' | 'admin' | 'user';

/**
 * 用户信息
 * 
 * ⚠️ 重要字段说明：
 * - id: 用户数字ID（如 1, 2, 3...），用于数据库关联查询
 * - uid: 用户唯一标识字符串（如 "00000001"），用于显示和外部引用
 * 
 * 注意区分：
 * - customers.uid 存的是 user.id（数字ID转字符串）
 * - 查询用户数据时用 id，显示时用 uid
 */
export interface User {
  id: number;           // 用户数字ID（主键）
  uid: string;          // 用户唯一标识字符串
  username: string;
  password: string;
  role: UserRole;
  memberType?: 'none' | 'trial' | 'monthly' | 'yearly' | 'permanent';
  phone?: string;
  maxCustomers: number;
  maxDevices: number;
  powerQuota: number;
  credits?: number;     // 新系统算力余额
  powerExpiry?: string | null; // 算力过期时间
  memberExpiry: string | null;
  usedPower: number;
  inviterId?: number;
  lastLoginAt?: string | null;  // 最后登录时间
  createdAt: string;
  updatedAt: string;
}

// 操作日志类型
export interface OperationLog {
  id: number;
  operatorId: number;
  operatorUid: string;
  operatorName: string;
  operatorRole: string;
  actionType: string;
  targetType?: string;
  targetId?: number;
  targetName?: string;
  targetUid?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: number;
  createdAt: number;
}

// 设备类型
export interface Device {
  id: string;
  uid: string;
  name: string;
  type: string;
  os: string;
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
  createdAt: string;
}

// 代理相关类型
export interface AgentInvitation {
  id: number;
  agentUid: string;
  inviteeId: number;
  inviteeName: string | null;
  inviteePhone: string | null;
  status: 'active' | 'inactive';
  totalSpent: number;
  createdAt: string;
}

export interface AgentEarning {
  id: number;
  agentUid: string;
  userId: number;
  userName: string | null;
  amount: number;
  commission: number;
  createdAt: string;
}

export interface AgentAccount {
  uid: string;
  totalEarnings: number;
  thisMonthEarnings: number;
  inviteCount: number;
  activeUsers: number;
  withdrawn: number;
  updatedAt: string;
}

// 登录记录类型
export interface LoginRecord {
  id: string;
  uid: string;
  device: string;      // 设备信息：如 "Chrome / Windows 11"
  os: string;          // 操作系统
  browser: string;     // 浏览器
  location: string;    // 登录地点
  ip: string;          // 登录IP
  status: 'success' | 'failed';  // 登录状态
  createdAt: string;
}

// 产品档案类型
export interface ProductProfile {
  id: number;
  uid: string;
  name: string;                    // 产品名称
  category: string;                // 产品类目
  price: string | null;            // 价格/优惠
  sellingPoints: string[];         // 核心卖点
  targetUsers: string | null;      // 目标人群
  userPainPoints: string | null;   // 用户痛点
  usageScenario: string | null;    // 使用场景
  promotion: string | null;        // 优惠活动
  brandStory: string | null;       // 品牌故事
  competitorAnalysis: string | null; // 竞品分析
  aiPositioning: string | null;    // AI产品定位分析结果
  
  // ===== 扩展字段（智能分析结果）=====
  // 用户画像
  userAgeRange: string | null;         // 年龄段
  userGender: string | null;           // 性别
  userConsumptionLevel: string | null; // 消费能力
  userInterests: string[] | null;      // 兴趣标签
  
  // 价值阶梯
  valueLadderBasic: string | null;     // 基础价值
  valueLadderAdvanced: string | null;  // 进阶价值
  valueLadderTop: string | null;       // 顶层价值
  
  // 痛点详情（JSON）
  painPointsJson: string | null;
  
  // 购买阻力（JSON）
  purchaseBarriersJson: string | null;
  
  // 信任背书
  trustProofSales: string | null;
  trustProofRatings: string | null;
  trustProofCertifications: string[] | null;
  trustProofCases: string | null;
  trustProofEndorsements: string | null;
  
  // 分析状态
  analysisCompleted: boolean;          // 是否已完成分析
  analysisAt: string | null;           // 分析时间
  
  createdAt: string;
  updatedAt: string;
}

// 生成用户UID（8位数字）- 改进算法降低冲突概率
function generateUID(): string {
  // 使用更高精度的时间戳（微秒级模拟）
  const now = Date.now();
  const timestamp = now.toString().slice(-5); // 时间戳后5位
  const random1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3位随机数
  return timestamp + random1;
}

// ========== 用户相关 API ==========

export async function getUsers(): Promise<Omit<User, 'password'>[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('id, uid, username, role, member_type, phone, max_customers, max_devices, credits, power_quota, power_expiry, member_expiry, used_power, inviter_id, last_login_at, created_at, updated_at')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('获取用户列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    username: row.username,
    role: row.role,
    memberType: row.member_type,
    phone: row.phone,
    maxCustomers: row.max_customers,
    maxDevices: row.max_devices,
    credits: row.credits,
    powerQuota: row.power_quota,
    powerExpiry: row.power_expiry,
    memberExpiry: row.member_expiry,
    usedPower: row.used_power,
    inviterId: row.inviter_id,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getUserById(id: number): Promise<User | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) return undefined;
  
  return {
    id: data.id,
    uid: data.uid,
    username: data.username,
    password: data.password,
    role: data.role,
    memberType: data.member_type,
    phone: data.phone,
    maxCustomers: data.max_customers,
    maxDevices: data.max_devices,
    credits: data.credits,
    powerQuota: data.power_quota,
    powerExpiry: data.power_expiry,
    memberExpiry: data.member_expiry,
    usedPower: data.used_power,
    inviterId: data.inviter_id,
    lastLoginAt: data.last_login_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getUserByIdSafe(id: number): Promise<Omit<User, 'password'> | undefined> {
  const user = await getUserById(id);
  if (!user) return undefined;
  const { password: _, ...safeUser } = user;
  return safeUser;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const trimmedUsername = username.trim();
  
  // 重试机制：最多尝试 3 次
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const client = getSupabaseClient();
      
      // 使用 ilike 进行大小写不敏感查询，避免因大小写问题导致登录失败
      const { data, error } = await client
        .from('users')
        .select('*')
        .ilike('username', trimmedUsername)
        .single();
      
      if (error) {
        // 记录数据库错误详情，帮助排查问题
        console.error(`[getUserByUsername] 查询用户失败(尝试 ${attempt}/3): username="${trimmedUsername}", error="${error.message}", code="${error.code}"`);
        
        // 如果是"没有找到记录"的错误，返回 undefined（用户不存在）
        if (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('No rows found')) {
          console.warn(`[getUserByUsername] 用户不存在: username="${trimmedUsername}"`);
          return undefined;
        }
        
        // 如果是网络连接错误或超时，尝试重试
        const shouldRetry = attempt < 3 && (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === '08006' ||
          error.code === '08001' ||
          error.code === 'ECONNRESET' ||
          error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('connection') ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('fetch failed')
        );
        
        if (shouldRetry) {
          lastError = new Error(`数据库查询失败: ${error.message}`);
          const delay = 300 * attempt;
          console.log(`[getUserByUsername] 等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 其他数据库错误，抛出异常
        throw new Error(`数据库查询失败: ${error.message} (code: ${error.code})`);
      }
      
      if (!data) {
        console.warn(`[getUserByUsername] 用户不存在: username="${trimmedUsername}"`);
        return undefined;
      }
      
      return {
        id: data.id,
        uid: data.uid,
        username: data.username,
        password: data.password,
        role: data.role,
        memberType: data.member_type,
        phone: data.phone,
        maxCustomers: data.max_customers,
        maxDevices: data.max_devices,
        powerQuota: data.power_quota,
        memberExpiry: data.member_expiry,
        usedPower: data.used_power,
        inviterId: data.inviter_id,
        lastLoginAt: data.last_login_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.error(`[getUserByUsername] 异常(尝试 ${attempt}/3):`, e);
      
      // 判断是否应该重试
      const errMsg = e instanceof Error ? e.message : String(e);
      const shouldRetry = attempt < 3 && (
        errMsg.includes('network') ||
        errMsg.includes('timeout') ||
        errMsg.includes('connection') ||
        errMsg.includes('ECONNREFUSED') ||
        errMsg.includes('fetch failed')
      );
      
      if (shouldRetry) {
        const delay = 300 * attempt;
        console.log(`[getUserByUsername] 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 非网络错误，直接抛出
        throw e;
      }
    }
  }
  
  // 所有重试都失败了，抛出最后一个错误
  console.error(`[getUserByUsername] 所有重试失败: username="${trimmedUsername}"`);
  throw lastError || new Error('数据库连接失败，请稍后重试');
}

export async function getUserByUid(uid: string): Promise<User | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('uid', uid)
    .single();
  
  if (error || !data) return undefined;
  
  return {
    id: data.id,
    uid: data.uid,
    username: data.username,
    password: data.password,
    role: data.role,
    memberType: data.member_type,
    phone: data.phone,
    maxCustomers: data.max_customers,
    maxDevices: data.max_devices,
    powerQuota: data.power_quota,
    memberExpiry: data.member_expiry,
    usedPower: data.used_power,
    inviterId: data.inviter_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createUser(data: {
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
}): Promise<User | { error: string }> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const startTime = Date.now();
  const trimmedUsername = data.username.trim();
  console.log(`[创建用户] 开始创建用户: "${trimmedUsername}", 时间: ${new Date().toISOString()}`);
  
  // 加密密码（只加密一次）
  const hashedPassword = isHashedPassword(data.password) 
    ? data.password 
    : await hashPassword(data.password);
  
  let lastError: string | null = null;
  let usernameChecked = false;
  
  // 最多重试 5 次（增加重试次数以处理 UID 冲突）
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // 每次尝试都获取新的客户端（重试时重置缓存）
      if (attempt > 1) {
        resetSupabaseClient();
        console.log('[创建用户] 已重置客户端缓存，重新获取连接');
      }
      const client = getSupabaseClient();
      
      // 只在第一次尝试时检查用户名是否存在（大小写不敏感）
      if (!usernameChecked) {
        console.log(`[创建用户] 第${attempt}次尝试: 检查用户名是否存在...`);
        const { data: existingUsers, error: checkError } = await client
          .from('users')
          .select('id, username')
          .ilike('username', trimmedUsername)
          .limit(1);
        
        if (checkError) {
          console.error(`[创建用户] 检查用户名失败:`, checkError);
          throw new Error(`检查用户名失败: ${checkError.message}`);
        }
        
        // 如果找到了任何记录，说明用户名已存在（不重试）
        if (existingUsers && existingUsers.length > 0) {
          console.log('[创建用户] 用户名已存在:', trimmedUsername, '(数据库中:', existingUsers[0].username, ')');
          return { error: '用户名已被使用，请换一个用户名' };
        }
        
        usernameChecked = true;
        console.log('[创建用户] 用户名检查通过:', trimmedUsername);
      }
      
      console.log(`[创建用户] 第${attempt}次尝试: 插入新用户..., inviterId=${data.inviterId}`);
      const { data: newUser, error } = await client
        .from('users')
        .insert({
          uid: generateUID(),
          username: trimmedUsername,
          password: hashedPassword,
          role: data.role || 'user',
          member_type: data.memberType || 'none',
          phone: data.phone,
          max_customers: data.maxCustomers ?? 10,
          max_devices: data.maxDevices ?? 1,
          power_quota: data.powerQuota ?? 100,
          member_expiry: data.memberExpiry && data.memberExpiry.trim() !== '' ? data.memberExpiry : null,
          used_power: 0,
          inviter_id: data.inviterId,
        })
        .select()
        .single();
      
      if (error) {
        console.error(`[创建用户] 插入失败: code=${error.code}, message=${error.message}, details=${JSON.stringify(error)}`);
        
        // 唯一约束冲突 - 检查具体是哪个字段
        if (error.code === '23505') {
          const errorMessage = error.message || '';
          console.log('[创建用户] 唯一约束冲突:', errorMessage);
          
          // 根据错误消息判断是哪个字段冲突
          if (errorMessage.includes('users_username_unique') || errorMessage.includes('username')) {
            return { error: '用户名已存在，请更换其他用户名' };
          } else if (errorMessage.includes('users_phone_key') || errorMessage.includes('phone')) {
            return { error: '手机号已被使用，请更换其他手机号' };
          } else if (errorMessage.includes('users_uid_unique') || errorMessage.includes('uid')) {
            // UID 冲突 - 重新生成 UID 并重试
            console.log('[创建用户] UID 冲突，将重试生成新 UID');
            throw new Error('UID冲突，需要重新生成');
          } else {
            // 无法确定具体冲突字段，可能是 UID 冲突，尝试重试
            console.log('[创建用户] 无法确定冲突字段，尝试重试');
            throw new Error('唯一约束冲突，尝试重试');
          }
        }
        throw new Error(`插入失败: ${error.message}`);
      }
      
      if (!newUser) {
        throw new Error('创建成功但未返回数据');
      }
      
      const duration = Date.now() - startTime;
      console.log(`[创建用户] 成功: ${newUser.username}, UID: ${newUser.uid}, 耗时=${duration}ms${attempt > 1 ? ` (第${attempt}次尝试)` : ''}`);
      
      return {
        id: newUser.id,
        uid: newUser.uid,
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
        memberType: newUser.member_type,
        phone: newUser.phone,
        maxCustomers: newUser.max_customers,
        maxDevices: newUser.max_devices,
        powerQuota: newUser.power_quota,
        credits: newUser.credits,
        memberExpiry: newUser.member_expiry,
        usedPower: newUser.used_power,
        inviterId: newUser.inviter_id,
        createdAt: newUser.created_at,
        updatedAt: newUser.updated_at,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err.message;
      
      const duration = Date.now() - startTime;
      console.error(`[创建用户] 第 ${attempt} 次失败 (耗时 ${duration}ms):`, err.message);
      
      // 其他错误，等待后重试
      if (attempt < 5) {
        // 增加重试间隔：500ms, 1000ms, 1500ms, 2000ms
        const delay = attempt * 500;
        console.log(`[创建用户] ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  const duration = Date.now() - startTime;
  console.error(`[创建用户] 最终失败 (总耗时 ${duration}ms):`, lastError);
  
  // 返回用户友好的错误信息
  if (lastError?.includes('network') || lastError?.includes('connection')) {
    return { error: '网络连接不稳定，请稍后重试' };
  }
  if (lastError?.includes('timeout')) {
    return { error: '请求超时，请稍后重试' };
  }
  if (lastError?.includes('COZE_SUPABASE')) {
    return { error: '数据库连接初始化中，请稍后重试' };
  }
  
  return { error: '创建用户失败，请稍后重试' };
}

export async function updateUser(id: number, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {};
  if (data.username !== undefined) updateData.username = data.username;
  // 密码更新时进行加密（如果尚未加密）
  if (data.password !== undefined) {
    updateData.password = isHashedPassword(data.password) 
      ? data.password 
      : await hashPassword(data.password);
  }
  if (data.role !== undefined) updateData.role = data.role;
  if (data.memberType !== undefined) updateData.member_type = data.memberType;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.maxCustomers !== undefined) updateData.max_customers = data.maxCustomers;
  if (data.maxDevices !== undefined) updateData.max_devices = data.maxDevices;
  if (data.powerQuota !== undefined) updateData.power_quota = data.powerQuota;
  if (data.credits !== undefined) updateData.credits = data.credits;
  if (data.powerExpiry !== undefined) updateData.power_expiry = data.powerExpiry;
  // 空字符串转为 null，避免时间戳格式错误
  if (data.memberExpiry !== undefined) {
    updateData.member_expiry = data.memberExpiry && data.memberExpiry.trim() !== '' ? data.memberExpiry : null;
  }
  if (data.usedPower !== undefined) updateData.used_power = data.usedPower;
  if (data.lastLoginAt !== undefined) updateData.last_login_at = data.lastLoginAt;
  updateData.updated_at = new Date().toISOString();
  
  const { data: updatedUser, error } = await client
    .from('users')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error || !updatedUser) {
    console.error('更新用户失败:', error);
    return null;
  }
  
  return {
    id: updatedUser.id,
    uid: updatedUser.uid,
    username: updatedUser.username,
    password: updatedUser.password,
    role: updatedUser.role,
    memberType: updatedUser.member_type,
    phone: updatedUser.phone,
    maxCustomers: updatedUser.max_customers,
    maxDevices: updatedUser.max_devices,
    powerQuota: updatedUser.power_quota,
    memberExpiry: updatedUser.member_expiry,
    usedPower: updatedUser.used_power,
    inviterId: updatedUser.inviter_id,
    lastLoginAt: updatedUser.last_login_at,
    createdAt: updatedUser.created_at,
    updatedAt: updatedUser.updated_at,
  };
}

export async function deleteUser(id: number): Promise<boolean> {
  const client = getSupabaseClient();
  
  // 先获取用户的 uid 和 role
  const { data: user } = await client
    .from('users')
    .select('uid, role')
    .eq('id', id)
    .single();
  
  if (!user) {
    console.error('用户不存在:', id);
    return false;
  }
  
  // 检查是否是最后一个管理员
  if (user.role === 'admin') {
    const { count } = await client
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');
    
    if (count && count <= 1) {
      return false; // 不允许删除最后一个管理员
    }
  }
  
  const uid = user.uid;
  console.log(`🗑️ 开始级联删除用户 ${id} (uid: ${uid}) 的所有相关数据...`);
  
  // 1. 删除客户的素材 (先删除素材，因为素材依赖客户)
  const { data: customerIds } = await client
    .from('customers')
    .select('id')
    .eq('uid', uid);
  
  if (customerIds && customerIds.length > 0) {
    for (const customer of customerIds) {
      const { error: materialsError } = await client
        .from('materials')
        .delete()
        .eq('customer_id', customer.id);
      
      if (materialsError) {
        console.error('删除客户素材失败:', materialsError);
      } else {
        console.log(`  - 已删除客户 ${customer.id} 的素材`);
      }
    }
  }
  
  // 2. 删除客户数据
  const { error: customersError } = await client
    .from('customers')
    .delete()
    .eq('uid', uid);
  
  if (customersError) {
    console.error('删除客户数据失败:', customersError);
  } else {
    console.log('  - 已删除客户数据');
  }
  
  // 3. 删除会话记录
  const { error: sessionsError } = await client
    .from('sessions')
    .delete()
    .eq('user_id', id);
  
  if (sessionsError) {
    console.error('删除会话记录失败:', sessionsError);
  } else {
    console.log('  - 已删除会话记录');
  }
  
  // 4. 删除设备记录
  const { error: devicesError } = await client
    .from('devices')
    .delete()
    .eq('uid', uid);
  
  if (devicesError) {
    console.error('删除设备记录失败:', devicesError);
  } else {
    console.log('  - 已删除设备记录');
  }
  
  // 5. 删除登录记录
  const { error: loginRecordsError } = await client
    .from('login_records')
    .delete()
    .eq('uid', uid);
  
  if (loginRecordsError) {
    console.error('删除登录记录失败:', loginRecordsError);
  } else {
    console.log('  - 已删除登录记录');
  }
  
  // 6. 删除代理账户
  const { error: agentAccountsError } = await client
    .from('agent_accounts')
    .delete()
    .eq('uid', uid);
  
  if (agentAccountsError) {
    console.error('删除代理账户失败:', agentAccountsError);
  } else {
    console.log('  - 已删除代理账户');
  }
  
  // 7. 删除代理邀请 (作为邀请者)
  const { error: agentInvitationsError } = await client
    .from('agent_invitations')
    .delete()
    .eq('agent_uid', uid);
  
  if (agentInvitationsError) {
    console.error('删除代理邀请失败:', agentInvitationsError);
  } else {
    console.log('  - 已删除代理邀请');
  }
  
  // 8. 删除代理邀请 (作为被邀请者)
  const { error: invitedError } = await client
    .from('agent_invitations')
    .delete()
    .eq('invitee_id', id);
  
  if (invitedError) {
    console.error('删除被邀请记录失败:', invitedError);
  } else {
    console.log('  - 已删除被邀请记录');
  }
  
  // 9. 删除代理收益 (作为代理)
  const { error: agentEarningsError } = await client
    .from('agent_earnings')
    .delete()
    .eq('agent_uid', uid);
  
  if (agentEarningsError) {
    console.error('删除代理收益失败:', agentEarningsError);
  } else {
    console.log('  - 已删除代理收益');
  }
  
  // 10. 删除代理收益 (作为用户)
  const { error: userEarningsError } = await client
    .from('agent_earnings')
    .delete()
    .eq('user_id', id);
  
  if (userEarningsError) {
    console.error('删除用户收益记录失败:', userEarningsError);
  } else {
    console.log('  - 已删除用户收益记录');
  }
  
  // 11. 最后删除用户本身
  const { error } = await client
    .from('users')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('删除用户失败:', error);
    return false;
  }
  
  console.log(`✅ 用户 ${id} 及所有相关数据已删除完成`);
  return true;
}

// ========== 客户相关 API ==========

export async function getCustomers(): Promise<Customer[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('获取客户列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    name: row.name,
    description: row.description,
    personaProfile: row.persona_profile,
    accountPlan: row.account_plan,
    ipPositioning: row.ip_positioning,
    businessAnalysis: row.business_analysis,
    businessFormData: row.business_form_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getCustomersByUid(uid: string): Promise<Customer[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('uid', uid)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('获取客户列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    name: row.name,
    description: row.description,
    personaProfile: row.persona_profile,
    accountPlan: row.account_plan,
    ipPositioning: row.ip_positioning,
    businessAnalysis: row.business_analysis,
    businessFormData: row.business_form_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getCustomerById(id: number): Promise<Customer | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) return undefined;
  
  return {
    id: data.id,
    uid: data.uid,
    name: data.name,
    description: data.description,
    personaProfile: data.persona_profile,
    accountPlan: data.account_plan,
    ipPositioning: data.ip_positioning,
    businessAnalysis: data.business_analysis,
    businessFormData: data.business_form_data,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createCustomer(data: { name: string; description?: string }, uid?: string): Promise<Customer> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const startTime = Date.now();
  console.log('[创建客户] 开始:', { name: data.name, uid, timestamp: new Date().toISOString() });
  
  let lastError: Error | null = null;
  
  // 最多重试 3 次
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 每次尝试都获取新的客户端（重试时重置缓存）
      if (attempt > 1) {
        resetSupabaseClient();
        console.log('[创建客户] 已重置客户端缓存，重新获取连接');
      }
      const client = getSupabaseClient();
      
      const { data: newCustomer, error } = await client
        .from('customers')
        .insert({
          uid: uid || '67352547',
          name: data.name,
          description: data.description || '',
        })
        .select()
        .single();
      
      if (error) {
        // 提取详细错误信息
        const errorMsg = error?.message || error?.details || error?.hint || JSON.stringify(error);
        throw new Error(errorMsg);
      }
      
      if (!newCustomer) {
        throw new Error('创建成功但未返回数据');
      }
      
      const duration = Date.now() - startTime;
      console.log(`[创建客户] 成功: ID=${newCustomer.id}, 耗时=${duration}ms${attempt > 1 ? ` (第${attempt}次尝试)` : ''}`);
      
      return {
        id: newCustomer.id,
        uid: newCustomer.uid,
        name: newCustomer.name,
        description: newCustomer.description,
        personaProfile: newCustomer.persona_profile,
        accountPlan: newCustomer.account_plan,
        ipPositioning: newCustomer.ip_positioning,
        businessAnalysis: newCustomer.business_analysis,
        businessFormData: newCustomer.business_form_data,
        createdAt: newCustomer.created_at,
        updatedAt: newCustomer.updated_at,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const duration = Date.now() - startTime;
      console.error(`[创建客户] 第 ${attempt} 次失败 (耗时 ${duration}ms):`, lastError.message);
      
      // 如果是唯一约束冲突（用户名已存在），不重试
      if (lastError.message.includes('unique') || lastError.message.includes('duplicate')) {
        console.error(`[创建客户] 唯一约束冲突详情:`, { name: data.name, uid, error: lastError.message });
        throw new Error(`客户名称已存在: ${data.name} (原始错误: ${lastError.message})`);
      }
      
      // 其他错误，等待后重试
      if (attempt < 3) {
        const delay = attempt * 300;
        console.log(`[创建客户] ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  const duration = Date.now() - startTime;
  console.error(`[创建客户] 最终失败 (总耗时 ${duration}ms):`, lastError?.message);
  
  // 返回详细错误信息以便排查
  const errorMessage = lastError?.message || '';
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    throw new Error('网络连接不稳定，请稍后重试');
  }
  if (errorMessage.includes('timeout')) {
    throw new Error('请求超时，请稍后重试');
  }
  
  // 返回原始错误以便调试
  throw new Error(`创建客户失败: ${errorMessage}`);
}

export async function updateCustomer(id: number, data: Partial<Omit<Customer, 'id' | 'uid' | 'createdAt'>>): Promise<Customer | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.personaProfile !== undefined) updateData.persona_profile = data.personaProfile;
  if (data.accountPlan !== undefined) updateData.account_plan = data.accountPlan;
  if (data.ipPositioning !== undefined) updateData.ip_positioning = data.ipPositioning;
  if (data.businessAnalysis !== undefined) updateData.business_analysis = data.businessAnalysis;
  if (data.businessFormData !== undefined) updateData.business_form_data = data.businessFormData;
  updateData.updated_at = new Date().toISOString();
  
  const { data: updatedCustomer, error } = await client
    .from('customers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error || !updatedCustomer) {
    console.error('更新客户失败:', error);
    return null;
  }
  
  return {
    id: updatedCustomer.id,
    uid: updatedCustomer.uid,
    name: updatedCustomer.name,
    description: updatedCustomer.description,
    personaProfile: updatedCustomer.persona_profile,
    accountPlan: updatedCustomer.account_plan,
    ipPositioning: updatedCustomer.ip_positioning,
    businessAnalysis: updatedCustomer.business_analysis,
    businessFormData: updatedCustomer.business_form_data,
    createdAt: updatedCustomer.created_at,
    updatedAt: updatedCustomer.updated_at,
  };
}

export async function deleteCustomer(id: number, uid?: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  // 如果指定了 uid，先验证客户属于该用户
  if (uid) {
    const { data: customer } = await client
      .from('customers')
      .select('uid')
      .eq('id', id)
      .single();
    
    if (!customer || customer.uid !== uid) {
      return false;
    }
  }
  
  const { error } = await client
    .from('customers')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('删除客户失败:', error);
    return false;
  }
  
  return true;
}

export async function getCustomerCountByUser(uid: string): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('uid', uid);
  
  if (error) {
    console.error('获取客户数量失败:', error);
    return 0;
  }
  
  return count || 0;
}

// ========== Session 相关 ==========

export async function getSessions(): Promise<Session[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sessions')
    .select('*');
  
  if (error) {
    console.error('获取会话列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    token: row.token,
    userId: row.user_id,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function getSession(token: string): Promise<Session | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sessions')
    .select('*')
    .eq('token', token)
    .single();
  
  if (error || !data) return undefined;
  const createdAt = new Date(data.created_at).getTime();
  const age = Date.now() - createdAt;
  if (!Number.isFinite(createdAt) || age < 0 || age >= 24 * 60 * 60 * 1000) {
    return undefined;
  }
  
  return {
    token: data.token,
    userId: data.user_id,
    createdAt,
  };
}

export async function createSession(userId: number): Promise<string> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  const token = randomBytes(32).toString('hex');
  
  const { error } = await client
    .from('sessions')
    .insert({
      token,
      user_id: userId,
    });
  
  if (error) {
    console.error('创建会话失败:', error);
    throw new Error('创建会话失败');
  }
  
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  const client = getSupabaseClient();
  await client
    .from('sessions')
    .delete()
    .eq('token', token);
}

export async function deleteSessionsByUserId(userId: number): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('sessions')
    .delete()
    .eq('user_id', userId);
  if (error) throw new Error('Session revocation failed');
}

export async function cleanExpiredSessions(): Promise<void> {
  const client = getSupabaseClient();
  const maxAge = 24 * 60 * 60 * 1000; // 24小时
  const cutoffTime = new Date(Date.now() - maxAge).toISOString();
  
  await client
    .from('sessions')
    .delete()
    .lt('created_at', cutoffTime);
}

export async function getSessionUser(token: string): Promise<User | undefined> {
  const session = await getSession(token);
  if (!session) return undefined;
  return getUserById(session.userId);
}

// ========== 算力相关 ==========

export async function checkPowerLimit(userId: number): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) return false;
  
  // 管理员无限制
  if (user.role === 'admin') return true;
  
  // -1 表示无限制
  if (user.powerQuota === -1) return true;
  
  // 检查是否超过配额
  return user.usedPower < user.powerQuota;
}

// ========== 初始化默认管理员 ==========

export async function ensureDefaultAdmin(): Promise<{ created: boolean; username: string }> {
  const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || password.length < 12) {
    throw new Error('Set ADMIN_PASSWORD (at least 12 characters) before bootstrap.');
  }
  const client = getSupabaseClient();
  const { count, error } = await client.from('users')
    .select('id', { count: 'exact', head: true }).eq('role', 'admin');
  if (error) throw new Error('Failed to check administrator account.');
  if (count && count > 0) return { created: false, username };
  const hashedPassword = await hashPassword(password);
  const { error: createError } = await client.from('users').insert({
    uid: '10000001', username, password: hashedPassword, role: 'admin',
    member_type: 'permanent', max_customers: -1, max_devices: -1,
    power_quota: -1, used_power: 0,
  });
  if (createError) throw new Error('Failed to create administrator account.');
  return { created: true, username };
}

// ========== 代理相关 API ==========

export async function getAgentAccount(uid: string): Promise<AgentAccount | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('agent_accounts')
    .select('*')
    .eq('uid', uid)
    .single();
  
  if (error || !data) return null;
  
  return {
    uid: data.uid,
    totalEarnings: parseFloat(data.total_earnings || '0'),
    thisMonthEarnings: parseFloat(data.this_month_earnings || '0'),
    inviteCount: data.invite_count,
    activeUsers: data.active_users,
    withdrawn: parseFloat(data.withdrawn || '0'),
    updatedAt: data.updated_at,
  };
}

export async function createOrUpdateAgentAccount(uid: string, data: Partial<AgentAccount>): Promise<AgentAccount | null> {
  const client = getSupabaseClient();
  
  // 先检查是否存在
  const existing = await getAgentAccount(uid);
  
  if (existing) {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.totalEarnings !== undefined) updateData.total_earnings = data.totalEarnings.toString();
    if (data.thisMonthEarnings !== undefined) updateData.this_month_earnings = data.thisMonthEarnings.toString();
    if (data.inviteCount !== undefined) updateData.invite_count = data.inviteCount;
    if (data.activeUsers !== undefined) updateData.active_users = data.activeUsers;
    if (data.withdrawn !== undefined) updateData.withdrawn = data.withdrawn.toString();
    
    const { data: updated, error } = await client
      .from('agent_accounts')
      .update(updateData)
      .eq('uid', uid)
      .select()
      .single();
    
    if (error || !updated) return null;
    
    return {
      uid: updated.uid,
      totalEarnings: parseFloat(updated.total_earnings || '0'),
      thisMonthEarnings: parseFloat(updated.this_month_earnings || '0'),
      inviteCount: updated.invite_count,
      activeUsers: updated.active_users,
      withdrawn: parseFloat(updated.withdrawn || '0'),
      updatedAt: updated.updated_at,
    };
  } else {
    const { data: created, error } = await client
      .from('agent_accounts')
      .insert({
        uid,
        total_earnings: (data.totalEarnings || 0).toString(),
        this_month_earnings: (data.thisMonthEarnings || 0).toString(),
        invite_count: data.inviteCount || 0,
        active_users: data.activeUsers || 0,
        withdrawn: (data.withdrawn || 0).toString(),
      })
      .select()
      .single();
    
    if (error || !created) return null;
    
    return {
      uid: created.uid,
      totalEarnings: parseFloat(created.total_earnings || '0'),
      thisMonthEarnings: parseFloat(created.this_month_earnings || '0'),
      inviteCount: created.invite_count,
      activeUsers: created.active_users,
      withdrawn: parseFloat(created.withdrawn || '0'),
      updatedAt: created.updated_at,
    };
  }
}

export async function getAgentInvitations(uid: string): Promise<AgentInvitation[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('agent_invitations')
    .select('*')
    .eq('agent_uid', uid)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('获取代理邀请列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    agentUid: row.agent_uid,
    inviteeId: row.invitee_id,
    inviteeName: row.invitee_name,
    inviteePhone: row.invitee_phone,
    status: row.status,
    totalSpent: parseFloat(row.total_spent || '0'),
    createdAt: row.created_at,
  }));
}

export async function createAgentInvitation(data: {
  agentUid: string;
  inviteeId: number;
  inviteeName?: string;
  inviteePhone?: string;
}): Promise<AgentInvitation | null> {
  const client = getSupabaseClient();
  
  const { data: invitation, error } = await client
    .from('agent_invitations')
    .insert({
      agent_uid: data.agentUid,
      invitee_id: data.inviteeId,
      invitee_name: data.inviteeName || null,
      invitee_phone: data.inviteePhone || null,
    })
    .select()
    .single();
  
  if (error || !invitation) {
    console.error('创建代理邀请失败:', error);
    return null;
  }
  
  return {
    id: invitation.id,
    agentUid: invitation.agent_uid,
    inviteeId: invitation.invitee_id,
    inviteeName: invitation.invitee_name,
    inviteePhone: invitation.invitee_phone,
    status: invitation.status,
    totalSpent: parseFloat(invitation.total_spent || '0'),
    createdAt: invitation.created_at,
  };
}

export async function getAgentEarnings(uid: string, limit?: number): Promise<AgentEarning[]> {
  const client = getSupabaseClient();
  let query = client
    .from('agent_earnings')
    .select('*')
    .eq('agent_uid', uid)
    .order('created_at', { ascending: false });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('获取代理收益列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    agentUid: row.agent_uid,
    userId: row.user_id,
    userName: row.user_name,
    amount: parseFloat(row.amount || '0'),
    commission: parseFloat(row.commission || '0'),
    createdAt: row.created_at,
  }));
}

export async function createAgentEarning(data: {
  agentUid: string;
  userId: number;
  userName?: string;
  amount: number;
  commission: number;
}): Promise<AgentEarning | null> {
  const client = getSupabaseClient();
  
  const { data: earning, error } = await client
    .from('agent_earnings')
    .insert({
      agent_uid: data.agentUid,
      user_id: data.userId,
      user_name: data.userName || null,
      amount: data.amount.toString(),
      commission: data.commission.toString(),
    })
    .select()
    .single();
  
  if (error || !earning) {
    console.error('创建代理收益失败:', error);
    return null;
  }
  
  return {
    id: earning.id,
    agentUid: earning.agent_uid,
    userId: earning.user_id,
    userName: earning.user_name,
    amount: parseFloat(earning.amount || '0'),
    commission: parseFloat(earning.commission || '0'),
    createdAt: earning.created_at,
  };
}

// ========== 素材相关 API ==========

export interface Material {
  id: number;
  uid: string;
  customerId: number;
  customerName: string;
  topic: string;
  title: string | null;
  scriptType: string;
  shootingMethod: string | null;
  status: string;
  isDeleted: boolean;
  sourceType: string;    // 来源类型
  materialType?: string; // 素材类型：topic-选题, script-文案, fullscript-脚本
  content?: string;      // 内容
  summary?: string;
  tags?: string[];
  platform?: string;
  viewCount?: number;
  isStarred?: boolean;
  // 档案字段
  archiveType?: string;  // 档案类型：customer-客户档案, product-产品档案
  productId?: number;    // 产品档案ID
  productName?: string;  // 产品名称
  createdAt: string;
  updatedAt: string;
}

export async function getMaterialsByUid(uid: string): Promise<Material[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('materials')
    .select('*')
    .eq('uid', uid)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('获取素材列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    customerId: row.customer_id,
    customerName: row.customer_name,
    topic: row.topic,
    title: row.title,
    scriptType: row.script_type,
    shootingMethod: row.shooting_method,
    status: row.status,
    isDeleted: row.is_deleted,
    sourceType: row.source_type || row.material_type || 'other',
    materialType: row.material_type || 'topic',
    content: row.content,
    archiveType: row.archive_type || 'general',
    productId: row.product_id,
    productName: row.product_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getMaterialById(id: number): Promise<Material | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('materials')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) return undefined;
  
  return {
    id: data.id,
    uid: data.uid,
    customerId: data.customer_id,
    customerName: data.customer_name,
    topic: data.topic,
    title: data.title,
    scriptType: data.script_type,
    shootingMethod: data.shooting_method,
    status: data.status,
    isDeleted: data.is_deleted,
    sourceType: data.source_type || data.material_type || 'other',
    materialType: data.material_type || 'topic',
    content: data.content,
    archiveType: data.archive_type || 'general',
    productId: data.product_id,
    productName: data.product_name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createMaterial(data: {
  uid: string;
  customerId: number;
  customerName: string;
  topic: string;
  title?: string;
  scriptType: string;
  shootingMethod?: string;
  status?: string;
  materialType?: string;
  sourceType?: string;
  content?: string;
  // 档案相关字段
  archiveType?: string;  // 档案类型：customer-客户档案, product-产品档案, general-通用素材
  productId?: number | null;    // 产品档案ID
  productName?: string | null;  // 产品名称
}): Promise<Material> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const startTime = Date.now();
  console.log('[创建素材] 开始:', {
    uid: data.uid,
    topic: data.topic,
    archiveType: data.archiveType,
  });
  
  let lastError: Error | null = null;
  
  // 最多重试 3 次
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 每次尝试都获取新的客户端（重试时重置缓存）
      if (attempt > 1) {
        resetSupabaseClient();
        console.log('[创建素材] 已重置客户端缓存，重新获取连接');
      }
      const client = getSupabaseClient();
      
      const { data: newMaterial, error } = await client
        .from('materials')
        .insert({
          uid: data.uid,
          customer_id: data.customerId || 0,
          customer_name: data.customerName || '',
          topic: data.topic,
          title: data.title || null,
          script_type: data.scriptType,
          shooting_method: data.shootingMethod || null,
          status: data.status || 'draft',
          material_type: data.materialType || data.sourceType || 'topic',
          source_type: data.sourceType || data.materialType || 'other',
          content: data.content || null,
          is_deleted: false,
          archive_type: data.archiveType || 'general',
          product_id: data.productId || null,
          product_name: data.productName || null,
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`插入失败: ${error.message}`);
      }
      
      if (!newMaterial) {
        throw new Error('创建成功但未返回数据');
      }
      
      const duration = Date.now() - startTime;
      console.log(`[创建素材] 成功: ID=${newMaterial.id}, 耗时=${duration}ms${attempt > 1 ? ` (第${attempt}次尝试)` : ''}`);
      
      return {
        id: newMaterial.id,
        uid: newMaterial.uid,
        customerId: newMaterial.customer_id,
        customerName: newMaterial.customer_name,
        topic: newMaterial.topic,
        title: newMaterial.title,
        scriptType: newMaterial.script_type,
        shootingMethod: newMaterial.shooting_method,
        status: newMaterial.status,
        sourceType: newMaterial.source_type || newMaterial.material_type || 'other',
        materialType: newMaterial.material_type || 'topic',
        content: newMaterial.content,
        isDeleted: newMaterial.is_deleted,
        archiveType: newMaterial.archive_type || 'general',
        productId: newMaterial.product_id,
        productName: newMaterial.product_name,
        createdAt: newMaterial.created_at,
        updatedAt: newMaterial.updated_at,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const duration = Date.now() - startTime;
      console.error(`[创建素材] 第 ${attempt} 次失败 (耗时 ${duration}ms):`, lastError.message);
      
      // 其他错误，等待后重试
      if (attempt < 3) {
        const delay = attempt * 300;
        console.log(`[创建素材] ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  const duration = Date.now() - startTime;
  console.error(`[创建素材] 最终失败 (总耗时 ${duration}ms):`, lastError?.message);
  
  // 返回详细错误信息以便排查
  const errorMessage = lastError?.message || '';
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    throw new Error('网络连接不稳定，请稍后重试');
  }
  if (errorMessage.includes('timeout')) {
    throw new Error('请求超时，请稍后重试');
  }
  
  throw new Error(`创建素材失败: ${errorMessage}`);
}

export async function updateMaterial(id: number, data: Partial<Omit<Material, 'id' | 'uid' | 'createdAt'>>): Promise<Material | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, unknown> = {};
  if (data.customerId !== undefined) updateData.customer_id = data.customerId;
  if (data.customerName !== undefined) updateData.customer_name = data.customerName;
  if (data.topic !== undefined) updateData.topic = data.topic;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.scriptType !== undefined) updateData.script_type = data.scriptType;
  if (data.shootingMethod !== undefined) updateData.shooting_method = data.shootingMethod;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.isDeleted !== undefined) updateData.is_deleted = data.isDeleted;
  if (data.materialType !== undefined) updateData.material_type = data.materialType;
  if (data.content !== undefined) updateData.content = data.content;
  // 档案字段
  if (data.archiveType !== undefined) updateData.archive_type = data.archiveType;
  if (data.productId !== undefined) updateData.product_id = data.productId;
  if (data.productName !== undefined) updateData.product_name = data.productName;
  updateData.updated_at = new Date().toISOString();
  
  const { data: updatedMaterial, error } = await client
    .from('materials')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error || !updatedMaterial) {
    console.error('更新素材失败:', error);
    return null;
  }
  
  return {
    id: updatedMaterial.id,
    uid: updatedMaterial.uid,
    customerId: updatedMaterial.customer_id,
    customerName: updatedMaterial.customer_name,
    topic: updatedMaterial.topic,
    title: updatedMaterial.title,
    scriptType: updatedMaterial.script_type,
    shootingMethod: updatedMaterial.shooting_method,
    status: updatedMaterial.status,
    sourceType: updatedMaterial.source_type || updatedMaterial.material_type || 'other',
    materialType: updatedMaterial.material_type || 'topic',
    content: updatedMaterial.content,
    isDeleted: updatedMaterial.is_deleted,
    archiveType: updatedMaterial.archive_type || 'customer',
    productId: updatedMaterial.product_id,
    productName: updatedMaterial.product_name,
    createdAt: updatedMaterial.created_at,
    updatedAt: updatedMaterial.updated_at,
  };
}

export async function deleteMaterial(id: number, uid?: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  // 如果指定了 uid，先验证素材属于该用户
  if (uid) {
    const { data: material } = await client
      .from('materials')
      .select('uid')
      .eq('id', id)
      .single();
    
    if (!material || material.uid !== uid) {
      return false;
    }
  }
  
  // 软删除
  const { error } = await client
    .from('materials')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  if (error) {
    console.error('删除素材失败:', error);
    return false;
  }
  
  return true;
}

export async function getMaterialCountByUser(uid: string): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('materials')
    .select('*', { count: 'exact', head: true })
    .eq('uid', uid)
    .eq('is_deleted', false);
  
  if (error) {
    console.error('获取素材数量失败:', error);
    return 0;
  }
  
  return count || 0;
}

// ========== 设备相关 API ==========

export async function getDevicesByUid(uid: string): Promise<Device[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('devices')
    .select('*')
    .eq('uid', uid)
    .order('last_active', { ascending: false });
  
  if (error) {
    console.error('获取设备列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    name: row.name,
    type: row.type,
    os: row.os,
    browser: row.browser,
    location: row.location,
    ip: row.ip,
    lastActive: row.last_active,
    current: row.current,
    createdAt: row.created_at,
  }));
}

export async function createDevice(data: {
  id: string;
  uid: string;
  name: string;
  type?: string;
  os?: string;
  browser?: string;
  location?: string;
  ip?: string;
}): Promise<Device> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  
  // 先将该用户的其他设备设为非当前
  await client
    .from('devices')
    .update({ current: false })
    .eq('uid', data.uid);
  
  const { data: newDevice, error } = await client
    .from('devices')
    .insert({
      id: data.id,
      uid: data.uid,
      name: data.name,
      type: data.type || 'desktop',
      os: data.os || 'Unknown',
      browser: data.browser || 'Unknown',
      location: data.location || 'Unknown',
      ip: data.ip || 'Unknown',
      current: true,
    })
    .select()
    .single();
  
  if (error || !newDevice) {
    console.error('创建设备失败:', error);
    throw new Error('创建设备失败');
  }
  
  return {
    id: newDevice.id,
    uid: newDevice.uid,
    name: newDevice.name,
    type: newDevice.type,
    os: newDevice.os,
    browser: newDevice.browser,
    location: newDevice.location,
    ip: newDevice.ip,
    lastActive: newDevice.last_active,
    current: newDevice.current,
    createdAt: newDevice.created_at,
  };
}

export async function updateDeviceCurrent(id: string, uid: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  // 先将该用户的其他设备设为非当前
  await client
    .from('devices')
    .update({ current: false })
    .eq('uid', uid);
  
  // 设置当前设备
  const { error } = await client
    .from('devices')
    .update({ 
      current: true, 
      last_active: new Date().toISOString() 
    })
    .eq('id', id)
    .eq('uid', uid);
  
  if (error) {
    console.error('更新设备状态失败:', error);
    return false;
  }
  
  return true;
}

export async function deleteDevice(id: string, uid: string): Promise<boolean> {
  const client = getSupabaseClient();
  
  // 检查是否是当前设备
  const { data: device } = await client
    .from('devices')
    .select('current')
    .eq('id', id)
    .eq('uid', uid)
    .single();
  
  if (!device) {
    return false;
  }
  
  if (device.current) {
    // 不能删除当前设备
    return false;
  }
  
  const { error } = await client
    .from('devices')
    .delete()
    .eq('id', id)
    .eq('uid', uid);
  
  if (error) {
    console.error('删除设备失败:', error);
    return false;
  }
  
  return true;
}

export async function getDeviceCountByUser(uid: string): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('uid', uid);
  
  if (error) {
    console.error('获取设备数量失败:', error);
    return 0;
  }
  
  return count || 0;
}

// ========== 登录记录相关 API ==========

export async function getLoginRecordsByUid(uid: string, limit: number = 10): Promise<LoginRecord[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('login_records')
    .select('*')
    .eq('uid', uid)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('获取登录记录失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    device: row.device,
    os: row.os,
    browser: row.browser,
    location: row.location,
    ip: row.ip,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function createLoginRecord(data: {
  uid: string;
  device: string;
  os?: string;
  browser?: string;
  location?: string;
  ip?: string;
  status: 'success' | 'failed';
}): Promise<LoginRecord> {
  const client = getSupabaseClient();
  
  const id = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const { data: newRecord, error } = await client
    .from('login_records')
    .insert({
      id,
      uid: data.uid,
      device: data.device,
      os: data.os || 'Unknown',
      browser: data.browser || 'Unknown',
      location: data.location || 'Unknown',
      ip: data.ip || 'Unknown',
      status: data.status,
    })
    .select()
    .single();
  
  if (error || !newRecord) {
    console.error('创建登录记录失败:', error);
    throw new Error('创建登录记录失败');
  }
  
  return {
    id: newRecord.id,
    uid: newRecord.uid,
    device: newRecord.device,
    os: newRecord.os,
    browser: newRecord.browser,
    location: newRecord.location,
    ip: newRecord.ip,
    status: newRecord.status,
    createdAt: newRecord.created_at,
  };
}

// ========== 兑换码相关 API ==========

export interface RedemptionCode {
  id: number;
  code: string;
  createdBy: string;
  createdByUsername: string | null;
  type: string;
  rewardType: string;
  rewardDays: number;
  rewardPower: number;
  maxUses: number;
  usedCount: number;
  usedBy: number[];
  status: 'active' | 'used' | 'expired';
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 兑换码类型前缀映射
const CODE_TYPE_PREFIX: Record<string, string> = {
  'trial': 'TRY',      // 体验版
  'monthly': 'MON',    // 月度
  'yearly': 'YEA',     // 年度
  'power': 'PWR',      // 算力包
  'custom': 'CUS',     // 自定义
};

// 通用重试工具函数
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: boolean;
    logLabel?: string;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 500, backoff = true, logLabel = '操作' } = options;
  
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[${logLabel}] 第${i + 1}次尝试失败:`, error);
      
      if (i < retries - 1) {
        const waitTime = backoff ? delay * Math.pow(2, i) : delay;
        console.log(`[${logLabel}] 等待 ${waitTime}ms 后重试...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }
  
  throw lastError || new Error(`${logLabel}失败，已重试${retries}次`);
}

// 生成兑换码（支持前缀）
function generateRedemptionCode(type?: string): string {
  const prefix = type ? (CODE_TYPE_PREFIX[type] || 'CUS') : '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomLength = prefix ? 10 : 12;  // 有前缀时随机部分10位，无前缀12位
  let randomPart = '';
  for (let i = 0; i < randomLength; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

// 解析兑换码前缀类型
function parseCodePrefix(code: string): string | null {
  const parts = code.toUpperCase().split('-');
  if (parts.length === 2) {
    const prefix = parts[0];
    const typeMap: Record<string, string> = {
      'TRY': 'trial',
      'MON': 'monthly',
      'YEA': 'yearly',
      'PWR': 'power',
      'CUS': 'custom',
    };
    return typeMap[prefix] || null;
  }
  return null;  // 无前缀的老格式兑换码
}

// 创建兑换码（管理员专用）- 单个创建保留用于兼容
export async function createRedemptionCode(data: {
  createdBy: string;
  createdByUsername: string;
  type?: string;
  rewardType?: string;
  rewardDays?: number;
  rewardPower?: number;
  maxUses?: number;
  expiresAt?: string | null;
}): Promise<RedemptionCode> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  
  const code = generateRedemptionCode(data.type);
  
  const { data: newCode, error } = await client
    .from('redemption_codes')
    .insert({
      code,
      created_by: data.createdBy,
      created_by_username: data.createdByUsername,
      type: data.type || 'trial',
      reward_type: data.rewardType || 'membership',
      reward_days: data.rewardDays ?? 1,
      reward_power: data.rewardPower ?? 1000,
      max_uses: data.maxUses ?? 1,
      used_count: 0,
      used_by: [],
      status: 'active',
      expires_at: data.expiresAt || null,
    })
    .select()
    .single();
  
  if (error || !newCode) {
    console.error('创建兑换码失败:', error);
    throw new Error('创建兑换码失败');
  }
  
  return {
    id: newCode.id,
    code: newCode.code,
    createdBy: newCode.created_by,
    createdByUsername: newCode.created_by_username,
    type: newCode.type,
    rewardType: newCode.reward_type,
    rewardDays: newCode.reward_days,
    rewardPower: newCode.reward_power,
    maxUses: newCode.max_uses,
    usedCount: newCode.used_count,
    usedBy: newCode.used_by || [],
    status: newCode.status,
    expiresAt: newCode.expires_at,
    createdAt: newCode.created_at,
    updatedAt: newCode.updated_at,
  };
}

// 批量创建兑换码 - 优化为单次批量插入
export async function createRedemptionCodes(data: {
  createdBy: string;
  createdByUsername: string;
  count: number;
  type?: string;
  rewardType?: string;
  rewardDays?: number;
  rewardPower?: number;
  maxUses?: number;
  expiresAt?: string | null;
}): Promise<RedemptionCode[]> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  const type = data.type || 'trial';
  
  // 预先生成所有兑换码数据（确保唯一性）
  const codesSet = new Set<string>();
  const codesToInsert: any[] = [];
  
  while (codesSet.size < data.count) {
    const code = generateRedemptionCode(type);
    if (!codesSet.has(code)) {
      codesSet.add(code);
      codesToInsert.push({
        code,
        created_by: data.createdBy,
        created_by_username: data.createdByUsername,
        type,
        reward_type: data.rewardType || 'membership',
        reward_days: data.rewardDays ?? 1,
        reward_power: data.rewardPower ?? 1000,
        max_uses: data.maxUses ?? 1,
        used_count: 0,
        used_by: [],
        status: 'active',
        expires_at: data.expiresAt || null,
      });
    }
  }
  
  // 使用重试机制进行批量插入
  // 如果数量过大（>50），分批插入以提高稳定性
  const BATCH_SIZE = 50;
  const allInsertedCodes: any[] = [];
  
  for (let i = 0; i < codesToInsert.length; i += BATCH_SIZE) {
    const batch = codesToInsert.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(codesToInsert.length / BATCH_SIZE);
    
    console.log(`[兑换码生成] 正在插入第 ${batchNum}/${totalBatches} 批，共 ${batch.length} 条`);
    
    try {
      const insertedBatch = await withRetry(
        async () => {
          const { data: inserted, error } = await client
            .from('redemption_codes')
            .insert(batch)
            .select();
          
          if (error) {
            console.error(`[兑换码生成] 批量插入失败:`, error);
            // 返回详细错误信息，包括字段长度
            const fieldLengths = batch.map(item => ({
              code: item.code?.length,
              created_by: item.created_by?.length,
              created_by_username: item.created_by_username?.length,
              type: item.type?.length,
              reward_type: item.reward_type?.length,
              status: item.status?.length,
            }));
            console.error(`[兑换码生成] 字段长度:`, fieldLengths);
            throw new Error(`批量插入失败: ${error.message} | 字段长度: ${JSON.stringify(fieldLengths[0])}`);
          }
          
          return inserted;
        },
        {
          retries: 3,
          delay: 800,
          backoff: true,
          logLabel: `兑换码批量插入[${batchNum}/${totalBatches}]`,
        }
      );
      
      allInsertedCodes.push(...insertedBatch);
    } catch (error) {
      console.error(`[兑换码生成] 第 ${batchNum} 批插入最终失败:`, error);
      // 即使部分失败，也返回已成功插入的码
      if (allInsertedCodes.length > 0) {
        console.log(`[兑换码生成] 已成功插入 ${allInsertedCodes.length} 个兑换码`);
      }
      throw new Error(`生成兑换码失败：第 ${batchNum} 批插入失败，已成功 ${allInsertedCodes.length} 个`);
    }
  }
  
  console.log(`[兑换码生成] 成功插入 ${allInsertedCodes.length} 个兑换码`);
  
  // 转换为 RedemptionCode 格式
  return allInsertedCodes.map((row: any) => ({
    id: row.id,
    code: row.code,
    createdBy: row.created_by,
    createdByUsername: row.created_by_username,
    type: row.type,
    rewardType: row.reward_type,
    rewardDays: row.reward_days,
    rewardPower: row.reward_power,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    usedBy: row.used_by || [],
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// 根据兑换码获取信息
export async function getRedemptionCodeByCode(code: string): Promise<RedemptionCode | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('redemption_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    code: data.code,
    createdBy: data.created_by,
    createdByUsername: data.created_by_username,
    type: data.type,
    rewardType: data.reward_type,
    rewardDays: data.reward_days,
    rewardPower: data.reward_power,
    maxUses: data.max_uses,
    usedCount: data.used_count,
    usedBy: data.used_by || [],
    status: data.status,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// 使用兑换码
export async function redeemRedemptionCode(code: string, userId: number): Promise<{ 
  success: boolean; 
  error?: string;
  codeId?: number;
  reward?: {
    type: string;
    codeType: string;  // 兑换码类型：trial/monthly/yearly
    days: number;
    power: number;
  };
}> {
  const client = getSupabaseClient();
  
  // 获取兑换码
  const redemptionCode = await getRedemptionCodeByCode(code);
  
  if (!redemptionCode) {
    return { success: false, error: '兑换码无效' };
  }
  
  // 检查状态
  if (redemptionCode.status !== 'active') {
    return { success: false, error: '兑换码已失效' };
  }
  
  // 检查是否过期
  if (redemptionCode.expiresAt && new Date(redemptionCode.expiresAt) < new Date()) {
    return { success: false, error: '兑换码已过期' };
  }
  
  // 检查使用次数
  if (redemptionCode.usedCount >= redemptionCode.maxUses) {
    return { success: false, error: '兑换码已被使用' };
  }
  
  // 检查用户是否已使用过
  if (redemptionCode.usedBy.includes(userId)) {
    return { success: false, error: '您已使用过此兑换码' };
  }
  
  // 更新兑换码状态
  const newUsedBy = [...redemptionCode.usedBy, userId];
  const newUsedCount = redemptionCode.usedCount + 1;
  const newStatus = newUsedCount >= redemptionCode.maxUses ? 'used' : 'active';
  
  const { error: updateError } = await client
    .from('redemption_codes')
    .update({
      used_count: newUsedCount,
      used_by: newUsedBy,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', redemptionCode.id);
  
  if (updateError) {
    console.error('更新兑换码状态失败:', updateError);
    return { success: false, error: '兑换失败，请重试' };
  }
  
  return { 
    success: true, 
    codeId: redemptionCode.id,
    reward: {
      type: redemptionCode.rewardType,
      codeType: redemptionCode.type,  // 兑换码类型：trial/monthly/yearly
      days: redemptionCode.rewardDays,
      power: redemptionCode.rewardPower,
    }
  };
}

// 获取兑换码列表（管理员专用）
export async function getRedemptionCodes(limit: number = 50): Promise<RedemptionCode[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('redemption_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('获取兑换码列表失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    code: row.code,
    createdBy: row.created_by,
    createdByUsername: row.created_by_username,
    type: row.type,
    rewardType: row.reward_type,
    rewardDays: row.reward_days,
    rewardPower: row.reward_power,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    usedBy: row.used_by || [],
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// ========== 产品档案相关 API ==========

// 获取用户的产品档案列表
export async function getProductProfilesByUid(uid: string): Promise<ProductProfile[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('product_profiles')
    .select('*')
    .eq('uid', uid)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取产品档案列表失败:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    name: row.name,
    category: row.category || 'other',
    price: row.price,
    sellingPoints: row.selling_points || [],
    targetUsers: row.target_users,
    userPainPoints: row.user_pain_points,
    usageScenario: row.usage_scenario,
    promotion: row.promotion,
    brandStory: row.brand_story,
    competitorAnalysis: row.competitor_analysis,
    aiPositioning: row.ai_positioning,
    // 扩展字段
    userAgeRange: row.user_age_range,
    userGender: row.user_gender,
    userConsumptionLevel: row.user_consumption_level,
    userInterests: row.user_interests,
    valueLadderBasic: row.value_ladder_basic,
    valueLadderAdvanced: row.value_ladder_advanced,
    valueLadderTop: row.value_ladder_top,
    painPointsJson: row.pain_points_json,
    purchaseBarriersJson: row.purchase_barriers_json,
    trustProofSales: row.trust_proof_sales,
    trustProofRatings: row.trust_proof_ratings,
    trustProofCertifications: row.trust_proof_certifications,
    trustProofCases: row.trust_proof_cases,
    trustProofEndorsements: row.trust_proof_endorsements,
    analysisCompleted: row.analysis_completed || false,
    analysisAt: row.analysis_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// 根据ID获取产品档案
export async function getProductProfileById(id: number): Promise<ProductProfile | undefined> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('product_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return undefined;

  return {
    id: data.id,
    uid: data.uid,
    name: data.name,
    category: data.category || 'other',
    price: data.price,
    sellingPoints: data.selling_points || [],
    targetUsers: data.target_users,
    userPainPoints: data.user_pain_points,
    usageScenario: data.usage_scenario,
    promotion: data.promotion,
    brandStory: data.brand_story,
    competitorAnalysis: data.competitor_analysis,
    aiPositioning: data.ai_positioning,
    // 扩展字段
    userAgeRange: data.user_age_range,
    userGender: data.user_gender,
    userConsumptionLevel: data.user_consumption_level,
    userInterests: data.user_interests,
    valueLadderBasic: data.value_ladder_basic,
    valueLadderAdvanced: data.value_ladder_advanced,
    valueLadderTop: data.value_ladder_top,
    painPointsJson: data.pain_points_json,
    purchaseBarriersJson: data.purchase_barriers_json,
    trustProofSales: data.trust_proof_sales,
    trustProofRatings: data.trust_proof_ratings,
    trustProofCertifications: data.trust_proof_certifications,
    trustProofCases: data.trust_proof_cases,
    trustProofEndorsements: data.trust_proof_endorsements,
    analysisCompleted: data.analysis_completed || false,
    analysisAt: data.analysis_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// 创建产品档案
export async function createProductProfile(data: {
  uid: string;
  name: string;
  category?: string;
  price?: string;
  sellingPoints?: string[];
  targetUsers?: string;
  userPainPoints?: string;
  usageScenario?: string;
  promotion?: string;
  brandStory?: string;
  competitorAnalysis?: string;
  aiPositioning?: string;
}): Promise<ProductProfile> {
  const client = getSupabaseClient();

  const { data: newProfile, error } = await client
    .from('product_profiles')
    .insert({
      uid: data.uid,
      name: data.name,
      category: data.category || 'other',
      price: data.price || null,
      selling_points: data.sellingPoints || [],
      target_users: data.targetUsers || null,
      user_pain_points: data.userPainPoints || null,
      usage_scenario: data.usageScenario || null,
      promotion: data.promotion || null,
      brand_story: data.brandStory || null,
      competitor_analysis: data.competitorAnalysis || null,
      ai_positioning: data.aiPositioning || null,
    })
    .select()
    .single();

  if (error || !newProfile) {
    console.error('创建产品档案失败:', error);
    throw new Error('创建产品档案失败');
  }

  return {
    id: newProfile.id,
    uid: newProfile.uid,
    name: newProfile.name,
    category: newProfile.category || 'other',
    price: newProfile.price,
    sellingPoints: newProfile.selling_points || [],
    targetUsers: newProfile.target_users,
    userPainPoints: newProfile.user_pain_points,
    usageScenario: newProfile.usage_scenario,
    promotion: newProfile.promotion,
    brandStory: newProfile.brand_story,
    competitorAnalysis: newProfile.competitor_analysis,
    aiPositioning: newProfile.ai_positioning,
    // 扩展字段（新创建时为空）
    userAgeRange: newProfile.user_age_range || null,
    userGender: newProfile.user_gender || null,
    userConsumptionLevel: newProfile.user_consumption_level || null,
    userInterests: newProfile.user_interests || null,
    valueLadderBasic: newProfile.value_ladder_basic || null,
    valueLadderAdvanced: newProfile.value_ladder_advanced || null,
    valueLadderTop: newProfile.value_ladder_top || null,
    painPointsJson: newProfile.pain_points_json || null,
    purchaseBarriersJson: newProfile.purchase_barriers_json || null,
    trustProofSales: newProfile.trust_proof_sales || null,
    trustProofRatings: newProfile.trust_proof_ratings || null,
    trustProofCertifications: newProfile.trust_proof_certifications || null,
    trustProofCases: newProfile.trust_proof_cases || null,
    trustProofEndorsements: newProfile.trust_proof_endorsements || null,
    analysisCompleted: newProfile.analysis_completed || false,
    analysisAt: newProfile.analysis_at || null,
    createdAt: newProfile.created_at,
    updatedAt: newProfile.updated_at,
  };
}

// 更新产品档案
export async function updateProductProfile(
  id: number,
  data: Partial<Omit<ProductProfile, 'id' | 'uid' | 'createdAt'>>
): Promise<ProductProfile | null> {
  const client = getSupabaseClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  // 基础字段
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.sellingPoints !== undefined) updateData.selling_points = data.sellingPoints;
  if (data.targetUsers !== undefined) updateData.target_users = data.targetUsers;
  if (data.userPainPoints !== undefined) updateData.user_pain_points = data.userPainPoints;
  if (data.usageScenario !== undefined) updateData.usage_scenario = data.usageScenario;
  if (data.promotion !== undefined) updateData.promotion = data.promotion;
  if (data.brandStory !== undefined) updateData.brand_story = data.brandStory;
  if (data.competitorAnalysis !== undefined) updateData.competitor_analysis = data.competitorAnalysis;
  if (data.aiPositioning !== undefined) updateData.ai_positioning = data.aiPositioning;
  
  // 扩展字段 - 用户画像
  if (data.userAgeRange !== undefined) updateData.user_age_range = data.userAgeRange;
  if (data.userGender !== undefined) updateData.user_gender = data.userGender;
  if (data.userConsumptionLevel !== undefined) updateData.user_consumption_level = data.userConsumptionLevel;
  if (data.userInterests !== undefined) updateData.user_interests = data.userInterests;
  
  // 扩展字段 - 价值阶梯
  if (data.valueLadderBasic !== undefined) updateData.value_ladder_basic = data.valueLadderBasic;
  if (data.valueLadderAdvanced !== undefined) updateData.value_ladder_advanced = data.valueLadderAdvanced;
  if (data.valueLadderTop !== undefined) updateData.value_ladder_top = data.valueLadderTop;
  
  // 扩展字段 - 痛点和阻力
  if (data.painPointsJson !== undefined) updateData.pain_points_json = data.painPointsJson;
  if (data.purchaseBarriersJson !== undefined) updateData.purchase_barriers_json = data.purchaseBarriersJson;
  
  // 扩展字段 - 信任背书
  if (data.trustProofSales !== undefined) updateData.trust_proof_sales = data.trustProofSales;
  if (data.trustProofRatings !== undefined) updateData.trust_proof_ratings = data.trustProofRatings;
  if (data.trustProofCertifications !== undefined) updateData.trust_proof_certifications = data.trustProofCertifications;
  if (data.trustProofCases !== undefined) updateData.trust_proof_cases = data.trustProofCases;
  if (data.trustProofEndorsements !== undefined) updateData.trust_proof_endorsements = data.trustProofEndorsements;
  
  // 分析状态
  if (data.analysisCompleted !== undefined) updateData.analysis_completed = data.analysisCompleted;
  if (data.analysisAt !== undefined) updateData.analysis_at = data.analysisAt;

  const { data: updatedProfile, error } = await client
    .from('product_profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updatedProfile) {
    console.error('更新产品档案失败:', error);
    return null;
  }

  return {
    id: updatedProfile.id,
    uid: updatedProfile.uid,
    name: updatedProfile.name,
    category: updatedProfile.category || 'other',
    price: updatedProfile.price,
    sellingPoints: updatedProfile.selling_points || [],
    targetUsers: updatedProfile.target_users,
    userPainPoints: updatedProfile.user_pain_points,
    usageScenario: updatedProfile.usage_scenario,
    promotion: updatedProfile.promotion,
    brandStory: updatedProfile.brand_story,
    competitorAnalysis: updatedProfile.competitor_analysis,
    aiPositioning: updatedProfile.ai_positioning,
    // 扩展字段
    userAgeRange: updatedProfile.user_age_range,
    userGender: updatedProfile.user_gender,
    userConsumptionLevel: updatedProfile.user_consumption_level,
    userInterests: updatedProfile.user_interests,
    valueLadderBasic: updatedProfile.value_ladder_basic,
    valueLadderAdvanced: updatedProfile.value_ladder_advanced,
    valueLadderTop: updatedProfile.value_ladder_top,
    painPointsJson: updatedProfile.pain_points_json,
    purchaseBarriersJson: updatedProfile.purchase_barriers_json,
    trustProofSales: updatedProfile.trust_proof_sales,
    trustProofRatings: updatedProfile.trust_proof_ratings,
    trustProofCertifications: updatedProfile.trust_proof_certifications,
    trustProofCases: updatedProfile.trust_proof_cases,
    trustProofEndorsements: updatedProfile.trust_proof_endorsements,
    analysisCompleted: updatedProfile.analysis_completed || false,
    analysisAt: updatedProfile.analysis_at,
    createdAt: updatedProfile.created_at,
    updatedAt: updatedProfile.updated_at,
  };
}

// 删除产品档案
export async function deleteProductProfile(id: number, uid?: string): Promise<boolean> {
  const client = getSupabaseClient();

  // 如果指定了 uid，先验证产品档案属于该用户
  if (uid) {
    const { data: profile } = await client
      .from('product_profiles')
      .select('uid')
      .eq('id', id)
      .single();

    if (!profile || profile.uid !== uid) {
      return false;
    }
  }

  const { error } = await client
    .from('product_profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除产品档案失败:', error);
    return false;
  }

  return true;
}

// 获取用户的产品档案数量
export async function getProductProfileCountByUser(uid: string): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('product_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('uid', uid);

  if (error) {
    console.error('获取产品档案数量失败:', error);
    return 0;
  }

  return count || 0;
}

// ========== 灵感收集相关 API ==========

export interface Inspiration {
  id: number;
  uid: string;
  content: string;
  imageUrl: string | null;
  link: string | null;
  category: 'topic' | 'expression' | 'format' | 'trend';
  tags: string[];
  expansionType: string | null;
  expansionResult: string | null;
  status: 'draft' | 'converted' | 'archived';
  convertedTo: {
    type: 'topic' | 'script' | null;
    id: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// 创建灵感
export async function createInspiration(data: {
  uid: string;
  content: string;
  imageUrl?: string | null;
  link?: string | null;
  category?: 'topic' | 'expression' | 'format' | 'trend';
  tags?: string[];
  expansionType?: string | null;
  expansionResult?: string | null;
}): Promise<Inspiration> {
  const client = getSupabaseClient();

  const { data: newInspiration, error } = await client
    .from('inspirations')
    .insert({
      uid: data.uid,
      content: data.content,
      image_url: data.imageUrl || null,
      link: data.link || null,
      category: data.category || 'topic',
      tags: data.tags || [],
      expansion_type: data.expansionType || null,
      expansion_result: data.expansionResult || null,
      status: 'draft',
      converted_to: null,
    })
    .select()
    .single();

  if (error || !newInspiration) {
    console.error('创建灵感失败:', error);
    throw new Error('创建灵感失败');
  }

  return {
    id: newInspiration.id,
    uid: newInspiration.uid,
    content: newInspiration.content,
    imageUrl: newInspiration.image_url,
    link: newInspiration.link,
    category: newInspiration.category,
    tags: newInspiration.tags || [],
    expansionType: newInspiration.expansion_type,
    expansionResult: newInspiration.expansion_result,
    status: newInspiration.status,
    convertedTo: newInspiration.converted_to,
    createdAt: newInspiration.created_at,
    updatedAt: newInspiration.updated_at,
  };
}

// 获取用户的灵感列表
export async function getInspirationsByUid(uid: string, limit: number = 50): Promise<Inspiration[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('inspirations')
    .select('*')
    .eq('uid', uid)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取灵感列表失败:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    content: row.content,
    imageUrl: row.image_url,
    link: row.link,
    category: row.category,
    tags: row.tags || [],
    expansionType: row.expansion_type,
    expansionResult: row.expansion_result,
    status: row.status,
    convertedTo: row.converted_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// 获取单个灵感
export async function getInspirationById(id: number): Promise<Inspiration | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('inspirations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    uid: data.uid,
    content: data.content,
    imageUrl: data.image_url,
    link: data.link,
    category: data.category,
    tags: data.tags || [],
    expansionType: data.expansion_type,
    expansionResult: data.expansion_result,
    status: data.status,
    convertedTo: data.converted_to,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// 更新灵感
export async function updateInspiration(id: number, data: Partial<{
  content: string;
  imageUrl: string | null;
  link: string | null;
  category: 'topic' | 'expression' | 'format' | 'trend';
  tags: string[];
  expansionType: string | null;
  expansionResult: string | null;
  status: 'draft' | 'converted' | 'archived';
  convertedTo: { type: 'topic' | 'script' | null; id: number | null } | null;
}>): Promise<Inspiration | null> {
  const client = getSupabaseClient();

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (data.content !== undefined) updateData.content = data.content;
  if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
  if (data.link !== undefined) updateData.link = data.link;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.expansionType !== undefined) updateData.expansion_type = data.expansionType;
  if (data.expansionResult !== undefined) updateData.expansion_result = data.expansionResult;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.convertedTo !== undefined) updateData.converted_to = data.convertedTo;

  const { data: updated, error } = await client
    .from('inspirations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !updated) {
    console.error('更新灵感失败:', error);
    return null;
  }

  return {
    id: updated.id,
    uid: updated.uid,
    content: updated.content,
    imageUrl: updated.image_url,
    link: updated.link,
    category: updated.category,
    tags: updated.tags || [],
    expansionType: updated.expansion_type,
    expansionResult: updated.expansion_result,
    status: updated.status,
    convertedTo: updated.converted_to,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

// 删除灵感
export async function deleteInspiration(id: number, uid?: string): Promise<boolean> {
  const client = getSupabaseClient();

  if (uid) {
    const { data: inspiration } = await client
      .from('inspirations')
      .select('uid')
      .eq('id', id)
      .single();

    if (!inspiration || inspiration.uid !== uid) {
      return false;
    }
  }

  const { error } = await client
    .from('inspirations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除灵感失败:', error);
    return false;
  }

  return true;
}

// ========== 视频分析历史相关 API ==========

// 任务状态枚举
export type VideoAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoAnalysisHistory {
  id: number;
  userId: number;
  
  // 任务状态
  status: VideoAnalysisStatus;
  progress: number; // 0-100
  progressMessage: string | null; // 进度提示信息
  errorMessage: string | null; // 错误信息
  
  // 视频基础信息
  videoUrl: string;
  videoTitle: string | null;
  videoCover: string | null;
  platform: string;
  platformName: string | null;
  
  // 作者信息
  author: string | null;
  authorId: string | null;
  authorAvatar: string | null;
  
  // 互动数据
  likes: number;
  comments: number;
  shares: number;
  collects: number;
  views: number;
  
  // 口播文案
  scriptContent: string | null;
  
  // 分析报告
  analysisReport: string | null;
  
  // 综合评分
  totalScore: number | null;
  
  createdAt: string;
  updatedAt: string;
}

// 创建视频分析任务（支持异步模式）
export async function createVideoAnalysisTask(data: {
  userId: number;
  videoUrl: string;
  videoTitle?: string;
  videoCover?: string;
  platform: string;
  platformName?: string;
  status?: VideoAnalysisStatus;
  progress?: number;
  progressMessage?: string;
}): Promise<VideoAnalysisHistory> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  
  const { data: newHistory, error } = await client
    .from('video_analysis_history')
    .insert({
      user_id: data.userId,
      video_url: data.videoUrl,
      video_title: data.videoTitle || null,
      video_cover: data.videoCover || null,
      platform: data.platform,
      platform_name: data.platformName || null,
      status: data.status || 'pending',
      progress: data.progress || 0,
      progress_message: data.progressMessage || '等待处理',
      error_message: null,
      // 其他字段使用默认值
      likes: 0,
      comments: 0,
      shares: 0,
      collects: 0,
      views: 0,
    })
    .select()
    .single();
  
  if (error || !newHistory) {
    console.error('创建视频分析任务失败:', {
      error: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      userId: data.userId,
      platform: data.platform,
    });
    throw new Error(`创建视频分析任务失败: ${error?.message || '未知错误'}`);
  }
  
  return mapVideoAnalysisRow(newHistory);
}

// 创建视频分析历史（兼容旧代码）
export async function createVideoAnalysisHistory(data: {
  userId: number;
  videoUrl: string;
  videoTitle?: string;
  videoCover?: string;
  platform: string;
  platformName?: string;
  author?: string;
  authorId?: string;
  authorAvatar?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  collects?: number;
  views?: number;
  scriptContent?: string;
  analysisReport?: string;
  totalScore?: number;
}): Promise<VideoAnalysisHistory> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  
  const { data: newHistory, error } = await client
    .from('video_analysis_history')
    .insert({
      user_id: data.userId,
      video_url: data.videoUrl,
      video_title: data.videoTitle || null,
      video_cover: data.videoCover || null,
      platform: data.platform,
      platform_name: data.platformName || null,
      author: data.author || null,
      author_id: data.authorId || null,
      author_avatar: data.authorAvatar || null,
      likes: data.likes || 0,
      comments: data.comments || 0,
      shares: data.shares || 0,
      collects: data.collects || 0,
      views: data.views || 0,
      script_content: data.scriptContent || null,
      analysis_report: data.analysisReport || null,
      total_score: data.totalScore?.toString() || null,
      status: 'completed', // 兼容旧代码，直接标记为完成
      progress: 100,
      progress_message: '分析完成',
    })
    .select()
    .single();
  
  if (error || !newHistory) {
    console.error('创建视频分析历史失败:', error);
    throw new Error('创建视频分析历史失败');
  }
  
  return mapVideoAnalysisRow(newHistory);
}

// 更新视频分析任务状态
export async function updateVideoAnalysisTask(
  id: number,
  data: {
    status?: VideoAnalysisStatus;
    progress?: number;
    progressMessage?: string;
    errorMessage?: string;
    videoTitle?: string;
    videoCover?: string;
    author?: string;
    authorId?: string;
    authorAvatar?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    collects?: number;
    views?: number;
    scriptContent?: string;
    analysisReport?: string;
    totalScore?: number;
  }
): Promise<VideoAnalysisHistory | null> {
  const client = getSupabaseClient();
  
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  
  if (data.status !== undefined) updateData.status = data.status;
  if (data.progress !== undefined) updateData.progress = data.progress;
  if (data.progressMessage !== undefined) updateData.progress_message = data.progressMessage;
  if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage;
  if (data.videoTitle !== undefined) updateData.video_title = data.videoTitle;
  if (data.videoCover !== undefined) updateData.video_cover = data.videoCover;
  if (data.author !== undefined) updateData.author = data.author;
  if (data.authorId !== undefined) updateData.author_id = data.authorId;
  if (data.authorAvatar !== undefined) updateData.author_avatar = data.authorAvatar;
  if (data.likes !== undefined) updateData.likes = data.likes;
  if (data.comments !== undefined) updateData.comments = data.comments;
  if (data.shares !== undefined) updateData.shares = data.shares;
  if (data.collects !== undefined) updateData.collects = data.collects;
  if (data.views !== undefined) updateData.views = data.views;
  if (data.scriptContent !== undefined) updateData.script_content = data.scriptContent;
  if (data.analysisReport !== undefined) updateData.analysis_report = data.analysisReport;
  if (data.totalScore !== undefined) updateData.total_score = data.totalScore?.toString();
  
  const { data: updated, error } = await client
    .from('video_analysis_history')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error || !updated) {
    console.error('更新视频分析任务失败:', error);
    return null;
  }
  
  return mapVideoAnalysisRow(updated);
}

// 映射数据库行到类型
function mapVideoAnalysisRow(row: any): VideoAnalysisHistory {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status || 'pending',
    progress: row.progress || 0,
    progressMessage: row.progress_message,
    errorMessage: row.error_message,
    videoUrl: row.video_url,
    videoTitle: row.video_title,
    videoCover: row.video_cover,
    platform: row.platform,
    platformName: row.platform_name,
    author: row.author,
    authorId: row.author_id,
    authorAvatar: row.author_avatar,
    likes: row.likes,
    comments: row.comments,
    shares: row.shares,
    collects: row.collects,
    views: row.views,
    scriptContent: row.script_content,
    analysisReport: row.analysis_report,
    totalScore: row.total_score ? parseFloat(row.total_score) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

// 获取用户的视频分析历史
export async function getVideoAnalysisHistoryByUserId(userId: number, limit: number = 20): Promise<VideoAnalysisHistory[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('video_analysis_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('获取视频分析历史失败:', error);
    return [];
  }
  
  return (data || []).map(row => mapVideoAnalysisRow(row));
}

// 获取单条视频分析历史
export async function getVideoAnalysisHistoryById(id: number, userId?: number): Promise<VideoAnalysisHistory | null> {
  const client = getSupabaseClient();
  
  let query = client
    .from('video_analysis_history')
    .select('*')
    .eq('id', id);
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query.single();
  
  if (error || !data) return null;
  
  return mapVideoAnalysisRow(data);
}

// 删除视频分析历史
export async function deleteVideoAnalysisHistory(id: number, userId: number): Promise<boolean> {
  const client = getSupabaseClient();
  
  const { error } = await client
    .from('video_analysis_history')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  
  if (error) {
    console.error('删除视频分析历史失败:', error);
    return false;
  }
  
  return true;
}

// 获取用户视频分析历史数量
export async function getVideoAnalysisHistoryCount(userId: number): Promise<number> {
  const client = getSupabaseClient();
  const { count, error } = await client
    .from('video_analysis_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) {
    console.error('获取视频分析历史数量失败:', error);
    return 0;
  }
  
  return count || 0;
}


// ========== 操作日志相关 API ==========

// 创建操作日志
export async function createOperationLog(data: {
  operatorId: number;
  operatorUid: string;
  operatorName: string;
  operatorRole: string;
  actionType: string;
  targetType?: string;
  targetId?: number;
  targetName?: string;
  targetUid?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<OperationLog | null> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const client = getSupabaseClient();
  
  const { data: log, error } = await client
    .from('operation_logs')
    .insert({
      operator_id: data.operatorId,
      operator_uid: data.operatorUid,
      operator_name: data.operatorName,
      operator_role: data.operatorRole,
      action_type: data.actionType,
      target_type: data.targetType || null,
      target_id: data.targetId || null,
      target_name: data.targetName || null,
      target_uid: data.targetUid || null,
      details: data.details || null,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('创建操作日志失败:', error);
    return null;
  }
  
  return {
    id: log.id,
    operatorId: log.operator_id,
    operatorUid: log.operator_uid,
    operatorName: log.operator_name,
    operatorRole: log.operator_role,
    actionType: log.action_type,
    targetType: log.target_type,
    targetId: log.target_id,
    targetName: log.target_name,
    targetUid: log.target_uid,
    details: log.details,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    createdAt: log.created_at,
  };
}

// 获取操作日志列表
export async function getOperationLogs(params: {
  page?: number;
  pageSize?: number;
  operatorId?: number;
  actionType?: string;
  targetType?: string;
  targetId?: number;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}): Promise<{ logs: OperationLog[]; total: number }> {
  const client = getSupabaseClient();
  const { page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;
  
  let query = client
    .from('operation_logs')
    .select('*', { count: 'exact' });
  
  // 筛选条件
  if (params.operatorId) {
    query = query.eq('operator_id', params.operatorId);
  }
  if (params.actionType) {
    query = query.eq('action_type', params.actionType);
  }
  if (params.targetType) {
    query = query.eq('target_type', params.targetType);
  }
  if (params.targetId) {
    query = query.eq('target_id', params.targetId);
  }
  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('created_at', params.endDate + 'T23:59:59');
  }
  if (params.keyword) {
    query = query.or(`operator_name.ilike.%${params.keyword}%,target_name.ilike.%${params.keyword}%,target_uid.ilike.%${params.keyword}%`);
  }
  
  // 排序和分页
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('获取操作日志失败:', error);
    return { logs: [], total: 0 };
  }
  
  return {
    logs: (data || []).map(row => ({
      id: row.id,
      operatorId: row.operator_id,
      operatorUid: row.operator_uid,
      operatorName: row.operator_name,
      operatorRole: row.operator_role,
      actionType: row.action_type,
      targetType: row.target_type,
      targetId: row.target_id,
      targetName: row.target_name,
      targetUid: row.target_uid,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    })),
    total: count || 0,
  };
}

// 获取操作日志详情
export async function getOperationLogById(id: number): Promise<OperationLog | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('operation_logs')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    operatorId: data.operator_id,
    operatorUid: data.operator_uid,
    operatorName: data.operator_name,
    operatorRole: data.operator_role,
    actionType: data.action_type,
    targetType: data.target_type,
    targetId: data.target_id,
    targetName: data.target_name,
    targetUid: data.target_uid,
    details: data.details,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    createdAt: data.created_at,
  };
}

// 获取所有操作日志（用于导出）
export async function getAllOperationLogs(params: {
  operatorId?: number;
  actionType?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}): Promise<OperationLog[]> {
  const client = getSupabaseClient();
  
  let query = client
    .from('operation_logs')
    .select('*');
  
  // 筛选条件
  if (params.operatorId) {
    query = query.eq('operator_id', params.operatorId);
  }
  if (params.actionType) {
    query = query.eq('action_type', params.actionType);
  }
  if (params.targetType) {
    query = query.eq('target_type', params.targetType);
  }
  if (params.startDate) {
    query = query.gte('created_at', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('created_at', params.endDate + 'T23:59:59');
  }
  if (params.keyword) {
    query = query.or(`operator_name.ilike.%${params.keyword}%,target_name.ilike.%${params.keyword}%,target_uid.ilike.%${params.keyword}%`);
  }
  
  // 排序
  query = query.order('created_at', { ascending: false }).limit(10000);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('获取所有操作日志失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    operatorId: row.operator_id,
    operatorUid: row.operator_uid,
    operatorName: row.operator_name,
    operatorRole: row.operator_role,
    actionType: row.action_type,
    targetType: row.target_type,
    targetId: row.target_id,
    targetName: row.target_name,
    targetUid: row.target_uid,
    details: row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}

// 获取操作类型统计
export async function getOperationLogStats(): Promise<{
  totalLogs: number;
  todayLogs: number;
  actionTypeStats: { actionType: string; count: number }[];
}> {
  const client = getSupabaseClient();
  
  // 总数
  const { count: totalLogs, error: totalError } = await client
    .from('operation_logs')
    .select('*', { count: 'exact', head: true });
  
  if (totalError) {
    console.error('获取操作日志总数失败:', totalError);
  }
  
  // 今日数量
  const today = new Date().toISOString().split('T')[0];
  const { count: todayLogs, error: todayError } = await client
    .from('operation_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);
  
  if (todayError) {
    console.error('获取今日操作日志数量失败:', todayError);
  }
  
  // 操作类型统计
  const { data: actionData, error: actionError } = await client
    .rpc('get_operation_log_action_stats');
  
  if (actionError) {
    // 如果RPC不存在，使用备用查询
    const { data: allLogs } = await client
      .from('operation_logs')
      .select('action_type');
    
    const actionTypeStats: { actionType: string; count: number }[] = [];
    const countMap = new Map<string, number>();
    
    (allLogs || []).forEach(log => {
      const count = countMap.get(log.action_type) || 0;
      countMap.set(log.action_type, count + 1);
    });
    
    countMap.forEach((count, actionType) => {
      actionTypeStats.push({ actionType, count });
    });
    
    return {
      totalLogs: totalLogs || 0,
      todayLogs: todayLogs || 0,
      actionTypeStats,
    };
  }
  
  return {
    totalLogs: totalLogs || 0,
    todayLogs: todayLogs || 0,
    actionTypeStats: (actionData || []).map((row: { action_type: string; count: number }) => ({
      actionType: row.action_type,
      count: row.count,
    })),
  };
}

// ========== 代理分销系统 API ==========

// 最高管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

// 代理账户扩展类型
export interface AgentAccountFull {
  id: number;
  userId: number;
  uid: string;
  agentPath: string;
  parentId: number | null;
  parentUid: string | null;
  commissionRate: number;
  platformRate: number | null;        // 平台分成比例
  agentLevel: number | null;          // 代理层级：0=总代, 1=一级代理, 2=二级代理
  canCreateCode: boolean | null;      // 是否能创建兑换码
  canCreateUser: boolean | null;      // 是否能创建用户
  referralCode: string | null;        // 推广码
  status: string;
  pointsBalance: number;              // 点数余额
  pointsTotal: number;                // 累计获得点数
  pointsUsed: number;                 // 累计使用点数
  inviteCount: number;
  paidUserCount: number;
  totalSales: number;
  totalCommission: number;
  settledAmount: number;
  pendingAmount: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

// 代理开通记录类型
export interface AgentSubscriptionRecord {
  id: number;
  agentId: number;
  agentUid: string;
  userId: number;
  userName: string | null;
  userPhone: string | null;
  planId: number;
  planName: string | null;
  originalPrice: number;
  commissionRate: number;
  commissionAmount: number;
  platformAmount: number;
  settlementStatus: string;
  settledAt: string | null;
  operatorIp: string | null;
  createdAt: string;
}

// 佣金记录类型
export interface CommissionRecord {
  id: number;
  userId: number;
  userName: string | null;
  planId: number | null;
  planName: string | null;
  originalPrice: number;
  sourceType: string;
  sourceId: number | null;
  beneficiaryId: number;
  beneficiaryUid: string;
  beneficiaryRole: string | null;
  amount: number;
  commissionRate: number | null;
  settlementStatus: string;
  settledAt: string | null;
  createdAt: string;
}

// 结算记录类型
export interface AgentSettlementRecord {
  id: number;
  agentId: number;
  agentUid: string;
  amount: number;
  commissionIds: number[];
  paymentMethod: string | null;
  paymentProof: string | null;
  status: string;
  confirmedBy: number | null;
  confirmedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
}

/**
 * 通过推广路径获取代理账户
 */
export async function getAgentByPath(agentPath: string): Promise<AgentAccountFull | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('agent_accounts')
    .select('*')
    .eq('agent_path', agentPath)
    .eq('status', 'active')
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    userId: data.user_id,
    uid: data.uid,
    agentPath: data.agent_path,
    parentId: data.parent_id,
    parentUid: data.parent_uid,
    agentLevel: data.agent_level !== null && data.agent_level !== undefined ? data.agent_level : (data.parent_id ? 2 : 1),
    commissionRate: parseFloat(data.commission_rate || '0.5'),
    platformRate: data.platform_rate ? parseFloat(data.platform_rate) : null,
    canCreateCode: data.can_create_code ?? !data.parent_id,
    canCreateUser: data.can_create_user ?? !data.parent_id,
    referralCode: data.referral_code,
    status: data.status,
    pointsBalance: data.points_balance || 0,
    pointsTotal: data.points_total || 0,
    pointsUsed: data.points_used || 0,
    inviteCount: data.invite_count || 0,
    paidUserCount: data.paid_user_count || 0,
    totalSales: parseFloat(data.total_sales || '0'),
    totalCommission: parseFloat(data.total_commission || '0'),
    settledAmount: parseFloat(data.settled_amount || '0'),
    pendingAmount: parseFloat(data.pending_amount || '0'),
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 通过用户ID获取代理账户
 */
export async function getAgentAccountByUserId(userId: number): Promise<AgentAccountFull | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('agent_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    userId: data.user_id,
    uid: data.uid,
    agentPath: data.agent_path,
    parentId: data.parent_id,
    parentUid: data.parent_uid,
    agentLevel: data.agent_level !== null && data.agent_level !== undefined ? data.agent_level : (data.parent_id ? 2 : 1),
    commissionRate: parseFloat(data.commission_rate || '0.5'),
    platformRate: data.platform_rate ? parseFloat(data.platform_rate) : null,
    canCreateCode: data.can_create_code ?? !data.parent_id,
    canCreateUser: data.can_create_user ?? !data.parent_id,
    referralCode: data.referral_code,
    status: data.status,
    pointsBalance: data.points_balance || 0,
    pointsTotal: data.points_total || 0,
    pointsUsed: data.points_used || 0,
    inviteCount: data.invite_count || 0,
    paidUserCount: data.paid_user_count || 0,
    totalSales: parseFloat(data.total_sales || '0'),
    totalCommission: parseFloat(data.total_commission || '0'),
    settledAmount: parseFloat(data.settled_amount || '0'),
    pendingAmount: parseFloat(data.pending_amount || '0'),
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 创建代理账户
 * 包含重试机制，解决数据库连接不稳定问题
 */
export async function createAgentAccount(data: {
  userId: number;
  uid: string;
  agentPath: string;
  parentId?: number;
  parentUid?: string;
  commissionRate?: number;
  platformRate?: number;
  agentLevel?: number;
  canCreateCode?: boolean;
  canCreateUser?: boolean;
  createdBy?: number;
}): Promise<AgentAccountFull | null> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const startTime = Date.now();
  console.log(`[创建代理账户] 开始创建: userId=${data.userId}, agentPath=${data.agentPath}`);
  
  let lastError: string | null = null;
  
  // 最多重试 5 次
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // 每次尝试都获取新的客户端（重试时重置缓存）
      if (attempt > 1) {
        resetSupabaseClient();
        console.log('[创建代理账户] 已重置客户端缓存，重新获取连接');
      }
      const client = getSupabaseClient();
      
      console.log(`[创建代理账户] 第${attempt}次尝试: 插入数据...`);
      const { data: account, error } = await client
        .from('agent_accounts')
        .insert({
          user_id: data.userId,
          uid: data.uid,
          agent_path: data.agentPath,
          parent_id: data.parentId || null,
          parent_uid: data.parentUid || null,
          commission_rate: data.commissionRate || 0.5,
          platform_rate: data.platformRate || 0.5,
          agent_level: data.agentLevel || (data.parentId ? 2 : 1),
          can_create_code: data.canCreateCode ?? !data.parentId,
          can_create_user: data.canCreateUser ?? !data.parentId,
          status: 'active',
          created_by: data.createdBy || null,
        })
        .select()
        .single();
      
      if (error) {
        console.error(`[创建代理账户] 插入失败: code=${error.code}, message=${error.message}`);
        
        // 唯一约束冲突
        if (error.code === '23505') {
          const errorMessage = error.message || '';
          if (errorMessage.includes('agent_path') || errorMessage.includes('agent_accounts_agent_path_key')) {
            console.log('[创建代理账户] 推广路径已存在');
            return null; // 路径冲突不重试
          }
          if (errorMessage.includes('user_id') || errorMessage.includes('agent_accounts_user_id_key')) {
            console.log('[创建代理账户] 该用户已是代理');
            return null; // 用户已是代理不重试
          }
          // 其他唯一约束冲突，尝试重试
          throw new Error('唯一约束冲突，尝试重试');
        }
        throw new Error(`插入失败: ${error.message}`);
      }
      
      if (!account) {
        throw new Error('创建成功但未返回数据');
      }
      
      const duration = Date.now() - startTime;
      console.log(`[创建代理账户] 成功: id=${account.id}, agentPath=${account.agent_path}, 耗时=${duration}ms${attempt > 1 ? ` (第${attempt}次尝试)` : ''}`);
      
      return {
        id: account.id,
        userId: account.user_id,
        uid: account.uid,
        agentPath: account.agent_path,
        parentId: account.parent_id,
        parentUid: account.parent_uid,
        agentLevel: account.agent_level !== null && account.agent_level !== undefined ? account.agent_level : (account.parent_id ? 2 : 1),
        commissionRate: parseFloat(account.commission_rate || '0.5'),
        platformRate: account.platform_rate ? parseFloat(account.platform_rate) : null,
        canCreateCode: account.can_create_code ?? !account.parent_id,
        canCreateUser: account.can_create_user ?? !account.parent_id,
        referralCode: account.referral_code,
        status: account.status,
        pointsBalance: account.points_balance || 0,
        pointsTotal: account.points_total || 0,
        pointsUsed: account.points_used || 0,
        inviteCount: account.invite_count || 0,
        paidUserCount: account.paid_user_count || 0,
        totalSales: parseFloat(account.total_sales || '0'),
        totalCommission: parseFloat(account.total_commission || '0'),
        settledAmount: parseFloat(account.settled_amount || '0'),
        pendingAmount: parseFloat(account.pending_amount || '0'),
        createdBy: account.created_by,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err.message;
      
      const duration = Date.now() - startTime;
      console.error(`[创建代理账户] 第 ${attempt} 次失败 (耗时 ${duration}ms):`, err.message);
      
      // 等待后重试
      if (attempt < 5) {
        const delay = attempt * 500;
        console.log(`[创建代理账户] ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  const duration = Date.now() - startTime;
  console.error(`[创建代理账户] 最终失败 (总耗时 ${duration}ms):`, lastError);
  
  return null;
}

/**
 * 更新代理账户信息
 * 包含重试机制
 */
export async function updateAgentAccount(
  agentId: number,
  data: {
    commissionRate?: number;
    platformRate?: number;
    agentLevel?: number;
    canCreateCode?: boolean;
    canCreateUser?: boolean;
    referralCode?: string;
    status?: string;
    parentId?: number;
    parentUid?: string;
    inviteCount?: number;
    paidUserCount?: number;
    totalSales?: number;
    totalCommission?: number;
    pendingAmount?: number;
    settledAmount?: number;
  }
): Promise<AgentAccountFull | null> {
  const startTime = Date.now();
  console.log(`[更新代理账户] 开始更新: agentId=${agentId}`);
  
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  
  if (data.commissionRate !== undefined) updateData.commission_rate = data.commissionRate;
  if (data.platformRate !== undefined) updateData.platform_rate = data.platformRate;
  if (data.agentLevel !== undefined) updateData.agent_level = data.agentLevel;
  if (data.canCreateCode !== undefined) updateData.can_create_code = data.canCreateCode;
  if (data.canCreateUser !== undefined) updateData.can_create_user = data.canCreateUser;
  if (data.referralCode !== undefined) updateData.referral_code = data.referralCode;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.parentId !== undefined) updateData.parent_id = data.parentId;
  if (data.parentUid !== undefined) updateData.parent_uid = data.parentUid;
  if (data.inviteCount !== undefined) updateData.invite_count = data.inviteCount;
  if (data.paidUserCount !== undefined) updateData.paid_user_count = data.paidUserCount;
  if (data.totalSales !== undefined) updateData.total_sales = data.totalSales.toString();
  if (data.totalCommission !== undefined) updateData.total_commission = data.totalCommission.toString();
  if (data.pendingAmount !== undefined) updateData.pending_amount = data.pendingAmount.toString();
  if (data.settledAmount !== undefined) updateData.settled_amount = data.settledAmount.toString();
  
  let lastError: string | null = null;
  
  // 最多重试 3 次
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        resetSupabaseClient();
        console.log('[更新代理账户] 已重置客户端缓存');
      }
      const client = getSupabaseClient();
      
      const { data: account, error } = await client
        .from('agent_accounts')
        .update(updateData)
        .eq('id', agentId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`更新失败: ${error.message}`);
      }
      
      if (!account) {
        throw new Error('更新成功但未返回数据');
      }
      
      const duration = Date.now() - startTime;
      console.log(`[更新代理账户] 成功: agentId=${agentId}, 耗时=${duration}ms`);
      
      return {
        id: account.id,
        userId: account.user_id,
        uid: account.uid,
        agentPath: account.agent_path,
        parentId: account.parent_id,
        parentUid: account.parent_uid,
        agentLevel: account.agent_level,
        commissionRate: parseFloat(account.commission_rate || '0.5'),
        platformRate: account.platform_rate ? parseFloat(account.platform_rate) : null,
        canCreateCode: account.can_create_code,
        canCreateUser: account.can_create_user,
        referralCode: account.referral_code,
        status: account.status,
        pointsBalance: account.points_balance || 0,
        pointsTotal: account.points_total || 0,
        pointsUsed: account.points_used || 0,
        inviteCount: account.invite_count || 0,
        paidUserCount: account.paid_user_count || 0,
        totalSales: parseFloat(account.total_sales || '0'),
        totalCommission: parseFloat(account.total_commission || '0'),
        settledAmount: parseFloat(account.settled_amount || '0'),
        pendingAmount: parseFloat(account.pending_amount || '0'),
        createdBy: account.created_by,
        createdAt: account.created_at,
        updatedAt: account.updated_at,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err.message;
      
      const duration = Date.now() - startTime;
      console.error(`[更新代理账户] 第 ${attempt} 次失败 (耗时 ${duration}ms):`, err.message);
      
      if (attempt < 3) {
        const delay = attempt * 300;
        console.log(`[更新代理账户] ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[更新代理账户] 最终失败:`, lastError);
  return null;
}

/**
 * 更新代理账户统计
 * 包含重试机制
 */
export async function updateAgentStats(
  agentId: number,
  data: {
    inviteCount?: number;
    paidUserCount?: number;
    totalSales?: number;
    totalCommission?: number;
    pendingAmount?: number;
    settledAmount?: number;
  }
): Promise<boolean> {
  const startTime = Date.now();
  
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  
  if (data.inviteCount !== undefined) updateData.invite_count = data.inviteCount;
  if (data.paidUserCount !== undefined) updateData.paid_user_count = data.paidUserCount;
  if (data.totalSales !== undefined) updateData.total_sales = data.totalSales.toString();
  if (data.totalCommission !== undefined) updateData.total_commission = data.totalCommission.toString();
  if (data.pendingAmount !== undefined) updateData.pending_amount = data.pendingAmount.toString();
  if (data.settledAmount !== undefined) updateData.settled_amount = data.settledAmount.toString();
  
  // 最多重试 3 次
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (attempt > 1) {
        resetSupabaseClient();
      }
      const client = getSupabaseClient();
      
      const { error } = await client
        .from('agent_accounts')
        .update(updateData)
        .eq('id', agentId);
      
      if (error) {
        throw new Error(error.message);
      }
      
      const duration = Date.now() - startTime;
      if (attempt > 1) {
        console.log(`[更新代理统计] 成功: agentId=${agentId}, 耗时=${duration}ms (第${attempt}次尝试)`);
      }
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[更新代理统计] 第 ${attempt} 次失败:`, err.message);
      
      if (attempt < 3) {
        const delay = attempt * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[更新代理统计] 最终失败: agentId=${agentId}`);
  return false;
}

/**
 * 创建代理开通记录
 */
export async function createAgentSubscriptionRecord(data: {
  agentId: number;
  agentUid: string;
  userId: number;
  userName?: string;
  userPhone?: string;
  planId: number;
  planName?: string;
  originalPrice: number;
  commissionRate: number;
  commissionAmount: number;
  platformAmount: number;
  operatorIp?: string;
}): Promise<AgentSubscriptionRecord | null> {
  const client = getSupabaseClient();
  
  const { data: record, error } = await client
    .from('agent_subscriptions')
    .insert({
      agent_id: data.agentId,
      agent_uid: data.agentUid,
      user_id: data.userId,
      user_name: data.userName || null,
      user_phone: data.userPhone || null,
      plan_id: data.planId,
      plan_name: data.planName || null,
      original_price: data.originalPrice.toString(),
      commission_rate: data.commissionRate.toString(),
      commission_amount: data.commissionAmount.toString(),
      platform_amount: data.platformAmount.toString(),
      settlement_status: 'pending',
      operator_ip: data.operatorIp || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('[创建开通记录] 失败:', error);
    return null;
  }
  
  return {
    id: record.id,
    agentId: record.agent_id,
    agentUid: record.agent_uid,
    userId: record.user_id,
    userName: record.user_name,
    userPhone: record.user_phone,
    planId: record.plan_id,
    planName: record.plan_name,
    originalPrice: parseFloat(record.original_price || '0'),
    commissionRate: parseFloat(record.commission_rate || '0'),
    commissionAmount: parseFloat(record.commission_amount || '0'),
    platformAmount: parseFloat(record.platform_amount || '0'),
    settlementStatus: record.settlement_status,
    settledAt: record.settled_at,
    operatorIp: record.operator_ip,
    createdAt: record.created_at,
  };
}

/**
 * 创建佣金记录
 */
export async function createCommissionRecord(data: {
  userId: number;
  userName?: string;
  planId?: number;
  planName?: string;
  originalPrice: number;
  sourceType: string;
  sourceId?: number;
  beneficiaryId: number;
  beneficiaryUid: string;
  beneficiaryRole?: string;
  amount: number;
  commissionRate?: number;
}): Promise<CommissionRecord | null> {
  const client = getSupabaseClient();
  
  const { data: record, error } = await client
    .from('commission_records')
    .insert({
      user_id: data.userId,
      user_name: data.userName || null,
      plan_id: data.planId || null,
      plan_name: data.planName || null,
      original_price: data.originalPrice.toString(),
      source_type: data.sourceType,
      source_id: data.sourceId || null,
      beneficiary_id: data.beneficiaryId,
      beneficiary_uid: data.beneficiaryUid,
      beneficiary_role: data.beneficiaryRole || null,
      amount: data.amount.toString(),
      commission_rate: data.commissionRate || null,
      settlement_status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[创建佣金记录] 失败:', error);
    return null;
  }
  
  return {
    id: record.id,
    userId: record.user_id,
    userName: record.user_name,
    planId: record.plan_id,
    planName: record.plan_name,
    originalPrice: parseFloat(record.original_price || '0'),
    sourceType: record.source_type,
    sourceId: record.source_id,
    beneficiaryId: record.beneficiary_id,
    beneficiaryUid: record.beneficiary_uid,
    beneficiaryRole: record.beneficiary_role,
    amount: parseFloat(record.amount || '0'),
    commissionRate: record.commission_rate ? parseFloat(record.commission_rate) : null,
    settlementStatus: record.settlement_status,
    settledAt: record.settled_at,
    createdAt: record.created_at,
  };
}

/**
 * 获取代理的下级用户列表
 * @param agentUserId - 代理的用户ID（即 agent_accounts.user_id，不是 agent_accounts.id）
 */
export async function getAgentUsers(agentUserId: number, limit: number = 50): Promise<Array<{
  id: number;
  uid: string;
  username: string;
  phone: string | null;
  memberType: string | null;
  memberExpiry: string | null;
  createdAt: string;
}>> {
  const client = getSupabaseClient();
  
  console.log(`[获取代理用户] 查询 inviter_id=${agentUserId} 的下级用户`);
  
  const { data, error } = await client
    .from('users')
    .select('id, uid, username, phone, member_type, member_expiry, created_at')
    .eq('inviter_id', agentUserId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[获取代理用户] 失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    uid: row.uid,
    username: row.username,
    phone: row.phone,
    memberType: row.member_type,
    memberExpiry: row.member_expiry,
    createdAt: row.created_at,
  }));
}

/**
 * 获取代理的开通记录
 */
export async function getAgentSubscriptions(agentId: number, limit: number = 50): Promise<AgentSubscriptionRecord[]> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('agent_subscriptions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[获取开通记录] 失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    agentId: row.agent_id,
    agentUid: row.agent_uid,
    userId: row.user_id,
    userName: row.user_name,
    userPhone: row.user_phone,
    planId: row.plan_id,
    planName: row.plan_name,
    originalPrice: parseFloat(row.original_price || '0'),
    commissionRate: parseFloat(row.commission_rate || '0'),
    commissionAmount: parseFloat(row.commission_amount || '0'),
    platformAmount: parseFloat(row.platform_amount || '0'),
    settlementStatus: row.settlement_status,
    settledAt: row.settled_at,
    operatorIp: row.operator_ip,
    createdAt: row.created_at,
  }));
}

/**
 * 获取用户的佣金记录
 */
export async function getCommissionRecordsByBeneficiary(beneficiaryId: number, limit: number = 50): Promise<CommissionRecord[]> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('commission_records')
    .select('*')
    .eq('beneficiary_id', beneficiaryId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('[获取佣金记录] 失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    planId: row.plan_id,
    planName: row.plan_name,
    originalPrice: parseFloat(row.original_price || '0'),
    sourceType: row.source_type,
    sourceId: row.source_id,
    beneficiaryId: row.beneficiary_id,
    beneficiaryUid: row.beneficiary_uid,
    beneficiaryRole: row.beneficiary_role,
    amount: parseFloat(row.amount || '0'),
    commissionRate: row.commission_rate ? parseFloat(row.commission_rate) : null,
    settlementStatus: row.settlement_status,
    settledAt: row.settled_at,
    createdAt: row.created_at,
  }));
}

/**
 * 获取所有代理列表（管理员用）
 */
export async function getAllAgents(): Promise<AgentAccountFull[]> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('agent_accounts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[获取所有代理] 失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    uid: row.uid,
    agentPath: row.agent_path,
    parentId: row.parent_id,
    parentUid: row.parent_uid,
    agentLevel: row.agent_level !== null && row.agent_level !== undefined ? row.agent_level : (row.parent_id ? 2 : 1),
    commissionRate: parseFloat(row.commission_rate || '0.5'),
    platformRate: row.platform_rate ? parseFloat(row.platform_rate) : null,
    canCreateCode: row.can_create_code ?? !row.parent_id,
    canCreateUser: row.can_create_user ?? !row.parent_id,
    referralCode: row.referral_code,
    status: row.status,
    pointsBalance: row.points_balance || 0,
    pointsTotal: row.points_total || 0,
    pointsUsed: row.points_used || 0,
    inviteCount: row.invite_count || 0,
    paidUserCount: row.paid_user_count || 0,
    totalSales: parseFloat(row.total_sales || '0'),
    totalCommission: parseFloat(row.total_commission || '0'),
    settledAmount: parseFloat(row.settled_amount || '0'),
    pendingAmount: parseFloat(row.pending_amount || '0'),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 创建结算记录
 */
export async function createSettlementRecord(data: {
  agentId: number;
  agentUid: string;
  amount: number;
  commissionIds: number[];
  paymentMethod?: string;
  paymentProof?: string;
}): Promise<AgentSettlementRecord | null> {
  const client = getSupabaseClient();
  
  const { data: record, error } = await client
    .from('agent_settlements')
    .insert({
      agent_id: data.agentId,
      agent_uid: data.agentUid,
      amount: data.amount.toString(),
      commission_ids: data.commissionIds,
      payment_method: data.paymentMethod || null,
      payment_proof: data.paymentProof || null,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[创建结算记录] 失败:', error);
    return null;
  }
  
  return {
    id: record.id,
    agentId: record.agent_id,
    agentUid: record.agent_uid,
    amount: parseFloat(record.amount || '0'),
    commissionIds: record.commission_ids || [],
    paymentMethod: record.payment_method,
    paymentProof: record.payment_proof,
    status: record.status,
    confirmedBy: record.confirmed_by,
    confirmedAt: record.confirmed_at,
    rejectedReason: record.rejected_reason,
    createdAt: record.created_at,
  };
}

/**
 * 获取待结算的佣金记录
 */
export async function getPendingCommissionRecords(beneficiaryId: number): Promise<CommissionRecord[]> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('commission_records')
    .select('*')
    .eq('beneficiary_id', beneficiaryId)
    .eq('settlement_status', 'pending')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[获取待结算佣金] 失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    planId: row.plan_id,
    planName: row.plan_name,
    originalPrice: parseFloat(row.original_price || '0'),
    sourceType: row.source_type,
    sourceId: row.source_id,
    beneficiaryId: row.beneficiary_id,
    beneficiaryUid: row.beneficiary_uid,
    beneficiaryRole: row.beneficiary_role,
    amount: parseFloat(row.amount || '0'),
    commissionRate: row.commission_rate ? parseFloat(row.commission_rate) : null,
    settlementStatus: row.settlement_status,
    settledAt: row.settled_at,
    createdAt: row.created_at,
  }));
}

/**
 * 确认结算
 */
export async function confirmSettlement(
  settlementId: number,
  confirmerId: number
): Promise<boolean> {
  const client = getSupabaseClient();
  
  // 获取结算记录
  const { data: settlement, error: fetchError } = await client
    .from('agent_settlements')
    .select('*')
    .eq('id', settlementId)
    .single();
  
  if (fetchError || !settlement) {
    console.error('[确认结算] 获取结算记录失败:', fetchError);
    return false;
  }
  
  // 更新结算记录状态
  const { error: updateError } = await client
    .from('agent_settlements')
    .update({
      status: 'confirmed',
      confirmed_by: confirmerId,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', settlementId);
  
  if (updateError) {
    console.error('[确认结算] 更新结算记录失败:', updateError);
    return false;
  }
  
  // 更新相关佣金记录状态
  if (settlement.commission_ids && settlement.commission_ids.length > 0) {
    const { error: commissionError } = await client
      .from('commission_records')
      .update({
        settlement_status: 'settled',
        settled_at: new Date().toISOString(),
      })
      .in('id', settlement.commission_ids);
    
    if (commissionError) {
      console.error('[确认结算] 更新佣金记录失败:', commissionError);
    }
  }
  
  // 更新代理账户的已结算金额
  const { error: agentError } = await client
    .from('agent_accounts')
    .update({
      settled_amount: settlement.amount,
      pending_amount: `GREATEST(pending_amount - ${settlement.amount}, 0)`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settlement.agent_id);
  
  if (agentError) {
    console.error('[确认结算] 更新代理账户失败:', agentError);
  }
  
  return true;
}

/**
 * 获取所有待审核的结算记录
 */
export async function getPendingSettlements(): Promise<AgentSettlementRecord[]> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('agent_settlements')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('[获取待审核结算] 失败:', error);
    return [];
  }
  
  return (data || []).map(row => ({
    id: row.id,
    agentId: row.agent_id,
    agentUid: row.agent_uid,
    amount: parseFloat(row.amount || '0'),
    commissionIds: row.commission_ids || [],
    paymentMethod: row.payment_method,
    paymentProof: row.payment_proof,
    status: row.status,
    confirmedBy: row.confirmed_by,
    confirmedAt: row.confirmed_at,
    rejectedReason: row.rejected_reason,
    createdAt: row.created_at,
  }));
}


/**
 * 通过代理ID获取代理账户
 */
export async function getAgentAccountByAgentId(agentId: number): Promise<AgentAccountFull | null> {
  const client = getSupabaseClient();
  
  const { data, error } = await client
    .from('agent_accounts')
    .select('*')
    .eq('id', agentId)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    userId: data.user_id,
    uid: data.uid,
    agentPath: data.agent_path,
    parentId: data.parent_id,
    parentUid: data.parent_uid,
    agentLevel: data.agent_level,
    commissionRate: parseFloat(data.commission_rate || '0.5'),
    platformRate: data.platform_rate ? parseFloat(data.platform_rate) : null,
    canCreateCode: data.can_create_code,
    canCreateUser: data.can_create_user,
    referralCode: data.referral_code,
    status: data.status,
    pointsBalance: data.points_balance || 0,
    pointsTotal: data.points_total || 0,
    pointsUsed: data.points_used || 0,
    inviteCount: data.invite_count || 0,
    paidUserCount: data.paid_user_count || 0,
    totalSales: parseFloat(data.total_sales || '0'),
    totalCommission: parseFloat(data.total_commission || '0'),
    settledAmount: parseFloat(data.settled_amount || '0'),
    pendingAmount: parseFloat(data.pending_amount || '0'),
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 创建代理结算申请
 */
export async function createAgentSettlement(data: {
  agentId: number;
  agentUid: string;
  amount: number;
  bankName: string;
  bankAccount: string;
  accountName: string;
  remark?: string;
}): Promise<AgentSettlementRecord | null> {
  const client = getSupabaseClient();
  
  const { data: settlement, error } = await client
    .from('agent_settlements')
    .insert({
      agent_id: data.agentId,
      agent_uid: data.agentUid,
      amount: data.amount,
      payment_method: JSON.stringify({
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        accountName: data.accountName,
      }),
      remark: data.remark || null,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.error('[创建结算申请] 失败:', error);
    return null;
  }
  
  return {
    id: settlement.id,
    agentId: settlement.agent_id,
    agentUid: settlement.agent_uid,
    amount: parseFloat(settlement.amount || '0'),
    commissionIds: settlement.commission_ids || [],
    paymentMethod: settlement.payment_method,
    paymentProof: settlement.payment_proof,
    status: settlement.status,
    confirmedBy: settlement.confirmed_by,
    confirmedAt: settlement.confirmed_at,
    rejectedReason: settlement.rejected_reason,
    createdAt: settlement.created_at,
  };
}
