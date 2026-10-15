/**
 * 视频文案提取器
 * 
 * 策略：
 * 1. 直接使用视频 URL 调用 SDK（SDK 内部会处理）
 * 2. 顺序执行：audioToSubtitle → extractAudio + ASR
 * 3. 保留时间戳信息（精确到秒）
 * 
 * 注意：视频压缩功能在生产环境可能不可用（需要 ffmpeg），
 * 因此优先使用 SDK 直接处理，让 SDK 自己处理大文件
 */

import {
  VideoEditClient,
  ASRClient,
  LLMClient,
  Config,
} from 'coze-coding-dev-sdk';

// 导入带时间戳的文案类型
import type { TimestampedScript, ScriptSegment } from '@/types/analysis-report';

// 提取结果接口
export interface ScriptExtractionResult {
  success: boolean;
  scriptContent: string;                         // 完整文案（用于显示）
  scriptWithTimestamps?: TimestampedScript;      // 带时间戳的文案（用于分析）
  method: 'subtitle' | 'asr' | 'fallback';
  confidence: number;
  error?: string;
  metadata?: {
    duration?: number;
    audioUrl?: string;
    subtitleUrl?: string;
    videoUrl?: string;        // 实际使用的视频URL（可能是压缩后的本地路径）
    compressionApplied?: boolean;
    powerCost?: number;       // 阶梯算力消耗
    llmCorrection?: {         // LLM纠错信息
      applied: boolean;       // 是否应用了纠错
      changesCount: number;   // 修改数量
      changes?: string[];     // 修改详情（前5条）
      originalLength?: number; // 原文长度
      correctedLength?: number; // 纠错后长度
    };
  };
}

// 超时配置（毫秒）
// 设置宽松的上限，避免大文件处理中断
const TIMEOUTS = {
  // 单个方法超时
  subtitle: 5 * 60 * 1000,        // 字幕提取：5分钟上限（处理大文件）
  audioExtract: 5 * 60 * 1000,    // 音频提取：5分钟上限
  asr: 5 * 60 * 1000,             // ASR识别：5分钟上限
  llmCorrection: 30 * 1000,       // LLM纠错：30秒上限
  // 整体超时
  total: 8 * 60 * 1000,           // 整体超时：8分钟
};

/**
 * 带超时的Promise包装
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMsg: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

/**
 * 时间戳解析辅助函数（SRT格式：00:00:00,000）
 */
function parseSRTTimestamp(timestamp: string): number {
  const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const ms = parseInt(match[4], 10);
  
  return hours * 3600 + minutes * 60 + seconds + ms / 1000;
}

/**
 * 格式化秒数为时间戳字符串（用于显示）
 */
export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 解析SRT格式字幕（返回带时间戳的分段）
 */
function parseSRT(srtContent: string): { fullText: string; segments: ScriptSegment[] } {
  const blocks = srtContent.split(/\n\n+/).filter(block => block.trim());
  const segments: ScriptSegment[] = [];
  const textParts: string[] = [];
  
  for (const block of blocks) {
    const lines = block.split('\n').filter(line => line.trim());
    
    // 跳过序号行，找时间戳行
    let timestampLine: string | null = null;
    const textLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // 匹配时间戳行（格式：00:00:00,000 --> 00:00:00,000）
      if (trimmed.includes(' --> ')) {
        timestampLine = trimmed;
      } else if (!/^\d+$/.test(trimmed) && trimmed) {
        // 不是序号行，是文本行
        textLines.push(trimmed);
      }
    }
    
    if (timestampLine && textLines.length > 0) {
      const [startTimeStr, endTimeStr] = timestampLine.split(' --> ');
      const startTime = parseSRTTimestamp(startTimeStr);
      const endTime = parseSRTTimestamp(endTimeStr);
      
      // 清理文本中的HTML标签
      const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();
      
      if (text) {
        segments.push({ text, startTime, endTime });
        textParts.push(text);
      }
    }
  }
  
  const fullText = textParts.join(' ').replace(/\s+/g, ' ').trim();
  
  return { fullText, segments };
}

/**
 * 方法1：字幕提取（audioToSubtitle）
 */
