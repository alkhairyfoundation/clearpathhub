require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const neon = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

(async () => {
  console.log('=== NEON ===');
  const classes = await neon.query(`SELECT id, name, level FROM classes ORDER BY level, name`);
  console.log(`classes: ${classes.rowCount}`);
  for (const c of classes.rows) console.log(`  ${c.name} (${c.id.slice(0, 8)})`);

  const tc = await neon.query(
    `SELECT tc.id, tc.teacher_id, tc.class_id, c.name AS class_name
     FROM teacher_classes tc LEFT JOIN classes c ON c.id = tc.class_id
     ORDER BY tc.teacher_id`
  );
  console.log(`teacher_classes total: ${tc.rowCount}`);
  for (const r of tc.rows) console.log(`  tc=${r.id.slice(0, 8)} teacher=${r.teacher_id.slice(0, 8)} class=${r.class_id.slice(0, 8)} name=${r.class_name || 'MISSING!'}`);

  const orphan = await neon.query(
    `SELECT COUNT(*)::int AS n FROM teacher_classes tc LEFT JOIN classes c ON c.id = tc.class_id WHERE c.id IS NULL`
  );
  console.log('orphan teacher_classes in NEON:', orphan.rows[0].n);

  const studentsOrphan = await neon.query(
    `SELECT COUNT(*)::int AS n FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE c.id IS NULL`
  );
  console.log('orphan students.class_id in NEON:', studentsOrphan.rows[0].n);

  await neon.end();
})();