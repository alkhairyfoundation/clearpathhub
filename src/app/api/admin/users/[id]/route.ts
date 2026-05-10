import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

async function verifyAdmin() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') return supabase;
    return null;
  } catch {
    return null;
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await verifyAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const adminClient = createSupabaseAdminClient();
    const { error: authError } = await adminClient.auth.admin.deleteUser(params.id);
    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
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
    const supabase = await verifyAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

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
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
