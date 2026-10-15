import { NextRequest, NextResponse } from 'next/server';
import { hasSession, getSessionUser } from '@/lib/session';
import * as dbStore from '@/lib/db-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 获取设备列表
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

    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户信息不存在' },
        { status: 401 }
      );
    }

    // 从数据库获取设备列表
    const devices = await dbStore.getDevicesByUid(String(user.id));
    
    // 标记当前设备（通过User-Agent判断）
    const userAgent = request.headers.get('user-agent') || '';
    const currentDevice = devices.find(d => 
      userAgent.toLowerCase().includes(d.browser.toLowerCase()) || 
      userAgent.toLowerCase().includes(d.os.toLowerCase())
    );
    
    const devicesWithCurrent = devices.map(d => ({
      ...d,
      current: d.id === currentDevice?.id || d.current,
    }));

    return NextResponse.json({
      success: true,
      data: devicesWithCurrent,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '获取设备列表失败' },
      { status: 500 }
    );
  }
}

// 注册新设备（登录时调用）
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

    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户信息不存在' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, type, os, browser, location, ip } = body;

    // 检查设备数量限制
    const deviceCount = await dbStore.getDeviceCountByUser(String(user.id));
    const maxDevices = user.maxDevices || 1;
    
    if (deviceCount >= maxDevices && maxDevices !== -1) {
      return NextResponse.json(
        { success: false, error: `设备数量已达上限（${maxDevices}台）` },
        { status: 400 }
      );
    }

    // 创建新设备
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newDevice = await dbStore.createDevice({
      id: deviceId,
      uid: String(user.id),
      name: name || '新设备',
      type: type || 'desktop',
      os: os || 'Unknown',
      browser: browser || 'Unknown',
      location: location || 'Unknown',
      ip: ip || 'Unknown',
    });

    return NextResponse.json({
      success: true,
      data: newDevice,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '注册设备失败' },
      { status: 500 }
    );
  }
}

// 删除设备
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

    const user = await getSessionUser(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户信息不存在' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: '缺少设备ID' },
        { status: 400 }
      );
    }

    // 删除设备（数据库操作会验证归属和当前设备状态）
    const success = await dbStore.deleteDevice(deviceId, String(user.id));

    if (!success) {
      return NextResponse.json(
        { success: false, error: '设备不存在、无权删除或为当前设备' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '设备已移除',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: '删除设备失败' },
      { status: 500 }
    );
  }
}
