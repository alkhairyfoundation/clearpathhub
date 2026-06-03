'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, AlertTriangle, Check, X, ChevronRight, ChevronLeft, Flag, Eye, EyeOff, Loader2, ImageIcon } from 'lucide-react';
import Calculator from '@/components/Calculator';

function gradeQuestion(question: any, answer: any): boolean {
  if (answer === undefined || answer === null) return false;
  switch (question.question_type) {
    case 'multiple_choice':
    case 'true_false':
      return answer === question.correct_answer;
    case 'fill_blank': {
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

export default function StudentTakeTestPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const testId = params?.testId as string;
  const [test, setTest] = useState<any>(null);
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
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const [error, setError] = useState('');
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const activityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchTest();
  }, [profile, testId]);

  const submittingRef = useRef(false);

  useEffect(() => {
    if (!started || timeLeft <= 0 || submitted || submittingRef.current) return;
    const timer = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1 && !submittingRef.current) {
        submittingRef.current = true;
        handleSubmit();
        return 0;
      }
      return prev - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [started, submitted, timeLeft]);

  useEffect(() => {
    if (!started || submitted) return;
    function handleVisibility() {
      if (document.hidden) {
        setTabSwitches(prev => {
          const next = prev + 1;
          setSecurityEvents(events => [...events, { type: 'tab_switch', time: new Date().toISOString(), count: next }]);
          if (test?.prevent_tab_switch && next >= (test?.max_tab_switches || 3)) {
            handleSubmit();
          }
          return next;
        });
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [started, submitted, test]);

  useEffect(() => {
    if (!started || submitted || !test?.require_fullscreen) return;
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setFullscreenExits(prev => {
          const next = prev + 1;
          setSecurityEvents(events => [...events, { type: 'fullscreen_exit', time: new Date().toISOString(), count: next }]);
          return next;
        });
        setFullscreenBlocked(true);
      } else {
        setFullscreenBlocked(false);
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    const interval = setInterval(() => {
      if (started && !submitted && test?.require_fullscreen && !document.fullscreenElement) {
        setFullscreenBlocked(true);
      }
    }, 2000);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearInterval(interval);
    };
  }, [started, submitted, test]);

  useEffect(() => {
    if (!started || submitted) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F11') {
        e.preventDefault();
        setSecurityEvents(events => [...events, { type: 'keyboard_shortcut', key: e.key, time: new Date().toISOString() }]);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        setSecurityEvents(events => [...events, { type: 'keyboard_shortcut', key: e.key, time: new Date().toISOString() }]);
      }
      if (e.key === 'PrintScreen') {
        setSecurityEvents(events => [...events, { type: 'screenshot', time: new Date().toISOString() }]);
      }
    }
    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();
    }
    function handleCopy(e: ClipboardEvent) {
      e.preventDefault();
      setSecurityEvents(events => [...events, { type: 'copy_attempt', time: new Date().toISOString() }]);
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', (e: ClipboardEvent) => e.preventDefault());
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', (e: ClipboardEvent) => e.preventDefault());
    };
  }, [started, submitted]);

  async function fetchTest() {
    try {
      const [testRes, questionsRes] = await Promise.all([
        supabase.from('tests').select('*, subject:subjects!subject_id(name), class:classes!class_id(name)').eq('id', testId).eq('is_published', true).single(),
        supabase.from('test_questions').select('*').eq('test_id', testId).order('order_index'),
      ]);
      if (testRes.error) throw new Error(testRes.error.message);
      if (testRes.data) {
        setTest(testRes.data);
        setTimeLeft((testRes.data.duration_minutes || 30) * 60);
      }
      if (questionsRes.data) {
        let qs = questionsRes.data;
        if (testRes.data?.shuffle_questions) {
          qs = [...qs].sort(() => Math.random() - 0.5);
        }
        setQuestions(qs);
      }
    } catch (err: any) {
      setError(err.message);
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
    if (!test || !profile) return;
    setSubmitting(true);
    let correct = 0;
    questions.forEach((q, i) => {
      if (gradeQuestion(q, answers[i])) correct++;
    });
    const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    const startedAt = new Date(Date.now() - ((test.duration_minutes || 30) * 60 - timeLeft) * 1000);

    try {
      const { data: attempt, error: attemptError } = await supabase.from('test_attempts').insert({
        test_id: testId,
        student_id: profile.id,
        answers,
        score: finalScore,
        passed: finalScore >= (test.passing_score || 50),
        tab_switches: tabSwitches,
        fullscreen_exits: fullscreenExits,
        time_taken: (test.duration_minutes || 30) * 60 - timeLeft,
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString(),
      }).select().single();

      if (attemptError) throw new Error(attemptError.message);

      if (attempt && securityEvents.length > 0) {
        const logs = securityEvents.map(e => ({
          attempt_id: attempt.id,
          student_id: profile.id,
          event_type: e.type,
          event_data: { key: e.key, count: e.count },
          severity: e.type === 'tab_switch' || e.type === 'fullscreen_exit' ? (e.count >= 3 ? 'high' : 'medium') : 'low',
          created_at: e.time,
        }));
        await supabase.from('exam_activity_logs').insert(logs);
      }

      setScore(finalScore);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to save test attempt:', err.message);
      alert('Failed to save your test. Please try again.');
    }
    setSubmitting(false);
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>;

  if (!test) return <div className="card text-center"><AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" /><h2 className="text-xl font-bold">Test Not Found</h2><p className="text-slate-500">This test may not be published yet.</p></div>;

  if (submitted) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${score !== null && score >= (test.passing_score || 50) ? 'bg-green-100' : 'bg-red-100'}`}>
          {score !== null && score >= (test.passing_score || 50) ? <Check size={40} className="text-green-600" /> : <AlertTriangle size={40} className="text-red-600" />}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Test Submitted!</h1>
        <p className="text-slate-500 mb-6">Your answers have been recorded</p>
        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-slate-500 mb-1">Your Score</p>
          <p className={`text-5xl font-bold ${score !== null && score >= (test.passing_score || 50) ? 'text-green-600' : 'text-red-600'}`}>{score}%</p>
          <p className="text-sm text-slate-500 mt-2">Passing Score: {test.passing_score || 50}%</p>
          <p className="text-sm text-slate-400 mt-1">{getAnsweredCount()} of {questions.length} answered</p>
        </div>
        {tabSwitches > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
            Tab switches detected: {tabSwitches}
          </div>
        )}
        <button onClick={() => router.push('/student')} className="btn-primary">Back to Dashboard</button>
      </div>

      {/* Answer Review */}
      {questions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Answer Review</h3>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const isCorrect = gradeQuestion(q, answers[i]);
              const letter = (idx: number) => String.fromCharCode(65 + idx);
              return (
                <div key={q.id} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-green-200' : 'bg-red-200'}`}>
                      {isCorrect ? <Check size={16} className="text-green-700" /> : <X size={16} className="text-red-700" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900"><span className="text-slate-400">Q{i + 1}.</span> {q.question}</p>
                      {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && q.options && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt: string, oi: number) => (
                            <div key={oi} className={`text-sm px-3 py-1.5 rounded-lg ${
                              oi === q.correct_answer ? 'bg-green-200 text-green-800 font-medium' :
                              oi === answers[i] && oi !== q.correct_answer ? 'bg-red-200 text-red-800' :
                              'text-slate-600'
                            }`}>
                              {letter(oi)}. {opt}
                              {oi === q.correct_answer && <span className="ml-2 text-green-700">✓ Correct</span>}
                              {oi === answers[i] && oi !== q.correct_answer && <span className="ml-2 text-red-700">✗ Your answer</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {q.question_type === 'fill_blank' && (
                        <div className="mt-2 text-sm">
                          <span className="text-slate-500">Your answer: </span>
                          <span className={isCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>{answers[i] || '(empty)'}</span>
                          {!isCorrect && <><br /><span className="text-green-700">Correct: {q.options?.[q.correct_answer] || 'N/A'}</span></>}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{q.points} pt(s)</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  if (!started) return (
    <div className="max-w-2xl mx-auto card">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{test.title}</h1>
      <p className="text-slate-500 mb-6">{test.description}</p>
      {test.subject && <p className="text-sm text-slate-500 mb-4">Subject: {test.subject.name} | Class: {test.class?.name}</p>}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4 text-center"><Clock size={24} className="mx-auto text-primary-600 mb-2" /><p className="text-lg font-bold">{test.duration_minutes} min</p><p className="text-xs text-slate-500">Duration</p></div>
        <div className="bg-slate-50 rounded-lg p-4 text-center"><Flag size={24} className="mx-auto text-purple-600 mb-2" /><p className="text-lg font-bold">{questions.length}</p><p className="text-xs text-slate-500">Questions</p></div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800"><strong>Instructions:</strong> The timer starts when you click Begin. You can flag questions to review later. Auto-submit when time runs out. Do not switch tabs during the test.</p>
      </div>
      <button onClick={() => { setStarted(true); if (test?.require_fullscreen) document.documentElement.requestFullscreen().catch(() => {}); }} className="btn-primary w-full">Begin Test</button>
    </div>
  );

  const question = questions[currentQ];
  if (!question) return <div className="card text-center"><p>No questions in this test</p></div>;

  return (
    <>
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => { if (confirm('Leave test? Progress will be lost.')) router.push('/student'); }} className="flex items-center gap-2 text-slate-600 hover:text-slate-800"><ArrowLeft size={18} />Exit</button>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-800'}`}><Clock size={16} />{formatTime(timeLeft)}</div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500">Question {currentQ + 1} of {questions.length}</span>
          <button onClick={() => toggleFlag(currentQ)} className={`flex items-center gap-1 text-sm ${flagged.has(currentQ) ? 'text-amber-600' : 'text-slate-400'}`}><Flag size={14} />{flagged.has(currentQ) ? 'Flagged' : 'Flag'}</button>
        </div>

        <div className="flex items-center gap-2 mb-2">
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
                  {question.option_images?.[i] && <img src={question.option_images[i]} alt="" className="w-10 h-10 rounded object-cover" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {question.question_type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            {['True', 'False'].map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(currentQ, i)} className={`p-6 rounded-xl text-center font-semibold border-2 transition-all ${answers[currentQ] === i ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>{opt}</button>
            ))}
          </div>
        )}

        {question.question_type === 'fill_blank' && (
          <div>
            <input type="text" value={answers[currentQ] || ''} onChange={(e) => handleAnswer(currentQ, e.target.value)} className="input text-lg" placeholder="Type your answer..." autoComplete="off" />
            <p className="text-xs text-slate-400 mt-1">Fill in the blank with the correct word or phrase.</p>
          </div>
        )}

        {question.question_type === 'short_answer' && (
          <div>
            <textarea value={answers[currentQ] || ''} onChange={(e) => handleAnswer(currentQ, e.target.value)} className="input" rows={4} placeholder="Write your answer..." />
            <p className="text-xs text-slate-400 mt-1">Your teacher will review and grade this answer.</p>
          </div>
        )}

        {question.question_type === 'multiple_selection' && question.options && (
          <div className="space-y-3">
            {question.options.map((opt: string, i: number) => {
              const selected = Array.isArray(answers[currentQ]) && answers[currentQ].includes(i);
              return (
                <button key={i} onClick={() => handleMultipleSelection(currentQ, i)} className={`w-full p-4 rounded-xl text-left border-2 transition-all ${selected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'}`}>
                      {selected && <Check size={14} className="text-white" />}
                    </div>
                    <span className="flex-1">{opt}</span>
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-slate-400">Select all that apply.</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <button onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0} className="btn-outline flex items-center gap-2 disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{getAnsweredCount()}/{questions.length} answered</span>
            {currentQ === questions.length - 1 ? (
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2">{submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Test'}</button>
            ) : (
              <button onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))} className="btn-primary flex items-center gap-2">Next<ChevronRight size={16} /></button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Question Navigator</h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)} className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${i === currentQ ? 'bg-primary-600 text-white' : answers[i] !== undefined ? 'bg-green-100 text-green-700' : flagged.has(i) ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</button>
          ))}
        </div>
      </div>
    </div>
    <Calculator />

      {/* Fullscreen Blocking Overlay */}
      {fullscreenBlocked && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={40} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Fullscreen Required</h2>
            <p className="text-slate-600 mb-6">
              You exited fullscreen mode during the test. You must re-enter fullscreen to continue.
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
              Submit Test Now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
