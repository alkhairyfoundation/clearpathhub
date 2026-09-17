import { query } from '@/lib/neon';
import pool from '@/lib/neon';
import type { UserRole } from '@/types';

export interface UserStudentInfo {
  id: string;
  admission_number: string;
  class_id: string | null;
  class_name: string | null;
  class_level: string | null;
  parent_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  blood_group: string | null;
  emergency_contact: string | null;
}

export interface UserStaffInfo {
  id: string;
  staff_number: string;
  employee_id: string;
  department_id: string | null;
  department_name: string | null;
  designation: string | null;
  salary: number | null;
  date_of_employment: string | null;
  status: 'active' | 'inactive';
}

export interface AssignedClassInfo {
  id: string;
  name: string;
  level: string;
}

export interface LinkedChildInfo {
  student_id: string;
  student_profile_id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  class_name: string | null;
  class_level: string | null;
  relationship: string | null;
}

export interface AdminUserItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  student: UserStudentInfo | null;
  staff: UserStaffInfo | null;
  assigned_classes: AssignedClassInfo[];
  linked_children: LinkedChildInfo[];
}

export interface UserStats {
  attendance?: { present: number; absent: number; late: number; excused: number };
  avg_score?: number;
  result_count?: number;
  homework_submissions?: number;
  id_cards?: number;
  subjects_count?: number;
  homework_count?: number;
  lessons_count?: number;
  sessions_count?: number;
  staff_attendance?: { present: number; absent: number; late: number };
}

export interface AdminUserDetail extends AdminUserItem {
  stats: UserStats;
}

export interface UserListFilters {
  role?: string;
  search?: string;
  classId?: string;
  departmentId?: string;
  limit?: number;
  offset?: number;
}

export interface UserListResult {
  users: AdminUserItem[];
  total: number;
}

function normalizeDate(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? String(v) : d.toISOString();
}

function normalizeDay(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
}

async function tableExists(tablename: string): Promise<boolean> {
  try {
    const rows = await query(
      `SELECT to_regclass($1) AS reg`,
      [`public.${tablename}`]
    );
    return !!rows[0]?.reg;
  } catch {
    return false;
  }
}

function rowToUser(row: any): AdminUserItem {
  const isStudent = !!row.student_row_id;
  const isStaff = !!row.staff_row_id;
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone ?? null,
    role: row.role as UserRole,
    avatar_url: row.avatar_url ?? null,
    created_at: normalizeDate(row.created_at) ?? '',
    updated_at: normalizeDate(row.updated_at) ?? normalizeDate(row.created_at) ?? '',
    student: isStudent
      ? {
          id: row.student_row_id,
          admission_number: row.admission_number,
          class_id: row.class_id ?? null,
          class_name: row.class_name ?? null,
          class_level: row.class_level ?? null,
          parent_id: row.parent_id ?? null,
          date_of_birth: normalizeDay(row.date_of_birth),
          gender: row.gender ?? null,
          address: row.address ?? null,
          guardian_name: row.guardian_name ?? null,
          guardian_phone: row.guardian_phone ?? null,
          guardian_email: row.guardian_email ?? null,
          blood_group: row.blood_group ?? null,
          emergency_contact: row.emergency_contact ?? null,
        }
      : null,
    staff: isStaff
      ? {
          id: row.staff_row_id,
          staff_number: row.staff_number,
          employee_id: row.employee_id,
          department_id: row.department_id ?? null,
          department_name: row.department_name ?? null,
          designation: row.designation ?? null,
          salary: row.salary != null ? parseFloat(row.salary) : null,
          date_of_employment: normalizeDay(row.date_of_employment),
          status: row.staff_status as 'active' | 'inactive',
        }
      : null,
    assigned_classes: [],
    linked_children: [],
  };
}

async function fetchClsMap(teacherIds: string[]): Promise<Map<string, AssignedClassInfo[]>> {
  const map = new Map<string, AssignedClassInfo[]>();
  if (teacherIds.length === 0) return map;
  try {
    const rows = await query(
      `SELECT tc.teacher_id, c.id AS class_id, c.name, c.level
       FROM teacher_classes tc
       JOIN classes c ON c.id = tc.class_id
       WHERE tc.teacher_id = ANY($1::uuid[])
       ORDER BY c.level, c.name`,
      [teacherIds]
    );
    for (const r of rows) {
      if (!map.has(r.teacher_id)) map.set(r.teacher_id, []);
      map.get(r.teacher_id)!.push({ id: r.class_id, name: r.name, level: r.level ?? '' });
    }
  } catch {
    // teacher_classes table may not exist yet — ignore
  }
  return map;
}

