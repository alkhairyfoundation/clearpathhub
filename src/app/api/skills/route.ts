import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });
    const result = await pool.query("SELECT * FROM skills WHERE is_active = true ORDER BY category, name");
    await pool.end();
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
