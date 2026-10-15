/**
 * 视频压缩工具
 * 
 * 功能：
 * 1. 自动检测视频大小，超过阈值自动压缩
 * 2. 压缩到 480p，保持音频质量
 * 3. 返回压缩后的临时文件路径
 * 
 * 依赖：fluent-ffmpeg（使用系统 ffmpeg）
 * 通过 next.config.ts 的 serverExternalPackages 配置避免 Turbopack 打包问题
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import ffmpeg from 'fluent-ffmpeg';

const execAsync = promisify(exec);

// 压缩配置
export const COMPRESS_CONFIG = {
  // 触发压缩的文件大小阈值（字节）
  sizeThreshold: 50 * 1024 * 1024, // 50MB
  // 目标视频分辨率
  targetResolution: '854:480', // 480p (16:9)
  // 目标视频码率
  targetVideoBitrate: '1500k', // 1.5Mbps
  // 目标音频码率
  targetAudioBitrate: '128k',
  // 最大处理时长（秒）
  maxDuration: 300, // 5分钟
};

// 压缩结果
export interface CompressionResult {
  success: boolean;
  originalPath?: string;
  compressedPath?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  duration?: number;
  error?: string;
}

// 视频信息
export interface VideoInfo {
  duration: number;  // 秒
  width: number;
  height: number;
  size: number;      // 字节
  bitrate: number;   // kbps
}

// FFmpeg 可用性缓存
let _ffmpegAvailable: boolean | null = null;
let _ffprobePath: string | null = null;

/**
 * 检查 FFmpeg 是否可用
 */
async function checkFfmpegAvailable(): Promise<{ available: boolean; ffprobePath: string | null }> {
  if (_ffmpegAvailable !== null) {
    return { available: _ffmpegAvailable, ffprobePath: _ffprobePath };
  }

  try {
    // 尝试查找系统中的 ffprobe
    const { stdout } = await execAsync('which ffprobe || where ffprobe 2>/dev/null', {
      timeout: 5000,
    });
    const ffprobePath = stdout.trim().split('\n')[0];
    
    if (ffprobePath && fs.existsSync(ffprobePath)) {
      _ffmpegAvailable = true;
      _ffprobePath = ffprobePath;
      console.log('[视频压缩] 检测到 ffprobe:', ffprobePath);
      return { available: true, ffprobePath };
    }
  } catch {
    // ffprobe 不在 PATH 中
  }

  // 尝试常见的 ffmpeg 安装路径
  const commonPaths = [
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    '/opt/homebrew/bin/ffprobe',
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      _ffmpegAvailable = true;
      _ffprobePath = p;
      console.log('[视频压缩] 检测到 ffprobe:', p);
      return { available: true, ffprobePath: p };
    }
  }

  console.log('[视频压缩] 未检测到 ffprobe，视频压缩功能将不可用');
  _ffmpegAvailable = false;
  return { available: false, ffprobePath: null };
}

/**
 * 获取视频信息（使用 ffprobe）
 */
