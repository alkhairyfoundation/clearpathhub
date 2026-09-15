import { NextResponse } from 'next/server';
import { getAllClasses, getAllDepartments } from '@/lib/user-queries';

export async function GET() {
  try {
    const [classes, departments] = await Promise.all([
      getAllClasses(),
      getAllDepartments(),
    ]);
    return NextResponse.json({ success: true, classes, departments });
  } catch (error: any) {
    console.error('Error fetching user meta (Neon):', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}