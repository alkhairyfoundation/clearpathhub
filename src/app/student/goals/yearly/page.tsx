'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import GoalVisualizer from '@/components/GoalVisualizer';
import { ArrowLeft, TrendingUp, Target, CheckCircle, Loader2, Award, BookOpen } from 'lucide-react';
import type { GoalHierarchy } from '@/types';
import { getMasteryColor } from '@/lib/colors';

export default function YearlyGoalsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<GoalHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTerm, setCurrentTerm] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const [sessionRes, termRes] = await Promise.all([
        supabase.from('academic_sessions').select('*').eq('is_current', true).single(),
        supabase.from('terms').select('*').eq('is_current', true).single(),
      ]);

      const session = sessionRes.data;
      const term = termRes.data;
      setCurrentSession(session);
      setCurrentTerm(term);

      if (session) {
        const { goals: data } = await fetch(`/api/goals/hierarchy?studentId=${profile?.id}&periodType=yearly`).then(r => r.json());
        if (data) setGoals(data);

        if (!data || data.length === 0) {
          const termGoals = await generateYearlyGoals(session, term);
          if (termGoals) setGoals(termGoals);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function generateYearlyGoals(session: any, term: any) {
    try {
      const existingRes = await fetch(`/api/goals/hierarchy?studentId=${profile?.id}&periodType=yearly`).then(r => r.json());
      if (existingRes.goals && existingRes.goals.length > 0) return;

      const dimensions = [
        { key: 'academic', text: `Achieve academic excellence in ${session.name} by completing all term objectives` },
        { key: 'islamic', text: `Strengthen Islamic character and Quran memorization throughout ${session.name}` },
        { key: 'skills', text: `Develop life skills including leadership, communication, and critical thinking in ${session.name}` },
      ];

      const results = [];
      for (const d of dimensions) {
        const res = await fetch('/api/goals/hierarchy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: profile?.id,
            period_type: 'yearly',
            dimension: d.key,
            period_start: session.start_date,
            period_end: session.end_date,
            goal_text: d.text,
            target_metric: 'terms_completed',
            target_value: 3,
          }),
        });
        const data = await res.json();
        if (data.goal) results.push(data.goal);
      }
      return results.length > 0 ? results : null;
    } catch (err) {
      console.error('Failed to generate yearly goals:', err);
      return null;
    }
  }

  const dimensionMeta = [
    { key: 'academic', label: 'Academic Excellence', desc: 'Curriculum mastery, assessments, and comprehension', color: 'border-l-blue-500 bg-blue-50' },
    { key: 'islamic', label: 'Islamic Character', desc: 'Akhlaq, Quran, Salah, discipline and leadership', color: 'border-l-emerald-500 bg-emerald-50' },
    { key: 'skills', label: 'Life Skills', desc: 'Communication, problem-solving, creativity and leadership', color: 'border-l-purple-500 bg-purple-50' },
  ];

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.status === 'completed').length,
    active: goals.filter(g => g.status === 'active' || g.status === 'in_progress').length,
    overallProgress: goals.length > 0 ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100) : 0,
  };

  if (loading) {
    return (
      <DashboardLayout title="Year Goals" subtitle="Your annual learning journey">
        <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  const sessionName = currentSession?.name || 'This Academic Year';

  return (
    <DashboardLayout title="Year Goals" subtitle={sessionName}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Year Goals</h1>
            <p className="text-slate-500 mt-1">Your big picture targets for {sessionName}</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><Award size={20} /> {sessionName}</h2>
            {currentTerm && <span className="px-3 py-1 bg-white/20 rounded-full text-sm">{currentTerm.name}</span>}
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold">{stats.overallProgress}%</span>
            <span className="text-white/70">overall progress</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div className="bg-white h-2.5 rounded-full transition-all" style={{ width: `${stats.overallProgress}%` }} />
          </div>
          <div className="flex gap-4 mt-4 text-sm text-white/80">
            <span>{stats.completed} completed</span>
            <span>{stats.active} active</span>
            <span>{stats.total} total</span>
          </div>
        </div>

        <GoalVisualizer goals={goals} studentId={profile?.id || ''} compact />

        {goals.length === 0 ? (
          <div className="card text-center py-12">
            <TrendingUp className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="font-medium text-slate-500">No yearly goals yet</p>
            <p className="text-sm text-slate-400 mt-1">Yearly goals are auto-generated from your academic session</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dimensionMeta.map(dim => {
              const dimGoal = goals.find(g => g.dimension === dim.key);
              if (!dimGoal) return null;
              const color = getMasteryColor(dimGoal.achieved_value != null && dimGoal.target_value != null ? (dimGoal.achieved_value / dimGoal.target_value) * 100 : null);
              return (
                <div key={dim.key} className={`card border-l-4 ${dim.color} overflow-hidden`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={18} className={dimGoal.status === 'completed' ? 'text-emerald-600' : 'text-primary-600'} />
                        <h3 className="font-bold text-slate-900">{dim.label}</h3>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{dimGoal.goal_text}</p>
                      <p className="text-xs text-slate-400 mt-1">{dim.desc}</p>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className={`text-2xl font-bold ${color.textColor}`}>
                        {dimGoal.achieved_value ?? 0}/{dimGoal.target_value ?? 0}
                      </p>
                      <p className={`text-xs ${color.textColor}`}>{dimGoal.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {dimGoal.target_value != null && dimGoal.target_value > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                      <div
                        className="bg-primary-500 h-2 rounded-full"
                        style={{ width: `${Math.min((dimGoal.achieved_value ?? 0) / dimGoal.target_value * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
