'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Loader2, Download, BarChart3, Users, TrendingUp,
  TrendingDown, AlertTriangle, CheckCircle, XCircle, Brain, Target,
  Shield, ChevronDown, Search, Award, Clock
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Cell
} from 'recharts';

const COLORS = ['#b3922f', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

interface CompiledData {
  student: { name: string; admission: string; className: string } | null;
  summary: {
    totalTests: number;
    avgScore: number;
    passRate: number;
    highestScore: number;
    lowestScore: number;
    totalCorrect: number;
    totalQuestions: number;
    trendDirection: 'improving' | 'declining' | 'stable';
  };
  scoreTrend: { date: string; score: number; testTitle: string; subjectName: string }[];
  subjectPerformance: { name: string; correct: number; total: number; percentage: number }[];
  topicPerformance: { name: string; correct: number; total: number; percentage: number }[];
  subjectTopicBreakdown: { subject: string; topics: { name: string; correct: number; total: number; percentage: number }[] }[];
  difficultyBreakdown: { level: string; correct: number; total: number; percentage: number }[];
  questionPatterns: { question: string; subject: string; topic: string; difficulty: string; timesSeen: number; timesCorrect: number; missRate: number }[];
  securitySummary: { totalTabSwitches: number; totalFullscreenExits: number; totalSecurityEvents: number; testsWithEvents: number };
  insights: {
    strengths: string[];
    needsImprovement: string[];
    weakTopics: string[];
    overall: string;
    subjectRecommendations: { subject: string; score: number; assessment: string; recommendation: string }[];
    recommendations: string[];
  };
  attempts: { id: string; title: string; subjectName: string; score: number; passed: boolean; correctAnswers: number; totalQuestions: number; completedAt: string }[];
}

export default function AdminResultsPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<{ profile_id: string; name: string; admission_number?: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportData, setReportData] = useState<CompiledData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchInitial();
  }, [profile]);

  useEffect(() => {
    if (selectedClassId) fetchSubjectsAndStudents();
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedStudentId) fetchReport();
  }, [selectedStudentId]);

  async function fetchInitial() {
    setLoading(true);
    try {
      const [{ data: classData }, { data: settingsData }] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('school_settings').select('*').limit(1).maybeSingle(),
      ]);
      setClasses(classData || []);
      setSchoolSettings(settingsData);
      if (classData && classData.length > 0) setSelectedClassId(classData[0].id);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function fetchSubjectsAndStudents() {
    if (!selectedClassId) return;
    setSelectedSubjectId('');
    setSelectedStudentId('');
    setReportData(null);
    try {
      const [{ data: subjData }, { data: studData }] = await Promise.all([
        supabase.from('subjects').select('*').or(`class_id.eq.${selectedClassId},class_id.is.null`).order('name'),
        supabase.from('students')
          .select('profile_id, admission_number, profile:profiles!profile_id(first_name, last_name)')
          .eq('class_id', selectedClassId)
          .order('admission_number'),
      ]);
      setSubjects(subjData || []);
      const studs = (studData || []).map((s: any) => ({
        profile_id: s.profile_id,
        name: `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.trim() || 'Unknown',
        admission_number: s.admission_number,
      }));
      setStudents(studs);
    } catch (err: any) { setError(err.message); }
  }

  const fetchReport = useCallback(async () => {
    if (!selectedStudentId) return;
    setReportLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ studentId: selectedStudentId });
      if (selectedClassId) params.set('classId', selectedClassId);
      const res = await fetch(`/api/tests/compiled-report?${params.toString()}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to load report');
      setReportData(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReportLoading(false);
    }
  }, [selectedStudentId, selectedClassId]);

  async function handleDownloadPdf() {
    if (!reportData) return;
    try {
      const { generateCompiledReportPdf } = await import('@/lib/compiled-report-pdf');
      const doc = generateCompiledReportPdf(reportData, schoolSettings?.school_name);
      doc.save(`Compiled_Report_${reportData.student?.name?.replace(/\s+/g, '_') || 'student'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      console.error('PDF error:', err);
      alert('Failed to generate PDF: ' + err.message);
    }
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.admission_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'topics', label: 'Topics' },
    { id: 'difficulty', label: 'Difficulty' },
    { id: 'questions', label: 'Questions' },
    { id: 'insights', label: 'Insights' },
  ];

  const data = reportData;
  const s = data?.summary;

  return (
    <DashboardLayout title="Results & Analytics" subtitle="Admin - Compiled test performance analytics per student">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Results & Analytics</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Compiled cross-test performance report</p>
            </div>
          </div>
          {data && (
            <button onClick={handleDownloadPdf} className="btn-outline flex items-center gap-2 text-sm">
              <Download size={16} /> Download PDF
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">Class</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input py-1.5 text-sm w-auto min-w-[160px]">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">Student</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); }}
                className="input py-1.5 text-sm pl-8 min-w-[200px]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">Select Student</label>
            <select
              value={selectedStudentId}
              onChange={e => { setSelectedStudentId(e.target.value); setSearchQuery(''); }}
              className="input py-1.5 text-sm w-auto min-w-[200px]"
            >
              <option value="">Choose a student...</option>
              {filteredStudents.map(s => (
                <option key={s.profile_id} value={s.profile_id}>{s.name} ({s.admission_number || 'N/A'})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <XCircle size={16} />{error}
          </div>
        )}

        {/* Loading */}
        {reportLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <p className="text-sm text-slate-500">Loading compiled analytics...</p>
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BarChart3 size={48} className="mb-3 opacity-50" />
            <p className="text-lg font-medium">Select a student to view analytics</p>
            <p className="text-sm">Choose a class and student above to generate a compiled performance report.</p>
          </div>
        ) : !data.student ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Users size={48} className="mb-3 opacity-50" />
            <p className="text-lg font-medium">No test data found</p>
            <p className="text-sm">This student has not completed any tests yet.</p>
          </div>
        ) : (
          <>
            {/* Student Info */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{data.student.name}</h2>
                  <p className="text-primary-200 text-sm">Admission #: {data.student.admission || 'N/A'} | Class: {data.student.className || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{s?.avgScore || 0}%</p>
                  <p className="text-primary-200 text-sm">Average Score</p>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            {s && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Tests</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{s.totalTests}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Avg Score</p>
                  <p className={`text-2xl font-bold ${s.avgScore >= 70 ? 'text-green-600' : s.avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avgScore}%</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pass Rate</p>
                  <p className={`text-2xl font-bold ${s.passRate >= 70 ? 'text-green-600' : s.passRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.passRate}%</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Correct</p>
                  <p className="text-2xl font-bold text-blue-600">{s.totalCorrect}/{s.totalQuestions}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Trend</p>
                  <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${s.trendDirection === 'improving' ? 'text-green-600' : s.trendDirection === 'declining' ? 'text-red-600' : 'text-slate-600'}`}>
                    {s.trendDirection === 'improving' ? <TrendingUp size={20} /> : s.trendDirection === 'declining' ? <TrendingDown size={20} /> : <span className="text-lg">=</span>}
                    {s.trendDirection.charAt(0).toUpperCase() + s.trendDirection.slice(1)}
                  </p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Radar Chart */}
                {data.subjectPerformance.length >= 3 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Subject Performance Radar</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={data.subjectPerformance}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Radar name="Score" dataKey="percentage" stroke="#b3922f" fill="#b3922f" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Score Trend */}
                {data.scoreTrend.length >= 2 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Score Trend Over Time</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={data.scoreTrend.map(t => ({ name: t.testTitle.substring(0, 20), score: t.score, subject: t.subjectName }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#b3922f" strokeWidth={2} dot={{ fill: '#b3922f', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Subject Bars + Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Subject Scores</h3>
                    <div className="space-y-3">
                      {data.subjectPerformance.map((sub, i) => (
                        <div key={sub.name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700 dark:text-slate-300">{sub.name}</span>
                            <span className="text-slate-500 dark:text-slate-400">{sub.correct}/{sub.total} ({sub.percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                            <div className="h-2.5 rounded-full transition-all" style={{ width: `${sub.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Summary</h3>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="font-semibold text-green-700 dark:text-green-400">Strengths ({data.insights.strengths.length})</p>
                        {data.insights.strengths.length > 0 ? (
                          <ul className="mt-1 space-y-1">{data.insights.strengths.map((st: string) => <li key={st} className="text-green-600 dark:text-green-300">✓ {st}</li>)}</ul>
                        ) : <p className="text-green-500 mt-1">None identified</p>}
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="font-semibold text-red-700 dark:text-red-400">Needs Improvement ({data.insights.needsImprovement.length})</p>
                        {data.insights.needsImprovement.length > 0 ? (
                          <ul className="mt-1 space-y-1">{data.insights.needsImprovement.map((st: string) => <li key={st} className="text-red-600 dark:text-red-300">✗ {st}</li>)}</ul>
                        ) : <p className="text-red-500 mt-1">All subjects performing well!</p>}
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <p className="font-semibold text-amber-700 dark:text-amber-400">Weak Topics ({data.insights.weakTopics.length})</p>
                        {data.insights.weakTopics.length > 0 ? (
                          <ul className="mt-1 space-y-1">{data.insights.weakTopics.slice(0, 5).map((t: string) => <li key={t} className="text-amber-600 dark:text-amber-300">• {t}</li>)}</ul>
                        ) : <p className="text-amber-500 mt-1">No weak topics!</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subjects' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Subject Performance Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Subject</th>
                          <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Correct</th>
                          <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Total</th>
                          <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Score</th>
                          <th className="py-3 px-2 w-1/3"><span className="sr-only">Bar</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.subjectPerformance.map((sub, i) => (
                          <tr key={sub.name} className="border-b border-slate-100 dark:border-slate-700/50">
                            <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-medium">{sub.name}</td>
                            <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{sub.correct}</td>
                            <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{sub.total}</td>
                            <td className="py-3 px-2 text-center font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{sub.percentage}%</td>
                            <td className="py-3 px-2">
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                                <div className="h-3 rounded-full" style={{ width: `${sub.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Subject Recommendations */}
                {data.insights.subjectRecommendations.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Subject Recommendations</h3>
                    <div className="space-y-4">
                      {data.insights.subjectRecommendations.map(rec => (
                        <div key={rec.subject} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-800 dark:text-white">{rec.subject}</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              rec.score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : rec.score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>{rec.assessment}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{rec.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'topics' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Topic Performance</h3>
                  <div className="space-y-3">
                    {data.topicPerformance.map(t => (
                      <div key={t.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                          <span className="text-slate-500 dark:text-slate-400">{t.correct}/{t.total} ({t.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${t.percentage >= 70 ? 'bg-green-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${t.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {data.subjectTopicBreakdown.length > 0 && (
                  <div className="space-y-4">
                    {data.subjectTopicBreakdown.map(st => (
                      <div key={st.subject} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{st.subject}</h3>
                        <p className="text-xs text-slate-500 mb-4">Topic-level breakdown</p>
                        <div className="space-y-3">
                          {st.topics.map(t => (
                            <div key={t.name}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                                <span className="text-slate-500 dark:text-slate-400">{t.correct}/{t.total} ({t.percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                <div className={`h-2.5 rounded-full ${t.percentage >= 70 ? 'bg-green-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${t.percentage}%` }} />
                              </div>
                              {t.percentage < 50 && <p className="text-xs text-red-500 mt-0.5">Needs revision</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'difficulty' && data.difficultyBreakdown.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Difficulty Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Level</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Correct</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Total</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Score</th>
                        <th className="py-3 px-2 w-1/3"><span className="sr-only">Bar</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.difficultyBreakdown.map(d => (
                        <tr key={d.level} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-medium capitalize">{d.level}</td>
                          <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{d.correct}</td>
                          <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{d.total}</td>
                          <td className="py-3 px-2 text-center font-semibold text-primary-600">{d.percentage}%</td>
                          <td className="py-3 px-2">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                              <div className="h-3 rounded-full bg-primary-600" style={{ width: `${d.percentage}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'questions' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Most Frequently Missed Questions</h3>
                {data.questionPatterns.length === 0 ? (
                  <p className="text-slate-500 text-sm">No question pattern data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Question</th>
                          <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Subject</th>
                          <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Topic</th>
                          <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Difficulty</th>
                          <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Seen</th>
                          <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Correct</th>
                          <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Miss Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.questionPatterns.slice(0, 20).map((q, i) => (
                          <tr key={i} className={`border-b border-slate-100 dark:border-slate-700/50 ${q.missRate > 50 ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                            <td className="py-3 px-2 text-slate-800 dark:text-slate-200 max-w-xs truncate">{q.question}</td>
                            <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{q.subject}</td>
                            <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{q.topic}</td>
                            <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400 capitalize">{q.difficulty}</td>
                            <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{q.timesSeen}</td>
                            <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{q.timesCorrect}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`font-semibold ${q.missRate > 50 ? 'text-red-600' : q.missRate > 25 ? 'text-amber-600' : 'text-green-600'}`}>{q.missRate}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="space-y-6">
                {/* Mastery Level */}
                {s && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Overall Mastery Level</h3>
                    <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                      s.avgScore >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : s.avgScore >= 75 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : s.avgScore >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : s.avgScore >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {s.avgScore >= 90 ? 'MASTERY' : s.avgScore >= 75 ? 'PROFICIENT' : s.avgScore >= 60 ? 'DEVELOPING' : s.avgScore >= 40 ? 'BEGINNING' : 'NOT YET BEGINNING'}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">{data.insights.overall}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {data.insights.strengths.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                      <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
                        <TrendingUp size={18} /> Strengths
                      </h4>
                      <ul className="space-y-2">
                        {data.insights.strengths.map(s => (
                          <li key={s} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{s} — performing well above average.</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.insights.needsImprovement.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                      <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                        <TrendingDown size={18} /> Needs Improvement
                      </h4>
                      <ul className="space-y-2">
                        {data.insights.needsImprovement.map(s => (
                          <li key={s} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <span>{s} — needs focused attention.</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {data.insights.weakTopics.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
                      <Target size={18} /> Topics to Focus On
                    </h4>
                    <ul className="space-y-2">
                      {data.insights.weakTopics.slice(0, 8).map(t => (
                        <li key={t} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h4 className="font-semibold text-primary-700 dark:text-primary-400 flex items-center gap-2 mb-3">
                    <Brain size={18} /> Recommendations
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    {data.insights.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary-600 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Test History */}
            {data.attempts.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mt-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Clock size={18} /> Test History ({data.attempts.length} tests)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">#</th>
                        <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Test</th>
                        <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Subject</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Score</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Result</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Correct</th>
                        <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attempts.map((a, i) => (
                        <tr key={a.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-3 px-2 text-slate-500 dark:text-slate-400">{i + 1}</td>
                          <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-medium">{a.title}</td>
                          <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{a.subjectName}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`font-bold ${a.score >= 70 ? 'text-green-600' : a.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{a.score}%</span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.passed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {a.passed ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{a.correctAnswers}/{a.totalQuestions}</td>
                          <td className="py-3 px-2 text-slate-500 dark:text-slate-400 text-xs">
                            {new Date(a.completedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Security Summary */}
            {data.securitySummary.totalSecurityEvents > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mt-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                  <Shield size={18} /> Security Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-slate-500 dark:text-slate-400">Tab Switches</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{data.securitySummary.totalTabSwitches}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-slate-500 dark:text-slate-400">Fullscreen Exits</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{data.securitySummary.totalFullscreenExits}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-slate-500 dark:text-slate-400">Total Events</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{data.securitySummary.totalSecurityEvents}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-slate-500 dark:text-slate-400">Tests w/ Events</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{data.securitySummary.testsWithEvents}/{data.summary.totalTests}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
