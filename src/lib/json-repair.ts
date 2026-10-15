/**
 * JSON 修复工具
 * 
 * 解决 LLM 返回 JSON 的常见问题：
 * 1. 中文引号（""''）未转义
 * 2. 缺失逗号（数组元素、对象属性之间）
 * 3. JSON 被截断（超时导致）
 * 4. 尾随逗号
 * 5. 控制字符未转义
 * 6. 字符串值内包含未转义的双引号
 * 7. 属性名缺少引号（如 marriageV观）
 */

/**
 * 修复属性名缺少引号的问题
 * 例如: marriageV观 → "marriageV观"
 * 匹配模式: 在冒号前的未引用键名
 */
function fixUnquotedPropertyNames(jsonStr: string): string {
  // 匹配未引用的属性名：在 { 或 , 或 [ 后面，空格后，字母/中文/下划线开头的内容，直到冒号
  // 但排除已经用双引号包裹的
  return jsonStr.replace(/([{,[\s])(\w[\w\u4e00-\u9fa5]*)\s*:/g, (match, prefix, propName) => {
    // 检查这个属性名是否缺少引号（通过检查冒号后的内容是否是字符串）
    // 如果属性名包含中文字符或下划线后的字母，需要加引号
    if (/[\u4e00-\u9fa5]/.test(propName) || /^[a-zA-Z_]/.test(propName)) {
      return `${prefix}"${propName}":`;
    }
    return match;
  });
}

/**
 * 修复字符串值内包含未转义引号的问题
 * 例如: "内容"这里有问题"更多内容" → "内容这里有问题更多内容"
 */
function fixUnescapedQuotesInStrings(jsonStr: string): string {
  let result = '';
  let i = 0;
  
  while (i < jsonStr.length) {
    if (jsonStr[i] === '"') {
      // 进入字符串
      result += '"';
      i++;
      
      while (i < jsonStr.length) {
        if (jsonStr[i] === '\\') {
          // 转义字符
          result += jsonStr[i] + (jsonStr[i + 1] || '');
          i += 2;
        } else if (jsonStr[i] === '"') {
          // 字符串结束
          // 检查下一个字符是否是合法的JSON语法
          const nextChar = jsonStr[i + 1];
          const validEndings = [',', '}', ']', ':', undefined, ' ', '\n', '\r', '\t'];
          
          if (validEndings.includes(nextChar)) {
            // 正常的字符串结束
            result += '"';
            i++;
            break;
          } else {
            // 引号后面跟着非法字符，可能是内容中的引号
            // 将非法内容合并到当前字符串
            result += jsonStr[i];
            i++;
            
            // 继续处理后续内容
            while (i < jsonStr.length) {
              if (jsonStr[i] === '\\') {
                result += jsonStr[i] + (jsonStr[i + 1] || '');
                i += 2;
              } else if (jsonStr[i] === '"') {
                // 找到可能的字符串结束
                const nextAfterQuote = jsonStr[i + 1];
                if (validEndings.includes(nextAfterQuote)) {
                  result += '"';
                  i++;
                  break;
                } else {
                  // 仍然是内容的一部分
                  result += '"';
                  i++;
                }
              } else {
                result += jsonStr[i];
                i++;
              }
            }
            break;
          }
        } else {
          result += jsonStr[i];
          i++;
        }
      }
    } else {
      result += jsonStr[i];
      i++;
    }
  }
  
  return result;
}

/**
 * 修复 JSON 字符串中的问题
 * 使用状态机逐字符处理，确保字符串值内部的问题被正确修复
 */
export function fixJsonString(jsonStr: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  // 中文引号
  const chineseQuotes = ['\u201C', '\u201D', '\u2018', '\u2019']; // " " ' '
  
  // 可能导致问题的特殊字符（替换为空格或删除）
  const problematicChars = ['\u25A1', '\u25A0', '\u25CB', '\u25CF']; // □ ■ ○ ●
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    const nextChar = jsonStr[i + 1];
    
    if (escapeNext) {
      // 检查转义字符是否合法
      const validEscapes = ['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'];
      if (!validEscapes.includes(char)) {
        // 非法转义序列，删除反斜杠
        result = result.slice(0, -1);
      }
      result += char;
      escapeNext = false;
      continue;
    }
    
    // 处理转义字符
    if (char === '\\' && inString) {
      result += char;
      escapeNext = true;
      continue;
    }
    
    // 处理可能导致问题的特殊字符（在字符串内部）
    if (inString && problematicChars.includes(char)) {
      result += ' '; // 替换为空格
      continue;
    }
    
    // 处理中文引号（在字符串内部）
    if (inString && chineseQuotes.includes(char)) {
      result += '\\"';
      continue;
    }
    
    // 处理双引号
    if (char === '"') {
      if (inString) {
        // 检查下一个字符是否是合法的JSON语法
        const validAfterStringEnd = [',', '}', ']', ':', undefined, ' ', '\n', '\r', '\t'];
        if (!validAfterStringEnd.includes(nextChar)) {
          // 这个引号可能是内容的一部分，转义它
          result += '\\"';
          continue;
        }
      }
      result += char;
      inString = !inString;
      continue;
    }
    
    result += char;
  }
  
  // 第二遍：修复缺失的逗号（使用正则）
  // 模式1：数组元素之间缺失逗号，如 ]" 或 ]{ 或 ][
  result = result.replace(/\]\s*(?=\[|\"|\{)/g, '],');
  // 模式2：字符串之间缺失逗号，如 ""（两个字符串直接相连）
  result = result.replace(/"\s*"(?=\s*"[^"])/g, '","');
  // 模式3：对象结束后直接跟着新属性，如 }"
  result = result.replace(/\}\s*"(?=\s*:)/g, '},"');
  
  return result;
}

/**
 * 补全截断的 JSON
 * 当 LLM 响应被超时截断时，尝试补全缺失的闭合符号
 */
export function completeTruncatedJson(jsonStr: string): string {
  let result = jsonStr;
  
  // 计算未闭合的括号
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }
  
  // 如果在字符串中被截断，先关闭字符串
  if (inString) {
    result += '"';
  }
  
  // 移除最后一个不完整的属性值（如 "key": 后面没有值）
  result = result.replace(/,\s*"[^"]*":\s*$/, '');
  result = result.replace(/"[^"]*":\s*$/, '');
  
  // 重新计算括号
  openBraces = 0;
  openBrackets = 0;
  inString = false;
  escapeNext = false;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }
  
  // 补全缺失的闭合符号
  while (openBrackets > 0) {
    result += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    result += '}';
    openBraces--;
  }
  
  return result;
}

