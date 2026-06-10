'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Target, Check, Loader2, ArrowLeft, BookOpen, FileText, Clock, Award, Calendar, AlertCircle, Sparkles } from 'lucide-react';
import { RUBRIC_COLORS, RUBRIC_LABELS } from '@/types';

export default function StudentPortfolioPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [goal, setGoal] = useState<any>(null);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reflection, setReflection] = useState('');
  const [savingReflection, setSavingReflection] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: session } = await supabase.from('academic_sessions').select('*').eq('is_current', true).single();
      const { data: term } = await supabase.from('terms').select('*').eq('is_current', true).single();
      if (!session || !term) { setLoading(false); return; }

      const [goalRes, rubricRes, evidenceRes] = await Promise.all([
        supabase.from('student_term_goals')
          .select('*, archetype:archetypes(*), goal_skills:student_goal_skills(*, skill:skills(*))')
          .eq('student_id', profile!.id).eq('session_id', session.id).eq('term_id', term.id)
          .maybeSingle(),
        supabase.from('student_skill_rubrics')
          .select('*, skill:skills(*)')
          .eq('student_id', profile!.id).eq('session_id', session.id).eq('term_id', term.id),
        supabase.from('portfolio_evidence')
          .select('*')
          .eq('student_id', profile!.id).eq('session_id', session.id).eq('term_id', term.id)
          .order('created_at', { ascending: false }),
      ]);

      if (goalRes.data) setGoal(goalRes.data);
      if (rubricRes.data) setRubrics(rubricRes.data);
      if (evidenceRes.data) setEvidence(evidenceRes.data);

      if (goalRes.data && goalRes.data.reflection) {
        setReflection(goalRes.data.reflection);
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  async function saveReflection() {
    if (!goal) return;
    setSavingReflection(true);
    try {
      await supabase.from('student_term_goals').update({ reflection_text: reflection }).eq('id', goal.id);
    } catch (err) { /* ignore */ }
    setSavingReflection(false);
  }

  function getLevelForSkill(skillId: string): string | null {
    const rubric = rubrics.find(r => r.skill_id === skillId);
    return rubric?.level || null;
  }

  if (loading) {
    return (
      <DashboardLayout title="My Portfolio" subtitle="Your growth journey this term">
        <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  if (!goal) {
    return (
      <DashboardLayout title="My Portfolio" subtitle="Your growth journey this term">
        <div className="card text-center py-16">
          <Target className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="font-medium text-slate-500">No growth goal set yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Start by creating your growth goal for this term</p>
          <Link href="/student/growth-path" className="btn-primary inline-flex items-center gap-2">
            <Sparkles size={18} /> Set My Goal
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Portfolio" subtitle="Your growth journey this term">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Portfolio</h1>
            <p className="text-slate-500 mt-1">Track your growth this term</p>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-primary-50 to-amber-50 border-primary-200">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Target className="text-primary-600" size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-primary-800">{goal.archetype?.name || 'Archetype'}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  goal.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  goal.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{goal.status}</span>
              </div>
              <p className="text-primary-700 italic">{goal.goal_statement_snapshot}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-4">Skills Progress</h3>
          {goal.goal_skills?.length === 0 ? (
            <p className="text-sm text-slate-400">No skills selected yet.</p>
          ) : (
            <div className="space-y-3">
              {(goal.goal_skills || []).map((gs: any) => {
                const level = getLevelForSkill(gs.skill_id);
                const levelKey = level as keyof typeof RUBRIC_COLORS;
                return (
                  <div key={gs.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${level ? RUBRIC_COLORS[levelKey] || 'bg-slate-300' : 'bg-slate-300'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{gs.skill?.name || 'Skill'}</p>
                    </div>
                    <div>
                      {level ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${level ? RUBRIC_COLORS[levelKey]?.replace('bg-', 'bg-').replace('500', '100 text-').replace('bg-', '') + '500' : ''} || 'bg-slate-100 text-slate-600'`}>
                          {RUBRIC_LABELS[levelKey] || level}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Awaiting review</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-slate-500" />
            <h3 className="font-semibold text-slate-900">Evidence & Achievements</h3>
          </div>
          {evidence.length === 0 ? (
            <p className="text-sm text-slate-400">No evidence recorded yet. Your teacher will add evidence as you progress.</p>
          ) : (
            <div className="space-y-2">
              {evidence.map((ev: any) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    {ev.evidence_type === 'attendance' && <Calendar size={16} className="text-primary-600" />}
                    {ev.evidence_type === 'assessment' && <Award size={16} className="text-primary-600" />}
                    {ev.evidence_type === 'manual' && <FileText size={16} className="text-primary-600" />}
                    {(ev.evidence_type === 'incident' || ev.evidence_type === 'commendation') && <AlertCircle size={16} className="text-primary-600" />}
                    {!['attendance','assessment','manual','incident','commendation'].includes(ev.evidence_type) && <Clock size={16} className="text-primary-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 capitalize">{ev.evidence_type}</p>
                    {ev.text_snapshot && <p className="text-xs text-slate-500">{ev.text_snapshot}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(ev.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-3">End of Term Reflection</h3>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            className="input"
            rows={4}
            placeholder="What did you learn this term? How have you grown? What would you like to improve next term?"
          />
          <div className="flex justify-end mt-3">
            <button onClick={saveReflection} disabled={savingReflection} className="btn-primary text-sm">
              {savingReflection ? <Loader2 size={14} className="animate-spin" /> : 'Save Reflection'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
