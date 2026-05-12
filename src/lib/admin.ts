import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// DEPRECATED: This library is no longer used by API routes.
// Admin operations now use inline logic in src/app/api/admin/users/route.ts.
// Keep for reference but prefer the API route pattern for new code.

// Admin client for privileged operations
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Create a new user with admin privileges
export async function createUserAdmin(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'accountant',
  phone?: string
) {
  try {
    // Use admin API to create user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role,
      },
    });

    if (error) throw error;

    // Create profile
    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
          phone: phone || null,
        });

      if (profileError && !profileError.message.includes('duplicate')) {
        throw profileError;
      }
    }

    return { success: true, user: data.user };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

// Delete a user
export async function deleteUserAdmin(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update user role
export async function updateUserRole(
  userId: string,
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'accountant'
) {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get all users (admin only)
export async function getAllUsers(role?: string) {
  try {
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Generate UUID for manual user creation
export function generateUserId(): string {
  return crypto.randomUUID();
}