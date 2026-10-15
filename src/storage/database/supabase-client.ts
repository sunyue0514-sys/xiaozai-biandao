import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

let cachedClient: SupabaseClient | null = null;
let envLoaded = false;

function hasCredentials(): boolean {
  return Boolean((process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL)
    && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.COZE_SUPABASE_ANON_KEY));
}

/** Next.js loads .env.local; CLI tools can load it without Coze or Python. */
export function loadEnv(): void {
  if (envLoaded || hasCredentials()) { envLoaded = true; return; }
  try {
    config({ path: '.env.local', quiet: true });
    config({ quiet: true });
    envLoaded = hasCredentials();
  } catch {
    // Missing configuration is reported without logging credential values.
  }
}

export function getSupabaseCredentials(): { url: string; key: string } {
  if (typeof window !== 'undefined') throw new Error('Database credentials are server-only.');
  loadEnv();
  const url = process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.COZE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Configure private SUPABASE_URL and SUPABASE_SECRET_KEY before using the database.');
  return { url, key };
}

export function getSupabaseClient(token?: string): SupabaseClient {
  if (!token && cachedClient) return cachedClient;
  const { url, key } = getSupabaseCredentials();
  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: {
      'Cache-Control': 'no-cache',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }},
  });
  if (!token) cachedClient = client;
  return client;
}

export function resetSupabaseClient(): void { cachedClient = null; }

// Compatibility exports: initialization is explicit SQL, never probe writes.
export async function waitForSequenceCheck(): Promise<void> {}
export function resetSequenceCheck(): void {}
