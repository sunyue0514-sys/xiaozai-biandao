// Session 管理
// 使用 Supabase 数据库存储 session

import { 
  getSessionUser as getSessionUserFromStore, 
  createSession as createSessionFromStore, 
  deleteSession as deleteSessionFromStore, 
  getSession as getSessionFromStore 
} from './store';

// 导出getSessionUser供其他模块使用（异步）
export const getSessionUser = getSessionUserFromStore;

// 兼容旧的内存存储（仅用于过渡期）
declare global {
   
  var __sessions: Map<string, { userId: string; createdAt: number }> | undefined;
   
  var __sessionCleanupTimer: NodeJS.Timeout | undefined;
}

// 内存 session 过期时间（24小时）
const MEMORY_SESSION_EXPIRY = 24 * 60 * 60 * 1000;

function getSessions(): Map<string, { userId: string; createdAt: number }> {
  if (!global.__sessions) {
    global.__sessions = new Map();
    
    // 启动定期清理任务（每5分钟清理一次过期session）
    if (!global.__sessionCleanupTimer) {
      global.__sessionCleanupTimer = setInterval(() => {
        if (!global.__sessions) return;
        
        const now = Date.now();
        let cleaned = 0;
        
        for (const [token, session] of global.__sessions.entries()) {
          if (now - session.createdAt > MEMORY_SESSION_EXPIRY) {
            global.__sessions.delete(token);
            cleaned++;
          }
        }
        
        if (cleaned > 0) {
          console.log(`[Session] 清理了 ${cleaned} 个过期的内存 session`);
        }
      }, 5 * 60 * 1000);
      
      // 防止定时器阻止进程退出
      if (global.__sessionCleanupTimer.unref) {
        global.__sessionCleanupTimer.unref();
      }
    }
  }
  return global.__sessions;
}

// 同步方法：设置内存 session
export function setSession(token: string, userId: string): void {
  const sessions = getSessions();
  sessions.set(token, { userId, createdAt: Date.now() });
}

// 异步方法：检查 session 是否存在
export async function hasSession(token: string): Promise<boolean> {
  const storeSession = await getSessionFromStore(token);
  if (storeSession) {
    return true;
  }
  // 兼容旧的内存存储
  const legacySession = getSessions().get(token);
  if (!legacySession) return false;
  const age = Date.now() - legacySession.createdAt;
  if (!Number.isFinite(age) || age < 0 || age >= MEMORY_SESSION_EXPIRY) {
    getSessions().delete(token);
    return false;
  }
  return true;
}

// 异步方法：获取 session 对应的用户ID
export async function getSessionUserId(token: string): Promise<number | null> {
  const storeSession = await getSessionFromStore(token);
  if (storeSession) {
    return storeSession.userId;
  }
  // 兼容旧的内存存储
  const legacySession = getSessions().get(token);
  if (legacySession) {
    const age = Date.now() - legacySession.createdAt;
    if (!Number.isFinite(age) || age < 0 || age >= MEMORY_SESSION_EXPIRY) {
      getSessions().delete(token);
      return null;
    }
    return parseInt(legacySession.userId) || null;
  }
  return null;
}

// 异步方法：获取 session 对应的用户信息
export async function getSessionUserInfo(token: string): Promise<{ id: number; username: string; role: string } | null> {
  const user = await getSessionUser(token);
  if (user) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
  return null;
}

// 异步方法：创建新的 session
export async function createNewSession(userId: number): Promise<string> {
  return createSessionFromStore(userId);
}

// 异步方法：删除 session
export async function deleteSession(token: string): Promise<void> {
  getSessions().delete(token);
  await deleteSessionFromStore(token);
}
