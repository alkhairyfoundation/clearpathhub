'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, TrendingUp, Award, BookOpen, BarChart3, AlertTriangle,
  CheckCircle, Clock, ShieldAlert, Brain, FileText, UserCheck, Activity,
  ChevronDown, Calendar, Download, Flame, TrendingDown, Minus
} from 'lucide-react';

function ProgressContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const [child, setChild] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [results, setResults] = useState<any[]>([]);
  const [testAttempts, setTestAttempts] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [homeworkSubs, setHomeworkSubs] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [behaviorReports, setBehaviorReports] = useState<any[]>([]);
  const [learningStreak, setLearningStreak] = useState<any>(null);
  const [practiceSessions, setPracticeSessions] = useState<any[]>([]);

  const [terms, setTerms] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchInitial();
  }, [profile]);

  useEffect(() => {
    if (child) fetchData();
  }, [child, selectedPeriod, customStart, customEnd]);

  async function fetchInitial() {
    setLoading(true);
    try {
      const childrenRes = await supabase
        .from('students')
        .select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)')
        .eq('parent_id', profile?.id);
      if (childrenRes.error) throw new Error(childrenRes.error.message);
      setChildren(childrenRes.data || []);

      const { data: termsData } = await supabase.from('terms').select('*').order('start_date', { ascending: false });
      setTerms(termsData || []);

      if (childrenRes.data?.length) {
        const selected = childId
          ? childrenRes.data.find((c: any) => c.id === childId)
          : childrenRes.data[0];
        if (selected) setChild(selected);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function fetchData() {
    setLoading(true);
    if (!child) return;
    try {
      const pid = child.profile_id;
      let dateFilter = '';
      if (selectedPeriod === 'current_term') {
        const ct = terms.find(t => t.is_current);
        if (ct) { dateFilter = `gte.${ct.start_date},lte.${ct.end_date}`; }
      } else if (selectedPeriod === 'last_term') {
        const past = terms.filter(t => !t.is_current);
        if (past.length > 0) {
          const lt = past[0];
          dateFilter = `gte.${lt.start_date},lte.${lt.end_date}`;
        }
      } else if (selectedPeriod === 'custom' && customStart && customEnd) {
        dateFilter = `gte.${customStart},lte.${customEnd}`;
      }

      const baseQuery = (table: string) => {
        let q = supabase.from(table).select('*');
        if (table === 'results') q = supabase.from(table).select('*, subject:subjects!subject_id(name)');
        if (table === 'quiz_attempts') q = supabase.from(table).select('*, quiz:quizzes!quiz_id(title)');
        if (table === 'test_attempts') q = supabase.from(table).select('*, test:tests!test_id(title)');
        if (table === 'homework_submissions') q = supabase.from(table).select('*, homework:homework!homework_id(title, subject:subjects!subject_id(name))');
        return q;
      };

      const [resR, attR, behR, quizR, testR, hwR, streakR, pracR] = await Promise.all([
        baseQuery('results').eq('student_id', pid).order('created_at', { ascending: false }),
        supabase.from('attendance').select('*').eq('student_id', pid).order('date', { ascending: false }),
        supabase.from('behavioral_reports').select('*, teacher:profiles!entered_by(first_name, last_name)').eq('student_id', pid).order('created_at', { ascending: false }),
        baseQuery('quiz_attempts').eq('student_id', pid).order('completed_at', { ascending: false }),
        baseQuery('test_attempts').eq('student_id', pid).order('completed_at', { ascending: false }),
        baseQuery('homework_submissions').eq('student_id', pid).order('submitted_at', { ascending: false }),
        supabase.from('learning_streaks').select('*').eq('student_id', pid).maybeSingle(),
        supabase.from('practice_sessions').select('*').eq('student_id', pid).order('created_at', { ascending: false }),
      ]);

      if (dateFilter) {
        const parts = dateFilter.split(',');
        const gte = parts[0].replace('gte.', '');
        const lte = parts[1].replace('lte.', '');
        const filterResults = (data: any[], dateField: string) =>
          data?.filter((r: any) => {
            const d = new Date(r[dateField]);
            return d >= new Date(gte) && d <= new Date(lte + 'T23:59:59');
          }) || [];

        setResults(filterResults(resR.data || [], 'created_at'));
        setAttendanceRecords(filterResults(attR.data || [], 'date'));
        setBehaviorReports(filterResults(behR.data || [], 'created_at'));
        setQuizAttempts(filterResults(quizR.data || [], 'completed_at'));
        setTestAttempts(filterResults(testR.data || [], 'completed_at'));
        setHomeworkSubs(filterResults(hwR.data || [], 'submitted_at'));
      } else {
        setResults(resR.data || []);
        setAttendanceRecords(attR.data || []);
        setBehaviorReports(behR.data || []);
        setQuizAttempts(quizR.data || []);
        setTestAttempts(testR.data || []);
        setHomeworkSubs(hwR.data || []);
      }
      if (streakR.data) setLearningStreak(streakR.data);
      setPracticeSessions(pracR.data || []);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  function switchChild(id: string) {
    const c = children.find(ch => ch.id === id);
    if (c) setChild(c);
  }

  const subjectAverages = useMemo(() => {
    const map: Record<string, { name: string; scores: number[]; dates: string[] }> = {};
    results.forEach(r => {
      const name = r.subject?.name || 'Unknown';
      if (!map[name]) map[name] = { name, scores: [], dates: [] };
      map[name].scores.push(r.score);
      map[name].dates.push(r.created_at);
    });
    return Object.values(map).map(s => ({
      name: s.name,
      average: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
      scores: s.scores,
      dates: s.dates,
      count: s.scores.length,
    }));
  }, [results]);

  const overallAvg = useMemo(() => {
    const all = results.map(r => r.score);
    return all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
  }, [results]);

  const allScores = useMemo(() => results.map(r => r.score), [results]);
  const highest = allScores.length ? Math.max(...allScores) : 0;
  const lowest = allScores.length ? Math.min(...allScores) : 0;
  const passRate = allScores.length ? Math.round((allScores.filter(s => s >= 50).length / allScores.length) * 100) : 0;

  const gradeDistribution = useMemo(() => {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    allScores.forEach(s => {
      if (s >= 80) grades.A++;
      else if (s >= 70) grades.B++;
      else if (s >= 60) grades.C++;
      else if (s >= 50) grades.D++;
      else grades.F++;
    });
    return grades;
  }, [allScores]);

  const bestSubject = useMemo(() => {
    if (!subjectAverages.length) return null;
    return subjectAverages.reduce((a, b) => a.average > b.average ? a : b);
  }, [subjectAverages]);

  const worstSubject = useMemo(() => {
    if (!subjectAverages.length) return null;
    return subjectAverages.reduce((a, b) => a.average < b.average ? a : b);
  }, [subjectAverages]);

  const weakAreas = useMemo(() => subjectAverages.filter(s => s.average < 50), [subjectAverages]);

  const monthAttendance = useMemo(() => {
    const map: Record<string, { present: number; total: number }> = {};
    attendanceRecords.forEach(a => {
      if (!a.date) return;
      const month = a.date.substring(0, 7);
      if (!map[month]) map[month] = { present: 0, total: 0 };
      map[month].total++;
      if (a.status === 'present') map[month].present++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({ month, rate: Math.round((data.present / data.total) * 100) }));
  }, [attendanceRecords]);

  const behaviorTrend = useMemo(() => {
    return behaviorReports
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-10)
      .map(b => ({ label: new Date(b.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' }), rating: b.rating }));
  }, [behaviorReports]);

  const hwCompletionRate = useMemo(() => {
    if (!homeworkSubs.length) return 0;
    const withMarks = homeworkSubs.filter(h => h.marks != null);
    return withMarks.length ? Math.round((withMarks.filter(h => (h.marks as number) >= 0).length / homeworkSubs.length) * 100) : 0;
  }, [homeworkSubs]);

  const scoreTrend = useMemo(() => {
    const sorted = [...results].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return sorted.slice(-20);
  }, [results]);

  const trendDirection = useMemo(() => {
    if (scoreTrend.length < 4) return 'stable';
    const half = Math.floor(scoreTrend.length / 2);
    const firstHalf = scoreTrend.slice(0, half).reduce((s, r) => s + r.score, 0) / half;
    const secondHalf = scoreTrend.slice(-half).reduce((s, r) => s + r.score, 0) / half;
    if (secondHalf > firstHalf + 3) return 'up';
    if (secondHalf < firstHalf - 3) return 'down';
    return 'stable';
  }, [scoreTrend]);

  const decliningSubjects = useMemo(() => {
    return subjectAverages.filter(s => {
      if (s.scores.length < 3) return false;
      const recent = s.scores.slice(-3);
      return recent[0] > recent[1] && recent[1] > recent[2];
    });
  }, [subjectAverages]);

  const suspiciousAttempts = testAttempts.filter(a => (a.tab_switches || 0) > 0 || (a.fullscreen_exits || 0) > 0);

  const sortedResults = [...results].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  function SVGLineChart({ data, height = 100, color = '#1e3a5f' }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
    if (data.length < 2) return null;
    const width = Math.max(data.length * 50, 200);
    const maxVal = Math.max(...data.map(d => d.value), 10);
    const minVal = Math.min(...data.map(d => d.value), 0);
    const range = maxVal - minVal || 1;
    const padding = 20;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const points = data.map((d, i) => ({
      x: padding + (i / (data.length - 1)) * chartW,
      y: padding + chartH - ((d.value - minVal) / range) * chartH,
      ...d,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="2" />
            <text x={p.x} y={height - 2} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.label}</text>
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill={color} fontWeight="bold">{p.value}%</text>
          </g>
        ))}
      </svg>
    );
  }

  if (loading && !child) {
    return (
      <DashboardLayout title="Analytics" subtitle="Comprehensive performance analysis">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics" subtitle={child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Analytics</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm">Comprehensive performance analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {children.length > 1 && (
              <select
                value={child?.id || ''}
                onChange={e => switchChild(e.target.value)}
                className="input py-2 text-sm"
              >
                {children.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.profile?.first_name} {c.profile?.last_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {!child ? (
          <div className="bg-white rounded-xl p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No children linked to your account</p></div>
        ) : (
          <>
            {/* Time Period Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setSelectedPeriod('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 dark:border-slate-700'}`}>All Time</button>
              <button onClick={() => setSelectedPeriod('current_term')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'current_term' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 dark:border-slate-700'}`}>This Term</button>
              <button onClick={() => setSelectedPeriod('last_term')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'last_term' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 dark:border-slate-700'}`}>Last Term</button>
              <button onClick={() => setSelectedPeriod('custom')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === 'custom' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 dark:border-slate-700'}`}>Custom Range</button>
              {selectedPeriod === 'custom' && (
                <div className="flex items-center gap-2">
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input py-1.5 text-sm" />
                  <span className="text-slate-400 dark:text-slate-500 dark:text-slate-500">to</span>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input py-1.5 text-sm" />
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
            ) : (
              <>
                {/* Performance Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Overall Average</span>
                      {trendDirection === 'up' ? <TrendingUp size={14} className="text-green-600 dark:text-green-400 dark:text-green-400" /> : trendDirection === 'down' ? <TrendingDown size={14} className="text-red-600 dark:text-red-400 dark:text-red-400" /> : <Minus size={14} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />}
                    </div>
                    <p className={`text-xl font-bold ${overallAvg >= 70 ? 'text-green-600 dark:text-green-400 dark:text-green-400' : overallAvg >= 50 ? 'text-amber-600 dark:text-amber-400 dark:text-amber-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>{overallAvg}%</p>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-1"><Award size={14} className="text-green-600 dark:text-green-400 dark:text-green-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Best Subject</span></div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 truncate" title={bestSubject?.name}>{bestSubject?.name || 'N/A'}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 dark:text-green-400">{bestSubject?.average || 0}%</p>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-red-600 dark:text-red-400 dark:text-red-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Weakest</span></div>
                    <p className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 truncate" title={worstSubject?.name}>{worstSubject?.name || 'N/A'}</p>
                    <p className="text-xs text-red-600 dark:text-red-400 dark:text-red-400">{worstSubject?.average || 0}%</p>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-1"><CheckCircle size={14} className="text-green-600 dark:text-green-400 dark:text-green-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Pass Rate</span></div>
                    <p className={`text-xl font-bold ${passRate >= 70 ? 'text-green-600 dark:text-green-400 dark:text-green-400' : 'text-amber-600 dark:text-amber-400 dark:text-amber-400'}`}>{passRate}%</p>
                  </div>
                  <div className="card">
                    <div className="flex items-center gap-2 mb-1"><Flame size={14} className="text-orange-600 dark:text-orange-400 dark:text-orange-400" /><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Streak</span></div>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400 dark:text-orange-400">{learningStreak?.current_streak || 0}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">best: {learningStreak?.longest_streak || 0}</p>
                  </div>
                </div>

                {/* Grade Distribution + Subject Averages */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="card lg:col-span-1">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Grade Distribution</h2>
                    <div className="space-y-3">
                      {[
                        { grade: 'A', range: '≥80%', count: gradeDistribution.A, color: 'bg-green-500', max: Math.max(...Object.values(gradeDistribution), 1) },
                        { grade: 'B', range: '70-79%', count: gradeDistribution.B, color: 'bg-blue-500', max: Math.max(...Object.values(gradeDistribution), 1) },
                        { grade: 'C', range: '60-69%', count: gradeDistribution.C, color: 'bg-yellow-500', max: Math.max(...Object.values(gradeDistribution), 1) },
                        { grade: 'D', range: '50-59%', count: gradeDistribution.D, color: 'bg-orange-500', max: Math.max(...Object.values(gradeDistribution), 1) },
                        { grade: 'F', range: '<50%', count: gradeDistribution.F, color: 'bg-red-500', max: Math.max(...Object.values(gradeDistribution), 1) },
                      ].map(g => (
                        <div key={g.grade} className="flex items-center gap-3">
                          <span className="w-6 font-bold text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">{g.grade}</span>
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                            <div className={`h-full ${g.color} rounded-full transition-all`} style={{ width: `${(g.count / g.max) * 100}%` }} />
                          </div>
                          <span className="w-8 text-right text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{g.count}</span>
                          <span className="w-12 text-right text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{g.range}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card lg:col-span-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><BookOpen size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Subject Performance</h2>
                    {subjectAverages.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400 dark:text-slate-400">No results recorded</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-slate-500 dark:text-slate-400 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700">
                              <th className="pb-2 font-medium">Subject</th>
                              <th className="pb-2 font-medium text-right">Average</th>
                              <th className="pb-2 font-medium text-right">Grade</th>
                              <th className="pb-2 font-medium text-right">Trend</th>
                              <th className="pb-2 font-medium text-right">Scores</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...subjectAverages].sort((a, b) => b.average - a.average).map((s, i) => {
                              const trend = s.scores.length >= 3
                                ? (s.scores.slice(-1)[0] > s.scores.slice(-3)[0] ? 'up' : s.scores.slice(-1)[0] < s.scores.slice(-3)[0] ? 'down' : 'stable')
                                : 'stable';
                              const grade = s.average >= 80 ? 'A' : s.average >= 70 ? 'B' : s.average >= 60 ? 'C' : s.average >= 50 ? 'D' : 'F';
                              const gradeColor = s.average >= 80 ? 'text-green-600 dark:text-green-400 dark:text-green-400' : s.average >= 70 ? 'text-blue-600 dark:text-blue-400 dark:text-blue-400' : s.average >= 60 ? 'text-yellow-600 dark:text-yellow-400 dark:text-yellow-400' : s.average >= 50 ? 'text-orange-600 dark:text-orange-400 dark:text-orange-400' : 'text-red-600 dark:text-red-400 dark:text-red-400';
                              return (
                                <tr key={i} className="border-b border-slate-100 dark:border-slate-700 dark:border-slate-700">
                                  <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">{s.name}</td>
                                  <td className="py-2.5 text-right font-bold">{s.average}%</td>
                                  <td className={`py-2.5 text-right font-bold ${gradeColor}`}>{grade}</td>
                                  <td className="py-2.5 text-right">
                                    {trend === 'up' ? <TrendingUp size={16} className="inline text-green-600 dark:text-green-400 dark:text-green-400" /> : trend === 'down' ? <TrendingDown size={16} className="inline text-red-600 dark:text-red-400 dark:text-red-400" /> : <Minus size={16} className="inline text-slate-400 dark:text-slate-500 dark:text-slate-500" />}
                                  </td>
                                  <td className="py-2.5 text-right text-slate-500 dark:text-slate-400 dark:text-slate-400">{s.count}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject Trend Chart */}
                {subjectAverages.length > 1 && (
                  <div className="card">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Score Trend</h2>
                    <div className="space-y-6">
                      {[...subjectAverages].sort((a, b) => b.scores.length - a.scores.length).slice(0, 6).map((sub, i) => {
                        const colors = ['#1e3a5f', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
                        const data = sub.dates.map((d, idx) => ({
                          label: new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                          value: sub.scores[idx],
                        }));
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">{sub.name}</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">avg: {sub.average}%</span>
                            </div>
                            <SVGLineChart data={data} color={colors[i % colors.length]} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Attendance + Behavior + Homework */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="card">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><UserCheck size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Attendance Trend</h2>
                    {monthAttendance.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400 dark:text-slate-400">No attendance data</div>
                    ) : (
                      <div className="space-y-3">
                        {monthAttendance.map(m => (
                          <div key={m.month} className="flex items-center gap-3">
                            <span className="w-16 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">{new Date(m.month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' })}</span>
                            <div className="flex-1 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                              <div className={`h-full rounded-full ${m.rate >= 80 ? 'bg-green-500' : m.rate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${m.rate}%` }} />
                            </div>
                            <span className="w-10 text-right text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{m.rate}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><Activity size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Behavior Trend</h2>
                    {behaviorTrend.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400 dark:text-slate-400">No behavior reports</div>
                    ) : (
                      <div className="flex items-end gap-1.5 h-28">
                        {behaviorTrend.map((b, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600" style={{ height: `${(b.rating / 5) * 100}%`, minHeight: '4px' }} title={`${b.rating}/5`} />
                            <span className="text-[7px] text-slate-400 dark:text-slate-500 dark:text-slate-500 rotate-45 origin-left whitespace-nowrap">{b.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><FileText size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Homework & Practice</h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span className="text-slate-600 dark:text-slate-400 dark:text-slate-400">Completion Rate</span><span className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{hwCompletionRate}%</span></div>
                        <div className="bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-full rounded-full ${hwCompletionRate >= 70 ? 'bg-green-500' : hwCompletionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${hwCompletionRate}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2"><FileText size={16} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" /><span className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">Submitted</span></div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{homeworkSubs.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2"><Brain size={16} className="text-purple-600 dark:text-purple-400 dark:text-purple-400" /><span className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">Practice Sessions</span></div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{practiceSessions.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2"><Flame size={16} className="text-orange-600 dark:text-orange-400 dark:text-orange-400" /><span className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">Learning Streak</span></div>
                        <span className="font-bold text-orange-600 dark:text-orange-400 dark:text-orange-400">{learningStreak?.current_streak || 0} days</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Indicators */}
                {(weakAreas.length > 0 || decliningSubjects.length > 0 || suspiciousAttempts.length > 0) && (
                  <div className="card border-2 border-red-200 dark:border-red-900/40 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-red-600 dark:text-red-400 dark:text-red-400" />Attention Required</h2>
                    <div className="space-y-4">
                      {weakAreas.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-red-800 dark:text-red-300 dark:text-red-300 mb-2">Weak Subjects (below 50%)</p>
                          <div className="flex flex-wrap gap-2">{weakAreas.map(s => <span key={s.name} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400 rounded-lg text-sm font-medium">{s.name} ({s.average}%)</span>)}</div>
                        </div>
                      )}
                      {decliningSubjects.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-amber-800 mb-2">Declining Performance (last 3 scores)</p>
                          <div className="flex flex-wrap gap-2">{decliningSubjects.map(s => <span key={s.name} className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300 rounded-lg text-sm font-medium">{s.name}</span>)}</div>
                        </div>
                      )}
                      {suspiciousAttempts.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-amber-800 mb-2">Exam Monitoring Alerts</p>
                          <div className="space-y-2">{suspiciousAttempts.slice(0, 5).map(a => (
                            <div key={a.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40">
                              <div><p className="font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200 text-sm">{a.test?.title || 'Test'}</p><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{new Date(a.completed_at || a.started_at).toLocaleDateString()}</p></div>
                              <div className="flex gap-2 text-xs">
                                {a.tab_switches > 0 && <span className="text-amber-700 dark:text-amber-300 dark:text-amber-300">{a.tab_switches} tab switches</span>}
                                {a.fullscreen_exits > 0 && <span className="text-amber-700 dark:text-amber-300 dark:text-amber-300">{a.fullscreen_exits} exits</span>}
                              </div>
                            </div>
                          ))}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="card">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><Clock size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Recent Activity</h2>
                  {(() => {
                    const allActivity = [
                      ...results.map(r => ({ id: `r-${r.id}`, type: 'result', label: r.subject?.name || 'Subject', detail: `${r.score}%`, date: r.created_at, score: r.score })),
                      ...testAttempts.map(t => ({ id: `t-${t.id}`, type: 'test', label: t.test?.title || 'Test', detail: `${t.score}%`, date: t.completed_at || t.started_at, score: t.score })),
                      ...quizAttempts.map(q => ({ id: `q-${q.id}`, type: 'quiz', label: q.quiz?.title || 'Quiz', detail: `${q.score}%`, date: q.completed_at || q.started_at, score: q.score })),
                      ...homeworkSubs.map(h => ({ id: `h-${h.id}`, type: 'homework', label: h.homework?.title || 'Homework', detail: h.marks != null ? `${h.marks} marks` : 'Submitted', date: h.submitted_at, score: h.marks })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);

                    return allActivity.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400 dark:text-slate-400">No activity recorded</div>
                    ) : (
                      <div className="space-y-2">
                        {allActivity.map(a => {
                          const icons: Record<string, any> = { quiz: Brain, test: BookOpen, homework: FileText, result: TrendingUp };
                          const Icon = icons[a.type] || TrendingUp;
                          const colors: Record<string, string> = { quiz: 'bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 dark:text-purple-400', test: 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 dark:text-blue-400', homework: 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 dark:text-amber-400', result: 'bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 dark:text-primary-400' };
                          const bg = colors[a.type] || 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400';
                          const badges: Record<string, string> = { quiz: 'Quiz', test: 'Test', homework: 'HW', result: 'Result' };
                          const badgeColors: Record<string, string> = { quiz: 'bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30 text-purple-700', test: 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300', homework: 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300', result: 'bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 dark:text-primary-300' };
                          return (
                            <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}><Icon size={16} /></div>
                                <div><p className="font-medium text-sm text-slate-800 dark:text-slate-200 dark:text-slate-200">{a.label}</p><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{new Date(a.date).toLocaleDateString()}</p></div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColors[a.type] || 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-700 dark:text-slate-300 dark:text-slate-300'}`}>{badges[a.type] || ''}</span>
                                <span className={`text-sm font-bold ${a.score >= 70 ? 'text-green-600 dark:text-green-400 dark:text-green-400' : a.score >= 50 ? 'text-amber-600 dark:text-amber-400 dark:text-amber-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>{a.detail}</span>
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ParentAnalyticsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>}>
      <ProgressContent />
    </Suspense>
  );
}
