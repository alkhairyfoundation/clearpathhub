'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, X, Calendar, CheckCircle, Clock, BookOpen, ChevronDown, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminAcademicSessionsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [editingTerm, setEditingTerm] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sessionForm, setSessionForm] = useState({ name: '', start_date: '', end_date: '' });
  const [termForm, setTermForm] = useState({ session_id: '', name: '', start_date: '', end_date: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const TERM_NAMES = ['First Term', 'Second Term', 'Third Term'];

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [sessionsRes, termsRes] = await Promise.all([
      supabase.from('academic_sessions').select('*').order('start_date', { ascending: false }),
      supabase.from('terms').select('*').order('start_date'),
    ]);
    if (!sessionsRes.error && sessionsRes.data) setSessions(sessionsRes.data);
    if (!termsRes.error && termsRes.data) setTerms(termsRes.data);
    setLoading(false);
  }

  function getTermsForSession(sessionId: string) {
    return terms.filter(t => t.session_id === sessionId);
  }

  function toggleSession(id: string) {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openSessionModal(session?: any) {
    if (session) {
      setEditingSession(session);
      setSessionForm({ name: session.name, start_date: session.start_date, end_date: session.end_date });
    } else {
      setEditingSession(null);
      setSessionForm({ name: '', start_date: '', end_date: '' });
    }
    setShowSessionModal(true);
  }

  function openTermModal(sessionId: string, term?: any) {
    if (term) {
      setEditingTerm(term);
      setTermForm({ session_id: term.session_id, name: term.name, start_date: term.start_date, end_date: term.end_date });
    } else {
      setEditingTerm(null);
      setTermForm({ session_id: sessionId, name: '', start_date: '', end_date: '' });
    }
    setShowTermModal(true);
  }

  async function handleSaveSession() {
    if (!sessionForm.name.trim() || !sessionForm.start_date || !sessionForm.end_date) {
      setError('All fields are required'); return;
    }
    if (new Date(sessionForm.end_date) <= new Date(sessionForm.start_date)) {
      setError('End date must be after start date'); return;
    }
    setError(''); setSaving(true);
    try {
      if (editingSession) {
        const { error: err } = await supabase.from('academic_sessions').update(sessionForm).eq('id', editingSession.id);
        if (err) throw new Error(err.message);
        setSuccess('Session updated');
      } else {
        const { error: err } = await supabase.from('academic_sessions').insert(sessionForm);
        if (err) throw new Error(err.message);
        setSuccess('Session created');
      }
      setTimeout(() => { setShowSessionModal(false); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  async function handleSaveTerm() {
    if (!termForm.name.trim() || !termForm.start_date || !termForm.end_date) {
      setError('All fields are required'); return;
    }
    if (new Date(termForm.end_date) <= new Date(termForm.start_date)) {
      setError('End date must be after start date'); return;
    }
    setError(''); setSaving(true);
    try {
      if (editingTerm) {
        const { error: err } = await supabase.from('terms').update(termForm).eq('id', editingTerm.id);
        if (err) throw new Error(err.message);
        setSuccess('Term updated');
      } else {
        const { error: err } = await supabase.from('terms').insert(termForm);
        if (err) throw new Error(err.message);
        setSuccess('Term created');
      }
      setTimeout(() => { setShowTermModal(false); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, table: 'academic_sessions' | 'terms') {
    const label = table === 'academic_sessions' ? 'session' : 'term';
    if (!confirm(`Delete this ${label}? This action cannot be undone.`)) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted`);
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally { setDeleting(null); }
  }

  async function setCurrentSession(id: string) {
    setSaving(true);
    try {
      await supabase.from('academic_sessions').update({ is_current: false }).neq('id', id);
      const { error } = await supabase.from('academic_sessions').update({ is_current: true }).eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Current session updated');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  async function setCurrentTerm(id: string) {
    setSaving(true);
    try {
      await supabase.from('terms').update({ is_current: false }).neq('id', id);
      const { error } = await supabase.from('terms').update({ is_current: true }).eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Current term updated');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  async function autoGenerateTerms(sessionId: string) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    setSaving(true);
    try {
      const start = new Date(session.start_date);
      const end = new Date(session.end_date);
      const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      const daysPerTerm = Math.floor(totalDays / 3);
      for (let i = 0; i < 3; i++) {
        const termStart = new Date(start.getTime() + i * daysPerTerm * 86400000);
        const termEnd = i < 2
          ? new Date(termStart.getTime() + (daysPerTerm - 1) * 86400000)
          : end;
        await supabase.from('terms').insert({
          session_id: sessionId,
          name: TERM_NAMES[i],
          start_date: termStart.toISOString().split('T')[0],
          end_date: termEnd.toISOString().split('T')[0],
        });
      }
      setSuccess('Terms auto-generated');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <DashboardLayout title="Academic Sessions" subtitle="Manage sessions, terms, and academic calendar">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Academic Sessions</h1>
              <p className="text-slate-500 mt-1">Manage academic sessions and terms</p>
            </div>
          </div>
          <button onClick={() => openSessionModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Session
          </button>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No academic sessions yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Create your first academic session</p>
            <button onClick={() => openSessionModal()} className="btn-primary">Add Session</button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => {
              const sessionTerms = getTermsForSession(session.id);
              const isExpanded = expandedSessions.has(session.id);
              return (
                <div key={session.id} className="card overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-white border-b border-slate-100">
                    <div className="flex items-center gap-3 flex-1">
                      <button onClick={() => toggleSession(session.id)} className="p-1 hover:bg-slate-100 rounded">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                      <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                        <Calendar size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{session.name}</h3>
                          {session.is_current && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Current</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {formatDate(session.start_date)} - {formatDate(session.end_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!session.is_current && (
                        <button onClick={() => setCurrentSession(session.id)} title="Set as current"
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button onClick={() => openSessionModal(session)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDelete(session.id, 'academic_sessions')} disabled={deleting === session.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-slate-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-700 flex items-center gap-2">
                          <BookOpen size={16} /> Terms
                        </h4>
                        <div className="flex gap-2">
                          {sessionTerms.length === 0 && (
                            <button onClick={() => autoGenerateTerms(session.id)} disabled={saving}
                              className="text-xs px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100">
                              Auto-Generate 3 Terms
                            </button>
                          )}
                          <button onClick={() => openTermModal(session.id)}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1">
                            <Plus size={14} /> Add Term
                          </button>
                        </div>
                      </div>

                      {sessionTerms.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No terms for this session. Add one or auto-generate.</p>
                      ) : (
                        <div className="space-y-2">
                          {sessionTerms.map(term => (
                            <div key={term.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex items-center gap-3">
                                <Clock size={16} className="text-slate-400" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-slate-800">{term.name}</span>
                                    {term.is_current && (
                                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">Current</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {formatDate(term.start_date)} - {formatDate(term.end_date)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!term.is_current && (
                                  <button onClick={() => setCurrentTerm(term.id)} title="Set as current"
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded">
                                    <CheckCircle size={15} />
                                  </button>
                                )}
                                <button onClick={() => openTermModal(session.id, term)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                  <Edit size={15} />
                                </button>
                                <button onClick={() => handleDelete(term.id, 'terms')} disabled={deleting === term.id}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Session Modal */}
        {showSessionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSessionModal(false)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{editingSession ? 'Edit Session' : 'New Session'}</h2>
                <button onClick={() => setShowSessionModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Session Name</label>
                  <input type="text" value={sessionForm.name} onChange={e => setSessionForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. 2025/2026" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input type="date" value={sessionForm.start_date} onChange={e => setSessionForm(p => ({ ...p, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input type="date" value={sessionForm.end_date} onChange={e => setSessionForm(p => ({ ...p, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowSessionModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveSession} disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                  {editingSession ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Term Modal */}
        {showTermModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTermModal(false)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">{editingTerm ? 'Edit Term' : 'New Term'}</h2>
                <button onClick={() => setShowTermModal(false)} className="p-1 hover:bg-slate-100 rounded"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Term Name</label>
                  <select value={termForm.name} onChange={e => setTermForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Select term...</option>
                    {TERM_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                    <input type="date" value={termForm.start_date} onChange={e => setTermForm(p => ({ ...p, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                    <input type="date" value={termForm.end_date} onChange={e => setTermForm(p => ({ ...p, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowTermModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveTerm} disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                  {editingTerm ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
