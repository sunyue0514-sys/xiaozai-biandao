import { useMemo, useCallback } from 'react';
import { readLocalStorage, writeLocalStorage, useLocalStorageValue } from './useLocalStorageValue';

// 模板类型
export interface FormTemplate {
  id: string;
  name: string;
  type: 'topic' | 'writing' | 'qianchuan' | 'feedad' | 'script' | 'create_opening';
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// 存储 key 前缀
const STORAGE_PREFIX = 'form_templates_';

// 获取存储 key
const getStorageKey = (type: FormTemplate['type']) => `${STORAGE_PREFIX}${type}`;

// 生成唯一 ID
const generateId = () => `template_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/**
 * 表单模板管理 Hook
 * @param type 模板类型
 */
function readTemplates(type: FormTemplate['type'], raw = readLocalStorage(getStorageKey(type))): FormTemplate[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item && item.type === type && typeof item.id === 'string' && typeof item.name === 'string' && item.data && typeof item.data === 'object') : [];
  } catch { return []; }
}

export function useFormTemplates<T extends Record<string, any>>(type: FormTemplate['type']) {
  const stored = useLocalStorageValue(getStorageKey(type));
  const templates = useMemo(() => stored === undefined ? [] : readTemplates(type, stored), [stored, type]);
  const isLoaded = stored !== undefined;
  const saveToStorage = useCallback((items: FormTemplate[]) => {
    writeLocalStorage(getStorageKey(type), JSON.stringify(items));
  }, [type]);

  const saveTemplate = useCallback((name: string, data: T): FormTemplate | null => {
    try {
      const now = new Date().toISOString();
      const newTemplate: FormTemplate = {
        id: generateId(),
        name,
        type,
        data,
        createdAt: now,
        updatedAt: now,
      };

      const newTemplates = [...readTemplates(type), newTemplate];
      saveToStorage(newTemplates);
      return newTemplate;
    } catch (error) {
      console.error('保存模板失败:', error);
      return null;
    }
  }, [saveToStorage, type]);

  // 更新模板
  const updateTemplate = useCallback((id: string, data: Partial<T>): FormTemplate | null => {
    try {
      const currentTemplates = readTemplates(type);
      const index = currentTemplates.findIndex(t => t.id === id);
      if (index === -1) return null;

      const now = new Date().toISOString();
      const updatedTemplate: FormTemplate = {
        ...currentTemplates[index],
        data: { ...currentTemplates[index].data, ...data },
        updatedAt: now,
      };

      const newTemplates = [...currentTemplates];
      newTemplates[index] = updatedTemplate;
      saveToStorage(newTemplates);
      return updatedTemplate;
    } catch (error) {
      console.error('更新模板失败:', error);
      return null;
    }
  }, [saveToStorage, type]);

  // 删除模板
  const deleteTemplate = useCallback((id: string): boolean => {
    try {
      const newTemplates = readTemplates(type).filter(t => t.id !== id);
      saveToStorage(newTemplates);
      return true;
    } catch (error) {
      console.error('删除模板失败:', error);
      return false;
    }
  }, [saveToStorage, type]);

  // 加载模板数据
  const loadTemplate = useCallback((id: string): T | null => {
    const template = templates.find(t => t.id === id);
    return template ? (template.data as T) : null;
  }, [templates]);

  // 检查模板名是否已存在
  const isNameExists = useCallback((name: string, excludeId?: string): boolean => {
    return templates.some(t => t.name === name && t.id !== excludeId);
  }, [templates]);

  return {
    templates,
    isLoaded,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    loadTemplate,
    isNameExists,
  };
}

/**
 * 获取默认模板名称
 */
export function getDefaultTemplateName(type: FormTemplate['type']): string {
  const typeNames: Record<string, string> = {
    topic: '选题模板',
    writing: '文案模板',
    qianchuan: '千川模板',
    feedad: '信息流模板',
    script: '脚本模板',
    create_opening: '开篇模板',
  };
  const baseName = typeNames[type] || '模板';
  const timestamp = new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/\//g, '-');
  return `${baseName} ${timestamp}`;
}
