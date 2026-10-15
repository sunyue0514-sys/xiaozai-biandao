// 无脚本拍摄智能体数据存储模块

import { getSupabaseClient, waitForSequenceCheck } from '@/storage/database/supabase-client';

// 会话类型
export interface ScriptlessConversation {
  id: number;
  uid: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

// 消息类型
export interface ScriptlessMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  customerId: number | null;
  result: ScriptlessResult | null;
  createdAt: string;
}

// AI生成结果类型
export interface ScriptlessResult {
  positioning: string;
  opening: string;
  scriptStructure?: string;
  qaSession: Array<{ question: string; answerDirection: string }>;
  visualSuggestions: string[];
  endingSpeech: string;
  goldenQuote: string;
}

// 用户算力信息
export interface UserPowerInfo {
  userId: number;
  role: string;
  powerQuota: number;   // 总配额，-1 表示无限
  usedPower: number;    // 已使用
  credits: number;      // 当前余额（优先使用）
  remaining: number;    // 剩余，-1 表示无限
}

// 算力消耗规则
export const CREDIT_RULES = {
  // 新生成拍摄方案消耗
  NEW_GENERATION: 300,
  // 多轮对话继续生成消耗
  CONTINUE_GENERATION: 50,
};

// ========== 算力相关 API ==========

// 获取用户算力信息
export async function getUserPowerInfo(userId: number): Promise<UserPowerInfo | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('id, role, power_quota, used_power, credits')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('获取用户算力失败:', error);
    return null;
  }
  
  // 无限算力：power_quota = -1 或 credits = -1
  const isUnlimited = data.power_quota === -1 || data.credits === -1;
  // 优先使用 credits 字段，兼容旧数据
  const currentCredits = data.credits ?? data.power_quota;
  const remainingFromQuota = data.power_quota - data.used_power;
  const remaining = isUnlimited ? -1 : (data.credits !== undefined ? currentCredits : remainingFromQuota);
  
  return {
    userId: data.id,
    role: data.role,
    powerQuota: data.power_quota,
    usedPower: data.used_power,
    credits: currentCredits,
    remaining,
  };
}

// 检查算力是否足够
export async function checkCreditsEnough(userId: number, amount: number): Promise<boolean> {
  const powerInfo = await getUserPowerInfo(userId);
  if (!powerInfo) return false;
  
  // 管理员无限
  if (powerInfo.role === 'admin') return true;
  
  // 配额为 -1 表示无限
  if (powerInfo.powerQuota === -1) return true;
  
  // 检查剩余是否足够
  return powerInfo.remaining >= amount;
}

// 扣除算力
export async function deductCredits(
  userId: number,
  amount: number,
  action: string,
  conversationId?: number
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  const supabase = getSupabaseClient();
  
  // 获取当前算力信息
  const powerInfo = await getUserPowerInfo(userId);
  if (!powerInfo) {
    return { success: false, error: '获取算力失败' };
  }
  
  // 管理员或无限配额用户不需要扣除（检查 credits 或 powerQuota）
  if (powerInfo.role === 'admin' || powerInfo.powerQuota === -1 || powerInfo.credits === -1) {
    return { success: true, remaining: -1 };
  }
  
  // 检查余额是否足够
  if (powerInfo.remaining < amount) {
    return { 
      success: false, 
      error: `算力不足，当前剩余 ${powerInfo.remaining} 点，需要 ${amount} 点` 
    };
  }
  
  // 更新算力：同时更新 credits 和 used_power
  const newUsedPower = powerInfo.usedPower + amount;
  const newCredits = powerInfo.credits - amount;
  const newRemaining = newCredits;
  
  const { error: updateError } = await supabase
    .from('users')
    .update({
      used_power: newUsedPower,
      credits: newCredits,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  
  if (updateError) {
    console.error('扣除算力失败:', updateError);
    return { success: false, error: '扣除算力失败' };
  }
  
  // 记录消耗日志（可选，如果表存在）
  try {
    await supabase
      .from('credit_usage_logs')
      .insert({
        uid: userId.toString(),
        amount,
        action,
        conversation_id: conversationId || null,
      });
  } catch {
    // 忽略日志记录失败
  }
  
  return { success: true, remaining: newRemaining };
}

// ========== 会话相关 API ==========

// 获取用户的所有会话
export async function getConversationsByUid(uid: string): Promise<ScriptlessConversation[]> {
  const supabase = getSupabaseClient();
  
  // 重试机制
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await supabase
        .from('scriptless_conversations')
        .select('*')
        .eq('uid', uid)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error(`获取会话列表失败(尝试 ${attempt}/3):`, error);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 300 * attempt));
          continue;
        }
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error(`获取会话列表异常(尝试 ${attempt}/3):`, e);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 300 * attempt));
      }
    }
  }
  
  return [];
}

