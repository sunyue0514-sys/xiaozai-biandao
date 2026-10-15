/**
 * 历史记录恢复 Hook
 * 用于从 URL 参数恢复历史记录状态
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { HistoryItem } from './useGenerationHistory';

interface UseHistoryRestoreOptions {
  // 当前页面支持的类型
  supportedTypes: string[];
  // 恢复成功回调
  onRestore?: (item: HistoryItem) => void;
  // 恢复失败回调
  onError?: (error: string) => void;
}

interface UseHistoryRestoreResult {
  // 是否正在加载历史记录
  isLoading: boolean;
  // 恢复的历史记录
  restoredItem: HistoryItem | null;
  // 错误信息
  error: string | null;
}

/**
 * 从 URL 参数恢复历史记录状态
 * 
 * 使用方式：
 * ```tsx
 * const { isLoading, restoredItem } = useHistoryRestore({
 *   supportedTypes: ['topic_batch'],
 *   onRestore: (item) => {
 *     setResult(item.content);
 *     setForm(prev => ({ ...prev, ...item.params }));
 *   }
 * });
 * ```
 */
export function useHistoryRestore(options: UseHistoryRestoreOptions): UseHistoryRestoreResult {
  const { supportedTypes, onRestore, onError } = options;
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [restoredItem, setRestoredItem] = useState<HistoryItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const historyId = searchParams.get('historyId');
    
    if (!historyId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 从 sessionStorage 读取历史记录
      const storedData = sessionStorage.getItem(`history_${historyId}`);
      
      if (!storedData) {
        const errorMsg = '历史记录不存在或已过期';
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        return;
      }

      const item: HistoryItem = JSON.parse(storedData);

      // 检查类型是否支持
      if (!supportedTypes.includes(item.type)) {
        const errorMsg = `不支持的历史记录类型: ${item.type}`;
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        return;
      }

      // 检查是否过期
      if (item.expiresAt < Date.now()) {
        const errorMsg = '历史记录已过期';
        setError(errorMsg);
        onError?.(errorMsg);
        // 清理过期的 sessionStorage 数据
        sessionStorage.removeItem(`history_${historyId}`);
        setIsLoading(false);
        return;
      }

      // 恢复成功
      setRestoredItem(item);
      onRestore?.(item);
      
      // 清理 URL 参数（避免刷新时重复恢复）
      const url = new URL(window.location.href);
      url.searchParams.delete('historyId');
      window.history.replaceState({}, '', url.toString());
      
      // 清理 sessionStorage
      sessionStorage.removeItem(`history_${historyId}`);
      
    } catch (err) {
      const errorMsg = '恢复历史记录失败';
      console.error('[历史记录恢复失败]', err);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, supportedTypes, onRestore, onError]);

  return { isLoading, restoredItem, error };
}
