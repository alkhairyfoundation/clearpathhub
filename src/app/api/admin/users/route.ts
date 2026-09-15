import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';
import {
  createUserInNeon,
  generateNextAdmissionNumber,
  type NewStudentData,
  type NewStaffData,
} from '@/lib/user-queries';

export async function POST(request: Request) {
  try {
    const { email, password, first_name, last_name, role, phone, class_id, teacher_class_ids,
      date_of_birth, gender, address, guardian_name, guardian_phone, guardian_email, blood_group, emergency_contact, admission_number,
      staff_id, employee_id, department_id, designation, salary, date_of_employment, status } = await request.json();

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    // 1. Create auth user in Supabase (needed for login)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
        phone,
      },
    });

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Build Neon data
    let admissionNum: string | null = null;
    let studentData: NewStudentData | null = null;

    if (role === 'student') {
      let number = admission_number && typeof admission_number === 'string' && admission_number.trim() !== ''
        ? admission_number.trim()
        : null;
      if (!number) {
        number = await generateNextAdmissionNumber();
      }
      admissionNum = number;
      const classId = class_id && class_id.trim() !== '' ? class_id : null;
      studentData = {
        admission_number: number,
        class_id: classId,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        address: address || null,
        guardian_name: guardian_name || null,
        guardian_phone: guardian_phone || null,
        guardian_email: guardian_email || null,
        blood_group: blood_group || null,
        emergency_contact: emergency_contact || null,
      };
    }

    const teacherClassIds: string[] = Array.isArray(teacher_class_ids)
      ? teacher_class_ids.filter((c: string) => typeof c === 'string')
      : [];

    // Staff records apply to teachers, accountants and admins
    let staffData: NewStaffData | null = null;
    if (role === 'teacher' || role === 'accountant' || role === 'admin') {
      staffData = {
        staff_id: staff_id && String(staff_id).trim() !== '' ? String(staff_id).trim() : '',
        employee_id: employee_id && String(employee_id).trim() !== '' ? String(employee_id).trim() : '',
        department_id: department_id || null,
        designation: designation || null,
        salary: salary != null ? parseFloat(String(salary)) : null,
        date_of_employment: date_of_employment || null,
        status: status || 'active',
      };
    }

    // 3. Write to Neon FIRST (primary data store)
    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      await createUserInNeon({
        id: userId,
        profile: {
          email,
          first_name,
          last_name,
          phone: phone || null,
          role,
          password_hash: passwordHash,
        },
        student: studentData,
        teacherClassIds,
        staffData,
      });
    } catch (neonError: any) {
      // Neon write is the source of truth — roll back the Supabase auth user
      // so no orphan account is left behind.
      await adminClient.auth.admin.deleteUser(userId).catch(() => {});
      console.error('Error creating user in Neon (primary):', neonError);
      return NextResponse.json(
        { success: false, error: `Failed to save user: ${neonError.message}` },
        { status: 500 }
      );
    }

    // 4. Sync profile + relations to Supabase (secondary mirror)
    const { error: profileSyncError } = await adminClient
      .from('profiles')
      .update({ first_name, last_name, role, phone: phone || null })
      .eq('id', userId);
    if (profileSyncError) console.error('Supabase profile sync error:', profileSyncError);

    if (teacherClassIds.length > 0) {
      const { error: tcSyncError } = await adminClient
        .from('teacher_classes')
        .insert(teacherClassIds.map((cid: string) => ({ teacher_id: userId, class_id: cid })));
      if (tcSyncError) console.error('Supabase teacher_classes sync error:', tcSyncError);
    }

    if (role === 'student' && studentData) {
      const { error: studentSyncError } = await adminClient
        .from('students')
        .insert({
          profile_id: userId,
          admission_number: studentData.admission_number,
          class_id: studentData.class_id,
          date_of_birth: studentData.date_of_birth,
          gender: studentData.gender,
          address: studentData.address,
          guardian_name: studentData.guardian_name,
          guardian_phone: studentData.guardian_phone,
          guardian_email: studentData.guardian_email,
          blood_group: studentData.blood_group,
          emergency_contact: studentData.emergency_contact,
        });
      if (studentSyncError) console.error('Supabase student sync error:', studentSyncError);
    }

    if (staffData) {
      const sp = staffData as NewStaffData;
      const { error: staffSyncError } = await adminClient
        .from('staff')
        .insert({
          profile_id: userId,
          staff_id: sp.staff_id || `STF${new Date().getFullYear()}${Date.now().toString().slice(-6)}`,
          employee_id: sp.employee_id || `EMP${new Date().getFullYear()}${Date.now().toString().slice(-6)}`,
          department_id: sp.department_id,
          designation: sp.designation,
          salary: sp.salary,
          date_of_employment: sp.date_of_employment,
          status: sp.status || 'active',
        });
      if (staffSyncError) console.error('Supabase staff sync error:', staffSyncError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        user: { id: userId, email, first_name, last_name, role, phone },
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