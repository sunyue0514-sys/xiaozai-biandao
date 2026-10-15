// 会员类型
export type MemberType = 'none' | 'trial' | 'monthly' | 'yearly' | 'permanent';

// 用户角色类型
export type UserRole = 'super_admin' | 'admin' | 'user';

// 用户相关类型
export interface User {
  id: number;
  uid: string;              // 用户唯一标识
  username: string;
  password?: string;        // 密码（仅在内部使用，API 响应中会移除）
  phone?: string; // 兼容旧字段
  role: UserRole;
  maxCustomers: number;      // 最大客户数量
  maxDevices: number;        // 最大登录设备数
  powerQuota: number;        // 算力额度
  powerExpiry?: string | null; // 算力过期时间（用于新人赠送的1天有效期）
  memberType?: MemberType;   // 会员类型：none-普通用户, monthly-月度会员, yearly-年度会员, permanent-永久会员
  memberExpiry: string | null; // 会员到期时间
  usedPower: number;         // 已使用算力
  inviterId?: number;        // 邀请人ID
  lastLoginAt?: string | null; // 最后登录时间
  agentInvitePath?: string;
  createdAt: string;
  updatedAt: string;
  isAdmin?: boolean; // 兼容旧字段
  powerAvailable?: boolean; // 算力是否可用
}

// 操作日志类型
export interface OperationLog {
  id: number;
  operatorId: number;
  operatorUid: string;
  operatorName: string;
  operatorRole: UserRole;
  actionType: string;
  targetType?: string;
  targetId?: number;
  targetName?: string;
  targetUid?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Session {
  sessionToken: string;
  user: User;
}

// 认证相关
export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  sessionToken: string;
  warning?: string;
}

// 菜单权限
export interface MenuItem {
  id: string;
  name: string;
  href: string;
  description: string;
  category: 'main' | 'user' | 'agent';
  defaultEnabled: boolean;
}

export interface MenuPermissions {
  permissions: string[] | null;
  agentInvitePath: string;
  availableMenuItems: MenuItem[];
  filteredMenuItems: MenuItem[];
}

// 会员相关
export interface Subscription {
  id: number;
  status: string;
  startDate: string;
  endDate: string;
  planId: number;
  createdAt: string;
  plan: {
    id: number;
    name: string;
    planType: string;
    duration: number;
    price: number;
  };
  daysRemaining: number;
}

export interface MemberSubscription {
  isMember: boolean;
  subscription: Subscription | null;
}

export interface ComputingPower {
  remaining: number;
  total: number;
  unlimited?: boolean;
}

// 客户相关
export interface Customer {
  id: number;
  uid: string;
  name: string;
  description: string;
  personaProfile: string | null;
  accountPlan: string | null;
  ipPositioning: string | null;
  businessAnalysis?: string | null;
  businessFormData?: string | null;
  createdAt: string;
  updatedAt: string;
  positioningCompleted?: boolean;
  materialsCount?: number;
}

// 素材来源类型
export type MaterialSourceType = 
  | 'script'           // 脚本创作
  | 'opening'          // 开场白生成
  | 'writing'          // 文案写作
  | 'humanize'         // 口语化去AI味
  | 'banned-words'     // 违禁词检测结果
  | 'account-analysis' // 账号运营分析
  | 'benchmark'        // 对标账号分析
  | 'qianchuan_copywriting' // 千川文案
  | 'qianchuan_script'      // 千川脚本
  | 'feedad_copywriting'    // 信息流文案
  | 'feedad_script'         // 信息流脚本
  | 'topic'            // 智能选题
  | 'topic_batch'      // 批量选题
  | 'other';           // 其他

// 档案类型
export type ArchiveType = 'customer' | 'product';

// 素材状态
export type MaterialStatus = 
  | 'draft'     // 草稿
  | 'published' // 已发布
  | 'archived'; // 已归档

// 素材分类标签
export interface MaterialTag {
  id: string;
  name: string;
  color?: string;
}

// 素材库素材（扩展版）
export interface Material {
  id: number;
  uid: string;
  customerId: number;
  customerName: string;
  
  // 档案关联
  archiveType: ArchiveType;   // 档案类型：customer-客户档案, product-产品档案
  productId?: number;         // 产品档案ID（仅当 archiveType='product' 时有效）
  productName?: string;       // 产品名称
  
  // 基本信息
  topic: string;              // 选题/主题
  title: string | null;       // 标题
  content?: string;           // 内容（完整内容）
  summary?: string;           // 摘要（用于列表展示）
  
  // 分类信息
  sourceType: MaterialSourceType;  // 来源类型
  scriptType?: string;        // 脚本类型：讲故事/晒过程/教知识/聊观点/晒产品
  materialType?: string;      // 素材类型：topic-选题, script-文案, fullscript-脚本
  shootingMethod?: string | null;  // 拍摄方法
  category?: string;          // 自定义分类
  tags: string[];             // 标签
  platform?: string;          // 适用平台：douyin/xiaohongshu/shipinhao/kuaishou
  
  // 状态
  status: MaterialStatus;
  isDeleted: boolean;
  isStarred: boolean;         // 是否收藏
  
  // 媒体资源
  thumbnail?: string;         // 缩略图
  attachments?: string[];     // 附件列表
  
  // 关联数据
  openings?: unknown[];       // 开场白
  originalData?: string;      // 原始数据（JSON字符串）
  
  // 时间戳
  createdAt: string;
  updatedAt: string;
  
  // 统计
  viewCount?: number;         // 查看次数
  copyCount?: number;         // 复制次数
}

// 素材库查询参数
export interface MaterialQueryParams {
  page?: number;
  pageSize?: number;
  customerId?: number | 'all';
  sourceType?: MaterialSourceType | 'all';
  status?: MaterialStatus | 'all';
  scriptType?: string;
  platform?: string;
  keyword?: string;
  tags?: string[];
  isStarred?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  // 档案筛选
  archiveType?: ArchiveType | 'all'; // 档案类型筛选
  productId?: number | 'all';        // 产品档案ID筛选
}

// 素材库统计
export interface MaterialStats {
  total: number;
  byCustomer: { customerId: number; customerName: string; count: number }[];
  byProduct: { productId: number; productName: string; count: number }[]; // 按产品档案统计
  bySourceType: { sourceType: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byPlatform: { platform: string; count: number }[];
  byArchiveType: { archiveType: string; count: number }[]; // 按档案类型统计
  recentCount: number;        // 近7天新增
  starredCount: number;       // 收藏数量
}

export interface MaterialsResponse {
  data: Material[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats?: MaterialStats;
}

// API 响应通用类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
