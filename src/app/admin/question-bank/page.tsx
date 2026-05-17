'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, Filter, Edit, Trash2, X, CheckCircle, XCircle, Loader2, ArrowLeft, BookOpen, HelpCircle, Users } from 'lucide-react';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const STATUSES = ['draft', 'published', 'archived'] as const;

export default function AdminQuestionBankPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [qRes, sRes] = await Promise.all([
      supabase.from('question_bank').select('*, subject:subjects(name, code), creator:profiles(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
    ]);
    if (!qRes.error && qRes.data) setQuestions(qRes.data);
    if (!sRes.error && sRes.data) setSubjects(sRes.data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    setSaving(true);
    try {
      const { error } = await supabase.from('question_bank').update({ status }).eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess(`Question ${status}`);
      fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this question permanently?')) return;
    try {
      const { error } = await supabase.from('question_bank').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Question deleted');
      fetchData();
    } catch (err: any) { setError(err.message); }
  }

  async function approveAllPending() {
    if (!confirm(`Are you sure you want to approve and publish all ${counts.draft} pending questions?`)) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('question_bank').update({ status: 'published' }).eq('status', 'draft').select();
      if (error) throw new Error(error.message);
      const count = data?.length ?? 0;
      setSuccess(`Successfully approved and published ${count} pending questions!`);
      fetchData();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  }

  const activeSubjects = subjects.filter(sub => 
    questions.some(q => q.subject_id === sub.id)
  );

  const activeLevels = Array.from(new Set(questions.map(q => q.level).filter(Boolean))).sort();

  const filteredQuestions = questions.filter(q => {
    if (search && !q.question.toLowerCase().includes(search.toLowerCase()) && !q.topic.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSubject && q.subject_id !== filterSubject) return false;
    if (filterStatus && q.status !== filterStatus) return false;
    if (filterLevel && q.level !== filterLevel) return false;
    return true;
  });

  const counts = { draft: questions.filter(q => q.status === 'draft').length, total: questions.length };

  return (
    <DashboardLayout title="Question Bank" subtitle="Manage all teacher-created questions">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Question Bank (Admin)</h1>
              <p className="text-slate-500 mt-1">Review, approve, and manage all questions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {counts.draft > 0 && (
              <button
                onClick={approveAllPending}
                disabled={saving}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Approve & Publish All Pending ({counts.draft})
              </button>
            )}
            <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-medium">{counts.draft} pending review</span>
            <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-medium">{counts.total} total</span>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}

        <div className="card">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All Subjects</option>
              {activeSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All Levels</option>
              {activeLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div className="text-sm text-slate-500 flex items-center">{filteredQuestions.length} questions</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : filteredQuestions.length === 0 ? (
          <div className="card text-center py-16">
            <HelpCircle className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No questions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map(q => (
              <div key={q.id} className={`card hover:shadow-md transition-shadow ${q.status === 'draft' ? 'ring-2 ring-amber-200' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${q.status === 'draft' ? 'bg-amber-100 text-amber-700' : q.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{q.status}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${q.difficulty_level === 'easy' ? 'bg-green-100 text-green-700' : q.difficulty_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{q.difficulty_level}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{q.question_type.replace('_', ' ')}</span>
                      <span className="text-xs text-slate-400">{q.subject?.name}</span>
                      {q.creator && (
                        <span className="text-xs text-slate-400 flex items-center gap-1"><Users size={12} />{q.creator.first_name} {q.creator.last_name}</span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900">{q.question}</p>
                    {q.topic && <p className="text-xs text-slate-500 mt-1">Topic: {q.topic}{q.subtopic ? ` › ${q.subtopic}` : ''}</p>}
                    <div className="flex gap-2 mt-2">
                      {q.options?.map((opt: string, i: number) => (
                        <span key={i} className={`px-2 py-0.5 rounded text-xs ${i === q.correct_answer ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-slate-100 text-slate-500'}`}>
                          {i === q.correct_answer && '✓ '}{opt}
                        </span>
                      ))}
                    </div>
                    {q.explanation && <p className="text-xs text-slate-400 mt-1">Explanation: {q.explanation}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {q.status === 'draft' && (
                      <button onClick={() => updateStatus(q.id, 'published')} disabled={saving}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Approve & Publish"><CheckCircle size={16} /></button>
                    )}
                    {q.status === 'published' && (
                      <button onClick={() => updateStatus(q.id, 'archived')} disabled={saving}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Archive"><XCircle size={16} /></button>
                    )}
                    {q.status === 'archived' && (
                      <button onClick={() => updateStatus(q.id, 'draft')} disabled={saving}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Reopen Draft"><XCircle size={16} /></button>
                    )}
                    <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
