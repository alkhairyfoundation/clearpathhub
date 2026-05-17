import { NextResponse, NextRequest } from 'next/server';
import { query } from '@/lib/neon';
import bcrypt from 'bcryptjs';
import { getToken } from 'next-auth/jwt';

interface StudentInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  class_name?: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  blood_group?: string;
  emergency_contact?: string;
}

interface BulkResult {
  row: number;
  success: boolean;
  email?: string;
  admission_number?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check role
    const profileResult = await query(
      'SELECT role, id FROM profiles WHERE id = $1',
      [token.id]
    );

    if (profileResult.length === 0) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    const role = profileResult[0].role;
    if (role !== 'admin' && role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Admin or teacher access required' },
        { status: 403 }
      );
    }

    const { students }: { students: StudentInput[] } = await request.json();
    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No students provided' },
        { status: 400 }
      );
    }

    if (students.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Maximum 200 students per batch' },
        { status: 400 }
      );
    }

    // Build class_name → class_id lookup (teachers can only use their assigned classes)
    let classQuery = 'SELECT id, name FROM classes';
    const classParams: any[] = [];
    
    if (role === 'teacher') {
      // Get classes taught by this teacher
      const subjectResult = await query(
        'SELECT DISTINCT class_id FROM subjects WHERE teacher_id = $1',
        [token.id]
      );
      
      if (subjectResult.length > 0) {
        const teacherClassIds = subjectResult.map((row: any) => row.class_id);
        classQuery += ' WHERE id = ANY($1)';
        classParams.push(teacherClassIds);
      } else {
        // Teacher has no subjects, so no classes
        classQuery += ' WHERE 1 = 0'; // No results
      }
    }

    const classes = await query(classQuery, classParams);
    const classMap = new Map(
      classes.map((c: any) => [c.name.toLowerCase().trim(), c.id])
    );

    const results: BulkResult[] = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const row = i + 1;
      const result: BulkResult = { row, success: false, email: s.email };

      try {
        // Validate required fields
        if (!s.first_name || !s.last_name || !s.email || !s.password) {
          throw new Error('Missing required fields: first_name, last_name, email, password');
        }
        if (s.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        // Check if user already exists
        const existingUsers = await query(
          'SELECT id FROM profiles WHERE email = $1',
          [s.email]
        );

        if (existingUsers.length > 0) {
          throw new Error('User with this email already exists');
        }

        // Resolve class_id from class_name
        let classId: string | null = null;
        if (s.class_name) {
          const lookup = classMap.get(s.class_name.toLowerCase().trim());
          if (!lookup) {
            throw new Error(`Class "${s.class_name}" not found`);
          }
          classId = String(lookup);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(s.password, salt);

        // Generate user ID
        const userIdResult = await query('SELECT gen_random_uuid() as id');
        const userId = userIdResult[0].id;

        // Insert into profiles
        await query(
          `INSERT INTO profiles (id, email, first_name, last_name, role, phone, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            s.email,
            s.first_name,
            s.last_name,
            'student',
            s.phone || null,
            passwordHash
          ]
        );

        // Generate admission number
        const countResult: any = await query('SELECT COUNT(*) as count FROM students');
        const studentCount = countResult.length > 0 ? parseInt(countResult[0].count || '0') : 0;
        const admissionNumber = `STD${String(studentCount + 1).padStart(4, '0')}`;

        // Insert into students
        await query(
          `INSERT INTO students (
            profile_id, admission_number, class_id, parent_id, gender, 
            date_of_birth, address, guardian_name, guardian_phone, 
            guardian_email, blood_group, emergency_contact
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          )`,
          [
            userId,
            admissionNumber,
            classId || null,
            null, // parent_id
            s.gender || null,
            s.date_of_birth || null,
            s.address || null,
            s.guardian_name || null,
            s.guardian_phone || null,
            s.guardian_email || null,
            s.blood_group || null,
            s.emergency_contact || null
          ]
        );

        result.success = true;
        result.admission_number = admissionNumber;
      } catch (err: any) {
        result.error = err.message;
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      results,
      totalSuccess: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length,
    });
  } catch (error: any) {
    console.error('Error in bulk student creation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}