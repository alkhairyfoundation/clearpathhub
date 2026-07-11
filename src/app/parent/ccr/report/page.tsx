'use client';

import { Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { BarChart3, Loader2, AlertCircle, TrendingUp, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { SgiScore } from '@/types';

function ParentCcrReportContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const [report, setReport] = useState<any>(null);
  const [sgi, setSgi] = useState<SgiScore | null>(null);
  const [child, setChild] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    if (childId) fetchData();
    else setLoading(false);
  }, [profile, childId]);

  async function fetchData() {
    try {
      const { data: c } = await supabase
        .from('students')
        .select('*, profile:profiles!profile_id(first_name, last_name)')
        .eq('profile_id', childId)
        .single();
      if (c) setChild(c);

      const res = await fetch(`/api/ccr/report?student_id=${childId}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setReport(result.data);
      setSgi(result.data.sgi);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!childId) {
    return (
      <DashboardLayout title="CCR Report" subtitle="Child Review Report">
        <div className="text-center py-20">
          <p className="text-slate-500">Please select a child from the CCR dashboard.</p>
          <Link href="/parent/ccr" className="btn-outline mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout title="CCR Report" subtitle="Loading...">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="CCR Report" subtitle="Child Review Report">
        <div className="text-center py-20 text-red-500">{error}</div>
      </DashboardLayout>
    );
  }

  if (!sgi) {
    return (
      <DashboardLayout title="CCR Report" subtitle="Child Review Report">
        <div className="text-center py-20 text-slate-500">No report available yet. Complete the questionnaires first.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`CCR Report: ${child?.profile?.first_name || ''} ${child?.profile?.last_name || ''}`}
      subtitle={`Student Growth Index: ${sgi.overall}/100`}><Link href="/parent/ccr" className="text-sm text-primary-600 hover:underline flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-500">Foundation</p>
          <p className="text-2xl font-bold text-primary-600">{sgi.foundation}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-500">Performance</p>
          <p className="text-2xl font-bold text-blue-600">{sgi.performance}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-500">Environment</p>
          <p className="text-2xl font-bold text-green-600">{sgi.environment}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-sm text-slate-500">Aspiration</p>
          <p className="text-2xl font-bold text-amber-600">{sgi.aspiration}</p>
        </div>
      </div>

      {sgi.redFlags.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" /> Alerts</h4>
          {sgi.redFlags.map((flag, i) => <p key={i} className="text-sm text-red-600">{flag}</p>)}
        </div>
      )}

      {sgi.prescriptions.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 className="font-semibold text-blue-700 flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4" /> Recommendations</h4>
          {sgi.prescriptions.map((rx, i) => <p key={i} className="text-sm text-blue-600">{rx}</p>)}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Domain Scores</h3>
        <div className="space-y-3">
          {Object.entries(sgi.domainScores).map(([key, ds]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize text-slate-700">{key}</span>
                <span className="text-slate-500">{ds.combined}/100</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${ds.combined}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ParentCcrReportPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ParentCcrReportContent />
    </Suspense>
  );
}

