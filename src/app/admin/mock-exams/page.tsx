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
  Lightbulb, BookOpen, RotateCcw, Filter, Database
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
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showEditExamModal, setShowEditExamModal] = useState(false);
  const [showBankSelectModal, setShowBankSelectModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'exams' | 'questions' | 'students' | 'analytics'>('exams');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exam form state
  const [formData, setFormData] = useState({
    title: '', description: '', exam_type: 'JSS3_BECE' as 'JSS3_BECE' | 'SS3_WAEC',
    class_level: 'JSS3' as 'JSS3' | 'SS3',
    academic_year: new Date().getFullYear().toString(), exam_date: '',
    duration_minutes: 120, passing_score: 50, total_questions: 60,
    shuffle_questions: true, require_fullscreen: false, prevent_tab_switch: false,
    max_tab_switches: 3, max_attempts: 0,
  });

  // Question bank state (Questions tab)
  const [bankFilter, setBankFilter] = useState({
    level: '' as '' | 'JSS3' | 'SS3',
    subject: '', difficulty: '', questionType: '', search: '',
  });
  const [bankQuestionData, setBankQuestionData] = useState({
    question: '', options: ['', '', '', ''], correct_answer: 0, points: 1,
    question_type: 'multiple_choice', subject: 'MATHEMATICS',
    difficulty_level: 'MEDIUM', topic: '', subtopic: '', explanation: '',
    curriculum: 'Both', level: 'JSS3',
  });
  const [editingBankQuestion, setEditingBankQuestion] = useState<any>(null);
  const [showBankQuestionModal, setShowBankQuestionModal] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [assignTargetExam, setAssignTargetExam] = useState('');
  const [assignCapacity, setAssignCapacity] = useState<{ remaining: number; total: number; current: number } | null>(null);
  const [showEditMockQModal, setShowEditMockQModal] = useState(false);
  const [editingMockQ, setEditingMockQ] = useState<any>(null);
  const [mockQForm, setMockQForm] = useState({
    question: '', options: ['', '', '', ''], correct_answer: 0,
    subject: 'MATHEMATICS', difficulty_level: 'MEDIUM',
    topic: '', explanation: '',
  });

  // Existing question form (per-exam manual add)
  const [questionData, setQuestionData] = useState({
    question: '', options: ['', '', '', ''], correct_answer: 0, points: 1,
    question_type: 'multiple_choice', subject: 'MATHEMATICS',
    difficulty_level: 'MEDIUM', topic: '', subtopic: '', explanation: '',
    skill_tag: '', bloom_level: '', curriculum: 'Both', grade_level: 'JSS3',
  });

  const SUBJECTS = ['MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'BASIC TECHNOLOGY'];
  const SS3_SUBJECTS = ['MATHEMATICS', 'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY'];
  const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'VERY_HARD'];
  const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True / False' },
    { value: 'fill_blank', label: 'Fill in the Blank' },
  ];

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetail, setStudentDetail] = useState<any>(null);

  async function getExamCapacity(eId: string): Promise<{ remaining: number; total: number; current: number }> {
    const { data: exam } = await supabase.from('mock_exams').select('total_questions').eq('id', eId).single();
    const total = exam?.total_questions || 0;
    const { count } = await supabase.from('mock_questions').select('*', { count: 'exact', head: true }).eq('exam_id', eId);
    const current = count || 0;
    return { remaining: Math.max(0, total - current), total, current };
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'questions') {
      fetchBankQuestions();
      if (selectedExam) fetchQuestions();
    }
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab]);

  useEffect(() => {
    if (assignTargetExam) {
      getExamCapacity(assignTargetExam).then(setAssignCapacity);
    } else {
      setAssignCapacity(null);
    }
  }, [assignTargetExam]);

  async function fetchData() {
    setLoading(true);
    const { data: examsData } = await supabase.from('mock_exams').select('*').order('created_at', { ascending: false });
    if (examsData) setExams(examsData);
    setLoading(false);
  }

  async function fetchBankQuestions() {
    let query = supabase.from('question_bank').select('*');
    if (bankFilter.level) query = query.eq('level', bankFilter.level);
    if (bankFilter.subject) query = query.eq('subject', bankFilter.subject);
    if (bankFilter.difficulty) query = query.eq('difficulty_level', bankFilter.difficulty);
    if (bankFilter.questionType) query = query.eq('question_type', bankFilter.questionType);
    if (bankFilter.search) query = query.ilike('question', `%${bankFilter.search}%`);
    query = query.order('created_at', { ascending: false });
    const { data } = await query;
    if (data) {
      // Fetch assignment info for each question
      const { data: mockQs } = await supabase.from('mock_questions').select('id, exam_id, question');
      const examAssignments: Record<string, Set<string>> = {};
      if (mockQs) {
        for (const q of data) {
          const matched = mockQs.filter(mq => mq.question === q.question);
          if (matched.length > 0) {
            examAssignments[q.id] = new Set(matched.map(m => m.exam_id));
          }
        }
      }
      setBankQuestions(data.map(q => ({ ...q, _examAssignments: examAssignments[q.id] || new Set() })));
    }
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

  // ── Exam CRUD ──

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

      // Auto-populate from question bank
      const examId = data.exam.id;
      const popRes = await fetch('/api/mock-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'populate_from_bank', id: examId }),
      });
      const popData = await popRes.json();
      if (popData.success && popData.count > 0) {
        setSuccess(`Exam created and auto-populated with ${popData.count} questions from bank`);
      } else if (popData.success && popData.count === 0) {
        setSuccess('Exam created. No questions found in bank for auto-population — add questions manually.');
      }

      setShowExamModal(false);
      fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleUpdateExam() {
    if (!editingExam || !formData.title.trim()) {
      setError('Title is required');
      return;
    }
    setError(''); setSaving(true);
    try {
      const res = await fetch('/api/mock-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_exam', id: editingExam.id,
          title: formData.title, description: formData.description,
          exam_date: formData.exam_date || null,
          duration_minutes: formData.duration_minutes,
          passing_score: formData.passing_score,
          total_questions: formData.total_questions,
          shuffle_questions: formData.shuffle_questions,
          require_fullscreen: formData.require_fullscreen,
          prevent_tab_switch: formData.prevent_tab_switch,
          max_tab_switches: formData.max_tab_switches,
          max_attempts: formData.max_attempts,
          is_published: true,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Exam updated');
      setShowEditExamModal(false);
      setEditingExam(null);
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

  async function handlePopulateFromBank(examId: string) {
    setSaving(true);
    try {
      const res = await fetch('/api/mock-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'populate_from_bank', id: examId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess(`Populated with ${data.count} questions from bank`);
      fetchData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleAddFromBank() {
    if (!selectedExam || selectedBankIds.size === 0) {
      setError('Select an exam and at least one question');
      return;
    }
    const cap = await getExamCapacity(selectedExam.id);
    if (cap.remaining < selectedBankIds.size) {
      setError(`Cannot add ${selectedBankIds.size} question(s). Only ${cap.remaining} slot(s) remaining (${cap.current}/${cap.total}).`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/mock-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_from_bank',
          exam_id: selectedExam.id,
          question_ids: Array.from(selectedBankIds),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess(`Added ${data.count} question(s) from bank`);
      setShowBankSelectModal(false);
      setSelectedBankIds(new Set());
      fetchQuestions();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  // ── Question Bank CRUD ──

  async function handleSaveBankQuestion() {
    if (!bankQuestionData.question.trim() || !bankQuestionData.subject || !bankQuestionData.topic) {
      setError('Question text, subject, and topic are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        question: bankQuestionData.question,
        options: bankQuestionData.options,
        correct_answer: bankQuestionData.correct_answer,
        points: bankQuestionData.points,
        question_type: bankQuestionData.question_type === 'multiple_choice' ? 'MCQ' : bankQuestionData.question_type === 'true_false' ? 'TRUE_FALSE' : 'FILL_IN_THE_GAP',
        subject: bankQuestionData.subject,
        difficulty_level: bankQuestionData.difficulty_level,
        topic: bankQuestionData.topic,
        subtopic: bankQuestionData.subtopic || null,
        explanation: bankQuestionData.explanation || null,
        curriculum: bankQuestionData.curriculum || null,
        level: bankQuestionData.level,
        status: 'published',
        created_by: profile?.id,
      };

      if (editingBankQuestion) {
        const { error } = await supabase.from('question_bank').update(payload).eq('id', editingBankQuestion.id);
        if (error) throw new Error(error.message);
        setSuccess('Question updated in bank');
      } else {
        const { error } = await supabase.from('question_bank').insert(payload);
        if (error) throw new Error(error.message);
        setSuccess('Question added to bank');
      }

      setShowBankQuestionModal(false);
      setEditingBankQuestion(null);
      resetBankQuestionForm();
      fetchBankQuestions();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteBankQuestion(qId: string) {
    if (!confirm('Delete this question permanently?')) return;
    const { error } = await supabase.from('question_bank').delete().eq('id', qId);
    if (error) { setError(error.message); return; }
    setSuccess('Question deleted from bank');
    fetchBankQuestions();
  }

  function openEditBankQuestion(q: any) {
    setEditingBankQuestion(q);
    setBankQuestionData({
      question: q.question,
      options: q.options || ['', '', '', ''],
      correct_answer: q.correct_answer ?? 0,
      points: q.points || 1,
      question_type: q.question_type === 'TRUE_FALSE' ? 'true_false' : q.question_type === 'FILL_IN_THE_GAP' || q.question_type === 'FILL_BLANK' ? 'fill_blank' : 'multiple_choice',
      subject: q.subject || 'MATHEMATICS',
      difficulty_level: q.difficulty_level || 'MEDIUM',
      topic: q.topic || '',
      subtopic: q.subtopic || '',
      explanation: q.explanation || '',
      curriculum: q.curriculum || 'Both',
      level: q.level || 'JSS3',
    });
    setShowBankQuestionModal(true);
  }

  function resetBankQuestionForm() {
    setBankQuestionData({
      question: '', options: ['', '', '', ''], correct_answer: 0, points: 1,
      question_type: 'multiple_choice', subject: 'MATHEMATICS',
      difficulty_level: 'MEDIUM', topic: '', subtopic: '', explanation: '',
      curriculum: 'Both', level: 'JSS3',
    });
  }

  // ── Per-exam manual question ──

  async function handleAddQuestion() {
    if (!selectedExam || !questionData.question.trim()) {
      setError('Question text is required');
      return;
    }
    const cap = await getExamCapacity(selectedExam.id);
    if (cap.remaining < 1) {
      setError(`Exam capacity reached (${cap.current}/${cap.total}). No more questions can be added.`);
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

  async function handleEditMockQ(q: any) {
    setEditingMockQ(q);
    setMockQForm({
      question: q.question,
      options: q.options || ['', '', '', ''],
      correct_answer: q.correct_answer ?? 0,
      subject: q.subject || 'MATHEMATICS',
      difficulty_level: q.difficulty_level || 'MEDIUM',
      topic: q.topic || '',
      explanation: q.explanation || '',
    });
    setShowEditMockQModal(true);
  }

  async function handleSaveMockQ() {
    if (!editingMockQ || !mockQForm.question.trim()) {
      setError('Question text is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/mock-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_question', id: editingMockQ.id,
          question: mockQForm.question, options: mockQForm.options,
          correct_answer: mockQForm.correct_answer,
          subject: mockQForm.subject,
          difficulty_level: mockQForm.difficulty_level,
          topic: mockQForm.topic, explanation: mockQForm.explanation,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuccess('Question updated');
      setShowEditMockQModal(false);
      setEditingMockQ(null);
      fetchQuestions();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  function resetQuestionDefaults(type: string) {
    let opts = ['', '', '', ''];
    let correct = 0;
    if (type === 'true_false' || type === 'TRUE_FALSE') { opts = ['True', 'False']; correct = 0; }
    else if (type === 'fill_blank' || type === 'FILL_IN_THE_GAP') { opts = []; correct = 0; }
    setQuestionData({ ...questionData, options: opts, correct_answer: correct, question_type: type });
  }

  function resetBankQuestionDefaults(type: string) {
    let opts = ['', '', '', ''];
    let correct = 0;
    if (type === 'true_false' || type === 'TRUE_FALSE') { opts = ['True', 'False']; correct = 0; }
    else if (type === 'fill_blank' || type === 'FILL_IN_THE_GAP') { opts = []; correct = 0; }
    setBankQuestionData({ ...bankQuestionData, options: opts, correct_answer: correct, question_type: type });
  }

  function openEditExam(exam: any) {
    setEditingExam(exam);
    setFormData({
      title: exam.title, description: exam.description || '',
      exam_type: exam.exam_type, class_level: exam.exam_type === 'JSS3_BECE' ? 'JSS3' : 'SS3',
      academic_year: exam.academic_year, exam_date: exam.exam_date || '',
      duration_minutes: exam.duration_minutes, passing_score: exam.passing_score,
      total_questions: exam.total_questions, shuffle_questions: exam.shuffle_questions,
      require_fullscreen: exam.require_fullscreen, prevent_tab_switch: exam.prevent_tab_switch,
      max_tab_switches: exam.max_tab_switches, max_attempts: exam.max_attempts,
    });
    setShowEditExamModal(true);
  }

  function openAddFromBank(exam: any) {
    setSelectedExam(exam);
    setSelectedBankIds(new Set());
    setAssignTargetExam(exam.id);
    setShowBankSelectModal(true);
    setBankFilter(prev => ({ ...prev, level: exam.exam_type === 'JSS3_BECE' ? 'JSS3' : 'SS3' }));
    fetchBankQuestions();
  }

  // Analytics helpers
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

  const availableSubjects = (level: string) => level === 'SS3' ? SS3_SUBJECTS : SUBJECTS;

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
              {tab === 'questions' && <><Database size={14} className="inline mr-1" /> Questions</>}
              {tab === 'students' && <><Users size={14} className="inline mr-1" /> Students</>}
              {tab === 'analytics' && <><BarChart3 size={14} className="inline mr-1" /> Analytics</>}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2"><AlertCircle size={16} /> {error} <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button></div>}
        {success && <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2"><Check size={16} /> {success} <button onClick={() => setSuccess('')} className="ml-auto"><X size={16} /></button></div>}

        {/* ═══════════════ EXAMS TAB ═══════════════ */}
        {activeTab === 'exams' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Mock Exams</h2>
              <button onClick={() => { resetBankQuestionForm(); setShowExamModal(true); }} className="btn-primary flex items-center gap-2">
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
                        <button onClick={() => openEditExam(exam)} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Edit Exam">
                          <Edit size={16} className="text-slate-500" />
                        </button>
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
                    <div className="flex items-center gap-2 pt-3 border-t text-xs">
                      <button onClick={() => handlePopulateFromBank(exam.id)} className="text-primary-600 hover:underline flex items-center gap-1">
                        <Database size={12} /> Populate from Bank
                      </button>
                      <button onClick={() => openAddFromBank(exam)} className="text-amber-600 hover:underline flex items-center gap-1">
                        <Plus size={12} /> Add from Bank
                      </button>
                      <span className="ml-auto text-slate-400">{exam.academic_year}</span>
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
                    <p className="text-xs text-slate-500 bg-blue-50 p-2 rounded">Questions will auto-populate from the question bank based on the selected exam type.</p>
                    <button onClick={handleCreateExam} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      Create Exam
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Exam Modal */}
            {showEditExamModal && editingExam && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditExamModal(false)}>
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Edit Exam</h3>
                    <button onClick={() => setShowEditExamModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input className="input-field w-full" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea className="input-field w-full" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
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
                    <button onClick={handleUpdateExam} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      Update Exam
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add from Bank Modal */}
            {showBankSelectModal && selectedExam && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBankSelectModal(false)}>
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Add Questions from Bank — {selectedExam.title}</h3>
                    <button onClick={() => setShowBankSelectModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
                  </div>
                  {bankQuestions.length === 0 ? (
                    <div className="text-center py-8">
                      <Database size={40} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500">No questions found in the question bank for {selectedExam.exam_type === 'JSS3_BECE' ? 'JSS3' : 'SS3'}.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3 text-sm text-slate-500">
                        <span>{bankQuestions.length} questions available</span>
                        {assignCapacity && (
                          <span className="ml-auto">Capacity: {assignCapacity.current}/{assignCapacity.total} used ({assignCapacity.remaining} free)</span>
                        )}
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {bankQuestions.map(q => (
                          <div key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border ${selectedBankIds.has(q.id) ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}>
                            <input
                              type="checkbox"
                              checked={selectedBankIds.has(q.id)}
                              onChange={() => {
                                const next = new Set(selectedBankIds);
                                if (next.has(q.id)) next.delete(q.id); else next.add(q.id);
                                setSelectedBankIds(next);
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900">{q.question}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">{q.subject}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  q.difficulty_level === 'EASY' ? 'bg-green-100 text-green-700' :
                                  q.difficulty_level === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                                  q.difficulty_level === 'HARD' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>{q.difficulty_level}</span>
                                <span className="text-xs text-slate-400">{q.topic}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
                        <button onClick={() => { setSelectedBankIds(new Set()); setShowBankSelectModal(false); }} className="btn-outline text-sm">
                          Cancel
                        </button>
                        <button
                          onClick={handleAddFromBank}
                          disabled={saving || selectedBankIds.size === 0}
                          className="btn-primary text-sm flex items-center gap-2"
                        >
                          {saving && <Loader2 size={14} className="animate-spin" />}
                          Add {selectedBankIds.size > 0 ? `(${selectedBankIds.size})` : ''} Selected
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ QUESTIONS TAB ═══════════════ */}
        {activeTab === 'questions' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Mock Question Bank</h2>
              <button onClick={() => { setEditingBankQuestion(null); resetBankQuestionForm(); setShowBankQuestionModal(true); }} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Question
              </button>
            </div>

            {/* Per-Exam Questions */}
            {selectedExam && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen size={16} /> Questions in: {selectedExam.title}
                  </h3>
                  <button onClick={() => { setSelectedExam(null); setQuestions([]); }} className="text-xs text-slate-500 hover:underline">
                    Clear
                  </button>
                </div>
                {questions.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">No questions added yet. Use the bank below or click "Populate from Bank" on the exam card.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {questions.map((q, qi) => (
                      <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-400 mt-1 w-6 shrink-0">{qi + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{q.question}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">{q.subject}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              q.difficulty_level === 'EASY' ? 'bg-green-100 text-green-700' :
                              q.difficulty_level === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                              q.difficulty_level === 'HARD' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>{q.difficulty_level}</span>
                            <span className="text-xs text-slate-400">{q.topic}</span>
                            <span className="text-xs text-slate-400">{q.points} pt(s)</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleEditMockQ(q)} className="p-1 hover:bg-slate-200 rounded" title="Edit">
                            <Edit size={14} className="text-slate-500" />
                          </button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 hover:bg-red-100 rounded" title="Remove from exam">
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Class</label>
                <select className="input-field text-sm" value={bankFilter.level} onChange={e => { setBankFilter({ ...bankFilter, level: e.target.value as any }); }}>
                  <option value="">All Classes</option>
                  <option value="JSS3">JSS3</option>
                  <option value="SS3">SS3</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
                <select className="input-field text-sm" value={bankFilter.subject} onChange={e => setBankFilter({ ...bankFilter, subject: e.target.value })}>
                  <option value="">All Subjects</option>
                  {bankFilter.level === 'SS3' ? SS3_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>) : SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Difficulty</label>
                <select className="input-field text-sm" value={bankFilter.difficulty} onChange={e => setBankFilter({ ...bankFilter, difficulty: e.target.value })}>
                  <option value="">All</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                <select className="input-field text-sm" value={bankFilter.questionType} onChange={e => setBankFilter({ ...bankFilter, questionType: e.target.value })}>
                  <option value="">All</option>
                  {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
                <input className="input-field w-full text-sm" placeholder="Search questions..." value={bankFilter.search} onChange={e => setBankFilter({ ...bankFilter, search: e.target.value })} />
              </div>
              <button onClick={fetchBankQuestions} className="btn-outline text-sm flex items-center gap-1">
                <Filter size={14} /> Filter
              </button>
            </div>

            {/* Assign to Exam bar (visible when bank questions exist) */}
            {bankQuestions.length > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <span className="text-sm font-medium text-amber-800">Assign to Exam:</span>
                <select className="input-field text-sm flex-1 max-w-xs" value={assignTargetExam} onChange={e => setAssignTargetExam(e.target.value)}>
                  <option value="">Select exam...</option>
                  {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                </select>
                {assignCapacity && (
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {assignCapacity.current}/{assignCapacity.total} used ({assignCapacity.remaining} free)
                  </span>
                )}
                <button
                  onClick={async () => {
                    if (!assignTargetExam || selectedBankIds.size === 0) { setError('Select an exam and questions'); return; }
                    const cap = await getExamCapacity(assignTargetExam);
                    if (cap.remaining < selectedBankIds.size) {
                      setError(`Cannot add ${selectedBankIds.size} question(s). Only ${cap.remaining} slot(s) remaining (${cap.current}/${cap.total}).`);
                      return;
                    }
                    setSaving(true);
                    try {
                      const res = await fetch('/api/mock-questions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'add_from_bank', exam_id: assignTargetExam, question_ids: Array.from(selectedBankIds) }),
                      });
                      const data = await res.json();
                      if (!data.success) throw new Error(data.error);
                      setSuccess(`Added ${data.count} question(s) to exam`);
                      setSelectedBankIds(new Set());
                      fetchBankQuestions();
                      fetchData();
                    } catch (err: any) { setError(err.message); }
                    finally { setSaving(false); }
                  }}
                  disabled={saving || !assignTargetExam || selectedBankIds.size === 0}
                  className="btn-primary text-sm"
                >
                  Assign {selectedBankIds.size > 0 ? `(${selectedBankIds.size})` : ''}
                </button>
                {selectedBankIds.size > 0 && (
                  <button onClick={() => setSelectedBankIds(new Set())} className="text-xs text-slate-500 hover:underline">Clear</button>
                )}
              </div>
            )}

            {/* Questions list */}
            {bankQuestions.length === 0 ? (
              <div className="card text-center py-16">
                <Database size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No questions in the mock question bank. Add questions or adjust filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bankQuestions.map(q => (
                  <div key={q.id} className={`card border-l-4 ${selectedBankIds.has(q.id) ? 'border-primary-500 bg-primary-50/30' : 'border-transparent'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedBankIds.has(q.id)}
                        onChange={() => {
                          const next = new Set(selectedBankIds);
                          if (next.has(q.id)) next.delete(q.id); else next.add(q.id);
                          setSelectedBankIds(next);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-900">{q.question}</p>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEditBankQuestion(q)} className="p-1 hover:bg-slate-100 rounded"><Edit size={14} className="text-slate-400" /></button>
                            <button onClick={() => handleDeleteBankQuestion(q.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 size={14} className="text-red-400" /></button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-medium">{q.subject}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{q.level}</span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            q.difficulty_level === 'EASY' ? 'bg-green-100 text-green-700' :
                            q.difficulty_level === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                            q.difficulty_level === 'HARD' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>{q.difficulty_level}</span>
                          <span className="text-slate-400">{q.topic}{q.subtopic ? ` / ${q.subtopic}` : ''}</span>
                        </div>
                        {q.options && q.options.length > 0 && q.question_type !== 'FILL_IN_THE_GAP' && q.question_type !== 'fill_blank' && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {q.options.map((opt: string, oi: number) => (
                              <span key={oi} className={`text-xs px-2 py-0.5 rounded ${q.correct_answer === oi ? 'bg-green-100 text-green-700 font-medium' : 'bg-slate-50 text-slate-500'}`}>
                                {String.fromCharCode(65 + oi)}. {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Show exam assignments */}
                        {q._examAssignments && q._examAssignments.size > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            <span className="text-[10px] text-slate-400">Assigned to:</span>
                            {exams.filter(ex => q._examAssignments.has(ex.id)).map(ex => (
                              <span key={ex.id} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200">
                                {ex.title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bank Question Modal (Add/Edit) */}
            {showBankQuestionModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBankQuestionModal(false)}>
                <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">{editingBankQuestion ? 'Edit' : 'Add'} Question to Bank</h3>
                    <button onClick={() => setShowBankQuestionModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Question Type</label>
                      <select className="input-field w-full" value={bankQuestionData.question_type} onChange={e => resetBankQuestionDefaults(e.target.value)}>
                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Question Text</label>
                      <textarea className="input-field w-full" value={bankQuestionData.question} onChange={e => setBankQuestionData({ ...bankQuestionData, question: e.target.value })} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Class Level</label>
                        <select className="input-field w-full" value={bankQuestionData.level} onChange={e => {
                          const level = e.target.value;
                          const subs = level === 'SS3' ? SS3_SUBJECTS : SUBJECTS;
                          const sub = subs.includes(bankQuestionData.subject) ? bankQuestionData.subject : subs[0];
                          setBankQuestionData({ ...bankQuestionData, level, subject: sub });
                        }}>
                          <option value="JSS3">JSS3</option>
                          <option value="SS3">SS3</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Subject</label>
                        <select className="input-field w-full" value={bankQuestionData.subject} onChange={e => setBankQuestionData({ ...bankQuestionData, subject: e.target.value })}>
                          {availableSubjects(bankQuestionData.level).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Difficulty</label>
                        <select className="input-field w-full" value={bankQuestionData.difficulty_level} onChange={e => setBankQuestionData({ ...bankQuestionData, difficulty_level: e.target.value })}>
                          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Topic</label>
                        <input className="input-field w-full" value={bankQuestionData.topic} onChange={e => setBankQuestionData({ ...bankQuestionData, topic: e.target.value })} placeholder="e.g. Algebra, Grammar" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sub-topic (optional)</label>
                      <input className="input-field w-full" value={bankQuestionData.subtopic} onChange={e => setBankQuestionData({ ...bankQuestionData, subtopic: e.target.value })} />
                    </div>
                    {(bankQuestionData.question_type === 'multiple_choice' || bankQuestionData.question_type === 'MCQ') && bankQuestionData.options.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Options</label>
                        {bankQuestionData.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold w-6 text-slate-500">{String.fromCharCode(65 + oi)}.</span>
                            <input className="input-field flex-1" value={opt} onChange={e => {
                              const opts = [...bankQuestionData.options];
                              opts[oi] = e.target.value;
                              setBankQuestionData({ ...bankQuestionData, options: opts });
                            }} />
                            <input type="radio" name="bank_correct" checked={bankQuestionData.correct_answer === oi} onChange={() => setBankQuestionData({ ...bankQuestionData, correct_answer: oi })} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Explanation (optional)</label>
                      <textarea className="input-field w-full" value={bankQuestionData.explanation} onChange={e => setBankQuestionData({ ...bankQuestionData, explanation: e.target.value })} rows={2} />
                    </div>
                    <button onClick={handleSaveBankQuestion} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      {editingBankQuestion ? 'Update Question' : 'Add Question to Bank'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Mock Question Modal */}
            {showEditMockQModal && editingMockQ && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditMockQModal(false)}>
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Edit Exam Question</h3>
                    <button onClick={() => setShowEditMockQModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Question</label>
                      <textarea className="input-field w-full" value={mockQForm.question} onChange={e => setMockQForm({ ...mockQForm, question: e.target.value })} rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Subject</label>
                        <select className="input-field w-full" value={mockQForm.subject} onChange={e => setMockQForm({ ...mockQForm, subject: e.target.value })}>
                          {availableSubjects(selectedExam?.exam_type === 'JSS3_BECE' ? 'JSS3' : 'SS3').map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Difficulty</label>
                        <select className="input-field w-full" value={mockQForm.difficulty_level} onChange={e => setMockQForm({ ...mockQForm, difficulty_level: e.target.value })}>
                          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Options</label>
                      {mockQForm.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold w-6 text-slate-500">{String.fromCharCode(65 + oi)}.</span>
                          <input className="input-field flex-1" value={opt} onChange={e => {
                            const opts = [...mockQForm.options];
                            opts[oi] = e.target.value;
                            setMockQForm({ ...mockQForm, options: opts });
                          }} />
                          <input type="radio" name="mq_correct" checked={mockQForm.correct_answer === oi} onChange={() => setMockQForm({ ...mockQForm, correct_answer: oi })} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Topic</label>
                      <input className="input-field w-full" value={mockQForm.topic} onChange={e => setMockQForm({ ...mockQForm, topic: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Explanation</label>
                      <textarea className="input-field w-full" value={mockQForm.explanation} onChange={e => setMockQForm({ ...mockQForm, explanation: e.target.value })} rows={2} />
                    </div>
                    <button onClick={handleSaveMockQ} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                      {saving && <Loader2 size={16} className="animate-spin" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════ STUDENTS TAB ═══════════════ */}
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

        {/* ═══════════════ ANALYTICS TAB ═══════════════ */}
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="card"><p className="text-xs text-slate-500">Total Students</p><p className="text-2xl font-bold">{allAttemptsAnalytics.length}</p></div>
                  <div className="card"><p className="text-xs text-slate-500">Total Attempts</p><p className="text-2xl font-bold">{attempts.length}</p></div>
                  <div className="card"><p className="text-xs text-slate-500">Average Score</p><p className="text-2xl font-bold text-blue-600">{avgScore}%</p></div>
                  <div className="card"><p className="text-xs text-slate-500">Pass Rate</p><p className="text-2xl font-bold text-green-600">{attempts.length > 0 ? Math.round((attempts.filter((a: any) => a.score >= 50).length / attempts.length) * 100) : 0}%</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <div className="card">
                    <h3 className="font-bold text-slate-800 mb-4">Student Average Scores</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={allAttemptsAnalytics.slice(0, 10).map((s: any) => ({
                        name: s.student?.first_name ? `${s.student.first_name} ${s.student.lastName?.charAt(0)}.` : 'Unknown',
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
