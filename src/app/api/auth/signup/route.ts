import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { email, password, first_name, last_name, role, phone } = await request.json();

    // Validate role
    const validRoles = ['admin', 'teacher', 'student', 'parent', 'accountant'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
          role,
        },
      },
    });

    if (error) {
      // Check if user already exists
      if (error.message.includes('already been registered')) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      throw error;
    }

    // Note: Profile will be created automatically by the trigger we set up
    // But if trigger fails, we need to create it manually
    if (data.user) {
      // Check if profile was created by trigger
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile) {
        // Create profile manually (fallback)
        await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          first_name,
          last_name,
          role,
          phone: phone || null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      user: data.user,
    });
  } catch (error: any) {
    console.error('Error in signup:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}