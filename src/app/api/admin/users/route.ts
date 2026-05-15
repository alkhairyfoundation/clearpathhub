import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return NextResponse.json({ success: false, error: 'Unauthorized - Please log in again' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || profile?.role !== 'admin') {
      console.error('Profile error or non-admin:', profileError);
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { email, password, first_name, last_name, role, phone, class_id } = await request.json();
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role },
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
    }

    if (authData.user) {
      const { error: profileError } = await adminClient.from('profiles').insert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        role,
        phone: phone || null,
      });

      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
      }

      if (role === 'student') {
        const admissionPrefix = 'STD';
        const { count } = await adminClient
          .from('students')
          .select('*', { count: 'exact', head: true });
        const admissionNumber = `${admissionPrefix}${String((count || 0) + 1).padStart(4, '0')}`;

        const { error: studentError } = await adminClient.from('students').insert({
          profile_id: authData.user.id,
          admission_number: admissionNumber,
          class_id: class_id || null,
          parent_id: null,
        });

        if (studentError) {
          await adminClient.auth.admin.deleteUser(authData.user.id);
          return NextResponse.json({ success: false, error: studentError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'User created successfully', user: authData.user });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (role && role !== 'all') { query = query.eq('role', role); }
    if (search) { query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`); }

    const { data: users, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
