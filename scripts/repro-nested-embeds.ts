import { config } from 'dotenv';
config({ path: '.env.local' });
import { runDbOp } from '../src/lib/neon-engine';

let failed = 0;
const results: string[] = [];
async function run(name: string, fn: () => Promise<any>) {
  try {
    await fn();
    results.push(`[OK]   ${name}`);
  } catch (e: any) {
    failed++;
    results.push(`[FAIL] ${name} -> ${e?.message ?? e}`);
  }
}

(async () => {
  // parent/report-card & weekly-report/progress: homework:homework!homework_id(title, subject:subjects!subject_id(name))
  await run('homework_submissions 2-level embed (subject inside homework)', () =>
    runDbOp({
      table: 'homework_submissions', op: 'read', select: '*, homework:homework!homework_id(title, subject:subjects!subject_id(name))', single: false, filters: [],
    }));
  // parent page: quiz_attempts w/ quiz title embed
  await run('quiz_attempts embed quiz title', () =>
    runDbOp({
      table: 'quiz_attempts', op: 'read', select: 'id, score, passed, completed_at, quiz:quizzes!quiz_id(title)', single: false, filters: [],
    }));
  // parent page: results w/ subject name embed
  await run('results embed subject name', () =>
    runDbOp({
      table: 'results', op: 'read', select: 'score, subject:subjects!subject_id(name), created_at', single: false, filters: [],
    }));
  // student/tests/report: parent:profiles!parent_id(phone, email) (fixed syntax)
  await run('students -> parent profile embed', () =>
    runDbOp({
      table: 'students', op: 'read', select: '*, parent:profiles!parent_id(phone, email)', single: false, filters: [],
    }));
  // student/lessons uses subject:subjects(*) (no hint, inferred FK)
  await run('lessons embed subjects (no hint)', () =>
    runDbOp({
      table: 'lessons', op: 'read', select: '*, subject:subjects(*), class:classes!class_id(name)', single: false, filters: [],
    }));

  console.log(results.join('\n'));
  if (failed > 0) { console.error(`\n${failed} FAILURES`); process.exit(1); }
  console.log('\nAll nested-embed repro assertions passed.');
})().catch((e) => { console.error(e); process.exit(1); });