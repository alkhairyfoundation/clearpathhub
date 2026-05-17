import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/neon';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in again' },
        { status: 401 }
      );
    }

    // Get user's profile to check role
    const profileResult = await query(
      'SELECT role, id FROM profiles WHERE id = $1',
      [token.id]
    );

    if (profileResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profileResult[0].role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Teacher access required' },
        { status: 403 }
      );
    }

    const { email, password, first_name, last_name, class_id, phone } = await request.json();
    let admissionNumber = '';

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !class_id) {
      return NextResponse.json(
        { success: false, error: 'Email, password, first name, last name, and class are required' },
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

    // Verify the class exists and teacher has access to it
    const classResult = await query(
      'SELECT id, name FROM classes WHERE id = $1',
      [class_id]
    );

    if (classResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid class selected' },
        { status: 400 }
      );
    }

    // Check if teacher has access to this class (through subjects)
    const classAccess = await query(
      `SELECT 1 FROM subjects WHERE teacher_id = $1 AND class_id = $2 LIMIT 1`,
      [token.id, class_id]
    );

    if (classAccess.length === 0) {
      // Teacher doesn't teach any subject in this class, check if they're the form or class teacher
      const teacherClassCheck = await query(
        `SELECT 1 FROM classes WHERE id = $1 AND (form_teacher_id = $2 OR class_teacher_id = $2)`,
        [class_id, token.id]
      );

      if (teacherClassCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: 'You do not have access to this class' },
          { status: 403 }
        );
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate user ID
    const userIdResult = await query('SELECT gen_random_uuid() as id');
    const userId = userIdResult[0].id;

    // Insert into profiles
    await query(
      `INSERT INTO profiles (id, email, first_name, last_name, role, phone, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        email,
        first_name,
        last_name,
        'student',
        phone || null,
        passwordHash
      ]
    );

    // Generate admission number
    const countResult: any = await query('SELECT COUNT(*) as count FROM students');
    const studentCount = countResult.length > 0 ? parseInt(countResult[0].count || '0') : 0;
    admissionNumber = `STD${String(studentCount + 1).padStart(4, '0')}`;

    // Insert into students
    await query(
      `INSERT INTO students (
        profile_id, admission_number, class_id, parent_id
      ) VALUES (
        $1, $2, $3, $4
      )`,
      [
        userId,
        admissionNumber,
        class_id,
        null
      ]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Student created successfully',
      admission_number: admissionNumber,
      user: { id: userId, email, first_name, last_name, role: 'student', phone }
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile to check role
    const profileResult = await query(
      'SELECT role, id FROM profiles WHERE id = $1',
      [token.id]
    );

    if (profileResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const role = profileResult[0].role;
    if (role !== 'teacher' && role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const class_id = searchParams.get('class_id');
    const search = searchParams.get('search');

    // Build query for students
    let queryStr = `
      SELECT 
        s.id, 
        s.profile_id, 
        s.admission_number, 
        s.class_id, 
        s.parent_id,
        s.gender,
        s.date_of_birth,
        s.address,
        s.guardian_name,
        s.guardian_phone,
        s.guardian_email,
        s.blood_group,
        s.emergency_contact,
        s.created_at,
        p.first_name,
        p.last_name,
        p.email,
        p.phone,
        p.avatar_url,
        c.name as class_name
      FROM students s
      JOIN profiles p ON s.profile_id = p.id
      LEFT JOIN classes c ON s.class_id = c.id
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];

    // For teachers, only show students from their classes
    if (role === 'teacher') {
      if (class_id) {
        // Specific class requested
        conditions.push('s.class_id = $' + (params.length + 1));
        params.push(class_id);
      } else {
        // Show all classes taught by this teacher
        conditions.push(`
          s.class_id IN (
            SELECT class_id FROM subjects WHERE teacher_id = $1
            UNION
            SELECT form_teacher_id FROM classes WHERE form_teacher_id = $1
            UNION
            SELECT class_teacher_id FROM classes WHERE class_teacher_id = $1
          )
        `);
        params.push(token.id);
      }
    }
    // For admins, show all students (can filter by class if specified)
    else if (role === 'admin' && class_id) {
      conditions.push('s.class_id = $' + (params.length + 1));
      params.push(class_id);
    }

    // Add search functionality
    if (search) {
      conditions.push(`
        (p.first_name ILIKE $${params.length + 1} 
         OR p.last_name ILIKE $${params.length + 2} 
         OR s.admission_number ILIKE $${params.length + 3})
      `);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    queryStr += ' ORDER BY s.created_at DESC';

    const students = await query(queryStr, params);

    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}