'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  ArrowLeft, Users, BarChart3, Award, AlertCircle, Loader2, 
  Search, FileText, GraduationCap, TrendingUp, BookOpen, Star,
  Download, ChevronDown, ChevronRight, Eye, Clock, Check, X
} from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';

export default function TeacherMockExamsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentAnalytics, setStudentAnalytics] = useState<any>(null);
  const [studentAttempts, setStudentAttempts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [view, setView] = useState<'exams' | 'analytics'>('exams');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchExams();
  }, [profile]);

  async function fetchExams() {
    setLoading(true);
    const { data } = await supabase
      .from('mock_exams')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    if (data) setExams(data);
    setLoading(false);
  }

  async function selectExam(exam: any) {
    setSelectedExam(exam);
    setSelectedStudent(null);
    setView('analytics');
    setLoading(true);

    const { data: attempts } = await supabase
      .from('mock_attempts')
      .select('*, student:profiles!student_id(first_name, last_name, email, id)')
      .eq('exam_id', exam.id)
      .not('completed_at', 'is', null)
      .order('created_at', { ascending: false });

    if (attempts) {
      const studentMap = new Map();
      attempts.forEach((a: any) => {
        const sid = a.student_id;
        if (!studentMap.has(sid)) {
          studentMap.set(sid, { student: a.student, attempts: [] });
        }
        studentMap.get(sid).attempts.push(a);
      });
      setStudents(Array.from(studentMap.values()));

      const scores = attempts.map((a: any) => a.score || 0);
      const total = scores.length;
      const avg = total > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / total) : 0;
      const best = total > 0 ? Math.max(...scores) : 0;
      const passed = scores.filter((s: number) => s >= 50).length;
      setSummary({ total, averageScore: avg, bestScore: best, passRate: total > 0 ? Math.round((passed / total) * 100) : 0 });
    }
    setLoading(false);
  }

  async function viewStudentDetail(student: any) {
    setSelectedStudent(student);
    const { data: analytics } = await supabase
      .from('mock_analytics')
      .select('*')
      .eq('student_id', student.student.id)
      .eq('exam_id', selectedExam?.id)
      .maybeSingle();
    setStudentAnalytics(analytics);
    setStudentAttempts(student.attempts);
  }

  function getGradeColor(pct: number): string {
    if (pct >= 80) return 'text-green-600 dark:text-green-400 dark:text-green-400';
    if (pct >= 60) return 'text-blue-600 dark:text-blue-400 dark:text-blue-400';
    if (pct >= 40) return 'text-amber-600 dark:text-amber-400 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400 dark:text-red-400';
  }

  if (loading && view === 'exams') {
    return (
      <DashboardLayout title="Mock Exams" subtitle="Student Performance">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mock Exams" subtitle="Student Performance Overview">
      <div className="space-y-6">
        {view === 'exams' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">Available Mock Exams</h2>
            </div>
            {exams.length === 0 ? (
              <div className="card text-center py-16">
                <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No mock exams available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map(exam => (
                  <div key={exam.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => selectExam(exam)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white dark:text-white">{exam.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${exam.exam_type === 'JSS3_BECE' ? 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300' : 'bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30 text-purple-700'}`}>
                          {exam.exam_type === 'JSS3_BECE' ? 'JSS3 BECE' : 'SS3 WAEC'}
                        </span>
                      </div>
                      <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />
                    </div>
                    <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
                      <span>{exam.total_questions} questions</span>
                      <span>{exam.duration_minutes} mins</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'analytics' && selectedExam && !selectedStudent && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => { setView('exams'); setSelectedExam(null); }} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">{selectedExam.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{selectedExam.exam_type === 'JSS3_BECE' ? 'JSS3 BECE' : 'SS3 WAEC'} — Class Analytics</p>
              </div>
            </div>

            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Total Students</p><p className="text-2xl font-bold">{summary.total}</p></div>
                <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Average Score</p><p className="text-2xl font-bold text-blue-600 dark:text-blue-400 dark:text-blue-400">{summary.averageScore}%</p></div>
                <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Best Score</p><p className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">{summary.bestScore}%</p></div>
                <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Pass Rate</p><p className="text-2xl font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{summary.passRate}%</p></div>
              </div>
            )}

            <div className="card">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-4 flex items-center gap-2"><Users size={16} /> Students</h3>
              {students.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm text-center py-8">No students have taken this exam yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-100 dark:bg-slate-700 dark:bg-slate-700"><th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Student</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Attempts</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Best Score</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Average</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Latest</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((s: any) => {
                        const scores = s.attempts.map((a: any) => a.score || 0);
                        const best = Math.max(...scores);
                        const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
                        const latest = s.attempts[0].score || 0;
                        return (
                          <tr key={s.student.id}>
                            <td className="p-3 font-medium">{s.student.first_name} {s.student.last_name}</td>
                            <td className="p-3 text-center">{s.attempts.length}</td>
                            <td className={`p-3 text-center font-bold ${getGradeColor(best)}`}>{best}%</td>
                            <td className={`p-3 text-center font-bold ${getGradeColor(avg)}`}>{avg}%</td>
                            <td className={`p-3 text-center font-bold ${getGradeColor(latest)}`}>{latest}%</td>
                            <td className="p-3 text-center">
                              <button onClick={() => viewStudentDetail(s)} className="btn-outline text-xs py-1 px-3 flex items-center gap-1 mx-auto">
                                <Eye size={14} /> View Report
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'analytics' && selectedStudent && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <button onClick={() => { setSelectedStudent(null); }} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
                <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">{selectedStudent.student.first_name} {selectedStudent.student.last_name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{selectedExam.title} — Detailed Report</p>
              </div>
              <a
                href={`/student/mock-exams/report/${selectedStudent.attempts[0]?.id}`}
                target="_blank"
                className="btn-outline ml-auto flex items-center gap-2 text-sm"
              >
                <FileText size={14} /> View Full Report
              </a>
            </div>

            {studentAnalytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Total Attempts</p><p className="text-2xl font-bold">{studentAnalytics.total_attempts}</p></div>
                <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Best Score</p><p className={`text-2xl font-bold ${getGradeColor(studentAnalytics.best_score)}`}>{studentAnalytics.best_score}%</p></div>
                <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Average</p><p className="text-2xl font-bold text-blue-600 dark:text-blue-400 dark:text-blue-400">{studentAnalytics.average_score}%</p></div>
                <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Latest</p><p className={`text-2xl font-bold ${getGradeColor(studentAnalytics.latest_score)}`}>{studentAnalytics.latest_score}%</p></div>
              </div>
            )}

            {studentAnalytics?.weakest_subjects?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 dark:text-red-400 uppercase tracking-wider mb-2">Weakest Subjects</p>
                  {studentAnalytics.weakest_subjects.map((s: string) => <p key={s} className="text-sm text-red-800 dark:text-red-300 dark:text-red-300">• {s}</p>)}
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 dark:border-green-900/40 rounded-xl p-4">
                  <p className="text-xs font-bold text-green-700 dark:text-green-300 dark:text-green-300 uppercase tracking-wider mb-2">Strongest Subjects</p>
                  {studentAnalytics.strongest_subjects.map((s: string) => <p key={s} className="text-sm text-green-800">• {s}</p>)}
                </div>
              </div>
            )}

            {studentAnalytics?.recommended_pathway && (
              <div className="bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 dark:border-blue-900/40 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 dark:text-blue-300 uppercase tracking-wider mb-2">Recommended Pathway</p>
                <p className="text-sm font-bold text-primary-700 dark:text-primary-300 dark:text-primary-300">{studentAnalytics.recommended_pathway}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">{studentAnalytics.pathway_reasoning}</p>
              </div>
            )}

            {/* Attempt History */}
            <div className="card">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-4 flex items-center gap-2"><BarChart3 size={16} /> Attempt History</h3>
              {studentAttempts.length > 0 && (
                <div className="w-full max-w-lg mx-auto mb-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={studentAttempts.map((a, i) => ({ attempt: `#${a.attempt_number}`, score: a.score || 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="attempt" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {studentAttempts.map((_, i) => (
                          <Cell key={i} fill={studentAttempts[i].score >= (selectedExam?.passing_score || 50) ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-100 dark:bg-slate-700 dark:bg-slate-700"><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Attempt</th><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Score</th><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Mastery</th><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Time</th><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Date</th><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-400">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentAttempts.map((a: any) => (
                      <tr key={a.id}>
                        <td className="p-2 text-center font-medium">#{a.attempt_number}</td>
                        <td className={`p-2 text-center font-bold ${getGradeColor(a.score)}`}>{a.score}%</td>
                        <td className="p-2 text-center">{a.mastery_level || '—'}</td>
                        <td className="p-2 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">{a.time_taken_seconds ? `${Math.floor(a.time_taken_seconds / 60)}m` : '—'}</td>
                        <td className="p-2 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400">{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '—'}</td>
                        <td className="p-2 text-center">
                          <a href={`/student/mock-exams/report/${a.id}`} target="_blank" className="text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:underline text-xs">View</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
