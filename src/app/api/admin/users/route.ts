import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, first_name, last_name, role, phone, class_id, subject_ids,
      date_of_birth, gender, address, guardian_name, guardian_phone, guardian_email, blood_group, emergency_contact, admission_number } = await request.json();
    
    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
        phone,
      }
    });

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // The trigger 'on_auth_user_created' should automatically create the profile.
    // However, to be extra safe and handle student/staff specific data, we'll perform updates.

    // Update profile just in case the trigger metadata mapping missed something
    await adminClient
      .from('profiles')
      .update({ first_name, last_name, role, phone: phone || null })
      .eq('id', userId);

    // Hash password for Neon Postgres
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into Neon Postgres profiles table
    await neonQuery(
      `INSERT INTO profiles (id, email, first_name, last_name, role, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email, first_name, last_name, role, phone || null, passwordHash]
    );

    // If role is teacher, assign selected subjects
    let subjectWarning = '';
    if (role === 'teacher' && subject_ids && subject_ids.length > 0) {
      const { error: subjectError } = await adminClient
        .from('subjects')
        .update({ teacher_id: userId })
        .in('id', subject_ids);
      if (subjectError) {
        subjectWarning = `User created but subject assignments failed: ${subjectError.message}`;
      }
    }

    // If role is teacher, assign class via form_teacher_id
    if (role === 'teacher' && class_id && class_id.trim() !== '') {
      // Clear any existing form_teacher assignment for this class
      await adminClient
        .from('classes')
        .update({ form_teacher_id: null })
        .eq('form_teacher_id', userId);
      // Assign the class
      const { error: classError } = await adminClient
        .from('classes')
        .update({ form_teacher_id: userId })
        .eq('id', class_id);
      if (classError && !subjectWarning) {
        subjectWarning = `User created but class assignment failed: ${classError.message}`;
      }
    }

      // If role is student, create student record in both databases
    if (role === 'student') {
      let admissionNum: string;
      if (admission_number && admission_number.trim() !== '') {
        admissionNum = admission_number.trim();
      } else {
        const year = new Date().getFullYear();
        const { data: maxRecord } = await adminClient
          .from('students')
          .select('admission_number')
          .like('admission_number', `STD${year}%`)
          .order('admission_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextNum = 1;
        if (maxRecord?.admission_number) {
          const suffix = maxRecord.admission_number.replace(`STD${year}`, '');
          const parsed = parseInt(suffix, 10);
          if (!isNaN(parsed)) nextNum = parsed + 1;
        }
        admissionNum = `STD${year}${String(nextNum).padStart(4, '0')}`;
      }

      const classId = class_id && class_id.trim() !== '' ? class_id : null;

      const { error: studentError } = await adminClient
        .from('students')
        .insert({
          profile_id: userId,
          admission_number: admissionNum,
          class_id: classId,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          address: address || null,
          guardian_name: guardian_name || null,
          guardian_phone: guardian_phone || null,
          guardian_email: guardian_email || null,
          blood_group: blood_group || null,
          emergency_contact: emergency_contact || null,
        });

      if (studentError) {
        return NextResponse.json({ success: false, error: `Failed to create student record: ${studentError.message}` }, { status: 500 });
      }

      // Create student record in Neon Postgres (best-effort)
      try {
        await neonQuery(
          `INSERT INTO students (profile_id, admission_number, class_id)
           VALUES ($1, $2, $3)`,
          [userId, admissionNum, classId]
        );
      } catch (neonStudentError) {
        console.error('Error creating student record in Neon:', neonStudentError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: subjectWarning ? `User created with warnings: ${subjectWarning}` : 'User created successfully',
        warning: subjectWarning || undefined,
        user: { id: userId, email, first_name, last_name, role, phone }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const adminClient = createSupabaseAdminClient();
    let query = adminClient.from('profiles').select('*');

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
