'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, TrendingUp, Award, BookOpen, BarChart3, AlertTriangle, CheckCircle, Clock, ShieldAlert, Brain, FileText } from 'lucide-react';

function ProgressContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const [child, setChild] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [subjectAverages, setSubjectAverages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testAttempts, setTestAttempts] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [homeworkSubs, setHomeworkSubs] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile, childId]);

  async function fetchData() {
    setLoading(true);
    try {
      const childrenRes = await supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)').eq('parent_id', profile?.id);
      if (childrenRes.error) throw new Error(childrenRes.error.message);
      
      if (childrenRes.data?.length) {
        const selectedChild = childId ? childrenRes.data.find(c => c.id === childId) : childrenRes.data[0];
        if (selectedChild) {
          setChild(selectedChild);
          const [resultsRes, attemptsRes, quizRes, homeworkRes] = await Promise.all([
            supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', selectedChild.profile_id).order('created_at', { ascending: false }).limit(50),
            supabase.from('test_attempts').select('*, test:tests!test_id(title)').eq('student_id', selectedChild.profile_id).order('completed_at', { ascending: false }).limit(20),
            supabase.from('quiz_attempts').select('*, quiz:quizzes!quiz_id(title)').eq('student_id', selectedChild.profile_id).order('completed_at', { ascending: false }).limit(20),
            supabase.from('homework_submissions').select('*, homework:homework!homework_id(title, subject:subjects!subject_id(name))').eq('student_id', selectedChild.profile_id).order('submitted_at', { ascending: false }).limit(20),
          ]);
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
          if (attemptsRes.data) setTestAttempts(attemptsRes.data);
          if (quizRes.data) setQuizAttempts(quizRes.data);
          if (homeworkRes.data) setHomeworkSubs(homeworkRes.data);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const scores = results.map(r => r.score);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowest = scores.length > 0 ? Math.min(...scores) : 0;
  const passRate = scores.length > 0 ? Math.round((scores.filter(s => s >= 50).length / scores.length) * 100) : 0;
  const weakAreas = subjectAverages.filter(s => s.average < 50);
  const sortedResults = [...results].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const suspiciousAttempts = testAttempts.filter(a => (a.tab_switches || 0) > 0 || (a.fullscreen_exits || 0) > 0);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>;

  return (
    <DashboardLayout title="Academic Progress" subtitle={child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">Academic Progress</h1>
            <p className="text-slate-500">{child ? `${child.profile?.first_name} ${child.profile?.last_name} • ${child.class?.name || ''}` : ''}</p>
          </div>
        </div>

      {!child ? (
        <div className="bg-white rounded-xl p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500">Average</span><Award size={16} className="text-primary-600" /></div><p className={`text-xl font-bold ${avg >= 70 ? 'text-green-600' : avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avg}%</p></div>
            <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500">Highest</span><TrendingUp size={16} className="text-green-600" /></div><p className="text-xl font-bold text-green-600">{highest}%</p></div>
            <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500">Lowest</span><BookOpen size={16} className="text-red-600" /></div><p className="text-xl font-bold text-red-600">{lowest}%</p></div>
            <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500">Pass Rate</span><CheckCircle size={16} className="text-green-600" /></div><p className={`text-xl font-bold ${passRate >= 70 ? 'text-green-600' : 'text-amber-600'}`}>{passRate}%</p></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card"><div className="flex items-center gap-3"><Brain size={20} className="text-purple-600" /><div><p className="text-xs text-slate-500">Quizzes</p><p className="text-xl font-bold text-slate-900">{quizAttempts.length}</p></div></div></div>
            <div className="card"><div className="flex items-center gap-3"><BookOpen size={20} className="text-blue-600" /><div><p className="text-xs text-slate-500">Tests</p><p className="text-xl font-bold text-slate-900">{testAttempts.length}</p></div></div></div>
            <div className="card"><div className="flex items-center gap-3"><FileText size={20} className="text-amber-600" /><div><p className="text-xs text-slate-500">Homework</p><p className="text-xl font-bold text-slate-900">{homeworkSubs.length}</p></div></div></div>
            <div className="card"><div className="flex items-center gap-3"><Award size={20} className="text-green-600" /><div><p className="text-xs text-slate-500">Results</p><p className="text-xl font-bold text-slate-900">{results.length}</p></div></div></div>
          </div>

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

          {weakAreas.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><AlertTriangle size={18} />Weak Areas</h3>
              <p className="text-sm text-red-700 mb-3">These subjects need extra attention.</p>
              <div className="flex flex-wrap gap-2">{weakAreas.map(s => <span key={s.name} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{s.name} ({s.average}%)</span>)}</div>
            </div>
          )}

          {sortedResults.length > 3 && (
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-primary-600" />Score Trend</h3>
              <div className="flex items-end gap-1 h-24">
                {sortedResults.slice(-20).map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600" style={{ height: `${r.score}%`, minHeight: '4px' }} title={`${r.score}%`} />
                    <span className="text-[7px] text-slate-400 rotate-45 origin-left whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suspiciousAttempts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2"><ShieldAlert size={18} />Exam Monitoring Alerts</h3>
              <p className="text-sm text-amber-700 mb-3">The following test sessions had suspicious activity detected.</p>
              <div className="space-y-2">{suspiciousAttempts.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                  <div><p className="font-medium text-slate-800 text-sm">{a.test?.title || 'Test'}</p><p className="text-xs text-slate-500">{new Date(a.completed_at || a.started_at).toLocaleDateString()}</p></div>
                  <div className="flex gap-3 text-xs">
                    {a.tab_switches > 0 && <span className="flex items-center gap-1 text-amber-700"><Clock size={12} />{a.tab_switches} tab switches</span>}
                    {a.fullscreen_exits > 0 && <span className="flex items-center gap-1 text-amber-700"><ShieldAlert size={12} />{a.fullscreen_exits} fullscreen exits</span>}
                  </div>
                </div>
              ))}</div>
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400" />Recent Activity</h2>
            {(() => {
              const allActivity = [
                ...results.map(r => ({ id: `result-${r.id}`, type: 'result', label: r.subject?.name || 'Subject', detail: `${r.score}%`, date: r.created_at, score: r.score })),
                ...testAttempts.map(t => ({ id: `test-${t.id}`, type: 'test', label: t.test?.title || 'Test', detail: `${t.score}%`, date: t.completed_at || t.started_at, score: t.score })),
                ...quizAttempts.map(q => ({ id: `quiz-${q.id}`, type: 'quiz', label: q.quiz?.title || 'Quiz', detail: `${q.score}%`, date: q.completed_at || q.started_at, score: q.score })),
                ...homeworkSubs.map(h => ({ id: `hw-${h.id}`, type: 'homework', label: h.homework?.title || 'Homework', detail: h.marks != null ? `${h.marks} marks` : 'Submitted', date: h.submitted_at, score: h.marks })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);
              return allActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No activity recorded yet</div>
              ) : (
                <div className="space-y-2">
                  {allActivity.map(a => {
                    const icon = a.type === 'quiz' ? <Brain size={16} /> : a.type === 'test' ? <BookOpen size={16} /> : a.type === 'homework' ? <FileText size={16} /> : <TrendingUp size={16} />;
                    const bg = a.type === 'quiz' ? 'bg-purple-100 text-purple-600' : a.type === 'test' ? 'bg-blue-100 text-blue-600' : a.type === 'homework' ? 'bg-amber-100 text-amber-600' : 'bg-primary-100 text-primary-600';
                    const badge = a.type === 'quiz' ? 'Quiz' : a.type === 'test' ? 'Test' : a.type === 'homework' ? 'HW' : 'Result';
                    const badgeColor = a.type === 'quiz' ? 'bg-purple-100 text-purple-700' : a.type === 'test' ? 'bg-blue-100 text-blue-700' : a.type === 'homework' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700';
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
                          <div><p className="font-medium text-sm text-slate-800">{a.label}</p><p className="text-xs text-slate-500">{new Date(a.date).toLocaleDateString()}</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}>{badge}</span>
                          <span className={`text-sm font-bold ${a.score >= 70 ? 'text-green-600' : a.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{a.detail}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ParentProgressPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>}>
      <ProgressContent />
    </Suspense>
  );
}
