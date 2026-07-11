'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { FileText, Users, Search, CheckCircle, AlertCircle, Loader2, BookOpen } from 'lucide-react';

export default function TeacherCcrPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('class_id')
        .eq('teacher_id', profile?.id);

      const teacherClassIds = Array.from(new Set(subjectData?.map(s => s.class_id).filter(Boolean) || []));

      const { data: kids } = await supabase
        .from('students')
        .select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)')
        .in('class_id', teacherClassIds)
        .order('admission_number');

      if (kids) {
        setStudents(kids);
        const profileIds = kids.map(k => k.profile_id);
        if (profileIds.length > 0) {
          const { data: subs } = await supabase
            .from('ccr_responses')
            .select('*')
            .in('student_id', profileIds)
            .in('respondent_type', ['teacher', 'subject_teacher']);
          const byStudent: Record<string, any[]> = {};
          for (const s of subs || []) {
            if (!byStudent[s.student_id]) byStudent[s.student_id] = [];
            byStudent[s.student_id].push(s);
          }
          setSubmissions(byStudent);
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = students.filter(s =>
    !searchQuery || `${s.profile?.first_name} ${s.profile?.last_name} ${s.admission_number}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getStatus(studentId: string, type: string) {
    const subs = submissions[studentId] || [];
    return subs.find(s => s.respondent_type === type);
  }

  if (loading) {
    return (
      <DashboardLayout title="Child Review" subtitle="Teacher assessment">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Child Review"
      subtitle="Assess your students"><div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search students..."
          className="input pl-10 w-full max-w-md"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(student => {
          const classSub = getStatus(student.profile_id, 'teacher');
          const subjectSub = getStatus(student.profile_id, 'subject_teacher');
          return (
            <div key={student.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">
                    {student.profile?.first_name} {student.profile?.last_name}
                  </p>
                  <p className="text-sm text-slate-500">{student.class?.name} | {student.admission_number}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/teacher/ccr/class/${student.profile_id}?name=${encodeURIComponent(student.profile?.first_name || '')}`}
                  className={`btn-outline text-xs flex items-center gap-1 ${classSub?.is_submitted ? 'opacity-60' : ''}`}
                >
                  {classSub?.is_submitted ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                  Class Teacher
                </Link>
                <Link
                  href={`/teacher/ccr/subject/${student.profile_id}?name=${encodeURIComponent(student.profile?.first_name || '')}`}
                  className={`btn-outline text-xs flex items-center gap-1 ${subjectSub?.is_submitted ? 'opacity-60' : ''}`}
                >
                  {subjectSub?.is_submitted ? <CheckCircle className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                  Subject Teacher
                </Link>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-10 text-slate-500">No students found.</div>
        )}
      </div>
    </DashboardLayout>
  );
}

