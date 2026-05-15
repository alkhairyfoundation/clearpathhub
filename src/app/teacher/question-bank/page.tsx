'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Search, Filter, Edit, Trash2, X, Copy, CheckCircle, XCircle, Loader2, ArrowLeft, BookOpen, Upload, Download, HelpCircle } from 'lucide-react';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const QUESTION_TYPES = ['multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'multiple_selection'] as const;
const STATUSES = ['draft', 'published', 'archived'] as const;

export default function TeacherQuestionBankPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    subject_id: '', class_id: '', topic: '', subtopic: '',
    difficulty: 'medium' as string, question_type: 'multiple_choice' as string,
    question: '', options: ['', '', '', ''], correct_answer: 0,
    explanation: '', tags: '',
  });
  const [importText, setImportText] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [qRes, sRes, cRes] = await Promise.all([
      supabase.from('question_bank').select('*, subject:subjects(name, code)').or('created_by.eq.' + (profile?.id || '') + ',created_by.is.null').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*, class:classes!class_id(name)').eq('teacher_id', profile?.id).order('name'),
      supabase.from('classes').select('*').order('level'),
    ]);
    if (!qRes.error && qRes.data) setQuestions(qRes.data);
    if (!sRes.error && sRes.data) setSubjects(sRes.data);
    if (!cRes.error && cRes.data) setClasses(cRes.data);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ subject_id: '', class_id: '', topic: '', subtopic: '', difficulty: 'medium', question_type: 'multiple_choice', question: '', options: ['', '', '', ''], correct_answer: 0, explanation: '', tags: '' });
    setShowModal(true);
  }

  function openEdit(q: any) {
    setEditing(q);
    setForm({
      subject_id: q.subject_id, class_id: q.class_id || '', topic: q.topic, subtopic: q.subtopic || '',
      difficulty: q.difficulty_level, question_type: q.question_type,
      question: q.question, options: q.options.length >= 4 ? q.options : [...q.options, ...Array(4 - q.options.length).fill('')],
      correct_answer: q.correct_answer, explanation: q.explanation || '', tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.subject_id || !form.question.trim()) { setError('Subject and question are required'); return; }
    if (!form.options[0]?.trim()) { setError('At least one option is required'); return; }
    setError(''); setSaving(true);
    try {
      const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const options = form.question_type === 'true_false' ? ['True', 'False'] : form.options.filter(o => o.trim());
      const payload = {
        subject_id: form.subject_id, class_id: form.class_id || null, topic: form.topic || 'General',
        subtopic: form.subtopic, difficulty: form.difficulty, question_type: form.question_type,
        question: form.question, options, correct_answer: form.correct_answer,
        explanation: form.explanation || null, tags: tagsArr, created_by: profile?.id,
      };
      if (editing) {
        const { error } = await supabase.from('question_bank').update(payload).eq('id', editing.id);
        if (error) throw new Error(error.message);
        setSuccess('Question updated');
      } else {
        const { error } = await supabase.from('question_bank').insert({ ...payload, status: 'draft' });
        if (error) throw new Error(error.message);
        setSuccess('Question created');
      }
      setTimeout(() => { setShowModal(false); fetchData(); }, 1000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this question?')) return;
    try {
      const { error } = await supabase.from('question_bank').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Question deleted');
      fetchData();
    } catch (err: any) { setError(err.message); }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const { error } = await supabase.from('question_bank').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess(`Question ${status}`);
      fetchData();
    } catch (err: any) { setError(err.message); }
  }

  async function handleImport() {
    if (!importText.trim()) { setError('Paste questions first'); return; }
    setError(''); setSaving(true);
    try {
      const lines = importText.trim().split('\n').filter(Boolean);
      let imported = 0;
      for (const line of lines) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length < 4) continue;
        const [question, optA, optB, optC, optD, correctIdx, explanation] = parts;
        const options = [optA, optB, optC || '', optD || ''].filter(Boolean);
        const { error } = await supabase.from('question_bank').insert({
          subject_id: subjects[0]?.id, topic: 'Imported', difficulty: 'medium',
          question_type: 'multiple_choice', question, options,
          correct_answer: parseInt(correctIdx) || 0, explanation: explanation || null,
          status: 'draft', created_by: profile?.id, tags: ['imported'],
        });
        if (!error) imported++;
      }
      setSuccess(`${imported} questions imported`);
      setShowImport(false);
      setImportText('');
      fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  const filteredQuestions = questions.filter(q => {
    if (search && !q.question.toLowerCase().includes(search.toLowerCase()) && !q.topic.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSubject && q.subject_id !== filterSubject) return false;
    if (filterDifficulty && q.difficulty_level !== filterDifficulty) return false;
    if (filterStatus && q.status !== filterStatus) return false;
    return true;
  });

  function getStatusBadge(status: string) {
    const map: Record<string, string> = { draft: 'bg-slate-100 text-slate-600', published: 'bg-emerald-100 text-emerald-700', archived: 'bg-red-100 text-red-600' };
    return map[status] || map.draft;
  }

  function getDifficultyBadge(d: string) {
    const map: Record<string, string> = { easy: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', hard: 'bg-red-100 text-red-700' };
    return map[d] || map.medium;
  }

  return (
    <DashboardLayout title="Question Bank" subtitle="Create and manage your question bank">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
              <p className="text-slate-500 mt-1">Create and manage your question bank</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Upload size={16} /> Import
            </button>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Add Question
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div className="text-sm text-slate-500 flex items-center">
              {filteredQuestions.length} of {questions.length} questions
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : filteredQuestions.length === 0 ? (
          <div className="card text-center py-16">
            <HelpCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No questions found</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">{questions.length === 0 ? 'Create your first question' : 'Try different filters'}</p>
            {questions.length === 0 && <button onClick={openCreate} className="btn-primary">Add Question</button>}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map(q => (
              <div key={q.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(q.status)}`}>{q.status}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyBadge(q.difficulty_level)}`}>{q.difficulty_level}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{q.question_type.replace('_', ' ')}</span>
                      <span className="text-xs text-slate-400">{q.subject?.name || 'No subject'}</span>
                    </div>
                    <p className="font-semibold text-slate-900 line-clamp-2">{q.question}</p>
                    {q.topic && <p className="text-xs text-slate-500 mt-1">Topic: {q.topic}{q.subtopic ? ` › ${q.subtopic}` : ''}</p>}
                    {q.explanation && <p className="text-xs text-slate-400 mt-1 line-clamp-1">Explanation: {q.explanation}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {q.status === 'draft' && (
                      <button onClick={() => updateStatus(q.id, 'published')} title="Publish" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><CheckCircle size={16} /></button>
                    )}
                    {q.status === 'published' && (
                      <button onClick={() => updateStatus(q.id, 'archived')} title="Archive" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><XCircle size={16} /></button>
                    )}
                    {q.status === 'archived' && (
                      <button onClick={() => updateStatus(q.id, 'draft')} title="Reopen" className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"><CheckCircle size={16} /></button>
                    )}
                    <button onClick={() => openEdit(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{editing ? 'Edit Question' : 'New Question'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
                    <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Select...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                    <select value={form.class_id} onChange={e => setForm(p => ({ ...p, class_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      <option value="">Any class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
                    <select value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                    <select value={form.question_type} onChange={e => setForm(p => ({ ...p, question_type: e.target.value, options: e.target.value === 'true_false' ? ['True', 'False'] : e.target.value === 'multiple_choice' ? ['', '', '', ''] : [''] }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                      {QUESTION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Question *</label>
                  <textarea value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Options</label>
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input type="radio" name="correct" checked={form.correct_answer === i} onChange={() => setForm(p => ({ ...p, correct_answer: i }))}
                        className="w-4 h-4 text-primary-600" />
                      <input type="text" value={opt} onChange={e => {
                        const newOpts = [...form.options];
                        newOpts[i] = e.target.value;
                        setForm(p => ({ ...p, options: newOpts }));
                      }} placeholder={`Option ${i + 1}`} disabled={form.question_type === 'true_false'}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100" />
                      {form.question_type !== 'true_false' && form.options.length > 2 && (
                        <button onClick={() => setForm(p => ({ ...p, options: p.options.filter((_, j) => j !== i), correct_answer: p.correct_answer >= i ? Math.max(0, p.correct_answer - 1) : p.correct_answer }))}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                  {form.question_type !== 'true_false' && form.options.length < 6 && (
                    <button onClick={() => setForm(p => ({ ...p, options: [...p.options, ''] }))}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Add option</button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                    <input type="text" value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} placeholder="e.g. Fractions"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subtopic</label>
                    <input type="text" value={form.subtopic} onChange={e => setForm(p => ({ ...p, subtopic: e.target.value }))} placeholder="e.g. Addition"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Explanation</label>
                  <textarea value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} rows={2}
                    placeholder="Explain why the correct answer is right"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                  <input type="text" value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="algebra, exam, revision"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowImport(false)}>
            <div className="bg-white rounded-xl p-6 max-w-xl w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Import Questions</h2>
                <button onClick={() => setShowImport(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
              </div>
              <div className="mb-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <p className="font-medium mb-1">Format (one question per line, pipe-separated):</p>
                <code className="block mt-1">Question | Option A | Option B | Option C | Option D | CorrectIndex | Explanation</code>
              </div>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={10} placeholder="Paste questions here..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono" />
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowImport(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={handleImport} disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
