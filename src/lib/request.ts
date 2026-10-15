/**
 * 请求工具函数
 * 
 * 功能：
 * 1. 超时控制
 * 2. 自动重试
 * 3. 错误提示优化
 */

export interface RequestOptions extends RequestInit {
  timeout?: number;        // 超时时间（毫秒），默认 30000
  retries?: number;        // 重试次数，默认 2
  retryDelay?: number;     // 重试延迟（毫秒），默认 1000
  retryOn?: number[];      // 触发重试的状态码，默认 [408, 429, 500, 502, 503, 504]
}

export interface RequestError extends Error {
  status?: number;
  statusText?: string;
  retried?: number;
  isTimeout?: boolean;
  isAborted?: boolean;
}

/**
 * 带超时和重试的 fetch 请求
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<{ data: T; response: Response }> {
  const {
    timeout = 30000,
    retries = 2,
    retryDelay = 1000,
    retryOn = [408, 429, 500, 502, 503, 504],
    ...fetchOptions
  } = options;

  let lastError: RequestError | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 检查是否需要重试
      if (!response.ok && retryOn.includes(response.status) && attempt <= retries) {
        console.log(`[请求] 第 ${attempt} 次失败，状态码 ${response.status}，${retryDelay}ms 后重试...`);
        await sleep(retryDelay * attempt); // 指数退避
        continue;
      }

      // 解析响应
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as T;
      }

      // 如果响应不成功，构造错误
      if (!response.ok) {
        const error: RequestError = new Error(
          (data as { error?: string }).error || 
          `请求失败: ${response.status} ${response.statusText}`
        ) as RequestError;
        error.status = response.status;
        error.statusText = response.statusText;
        error.retried = attempt - 1;
        throw error;
      }

      return { data, response };

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const requestError = error as RequestError;
      
      // 超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        requestError.isTimeout = true;
        requestError.message = `请求超时（超过 ${timeout / 1000} 秒）`;
      }

      // 用户主动取消
      if (error instanceof Error && error.name === 'UserAbortError') {
        requestError.isAborted = true;
      }

      lastError = requestError;
      lastError.retried = attempt - 1;

      // 网络错误或超时，尝试重试
      const shouldRetry = (
        (requestError.isTimeout || 
         requestError.message?.includes('network') ||
         requestError.message?.includes('fetch')) &&
        attempt <= retries
      );

      if (shouldRetry) {
        console.log(`[请求] 第 ${attempt} 次失败: ${requestError.message}，${retryDelay}ms 后重试...`);
        await sleep(retryDelay * attempt);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError;
}

/**
 * 获取用户友好的错误提示
 */
export function getErrorMessage(error: unknown, context: string = '操作'): string {
  if (error instanceof Error) {
    const requestError = error as RequestError;

    // 超时
    if (requestError.isTimeout) {
      return `${context}超时，请检查网络后重试`;
    }

    // 用户取消
    if (requestError.isAborted) {
      return `${context}已取消`;
    }

    // HTTP 状态码错误
    if (requestError.status) {
      switch (requestError.status) {
        case 400:
          return `请求参数错误，请检查输入`;
        case 401:
          return `登录已过期，请重新登录`;
        case 403:
          return `没有权限执行此操作`;
        case 404:
          return `请求的资源不存在`;
        case 408:
          return `请求超时，请稍后重试`;
        case 429:
          return `操作过于频繁，请稍后重试`;
        case 500:
          return `服务器错误，请稍后重试`;
        case 502:
        case 503:
        case 504:
          return `服务暂时不可用，请稍后重试`;
        default:
          return requestError.message || `${context}失败`;
      }
    }

    // 网络错误
    if (requestError.message?.includes('network') || 
        requestError.message?.includes('fetch') ||
        requestError.message?.includes('Failed to fetch')) {
      return `网络连接失败，请检查网络后重试`;
    }

    return requestError.message || `${context}失败`;
  }

  return `${context}失败，请稍后重试`;
}

/**
 * 辅助函数：延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 封装常用请求方法
 */
export const request = {
  get: <T = unknown>(url: string, options?: RequestOptions) =>
    fetchWithRetry<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    fetchWithRetry<T>(url, {
      ...options,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    fetchWithRetry<T>(url, {
      ...options,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: RequestOptions) =>
    fetchWithRetry<T>(url, { ...options, method: 'DELETE' }),
};
