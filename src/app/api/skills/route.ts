import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/neon';

export async function GET() {
  try {
    const rows = await query("SELECT * FROM skills WHERE is_active = true ORDER BY category, name");
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
