'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, X, FileText, BarChart3, Check, Loader2, Search, Users, Clock, Eye, Send, Hash, ArrowLeft, Download, Copy, HelpCircle } from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'multiple_selection', label: 'Multiple Selection' },
];

export default function TeacherTestsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  // Question bank selection
  const [showBankSelect, setShowBankSelect] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [bankFiltered, setBankFiltered] = useState<any[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());

  // Analysis state
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisTest, setAnalysisTest] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any[]>([]);
  const [analysisAttempts, setAnalysisAttempts] = useState<any[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '', description: '', subject_id: '', class_id: '', test_type: 'class_test',
    exam_date: '', duration_minutes: 30, total_marks: 100, passing_score: 50,
    total_questions: 10,
    shuffle_questions: false, shuffle_options: false, require_fullscreen: false,
    prevent_tab_switch: false, max_tab_switches: 3,
  });

  const [questions, setQuestions] = useState<any[]>([]);
  const [questionForm, setQuestionForm] = useState({
    question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: ''
  });

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [testsRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from('tests').select('*, subject:subjects!subject_id(name), class:classes!class_id(name)').eq('created_by', profile?.id).order('created_at', { ascending: false }),
      supabase.from('subjects').select('id, name').eq('teacher_id', profile?.id).order('name'),
      supabase.from('classes').select('id, name').order('level'),
    ]);
    if (testsRes.data) setTests(testsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  }

  function resetQuestionDefaults(type: string) {
    let opts = ['', '', '', ''];
    let correct: any = 0;
    if (type === 'true_false') { opts = ['True', 'False']; correct = 0; }
    else if (type === 'fill_blank') { opts = []; correct = 0; }
    else if (type === 'short_answer') { opts = []; correct = 0; }
    else if (type === 'multiple_selection') { opts = ['', '', '', '']; correct = 0; }
    setQuestionForm({ ...questionForm, options: opts, correct_answer: correct, question_type: type });
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
        shuffle_questions: false, shuffle_options: false, require_fullscreen: false,
        prevent_tab_switch: false, max_tab_switches: 3,
      });
    }
    setShowTestModal(true);
  }

  async function handleSaveTest() {
    if (!formData.title.trim()) { setError('Title is required'); return; }
    setError(''); setSaving(true);
    try {
      const { total_questions, ...dbData } = formData;
      if (editingTest) {
        const { error: err } = await supabase.from('tests').update(dbData).eq('id', editingTest.id);
        if (err) throw new Error(err.message);
        setSuccess('Test updated');
      } else {
        const { error: err } = await supabase.from('tests').insert({ ...dbData, created_by: profile?.id, is_published: false });
        if (err) throw new Error(err.message);
        setSuccess('Test created');
      }
      setShowTestModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save test');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(test: any) {
    try {
      const { error } = await supabase.from('tests').update({ is_published: !test.is_published }).eq('id', test.id);
      if (error) throw new Error(error.message);
      setSuccess(test.is_published ? 'Test unpublished' : 'Test published');
    } catch (err: any) {
      setError(err.message || 'Failed to toggle publish');
    }
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test and all questions?')) return;
    setDeleting(id);
    try {
      const { error: attemptsError } = await supabase.from('test_attempts').delete().eq('test_id', id);
      if (attemptsError) throw new Error(attemptsError.message);
      const { error: testError } = await supabase.from('tests').delete().eq('id', id);
      if (testError) throw new Error(testError.message);
      setSuccess('Test deleted');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete test');
    }
    setDeleting(null);
  }

  async function openQuestions(test: any) {
    setSelectedTest(test);
    const { data } = await supabase.from('test_questions').select('*').eq('test_id', test.id).order('order_index');
    if (data) setQuestions(data);
    setShowQuestionsModal(true);
  }

  async function handleAddQuestion() {
    if (!selectedTest || !questionForm.question.trim()) return;
    setSaving(true);
    const payload: any = {
      test_id: selectedTest.id,
      question: questionForm.question,
      options: questionForm.options,
      correct_answer: questionForm.correct_answer,
      points: questionForm.points || 1,
      question_type: questionForm.question_type || 'multiple_choice',
      order_index: questions.length,
    };
    if (questionForm.question_image) payload.question_image = questionForm.question_image;
    const { error } = await supabase.from('test_questions').insert(payload);
    if (!error) {
      setQuestionForm({ question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '' });
      const { data } = await supabase.from('test_questions').select('*').eq('test_id', selectedTest.id).order('order_index');
      if (data) setQuestions(data);
    }
    setSaving(false);
  }

  async function handleDeleteQuestion(qId: string) {
    try {
      const { error } = await supabase.from('test_questions').delete().eq('id', qId);
      if (error) throw new Error(error.message);
      setQuestions(questions.filter(q => q.id !== qId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  }

  async function openBankSelect() {
    setSelectedBankIds(new Set());
    setBankSearch('');
    let query = supabase.from('question_bank').select('*');
    if (selectedTest?.subject_id) {
      const { data: subject } = await supabase.from('subjects').select('name').eq('id', selectedTest.subject_id).maybeSingle();
      if (subject) query = query.ilike('subject', subject.name);
    }
    if (selectedTest?.class_id) {
      const { data: cls } = await supabase.from('classes').select('level').eq('id', selectedTest.class_id).maybeSingle();
      if (cls?.level) query = query.eq('level', cls.level);
    }
    const { data } = await query.order('created_at', { ascending: false });
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
        const toInsert = selected.map((q, i) => ({
          test_id: selectedTest.id, question: q.question, options: q.options || [''], correct_answer: q.correct_answer ?? 0,
          points: q.points ?? 1, question_type: q.question_type || 'multiple_choice', subject: q.subject || null, order_index: questions.length + i,
        }));
        const { error: insertErr } = await supabase.from('test_questions').insert(toInsert);
        if (insertErr) throw new Error(insertErr.message);
        const { data } = await supabase.from('test_questions').select('*').eq('test_id', selectedTest.id).order('order_index');
        if (data) setQuestions(data);
        setSuccess(`Added ${toInsert.length} question(s) from bank`);
      }
      setShowBankSelect(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add questions');
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoPopulate() {
    if (!selectedTest || !selectedTest.subject_id) { setWarning('Select a subject for this test first'); return; }
    setSaving(true);
    try {
      const { data: subj } = await supabase.from('subjects').select('name').eq('id', selectedTest.subject_id).maybeSingle();
      if (!subj) { setError('Subject not found'); setSaving(false); return; }
      let query = supabase.from('question_bank').select('*').ilike('subject', subj.name).eq('is_active', true);
      if (selectedTest.class_id) {
        const { data: cls } = await supabase.from('classes').select('level').eq('id', selectedTest.class_id).maybeSingle();
        if (cls?.level) query = query.eq('level', cls.level);
      }
      const { data: bankQ } = await query;
      if (bankQ && bankQ.length > 0) {
        const count = formData.total_questions || 10;
        const shuffled = bankQ.sort(() => Math.random() - 0.5).slice(0, Math.min(bankQ.length, count));
        const toInsert = shuffled.map((q, i) => ({
          test_id: selectedTest.id, question: q.question, options: q.options || [''], correct_answer: q.correct_answer ?? 0,
          points: q.points ?? 1, question_type: q.question_type || 'multiple_choice', subject: q.subject || null, order_index: questions.length + i,
        }));
        const { error: insertErr } = await supabase.from('test_questions').insert(toInsert);
        if (insertErr) throw new Error(insertErr.message);
        const { data } = await supabase.from('test_questions').select('*').eq('test_id', selectedTest.id).order('order_index');
        if (data) setQuestions(data);
        setSuccess(`Auto-populated ${toInsert.length} questions`);
      } else {
        setWarning('No question bank questions found for this subject/level');
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
        supabase.from('test_questions').select('*').eq('test_id', test.id).order('order_index'),
        supabase.from('test_attempts').select('*, student:profiles!student_id(first_name, last_name)').eq('test_id', test.id).order('created_at', { ascending: false }),
      ]);
      const questions = questionsRes.data || [];
      const attempts = attemptsRes.data || [];
      setAnalysisAttempts(attempts);

      const analysis = questions.map((q: any) => {
        let correct = 0, total = 0;
        const studentResults: any[] = [];
        attempts.forEach((a: any) => {
          const answers = typeof a.answers === 'string' ? JSON.parse(a.answers) : (a.answers || {});
          const studentAnswer = answers[q.id];
          if (studentAnswer !== undefined) {
            total++;
            if (Number(studentAnswer) === q.correct_answer) correct++;
            studentResults.push({ student: a.student, answer: studentAnswer, correct: Number(studentAnswer) === q.correct_answer });
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

  const filtered = tests.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <DashboardLayout title="My Tests" subtitle="Create and manage tests for your classes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Tests</h1>
              <p className="text-slate-500 mt-1">{tests.length} tests created</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2"><Plus size={18} />Create Test</button>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
        {warning && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm">{warning}</div>}

        <div className="card">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search tests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16"><FileText className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">{tests.length === 0 ? 'No tests yet. Create your first test!' : 'No tests match your search'}</p></div>
          ) : (
            <div className="space-y-3">
              {filtered.map(test => (
                <div key={test.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><FileText size={20} className="text-primary-600" /></div>
                    <div>
                      <p className="font-semibold text-slate-900">{test.title}</p>
                      <p className="text-sm text-slate-500">{test.subject?.name || 'No Subject'} • {test.class?.name || 'No Class'} • {test.test_type.replace('_', ' ')} • {test.total_marks} marks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${test.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{test.is_published ? 'Published' : 'Draft'}</span>
                    <button onClick={() => openQuestions(test)} className="p-1.5 hover:bg-primary-50 rounded-lg" title="Manage Questions"><Hash size={15} className="text-primary-600" /></button>
                    <button onClick={() => openAnalysis(test)} className="p-1.5 hover:bg-purple-50 rounded-lg" title="View Analysis"><BarChart3 size={15} className="text-purple-600" /></button>
                    <button onClick={() => togglePublish(test)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title={test.is_published ? 'Unpublish' : 'Publish'}><Send size={15} /></button>
                    <button onClick={() => openModal(test)} className="p-1.5 hover:bg-primary-50 rounded-lg"><Edit size={15} className="text-primary-600" /></button>
                    <button onClick={() => handleDelete(test.id)} disabled={deleting === test.id} className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50">{deleting === test.id ? <Loader2 size={15} className="text-red-600 animate-spin" /> : <Trash2 size={15} className="text-red-600" />}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showTestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-900">{editingTest ? 'Edit Test' : 'Create Test'}</h3>
                <button onClick={() => setShowTestModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="e.g., Mathematics Mid-Term" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Subject</label><select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div><label className="label">Class</label><select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="input"><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Type</label><select value={formData.test_type} onChange={(e) => setFormData({ ...formData, test_type: e.target.value })} className="input"><option value="class_test">Class Test</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="term">Term</option><option value="practice">Practice</option></select></div>
                  <div><label className="label">Date</label><input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} className="input" /></div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div><label className="label">Duration (min)</label><input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} className="input" /></div>
                  <div><label className="label">Total Marks</label><input type="number" value={formData.total_marks} onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })} className="input" /></div>
                  <div><label className="label">Questions</label><input type="number" value={formData.total_questions} onChange={(e) => setFormData({ ...formData, total_questions: parseInt(e.target.value) })} className="input" /></div>
                  <div><label className="label">Pass %</label><input type="number" value={formData.passing_score} onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })} className="input" /></div>
                </div>
                <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} /></div>
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-800 mb-3 text-sm">Security Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.shuffle_questions} onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Shuffle Questions</p><p className="text-xs text-slate-400">Display questions in random order</p></div></label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.shuffle_options} onChange={(e) => setFormData({ ...formData, shuffle_options: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Shuffle Options</p><p className="text-xs text-slate-400">Randomize answer option order</p></div></label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.require_fullscreen} onChange={(e) => setFormData({ ...formData, require_fullscreen: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Require Fullscreen</p></div></label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.prevent_tab_switch} onChange={(e) => setFormData({ ...formData, prevent_tab_switch: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Prevent Tab Switching</p><p className="text-xs text-slate-400">Auto-submit if too many tab switches</p></div></label>
                    {formData.prevent_tab_switch && <div><label className="label text-xs">Max Tab Switches</label><input type="number" value={formData.max_tab_switches} onChange={(e) => setFormData({ ...formData, max_tab_switches: parseInt(e.target.value) })} className="input" min={1} max={10} /></div>}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-white sticky bottom-0">
                <button onClick={() => setShowTestModal(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleSaveTest} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : editingTest ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {showQuestionsModal && selectedTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900">Questions — {selectedTest.title}</h3>
                <button onClick={() => setShowQuestionsModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{questions.length} question(s)</p>
                  <div className="flex gap-2">
                    <button onClick={openBankSelect} className="btn-outline text-sm flex items-center gap-1.5"><Copy size={14} />From Bank</button>
                    <button onClick={handleAutoPopulate} disabled={saving} className="btn-outline text-sm flex items-center gap-1.5"><Download size={14} />Auto-populate</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1"><label className="label">Question Type</label></div>
                  <select value={questionForm.question_type} onChange={e => resetQuestionDefaults(e.target.value)} className="input w-48">
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className="label">Question</label><textarea value={questionForm.question} onChange={e => setQuestionForm({...questionForm, question: e.target.value})} className="input" rows={3} /></div>

                {questionForm.question_type === 'multiple_choice' && (
                  <div><label className="label">Options (select correct one)</label>
                    {questionForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="radio" checked={questionForm.correct_answer === i} onChange={() => setQuestionForm({...questionForm, correct_answer: i})} />
                        <input type="text" value={opt} onChange={e => { const opts = [...questionForm.options]; opts[i] = e.target.value; setQuestionForm({...questionForm, options: opts}); }} className="input flex-1" placeholder={`Option ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                )}

                {questionForm.question_type === 'true_false' && (
                  <div><label className="label">Correct Answer</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['True', 'False'].map((opt, i) => (
                        <label key={i} className={`p-3 rounded-lg border-2 cursor-pointer text-center ${questionForm.correct_answer === i ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}>
                          <input type="radio" checked={questionForm.correct_answer === i} onChange={() => setQuestionForm({...questionForm, correct_answer: i})} className="sr-only" />
                          <span className="font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {questionForm.question_type === 'fill_blank' && (
                  <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700">
                    Students will type the answer. Include <code className="bg-primary-100 px-1 rounded">___</code> in the question text.
                  </div>
                )}

                {questionForm.question_type === 'short_answer' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                    Students write a short answer. Requires manual grading.
                  </div>
                )}

                {questionForm.question_type === 'multiple_selection' && (
                  <div><label className="label">Options (select correct ones)</label>
                    {questionForm.options.map((opt, i) => {
                      const selected = (questionForm.correct_answer & (1 << i)) !== 0;
                      return (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <input type="checkbox" checked={selected} onChange={() => {
                            const current = questionForm.correct_answer;
                            setQuestionForm({...questionForm, correct_answer: selected ? current & ~(1 << i) : current | (1 << i)});
                          }} />
                          <input type="text" value={opt} onChange={e => { const opts = [...questionForm.options]; opts[i] = e.target.value; setQuestionForm({...questionForm, options: opts}); }} className="input flex-1" placeholder={`Option ${i + 1}`} />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div>
                    <label className="label text-xs">Points</label>
                    <input type="number" value={questionForm.points} onChange={e => setQuestionForm({...questionForm, points: parseInt(e.target.value) || 1})} className="input w-20" min={1} />
                  </div>
                </div>

                <button onClick={handleAddQuestion} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Adding...' : 'Add Question'}</button>

                {questions.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-semibold text-slate-700 mb-2">{questions.length} Questions</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {questions.map((q, i) => (
                        <div key={q.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg text-sm">
                          <div className="flex-1">
                            <span className="font-medium">{i + 1}.</span> {q.question}
                            <span className="text-xs text-slate-400 ml-2">({q.question_type})</span>
                          </div>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="p-1 hover:bg-red-50 rounded-lg ml-2 flex-shrink-0">
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bank Select Modal */}
        {showBankSelect && selectedTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-900">Add from Question Bank</h3>
                <button onClick={() => setShowBankSelect(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Search questions..." value={bankSearch} onChange={(e) => filterBank(e.target.value)} className="input pl-10 text-sm" />
                </div>
                {bankFiltered.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No questions in bank</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bankFiltered.map((q: any) => (
                      <label key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${selectedBankIds.has(q.id) ? 'border-primary-300 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={selectedBankIds.has(q.id)} onChange={() => toggleBankSelect(q.id)} className="w-4 h-4 mt-0.5 text-primary-600 rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{q.question}</p>
                          <p className="text-xs text-slate-500">{q.subject} • {q.level} • {q.difficulty_level}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-slate-500">{selectedBankIds.size} selected</span>
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
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-900">Analysis — {analysisTest.title}</h3>
                <button onClick={() => setShowAnalysis(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-5 space-y-6">
                {analysisLoading ? (
                  <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="card text-center"><p className="text-xs text-slate-500 uppercase">Total Students</p><p className="text-2xl font-bold text-slate-900">{analysisAttempts.length}</p></div>
                      <div className="card text-center"><p className="text-xs text-slate-500 uppercase">Avg Score</p><p className="text-2xl font-bold text-amber-600">{analysisAttempts.length > 0 ? Math.round(analysisAttempts.reduce((s: number, a: any) => s + (a.score || 0), 0) / analysisAttempts.length) : 0}%</p></div>
                      <div className="card text-center"><p className="text-xs text-slate-500 uppercase">Questions</p><p className="text-2xl font-bold text-primary-600">{analysisData.length}</p></div>
                    </div>

                    {analysisData.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Per-Question Breakdown</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Question</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Correct</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">%</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Bar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {analysisData.map((q: any, i: number) => (
                                <tr key={q.id} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                                  <td className="py-2 px-3 font-medium text-slate-900 max-w-xs truncate">{q.question}</td>
                                  <td className="py-2 px-3 text-center font-semibold text-green-600">{q.correct}</td>
                                  <td className="py-2 px-3 text-center text-slate-600">{q.total}</td>
                                  <td className={`py-2 px-3 text-center font-semibold ${q.percentage >= 70 ? 'text-green-600' : q.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{q.percentage}%</td>
                                  <td className="py-2 px-3">
                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden mx-auto">
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

                    {analysisAttempts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Student Attempts</h4>
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                              <tr>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Score</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Passed</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {analysisAttempts.map((a: any) => (
                                <tr key={a.id} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-medium text-slate-900">{a.student?.first_name} {a.student?.last_name}</td>
                                  <td className={`py-2 px-3 text-center font-semibold ${a.score >= (analysisTest.passing_score || 50) ? 'text-green-600' : 'text-red-600'}`}>{a.score}%</td>
                                  <td className="py-2 px-3 text-center">{a.passed ? <Check size={16} className="text-green-500 inline" /> : <X size={16} className="text-red-500 inline" />}</td>
                                  <td className="py-2 px-3 text-center text-slate-500 hidden md:table-cell">{new Date(a.created_at).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {analysisData.length === 0 && analysisAttempts.length === 0 && (
                      <div className="text-center py-12 text-slate-400"><BarChart3 size={40} className="mx-auto mb-3 opacity-50" /><p>No data available for analysis</p></div>
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
