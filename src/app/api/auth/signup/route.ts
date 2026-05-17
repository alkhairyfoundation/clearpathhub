import { NextResponse } from 'next/server';
import { query } from '@/lib/neon';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, first_name, last_name, role, phone, class_id } = await request.json();
    
    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Restrict public signup to only student and parent roles
    if (!['student', 'parent'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role for public signup' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await query(
      'SELECT id FROM profiles WHERE email = $1',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate user ID
    const userIdResult = await query('SELECT gen_random_uuid() as id');
    const userId = userIdResult[0].id;

    // Begin transaction: Insert into profiles
    await query(
      `INSERT INTO profiles (id, email, first_name, last_name, role, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email, first_name, last_name, role, phone || null, passwordHash]
    );

    // If role is student, create student record
    if (role === 'student') {
      // Generate admission number
      const admissionPrefix = 'STD';
      const countResult = await query(
        'SELECT COUNT(*) as count FROM students'
      );
      const count = countResult[0]?.count ? parseInt(countResult[0].count) : 0;
      const admissionNumber = `${admissionPrefix}${String(count + 1).padStart(4, '0')}`;

      await query(
        `INSERT INTO students (profile_id, admission_number, class_id, parent_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, admissionNumber, class_id || null, null]
      );
    }

    // If role is parent, we don't have a separate table for parents in the schema, so just profile is enough.

    return NextResponse.json(
      { success: true, message: 'User created successfully', user: { id: userId, email, first_name, last_name, role, phone } },
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