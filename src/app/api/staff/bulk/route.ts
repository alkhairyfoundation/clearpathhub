import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';
import bcrypt from 'bcryptjs';

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

function generateStaffId(role: string, index: number): string {
  const prefix = role === 'teacher' ? 'TCH' : role === 'accountant' ? 'ACC' : 'ADM';
  return `${prefix}${String(index + 1).padStart(4, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createSupabaseAdminClient();

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

    // Build department_name → department_id lookup
    const { data: deptData, error: deptError } = await adminClient
      .from('departments')
      .select('id, name');

    if (deptError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch departments' }, { status: 500 });
    }

    const deptMap = new Map(
      (deptData || []).map((d: any) => [d.name.toLowerCase().trim(), d.id])
    );

    const results: BulkResult[] = [];

    for (let i = 0; i < staff.length; i++) {
      const s = staff[i];
      const row = i + 1;
      const result: BulkResult = { row, success: false, email: s.email };

      try {
        // Validate
        if (!s.first_name || !s.last_name || !s.email || !s.password) {
          throw new Error('Missing required fields: first_name, last_name, email, password');
        }
        if (s.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        if (!['teacher', 'accountant', 'admin'].includes(s.role)) {
          throw new Error('Role must be teacher, accountant, or admin');
        }

        // Check if user already exists
        const { data: existingUser } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', s.email)
          .maybeSingle();

        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
          user_metadata: {
            first_name: s.first_name,
            last_name: s.last_name,
            role: s.role,
          },
        });

        if (authError) throw new Error('Auth error: ' + authError.message);

        const userId = authData.user.id;

        // Update profile in Supabase
        await adminClient.from('profiles').update({
          first_name: s.first_name,
          last_name: s.last_name,
          role: s.role,
          phone: s.phone || null,
        }).eq('id', userId);

        // Resolve department_id
        let departmentId: string | null = null;
        if (s.department_name) {
          const lookup = deptMap.get(s.department_name.toLowerCase().trim());
          if (!lookup) {
            throw new Error(`Department "${s.department_name}" not found. Available: ${Array.from(deptMap.keys()).join(', ') || 'none'}`);
          }
          departmentId = lookup;
        }

        // Generate IDs
        const staffId = s.staff_id || generateStaffId(s.role, i);
        const employeeId = s.employee_id || `EMP${String(i + 1).padStart(5, '0')}`;

        // Create staff record in Supabase
        if (s.role === 'accountant' || s.role === 'admin') {
          const { error: staffError } = await adminClient.from('staff').insert({
            profile_id: userId,
            staff_id: staffId,
            employee_id: employeeId,
            department_id: departmentId,
            designation: s.designation || s.role.charAt(0).toUpperCase() + s.role.slice(1),
            salary: s.salary || null,
            date_of_employment: s.date_of_employment || null,
            status: 'active',
          });

          if (staffError) {
            throw new Error('Failed to create staff record: ' + staffError.message);
          }
        }

        // Also create in Neon
        try {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(s.password, salt);

          await neonQuery(
            `INSERT INTO profiles (id, email, first_name, last_name, role, phone, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [userId, s.email, s.first_name, s.last_name, s.role, s.phone || null, passwordHash]
          );

          if (s.role === 'accountant' || s.role === 'admin') {
            await neonQuery(
              `INSERT INTO staff (profile_id, staff_id, employee_id, department_id, designation, salary, date_of_employment)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (profile_id) DO NOTHING`,
              [userId, staffId, employeeId, departmentId, s.designation || s.role, s.salary || null, s.date_of_employment || null]
            );
          }
        } catch (neonErr) {
          // Neon insert is best-effort
        }

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
      totalSuccess: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
    });
  } catch (error: any) {
    console.error('Error in bulk staff creation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
