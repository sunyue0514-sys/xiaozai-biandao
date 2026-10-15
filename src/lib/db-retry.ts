/**
 * 数据库操作重试工具
 * 
 * Supabase 连接可能临时不稳定，这个工具提供自动重试能力
 */

interface RetryOptions {
  maxRetries?: number;      // 最大重试次数，默认 3
  retryDelay?: number;      // 重试延迟（毫秒），默认 500
  operationName?: string;   // 操作名称，用于日志
}

/**
 * 带重试的数据库操作包装函数
 * 
 * 使用示例：
 * ```ts
 * const result = await withRetry(
 *   async () => {
 *     const { data, error } = await supabase.from('customers').insert({...});
 *     if (error) throw error;
 *     return data;
 *   },
 *   { operationName: '创建客户' }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 500, operationName = '数据库操作' } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // 如果之前有失败，记录成功
      if (attempt > 1) {
        console.log(`[${operationName}] 第 ${attempt} 次尝试成功`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(
        `[${operationName}] 第 ${attempt}/${maxRetries} 次尝试失败:`,
        lastError.message
      );
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        console.log(`[${operationName}] ${retryDelay}ms 后重试...`);
        // Increase the delay for each retry instead of discarding the result.
        const delay = retryDelay * Math.pow(1.5, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // 所有重试都失败
  throw lastError || new Error(`${operationName}失败`);
}

/**
 * 判断错误是否为临时性错误（可以重试）
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  
  // 网络相关错误
  if (message.includes('network') || 
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')) {
    return true;
  }
  
  // Supabase/PostgreSQL 临时错误
  if (message.includes('connection') ||
      message.includes('too many connections') ||
      message.includes('server is busy') ||
      message.includes('temporarily unavailable')) {
    return true;
  }
  
  // 超时错误
  if (message.includes('abort') || message.includes('timeout')) {
    return true;
  }
  
  return false;
}

/**
 * 格式化数据库错误信息为用户友好的提示
 */
export function formatDbError(error: unknown): string {
  if (!(error instanceof Error)) {
    return '操作失败，请稍后重试';
  }
  
  const message = error.message.toLowerCase();
  
  // 唯一约束冲突
  if (message.includes('unique') || message.includes('duplicate')) {
    return '该记录已存在';
  }
  
  // 外键约束
  if (message.includes('foreign key') || message.includes('violates')) {
    return '关联数据不存在';
  }
  
  // 连接问题
  if (message.includes('connection') || message.includes('network')) {
    return '网络连接不稳定，请稍后重试';
  }
  
  // 超时
  if (message.includes('timeout') || message.includes('abort')) {
    return '请求超时，请稍后重试';
  }
  
  // 权限问题
  if (message.includes('permission') || message.includes('denied')) {
    return '没有操作权限';
  }
  
  // 默认提示
  return '操作失败，请稍后重试';
}
