// 智能体认证模块
// 用于 Coze 智能体等外部系统的 API 认证

import { getSupabaseClient, waitForSequenceCheck } from '@/storage/database/supabase-client';
import { getUserById, createUser, updateUser } from './db-store';
import { randomBytes, createHash } from 'crypto';

// 类型定义
export interface AgentApiKey {
  id: number;
  name: string;
  apiKey: string;
  secretKey: string;
  status: 'active' | 'disabled';
  rateLimit: number;
  createdAt: Date;
  expiresAt: Date | null;
  createdBy: number | null;
}

export interface AgentUser {
  id: number;
  agentType: string;        // coze, wechat, etc.
  agentUserId: string;      // 智能体平台的用户ID
  systemUserId: number;     // 对应的系统用户ID
  nickname: string | null;
  avatarUrl: string | null;
  lastActiveAt: Date | null;
  createdAt: Date;
}

export interface AgentCallLog {
  id: number;
  agentUserId: number;
  apiKeyId: number;
  endpoint: string;
  action: string;
  powerConsumed: number;
  success: boolean;
  errorMessage: string | null;
  requestParams: Record<string, any> | null;
  responseTimeMs: number | null;
  createdAt: Date;
}

// 认证结果
export interface AgentAuthResult {
  success: boolean;
  error?: string;
  code?: 'INVALID_API_KEY' | 'INVALID_SIGNATURE' | 'EXPIRED_TIMESTAMP' | 'RATE_LIMITED' | 'USER_CREATE_FAILED';
  agentUser?: AgentUser;
  systemUserId?: number;
}

// 生成 API Key
export function generateApiKey(): { apiKey: string; secretKey: string } {
  const apiKey = `sk_agent_${randomBytes(24).toString('hex')}`;
  const secretKey = randomBytes(32).toString('hex');
  return { apiKey, secretKey };
}

// 验证签名
export function verifySignature(
  secretKey: string,
  timestamp: string,
  agentUserId: string,
  signature: string
): boolean {
  const expectedSignature = createHash('sha256')
    .update(`${secretKey}${timestamp}${agentUserId}`)
    .digest('hex');
  return signature === expectedSignature;
}

// 获取 API Key 信息
export async function getApiKey(apiKey: string): Promise<AgentApiKey | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('agent_api_keys')
    .select('*')
    .eq('api_key', apiKey)
    .eq('status', 'active')
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    name: data.name,
    apiKey: data.api_key,
    secretKey: data.secret_key,
    status: data.status,
    rateLimit: data.rate_limit,
    createdAt: new Date(data.created_at),
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    createdBy: data.created_by,
  };
}