export async function getVideoInfo(filePath: string): Promise<VideoInfo | null> {
  const { available, ffprobePath } = await checkFfmpegAvailable();
  
  if (!available || !ffprobePath) {
    // 返回基本信息（文件大小）
    try {
      const stats = fs.statSync(filePath);
      return {
        duration: 60, // 默认1分钟
        width: 0,
        height: 0,
        size: stats.size,
        bitrate: 0,
      };
    } catch {
      return null;
    }
  }

  try {
    // 使用 ffprobe 获取视频信息
    const { stdout } = await execAsync(
      `"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${filePath}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    
    const info = JSON.parse(stdout);
    const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
    const format = info.format || {};
    
    return {
      duration: parseFloat(format.duration) || 0,
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      size: parseInt(format.size) || 0,
      bitrate: parseInt(format.bit_rate) / 1000 || 0, // 转换为 kbps
    };
  } catch (error) {
    console.error('[视频压缩] 获取视频信息失败:', error);
    return null;
  }
}

/**
 * 检查是否需要压缩
 */
export async function shouldCompress(fileSize: number): Promise<boolean> {
  const { available } = await checkFfmpegAvailable();
  if (!available) {
    return false;
  }
  return fileSize > COMPRESS_CONFIG.sizeThreshold;
}

/**
 * 计算阶梯算力消耗
 * 
 * 规则：
 * - ≤1分钟：500算力
 * - 1-3分钟：700算力
 * - 3-5分钟：900算力
 */
export function calculatePowerCost(durationSeconds: number): number {
  const durationMinutes = durationSeconds / 60;
  
  if (durationMinutes <= 1) {
    return 500;
  } else if (durationMinutes <= 3) {
    return 700;
  } else {
    return 900;
  }
}

/**
 * 压缩视频到 480p
 * 
 * @param inputPath 输入视频路径
 * @param outputPath 输出视频路径
 * @returns 压缩结果
 */
export async function compressVideo(
  inputPath: string,
  outputPath: string
): Promise<CompressionResult> {
  const startTime = Date.now();
  
  const { available } = await checkFfmpegAvailable();
  
  if (!available) {
    return {
      success: false,
      error: 'FFmpeg 未安装，无法压缩视频',
    };
  }
  
  try {
    console.log('[视频压缩] 开始压缩:', {
      input: inputPath,
      output: outputPath,
    });
    
    // 获取原始视频信息
    const originalInfo = await getVideoInfo(inputPath);
    if (!originalInfo) {
      return {
        success: false,
        error: '无法获取视频信息',
      };
    }
    
    console.log('[视频压缩] 原始视频信息:', originalInfo);
    
    // 如果视频已经是 480p 或更低，跳过压缩
    if (originalInfo.height <= 480) {
      console.log('[视频压缩] 视频分辨率已为 480p 或更低，跳过压缩');
      return {
        success: true,
        originalPath: inputPath,
        compressedPath: inputPath, // 使用原文件
        originalSize: originalInfo.size,
        compressedSize: originalInfo.size,
        compressionRatio: 1,
        duration: 0,
      };
    }
    
    // 使用 fluent-ffmpeg 压缩（使用系统 ffmpeg）
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        // 视频编码设置
        .videoCodec('libx264')
        .size(`${COMPRESS_CONFIG.targetResolution}`)
        .videoBitrate(COMPRESS_CONFIG.targetVideoBitrate)
        .outputOptions([
          '-preset fast',           // 编码速度
          '-crf 23',                // 质量（越小质量越高）
          '-movflags +faststart',   // 优化流媒体播放
        ])
        // 音频编码设置
        .audioCodec('aac')
        .audioBitrate(COMPRESS_CONFIG.targetAudioBitrate)
        .audioChannels(2)
        // 进度回调
        .on('progress', (progress: any) => {
          if (progress.percent) {
            console.log(`[视频压缩] 进度: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log('[视频压缩] 压缩完成');
          resolve();
        })
        .on('error', (err: Error) => {
          console.error('[视频压缩] 压缩失败:', err);
          reject(err);
        })
        .run();
    });
    
    // 检查输出文件
    if (!fs.existsSync(outputPath)) {
      return {
        success: false,
        error: '压缩后文件不存在',
      };
    }
    
    const compressedSize = fs.statSync(outputPath).size;
    const compressionRatio = compressedSize / originalInfo.size;
    
    console.log('[视频压缩] 压缩结果:', {
      originalSize: `${(originalInfo.size / 1024 / 1024).toFixed(2)}MB`,
      compressedSize: `${(compressedSize / 1024 / 1024).toFixed(2)}MB`,
      compressionRatio: `${(compressionRatio * 100).toFixed(1)}%`,
      duration: `${Date.now() - startTime}ms`,
    });
    
    return {
      success: true,
      originalPath: inputPath,
      compressedPath: outputPath,
      originalSize: originalInfo.size,
      compressedSize,
      compressionRatio,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[视频压缩] 压缩异常:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '压缩失败',
    };
  }
}

/**
 * 下载视频到临时文件
 */
