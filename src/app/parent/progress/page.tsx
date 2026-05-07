'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, TrendingUp, Award, BookOpen, BarChart3 } from 'lucide-react';

function ProgressContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const [child, setChild] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [subjectAverages, setSubjectAverages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile, childId]);

  async function fetchData() {
    setLoading(true);
    const childrenRes = await supabase.from('students').select('*, profile:profiles(first_name, last_name), class:classes(name)').eq('parent_id', profile?.id);
    
    if (childrenRes.data?.length) {
      const selectedChild = childId ? childrenRes.data.find(c => c.id === childId) : childrenRes.data[0];
      if (selectedChild) {
        setChild(selectedChild);
        const resultsRes = await supabase.from('results').select('*, subject:subjects(name)').eq('student_id', selectedChild.profile_id).order('created_at', { ascending: false }).limit(20);
        if (resultsRes.data) {
          setResults(resultsRes.data);
          const averages: Record<string, { name: string; total: number; count: number }> = {};
          resultsRes.data.forEach(r => {
            const subjectName = r.subject?.name || 'Unknown';
            if (!averages[subjectName]) averages[subjectName] = { name: subjectName, total: 0, count: 0 };
            averages[subjectName].total += r.score || 0;
            averages[subjectName].count++;
          });
          setSubjectAverages(Object.values(averages).map(a => ({ ...a, average: Math.round(a.total / a.count) })));
        }
      }
    }
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>;

  return (
    <DashboardLayout title="Academic Progress" subtitle="{child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">Academic Progress</h1>
            <p className="text-slate-500">{child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}</p>
          </div>
        </div>

      {!child ? (
        <div className="bg-white rounded-xl p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
      ) : (
        <>
          {subjectAverages.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-slate-400" />Subject Averages</h2>
              <div className="space-y-3">
                {subjectAverages.map((sub, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-slate-800 truncate">{sub.name}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-full rounded-full ${sub.average >= 70 ? 'bg-green-500' : sub.average >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${sub.average}%` }} />
                    </div>
                    <div className="w-12 text-right text-sm font-bold text-slate-800">{sub.average}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400" />Recent Results</h2>
            {results.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No results recorded yet</div>
            ) : (
              <div className="space-y-3">
                {results.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><BookOpen size={18} className="text-blue-600" /></div>
                      <div><p className="font-medium text-slate-800">{r.subject?.name || 'Unknown'}</p><p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${r.score >= 70 ? 'bg-green-100 text-green-700' : r.score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{r.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ParentProgressPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>}>
      <ProgressContent />
    </Suspense>
  );
}
