import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';
import { query as neonQuery } from '@/lib/neon';
import { createUserInNeon } from '@/lib/user-queries';

export const dynamic = 'force-dynamic';

interface StaffInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: 'teacher' | 'accountant' | 'admin';
  staff_id?: string;
  employee_id?: string;
  department_name?: string;
  designation?: string;
  salary?: number;
  date_of_employment?: string;
  phone?: string;
}

interface BulkResult {
  row: number;
  success: boolean;
  email?: string;
  staff_id?: string;
  error?: string;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

function rolePrefix(role: string): string {
  return role === 'teacher' ? 'TCH' : role === 'accountant' ? 'ACC' : 'ADM';
}

// Generates a code that is unique within this batch AND against existing rows.
function uniqueCode(
  prefix: string,
  seed: number,
  preferred: string | undefined,
  used: Set<string>,
  existing: Set<string>
): string {
  let candidate = preferred && preferred.trim() !== '' ? preferred.trim() : '';
  if (candidate) {
    const key = candidate.toLowerCase();
    if (!used.has(key) && !existing.has(key)) {
      used.add(key);
      return candidate;
    }
  }
  let num = seed;
  if (candidate) {
    const digits = candidate.match(/\d+/g);
    if (digits) num = parseInt(digits[digits.length - 1], 10);
  }
  for (;;) {
    const code = `${prefix}${String(num).padStart(4, '0')}`;
    const key = code.toLowerCase();
    if (!used.has(key) && !existing.has(key)) {
      used.add(key);
      return code;
    }
    num++;
  }
}

export async function POST(request: NextRequest) {
  let adminClient: ReturnType<typeof createSupabaseAdminClient> | null = null;

  try {
    const { staff }: { staff: StaffInput[] } = await request.json();
    if (!staff || !Array.isArray(staff) || staff.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No staff records provided' },
        { status: 400 }
      );
    }

    if (staff.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Maximum 200 staff per batch' },
        { status: 400 }
      );
    }

    // Department + taken-ID lookups from Neon (source of truth)
    const deptRows = await neonQuery('SELECT id, name FROM departments');
    const deptMap = new Map<string, string>(
      deptRows.map((r: any) => [String(r.name).toLowerCase().trim(), r.id])
    );

    const emailRows = await neonQuery('SELECT email FROM profiles');
    const existingEmails = new Set(
      emailRows.map((r: any) => String(r.email).toLowerCase())
    );

    const existingStaffIds = new Set<string>();
    const existingEmployeeIds = new Set<string>();
    const idRows = await neonQuery('SELECT staff_id, employee_id FROM staff');
    for (const r of idRows as any[]) {
      if (r.staff_id) existingStaffIds.add(String(r.staff_id).toLowerCase());
      if (r.employee_id) existingEmployeeIds.add(String(r.employee_id).toLowerCase());
    }

    adminClient = createSupabaseAdminClient();

    const usedStaffIds = new Set<string>();
    const usedEmployeeIds = new Set<string>();
    const results: BulkResult[] = [];

    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];
      const row = i + 1;
      const result: BulkResult = { row, success: false, email: s.email };

      try {
        if (!s.first_name || !s.last_name || !s.email || !s.password) {
          throw new Error('Missing required fields: first_name, last_name, email, password');
        }
        if (s.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        if (!['teacher', 'accountant', 'admin'].includes(s.role)) {
          throw new Error('Role must be teacher, accountant, or admin');
        }

        const emailKey = s.email.toLowerCase();
        if (existingEmails.has(emailKey)) {
          throw new Error('User with this email already exists');
        }

        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', s.email)
          .maybeSingle();
        if (existingProfile) {
          existingEmails.add(emailKey);
          throw new Error('User with this email already exists');
        }

        // Resolve department_id
        let departmentId: string | null = null;
        if (s.department_name) {
          const lookup = deptMap.get(s.department_name.toLowerCase().trim());
          if (!lookup) {
            throw new Error(
              `Department "${s.department_name}" not found. Available: ${Array.from(deptMap.keys()).join(', ') || 'none'}`
            );
          }
          departmentId = lookup;
        }

        // 1. Create auth user in Supabase (needed for login)
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
          user_metadata: { first_name: s.first_name, last_name: s.last_name, role: s.role, phone: s.phone || null },
        });
        if (authError) throw new Error('Auth error: ' + authError.message);
        const userId = authData.user.id;

        // 2. Generate unique staff/employee IDs
        const staffId = uniqueCode(rolePrefix(s.role), i + 1, s.staff_id, usedStaffIds, existingStaffIds);
        const employeeId = uniqueCode('EMP', i + 1, s.employee_id, usedEmployeeIds, existingEmployeeIds);

        // 3. Write to Neon FIRST (primary data store)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(s.password, salt);
        try {
          await createUserInNeon({
            id: userId,
            profile: {
              email: s.email,
              first_name: s.first_name,
              last_name: s.last_name,
              phone: s.phone || null,
              role: s.role,
              password_hash: passwordHash,
            },
            staffData: {
              staff_id: staffId,
              employee_id: employeeId,
              department_id: departmentId,
              designation: str(s.designation) || s.role.charAt(0).toUpperCase() + s.role.slice(1),
              salary: s.salary != null ? parseFloat(String(s.salary)) : null,
              date_of_employment: str(s.date_of_employment),
              status: 'active',
            },
          });
        } catch (neonError: any) {
          // Neon write is the source of truth — roll back the auth user
          await adminClient.auth.admin.deleteUser(userId).catch(() => {});
          usedStaffIds.delete(staffId.toLowerCase());
          usedEmployeeIds.delete(employeeId.toLowerCase());
          throw new Error('Failed to save staff: ' + neonError.message);
        }

        // 4. Mirror to Supabase (secondary)
        const { error: pSync } = await adminClient
          .from('profiles')
          .update({ first_name: s.first_name, last_name: s.last_name, role: s.role, phone: s.phone || null })
          .eq('id', userId);
        if (pSync) console.error('Supabase profile sync error:', pSync.message);

        const { error: stSync } = await adminClient.from('staff').insert({
          profile_id: userId,
          staff_id: staffId,
          employee_id: employeeId,
          department_id: departmentId,
          designation: str(s.designation) || s.role.charAt(0).toUpperCase() + s.role.slice(1),
          salary: s.salary != null ? parseFloat(String(s.salary)) : null,
          date_of_employment: str(s.date_of_employment),
          status: 'active',
        });
        if (stSync) console.error('Supabase staff sync error:', stSync.message);

        existingEmails.add(emailKey);
        result.success = true;
        result.staff_id = staffId;
      } catch (err: any) {
        result.error = err.message;
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      results,
      totalSuccess: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
    });
  } catch (error: any) {
    console.error('Error in bulk staff creation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}