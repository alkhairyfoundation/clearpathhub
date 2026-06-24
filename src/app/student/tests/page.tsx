'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';

export default function StudentTestsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data: student } = await supabase.from('students').select('class_id').eq('profile_id', profile?.id).maybeSingle();
    
    const res = await fetch(`/api/student-tests?studentId=${profile?.id}&classId=${student?.class_id || ''}`);
    const data = await res.json();
    
    if (data.tests) setTests(data.tests);
    if (data.attempts) setAttempts(data.attempts);
    setLoading(false);
  }

  return (
    <DashboardLayout title="Tests" subtitle="View and take tests">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Available Tests</h1>
          <Link href="/student/results" className="btn-outline text-sm flex items-center gap-2"><FileText size={14} />View Results</Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : tests.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No tests available yet</p>
            <p className="text-sm text-slate-400 mt-2">Check back later or contact your teacher</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map(test => {
              const attempt = attempts[test.id];
              return (
                <div key={test.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                      <FileText className="text-primary-600" size={24} />
                    </div>
                    {attempt && (
                      attempt.passed
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full"><CheckCircle size={12} /> Passed</span>
                        : <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full"><XCircle size={12} /> Failed</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{test.title}</h3>
                  <p className="text-sm text-slate-500 mb-3">{test.subject?.name} • {test.class?.name || 'All Classes'}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><FileText size={14} />{test.total_marks} marks</span>
                    <span className="flex items-center gap-1"><Clock size={14} />{test.duration_minutes} min</span>
                    <span>Pass: {test.passing_score}%</span>
                  </div>
                  {attempt ? (
                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-sm font-bold">{attempt.score}%</span>
                      <Link href={`/student/tests/${test.id}`} className="btn-outline text-sm py-1.5 px-3 flex items-center gap-1">
                        Retry <ArrowRight size={14} />
                      </Link>
                    </div>
                  ) : (
                    <Link href={`/student/tests/${test.id}`} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                      Start Test <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}