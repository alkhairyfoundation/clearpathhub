'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, BookOpen, Brain, Target, CheckCircle, Lock, 
  ChevronRight, Loader2, Award, AlertCircle, Clock, BookMarked,
  FileText, Video, PlayCircle, RefreshCw, RotateCcw
} from 'lucide-react';
import { getMasteryColor, getScoreColorClasses } from '@/lib/colors';

const STAGES = [
  { key: 'lesson', label: 'Lesson', description: 'Study the content', icon: BookOpen, color: 'blue' },
  { key: 'practice', label: 'Practice', description: 'Practice concepts', icon: Brain, color: 'amber' },
  { key: 'challenge', label: 'Challenge', description: 'Solve graded exercises', icon: Target, color: 'orange' },
  { key: 'mastery_verification', label: 'Mastery Verification', description: 'Validate understanding', icon: Award, color: 'purple' },
  { key: 'advancement', label: 'Advancement', description: 'Unlock next topic', icon: CheckCircle, color: 'emerald' },
] as const;

export default function TopicLearningPathPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const subjectId = params.subject as string;
  const topicName = decodeURIComponent(params.topic as string);

  const [subject, setSubject] = useState<any>(null);
  const [pathStages, setPathStages] = useState<any[]>([]);
  const [masteryScore, setMasteryScore] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile, subjectId, topicName]);

  async function fetchData() {
    setLoading(true);
    try {
      const [subjRes, pathRes, scoreRes, lessonsRes] = await Promise.all([
        supabase.from('subjects').select('*, class:classes!class_id(name)').eq('id', subjectId).single(),
        supabase.from('mastery_learning_path').select('*').eq('student_id', profile?.id).eq('subject_id', subjectId).eq('topic', topicName).order('stage'),
        supabase.from('mastery_scores').select('*').eq('student_id', profile?.id).eq('subject_id', subjectId).eq('topic', topicName).maybeSingle(),
        supabase.from('lessons').select('*').eq('subject_id', subjectId).eq('topic', topicName).eq('is_published', true),
      ]);

      if (subjRes.data) setSubject(subjRes.data);
      if (scoreRes.data) setMasteryScore(scoreRes.data);
      if (lessonsRes.data) setLessons(lessonsRes.data);

      if (!pathRes.data || pathRes.data.length === 0) {
        setInitializing(true);
        const stages = STAGES.map((s, i) => ({
          student_id: profile?.id,
          subject_id: subjectId,
          topic: topicName,
          stage: s.key,
          is_unlocked: i === 0,
          max_attempts: 3,
        }));
        const { data: newPaths } = await supabase.from('mastery_learning_path').insert(stages).select();
        if (newPaths) setPathStages(newPaths);
        setInitializing(false);
      } else {
        setPathStages(pathRes.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleCompleteStage(stageKey: string, score?: number) {
    const updated = pathStages.map(s => {
      if (s.stage === stageKey) {
        const newStage = {
          ...s,
          is_completed: true,
          completed_at: new Date().toISOString(),
          attempts_count: (s.attempts_count || 0) + 1,
          score_on_completion: score || s.score_on_completion,
        };

        if (score && score >= 80) {
          const stageIdx = STAGES.findIndex(st => st.key === stageKey);
          if (stageIdx >= 0 && stageIdx < STAGES.length - 1) {
            const nextStageKey = STAGES[stageIdx + 1].key;
            return pathStages.map(ps => ps.stage === nextStageKey ? { ...ps, is_unlocked: true } : ps.stage === stageKey ? newStage : ps);
          }
        } else if (score && score < 80) {
          newStage.teacher_intervention_required = newStage.attempts_count >= newStage.max_attempts;
        }

        return newStage;
      }
      return s;
    });

    const flattened = Array.isArray(updated[0]) ? updated.flat() : updated;

    try {
      for (const s of flattened) {
        await supabase.from('mastery_learning_path').upsert({
          id: s.id,
          student_id: s.student_id,
          subject_id: s.subject_id,
          topic: s.topic,
          stage: s.stage,
          is_unlocked: s.is_unlocked,
          is_completed: s.is_completed,
          completed_at: s.completed_at,
          attempts_count: s.attempts_count,
          score_on_completion: s.score_on_completion,
          teacher_intervention_required: s.teacher_intervention_required,
        }, { onConflict: 'student_id, subject_id, topic, stage' });
      }
      setPathStages(flattened);
    } catch (err) {
      console.error('Failed to update stages:', err);
    }
  }

  function getStageColor(stageKey: string): string {
    const stage = pathStages.find(s => s.stage === stageKey);
    if (!stage) return 'slate';
    if (stage.is_completed) return 'emerald';
    if (stage.teacher_intervention_required) return 'red';
    if (stage.is_unlocked) return 'amber';
    return 'slate';
  }

  function getStageIcon(stageKey: string, color: string) {
    const stage = pathStages.find(s => s.stage === stageKey);
    if (stage?.is_completed) return <CheckCircle size={24} className={`text-${color}-500`} />;
    if (stage?.teacher_intervention_required) return <AlertCircle size={24} className="text-red-500" />;
    if (!stage?.is_unlocked) return <Lock size={24} className="text-slate-300" />;
    const StageIcon = STAGES.find(s => s.key === stageKey)?.icon || Lock;
    return <StageIcon size={24} className={`text-${color}-500`} />;
  }

  if (loading || initializing) {
    return (
      <DashboardLayout title="Loading..." subtitle={topicName}>
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={topicName} subtitle={`${subject?.name || 'Subject'} • Learning Path`}>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href={`/student/learning-path/${subjectId}`} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{topicName}</h1>
            <p className="text-slate-500 mt-1">{subject?.name} • {subject?.class?.name}</p>
          </div>
          {masteryScore && (
            <div className="ml-auto">
              <span className={`text-sm font-bold ${getMasteryColor(masteryScore.mastery_score).textColor}`}>
                {Math.round(masteryScore.mastery_score)}% Mastery
              </span>
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {/* Stage Progression Timeline */}
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BookMarked size={18} className="text-primary-600" />
            Mastery Progression
          </h2>

          <div className="space-y-0">
            {STAGES.map((stage, idx) => {
              const stageData = pathStages.find(s => s.stage === stage.key);
              const color = getStageColor(stage.key);
              const isLocked = !stageData?.is_unlocked;
              const isCompleted = stageData?.is_completed;
              const needsIntervention = stageData?.teacher_intervention_required;
              const StageIcon = stage.icon;

              return (
                <div key={stage.key} className="relative flex gap-6 pb-8 last:pb-0">
                  {/* Connection line */}
                  {idx < STAGES.length - 1 && (
                    <div className={`absolute left-[19px] top-10 w-0.5 h-full ${
                      isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                    }`} />
                  )}

                  {/* Stage icon */}
                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted ? 'bg-emerald-100' :
                    needsIntervention ? 'bg-red-100' :
                    isLocked ? 'bg-slate-100' :
                    'bg-amber-100'
                  }`}>
                    {isCompleted ? <CheckCircle size={20} className="text-emerald-600" /> :
                     needsIntervention ? <AlertCircle size={20} className="text-red-600" /> :
                     isLocked ? <Lock size={20} className="text-slate-400" /> :
                     <StageIcon size={20} className="text-amber-600" />}
                  </div>

                  {/* Stage content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-bold text-lg ${isCompleted ? 'text-emerald-700' : isLocked ? 'text-slate-400' : 'text-slate-900'}`}>
                        {stage.label}
                      </h3>
                      {stageData && (
                        <div className="flex items-center gap-2">
                          {stageData.attempts_count > 0 && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <RefreshCw size={12} /> {stageData.attempts_count}
                            </span>
                          )}
                          {stageData.score_on_completion != null && (
                            <span className={`text-sm font-bold ${getMasteryColor(stageData.score_on_completion).textColor}`}>
                              {Math.round(stageData.score_on_completion)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className={`text-sm ${isLocked ? 'text-slate-400' : 'text-slate-500'}`}>{stage.description}</p>

                    {/* Stage actions */}
                    {!isLocked && !isCompleted && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stage.key === 'lesson' && (
                          <>
                            <Link href={`/student/lessons?subject=${subjectId}&topic=${encodeURIComponent(topicName)}`}
                              className="btn-outline text-sm flex items-center gap-1">
                              <FileText size={14} /> View Lesson Notes
                            </Link>
                            <Link href={`/student/sessions?subject=${subjectId}&topic=${encodeURIComponent(topicName)}`}
                              className="btn-outline text-sm flex items-center gap-1">
                              <Video size={14} /> Watch Video
                            </Link>
                          </>
                        )}
                        {(stage.key === 'practice' || stage.key === 'challenge') && (
                          <Link href={`/student/practice?subject=${subjectId}&topic=${encodeURIComponent(topicName)}&mode=${stage.key}`}
                            className="btn-primary text-sm flex items-center gap-1">
                            <PlayCircle size={14} /> Start {stage.label}
                          </Link>
                        )}
                        {stage.key === 'mastery_verification' && (
                          <Link href={`/student/practice?subject=${subjectId}&topic=${encodeURIComponent(topicName)}&mode=mastery_verification`}
                            className="btn-primary text-sm flex items-center gap-1">
                            <Award size={14} /> Take Mastery Test
                          </Link>
                        )}
                        {stage.key === 'advancement' && (
                          <button onClick={() => handleCompleteStage('advancement', 100)}
                            className="btn-primary text-sm flex items-center gap-1">
                            <CheckCircle size={14} /> Complete Topic
                          </button>
                        )}
                      </div>
                    )}

                    {isCompleted && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                        <CheckCircle size={14} />
                        Completed {stageData?.completed_at ? new Date(stageData.completed_at).toLocaleDateString() : ''}
                      </div>
                    )}

                    {needsIntervention && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-red-700">
                          <AlertCircle size={16} />
                          <span className="font-medium">Teacher intervention required</span>
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          You've reached the maximum attempts. Your teacher has been notified.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Available Lessons */}
        {lessons.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-slate-400" />
              Available Lessons
            </h2>
            <div className="space-y-2">
              {lessons.map(lesson => (
                <div key={lesson.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <FileText size={16} className="text-primary-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{lesson.title}</p>
                  </div>
                  <Link href={`/student/lessons/${lesson.id}`} className="text-xs text-primary-600 font-medium hover:underline">
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mastery Score Detail */}
        {masteryScore && (
          <div className="card">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Award size={18} className="text-slate-400" />
              Mastery Score Detail
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Accuracy', value: Math.round(masteryScore.accuracy || 0), weight: '50%' },
                { label: 'Consistency', value: Math.round(masteryScore.consistency || 0), weight: '20%' },
                { label: 'Recency', value: Math.round(masteryScore.recency || 0), weight: '15%' },
                { label: 'Difficulty', value: Math.round(masteryScore.difficulty_progress || 0), weight: '15%' },
              ].map((comp, i) => {
                const color = getScoreColorClasses(comp.value);
                return (
                  <div key={i} className="text-center p-3 bg-slate-50 rounded-lg">
                    <p className="text-xl font-bold text-slate-900">{comp.value}%</p>
                    <p className="text-xs text-slate-500">{comp.label}</p>
                    <p className="text-[10px] text-slate-400">Weight: {comp.weight}</p>
                    <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
                      <div className="h-1 rounded-full" style={{ width: `${comp.value}%`, backgroundColor: color.bar }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              {masteryScore.total_attempts} total attempts • {masteryScore.correct_attempts} correct
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
