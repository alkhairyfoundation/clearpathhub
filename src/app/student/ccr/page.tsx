'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import CcrForm from '@/components/CcrForm';
import { FileText, Loader2 } from 'lucide-react';

export default function StudentCcrPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchStudent();
  }, [profile]);

  async function fetchStudent() {
    try {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('profile_id', profile?.id)
        .single();
      if (data) setStudentRecord(data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Child Review" subtitle="Self-assessment questionnaire">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  if (!studentRecord) {
    return (
      <DashboardLayout title="Child Review" subtitle="Self-assessment questionnaire">
        <div className="text-center py-20 text-slate-500 dark:text-slate-400 dark:text-slate-400">Student record not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Child Review"
      subtitle="Help us understand you better - answer honestly!"><CcrForm
        respondentType="student"
        studentId={profile?.id || ''}
        studentName={`${profile?.first_name} ${profile?.last_name}`}
      />
    </DashboardLayout>
  );
}

