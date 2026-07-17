'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, BookOpen, Brain, Target, CheckCircle, Lock, ChevronRight, Loader2, Award, AlertCircle } from 'lucide-react';
import { getMasteryColor } from '@/lib/colors';

export default function LearningPathPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [masteryPaths, setMasteryPaths] = useState<any[]>([]);
  const [masteryScores, setMasteryScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: student } = await supabase.from('students').select('class_id').eq('profile_id', profile?.id).maybeSingle();

      let subjQuery = supabase.from('subjects').select('*, class:classes!class_id(name)').order('name');
      if (student?.class_id) {
        subjQuery = subjQuery.eq('class_id', student.class_id);
      }
      const [subjRes, pathRes, scoreRes] = await Promise.all([
        subjQuery,
        fetch(`/api/mastery/path?studentId=${profile?.id}`).then(r => r.json()),
        fetch(`/api/mastery/scores?studentId=${profile?.id}`).then(r => r.json()),
      ]);

      if (subjRes.data) setSubjects(subjRes.data);
      if (pathRes.path) setMasteryPaths(pathRes.path);
      if (scoreRes.scores) setMasteryScores(scoreRes.scores);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  function getSubjectAggregate(subjectId: string) {
    const subjectPaths = masteryPaths.filter(p => p.subject_id === subjectId);
    const subjectScores = masteryScores.filter(s => s.subject_id === subjectId);
    const topics = [...new Set(subjectPaths.map(p => p.topic))];
    const completedTopics = [...new Set(subjectPaths.filter(p => p.stage === 'advancement' && p.is_completed).map(p => p.topic))];
    const avgScore = subjectScores.length > 0 ? Math.round(subjectScores.reduce((sum: number, s: any) => sum + s.mastery_score, 0) / subjectScores.length) : 0;
    return { topics: topics.length, completed: completedTopics.length, avgScore, paths: subjectPaths };
  }

  const STAGE_ICONS: Record<string, React.ReactNode> = {
    lesson: <BookOpen size={14} />,
    practice: <Brain size={14} />,
    challenge: <Target size={14} />,
    mastery_verification: <Award size={14} />,
    advancement: <CheckCircle size={14} />,
  };

  const STAGE_LABELS: Record<string, string> = {
    lesson: 'Lesson',
    practice: 'Practice',
    challenge: 'Challenge',
    mastery_verification: 'Mastery',
    advancement: 'Advance',
  };

  if (loading) {
    return (
      <DashboardLayout title="Learning Path" subtitle="Master each topic step by step">
        <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Learning Path" subtitle="Master each topic step by step">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Learning Path</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Study → Practice → Challenge → Master → Advance</p>
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

        {subjects.length === 0 && !loading && (
          <div className="card text-center py-16">
            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No subjects available</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">Subjects will appear once assigned to your class</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {subjects.map(subj => {
            const agg = getSubjectAggregate(subj.id);
            const color = getMasteryColor(agg.avgScore);

            return (
              <div key={subj.id} className="card overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30">
                          <BookOpen size={20} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white dark:text-white">{subj.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{subj.code} • {subj.class?.name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${color.textColor}`}>{agg.avgScore}%</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">Mastery</p>
                    </div>
                  </div>

                  {agg.paths.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2">
                        <span>Topics: {agg.completed}/{agg.topics} mastered</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mb-3">
                        <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${agg.topics > 0 ? (agg.completed / agg.topics) * 100 : 0}%` }} />
                      </div>

                      {/* Stage progress for this subject */}
                      <div className="flex items-center gap-2 mb-3">
                        {(['lesson', 'practice', 'challenge', 'mastery_verification', 'advancement'] as const).map((stage, i) => {
                          const stageItems = agg.paths.filter(p => p.stage === stage);
                          const completedCount = stageItems.filter(p => p.is_completed).length;
                          const hasIntervention = stageItems.some(p => p.teacher_intervention_required);
                          return (
                            <div key={stage} className="flex items-center gap-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                completedCount === stageItems.length && stageItems.length > 0
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300'
                                  : hasIntervention
                                    ? 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400'
                                    : stageItems.some(p => p.is_unlocked)
                                      ? 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300'
                                      : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-400 dark:text-slate-500 dark:text-slate-500'
                              }`}>
                                {completedCount === stageItems.length && stageItems.length > 0 ? <CheckCircle size={12} /> : STAGE_ICONS[stage]}
                              </div>
                              {i < 4 && <div className="w-3 h-0.5 bg-slate-200" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700">
                    <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">
                      {agg.paths.length > 0 ? `${agg.paths.filter(p => p.is_unlocked).length} stages unlocked` : 'No topics yet'}
                    </span>
                    <Link
                      href={`/student/learning-path/${subj.id}`}
                      className="text-sm text-primary-600 dark:text-primary-400 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline"
                    >
                      View Topics <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
