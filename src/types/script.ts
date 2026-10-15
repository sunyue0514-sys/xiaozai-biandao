/**
 * 脚本生成相关类型定义
 * 用于结构化脚本输出和展示
 */

/**
 * 视频基础信息
 */
export interface VideoBasicInfo {
  title: string;              // 视频标题
  publishCopywriting: string; // 发布文案（可直接用于抖音发布）
  duration: string;           // 预计时长（如"90秒"）
  hashtags: string[];         // 话题标签
  brandPartner?: string;      // 合作品牌（可留空）
}

/**
 * 单个分镜
 */
export interface ScriptShot {
  shotNumber: number;         // 镜号
  duration: string;           // 参考时长（如"5秒"）
  shotType: string;           // 景别（中景/近景/特写）
  cameraPosition: string;     // 机位（自拍/固定等）
  visual: string;             // 画面描述
  copywriting: string;        // 文案/台词
  notes: string;              // 备注（拍摄技巧、字幕特效等）
}

/**
 * 完整脚本结构
 */
export interface ScriptResult {
  basicInfo: VideoBasicInfo;
  shots: ScriptShot[];
  shootingAdvice?: string;    // 拍摄建议
}

/**
 * 双版本脚本结构（精华版+详细版）
 */
export interface DualVersionScriptResult {
  essentialVersion: ScriptResult;  // 精华版（15-30秒）
  detailedVersion: ScriptResult;   // 详细版（完整版）
}

/**
 * 脚本生成请求参数
 */
export interface ScriptGenerateParams {
  topic: string;              // 选题主题
  scriptType: string;         // 脚本类型：story/process/knowledge/opinion/product
  shootingMethod: string;     // 拍摄方式
  context?: string;           // 补充要求
  customerId?: number;        // 客户ID
  customerName?: string;      // 客户名称
  ipPositioning?: any;        // IP定位信息
}

/**
 * 景别选项
 */
export const SHOT_TYPES = [
  { value: '特写', label: '特写', desc: '面部或物品细节' },
  { value: '近景', label: '近景', desc: '胸部以上' },
  { value: '中景', label: '中景', desc: '腰部以上' },
  { value: '全景', label: '全景', desc: '全身或完整场景' },
  { value: '远景', label: '远景', desc: '环境全貌' },
] as const;

/**
 * 机位选项
 */
export const CAMERA_POSITIONS = [
  { value: '自拍', label: '自拍', desc: '手持手机自拍' },
  { value: '固定', label: '固定', desc: '三脚架固定' },
  { value: '跟拍', label: '跟拍', desc: '跟随主体移动' },
  { value: '俯拍', label: '俯拍', desc: '从上往下拍' },
  { value: '仰拍', label: '仰拍', desc: '从下往上拍' },
  { value: '手持', label: '手持', desc: '手持轻微晃动' },
] as const;

/**
 * 智能补全被截断的 JSON
 * 处理模型输出被截断导致 JSON 不完整的情况
 * 增强版：更健壮的处理各种截断情况
 */
