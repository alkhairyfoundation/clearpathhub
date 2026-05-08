'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Award, TrendingUp, BookOpen, Calendar, ArrowLeft, AlertTriangle, TrendingDown, BarChart3, PieChart } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function StudentResultsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('results').select('*, subject:subjects(*)').eq('student_id', profile?.id).order('created_at', { ascending: false });
    if (data) setResults(data);
    setLoading(false);
  }

  const scores = results.map(r => r.score);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowest = scores.length > 0 ? Math.min(...scores) : 0;

  const subjectAverages: Record<string, { name: string; scores: number[]; count: number }> = {};
  results.forEach(r => {
    const key = r.subject?.id || 'unknown';
    if (!subjectAverages[key]) subjectAverages[key] = { name: r.subject?.name || 'Unknown', scores: [], count: 0 };
    subjectAverages[key].scores.push(r.score);
    subjectAverages[key].count++;
  });
  const subjectBreakdown = Object.entries(subjectAverages).map(([id, data]) => ({
    id,
    name: data.name,
    avg: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    count: data.count,
  })).sort((a, b) => a.avg - b.avg);

  const weakAreas = subjectBreakdown.filter(s => s.avg < 50);

  const examTypeBreakdown: Record<string, number[]> = {};
  results.forEach(r => {
    if (!examTypeBreakdown[r.exam_type]) examTypeBreakdown[r.exam_type] = [];
    examTypeBreakdown[r.exam_type].push(r.score);
  });
  const examTypeAvgs = Object.entries(examTypeBreakdown).map(([type, scores]) => ({
    type: type.toUpperCase(),
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
  }));

  const gradeDist: Record<string, number> = {};
  results.forEach(r => {
    const g = r.grade?.[0] || 'F';
    gradeDist[g] = (gradeDist[g] || 0) + 1;
  });

  const sortedResults = [...results].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  function getGradeColor(grade: string) {
    if (grade?.includes('A')) return 'bg-green-100 text-green-700';
    if (grade?.includes('B')) return 'bg-blue-100 text-blue-700';
    if (grade?.includes('C')) return 'bg-yellow-100 text-yellow-700';
    if (grade?.includes('D')) return 'bg-orange-100 text-orange-700';
    if (grade?.includes('F')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  }

  return (
    <DashboardLayout title="My Results" subtitle="View your academic performance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My Results</h1>
            <p className="text-slate-500">View your academic performance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Average</span><Award className="text-blue-600" size={18} /></div><p className={`text-2xl font-bold ${avg >= 70 ? 'text-green-600' : avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avg}%</p></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Highest</span><TrendingUp className="text-green-600" size={18} /></div><p className="text-2xl font-bold text-green-600">{highest}%</p></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Lowest</span><BookOpen className="text-red-600" size={18} /></div><p className="text-2xl font-bold text-red-600">{lowest}%</p></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Exams</span><Calendar className="text-purple-600" size={18} /></div><p className="text-2xl font-bold text-slate-800">{results.length}</p></div>
        </div>

        {subjectBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-blue-600" />Per-Subject Performance</h3>
              <div className="space-y-3">
                {subjectBreakdown.map(s => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-sm mb-1"><span className="font-medium text-slate-700">{s.name}</span><span className={`font-bold ${s.avg >= 70 ? 'text-green-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avg}%</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${s.avg >= 70 ? 'bg-green-500' : s.avg >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.avg}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><PieChart size={18} className="text-purple-600" />Grade Distribution</h3>
              <div className="space-y-2">
                {Object.entries(gradeDist).sort(([a], [b]) => a.localeCompare(b)).map(([grade, count]) => {
                  const pct = Math.round((count / results.length) * 100);
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${getGradeColor(grade)}`}>{grade}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3">
                        <div className={`h-3 rounded-full ${grade === 'F' ? 'bg-red-500' : grade === 'A' ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-slate-500 w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {weakAreas.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><AlertTriangle size={18} />Weak Areas Need Attention</h3>
            <p className="text-sm text-red-700 mb-3">These subjects are below 50%. Consider extra study and practice.</p>
            <div className="flex flex-wrap gap-2">
              {weakAreas.map(s => <span key={s.id} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{s.name} ({s.avg}%)</span>)}
            </div>
          </div>
        )}

        {examTypeAvgs.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-600" />Performance by Assessment Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {examTypeAvgs.map(e => (
                <div key={e.type} className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">{e.type}</p>
                  <p className={`text-xl font-bold mt-1 ${e.avg >= 70 ? 'text-green-600' : e.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{e.avg}%</p>
                  <p className="text-xs text-slate-400">{e.count} exam{e.count > 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {sortedResults.length > 3 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-600" />Score Trend</h3>
            <div className="flex items-end gap-1 h-32">
              {sortedResults.slice(-20).map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600" style={{ height: `${r.score}%`, minHeight: '4px' }} title={`${r.score}%`} />
                  <span className="text-[8px] text-slate-400 rotate-45 origin-left whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : results.length === 0 ? <div className="p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No results yet</p></div> : (
            <table className="w-full">
              <thead className="bg-gray-50"><tr><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Subject</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Exam</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Score</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Grade</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Date</th></tr></thead>
              <tbody>{results.map((r) => (<tr key={r.id} className="border-t hover:bg-gray-50"><td className="py-4 px-6 font-medium text-slate-800">{r.subject?.name || '-'}</td><td className="py-4 px-6 capitalize text-slate-600">{r.exam_type}</td><td className="py-4 px-6"><span className={`font-bold ${r.score >= 70 ? 'text-green-600' : r.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.score}</span></td><td className="py-4 px-6"><span className={`px-2 py-1 rounded text-xs font-medium ${getGradeColor(r.grade)}`}>{r.grade}</span></td><td className="py-4 px-6 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td></tr>))}</tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