/**
 * 提取第一个完整的 JSON 对象
 * 使用括号计数确保提取正确的边界
 */
function extractFirstJsonObject(rawText: string): string | null {
  // 找到第一个 { 的位置
  const startIndex = rawText.indexOf('{');
  if (startIndex === -1) return null;
  
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIndex; i < rawText.length; i++) {
    const char = rawText[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          // 找到了完整的 JSON 对象
          return rawText.substring(startIndex, i + 1);
        }
      }
    }
  }
  
  // 没找到完整的 JSON，返回从 { 开始的所有内容
  return rawText.substring(startIndex);
}

/**
 * 安全解析 LLM 返回的 JSON
 * 
 * 处理流程：
 * 1. 提取 JSON 部分（使用括号计数确保正确边界）
 * 2. 基础清理（尾随逗号等）
 * 3. 状态机修复（中文引号、缺失逗号）
 * 4. 尝试解析
 * 5. 失败则尝试补全截断后重试
 * 
 * @param rawText LLM 返回的原始文本
 * @param logPrefix 日志前缀（用于调试）
 * @returns 解析后的对象，或 null 表示解析失败
 */
export function safeParseLLMJson<T = unknown>(
  rawText: string, 
  logPrefix: string = '[JSON解析]'
): T | null {
  // 使用括号计数提取第一个完整的 JSON 对象
  let jsonStr = extractFirstJsonObject(rawText);
  if (!jsonStr) {
    console.log(`${logPrefix} 未找到JSON内容`);
    return null;
  }
  
  console.log(`${logPrefix} 匹配到JSON长度:`, jsonStr.length);
  
  // 基础清理：移除尾随逗号
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
  
  // 状态机修复
  jsonStr = fixJsonString(jsonStr);
  
  // 新增：修复属性名缺少引号的问题
  jsonStr = fixUnquotedPropertyNames(jsonStr);
  
  // 新增：修复字符串值内包含未转义引号的问题
  jsonStr = fixUnescapedQuotesInStrings(jsonStr);
  
  try {
    const result = JSON.parse(jsonStr);
    console.log(`${logPrefix} 解析成功`);
    return result as T;
  } catch (parseError: any) {
    console.log(`${logPrefix} 解析失败:`, parseError.message);
    
    // 记录错误位置附近内容
    const errorPosMatch = parseError.message.match(/position (\d+)/);
    if (errorPosMatch) {
      const errorPos = parseInt(errorPosMatch[1]);
      const start = Math.max(0, errorPos - 80);
      const end = Math.min(jsonStr.length, errorPos + 80);
      console.log(`${logPrefix} 错误位置附近 (pos: ${errorPos}):`, jsonStr.slice(start, end));
    }
    
    // 尝试补全截断的 JSON
    console.log(`${logPrefix} 尝试补全截断的JSON...`);
    jsonStr = completeTruncatedJson(jsonStr);
    
    try {
      const result = JSON.parse(jsonStr);
      console.log(`${logPrefix} 补全后解析成功`);
      return result as T;
    } catch (finalError: any) {
      console.log(`${logPrefix} 补全后仍失败:`, finalError.message);
      return null;
    }
  }
}

/**
 * 解析 LLM 返回的 JSON（带默认值）
 * 
 * @param rawText LLM 返回的原始文本
 * @param defaultValue 解析失败时返回的默认值
 * @param logPrefix 日志前缀
 * @returns 解析后的对象或默认值
 */
export function parseLLMJsonWithDefault<T>(
  rawText: string,
  defaultValue: T,
  logPrefix: string = '[JSON解析]'
): T {
  const result = safeParseLLMJson<T>(rawText, logPrefix);
  return result !== null ? result : defaultValue;
}
