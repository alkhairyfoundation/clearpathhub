'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import GoalVisualizer from '@/components/GoalVisualizer';
import { ArrowLeft, BarChart3, Target, CheckCircle, Clock, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';
import type { GoalHierarchy } from '@/types';
import { getGoalStatusColor, getGoalStatusBg } from '@/lib/colors';

export default function MonthlyGoalsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<GoalHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchGoals();
  }, [profile]);

  async function fetchGoals() {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data } = await supabase
        .from('goal_hierarchy')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('period_type', 'monthly')
        .gte('period_start', monthStart)
        .lte('period_end', monthEnd)
        .order('dimension')
        .order('created_at');

      if (data) setGoals(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const dimensionMeta = [
    { key: 'academic', label: 'Academic', color: 'text-blue-600 dark:text-blue-400 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20' },
    { key: 'islamic', label: 'Islamic Character', color: 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20' },
    { key: 'skills', label: 'Life Skills', color: 'text-purple-600 dark:text-purple-400 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 dark:bg-purple-900/20' },
  ];

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.status === 'completed').length,
    inProgress: goals.filter(g => g.status === 'in_progress' || g.status === 'active').length,
    progress: goals.length > 0 ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100) : 0,
  };

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <DashboardLayout title="Monthly Goals" subtitle={monthName}>
        <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Monthly Goals" subtitle={monthName}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Monthly Goals</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Generated from your weekly achievements</p>
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card"><div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Total Goals</div><p className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">{stats.total}</p></div>
          <div className="card"><div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><CheckCircle size={14} className="text-emerald-500" /> Completed</div><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">{stats.completed}</p></div>
          <div className="card"><div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><Clock size={14} className="text-amber-500 dark:text-amber-400 dark:text-amber-400" /> In Progress</div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{stats.inProgress}</p></div>
          <div className="card">
            <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">Monthly Progress</div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{stats.progress}%</p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
              <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${stats.progress}%` }} />
            </div>
          </div>
        </div>

        <GoalVisualizer goals={goals} studentId={profile?.id || ''} compact />

        {goals.length === 0 ? (
          <div className="card text-center py-12">
            <BarChart3 className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No monthly goals yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">Monthly goals are generated from weekly achievements</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dimensionMeta.map(dim => {
              const dimGoals = goals.filter(g => g.dimension === dim.key);
              if (dimGoals.length === 0) return null;
              return (
                <div key={dim.key} className="card">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dim.color}`}>
                      <TrendingUp size={16} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white dark:text-white">{dim.label}</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 ml-auto">{dimGoals.filter(g => g.status === 'completed').length}/{dimGoals.length}</span>
                  </div>
                  <div className="space-y-2">
                    {dimGoals.map(goal => (
                      <div key={goal.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200 truncate">{goal.goal_text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getGoalStatusBg(goal.status)} ${getGoalStatusColor(goal.status)}`}>
                              {goal.status.replace('_', ' ')}
                            </span>
                            {goal.target_value != null && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{goal.achieved_value ?? 0}/{goal.target_value}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
