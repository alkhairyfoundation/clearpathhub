import { config } from 'dotenv';
config({ path: '.env.local' });
import { runDbOp } from '../src/lib/neon-engine';

const YES: any[] = ['class-a', 'class-b'];

const queries: { name: string; op: any }[] = [
  { name: 'subjects', op: { table: 'subjects', op: 'read', select: 'id, name, class_id', filters: [{ type: 'in', col: 'class_id', val: YES }] } },
  { name: 'classes', op: { table: 'classes', op: 'read', select: 'id, name, level', filters: [{ type: 'in', col: 'id', val: YES }], order: [{ col: 'level', asc: true }] } },
  { name: 'homework (is_active)', op: { table: 'homework', op: 'read', select: 'id, title, due_date, class_id', filters: [{ type: 'in', col: 'class_id', val: YES }, { type: 'eq', col: 'is_active', val: true }], count: 'exact' } },
  { name: 'quizzes (is_published)', op: { table: 'quizzes', op: 'read', select: 'id, title', filters: [{ type: 'in', col: 'class_id', val: YES }, { type: 'eq', col: 'is_published', val: true }], count: 'exact' } },
  { name: 'homework insert (with arrays)', op: { table: 'homework', op: 'write', write: { kind: 'insert', data: { title: '__repro__', class_id: 'bb3b1702-2c6e-4138-a875-2c378f5e9c45', subject_id: null, teacher_id: '48c73161-2cd0-4d1e-8208-c194d956b250', homework_type: 'assignment', attachments: ['https://x.com/a.pdf', 'https://x.com/b.pdf'], is_active: true, due_date: '2026-12-31' }, returnEnhanced: true } } },
  { name: 'homework delete (cleanup)', op: { table: 'homework', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'title', val: '__repro__' }] } },
  { name: 'sessions embed', op: { table: 'sessions', op: 'read', select: '*, class:classes!class_id(name), subject:subjects!subject_id(name)', filters: [{ type: 'in', col: 'class_id', val: YES }], order: [{ col: 'created_at', asc: false }], limit: 5 } },
  { name: 'announcements embed', op: { table: 'announcements', op: 'read', select: '*, creator:profiles!created_by(first_name, last_name)', filters: [{ type: 'in', col: 'audience', val: ['all', 'teachers', 'staff'] }], order: [{ col: 'created_at', asc: false }], limit: 5 } },
  { name: 'students head count', op: { table: 'students', op: 'read', select: 'id', filters: [{ type: 'in', col: 'class_id', val: YES }], count: 'exact', head: true } },
  { name: 'terms current', op: { table: 'terms', op: 'read', select: 'id, name, start_date, end_date', filters: [{ type: 'eq', col: 'is_current', val: true }], maybeSingle: true } },
  { name: 'scheme_of_work count', op: { table: 'scheme_of_work', op: 'read', select: 'id', filters: [{ type: 'eq', col: 'term_id', val: 't1' }, { type: 'eq', col: 'subject_id', val: 's1' }], count: 'exact', head: true } },
  { name: 'mastery_scores embed', op: { table: 'mastery_scores', op: 'read', select: '*, subject:subjects!subject_id(name, code)', filters: [{ type: 'in', col: 'student_id', val: ['s1'] }, { type: 'in', col: 'subject_id', val: ['s1'] }] } },
  { name: 'results', op: { table: 'results', op: 'read', select: 'id, score, grade', filters: [{ type: 'in', col: 'student_id', val: ['s1'] }] } },
];

(async () => {
  for (const q of queries) {
    try {
      const r = await runDbOp(q.op, async () => {});
      console.log('[OK]', q.name, '->', Array.isArray(r.data) ? r.data.length + ' rows' : JSON.stringify(r.data ?? null).slice(0, 80));
    } catch (e: any) {
      console.log('[FAIL]', q.name, '->', e?.message ?? e ?? 'unknown');
    }
  }
  process.exit(0);
})();