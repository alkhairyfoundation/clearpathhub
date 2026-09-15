import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';
import {
  deleteUserInNeon,
  updateNeonPasswordHash,
  updateNeonProfile,
  replaceNeonTeacherClasses,
  upsertNeonStudentRecord,
  generateNextAdmissionNumber,
  getNeonStudentRecord,
  upsertNeonStaffRecord,
  type NewStudentData,
  type NewStaffData,
} from '@/lib/user-queries';
import { query as neonQuery } from '@/lib/neon';

async function getRole(id: string): Promise<string | null> {
  try {
    const rows = await neonQuery('SELECT role FROM profiles WHERE id = $1', [id]);
    return rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

function firstNonEmpty(value: unknown, fallback?: string | null): string | null {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    return String(value).trim();
  }
  return fallback ?? null;
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const adminClient = createSupabaseAdminClient();
    const id = params.id;

    const role = await getRole(id);

    // Primary cleanup in Neon (source of truth)
    try {
      await deleteUserInNeon(id);
    } catch (neonError: any) {
      console.error('Error deleting user in Neon (primary):', neonError);
      return NextResponse.json(
        { success: false, error: `Failed to remove user record: ${neonError.message}` },
        { status: 500 }
      );
    }

    // Secondary cleanup in Supabase
    if (role === 'teacher') {
      await Promise.allSettled([
        adminClient.from('teacher_classes').delete().eq('teacher_id', id),
        adminClient.from('homework').delete().eq('teacher_id', id),
        adminClient.from('sessions').delete().eq('teacher_id', id),
        adminClient.from('lessons').delete().eq('teacher_id', id),
        adminClient.from('teacher_tasks').delete().eq('teacher_id', id),
        adminClient.from('teacher_evaluations').delete().eq('teacher_id', id),
        adminClient.from('staff').delete().eq('profile_id', id),
      ]);
    } else if (role === 'student') {
      await Promise.allSettled([
        adminClient.from('students').delete().eq('profile_id', id),
        adminClient.from('homework_submissions').delete().eq('student_id', id),
        adminClient.from('quiz_attempts').delete().eq('student_id', id),
        adminClient.from('test_attempts').delete().eq('student_id', id),
        adminClient.from('attendance').delete().eq('student_id', id),
        adminClient.from('results').delete().eq('student_id', id),
        adminClient.from('behavioral_reports').delete().eq('student_id', id),
        adminClient.from('invoices').delete().eq('student_id', id),
        adminClient.from('transactions').delete().eq('student_id', id),
        adminClient.from('id_cards').delete().eq('student_id', id),
        adminClient.from('student_classes').delete().eq('student_id', id),
        adminClient.from('student_risk_predictions').delete().eq('student_id', id),
      ]);
    } else if (role === 'parent') {
      await Promise.allSettled([
        adminClient.from('parent_students').delete().eq('parent_id', id),
        adminClient.from('students').update({ parent_id: null }).eq('parent_id', id),
      ]);
    } else if (role === 'accountant' || role === 'admin') {
      await Promise.allSettled([
        adminClient.from('staff').delete().eq('profile_id', id),
      ]);
    }

    const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', id);
    if (profileDeleteError) console.error('Supabase profile delete error:', profileDeleteError);

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(id);
    if (authDeleteError) console.error('Supabase auth delete error:', authDeleteError);

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    const msg = error.message?.includes('SUPABASE_SERVICE_ROLE_KEY')
      ? 'Server configuration error: Service role key not set'
      : error.message;
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    const { first_name, last_name, role, phone, avatar_url, password, teacher_class_ids, class_id,
      date_of_birth, gender, address, guardian_name, guardian_phone, guardian_email, blood_group, emergency_contact, admission_number,
      staff_id, employee_id, department_id, designation, salary, date_of_employment, status } = body;

    const staffPatch =
      staff_id !== undefined || employee_id !== undefined || department_id !== undefined ||
      designation !== undefined || salary !== undefined || date_of_employment !== undefined ||
      status !== undefined;

    // ============================================================
    // PRIMARY: Apply changes to Neon first
    // ============================================================
    try {
      const profileFields: Record<string, any> = {};
      if (first_name !== undefined) profileFields.first_name = first_name;
      if (last_name !== undefined) profileFields.last_name = last_name;
      if (role !== undefined) profileFields.role = role;
      if (phone !== undefined) profileFields.phone = phone || null;
      if (avatar_url !== undefined) profileFields.avatar_url = avatar_url || null;
      await updateNeonProfile(id, profileFields);

      if (teacher_class_ids !== undefined && Array.isArray(teacher_class_ids)) {
        await replaceNeonTeacherClasses(id, teacher_class_ids.filter((c: string) => typeof c === 'string'));
      }

      if (staffPatch) {
        const mergedStaff: NewStaffData = {
          staff_id: staff_id !== undefined && String(staff_id).trim() !== '' ? String(staff_id).trim() : `STF${new Date().getFullYear()}${Date.now().toString().slice(-6)}`,
          employee_id: employee_id !== undefined && String(employee_id).trim() !== '' ? String(employee_id).trim() : `EMP${new Date().getFullYear()}${Date.now().toString().slice(-6)}`,
          department_id: department_id !== undefined ? department_id || null : null,
          designation: designation !== undefined ? designation || null : null,
          salary: salary !== undefined ? (salary != null && salary !== '' ? parseFloat(String(salary)) : null) : null,
          date_of_employment: date_of_employment !== undefined ? date_of_employment || null : null,
          status: status !== undefined ? status || 'active' : 'active',
        };
        await upsertNeonStaffRecord(id, mergedStaff);
      }

      const studentPatch =
        class_id !== undefined || date_of_birth !== undefined || gender !== undefined ||
        address !== undefined || guardian_name !== undefined || guardian_phone !== undefined ||
        guardian_email !== undefined || blood_group !== undefined || emergency_contact !== undefined ||
        admission_number !== undefined;

      // Merge incoming fields over the existing Neon student record so a partial
      // patch never wipes fields the client didn't send.
      if (studentPatch) {
        const existing = await getNeonStudentRecord(id);
        const merged: NewStudentData = {
          admission_number: firstNonEmpty(admission_number, existing?.admission_number) ?? '',
          class_id: class_id !== undefined ? (firstNonEmpty(class_id)) : (existing?.class_id ?? null),
          date_of_birth: date_of_birth !== undefined ? firstNonEmpty(date_of_birth) : (existing?.date_of_birth ?? null),
          gender: gender !== undefined ? firstNonEmpty(gender) : (existing?.gender ?? null),
          address: address !== undefined ? firstNonEmpty(address) : (existing?.address ?? null),
          guardian_name: guardian_name !== undefined ? firstNonEmpty(guardian_name) : (existing?.guardian_name ?? null),
          guardian_phone: guardian_phone !== undefined ? firstNonEmpty(guardian_phone) : (existing?.guardian_phone ?? null),
          guardian_email: guardian_email !== undefined ? firstNonEmpty(guardian_email) : (existing?.guardian_email ?? null),
          blood_group: blood_group !== undefined ? firstNonEmpty(blood_group) : (existing?.blood_group ?? null),
          emergency_contact: emergency_contact !== undefined ? firstNonEmpty(emergency_contact) : (existing?.emergency_contact ?? null),
        };
        if (!merged.admission_number) {
          merged.admission_number = await generateNextAdmissionNumber();
        }
        await upsertNeonStudentRecord(id, merged);
      }

      if (password) {
        if (password.length < 6) {
          return NextResponse.json(
            { success: false, error: 'Password must be at least 6 characters' },
            { status: 400 }
          );
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await updateNeonPasswordHash(id, passwordHash);
      }
    } catch (neonError: any) {
      console.error('Error updating user in Neon (primary):', neonError);
      return NextResponse.json(
        { success: false, error: `Failed to update user: ${neonError.message}` },
        { status: 500 }
      );
    }

    // ============================================================
    // SECONDARY: Sync to Supabase
    // ============================================================
    const adminClient = createSupabaseAdminClient();

    const updates: Record<string, any> = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (role !== undefined) updates.role = role;
    if (phone !== undefined) updates.phone = phone || null;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url || null;
    if (Object.keys(updates).length > 0) {
      const { error: profileSyncError } = await adminClient.from('profiles').update(updates).eq('id', id);
      if (profileSyncError) console.error('Supabase profile sync error:', profileSyncError);
    }

    if (password) {
      const { error: pwdSyncError } = await adminClient.auth.admin.updateUserById(id, { password });
      if (pwdSyncError) console.error('Supabase password sync error:', pwdSyncError);
    }

    if (teacher_class_ids !== undefined && Array.isArray(teacher_class_ids)) {
      try {
        const { data: existingTCs } = await adminClient
          .from('teacher_classes')
          .select('class_id')
          .eq('teacher_id', id);
        const existingIds = existingTCs?.map((tc) => tc.class_id) || [];
        const addIds = teacher_class_ids.filter((cid: string) => !existingIds.includes(cid));
        const removeIds = existingIds.filter((cid: string) => !teacher_class_ids.includes(cid));
        if (addIds.length > 0) {
          await adminClient.from('teacher_classes').insert(
            addIds.map((cid: string) => ({ teacher_id: id, class_id: cid }))
          );
        }
        if (removeIds.length > 0) {
          await adminClient.from('teacher_classes').delete().eq('teacher_id', id).in('class_id', removeIds);
        }
      } catch (tcErr) {
        console.error('Supabase teacher_classes sync error:', tcErr);
      }
    }

    const studentPatch =
      class_id !== undefined || date_of_birth !== undefined || gender !== undefined ||
      address !== undefined || guardian_name !== undefined || guardian_phone !== undefined ||
      guardian_email !== undefined || blood_group !== undefined || emergency_contact !== undefined ||
      admission_number !== undefined;

    if (studentPatch) {
      try {
        const { data: existingStudent } = await adminClient
          .from('students')
          .select('id')
          .eq('profile_id', id)
          .maybeSingle();
        const studentUpdates: Record<string, any> = {};
        if (class_id !== undefined) studentUpdates.class_id = class_id || null;
        if (date_of_birth !== undefined) studentUpdates.date_of_birth = date_of_birth || null;
        if (gender !== undefined) studentUpdates.gender = gender || null;
        if (address !== undefined) studentUpdates.address = address || null;
        if (guardian_name !== undefined) studentUpdates.guardian_name = guardian_name || null;
        if (guardian_phone !== undefined) studentUpdates.guardian_phone = guardian_phone || null;
        if (guardian_email !== undefined) studentUpdates.guardian_email = guardian_email || null;
        if (blood_group !== undefined) studentUpdates.blood_group = blood_group || null;
        if (emergency_contact !== undefined) studentUpdates.emergency_contact = emergency_contact || null;
        if (admission_number !== undefined && String(admission_number).trim() !== '') {
          studentUpdates.admission_number = String(admission_number).trim();
        }
        if (existingStudent) {
          if (Object.keys(studentUpdates).length > 0) {
            await adminClient.from('students').update(studentUpdates).eq('id', existingStudent.id);
          }
        } else {
          let sbAdmission = firstNonEmpty(admission_number);
          if (!sbAdmission) {
            const existing = await getNeonStudentRecord(id);
            sbAdmission = existing?.admission_number ?? null;
          }
          if (!sbAdmission) {
            sbAdmission = `STD${new Date().getFullYear()}${Date.now().toString().slice(-6)}`;
          }
          await adminClient.from('students').insert({
            profile_id: id,
            admission_number: sbAdmission,
            class_id: class_id !== undefined ? class_id || null : null,
            date_of_birth: date_of_birth || null,
            gender: gender || null,
            address: address || null,
            guardian_name: guardian_name || null,
            guardian_phone: guardian_phone || null,
            guardian_email: guardian_email || null,
            blood_group: blood_group || null,
            emergency_contact: emergency_contact || null,
          });
        }
      } catch (syncErr: any) {
        console.error('Supabase student sync error:', syncErr);
      }
    }

    if (staffPatch) {
      try {
        const { data: existingStaff } = await adminClient
          .from('staff')
          .select('id')
          .eq('profile_id', id)
          .maybeSingle();
        const staffUpdates: Record<string, any> = {};
        if (staff_id !== undefined && String(staff_id).trim() !== '') staffUpdates.staff_id = String(staff_id).trim();
        if (employee_id !== undefined && String(employee_id).trim() !== '') staffUpdates.employee_id = String(employee_id).trim();
        if (department_id !== undefined) staffUpdates.department_id = department_id || null;
        if (designation !== undefined) staffUpdates.designation = designation || null;
        if (salary !== undefined) staffUpdates.salary = salary != null && salary !== '' ? parseFloat(String(salary)) : null;
        if (date_of_employment !== undefined) staffUpdates.date_of_employment = date_of_employment || null;
        if (status !== undefined) staffUpdates.status = status || 'active';
        if (existingStaff) {
          if (Object.keys(staffUpdates).length > 0) {
            await adminClient.from('staff').update(staffUpdates).eq('id', existingStaff.id);
          }
        } else {
          await adminClient.from('staff').insert({
            profile_id: id,
            staff_id: staff_id && String(staff_id).trim() !== '' ? String(staff_id).trim() : `STF${new Date().getFullYear()}${Date.now().toString().slice(-6)}`,
            employee_id: employee_id && String(employee_id).trim() !== '' ? String(employee_id).trim() : `EMP${new Date().getFullYear()}${Date.now().toString().slice(-6)}`,
            department_id: department_id || null,
            designation: designation || null,
            salary: salary != null && salary !== '' ? parseFloat(String(salary)) : null,
            date_of_employment: date_of_employment || null,
            status: status || 'active',
          });
        }
      } catch (syncErr: any) {
        console.error('Supabase staff sync error:', syncErr);
      }
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}