async function extractSubtitle(
  videoUrl: string,
  customHeaders: Record<string, string>
): Promise<ScriptExtractionResult> {
  console.log('[文案提取] 尝试 audioToSubtitle 转录...');
  
  try {
    const config = new Config();
    const client = new VideoEditClient(config, customHeaders);
    
    // 使用 withTimeout 添加超时控制
    const responsePromise = client.audioToSubtitle(videoUrl, { subtitleType: 'srt', urlExpire: 3600 });
    const response = await withTimeout(
      responsePromise,
      TIMEOUTS.subtitle,
      'audioToSubtitle 处理超时（60秒）'
    );
    
    console.log('[文案提取] audioToSubtitle 响应:', {
      hasUrl: !!response.url,
      url: response.url ? response.url.substring(0, 100) + '...' : null,
      message: response.message,
      videoMeta: response.video_meta,
    });
    
    if (!response.url) {
      const errorMsg = response.message || 'audioToSubtitle 返回空 URL';
      console.log('[文案提取] audioToSubtitle 失败:', errorMsg);
      return { success: false, scriptContent: '', method: 'subtitle', confidence: 0, error: errorMsg };
    }
    
    // 下载字幕文件
    console.log('[文案提取] 下载字幕文件...');
    const subtitleResponse = await fetch(response.url);
    if (!subtitleResponse.ok) {
      return { success: false, scriptContent: '', method: 'subtitle', confidence: 0, error: `字幕下载失败: ${subtitleResponse.status}` };
    }
    
    const srtContent = await subtitleResponse.text();
    console.log('[文案提取] 字幕文件大小:', srtContent.length, '字节');
    
    // 解析带时间戳的字幕
    const { fullText, segments } = parseSRT(srtContent);
    const duration = response.video_meta?.duration || (segments.length > 0 ? segments[segments.length - 1].endTime : 0);
    
    if (!fullText || fullText.length < 10) {
      return { success: false, scriptContent: '', method: 'subtitle', confidence: 0, error: '字幕内容为空或太短' };
    }
    
    console.log('[文案提取] audioToSubtitle 成功，文案长度:', fullText.length, '分段数:', segments.length);
    return {
      success: true,
      scriptContent: fullText,
      scriptWithTimestamps: {
        fullText,
        segments,
        duration,
      },
      method: 'subtitle',
      confidence: 0.95,
      metadata: { 
        subtitleUrl: response.url, 
        duration,
      },
    };
  } catch (error: any) {
    console.log('[文案提取] audioToSubtitle 异常:', error?.message || error);
    return { success: false, scriptContent: '', method: 'subtitle', confidence: 0, error: error?.message };
  }
}

/**
 * 方法2：音频提取 + ASR（更可靠）
 */
async function extractAudioAndASR(
  videoUrl: string,
  customHeaders: Record<string, string>
): Promise<ScriptExtractionResult> {
  console.log('[文案提取] 尝试音频提取+ASR...');
  
  try {
    const config = new Config();
    const videoClient = new VideoEditClient(config, customHeaders);
    const asrClient = new ASRClient(config, customHeaders);
    
    // Step 1: 提取音频（添加超时控制）
    console.log('[文案提取] 正在提取音频...');
    const audioResponsePromise = videoClient.extractAudio(videoUrl, { format: 'mp3', urlExpire: 3600 });
    const audioResponse = await withTimeout(
      audioResponsePromise,
      TIMEOUTS.audioExtract,
      '音频提取超时（60秒）'
    );
    
    console.log('[文案提取] 音频提取响应:', {
      hasUrl: !!audioResponse.url,
      url: audioResponse.url ? audioResponse.url.substring(0, 100) + '...' : null,
      message: audioResponse.message,
      videoMeta: audioResponse.video_meta,
      billInfo: audioResponse.bill_info,
    });
    
    if (!audioResponse.url) {
      const errorMsg = audioResponse.message || '音频提取返回空 URL（可能视频无音频轨道）';
      console.log('[文案提取] 音频提取失败:', errorMsg);
      return { success: false, scriptContent: '', method: 'asr', confidence: 0, error: errorMsg };
    }
    
    // 检查视频时长
    const videoDuration = audioResponse.video_meta?.duration || audioResponse.bill_info?.duration;
    console.log('[文案提取] 音频提取成功，视频时长:', videoDuration, '秒');
    
    if (videoDuration && videoDuration < 1) {
      return { success: false, scriptContent: '', method: 'asr', confidence: 0, error: '视频时长太短（<1秒）' };
    }
    
    // Step 2: ASR识别（添加超时控制）
    console.log('[文案提取] 开始 ASR 识别...');
    const asrResultPromise = asrClient.recognize({ uid: 'script-extractor', url: audioResponse.url });
    const asrResult = await withTimeout(
      asrResultPromise,
      TIMEOUTS.asr,
      'ASR识别超时（60秒）'
    );
    
    console.log('[文案提取] ASR 响应:', {
      textLength: asrResult.text?.length || 0,
      duration: asrResult.duration,
      hasUtterances: !!asrResult.utterances,
      utterancesCount: asrResult.utterances?.length || 0,
    });
    
    if (!asrResult.text || asrResult.text.trim().length < 5) {
      return {
        success: false,
        scriptContent: '',
        method: 'asr',
        confidence: 0,
        error: 'ASR识别结果为空或太短（视频可能无语音）',
        metadata: { audioUrl: audioResponse.url, duration: asrResult.duration },
      };
    }
    
    const fullText = asrResult.text.trim();
    const duration = asrResult.duration || videoDuration || 0;
    
    // 构建带时间戳的分段（如果有 utterances）
    const segments: ScriptSegment[] = [];
    if (asrResult.utterances && asrResult.utterances.length > 0) {
      for (const utt of asrResult.utterances) {
        if (utt.text && utt.start_time !== undefined && utt.end_time !== undefined) {
          segments.push({
            text: utt.text,
            startTime: utt.start_time / 1000, // 毫秒转秒
            endTime: utt.end_time / 1000,
          });
        }
      }
    }
    
    console.log('[文案提取] ASR 识别成功，文案长度:', fullText.length, '分段数:', segments.length);
    
    const result: ScriptExtractionResult = {
      success: true,
      scriptContent: fullText,
      method: 'asr',
      confidence: 0.85,
      metadata: { audioUrl: audioResponse.url, duration },
    };
    
    // 只有当有有效分段时才添加 scriptWithTimestamps
    if (segments.length > 0) {
      result.scriptWithTimestamps = {
        fullText,
        segments,
        duration,
      };
    } else {
      // 如果没有分段，创建一个整段（用于后续分析）
      result.scriptWithTimestamps = {
        fullText,
        segments: [{ text: fullText, startTime: 0, endTime: duration }],
        duration,
      };
    }
    
    return result;
  } catch (error: any) {
    console.log('[文案提取] ASR识别失败:', error?.message || error);
    return { success: false, scriptContent: '', method: 'asr', confidence: 0, error: error?.message };
  }
}

