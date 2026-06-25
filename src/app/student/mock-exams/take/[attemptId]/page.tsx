'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Clock, AlertTriangle, Check, ChevronRight, ChevronLeft, Flag, Loader2, ArrowLeft, FileText } from 'lucide-react';
import Calculator from '@/components/Calculator';

function gradeQuestion(question: any, answer: any): boolean {
  if (answer === undefined || answer === null) return false;
  switch (question.question_type) {
    case 'multiple_choice':
    case 'MCQ':
      return answer === question.correct_answer;
    case 'true_false':
    case 'TRUE_FALSE':
      return answer === question.correct_answer;
    case 'fill_blank':
    case 'FILL_IN_THE_GAP': {
      const correct = question.options?.[question.correct_answer];
      if (!correct) return false;
      return answer.toString().toLowerCase().trim() === correct.toString().toLowerCase().trim();
    }
    case 'multiple_selection': {
      const a = Array.isArray(answer) ? [...answer].sort() : [];
      const c = Array.isArray(question.correct_answer) ? [...question.correct_answer].sort() : [];
      return JSON.stringify(a) === JSON.stringify(c);
    }
    default:
      return answer === question.correct_answer;
  }
}

export default function StudentTakeMockExamPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const attemptId = params?.attemptId as string;

  const [attempt, setAttempt] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchExam();
  }, [profile, attemptId]);

  useEffect(() => {
    if (!started || timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { handleSubmit(); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [started, submitted, timeLeft]);

  useEffect(() => {
    if (!started || submitted || !exam) return;
    function handleVisibility() {
      if (document.hidden) {
        setTabSwitches(prev => {
          const next = prev + 1;
          setSecurityEvents(events => [...events, { type: 'tab_switch', time: new Date().toISOString(), count: next }]);
          if (exam?.prevent_tab_switch && next >= (exam?.max_tab_switches || 3)) {
            handleSubmit();
          }
          return next;
        });
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [started, submitted, exam]);

  useEffect(() => {
    if (!started || submitted || !exam?.require_fullscreen) return;
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setSecurityEvents(events => [...events, { type: 'fullscreen_exit', time: new Date().toISOString() }]);
        setFullscreenBlocked(true);
      } else {
        setFullscreenBlocked(false);
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [started, submitted, exam]);

  useEffect(() => {
    if (!started || fullscreenBlocked) return;
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 's' || e.key === 'u')) {
        e.preventDefault();
        setSecurityEvents(events => [...events, { type: 'keyboard_shortcut', key: e.key, time: new Date().toISOString() }]);
      }
    }
    function handleContextMenu(e: MouseEvent) { e.preventDefault(); }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [started, fullscreenBlocked]);

  async function fetchExam() {
    setLoading(true);
    try {
      const { data: attemptData } = await supabase
        .from('mock_attempts')
        .select('*, exam:mock_exams(*)')
        .eq('id', attemptId)
        .single();

      if (!attemptData) { setLoading(false); return; }

      setAttempt(attemptData);
      setExam(attemptData.exam);

      if (attemptData.completed_at) {
        setSubmitted(true);
        setScore(attemptData.score);
        setLoading(false);
        return;
      }

      const { data: questionsData } = await supabase
        .from('mock_questions')
        .select('*')
        .eq('exam_id', attemptData.exam_id);

      let qs = questionsData || [];
      if (attemptData.exam?.shuffle_questions) {
        qs = qs.sort(() => Math.random() - 0.5);
      }
      if (attemptData.exam?.total_questions && qs.length > attemptData.exam.total_questions) {
        qs = qs.slice(0, attemptData.exam.total_questions);
      }
      setQuestions(qs);
      setTimeLeft((attemptData.exam?.duration_minutes || 120) * 60);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  function startExam() {
    setStarted(true);
    if (exam?.require_fullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  function toggleFlag(index: number) {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  function selectAnswer(index: number, value: any) {
    setAnswers(prev => ({ ...prev, [index]: value }));
  }

  async function handleSubmit() {
    if (submitting || submitted) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      if (exam?.require_fullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      const gradedAnswers = questions.map((q, i) => {
        const userAnswer = answers[i];
        const isCorrect = gradeQuestion(q, userAnswer);
        return {
          question_index: i,
          question: q.question,
          question_type: q.question_type,
          subject: q.subject,
          difficulty_level: q.difficulty_level,
          topic: q.topic,
          correct_answer: q.correct_answer,
          given_answer: userAnswer,
          is_correct: isCorrect,
          points: q.points || 1,
          options: q.options,
          explanation: q.explanation,
        };
      });

      const res = await fetch('/api/mock-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_attempt',
          attempt_id: attemptId,
          answers: gradedAnswers,
          security_events: securityEvents,
          time_taken_seconds: (exam?.duration_minutes || 120) * 60 - timeLeft,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setScore(data.score);
        setSubmitted(true);
      } else {
        setSubmitError(data.error || 'Failed to submit');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRejoinFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {});
    setFullscreenBlocked(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Attempt Not Found</h2>
          <button onClick={() => router.push('/student/mock-exams')} className="btn-primary mt-4">Back to Exams</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="card max-w-md w-full text-center p-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${(score || 0) >= (exam?.passing_score || 50) ? 'bg-green-100' : 'bg-red-100'}`}>
            {(score || 0) >= (exam?.passing_score || 50) ? <Check size={40} className="text-green-600" /> : <AlertTriangle size={40} className="text-red-600" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Exam Submitted!</h2>
          <p className="text-5xl font-bold mb-2">{(score || 0)}%</p>
          <p className="text-slate-500 mb-6">Your score has been recorded.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push(`/student/mock-exams/report/${attemptId}`)} className="btn-primary flex items-center gap-2">
              <FileText size={16} /> View Report
            </button>
            <button onClick={() => router.push('/student/mock-exams')} className="btn-outline">Back to Exams</button>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="card max-w-2xl w-full p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{exam?.title}</h1>
          {exam?.description && <p className="text-slate-600 mb-6">{exam.description}</p>}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-500">Questions</p>
              <p className="text-xl font-bold">{questions.length}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-500">Duration</p>
              <p className="text-xl font-bold">{exam?.duration_minutes} minutes</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-500">Passing Score</p>
              <p className="text-xl font-bold">{exam?.passing_score}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-500">Attempt</p>
              <p className="text-xl font-bold">#{attempt?.attempt_number}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-2"><AlertTriangle size={16} /> Exam Rules</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Do not switch tabs or leave this page during the exam.</li>
              <li>• Do not use the back button or refresh the page.</li>
              <li>• You can flag questions and review them before submitting.</li>
              <li>• The exam will auto-submit when time expires.</li>
              <li>• Your answers are auto-saved as you progress.</li>
            </ul>
          </div>
          <button onClick={startExam} className="btn-primary w-full py-3 text-lg">
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentQ];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="min-h-screen bg-slate-50">
      {fullscreenBlocked && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 max-w-md text-center">
            <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Fullscreen Required</h2>
            <p className="text-slate-600 mb-4">You exited fullscreen mode. Please re-enter fullscreen to continue the exam.</p>
            <button onClick={handleRejoinFullscreen} className="btn-primary">Re-enter Fullscreen</button>
          </div>
        </div>
      )}

      {submitError && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg z-50">
          {submitError}
        </div>
      )}

      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-slate-800">{exam?.title}</h1>
            <span className="text-xs text-slate-500">Question {currentQ + 1} of {totalQuestions}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1 text-sm font-bold ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-slate-600'}`}>
              <Clock size={16} />
              {hours > 0 && <span>{hours}h </span>}
              <span>{minutes.toString().padStart(2, '0')}m {seconds.toString().padStart(2, '0')}s</span>
            </div>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm px-4">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit'}
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-2">
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div className="bg-primary-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              {question && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                      {question.subject} • {question.difficulty_level} • {question.topic}
                    </span>
                    <button
                      onClick={() => toggleFlag(currentQ)}
                      className={`p-1.5 rounded-lg ${flagged.has(currentQ) ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      <Flag size={18} />
                    </button>
                  </div>

                  <p className="text-lg font-medium text-slate-900 mb-6">{question.question}</p>

                  <div className="space-y-3">
                    {question.options?.map((opt: string, optIndex: number) => {
                      const isSelected = answers[currentQ] === optIndex;
                      return (
                        <button
                          key={optIndex}
                          onClick={() => selectAnswer(currentQ, optIndex)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="font-semibold">{String.fromCharCode(65 + optIndex)}.</span> {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-48 shrink-0">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Progress</h3>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((_, i) => {
                  const isAnswered = answers[i] !== undefined;
                  const isFlagged = flagged.has(i);
                  const isCurrent = i === currentQ;
                  let cls = 'w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center ';
                  if (isCurrent) cls += 'ring-2 ring-primary-500 ';
                  if (isAnswered && isFlagged) cls += 'bg-amber-400 text-white';
                  else if (isAnswered) cls += 'bg-primary-600 text-white';
                  else if (isFlagged) cls += 'border-2 border-amber-400 text-amber-600';
                  else cls += 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                  return (
                    <button key={i} onClick={() => setCurrentQ(i)} className={cls}>
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                  disabled={currentQ === 0}
                  className="btn-outline text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-slate-500">{answeredCount}/{totalQuestions}</span>
                <button
                  onClick={() => setCurrentQ(Math.min(totalQuestions - 1, currentQ + 1))}
                  disabled={currentQ === totalQuestions - 1}
                  className="btn-outline text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded bg-primary-600 inline-block" /> Answered
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="w-2.5 h-2.5 rounded border-2 border-amber-400 inline-block" /> Flagged
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
