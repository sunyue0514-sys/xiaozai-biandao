/**
 * 代理管理 API
 * 支持三层代理体系，上级自由设置下级佣金比例
 */

import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { 
  getAgentAccountByUserId, 
  createAgentAccount, 
  getAllAgents,
  getUserById,
} from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 最高管理员 UID
const SUPER_ADMIN_UIDS = ['10000001', '00000001'];

/**
 * GET: 获取代理列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    const client = getSupabaseClient();

    const userInfo = await getSessionUser(token);
    if (!userInfo) {
      return NextResponse.json({ success: false, error: '用户信息不存在' }, { status: 401 });
    }

    // 检查是否是管理员
    const isSuperAdmin = (userInfo.role === 'super_admin');
    const isAdmin = ['admin', 'super_admin'].includes(userInfo.role);
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    // 获取代理列表
    const allAgents = await getAllAgents();
    
    // 获取当前登录用户的代理信息
    const currentAgent = allAgents.find(a => a.userId === userInfo.id);
    const currentAgentLevel = currentAgent?.agentLevel ?? null;

    // 根据用户层级过滤代理列表
    let agents = allAgents;
    if (!isSuperAdmin) {
      // 非超级管理员只能看到自己下级的代理
      if (currentAgentLevel === 0) {
        // 总代：可以看到自己创建的一级代理和二级代理，以及二级代理的下级
        const myLevel1Agents = allAgents.filter(a => a.parentId === currentAgent?.id);
        const myLevel1Ids = myLevel1Agents.map(a => a.id);
        const myLevel2Agents = allAgents.filter(a => myLevel1Ids.includes(a.parentId ?? 0));
        agents = [...myLevel1Agents, ...myLevel2Agents];
      } else if (currentAgentLevel === 1) {
        // 一级代理：只能看到自己的二级代理
        agents = allAgents.filter(a => a.parentId === currentAgent?.id);
      } else {
        // 二级代理：不能看到任何代理
        agents = [];
      }
    }
    
    // 非超级管理员不返回availableUsers列表（只能通过UID搜索）
    // 获取所有用户（仅超级管理员需要）
    let availableUsers: any[] = [];
    if (isSuperAdmin) {
      const { data: users } = await client
        .from('users')
        .select('id, uid, username, role, member_type, phone, created_at')
        .order('created_at', { ascending: false });
      const agentUserIds = new Set(allAgents.map(a => a.userId));
      availableUsers = (users || []).filter(u => !agentUserIds.has(u.id));
    }

    // 分离总代、一级和二级代理
    const level0Agents = agents.filter(a => a.agentLevel === 0);
    const level1Agents = agents.filter(a => a.agentLevel === 1 || (!a.agentLevel && !a.parentId));
    const level2Agents = agents.filter(a => a.agentLevel === 2 || (!a.agentLevel && a.parentId));

    return NextResponse.json({
      success: true,
      data: {
        agents: agents,
        level0Agents: level0Agents,
        level1Agents: level1Agents,
        level2Agents: level2Agents,
        availableUsers: availableUsers.map(u => ({
          id: u.id,
          uid: u.uid,
          username: u.username,
          role: u.role,
          memberType: u.member_type,
          phone: u.phone,
          createdAt: u.created_at,
        })),
        isSuperAdmin,
        currentAgentLevel,
        currentAgentId: currentAgent?.id || null,
      },
    });

  } catch (error) {
    console.error('[代理管理] 错误:', error);
    return NextResponse.json(
      { success: false, error: '获取代理列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST: 创建代理
 */
