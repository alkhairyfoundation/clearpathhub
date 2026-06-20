import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });
    const result = await pool.query('SELECT * FROM skills ORDER BY name');
    await pool.end();
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, category, description } = await req.json();
    if (!name?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }
    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });
    const result = await pool.query(
      'INSERT INTO skills (name, category, description) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), category || null, description.trim()]
    );
    await pool.end();
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, name, category, description, is_active } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name.trim()); }
    if (category !== undefined) { sets.push(`category = $${idx++}`); params.push(category || null); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description.trim()); }
    if (is_active !== undefined) { sets.push(`is_active = $${idx++}`); params.push(is_active); }
    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    params.push(id);
    const result = await pool.query(
      `UPDATE skills SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    await pool.end();
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }
    const { default: { Pool } } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL });
    const result = await pool.query('DELETE FROM skills WHERE id = $1 RETURNING id', [id]);
    await pool.end();
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
