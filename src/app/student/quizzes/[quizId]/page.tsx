'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Clock, AlertTriangle, Check, ChevronRight, ChevronLeft, Flag, Loader2, Award } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
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

export default function StudentTakeQuizPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quizId = params?.quizId as string;
  const [quiz, setQuiz] = useState<any>(null);
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
  const [previousAttempt, setPreviousAttempt] = useState<any>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchQuiz();
  }, [profile, quizId]);

  useEffect(() => {
    if (!started || timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { handleSubmit(); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [started, submitted, timeLeft]);

  async function fetchQuiz() {
    const [quizRes, questionsRes, prevRes] = await Promise.all([
      supabase.from('quizzes').select('*, session:sessions!session_id(title)').eq('id', quizId).single(),
      supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('order_index'),
      supabase.from('quiz_attempts').select('*').eq('quiz_id', quizId).eq('student_id', profile?.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (quizRes.data) {
      setQuiz(quizRes.data);
      setTimeLeft((quizRes.data.time_limit || 30) * 60);
    }
    if (questionsRes.data) setQuestions(questionsRes.data);
    if (prevRes.data) setPreviousAttempt(prevRes.data);
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
    if (!quiz || !profile) return;
    setSubmitting(true);
    let correct = 0;
    questions.forEach((q, i) => {
      if (gradeQuestion(q, answers[i])) correct++;
    });
    const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = finalScore >= (quiz.passing_score || 50);
    const startedAt = new Date(Date.now() - ((quiz.time_limit || 30) * 60 - timeLeft) * 1000);

    try {
      const { error: attemptError } = await supabase.from('quiz_attempts').insert({
        quiz_id: quizId,
        student_id: profile.id,
        answers,
        score: finalScore,
        passed,
        time_taken: (quiz.time_limit || 30) * 60 - timeLeft,
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString(),
      });
      if (attemptError) throw new Error(attemptError.message);
      setScore(finalScore);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to save quiz attempt:', err.message);
      alert('Failed to save your quiz. Please try again.');
    }
    setSubmitting(false);
  }

  if (loading) return (
    <DashboardLayout title="Loading Quiz...">
      <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
    </DashboardLayout>
  );

  if (!quiz) return (
    <DashboardLayout title="Quiz Not Found">
      <div className="card text-center"><AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" /><h2 className="text-xl font-bold">Quiz Not Found</h2></div>
    </DashboardLayout>
  );

  if (submitted) return (
    <DashboardLayout title="Quiz Complete">
      <div className="max-w-2xl mx-auto card text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${score !== null && score >= (quiz.passing_score || 50) ? 'bg-green-100' : 'bg-red-100'}`}>
          {score !== null && score >= (quiz.passing_score || 50) ? <Check size={40} className="text-green-600" /> : <AlertTriangle size={40} className="text-red-600" />}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Quiz Complete!</h1>
        <p className="text-slate-500 mb-6">{score !== null && score >= (quiz.passing_score || 50) ? 'Great job!' : 'Keep practicing!'}</p>
        <div className="bg-slate-50 rounded-xl p-6 mb-6">
          <p className="text-sm text-slate-500 mb-1">Your Score</p>
          <p className={`text-5xl font-bold ${score !== null && score >= (quiz.passing_score || 50) ? 'text-green-600' : 'text-red-600'}`}>{score}%</p>
          <p className="text-sm text-slate-500 mt-2">Passing: {quiz.passing_score || 50}%</p>
          <p className="text-sm text-slate-400 mt-1">{getAnsweredCount()} of {questions.length} answered</p>
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/student/quizzes')} className="btn-primary">Back to Quizzes</button>
          <button onClick={() => { setSubmitted(false); setStarted(false); setAnswers({}); setScore(null); setTimeLeft((quiz.time_limit || 30) * 60); }} className="btn-outline">Retry</button>
        </div>
      </div>
    </DashboardLayout>
  );

  if (!started) return (
    <DashboardLayout title={quiz.title}>
      <div className="max-w-2xl mx-auto card">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{quiz.title}</h1>
        <p className="text-slate-500 mb-4">{quiz.description}</p>
        {quiz.session && <p className="text-sm text-slate-500 mb-4">Lesson: {quiz.session.title}</p>}
        {previousAttempt && (
          <div className="bg-slate-50 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Award size={24} className="text-purple-600" />
            <div>
              <p className="font-medium text-slate-700">Previous Attempt</p>
              <p className={`text-lg font-bold ${previousAttempt.passed ? 'text-green-600' : 'text-red-600'}`}>{previousAttempt.score}%</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4 text-center"><Clock size={24} className="mx-auto text-primary-600 mb-2" /><p className="text-lg font-bold">{quiz.time_limit} min</p><p className="text-xs text-slate-500">Duration</p></div>
          <div className="bg-slate-50 rounded-lg p-4 text-center"><Award size={24} className="mx-auto text-purple-600 mb-2" /><p className="text-lg font-bold">{questions.length}</p><p className="text-xs text-slate-500">Questions</p></div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800"><strong>Instructions:</strong> Timer starts when you begin. Flag questions to review. Auto-submit when time runs out.</p>
        </div>
        <button onClick={() => setStarted(true)} className="btn-primary w-full">Begin Quiz</button>
      </div>
    </DashboardLayout>
  );

  const question = questions[currentQ];
  if (!question) return <div className="card text-center"><p>No questions in this quiz</p></div>;

  return (
    <>
    <DashboardLayout title={quiz.title}>
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <button onClick={() => { if (confirm('Leave quiz? Progress will be lost.')) router.push('/student/quizzes'); }} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm">
            Exit
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

          <h2 className="text-lg font-semibold text-slate-900 mb-4">{question.question}</h2>

          {question.question_image && (
            <div className="mb-4"><img src={question.question_image} alt="Question" className="max-h-64 rounded-lg border object-contain" /></div>
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
                <button key={i} onClick={() => handleAnswer(currentQ, i)} className={`p-6 rounded-xl text-center font-semibold border-2 transition-all ${answers[currentQ] === i ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>{opt}</button>
              ))}
            </div>
          )}

          {question.question_type === 'fill_blank' && (
            <div>
              <input type="text" value={answers[currentQ] || ''} onChange={(e) => handleAnswer(currentQ, e.target.value)} className="input text-lg" placeholder="Type your answer..." autoComplete="off" />
              <p className="text-xs text-slate-400 mt-1">Fill in the blank.</p>
            </div>
          )}

          {question.question_type === 'short_answer' && (
            <div>
              <textarea value={answers[currentQ] || ''} onChange={(e) => handleAnswer(currentQ, e.target.value)} className="input" rows={4} placeholder="Write your answer..." />
              <p className="text-xs text-slate-400 mt-1">Your teacher will review this.</p>
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
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2">{submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Quiz'}</button>
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
    </DashboardLayout>
    <Calculator />
    </>
  );
}
