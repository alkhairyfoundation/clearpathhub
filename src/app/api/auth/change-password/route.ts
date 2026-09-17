import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { query } from '@/lib/neon';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !((session.user as any).id)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'All fields required' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const rows = await query('SELECT password_hash FROM profiles WHERE id = $1 LIMIT 1', [userId]);
    const profile = rows[0];
    if (!profile || !profile.password_hash) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(currentPassword, profile.password_hash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