function smartCompleteJson(jsonStr: string): string | null {
  const trimmed = jsonStr.trim();
  
  if (!trimmed || !trimmed.startsWith('{')) {
    return null;
  }
  
  // 如果已经可以解析，直接返回
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch (e) {
    // 继续处理
  }
  
  let working = trimmed;
  const lines = working.split('\n');
  
  // 情况1：多行输入（常见情况）
  if (lines.length > 1) {
    // 移除最后一行（可能是被截断的）
    lines.pop();
    working = lines.join('\n');
    
    // 移除末尾逗号
    const lastLine = lines[lines.length - 1];
    if (lastLine && lastLine.trim().endsWith(',')) {
      lines[lines.length - 1] = lastLine.replace(/,(\s*)$/, '$1');
      working = lines.join('\n');
    }
    
    // 全局移除末尾逗号
    working = working.replace(/,\s*$/, '');
    
    // 统计括号
    const openBrackets = (working.match(/\[/g) || []).length;
    const closeBrackets = (working.match(/\]/g) || []).length;
    const openBraces = (working.match(/\{/g) || []).length;
    const closeBraces = (working.match(/\}/g) || []).length;
    
    const bracketDiff = openBrackets - closeBrackets;
    const braceDiff = openBraces - closeBraces;
    
    let result = working;
    
    // 正确的补全逻辑
    // 1. 如果有未闭合的数组（bracketDiff > 0），先补 } 再补 ]
    // 2. 如果没有数组，直接补 } 闭合所有未匹配的大括号
    if (bracketDiff > 0) {
      // 在数组内
      // 补 (braceDiff - 1) 个 } 来闭合当前对象
      if (braceDiff > 0) {
        result += '}'.repeat(Math.max(0, braceDiff - 1));
      }
      // 补 ] 来闭合数组
      result += ']';
      // 补 1 个 } 来闭合顶层对象
      result += '}';
    } else {
      // 不在数组内，直接补大括号
      if (braceDiff > 0) {
        result += '}'.repeat(braceDiff);
      }
      if (!result.endsWith('}')) {
        result += '}';
      }
    }
    
    try {
      JSON.parse(result);
      return result;
    } catch (e) {
      // 如果失败，尝试其他方法
    }
  }
  
  // 情况2：单行输入
  const line = lines[0] || '';
  
  // 策略1：查找最后一个逗号
  const lastCommaIndex = line.lastIndexOf(',');
  if (lastCommaIndex > 0) {
    let base = line.slice(0, lastCommaIndex);
    base = base.replace(/,\s*$/, '');
    
    const openBrackets = (base.match(/\[/g) || []).length;
    const closeBrackets = (base.match(/\]/g) || []).length;
    const openBraces = (base.match(/\{/g) || []).length;
    const closeBraces = (base.match(/\}/g) || []).length;
    
    const bracketDiff = openBrackets - closeBrackets;
    const braceDiff = openBraces - closeBraces;
    
    let result = base;
    
    if (bracketDiff > 0) {
      if (braceDiff > 0) {
        result += '}'.repeat(Math.max(0, braceDiff - 1));
      }
      result += ']';
      result += '}';
    } else {
      if (braceDiff > 0) {
        result += '}'.repeat(braceDiff);
      }
      if (!result.endsWith('}')) {
        result += '}';
      }
    }
    
    try {
      JSON.parse(result);
      return result;
    } catch (e) {
      // 继续
    }
  }
  
  // 策略2：没有逗号，查找 {" 模式（对象开始）
  const lastBraceOpen = line.lastIndexOf('{"');
  if (lastBraceOpen > 0) {
    let base = line.slice(0, lastBraceOpen);
    base = base.replace(/,\s*$/, '');
    
    const openBraces = (base.match(/\{/g) || []).length;
    const closeBraces = (base.match(/\}/g) || []).length;
    
    if (openBraces > closeBraces) {
      base += '}'.repeat(openBraces);
    }
    if (!base.endsWith('}')) {
      base += '}';
    }
    
    try {
      JSON.parse(base);
      return base;
    } catch (e) {
      // 继续
    }
  }
  
  return null;
}

/**
 * 修复模型输出中缺少引号的字符串
 * 例如: ["a", #薪资翻倍", "b"] -> ["a", "#薪资翻倍", "b"]
 */
