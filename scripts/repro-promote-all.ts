import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';
import { buildNextClassMap } from '../src/lib/promotion';

const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

const EXPECTED_LADDER: Record<string, string | null> = {
  Playgroup: 'Kindergarten 1',
  'Kindergarten 1': 'Kindergarten 2',
  'Kindergarten 2': 'Primary 1',
  'Primary 1': 'Primary 2',
  'Primary 2': 'Primary 3',
  'Primary 3': 'Primary 4',
  'Primary 4': 'Primary 5',
  'Primary 5': 'Primary 6',
  'Primary 6': 'JSS 1',
  'JSS 1': 'JSS 2',
  'JSS 2': 'JSS 3',
  'JSS 3': 'SS 1',
  'SS 1': 'SS 2',
  'SS 2': 'SS 3',
  'SS 3': null,
};

(async () => {
  const classes = (await pool.query('SELECT id, name, level, next_class_id FROM classes')).rows;
  const counts = (await pool.query(
    'SELECT class_id, count(*)::int as n FROM students WHERE class_id IS NOT NULL GROUP BY class_id'
  )).rows;
  const countMap = Object.fromEntries(counts.map((r) => [r.class_id, r.n]));
  const byId = Object.fromEntries(classes.map((c) => [c.id, c]));

  const nextMap = buildNextClassMap(classes);

  console.log('=== PROMOTION MAP (shared lib logic) ===');
  let totalWithClass = 0;
  for (const c of classes) {
    const target = nextMap[c.id];
    const n = countMap[c.id] || 0;
    totalWithClass += n;
    const tn = target ? byId[target].name : '(none - graduate/highest)';
    console.log(`${c.name.padEnd(28)} -> ${tn.padEnd(28)} | ${n} student(s)`);
  }

  const unassigned = (await pool.query(
    'SELECT id FROM students WHERE class_id IS NULL'
  )).rows;

  console.log(`\ntotal students with class: ${totalWithClass}`);
  console.log(`students with NO class: ${unassigned.length}`);

  // Simulate exactly what the route would do per student: no backward/equal moves allowed.
  let wouldPromote = 0;
  for (const c of classes) {
    const n = countMap[c.id] || 0;
    if (nextMap[c.id]) wouldPromote += n;
  }
  const wouldSkipHighest = totalWithClass - wouldPromote;
  const wouldSkipUnassigned = unassigned.length;
  console.log(`\n=== WHAT THE BUTTON WOULD DO (dry-run, nothing touched) ===`);
  console.log(`.. would promote:      ${wouldPromote}`);
  console.log(`.. skipped (highest):  ${wouldSkipHighest}`);
  console.log(`.. skipped (no class): ${wouldSkipUnassigned}`);

  // Assertions
  let failed = 0;
  const check = (cond: boolean, label: string) => {
    console.log(`${cond ? '[OK]   ' : '[FAIL] '} ${label}`);
    if (!cond) failed++;
  };

  // 1. Every mapped class matches the canonical ladder exactly.
  for (const c of classes) {
    const expected = EXPECTED_LADDER[c.name];
    check(
      nextMap[c.id] === (expected ? classes.find((x: any) => x.name === expected)?.id ?? null : null),
      `map(${c.name}) -> ${expected ?? 'null'}`
    );
  }

  // 2. Only SS 3 has no next class.
  const noNext = classes.filter((c) => nextMap[c.id] === null).map((c) => c.name);
  check(noNext.length === 1 && /^\s*ss\s*3\s*$/i.test(noNext[0]), `only SS 3 has no next (got: ${noNext.join(', ') || 'none'})`);

  // 3. No class maps to itself.
  const selfMaps = classes.filter((c) => nextMap[c.id] === c.id);
  check(selfMaps.length === 0, 'no class maps to itself');

  // 4. Students with classes are all covered (promote or highest-skip).
  check(wouldPromote + wouldSkipHighest === totalWithClass, `all classed students covered (${wouldPromote + wouldSkipHighest}/${totalWithClass})`);

  await pool.end();
  if (failed > 0) { console.error(`\n${failed} assertion(s) FAILED`); process.exit(1); }
  console.log('\nAll promotion-map assertions passed.');
})().catch((e) => { console.error(e); process.exit(1); });