import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ success: false, error: 'Unauthorized - Please log in again' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || profile?.role !== 'admin') {
      console.error('Profile error or non-admin:', profileError);
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { email, password, first_name, last_name, role, phone } = await request.json();
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

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
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
