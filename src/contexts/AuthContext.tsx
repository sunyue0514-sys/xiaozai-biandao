'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import { authApi, getToken, setToken, clearToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 验证登录状态
  useEffect(() => {
    const verifyAuth = async () => {
      console.log('[AuthContext] 开始验证登录状态');
      const token = getToken();
      console.log('[AuthContext] localStorage token:', token ? `${token.substring(0, 20)}...` : 'null');
      
      if (!token) {
        console.log('[AuthContext] 没有token，跳过验证');
        setIsLoading(false);
        return;
      }

      try {
        console.log('[AuthContext] 调用 authApi.verify()');
        const response = await authApi.verify();
        console.log('[AuthContext] verify 响应:', response);
        // 兼容两种返回格式: { data: {...} } 和 { user: {...} }
        const userData = response.data || (response as unknown as { user: User }).user;
        if (response.success && userData) {
          console.log('[AuthContext] 验证成功，用户:', (userData as User).username);
          setUser(userData as User);
        } else {
          console.log('[AuthContext] 验证失败，清除token');
          clearToken();
        }
      } catch (error) {
        console.error('[AuthContext] 验证异常:', error);
        clearToken();
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      if (response.success && response.data) {
        setToken(response.data.token);
        setUser(response.data.user as User);
        return { success: true, message: '登录成功' };
      }
      return { success: false, message: response.error || '登录失败' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '登录失败' };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 忽略错误
    } finally {
      clearToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