/**
 * LLM后处理纠错（ASR错别字纠正）
 * 
 * 参考：腾讯云XTrans方案，通过LLM对ASR结果进行后处理
 * 预计WER降低15-30%
 * 
 * 纠错策略：
 * 1. 同音字/近音字错误：如 "在吗" -> "咱们"
 * 2. 漏字/多字：补全或删除多余字
 * 3. 专有名词：品牌名、人名、地名等
 * 4. 口语化表达：保持原意，优化表达
 * 
 * @param text ASR识别的原始文本
 * @param customHeaders SDK认证头
 * @returns 纠错后的文本和修改记录
 */
async function correctWithLLM(
  text: string,
  customHeaders: Record<string, string>
): Promise<{ corrected: string; changes: string[] }> {
  if (!text || text.length < 10) {
    return { corrected: text, changes: [] };
  }
  
  console.log('[LLM纠错] 开始处理，原文长度:', text.length);
  const startTime = Date.now();
  
  try {
    const config = new Config();
    const client = new LLMClient(config, customHeaders);
    
    // 使用低温度模型，确保输出稳定
    const messages = [
      {
        role: 'system' as const,
        content: `你是一位专业的ASR纠错助手。你的任务是修正语音识别产生的错别字。

常见ASR错误类型：
1. 同音字错误：如"在吗"应为"咱们"，"什么问题"应为"什么口味"
2. 近音字错误：如"可厉害了"应为"可厉害了"，"艾特"应为"@或提到"
3. 漏字或多字：补充遗漏的字，删除多余的字
4. 专有名词：品牌名、人名、地名、网络热词等
5. 数字和单位："一百块"可能是"100块"

纠错原则：
- 保持原文的口语化风格和语气
- 只修正明显的识别错误，不要过度修改
- 保持原文的语义不变
- 如果原文通顺正确，则不做修改

输出格式要求：
- 第一行输出纠错后的完整文本
- 第二行开始列出修改内容，格式：原文 -> 修正后（简要说明）
- 如果没有修改，第二行输出"无修改"`,
      },
      {
        role: 'user' as const,
        content: `请对以下ASR识别结果进行纠错，保持口语化风格：

${text}`,
      },
    ];
    
    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-lite-260215', // 使用轻量快速模型
      temperature: 0.1,
    });
    
    let fullResponse = '';
    
    for await (const chunk of stream) {
      if (chunk.content) {
        fullResponse += chunk.content.toString();
      }
    }
    
    // 解析响应
    const lines = fullResponse.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('[LLM纠错] 响应为空，返回原文');
      return { corrected: text, changes: [] };
    }
    
    // 第一行是纠错后的文本
    const corrected = lines[0].trim();
    
    // 后续行是修改说明
    const changes: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && line !== '无修改') {
        changes.push(line);
      }
    }
    
    console.log('[LLM纠错] 完成，耗时:', Date.now() - startTime, 'ms');
    console.log('[LLM纠错] 修改数量:', changes.length);
    
    if (changes.length > 0) {
      console.log('[LLM纠错] 修改详情:', changes.slice(0, 5).join('; '), changes.length > 5 ? '...' : '');
    }
    
    return { corrected, changes };
    
  } catch (error: any) {
    console.error('[LLM纠错] 失败:', error?.message || error);
    // 纠错失败时返回原文
    return { corrected: text, changes: [] };
  }
}

