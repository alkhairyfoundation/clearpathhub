import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized - Please log in again' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, id')
      .eq('id', user.id)
      .single();
    
    if (profileError || profile?.role !== 'teacher') {
      return NextResponse.json({ success: false, error: 'Teacher access required' }, { status: 403 });
    }

    const { email, password, first_name, last_name, class_id, phone } = await request.json();
    let admissionNumber = '';
    
    if (!email || !password || !first_name || !last_name || !class_id) {
      return NextResponse.json({ success: false, error: 'Email, password, first name, last name, and class are required' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Verify the class exists and teacher has access to it
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', class_id)
      .single();
    
    if (classError || !classData) {
      return NextResponse.json({ success: false, error: 'Invalid class selected' }, { status: 400 });
    }

    const adminClient = createSupabaseAdminClient();
    
    // Create auth user with email confirmed
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role: 'student' },
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 });
    }

    if (authData.user) {
      // Create profile
      const { error: profileError } = await adminClient.from('profiles').insert({
        id: authData.user.id,
        email,
        first_name,
        last_name,
        role: 'student',
        phone: phone || null,
      });

      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
      }

      // Create student record with class and auto-generated admission number
      const admissionPrefix = 'STD';
      const { count } = await adminClient
        .from('students')
        .select('*', { count: 'exact', head: true });
      
      admissionNumber = `${admissionPrefix}${String((count || 0) + 1).padStart(4, '0')}`;
      
      const { error: studentError } = await adminClient.from('students').insert({
        profile_id: authData.user.id,
        admission_number: admissionNumber,
        class_id: class_id,
        parent_id: null,
      });

      if (studentError) {
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ success: false, error: studentError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Student created successfully',
      admission_number: admissionNumber,
      user: authData.user 
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const class_id = searchParams.get('class_id');
    const search = searchParams.get('search');

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // For teachers, get students from their classes
    let query = supabase
      .from('students')
      .select('*, profile:profiles(first_name, last_name, email, phone), class:classes(name)')
      .order('created_at', { ascending: false });
    
    if (profile?.role === 'teacher' && class_id) {
      query = query.eq('class_id', class_id);
    }
    
    if (search) {
      query = query.or(`profile.first_name.ilike.%${search}%,profile.last_name.ilike.%${search}%,admission_number.ilike.%${search}%`);
    }

    const { data: students, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
