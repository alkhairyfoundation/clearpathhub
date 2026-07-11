'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { FileText, Users, CheckCircle, AlertCircle, Loader2, ArrowLeft, UserCheck } from 'lucide-react';

export default function ParentCcrDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: kids } = await supabase
        .from('students')
        .select('*, profile:profiles!profile_id(first_name, last_name, email), class:classes!class_id(name)')
        .eq('parent_id', profile?.id)
        .order('admission_number');

      if (kids) {
        setChildren(kids);
        const profileIds = kids.map(k => k.profile_id);
        if (profileIds.length > 0) {
          const { data: subs } = await supabase
            .from('ccr_responses')
            .select('*')
            .in('student_id', profileIds)
            .in('respondent_type', ['father', 'mother']);
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

  function getStatus(studentId: string, type: string) {
    const subs = submissions[studentId] || [];
    return subs.find(s => s.respondent_type === type);
  }

  if (loading) {
    return (
      <DashboardLayout title="Child Review" subtitle="Parent questionnaire">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  if (children.length === 0) {
    return (
      <DashboardLayout title="Child Review" subtitle="Parent questionnaire">
        <div className="text-center py-20">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No Children Found</h2>
          <p className="text-slate-500">No students are linked to your account.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Child Review"
      subtitle="Complete the parent questionnaires for your children"><div className="space-y-6">
        {children.map(child => {
          const fatherSub = getStatus(child.profile_id, 'father');
          const motherSub = getStatus(child.profile_id, 'mother');
          return (
            <div key={child.id} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {child.profile?.first_name} {child.profile?.last_name}
                  </h3>
                  <p className="text-sm text-slate-500">{child.class?.name} | {child.admission_number}</p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/parent/ccr/father?child=${child.profile_id}&name=${encodeURIComponent(child.profile?.first_name || '')}`}
                    className={`btn-outline text-sm flex items-center gap-2 ${fatherSub?.is_submitted ? 'opacity-60' : ''}`}
                  >
                    {fatherSub?.is_submitted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                    Father {fatherSub?.is_submitted ? '(Done)' : '(Pending)'}
                  </Link>
                  <Link
                    href={`/parent/ccr/mother?child=${child.profile_id}&name=${encodeURIComponent(child.profile?.first_name || '')}`}
                    className={`btn-outline text-sm flex items-center gap-2 ${motherSub?.is_submitted ? 'opacity-60' : ''}`}
                  >
                    {motherSub?.is_submitted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                    Mother {motherSub?.is_submitted ? '(Done)' : '(Pending)'}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}

