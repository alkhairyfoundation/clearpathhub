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
          academic_year: string;
          term: string;
          session_start: string | null;
          session_end: string | null;
          current_session_id: string | null;
          current_term_id: string | null;
        };
        Insert: {
          id?: string;
          school_name: string;
          school_motto?: string | null;
          school_address?: string | null;
          school_phone?: string | null;
          school_email?: string | null;
          school_logo?: string | null;
          primary_color?: string;
          secondary_color?: string;
          accent_color?: string;
          academic_year?: string;
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
          academic_year?: string;
          term?: string;
          session_start?: string | null;
          session_end?: string | null;
          current_session_id?: string | null;
          current_term_id?: string | null;
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
      classes: {
        Row: {
          id: string;
          name: string;
          level: number;
          department_id: string | null;
          class_teacher_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          level: number;
          department_id?: string | null;
          class_teacher_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          level?: number;
          department_id?: string | null;
          class_teacher_id?: string | null;
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
      students: {
        Row: {
          id: string;
          profile_id: string;
          admission_number: string;
          class_id: string | null;
          parent_id: string | null;
          date_of_birth: string | null;
          gender: string | null;
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
          gender?: string | null;
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
          gender?: string | null;
          address?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          guardian_email?: string | null;
          blood_group?: string | null;
          emergency_contact?: string | null;
          created_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          profile_id: string;
          staff_id: string;
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
          department_id?: string | null;
          designation?: string | null;
          salary?: number | null;
          date_of_employment?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          content: string;
          attachments: string[] | null;
          is_published: boolean;
          created_at: string;
          class_id: string | null;
          term_id: string | null;
          week_no: number | null;
          topic: string | null;
        };
        Insert: {
          id?: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          content: string;
          attachments?: string[] | null;
          is_published?: boolean;
          created_at?: string;
          class_id?: string | null;
          term_id?: string | null;
          week_no?: number | null;
          topic?: string | null;
        };
        Update: {
          id?: string;
          subject_id?: string;
          teacher_id?: string;
          title?: string;
          content?: string;
          attachments?: string[] | null;
          is_published?: boolean;
          created_at?: string;
          class_id?: string | null;
          term_id?: string | null;
          week_no?: number | null;
          topic?: string | null;
        };
      };
      sessions: {
        Row: {
          id: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          description: string | null;
          video_url: string | null;
          video_type: 'youtube' | 'upload';
          duration: number | null;
          is_published: boolean;
          created_at: string;
          class_id: string | null;
          term_id: string | null;
          week_no: number | null;
          topic: string | null;
        };
        Insert: {
          id?: string;
          subject_id: string;
          teacher_id: string;
          title: string;
          description?: string | null;
          video_url?: string | null;
          video_type?: 'youtube' | 'upload';
          duration?: number | null;
          is_published?: boolean;
          created_at?: string;
          class_id?: string | null;
          term_id?: string | null;
          week_no?: number | null;
          topic?: string | null;
        };
        Update: {
          id?: string;
          subject_id?: string;
          teacher_id?: string;
          title?: string;
          description?: string | null;
          video_url?: string | null;
          video_type?: 'youtube' | 'upload';
          duration?: number | null;
          is_published?: boolean;
          created_at?: string;
          class_id?: string | null;
          term_id?: string | null;
          week_no?: number | null;
          topic?: string | null;
        };
      };
      quizzes: {
        Row: {
          id: string;
          session_id: string;
          title: string;
          description: string | null;
          passing_score: number;
          time_limit: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          title: string;
          description?: string | null;
          passing_score?: number;
          time_limit?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
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
          question_image?: string | null;
          option_images?: string[] | null;
          options: string[];
          correct_answer: number;
          points: number;
          question_type?: string | null;
          order_index?: number | null;
          timestamp_seconds?: number | null;
          is_checkpoint?: boolean | null;
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
          answers: number[];
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          student_id: string;
          score: number;
          passed: boolean;
          answers: number[];
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          student_id?: string;
          score?: number;
          passed?: boolean;
          answers?: number[];
          started_at?: string;
          completed_at?: string | null;
        };
      };
      homework: {
        Row: {
          id: string;
          subject_id: string;
          class_id: string;
          teacher_id: string;
          title: string;
          description: string | null;
          due_date: string;
          total_marks: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          class_id: string;
          teacher_id: string;
          title: string;
          description?: string | null;
          due_date: string;
          total_marks?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          class_id?: string;
          teacher_id?: string;
          title?: string;
          description?: string | null;
          due_date?: string;
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
          student_id: string;
          class_id: string;
          date: string;
          status: 'present' | 'absent' | 'late' | 'excused';
          marked_by: string | null;
          marked_at: string | null;
          scan_method: 'manual' | 'qr_scan' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          class_id: string;
          date: string;
          status: 'present' | 'absent' | 'late' | 'excused';
          marked_by?: string | null;
          marked_at?: string | null;
          scan_method?: 'manual' | 'qr_scan' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          class_id?: string;
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
          subject_id: string;
          exam_type: 'ca1' | 'ca2' | 'ca3' | 'exam';
          score: number;
          grade: string | null;
          remarks: string | null;
          entered_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          exam_type: 'ca1' | 'ca2' | 'ca3' | 'exam';
          score: number;
          grade?: string | null;
          remarks?: string | null;
          entered_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject_id?: string;
          exam_type?: 'ca1' | 'ca2' | 'ca3' | 'exam';
          score?: number;
          grade?: string | null;
          remarks?: string | null;
          entered_by?: string | null;
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
          student_id: string;
          invoice_number: string;
          amount: number;
          description: string | null;
          due_date: string;
          status: 'pending' | 'paid' | 'overdue';
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          invoice_number: string;
          amount: number;
          description?: string | null;
          due_date: string;
          status?: 'pending' | 'paid' | 'overdue';
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
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
          invoice_id: string;
          receipt_number: string;
          amount_paid: number;
          payment_method: string | null;
          reference_number: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          receipt_number: string;
          amount_paid: number;
          payment_method?: string | null;
          reference_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
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
          attempt_id: string;
          student_id: string;
          event_type: string;
          event_data: any;
          severity: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          student_id: string;
          event_type: string;
          event_data?: any;
          severity?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          student_id?: string;
          event_type?: string;
          event_data?: any;
          severity?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
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
          session_id: string;
          name: string;
          start_date: string;
          end_date: string;
          current_week: number;
          is_current: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          name: string;
          start_date: string;
          end_date: string;
          current_week?: number;
          is_current?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
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
      question_bank: {
        Row: {
          id: string;
          subject_id: string;
          class_id: string | null;
          term_id: string | null;
          topic: string;
          subtopic: string;
          difficulty: string;
          question_type: string;
          question: string;
          question_image: string | null;
          options: any;
          option_images: any;
          correct_answer: number;
          points: number;
          explanation: string | null;
          tags: any;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          class_id?: string | null;
          term_id?: string | null;
          topic: string;
          subtopic?: string;
          difficulty?: string;
          question_type?: string;
          question: string;
          question_image?: string | null;
          options?: any;
          option_images?: any;
          correct_answer: number;
          points?: number;
          explanation?: string | null;
          tags?: any;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          class_id?: string | null;
          term_id?: string | null;
          topic?: string;
          subtopic?: string;
          difficulty?: string;
          question_type?: string;
          question?: string;
          question_image?: string | null;
          options?: any;
          option_images?: any;
          correct_answer?: number;
          points?: number;
          explanation?: string | null;
          tags?: any;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          student_id: string;
          term_id: string | null;
          date: string;
          goal_type: string;
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
          date?: string;
          goal_type?: string;
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
          goal_type?: string;
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
          session_id: string;
          student_id: string;
          question_source: string;
          source_id: string | null;
          question_text: string;
          question_type: string;
          options: any;
          correct_answer: number;
          selected_answer: number | null;
          is_correct: boolean | null;
          time_taken: number;
          difficulty: string;
          topic: string | null;
          subtopic: string | null;
          explanation: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          question_source?: string;
          source_id?: string | null;
          question_text: string;
          question_type?: string;
          options?: any;
          correct_answer: number;
          selected_answer?: number | null;
          is_correct?: boolean | null;
          time_taken?: number;
          difficulty?: string;
          topic?: string | null;
          subtopic?: string | null;
          explanation?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          question_source?: string;
          source_id?: string | null;
          question_text?: string;
          question_type?: string;
          options?: any;
          correct_answer?: number;
          selected_answer?: number | null;
          is_correct?: boolean | null;
          time_taken?: number;
          difficulty?: string;
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
          date?: string;
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
          badge_data: any;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          badge_type: string;
          badge_data?: any;
          awarded_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          badge_type?: string;
          badge_data?: any;
          awarded_at?: string;
        };
      };
      mastery_scores: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          topic: string;
          subtopic: string;
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
          subject_id: string;
          topic: string;
          subtopic?: string;
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
          subject_id?: string;
          topic?: string;
          subtopic?: string;
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
          term_id: string;
          class_id: string;
          subject_id: string;
          week_number: number;
          topic: string;
          subtopics: any;
          learning_objectives: any;
          resources: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          term_id: string;
          class_id: string;
          subject_id: string;
          week_number: number;
          topic: string;
          subtopics?: any;
          learning_objectives?: any;
          resources?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          term_id?: string;
          class_id?: string;
          subject_id?: string;
          week_number?: number;
          topic?: string;
          subtopics?: any;
          learning_objectives?: any;
          resources?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      review_schedule: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          topic: string;
          subtopic: string;
          next_review_date: string;
          interval_days: number;
          last_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          topic: string;
          subtopic?: string;
          next_review_date: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject_id?: string;
          topic?: string;
          subtopic?: string;
          next_review_date?: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}