import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/neon';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const studentId = token.id;

    // Fetch the student record to get the class_id
    const studentResult = await query(
      "SELECT class_id FROM students WHERE profile_id = $1",
      [studentId]
    );

    if (studentResult.length === 0) {
      return NextResponse.json({ classId: null });
    }

    const classId = studentResult[0].class_id;

    return NextResponse.json({ classId: classId ?? null });
  } catch (error: any) {
    console.error('Error fetching student class:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}