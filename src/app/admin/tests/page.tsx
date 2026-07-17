'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Plus, Edit, Trash2, X, FileText, BarChart3, Check, Loader2, Search, Users, Clock, Eye, Send, Download, Hash, Copy, HelpCircle } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';

export default function AdminTestsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    title: '', description: '', subject_id: '', class_id: '', test_type: 'class_test',
    exam_date: '', duration_minutes: 30, total_marks: 100, passing_score: 50,
    total_questions: 10,
    shuffle_questions: false, shuffle_options: false, require_fullscreen: true,
    prevent_tab_switch: true, max_tab_switches: 3,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  // Question management state
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [questionForm, setQuestionForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '', topic: '', subtopic: '', difficulty_level: '' });
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Question bank selection
  const [showBankSelect, setShowBankSelect] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankFiltered, setBankFiltered] = useState<any[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());

  // Analysis state
  const [analysisTest, setAnalysisTest] = useState<any>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<any[]>([]);
  const [analysisAttempts, setAnalysisAttempts] = useState<any[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  async function api(action: string, data: any = {}) {
    const res = await fetch('/api/manage-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `Server error (${res.status})`);
    return json;
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const [testsRes, attemptsRes, subjectsRes, classesRes] = await Promise.all([
        api('list_tests'),
        api('list_attempts', { limit: '50' }),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('classes').select('id, name').order('level'),
      ]);
      if (testsRes.tests) setTests(testsRes.tests);
      if (attemptsRes.attempts) setAttempts(attemptsRes.attempts);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (classesRes.data) setClasses(classesRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tests');
    }
    setLoading(false);
  }

  function openModal(test?: any) {
    if (test) {
      setEditingTest(test);
      setFormData({
        title: test.title, description: test.description || '', subject_id: test.subject_id || '', class_id: test.class_id || '',
        test_type: test.test_type, exam_date: test.exam_date || '', duration_minutes: test.duration_minutes || 30,
        total_marks: test.total_marks || 100, total_questions: test.total_questions || 10, passing_score: test.passing_score || 50,
        shuffle_questions: test.shuffle_questions || false, shuffle_options: test.shuffle_options || false,
        require_fullscreen: test.require_fullscreen || false, prevent_tab_switch: test.prevent_tab_switch || false,
        max_tab_switches: test.max_tab_switches || 3,
      });
    } else {
      setEditingTest(null);
      setFormData({ title: '', description: '', subject_id: '', class_id: '', test_type: 'class_test',
        exam_date: '', duration_minutes: 30, total_marks: 100, passing_score: 50, total_questions: 10,
        shuffle_questions: false, shuffle_options: false, require_fullscreen: true,
        prevent_tab_switch: true, max_tab_switches: 3,
      });
    }
    setShowTestModal(true);
  }

  async function handleSave() {
    if (!formData.title.trim()) { setError('Title is required'); return; }
    setError(''); setSaving(true);
    try {
      const { total_questions, ...dbData } = formData;
      if (editingTest) {
        await api('update_test', { id: editingTest.id, ...dbData });
        setSuccess('Test updated');
      } else {
        await api('create_test', { ...dbData, created_by: profile?.id });
        setSuccess('Test created');
      }
      setTimeout(() => { setShowTestModal(false); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save test');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(test: any) {
    try {
      await api('update_test', { id: test.id, is_published: !test.is_published });
    } catch (err: any) {
      setError(err.message);
    }
    fetchData();
  }

  async function openQuestionModal(test: any) {
    setSelectedTest(test);
    setEditingQuestion(null);
    setQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '', topic: '', subtopic: '', difficulty_level: '' });
    const res = await api('list_questions', { test_id: test.id });
    setTestQuestions(res.questions || []);
    setShowQuestionModal(true);
  }

  function resetQuestionForm(type: string) {
    let opts = ['', '', '', ''];
    if (type === 'true_false') opts = ['True', 'False'];
    else if (type === 'fill_blank') opts = [];
    setQuestionForm({ ...questionForm, options: opts, correct_answer: 0, question_type: type });
  }

  async function handleSaveQuestion() {
    if (!selectedTest || !questionForm.question.trim()) return;
    setSavingQuestion(true);
    try {
      const payload = { test_id: selectedTest.id, question: questionForm.question, options: questionForm.options, correct_answer: questionForm.correct_answer, points: questionForm.points || 1, question_type: questionForm.question_type, order_index: testQuestions.length, subject: questionForm.subject || selectedTest.subject?.name || null, topic: questionForm.topic || null, subtopic: questionForm.subtopic || null, difficulty_level: questionForm.difficulty_level || null };
      if (editingQuestion) {
        await api('update_question', { id: editingQuestion.id, ...payload });
      } else {
        await api('create_question', payload);
      }
      const res = await api('list_questions', { test_id: selectedTest.id });
      if (res.questions) setTestQuestions(res.questions);
      setQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '', topic: '', subtopic: '', difficulty_level: '' });
      setEditingQuestion(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setSavingQuestion(false);
    }
  }

  function editTestQuestion(q: any) {
    setEditingQuestion(q);
    setQuestionForm({ question: q.question, options: q.options || ['', '', '', ''], correct_answer: q.correct_answer, points: q.points, question_type: q.question_type, subject: q.subject || '', topic: q.topic || '', subtopic: q.subtopic || '', difficulty_level: q.difficulty_level || '' });
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm('Remove this question?')) return;
    await api('delete_question', { id });
    setTestQuestions(prev => prev.filter(q => q.id !== id));
  }

  async function openBankSelect(test: any) {
    setSelectedTest(test);
    setSelectedBankIds(new Set());
    setBankSearch('');
    let query = supabase.from('question_bank').select('*').eq('status', 'published');
    const subjectName = test.subject?.name?.toUpperCase();
    if (subjectName) query = query.eq('subject', subjectName);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) { setError('Failed to load question bank: ' + error.message); setShowBankSelect(true); return; }
    setBankQuestions(data || []);
    setBankFiltered(data || []);
    setShowBankSelect(true);
  }

  function filterBank(q: string) {
    setBankSearch(q);
    const lower = q.toLowerCase();
    setBankFiltered(bankQuestions.filter((b: any) => b.question.toLowerCase().includes(lower)));
  }

  function toggleBankSelect(id: string) {
    setSelectedBankIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAddFromBank() {
    if (!selectedTest || selectedBankIds.size === 0) return;
    setSaving(true);
    try {
      const { data: selected } = await supabase.from('question_bank').select('*').in('id', Array.from(selectedBankIds));
      if (selected && selected.length > 0) {
        const questions = selected.map((q: any) => ({
          test_id: selectedTest.id, question: q.question, options: q.options || [''], correct_answer: q.correct_answer ?? 0,
          points: q.points ?? 1, question_type: q.question_type || 'multiple_choice', order_index: testQuestions.length,
          subject: q.subject || null, topic: q.topic || null, subtopic: q.subtopic || null, difficulty_level: q.difficulty_level || null,
        }));
        const res = await api('bulk_insert_questions', { test_id: selectedTest.id, questions });
        if (res.questions) setTestQuestions(res.questions);
        setSuccess(`Added ${questions.length} question(s) from bank`);
      }
      setShowBankSelect(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add questions');
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoPopulate(test: any) {
    if (!test.subject_id) { setWarning('Select a subject for this test first'); return; }
    setSaving(true);
    try {
      let bankQuery = supabase.from('question_bank').select('*').eq('status', 'published');
      const subjectName = test.subject?.name?.toUpperCase();
      if (subjectName) bankQuery = bankQuery.eq('subject', subjectName);
      const { data: allBank } = await bankQuery;
      if (allBank && allBank.length > 0) {
        const count = formData.total_questions || 10;
        const shuffled = allBank.sort(() => Math.random() - 0.5).slice(0, Math.min(allBank.length, count));
        const questions = shuffled.map((q: any) => ({
          test_id: test.id, question: q.question, options: q.options || [''], correct_answer: q.correct_answer ?? 0,
          points: q.points ?? 1, question_type: q.question_type || 'multiple_choice', order_index: 0,
          subject: q.subject || null, topic: q.topic || null, subtopic: q.subtopic || null, difficulty_level: q.difficulty_level || null,
        }));
        const res = await api('bulk_insert_questions', { test_id: test.id, questions });
        if (res.questions) setTestQuestions(res.questions);
        setSuccess(`Auto-populated ${questions.length} questions`);
      } else {
        setWarning('No questions found in the question bank');
      }
    } catch (err: any) {
      setError(err.message || 'Auto-populate failed');
    } finally {
      setSaving(false);
    }
  }

  async function openAnalysis(test: any) {
    setAnalysisTest(test);
    setShowAnalysis(true);
    setAnalysisLoading(true);
    try {
      const [questionsRes, attemptsRes] = await Promise.all([
        api('list_questions', { test_id: test.id }),
        api('list_attempts', { test_id: test.id }),
      ]);
      const questions = questionsRes.questions || [];
      const attempts = attemptsRes.attempts || [];
      setAnalysisAttempts(attempts);

      const gradeQ = (q: any, answer: any): boolean => {
        if (answer === undefined || answer === null) return false;
        switch (q.question_type) {
          case 'multiple_choice':
          case 'true_false':
            return answer === q.correct_answer;
          case 'fill_blank': {
            const correct = q.options?.[q.correct_answer];
            if (!correct) return false;
            return answer.toString().toLowerCase().trim() === correct.toString().toLowerCase().trim();
          }
          case 'multiple_selection': {
            const a = Array.isArray(answer) ? [...answer].sort() : [];
            const c = Array.isArray(q.correct_answer) ? [...q.correct_answer].sort() : [];
            return JSON.stringify(a) === JSON.stringify(c);
          }
          case 'short_answer':
            return false;
          default:
            return answer === q.correct_answer;
        }
      };

      // Per-question analysis
      const analysis = questions.map((q: any, i: number) => {
        let correct = 0, total = 0;
        const studentResults: any[] = [];
        attempts.forEach((a: any) => {
          const answers = typeof a.answers === 'string' ? JSON.parse(a.answers) : (a.answers || {});
          const studentAnswer = answers[i];
          if (studentAnswer !== undefined) {
            total++;
            const isCorrect = gradeQ(q, studentAnswer);
            if (isCorrect) correct++;
            studentResults.push({ student: a.student, answer: studentAnswer, correct: isCorrect });
          }
        });
        return { ...q, correct, total, percentage: total > 0 ? Math.round((correct / total) * 100) : 0, studentResults };
      });
      setAnalysisData(analysis);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test and all associated questions and attempts?')) return;
    setDeleting(id);
    try {
      await api('delete_test', { id });
      setSuccess('Test deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete test');
    } finally {
      setDeleting(null);
    }
  }

  const filtered = tests.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || t.test_type === filterType;
    return matchSearch && matchType;
  });

  const publishedTests = tests.filter(t => t.is_published);
  const draftTests = tests.filter(t => !t.is_published);
  const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s: number, a: any) => s + (a.score || 0), 0) / attempts.length) : 0;
  const totalAttempts = attempts.length;

  return (
    <DashboardLayout title="Tests & Exams" subtitle="Manage assessments and track student performance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Tests & Exams</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Manage assessments and track student performance</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2"><Plus size={18} />Create Test</button>
        </div>

        {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm">{success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}
        {warning && <div className="bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40 rounded-lg p-3 text-amber-700 dark:text-amber-300 dark:text-amber-300 text-sm">{warning}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Total Tests</span><FileText size={16} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div><p className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">{tests.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Published</span><Check size={16} className="text-green-600 dark:text-green-400 dark:text-green-400" /></div><p className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">{publishedTests.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Attempts</span><Users size={16} className="text-purple-600 dark:text-purple-400 dark:text-purple-400" /></div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400 dark:text-purple-400">{totalAttempts}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Avg Score</span><BarChart3 size={16} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" /></div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{avgScore}%</p></div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-500" size={18} /><input type="text" placeholder="Search tests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-auto">
            <option value="all">All Types</option>
            <option value="class_test">Class Test</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="term">Term</option>
            <option value="practice">Practice</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><FileText className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">{tests.length === 0 ? 'No tests created yet' : 'No tests match your filters'}</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(test => (
              <div key={test.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 dark:border-slate-700">
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 rounded-lg flex items-center justify-center"><FileText size={20} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white dark:text-white">{test.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{test.subject?.name || 'No Subject'} • {test.class?.name || 'No Class'} • {test.test_type.replace('_', ' ')} • {test.total_marks} marks</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${test.is_published ? 'bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300'}`}>{test.is_published ? 'Published' : 'Draft'}</span>
                  {test.exam_date && <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 flex items-center gap-1"><Clock size={12} />{formatDate(test.exam_date)}</span>}
                  <button onClick={() => togglePublish(test)} className="p-1.5 hover:bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 dark:text-green-400" title={test.is_published ? 'Unpublish' : 'Publish'}><Send size={15} /></button>
                  <button onClick={() => { setSelectedTest(test); openQuestionModal(test); }} className="p-1.5 hover:bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 rounded-lg" title="Manage Questions"><HelpCircle size={15} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" /></button>
                  <button onClick={() => openAnalysis(test)} className="p-1.5 hover:bg-purple-50 dark:bg-purple-900/20 dark:bg-purple-900/20 rounded-lg" title="View Analysis"><BarChart3 size={15} className="text-purple-600 dark:text-purple-400 dark:text-purple-400" /></button>
                  <button onClick={() => openModal(test)} className="p-1.5 hover:bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 rounded-lg"><Edit size={15} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" /></button>
                  <button onClick={() => handleDelete(test.id)} disabled={deleting === test.id} className="p-1.5 hover:bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 rounded-lg disabled:opacity-50">{deleting === test.id ? <Loader2 size={15} className="text-red-600 dark:text-red-400 dark:text-red-400 animate-spin" /> : <Trash2 size={15} className="text-red-600 dark:text-red-400 dark:text-red-400" />}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {attempts.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><Users size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Recent Attempts</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700"><tr><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Student</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase hidden sm:table-cell">Test</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Score</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase hidden md:table-cell">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{attempts.slice(0, 10).map(a => (<tr key={a.id} className="hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800"><td className="py-3 px-4 font-medium text-slate-900 dark:text-white dark:text-white">{a.student?.first_name} {a.student?.last_name}</td><td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 hidden sm:table-cell">{a.test?.title}</td><td className="py-3 px-4"><span className={`font-semibold ${a.score >= 50 ? 'text-green-600 dark:text-green-400 dark:text-green-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>{a.score}%</span></td><td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 hidden md:table-cell">{formatDate(a.created_at)}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl"><h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{editingTest ? 'Edit Test' : 'Create Test'}</h3><button onClick={() => setShowTestModal(false)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" /></button></div>
            <div className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}
              <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="e.g., Mathematics Mid-Term" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Subject</label><select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="label">Class</label><select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="input"><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Type</label>                    <select value={formData.test_type} onChange={(e) => setFormData({ ...formData, test_type: e.target.value })} className="input"><option value="class_test">Class Test</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="term">Term</option><option value="practice">Practice</option></select></div><div><label className="label">Date</label><input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} className="input" /></div></div>
              <div className="grid grid-cols-4 gap-4"><div><label className="label">Duration (min)</label><input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} className="input" /></div><div><label className="label">Total Marks</label><input type="number" value={formData.total_marks} onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })} className="input" /></div><div><label className="label">Questions</label><input type="number" value={formData.total_questions} onChange={(e) => setFormData({ ...formData, total_questions: parseInt(e.target.value) })} className="input" /></div><div><label className="label">Pass %</label><input type="number" value={formData.passing_score} onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })} className="input" /></div></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} /></div>
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-3 text-sm">Security Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.shuffle_questions} onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">Shuffle Questions</p><p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">Display questions in random order for each student</p></div></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.shuffle_options} onChange={(e) => setFormData({ ...formData, shuffle_options: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">Shuffle Options</p><p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">Randomize answer option order for each student</p></div></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.require_fullscreen} onChange={(e) => setFormData({ ...formData, require_fullscreen: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">Require Fullscreen</p><p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">Force fullscreen mode during the exam</p></div></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.prevent_tab_switch} onChange={(e) => setFormData({ ...formData, prevent_tab_switch: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">Prevent Tab Switching</p><p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">Auto-submit test if student switches tabs too many times</p></div></label>
                  {formData.prevent_tab_switch && <div><label className="label text-xs">Max Allowed Tab Switches</label><input type="number" value={formData.max_tab_switches} onChange={(e) => setFormData({ ...formData, max_tab_switches: parseInt(e.target.value) })} className="input" min={1} max={10} /></div>}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-white sticky bottom-0"><button onClick={() => setShowTestModal(false)} className="btn-ghost">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : editingTest ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
        )}

      {/* Question Management Modal */}
      {showQuestionModal && selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">Questions — {selectedTest.title}</h3>
              <button onClick={() => setShowQuestionModal(false)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{testQuestions.length} question(s)</p>
                <div className="flex gap-2">
                  <button onClick={() => openBankSelect(selectedTest)} className="btn-outline text-sm flex items-center gap-1.5"><Copy size={14} />From Bank</button>
                  <button onClick={() => handleAutoPopulate(selectedTest)} disabled={saving} className="btn-outline text-sm flex items-center gap-1.5"><Download size={14} />Auto-populate</button>
                </div>
              </div>

              {testQuestions.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-lg p-2">
                  {testQuestions.map((q, i) => (
                    <div key={q.id} className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white dark:text-white"><span className="text-slate-400 dark:text-slate-500 dark:text-slate-500">#{i + 1}</span> {q.question}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">{q.question_type.replace('_', ' ')} • {q.points} pt(s) {q.options?.length ? `• ${q.options.length} options` : ''}</p>
                      </div>
                      <div className="flex gap-1 ml-3">
                        <button onClick={() => editTestQuestion(q)} className="p-1 hover:bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 rounded"><Edit size={14} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" /></button>
                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 hover:bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 rounded"><Trash2 size={14} className="text-red-600 dark:text-red-400 dark:text-red-400" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-3">{editingQuestion ? 'Edit Question' : 'Add Question'}</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="label text-xs">Type</label>
                      <select value={questionForm.question_type} onChange={(e) => resetQuestionForm(e.target.value)} className="input text-sm">
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="fill_blank">Fill in Blank</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Points</label>
                      <input type="number" value={questionForm.points} onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })} className="input text-sm" min={1} />
                    </div>
                    <div>
                      <label className="label text-xs">Subject</label>
                      <input type="text" value={questionForm.subject} onChange={(e) => setQuestionForm({ ...questionForm, subject: e.target.value })} className="input text-sm" placeholder="Auto" />
                    </div>
                    <div>
                      <label className="label text-xs">Topic</label>
                      <input type="text" value={questionForm.topic} onChange={(e) => setQuestionForm({ ...questionForm, topic: e.target.value })} className="input text-sm" placeholder="e.g. Algebra" />
                    </div>
                    <div>
                      <label className="label text-xs">Difficulty</label>
                      <select value={questionForm.difficulty_level} onChange={(e) => setQuestionForm({ ...questionForm, difficulty_level: e.target.value })} className="input text-sm">
                        <option value="">Auto</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                        <option value="VERY_HARD">Very Hard</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Question</label>
                    <textarea value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} className="input text-sm" rows={2} placeholder="Enter the question text" />
                  </div>
                  {questionForm.question_type !== 'fill_blank' && (
                    <div className="space-y-2">
                      <label className="label text-xs">Options</label>
                      {questionForm.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input type="radio" name="correct" checked={questionForm.correct_answer === i} onChange={() => setQuestionForm({ ...questionForm, correct_answer: i })} className="w-4 h-4 text-primary-600 dark:text-primary-400 dark:text-primary-400" />
                          <input type="text" value={opt} onChange={(e) => { const opts = [...questionForm.options]; opts[i] = e.target.value; setQuestionForm({ ...questionForm, options: opts }); }} className="input text-sm flex-1" placeholder={`Option ${i + 1}`} />
                          {questionForm.correct_answer === i && <span className="text-xs text-green-600 dark:text-green-400 dark:text-green-400 font-medium">Correct</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {editingQuestion && <button onClick={() => { setEditingQuestion(null); setQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '', topic: '', subtopic: '', difficulty_level: '' }); }} className="btn-ghost text-sm">Cancel Edit</button>}
                    <button onClick={handleSaveQuestion} disabled={savingQuestion || !questionForm.question.trim()} className="btn-primary text-sm disabled:opacity-50">{savingQuestion ? 'Saving...' : editingQuestion ? 'Update' : 'Add Question'}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Bank Select Modal */}
      {showBankSelect && selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">Add from Question Bank</h3>
              <button onClick={() => setShowBankSelect(false)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-500" size={18} />
                <input type="text" placeholder="Search questions..." value={bankSearch} onChange={(e) => filterBank(e.target.value)} className="input pl-10 text-sm" />
              </div>
              {bankFiltered.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 dark:text-slate-500 text-sm">No questions in bank</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bankFiltered.map((q: any) => (
                    <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${selectedBankIds.has(q.id) ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800'}`}>
                      <input type="checkbox" checked={selectedBankIds.has(q.id)} onChange={() => toggleBankSelect(q.id)} className="w-4 h-4 mt-0.5 text-primary-600 dark:text-primary-400 dark:text-primary-400 rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white dark:text-white">{q.question}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{q.subject} • {q.topic || 'No Topic'} • {q.difficulty_level || 'N/A'} • {q.level}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{selectedBankIds.size} selected</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowBankSelect(false)} className="btn-ghost text-sm">Cancel</button>
                  <button onClick={handleAddFromBank} disabled={saving || selectedBankIds.size === 0} className="btn-primary text-sm disabled:opacity-50">{saving ? 'Adding...' : `Add ${selectedBankIds.size} Question(s)`}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {showAnalysis && analysisTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">Analysis — {analysisTest.title}</h3>
              <button onClick={() => setShowAnalysis(false)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-6">
              {analysisLoading ? (
                <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="card text-center"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Total Students</p><p className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">{analysisAttempts.length}</p></div>
                    <div className="card text-center"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Avg Score</p><p className="text-2xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{analysisAttempts.length > 0 ? Math.round(analysisAttempts.reduce((s: number, a: any) => s + (a.score || 0), 0) / analysisAttempts.length) : 0}%</p></div>
                    <div className="card text-center"><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Questions</p><p className="text-2xl font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{analysisData.length}</p></div>
                  </div>

                  {/* Per-question breakdown */}
                  {analysisData.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-3">Per-Question Breakdown</h4>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700">
                              <tr>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">#</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Question</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Subject</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Topic</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Correct</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Total</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">%</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Bar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {analysisData.map((q: any, i: number) => (
                                <tr key={q.id} className="hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                                  <td className="py-2 px-3 text-slate-400 dark:text-slate-500 dark:text-slate-500">{i + 1}</td>
                                  <td className="py-2 px-3 font-medium text-slate-900 dark:text-white dark:text-white max-w-xs truncate">{q.question}</td>
                                  <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">{q.subject || 'N/A'}</td>
                                  <td className="py-2 px-3 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">{q.topic || 'N/A'}</td>
                                  <td className="py-2 px-3 text-center font-semibold text-green-600 dark:text-green-400 dark:text-green-400">{q.correct}</td>
                                  <td className="py-2 px-3 text-center text-slate-600 dark:text-slate-400 dark:text-slate-400">{q.total}</td>
                                  <td className={`py-2 px-3 text-center font-semibold ${q.percentage >= 70 ? 'text-green-600 dark:text-green-400 dark:text-green-400' : q.percentage >= 40 ? 'text-amber-600 dark:text-amber-400 dark:text-amber-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>{q.percentage}%</td>
                                  <td className="py-2 px-3">
                                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full overflow-hidden mx-auto">
                                      <div className={`h-full rounded-full ${q.percentage >= 70 ? 'bg-green-500' : q.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(q.percentage, 100)}%` }}></div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                      </div>
                    </div>
                  )}

                  {/* Student-by-student */}
                  {analysisAttempts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-3">Student Attempts</h4>
                      <div className="overflow-x-auto max-h-72 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 sticky top-0">
                            <tr>
                              <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Student</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Score</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Passed</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase hidden md:table-cell">Date</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase hidden md:table-cell">Time</th>
                              <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Report</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {analysisAttempts.map((a: any) => (
                              <tr key={a.id} className="hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                                <td className="py-2 px-3 font-medium text-slate-900 dark:text-white dark:text-white">{a.student?.first_name} {a.student?.last_name}</td>
                                <td className={`py-2 px-3 text-center font-semibold ${a.score >= (analysisTest.passing_score || 50) ? 'text-green-600 dark:text-green-400 dark:text-green-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>{a.score}%</td>
                                <td className="py-2 px-3 text-center">{a.passed ? <Check size={16} className="text-green-500 inline" /> : <X size={16} className="text-red-500 dark:text-red-400 dark:text-red-400 inline" />}</td>
                                <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 hidden md:table-cell">{formatDate(a.created_at)}</td>
                                <td className="py-2 px-3 text-center text-slate-500 dark:text-slate-400 dark:text-slate-400 hidden md:table-cell">{a.time_taken ? `${Math.floor(a.time_taken / 60)}m ${a.time_taken % 60}s` : '—'}</td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    onClick={() => window.open(`/student/tests/report/${a.id}`, '_blank')}
                                    className="text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 dark:text-primary-300 text-xs font-semibold underline"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {analysisData.length === 0 && analysisAttempts.length === 0 && (
                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 dark:text-slate-500"><BarChart3 size={40} className="mx-auto mb-3 opacity-50" /><p>No data available for analysis</p></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
