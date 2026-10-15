export type ApiBoundaryPolicy = 'public' | 'user' | 'admin' | 'secret';

// Every route is private unless this exact method/path is deliberately public.
const PUBLIC_METHODS: Record<string, readonly string[]> = {
  '/api/auth/login': ['POST'],
  '/api/auth/register': ['POST'],
  '/api/auth/logout': ['POST'],
  '/api/health': ['GET'],
  '/api/success-cases': ['GET'],
};
const SECRET_METHODS: Record<string, readonly string[]> = {
  '/api/admin/emergency-reset': ['POST'],
  '/api/admin/cleanup-expired-users': ['GET', 'POST'],
  '/api/ai-quality/chat': ['GET', 'POST'],
  // These exact methods validate signed agent requests in the handler.
  '/api/agent/customers': ['GET'],
  '/api/agent/materials': ['GET', 'POST'],
  '/api/agent/me': ['GET'],
  '/api/agent/script': ['POST'],
  '/api/agent/topic': ['POST'],
  '/api/agent/writing': ['POST'],
};

export function getApiPolicy(pathname: string, method: string): ApiBoundaryPolicy {
  let normalized: string;
  try { normalized = decodeURIComponent(pathname).replace(/\/+$/u, '') || '/'; }
  catch { return 'admin'; }
  if (PUBLIC_METHODS[normalized]?.includes(method.toUpperCase())) return 'public';
  if (SECRET_METHODS[normalized]?.includes(method.toUpperCase())) return 'secret';
  if (normalized === '/api/admin' || normalized.startsWith('/api/admin/')) return 'admin';
  return 'user';
}