/**
 * 对带时间戳的分段文案进行纠错
 * 保持时间戳不变，只纠错文本
 */
async function correctTimestampedScript(
  scriptWithTimestamps: TimestampedScript,
  customHeaders: Record<string, string>
): Promise<{ corrected: TimestampedScript; changes: string[] }> {
  if (!scriptWithTimestamps.segments || scriptWithTimestamps.segments.length === 0) {
    return { corrected: scriptWithTimestamps, changes: [] };
  }
  
  // 合并所有分段文本进行纠错
  const fullText = scriptWithTimestamps.segments.map(s => s.text).join(' ');
  const result = await correctWithLLM(fullText, customHeaders);
  
  if (result.changes.length === 0) {
    // 没有修改，直接返回原文
    return { corrected: scriptWithTimestamps, changes: [] };
  }
  
  // 有修改，需要将纠错后的文本重新分配到分段
  // 简单策略：按原分段的长度比例分配
  const correctedText = result.corrected;
  const segments: ScriptSegment[] = [];
  
  // 计算原始各分段的长度比例
  const totalOriginalLength = scriptWithTimestamps.segments.reduce((sum, s) => sum + s.text.length, 0);
  let currentPos = 0;
  
  for (const seg of scriptWithTimestamps.segments) {
    const ratio = seg.text.length / totalOriginalLength;
    const targetLength = Math.round(correctedText.length * ratio);
    
    // 从纠错后的文本中提取对应长度的片段
    const start = currentPos;
    const end = Math.min(currentPos + targetLength, correctedText.length);
    const text = correctedText.slice(start, end).trim();
    
    if (text) {
      segments.push({
        text,
        startTime: seg.startTime,
        endTime: seg.endTime,
      });
    }
    
    currentPos = end;
  }
  
  return {
    corrected: {
      fullText: correctedText,
      segments,
      duration: scriptWithTimestamps.duration,
    },
    changes: result.changes,
  };
}

/**
 * 主入口：智能文案提取
 * 
 * 策略：
 * 1. 先尝试 audioToSubtitle（快速转录）
 * 2. 失败则用 extractAudio + ASR（更可靠）
 * 3. 成功后可选 LLM 纠错（默认开启）
 * 4. 返回完整文案和带时间戳的分段
 * 
 * 注意：直接使用视频 URL，由 SDK 内部处理
 * 
 * @param videoUrl 视频URL
 * @param customHeaders SDK认证头
 * @param options 可选配置
 * @param options.enableLLMCorrection 是否启用LLM纠错（默认true）
 */
