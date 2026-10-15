import { NextResponse } from 'next/server';
import { mockMemberPlans } from '@/lib/mock-data';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: mockMemberPlans,
    });
  } catch (error) {
    console.error('获取套餐列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取套餐列表失败' },
      { status: 500 }
    );
  }
}