async function fetchChildrenMap(parentIds: string[]): Promise<Map<string, LinkedChildInfo[]>> {
  const map = new Map<string, LinkedChildInfo[]>();
  if (parentIds.length === 0) return map;
  try {
    const rows = await query(
      `SELECT ps.parent_id, ps.relationship,
              sp.id AS student_profile_id, sp.first_name, sp.last_name,
              s.admission_number, c.name AS class_name, c.level AS class_level
       FROM parent_students ps
       LEFT JOIN students s ON s.profile_id = ps.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN profiles sp ON sp.id = ps.student_id
       WHERE ps.parent_id = ANY($1::uuid[])
       ORDER BY sp.first_name, sp.last_name`,
      [parentIds]
    );
    for (const r of rows) {
      if (!map.has(r.parent_id)) map.set(r.parent_id, []);
      map.get(r.parent_id)!.push({
        student_id: r.student_id,
        student_profile_id: r.student_profile_id,
        first_name: r.first_name ?? '',
        last_name: r.last_name ?? '',
        admission_number: r.admission_number ?? null,
        class_name: r.class_name ?? null,
        class_level: r.class_level ?? null,
        relationship: r.relationship ?? null,
      });
    }
  } catch {
    // parent_students table may not exist yet — ignore
  }
  return map;
}

const LIST_SELECT = `
  p.id, p.email, p.first_name, p.last_name, p.phone, p.role, p.avatar_url,
  p.created_at, p.updated_at,
  s.id AS student_row_id, s.admission_number, s.class_id, s.parent_id,
  s.date_of_birth, s.gender, s.address, s.guardian_name, s.guardian_phone,
  s.guardian_email, s.blood_group, s.emergency_contact,
  c.name AS class_name, c.level AS class_level,
  st.id AS staff_row_id, st.staff_id AS staff_number, st.employee_id, st.department_id,
  st.designation, st.salary, st.date_of_employment, st.status AS staff_status,
  d.name AS department_name
`;

export async function fetchUsers(
  filters: UserListFilters = {}
): Promise<UserListResult> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.role && filters.role !== 'all') {
    params.push(filters.role);
    where.push(`p.role = $${params.length}`);
  }

  if (filters.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`;
    params.push(s, s, s, s);
    const base = params.length - 3;
    where.push(
      `(p.first_name ILIKE $${base} OR p.last_name ILIKE $${base + 1}
        OR p.email ILIKE $${base + 2} OR p.phone ILIKE $${base + 3})`
    );
  }

  if (filters.classId) {
    params.push(filters.classId);
    const tcExists = await tableExists('teacher_classes');
    if (tcExists) {
      where.push(
        `(EXISTS (
           SELECT 1 FROM students s2 WHERE s2.profile_id = p.id AND s2.class_id = $${params.length}
         ) OR EXISTS (
           SELECT 1 FROM teacher_classes tc2 WHERE tc2.teacher_id = p.id AND tc2.class_id = $${params.length}
         ))`
      );
    } else {
      where.push(
        `EXISTS (SELECT 1 FROM students s2 WHERE s2.profile_id = p.id AND s2.class_id = $${params.length})`
      );
    }
  }

  if (filters.departmentId) {
    params.push(filters.departmentId);
    where.push(
      `EXISTS (SELECT 1 FROM staff st2 WHERE st2.profile_id = p.id AND st2.department_id = $${params.length})`
    );
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filters.limit ?? 1000, 1), 1000);
  const offset = Math.max(filters.offset ?? 0, 0);
  params.push(limit, offset);

  const sql = `
    SELECT ${LIST_SELECT}
    FROM profiles p
    LEFT JOIN students s ON s.profile_id = p.id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN staff st ON st.profile_id = p.id
    LEFT JOIN departments d ON d.id = st.department_id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const rows = await query(sql, params);

  const totalParams = params.slice(0, params.length - 2);
  const countSql = `
    SELECT COUNT(*)::int AS total FROM profiles p
    ${whereSql}
  `;
  const countRows = await query(countSql, totalParams);
  const total = countRows[0]?.total ?? rows.length;

  const users = rows.map(rowToUser);

  const teacherIds = users.filter((u) => u.role === 'teacher').map((u) => u.id);
  const parentIds = users.filter((u) => u.role === 'parent').map((u) => u.id);
  const [clsMap, childrenMap] = await Promise.all([
    fetchClsMap(teacherIds),
    fetchChildrenMap(parentIds),
  ]);

  for (const u of users) {
    u.assigned_classes = clsMap.get(u.id) ?? [];
    u.linked_children = childrenMap.get(u.id) ?? [];
  }

  return { users, total };
}