export async function extractScript(
  videoUrl: string,
  customHeaders: Record<string, string>,
  options?: { enableLLMCorrection?: boolean }
): Promise<ScriptExtractionResult> {
  const enableLLMCorrection = options?.enableLLMCorrection !== false; // 默认开启
  console.log('[文案提取] 开始提取... LLM纠错:', enableLLMCorrection);
  const startTime = Date.now();
  
  // 内部函数：应用LLM纠错并返回更新后的结果
  const applyCorrection = async (result: ScriptExtractionResult): Promise<ScriptExtractionResult> => {
    if (!enableLLMCorrection || !result.success || !result.scriptContent) {
      return result;
    }
    
    // LLM纠错也加超时
    try {
      const originalLength = result.scriptContent.length;
      
      // 如果有带时间戳的文案，对分段进行纠错
      if (result.scriptWithTimestamps) {
        const correctionResult = await withTimeout(
          correctTimestampedScript(result.scriptWithTimestamps, customHeaders),
          TIMEOUTS.llmCorrection,
          'LLM纠错超时（30秒）'
        );
        
        return {
          ...result,
          scriptContent: correctionResult.corrected.fullText,
          scriptWithTimestamps: correctionResult.corrected,
          metadata: {
            ...result.metadata,
            llmCorrection: {
              applied: correctionResult.changes.length > 0,
              changesCount: correctionResult.changes.length,
              changes: correctionResult.changes.slice(0, 5),
              originalLength,
              correctedLength: correctionResult.corrected.fullText.length,
            },
          },
        };
      }
      
      // 没有时间戳信息，对纯文本纠错
      const correctionResult = await withTimeout(
        correctWithLLM(result.scriptContent, customHeaders),
        TIMEOUTS.llmCorrection,
        'LLM纠错超时（30秒）'
      );
      
      return {
        ...result,
        scriptContent: correctionResult.corrected,
        metadata: {
          ...result.metadata,
          llmCorrection: {
            applied: correctionResult.changes.length > 0,
            changesCount: correctionResult.changes.length,
            changes: correctionResult.changes.slice(0, 5),
            originalLength,
            correctedLength: correctionResult.corrected.length,
          },
        },
      };
    } catch (e) {
      console.log('[文案提取] LLM纠错失败，使用原结果');
      return result;
    }
  };
  
  try {
    // 使用整体超时控制
    const doExtract = async (): Promise<ScriptExtractionResult> => {
      // 方法1：尝试 audioToSubtitle（快速转录）
      const subtitleResult = await extractSubtitle(videoUrl, customHeaders);
      
      if (subtitleResult.success && subtitleResult.confidence >= 0.8) {
        console.log('[文案提取] audioToSubtitle 成功，耗时:', Date.now() - startTime, 'ms');
        return applyCorrection({
          ...subtitleResult,
          metadata: { ...subtitleResult.metadata, videoUrl },
        });
      }
      
      console.log('[文案提取] audioToSubtitle 失败，原因:', subtitleResult.error);
      
      // 方法2：尝试 extractAudio + ASR（更可靠）
      const asrResult = await extractAudioAndASR(videoUrl, customHeaders);
      
      if (asrResult.success && asrResult.confidence >= 0.7) {
        console.log('[文案提取] ASR 成功，耗时:', Date.now() - startTime, 'ms');
        return applyCorrection({
          ...asrResult,
          metadata: { ...asrResult.metadata, videoUrl },
        });
      }
      
      console.log('[文案提取] ASR 失败，原因:', asrResult.error);
      
      // 如果有部分结果，返回
      if (subtitleResult.scriptContent && subtitleResult.scriptContent.length > 20) {
        console.log('[文案提取] 使用 audioToSubtitle 部分结果');
        return applyCorrection({
          ...subtitleResult,
          confidence: Math.max(subtitleResult.confidence, 0.5),
          metadata: { ...subtitleResult.metadata, videoUrl },
        });
      }
      
      if (asrResult.scriptContent && asrResult.scriptContent.length > 20) {
        console.log('[文案提取] 使用 ASR 部分结果');
        return applyCorrection({
          ...asrResult,
          confidence: Math.max(asrResult.confidence, 0.4),
          metadata: { ...asrResult.metadata, videoUrl },
        });
      }
      
      // 完全失败
      console.log('[文案提取] 所有方法都失败，总耗时:', Date.now() - startTime, 'ms');
      return {
        success: false,
        scriptContent: '',
        method: 'fallback',
        confidence: 0,
        error: `所有提取方法都失败。audioToSubtitle: ${subtitleResult.error}; ASR: ${asrResult.error}`,
        metadata: { videoUrl },
      };
    };
    
    // 执行提取，带整体超时
    return await withTimeout(
      doExtract(),
      TIMEOUTS.total,
      `文案提取整体超时（${TIMEOUTS.total / 60000}分钟）`
    );
    
  } catch (error: any) {
    console.error('[文案提取] 异常:', error?.message || error);
    return {
      success: false,
      scriptContent: '',
      method: 'fallback',
      confidence: 0,
      error: error?.message || '文案提取异常',
    };
  }
}

/**
 * 清理文案内容
 */
export function cleanScriptContent(text: string): string {
  if (!text) return text;
  
  let cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9，。！？、；：""''（）【】《》…—·\s,.!?;:'"()\[\]{}\-—–—…]+/g, '...');
  cleaned = cleaned.replace(/\.\.\.(\.\.\.)+/g, '...');
  cleaned = cleaned.replace(/\s*\.\.\.\s*/g, '...');
  cleaned = cleaned.replace(/^[.。…\s]+|[.。…\s]+$/g, '');
  
  return cleaned.trim();
}