export async function downloadVideoToTemp(
  videoUrl: string,
  timeout: number = 120000
): Promise<{ success: boolean; path?: string; size?: number; error?: string }> {
  const tmpDir = '/tmp';
  const fileName = `video_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
  const filePath = path.join(tmpDir, fileName);
  
  console.log('[视频下载] 开始下载:', videoUrl.substring(0, 100));
  console.log('[视频下载] 保存路径:', filePath);
  
  return new Promise((resolve) => {
    const client = videoUrl.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    
    const timeoutId = setTimeout(() => {
      file.destroy();
      safeUnlink(filePath);
      resolve({
        success: false,
        error: '下载超时',
      });
    }, timeout);
    
    const request = client.get(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.destroy();
          safeUnlink(filePath);
          clearTimeout(timeoutId);
          downloadVideoToTemp(redirectUrl, timeout).then(resolve);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        file.destroy();
        safeUnlink(filePath);
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: `HTTP ${response.statusCode}`,
        });
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        clearTimeout(timeoutId);
        
        const size = fs.statSync(filePath).size;
        console.log('[视频下载] 下载完成:', {
          path: filePath,
          size: `${(size / 1024 / 1024).toFixed(2)}MB`,
        });
        
        resolve({
          success: true,
          path: filePath,
          size,
        });
      });
    });
    
    request.on('error', (err) => {
      file.destroy();
      safeUnlink(filePath);
      clearTimeout(timeoutId);
      console.error('[视频下载] 下载失败:', err);
      resolve({
        success: false,
        error: err.message,
      });
    });
  });
}

/**
 * 清理临时文件
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[临时文件] 已清理:', filePath);
    }
  } catch (error) {
    console.error('[临时文件] 清理失败:', error);
  }
}

/**
 * 安全删除文件（忽略错误）
 */
function safeUnlink(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // 忽略错误
  }
}

/**
 * 完整的视频处理流程：
 * 1. 下载视频
 * 2. 检查大小，决定是否压缩
 * 3. 压缩（如需要）
 * 4. 返回最终文件路径
 */
export async function processVideo(
  videoUrl: string,
  options: {
    downloadTimeout?: number;
    onProgress?: (stage: string, message: string) => void;
  } = {}
): Promise<{
  success: boolean;
  filePath?: string;
  videoInfo?: VideoInfo;
  powerCost?: number;
  compressionApplied?: boolean;
  error?: string;
}> {
  const { downloadTimeout = 120000, onProgress } = options;
  
  try {
    // 步骤1：下载视频
    onProgress?.('download', '正在下载视频...');
    const downloadResult = await downloadVideoToTemp(videoUrl, downloadTimeout);
    
    if (!downloadResult.success || !downloadResult.path) {
      return {
        success: false,
        error: downloadResult.error || '下载失败',
      };
    }
    
    let filePath = downloadResult.path;
    const fileSize = downloadResult.size || 0;
    
    // 获取视频信息
    const videoInfo = await getVideoInfo(filePath);
    if (!videoInfo) {
      cleanupTempFile(filePath);
      return {
        success: false,
        error: '无法获取视频信息',
      };
    }
    
    // 计算算力消耗（基于时长）
    const powerCost = calculatePowerCost(videoInfo.duration);
    
    // 步骤2：判断是否需要压缩
    if (fileSize > 0 && await shouldCompress(fileSize)) {
      onProgress?.('compress', `视频较大(${(fileSize / 1024 / 1024).toFixed(1)}MB)，正在压缩...`);
      
      const compressedPath = filePath.replace('.mp4', '_compressed.mp4');
      const compressResult = await compressVideo(filePath, compressedPath);
      
      if (compressResult.success && compressResult.compressedPath) {
        // 删除原文件，使用压缩后的文件
        cleanupTempFile(filePath);
        filePath = compressResult.compressedPath;
        
        console.log('[视频处理] 使用压缩后文件:', {
          originalSize: `${(compressResult.originalSize! / 1024 / 1024).toFixed(2)}MB`,
          compressedSize: `${(compressResult.compressedSize! / 1024 / 1024).toFixed(2)}MB`,
          ratio: `${(compressResult.compressionRatio! * 100).toFixed(1)}%`,
        });
        
        return {
          success: true,
          filePath,
          videoInfo,
          powerCost,
          compressionApplied: true,
        };
      } else {
        console.log('[视频处理] 压缩失败，使用原文件:', compressResult.error);
        // 压缩失败，继续使用原文件
      }
    }
    
    return {
      success: true,
      filePath,
      videoInfo,
      powerCost,
      compressionApplied: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '处理失败',
    };
  }
}
