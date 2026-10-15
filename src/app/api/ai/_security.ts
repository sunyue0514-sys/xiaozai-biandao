import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const JSON_LIMIT = 256 * 1024;
const MULTIPART_LIMIT = 12 * 1024 * 1024;
type CallQuota = { minute: number; minuteCount: number; day: number; dayCount: number };
declare global { var __aiRequestQuota: Map<number, CallQuota> | undefined; }
const calls = global.__aiRequestQuota || (global.__aiRequestQuota = new Map<number, CallQuota>());
const reject = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

export function sessionToken(request: NextRequest): string | undefined {
  const header = request.headers.get('authorization');
  if (header) return /^Bearer ([^\s]+)$/i.exec(header)?.[1];
  return request.cookies?.get('sessionToken')?.value;
}

function configuredLimit(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 && value <= fallback ? value : fallback;
}

async function boundedBody(request: NextRequest, maximum: number): Promise<Uint8Array | null> {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new Error('BODY_TOO_LARGE');
  if (!request.body) return null; // Lightweight offline fixtures provide json/formData directly.
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) { result.set(chunk, position); position += chunk.byteLength; }
  return result;
}

function validateJSON(value: unknown, depth = 0): void {
  if (depth > 20) throw new Error('INVALID_BODY');
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error('INVALID_BODY');
    for (const item of value) validateJSON(item, depth + 1);
  } else if (value && typeof value === 'object') {
    if (Object.keys(value).length > 200) throw new Error('INVALID_BODY');
    for (const item of Object.values(value)) validateJSON(item, depth + 1);
  } else if (typeof value === 'string' && value.length > 50000) throw new Error('INVALID_BODY');
}

/** Authenticate before parsing, charging, allocating uploads or constructing paid SDKs.
 * These quotas are process-local: production replicas also require shared gateway quotas.
 */
