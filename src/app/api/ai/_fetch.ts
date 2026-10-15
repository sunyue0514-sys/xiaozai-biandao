import { lookup } from 'node:dns/promises';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { isPublicAddress, isPublicUrl } from './_security';

const MAX_BYTES = 2 * 1024 * 1024;
export class ContentFetchError extends Error {}

async function fetchPage(input: string, remainingHops = 4, deadline = Date.now() + 15000): Promise<{ url: string; text: string; type: string }> {
  if (!isPublicUrl(input) || remainingHops < 0 || deadline <= Date.now()) throw new ContentFetchError('Invalid destination');
  const url = new URL(input);
  let dnsTimer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true }),
    new Promise<never>((_, reject) => { dnsTimer = setTimeout(() => reject(new ContentFetchError('Lookup timed out')), deadline - Date.now()); }),
  ]).finally(() => clearTimeout(dnsTimer));
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new ContentFetchError('Invalid destination');
  const pinned = addresses[0];
  return new Promise((resolve, reject) => {
    const fail = () => reject(new ContentFetchError('Content fetch failed'));
    const timer = setTimeout(() => { request.destroy(); fail(); }, Math.max(1, deadline - Date.now()));
    const request = (url.protocol === 'https:' ? httpsGet : httpGet)(url, {
      agent: false, family: pinned.family,
      lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
      headers: { 'User-Agent': 'PublicContentReader/1.0', Accept: 'text/html,text/plain,application/xhtml+xml', 'Accept-Encoding': 'identity' },
    }, response => {
      if ([301,302,303,307,308].includes(response.statusCode || 0)) {
        clearTimeout(timer); response.destroy();
        const location = response.headers.location;
        if (!location) { fail(); return; }
        let next: string;
        try { next = new URL(location, url).href; } catch { fail(); return; }
        fetchPage(next, remainingHops - 1, deadline).then(resolve, reject);
        return;
      }
      const type = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();
      if ((response.statusCode || 500) >= 400 || !['text/html','text/plain','application/xhtml+xml'].includes(type) || Number(response.headers['content-length']) > MAX_BYTES) {
        clearTimeout(timer); response.destroy(); fail(); return;
      }
      const chunks: Buffer[] = []; let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) { clearTimeout(timer); response.destroy(); request.destroy(); fail(); return; }
        chunks.push(Buffer.from(chunk));
      });
      response.on('end', () => { clearTimeout(timer); resolve({ url: url.href, text: Buffer.concat(chunks).toString('utf8'), type }); });
      response.on('error', () => { clearTimeout(timer); fail(); });
      response.on('aborted', () => { clearTimeout(timer); fail(); });
    });
    request.on('error', () => { clearTimeout(timer); fail(); });
  });
}

type ContentItem = { type: 'text'; text: string } | { type: 'link'; url: string } | { type: 'image'; image: { display_url: string; width?: number; height?: number } };
const decode = (text: string) => text.replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, value => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '}[value] || value));

/** Static HTML only; never executes page code or forwards session/provider credentials. */
export async function fetchPublicContent(input: string): Promise<{ title: string; url: string; content: ContentItem[]; status_code: number; publish_time: string | null; filetype: string }> {
  const page = await fetchPage(input);
  const html = page.text;
  const title = decode(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1].replace(/<[^>]*>/g, '').trim() || '');
  const text = page.type === 'text/plain' ? html : decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
  const content: ContentItem[] = [{ type: 'text', text }];
  if (page.type !== 'text/plain') {
    const seen = new Set<string>();
    for (const match of html.matchAll(/<(a|img)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      if (content.length >= 201) break;
      let target: string;
      try { target = new URL(decode(match[2]), page.url).href; } catch { continue; }
      if (!isPublicUrl(target) || seen.has(target)) continue;
      seen.add(target);
      content.push(match[1].toLowerCase() === 'a' ? { type: 'link', url: target } : { type: 'image', image: { display_url: target } });
    }
  }
  return { title, url: page.url, content, status_code: 0, publish_time: null, filetype: page.type };
}
