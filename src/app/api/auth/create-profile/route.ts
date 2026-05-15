import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { success: false, error: 'No access token provided' },
        { status: 401 }
      );
    }

    const adminClient = createSupabaseAdminClient();

    const { data: { user }, error: userError } = await adminClient.auth.getUser(access_token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid access token' },
        { status: 401 }
      );
    }

    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Profile already exists' });
    }

    const metadata = user.user_metadata || {};

    const { error: insertError } = await adminClient.from('profiles').insert({
      id: user.id,
      email: user.email,
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
