'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Check, X, Loader2, ArrowLeft, Users, AlertCircle, Eye } from 'lucide-react';
import type { StudentTermGoal, Skill } from '@/types';

export default function TeacherGoalApprovalsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [rubricLevels, setRubricLevels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const LEVELS = ['emerging', 'developing', 'secure', 'strong'];

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchGoals();
  }, [profile]);

  async function fetchGoals() {
    setLoading(true);
    try {
      const { data: classes } = await supabase.from('classes').select('id').eq('form_teacher_id', profile!.id);
      const classIds = classes?.map(c => c.id) || [];

      if (classIds.length === 0) { setGoals([]); setLoading(false); return; }

      const { data: students } = await supabase.from('students').select('profile_id').in('class_id', classIds);
      const studentIds = students?.map(s => s.profile_id) || [];

      if (studentIds.length === 0) { setGoals([]); setLoading(false); return; }

      const { data } = await supabase
        .from('student_term_goals')
        .select('*, student:profiles!student_id(first_name, last_name), archetype:archetypes(name), goal_skills:student_goal_skills(*, skill:skills(*))')
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false });

      setGoals(data || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  function openApprovalModal(goal: any) {
    setSelectedGoal(goal);
    const levels: Record<string, string> = {};
    goal.goal_skills?.forEach((gs: any) => {
      levels[gs.skill_id] = 'emerging';
    });
    setRubricLevels(levels);
    setShowModal(true);
  }

  async function handleApprove() {
    if (!selectedGoal) return;
    setSaving(true); setError('');
    try {
      const { data: session } = await supabase.from('academic_sessions').select('*').eq('is_current', true).single();
      const { data: term } = await supabase.from('terms').select('*').eq('is_current', true).single();

      const { error: gErr } = await supabase.from('student_term_goals').update({
        status: 'active', approved_at: new Date().toISOString(), approved_by: profile!.id,
      }).eq('id', selectedGoal.id);
      if (gErr) throw new Error(gErr.message);

      if (session && term) {
        const rubricInserts = Object.entries(rubricLevels).map(([skillId, level]) => ({
          student_id: selectedGoal.student_id,
          session_id: session.id,
          term_id: term.id,
          skill_id: skillId,
          level,
          updated_by: profile!.id,
        }));
        const { error: rErr } = await supabase.from('student_skill_rubrics').upsert(rubricInserts, {
          onConflict: 'student_id,session_id,term_id,skill_id',
        });
        if (rErr) throw new Error(rErr.message);
      }

      setSuccess('Goal approved!');
      setTimeout(() => { setShowModal(false); fetchGoals(); }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    } finally { setSaving(false); }
  }

  const pendingGoals = goals.filter(g => g.status === 'pending');
  const otherGoals = goals.filter(g => g.status !== 'pending');

  return (
    <DashboardLayout title="Goal Approvals" subtitle="Review and approve student growth goals">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Goal Approvals</h1>
            <p className="text-slate-500 mt-1">Review student growth goals for your class</p>
          </div>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm flex items-center gap-2"><Check size={16} /> {success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-primary-600" /></div>
        ) : (
          <>
            <div className="card">
              <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users size={18} /> Pending Approvals ({pendingGoals.length})
              </h2>
              {pendingGoals.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No pending approvals</p>
              ) : (
                <div className="space-y-3">
                  {pendingGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{goal.student?.first_name} {goal.student?.last_name}</p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {goal.archetype?.name} &middot; {goal.goal_skills?.length || 0} skills
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(goal.submitted_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openApprovalModal(goal)} className="btn-primary text-sm flex items-center gap-1">
                          <Eye size={14} /> Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {otherGoals.length > 0 && (
              <div className="card">
                <h2 className="font-semibold text-slate-900 mb-4">Previous Approvals ({otherGoals.length})</h2>
                <div className="space-y-2">
                  {otherGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{goal.student?.first_name} {goal.student?.last_name}</p>
                        <p className="text-xs text-slate-500">{goal.archetype?.name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        goal.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>{goal.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold">Review Goal</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-primary-50 rounded-xl p-4">
                <p className="font-semibold text-primary-800">{selectedGoal.student?.first_name} {selectedGoal.student?.last_name}</p>
                <p className="text-sm text-primary-600 mt-1">{selectedGoal.archetype?.name}</p>
                <p className="text-sm text-primary-700 italic mt-2">{selectedGoal.goal_statement_snapshot}</p>
              </div>

              <div>
                <label className="label">Set Initial Rubric Levels</label>
                <p className="text-xs text-slate-500 mb-3">Set the starting level for each selected skill.</p>
                {selectedGoal.goal_skills?.map((gs: any) => (
                  <div key={gs.id} className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-slate-700 w-36">{gs.skill?.name}</span>
                    <select
                      value={rubricLevels[gs.skill_id] || 'emerging'}
                      onChange={(e) => setRubricLevels({ ...rubricLevels, [gs.skill_id]: e.target.value })}
                      className="input flex-1"
                    >
                      {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleApprove} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Approve Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
