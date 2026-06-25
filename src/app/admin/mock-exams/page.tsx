'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Plus, Edit, Trash2, X, FileText, Clock, Users, Check,
  Loader2, Search, Eye, Download, Award, AlertCircle,
  GraduationCap, ChevronDown, BarChart3, Brain, TrendingUp,
  Lightbulb, BookOpen, RotateCcw, Filter
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';

export default function AdminMockExamsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'exams' | 'questions' | 'students' | 'analytics'>('exams');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '', description: '', exam_type: 'JSS3_BECE' as 'JSS3_BECE' | 'SS3_WAEC',
    academic_year: new Date().getFullYear().toString(), exam_date: '',
    duration_minutes: 120, passing_score: 50, total_questions: 60,
    shuffle_questions: true, require_fullscreen: false, prevent_tab_switch: false,
    max_tab_switches: 3, max_attempts: 0,
  });

  const [questionData, setQuestionData] = useState({
    question: '', options: ['', '', '', ''], correct_answer: 0, points: 1,
    question_type: 'multiple_choice', subject: 'MATHEMATICS',
    difficulty_level: 'MEDIUM', topic: '', subtopic: '', explanation: '',
    skill_tag: '', bloom_level: '', curriculum: 'Both', grade_level: 'JSS3',
  });

  const SUBJECTS = ['MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'BASIC TECHNOLOGY'];
  const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'VERY_HARD'];
  const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True / False' },
    { value: 'fill_blank', label: 'Fill in the Blank' },
  ];

  // Student analytics view
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'questions' && selectedExam) fetchQuestions();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, selectedExam]);

  async function fetchData() {
    setLoading(true);
    const { data: examsData } = await supabase.from('mock_exams').select('*').order('created_at', { ascending: false });
    if (examsData) setExams(examsData);
    setLoading(false);
  }

  async function fetchQuestions() {
    if (!selectedExam) return;
    const { data } = await supabase.from('mock_questions').select('*').eq('exam_id', selectedExam.id).order('created_at', { ascending: true });
    if (data) setQuestions(data);
  }

  async function fetchAnalytics() {
    const { data } = await supabase.from('mock_analytics').select('*, student:profiles!student_id(first_name, last_name, email, id)');
    if (data) setAnalytics(data);
    const { data: atts } = await supabase.from('mock_attempts').select('*, student:profiles!student_id(first_name, last_name, email, id)').not('completed_at', 'is', null);
    if (atts) setAttempts(atts);
  }

  async function handleCreateExam() {
    if (!formData.title.trim() || !formData.exam_type) {
      setError('Title and exam type required');
      return;
    }
    setError(''); setSaving(true);
    try {
      const payload = {
        title: formData.title, description: formData.description,
        exam_type: formData.exam_type, academic_year: formData.academic_year,
        exam_date: formData.exam_date || null,
        duration_minutes: formData.duration_minutes, passing_score: formData.passing_score,
        total_questions: formData.total_questions, shuffle_questions: formData.shuffle_questions,
        require_fullscreen: formData.require_fullscreen,
        prevent_tab_switch: formData.prevent_tab_switch,
        max_tab_switches: formData.max_tab_switches, max_attempts: formData.max_attempts,
        is_published: true, created_by: profile?.id,
      };
      const res = await fetch('/api/mock-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_exam', ...payload }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Exam created successfully');
      setShowExamModal(false);
      fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteExam(examId: string) {
    if (!confirm('Delete this exam and all its questions?')) return;
    try {
      const res = await fetch('/api/mock-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_exam', id: examId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Exam deleted');
      fetchData();
    } catch (err: any) { setError(err.message); }
  }

  async function handleAddQuestion() {
    if (!selectedExam || !questionData.question.trim()) {
      setError('Question text is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/mock-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_question', exam_id: selectedExam.id, ...questionData,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Question added');
      setQuestionData({
        question: '', options: ['', '', '', ''], correct_answer: 0, points: 1,
        question_type: 'multiple_choice', subject: 'MATHEMATICS',
        difficulty_level: 'MEDIUM', topic: '', subtopic: '', explanation: '',
        skill_tag: '', bloom_level: '', curriculum: 'Both', grade_level: 'JSS3',
      });
      fetchQuestions();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteQuestion(qId: string) {
    if (!confirm('Remove this question?')) return;
    const res = await fetch('/api/mock-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_question', id: qId }),
    });
    const data = await res.json();
    if (data.success) { fetchQuestions(); setSuccess('Question removed'); }
  }

  function resetQuestionDefaults(type: string) {
    let opts = ['', '', '', ''];
    let correct = 0;
    if (type === 'true_false' || type === 'TRUE_FALSE') { opts = ['True', 'False']; correct = 0; }
    else if (type === 'fill_blank' || type === 'FILL_IN_THE_GAP') { opts = []; correct = 0; }
    setQuestionData({ ...questionData, options: opts, correct_answer: correct, question_type: type });
  }

  const allAttemptsAnalytics = Object.values(
    attempts.reduce((acc: any, a: any) => {
      const sid = a.student_id;
      if (!acc[sid]) acc[sid] = { student: a.student, attempts: [], scores: [] };
      acc[sid].attempts.push(a);
      acc[sid].scores.push(a.score || 0);
      return acc;
    }, {})
  ).map((s: any) => ({
    ...s,
    bestScore: Math.max(...s.scores, 0),
    avgScore: Math.round(s.scores.reduce((a: number, b: number) => a + b, 0) / s.scores.length),
    latestScore: s.scores[0] || 0,
  }));

  const masteryDist = { POOR: 0, GOOD: 0, EXCELLENT: 0, PROFICIENT: 0, MASTERED: 0 };
  attempts.forEach((a: any) => { const ml = a.mastery_level as keyof typeof masteryDist; if (ml && masteryDist[ml] !== undefined) masteryDist[ml]++; });
  const masteryChartData = Object.entries(masteryDist).map(([name, value]) => ({ name, value }));

  const avgScore = allAttemptsAnalytics.length > 0
    ? Math.round(allAttemptsAnalytics.reduce((s: number, a: any) => s + a.avgScore, 0) / allAttemptsAnalytics.length)
    : 0;

  function getGradeColor(pct: number): string {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-600';
  }

  return (
    <DashboardLayout title="Mock Exams" subtitle="BECE & WAEC Preparation Management">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          {(['exams', 'questions', 'students', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'exams' && <><FileText size={14} className="inline mr-1" /> Exams</>}
              {tab === 'questions' && <><BookOpen size={14} className="inline mr-1" /> Questions</>}
              {tab === 'students' && <><Users size={14} className="inline mr-1" /> Students</>}
              {tab === 'analytics' && <><BarChart3 size={14} className="inline mr-1" /> Analytics</>}
            </button>
          ))}
        </div>

        {/* Notifications */}
        {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error} <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button></div>}
        {success && <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2"><Check size={16} /> {success} <button onClick={() => setSuccess('')} className="ml-auto"><X size={16} /></button></div>}

        {/* === EXAMS TAB === */}
        {activeTab === 'exams' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Mock Exams</h2>
              <button onClick={() => setShowExamModal(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Create Exam
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-primary-600" /></div>
            ) : exams.length === 0 ? (
              <div className="card text-center py-16">
                <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No mock exams created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams.map(exam => (
                  <div key={exam.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{exam.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${exam.exam_type === 'JSS3_BECE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {exam.exam_type === 'JSS3_BECE' ? 'JSS3 BECE' : 'SS3 WAEC'}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setSelectedExam(exam); setActiveTab('questions'); }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Manage Questions">
                          <BookOpen size={16} className="text-slate-500" />
                        </button>
                        <button onClick={() => handleDeleteExam(exam.id)} className="p-1.5 hover:bg-red-100 rounded-lg" title="Delete Exam">
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500 mb-3">
                      <span className="flex items-center gap-1"><FileText size={14} /> {exam.total_questions} Qs</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {exam.duration_minutes}min</span>
                      <span className="flex items-center gap-1"><Award size={14} /> Pass: {exam.passing_score}%</span>
                      <span className="flex items-center gap-1"><RotateCcw size={14} /> {exam.max_attempts === 0 ? 'Unlimited' : `${exam.max_attempts} max`}</span>
                    </div>
                    {exam.description && <p className="text-xs text-slate-400 mb-2">{exam.description}</p>}
                    <div className="flex items-center justify-between pt-3 border-t text-xs text-slate-400">
                      <span>{exam.academic_year}</span>
                      <span className={`px-2 py-0.5 rounded-full ${exam.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {exam.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create Exam Modal */}
            {showExamModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowExamModal(false)}>
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Create Mock Exam</h3>
                    <button onClick={() => setShowExamModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input className="input-field w-full" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. JSS3 BECE Mock Exam 2026" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea className="input-field w-full" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Exam Type</label>
                        <select className="input-field w-full" value={formData.exam_type} onChange={e => setFormData({ ...formData, exam_type: e.target.value as any })}>
                          <option value="JSS3_BECE">JSS3 BECE</option>
                          <option value="SS3_WAEC">SS3 WAEC</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Academic Year</label>
                        <input className="input-field w-full" value={formData.academic_year} onChange={e => setFormData({ ...formData, academic_year: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                        <input type="number" className="input-field w-full" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Passing Score (%)</label>
                        <input type="number" className="input-field w-full" value={formData.passing_score} onChange={e => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 50 })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Total Questions</label>
                        <input type="number" className="input-field w-full" value={formData.total_questions} onChange={e => setFormData({ ...formData, total_questions: parseInt(e.target.value) || 60 })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Max Attempts (0=unlimited)</label>
                        <input type="number" className="input-field w-full" value={formData.max_attempts} onChange={e => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formData.shuffle_questions} onChange={e => setFormData({ ...formData, shuffle_questions: e.target.checked })} />
                        Shuffle Questions
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formData.require_fullscreen} onChange={e => setFormData({ ...formData, require_fullscreen: e.target.checked })} />
                        Require Fullscreen
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={formData.prevent_tab_switch} onChange={e => setFormData({ ...formData, prevent_tab_switch: e.target.checked })} />
                        Prevent Tab Switching
                      </label>
                    </div>
                    <button onClick={handleCreateExam} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      Create Exam
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* === QUESTIONS TAB === */}
        {activeTab === 'questions' && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-slate-900">Questions</h2>
                <select
                  className="input-field text-sm"
                  value={selectedExam?.id || ''}
                  onChange={e => {
                    const exam = exams.find(ex => ex.id === e.target.value);
                    setSelectedExam(exam || null);
                    if (exam) fetchQuestions();
                  }}
                >
                  <option value="">Select an exam</option>
                  {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                </select>
              </div>
              {selectedExam && (
                <button onClick={() => setShowQuestionModal(true)} className="btn-primary flex items-center gap-2">
                  <Plus size={16} /> Add Question
                </button>
              )}
            </div>

            {selectedExam && (
              <div className="flex gap-2 text-sm text-slate-500 mb-2">
                <span className="font-medium text-slate-700">{selectedExam.title}</span>
                <span>—</span>
                <span>{questions.length} questions</span>
              </div>
            )}

            {!selectedExam && (
              <div className="card text-center py-16">
                <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Select an exam to manage questions.</p>
              </div>
            )}

            {selectedExam && questions.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-slate-500">No questions yet. Add questions manually or run the seed script.</p>
              </div>
            )}

            {selectedExam && questions.length > 0 && (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-100"><th className="p-2 text-left font-semibold text-xs">#</th><th className="p-2 text-left font-semibold text-xs">Question</th><th className="p-2 text-center font-semibold text-xs">Subject</th><th className="p-2 text-center font-semibold text-xs">Difficulty</th><th className="p-2 text-center font-semibold text-xs">Topic</th><th className="p-2 text-center font-semibold text-xs">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {questions.map((q, i) => (
                      <tr key={q.id}>
                        <td className="p-2 text-center text-slate-400">{i + 1}</td>
                        <td className="p-2 max-w-[300px] truncate">{q.question}</td>
                        <td className="p-2 text-center">{q.subject}</td>
                        <td className="p-2 text-center"><span className={`text-xs px-1.5 py-0.5 rounded-full ${q.difficulty_level === 'EASY' ? 'bg-green-100 text-green-700' : q.difficulty_level === 'MEDIUM' ? 'bg-blue-100 text-blue-700' : q.difficulty_level === 'HARD' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{q.difficulty_level}</span></td>
                        <td className="p-2 text-center text-xs">{q.topic}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add Question Modal */}
            {showQuestionModal && selectedExam && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQuestionModal(false)}>
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Add Question — {selectedExam.title}</h3>
                    <button onClick={() => setShowQuestionModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Question Type</label>
                      <select className="input-field w-full" value={questionData.question_type} onChange={e => resetQuestionDefaults(e.target.value)}>
                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Question Text</label>
                      <textarea className="input-field w-full" value={questionData.question} onChange={e => setQuestionData({ ...questionData, question: e.target.value })} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Subject</label>
                        <select className="input-field w-full" value={questionData.subject} onChange={e => setQuestionData({ ...questionData, subject: e.target.value })}>
                          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Difficulty</label>
                        <select className="input-field w-full" value={questionData.difficulty_level} onChange={e => setQuestionData({ ...questionData, difficulty_level: e.target.value })}>
                          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Topic</label>
                        <input className="input-field w-full" value={questionData.topic} onChange={e => setQuestionData({ ...questionData, topic: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Sub-topic</label>
                        <input className="input-field w-full" value={questionData.subtopic} onChange={e => setQuestionData({ ...questionData, subtopic: e.target.value })} />
                      </div>
                    </div>
                    {questionData.question_type !== 'fill_blank' && questionData.options.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Options</label>
                        {questionData.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold w-6 text-slate-500">{String.fromCharCode(65 + oi)}.</span>
                            <input className="input-field flex-1" value={opt} onChange={e => {
                              const opts = [...questionData.options];
                              opts[oi] = e.target.value;
                              setQuestionData({ ...questionData, options: opts });
                            }} />
                            <input type="radio" name="correct" checked={questionData.correct_answer === oi} onChange={() => setQuestionData({ ...questionData, correct_answer: oi })} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Explanation (optional)</label>
                      <textarea className="input-field w-full" value={questionData.explanation} onChange={e => setQuestionData({ ...questionData, explanation: e.target.value })} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Points</label>
                        <input type="number" className="input-field w-full" value={questionData.points} onChange={e => setQuestionData({ ...questionData, points: parseInt(e.target.value) || 1 })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Skill Tag</label>
                        <input className="input-field w-full" value={questionData.skill_tag} onChange={e => setQuestionData({ ...questionData, skill_tag: e.target.value })} />
                      </div>
                    </div>
                    <button onClick={handleAddQuestion} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      Add Question
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* === STUDENTS TAB === */}
        {activeTab === 'students' && (
          <>
            <h2 className="text-lg font-bold text-slate-900">Students Performance</h2>
            {allAttemptsAnalytics.length === 0 ? (
              <div className="card text-center py-16">
                <Users size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No student data available yet.</p>
              </div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-100"><th className="p-3 text-left font-semibold">Student</th><th className="p-3 text-center font-semibold">Attempts</th><th className="p-3 text-center font-semibold">Best</th><th className="p-3 text-center font-semibold">Average</th><th className="p-3 text-center font-semibold">Latest</th><th className="p-3 text-center font-semibold">Mastery</th><th className="p-3 text-center font-semibold">Pathway</th><th className="p-3 text-center font-semibold">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {allAttemptsAnalytics.map((s: any) => (
                      <tr key={s.student?.id || Math.random()}>
                        <td className="p-3 font-medium">{s.student?.first_name} {s.student?.last_name}</td>
                        <td className="p-3 text-center">{s.attempts.length}</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(s.bestScore)}`}>{s.bestScore}%</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(s.avgScore)}`}>{s.avgScore}%</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(s.latestScore)}`}>{s.latestScore}%</td>
                        <td className="p-3 text-center text-xs">{s.attempts[0]?.mastery_level || '—'}</td>
                        <td className="p-3 text-center text-xs text-primary-600 font-medium">
                          {analytics.find((a: any) => a.student_id === s.student?.id)?.recommended_pathway || '—'}
                        </td>
                        <td className="p-3 text-center">
                          <a
                            href={`/student/mock-exams/report/${s.attempts[0]?.id}`}
                            target="_blank"
                            className="btn-outline text-xs py-1 px-2"
                          >
                            <Eye size={14} className="inline" /> Report
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* === ANALYTICS TAB === */}
        {activeTab === 'analytics' && (
          <>
            <h2 className="text-lg font-bold text-slate-900">Overall Analytics</h2>

            {attempts.length === 0 ? (
              <div className="card text-center py-16">
                <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No data yet. Students need to take exams first.</p>
              </div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="card"><p className="text-xs text-slate-500">Total Students</p><p className="text-2xl font-bold">{allAttemptsAnalytics.length}</p></div>
                  <div className="card"><p className="text-xs text-slate-500">Total Attempts</p><p className="text-2xl font-bold">{attempts.length}</p></div>
                  <div className="card"><p className="text-xs text-slate-500">Average Score</p><p className="text-2xl font-bold text-blue-600">{avgScore}%</p></div>
                  <div className="card"><p className="text-xs text-slate-500">Pass Rate</p><p className="text-2xl font-bold text-green-600">{attempts.length > 0 ? Math.round((attempts.filter((a: any) => a.score >= 50).length / attempts.length) * 100) : 0}%</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mastery Distribution */}
                  <div className="card">
                    <h3 className="font-bold text-slate-800 mb-4">Mastery Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={masteryChartData.filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {masteryChartData.filter(d => d.value > 0).map((entry, index) => {
                            const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e'];
                            return <Cell key={index} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Student Performance Comparison */}
                  <div className="card">
                    <h3 className="font-bold text-slate-800 mb-4">Student Average Scores</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={allAttemptsAnalytics.slice(0, 10).map((s: any) => ({
                        name: s.student?.first_name ? `${s.student.first_name} ${s.student.last_name?.charAt(0)}.` : 'Unknown',
                        score: s.avgScore,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Avg Score']} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {allAttemptsAnalytics.slice(0, 10).map((_, i) => (
                            <Cell key={i} fill={allAttemptsAnalytics[i]?.avgScore >= 50 ? '#22c55e' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pathway Distribution */}
                {analytics.filter((a: any) => a.recommended_pathway).length > 0 && (
                  <div className="card">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Lightbulb size={16} /> Pathway Recommendations Distribution</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['SCIENCE', 'COMMERCIAL', 'ARTS'].map(pathway => {
                        const count = analytics.filter((a: any) => a.recommended_pathway === pathway).length;
                        const total = analytics.filter((a: any) => a.recommended_pathway).length;
                        return (
                          <div key={pathway} className={`rounded-xl p-4 text-center ${pathway === 'SCIENCE' ? 'bg-green-50 border border-green-200' : pathway === 'COMMERCIAL' ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'}`}>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-sm font-medium">{pathway} Track</p>
                            <p className="text-xs text-slate-500">{total > 0 ? Math.round((count / total) * 100) : 0}% of students</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Weakest Subjects Analysis */}
                {(() => {
                  const subjectCounts: Record<string, { correct: number; total: number }> = {};
                  attempts.forEach((a: any) => {
                    if (a.topic_mastery?.by_subject) {
                      Object.entries(a.topic_mastery.by_subject).forEach(([subj, d]: [string, any]) => {
                        if (!subjectCounts[subj]) subjectCounts[subj] = { correct: 0, total: 0 };
                        subjectCounts[subj].correct += d.correct || 0;
                        subjectCounts[subj].total += d.total || 0;
                      });
                    }
                  });

                  if (Object.keys(subjectCounts).length > 0) {
                    const subjectChartData = Object.entries(subjectCounts).map(([name, d]) => ({
                      name,
                      score: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
                    }));

                    return (
                      <div className="card">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Brain size={16} /> Overall Subject Performance</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={subjectChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                              {subjectChartData.map((_, i) => (
                                <Cell key={i} fill={['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
