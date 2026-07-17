'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { FileText, Loader2, Download, BarChart3, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import type { SgiScore } from '@/types';
import { generateCcrPdf } from '@/lib/ccr-pdf';

export default function StudentCcrReport() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [sgi, setSgi] = useState<SgiScore | null>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    if (!profile.id) return;
    fetchReport();
  }, [profile, authLoading]);

  async function fetchReport() {
    try {
      const [res, settingsRes] = await Promise.all([
        fetch(`/api/ccr/report?student_id=${profile?.id}`),
        supabase.from('school_settings').select('*').limit(1).maybeSingle(),
      ]);
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setReport(result.data);
      setSgi(result.data.sgi);
      setSchoolSettings(settingsRes.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="My CCR Report" subtitle="Child Review Assessment Results">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="My CCR Report" subtitle="Child Review Assessment Results">
        <div className="text-center py-20 text-red-500 dark:text-red-400 dark:text-red-400">{error}</div>
      </DashboardLayout>
    );
  }

  if (!sgi) {
    return (
      <DashboardLayout title="My CCR Report" subtitle="Child Review Assessment Results">
        <div className="text-center py-20 text-slate-500 dark:text-slate-400 dark:text-slate-400">No report available yet. Complete your questionnaire first.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My CCR Report"
      subtitle={`Student Growth Index: ${sgi.overall}/100`}>
      <div className="flex justify-end mb-4">
        <button
          onClick={async () => {
            const pdf = await generateCcrPdf({
              studentName: `${report?.student?.profile?.first_name || ''} ${report?.student?.profile?.last_name || ''}`,
              studentId: profile?.id || '',
              className: report?.student?.class?.name || '',
              admissionNumber: report?.student?.admission_number || '',
              sgi,
              timestamp: new Date().toLocaleDateString(),
              schoolName: schoolSettings?.school_name,
            });
            pdf.save(`CCR_Report_${profile?.id?.substring(0, 8)}.pdf`);
          }}
          className="btn-outline flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Download PDF Report
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Foundation</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{sgi.foundation}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Performance</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 dark:text-blue-400">{sgi.performance}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Environment</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">{sgi.environment}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Aspiration</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{sgi.aspiration}</p>
        </div>
      </div>

      {sgi.redFlags.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-xl">
          <h4 className="font-semibold text-red-700 dark:text-red-400 dark:text-red-400 flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4" /> Alerts</h4>
          {sgi.redFlags.map((flag, i) => <p key={i} className="text-sm text-red-600 dark:text-red-400 dark:text-red-400">{flag}</p>)}
        </div>
      )}

      {sgi.observationGaps.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40 rounded-xl">
          <h4 className="font-semibold text-amber-700 dark:text-amber-300 dark:text-amber-300 flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4" /> Observation Gaps</h4>
          {sgi.observationGaps.map((gap, i) => <p key={i} className="text-sm text-amber-600 dark:text-amber-400 dark:text-amber-400">{gap}</p>)}
        </div>
      )}

      {sgi.prescriptions.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 dark:border-blue-900/40 rounded-xl">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 dark:text-blue-300 flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4" /> Recommendations</h4>
          {sgi.prescriptions.map((rx, i) => <p key={i} className="text-sm text-blue-600 dark:text-blue-400 dark:text-blue-400">{rx}</p>)}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-4">Domain Scores</h3>
        <div className="space-y-3">
          {Object.entries(sgi.domainScores).map(([key, ds]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize text-slate-700 dark:text-slate-300 dark:text-slate-300">{key}</span>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400">{ds.combined}/100</span>
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

