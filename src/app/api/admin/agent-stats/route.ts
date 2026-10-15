import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId } from '@/lib/session';
import { getUserById } from '@/lib/store';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最高管理员UID列表
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

interface AdminStats {
  adminId: number;
  adminUid: string;
  adminUsername: string;
  totalCodesGenerated: number;
  codesByType: {
    trial: number;
    monthly: number;
    yearly: number;
    permanent: number;
    power: number;  // 兼容旧的算力兑换码
    power_10000: number;
    power_50000: number;
    power_100000: number;
    power_400000: number;
  };
  totalCodesUsed: number;
  codesUsedByType: {
    trial: number;
    monthly: number;
    yearly: number;
    permanent: number;
    power: number;  // 兼容旧的算力兑换码
    power_10000: number;
    power_50000: number;
    power_100000: number;
    power_400000: number;
  };
  usersCreated: number;
  totalRewardPower: number;
}

interface RedemptionRecord {
  code: string;
  codeType: string;
  rewardDays: number;
  rewardPower: number;
  usedByUserId: number;
  usedByUsername: string;
  usedAt: string;
  createdByAdminId: number;
  createdByAdminUsername: string;
}

interface UserCreatedByAdmin {
  userId: number;
  username: string;
  createdAt: string;
  credits: number;
  powerQuota: number;
  powerExpiry: string | null;
  createdByAdminId: number;
  createdByAdminUsername: string;
}

export async function GET(request: NextRequest) {
  try {
    // 验证登录状态
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录或登录已过期' }, { status: 401 });
    }

    const userId = await getSessionUserId(token);
    if (!userId) {
      return NextResponse.json({ success: false, error: '用户信息无效' }, { status: 401 });
    }

    // 验证是否是最高管理员
    const user = await getUserById(userId);
    if (!user || !(user.role === 'super_admin')) {
      return NextResponse.json({ success: false, error: '无权限访问' }, { status: 403 });
    }

    const supabase = getSupabaseClient();

    // 获取所有管理员（包括 super_admin）
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id, uid, username')
      .or('role.eq.admin,role.eq.super_admin');

    if (adminsError) {
      console.error('[代理数据统计] 获取管理员失败:', adminsError);
      return NextResponse.json({ success: false, error: '获取管理员数据失败' }, { status: 500 });
    }

    // 获取所有用户（用于映射）
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, username');

    if (usersError) {
      console.error('[代理数据统计] 获取用户失败:', usersError);
    }

    const userMap = new Map((allUsers || []).map((u: {id: number; username: string}) => [u.id, u.username]));
    // 同时支持 UID 和 ID 映射（因为 created_by 可能存的是 UID）
    const adminMapByUid = new Map((admins || []).map((a: {id: number; uid: string; username: string}) => [a.uid, a.username]));
    const adminMapById = new Map((admins || []).map((a: {id: number; uid: string; username: string}) => [a.id.toString(), a.username]));

    // 获取所有兑换码
    const { data: allCodes, error: codesError } = await supabase
      .from('redemption_codes')
      .select('*');

    if (codesError) {
      console.error('[代理数据统计] 获取兑换码失败:', codesError);
    }

    // 获取每个管理员的统计数据
    const adminStatsList: AdminStats[] = [];

    for (const admin of (admins || [])) {
      // 该管理员创建的兑换码（created_by 存的是 UID）
      const adminCodes = (allCodes || []).filter((c: {created_by: string}) => 
        c.created_by === admin.uid || c.created_by === admin.id.toString()
      );

      // 统计兑换码数据
      const codesByType = { trial: 0, monthly: 0, yearly: 0, permanent: 0, power: 0, power_10000: 0, power_50000: 0, power_100000: 0, power_400000: 0 };
      const codesUsedByType = { trial: 0, monthly: 0, yearly: 0, permanent: 0, power: 0, power_10000: 0, power_50000: 0, power_100000: 0, power_400000: 0 };
      let totalCodesUsed = 0;
      let totalRewardPower = 0;

      for (const code of adminCodes) {
        const type = code.type as keyof typeof codesByType;
        if (type in codesByType) {
          codesByType[type]++;
        }
        if (code.used_count && code.used_count > 0) {
          totalCodesUsed += code.used_count;
          if (type in codesUsedByType) {
            codesUsedByType[type] += code.used_count;
          }
          totalRewardPower += (code.reward_power || 0) * code.used_count;
        }
      }

      // 获取该管理员创建的用户数量
      const { count: usersCreatedCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('inviter_id', admin.id);

      adminStatsList.push({
        adminId: admin.id,
        adminUid: admin.uid,
        adminUsername: admin.username,
        totalCodesGenerated: adminCodes.length,
        codesByType,
        totalCodesUsed,
        codesUsedByType,
        usersCreated: usersCreatedCount || 0,
        totalRewardPower,
      });
    }

    // 获取最近的兑换记录
    const recentRedemptions: RedemptionRecord[] = [];

    // 获取已被使用的兑换码
    const usedCodes = (allCodes || [])
      .filter((c: {used_count: number}) => c.used_count > 0)
      .sort((a: {updated_at: string}, b: {updated_at: string}) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 50);

    for (const code of usedCodes) {
      if (code.used_by && Array.isArray(code.used_by)) {
        for (const usedId of code.used_by) {
          recentRedemptions.push({
            code: code.code,
            codeType: code.type || 'trial',
            rewardDays: code.reward_days || 0,
            rewardPower: code.reward_power || 0,
            usedByUserId: usedId as number,
            usedByUsername: userMap.get(usedId as number) || '未知用户',
            usedAt: code.updated_at || new Date().toISOString(),
            createdByAdminId: parseInt(code.created_by),
            // 同时尝试 UID 和 ID 映射
            createdByAdminUsername: adminMapByUid.get(code.created_by) || adminMapById.get(code.created_by) || '未知管理员',
          });
        }
      }
    }

    // 获取管理员创建的用户列表
    const usersCreatedByAdmins: UserCreatedByAdmin[] = [];

    for (const admin of (admins || [])) {
      const { data: createdUsers } = await supabase
        .from('users')
        .select('id, username, created_at, credits, power_quota, power_expiry')
        .eq('inviter_id', admin.id)
        .limit(20);

      for (const u of (createdUsers || [])) {
        usersCreatedByAdmins.push({
          userId: u.id,
          username: u.username,
          createdAt: u.created_at || new Date().toISOString(),
          credits: u.credits || 0,
          powerQuota: u.power_quota || 0,
          powerExpiry: u.power_expiry,
          createdByAdminId: admin.id,
          createdByAdminUsername: admin.username,
        });
      }
    }

    // 汇总统计
    const summary = {
      totalAdmins: (admins || []).length,
      totalCodesGenerated: adminStatsList.reduce((sum: number, a: AdminStats) => sum + a.totalCodesGenerated, 0),
      totalCodesUsed: adminStatsList.reduce((sum: number, a: AdminStats) => sum + a.totalCodesUsed, 0),
      totalUsersCreatedByAdmins: adminStatsList.reduce((sum: number, a: AdminStats) => sum + a.usersCreated, 0),
      totalRewardPowerDistributed: adminStatsList.reduce((sum: number, a: AdminStats) => sum + a.totalRewardPower, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        adminStats: adminStatsList,
        recentRedemptions: recentRedemptions.slice(0, 20),
        usersCreatedByAdmins: usersCreatedByAdmins.slice(0, 50),
      },
    });
  } catch (error) {
    console.error('[代理数据统计] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取数据失败' },
      { status: 500 }
    );
  }
}
