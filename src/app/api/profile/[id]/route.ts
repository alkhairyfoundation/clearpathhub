import { NextResponse } from 'next/server';
import { query } from '@/lib/neon';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const result = await query("SELECT * FROM profiles WHERE id = $1", [id]);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}