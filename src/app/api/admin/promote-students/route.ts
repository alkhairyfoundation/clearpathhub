import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { query as neonQuery } from '@/lib/neon';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type ClassRow = { id: string; name: string; level: unknown; next_class_id: string | null };

function phaseOf(name: string): number {
  const n = name.toLowerCase();
  if (/primary|nursery|kindergarten|creche|pre-primary|basic\s*[1-6]/i.test(n)) return 0;
  if (/junior secondary|jss|ubе|upper basic/i.test(n) || /\bjss\b/.test(n)) return 1;
  if (/senior secondary|sss|\bss\b|senior basic/i.test(n) || /^ss\d/i.test(n)) return 2;
  return 3;
}

function sortKey(cls: { name: string; level: unknown }): { phase: number; num: number; name: string } {
  const raw = String(cls.name || '').toLowerCase();
  const levelStr = String(cls.level ?? '');
  const phase = phaseOf(raw);
  const numMatch = raw.match(/\d+/);
  let num = numMatch ? parseInt(numMatch[0], 10) : 0;
  if (!num && /^ss\d/i.test(levelStr)) {
    const lv = levelStr.match(/\d+/);
    num = lv ? parseInt(lv[0], 10) : 0;
  }
  return { phase, num, name: String(cls.name || '') };
}

function compareClasses(a: ClassRow, b: ClassRow): number {
  const ka = sortKey(a);
  const kb = sortKey(b);
  if (ka.phase !== kb.phase) return ka.phase - kb.phase;
  if (ka.num !== kb.num) return ka.num - kb.num;
  return ka.name.localeCompare(kb.name);
}

function buildNextClassMap(classes: ClassRow[]): Record<string, string | null> {
  const sorted = [...classes].sort(compareClasses);
  const idToIndex = new Map<string, number>();
  sorted.forEach((c, i) => idToIndex.set(c.id, i));

  const next: Record<string, string | null> = {};
  sorted.forEach((c, i) => {
    // 1. Explicit next_class_id (most reliable, admin-controlled)
    if (c.next_class_id && idToIndex.has(c.next_class_id)) {
      next[c.id] = c.next_class_id;
      return;
    }
    // 2. Infer: first class with a strictly higher phase/number in the ordering
    const k = sortKey(c);
    for (let j = i + 1; j < sorted.length; j++) {
      const k2 = sortKey(sorted[j]);
      if (k2.phase > k.phase || (k2.phase === k.phase && k2.num > k.num)) {
        next[c.id] = sorted[j].id;
        return;
      }
    }
    next[c.id] = null;
  });

  return next;
}

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

    for (const s of (studentRows || []) as { id: string; class_id: string | null }[]) {
      if (!s.class_id) continue;
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
      promoted_students: updated,
    });
  } catch (error: any) {
    console.error('Promote students error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}