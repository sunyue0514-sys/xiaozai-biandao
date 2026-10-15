import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserById, updateUser } from '@/lib/store';
import { getAgentByPath, updateAgentStats } from '@/lib/db-store';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import {
  getClientIp,
  isIpBlacklisted,
  checkRateLimit,
  checkRegistrationLimit,
  checkDailyRegistrationLimit,
  checkDeviceRegistrationLimit,
  recordRegistration,
  recordDeviceRegistration,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    
    // 检查IP黑名单
    if (isIpBlacklisted(ip)) {
      return NextResponse.json(
        { success: false, error: '访问已被禁止' },
        { status: 403 }
      );
    }
    
    // 检查速率限制
    const { allowed, resetTime } = checkRateLimit(`register:${ip}`, RATE_LIMITS.auth);
    if (!allowed) {
      return createRateLimitResponse(resetTime, '注册请求过于频繁，请稍后再试');
    }
    
    // 检查IP注册次数限制（168小时内最多3个账号）
    const regLimit = checkRegistrationLimit(ip);
    if (!regLimit.allowed) {
      const hoursRemaining = regLimit.resetTime 
        ? Math.ceil((regLimit.resetTime - Date.now()) / (60 * 60 * 1000))
        : 0;
      return NextResponse.json(
        { 
          success: false, 
          error: `该IP注册次数已达上限（7天内最多注册3个账号），请${hoursRemaining}小时后再试`,
          code: 'REGISTRATION_LIMIT_EXCEEDED',
          remainingHours: hoursRemaining,
        },
        { status: 429 }
      );
    }

    // 新增：检查每日注册限制（24小时内最多1个账号）
    const dailyLimit = checkDailyRegistrationLimit(ip);
    if (!dailyLimit.allowed) {
      const hoursRemaining = dailyLimit.resetTime 
        ? Math.ceil((dailyLimit.resetTime - Date.now()) / (60 * 60 * 1000))
        : 0;
      return NextResponse.json(
        { 
          success: false, 
          error: `该IP注册过于频繁（24小时内最多注册1个账号），请${hoursRemaining}小时后再试`,
          code: 'DAILY_REGISTRATION_LIMIT_EXCEEDED',
          remainingHours: hoursRemaining,
        },
        { status: 429 }
      );
    }

    // 获取设备指纹（如果有）
    const deviceFingerprint = request.headers.get('x-device-fingerprint') || '';
    
    // 新增：检查设备注册限制（72小时内最多5个账号）
    if (deviceFingerprint) {
      const deviceLimit = checkDeviceRegistrationLimit(deviceFingerprint);
      if (!deviceLimit.allowed) {
        const hoursRemaining = deviceLimit.resetTime 
          ? Math.ceil((deviceLimit.resetTime - Date.now()) / (60 * 60 * 1000))
          : 0;
        return NextResponse.json(
          { 
            success: false, 
            error: `该设备注册次数过多（72小时内最多注册5个账号），请${hoursRemaining}小时后再试`,
            code: 'DEVICE_REGISTRATION_LIMIT_EXCEEDED',
            remainingHours: hoursRemaining,
          },
          { status: 429 }
        );
      }
    }
    
    const body = await request.json();
    const { username: rawUsername, password: rawPassword, ref } = body;  // ref: 代理推广路径
    
    // 对用户名和密码进行 trim 处理
    const username = typeof rawUsername === 'string' ? rawUsername.trim() : rawUsername;
    const password = rawPassword;

    // 调试日志：追踪请求体

    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 用户名格式验证
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: '用户名需要4-20位字母、数字或下划线' },
        { status: 400 }
      );
    }

    // 密码长度验证
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少需要6位' },
        { status: 400 }
      );
    }

    // 查找代理（如果有 ref 参数）
    let inviterId: number | undefined;
    let agentPath: string | undefined;
    
    if (ref && typeof ref === 'string') {
      const agent = await getAgentByPath(ref.trim());
      if (agent) {
        // 关键日志：追踪 agent 对象的所有字段
        console.log(`[注册-DEBUG] 找到代理账户:`, {
          'agent.id': agent.id,
          'agent.userId': agent.userId,
          'agent.uid': agent.uid,
          'agent.agentPath': agent.agentPath,
        });
        inviterId = agent.userId;
        agentPath = ref.trim();
        console.log(`[注册] 用户 ${username} 通过代理 ${agent.uid} (${agent.agentPath}) 注册, inviterId=${inviterId}`);
      } else {
        console.log(`[注册] 未找到代理路径: ${ref}`);
      }
    }

    // 创建新用户（createUser 内部会检查用户名是否存在并加密密码）
    // 新用户默认无会员，可以正常使用基础功能
    // 如需试用期，可由管理员手动开通或通过兑换码激活
    
    const result = await createUser({
      username,
      password,
      role: 'user',
      memberType: 'none',  // 默认无会员
      maxCustomers: 10,
      maxDevices: 1,
      powerQuota: 3000,  // 新用户赠送3000算力，有效期1天
      memberExpiry: undefined,  // 无会员过期时间
      inviterId,  // 代理关系
    });

    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // 设置新用户赠送算力：同时设置 credits（新系统）和 powerQuota（兼容旧系统）
    const powerExpiry = new Date();
    powerExpiry.setDate(powerExpiry.getDate() + 1);  // 有效期1天（防止恶意注册）
    await updateUser(result.id, {
      credits: 3000,  // 新系统算力（主要使用）
      powerQuota: 3000,  // 旧系统算力（兼容无脚本拍摄）
      powerExpiry: powerExpiry.toISOString(),  // 算力有效期7天
    });

    // 记录注册成功（用于限制同IP注册次数）
    recordRegistration(ip);
    
    // 记录设备注册（如果有设备指纹）
    if (deviceFingerprint) {
      recordDeviceRegistration(deviceFingerprint);
    }

    // 更新代理邀请统计
    if (inviterId) {
      try {
        // 获取当前邀请人数并增加1
        const agent = await getAgentByPath(ref);
        if (agent) {
          await updateAgentStats(agent.id, {
            inviteCount: agent.inviteCount + 1,
          });
        }
      } catch (e) {
        console.warn('[注册] 更新代理统计失败（不影响注册）:', e);
      }
    }

    // 处理邀请关系（如果是通过邀请链接注册）
    // 邀请码格式：用户UID（如 10000001, 10000002 等）
    // 注意：邀请奖励在新用户完成新手任务后发放，防止恶意刷奖励
    if (ref && typeof ref === 'string' && !inviterId) {
      // 检查 ref 是否是用户 UID（邀请码）
      const { data: inviterUser } = await getSupabaseClient()
        .from('users')
        .select('id, uid')
        .eq('uid', ref.trim())
        .single();

      if (inviterUser && inviterUser.id !== result.id) {
        try {
          const now = new Date().toISOString();

          // 只记录邀请关系，不发放奖励
          // 奖励在新用户完成新手任务后发放
          await getSupabaseClient()
            .from('users')
            .update({
              inviter_id: inviterUser.id, // 记录邀请人
              updated_at: now,
            })
            .eq('id', result.id);

          // 记录邀请关系（pending状态，完成任务后更新为granted）
          await getSupabaseClient()
            .from('invite_records')
            .insert({
              inviter_id: inviterUser.id,
              invitee_id: result.id,
              invite_code: ref.trim(),
              reward_power: 2000, // 双方各得2000算力
              reward_status: 'pending', // 待完成任务后发放
              created_at: now,
            });

          console.log(`[注册] 记录邀请关系: 邀请人=${inviterUser.uid}, 新用户=${result.uid}，等待完成新手任务后发放奖励`);
        } catch (e) {
          console.warn('[注册] 处理邀请关系失败（不影响注册）:', e);
        }
      }
    }

    // 返回用户信息（重新查询获取最新的算力数据）
    const { data: updatedUserRaw, error: fetchError } = await getSupabaseClient()
      .from('users')
      .select('id, uid, username, role, member_type, inviter_id, agent_level, credits, power_quota, power_expiry, created_at')
      .eq('id', result.id)
      .single();

    if (fetchError) {
      console.error('[注册] 查询更新后用户失败:', fetchError);
    }

    // 转换为 camelCase 格式
    const { password: _password, ...safeResult } = result;
    const updatedUser = updatedUserRaw ? {
      id: updatedUserRaw.id,
      uid: updatedUserRaw.uid,
      username: updatedUserRaw.username,
      role: updatedUserRaw.role,
      memberType: updatedUserRaw.member_type,
      inviterId: updatedUserRaw.inviter_id,
      agentLevel: updatedUserRaw.agent_level,
      credits: updatedUserRaw.credits,
      powerQuota: updatedUserRaw.power_quota,
      powerExpiry: updatedUserRaw.power_expiry,
      createdAt: updatedUserRaw.created_at,
    } : {
      ...safeResult,
      credits: 3000,
      powerQuota: 3000,
    };

    return NextResponse.json({
      success: true,
      message: '注册成功',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, error: '注册失败' },
      { status: 500 }
    );
  }
}