export async function guardAIRequest(request: NextRequest, options: { paid?: boolean; admin?: boolean; multipart?: boolean; body?: boolean; service?: 'video' | 'public-fetch'; video?: boolean } = {}): Promise<NextResponse | null> {
  try {
    const token = sessionToken(request);
    if (!token || !(await hasSession(token))) return reject(401, 'Unauthorized');
    const userId = await getSessionUserId(token);
    if (!Number.isSafeInteger(userId) || !userId || userId < 1) return reject(401, 'Unauthorized');
    if (options.admin && (await getSessionUserInfo(token))?.role !== 'admin') return reject(403, 'Forbidden');
    const now = Date.now();
    for (const [id, entry] of calls) if (now - entry.day >= 86400000) calls.delete(id);
    const entry = calls.get(userId) || { minute: now, minuteCount: 0, day: now, dayCount: 0 };
    if (now - entry.minute >= 60000) { entry.minute = now; entry.minuteCount = 0; }
    if (options.paid !== false) {
      if (entry.minuteCount >= configuredLimit('AI_REQUESTS_PER_MINUTE', 20) || entry.dayCount >= configuredLimit('AI_REQUESTS_PER_DAY', 100)) return reject(429, 'AI request quota exceeded');
      const configured = options.service === 'public-fetch' || (options.service === 'video' ? process.env.TIKHUB_API_KEY?.trim() || process.env.VIDEO_PARSE_API_TOKEN?.trim() : process.env.COZE_WORKLOAD_IDENTITY_API_KEY?.trim());
      if (!configured) return reject(503, 'AI service is not configured');
      entry.minuteCount++; entry.dayCount++; calls.set(userId, entry);
    }
    if (options.body === false || request.method === 'GET' || request.method === 'HEAD') return null;
    if (options.multipart) {
      const bytes = await boundedBody(request, MULTIPART_LIMIT);
      const form = bytes ? await new Response(bytes as BodyInit, { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData() : await request.formData();
      let files = 0; let total = 0;
      for (const [, value] of form.entries()) {
        if (typeof value === 'string') { if (value.length > 50000) return reject(400, 'Upload field too long'); continue; }
        files++; total += value.size;
        if (files > 10 || value.size === 0 || value.size > 5 * 1024 * 1024 || total > 10 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(value.type)) return reject(413, 'Invalid or oversized image upload');
        const magic = new Uint8Array(await value.slice(0, 12).arrayBuffer());
        const valid = value.type === 'image/jpeg' ? magic[0] === 255 && magic[1] === 216 && magic[2] === 255
          : value.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((v,i) => magic[i] === v)
          : Buffer.from(magic.slice(0,4)).toString() === 'RIFF' && Buffer.from(magic.slice(8,12)).toString() === 'WEBP';
        if (!valid) return reject(400, 'Image content does not match its type');
      }
      for (const key of ['imageCount','screenshotCount','coverCount']) {
        const value = form.get(key);
        if (value !== null && (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) > 10)) return reject(400, 'Invalid image count');
      }
      request.formData = async () => form;
    } else {
      const maximum = configuredLimit('AI_MAX_JSON_BYTES', JSON_LIMIT);
      const bytes = await boundedBody(request, maximum);
      const body = bytes ? JSON.parse(new TextDecoder().decode(bytes)) : await request.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reject(400, 'Invalid request body');
      if (Buffer.byteLength(JSON.stringify(body)) > maximum) return reject(413, 'Request body too large');
      validateJSON(body);
      if (body.messages !== undefined) {
        if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 40) return reject(400, 'Invalid messages');
        let textLength = 0;
        for (const message of body.messages) {
          if (!message || !['system','user','assistant'].includes(message.role)) return reject(400, 'Invalid message role');
          if (typeof message.content === 'string') textLength += message.content.length;
          else if (Array.isArray(message.content) && message.content.length <= 10) {
            for (const part of message.content) {
              if (part?.type === 'text' && typeof part.text === 'string') textLength += part.text.length;
              else if (['image_url','video_url'].includes(part?.type) && isPublicUrl(part[part.type]?.url)) {
                const hostname = new URL(part[part.type].url).hostname;
                const trusted = (process.env.AI_MEDIA_ALLOWED_HOSTS || '').split(',').map(value => value.trim()).filter(Boolean);
                try { if (process.env.COZE_BUCKET_ENDPOINT_URL) trusted.push(new URL(process.env.COZE_BUCKET_ENDPOINT_URL).hostname); } catch { /* Invalid storage configuration never grants media access. */ }
                if (!trusted.includes(hostname)) return reject(400, 'Media host is not permitted');
              } else return reject(400, 'Invalid message content');
            }
          } else return reject(400, 'Invalid message content');
        }
        if (textLength > 10000) return reject(400, 'Message text too long');
      }
      if (body.model !== undefined && !['doubao-seed-1-8-251228', 'doubao-seed-2-0-lite-260215', 'deepseek-v3-2-251201'].includes(body.model)) return reject(400, 'Unsupported model');
      if (body.temperature !== undefined && (typeof body.temperature !== 'number' || !Number.isFinite(body.temperature) || body.temperature < 0 || body.temperature > 2)) return reject(400, 'Invalid temperature');
      if (body.thinking !== undefined && !['enabled','disabled','auto'].includes(body.thinking)) return reject(400, 'Invalid thinking option');
      if (body.url !== undefined && !(options.video ? isVideoShareUrl(body.url) : isPublicUrl(body.url))) return reject(400, 'Invalid content URL');
      for (const key of ['customerId', 'customer_id']) {
        const id = body[key];
        if (id !== undefined && id !== null && id !== '' && (!/^\d+$/.test(String(id)) || !Number.isInteger(Number(id)) || Number(id) < 1 || Number(id) > 2147483647)) return reject(400, 'Invalid customer ID');
      }
      for (const [key, max] of [['wordCount', 3000], ['countPerType', 10], ['count', 20]] as const) {
        const value = body[key];
        if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > max)) return reject(400, 'Invalid generation count');
      }
      request.json = async () => body;
    }
    return null;
  } catch (error) {
    return reject(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 400, 'Invalid request');
  }
}

export function safeForwardHeaders(headers: Headers): Record<string, string> {
  const trace = headers.get('traceparent');
  return trace && /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/.test(trace) ? { traceparent: trace } : {};
}

export function isPublicUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
    // Literal IPs and local/internal names are never valid content destinations.
    return !!host && !isIP(host) && host.includes('.') && !/(^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(host);
  } catch { return false; }
}

export async function validatePublicUrl(value: unknown): Promise<boolean> {
  if (!isPublicUrl(value)) return false;
  try {
    const addresses = await lookup(new URL(value).hostname, { all: true });
    return addresses.length > 0 && addresses.every(({ address }) => isPublicAddress(address));
  } catch { return false; }
}

export function isPublicAddress(address: string): boolean {
      if (address.includes(':')) return /^[23][0-9a-f]{3}:/i.test(address) && !/^(2001:(db8|0):|2002:)/i.test(address) && !address.includes('.');
      const [a,b] = address.split('.').map(Number);
      return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && [0,168].includes(b) || a === 100 && b >= 64 && b <= 127 || a === 198 && [18,19,51].includes(b) || a === 203 && b === 0);
}

export function isVideoShareUrl(value: unknown): value is string {
  if (!isPublicUrl(value)) return false;
  const host = new URL(value).hostname.toLowerCase();
  return ['douyin.com','iesdouyin.com','kuaishou.com','gifshow.com','xiaohongshu.com','xhslink.com','bilibili.com','b23.tv','weibo.com','weibo.cn'].some(domain => host === domain || host.endsWith('.' + domain));
}