// 获取单个会话
export async function getConversationById(id: number, uid: string): Promise<ScriptlessConversation | null> {
  const supabase = getSupabaseClient();
  
  // 重试机制
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data, error } = await supabase
        .from('scriptless_conversations')
        .select('*')
        .eq('id', id)
        .eq('uid', uid)
        .single();
      
      if (error) {
        console.error(`获取会话失败(尝试 ${attempt}/3):`, error);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 300 * attempt));
          continue;
        }
        return null;
      }
      
      return data;
    } catch (e) {
      console.error(`获取会话异常(尝试 ${attempt}/3):`, e);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 300 * attempt));
      }
    }
  }
  
  return null;
}

// 创建新会话
export async function createConversation(uid: string, title?: string): Promise<ScriptlessConversation | null> {
  // 等待序列检查完成，避免主键冲突
  await waitForSequenceCheck();
  
  console.log('[Scriptless] createConversation 开始, uid:', uid);
  
  let supabase;
  try {
    supabase = getSupabaseClient();
    console.log('[Scriptless] Supabase 客户端获取成功');
  } catch (e) {
    console.error('[Scriptless] 获取 Supabase 客户端失败:', e);
    return null;
  }
  
  // 重试机制：最多尝试 5 次，处理冷启动连接问题和序列问题
  let lastError: any = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`[Scriptless] 尝试创建会话 (尝试 ${attempt}/5), uid=${uid}`);
      
      const insertData = {
        uid,
        title: title || null,
      };
      console.log('[Scriptless] 插入数据:', JSON.stringify(insertData));
      
      const { data, error } = await supabase
        .from('scriptless_conversations')
        .insert(insertData)
        .select()
        .single();
      
      if (error) {
        lastError = error;
        console.error(`创建会话失败(尝试 ${attempt}/5):`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        // 如果是表不存在的错误，返回特殊错误信息
        if (error.code === 'PGRST204' || error.message?.includes('does not exist') || error.code === '42P01') {
          console.error('[Scriptless] scriptless_conversations 表不存在，请检查数据库');
          // 不重试，直接返回
          return null;
        }
        
        // 如果是权限问题，不重试
        if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
          console.error('[Scriptless] 权限不足，无法插入数据');
          return null;
        }
        
        // 主键冲突（序列不同步）- 继续重试，序列可能被推进
        if (error.code === '23505') {
          console.log('[Scriptless] 主键冲突，序列可能不同步，继续重试...');
          if (attempt < 5) {
            const delay = 200 * attempt;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // 对于大多数错误都重试，除非是明确的业务错误
        const shouldRetry = attempt < 5 && (
          !error.code || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'ETIMEDOUT' || 
          error.code === '08006' || // PostgreSQL connection error
          error.code === '08001' || // PostgreSQL connection does not exist
          error.code === 'PGRST301' || // Supabase connection error
          error.message?.includes('network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('connection') ||
          error.message?.includes('ECONNREFUSED')
        );
        
        if (shouldRetry) {
          const delay = 500 * attempt;
          console.log(`[Scriptless] 等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return null;
      }
      
      console.log('[Scriptless] 创建会话成功:', data);
      return data;
    } catch (e) {
      lastError = e;
      console.error(`创建会话异常(尝试 ${attempt}/5):`, e);
      if (attempt < 5) {
        const delay = 500 * attempt;
        console.log(`[Scriptless] 等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('创建会话最终失败:', lastError);
  return null;
}

// 更新会话标题
export async function updateConversationTitle(id: number, uid: string, title: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('scriptless_conversations')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('uid', uid);
  
  if (error) {
    console.error('更新会话标题失败:', error);
    return false;
  }
  
  return true;
}

// 删除会话（级联删除消息）
export async function deleteConversation(id: number, uid: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  // 先删除消息
  await supabase
    .from('scriptless_messages')
    .delete()
    .eq('conversation_id', id);
  
  // 再删除会话
  const { error } = await supabase
    .from('scriptless_conversations')
    .delete()
    .eq('id', id)
    .eq('uid', uid);
  
  if (error) {
    console.error('删除会话失败:', error);
    return false;
  }
  
  return true;
}

// 更新会话的更新时间
export async function touchConversation(id: number): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from('scriptless_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);
}

// ========== 消息相关 API ==========

// 获取会话的所有消息
export async function getMessagesByConversationId(conversationId: number): Promise<ScriptlessMessage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('scriptless_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('获取消息失败:', error);
    return [];
  }
  
  return data || [];
}

// 添加用户消息
export async function addUserMessage(
  conversationId: number,
  content: string,
  customerId?: number
): Promise<ScriptlessMessage | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('scriptless_messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content,
      customer_id: customerId || null,
      result: null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('添加用户消息失败:', error);
    return null;
  }
  
  return data;
}

// 添加助手消息
export async function addAssistantMessage(
  conversationId: number,
  content: string,
  result: ScriptlessResult
): Promise<ScriptlessMessage | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('scriptless_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content,
      customer_id: null,
      result,
    })
    .select()
    .single();
  
  if (error) {
    console.error('添加助手消息失败:', error);
    return null;
  }
  
  return data;
}
