import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import * as dbStore from '@/lib/db-store';
import { getCustomerById, getProductProfileById } from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    // 获取当前用户ID
    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || '1');
    const pageSize = Number(searchParams.get('pageSize') || '10');
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) return NextResponse.json({ error: 'Invalid pagination' }, { status: 400 });
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const keyword = searchParams.get('keyword')?.toLowerCase();

    // 从数据库获取素材
    const allMaterials = await dbStore.getMaterialsByUid(userId.toString());
    let filteredData = allMaterials.filter(m => !m.isDeleted);
    
    if (customerId && customerId !== 'all') {
      filteredData = filteredData.filter(m => m.customerId === Number(customerId));
    }
    
    if (status && status !== 'all') {
      filteredData = filteredData.filter(m => m.status === status);
    }
    
    if (type && type !== 'all') {
      filteredData = filteredData.filter(m => m.scriptType === type);
    }
    
    if (keyword) {
      filteredData = filteredData.filter(m => 
        m.topic?.toLowerCase().includes(keyword) || 
        m.title?.toLowerCase().includes(keyword)
      );
    }

    const total = filteredData.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      data: paginatedData,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error('获取素材列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取素材列表失败' },
      { status: 500 }
    );
  }
}

// 创建素材
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const body = await request.json();
    // References must belong to the same authenticated account as the material.
    for (const [field, getter] of [
      ['customerId', getCustomerById],
      ['productId', getProductProfileById],
    ] as const) {
      const value = body[field];
      if (value === undefined || value === null || value === 0 || value === '') continue;
      const linkedId = Number(value);
      if (!Number.isSafeInteger(linkedId) || linkedId <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid related ID' }, { status: 400 });
      }
      body[field] = linkedId;
      const linked = await getter(linkedId);
      if (!linked || linked.uid !== String(userId)) {
        return NextResponse.json({ success: false, error: 'Related record not found' }, { status: 404 });
      }
    }

    const { 
      customerId, 
      customerName, 
      topic, 
      title, 
      scriptType, 
      shootingMethod, 
      status, 
      content,
      materialType,
      // 档案相关字段
      archiveType,
      productId,
      productName,
    } = body;

    // 使用数据库存储
    const newMaterial = await dbStore.createMaterial({
      uid: userId.toString(),
      customerId: customerId || 0,
      customerName: customerName || '',
      topic: topic || '',
      title: title || undefined,
      scriptType: scriptType || 'story',
      shootingMethod: shootingMethod || undefined,
      status: status || 'draft',
      materialType: materialType || 'topic',
      content: content || undefined,
      // 档案字段
      archiveType: archiveType || 'customer',
      productId: productId || undefined,
      productName: productName || undefined,
    });

    return NextResponse.json({
      success: true,
      data: newMaterial,
    });
  } catch (error) {
    console.error('创建素材失败:', error);
    const errorMessage = error instanceof Error ? error.message : '创建素材失败';
    return NextResponse.json(
      { success: false, error: `创建素材失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// 更新素材
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const body = await request.json();
    // References must belong to the same authenticated account as the material.
    for (const [field, getter] of [
      ['customerId', getCustomerById],
      ['productId', getProductProfileById],
    ] as const) {
      const value = body[field];
      if (value === undefined || value === null || value === 0 || value === '') continue;
      const linkedId = Number(value);
      if (!Number.isSafeInteger(linkedId) || linkedId <= 0) {
        return NextResponse.json({ success: false, error: 'Invalid related ID' }, { status: 400 });
      }
      const linked = await getter(linkedId);
      if (!linked || linked.uid !== String(userId)) {
        return NextResponse.json({ success: false, error: 'Related record not found' }, { status: 404 });
      }
    }

    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    const updateData = Object.fromEntries(["customerId","customerName","topic","title","scriptType","shootingMethod","status","isDeleted","materialType","content","archiveType","productId","productName"]
      .filter(field => body[field] !== undefined).map(field => [field, body[field]]));

    // 验证素材属于当前用户
    const material = await dbStore.getMaterialById(id);
    if (!material || material.uid !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: '素材不存在或无权修改' },
        { status: 404 }
      );
    }

    // 使用数据库更新
    const updatedMaterial = await dbStore.updateMaterial(id, updateData);

    if (!updatedMaterial) {
      return NextResponse.json(
        { success: false, error: '更新素材失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedMaterial,
    });
  } catch (error) {
    console.error('更新素材失败:', error);
    return NextResponse.json(
      { success: false, error: '更新素材失败' },
      { status: 500 }
    );
  }
}

// 删除素材
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const tokenFromCookie = request.cookies.get('sessionToken')?.value;
    const token = tokenFromHeader || tokenFromCookie;

    if (!token || !(await hasSession(token))) {
      return NextResponse.json(
        { success: false, error: '未登录或登录已过期' },
        { status: 401 }
      );
    }

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });

    if (!id) {
      return NextResponse.json(
        { success: false, error: '素材ID无效' },
        { status: 400 }
      );
    }

    // 使用数据库删除（会自动验证用户权限）
    const success = await dbStore.deleteMaterial(id, userId.toString());

    if (!success) {
      return NextResponse.json(
        { success: false, error: '素材不存在或无权删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除素材失败:', error);
    return NextResponse.json(
      { success: false, error: '删除素材失败' },
      { status: 500 }
    );
  }
}