function fixMissingQuotesInArray(jsonStr: string): string {
  // 匹配数组中缺少引号的字符串
  // 模式: [ ... , #xxx", 或 [ ... , xxx", (以 # 或字母开头，以 " 结尾)
  // 但不匹配已经是 "xxx" 的情况
  
  let fixed = jsonStr;
  
  // 修复模式1: , #...", -> , "#...",  (在数组中，以 # 开头缺少引号)
  fixed = fixed.replace(/,\s*#([^"]+)"(?=\s*[,\]])/g, ', "#$1"');
  
  // 修复模式2: , 字母开头缺少引号的情况 (但排除已经是 "xxx" 的)
  // 查找数组中以逗号分隔，后面跟着字母或 #，但没有开始引号的项
  // 例如: ["a", xxx", "b"] 中的 xxx" 应该变成 "xxx"
  fixed = fixed.replace(/,\s*([^\s"][^"]*?)"(?=\s*[,\]])/g, ', "$1"');
  
  // 更安全的模式：只修复明显的错误
  // 在数组中，查找 , xxx" 格式（逗号后、空格后、直接跟非引号字符）
  // 但这可能会误修复正常内容，需要更精确
  
  return fixed;
}

/**
 * 解析AI返回的脚本JSON
 * 支持单版本和双版本格式
 * 增强版：支持被截断的 JSON 自动补全
 */
export function parseScriptJson(content: string): ScriptResult | DualVersionScriptResult | null {
  let jsonContent = content.trim();
  
  // 移除可能的markdown代码块标记
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.slice(7);
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.slice(3);
  }
  if (jsonContent.endsWith('```')) {
    jsonContent = jsonContent.slice(0, -3);
  }
    
  // 修复中文引号问题：将中文引号替换为英文引号
  jsonContent = jsonContent
    .replace(/[""]/g, '"')  // 中文双引号
    .replace(/['']/g, "'"); // 中文单引号
    
  // 修复模型输出中数组元素缺少引号的问题
  // 例如: ["a", #薪资翻倍", "b"] -> ["a", "#薪资翻倍", "b"]
  jsonContent = fixMissingQuotesInArray(jsonContent);
    
  // 第一次解析尝试
  try {
    const parsed = JSON.parse(jsonContent.trim());
    return validateAndReturn(parsed);
  } catch (e) {
    console.log('[parseScriptJson] 首次解析失败，尝试 JSON 补全...');
    
    // 尝试智能补全被截断的 JSON
    const completed = smartCompleteJson(jsonContent);
    if (completed) {
      try {
        const parsed = JSON.parse(completed);
        return validateAndReturn(parsed);
      } catch (e2) {
        console.error('[parseScriptJson] 补全后解析仍失败:', e2);
      }
    }
    
    // 最后尝试：移除末尾不完整的内容再解析
    try {
      // 尝试找到最后一个完整的闭合括号
      const lastValidIndex = findLastValidJsonIndex(jsonContent);
      if (lastValidIndex > 0) {
        const truncated = jsonContent.substring(0, lastValidIndex + 1);
        console.log('[parseScriptJson] 截断到有效位置，长度:', truncated.length);
        const parsed = JSON.parse(truncated);
        return validateAndReturn(parsed);
      }
    } catch (e3) {
      console.error('[parseScriptJson] 截断解析失败:', e3);
    }
    
    console.error('[parseScriptJson] 所有解析尝试均失败');
    return null;
  }
}

/**
 * 验证解析后的对象并返回
 */
function validateAndReturn(parsed: any): ScriptResult | DualVersionScriptResult | null {
  // 双版本格式
  if (parsed.essentialVersion && parsed.detailedVersion) {
    // 验证两个版本的必要字段
    if (
      parsed.essentialVersion.basicInfo && 
      parsed.essentialVersion.shots && 
      Array.isArray(parsed.essentialVersion.shots) &&
      parsed.detailedVersion.basicInfo && 
      parsed.detailedVersion.shots && 
      Array.isArray(parsed.detailedVersion.shots)
    ) {
      return parsed as DualVersionScriptResult;
    }
  }
    
  // 单版本格式
  if (parsed.basicInfo && parsed.shots && Array.isArray(parsed.shots)) {
    return parsed as ScriptResult;
  }
    
  return null;
}

/**
 * 找到最后一个有效的 JSON 结束位置
 */
function findLastValidJsonIndex(jsonStr: string): number {
  let lastValidIndex = -1;
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && bracketCount === 0) {
        lastValidIndex = i;
      }
    } else if (char === '[') {
      bracketCount++;
    } else if (char === ']') {
      bracketCount--;
      if (braceCount === 0 && bracketCount === 0) {
        lastValidIndex = i;
      }
    }
  }
  
  return lastValidIndex;
}

