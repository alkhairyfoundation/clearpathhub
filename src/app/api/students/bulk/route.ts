import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

interface StudentInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  class_name?: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  blood_group?: string;
  emergency_contact?: string;
}

interface BulkResult {
  row: number;
  success: boolean;
  email?: string;
  admission_number?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createSupabaseAdminClient();

    const { students }: { students: StudentInput[] } = await request.json();
    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No students provided' },
        { status: 400 }
      );
    }

    if (students.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Maximum 200 students per batch' },
        { status: 400 }
      );
    }

    // Build class_name → class_id lookup from Supabase
    const { data: classesData, error: classesError } = await adminClient
      .from('classes')
      .select('id, name');

    if (classesError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch classes: ' + classesError.message }, { status: 500 });
    }

    const classMap = new Map(
      (classesData || []).map((c: any) => [c.name.toLowerCase().trim(), c.id])
    );

    const results: BulkResult[] = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const row = i + 1;
      const result: BulkResult = { row, success: false, email: s.email };

      try {
        if (!s.first_name || !s.last_name || !s.email || !s.password) {
          throw new Error('Missing required fields: first_name, last_name, email, password');
        }
        if (s.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        // Check if user already exists in Supabase Auth
        const { data: existingUsers } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', s.email)
          .maybeSingle();

        if (existingUsers) {
          throw new Error('User with this email already exists');
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
          user_metadata: { first_name: s.first_name, last_name: s.last_name, role: 'student' },
        });

        if (authError) throw new Error('Supabase auth error: ' + authError.message);

        const userId = authData.user.id;

        // Update profile metadata in Supabase
        await adminClient.from('profiles').update({
          first_name: s.first_name,
          last_name: s.last_name,
          role: 'student',
          phone: s.phone || null,
        }).eq('id', userId);

        // Generate admission number
        const { count } = await adminClient
          .from('students')
          .select('*', { count: 'exact', head: true });

        const admissionNumber = `STD${new Date().getFullYear()}${String((count || 0) + 1).padStart(4, '0')}`;

        // Resolve class_id from class_name
        let classId: string | null = null;
        if (s.class_name) {
          const lookup = classMap.get(s.class_name.toLowerCase().trim());
          if (!lookup) {
            throw new Error(`Class "${s.class_name}" not found. Available: ${Array.from(classMap.keys()).join(', ') || 'none'}`);
          }
          classId = lookup;
        }

        // Create student record in Supabase
        const { error: studentError } = await adminClient.from('students').insert({
          profile_id: userId,
          admission_number: admissionNumber,
          class_id: classId,
          gender: s.gender || null,
          date_of_birth: s.date_of_birth || null,
          address: s.address || null,
          guardian_name: s.guardian_name || null,
          guardian_phone: s.guardian_phone || null,
          guardian_email: s.guardian_email || null,
          blood_group: s.blood_group || null,
          emergency_contact: s.emergency_contact || null,
        });

        if (studentError) {
          throw new Error('Failed to create student record: ' + studentError.message);
        }

        // Also create in Neon for backward compatibility
        try {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(s.password, salt);

          await neonQuery(
            `INSERT INTO profiles (id, email, first_name, last_name, role, phone, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [userId, s.email, s.first_name, s.last_name, 'student', s.phone || null, passwordHash]
          );

          await neonQuery(
            `INSERT INTO students (profile_id, admission_number, class_id, gender, date_of_birth, address, guardian_name, guardian_phone, guardian_email, blood_group, emergency_contact)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (profile_id) DO NOTHING`,
            [userId, admissionNumber, classId, s.gender || null, s.date_of_birth || null,
             s.address || null, s.guardian_name || null, s.guardian_phone || null,
             s.guardian_email || null, s.blood_group || null, s.emergency_contact || null]
          );
        } catch (neonErr) {
          // Neon insert is best-effort; Supabase is the primary store
        }

        result.success = true;
        result.admission_number = admissionNumber;
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
    console.error('Error in bulk student creation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
