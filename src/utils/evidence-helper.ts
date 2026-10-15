/**
 * 证据字段工具函数
 * 
 * LLM 返回的证据字段可能是两种格式：
 * 1. 字符串格式："视频证据（时间戳+原文）"
 * 2. 对象格式：{ timestamp: "0-5s", originalText: "原文引用" }
 * 
 * 这些工具函数帮助组件安全地处理这两种格式
 */

/**
 * 证据对象格式（LLM 可能返回的格式）
 */
export interface EvidenceObject {
  timestamp?: string;
  originalText?: string;
  content?: string;
  [key: string]: unknown;
}

/**
 * 证据字段可能的类型
 */
export type EvidenceField = string | EvidenceObject | null | undefined;

/**
 * 检查证据字段是否为对象格式
 */
export function isEvidenceObject(value: EvidenceField): value is EvidenceObject {
  return value !== null && 
         value !== undefined && 
         typeof value === 'object';
}

/**
 * 安全获取证据文本
 * 支持字符串或对象格式
 */
export function getEvidenceText(value: EvidenceField): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  // 对象格式：优先使用 originalText，其次 content，最后拼接所有文本字段
  if (typeof value === 'object') {
    if (value.originalText) {
      return value.timestamp 
        ? `[${value.timestamp}] ${value.originalText}` 
        : value.originalText;
    }
    if (value.content) {
      return value.timestamp 
        ? `[${value.timestamp}] ${value.content}` 
        : value.content;
    }
    // 兜底：尝试提取所有字符串值
    const textParts = Object.values(value)
      .filter((v): v is string => typeof v === 'string')
      .filter(v => v.trim());
    return textParts.join(' ');
  }
  
  return String(value);
}

/**
 * 安全获取时间戳
 */
export function getEvidenceTimestamp(value: EvidenceField): string | null {
  if (!isEvidenceObject(value)) {
    return null;
  }
  return value.timestamp || null;
}

/**
 * 安全获取原文
 */
export function getEvidenceOriginalText(value: EvidenceField): string {
  if (!isEvidenceObject(value)) {
    return typeof value === 'string' ? value : '';
  }
  return value.originalText || value.content || '';
}
