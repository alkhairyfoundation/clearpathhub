'use client';

import { Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CcrForm from '@/components/CcrForm';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function ClassTeacherCcrContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const studentId = params.studentId as string;
  const studentName = searchParams.get('name') || 'Student';

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
  }, [profile]);

  return (
    <DashboardLayout
      title="Class Teacher Assessment"
      subtitle={`Assessing: ${studentName}`}
    >
      <Link href="/teacher/ccr" className="text-sm text-primary-600 hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to students
      </Link>
      <CcrForm respondentType="teacher" studentId={studentId} studentName={studentName} />
    </DashboardLayout>
  );
}

export default function ClassTeacherCcrPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>}>
      <ClassTeacherCcrContent />
    </Suspense>
  );
}
