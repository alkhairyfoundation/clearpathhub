'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Award, TrendingUp, BookOpen, Calendar } from 'lucide-react';

export default function StudentResultsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ avg: 0, highest: 0, lowest: 0, total: 0 });

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('results').select('*, subject:subjects(*)').eq('student_id', profile?.id).order('created_at', { ascending: false });
    if (data) {
      setResults(data);
      if (data.length > 0) {
        const scores = data.map(r => r.score);
        setStats({ avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), highest: Math.max(...scores), lowest: Math.min(...scores), total: data.length });
      }
    }
    setLoading(false);
  }

  function getGradeColor(grade: string) {
    if (grade?.includes('A')) return 'bg-green-100 text-green-700';
    if (grade?.includes('B')) return 'bg-blue-100 text-blue-700';
    if (grade?.includes('C')) return 'bg-yellow-100 text-yellow-700';
    if (grade?.includes('F')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">My Results</h1><p className="text-slate-500">View your academic performance</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Average</span><Award className="text-blue-600" size={18} /></div><p className="text-2xl font-bold text-slate-800">{stats.avg}%</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Highest</span><TrendingUp className="text-green-600" size={18} /></div><p className="text-2xl font-bold text-green-600">{stats.highest}%</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Lowest</span><BookOpen className="text-red-600" size={18} /></div><p className="text-2xl font-bold text-red-600">{stats.lowest}%</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Exams</span><Calendar className="text-purple-600" size={18} /></div><p className="text-2xl font-bold text-slate-800">{stats.total}</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : results.length === 0 ? <div className="p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No results yet</p></div> : (
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Subject</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Exam</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Score</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Grade</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Date</th></tr></thead>
            <tbody>{results.map((r) => (<tr key={r.id} className="border-t"><td className="py-4 px-6 font-medium text-slate-800">{r.subject?.name || '-'}</td><td className="py-4 px-6 capitalize text-slate-600">{r.exam_type}</td><td className="py-4 px-6">{r.score}</td><td className="py-4 px-6"><span className={`px-2 py-1 rounded text-xs font-medium ${getGradeColor(r.grade)}`}>{r.grade}</span></td><td className="py-4 px-6 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td></tr>))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}