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
      await adminClient.from('subjects').delete().eq('teacher_id', params.id);
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
    const { first_name, last_name, role, phone, password, subject_ids, class_id } = body;

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

    // Update teacher subject assignments
    if (subject_ids !== undefined) {
      try {
        // Get current subject IDs assigned to this teacher
        const { data: existingSubjects } = await supabase
          .from('subjects')
          .select('id')
          .eq('teacher_id', params.id);

        const existingIds = existingSubjects?.map(s => s.id) || [];

        // Subjects to add (in subject_ids but not currently assigned)
        const addIds = subject_ids.filter((id: string) => !existingIds.includes(id));
        if (addIds.length > 0) {
          await supabase.from('subjects').update({ teacher_id: params.id }).in('id', addIds);
        }

        // Subjects to remove (currently assigned but not in subject_ids)
        const removeIds = existingIds.filter((id: string) => !subject_ids.includes(id));
        if (removeIds.length > 0) {
          await supabase.from('subjects').update({ teacher_id: null }).in('id', removeIds);
        }
      } catch (subjectErr) {
        console.error('Error updating teacher subjects:', subjectErr);
      }
    }

    // Update student class_id
    if (class_id !== undefined) {
      const { data: studentRecord } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', params.id)
        .maybeSingle();
      if (studentRecord) {
        await supabase.from('students').update({ class_id: class_id || null }).eq('id', studentRecord.id);
      }
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
