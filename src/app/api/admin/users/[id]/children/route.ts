import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';
import { fetchUsers, type AdminUserItem } from '@/lib/user-queries';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const linkedRows = await neonQuery(
      `SELECT student_id FROM parent_students WHERE parent_id = $1`,
      [params.id]
    );
    const linked = linkedRows.map((r) => r.student_id);

    const result = await fetchUsers({ role: 'student', limit: 1000 });
    const students: AdminUserItem[] = result.users;

    return NextResponse.json({ success: true, linked, students });
  } catch (error: any) {
    console.error('Error fetching parent children (Neon):', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const parentId = params.id;
    const body = await request.json();
    const studentIds: string[] = Array.isArray(body.student_ids)
      ? body.student_ids.filter((s: unknown) => typeof s === 'string')
      : [];
    const relationship: string | null = typeof body.relationship === 'string' && body.relationship
      ? body.relationship
      : 'father';

    // Primary write in Neon (source of truth)
    await neonQuery('BEGIN');
    try {
      const prevRows = await neonQuery('SELECT student_id FROM parent_students WHERE parent_id = $1', [parentId]);
      const prevIds = prevRows.map((r) => r.student_id);

      if (prevIds.length > 0) {
        await neonQuery('DELETE FROM parent_students WHERE parent_id = $1', [parentId]);
        await neonQuery('UPDATE students SET parent_id = NULL WHERE parent_id = $1', [parentId]);
      }

      if (studentIds.length > 0) {
        for (const sid of studentIds) {
          await neonQuery(
            `INSERT INTO parent_students (parent_id, student_id, relationship)
             VALUES ($1, $2, $3)
             ON CONFLICT (parent_id, student_id) DO UPDATE SET relationship = EXCLUDED.relationship`,
            [parentId, sid, relationship]
          );
        }
        await neonQuery('UPDATE students SET parent_id = $1 WHERE profile_id = ANY($2::uuid[])', [
          parentId,
          studentIds,
        ]);
      }

      await neonQuery('COMMIT');
    } catch (e) {
      await neonQuery('ROLLBACK');
      throw e;
    }

    // Secondary mirror to Supabase (best-effort)
    try {
      const adminClient = createSupabaseAdminClient();
      await adminClient.from('parent_students').delete().eq('parent_id', parentId);
      await adminClient.from('students').update({ parent_id: null }).eq('parent_id', parentId);
      if (studentIds.length > 0) {
        const junctionData = studentIds.map((sid) => ({
          parent_id: parentId,
          student_id: sid,
          relationship,
        }));
        await adminClient.from('parent_students').insert(junctionData);
        await adminClient.from('students').update({ parent_id: parentId }).in('profile_id', studentIds);
      }
    } catch (syncError: any) {
      console.error('Supabase parent_students sync error:', syncError);
    }

    return NextResponse.json({
      success: true,
      message: `${studentIds.length} student(s) linked successfully`,
    });
  } catch (error: any) {
    console.error('Error linking children (Neon):', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}