/**
 * 将脚本结果转换为纯文本格式（用于复制和下载）
 */
export function scriptToText(script: ScriptResult): string {
  const lines: string[] = [];
  
  // 视频基础信息
  lines.push('═══════════════════════════════════════');
  lines.push('【视频基础信息】');
  lines.push('═══════════════════════════════════════');
  lines.push(`标题：${script.basicInfo.title}`);
  lines.push(`时长：${script.basicInfo.duration}`);
  lines.push(`话题：${script.basicInfo.hashtags.join(' ')}`);
  if (script.basicInfo.brandPartner) {
    lines.push(`合作品牌：${script.basicInfo.brandPartner}`);
  }
  lines.push('');
  lines.push('【发布文案】');
  lines.push(script.basicInfo.publishCopywriting);
  lines.push('');
  
  // 分镜脚本
  lines.push('═══════════════════════════════════════');
  lines.push('【分镜脚本】');
  lines.push('═══════════════════════════════════════');
  
  script.shots.forEach((shot) => {
    lines.push('');
    lines.push(`【镜头${shot.shotNumber}】(${shot.duration})`);
    lines.push(`景别：${shot.shotType}`);
    lines.push(`机位：${shot.cameraPosition}`);
    lines.push(`画面：${shot.visual}`);
    lines.push(`文案：${shot.copywriting}`);
    lines.push(`备注：${shot.notes}`);
  });
  
  // 拍摄建议
  if (script.shootingAdvice) {
    lines.push('');
    lines.push('═══════════════════════════════════════');
    lines.push('【拍摄建议】');
    lines.push('═══════════════════════════════════════');
    lines.push(script.shootingAdvice);
  }
  
  return lines.join('\n');
}

/**
 * 将脚本结果转换为CSV格式（用于Excel导出）
 */
