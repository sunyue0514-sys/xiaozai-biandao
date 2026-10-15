/**
 * 通用 API 请求工具
 * 
 * 解决问题：
 * 1. 防抖 - 防止用户连续点击
 * 2. 重试 - 网络临时失败自动重试
 * 3. 错误处理 - 统一的错误提示
 * 4. 超时处理 - 防止请求无限等待
 */

import { toast } from 'sonner';

// 请求配置
interface RequestOptions extends RequestInit {
  timeout?: number;      // 超时时间（毫秒），默认 30000
  retries?: number;      // 重试次数，默认 2
  retryDelay?: number;   // 重试延迟（毫秒），默认 1000
  showErrorToast?: boolean; // 是否显示错误提示，默认 true
  successMessage?: string;  // 成功提示消息
}

// 请求状态追踪（防止重复请求）
const pendingRequests = new Map<string, Promise<Response>>();

/**
 * 生成请求唯一标识
 */
function getRequestKey(url: string, options?: RequestOptions): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body).slice(0, 100) : '';
  return `${method}:${url}:${body}`;
}

/**
 * 带超时的 fetch
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 通用 API 请求函数
 * 
 * 使用示例：
 * ```ts
 * const result = await apiRequest('/api/customer/list', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: '测试客户' }),
 *   successMessage: '创建成功',
 * });
 * 
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<{ 
  success: boolean; 
  data?: T; 
  error?: string;
  response?: Response;
}> {
  const {
    retries = 2,
    retryDelay = 1000,
    showErrorToast = true,
    successMessage,
    ...fetchOptions
  } = options;

  const requestKey = getRequestKey(url, options);

  // 检查是否有相同的请求正在进行（防止重复请求）
  if (pendingRequests.has(requestKey)) {
    console.log('[API] 等待中的重复请求:', requestKey);
    try {
      const response = await pendingRequests.get(requestKey)!;
      const result = await response.clone().json();
      return { 
        success: response.ok, 
        data: result.data || result,
        error: result.error,
        response 
      };
    } catch {
      // 如果等待的请求失败，继续发起新请求
    }
  }

  let lastError: string = '请求失败';
  let attempt = 0;

  while (attempt <= retries) {
    attempt++;
    
    try {
      console.log(`[API] 请求 ${url} (尝试 ${attempt}/${retries + 1})`);
      
      const response = await fetchWithTimeout(url, fetchOptions);
      
      // 解析响应
      let result: { success?: boolean; data?: T; error?: string };
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        result = await response.json();
      } else {
        result = { success: response.ok, data: await response.text() as unknown as T };
      }

      // 请求成功
      if (response.ok && result.success !== false) {
        pendingRequests.delete(requestKey);
        
        if (successMessage) {
          toast.success(successMessage);
        }
        
        return { 
          success: true, 
          data: result.data,
          response 
        };
      }

      // 请求失败（业务错误，不重试）
      lastError = result.error || `请求失败 (${response.status})`;
      
      // 401 未授权 - 不重试，直接返回
      if (response.status === 401) {
        pendingRequests.delete(requestKey);
        if (showErrorToast) {
          toast.error('登录已过期，请重新登录');
        }
        return { success: false, error: lastError, response };
      }

      // 403 禁止访问 - 不重试
      if (response.status === 403) {
        pendingRequests.delete(requestKey);
        if (showErrorToast) {
          toast.error(lastError);
        }
        return { success: false, error: lastError, response };
      }

      // 400 参数错误 - 不重试
      if (response.status === 400) {
        pendingRequests.delete(requestKey);
        if (showErrorToast) {
          toast.error(lastError);
        }
        return { success: false, error: lastError, response };
      }

      // 其他错误，尝试重试
      if (attempt <= retries) {
        console.log(`[API] 请求失败，${retryDelay}ms 后重试:`, lastError);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      pendingRequests.delete(requestKey);
      if (showErrorToast) {
        toast.error(lastError);
      }
      return { success: false, error: lastError, response };

    } catch (error) {
      // 网络错误或超时
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = '请求超时，请检查网络后重试';
        } else {
          lastError = error.message || '网络错误';
        }
      }

      console.error(`[API] 请求异常 (尝试 ${attempt}/${retries + 1}):`, error);

      // 尝试重试
      if (attempt <= retries) {
        console.log(`[API] ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
    }
  }

  // 所有重试都失败
  pendingRequests.delete(requestKey);
  if (showErrorToast) {
    toast.error(lastError);
  }
  return { success: false, error: lastError };
}

/**
 * GET 请求
 */
export async function apiGet<T = unknown>(
  url: string,
  options?: RequestOptions
): Promise<{ success: boolean; data?: T; error?: string }> {
  return apiRequest<T>(url, { ...options, method: 'GET' });
}

/**
 * POST 请求
 */
export async function apiPost<T = unknown>(
  url: string,
  body: unknown,
  options?: RequestOptions
): Promise<{ success: boolean; data?: T; error?: string }> {
  return apiRequest<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}

/**
 * DELETE 请求
 */
export async function apiDelete<T = unknown>(
  url: string,
  options?: RequestOptions
): Promise<{ success: boolean; data?: T; error?: string }> {
  return apiRequest<T>(url, { ...options, method: 'DELETE' });
}

/**
 * 带认证的请求（自动添加 Authorization header）
 */
export async function apiAuthRequest<T = unknown>(
  url: string,
  token: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  return apiRequest<T>(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * 带认证的 POST 请求
 */
export async function apiAuthPost<T = unknown>(
  url: string,
  token: string,
  body: unknown,
  options?: RequestOptions
): Promise<{ success: boolean; data?: T; error?: string }> {
  return apiPost<T>(url, body, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
