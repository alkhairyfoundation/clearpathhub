import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { query as neonQuery } from '@/lib/neon';

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
      try {
        await neonQuery(
          `INSERT INTO profiles (id, email, first_name, last_name, role, phone) VALUES ($1, $2, $3, $4, $5, $6)`,
          [data.user.id, email, firstName, lastName, role, phone || null]
        );
      } catch (profileError: any) {
        if (!profileError?.message?.includes('duplicate')) {
          throw profileError;
        }
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
    await neonQuery(
      `UPDATE profiles SET role = $1, updated_at = $2 WHERE id = $3`,
      [role, new Date().toISOString(), userId]
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get all users (admin only)
export async function getAllUsers(role?: string) {
  try {
    let data;
    if (role) {
      data = await neonQuery(
        `SELECT * FROM profiles WHERE role = $1 ORDER BY created_at DESC`,
        [role]
      );
    } else {
      data = await neonQuery(
        `SELECT * FROM profiles ORDER BY created_at DESC`
      );
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Generate UUID for manual user creation
export function generateUserId(): string {
  return crypto.randomUUID();
}