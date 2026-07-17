'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, BarChart3, PieChart, Users } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { RUBRIC_COLORS, RUBRIC_LABELS } from '@/types';

export default function AdminPortfolioReportsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>({
    archetypeDistribution: [] as { archetype: string; count: number }[],
    topSkills: [] as { skill: string; count: number }[],
    rubricAverages: {} as Record<string, number>,
    totalGoals: 0,
    pendingApprovals: 0,
    activeGoals: 0,
  });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    loadReports();
  }, [profile]);

  async function loadReports() {
    setLoading(true);
    try {
      const [goalRes, rubricRes] = await Promise.all([
        fetch('/api/student-term-goals').then(r => r.json()),
        fetch('/api/portfolio/rubric').then(r => r.json()),
      ]);

      const goals = goalRes.goals || goalRes.goal ? [goalRes.goal] : [];
      const rubrics = rubricRes.rubrics || [];

      const levelOrder = ['emerging', 'developing', 'secure', 'strong'];
      const archDist: Record<string, number> = {};
      goals.forEach((g: any) => {
        const name = g.archetype?.name || 'Unknown';
        archDist[name] = (archDist[name] || 0) + 1;
      });

      const skillCount: Record<string, number> = {};
      rubrics.forEach((r: any) => {
        const name = r.skill?.name || 'Unknown';
        skillCount[name] = (skillCount[name] || 0) + 1;
      });

      const rubricBySkill: Record<string, number[]> = {};
      rubrics.forEach((r: any) => {
        const name = r.skill?.name || 'Unknown';
        if (!rubricBySkill[name]) rubricBySkill[name] = [];
        rubricBySkill[name].push(levelOrder.indexOf(r.level) + 1);
      });

      const rubricAverages: Record<string, number> = {};
      Object.entries(rubricBySkill).forEach(([skill, levels]) => {
        rubricAverages[skill] = Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 100) / 100;
      });

      setReportData({
        archetypeDistribution: Object.entries(archDist).map(([archetype, count]) => ({ archetype, count })),
        topSkills: Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([skill, count]) => ({ skill, count })),
        rubricAverages,
        totalGoals: goals.length,
        pendingApprovals: goals.filter((g: any) => g.status === 'pending').length,
        activeGoals: goals.filter((g: any) => g.status === 'active').length,
      });
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }

  const { archetypeDistribution, topSkills, rubricAverages, totalGoals, pendingApprovals, activeGoals } = reportData;
  const maxArch = Math.max(...archetypeDistribution.map((a: any) => a.count), 1);
  const maxSkills = Math.max(...topSkills.map((s: any) => s.count), 1);

  return (
    <DashboardLayout title="Portfolio Reports" subtitle="Class-level portfolio analytics and progress distribution">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Portfolio Reports</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Aggregate view of student growth portfolio data</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" />
          </div>
        ) : totalGoals === 0 ? (
          <div className="card text-center py-16">
            <BarChart3 className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No portfolio data yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">Reports will appear once students set up their growth goals</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{totalGoals}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Total Goals</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{pendingApprovals}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Pending Approval</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">{activeGoals}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Active Goals</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><PieChart size={18} /> Archetype Distribution</h3>
                <div className="space-y-2">
                  {archetypeDistribution.map((a: any) => (
                    <div key={a.archetype}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300 dark:text-slate-300">{a.archetype}</span>
                        <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400">{a.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${(a.count / maxArch) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><BarChart3 size={18} /> Most Selected Skills</h3>
                <div className="space-y-2">
                  {topSkills.map((s: any) => (
                    <div key={s.skill}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300 dark:text-slate-300">{s.skill}</span>
                        <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400">{s.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full h-2">
                        <div className="bg-secondary-500 h-2 rounded-full transition-all" style={{ width: `${(s.count / maxSkills) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {Object.keys(rubricAverages).length > 0 && (
              <div className="card">
                <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><Users size={18} /> Average Rubric Levels by Skill</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.entries(rubricAverages) as [string, number][]).map(([skill, avg]) => {
                    const levelKey = avg <= 1.5 ? 'emerging' : avg <= 2.5 ? 'developing' : avg <= 3.5 ? 'secure' : 'strong';
                    return (
                      <div key={skill} className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg p-4">
                        <p className="font-medium text-slate-900 dark:text-white dark:text-white text-sm">{skill}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`w-2 h-2 rounded-full ${RUBRIC_COLORS[levelKey as keyof typeof RUBRIC_COLORS] || 'bg-slate-400'}`} />
                          <span className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">Avg: {avg.toFixed(1)} / 4</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">({RUBRIC_LABELS[levelKey as keyof typeof RUBRIC_LABELS] || levelKey})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
