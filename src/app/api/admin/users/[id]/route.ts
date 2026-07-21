import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';
import bcrypt from 'bcryptjs';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const adminClient = createSupabaseAdminClient();

    // Get user role first so we know what related data to clean up
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', params.id)
      .maybeSingle();

    // Clean up role-specific dependencies before deleting
    if (profile?.role === 'teacher') {
      await adminClient.from('teacher_classes').delete().eq('teacher_id', params.id);
      await adminClient.from('homework').delete().eq('teacher_id', params.id);
      await adminClient.from('sessions').delete().eq('teacher_id', params.id);
      await adminClient.from('lessons').delete().eq('teacher_id', params.id);
    } else if (profile?.role === 'student') {
      await adminClient.from('students').delete().eq('profile_id', params.id);
      await adminClient.from('homework_submissions').delete().eq('student_id', params.id);
    } else if (profile?.role === 'parent') {
      await adminClient.from('parent_students').delete().eq('parent_id', params.id);
      // Also clear legacy student parent links
      await adminClient.from('students').update({ parent_id: null }).eq('parent_id', params.id);
    } else if (profile?.role === 'accountant') {
      await adminClient.from('staff').delete().eq('profile_id', params.id);
    }

    // Delete profile from Supabase profiles
    await adminClient.from('profiles').delete().eq('id', params.id);

    // Delete auth user
    const { error: authError } = await adminClient.auth.admin.deleteUser(params.id);
    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
    }

    // Delete user profile from Neon Postgres
    try {
      await neonQuery('DELETE FROM profiles WHERE id = $1', [params.id]);
    } catch {
      // Neon cleanup is best-effort
    }

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
    const supabase = await createSupabaseAdminClient();

    const body = await request.json();
    const { first_name, last_name, role, phone, password, teacher_class_ids,
      date_of_birth, gender, address, guardian_name, guardian_phone, guardian_email, blood_group, emergency_contact, admission_number } = body;

    const updates: Record<string, any> = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (role !== undefined) updates.role = role;
    if (phone !== undefined) updates.phone = phone || null;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', params.id);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      // Update user profile in Neon Postgres
      try {
        const setClause = Object.keys(updates)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ');
        const values = Object.values(updates);
        await neonQuery(
          `UPDATE profiles SET ${setClause} WHERE id = $1`,
          [params.id, ...values]
        );
      } catch (neonUpdateError) {
        console.error('Error updating profile in Neon:', neonUpdateError);
      }
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      const adminClient = createSupabaseAdminClient();
      const { error: authError } = await adminClient.auth.admin.updateUserById(params.id, { password });
      if (authError) {
        return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
      }

      // Update password hash in Neon Postgres
      try {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await neonQuery(
          'UPDATE profiles SET password_hash = $1 WHERE id = $2',
          [passwordHash, params.id]
        );
      } catch (neonPasswordError) {
        console.error('Error updating password hash in Neon:', neonPasswordError);
      }
    }

    // Update teacher class assignments via teacher_classes junction table
    if (teacher_class_ids !== undefined) {
      try {
        // Get current class IDs assigned to this teacher
        const { data: existingTCs } = await supabase
          .from('teacher_classes')
          .select('class_id')
          .eq('teacher_id', params.id);

        const existingIds = existingTCs?.map(tc => tc.class_id) || [];

        // Classes to add
        const addIds = teacher_class_ids.filter((id: string) => !existingIds.includes(id));
        if (addIds.length > 0) {
          await supabase.from('teacher_classes').insert(
            addIds.map((cid: string) => ({ teacher_id: params.id, class_id: cid }))
          );
        }

        // Classes to remove
        const removeIds = existingIds.filter((id: string) => !teacher_class_ids.includes(id));
        if (removeIds.length > 0) {
          await supabase.from('teacher_classes').delete()
            .eq('teacher_id', params.id)
            .in('class_id', removeIds);
        }
      } catch (tcErr) {
        console.error('Error updating teacher class assignments:', tcErr);
      }
    }

    // Update student record
    if (class_id !== undefined || date_of_birth !== undefined || gender !== undefined || address !== undefined ||
        guardian_name !== undefined || guardian_phone !== undefined || guardian_email !== undefined ||
        blood_group !== undefined || emergency_contact !== undefined || admission_number !== undefined) {
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', params.id)
        .maybeSingle();
      if (existingStudent) {
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
        if (admission_number !== undefined && admission_number !== '' && admission_number !== null) studentUpdates.admission_number = admission_number;
        const { error: updateErr } = await supabase.from('students').update(studentUpdates).eq('id', existingStudent.id);
        if (updateErr) {
          return NextResponse.json({ success: false, error: `Failed to update student record: ${updateErr.message}` }, { status: 500 });
        }
      } else {
        // Student record doesn't exist in Supabase — check Neon first
        let existingAdmission = admission_number;
        if (!existingAdmission || existingAdmission.trim() === '') {
          try {
            const neonRows = await neonQuery(
              'SELECT admission_number FROM students WHERE profile_id = $1',
              [params.id]
            );
            if (neonRows.length > 0) {
              existingAdmission = neonRows[0].admission_number;
            }
          } catch { /* ignore Neon errors */ }
        }
        // Generate one if still empty (timestamp-based to avoid collisions)
        const admissionNumber = (existingAdmission && existingAdmission.trim() !== '')
          ? existingAdmission.trim()
          : `STD${new Date().getFullYear()}${Date.now().toString().slice(-6)}`;
        const { error: insertErr } = await supabase.from('students').insert({
          profile_id: params.id,
          admission_number: admissionNumber,
          class_id: class_id || null,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          address: address || null,
          guardian_name: guardian_name || null,
          guardian_phone: guardian_phone || null,
          guardian_email: guardian_email || null,
          blood_group: blood_group || null,
          emergency_contact: emergency_contact || null,
        });
        if (insertErr) {
          return NextResponse.json({ success: false, error: `Failed to create student record: ${insertErr.message}` }, { status: 500 });
        }
        // Also sync to Neon (best-effort)
        try {
          await neonQuery(
            `INSERT INTO students (profile_id, admission_number, class_id) VALUES ($1, $2, $3)`,
            [params.id, admissionNumber, class_id || null]
          );
        } catch { /* best-effort */ }
      }
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
