'use client';

import { Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import CcrForm from '@/components/CcrForm';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function FatherCcrContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const childName = searchParams.get('name') || 'Child';

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
  }, [profile]);

  if (!childId) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No child selected. Please go back and select a child.</p>
        <Link href="/parent/ccr" className="btn-outline mt-4 inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Father Questionnaire"
      subtitle={`Responding about ${childName}`}><Link href="/parent/ccr" className="text-sm text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to children
      </Link>
      <CcrForm respondentType="father" studentId={childId} studentName={childName} />
    </DashboardLayout>
  );
}

export default function FatherCcrPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>}>
      <FatherCcrContent />
    </Suspense>
  );
}