export function scriptToCSV(script: ScriptResult): string {
  const headers = ['镜号', '参考时长', '景别', '机位', '画面', '文案', '备注'];
  const rows: string[][] = [headers];
  
  script.shots.forEach((shot) => {
    rows.push([
      String(shot.shotNumber),
      shot.duration,
      shot.shotType,
      shot.cameraPosition,
      shot.visual,
      shot.copywriting,
      shot.notes,
    ]);
  });
  
  // CSV转义处理
  return rows.map(row => 
    row.map(cell => {
      // 如果包含逗号、引号或换行，需要用引号包裹并转义引号
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
}

/**
 * 导出为专业的 Excel 文件（.xlsx 格式）
 * 使用 xlsx-js-style 支持完整样式
 */
export function exportToExcel(script: ScriptResult): void {
  import('xlsx-js-style').then((XLSX) => {
    // 定义样式
    const borderStyle = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    };
    
    // 标题样式：大字体、加粗、居中
    const titleStyle = {
      font: { sz: 18, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    
    // 表头样式：加粗、居中、浅蓝背景
    const headerStyle = {
      font: { sz: 11, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'D9E8FB' } },
      border: borderStyle,
    };
    
    // 内容样式：左对齐、自动换行
    const contentStyle = {
      font: { sz: 10, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: borderStyle,
    };
    
    // 镜号列居中
    const centerStyle = {
      font: { sz: 10, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: borderStyle,
    };
    
    // 信息标签样式
    const labelStyle = {
      font: { sz: 10, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    
    // 创建工作表数据
    const wsData: any[][] = [];
    
    // ========== 标题行 ==========
    wsData.push([{ v: script.basicInfo.title, t: 's', s: titleStyle }]);
    
    // 空行
    wsData.push([]);
    
    // ========== 基础信息区 ==========
    const infoRow = [
      { v: '视频时长：' + script.basicInfo.duration, t: 's', s: labelStyle },
      { v: '', t: 's', s: labelStyle },
      { v: '', t: 's', s: labelStyle },
      { v: '话题标签：' + script.basicInfo.hashtags.join(' '), t: 's', s: labelStyle },
    ];
    wsData.push(infoRow);
    
    // 发布文案
    wsData.push([]);
    wsData.push([
      { v: '发布文案：' + script.basicInfo.publishCopywriting, t: 's', s: labelStyle },
    ]);
    
    // 空行
    wsData.push([]);
    wsData.push([]);
    
    // ========== 分镜表格 ==========
    // 表头
    const headerRow = [
      { v: '镜号', t: 's', s: headerStyle },
      { v: '参考时长', t: 's', s: headerStyle },
      { v: '景别', t: 's', s: headerStyle },
      { v: '机位', t: 's', s: headerStyle },
      { v: '画面描述', t: 's', s: headerStyle },
      { v: '文案/台词', t: 's', s: headerStyle },
      { v: '备注', t: 's', s: headerStyle },
    ];
    wsData.push(headerRow);
    
    // 分镜数据
    script.shots.forEach((shot) => {
      wsData.push([
        { v: shot.shotNumber, t: 's', s: centerStyle },
        { v: shot.duration, t: 's', s: centerStyle },
        { v: shot.shotType, t: 's', s: centerStyle },
        { v: shot.cameraPosition, t: 's', s: centerStyle },
        { v: shot.visual, t: 's', s: contentStyle },
        { v: shot.copywriting, t: 's', s: contentStyle },
        { v: shot.notes, t: 's', s: contentStyle },
      ]);
    });
    
    // 空行
    wsData.push([]);
    
    // ========== 拍摄建议 ==========
    if (script.shootingAdvice) {
      wsData.push([
        { v: '拍摄建议：' + script.shootingAdvice, t: 's', s: labelStyle },
      ]);
    }
    
    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 6 },   // 镜号
      { wch: 10 },  // 参考时长
      { wch: 8 },   // 景别
      { wch: 8 },   // 机位
      { wch: 40 },  // 画面描述
      { wch: 50 },  // 文案/台词
      { wch: 30 },  // 备注
    ];
    
    // 设置行高
    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 30 }; // 标题行高
    ws['!rows'][6] = { hpt: 25 }; // 表头行高
    
    // 分镜数据行高
    for (let i = 0; i < script.shots.length; i++) {
      ws['!rows'][7 + i] = { hpt: 60 };
    }
    
    // 设置合并单元格
    const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
    
    // 标题合并
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });
    
    // 发布文案合并
    merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 6 } });
    
    // 拍摄建议合并
    if (script.shootingAdvice) {
      const adviceRow = 8 + script.shots.length;
      merges.push({ s: { r: adviceRow, c: 0 }, e: { r: adviceRow, c: 6 } });
    }
    
    ws['!merges'] = merges;
    
    // 创建工作簿并添加工作表
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '分镜脚本');
    
    // 导出文件
    const fileName = `${script.basicInfo.title.replace(/[\\/:*?"<>|]/g, '_')}_分镜脚本.xlsx`;
    XLSX.writeFile(wb, fileName);
  });
}

// ============================================================
// 仿写脚本专用类型（多形态输出）
// ============================================================

/**
 * 问答对话项
 */
export interface DialogueQA {
  question: string;   // 问题
  answerHints?: string[];  // 回答要点列表
  answer?: string;     // 完整回答（兼容旧格式）
}

/**
 * 仿写脚本结果（多形态输出）
 * 对标国外模型能力，支持四种呈现形式
 */
export interface RewriteScriptResult {
  // 基础信息
  title?: string;                    // 视频标题（可选）
  originalTopic?: string;            // 原视频话题（可选）
  
