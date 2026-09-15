import { NextResponse, NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';
import { query as neonQuery } from '@/lib/neon';
import { createUserInNeon, generateNextAdmissionNumber } from '@/lib/user-queries';

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

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

export async function POST(request: NextRequest) {
  let adminClient: ReturnType<typeof createSupabaseAdminClient> | null = null;

  try {
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

    // Class lookup from Neon (source of truth)
    const classRows = await neonQuery('SELECT id, name FROM classes');
    const classMap = new Map<string, string>(
      classRows.map((r: any) => [String(r.name).toLowerCase().trim(), r.id])
    );

    // Existing emails from Neon for duplicate detection
    const emailRows = await neonQuery('SELECT email FROM profiles');
    const existingEmails = new Set(
      emailRows.map((r: any) => String(r.email).toLowerCase())
    );

    adminClient = createSupabaseAdminClient();

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

        const emailKey = s.email.toLowerCase();
        if (existingEmails.has(emailKey)) {
          throw new Error('User with this email already exists');
        }

        // Secondary duplicate check against Supabase (best-effort safety net)
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', s.email)
          .maybeSingle();
        if (existingProfile) {
          existingEmails.add(emailKey);
          throw new Error('User with this email already exists');
        }

        // Resolve class_id from class_name
        let classId: string | null = null;
        if (s.class_name) {
          const lookup = classMap.get(s.class_name.toLowerCase().trim());
          if (!lookup) {
            throw new Error(
              `Class "${s.class_name}" not found. Available: ${Array.from(classMap.keys()).join(', ') || 'none'}`
            );
          }
          classId = lookup;
        }

        // 1. Create auth user in Supabase (needed for login)
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
          user_metadata: { first_name: s.first_name, last_name: s.last_name, role: 'student', phone: s.phone || null },
        });
        if (authError) throw new Error('Supabase auth error: ' + authError.message);
        const userId = authData.user.id;

        const admissionNumber = await generateNextAdmissionNumber();

        // 2. Write to Neon FIRST (primary data store)
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
              role: 'student',
              password_hash: passwordHash,
            },
            student: {
              admission_number: admissionNumber,
              class_id: classId,
              date_of_birth: str(s.date_of_birth),
              gender: str(s.gender),
              address: str(s.address),
              guardian_name: str(s.guardian_name),
              guardian_phone: str(s.guardian_phone),
              guardian_email: str(s.guardian_email),
              blood_group: str(s.blood_group),
              emergency_contact: str(s.emergency_contact),
            },
          });
        } catch (neonError: any) {
          // Neon write is the source of truth — roll back the auth user
          await adminClient.auth.admin.deleteUser(userId).catch(() => {});
          throw new Error('Failed to save student: ' + neonError.message);
        }

        // 3. Mirror to Supabase (secondary)
        const { error: pSync } = await adminClient
          .from('profiles')
          .update({ first_name: s.first_name, last_name: s.last_name, role: 'student', phone: s.phone || null })
          .eq('id', userId);
        if (pSync) console.error('Supabase profile sync error:', pSync.message);

        const { error: sSync } = await adminClient.from('students').insert({
          profile_id: userId,
          admission_number: admissionNumber,
          class_id: classId,
          gender: str(s.gender),
          date_of_birth: str(s.date_of_birth),
          address: str(s.address),
          guardian_name: str(s.guardian_name),
          guardian_phone: str(s.guardian_phone),
          guardian_email: str(s.guardian_email),
          blood_group: str(s.blood_group),
          emergency_contact: str(s.emergency_contact),
        });
        if (sSync) console.error('Supabase student sync error:', sSync.message);

        existingEmails.add(emailKey);
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
      totalSuccess: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
    });
  } catch (error: any) {
    console.error('Error in bulk student creation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}