'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Loader2,
  Calendar, Clock, Award
} from 'lucide-react';
import { getAccountabilityColor } from '@/lib/colors';

const COMPONENTS = [
  { key: 'attendance_score', label: 'Attendance', weight: '10%', icon: '📋' },
  { key: 'participation_score', label: 'Participation', weight: '10%', icon: '💬' },
  { key: 'homework_completion_score', label: 'Homework', weight: '15%', icon: '📚' },
  { key: 'study_time_score', label: 'Study Time', weight: '10%', icon: '⏱' },
  { key: 'quran_score', label: 'Quran', weight: '15%', icon: '📖' },
  { key: 'prayer_tracking_score', label: 'Prayer', weight: '10%', icon: '🕌' },
  { key: 'character_score', label: 'Character', weight: '10%', icon: '⭐' },
  { key: 'skill_activity_score', label: 'Skills', weight: '8%', icon: '🎯' },
  { key: 'community_service_score', label: 'Community', weight: '5%', icon: '🤝' },
  { key: 'behavior_score', label: 'Behavior', weight: '10%', icon: '👤' },
];

export default function AccountabilityPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/accountability?student_id=${profile?.id}`);
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <DashboardLayout title="Accountability" subtitle="Daily accountability score">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  const today = data?.today;
  const history = data?.history || [];
  const stats = data?.stats;

  const getTrendIcon = (score: number) => {
    if (score >= 80) return <TrendingUp size={14} className="text-emerald-500" />;
    if (score >= 60) return <Minus size={14} className="text-amber-500 dark:text-amber-400 dark:text-amber-400" />;
    return <TrendingDown size={14} className="text-red-500 dark:text-red-400 dark:text-red-400" />;
  };

  return (
    <DashboardLayout title="Accountability" subtitle="Daily accountability score">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">Daily Accountability</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Track your daily performance across all dimensions</p>
          </div>
        </div>

        {/* Today's Score */}
        <div className={`card ${today ? 'border-2' : ''}`} style={{
          borderColor: today ? getAccountabilityColor(today.total_score).hex : undefined,
        }}>
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Clock size={16} className="text-primary-500" />
            Today's Score
          </h2>
          {today ? (
            <>
              <div className="flex items-center justify-center py-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={getAccountabilityColor(today.total_score).hex}
                      strokeWidth="8" strokeDasharray={`${(today.total_score / 100) * 264} 264`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color: getAccountabilityColor(today.total_score).hex }}>
                      {Math.round(today.total_score)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-4">
                {COMPONENTS.map(comp => {
                  const val = today[comp.key] || 0;
                  return (
                    <div key={comp.key} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg px-2 py-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400">{comp.label}</span>
                      <span className="text-[11px] font-bold" style={{ color: getAccountabilityColor(val).hex }}>
                        {Math.round(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {today.discipline_deductions > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 dark:text-red-400 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} />
                  Discipline deductions: -{Math.round(today.discipline_deductions)} points
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500">
              No accountability data for today yet. Complete your daily activities to see your score.
            </div>
          )}
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="card py-2 px-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Avg Score</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{stats.avg_score || 0}%</p>
            </div>
            <div className="card py-2 px-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Good Days</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">{stats.good_days || 0}</p>
            </div>
            <div className="card py-2 px-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Best</p>
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{Math.round(stats.best_score || 0)}%</p>
            </div>
            <div className="card py-2 px-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Days Tracked</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{stats.total_days || 0}</p>
            </div>
          </div>
        )}

        {/* History */}
        <div className="card">
          <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-primary-500" />
            Recent History
          </h3>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 text-center py-4">No history yet.</p>
          ) : (
            <div className="space-y-1">
              {history.map((day: any) => (
                <div key={day.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(day.total_score)}
                    <span className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-200 rounded-full">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${day.total_score}%`, backgroundColor: getAccountabilityColor(day.total_score).hex }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 w-8 text-right">{Math.round(day.total_score)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="card bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-2 text-sm">Score Legend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
            {[
              { range: '90-100%', label: 'Excellent', color: '#059669' },
              { range: '80-89%', label: 'Good', color: '#16a34a' },
              { range: '70-79%', label: 'Satisfactory', color: '#ca8a04' },
              { range: '60-69%', label: 'Needs Improvement', color: '#ea580c' },
              { range: '< 60%', label: 'At Risk', color: '#dc2626' },
            ].map(l => (
              <div key={l.range} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: l.color }} />
                <span className="text-slate-600 dark:text-slate-400 dark:text-slate-400">{l.range} - {l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
