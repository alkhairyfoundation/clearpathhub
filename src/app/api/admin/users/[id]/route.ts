import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { query as neonQuery } from '@/lib/neon';
import bcrypt from 'bcryptjs';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const adminClient = createSupabaseAdminClient();
    const { error: authError } = await adminClient.auth.admin.deleteUser(params.id);
    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
    }

    // Delete user profile from Neon Postgres
    try {
      await neonQuery('DELETE FROM profiles WHERE id = $1', [params.id]);
    } catch (neonDeleteError) {
      console.error('Error deleting profile from Neon:', neonDeleteError);
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
    const { first_name, last_name, role, phone, password } = body;

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

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
