import { config } from 'dotenv';
config({ path: '.env.local' });
import { randomUUID } from 'crypto';
import { createUserInNeon } from '@/lib/user-queries';
import { query } from '@/lib/neon';
import { str, normalizeGender, parseCsv, generateTemplateCsv } from './bulk-shared';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const RAN = Math.random().toString(36).slice(2, 8).toUpperCase();
const createdProfileIds: string[] = [];

function assert(cond: any, msg: string) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  console.log('  ok:', msg);
}

async function cleanup() {
  if (createdProfileIds.length === 0) return;
  await pool.query(`DELETE FROM staff WHERE profile_id = ANY($1::uuid[])`, [createdProfileIds]);
  await pool.query(`DELETE FROM students WHERE profile_id = ANY($1::uuid[])`, [createdProfileIds]);
  await pool.query(`DELETE FROM profiles WHERE id = ANY($1::uuid[])`, [createdProfileIds]);
  console.log(`\nCleaned up ${createdProfileIds.length} test profiles`);
}

async function main() {
  // 1. Template + parse round-trip (same generateTemplateCsv/parseCsv used by the UI)
  const tsv = generateTemplateCsv();
  const parsed = parseCsv(tsv);
  assert(parsed.rows.length === 1 && parsed.errors.length === 0, 'template CSV parses with 1 valid row');
  assert(
    parsed.rows[0].class_name === 'SS 1' &&
      parsed.rows[0].gender === 'male' &&
      parsed.rows[0].admission_number === '' &&
      parsed.rows[0].parent_email === '',
    'template row carries real class name + blank optional fields'
  );

  // 2. Lookups against live data (mirrors the route)
  const classRows: any[] = await query('SELECT id, name FROM classes');
  const classMap = new Map(classRows.map((r) => [String(r.name).toLowerCase().trim(), r.id]));
  assert(classMap.has('ss 1'), 'live class "SS 1" resolvable from template sample');

  const profileRows: any[] = await query('SELECT id, email, role FROM profiles');
  const profileByEmail = new Map(profileRows.map((r) => [String(r.email).toLowerCase(), r]));
  const parent = profileByEmail.get('olayustuk@gmail.com');
  assert(parent && parent.role === 'parent', 'live parent account resolvable by email');

  const admissionRows: any[] = await query('SELECT admission_number FROM students');
  const existingAdmissions = new Set(admissionRows.map((r) => String(r.admission_number).toLowerCase()));
  assert(!existingAdmissions.has('stdbulktest01'), 'custom admission number is unique');

  // 3. Fill the parsed template row like a user would, then run the route's mapping
  const filled = {
    ...parsed.rows[0],
    email: `bulktest.s.${RAN}@school.com`,
    password: 'password123',
    first_name: 'Repro',
    last_name: 'Student',
    gender: 'M',
    admission_number: 'STDBULKTEST01',
    parent_email: 'olayustuk@gmail.com',
  };

  const classId = classMap.get(filled.class_name.toLowerCase().trim())!;
  const parentId = parent!.id;
  const admissionNumber =
    (str(filled.admission_number) &&
      !existingAdmissions.has(String(filled.admission_number).toLowerCase()) &&
      String(filled.admission_number)) ||
    'STD' + RAN;

  // 4. Primary write to Neon (the source of truth) — same createUserInNeon the route calls
  const studentId = randomUUID();
  await createUserInNeon({
    id: studentId,
    profile: {
      email: filled.email,
      first_name: filled.first_name,
      last_name: filled.last_name,
      phone: filled.phone || null,
      role: 'student',
      password_hash: 'repro-hash',
    },
    student: {
      admission_number: admissionNumber,
      class_id: classId,
      parent_id: parentId,
      date_of_birth: str(filled.date_of_birth),
      gender: normalizeGender(filled.gender),
      address: str(filled.address),
      guardian_name: str(filled.guardian_name),
      guardian_phone: str(filled.guardian_phone),
      guardian_email: str(filled.guardian_email),
      blood_group: str(filled.blood_group),
      emergency_contact: str(filled.emergency_contact),
    },
  });
  createdProfileIds.push(studentId);

  // 5. Staff row (status inactive) via createUserInNeon
  const staffId = randomUUID();
  await createUserInNeon({
    id: staffId,
    profile: {
      email: `bulktest.st.${RAN}@school.com`,
      first_name: 'Repro',
      last_name: 'Staff',
      phone: '08000000002',
      role: 'teacher',
      password_hash: 'repro-hash',
    },
    staffData: {
      staff_id: 'TCHREPRO' + RAN,
      employee_id: 'EMPREPRO' + RAN,
      department_id: null,
      designation: 'Repro Teacher',
      salary: 100000,
      date_of_employment: '2026-01-15',
      status: 'inactive',
    },
  });
  createdProfileIds.push(staffId);

  // 6. Verify rows landed correctly
  const sRows: any[] = await query(
    `SELECT s.admission_number, s.class_id, s.parent_id, s.gender, s.guardian_email, s.blood_group, s.emergency_contact,
            p.email, p.first_name, p.role
     FROM students s JOIN profiles p ON p.id = s.profile_id WHERE s.profile_id = $1`,
    [studentId]
  );
  assert(sRows.length === 1, 'student row exists in Neon');
  const s = sRows[0];
  assert(s.admission_number === admissionNumber && s.gender === 'male', 'student admission + gender normalized (M -> male)');
  assert(s.class_id === classId, 'student class_id resolved');
  assert(s.parent_id === parentId, 'student parent_id linked');
  assert(s.guardian_email === 'john.sr@example.com' && s.blood_group === 'O+' && s.emergency_contact === '0801112222', 'guardian/blood/emergency saved');

  const stRows: any[] = await query(
    `SELECT s.staff_id, s.status, s.salary, s.date_of_employment::text AS doj, p.email FROM staff s JOIN profiles p ON p.id = s.profile_id WHERE s.profile_id = $1`,
    [staffId]
  );
  assert(stRows.length === 1, 'staff row exists in Neon');
  const st = stRows[0];
  assert(st.status === 'inactive', 'staff status inactive saved');
  assert(Number(st.salary) === 100000 && st.doj.startsWith('2026-01-15'), 'staff salary + DOJ saved');

  console.log('\nALL BULK IMPORT ASSERTIONS PASSED');
}

main()
  .then(cleanup)
  .catch(async (e) => {
    console.error('\n' + e.message);
    await cleanup().catch(() => {});
    process.exit(1);
  });