export async function POST(request: NextRequest) {
  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    const client = getSupabaseClient();

    const userInfo = await getSessionUser(token);
    if (!userInfo) {
      return NextResponse.json({ success: false, error: '用户信息不存在' }, { status: 401 });
    }

    // 检查是否是管理员
    const isSuperAdmin = (userInfo.role === 'super_admin');
    const isAdmin = userInfo.role === 'admin';
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ success: false, error: '无权限' }, { status: 403 });
    }

    // 解析请求
    const body = await request.json();
    const { 
      userId, 
      agentPath, 
      platformRate,
      parentId,
      agentLevel,  // 0=总代, 1=一级代理, 2=二级代理
    } = body;

    if (!Number.isSafeInteger(userId) || userId <= 0 || typeof agentPath !== 'string' || ![0, 1, 2].includes(agentLevel) ||
        (parentId !== undefined && parentId !== null && (!Number.isSafeInteger(parentId) || parentId <= 0)) ||
        (platformRate !== undefined && (typeof platformRate !== 'number' || !Number.isFinite(platformRate) || platformRate < 0 || platformRate > 1))) {
      return NextResponse.json({ success: false, error: 'Invalid agency configuration' }, { status: 400 });
    }
    if (!isSuperAdmin && platformRate !== undefined) return NextResponse.json({ success: false, error: 'Only platform administrators set commission rates' }, { status: 403 });
    if (!userId || !agentPath) {
      return NextResponse.json({ 
        success: false, 
        error: '请选择用户并设置推广路径' 
      }, { status: 400 });
    }

    // 只有最高管理员可以创建总代
    if (agentLevel === 0 && !isSuperAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: '只有最高管理员可以创建总代' 
      }, { status: 403 });
    }

    // 最高管理员创建二级代理时，必须选择上级代理
    // 非最高管理员创建的代理会自动绑定到自己
    if (isSuperAdmin && agentLevel === 2 && !parentId) {
      return NextResponse.json({ 
        success: false, 
        error: '二级代理必须选择一个上级代理' 
      }, { status: 400 });
    }

    // 检查推广路径格式
    if (!/^[a-zA-Z0-9_-]{2,20}$/.test(agentPath)) {
      return NextResponse.json({ 
        success: false, 
        error: '推广路径只能包含字母、数字、下划线和横线，长度2-20位' 
      }, { status: 400 });
    }

    // 检查推广路径是否已存在
    const { data: existingPath } = await client
      .from('agent_accounts')
      .select('id')
      .eq('agent_path', agentPath)
      .single();

    if (existingPath) {
      return NextResponse.json({ 
        success: false, 
        error: '推广路径已被使用' 
      }, { status: 400 });
    }

    // 获取目标用户
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ 
        success: false, 
        error: '用户不存在' 
      }, { status: 400 });
    }

    // 检查用户是否已有代理账户
    if (!isSuperAdmin && targetUser.inviterId !== userInfo.id) return NextResponse.json({ success: false, error: 'Forbidden target user' }, { status: 403 });
    const existingAgent = await getAgentAccountByUserId(userId);
    if (existingAgent) {
      return NextResponse.json({ 
        success: false, 
        error: '该用户已是代理' 
      }, { status: 400 });
    }

    // 确定代理层级和权限
    let finalAgentLevel: number;
    let finalParentId: number | null = null;
    let finalParentUid: string | null = null;
    let finalParentUserId: number | null = null;  // 上级代理的用户ID，用于设置 inviter_id
    let finalPlatformRate: number;
    let finalCommissionRate: number;
    let canCreateCode: boolean;
    let canCreateUser: boolean;

    if (isSuperAdmin) {
      // 最高管理员创建代理
      if (agentLevel === 0) {
        // 创建总代
        finalAgentLevel = 0;
        finalParentId = null;
        finalParentUid = null;
        finalParentUserId = null;  // 总代没有上级
        finalPlatformRate = platformRate !== undefined ? parseFloat(platformRate) : 0.5;
        finalCommissionRate = 1 - finalPlatformRate;
        canCreateCode = true;
        canCreateUser = true;  // 总代可以创建用户
      } else if (agentLevel === 1 || !parentId) {
        // 创建一级代理
        finalAgentLevel = 1;
        finalParentId = null;
        finalParentUid = null;
        finalParentUserId = userInfo.id;  // 超级管理员作为邀请人
        finalPlatformRate = platformRate !== undefined ? parseFloat(platformRate) : 0.5;
        finalCommissionRate = 1 - finalPlatformRate;
        canCreateCode = true;
        canCreateUser = false;  // 一级代理不能创建用户
      } else {
        // 创建二级代理（指定上级）
        const { data: parentAgent } = await client
          .from('agent_accounts')
          .select('*')
          .eq('id', parentId)
          .single();
        
        if (!parentAgent || parentAgent.status !== 'active' || parentAgent.agent_level !== 1) {
          return NextResponse.json({ 
            success: false, 
            error: '上级代理不存在' 
          }, { status: 400 });
        }
        
        finalAgentLevel = 2;
        finalParentId = parentAgent.id;
        finalParentUid = parentAgent.uid;
        finalParentUserId = parentAgent.user_id;  // 记录上级代理的用户ID
        finalPlatformRate = parentAgent.platform_rate ?? 0.5;
        finalCommissionRate = 1 - finalPlatformRate;
        canCreateCode = false;
        canCreateUser = false;
      }
    } else {
      // 非最高管理员创建代理 - 根据当前用户的代理层级决定
      // 获取当前用户的代理账户
      const { data: currentAgent } = await client
        .from('agent_accounts')
        .select('*')
        .eq('user_id', userInfo.id)
        .single();
      
      if (!currentAgent || currentAgent.status !== 'active') {
        return NextResponse.json({ 
          success: false, 
          error: '您还不是代理，无法创建下级代理' 
        }, { status: 403 });
      }

      const currentLevel = currentAgent.agent_level ?? 1;

      if (currentLevel === 0) {
        // 总代可以创建一级代理和二级代理
        if (agentLevel === 1) {
          // 创建一级代理（直属）
          finalAgentLevel = 1;
          finalParentId = currentAgent.id;
          finalParentUid = currentAgent.uid;
          finalParentUserId = currentAgent.user_id;  // 记录上级代理的用户ID
          finalPlatformRate = platformRate !== undefined ? parseFloat(platformRate) : (currentAgent.platform_rate ?? 0.5);
          finalCommissionRate = 1 - finalPlatformRate;
          canCreateCode = true;
          canCreateUser = false;
        } else {
          // 创建二级代理（需要选择上级）
          if (!parentId) {
            return NextResponse.json({ 
              success: false, 
              error: '二级代理必须选择一个上级代理' 
            }, { status: 400 });
          }
          
          const { data: parentAgent } = await client
            .from('agent_accounts')
            .select('*')
            .eq('id', parentId)
            .single();
          
          if (!parentAgent || parentAgent.status !== 'active' || parentAgent.agent_level !== 1 || parentAgent.parent_id !== currentAgent.id) {
            return NextResponse.json({ 
              success: false, 
              error: '上级代理不存在' 
            }, { status: 400 });
          }
          
          finalAgentLevel = 2;
          finalParentId = parentAgent.id;
          finalParentUid = parentAgent.uid;
          finalParentUserId = parentAgent.user_id;  // 记录上级代理的用户ID
          finalPlatformRate = platformRate !== undefined ? parseFloat(platformRate) : (parentAgent.platform_rate || 0.5);
          finalCommissionRate = 1 - finalPlatformRate;
          canCreateCode = false;
          canCreateUser = false;
        }
      } else if (currentLevel === 1) {
        // 一级代理只能创建二级代理
        finalAgentLevel = 2;
        finalParentId = currentAgent.id;
        finalParentUid = currentAgent.uid;
        finalParentUserId = currentAgent.user_id;  // 记录上级代理的用户ID
        finalPlatformRate = platformRate !== undefined ? parseFloat(platformRate) : (currentAgent.platform_rate || 0.5);
        finalCommissionRate = 1 - finalPlatformRate;
        canCreateCode = false;
        canCreateUser = false;
      } else {
        // 二级代理不能创建代理
        return NextResponse.json({ 
          success: false, 
          error: '二级代理无法创建下级代理' 
        }, { status: 403 });
      }
    }

    // 验证比例范围
    if (!Number.isFinite(finalPlatformRate) || finalPlatformRate < 0 || finalPlatformRate > 1) {
      return NextResponse.json({ 
        success: false, 
        error: '平台分成比例必须在 0-100% 之间' 
      }, { status: 400 });
    }

    // 创建代理账户
    const agent = await createAgentAccount({
      userId: targetUser.id,
      uid: targetUser.uid,
      agentPath: agentPath,
      parentId: finalParentId ?? undefined,
      parentUid: finalParentUid ?? undefined,
      commissionRate: finalCommissionRate,
      platformRate: finalPlatformRate,
      agentLevel: finalAgentLevel,
      canCreateCode: canCreateCode,
      canCreateUser: canCreateUser,
      createdBy: userInfo.id,
    });

    if (!agent) {
      return NextResponse.json({ 
        success: false, 
        error: '创建代理账户失败' 
      }, { status: 500 });
    }

    // 更新用户的 inviter_id（建立代理关系）
    // 注意：inviter_id 应该存储上级代理的 user_id，而不是代理账户的 id
    const inviterIdToSet = finalParentUserId || userInfo.id;
    await client
      .from('users')
      .update({ inviter_id: inviterIdToSet })
      .eq('id', targetUser.id);

    console.log(`[创建代理] 设置用户 ${targetUser.uid} 的 inviter_id=${inviterIdToSet} (finalParentUserId=${finalParentUserId}, userInfo.id=${userInfo.id})`);

    // 如果是总代或一级代理，更新用户的 role 为 admin
    // Agency membership never grants a platform administrator role.

    const levelName = finalAgentLevel === 0 ? '总代' : finalAgentLevel === 1 ? '一级代理' : '二级代理';
    console.log(`[创建代理] ${userInfo.uid} 为用户 ${targetUser.uid} 创建${levelName}，路径: ${agentPath}`);

    return NextResponse.json({
      success: true,
      message: '创建代理成功',
      data: agent,
    });

  } catch (error) {
    console.error('[创建代理] 错误:', error);
    return NextResponse.json(
      { success: false, error: '创建代理失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT: 更新代理
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    const client = getSupabaseClient();

    const userInfo = await getSessionUser(token);
    if (!userInfo) {
      return NextResponse.json({ success: false, error: '用户信息不存在' }, { status: 401 });
    }

    // 检查是否是最高管理员
    const isSuperAdmin = (userInfo.role === 'super_admin');

    // 解析请求
    const body = await request.json();
    const { id, agentLevel, platformRate, status, parentId, canCreateCode, canCreateUser } = body;
    if (!['admin', 'super_admin'].includes(userInfo.role)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    if (!Number.isSafeInteger(id) || id <= 0 ||
        (agentLevel !== undefined && ![0, 1, 2].includes(agentLevel)) ||
        (status !== undefined && !['active', 'disabled'].includes(status)) ||
        (platformRate !== undefined && (typeof platformRate !== 'number' || !Number.isFinite(platformRate) || platformRate < 0 || platformRate > 1)) ||
        (parentId !== undefined && parentId !== null && (!Number.isSafeInteger(parentId) || parentId <= 0 || parentId === id)) ||
        (canCreateCode !== undefined && typeof canCreateCode !== 'boolean') || (canCreateUser !== undefined && typeof canCreateUser !== 'boolean')) return NextResponse.json({ success: false, error: 'Invalid agency configuration' }, { status: 400 });
    if (!isSuperAdmin && [agentLevel, platformRate, parentId, canCreateCode, canCreateUser].some(value => value !== undefined)) return NextResponse.json({ success: false, error: 'Only platform administrators change agency hierarchy, commission or capabilities' }, { status: 403 });

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少代理ID' }, { status: 400 });
    }

    // 获取代理信息
    const { data: agent } = await client
      .from('agent_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (!agent) {
      return NextResponse.json({ success: false, error: '代理不存在' }, { status: 404 });
    }

    // 只有最高管理员或总代可以修改代理层级
    if (agentLevel !== undefined && !isSuperAdmin) {
      // 获取当前用户的代理信息
      const { data: currentAgent } = await client
        .from('agent_accounts')
        .select('id, agent_level, status')
        .eq('user_id', userInfo.id)
        .single();
      
      // 只有总代可以修改下级代理层级
      if (!currentAgent || currentAgent.agent_level !== 0) {
        return NextResponse.json({ success: false, error: '只有最高管理员或总代可以修改代理层级' }, { status: 403 });
      }
      
      // 检查目标代理是否是自己的下级
      if (agent.parent_id === currentAgent.id) {
        // 直接下级（一级代理），允许修改
      } else if (agent.agent_level === 2 && agent.parent_id) {
        // 检查是否是间接下级（二级代理）
        const { data: level1Agent } = await client
          .from('agent_accounts')
          .select('parent_id')
          .eq('id', agent.parent_id)
          .single();
        
        if (!level1Agent || level1Agent.parent_id !== currentAgent.id) {
          return NextResponse.json({ success: false, error: '只能修改自己的下级代理层级' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ success: false, error: '只能修改自己的下级代理层级' }, { status: 403 });
      }
    }

    // 权限检查：只有最高管理员或上级代理可以修改
    if (!isSuperAdmin) {
      // 检查是否是上级代理（直接上级或更高级）
      const { data: currentAgent } = await client
        .from('agent_accounts')
        .select('id, agent_level, status')
        .eq('user_id', userInfo.id)
        .single();
      
      if (!currentAgent) {
        return NextResponse.json({ success: false, error: '无权限修改该代理' }, { status: 403 });
      }
      
      // 直接上级可以修改
      if (currentAgent.id === agent.parent_id) {
        // 允许修改
      } 
      // 总代可以修改所有下级（包括二级代理）
      else if (currentAgent.agent_level === 0) {
        // 检查目标代理是否是总代的下级链中的代理
        // 获取目标代理的一级上级
        if (agent.agent_level === 2 && agent.parent_id) {
          const { data: level1Agent } = await client
            .from('agent_accounts')
            .select('parent_id')
            .eq('id', agent.parent_id)
            .single();
          
          // 如果二级代理的一级上级的parent_id是当前总代，则允许修改
          if (!level1Agent || level1Agent.parent_id !== currentAgent.id) {
            return NextResponse.json({ success: false, error: '无权限修改该代理' }, { status: 403 });
          }
        } else {
          // 总代只能修改一级代理（直接下级）或二级代理（间接下级）
          return NextResponse.json({ success: false, error: '无权限修改该代理' }, { status: 403 });
        }
      }
      else {
        return NextResponse.json({ success: false, error: '无权限修改该代理' }, { status: 403 });
      }
    }

    // 验证平台分成比例
    if (platformRate !== undefined) {
      const rate = parseFloat(platformRate);
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return NextResponse.json({ 
          success: false, 
          error: '平台分成比例必须在 0-100% 之间' 
        }, { status: 400 });
      }
    }

    // 更新代理
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    // 更新层级（只有最高管理员可以）
    if (agentLevel !== undefined && isSuperAdmin) {
      updateData.agent_level = agentLevel;
      // 根据层级设置默认权限
      if (agentLevel === 0) {
        // 总代：可以创建用户和兑换码
        updateData.can_create_user = canCreateUser ?? true;
        updateData.can_create_code = canCreateCode ?? true;
      } else if (agentLevel === 1) {
        // 一级代理：不能创建用户，可以创建兑换码
        updateData.can_create_user = false;
        updateData.can_create_code = canCreateCode ?? true;
      } else {
        // 二级代理：都不能
        updateData.can_create_code = false;
        updateData.can_create_user = false;
      }
    }
    
    if (platformRate !== undefined) {
      updateData.platform_rate = parseFloat(platformRate);
      updateData.commission_rate = 1 - parseFloat(platformRate);  // 代理拿剩下的
    }
    if (status !== undefined) updateData.status = status;
    if (parentId !== undefined) {
      updateData.parent_id = parentId || null;
      // 获取上级代理的 uid
      if (parentId) {
        const { data: parent } = await client
          .from('agent_accounts')
          .select('uid')
          .eq('id', parentId)
          .single();
        updateData.parent_uid = parent?.uid || null;
      } else {
        updateData.parent_uid = null;
      }
    }

    const { error } = await client
      .from('agent_accounts')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[更新代理] 失败:', error);
      return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });

  } catch (error) {
    console.error('[更新代理] 错误:', error);
    return NextResponse.json(
      { success: false, error: '更新代理失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 删除代理
 * 最高管理员可以删除任何代理
 * 上级代理可以删除自己的下级代理
 */
export async function DELETE(request: NextRequest) {
  try {
    // 验证登录
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    const client = getSupabaseClient();

    const userInfo = await getSessionUser(token);
    if (!userInfo) {
      return NextResponse.json({ success: false, error: '用户信息不存在' }, { status: 401 });
    }

    // 检查是否是最高管理员
    const isSuperAdmin = userInfo.role === 'super_admin';
    if (!['admin', 'super_admin'].includes(userInfo.role)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    
    // 解析请求
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少代理ID' }, { status: 400 });
    }

    // 获取代理信息
    const { data: agent } = await client
      .from('agent_accounts')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (!agent) {
      return NextResponse.json({ success: false, error: '代理不存在' }, { status: 404 });
    }

    // 权限检查
    if (!isSuperAdmin) {
      // 非最高管理员，检查是否是上级代理
      const { data: currentAgent } = await client
        .from('agent_accounts')
        .select('id, agent_level, status')
        .eq('user_id', userInfo.id)
        .single();
      
      if (!currentAgent) {
        return NextResponse.json({ success: false, error: '无权限删除代理' }, { status: 403 });
      }
      
      // 检查是否是直接上级
      const isDirectParent = currentAgent.id === agent.parent_id;
      
      // 检查是否是间接上级（总代的二级代理）
      let isIndirectParent = false;
      if (currentAgent.agent_level === 0 && agent.agent_level === 2 && agent.parent_id) {
        const { data: level1Agent } = await client
          .from('agent_accounts')
          .select('parent_id')
          .eq('id', agent.parent_id)
          .single();
        
        if (level1Agent && level1Agent.parent_id === currentAgent.id) {
          isIndirectParent = true;
        }
      }
      
      if (!isDirectParent && !isIndirectParent) {
        return NextResponse.json({ success: false, error: '只能删除自己的下级代理' }, { status: 403 });
      }
    }

    // 检查是否有下级代理
    const { data: children } = await client
      .from('agent_accounts')
      .select('id')
      .eq('parent_id', agent.id);

    if (children && children.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: '该代理有下级代理，请先处理下级代理' 
      }, { status: 400 });
    }

    // 删除代理账户
    const { error } = await client
      .from('agent_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[删除代理] 失败:', error);
      return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
    }

    // 清除用户的代理关系
    await client
      .from('users')
      .update({ inviter_id: null })
      .eq('id', agent.user_id);

    // 如果是一级代理，恢复用户角色
    // Removing an agency profile never changes the platform role.

    console.log(`[删除代理] ${userInfo.uid} 删除代理 ${agent.uid}`);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });

  } catch (error) {
    console.error('[删除代理] 错误:', error);
    return NextResponse.json(
      { success: false, error: '删除代理失败' },
      { status: 500 }
    );
  }
}
