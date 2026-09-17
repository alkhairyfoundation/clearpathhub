require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

function phaseOf(name) {
  const n = (name || '').toLowerCase();
  if (/primary|nursery|kindergarten|creche|pre-primary|basic\s*[1-6]/i.test(n)) return 0;
  if (/junior secondary|jss|ubе|upper basic/i.test(n) || /\bjss\b/.test(n)) return 1;
  if (/senior secondary|sss|\bss\b|senior basic/i.test(n) || /^ss\d/i.test(n)) return 2;
  return 3;
}

function sortKey(cls) {
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

function compareClasses(a, b) {
  const ka = sortKey(a);
  const kb = sortKey(b);
  if (ka.phase !== kb.phase) return ka.phase - kb.phase;
  if (ka.num !== kb.num) return ka.num - kb.num;
  return ka.name.localeCompare(kb.name);
}

function buildNextClassMap(classes) {
  const sorted = [...classes].sort(compareClasses);
  const idToIndex = new Map();
  sorted.forEach((c, i) => idToIndex.set(c.id, i));
  const next = {};
  sorted.forEach((c, i) => {
    if (c.next_class_id && idToIndex.has(c.next_class_id)) {
      next[c.id] = c.next_class_id;
      return;
    }
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

(async () => {
  const classes = (await pool.query('SELECT id, name, level, next_class_id FROM classes ORDER BY level, name')).rows;
  const counts = (await pool.query(
    "SELECT c.id, c.name, count(s.id)::int as students FROM classes c LEFT JOIN students s ON s.class_id = c.id GROUP BY c.id, c.name ORDER BY c.level, c.name"
  )).rows;

  console.log('=== CLASSES (with student counts) ===');
  const countMap = Object.fromEntries(counts.map(r => [r.id, r.students]));
  for (const c of classes) {
    const nxt = classes.find(x => x.id === c.next_class_id);
    console.log(`${String(c.level).padStart(3)} | ${c.name.padEnd(30)} | students=${String(countMap[c.id]).padStart(3)} | next_class_id=${(c.next_class_id || '').slice(0, 8) || 'NULL'} ${nxt ? '-> ' + nxt.name : ''}`);
  }

  console.log('\n=== SORT ORDER USED BY ALGORITHM (compareClasses) ===');
  const sorted = [...classes].sort(compareClasses);
  sorted.forEach((c, i) => console.log(`${String(i).padStart(2)}. phase=${sortKey(c).phase} num=${sortKey(c).num} | ${c.name} (level ${c.level})`));

  console.log('\n=== COMPUTED NEXT MAP (matches route logic) ===');
  const nextMap = buildNextClassMap(classes);
  for (const c of classes) {
    const t = nextMap[c.id];
    const target = t ? classes.find(x => x.id === t) : null;
    console.log(`${c.name.padEnd(30)} -> ${target ? target.name : '(none - skipped)'}`);
  }

  const students = (await pool.query(
    'SELECT s.id, s.class_id, p.first_name, p.last_name FROM students s LEFT JOIN profiles p ON p.id = s.profile_id ORDER BY s.class_id NULLS FIRST'
  )).rows;
  console.log(`\n=== STUDENTS (${students.length} total) ===`);
  const noClass = students.filter(s => !s.class_id);
  console.log(`Students with NO class_id: ${noClass.length}`);
  if (noClass.length) {
    for (const s of noClass) console.log(`  - ${s.first_name} ${s.last_name} (${s.id.slice(0, 8)})`);
  }
  const byClass = {};
  for (const s of students) {
    if (!s.class_id) continue;
    if (!byClass[s.class_id]) byClass[s.class_id] = [];
    byClass[s.class_id].push(s);
  }
  for (const c of sorted) {
    const list = byClass[c.id] || [];
    const target = nextMap[c.id];
    const targetName = target ? classes.find(x => x.id === target)?.name : '(skipped - highest)';
    console.log(`${c.name.padEnd(30)} -> ${String(targetName).padEnd(24)} | ${list.length} student(s)`);
  }
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });