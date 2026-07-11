export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          role: 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          role: 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          role?: 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          profile_id: string;
          admission_number: string;
          class_id: string | null;
          parent_id: string | null;
          date_of_birth: string | null;
          gender: 'male' | 'female' | 'other' | null;
          address: string | null;
          guardian_name: string | null;
          guardian_phone: string | null;
          guardian_email: string | null;
          blood_group: string | null;
          emergency_contact: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          admission_number: string;
          class_id?: string | null;
          parent_id?: string | null;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          address?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          guardian_email?: string | null;
          blood_group?: string | null;
          emergency_contact?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          admission_number?: string;
          class_id?: string | null;
          parent_id?: string | null;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          address?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          guardian_email?: string | null;
          blood_group?: string | null;
          emergency_contact?: string | null;
          created_at?: string;
        };
      };
      school_settings: {
        Row: {
          id: string;
          school_name: string;
          school_motto: string | null;
          school_address: string | null;
          school_phone: string | null;
          school_email: string | null;
          school_logo: string | null;
          primary_color: string;
          secondary_color: string;
          accent_color: string;
          academic_year: string | null;
          term: string;
          session_start: string | null;
          session_end: string | null;
          current_session_id: string | null;
          current_term_id: string | null;
        };
        Insert: {
          id?: string;
          school_name?: string;
          school_motto?: string | null;
          school_address?: string | null;
          school_phone?: string | null;
          school_email?: string | null;
          school_logo?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          academic_year?: string | null;
          term?: string;
          session_start?: string | null;
          session_end?: string | null;
          current_session_id?: string | null;
          current_term_id?: string | null;
        };
        Update: {
          id?: string;
          school_name?: string;
          school_motto?: string | null;
          school_address?: string | null;
          school_phone?: string | null;
          school_email?: string | null;
          school_logo?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          academic_year?: string | null;
          term?: string;
          session_start?: string | null;
          session_end?: string | null;
          current_session_id?: string | null;
          current_term_id?: string | null;
        };
      };
      academic_sessions: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          created_at?: string;
        };
      };
      terms: {
        Row: {
          id: string;
          session_id: string | null;
          name: string;
          start_date: string;
          end_date: string;
          current_week: number;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          name: string;
          start_date: string;
          end_date: string;
          current_week?: number;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          name?: string;
          start_date?: string;
          end_date?: string;
          current_week?: number;
          is_current?: boolean;
          created_at?: string;
        };
      };
      term_weeks: {
        Row: {
          id: string;
          term_id: string;
          week_number: number;
          start_date: string;
          end_date: string;
          label: string | null;
        };
        Insert: {
          id?: string;
          term_id: string;
          week_number: number;
          start_date: string;
          end_date: string;
          label?: string | null;
        };
        Update: {
          id?: string;
          term_id?: string;
          week_number?: number;
          start_date?: string;
          end_date?: string;
          label?: string | null;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          code: string;
          head_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          head_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          head_id?: string | null;
          created_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          code: string;
          department_id: string | null;
          teacher_id: string | null;
          class_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          department_id?: string | null;
          teacher_id?: string | null;
          class_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          department_id?: string | null;
          teacher_id?: string | null;
          class_id?: string | null;
          created_at?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          name: string;
          level: string;
          department_id: string | null;
          form_teacher_id: string | null;
          class_teacher_id: string | null;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          level: string;
          department_id?: string | null;
          form_teacher_id?: string | null;
          class_teacher_id?: string | null;
          capacity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          level?: string;
          department_id?: string | null;
          form_teacher_id?: string | null;
          class_teacher_id?: string | null;
          capacity?: number;
          created_at?: string;
        };
      };
      student_classes: {
        Row: {
          id: string;
          student_id: string;
          class_id: string;
          academic_year: string;
          allocated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          academic_year: string;
          allocated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_id?: string;
          academic_year?: string;
          allocated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          profile_id: string;
          staff_id: string;
          employee_id: string;
          department_id: string | null;
          designation: string | null;
          salary: number | null;
          date_of_employment: string | null;
          status: 'active' | 'inactive';
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          staff_id: string;
          employee_id: string;
          department_id?: string | null;
          designation?: string | null;
          salary?: number | null;
          date_of_employment?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          staff_id?: string;
          employee_id?: string;
          department_id?: string | null;
          designation?: string | null;
          salary?: number | null;
          date_of_employment?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          subject_id: string | null;
          class_id: string | null;
          teacher_id: string | null;
          title: string;
          description: string | null;
          video_url: string | null;
          video_type: 'youtube' | 'upload';
          duration: number | null;
          is_published: boolean;
          term_id: string | null;
          week_no: number | null;
          topic: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id?: string | null;
          class_id?: string | null;
          teacher_id?: string | null;
          title: string;
          description?: string | null;
          video_url?: string | null;
          video_type?: 'youtube' | 'upload';
          duration?: number | null;
          is_published?: boolean;
          term_id?: string | null;
          week_no?: number | null;
          topic?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string | null;
          class_id?: string | null;
          teacher_id?: string | null;
          title?: string;
          description?: string | null;
          video_url?: string | null;
          video_type?: 'youtube' | 'upload';
          duration?: number | null;
          is_published?: boolean;
          term_id?: string | null;
          week_no?: number | null;
          topic?: string | null;
          created_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          session_id: string | null;
          subject_id: string | null;
          class_id: string | null;
          teacher_id: string | null;
          title: string;
          content: string | null;
          attachments: string[] | null;
          is_published: boolean;
          term_id: string | null;
          week_no: number | null;
          topic: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          subject_id?: string | null;
          class_id?: string | null;
          teacher_id?: string | null;
          title: string;
          content?: string | null;
          attachments?: string[] | null;
          is_published?: boolean;
          term_id?: string | null;
          week_no?: number | null;
          topic?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          subject_id?: string | null;
          class_id?: string | null;
          teacher_id?: string | null;
          title?: string;
          content?: string | null;
          attachments?: string[] | null;
          is_published?: boolean;
          term_id?: string | null;
          week_no?: number | null;
          topic?: string | null;
          created_at?: string;
        };
      };
      quizzes: {
        Row: {
          id: string;
          session_id: string | null;
          title: string;
          description: string | null;
          passing_score: number;
          time_limit: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          title: string;
          description?: string | null;
          passing_score?: number;
          time_limit?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          title?: string;
          description?: string | null;
          passing_score?: number;
          time_limit?: number | null;
          created_at?: string;
        };
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          question: string;
          question_image: string | null;
          option_images: string[] | null;
          options: string[];
          correct_answer: number;
          points: number;
          question_type: string | null;
          order_index: number | null;
          timestamp_seconds: number | null;
          is_checkpoint: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          question: string;
          question_image?: string | null;
          option_images?: string[] | null;
          options: string[];
          correct_answer: number;
          points?: number;
          question_type?: string | null;
          order_index?: number | null;
          timestamp_seconds?: number | null;
          is_checkpoint?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          question?: string;
          question_image?: string | null;
          option_images?: string[] | null;
          options?: string[];
          correct_answer?: number;
          points?: number;
          question_type?: string | null;
          order_index?: number | null;
          timestamp_seconds?: number | null;
          is_checkpoint?: boolean | null;
          created_at?: string;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          student_id: string;
          score: number;
          passed: boolean;
          answers: Json | null;
          started_at: string;
          completed_at: string | null;
          time_taken: number | null;
          ip_address: string | null;
          user_agent: string | null;
          device_info: string | null;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          student_id: string;
          score: number;
          passed: boolean;
          answers?: Json | null;
          started_at?: string;
          completed_at?: string | null;
          time_taken?: number | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: string | null;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          student_id?: string;
          score?: number;
          passed?: boolean;
          answers?: Json | null;
          started_at?: string;
          completed_at?: string | null;
          time_taken?: number | null;
          ip_address?: string | null;
          user_agent?: string | null;
          device_info?: string | null;
        };
      };
      homework: {
        Row: {
          id: string;
          subject_id: string | null;
          class_id: string | null;
          teacher_id: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          total_marks: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id?: string | null;
          class_id?: string | null;
          teacher_id?: string | null;
          title: string;
          description?: string | null;
          due_date?: string | null;
          total_marks?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string | null;
          class_id?: string | null;
          teacher_id?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          total_marks?: number;
          created_at?: string;
        };
      };
      homework_submissions: {
        Row: {
          id: string;
          homework_id: string;
          student_id: string;
          submission_url: string | null;
          marks: number | null;
          feedback: string | null;
          submitted_at: string | null;
          graded_at: string | null;
        };
        Insert: {
          id?: string;
          homework_id: string;
          student_id: string;
          submission_url?: string | null;
          marks?: number | null;
          feedback?: string | null;
          submitted_at?: string | null;
          graded_at?: string | null;
        };
        Update: {
          id?: string;
          homework_id?: string;
          student_id?: string;
          submission_url?: string | null;
          marks?: number | null;
          feedback?: string | null;
          submitted_at?: string | null;
          graded_at?: string | null;
        };
      };
      attendance: {
        Row: {
          id: string;
          student_id: string | null;
          class_id: string | null;
          date: string;
          status: 'present' | 'absent' | 'late' | 'excused';
          marked_by: string | null;
          marked_at: string | null;
          scan_method: 'manual' | 'qr_scan' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          class_id?: string | null;
          date: string;
          status: 'present' | 'absent' | 'late' | 'excused';
          marked_by?: string | null;
          marked_at?: string | null;
          scan_method?: 'manual' | 'qr_scan' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          class_id?: string | null;
          date?: string;
          status?: 'present' | 'absent' | 'late' | 'excused';
          marked_by?: string | null;
          marked_at?: string | null;
          scan_method?: 'manual' | 'qr_scan' | null;
          created_at?: string;
        };
      };
      staff_attendance: {
        Row: {
          id: string;
          staff_id: string;
          date: string;
          status: 'present' | 'absent' | 'late';
          marked_by: string | null;
          marked_at: string | null;
          qr_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          date: string;
          status: 'present' | 'absent' | 'late';
          marked_by?: string | null;
          marked_at?: string | null;
          qr_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          date?: string;
          status?: 'present' | 'absent' | 'late';
          marked_by?: string | null;
          marked_at?: string | null;
          qr_code?: string | null;
          created_at?: string;
        };
      };
      results: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string | null;
          exam_type: 'ca1' | 'ca2' | 'ca3' | 'exam';
          score: number;
          grade: string | null;
          remarks: string | null;
          entered_by: string | null;
          term: string | null;
          academic_year: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id?: string | null;
          exam_type: 'ca1' | 'ca2' | 'ca3' | 'exam';
          score: number;
          grade?: string | null;
          remarks?: string | null;
          entered_by?: string | null;
          term?: string | null;
          academic_year?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject_id?: string | null;
          exam_type?: 'ca1' | 'ca2' | 'ca3' | 'exam';
          score?: number;
          grade?: string | null;
          remarks?: string | null;
          entered_by?: string | null;
          term?: string | null;
          academic_year?: string | null;
          created_at?: string;
        };
      };
      behavioral_reports: {
        Row: {
          id: string;
          student_id: string;
          week_start: string;
          week_end: string;
          rating: number;
          punctuality: number;
          class_participation: number;
          homework_completion: number;
          behavior: string | null;
          teacher_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          week_start: string;
          week_end: string;
          rating: number;
          punctuality: number;
          class_participation: number;
          homework_completion: number;
          behavior?: string | null;
          teacher_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          week_start?: string;
          week_end?: string;
          rating?: number;
          punctuality?: number;
          class_participation?: number;
          homework_completion?: number;
          behavior?: string | null;
          teacher_notes?: string | null;
          created_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          audience: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
          priority: 'low' | 'normal' | 'high' | 'urgent';
          attachments: string[] | null;
          created_by: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          audience: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          attachments?: string[] | null;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          audience?: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          attachments?: string[] | null;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          student_id: string | null;
          type: 'income' | 'expense';
          category: string;
          amount: number;
          description: string | null;
          payment_method: string | null;
          reference_number: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          type: 'income' | 'expense';
          category: string;
          amount: number;
          description?: string | null;
          payment_method?: string | null;
          reference_number?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          type?: 'income' | 'expense';
          category?: string;
          amount?: number;
          description?: string | null;
          payment_method?: string | null;
          reference_number?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          student_id: string | null;
          invoice_number: string;
          amount: number;
          description: string | null;
          due_date: string;
          status: 'pending' | 'paid' | 'overdue';
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id?: string | null;
          invoice_number: string;
          amount: number;
          description?: string | null;
          due_date: string;
          status?: 'pending' | 'paid' | 'overdue';
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          invoice_number?: string;
          amount?: number;
          description?: string | null;
          due_date?: string;
          status?: 'pending' | 'paid' | 'overdue';
          created_at?: string;
        };
      };
      receipts: {
        Row: {
          id: string;
          invoice_id: string | null;
          receipt_number: string;
          amount_paid: number;
          payment_method: string | null;
          reference_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id?: string | null;
          receipt_number: string;
          amount_paid: number;
          payment_method?: string | null;
          reference_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string | null;
          receipt_number?: string;
          amount_paid?: number;
          payment_method?: string | null;
          reference_number?: string | null;
          created_at?: string;
        };
      };
      id_cards: {
        Row: {
          id: string;
          student_id: string;
          card_number: string;
          qr_code: string;
          is_active: boolean;
          issued_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          card_number: string;
          qr_code: string;
          is_active?: boolean;
          issued_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          card_number?: string;
          qr_code?: string;
          is_active?: boolean;
          issued_at?: string;
          expires_at?: string | null;
        };
      };
      exam_activity_logs: {
        Row: {
          id: string;
          attempt_id: string | null;
          student_id: string;
          event_type: string;
          event_data: Json | null;
          severity: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id?: string | null;
          student_id: string;
          event_type: string;
          event_data?: Json | null;
          severity?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string | null;
          student_id?: string;
          event_type?: string;
          event_data?: Json | null;
          severity?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      entrance_exams: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          level: 'PRIMARY' | 'JSS' | 'SS1' | 'SS2' | 'SS3';
          academic_year: string;
          exam_date: string | null;
          duration_minutes: number;
          passing_score: number;
          total_questions: number;
          shuffle_questions: boolean;
          require_fullscreen: boolean;
          prevent_tab_switch: boolean;
          max_tab_switches: number;
          is_published: boolean;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          level: 'PRIMARY' | 'JSS' | 'SS1' | 'SS2' | 'SS3';
          academic_year: string;
          exam_date?: string | null;
          duration_minutes?: number;
          passing_score?: number;
          total_questions?: number;
          shuffle_questions?: boolean;
          require_fullscreen?: boolean;
          prevent_tab_switch?: boolean;
          max_tab_switches?: number;
          is_published?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          level?: 'PRIMARY' | 'JSS' | 'SS1' | 'SS2' | 'SS3';
          academic_year?: string;
          exam_date?: string | null;
          duration_minutes?: number;
          passing_score?: number;
          total_questions?: number;
          shuffle_questions?: boolean;
          require_fullscreen?: boolean;
          prevent_tab_switch?: boolean;
          max_tab_switches?: number;
          is_published?: boolean;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
      };
      entrance_questions: {
        Row: {
          id: string;
          exam_id: string;
          question: string;
          question_image: string | null;
          options: string[];
          option_images: string[] | null;
          correct_answer: number;
          points: number;
          question_type: string;
          subject: string | null;
          difficulty_level: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD' | null;
          topic: string | null;
          subtopic: string | null;
          explanation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          question: string;
          question_image?: string | null;
          options: string[];
          option_images?: string[] | null;
          correct_answer: number;
          points?: number;
          question_type?: string;
          subject?: string | null;
          difficulty_level?: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD' | null;
          topic?: string | null;
          subtopic?: string | null;
          explanation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          question?: string;
          question_image?: string | null;
          options?: string[];
          option_images?: string[] | null;
          correct_answer?: number;
          points?: number;
          question_type?: string;
          subject?: string | null;
          difficulty_level?: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD' | null;
          topic?: string | null;
          subtopic?: string | null;
          explanation?: string | null;
          created_at?: string;
        };
      };
      entrance_codes: {
        Row: {
          id: string;
          exam_id: string;
          code: string;
          max_uses: number;
          used_count: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          code: string;
          max_uses?: number;
          used_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          code?: string;
          max_uses?: number;
          used_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      entrance_applications: {
        Row: {
          id: string;
          exam_id: string | null;
          code_id: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          date_of_birth: string | null;
          gender: string | null;
          applied_class: string | null;
          admitted_class: string | null;
          previous_school: string | null;
          exam_score: number | null;
          status: string;
          mastery_level: 'POOR' | 'GOOD' | 'EXCELLENT' | 'PROFICIENT' | 'MASTERED' | null;
          subject_scores: Json | null;
          topic_mastery: Json | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          security_events: Json | null;
          answers: Json | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          exam_id?: string | null;
          code_id?: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          date_of_birth?: string | null;
          gender?: string | null;
          applied_class?: string | null;
          admitted_class?: string | null;
          previous_school?: string | null;
          exam_score?: number | null;
          status?: string;
          mastery_level?: 'POOR' | 'GOOD' | 'EXCELLENT' | 'PROFICIENT' | 'MASTERED' | null;
          subject_scores?: Json | null;
          topic_mastery?: Json | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          security_events?: Json | null;
          answers?: Json | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string | null;
          code_id?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          date_of_birth?: string | null;
          gender?: string | null;
          applied_class?: string | null;
          admitted_class?: string | null;
          previous_school?: string | null;
          exam_score?: number | null;
          status?: string;
          mastery_level?: 'POOR' | 'GOOD' | 'EXCELLENT' | 'PROFICIENT' | 'MASTERED' | null;
          subject_scores?: Json | null;
          topic_mastery?: Json | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          security_events?: Json | null;
          answers?: Json | null;
          completed_at?: string | null;
          created_at?: string;
        };
      };
      question_bank: {
        Row: {
          id: string;
          subject: string;
          subject_id: string | null;
          level: string;
          class_id: string | null;
          difficulty_level: string;
          topic: string;
          subtopic: string | null;
          question: string;
          question_image: string | null;
          options: string[] | null;
          option_images: string[] | null;
          correct_answer: number;
          explanation: string | null;
          question_type: string;
          points: number;
          is_active: boolean;
          tags: string[] | null;
          status: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject: string;
          subject_id?: string | null;
          level: string;
          class_id?: string | null;
          difficulty_level: string;
          topic: string;
          subtopic?: string | null;
          question: string;
          question_image?: string | null;
          options?: string[] | null;
          option_images?: string[] | null;
          correct_answer: number;
          explanation?: string | null;
          question_type: string;
          points?: number;
          is_active?: boolean;
          tags?: string[] | null;
          status?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject?: string;
          subject_id?: string | null;
          level?: string;
          class_id?: string | null;
          difficulty_level?: string;
          topic?: string;
          subtopic?: string | null;
          question?: string;
          question_image?: string | null;
          options?: string[] | null;
          option_images?: string[] | null;
          correct_answer?: number;
          explanation?: string | null;
          question_type?: string;
          points?: number;
          is_active?: boolean;
          tags?: string[] | null;
          status?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      student_analytics: {
        Row: {
          id: string;
          application_id: string | null;
          student_email: string;
          score: number;
          time_taken_seconds: number | null;
          subject: string | null;
          mastery_level: 'POOR' | 'GOOD' | 'EXCELLENT' | 'PROFICIENT' | 'MASTERED' | null;
          topic_performance: Json | null;
          generated_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          application_id?: string | null;
          student_email: string;
          score: number;
          time_taken_seconds?: number | null;
          subject?: string | null;
          mastery_level?: 'POOR' | 'GOOD' | 'EXCELLENT' | 'PROFICIENT' | 'MASTERED' | null;
          topic_performance?: Json | null;
          generated_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string | null;
          student_email?: string;
          score?: number;
          time_taken_seconds?: number | null;
          subject?: string | null;
          mastery_level?: 'POOR' | 'GOOD' | 'EXCELLENT' | 'PROFICIENT' | 'MASTERED' | null;
          topic_performance?: Json | null;
          generated_at?: string;
          updated_at?: string;
        };
      };
      mastery_tracking: {
        Row: {
          id: string;
          student_id: string;
          subject: string;
          topic: string;
          mastery_level: 'NOVICE' | 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'MASTERED';
          attempts: number;
          last_attempt_date: string | null;
          next_review_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject: string;
          topic: string;
          mastery_level: 'NOVICE' | 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'MASTERED';
          attempts?: number;
          last_attempt_date?: string | null;
          next_review_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject?: string;
          topic?: string;
          mastery_level?: 'NOVICE' | 'BEGINNER' | 'INTERMEDIATE' | 'PROFICIENT' | 'MASTERED';
          attempts?: number;
          last_attempt_date?: string | null;
          next_review_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      spaced_repetition_schedule: {
        Row: {
          id: string;
          mastery_id: string;
          review_number: number;
          scheduled_date: string;
          completed_date: string | null;
          performance_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mastery_id: string;
          review_number: number;
          scheduled_date: string;
          completed_date?: string | null;
          performance_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          mastery_id?: string;
          review_number?: number;
          scheduled_date?: string;
          completed_date?: string | null;
          performance_score?: number | null;
          created_at?: string;
        };
      };
      mastery_practice_logs: {
        Row: {
          id: string;
          student_id: string;
          subject: string;
          topic: string;
          questions_attempted: number;
          correct_answers: number;
          time_spent_seconds: number;
          practice_date: string;
          performance_percentage: number | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject: string;
          topic: string;
          questions_attempted?: number;
          correct_answers?: number;
          time_spent_seconds?: number;
          practice_date?: string;
          performance_percentage?: number | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject?: string;
          topic?: string;
          questions_attempted?: number;
          correct_answers?: number;
          time_spent_seconds?: number;
          practice_date?: string;
          performance_percentage?: number | null;
        };
      };
      mastery_scores: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string | null;
          topic: string;
          subtopic: string | null;
          mastery_score: number | null;
          accuracy: number | null;
          consistency: number | null;
          recency: number | null;
          difficulty_progress: number | null;
          level: string;
          total_attempts: number;
          correct_attempts: number;
          last_practiced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id?: string | null;
          topic: string;
          subtopic?: string | null;
          mastery_score?: number | null;
          accuracy?: number | null;
          consistency?: number | null;
          recency?: number | null;
          difficulty_progress?: number | null;
          level?: string;
          total_attempts?: number;
          correct_attempts?: number;
          last_practiced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject_id?: string | null;
          topic?: string;
          subtopic?: string | null;
          mastery_score?: number | null;
          accuracy?: number | null;
          consistency?: number | null;
          recency?: number | null;
          difficulty_progress?: number | null;
          level?: string;
          total_attempts?: number;
          correct_attempts?: number;
          last_practiced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      scheme_of_work: {
        Row: {
          id: string;
          subject_id: string | null;
          class_id: string | null;
          term_id: string | null;
          academic_year: string;
          term: string;
          week_number: number;
          topic: string;
          subtopics: string[] | null;
          learning_outcomes: string[] | null;
          teaching_materials: string[] | null;
          assessments: string[] | null;
          learning_objectives: string[] | null;
          resources: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id?: string | null;
          class_id?: string | null;
          term_id?: string | null;
          academic_year: string;
          term: string;
          week_number: number;
          topic: string;
          subtopics?: string[] | null;
          learning_outcomes?: string[] | null;
          teaching_materials?: string[] | null;
          assessments?: string[] | null;
          learning_objectives?: string[] | null;
          resources?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string | null;
          class_id?: string | null;
          term_id?: string | null;
          academic_year?: string;
          term?: string;
          week_number?: number;
          topic?: string;
          subtopics?: string[] | null;
          learning_outcomes?: string[] | null;
          teaching_materials?: string[] | null;
          assessments?: string[] | null;
          learning_objectives?: string[] | null;
          resources?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          subject: string;
          body: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          subject: string;
          body: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          subject?: string;
          body?: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };
      announcements_messages: {
        Row: {
          id: string;
          announcement_id: string;
          recipient_id: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          announcement_id: string;
          recipient_id: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          announcement_id?: string;
          recipient_id?: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          student_id: string;
          term_id: string | null;
          date: string;
          goal_type: string | null;
          total_questions: number;
          answered_questions: number;
          correct_answers: number;
          score: number | null;
          duration_seconds: number;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          term_id?: string | null;
          date: string;
          goal_type?: string | null;
          total_questions?: number;
          answered_questions?: number;
          correct_answers?: number;
          score?: number | null;
          duration_seconds?: number;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          term_id?: string | null;
          date?: string;
          goal_type?: string | null;
          total_questions?: number;
          answered_questions?: number;
          correct_answers?: number;
          score?: number | null;
          duration_seconds?: number;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      practice_attempts: {
        Row: {
          id: string;
          session_id: string | null;
          student_id: string;
          question_source: string | null;
          source_id: string | null;
          question_text: string;
          question_type: string | null;
          options: Json | null;
          correct_answer: number;
          selected_answer: number | null;
          is_correct: boolean | null;
          time_taken: number;
          difficulty: string | null;
          topic: string | null;
          subtopic: string | null;
          explanation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          student_id: string;
          question_source?: string | null;
          source_id?: string | null;
          question_text: string;
          question_type?: string | null;
          options?: Json | null;
          correct_answer: number;
          selected_answer?: number | null;
          is_correct?: boolean | null;
          time_taken?: number;
          difficulty?: string | null;
          topic?: string | null;
          subtopic?: string | null;
          explanation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          student_id?: string;
          question_source?: string | null;
          source_id?: string | null;
          question_text?: string;
          question_type?: string | null;
          options?: Json | null;
          correct_answer?: number;
          selected_answer?: number | null;
          is_correct?: boolean | null;
          time_taken?: number;
          difficulty?: string | null;
          topic?: string | null;
          subtopic?: string | null;
          explanation?: string | null;
          created_at?: string;
        };
      };
      daily_goals: {
        Row: {
          id: string;
          student_id: string;
          date: string;
          target_questions: number;
          target_score: number;
          completed_questions: number;
          achieved_score: number | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          date: string;
          target_questions?: number;
          target_score?: number;
          completed_questions?: number;
          achieved_score?: number | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          date?: string;
          target_questions?: number;
          target_score?: number;
          completed_questions?: number;
          achieved_score?: number | null;
          status?: string;
          created_at?: string;
        };
      };
      learning_streaks: {
        Row: {
          id: string;
          student_id: string;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          updated_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          student_id: string;
          badge_type: string;
          badge_data: Json | null;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          badge_type: string;
          badge_data?: Json | null;
          awarded_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          badge_type?: string;
          badge_data?: Json | null;
          awarded_at?: string;
        };
      };
      review_schedule: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string | null;
          topic: string;
          subtopic: string | null;
          next_review_date: string;
          interval_days: number;
          last_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id?: string | null;
          topic: string;
          subtopic?: string | null;
          next_review_date: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject_id?: string | null;
          topic?: string;
          subtopic?: string | null;
          next_review_date?: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ccr_responses: {
        Row: {
          id: string;
          student_id: string;
          academic_session_id: string | null;
          term_id: string | null;
          respondent_type: 'student' | 'father' | 'mother' | 'teacher' | 'subject_teacher';
          data: Json;
          is_submitted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          academic_session_id?: string | null;
          term_id?: string | null;
          respondent_type: 'student' | 'father' | 'mother' | 'teacher' | 'subject_teacher';
          data?: Json;
          is_submitted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          academic_session_id?: string | null;
          term_id?: string | null;
          respondent_type?: 'student' | 'father' | 'mother' | 'teacher' | 'subject_teacher';
          data?: Json;
          is_submitted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {};
  };
}