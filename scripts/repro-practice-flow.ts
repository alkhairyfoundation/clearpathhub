import { config } from 'dotenv';
config({ path: '.env.local' });
import { runDbOp } from '../src/lib/neon-engine';

const SID = '2a84c3a9-e1bc-440a-a462-408441367c0e';
const SUBJECT = '2adea9d0-0455-412d-8e43-083d6554113a';
const TODAY = new Date().toISOString().split('T')[0];
const TOPIC = `__repro_topic__`;

const results: string[] = [];
async function run(name: string, fn: () => Promise<any>) {
  try {
    const r = await fn();
    results.push(`[OK]   ${name}`);
    return r;
  } catch (e: any) {
    results.push(`[FAIL] ${name} -> ${e?.message ?? e}`);
    return undefined;
  }
}

(async () => {
  // Clean up any previous repro rows
  await run('cleanup practice_attempts', () =>
    runDbOp({ table: 'practice_attempts', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'topic', val: TOPIC }] }));
  await run('cleanup practice_sessions', () =>
    runDbOp({ table: 'practice_sessions', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'like', col: 'goal_type', val: '__repro__%' }] }));
  await run('cleanup daily_goals', () =>
    runDbOp({ table: 'daily_goals', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'date', val: TODAY }, { type: 'eq', col: 'student_id', val: SID }] }));
  await run('cleanup review_schedule', () =>
    runDbOp({ table: 'review_schedule', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'subtopic', val: TOPIC }] }));
  await run('cleanup badges', () =>
    runDbOp({ table: 'badges', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'badge_data', val: '' }] }).catch(() => undefined).then(async () => {
      // JSONB delete can't eq ''; use a marker topic instead via badge_type
      await runDbOp({ table: 'badges', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'badge_type', val: '__repro_badge__' }] });
    }));
  await run('cleanup learning_streaks', () =>
    runDbOp({ table: 'learning_streaks', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'student_id', val: SID }] }));

  // 1. Insert a practice_sessions row (as startPractice does)
  const session = await run('practice_sessions insert', () =>
    runDbOp({ table: 'practice_sessions', op: 'write', filters: [], write: { kind: 'insert', data: { student_id: SID, term_id: null, date: TODAY, goal_type: '__repro__mixed', total_questions: 10, status: 'in_progress' }, returnEnhanced: true } }));

  // 2. Update the session to completed (as finishSession does)
  if (session?.data?.[0]?.id) {
    await run('practice_sessions update (completed)', () =>
      runDbOp({ table: 'practice_sessions', op: 'write', write: { kind: 'update', data: { status: 'completed', completed_at: new Date().toISOString(), answered_questions: 8, correct_answers: 6, score: 75, duration_seconds: 300 }, returnEnhanced: false }, filters: [{ type: 'eq', col: 'id', val: session.data[0].id }] }));
  }

  // 3. Insert a practice_attempt (as handleNext does)
  if (session?.data?.[0]?.id) {
    await run('practice_attempts insert', () =>
      runDbOp({ table: 'practice_attempts', op: 'write', filters: [], write: { kind: 'insert', data: { session_id: session.data[0].id, student_id: SID, question_text: 'Test q?', question_type: 'multiple_choice', options: ['A', 'B', 'C', 'D'], correct_answer: 1, selected_answer: 1, is_correct: true, time_taken: 12, difficulty: 'medium', topic: TOPIC, subtopic: '', explanation: 'x' }, returnEnhanced: true } }));
  }

  // 4. daily_goals: read-or-create then update (practice page flow)
  await run('daily_goals insert', () =>
    runDbOp({ table: 'daily_goals', op: 'write', filters: [], write: { kind: 'insert', data: { student_id: SID, date: TODAY, target_questions: 10, target_score: 70 }, returnEnhanced: true } }));
  await run('daily_goals select eq date', () =>
    runDbOp({ table: 'daily_goals', op: 'read', select: '*', filters: [{ type: 'eq', col: 'student_id', val: SID }, { type: 'eq', col: 'date', val: TODAY }], maybeSingle: true }));

  // 5. learning_streaks insert + update
  await run('learning_streaks insert', () =>
    runDbOp({ table: 'learning_streaks', op: 'write', filters: [], write: { kind: 'insert', data: { student_id: SID, current_streak: 1, longest_streak: 1, last_activity_date: TODAY }, returnEnhanced: true } }));
  await run('learning_streaks update', () =>
    runDbOp({ table: 'learning_streaks', op: 'write', write: { kind: 'update', data: { current_streak: 2, longest_streak: 2 }, returnEnhanced: false }, filters: [{ type: 'eq', col: 'student_id', val: SID }] }));

  // 6. badges insert with jsonb badge_data (as checkBadges does)
  await run('badges insert (jsonb)', () =>
    runDbOp({ table: 'badges', op: 'write', filters: [], write: { kind: 'insert', data: { student_id: SID, badge_type: '__repro_badge__', badge_data: { score: 75, total_questions: 8, correct_answers: 6 } }, returnEnhanced: true } }));
  await run('badges select by student', () =>
    runDbOp({ table: 'badges', op: 'read', select: '*', filters: [{ type: 'eq', col: 'student_id', val: SID }], order: [{ col: 'awarded_at', asc: false }] }));

  // 7. review_schedule upsert twice (tests ON CONFLICT)
  await run('review_schedule upsert #1', () =>
    runDbOp({ table: 'review_schedule', op: 'write', filters: [], write: { kind: 'upsert', data: { student_id: SID, subject_id: SUBJECT, topic: TOPIC, subtopic: '', next_review_date: TODAY, interval_days: 2, last_reviewed_at: new Date().toISOString() }, returnEnhanced: true, onConflict: 'student_id, subject_id, topic, subtopic' } }));
  await run('review_schedule upsert #2 (conflict)', () =>
    runDbOp({ table: 'review_schedule', op: 'write', filters: [], write: { kind: 'upsert', data: { student_id: SID, subject_id: SUBJECT, topic: TOPIC, subtopic: '', next_review_date: TODAY, interval_days: 7, last_reviewed_at: new Date().toISOString() }, returnEnhanced: true, onConflict: 'student_id, subject_id, topic, subtopic' } }));
  await run('review_schedule select due', () =>
    runDbOp({ table: 'review_schedule', op: 'read', select: 'id', filters: [{ type: 'eq', col: 'student_id', val: SID }, { type: 'lte', col: 'next_review_date', val: TODAY }], count: 'exact', head: true }));

  // 8. Dashboard reads
  await run('dashboard practice_sessions order', () =>
    runDbOp({ table: 'practice_sessions', op: 'read', select: '*', filters: [{ type: 'eq', col: 'student_id', val: SID }], order: [{ col: 'created_at', asc: false }], limit: 30 }));
  await run('dashboard daily_goals order by date', () =>
    runDbOp({ table: 'daily_goals', op: 'read', select: '*', filters: [{ type: 'eq', col: 'student_id', val: SID }], order: [{ col: 'date', asc: false }], limit: 30 }));

  // 9. Raw SQL used by API routes
  const { query } = await import('../src/lib/neon');
  await run('sql mastery/recalc topics', () => query(`SELECT topic, subtopic FROM practice_attempts WHERE student_id = $1::uuid AND topic IS NOT NULL AND topic <> ''`, [SID]));
  await run('sql xp/history streaks', () => query(`SELECT current_streak, longest_streak, streak_type FROM learning_streaks WHERE student_id = $1`, [SID]));
  await run('sql ai/coach recent sessions', () => query(`SELECT score, correct_answers, answered_questions, created_at FROM practice_sessions WHERE student_id = $1 AND status = 'completed' ORDER BY created_at DESC LIMIT 5`, [SID]));
  await run('sql analytics overview active today', () => query(`SELECT COUNT(*) FROM practice_sessions ps WHERE ps.date = CURRENT_DATE`, []));
  await run('sql admin analytics attempts', () => query(`SELECT pa.difficulty, pa.topic, pa.subtopic, pa.is_correct, pa.time_taken, pa.created_at, pa.question_type FROM practice_attempts pa WHERE pa.student_id = $1 ORDER BY pa.created_at DESC`, [SID]));
  await run('sql admin analytics goals', () => query(`SELECT dg.* FROM daily_goals dg WHERE dg.student_id = $1 ORDER BY dg.date DESC`, [SID]));
  await run('sql admin analytics badge_count', () => query(`SELECT COUNT(*) FROM badges b WHERE b.student_id = $1`, [SID]));
  await run('sql admin analytics streak', () => query(`SELECT sl.*, ls.current_streak, ls.longest_streak, ls.last_activity_date, (SELECT COUNT(*) FROM badges b WHERE b.student_id = $1) as badge_count FROM student_levels sl LEFT JOIN learning_streaks ls ON ls.student_id = sl.student_id WHERE sl.student_id = $2`, [SID, SID]));

  // Cleanup
  await run('cleanup (again)', () => runDbOp({ table: 'practice_attempts', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'topic', val: TOPIC }] }).then(async () => {
    await runDbOp({ table: 'practice_sessions', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'like', col: 'goal_type', val: '__repro__%' }] });
    await runDbOp({ table: 'daily_goals', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'date', val: TODAY }, { type: 'eq', col: 'student_id', val: SID }] });
    await runDbOp({ table: 'review_schedule', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'subtopic', val: TOPIC }] });
    await runDbOp({ table: 'badges', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'badge_type', val: '__repro_badge__' }] });
    await runDbOp({ table: 'learning_streaks', op: 'write', write: { kind: 'delete', data: null, returnEnhanced: false }, filters: [{ type: 'eq', col: 'student_id', val: SID }] });
    return 'cleaned';
  }));

  console.log(results.join('\n'));
  const fails = results.filter((r) => r.startsWith('[FAIL]'));
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length > 0 ? 1 : 0);
})();