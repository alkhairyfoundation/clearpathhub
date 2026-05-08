import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Please log in again' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const adminClient = createSupabaseAdminClient();

    // Delete from Supabase Auth first
    const { error: authError } = await adminClient.auth.admin.deleteUser(params.id);

    if (authError) {
      console.error('Auth delete error:', authError);
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
    }

    // Then delete from profiles table
    const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', params.id);

    if (profileDeleteError) {
      console.error('Profile delete error after auth delete:', profileDeleteError);
      // Auth user is already deleted, but we should still return success
      // since the auth user is gone
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
