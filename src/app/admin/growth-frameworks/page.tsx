'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, ArrowLeft, BookOpen, Check, AlertCircle } from 'lucide-react';
import type { ClassTermFramework, AcademicSession, Term, Subject, Skill, Archetype } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminGrowthFrameworksPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    session_id: '', term_id: '', class_level: '',
    competencies: [] as { subject_id: string; competency_text: string }[],
    expected_skills: [] as string[],
  });

  const LEVELS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);
    const [sessionsRes, termsRes, subjectsRes, skillsData, frameworksRes] = await Promise.all([
      supabase.from('academic_sessions').select('*').order('name', { ascending: false }),
      supabase.from('terms').select('*').order('name'),
      supabase.from('subjects').select('*').order('name'),
      fetch('/api/skills').then(r => r.json()),
      supabase.from('class_term_frameworks').select('*, session:academic_sessions(*), term:terms(*)'),
    ]);
    if (!sessionsRes.error && sessionsRes.data) setSessions(sessionsRes.data);
    if (!termsRes.error && termsRes.data) setTerms(termsRes.data);
    if (!subjectsRes.error && subjectsRes.data) setSubjects(subjectsRes.data);
    if (Array.isArray(skillsData)) setSkills(skillsData);
    if (!frameworksRes.error && frameworksRes.data) setFrameworks(frameworksRes.data);
    setLoading(false);
  }

  function openModal(item?: any) {
    if (item) {
      setEditing(item);
      setFormData({
        session_id: item.session_id,
        term_id: item.term_id,
        class_level: item.class_level,
        competencies: [],
        expected_skills: [],
      });
    } else {
      setEditing(null);
      const currentSession = sessions.find(s => s.is_current);
      const currentTerm = terms.find(t => t.is_current);
      setFormData({
        session_id: currentSession?.id || '',
        term_id: currentTerm?.id || '',
        class_level: '',
        competencies: [],
        expected_skills: [],
      });
    }
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.session_id) { setError('Session is required'); return; }
    if (!formData.term_id) { setError('Term is required'); return; }
    if (!formData.class_level) { setError('Class level is required'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        session_id: formData.session_id,
        term_id: formData.term_id,
        class_level: formData.class_level,
        published_at: new Date().toISOString(),
        created_by: profile!.id,
      };

      if (editing) {
        const { error: err } = await supabase.from('class_term_frameworks').update(payload).eq('id', editing.id);
        if (err) throw new Error(err.message);

        if (formData.competencies.length > 0) {
          await supabase.from('academic_competencies').delete().eq('framework_id', editing.id);
          const comps = formData.competencies.map((c, i) => ({
            framework_id: editing.id, subject_id: c.subject_id, competency_text: c.competency_text, order_index: i,
          }));
          const { error: compErr } = await supabase.from('academic_competencies').insert(comps);
          if (compErr) throw new Error(compErr.message);
        }
        if (formData.expected_skills.length > 0) {
          await supabase.from('skill_expectations').delete().eq('framework_id', editing.id);
          const exps = formData.expected_skills.map((sid, i) => ({
            framework_id: editing.id, skill_id: sid, order_index: i,
          }));
          const { error: expErr } = await supabase.from('skill_expectations').insert(exps);
          if (expErr) throw new Error(expErr.message);
        }
        setSuccess('Framework updated');
      } else {
        const { data: newFw, error: err } = await supabase.from('class_term_frameworks').insert(payload).select().single();
        if (err) throw new Error(err.message);

        if (formData.competencies.length > 0) {
          const comps = formData.competencies.map((c, i) => ({
            framework_id: newFw.id, subject_id: c.subject_id, competency_text: c.competency_text, order_index: i,
          }));
          const { error: compErr } = await supabase.from('academic_competencies').insert(comps);
          if (compErr) throw new Error(compErr.message);
        }
        if (formData.expected_skills.length > 0) {
          const exps = formData.expected_skills.map((sid, i) => ({
            framework_id: newFw.id, skill_id: sid, order_index: i,
          }));
          const { error: expErr } = await supabase.from('skill_expectations').insert(exps);
          if (expErr) throw new Error(expErr.message);
        }
        setSuccess('Framework published');
      }
      setTimeout(() => { setShowModal(false); loadData(); }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  function addCompetency() {
    setFormData({ ...formData, competencies: [...formData.competencies, { subject_id: '', competency_text: '' }] });
  }
  function updateCompetency(idx: number, field: string, value: string) {
    const comps = [...formData.competencies];
    (comps[idx] as any)[field] = value;
    setFormData({ ...formData, competencies: comps });
  }
  function removeCompetency(idx: number) {
    setFormData({ ...formData, competencies: formData.competencies.filter((_, i) => i !== idx) });
  }
  function toggleSkill(skillId: string) {
    const existing = formData.expected_skills;
    if (existing.includes(skillId)) {
      setFormData({ ...formData, expected_skills: existing.filter(s => s !== skillId) });
    } else {
      setFormData({ ...formData, expected_skills: [...existing, skillId] });
    }
  }

  const filteredTerms = terms.filter(t => !formData.session_id || t.session_id === formData.session_id);

  return (
    <DashboardLayout title="Growth Frameworks" subtitle="Define expectations by class and term">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Growth Frameworks</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Set academic and skill expectations per class level and term</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Framework
          </button>
        </div>

        {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm">{success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" />
          </div>
        ) : frameworks.length === 0 ? (
          <div className="card text-center py-16">
            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No frameworks yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1 mb-4">Publish a framework to set expectations for a class level and term</p>
            <button onClick={() => openModal()} className="btn-primary">Create Framework</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Class Level</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Session</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Term</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Published</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {frameworks.map((fw: any) => (
                  <tr key={fw.id} className="hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white dark:text-white">{fw.class_level}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{fw.session?.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{fw.term?.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{fw.published_at ? new Date(fw.published_at).toLocaleDateString() : 'Draft'}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => openModal(fw)} className="text-sm text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 dark:text-primary-300 font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold">{editing ? 'Edit Framework' : 'Create Framework'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Session</label>
                  <select value={formData.session_id} onChange={(e) => setFormData({ ...formData, session_id: e.target.value })} className="input">
                    <option value="">Select session</option>
                    {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Term</label>
                  <select value={formData.term_id} onChange={(e) => setFormData({ ...formData, term_id: e.target.value })} className="input">
                    <option value="">Select term</option>
                    {filteredTerms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? ' (Current)' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Class Level</label>
                  <select value={formData.class_level} onChange={(e) => setFormData({ ...formData, class_level: e.target.value })} className="input">
                    <option value="">Select level</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Academic Competencies</label>
                  <button onClick={addCompetency} className="text-xs text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 dark:text-primary-300 font-medium">+ Add Competency</button>
                </div>
                {formData.competencies.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 italic">No competencies added. Students will not see academic expectations.</p>
                ) : (
                  <div className="space-y-2">
                    {formData.competencies.map((comp, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <select value={comp.subject_id} onChange={(e) => updateCompetency(idx, 'subject_id', e.target.value)} className="input w-40">
                          <option value="">Subject</option>
                          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input type="text" value={comp.competency_text} onChange={(e) => updateCompetency(idx, 'competency_text', e.target.value)} className="input flex-1" placeholder="e.g., Solve quadratic equations" />
                        <button onClick={() => removeCompetency(idx)} className="p-2 text-red-400 hover:text-red-600 dark:text-red-400 dark:text-red-400"><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Expected Skills (select skills students should focus on this term)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {skills.map((s) => (
                    <button key={s.id} onClick={() => toggleSkill(s.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-sm text-left ${formData.expected_skills.includes(s.id) ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600'}`}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.expected_skills.includes(s.id) ? 'bg-primary-600 border-primary-600' : 'border-slate-300 dark:border-slate-600 dark:border-slate-600'}`}>
                        {formData.expected_skills.includes(s.id) && <Check size={12} className="text-white" />}
                      </div>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : (editing ? 'Update' : 'Publish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