  // 形态一：爆款开头（黄金3秒钩子）
  hookOpening: {
    content: string;                 // 爆款开头内容（15-30字）
    hookTechnique?: string;          // 使用的钩子技巧
    emotionPoint?: string;           // 情绪触发点
  } | string;                        // 兼容旧格式（直接字符串）
  
  // 形态二：完整口播文案
  fullScript: {
    content: string;                 // 完整口播文案（200-500字）
    duration?: string;               // 预估时长
    keyPoints?: string[];            // 核心观点
    emotionCurve?: string;           // 情绪曲线描述
  } | string;                        // 兼容旧格式（直接字符串）
  
  // 形态三：问答对话版（适合无脚本拍摄）
  dialogueVersion?: {
    qaList: DialogueQA[];            // 问答列表（5-8组）
    shootingTips?: string;           // 拍摄建议
    // 兼容旧格式
    intro?: string;                  // 开场介绍
    closing?: string;                // 结尾升华
  };
  
  // 形态四：行动号召
  callToAction: {
    content: string;                 // 行动号召文案（20-40字）
    actionType?: string;             // 引导类型
    valuePromise?: string;           // 给用户的价值承诺
  } | string;                        // 兼容旧格式（直接字符串）
  
  // 元信息（可选）
  duration?: string;                 // 预计时长
  hashtags?: string[];               // 话题标签
  publishCopywriting?: string;       // 发布文案
}

/**
 * 解析仿写脚本JSON
 */
export function parseRewriteScriptJson(content: string): RewriteScriptResult | null {
  try {
    let jsonContent = content.trim();
    
    // 移除可能的markdown代码块标记
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    
    // 修复中文引号问题：将中文引号替换为英文引号
    jsonContent = jsonContent
      .replace(/[""]/g, '"')  // 中文双引号
      .replace(/['']/g, "'"); // 中文单引号
    
    const parsed = JSON.parse(jsonContent.trim());
    
    // 验证必要字段（新格式或旧格式都可以）
    // 新格式：hookOpening 和 fullScript 可以是对象
    // 旧格式：hookOpening 和 fullScript 是字符串
    const hasHookOpening = parsed.hookOpening && (
      typeof parsed.hookOpening === 'string' || 
      (typeof parsed.hookOpening === 'object' && parsed.hookOpening.content)
    );
    const hasFullScript = parsed.fullScript && (
      typeof parsed.fullScript === 'string' ||
      (typeof parsed.fullScript === 'object' && parsed.fullScript.content)
    );
    const hasCallToAction = parsed.callToAction && (
      typeof parsed.callToAction === 'string' ||
      (typeof parsed.callToAction === 'object' && parsed.callToAction.content)
    );
    
    if (hasHookOpening && hasFullScript && hasCallToAction) {
      return parsed as RewriteScriptResult;
    }
    
    return null;
  } catch (e) {
    console.error('解析仿写脚本JSON失败:', e);
    return null;
  }
}

/**
 * 辅助函数：获取 hookOpening 的内容
 */
export function getHookOpeningContent(hookOpening: RewriteScriptResult['hookOpening']): string {
  if (typeof hookOpening === 'string') {
    return hookOpening;
  }
  return hookOpening?.content || '';
}

/**
 * 辅助函数：获取 fullScript 的内容
 */
export function getFullScriptContent(fullScript: RewriteScriptResult['fullScript']): string {
  if (typeof fullScript === 'string') {
    return fullScript;
  }
  return fullScript?.content || '';
}

/**
 * 辅助函数：获取 callToAction 的内容
 */
export function getCallToActionContent(callToAction: RewriteScriptResult['callToAction']): string {
  if (typeof callToAction === 'string') {
    return callToAction;
  }
  return callToAction?.content || '';
}

/**
 * 将仿写脚本转换为纯文本格式（用于复制）
 */