export async function fetchUserById(id: string): Promise<AdminUserDetail | null> {
  const rows = await query(
    `SELECT ${LIST_SELECT}
     FROM profiles p
     LEFT JOIN students s ON s.profile_id = p.id
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN staff st ON st.profile_id = p.id
     LEFT JOIN departments d ON d.id = st.department_id
     WHERE p.id = $1
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) return null;

  const user = rowToUser(rows[0]);

  if (user.role === 'teacher') {
    const clsMap = await fetchClsMap([user.id]);
    user.assigned_classes = clsMap.get(user.id) ?? [];
  } else if (user.role === 'parent') {
    const childrenMap = await fetchChildrenMap([user.id]);
    user.linked_children = childrenMap.get(user.id) ?? [];
  }

  const stats: UserStats = {};

  if (user.role === 'teacher') {
    try {
      const subj = await query(`SELECT COUNT(*)::int AS c FROM subjects WHERE teacher_id = $1`, [id]);
      const hw = await query(`SELECT COUNT(*)::int AS c FROM homework WHERE teacher_id = $1`, [id]);
      const lessons = await query(`SELECT COUNT(*)::int AS c FROM lessons WHERE teacher_id = $1`, [id]);
      const sessions = await query(`SELECT COUNT(*)::int AS c FROM sessions WHERE teacher_id = $1`, [id]);
      stats.subjects_count = subj[0]?.c ?? 0;
      stats.homework_count = hw[0]?.c ?? 0;
      stats.lessons_count = lessons[0]?.c ?? 0;
      stats.sessions_count = sessions[0]?.c ?? 0;
    } catch {
      // some learning tables may not exist — ignore
    }
    try {
      const sa = await query(
        `SELECT status, COUNT(*)::int AS c FROM staff_attendance WHERE staff_id = $1 GROUP BY status`,
        [id]
      );
      const att = { present: 0, absent: 0, late: 0 };
      for (const r of sa) {
        if (r.status === 'present') att.present = r.c;
        else if (r.status === 'absent') att.absent = r.c;
        else if (r.status === 'late') att.late = r.c;
      }
      stats.staff_attendance = att;
    } catch {
      // ignore
    }
  }

  if (user.role === 'student' && user.student) {
    try {
      const attRows = await query(
        `SELECT status, COUNT(*)::int AS c FROM attendance WHERE student_id = $1 GROUP BY status`,
        [id]
      );
      const att = { present: 0, absent: 0, late: 0, excused: 0 };
      for (const r of attRows) {
        if (r.status === 'present') att.present = r.c;
        else if (r.status === 'absent') att.absent = r.c;
        else if (r.status === 'late') att.late = r.c;
        else if (r.status === 'excused') att.excused = r.c;
      }
      stats.attendance = att;
    } catch {
      // ignore
    }
    try {
      const res = await query(
        `SELECT COALESCE(AVG(score), 0)::float AS avg, COUNT(*)::int AS c FROM results WHERE student_id = $1`,
        [id]
      );
      stats.avg_score = res[0]?.avg ?? 0;
      stats.result_count = res[0]?.c ?? 0;
    } catch {
      // ignore
    }
    try {
      const hw = await query(
        `SELECT COUNT(*)::int AS c FROM homework_submissions WHERE student_id = $1`,
        [id]
      );
      stats.homework_submissions = hw[0]?.c ?? 0;
    } catch {
      // ignore
    }
  }

  return { ...user, stats };
}

export async function getAllClasses(): Promise<{ id: string; name: string; level: string }[]> {
  const rows = await query(
    `SELECT id, name, level FROM classes ORDER BY level, name`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, level: r.level ?? '' }));
}

export async function getAllDepartments(): Promise<{ id: string; name: string; code: string }[]> {
  const rows = await query(
    `SELECT id, name, code FROM departments ORDER BY name`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, code: r.code ?? '' }));
}

export async function getAllSubjects(): Promise<{ id: string; name: string; code: string }[]> {
  const rows = await query(
    `SELECT id, name, code FROM subjects ORDER BY name`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, code: r.code ?? '' }));
}

export interface NewStudentData {
  admission_number: string;
  class_id?: string | null;
  parent_id?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  blood_group?: string | null;
  emergency_contact?: string | null;
}

export interface NewProfileData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: UserRole;
  password_hash: string;
  avatar_url?: string | null;
}

export async function generateNextAdmissionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await query(
    `SELECT admission_number FROM students
     WHERE admission_number LIKE $1
     ORDER BY admission_number DESC
     LIMIT 1`,
    [`STD${year}%`]
  );
  let nextNum = 1;
  if (rows[0]?.admission_number) {
    const suffix = String(rows[0].admission_number).replace(`STD${year}`, '');
    const parsed = parseInt(suffix, 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }
  return `STD${year}${String(nextNum).padStart(4, '0')}`;
}

export interface CreateUserInput {
  id: string;
  profile: NewProfileData;
  student?: NewStudentData | null;
  teacherClassIds?: string[];
  staffData?: {
    staff_id: string;
    employee_id: string;
    department_id?: string | null;
    designation?: string | null;
    salary?: number | null;
    date_of_employment?: string | null;
    status?: 'active' | 'inactive';
  } | null;
}

export async function createUserInNeon(input: CreateUserInput): Promise<void> {
  const { id, profile, student, teacherClassIds = [], staffData } = input;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO profiles (id, email, first_name, last_name, phone, role, avatar_url, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        profile.email,
        profile.first_name,
        profile.last_name,
        profile.phone ?? null,
        profile.role,
        profile.avatar_url ?? null,
        profile.password_hash,
      ]
    );

    if (student) {
      await client.query(
        `INSERT INTO students (profile_id, admission_number, class_id, parent_id, date_of_birth, gender, address,
          guardian_name, guardian_phone, guardian_email, blood_group, emergency_contact)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          student.admission_number,
          student.class_id ?? null,
          student.parent_id ?? null,
          student.date_of_birth ?? null,
          student.gender ?? null,
          student.address ?? null,
          student.guardian_name ?? null,
          student.guardian_phone ?? null,
          student.guardian_email ?? null,
          student.blood_group ?? null,
          student.emergency_contact ?? null,
        ]
      );
    }

    if (staffData) {
      await client.query(
        `INSERT INTO staff (profile_id, staff_id, employee_id, department_id, designation, salary,
          date_of_employment, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          staffData.staff_id,
          staffData.employee_id,
          staffData.department_id ?? null,
          staffData.designation ?? null,
          staffData.salary ?? null,
          staffData.date_of_employment ?? null,
          staffData.status ?? 'active',
        ]
      );
    }

    if (teacherClassIds.length > 0) {
      const valuesSql = teacherClassIds
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');
      await client.query(
        `INSERT INTO teacher_classes (teacher_id, class_id) VALUES ${valuesSql}
         ON CONFLICT (teacher_id, class_id) DO NOTHING`,
        [id, ...teacherClassIds]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface UpdateProfileFields {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  role?: UserRole;
}

export async function updateNeonProfile(id: string, fields: UpdateProfileFields): Promise<void> {
  if (Object.keys(fields).length === 0) return;
  const keys = Object.keys(fields) as (keyof UpdateProfileFields)[];
  const updates: string[] = [];
  const values: unknown[] = [id];
  keys.forEach((key) => {
    values.push(fields[key] ?? null);
    updates.push(`${key} = $${values.length}`);
  });
  values.push(new Date().toISOString());
  updates.push(`updated_at = $${values.length}`);
  await query(`UPDATE profiles SET ${updates.join(', ')} WHERE id = $1`, values);
}

export async function updateNeonPasswordHash(id: string, password_hash: string): Promise<void> {
  await query(
    `UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [password_hash, id]
  );
}

