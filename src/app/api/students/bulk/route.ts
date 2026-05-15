import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

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

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('id', user.id)
      .single();

    const role = profile?.role;
    if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json({ success: false, error: 'Admin or teacher access required' }, { status: 403 });
    }

    const { students }: { students: StudentInput[] } = await request.json();
    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ success: false, error: 'No students provided' }, { status: 400 });
    }

    if (students.length > 200) {
      return NextResponse.json({ success: false, error: 'Maximum 200 students per batch' }, { status: 400 });
    }

    // Build class_name → class_id lookup
    let classQuery = supabase.from('classes').select('id, name');
    if (role === 'teacher') {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('class_id')
        .eq('teacher_id', user.id);
      const teacherClassIds = Array.from(new Set(subjectData?.map(s => s.class_id).filter(Boolean) || []));
      classQuery = classQuery.in('id', teacherClassIds);
    }
    const { data: classes } = await classQuery;
    const classMap = new Map((classes || []).map(c => [c.name.toLowerCase().trim(), c.id]));

    const adminClient = createSupabaseAdminClient();
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

        // Resolve class_id from class_name
        let classId: string | null = null;
        if (s.class_name) {
          const lookup = classMap.get(s.class_name.toLowerCase().trim());
          if (!lookup) {
            throw new Error(`Class "${s.class_name}" not found`);
          }
          classId = lookup;
        }

        // Create auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
          user_metadata: { first_name: s.first_name, last_name: s.last_name, role: 'student' },
        });
        if (authError || !authData.user) {
          throw new Error(authError?.message || 'Failed to create auth user');
        }

        // Create profile
        const { error: profileError } = await adminClient.from('profiles').insert({
          id: authData.user.id,
          email: s.email,
          first_name: s.first_name,
          last_name: s.last_name,
          role: 'student',
          phone: s.phone || null,
        });
        if (profileError) {
          await adminClient.auth.admin.deleteUser(authData.user.id).catch(() => {});
          throw new Error(profileError.message);
        }

        // Generate admission number
        const { count } = await adminClient.from('students').select('*', { count: 'exact', head: true });
        const admissionNumber = `STD${String((count || 0) + 1).padStart(4, '0')}`;

        // Create student record
        const { error: studentError } = await adminClient.from('students').insert({
          profile_id: authData.user.id,
          admission_number: admissionNumber,
          class_id: classId,
          parent_id: null,
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
          await adminClient.auth.admin.deleteUser(authData.user.id).catch(() => {});
          throw new Error(studentError.message);
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
