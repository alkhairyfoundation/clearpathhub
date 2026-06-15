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
     case 'short_answer':
       return false;
     default:
       return answer === question.correct_answer;
   }
 }

export default function StudentTakeEntranceExamPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.applicationId as string;
  
  const [application, setApplication] = useState<any>(null);
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
  }, [profile, applicationId]);

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
    const interval = setInterval(() => {
      if (started && !submitted && exam?.require_fullscreen && !document.fullscreenElement) {
        setFullscreenBlocked(true);
      }
    }, 2000);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearInterval(interval);
    };
  }, [started, submitted, exam]);

  // Block F11 key
  useEffect(() => {
    if (!started || submitted) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F11') {
        e.preventDefault();
        setSecurityEvents(events => [...events, { type: 'keyboard_shortcut', key: e.key, time: new Date().toISOString() }]);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [started, submitted]);

  useEffect(() => {
    if (!started || submitted) return;
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        setSecurityEvents(events => [...events, { type: 'keyboard_shortcut', key: e.key, time: new Date().toISOString() }]);
      }
    }
    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();
    }
    function handleCopy(e: ClipboardEvent) { e.preventDefault(); }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
    };
  }, [started, submitted]);

  async function fetchExam() {
    const { data: appData } = await supabase
      .from('entrance_applications')
      .select('*, exam:entrance_exams(*)')
      .eq('id', applicationId)
      .single();

    if (!appData || appData.status !== 'assigned') {
      router.push('/student/entrance-exams');
      return;
    }

    setApplication(appData);
    setExam(appData.exam);
    setTimeLeft((appData.exam?.duration_minutes || 60) * 60);

    const { data: questionsData } = await supabase
      .from('entrance_questions')
      .select('*')
      .eq('exam_id', appData.exam_id)
      .order('order_index', { ascending: true });

    if (questionsData) {
      let qs = questionsData;
      if (appData.exam?.shuffle_questions) {
        qs = [...qs].sort(() => Math.random() - 0.5);
      }
      setQuestions(qs);
    }
    setLoading(false);
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function handleAnswer(questionIndex: number, value: any) {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  }

  function toggleFlag(questionIndex: number) {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(questionIndex)) next.delete(questionIndex); else next.add(questionIndex);
      return next;
    });
  }

  function handleMultipleSelection(qIdx: number, optIdx: number) {
    const current = Array.isArray(answers[qIdx]) ? [...answers[qIdx]] : [];
    const pos = current.indexOf(optIdx);
    if (pos >= 0) current.splice(pos, 1);
    else current.push(optIdx);
    handleAnswer(qIdx, current.sort());
  }

  function getAnsweredCount(): number {
    return questions.filter((_, i) => answers[i] !== undefined && answers[i] !== null && answers[i] !== '').length;
  }

