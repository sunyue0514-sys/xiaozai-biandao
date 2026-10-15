// 错误信息友好化映射

// 错误代码到友好信息的映射
export const ERROR_MESSAGES: Record<string, string> = {
  // 认证相关
  'UNAUTHORIZED': '登录已过期，请重新登录',
  '未登录或登录已过期': '登录已过期，请重新登录',
  '会话无效': '登录状态已失效，请重新登录',
  '用户不存在': '账号不存在，请检查用户名',
  
  // 会员相关
  'MEMBER_EXPIRED': '会员已到期，请续费后继续使用',
  'NOT_MEMBER': '您还不是会员，开通会员即可使用全部功能',
  '会员已到期，请续费后继续使用': '会员已到期，续费后即可继续使用',
  '您还不是会员，请购买会员后使用': '您还不是会员，开通会员解锁全部功能',
  '会员信息异常，请联系管理员': '会员状态异常，请联系客服处理',
  '会员状态异常': '会员状态异常，请联系客服处理',
  
  // 算力相关
  'INSUFFICIENT_POWER': '算力不足，请充值或升级会员',
  '算力不足，请充值或升级会员': '算力余额不足，充值后继续使用',
  
  // 权限相关
  '需要管理员权限': '此功能仅管理员可用',
  '无权访问': '您没有权限访问此功能',
  '客户不存在或无权删除': '客户不存在或您无权操作',
  
  // 输入验证
  '请输入用户名和密码': '请填写用户名和密码',
  '用户名或密码错误': '用户名或密码错误，请检查后重试',
  '用户名已存在，请更换其他用户名': '用户名已被使用，请换一个',
  '请输入选题主题': '请先填写创作主题',
  '主题过长，请控制在3000字以内': '主题内容过长，请精简后重试',
  '补充要求过长，请控制在2000字以内': '补充要求过长，请精简后重试',
  
  // 操作限制
  '登录尝试过于频繁，请稍后再试': '操作太频繁，请稍后再试',
  '登录失败次数过多，账号已被锁定5分钟': '登录错误次数过多，请5分钟后再试',
  '脚本生成过于频繁，请稍后再试': '生成太频繁，请稍后再试',
  '操作过于频繁，请稍后再试': '操作太频繁，请稍后再试',
  '访问已被禁止': '您的访问已被限制，如有疑问请联系客服',
  
  // 网络错误
  '网络错误': '网络连接失败，请检查网络后重试',
  '请求超时': '请求超时，请稍后重试',
  '服务器错误': '服务暂时不可用，请稍后重试',
  
  // 数据相关
  '获取客户列表失败': '加载客户列表失败，请刷新重试',
  '创建客户失败': '创建客户失败，请稍后重试',
  '删除客户失败': '删除客户失败，请稍后重试',
  '获取素材列表失败': '加载素材失败，请刷新重试',
  '保存素材失败': '保存失败，请稍后重试',
  '删除素材失败': '删除失败，请稍后重试',
  '客户名称不能为空': '请输入客户名称',
  '请求数据格式错误': '提交数据格式错误，请刷新页面重试',
  
  // AI 相关
  'AI 服务暂时不可用': 'AI 服务繁忙，请稍后重试',
  '分析失败': '分析失败，请稍后重试',
  '生成失败': '生成失败，请稍后重试',
  '推荐失败': '推荐失败，请稍后重试',
  '报告生成失败': '报告生成失败，请稍后重试',
};

// 通用错误后缀映射
const GENERIC_SUFFIXES = [
  '失败，请稍后重试',
  '请稍后重试',
  '失败',
];

// 将技术错误信息转换为用户友好的提示
export function getFriendlyErrorMessage(error: string): string {
  // 如果已有映射，直接返回
  if (ERROR_MESSAGES[error]) {
    return ERROR_MESSAGES[error];
  }
  
  // 检查是否包含已知错误关键词
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (error.includes(key)) {
      return value;
    }
  }
  
  // 检查是否是通用错误格式
  for (const suffix of GENERIC_SUFFIXES) {
    if (error.endsWith(suffix)) {
      // 尝试提取操作名称
      const operation = error.replace(suffix, '');
      if (operation) {
        return `${operation}失败，请稍后重试`;
      }
    }
  }
  
  // 默认返回通用错误提示
  return '操作失败，请稍后重试';
}

// 获取错误操作建议
export function getErrorAction(error: string): { text: string; action: () => void } | null {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('登录') || lowerError.includes('会话') || lowerError.includes('unauthorized')) {
    return { text: '重新登录', action: () => window.location.href = '/login' };
  }
  
  if (lowerError.includes('会员') || lowerError.includes('member')) {
    return { text: '开通会员', action: () => window.location.href = '/member' };
  }
  
  if (lowerError.includes('算力') || lowerError.includes('power')) {
    return { text: '充值算力', action: () => window.location.href = '/member' };
  }
  
  return null;
}
