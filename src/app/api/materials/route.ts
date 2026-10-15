import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import { 
  getMaterialsByUid, 
  createMaterial, 
  updateMaterial, 
  deleteMaterial,
  getCustomerById,
  getProductProfileById,
  getMaterialById 
} from '@/lib/db-store';

// GET - 获取素材列表
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
    const customerId = searchParams.get('customerId');
    const sourceType = searchParams.get('sourceType');
    const keyword = searchParams.get('keyword');
    const status = searchParams.get('status');
    const archiveType = searchParams.get('archiveType'); // 档案类型筛选
    const productId = searchParams.get('productId'); // 产品档案ID筛选

    // 获取用户的所有素材
    let materials = await getMaterialsByUid(userId.toString());
    
    // 按客户筛选
    if (customerId && customerId !== 'all') {
      materials = materials.filter(m => m.customerId === Number(customerId));
    }
    
    // 按来源类型筛选
    if (sourceType && sourceType !== 'all') {
      materials = materials.filter(m => m.sourceType === sourceType || m.materialType === sourceType);
    }
    
    // 按状态筛选
    if (status && status !== 'all') {
      materials = materials.filter(m => m.status === status);
    }
    
    // 按档案类型筛选
    if (archiveType && archiveType !== 'all') {
      materials = materials.filter(m => m.archiveType === archiveType);
    } else {
      // 默认不显示 general 类型的素材（只在素材库中显示客户档案和产品档案）
      // materials = materials.filter(m => m.archiveType !== 'general');
    }
    
    // 按产品档案ID筛选
    if (productId && productId !== 'all') {
      materials = materials.filter(m => m.productId === Number(productId));
    }
    
    // 按关键词筛选
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      materials = materials.filter(m => 
        m.topic?.toLowerCase().includes(lowerKeyword) ||
        m.title?.toLowerCase().includes(lowerKeyword) ||
        m.content?.toLowerCase().includes(lowerKeyword) ||
        m.summary?.toLowerCase().includes(lowerKeyword)
      );
    }

    // 计算统计数据
    const stats = {
      total: materials.length,
      byCustomer: materials.reduce((acc, m) => {
        if (m.customerId && m.customerId > 0) {
          const existing = acc.find(a => a.customerId === m.customerId);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ customerId: m.customerId, customerName: m.customerName || '未知', count: 1 });
          }
        }
        return acc;
      }, [] as { customerId: number; customerName: string; count: number }[]),
      byProduct: materials.reduce((acc, m) => {
        if (m.archiveType === 'product' && m.productId && m.productId > 0) {
          const existing = acc.find(a => a.productId === m.productId);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ productId: m.productId, productName: m.productName || '未知', count: 1 });
          }
        }
        return acc;
      }, [] as { productId: number; productName: string; count: number }[]),
      bySourceType: materials.reduce((acc, m) => {
        const type = m.sourceType || m.materialType || 'other';
        const existing = acc.find(a => a.sourceType === type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ sourceType: type, count: 1 });
        }
        return acc;
      }, [] as { sourceType: string; count: number }[]),
      byStatus: materials.reduce((acc, m) => {
        const existing = acc.find(a => a.status === m.status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: m.status, count: 1 });
        }
        return acc;
      }, [] as { status: string; count: number }[]),
      byPlatform: [] as { platform: string; count: number }[],
      byArchiveType: materials.reduce((acc, m) => {
        const type = m.archiveType || 'customer';
        const existing = acc.find(a => a.archiveType === type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ archiveType: type, count: 1 });
        }
        return acc;
      }, [] as { archiveType: string; count: number }[]),
      recentCount: materials.filter(m => {
        const created = new Date(m.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created > weekAgo;
      }).length,
    };

    return NextResponse.json({
      success: true,
      data: materials,
      total: materials.length,
      stats,
    });
  } catch (error) {
    console.error('Get materials error:', error);
    return NextResponse.json(
      { success: false, error: '获取素材列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建新素材
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
      customerId, customerName, topic, title, scriptType, shootingMethod, 
      status, sourceType, materialType, content,
      // 档案相关字段
      archiveType, productId, productName 
    } = body;

    if (!topic || !scriptType) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段' },
        { status: 400 }
      );
    }

    // 过滤错误格式的内容（Vision API 返回的图片URL等）
    let safeContent = content;
    if (safeContent) {
      // 检测 Vision API 返回的错误格式
      // 错误格式示例: File: [assets/image.png]``URL: [https://code.coze.cn/api/sandbox/coze_coding/file/proxy?...]``Image: [...]
      const errorPatterns = [
        /^File:\s*\[/i,
        /^URL:\s*\[/i,
        /^Image:\s*\[/i,
        /File:\s*\[/i,                    // 任何位置出现 File: [
        /URL:\s*\[/i,                     // 任何位置出现 URL: [
        /Image:\s*\[/i,                   // 任何位置出现 Image: [
        /coze_coding\/file\/proxy/i,      // 包含 coze_coding/file/proxy
        /assets\/image/i,                 // 包含 assets/image
        /^```[\s\S]*(File|URL|Image):/i,  // Markdown代码块中的错误
      ];
      const isErrorFormat = errorPatterns.some(pattern => pattern.test(safeContent));
      
      if (isErrorFormat) {
        console.log('[素材库] 检测到错误格式内容，使用空内容替代');
        safeContent = '';
      }
    }

    const newMaterial = await createMaterial({
      uid: userId.toString(),
      customerId: customerId || 0,
      customerName: customerName || '',
      topic,
      title,
      scriptType,
      shootingMethod,
      status,
      sourceType: sourceType || materialType || 'other',
      materialType: materialType || sourceType || 'topic',
      content: safeContent,
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
    console.error('Create material error:', error);
    return NextResponse.json(
      { success: false, error: '创建素材失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新素材
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少素材ID' },
        { status: 400 }
      );
    }

    // 验证素材属于当前用户
    const material = await getMaterialById(id);
    if (!material || material.uid !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: '素材不存在或无权操作' },
        { status: 404 }
      );
    }

    const updatedMaterial = await updateMaterial(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedMaterial,
    });
  } catch (error) {
    console.error('Update material error:', error);
    return NextResponse.json(
      { success: false, error: '更新素材失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除素材
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
        { success: false, error: '缺少素材ID' },
        { status: 400 }
      );
    }

    const deleted = await deleteMaterial(Number(id), userId.toString());

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '素材不存在或无权删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '素材删除成功',
    });
  } catch (error) {
    console.error('Delete material error:', error);
    return NextResponse.json(
      { success: false, error: '删除素材失败' },
      { status: 500 }
    );
  }
}
