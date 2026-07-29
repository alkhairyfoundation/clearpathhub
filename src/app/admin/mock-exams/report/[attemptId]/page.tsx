'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Download, Loader2, Check, X, Award, AlertCircle, BookOpen, GraduationCap, Clock, FileText, BarChart3, TrendingUp, Brain, Lightbulb, Printer } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import { generateMockReportPdf } from '@/lib/mock-report-pdf';

type QuestionDetail = {
  question_index: number;
  question: string;
  question_type: string;
  subject: string;
  difficulty_level: string;
  topic: string;
  correct_answer: any;
  given_answer: any;
  is_correct: boolean;
  points: number;
  points_earned: number;
  options?: string[];
  explanation?: string;
};

export default function AdminMockExamReportPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const attemptId = params?.attemptId as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [questionsData, setQuestionsData] = useState<QuestionDetail[]>([]);
  const [bySubject, setBySubject] = useState<Record<string, { correct: number; total: number }>>({});
  const [byDifficulty, setByDifficulty] = useState<Record<string, { correct: number; total: number }>>({});
  const [byTopic, setByTopic] = useState<Record<string, { correct: number; total: number }>>({});
  const [allAttempts, setAllAttempts] = useState<any[]>([]);
  const [cumulativeAnalytics, setCumulativeAnalytics] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  const score = attempt?.score || 0;
  const passingScore = exam?.passing_score || 50;
  const passed = score >= passingScore;
  const totalQ = questionsData.length;
  const correctQ = questionsData.filter(q => q.is_correct).length;
  const wrongQ = totalQ - correctQ;
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) { router.push('/login'); return; }
    if (attemptId) fetchData();
  }, [profile, attemptId]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const { data: attemptData, error: attemptErr } = await supabase
        .from('mock_attempts')
        .select('*, exam:mock_exams(*)')
        .eq('id', attemptId)
        .single();

      if (attemptErr || !attemptData) { setError('Attempt not found'); setLoading(false); return; }

      setAttempt(attemptData);
      setExam(attemptData.exam);

      const { data: studentData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', attemptData.student_id)
        .single();
      setStudent(studentData);

      const { data: settingsRes } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
      setSchoolSettings(settingsRes);

      const { data: analyticsData } = await supabase
        .from('mock_analytics')
        .select('*')
        .eq('student_id', attemptData.student_id)
        .eq('exam_id', attemptData.exam_id)
        .maybeSingle();
      setCumulativeAnalytics(analyticsData);

      const { data: allAtts } = await supabase
        .from('mock_attempts')
        .select('*')
        .eq('student_id', attemptData.student_id)
        .eq('exam_id', attemptData.exam_id)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: true });
      setAllAttempts(allAtts || []);

      if (attemptData.topic_mastery) {
        const tp = typeof attemptData.topic_mastery === 'string' ? JSON.parse(attemptData.topic_mastery) : attemptData.topic_mastery;
        setQuestionsData(tp.questions || []);
        setBySubject(tp.by_subject || {});
        setByDifficulty(tp.by_difficulty || {});
        setByTopic(tp.by_topic || {});
      } else if (attemptData.answers) {
        const answers = typeof attemptData.answers === 'string' ? JSON.parse(attemptData.answers) : attemptData.answers;
        if (Array.isArray(answers)) {
          setQuestionsData(answers);
          const bs: Record<string, { correct: number; total: number }> = {};
          const bd: Record<string, { correct: number; total: number }> = {};
          const bt: Record<string, { correct: number; total: number }> = {};
          answers.forEach((a: any) => {
            const s = a.subject || 'UNSPECIFIED';
            const d = a.difficulty_level || 'UNSPECIFIED';
            const t = a.topic || 'General';
            if (!bs[s]) bs[s] = { correct: 0, total: 0 };
            bs[s].total++; if (a.is_correct) bs[s].correct++;
            if (!bd[d]) bd[d] = { correct: 0, total: 0 };
            bd[d].total++; if (a.is_correct) bd[d].correct++;
            if (!bt[t]) bt[t] = { correct: 0, total: 0 };
            bt[t].total++; if (a.is_correct) bt[t].correct++;
          });
          setBySubject(bs); setByDifficulty(bd); setByTopic(bt);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  function getGradeColor(pct: number): string {
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 60) return 'text-blue-600 dark:text-blue-400';
    if (pct >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getLetterGrade(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  }

  function getLetterGradeColor(pct: number): string {
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 70) return 'text-blue-600 dark:text-blue-400';
    if (pct >= 60) return 'text-amber-600 dark:text-amber-400';
    if (pct >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  }

  const radarData = Object.entries(bySubject)
    .filter(([_, d]) => d.total > 0)
    .map(([subject, d]) => ({
      subject,
      score: Math.round((d.correct / d.total) * 100),
      fullMark: 100,
    }));

  const progressData = allAttempts.map((a, i) => ({
    attempt: i + 1 === allAttempts.length ? `Latest (#${a.attempt_number})` : `#${a.attempt_number}`,
    score: a.score || 0,
  }));

  const subjectEntries = Object.entries(bySubject);
  const difficultyEntries = Object.entries(byDifficulty);
  const topicEntries = Object.entries(byTopic);

  function getBarColor(pct: number): string {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  }

  function formatAnswer(q: QuestionDetail): string {
    if (q.options && Array.isArray(q.options) && typeof q.given_answer === 'number' && q.options[q.given_answer]) {
      return `${q.given_answer + 1}. ${q.options[q.given_answer]}`;
    }
    if ((q.question_type === 'TRUE_FALSE' || q.question_type === 'true_false') && typeof q.given_answer === 'number') {
      return q.given_answer === 0 ? 'True' : 'False';
    }
    return String(q.given_answer ?? '—');
  }

  function formatCorrectAnswer(q: QuestionDetail): string {
    if (q.options && Array.isArray(q.options) && typeof q.correct_answer === 'number' && q.options[q.correct_answer]) {
      return `${q.correct_answer + 1}. ${q.options[q.correct_answer]}`;
    }
    if ((q.question_type === 'TRUE_FALSE' || q.question_type === 'true_false') && typeof q.correct_answer === 'number') {
      return q.correct_answer === 0 ? 'True' : 'False';
    }
    return String(q.correct_answer ?? '—');
  }

  async function downloadPDF() {
    if (!attempt || !exam) return;
    setDownloading(true);
    try {
      const enriched = { ...attempt, student: student || {}, exam };
      const doc = generateMockReportPdf(enriched, schoolSettings?.school_name);
      doc.save(`Mock_Exam_Report_${student?.first_name || 'Student'}_${exam?.title || 'Exam'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <DashboardLayout title="Mock Exam Report" subtitle="Loading...">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Report" subtitle="Error">
        <div className="card text-center py-16">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <Link href="/admin/mock-exams" className="btn-outline mt-4 inline-flex items-center gap-2"><ArrowLeft size={16} /> Back to Mock Exams</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mock Exam Report" subtitle={`${exam?.title || ''} — ${student?.first_name || ''} ${student?.last_name || ''}`}>
      <div className="space-y-6" ref={printRef}>
        {/* Header actions */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Link href="/admin/mock-exams" className="p-2 hover:bg-slate-100 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mock Exam Report</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{exam?.title} — {student?.first_name} {student?.last_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadPDF} disabled={downloading} className="btn-primary flex items-center gap-2">
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download PDF
            </button>
            <button onClick={handlePrint} className="btn-outline flex items-center gap-2">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>

        {/* Score Overview */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-200 text-sm">Exam Score — {exam?.exam_type === 'JSS3_BECE' ? 'JSS3 BECE' : 'SS3 WAEC'}</p>
              <p className="text-5xl font-bold">{score}%</p>
              <p className="text-primary-200 text-sm mt-1">{exam?.title}</p>
              <p className="text-primary-200 text-xs mt-1">{student?.first_name} {student?.last_name} — Attempt #{attempt?.attempt_number}</p>
            </div>
            <div className="text-right">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-2 ${passed ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                {passed ? <Check size={40} className="text-green-300" /> : <X size={40} className="text-red-300" />}
              </div>
              <p className="text-sm font-semibold">{passed ? 'PASSED' : 'FAILED'}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400">Total Questions</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{totalQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400">Correct</p><p className="text-2xl font-bold text-green-600 dark:text-green-400">{correctQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400">Wrong</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{wrongQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500 dark:text-slate-400">Grade</p><p className={`text-2xl font-bold ${getLetterGradeColor(accuracy)}`}>{getLetterGrade(accuracy)}</p></div>
        </div>

        {/* Time + Mastery + Pathway */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {attempt?.time_taken_seconds && (
            <div className="card flex items-center gap-3">
              <Clock size={20} className="text-primary-600 dark:text-primary-400" />
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Time Taken</p><p className="text-lg font-bold text-slate-900 dark:text-white">{Math.floor(attempt.time_taken_seconds / 60)}m {attempt.time_taken_seconds % 60}s</p></div>
            </div>
          )}
          {attempt?.mastery_level && (
            <div className="card flex items-center gap-3">
              <Award size={20} className={`${attempt.mastery_level === 'MASTERED' ? 'text-green-600' : attempt.mastery_level === 'PROFICIENT' ? 'text-blue-600' : attempt.mastery_level === 'EXCELLENT' ? 'text-primary-600' : attempt.mastery_level === 'GOOD' ? 'text-amber-600' : 'text-red-600'}`} />
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Mastery Level</p><p className="text-lg font-bold text-slate-900 dark:text-white">{attempt.mastery_level}</p></div>
            </div>
          )}
          {attempt?.security_events && Array.isArray(attempt.security_events) && attempt.security_events.length > 0 && (
            <div className="card flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-600" />
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Security Events</p><p className="text-lg font-bold text-amber-600">{attempt.security_events.length}</p></div>
            </div>
          )}
          {cumulativeAnalytics?.recommended_pathway && (
            <div className="card flex items-center gap-3">
              <TrendingUp size={20} className="text-purple-600" />
              <div><p className="text-xs text-slate-500 dark:text-slate-400">Recommended Pathway</p><p className="text-lg font-bold text-purple-600">{cumulativeAnalytics.recommended_pathway}</p></div>
            </div>
          )}
        </div>

        {/* Progress Over Time */}
        {progressData.length > 1 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><TrendingUp size={16} /> Progress Over Attempts</h3>
            <div className="w-full max-w-lg mx-auto">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="attempt" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {progressData.map((entry, index) => (
                      <Cell key={index} fill={entry.score >= (exam?.passing_score || 50) ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Subject Performance Radar Chart */}
        {radarData.length >= 3 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><BarChart3 size={16} /> Subject Performance Radar</h3>
            <div className="w-full max-w-md mx-auto">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Score" dataKey="score" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.2} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Subject Performance Table */}
        {subjectEntries.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><BookOpen size={16} /> Subject Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100 dark:bg-slate-700"><th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Subject</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Correct</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Total</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Score</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Grade</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Bar</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Assessment</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {subjectEntries.map(([subj, d]: [string, any]) => {
                    const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                    return (
                      <tr key={subj}>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{subj}</td>
                        <td className="p-3 text-center text-slate-700 dark:text-slate-300">{d.correct}</td>
                        <td className="p-3 text-center text-slate-700 dark:text-slate-300">{d.total}</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(pct)}`}>{pct}%</td>
                        <td className="p-3 text-center"><span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getLetterGradeColor(pct)}`}>{getLetterGrade(pct)}</span></td>
                        <td className="p-3"><div className="w-20 h-2 bg-slate-100 dark:bg-slate-600 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} /></div></td>
                        <td className={`p-3 text-center font-semibold ${getGradeColor(pct)}`}>{pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Horizontal bar chart overview */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Subject Performance Overview</p>
              <div className="space-y-2">
                {[...subjectEntries].map(([n, d]: [string, any]) => {
                  const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                  const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <div key={n} className="flex items-center gap-3">
                      <span className="w-24 text-xs text-slate-700 dark:text-slate-300 text-right truncate shrink-0">{n}</span>
                      <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`w-10 text-xs font-bold text-right ${getGradeColor(pct)}`}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Difficulty Breakdown */}
        {difficultyEntries.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Award size={16} /> Difficulty Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100 dark:bg-slate-700"><th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Difficulty</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Correct</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Total</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Score</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Bar</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Verdict</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {difficultyEntries.map(([diff, d]: [string, any]) => {
                    const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                    return (
                      <tr key={diff}>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{diff}</td>
                        <td className="p-3 text-center text-slate-700 dark:text-slate-300">{d.correct}</td>
                        <td className="p-3 text-center text-slate-700 dark:text-slate-300">{d.total}</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(pct)}`}>{pct}%</td>
                        <td className="p-3"><div className="w-20 h-2 bg-slate-100 dark:bg-slate-600 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} /></div></td>
                        <td className={`p-3 text-center font-semibold ${getGradeColor(pct)}`}>{pct >= 70 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Performance Insights */}
        {(() => {
          const sorted = [...subjectEntries].map(([n, d]: [string, any]) => ({ n, p: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 })).filter(s => s.p > 0).sort((a, b) => b.p - a.p);
          const weakSubj = sorted.filter(s => s.p < 40);
          const weakDiff = [...difficultyEntries].filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
          const weakTop = [...topicEntries].filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
          if (sorted.length === 0 && weakDiff.length === 0 && weakTop.length === 0) return null;
          return (
            <div className="card">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Lightbulb size={16} /> Performance Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sorted.length >= 2 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 rounded-lg p-4">
                    <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-2">Strengths</p>
                    {sorted.slice(0, 2).map(s => (
                      <p key={s.n} className="text-sm text-green-800 dark:text-green-300"><span className="font-semibold">{s.n}</span> — {s.p}%</p>
                    ))}
                  </div>
                )}
                {(weakSubj.length > 0 || weakDiff.length > 0) && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-4">
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">Needs Improvement</p>
                    {weakSubj.map(s => <p key={s.n} className="text-sm text-red-800 dark:text-red-300">{s.n}: {s.p}%</p>)}
                    {weakDiff.slice(0, 2).map(([d, dd]: [string, any]) => <p key={d} className="text-sm text-red-800 dark:text-red-300">{d}: {Math.round((dd.correct / dd.total) * 100)}%</p>)}
                  </div>
                )}
                {weakTop.length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/40 rounded-lg p-4">
                    <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-2">Topics to Focus On</p>
                    {weakTop.slice(0, 3).map(([t, td]: [string, any]) => (
                      <p key={t} className="text-sm text-purple-800 dark:text-purple-300">{t}: {Math.round((td.correct / td.total) * 100)}%</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Per-Question Analysis */}
        {questionsData.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><FileText size={16} /> Per-Question Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100 dark:bg-slate-700"><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300 text-xs">#</th><th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300 text-xs">Subject</th><th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300 text-xs">Question</th><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300 text-xs">Diff</th><th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300 text-xs">Correct Answer</th><th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300 text-xs">Student Answer</th><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300 text-xs">Result</th><th className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300 text-xs">Pts</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {questionsData.map((q, i) => (
                    <tr key={i} className={q.is_correct ? '' : 'bg-red-50 dark:bg-red-900/10'}>
                      <td className="p-2 text-center text-slate-400 dark:text-slate-500">{i + 1}</td>
                      <td className="p-2 text-xs text-slate-700 dark:text-slate-300">{q.subject || '—'}</td>
                      <td className="p-2 text-xs max-w-[200px] truncate text-slate-900 dark:text-white" title={q.question}>{q.question}</td>
                      <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-400">{q.difficulty_level || '—'}</td>
                      <td className="p-2 text-xs text-green-700 dark:text-green-400 font-medium">{formatCorrectAnswer(q)}</td>
                      <td className={`p-2 text-xs font-medium ${q.is_correct ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatAnswer(q)}</td>
                      <td className="p-2 text-center">{q.is_correct ? <Check size={16} className="text-green-500 inline" /> : <X size={16} className="text-red-500 inline" />}</td>
                      <td className="p-2 text-center text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-0.5">
                          {Array.from({ length: q.points || 1 }).map((_, di) => (
                            <span key={di} className={`w-2 h-2 rounded-full inline-block ${di < (q.points_earned || 0) ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600'}`} />
                          ))}
                          <span className="ml-1">{(q.points_earned || 0)}/{(q.points || 1)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Topic Performance */}
        {topicEntries.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><GraduationCap size={16} /> Topic Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100 dark:bg-slate-700"><th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Topic</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Correct</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Total</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Score</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Bar</th><th className="p-3 text-center font-semibold text-slate-600 dark:text-slate-300">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {topicEntries.map(([topic, d]: [string, any]) => {
                    const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                    return (
                      <tr key={topic}>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{topic}</td>
                        <td className="p-3 text-center text-slate-700 dark:text-slate-300">{d.correct}</td>
                        <td className="p-3 text-center text-slate-700 dark:text-slate-300">{d.total}</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(pct)}`}>{pct}%</td>
                        <td className="p-3"><div className="w-20 h-2 bg-slate-100 dark:bg-slate-600 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} /></div></td>
                        <td className={`p-3 text-center font-semibold ${getGradeColor(pct)}`}>{pct >= 80 ? 'Mastered' : pct >= 60 ? 'Good' : pct >= 40 ? 'Developing' : 'Needs Work'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pathway Recommendation */}
        {cumulativeAnalytics?.recommended_pathway && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><Lightbulb size={16} className="text-blue-600" /> Pathway Recommendation</h3>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-primary-700 dark:text-primary-400">{cumulativeAnalytics.recommended_pathway}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">Track</span>
            </div>
            {cumulativeAnalytics.pathway_reasoning && <p className="text-sm text-slate-700 dark:text-slate-300">{cumulativeAnalytics.pathway_reasoning}</p>}
          </div>
        )}

        {/* Recommendations */}
        {(() => {
          const weakSubj = subjectEntries.filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.5).map(([s]) => s);
          const weakTop = topicEntries.filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.4).map(([t]) => t);
          if (weakSubj.length === 0 && weakTop.length === 0) return null;
          return (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-900/40 rounded-xl p-6">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2"><AlertCircle size={16} className="text-orange-600" /> Recommendations for Improvement</h3>
              <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
                {weakSubj.length > 0 && (
                  <p className="flex gap-2"><span className="text-orange-500 font-bold mt-0.5">•</span><span>Weak Subjects: <strong>{weakSubj.join(', ')}</strong>. Focused study in these areas is strongly advised.</span></p>
                )}
                {weakTop.length > 0 && (
                  <p className="flex gap-2"><span className="text-orange-500 font-bold mt-0.5">•</span><span>Topics requiring attention: <strong>{weakTop.join(', ')}</strong>. Targeted revision in these areas will significantly improve performance.</span></p>
                )}
                <p className="flex gap-2"><span className="text-orange-500 font-bold mt-0.5">•</span><span>Accuracy Rate: {accuracy}% ({correctQ}/{totalQ} questions answered correctly).</span></p>
              </div>
            </div>
          );
        })()}

        {/* Print footer */}
        <div className="hidden print:block text-center text-xs text-slate-400 mt-8 pt-4 border-t">
          <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} — ClearPath Edu Hub Admin Portal</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
