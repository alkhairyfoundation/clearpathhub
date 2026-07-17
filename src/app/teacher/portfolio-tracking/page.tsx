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
        fetch(`/api/student-term-goals?studentId=${studentId}&sessionId=${session.id}&termId=${term.id}`).then(r => r.json()),
        fetch(`/api/portfolio/rubric?studentId=${studentId}&sessionId=${session.id}&termId=${term.id}`).then(r => r.json()),
        fetch(`/api/portfolio-evidence?studentId=${studentId}&sessionId=${session.id}&termId=${term.id}`).then(r => r.json()),
      ]);

      setGoal(goalRes.goal);
      setRubrics(rubricRes.rubrics || []);
      setEvidence(evidenceRes.evidence || []);

      const updates: Record<string, string> = {};
      (rubricRes.rubrics || []).forEach((r: any) => { updates[r.skill_id] = r.level; });
      setRubricUpdates(updates);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  async function saveRubrics() {
    if (!goal || !selectedStudent) return;
    setSaving(true); setError('');
    try {
      const rubrics = Object.entries(rubricUpdates).map(([skillId, level]) => ({
        skill_id: skillId,
        level,
        updated_by: profile!.id,
      }));

      const res = await fetch('/api/portfolio/rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent, rubrics }),
      });
      if (!res.ok) throw new Error('Failed to update rubrics');

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
      const sessionRes = await supabase.from('academic_sessions').select('*').eq('is_current', true).single();
      const termRes = await supabase.from('terms').select('*').eq('is_current', true).single();
      const session = sessionRes.data;
      const term = termRes.data;
      if (!session || !term) throw new Error('No active session');

      await fetch('/api/portfolio-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent,
          session_id: session.id,
          term_id: term.id,
          evidence_type: evidenceForm.evidence_type,
          text_snapshot: evidenceForm.text_snapshot,
          created_by: profile!.id,
        }),
      });

      setEvidenceForm({ evidence_type: 'manual', text_snapshot: '' });
      setShowEvidenceModal(false);

      const evidenceRes = await fetch(`/api/portfolio-evidence?studentId=${selectedStudent}&sessionId=${session.id}&termId=${term.id}`).then(r => r.json());
      setEvidence(evidenceRes.evidence || []);

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
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Portfolio Tracking</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Update rubric levels and add evidence for your students</p>
          </div>
        </div>

        {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm flex items-center gap-2"><Check size={16} /> {success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

        <div className="card">
          <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white mb-3 flex items-center gap-2"><Users size={18} /> Select Student</h3>
          {students.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500">No students assigned to your classes.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {students.map((s: any) => (
                <button key={s.profile_id} onClick={() => loadStudentData(s.profile_id)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${selectedStudent === s.profile_id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600'}`}>
                  <p className="font-medium text-slate-900 dark:text-white dark:text-white truncate">{s.profile?.first_name} {s.profile?.last_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
        ) : selectedStudent && !goal ? (
          <div className="card text-center py-8">
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">This student has not set a growth goal yet.</p>
          </div>
        ) : selectedStudent && goal ? (
          <>
            <div className="card bg-gradient-to-br from-primary-50 to-amber-50">
              <p className="font-semibold text-primary-800 dark:text-primary-200 dark:text-primary-200">{selectedStudentProfile?.first_name} {selectedStudentProfile?.last_name}</p>
              <p className="text-sm text-primary-600 dark:text-primary-400 dark:text-primary-400 mt-1">{goal.archetype?.name}</p>
              <p className="text-sm text-primary-700 dark:text-primary-300 dark:text-primary-300 italic mt-1">{goal.goal_statement_snapshot}</p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white">Skill Rubrics</h3>
                <button onClick={saveRubrics} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                </button>
              </div>
              <div className="space-y-3">
                {(goal.goal_skills || []).map((gs: any) => (
                  <div key={gs.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white dark:text-white">{gs.skill?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {LEVELS.map((level) => (
                        <button key={level} onClick={() => setRubricUpdates({ ...rubricUpdates, [gs.skill_id]: level })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            (rubricUpdates[gs.skill_id] || '') === level
                              ? `${RUBRIC_COLORS[level as keyof typeof RUBRIC_COLORS]} text-white`
                              : 'bg-white border border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600'
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
                <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white">Evidence Notes</h3>
                <button onClick={() => setShowEvidenceModal(true)} className="btn-primary text-sm flex items-center gap-1">
                  <Plus size={14} /> Add Evidence
                </button>
              </div>
              {evidence.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500">No evidence recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {evidence.map((ev: any) => (
                    <div key={ev.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 dark:text-primary-300 capitalize font-medium">{ev.evidence_type}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{new Date(ev.created_at).toLocaleDateString()}</span>
                        </div>
                        {ev.text_snapshot && <p className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300 mt-1">{ev.text_snapshot}</p>}
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
              <button onClick={() => setShowEvidenceModal(false)} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
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
