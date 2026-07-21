'use client';

import { Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CcrForm from '@/components/CcrForm';
import { FileText, ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';

function SubjectTeacherCcrContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.studentId as string;
  const studentName = searchParams.get('name') || 'Student';
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    loadSubjects();
  }, [profile]);

  async function loadSubjects() {
    try {
      // Get teacher's class IDs from teacher_classes
      const { data: tcData } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', profile?.id);
      const teacherClassIds = Array.from(new Set(tcData?.map(tc => tc.class_id).filter(Boolean) || []));

      const { data } = teacherClassIds.length > 0
        ? await supabase.from('subjects').select('id, name, code').in('class_id', teacherClassIds)
        : await supabase.from('subjects').select('id, name, code');
      if (data) setSubjects(data);
      if (data?.length === 1) setSelectedSubject(data[0].id);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Subject Teacher Assessment" subtitle={`Assessing: ${studentName}`}>
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
      </DashboardLayout>
    );
  }

  if (!selectedSubject) {
    return (
      <DashboardLayout
        title="Subject Teacher Assessment"
        subtitle={`Assessing: ${studentName}`}
      >
        <Link href="/teacher/ccr" className="text-sm text-primary-600 hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to students
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Select Subject</h3>
          <div className="space-y-2">
            {subjects.map(subj => (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(subj.id)}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all flex items-center gap-3"
              >
                <BookOpen className="w-5 h-5 text-primary-600" />
                <div>
                  <p className="font-medium text-slate-700">{subj.name}</p>
                  <p className="text-xs text-slate-400">{subj.code}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Subject Teacher Assessment"
      subtitle={`Assessing: ${studentName} - ${subjects.find(s => s.id === selectedSubject)?.name || ''}`}
    >
      <Link href="/teacher/ccr" className="text-sm text-primary-600 hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to students
      </Link>
      <CcrForm respondentType="subject_teacher" studentId={studentId} studentName={studentName} subjectId={selectedSubject} />
    </DashboardLayout>
  );
}

export default function SubjectTeacherCcrPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>}>
      <SubjectTeacherCcrContent />
    </Suspense>
  );
}
