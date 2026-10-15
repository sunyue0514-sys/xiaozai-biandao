/**
 * 生成历史管理 Hook
 * 用于保存和恢复用户生成的文案和脚本历史记录
 * 
 * 功能特点：
 * - 使用 localStorage 存储，页面刷新后数据不丢失
 * - 每种类型最多保存 50 条历史
 * - 历史记录 7 天后自动过期
 * - 支持按类型筛选历史记录
 */

import { useMemo, useCallback, useEffect } from 'react';
import { readLocalStorage, writeLocalStorage, useLocalStorageValue } from './useLocalStorageValue';
import { useCurrentTime } from './useCurrentTime';

// 历史记录项
export interface HistoryItem {
  id: string;              // 唯一ID
  type: string;            // 生成类型：topic, writing, script, qianchuan_copywriting, qianchuan_script, feedad_copywriting, feedad_script
  content: string;         // 生成的内容
  title: string;           // 标题（用于列表显示）
  params: Record<string, any>; // 生成参数
  createdAt: number;       // 创建时间戳
  expiresAt: number;       // 过期时间戳
}

// 历史记录存储结构
interface HistoryStorage {
  items: HistoryItem[];
  version: number;
}

const STORAGE_KEY = 'generation_history';
const MAX_ITEMS_PER_TYPE = 50;  // 每种类型最多保存50条
const EXPIRE_DAYS = 7;          // 7天过期
const STORAGE_VERSION = 1;

/**
 * 生成历史管理 Hook
 */
function readHistory(raw = readLocalStorage(STORAGE_KEY)): HistoryItem[] {
  try {
    if (!raw) return [];
    const data: HistoryStorage = JSON.parse(raw);
    if (data.version !== STORAGE_VERSION || !Array.isArray(data.items)) return [];
    return data.items.filter(item => item && typeof item.id === 'string' && typeof item.type === 'string' && typeof item.content === 'string' && typeof item.title === 'string' && typeof item.createdAt === 'number' && typeof item.expiresAt === 'number');
  } catch { return []; }
}

function saveHistory(items: HistoryItem[]) {
  try {
    writeLocalStorage(STORAGE_KEY, JSON.stringify({ items, version: STORAGE_VERSION }));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      // Keep the newest half if storage is full, rather than discarding them.
      const newest = [...items].sort((a, b) => b.createdAt - a.createdAt).slice(0, Math.ceil(items.length / 2));
      try { writeLocalStorage(STORAGE_KEY, JSON.stringify({ items: newest, version: STORAGE_VERSION })); }
      catch { console.error('History storage is unavailable'); }
    } else { console.error('History storage is unavailable'); }
  }
}

export function useGenerationHistory() {
  const stored = useLocalStorageValue(STORAGE_KEY);
  const now = useCurrentTime();
  const history = useMemo(() => {
    if (stored === undefined || !now) return [];
    return readHistory(stored).filter(item => item.expiresAt > now);
  }, [stored, now]);
  const isLoaded = stored !== undefined;
  useEffect(() => {
    if (stored === undefined || !now) return;
    const items = readHistory(stored);
    const validItems = items.filter(item => item.expiresAt > now);
    if (validItems.length !== items.length) saveHistory(validItems);
  }, [stored, now]);

  const addHistory = useCallback((
    type: string,
    content: string,
    params: Record<string, any> = {}
  ): HistoryItem => {
    const now = Date.now();
    const expiresAt = now + EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    
    // 生成标题：取内容前50字符或使用参数中的标题
    const title = params.title || 
      params.topic || 
      params.productInfo?.productName || 
      content.substring(0, 50).replace(/\n/g, ' ') || 
      '生成内容';
    
    const newItem: HistoryItem = {
      id: `${type}_${now}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      content,
      title: title.substring(0, 100),
      params,
      createdAt: now,
      expiresAt,
    };

    const prev = readHistory().filter(item => item.expiresAt > now);
    {
      // 获取同类型的现有记录
      const sameTypeItems = prev.filter(item => item.type === type);
      const otherTypeItems = prev.filter(item => item.type !== type);
      
      // 如果同类型记录超过限制，删除最旧的
      let newSameTypeItems = [newItem, ...sameTypeItems];
      if (newSameTypeItems.length > MAX_ITEMS_PER_TYPE) {
        newSameTypeItems = newSameTypeItems.slice(0, MAX_ITEMS_PER_TYPE);
      }
      
      const newHistory = [...newSameTypeItems, ...otherTypeItems];
      saveHistory(newHistory);
    }

    return newItem;
  }, []);

  // 删除单条历史记录
  const deleteHistory = useCallback((id: string) => {
    saveHistory(readHistory().filter(item => item.id !== id && item.expiresAt > Date.now()));
  }, []);

  const clearTypeHistory = useCallback((type: string) => {
    saveHistory(readHistory().filter(item => item.type !== type && item.expiresAt > Date.now()));
  }, []);

  const clearAllHistory = useCallback(() => {
    try { writeLocalStorage(STORAGE_KEY, null); }
    catch { console.error('History storage is unavailable'); }
  }, []);

  const getTypeHistory = useCallback((type: string): HistoryItem[] => {
    return history
      .filter(item => item.type === type)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [history]);

  // 获取类型显示名称
  const getTypeName = useCallback((type: string): string => {
    const typeNames: Record<string, string> = {
      'topic': '智能选题',
      'topic_batch': '智能选题',
      'writing': '文案创作',
      'script': '脚本生成',
      'scriptless_shooting': '无脚本拍摄',
      'qianchuan_copywriting': '千川文案',
      'qianchuan_script': '千川脚本',
      'feedad_copywriting': '信息流文案',
      'feedad_script': '信息流脚本',
      'create_opening': '开篇创作',
      'opening_batch': '批量开篇',
    };
    return typeNames[type] || type;
  }, []);

  // 格式化时间显示
  const formatTime = useCallback((timestamp: number): string => {
    const diff = now - timestamp;
    
    if (diff < 60 * 1000) {
      return '刚刚';
    } else if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / 60 / 1000)}分钟前`;
    } else if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / 60 / 60 / 1000)}小时前`;
    } else {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  }, [now]);

  // 恢复历史记录（返回参数，让调用方处理跳转）
  const restoreHistory = useCallback((item: HistoryItem) => {
    return {
      content: item.content,
      params: item.params,
      type: item.type,
    };
  }, []);

  return {
    history,
    isLoaded,
    addHistory,
    deleteHistory,
    clearTypeHistory,
    clearAllHistory,
    getTypeHistory,
    getTypeName,
    formatTime,
    restoreHistory,
  };
}

// 类型分组配置
export const HISTORY_TYPE_GROUPS = {
  '选题文案': ['topic', 'topic_batch', 'writing', 'script'],
  '无脚本拍摄': ['scriptless_shooting'],
  '开篇创作': ['create_opening', 'opening_batch'],
  '千川素材': ['qianchuan_copywriting', 'qianchuan_script'],
  '信息流广告': ['feedad_copywriting', 'feedad_script'],
};

// 类型到页面路径的映射
export const HISTORY_TYPE_ROUTES: Record<string, string> = {
  'topic': '/script/result',      // 跳转到结果页面
  'topic_batch': '/script/result', // 跳转到结果页面
  'writing': '/script/result',
  'script': '/script/result',
  'scriptless_shooting': '/script/scriptless',
  'qianchuan_copywriting': '/script/result',
  'qianchuan_script': '/script/result',
  'feedad_copywriting': '/script/result',
  'feedad_script': '/script/result',
  'create_opening': '/script/result',
  'opening_batch': '/script/result',
};
