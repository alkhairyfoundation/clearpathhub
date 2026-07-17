'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Brain, TrendingUp, ArrowLeft, ChevronDown, ChevronRight, BarChart3, Target, Clock, Layers, Award, RefreshCw, Loader2 } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  mastered: 'bg-emerald-500',
  good_progress: 'bg-blue-500',
  developing: 'bg-amber-500',
  needs_support: 'bg-red-500',
};

const LEVEL_BG: Record<string, string> = {
  mastered: 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300',
  good_progress: 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300',
  developing: 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300',
  needs_support: 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400',
};

const LEVEL_LABELS: Record<string, string> = {
  mastered: 'Mastered',
  good_progress: 'Good Progress',
  developing: 'Developing',
  needs_support: 'Needs Support',
};

export default function StudentMasteryPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [scores, setScores] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [scoresRes, subjectsRes] = await Promise.all([
      fetch(`/api/mastery/scores?studentId=${profile?.id}&withSubject=true`).then(r => r.json()),
      supabase.from('subjects').select('*, class:classes!class_id(name)').order('name'),
    ]);
    if (scoresRes.scores) setScores(scoresRes.scores);
    if (!subjectsRes.error && subjectsRes.data) setSubjects(subjectsRes.data);
    setLoading(false);
  }

  async function recalculate() {
    setRecalculating(true);
    try {
      await fetch('/api/mastery/recalc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: profile?.id }),
      });
      await fetchData();
    } catch (err) { /* ignore */ }
    setRecalculating(false);
  }

  // Group by subject
  const subjectScores = subjects.map(subj => {
    const topicScores = scores.filter(s => s.subject_id === subj.id);
    const avg = topicScores.length > 0
      ? Math.round(topicScores.reduce((sum: number, s: any) => sum + s.mastery_score, 0) / topicScores.length)
      : 0;
    return { ...subj, topicScores, avgMastery: avg, topicCount: topicScores.length };
  }).filter(s => s.topicCount > 0);

  const overallAvg = subjectScores.length > 0
    ? Math.round(subjectScores.reduce((sum: number, s: any) => sum + s.avgMastery, 0) / subjectScores.length)
    : 0;

  function getOverallLevel(avg: number) {
    if (avg >= 80) return { label: 'Mastered', color: 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30' };
    if (avg >= 60) return { label: 'Good Progress', color: 'text-blue-600 dark:text-blue-400 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30' };
    if (avg >= 40) return { label: 'Developing', color: 'text-amber-600 dark:text-amber-400 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30' };
    return { label: 'Needs Support', color: 'text-red-600 dark:text-red-400 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30' };
  }

  const overallLevel = getOverallLevel(overallAvg);

  return (
    <DashboardLayout title="Mastery Dashboard" subtitle="Track your learning progress topic by topic">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Mastery Dashboard</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Track your learning progress topic by topic</p>
            </div>
          </div>
          <button onClick={recalculate} disabled={recalculating}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
            Recalculate
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : subjectScores.length === 0 ? (
          <div className="card text-center py-16">
            <Brain className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No mastery data yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1 mb-4">Complete practice sessions to build your mastery scores</p>
            <Link href="/student/practice" className="btn-primary">Start Practicing</Link>
          </div>
        ) : (
          <>
            {/* Overall Mastery */}
            <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><Award size={20} /> Overall Mastery</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium bg-white/20`}>{overallLevel.label}</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold">{overallAvg}%</span>
                <span className="text-white/70">average across {subjectScores.length} subjects</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2.5">
                <div className="bg-white h-2.5 rounded-full transition-all" style={{ width: `${overallAvg}%` }} />
              </div>
            </div>

            {/* Subject Breakdown */}
            {subjectScores.map(subj => {
              const isExpanded = expandedSubject === subj.id;
              const level = getOverallLevel(subj.avgMastery);
              return (
                <div key={subj.id} className="card overflow-hidden">
                  <button onClick={() => setExpandedSubject(isExpanded ? null : subj.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${level.bg}`}>
                        <Brain size={20} className={level.color} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white">{subj.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{subj.topicCount} topics • {subj.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-bold text-lg ${level.color}`}>{subj.avgMastery}%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{level.label}</p>
                      </div>
                      {isExpanded ? <ChevronDown size={20} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" /> : <ChevronRight size={20} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-700 dark:border-slate-700">
                      {/* Component breakdown chart */}
                      {subj.topicScores.length > 0 && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                          <div className="grid grid-cols-4 gap-3 mb-4">
                            {[
                              { label: 'Accuracy', value: Math.round(subj.topicScores.reduce((s: number, t: any) => s + t.accuracy, 0) / subj.topicScores.length), icon: <Target size={16} />, weight: '50%' },
                              { label: 'Consistency', value: Math.round(subj.topicScores.reduce((s: number, t: any) => s + t.consistency, 0) / subj.topicScores.length), icon: <Layers size={16} />, weight: '20%' },
                              { label: 'Recency', value: Math.round(subj.topicScores.reduce((s: number, t: any) => s + t.recency, 0) / subj.topicScores.length), icon: <Clock size={16} />, weight: '15%' },
                              { label: 'Difficulty', value: Math.round(subj.topicScores.reduce((s: number, t: any) => s + t.difficulty_progress, 0) / subj.topicScores.length), icon: <BarChart3 size={16} />, weight: '15%' },
                            ].map((comp, i) => (
                              <div key={i} className="bg-white rounded-lg p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">{comp.icon} {comp.label}</div>
                                <p className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">{comp.value}%</p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500">Weight: {comp.weight}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Topic list */}
                      <div className="divide-y divide-slate-100">
                        {subj.topicScores.map((ts: any) => (
                          <div key={ts.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">{ts.topic}</p>
                                {ts.subtopic && <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">› {ts.subtopic}</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${LEVEL_BG[ts.level] || 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400'}`}>
                                  {LEVEL_LABELS[ts.level] || ts.level}
                                </span>
                                <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{ts.total_attempts} attempts • {ts.correct_attempts} correct</span>
                              </div>
                            </div>
                            <div className="w-32 ml-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-slate-900 dark:text-white dark:text-white">{Math.round(ts.mastery_score)}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className={`h-2 rounded-full ${LEVEL_COLORS[ts.level] || 'bg-slate-400'}`}
                                  style={{ width: `${ts.mastery_score}%` }} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
