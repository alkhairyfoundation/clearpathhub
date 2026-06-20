'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Target, Check, Loader2, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';
import type { Archetype, Skill } from '@/types';

export default function StudentGrowthPathPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [existingGoal, setExistingGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    loadData();
  }, [profile]);

  async function loadData() {
    setLoading(true);
    try {
      const [archRes, skillRes, sessionRes, termRes] = await Promise.all([
        supabase.from('archetypes').select('*').eq('is_active', true).order('name'),
        fetch('/api/skills').then(r => r.json()),
        supabase.from('academic_sessions').select('*').eq('is_current', true).single(),
        supabase.from('terms').select('*').eq('is_current', true).single(),
      ]);

      if (archRes.data) setArchetypes(archRes.data);
      if (Array.isArray(skillRes)) setSkills(skillRes); else if (skillRes?.data) setSkills(skillRes.data);

      const session = sessionRes.data;
      const term = termRes.data;
      if (session && term) {
        const { data: goal } = await supabase
          .from('student_term_goals')
          .select('*, goal_skills:student_goal_skills(*, skill:skills(*))')
          .eq('student_id', profile!.id)
          .eq('session_id', session.id)
          .eq('term_id', term.id)
          .maybeSingle();

        if (goal) {
          setExistingGoal(goal);
          setSelectedArchetype(goal.archetype_id);
          setSelectedSkills(goal.goal_skills?.map((gs: any) => gs.skill_id) || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  function toggleSkill(skillId: string) {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(selectedSkills.filter(id => id !== skillId));
    } else if (selectedSkills.length < 5) {
      setSelectedSkills([...selectedSkills, skillId]);
    }
  }

  async function handleSubmit() {
    if (!selectedArchetype) { setError('Please select an identity'); return; }
    if (selectedSkills.length < 3) { setError('Please select at least 3 skills'); return; }
    setError(''); setSaving(true);

    try {
      const arch = archetypes.find(a => a.id === selectedArchetype);
      const skillNames = selectedSkills.map(id => skills.find(s => s.id === id)?.name).filter(Boolean);
      const goalStatement = `This term I am growing to become a stronger ${arch?.name} by practising ${skillNames.join(', ')}.`;

      const { data: session } = await supabase.from('academic_sessions').select('*').eq('is_current', true).single();
      const { data: term } = await supabase.from('terms').select('*').eq('is_current', true).single();

      if (!session || !term) { throw new Error('No active session or term'); }

      if (existingGoal) {
        const { error: gErr } = await supabase.from('student_term_goals').update({
          archetype_id: selectedArchetype,
          goal_statement_snapshot: goalStatement,
          status: existingGoal.status === 'active' ? 'active' : 'pending',
        }).eq('id', existingGoal.id);
        if (gErr) throw new Error(gErr.message);

        await supabase.from('student_goal_skills').delete().eq('student_term_goal_id', existingGoal.id);
        const goalSkills = selectedSkills.map((sid, i) => ({
          student_term_goal_id: existingGoal.id, skill_id: sid, order_index: i,
        }));
        const { error: gsErr } = await supabase.from('student_goal_skills').insert(goalSkills);
        if (gsErr) throw new Error(gsErr.message);

        setSuccess('Goal updated!');
      } else {
        const { data: newGoal, error: gErr } = await supabase.from('student_term_goals').insert({
          student_id: profile!.id,
          session_id: session.id,
          term_id: term.id,
          archetype_id: selectedArchetype,
          goal_statement_snapshot: goalStatement,
          status: 'pending',
        }).select().single();
        if (gErr) throw new Error(gErr.message);

        const goalSkills = selectedSkills.map((sid, i) => ({
          student_term_goal_id: newGoal.id, skill_id: sid, order_index: i,
        }));
        const { error: gsErr } = await supabase.from('student_goal_skills').insert(goalSkills);
        if (gsErr) throw new Error(gsErr.message);

        setSuccess('Goal submitted for review!');
      }

      setTimeout(() => loadData(), 500);
    } catch (err: any) {
      setError(err.message || 'Failed to save goal');
    } finally { setSaving(false); }
  }

  const selectedArchObj = archetypes.find(a => a.id === selectedArchetype);
  const recommendedSkills = selectedArchObj
    ? skills.filter(s => selectedSkills.includes(s.id))
    : [];

  const goalStatement = selectedArchetype && selectedSkills.length >= 3
    ? `This term I am growing to become a stronger ${selectedArchObj?.name} by practising ${selectedSkills.map(id => skills.find(s => s.id === id)?.name).join(', ')}.`
    : null;

  if (loading) {
    return (
      <DashboardLayout title="My Growth Path" subtitle="Set your term goal">
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Growth Path" subtitle="Who I'm becoming this term">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Growth Path</h1>
            <p className="text-slate-500 mt-1">{existingGoal ? 'Update your term goal' : 'Set your term goal'}</p>
          </div>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm flex items-center gap-2"><Check size={16} /> {success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}

        {existingGoal?.status === 'active' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm">
            Your goal has been approved by your teacher. You can still update it below.
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">1. Choose Your Identity</h2>
          <p className="text-sm text-slate-500 mb-4">Select the archetype that best describes who you want to become this term.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {archetypes.map((arch) => (
              <button key={arch.id} onClick={() => setSelectedArchetype(arch.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${selectedArchetype === arch.id ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                {selectedArchetype === arch.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center"><Check size={14} className="text-white" /></div>
                )}
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-2">
                  <Target className="text-primary-600" size={20} />
                </div>
                <h3 className="font-semibold text-slate-900">{arch.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{arch.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">2. Choose Your Skills ({selectedSkills.length}/5)</h2>
          <p className="text-sm text-slate-500 mb-4">Select 3–5 skills you want to develop this term.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {skills.map((skill) => {
              const isSelected = selectedSkills.includes(skill.id);
              const isMaxed = selectedSkills.length >= 5 && !isSelected;
              return (
                <button key={skill.id} onClick={() => toggleSkill(skill.id)} disabled={isMaxed && !isSelected}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'border-primary-500 bg-primary-50' : isMaxed ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary-600 border-primary-600' : 'border-slate-300'}`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{skill.name}</p>
                    <p className="text-xs text-slate-500 truncate">{skill.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {goalStatement && (
          <div className="card bg-gradient-to-br from-primary-50 to-amber-50 border-primary-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-primary-600" />
              <h3 className="font-semibold text-primary-800">Your Growth Goal</h3>
            </div>
            <p className="text-primary-700 italic">{goalStatement}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/student/portfolio" className="btn-ghost">View Portfolio</Link>
          <button onClick={handleSubmit} disabled={saving || !selectedArchetype || selectedSkills.length < 3} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : (existingGoal ? 'Update Goal' : 'Submit Goal')}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
