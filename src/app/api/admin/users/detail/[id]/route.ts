import { NextResponse } from 'next/server';
import { fetchUserById } from '@/lib/user-queries';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await fetchUserById(params.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Error fetching user detail (Neon):', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}