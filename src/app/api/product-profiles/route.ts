import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUserId, getSessionUserInfo } from '@/lib/session';
import {
  getProductProfilesByUid,
  createProductProfile,
  updateProductProfile,
  deleteProductProfile,
  getProductProfileById,
} from '@/lib/db-store';

// GET - 获取产品档案列表
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

    const sessionUser = await getSessionUserInfo(token);
    const userId = sessionUser?.id;
    if (!userId || !Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, error: '用户信息无效' },
        { status: 401 }
      );
    }

    const profiles = await getProductProfilesByUid(userId.toString());

    return NextResponse.json({
      success: true,
      data: profiles,
      total: profiles.length,
    });
  } catch (error) {
    console.error('Get product profiles error:', error);
    return NextResponse.json(
      { success: false, error: '获取产品档案列表失败' },
      { status: 500 }
    );
  }
}

// POST - 创建产品档案
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
    const {
      name,
      category,
      price,
      sellingPoints,
      targetUsers,
      userPainPoints,
      usageScenario,
      promotion,
      brandStory,
      competitorAnalysis,
    } = body;

    if (typeof name !== 'string' || !name.trim() || name.length > 200) {
      return NextResponse.json(
        { success: false, error: '请填写产品名称' },
        { status: 400 }
      );
    }

    const newProfile = await createProductProfile({
      uid: userId.toString(),
      name: name.trim(),
      category: category || 'other',
      price,
      sellingPoints: sellingPoints || [],
      targetUsers,
      userPainPoints,
      usageScenario,
      promotion,
      brandStory,
      competitorAnalysis,
    });

    return NextResponse.json({
      success: true,
      data: newProfile,
    });
  } catch (error) {
    console.error('Create product profile error:', error);
    return NextResponse.json(
      { success: false, error: '创建产品档案失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新产品档案
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
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });
    const updateData = Object.fromEntries(["name","category","price","sellingPoints","targetUsers","userPainPoints","usageScenario","promotion","brandStory","competitorAnalysis","aiPositioning","userAgeRange","userGender","userConsumptionLevel","userInterests","valueLadderBasic","valueLadderAdvanced","valueLadderTop","painPointsJson","purchaseBarriersJson","trustProofSales","trustProofRatings","trustProofCertifications","trustProofCases","trustProofEndorsements","analysisCompleted","analysisAt"]
      .filter(field => body[field] !== undefined).map(field => [field, body[field]]));

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少产品档案ID' },
        { status: 400 }
      );
    }

    // 验证产品档案属于当前用户
    const profile = await getProductProfileById(id);
    if (!profile || profile.uid !== userId.toString()) {
      return NextResponse.json(
        { success: false, error: '产品档案不存在或无权操作' },
        { status: 404 }
      );
    }

    const updatedProfile = await updateProductProfile(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Update product profile error:', error);
    return NextResponse.json(
      { success: false, error: '更新产品档案失败' },
      { status: 500 }
    );
  }
}

// DELETE - 删除产品档案
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
        { success: false, error: '缺少产品档案ID' },
        { status: 400 }
      );
    }

    const success = await deleteProductProfile(Number(id), userId.toString());

    if (!success) {
      return NextResponse.json(
        { success: false, error: '产品档案不存在或无权删除' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete product profile error:', error);
    return NextResponse.json(
      { success: false, error: '删除产品档案失败' },
      { status: 500 }
    );
  }
}
