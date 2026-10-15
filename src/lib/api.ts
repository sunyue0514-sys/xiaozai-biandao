const API_BASE = '/api';

// 获取存储的 token
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('sessionToken');
  console.log('[getToken] Token:', token ? `${token.substring(0, 20)}...` : 'null');
  return token;
}

// 设置 token
export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  console.log('[setToken] 设置Token:', `${token.substring(0, 20)}...`);
  localStorage.setItem('sessionToken', token);
}

// 清除 token
export function clearToken(): void {
  if (typeof window === 'undefined') return;
  console.log('[clearToken] 清除Token');
  localStorage.removeItem('sessionToken');
}

// 通用请求函数
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  console.log('[apiRequest] 请求:', endpoint, 'Token:', token ? '有' : '无');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  
  return data;
}

// 认证 API
export const authApi = {
  login: async (username: string, password: string) => {
    return apiRequest<{ success: boolean; error?: string; data?: { user: import('@/types').User; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  
  verify: async () => {
    return apiRequest<{ success: boolean; error?: string; data?: import('@/types').User; user?: import('@/types').User }>('/auth/me');
  },
  
  logout: async () => {
    return apiRequest<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },
};

// 用户 API
export const userApi = {
  getMenuPermissions: async () => {
    return apiRequest<{ success: boolean; data: import('@/types').MenuPermissions }>('/user/menu-permissions');
  },
};

// 会员 API
export const memberApi = {
  getSubscription: async () => {
    return apiRequest<{ success: boolean; data: import('@/types').MemberSubscription }>('/member/subscription');
  },
  
  getComputingPower: async () => {
    return apiRequest<{ success: boolean; data: import('@/types').ComputingPower }>('/member/computing-power');
  },
};

// 客户 API
export const customerApi = {
  getList: async () => {
    return apiRequest<{ data: import('@/types').Customer[] }>('/customer/list');
  },
  
  getMaterials: async (page = 1, pageSize = 10) => {
    return apiRequest<import('@/types').MaterialsResponse>(`/customer/materials?page=${page}&pageSize=${pageSize}`);
  },
  
  create: async (data: { name: string; description: string }) => {
    return apiRequest<{ success: boolean; data: import('@/types').Customer }>('/customer/list', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: async (id: number, data: Partial<import('@/types').Customer>) => {
    return apiRequest<{ success: boolean; data: import('@/types').Customer }>('/customer/update', {
      method: 'POST',
      body: JSON.stringify({ id, ...data }),
    });
  },
};
