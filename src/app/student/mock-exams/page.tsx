'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Clock, Check, X, AlertCircle, ChevronRight, GraduationCap, Award, BookOpen, Loader2, BarChart3, RotateCcw } from 'lucide-react';

export default function StudentMockExamsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: examsData } = await supabase
        .from('mock_exams')
        .select('*')
        .eq('is_published', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setExams(examsData || []);

      if (profile?.id) {
        const { data: attemptsData } = await supabase
          .from('mock_attempts')
          .select('*, exam:mock_exams(*)')
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false });

        setAttempts(attemptsData || []);

        const { data: analyticsData } = await supabase
          .from('mock_analytics')
          .select('*')
          .eq('student_id', profile.id);

        setAnalytics(analyticsData || []);
      }
    } finally {
      setLoading(false);
    }
  }

  function getMasteryColor(level: string) {
    switch (level) {
      case 'MASTERED': return 'text-green-600 dark:text-green-400 dark:text-green-400 bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30';
      case 'PROFICIENT': return 'text-blue-600 dark:text-blue-400 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30';
      case 'EXCELLENT': return 'text-primary-600 dark:text-primary-400 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30';
      case 'GOOD': return 'text-amber-600 dark:text-amber-400 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30';
      default: return 'text-red-600 dark:text-red-400 dark:text-red-400 bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30';
    }
  }

  function getAttemptsForExam(examId: string) {
    return attempts.filter(a => a.exam_id === examId);
  }

  function getAnalyticsForExam(examId: string) {
    return analytics.find(a => a.exam_id === examId);
  }

  function canTakeExam(exam: any, examAttempts: any[]) {
    if (exam.max_attempts === 0) return true;
    return examAttempts.length < exam.max_attempts;
  }

  async function handleStartExam(exam: any) {
    try {
      const res = await fetch('/api/mock-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_attempt', exam_id: exam.id, student_id: profile?.id }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/student/mock-exams/take/${data.attempt.id}`);
      } else {
        alert(data.error || 'Failed to start exam');
      }
    } catch (err) {
      alert('Failed to start exam');
    }
  }

  return (
    <DashboardLayout title="Mock Exams" subtitle="BECE & WAEC Practice Tests">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="card text-center py-16">
            <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-2">No Mock Exams Available</h3>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-6">There are no mock exams available at this time. Please check back later.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {exams.map((exam) => {
              const examAttempts = getAttemptsForExam(exam.id);
              const examAnalytics = getAnalyticsForExam(exam.id);
              const latestAttempt = examAttempts[0];
              const canTake = canTakeExam(exam, examAttempts);

              return (
                <div key={exam.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{exam.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${exam.exam_type === 'JSS3_BECE' ? 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300' : 'bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30 text-purple-700'}`}>
                          {exam.exam_type === 'JSS3_BECE' ? 'JSS3 BECE' : 'SS3 WAEC'}
                        </span>
                      </div>
                      {exam.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2">{exam.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
                        <span className="flex items-center gap-1"><FileText size={14} /> {exam.total_questions} Questions</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {exam.duration_minutes} mins</span>
                        <span className="flex items-center gap-1"><Award size={14} /> Pass: {exam.passing_score}%</span>
                        {exam.max_attempts > 0 && (
                          <span className="flex items-center gap-1"><RotateCcw size={14} /> {examAttempts.length}/{exam.max_attempts} attempts</span>
                        )}
                        {exam.max_attempts === 0 && (
                          <span className="flex items-center gap-1"><RotateCcw size={14} /> Unlimited attempts</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {latestAttempt && latestAttempt.score !== null && (
                    <div className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Latest Score</p>
                          <p className={`text-2xl font-bold ${latestAttempt.score >= exam.passing_score ? 'text-green-600 dark:text-green-400 dark:text-green-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>
                            {latestAttempt.score}%
                          </p>
                          {latestAttempt.mastery_level && (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${getMasteryColor(latestAttempt.mastery_level)}`}>
                              {latestAttempt.mastery_level}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {examAnalytics && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2">
                              <p>Best: <span className="font-bold text-green-600 dark:text-green-400 dark:text-green-400">{examAnalytics.best_score}%</span></p>
                              <p>Avg: <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{examAnalytics.average_score}%</span></p>
                            </div>
                          )}
                          <Link
                            href={`/student/mock-exams/report/${latestAttempt.id}`}
                            className="btn-outline text-sm flex items-center gap-2"
                          >
                            <BarChart3 size={14} /> View Full Report
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700">
                    <div className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500">
                      {examAttempts.length > 0 ? (
                        <span>{examAttempts.length} attempt{examAttempts.length !== 1 ? 's' : ''} made</span>
                      ) : (
                        <span>No attempts yet</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {examAttempts.filter(a => a.score !== null).slice(0, 3).map((att) => (
                        <Link
                          key={att.id}
                          href={`/student/mock-exams/report/${att.id}`}
                          className="text-xs text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:text-primary-800 dark:text-primary-200 dark:text-primary-200 underline"
                        >
                          Attempt {att.attempt_number}: {att.score}%
                        </Link>
                      ))}
                      {canTake && (
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="btn-primary flex items-center gap-2 text-sm"
                        >
                          Take Exam <ChevronRight size={16} />
                        </button>
                      )}
                      {!canTake && (
                        <span className="text-xs text-red-500 dark:text-red-400 dark:text-red-400 flex items-center">Max attempts reached</span>
                      )}
                    </div>
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
