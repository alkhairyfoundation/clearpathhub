import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query as neonQuery } from '@/lib/neon';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { buildNextClassMap, type ClassRow } from '@/lib/promotion';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { role } = token as any;
    if (role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { classIds } = body as { classIds?: string[] };

    const supabase = createSupabaseAdminClient();

    // Classes and students are read/written from Neon (the source the app uses)
    const classRows = await neonQuery('SELECT id, name, level, next_class_id FROM classes');

    const nextMap = buildNextClassMap((classRows || []) as ClassRow[]);

    let studentsSql = 'SELECT id, class_id FROM students';
    const studentParams: any[] = [];
    if (classIds && classIds.length > 0) {
      studentsSql += ` WHERE class_id::text = ANY($1::text[])`;
      studentParams.push(classIds.map((c) => String(c)));
    }
    const studentRows = await neonQuery(studentsSql, studentParams);

    const updated: { student_id: string; current_class: string; promoted_to: string }[] = [];
    let skippedNoNext = 0;
    let skippedUnassigned = 0;

    for (const s of (studentRows || []) as { id: string; class_id: string | null }[]) {
      if (!s.class_id) {
        skippedUnassigned++;
        continue;
      }
      const target = nextMap[s.class_id];
      if (!target) {
        skippedNoNext++;
        continue;
      }
      try {
        // Write to Neon FIRST (primary data store)
        await neonQuery(
          'UPDATE students SET class_id = $1::uuid WHERE id = $2::uuid',
          [target, s.id]
        );
      } catch (updateError: any) {
        console.error('Promote failed for student', s.id, updateError?.message);
        continue;
      }
      // Mirror to Supabase (secondary store, best-effort)
      try {
        await supabase
          .from('students')
          .update({ class_id: target })
          .eq('id', s.id);
      } catch (mirrorError) {
        console.error('Supabase promote mirror failed for student', s.id, mirrorError);
      }
      updated.push({
        student_id: s.id,
        current_class: s.class_id,
        promoted_to: target,
      });
    }

    return NextResponse.json({
      success: true,
      total_eligible: (studentRows || []).length,
      promoted_count: updated.length,
      skipped_no_next_class: skippedNoNext,
      skipped_unassigned: skippedUnassigned,
      promoted_students: updated,
    });
  } catch (error: any) {
    console.error('Promote students error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}