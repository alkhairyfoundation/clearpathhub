import { config } from 'dotenv';
config({ path: '.env.local' });
import { runDbOp } from '../src/lib/neon-engine';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

let failed = 0;
const results: string[] = [];
async function run(name: string, fn: () => Promise<any>) {
  try {
    const r = await fn();
    results.push(`[OK]   ${name}`);
    return r;
  } catch (e: any) {
    failed++;
    results.push(`[FAIL] ${name} -> ${e?.message ?? e}`);
    return undefined;
  }
}
const check = (cond: boolean, label: string) => {
  results.push(`${cond ? '[OK]   ' : '[FAIL] '} assert: ${label}`);
  if (!cond) failed++;
};

(async () => {
  const teacher = (await pool.query(`SELECT id FROM profiles WHERE role = 'teacher' LIMIT 1`)).rows[0];
  const student = (await pool.query(`SELECT profile_id FROM students WHERE profile_id IS NOT NULL LIMIT 1`)).rows[0];
  const term = (await pool.query(`SELECT id, name FROM terms LIMIT 1`)).rows[0];
  if (!teacher) throw new Error('No teacher profile found');
  if (!student) throw new Error('No student found');
  if (!term) throw new Error('No term found');
  console.log(`teacher=${teacher.id} student=${student.profile_id} term=${term.id}`);

  // A. Teacher sessions dashboard load (was 500: missing video_url)
  await run('teacher sessions load (.not video_url is null)', () =>
    runDbOp({
      table: 'sessions', op: 'read', select: '*, subject:subjects!subject_id(*), class:classes!class_id(name), quiz:quizzes(*)', single: false, count: 'exact',
      filters: [{ type: 'not', col: 'video_url', val: null }],
    }));

  // B. Teacher quizzes dashboard load (was 500: missing quiz_questions)
  await run('teacher quizzes load (nested embed)', () =>
    runDbOp({
      table: 'quizzes', op: 'read', select: '*, session:sessions!session_id(*), questions:quiz_questions!quiz_id(*)', single: false,
      order: [{ col: 'created_at', asc: false }],
      filters: [],
    }));

  // C. Insert a session with video fields (teacher sessions create form)
  const ses = await run('create session w/ video fields', () =>
    runDbOp({
      table: 'sessions', op: 'write',
      write: { kind: 'insert', data: { title: '__repro_session__', teacher_id: teacher.id, description: 'repro', video_url: 'https://youtube.com/watch?v=repro', video_type: 'youtube', duration: 30, is_published: true }, returnEnhanced: true },
      filters: [],
    }));
  const sessionId = ses?.data?.[0]?.id;

  // D. Insert a quiz with passing_score/time_limit (teacher quiz form)
  const quiz = await run('create quiz passing_score/time_limit', () =>
    runDbOp({
      table: 'quizzes', op: 'write',
      write: { kind: 'insert', data: { session_id: sessionId, title: '__repro_quiz__', description: 'repro', passing_score: 60, time_limit: 45 }, returnEnhanced: true },
      filters: [],
    }));
  const quizId = quiz?.data?.[0]?.id;

  // E. Insert quiz_questions incl. JSONB array correct_answer (multiple_selection) + timestamp fields
  const qInsert = await run('create quiz_questions (JSONB 0 + array)', () =>
    runDbOp({
      table: 'quiz_questions', op: 'write',
      write: {
        kind: 'insert',
        data: [
          { quiz_id: quizId, question: '__repro_q1__', options: ['A', 'B'], correct_answer: 0, points: 1, question_type: 'multiple_choice', order_index: 0, timestamp_seconds: 42, is_checkpoint: false },
          { quiz_id: quizId, question: '__repro_q2__', options: ['A', 'B', 'C', 'D'], correct_answer: ['0', '2'], points: 2, question_type: 'multiple_selection', order_index: 1, timestamp_seconds: 7, is_checkpoint: true },
        ],
        returnEnhanced: true,
      },
      filters: [],
    }));
  const qRows: any[] = qInsert?.data || [];
  check(qRows.length === 2, `2 quiz_questions inserted (got ${qRows.length})`);

  const q1 = qRows.find((r) => r.question === '__repro_q1__');
  const q2 = qRows.find((r) => r.question === '__repro_q2__');
  check(q1?.correct_answer === 0, `correct_answer roundtrip number === 0 (got ${JSON.stringify(q1?.correct_answer)})`);
  check(Array.isArray(q2?.correct_answer) && q2.correct_answer.join(',') === '0,2', `correct_answer roundtrip array ['0','2'] (got ${JSON.stringify(q2?.correct_answer)})`);
  check(q1?.timestamp_seconds === 42 && q1?.order_index === 0, `timestamp_seconds/order_index persisted (${q1?.timestamp_seconds}/${q1?.order_index})`);
  check(q2?.is_checkpoint === true, `is_checkpoint persisted`);
  check(Array.isArray(q2?.options) && q2.options.join(',') === 'A,B,C,D', `options TEXT[] roundtrip (${JSON.stringify(q2?.options)})`);

  // Read back quiz_questions ordered (student quiz-taking path)
  const qRead = await run('read quiz_questions ordered', () =>
    runDbOp({ table: 'quiz_questions', op: 'read', select: '*', filters: [{ type: 'eq', col: 'quiz_id', val: quizId }], order: [{ col: 'order_index', asc: true }] }));
  check((qRead?.data || []).length === 2, `read-back returned 2 rows`);

  // F. Student sessions load (is_published + nested quiz embed)
  await run('student sessions load (is_published + nested)', () =>
    runDbOp({
      table: 'sessions', op: 'read', select: '*, subject:subjects!subject_id(*), quiz:quizzes(quiz_questions!quiz_id(*))', single: false,
      filters: [{ type: 'eq', col: 'is_published', val: true }],
    }));

  // G. Report card: report_remarks + domain_grades (was 500: tables missing)
  const pid = student.profile_id;
  check((await run('report_remarks maybeSingle', () =>
    runDbOp({ table: 'report_remarks', op: 'read', select: '*', maybeSingle: true, filters: [{ type: 'eq', col: 'student_id', val: pid }, { type: 'eq', col: 'term_id', val: term.id }] }))) !== undefined,
    'report_remarks maybeSingle');

  await run('report_remarks upsert (first save)', () =>
    runDbOp({
      table: 'report_remarks', op: 'write',
      write: { kind: 'upsert', data: { student_id: pid, term_id: term.id, teacher_remarks: 'First save', principal_remarks: 'P', next_term_begins: '2026-01-15', school_fees_paid: false }, onConflict: 'student_id,term_id', returnEnhanced: false },
      filters: [],
    }));
  const rrRead = await run('report_remarks read after first', () =>
    runDbOp({ table: 'report_remarks', op: 'read', select: '*', maybeSingle: true, filters: [{ type: 'eq', col: 'student_id', val: pid }, { type: 'eq', col: 'term_id', val: term.id }] }));
  check(rrRead?.data?.teacher_remarks === 'First save', `report_remarks inserted (got ${rrRead?.data?.teacher_remarks})`);

  await run('report_remarks upsert (second save - update path)', () =>
    runDbOp({
      table: 'report_remarks', op: 'write',
      write: { kind: 'upsert', data: { student_id: pid, term_id: term.id, teacher_remarks: 'Second save', school_fees_paid: true }, onConflict: 'student_id,term_id', returnEnhanced: false },
      filters: [],
    }));
  const rrRead2 = await run('report_remarks read after second', () =>
    runDbOp({ table: 'report_remarks', op: 'read', select: '*', maybeSingle: true, filters: [{ type: 'eq', col: 'student_id', val: pid }, { type: 'eq', col: 'term_id', val: term.id }] }));
  check(rrRead2?.data?.teacher_remarks === 'Second save' && rrRead2?.data?.school_fees_paid === true, `report_remarks second save UPDATED (got ${rrRead2?.data?.teacher_remarks}/${rrRead2?.data?.school_fees_paid})`);

  await run('domain_grades upsert', () =>
    runDbOp({
      table: 'domain_grades', op: 'write',
      write: { kind: 'upsert', data: { student_id: pid, term_id: term.id, cognitive_knowledge: 4, cognitive_application: 5, affective_punctuality: 5, psychomotor_handwriting: 3 }, onConflict: 'student_id,term_id', returnEnhanced: false },
      filters: [],
    }));
  const dgRead = await run('domain_grades select', () =>
    runDbOp({ table: 'domain_grades', op: 'read', select: '*', maybeSingle: true, filters: [{ type: 'eq', col: 'student_id', val: pid }, { type: 'eq', col: 'term_id', val: term.id }] }));
  const dg = dgRead?.data;
  check(dg?.cognitive_knowledge === 4 && dg?.psychomotor_handwriting === 3, `domain_grades persisted (${dg?.cognitive_knowledge}/${dg?.psychomotor_handwriting})`);

  // H. Cleanup
  await run('delete quiz_questions', () =>
    runDbOp({ table: 'quiz_questions', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'quiz_id', val: quizId }] }));
  await run('delete quiz', () =>
    runDbOp({ table: 'quizzes', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'id', val: quizId }] }));
  await run('delete session (cascade)', () =>
    runDbOp({ table: 'sessions', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'id', val: sessionId }] }));
  await run('delete report_remarks test row', () =>
    runDbOp({ table: 'report_remarks', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'student_id', val: pid }, { type: 'eq', col: 'term_id', val: term.id }] }));
  await run('delete domain_grades test row', () =>
    runDbOp({ table: 'domain_grades', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'student_id', val: pid }, { type: 'eq', col: 'term_id', val: term.id }] }));

  await pool.end();
  console.log(results.join('\n'));
  if (failed > 0) { console.error(`\n${failed} FAILURES`); process.exit(1); }
  console.log('\nAll teacher-flow repro assertions passed.');
})().catch((e) => { console.error(e); process.exit(1); });