export function rewriteScriptToText(script: RewriteScriptResult): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════');
  lines.push('【仿写脚本 - 多形态输出】');
  lines.push('═══════════════════════════════════════');
  
  if (script.title) {
    lines.push(`标题：${script.title}`);
  }
  lines.push('');
  
  // 爆款开头
  lines.push('─────────────────────────────────────');
  lines.push('【爆款开头（黄金3秒钩子）】');
  lines.push('─────────────────────────────────────');
  lines.push(getHookOpeningContent(script.hookOpening));
  
  // 新格式额外信息
  if (typeof script.hookOpening === 'object') {
    if (script.hookOpening.hookTechnique) {
      lines.push(`\n💡 钩子技巧：${script.hookOpening.hookTechnique}`);
    }
    if (script.hookOpening.emotionPoint) {
      lines.push(`🎯 情绪触发点：${script.hookOpening.emotionPoint}`);
    }
  }
  lines.push('');
  
  // 完整口播文案
  lines.push('─────────────────────────────────────');
  lines.push('【完整口播文案】');
  lines.push('─────────────────────────────────────');
  lines.push(getFullScriptContent(script.fullScript));
  
  // 新格式额外信息
  if (typeof script.fullScript === 'object') {
    if (script.fullScript.duration) {
      lines.push(`\n⏱️ 预估时长：${script.fullScript.duration}`);
    }
    if (script.fullScript.keyPoints && script.fullScript.keyPoints.length > 0) {
      lines.push(`\n📌 核心观点：`);
      script.fullScript.keyPoints.forEach((point, index) => {
        lines.push(`  ${index + 1}. ${point}`);
      });
    }
    if (script.fullScript.emotionCurve) {
      lines.push(`\n📈 情绪曲线：${script.fullScript.emotionCurve}`);
    }
  }
  lines.push('');
  
  // 行动号召
  lines.push('─────────────────────────────────────');
  lines.push('【行动号召】');
  lines.push('─────────────────────────────────────');
  lines.push(getCallToActionContent(script.callToAction));
  
  // 新格式额外信息
  if (typeof script.callToAction === 'object') {
    if (script.callToAction.actionType) {
      lines.push(`\n📊 引导类型：${script.callToAction.actionType}`);
    }
    if (script.callToAction.valuePromise) {
      lines.push(`💎 价值承诺：${script.callToAction.valuePromise}`);
    }
  }
  lines.push('');
  
  // 问答对话版（如果有）
  if (script.dialogueVersion && script.dialogueVersion.qaList.length > 0) {
    lines.push('═══════════════════════════════════════');
    lines.push('【问答对话版（适合无脚本拍摄）】');
    lines.push('═══════════════════════════════════════');
    lines.push('');
    
    if (script.dialogueVersion.intro) {
      lines.push(`开场：${script.dialogueVersion.intro}`);
      lines.push('');
    }
    
    script.dialogueVersion.qaList.forEach((qa, index) => {
      lines.push(`【问题${index + 1}】${qa.question}`);
      
      if (qa.answerHints && qa.answerHints.length > 0) {
        lines.push('【回答要点】');
        qa.answerHints.forEach((hint, hintIndex) => {
          lines.push(`  ${hintIndex + 1}. ${hint}`);
        });
      } else if (qa.answer) {
        lines.push(`【回答】${qa.answer}`);
      }
      lines.push('');
    });
    
    if (script.dialogueVersion.closing) {
      lines.push(`结尾：${script.dialogueVersion.closing}`);
      lines.push('');
    }
    
    if (script.dialogueVersion.shootingTips) {
      lines.push(`🎬 拍摄建议：${script.dialogueVersion.shootingTips}`);
      lines.push('');
    }
  }
  
  // 发布信息
  if (script.hashtags && script.hashtags.length > 0) {
    lines.push('═══════════════════════════════════════');
    lines.push('【发布信息】');
    lines.push('═══════════════════════════════════════');
    lines.push(`话题：${script.hashtags.join(' ')}`);
    if (script.publishCopywriting) {
      lines.push(`发布文案：${script.publishCopywriting}`);
    }
  }
  
  return lines.join('\n');
}
