'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { BookOpen, Save, ArrowLeft, Loader2, Layers } from 'lucide-react';

export default function TeacherSchemeOfWorkPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [terms, setTerms] = useState<any[]>([]);
  const [mySubjects, setMySubjects] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState({
    term_id: '',
    subject_id: '',
  });

  const [editableEntries, setEditableEntries] = useState<Record<string, { topic: string; subtopics: string; objectives: string; resources: string }>>({});

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchInitialData();
  }, [profile]);

  async function fetchInitialData() {
    setLoading(true);
    const [termsRes, subjectsRes] = await Promise.all([
      supabase.from('terms').select('*, session:academic_sessions!session_id(name)').order('start_date'),
      supabase.from('subjects').select('*, class:classes!class_id(name)').eq('teacher_id', profile?.id).order('name'),
    ]);
    if (!termsRes.error && termsRes.data) setTerms(termsRes.data);
    if (!subjectsRes.error && subjectsRes.data) setMySubjects(subjectsRes.data);
    setLoading(false);
  }

  async function loadEntries() {
    if (!filters.term_id || !filters.subject_id) return;
    setLoading(true);
    const selectedSubject = mySubjects.find(s => s.id === filters.subject_id);
    const { data } = await supabase
      .from('scheme_of_work')
      .select('*')
      .eq('term_id', filters.term_id)
      .eq('subject_id', filters.subject_id)
      .eq('class_id', selectedSubject?.class_id)
      .order('week_number');
    if (data) {
      setEntries(data);
      const editable: Record<string, any> = {};
      data.forEach(e => {
        editable[e.week_number] = {
          topic: e.topic || '',
          subtopics: Array.isArray(e.subtopics) ? e.subtopics.join('\n') : '',
          objectives: Array.isArray(e.learning_objectives) ? e.learning_objectives.join('\n') : '',
          resources: e.resources || '',
        };
      });
      setEditableEntries(editable);
    }
    setLoading(false);
  }

  useEffect(() => { loadEntries(); }, [filters.term_id, filters.subject_id]);

  function getWeeksInTerm(termId: string) {
    const term = terms.find(t => t.id === termId);
    if (!term) return 13;
    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(Math.ceil(diffDays / 7), 1);
  }

  function initWeek(weekNum: number) {
    if (!editableEntries[weekNum]) {
      setEditableEntries(prev => ({ ...prev, [weekNum]: { topic: '', subtopics: '', objectives: '', resources: '' } }));
    }
  }

  async function saveAll() {
    if (!filters.term_id || !filters.subject_id) {
      setError('Please select term and subject'); return;
    }
    setError(''); setSaving(true);
    try {
      const selectedSubject = mySubjects.find(s => s.id === filters.subject_id);
      const classId = selectedSubject?.class_id;
      const weekNumbers = Object.keys(editableEntries).map(Number).sort((a, b) => a - b);
      for (const weekNum of weekNumbers) {
        const entry = editableEntries[weekNum];
        if (!entry.topic.trim()) continue;
        const subtopicsArr = entry.subtopics.split('\n').map(s => s.trim()).filter(Boolean);
        const objectivesArr = entry.objectives.split('\n').map(s => s.trim()).filter(Boolean);
        const existing = entries.find(e => e.week_number === weekNum);

        const payload = {
          term_id: filters.term_id,
          class_id: classId,
          subject_id: filters.subject_id,
          week_number: weekNum,
          topic: entry.topic,
          subtopics: subtopicsArr,
          learning_objectives: objectivesArr,
          resources: entry.resources || null,
        };

        if (existing) {
          const { error } = await supabase.from('scheme_of_work').update(payload).eq('id', existing.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabase.from('scheme_of_work').insert(payload);
          if (error) throw new Error(error.message);
        }
      }
      setSuccess('Scheme of work saved successfully');
      setTimeout(() => setSuccess(''), 3000);
      loadEntries();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  const selectedTerm = terms.find(t => t.id === filters.term_id);
  const selectedSubject = mySubjects.find(s => s.id === filters.subject_id);
  const weeks = selectedTerm ? getWeeksInTerm(selectedTerm.id) : 13;

  return (
    <DashboardLayout title="My Scheme of Work" subtitle="Plan your weekly curriculum">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">My Scheme of Work</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Plan your weekly curriculum</p>
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm">{success}</div>}

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Term</label>
              <select value={filters.term_id} onChange={e => setFilters(p => ({ ...p, term_id: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select term...</option>
                {terms.map(term => (
                  <option key={term.id} value={term.id}>
                    {term.name} {term.session?.name ? `(${term.session.name})` : ''} {term.is_current ? '- Current' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-1">Subject</label>
              <select value={filters.subject_id} onChange={e => setFilters(p => ({ ...p, subject_id: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select subject...</option>
                {mySubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.class ? `(${s.class.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Week editor */}
        {filters.term_id && filters.subject_id ? (
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" />
                <span className="font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">{weeks} Weeks</span>
                {selectedSubject?.class && (
                  <span className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500">| {selectedSubject.class.name}</span>
                )}
              </div>
              <button onClick={saveAll} disabled={saving}
                className="btn-primary flex items-center gap-2 px-4 py-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save All
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase w-16">Week</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Topic</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase w-64">Subtopics</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase w-64">Learning Objectives</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase w-48">Resources</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 dark:divide-slate-700">
                    {Array.from({ length: weeks }, (_, i) => i + 1).map(weekNum => {
                      const entry = editableEntries[weekNum] || { topic: '', subtopics: '', objectives: '', resources: '' };
                      const existing = entries.find(e => e.week_number === weekNum);
                      return (
                        <tr key={weekNum} className={`hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 ${existing ? 'bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20/30' : ''}`}>
                          <td className="px-4 py-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${existing ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-400'}`}>
                              {weekNum}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={entry.topic} onChange={e => {
                              setEditableEntries(prev => ({ ...prev, [weekNum]: { ...prev[weekNum], topic: e.target.value } }));
                            }} onFocus={() => initWeek(weekNum)}
                              placeholder="Topic title"
                              className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                          </td>
                          <td className="px-4 py-3">
                            <textarea value={entry.subtopics} onChange={e => {
                              setEditableEntries(prev => ({ ...prev, [weekNum]: { ...prev[weekNum], subtopics: e.target.value } }));
                            }} onFocus={() => initWeek(weekNum)}
                              placeholder="One per line"
                              rows={3} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none" />
                          </td>
                          <td className="px-4 py-3">
                            <textarea value={entry.objectives} onChange={e => {
                              setEditableEntries(prev => ({ ...prev, [weekNum]: { ...prev[weekNum], objectives: e.target.value } }));
                            }} onFocus={() => initWeek(weekNum)}
                              placeholder="One per line"
                              rows={3} className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none" />
                          </td>
                          <td className="px-4 py-3">
                            <input type="text" value={entry.resources} onChange={e => {
                              setEditableEntries(prev => ({ ...prev, [weekNum]: { ...prev[weekNum], resources: e.target.value } }));
                            }} onFocus={() => initWeek(weekNum)}
                              placeholder="Links, references"
                              className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-end p-4 border-t border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
              <button onClick={saveAll} disabled={saving}
                className="btn-primary flex items-center gap-2 px-6 py-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save All Weeks
              </button>
            </div>
          </div>
        ) : (
          <div className="card text-center py-16">
            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Select a term and subject</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">to view and edit your scheme of work</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