// 获取或创建智能体用户
export async function getOrCreateAgentUser(
  agentType: string,
  agentUserId: string,
  nickname?: string,
  avatarUrl?: string
): Promise<{ agentUser: AgentUser; isNew: boolean } | null> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  const supabase = getSupabaseClient();
  
  // 查找现有绑定
  const { data: existing, error: queryError } = await supabase
    .from('agent_users')
    .select('*')
    .eq('agent_type', agentType)
    .eq('agent_user_id', agentUserId)
    .single();
  
  if (existing) {
    // 更新最后活跃时间
    await supabase
      .from('agent_users')
      .update({ 
        last_active_at: new Date().toISOString(),
        nickname: nickname || existing.nickname,
        avatar_url: avatarUrl || existing.avatar_url,
      })
      .eq('id', existing.id);
    
    return {
      agentUser: {
        id: existing.id,
        agentType: existing.agent_type,
        agentUserId: existing.agent_user_id,
        systemUserId: existing.system_user_id,
        nickname: existing.nickname,
        avatarUrl: existing.avatar_url,
        lastActiveAt: existing.last_active_at ? new Date(existing.last_active_at) : null,
        createdAt: new Date(existing.created_at),
      },
      isNew: false,
    };
  }
  
  // 创建新用户
  const username = `${agentType}_${agentUserId.substring(0, 20)}`;
  // 智能体用户使用随机密码，无法通过网页登录
  const randomPassword = randomBytes(32).toString('hex');
  
  try {
    const newUser = await createUser({
      username,
      password: randomPassword,
      role: 'user',
      memberType: 'none',
      powerQuota: 3000, // 新用户赠送3000算力
    });
    
    if (!newUser || 'error' in newUser) {
      console.error('Failed to create system user for agent:', newUser && 'error' in newUser ? newUser.error : 'unknown error');
      return null;
    }
    
    // 创建绑定记录
    const { data: agentUserRecord, error: insertError } = await supabase
      .from('agent_users')
      .insert({
        agent_type: agentType,
        agent_user_id: agentUserId,
        system_user_id: newUser.id,
        nickname: nickname || null,
        avatar_url: avatarUrl || null,
        last_active_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (insertError || !agentUserRecord) {
      console.error('Failed to create agent user binding:', insertError);
      return null;
    }
    
    return {
      agentUser: {
        id: agentUserRecord.id,
        agentType: agentUserRecord.agent_type,
        agentUserId: agentUserRecord.agent_user_id,
        systemUserId: agentUserRecord.system_user_id,
        nickname: agentUserRecord.nickname,
        avatarUrl: agentUserRecord.avatar_url,
        lastActiveAt: new Date(agentUserRecord.last_active_at),
        createdAt: new Date(agentUserRecord.created_at),
      },
      isNew: true,
    };
  } catch (error) {
    console.error('Error creating agent user:', error);
    return null;
  }
}

// 验证智能体请求
export async function verifyAgentRequest(
  apiKey: string,
  agentUserId: string,
  timestamp: string,
  signature: string
): Promise<AgentAuthResult> {
  // 1. 验证时间戳（5分钟有效期）
  const requestTime = parseInt(timestamp);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (isNaN(requestTime) || Math.abs(now - requestTime) > fiveMinutes) {
    return {
      success: false,
      error: '请求已过期，请检查时间戳',
      code: 'EXPIRED_TIMESTAMP',
    };
  }
  
  // 2. 获取 API Key
  const keyInfo = await getApiKey(apiKey);
  if (!keyInfo) {
    return {
      success: false,
      error: '无效的 API Key',
      code: 'INVALID_API_KEY',
    };
  }
  
  // 3. 验证签名
  if (!verifySignature(keyInfo.secretKey, timestamp, agentUserId, signature)) {
    return {
      success: false,
      error: '签名验证失败',
      code: 'INVALID_SIGNATURE',
    };
  }
  
  // 4. 获取或创建用户（默认为 coze 类型）
  const result = await getOrCreateAgentUser('coze', agentUserId);
  
  if (!result) {
    return {
      success: false,
      error: '用户创建失败',
      code: 'USER_CREATE_FAILED',
    };
  }
  
  return {
    success: true,
    agentUser: result.agentUser,
    systemUserId: result.agentUser.systemUserId,
  };
}

// 记录调用日志
export async function logAgentCall(
  agentUserId: number,
  apiKeyId: number,
  endpoint: string,
  action: string,
  powerConsumed: number,
  success: boolean,
  errorMessage?: string,
  requestParams?: Record<string, any>,
  responseTimeMs?: number
): Promise<void> {
  const supabase = getSupabaseClient();
  
  await supabase
    .from('agent_call_logs')
    .insert({
      agent_user_id: agentUserId,
      api_key_id: apiKeyId,
      endpoint,
      action,
      power_consumed: powerConsumed,
      success,
      error_message: errorMessage || null,
      request_params: requestParams || null,
      response_time_ms: responseTimeMs || null,
    });
}

// 初始化默认 API Key
export async function initDefaultApiKey(): Promise<AgentApiKey | null> {
  const supabase = getSupabaseClient();
  
  // 检查是否已存在默认 Key
  const { data: existing } = await supabase
    .from('agent_api_keys')
    .select('*')
    .eq('name', 'Default Coze Agent Key')
    .single();
  
  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      apiKey: existing.api_key,
      secretKey: existing.secret_key,
      status: existing.status,
      rateLimit: existing.rate_limit,
      createdAt: new Date(existing.created_at),
      expiresAt: existing.expires_at ? new Date(existing.expires_at) : null,
      createdBy: existing.created_by,
    };
  }
  
  // 创建新的默认 Key
  const { apiKey, secretKey } = generateApiKey();
  
  const { data, error } = await supabase
    .from('agent_api_keys')
    .insert({
      name: 'Default Coze Agent Key',
      api_key: apiKey,
      secret_key: secretKey,
      status: 'active',
      rate_limit: 100,
    })
    .select()
    .single();
  
  if (error || !data) {
    console.error('Failed to create default API key:', error);
    return null;
  }
  
  return {
    id: data.id,
    name: data.name,
    apiKey: data.api_key,
    secretKey: data.secret_key,
    status: data.status,
    rateLimit: data.rate_limit,
    createdAt: new Date(data.created_at),
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    createdBy: data.created_by,
  };
}

// 获取 API Key 列表
export async function getApiKeys(): Promise<AgentApiKey[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('agent_api_keys')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error || !data) return [];
  
  return data.map(item => ({
    id: item.id,
    name: item.name,
    apiKey: item.api_key,
    secretKey: item.secret_key,
    status: item.status,
    rateLimit: item.rate_limit,
    createdAt: new Date(item.created_at),
    expiresAt: item.expires_at ? new Date(item.expires_at) : null,
    createdBy: item.created_by,
  }));
}

// 获取智能体用户列表
export async function getAgentUsers(limit: number = 50, offset: number = 0): Promise<{ users: AgentUser[]; total: number }> {
  const supabase = getSupabaseClient();
  
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from('agent_users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabase.from('agent_users').select('*', { count: 'exact', head: true }),
  ]);
  
  if (error || !data) {
    return { users: [], total: 0 };
  }
  
  return {
    users: data.map(item => ({
      id: item.id,
      agentType: item.agent_type,
      agentUserId: item.agent_user_id,
      systemUserId: item.system_user_id,
      nickname: item.nickname,
      avatarUrl: item.avatar_url,
      lastActiveAt: item.last_active_at ? new Date(item.last_active_at) : null,
      createdAt: new Date(item.created_at),
    })),
    total: count || 0,
  };
}
