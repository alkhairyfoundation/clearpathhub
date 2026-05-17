import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase-server';

async function verifyAdmin() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'admin') return true;
    return false;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { email, password, first_name, last_name, role, phone, class_id } = await request.json();
    
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

    // If role is student, create student record
    if (role === 'student') {
      const admissionPrefix = 'STD';
      const { count } = await adminClient
        .from('students')
        .select('*', { count: 'exact', head: true });

      const admissionNumber = `${admissionPrefix}${new Date().getFullYear()}${String((count || 0) + 1).padStart(4, '0')}`;

      const { error: studentError } = await adminClient
        .from('students')
        .insert({
          profile_id: userId,
          admission_number: admissionNumber,
          class_id: class_id || null,
        });

      if (studentError) {
        console.error('Error creating student record:', studentError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
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
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const supabase = await createSupabaseServerClient();
    let query = supabase.from('profiles').select('*');

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