async function handleSubmit() {
     if (!exam || !profile) return;
     setSubmitting(true);
     let correct = 0;
     questions.forEach((q, i) => {
       if (gradeQuestion(q, answers[i])) correct++;
     });
     const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
     
     let masteryLevel: 'POOR' | 'GOOD' | 'EXCELLENT' | 'PROFICIENT' | 'MASTERED';
     if (finalScore >= 90) masteryLevel = 'MASTERED';
     else if (finalScore >= 80) masteryLevel = 'PROFICIENT';
     else if (finalScore >= 70) masteryLevel = 'EXCELLENT';
     else if (finalScore >= 60) masteryLevel = 'GOOD';
     else masteryLevel = 'POOR';

     const studentEmail = profile?.email || application?.email || '';
     const status = finalScore >= (exam.passing_score || 50) ? 'passed' : 'failed';

      try {
        const res = await fetch('/api/entrance/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
            score: finalScore,
            status,
            masteryLevel,
            answersData: Object.entries(answers).map(([qIdx, ans]: [string, any]) => ({
              question_index: parseInt(qIdx),
              question: questions[parseInt(qIdx)]?.question,
              question_type: questions[parseInt(qIdx)]?.question_type,
              options: questions[parseInt(qIdx)]?.options,
              correct_answer: questions[parseInt(qIdx)]?.correct_answer,
              given_answer: ans,
              is_correct: gradeQuestion(questions[parseInt(qIdx)], ans),
              points: questions[parseInt(qIdx)]?.points || 1,
              subject: questions[parseInt(qIdx)]?.subject || null,
              difficulty_level: questions[parseInt(qIdx)]?.difficulty_level || null,
              topic: questions[parseInt(qIdx)]?.topic || null,
            })),
            securityEvents,
            timeTaken: Math.round(((exam.duration_minutes || 60) * 60 - timeLeft) / 60),
            codeId: application?.code_id,
            studentEmail,
          }),
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to save results');

        setScore(finalScore);
        setSubmitted(true);
      } catch (err: any) {
        console.error('Failed to save exam results:', err.message);
        setSubmitError(err.message || 'Failed to save your exam results. Please contact the school.');
        setSubmitted(true);
      }
      setSubmitting(false);
   }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto card text-center">
        {submitError ? (
          <>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-100">
              <AlertTriangle size={40} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Submission Error</h1>
            <p className="text-red-600 mb-6">{submitError}</p>
            <button onClick={() => { setSubmitted(false); setSubmitError(''); setSubmitting(false); }} className="btn-primary">
              Try Again
            </button>
          </>
        ) : (
          <>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${score !== null && score >= (exam?.passing_score || 50) ? 'bg-green-100' : 'bg-red-100'}`}>
          {score !== null && score >= (exam?.passing_score || 50) ? <Check size={40} className="text-green-600" /> : <AlertTriangle size={40} className="text-red-600" />}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Exam Completed!</h1>
        <p className="text-slate-500 mb-6">Your answers have been recorded and submitted for review.</p>
        
        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-slate-500 mb-1">Your Score</p>
          <p className={`text-5xl font-bold ${score !== null && score >= (exam?.passing_score || 50) ? 'text-green-600' : 'text-red-600'}`}>{score}%</p>
          <p className="text-sm text-slate-500 mt-2">Passing Score: {exam?.passing_score || 50}%</p>
          <p className="text-sm text-slate-400 mt-1">{getAnsweredCount()} of {questions.length} answered</p>
        </div>

        {tabSwitches > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
            Tab switches detected: {tabSwitches} - This has been recorded and will be reviewed.
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700 mb-6">
          <p className="font-medium mb-1">What happens next?</p>
          <p>Your exam results will be reviewed by the administration. You will be notified of the outcome through your student portal.</p>
        </div>

        <button onClick={() => router.push('/student/entrance-exams')} className="btn-primary">
          Back to Entrance Exams
        </button>
          </>
        )}
      </div>
    </div>
  );

  if (!started) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto card">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{exam?.title}</h1>
        <p className="text-slate-500 mb-6">{exam?.description}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <Clock size={24} className="mx-auto text-primary-600 mb-2" />
            <p className="text-lg font-bold">{exam?.duration_minutes} min</p>
            <p className="text-xs text-slate-500">Duration</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <FileText size={24} className="mx-auto text-primary-600 mb-2" />
            <p className="text-lg font-bold">{questions.length}</p>
            <p className="text-xs text-slate-500">Questions</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Instructions:</strong> The timer starts when you click Begin. You can flag questions to review later. 
            Auto-submit when time runs out. Do not switch tabs or attempt to copy during the exam - security events will be recorded.
          </p>
        </div>

        <button onClick={() => { setStarted(true); if (exam?.require_fullscreen) document.documentElement.requestFullscreen().catch(() => {}); }} className="btn-primary w-full">
          Begin Entrance Exam
        </button>
      </div>
    </div>
  );

  const question = questions[currentQ];
  if (!question) return <div className="card text-center"><p>No questions in this exam</p></div>;

  return (
    <>
    <div className="space-y-4 max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { if (confirm('Leave exam? Your progress will be lost.')) router.push('/student/entrance-exams'); }} className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
          <ArrowLeft size={18} />Exit
        </button>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-800'}`}>
          <Clock size={16} />{formatTime(timeLeft)}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500">Question {currentQ + 1} of {questions.length}</span>
          <button onClick={() => toggleFlag(currentQ)} className={`flex items-center gap-1 text-sm ${flagged.has(currentQ) ? 'text-amber-600' : 'text-slate-400'}`}>
            <Flag size={14} />{flagged.has(currentQ) ? 'Flagged' : 'Flag'}
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">{question.question}</h2>
        </div>

        {question.question_image && (
          <div className="mb-4">
            <img src={question.question_image} alt="Question illustration" className="max-h-64 rounded-lg border object-contain" />
          </div>
        )}

        {question.question_type === 'multiple_choice' && question.options && (
          <div className="space-y-3">
            {question.options.map((opt: string, i: number) => (
              <button key={i} onClick={() => handleAnswer(currentQ, i)} className={`w-full p-4 rounded-xl text-left border-2 transition-all ${answers[currentQ] === i ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-sm flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {question.question_type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            {['True', 'False'].map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(currentQ, i)} className={`p-6 rounded-xl text-center font-semibold border-2 transition-all ${answers[currentQ] === i ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.question_type === 'fill_blank' && (
          <div>
            <input type="text" value={answers[currentQ] || ''} onChange={(e) => handleAnswer(currentQ, e.target.value)} className="input text-lg" placeholder="Type your answer..." autoComplete="off" />
            <p className="text-xs text-slate-400 mt-1">Fill in the blank with the correct word or phrase.</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <button onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0} className="btn-outline flex items-center gap-2 disabled:opacity-50">
            <ChevronLeft size={16} />Previous
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{getAnsweredCount()}/{questions.length} answered</span>
            {currentQ === questions.length - 1 ? (
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Submit Exam
              </button>
            ) : (
              <button onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))} className="btn-primary flex items-center gap-2">
                Next<ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Question Navigator</h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)} className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${i === currentQ ? 'bg-primary-600 text-white' : answers[i] !== undefined ? 'bg-green-100 text-green-700' : flagged.has(i) ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Blocking Overlay */}
      {fullscreenBlocked && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Fullscreen Required</h2>
            <p className="text-slate-600 mb-6">
              You exited fullscreen mode during the exam. You must re-enter fullscreen to continue.
            </p>
            <button
              onClick={() => {
                document.documentElement.requestFullscreen().then(() => {
                  setFullscreenBlocked(false);
                }).catch(() => {
                  setFullscreenBlocked(true);
                });
              }}
              className="btn-primary w-full py-3 text-lg"
            >
              Re-enter Fullscreen
            </button>
            <button
              onClick={handleSubmit}
              className="btn-ghost w-full mt-2 text-sm text-slate-500"
            >
              Submit Exam Now
            </button>
          </div>
        </div>
      )}
    </div>
    <Calculator />
    </>
  );
}
