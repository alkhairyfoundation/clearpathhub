'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import GoalVisualizer from '@/components/GoalVisualizer';
import { ArrowLeft, Calendar, Target, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import type { GoalHierarchy } from '@/types';
import { getGoalStatusColor, getGoalStatusBg } from '@/lib/colors';

export default function WeeklyGoalsPage() {
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
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const { data } = await supabase
        .from('goal_hierarchy')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('period_type', 'weekly')
        .gte('period_start', weekStart.toISOString().split('T')[0])
        .lte('period_end', weekEnd.toISOString().split('T')[0])
        .order('dimension')
        .order('created_at');

      if (data) setGoals(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const dimensionMeta = [
    { key: 'academic', label: 'Academic', color: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20', icon: <Target size={18} className="text-blue-600 dark:text-blue-400 dark:text-blue-400" /> },
    { key: 'islamic', label: 'Islamic Character', color: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20', icon: <Target size={18} className="text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" /> },
    { key: 'skills', label: 'Life Skills', color: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:bg-purple-900/20', icon: <Target size={18} className="text-purple-600 dark:text-purple-400 dark:text-purple-400" /> },
  ];

  const stats = {
    total: goals.length,
    completed: goals.filter(g => g.status === 'completed').length,
    active: goals.filter(g => g.status === 'active' || g.status === 'in_progress').length,
    missed: goals.filter(g => g.status === 'missed').length,
  };

  if (loading) {
    return (
      <DashboardLayout title="Weekly Goals" subtitle="This week's learning targets">
        <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Weekly Goals" subtitle="This week's learning targets">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Weekly Goals</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Derived from your daily achievements</p>
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card"><div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><Target size={16} /> Total Goals</div><p className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">{stats.total}</p></div>
          <div className="card"><div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><CheckCircle size={16} className="text-emerald-500" /> Completed</div><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">{stats.completed}</p></div>
          <div className="card"><div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><Clock size={16} className="text-amber-500 dark:text-amber-400 dark:text-amber-400" /> In Progress</div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{stats.active}</p></div>
          <div className="card"><div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1"><AlertCircle size={16} className="text-red-500 dark:text-red-400 dark:text-red-400" /> Missed</div><p className="text-2xl font-bold text-red-600 dark:text-red-400 dark:text-red-400">{stats.missed}</p></div>
        </div>

        {/* Goal Visualizer */}
        <GoalVisualizer goals={goals} studentId={profile?.id || ''} compact />

        {/* Weekly Goals by Dimension */}
        <div className="space-y-4">
          {dimensionMeta.map(dim => {
            const dimGoals = goals.filter(g => g.dimension === dim.key);
            if (dimGoals.length === 0) return null;
            return (
              <div key={dim.key} className="card overflow-hidden">
                <div className={`border-l-4 ${dim.color} p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    {dim.icon}
                    <h3 className="font-bold text-slate-900 dark:text-white dark:text-white">{dim.label}</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 ml-auto">
                      {dimGoals.filter(g => g.status === 'completed').length}/{dimGoals.length} completed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dimGoals.map(goal => (
                      <div key={goal.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 dark:border-slate-700 dark:border-slate-700">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200 truncate">{goal.goal_text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getGoalStatusBg(goal.status)} ${getGoalStatusColor(goal.status)}`}>
                              {goal.status.replace('_', ' ')}
                            </span>
                            {goal.target_value != null && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">
                                {goal.achieved_value ?? 0} / {goal.target_value} {goal.target_metric || ''}
                              </span>
                            )}
                          </div>
                        </div>
                        {goal.target_value != null && goal.target_value > 0 && (
                          <div className="w-20 ml-3">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.min((goal.achieved_value ?? 0) / goal.target_value * 100, 100)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {goals.length === 0 && (
            <div className="card text-center py-12">
              <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
              <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No weekly goals yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1 mb-4">Complete daily practice to auto-generate weekly goals</p>
              <Link href="/student/practice" className="btn-primary">Start Daily Practice</Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
