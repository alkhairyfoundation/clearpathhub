'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Loader2, ArrowLeft, Users, Save, AlertCircle, Check, FileText, Plus, X } from 'lucide-react';
import { RUBRIC_COLORS, RUBRIC_LABELS } from '@/types';

export default function TeacherPortfolioTrackingPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [goal, setGoal] = useState<any>(null);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rubricUpdates, setRubricUpdates] = useState<Record<string, string>>({});
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({ evidence_type: 'manual', text_snapshot: '' });

  const LEVELS = ['emerging', 'developing', 'secure', 'strong'];

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    loadStudents();
  }, [profile]);

  async function loadStudents() {
    setLoading(true);
    try {
      const { data: classes } = await supabase.from('classes').select('id').eq('form_teacher_id', profile!.id);
      const classIds = classes?.map(c => c.id) || [];
      if (classIds.length === 0) { setLoading(false); return; }

      const { data: studentData } = await supabase
        .from('students')
        .select('profile_id, profile:profiles!profile_id(first_name, last_name), class_id')
        .in('class_id', classIds);
      setStudents(studentData || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  async function loadStudentData(studentId: string) {
    setLoading(true);
    setSelectedStudent(studentId);
    try {
      const { data: session } = await supabase.from('academic_sessions').select('*').eq('is_current', true).single();
      const { data: term } = await supabase.from('terms').select('*').eq('is_current', true).single();

      if (!session || !term) { setLoading(false); return; }

      const [goalRes, rubricRes, evidenceRes] = await Promise.all([
        supabase.from('student_term_goals')
          .select('*, archetype:archetypes(*), goal_skills:student_goal_skills(*, skill:skills(*))')
          .eq('student_id', studentId).eq('session_id', session.id).eq('term_id', term.id)
          .maybeSingle(),
        supabase.from('student_skill_rubrics')
          .select('*, skill:skills(*)')
          .eq('student_id', studentId).eq('session_id', session.id).eq('term_id', term.id),
        supabase.from('portfolio_evidence')
          .select('*')
          .eq('student_id', studentId).eq('session_id', session.id).eq('term_id', term.id)
          .order('created_at', { ascending: false }),
      ]);

      setGoal(goalRes.data);
      setRubrics(rubricRes.data || []);
      setEvidence(evidenceRes.data || []);

      const updates: Record<string, string> = {};
      (rubricRes.data || []).forEach((r: any) => { updates[r.skill_id] = r.level; });
      setRubricUpdates(updates);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  async function saveRubrics() {
    if (!goal || !selectedStudent) return;
    setSaving(true); setError('');
    try {
      const { data: session } = await supabase.from('academic_sessions').select('*').eq('is_current', true).single();
      const { data: term } = await supabase.from('terms').select('*').eq('is_current', true).single();
      if (!session || !term) throw new Error('No active session');

      const updates = Object.entries(rubricUpdates).map(([skillId, level]) => ({
        student_id: selectedStudent,
        session_id: session.id,
        term_id: term.id,
        skill_id: skillId,
        level,
        updated_by: profile!.id,
      }));

      for (const update of updates) {
        await supabase.from('student_skill_rubrics').upsert(update, {
          onConflict: 'student_id,session_id,term_id,skill_id',
        });
      }

      setSuccess('Rubrics updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update');
    } finally { setSaving(false); }
  }

  async function addEvidence() {
    if (!selectedStudent || !evidenceForm.text_snapshot.trim()) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.from('academic_sessions').select('*').eq('is_current', true).single();
      const { data: term } = await supabase.from('terms').select('*').eq('is_current', true).single();
      if (!session || !term) throw new Error('No active session');

      await supabase.from('portfolio_evidence').insert({
        student_id: selectedStudent,
        session_id: session.id,
        term_id: term.id,
        evidence_type: evidenceForm.evidence_type,
        text_snapshot: evidenceForm.text_snapshot,
        created_by: profile!.id,
      });

      setEvidenceForm({ evidence_type: 'manual', text_snapshot: '' });
      setShowEvidenceModal(false);

      const { data: newEvidence } = await supabase
        .from('portfolio_evidence')
        .select('*')
        .eq('student_id', selectedStudent).eq('session_id', session.id).eq('term_id', term.id)
        .order('created_at', { ascending: false });
      setEvidence(newEvidence || []);

      setSuccess('Evidence added!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add evidence');
    } finally { setSaving(false); }
  }

  const selectedStudentProfile = students.find(s => s.profile_id === selectedStudent)?.profile;

  return (
    <DashboardLayout title="Portfolio Tracking" subtitle="Track and update student skill rubrics">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Portfolio Tracking</h1>
            <p className="text-slate-500 mt-1">Update rubric levels and add evidence for your students</p>
          </div>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm flex items-center gap-2"><Check size={16} /> {success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Users size={18} /> Select Student</h3>
          {students.length === 0 ? (
            <p className="text-sm text-slate-400">No students assigned to your classes.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {students.map((s: any) => (
                <button key={s.profile_id} onClick={() => loadStudentData(s.profile_id)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${selectedStudent === s.profile_id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="font-medium text-slate-900 truncate">{s.profile?.first_name} {s.profile?.last_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
        ) : selectedStudent && !goal ? (
          <div className="card text-center py-8">
            <p className="text-slate-500">This student has not set a growth goal yet.</p>
          </div>
        ) : selectedStudent && goal ? (
          <>
            <div className="card bg-gradient-to-br from-primary-50 to-amber-50">
              <p className="font-semibold text-primary-800">{selectedStudentProfile?.first_name} {selectedStudentProfile?.last_name}</p>
              <p className="text-sm text-primary-600 mt-1">{goal.archetype?.name}</p>
              <p className="text-sm text-primary-700 italic mt-1">{goal.goal_statement_snapshot}</p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Skill Rubrics</h3>
                <button onClick={saveRubrics} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                </button>
              </div>
              <div className="space-y-3">
                {(goal.goal_skills || []).map((gs: any) => (
                  <div key={gs.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{gs.skill?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {LEVELS.map((level) => (
                        <button key={level} onClick={() => setRubricUpdates({ ...rubricUpdates, [gs.skill_id]: level })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            (rubricUpdates[gs.skill_id] || '') === level
                              ? `${RUBRIC_COLORS[level as keyof typeof RUBRIC_COLORS]} text-white`
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {RUBRIC_LABELS[level as keyof typeof RUBRIC_LABELS]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Evidence Notes</h3>
                <button onClick={() => setShowEvidenceModal(true)} className="btn-primary text-sm flex items-center gap-1">
                  <Plus size={14} /> Add Evidence
                </button>
              </div>
              {evidence.length === 0 ? (
                <p className="text-sm text-slate-400">No evidence recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {evidence.map((ev: any) => (
                    <div key={ev.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 capitalize font-medium">{ev.evidence_type}</span>
                          <span className="text-xs text-slate-400">{new Date(ev.created_at).toLocaleDateString()}</span>
                        </div>
                        {ev.text_snapshot && <p className="text-sm text-slate-700 mt-1">{ev.text_snapshot}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Evidence Note</h3>
              <button onClick={() => setShowEvidenceModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Evidence Type</label>
                <select value={evidenceForm.evidence_type} onChange={(e) => setEvidenceForm({ ...evidenceForm, evidence_type: e.target.value })} className="input">
                  <option value="manual">Manual Note</option>
                  <option value="attendance">Attendance</option>
                  <option value="punctuality">Punctuality</option>
                  <option value="commendation">Commendation</option>
                  <option value="assessment">Assessment</option>
                  <option value="audit">Audit</option>
                </select>
              </div>
              <div>
                <label className="label">Note</label>
                <textarea value={evidenceForm.text_snapshot} onChange={(e) => setEvidenceForm({ ...evidenceForm, text_snapshot: e.target.value })}
                  className="input" rows={3} placeholder="Describe the evidence or achievement..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowEvidenceModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={addEvidence} disabled={saving || !evidenceForm.text_snapshot.trim()} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