export async function upsertNeonStudentRecord(profileId: string, input: NewStudentData): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id FROM students WHERE profile_id = $1 LIMIT 1`,
      [profileId]
    );
    const values = [
      profileId,
      input.admission_number,
      input.class_id ?? null,
      input.date_of_birth ?? null,
      input.gender ?? null,
      input.address ?? null,
      input.guardian_name ?? null,
      input.guardian_phone ?? null,
      input.guardian_email ?? null,
      input.blood_group ?? null,
      input.emergency_contact ?? null,
    ];
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE students SET
           admission_number = $2,
           class_id = $3,
           date_of_birth = $4,
           gender = $5,
           address = $6,
           guardian_name = $7,
           guardian_phone = $8,
           guardian_email = $9,
           blood_group = $10,
           emergency_contact = $11
         WHERE profile_id = $1`,
        values
      );
    } else {
      await client.query(
        `INSERT INTO students (profile_id, admission_number, class_id, date_of_birth, gender, address,
          guardian_name, guardian_phone, guardian_email, blood_group, emergency_contact)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        values
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getNeonStudentRecord(profileId: string): Promise<NewStudentData | null> {
  try {
    const rows = await query(
      `SELECT admission_number, class_id, date_of_birth, gender, address, guardian_name,
        guardian_phone, guardian_email, blood_group, emergency_contact
       FROM students WHERE profile_id = $1 LIMIT 1`,
      [profileId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      admission_number: r.admission_number,
      class_id: r.class_id ?? null,
      date_of_birth: r.date_of_birth ? normalizeDay(r.date_of_birth) : null,
      gender: r.gender ?? null,
      address: r.address ?? null,
      guardian_name: r.guardian_name ?? null,
      guardian_phone: r.guardian_phone ?? null,
      guardian_email: r.guardian_email ?? null,
      blood_group: r.blood_group ?? null,
      emergency_contact: r.emergency_contact ?? null,
    };
  } catch {
    return null;
  }
}

export async function replaceNeonTeacherClasses(
  teacherId: string,
  classIds: string[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM teacher_classes WHERE teacher_id = $1`, [teacherId]);
    if (classIds.length > 0) {
      const valuesSql = classIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO teacher_classes (teacher_id, class_id) VALUES ${valuesSql}
         ON CONFLICT (teacher_id, class_id) DO NOTHING`,
        [teacherId, ...classIds]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export interface NewStaffData {
  staff_id: string;
  employee_id: string;
  department_id?: string | null;
  designation?: string | null;
  salary?: number | null;
  date_of_employment?: string | null;
  status?: 'active' | 'inactive';
}

export async function upsertNeonStaffRecord(
  profileId: string,
  input: NewStaffData
): Promise<void> {
  const finalStaffId = input.staff_id?.trim() ||
    `STF${new Date().getFullYear()}${Date.now().toString().slice(-6)}`;
  const finalEmployeeId = input.employee_id?.trim() ||
    `EMP${new Date().getFullYear()}${Date.now().toString().slice(-6)}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id FROM staff WHERE profile_id = $1 LIMIT 1`,
      [profileId]
    );
    const values = [
      profileId,
      finalStaffId,
      finalEmployeeId,
      input.department_id ?? null,
      input.designation ?? null,
      input.salary ?? null,
      input.date_of_employment ?? null,
      input.status ?? 'active',
    ];
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE staff SET
           staff_id = $2,
           employee_id = $3,
           department_id = $4,
           designation = $5,
           salary = $6,
           date_of_employment = $7,
           status = $8
         WHERE profile_id = $1`,
        values
      );
    } else {
      await client.query(
        `INSERT INTO staff (profile_id, staff_id, employee_id, department_id, designation, salary,
          date_of_employment, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        values
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Columns that reference a profile id and are safe to NULL out (they may not
// exist yet / may be on tables that are absent in some environments, so each
// statement is executed inside its own savepoint and failures are skipped).
const NULL_REF_PAIRS: Array<[string, string]> = [
  ['subjects', 'teacher_id'],
  ['classes', 'form_teacher_id'],
  ['classes', 'class_teacher_id'],
  ['departments', 'head_id'],
  ['scheme_of_work', 'created_by'],
  ['teacher_tasks', 'teacher_id'],
  ['teacher_tasks', 'created_by'],
  ['teacher_evaluations', 'teacher_id'],
  ['teacher_evaluations', 'evaluated_by'],
  ['student_risk_predictions', 'acknowledged_by'],
  ['student_risk_predictions', 'student_id'],
  ['receipts', 'uploaded_by'],
  ['announcements', 'created_by'],
  ['results', 'entered_by'],
  ['results', 'student_id'],
  ['transactions', 'recorded_by'],
  ['attendance', 'marked_by'],
  ['attendance', 'student_id'],
  ['staff_attendance', 'marked_by'],
  ['staff_attendance', 'staff_id'],
  ['behavioral_reports', 'student_id'],
  ['homework_submissions', 'student_id'],
  ['quiz_attempts', 'student_id'],
  ['test_attempts', 'student_id'],
  ['invoices', 'student_id'],
  ['id_cards', 'student_id'],
  ['student_classes', 'student_id'],
  ['student_term_goals', 'approved_by'],
  ['student_skill_rubrics', 'updated_by'],
  ['islamic_tracking', 'verified_by'],
  ['class_term_frameworks', 'created_by'],
  ['messages', 'sender_id'],
  ['messages', 'recipient_id'],
  ['user_notifications', 'sender_id'],
  ['mock_exams', 'created_by'],
  ['tests', 'created_by'],
  ['question_bank', 'created_by'],
  ['portfolio_evidence', 'created_by'],
  ['exam_activity_logs', 'student_id'],
  ['mock_analytics', 'student_id'],
  ['mock_attempts', 'student_id'],
];

// Returns a list of [table, column] pairs that most commonly need their rows
// hard-deleted per role before the profile row can be removed.
function childDeletesForRole(role?: string): Array<[string, string]> {
  if (role === 'teacher') {
    return [
      ['teacher_classes', 'teacher_id'],
      ['homework', 'teacher_id'],
      ['sessions', 'teacher_id'],
      ['lessons', 'teacher_id'],
      ['teacher_tasks', 'teacher_id'],
      ['teacher_evaluations', 'teacher_id'],
      ['staff', 'profile_id'],
    ];
  }
  if (role === 'student') {
    return [
      ['mastery_tracking', 'student_id'],
      ['mastery_scores', 'student_id'],
      ['mastery_practice_logs', 'student_id'],
      ['mastery_learning_path', 'student_id'],
      ['practice_sessions', 'student_id'],
      ['review_schedule', 'student_id'],
      ['retention_checks', 'student_id'],
      ['learning_streaks', 'student_id'],
      ['daily_goals', 'student_id'],
      ['goal_hierarchy', 'student_id'],
      ['daily_accountability', 'student_id'],
      ['skills_tracking', 'student_id'],
      ['student_levels', 'student_id'],
      ['promotion_readiness', 'student_id'],
      ['performance_colors', 'student_id'],
      ['spaced_repetition_schedule', 'student_id'],
      ['student_skill_rubrics', 'student_id'],
      ['student_term_goals', 'student_id'],
      ['xp_transactions', 'student_id'],
      ['ai_coach_interactions', 'student_id'],
      ['ccr_responses', 'student_id'],
      ['portfolio_evidence', 'student_id'],
      ['notification_preferences', 'profile_id'],
      ['parent_students', 'student_id'],
      ['students', 'profile_id'],
    ];
  }
  if (role === 'parent') {
    return [['parent_students', 'parent_id']];
  }
  if (role === 'accountant' || role === 'admin') {
    return [['staff', 'profile_id']];
  }
  return [];
}

export async function deleteUserInNeon(id: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Runs a statement inside its own savepoint so a missing table/column (or
    // any other non-fatal error) only rolls back that one statement instead of
    // aborting the whole transaction with "current transaction is aborted".
    let savepointSeq = 0;
    const runIsolated = async (sql: string, params: unknown[] = []) => {
      savepointSeq++;
      const sp = `sp_${savepointSeq}`;
      await client.query(`SAVEPOINT ${sp}`);
      try {
        await client.query(sql, params);
        await client.query(`RELEASE SAVEPOINT ${sp}`);
      } catch {
        try {
          await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
        } catch {
          // ignore
        }
      }
    };

    for (const [table, column] of NULL_REF_PAIRS) {
      await runIsolated(`UPDATE ${table} SET ${column} = NULL WHERE ${column} = $1`, [id]);
    }

    const roleRows = await client.query(
      `SELECT role FROM profiles WHERE id = $1 LIMIT 1`,
      [id]
    );
    const role = roleRows.rows[0]?.role as string | undefined;

    for (const [table, column] of childDeletesForRole(role)) {
      await runIsolated(`DELETE FROM ${table} WHERE ${column} = $1`, [id]);
    }

    if (role === 'parent') {
      await runIsolated(`UPDATE students SET parent_id = NULL WHERE parent_id = $1`, [id]);
    }

    await client.query(`DELETE FROM profiles WHERE id = $1`, [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}