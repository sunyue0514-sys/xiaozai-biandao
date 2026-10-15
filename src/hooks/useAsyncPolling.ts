/**
 * 异步任务轮询 Hook
 * 
 * 解决常见问题：
 * 1. 重复触发完成回调（toast 重复弹出）
 * 2. 闭包导致 clearInterval 失效
 * 3. 组件卸载后仍在轮询
 * 4. 超时处理
 * 
 * @example
 * ```tsx
 * const { startPolling, stopPolling, isPolling } = useAsyncPolling({
 *   pollFn: async (taskId) => {
 *     const res = await fetch(`/api/status/${taskId}`);
 *     return res.json();
 *   },
 *   onComplete: (result) => {
 *     setResult(result);
 *     toast.success('完成'); // 只会触发一次
 *   },
 *   onFailed: (error) => {
 *     toast.error(error);
 *   },
 *   interval: 2000,
 *   timeout: 5 * 60 * 1000,
 * });
 * 
 * // 开始轮询
 * startPolling(taskId);
 * 
 * // 手动停止
 * stopPolling();
 * ```
 */

import { useRef, useCallback, useEffect, useState } from 'react';

export type PollingStatus = 'idle' | 'polling' | 'completed' | 'failed' | 'timeout';

export interface PollingResult<T> {
  status: PollingStatus;
  data?: T;
  error?: string;
  progress?: number;
  progressMessage?: string;
}

export interface UseAsyncPollingOptions<T> {
  /** 轮询函数，返回任务状态 */
  pollFn: (taskId: string | number) => Promise<PollingResult<T>>;
  /** 任务完成回调 */
  onComplete: (result: T) => void;
  /** 任务失败回调 */
  onFailed?: (error: string) => void;
  /** 超时回调 */
  onTimeout?: () => void;
  /** 轮询间隔（毫秒），默认 2000 */
  interval?: number;
  /** 超时时间（毫秒），默认 5 分钟 */
  timeout?: number;
  /** 进度更新回调 */
  onProgress?: (progress: number, message: string) => void;
}

export interface UseAsyncPollingReturn {
  /** 开始轮询 */
  startPolling: (taskId: string | number) => void;
  /** 停止轮询 */
  stopPolling: () => void;
  /** 是否正在轮询 */
  isPolling: boolean;
  /** 当前状态 */
  status: PollingStatus;
  /** 当前任务 ID */
  currentTaskId: string | number | null;
}

export function useAsyncPolling<T>(options: UseAsyncPollingOptions<T>): UseAsyncPollingReturn {
  const {
    pollFn,
    onComplete,
    onFailed,
    onTimeout,
    interval = 2000,
    timeout = 5 * 60 * 1000,
    onProgress,
  } = options;

  // 状态
  const [status, setStatus] = useState<PollingStatus>('idle');
  const [isPolling, setIsPolling] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | number | null>(null);

  // 使用 ref 避免闭包问题
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletedRef = useRef(false);
  const mountedRef = useRef(true);

  // 清理所有定时器
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // 停止轮询
  const stopPolling = useCallback(() => {
    cleanup();
    setStatus('idle');
    setCurrentTaskId(null);
  }, [cleanup]);

  // 执行单次轮询
  const executePoll = useCallback(async (taskId: string | number) => {
    // 如果已完成，不再处理
    if (isCompletedRef.current) return;

    try {
      const result = await pollFn(taskId);

      // 再次检查是否已完成（可能在请求过程中被其他地方标记完成）
      if (isCompletedRef.current) return;

      // 组件已卸载
      if (!mountedRef.current) return;

      if (result.status === 'completed') {
        // 标记完成，防止重复触发
        isCompletedRef.current = true;
        cleanup();
        setStatus('completed');
        onComplete(result.data as T);
        return;
      }

      if (result.status === 'failed') {
        isCompletedRef.current = true;
        cleanup();
        setStatus('failed');
        onFailed?.(result.error || '任务失败');
        return;
      }

      // 处理中，更新进度
      if (result.status === 'polling' && onProgress) {
        onProgress(result.progress || 0, result.progressMessage || '');
      }

    } catch (error) {
      console.error('[useAsyncPolling] 轮询出错:', error);
      // 网络错误不中断轮询，继续尝试
    }
  }, [pollFn, onComplete, onFailed, onProgress, cleanup]);

  // 开始轮询
  const startPolling = useCallback((taskId: string | number) => {
    // 重置状态
    isCompletedRef.current = false;
    cleanup();
    
    setStatus('polling');
    setIsPolling(true);
    setCurrentTaskId(taskId);

    // 立即执行一次
    executePoll(taskId);

    // 设置轮询间隔
    intervalRef.current = setInterval(() => {
      executePoll(taskId);
    }, interval);

    // 设置超时
    timeoutRef.current = setTimeout(() => {
      if (!isCompletedRef.current) {
        isCompletedRef.current = true;
        cleanup();
        setStatus('timeout');
        onTimeout?.();
      }
    }, timeout);
  }, [executePoll, cleanup, interval, timeout, onTimeout]);

  // 组件卸载时清理
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    startPolling,
    stopPolling,
    isPolling,
    status,
    currentTaskId,
  };
}

export default useAsyncPolling;
