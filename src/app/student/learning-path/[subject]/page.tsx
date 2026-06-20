'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, BookOpen, CheckCircle, Lock, ChevronRight,
  Loader2, Brain, Target, Award, Clock, AlertCircle
} from 'lucide-react';
import { getMasteryColor, getScoreColorClasses } from '@/lib/colors';

export default function SubjectLearningPathPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const subjectId = params.subject as string;

  const [subject, setSubject] = useState<any>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
  const [masteryScores, setMasteryScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile, subjectId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [subjRes, pathRes, scoreRes, sowRes] = await Promise.all([
        supabase.from('subjects').select('*, class:classes!class_id(name)').eq('id', subjectId).single(),
        fetch(`/api/mastery/path?studentId=${profile?.id}&subjectId=${subjectId}`).then(r => r.json()),
        fetch(`/api/mastery/scores?studentId=${profile?.id}&subjectId=${subjectId}`).then(r => r.json()),
        supabase.from('scheme_of_work').select('topic').eq('subject_id', subjectId),
      ]);

      if (subjRes.data) setSubject(subjRes.data);
      if (pathRes.path) setPaths(pathRes.path);
      if (scoreRes.scores) setMasteryScores(scoreRes.scores);

      // Extract unique topics from SOW and existing paths
      const sowTopics = (sowRes.data || []).map((s: any) => s.topic).filter(Boolean);
      const pathTopics = [...new Set((pathRes.path || []).map((p: any) => p.topic))];
      const allTopics = [...new Set([...sowTopics, ...pathTopics])];
      setTopics(allTopics);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  function getTopicProgress(topicName: string) {
    const topicPaths = paths.filter(p => p.topic === topicName);
    const topicScore = masteryScores.find(s => s.topic === topicName);

    const stages = ['lesson', 'practice', 'challenge', 'mastery_verification', 'advancement'];
    const completedStages = topicPaths.filter(p => p.is_completed).length;
    const unlockedStages = topicPaths.filter(p => p.is_unlocked).length;
    const needsIntervention = topicPaths.some(p => p.teacher_intervention_required);
    const isFullyMastered = topicPaths.some(p => p.stage === 'advancement' && p.is_completed);

    return {
      topicPaths,
      score: topicScore?.mastery_score,
      completedStages,
      totalStages: stages.length,
      unlockedStages,
      needsIntervention,
      isFullyMastered,
      isInitialized: topicPaths.length > 0,
    };
  }

  const STAGE_ICONS = [BookOpen, Brain, Target, Award, CheckCircle];

  if (loading) {
    return (
      <DashboardLayout title="Loading..." subtitle="Learning path">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={subject?.name || 'Subject'} subtitle={`${subject?.class?.name || ''} • Learning Path`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student/learning-path" className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{subject?.name}</h1>
            <p className="text-slate-500 mt-1">{subject?.code} • {subject?.class?.name} • {topics.length} topics</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {topics.length === 0 && (
          <div className="card text-center py-16">
            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No topics available</p>
            <p className="text-sm text-slate-400 mt-1">Topics will appear once added to the scheme of work</p>
          </div>
        )}

        <div className="space-y-3">
          {topics.map((topicName, idx) => {
            const progress = getTopicProgress(topicName);
            const color = getMasteryColor(progress.score);

            return (
              <Link
                key={topicName}
                href={`/student/learning-path/${subjectId}/${encodeURIComponent(topicName)}`}
                className="card block hover:shadow-md transition-all overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  {/* Topic number */}
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary-700">{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 truncate">{topicName}</h3>
                      {progress.isFullyMastered && <CheckCircle size={16} className="text-emerald-500 shrink-0" />}
                      {progress.needsIntervention && <AlertCircle size={16} className="text-red-500 shrink-0" />}
                    </div>

                    {/* Stage progress dots */}
                    <div className="flex items-center gap-1 mt-2">
                      {STAGE_ICONS.map((Icon, i) => {
                        const stageNames = ['lesson', 'practice', 'challenge', 'mastery_verification', 'advancement'];
                        const stageData = progress.topicPaths.find(p => p.stage === stageNames[i]);
                        const isCompleted = stageData?.is_completed;
                        const isUnlocked = stageData?.is_unlocked;
                        const needsIntervention = stageData?.teacher_intervention_required;
                        return (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              isCompleted ? 'bg-emerald-100' :
                              needsIntervention ? 'bg-red-100' :
                              isUnlocked ? 'bg-amber-100' :
                              'bg-slate-100'
                            }`}
                          >
                            {isCompleted ? <CheckCircle size={12} className="text-emerald-600" /> :
                             <Icon size={10} className={isUnlocked ? 'text-amber-600' : 'text-slate-400'} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score & arrow */}
                  <div className="text-right shrink-0">
                    {progress.score != null && (
                      <p className={`text-lg font-bold ${color.textColor}`}>{Math.round(progress.score)}%</p>
                    )}
                    <p className="text-xs text-slate-400">{progress.completedStages}/{progress.totalStages} stages</p>
                  </div>

                  <ChevronRight size={20} className="text-slate-300 self-center shrink-0" />
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1 mt-3">
                  <div
                    className="bg-primary-500 h-1 rounded-full transition-all"
                    style={{ width: `${(progress.completedStages / progress.totalStages) * 100}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
