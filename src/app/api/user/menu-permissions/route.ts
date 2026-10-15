import { NextRequest, NextResponse } from 'next/server';
import { hasSession } from '@/lib/session';
import { MenuItem } from '@/types';

const AVAILABLE_MENU_ITEMS: MenuItem[] = [
  {
    id: 'customer',
    name: '客户管理',
    href: '/customer',
    description: '客户大盘数据、拍摄计划管理、新增客户',
    category: 'main',
    defaultEnabled: true,
  },
  {
    id: 'script',
    name: '脚本创作',
    href: '/script',
    description: '选题、文案创作、脚本、开篇优化',
    category: 'main',
    defaultEnabled: true,
  },
  {
    id: 'operations',
    name: '运营',
    href: '/operations',
    description: '数据分析、对标研究、爆款学习',
    category: 'main',
    defaultEnabled: true,
  },
  {
    id: 'tools',
    name: '工具',
    href: '/tools',
    description: 'AI 模型对话工具',
    category: 'main',
    defaultEnabled: true,
  },
  {
    id: 'live',
    name: '直播',
    href: '/live',
    description: '直播功能，敬请期待',
    category: 'main',
    defaultEnabled: true,
  },
  {
    id: 'member',
    name: '算力中心',
    href: '/member',
    description: '算力管理、购买充值、使用记录',
    category: 'main',
    defaultEnabled: true,
  },
  {
    id: 'user-devices',
    name: '设备管理',
    href: '/user-devices',
    description: '查看和管理登录设备',
    category: 'user',
    defaultEnabled: true,
  },
  {
    id: 'agent',
    name: '代理中心',
    href: '/agent',
    description: '代理中心 - 管理您的邀请和佣金',
    category: 'agent',
    defaultEnabled: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    // 返回菜单权限
    return NextResponse.json({
      success: true,
      data: {
        permissions: null,
        agentInvitePath: 'yidian',
        availableMenuItems: AVAILABLE_MENU_ITEMS,
        filteredMenuItems: AVAILABLE_MENU_ITEMS,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '获取权限失败' },
      { status: 500 }
    );
  }
}
