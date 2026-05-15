import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const metadata = user.user_metadata || {};
    const email = user.email;

    const adminClient = createSupabaseAdminClient();

    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Profile already exists' });
    }

    const { error: insertError } = await adminClient.from('profiles').insert({
      id: user.id,
      email,
      first_name: metadata.first_name || '',
      last_name: metadata.last_name || '',
      role: metadata.role || 'student',
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, message: 'Profile created successfully' });
  } catch (error: any) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
