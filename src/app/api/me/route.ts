import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { query } from '@/lib/neon';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const rows = await query('SELECT * FROM profiles WHERE id = $1 LIMIT 1', [userId]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, profile: rows[0] });
  } catch (error: any) {
    console.error('[/api/me] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
