import { NextResponse } from 'next/server';
import { fetchUsers } from '@/lib/user-queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || undefined;
    const search = searchParams.get('search') || undefined;
    const classId = searchParams.get('class_id') || undefined;
    const departmentId = searchParams.get('department_id') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

    const result = await fetchUsers({ role, search, classId, departmentId, limit, offset });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error fetching users (Neon):', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}