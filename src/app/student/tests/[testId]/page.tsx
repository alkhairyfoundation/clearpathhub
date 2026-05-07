'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock, AlertTriangle, Check, ChevronRight, ChevronLeft, Flag, Eye, EyeOff, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchTest();
  }, [profile, testId]);

  useEffect(() => {
    if (!started || timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => setTimeLeft(prev => {
      if (prev <= 1) { handleSubmit(); return 0; }
      return prev - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [started, submitted, timeLeft]);

  async function fetchTest() {
    const [testRes, questionsRes] = await Promise.all([
      supabase.from('tests').select('*, subject:subjects(name), class:classes(name)').eq('id', testId).eq('is_published', true).single(),
      supabase.from('test_questions').select('*').eq('test_id', testId).order('order_index'),
    ]);
    if (testRes.data) {
      setTest(testRes.data);
      setTimeLeft((testRes.data.duration_minutes || 30) * 60);
    }
    if (questionsRes.data) setQuestions(questionsRes.data);
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

  async function handleSubmit() {
    if (!test || !profile) return;
    setSubmitting(true);
    let correct = 0;
    questions.forEach((q, i) => {
      if (q.question_type === 'multiple_choice' && answers[i] === q.correct_answer) correct++;
    });
    const finalScore = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    await supabase.from('test_attempts').insert({
      test_id: testId,
      student_id: profile.id,
      answers,
      score: finalScore,
      time_taken: (test.duration_minutes || 30) * 60 - timeLeft,
      created_at: new Date().toISOString()
    });
    setScore(finalScore);
    setSubmitted(true);
    setSubmitting(false);
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>;

  if (!test) return <div className="card text-center"><AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" /><h2 className="text-xl font-bold">Test Not Found</h2><p className="text-slate-500">This test may not be published yet.</p></div>;

  if (submitted) return (
    <div className="max-w-2xl mx-auto card text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={40} className="text-green-600" /></div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Test Submitted!</h1>
      <p className="text-slate-500 mb-6">Your answers have been recorded</p>
      <div className="bg-slate-50 rounded-xl p-6 mb-6">
        <p className="text-sm text-slate-500 mb-1">Your Score</p>
        <p className={`text-5xl font-bold ${score && score >= (test.passing_score || 50) ? 'text-green-600' : 'text-red-600'}`}>{score}%</p>
        <p className="text-sm text-slate-500 mt-2">Passing Score: {test.passing_score || 50}%</p>
      </div>
      <button onClick={() => router.push('/student')} className="btn-primary">Back to Dashboard</button>
    </div>
  );

  if (!started) return (
    <div className="max-w-2xl mx-auto card">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{test.title}</h1>
      <p className="text-slate-500 mb-6">{test.description}</p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4 text-center"><Clock size={24} className="mx-auto text-blue-600 mb-2" /><p className="text-lg font-bold">{test.duration_minutes} min</p><p className="text-xs text-slate-500">Duration</p></div>
        <div className="bg-slate-50 rounded-lg p-4 text-center"><Flag size={24} className="mx-auto text-purple-600 mb-2" /><p className="text-lg font-bold">{questions.length}</p><p className="text-xs text-slate-500">Questions</p></div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-800"><strong>Instructions:</strong> The timer starts when you click Begin. You can flag questions to review later. Auto-submit when time runs out.</p>
      </div>
      <button onClick={() => setStarted(true)} className="btn-primary w-full">Begin Test</button>
    </div>
  );

  const question = questions[currentQ];
  if (!question) return <div className="card text-center"><p>No questions in this test</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => { if (confirm('Leave test? Progress will be lost.')) router.push('/student'); }} className="flex items-center gap-2 text-slate-600 hover:text-slate-800"><ArrowLeft size={18} />Exit</button>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-800'}`}><Clock size={16} />{formatTime(timeLeft)}</div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-500">Question {currentQ + 1} of {questions.length}</span>
          <button onClick={() => toggleFlag(currentQ)} className={`flex items-center gap-1 text-sm ${flagged.has(currentQ) ? 'text-amber-600' : 'text-slate-400'}`}><Flag size={14} />{flagged.has(currentQ) ? 'Flagged' : 'Flag'}</button>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-6">{question.question}</h2>

        {question.question_type === 'multiple_choice' && question.options && (
          <div className="space-y-3">
            {question.options.map((opt: string, i: number) => (
              <button key={i} onClick={() => handleAnswer(currentQ, i)} className={`w-full p-4 rounded-xl text-left border-2 transition-all ${answers[currentQ] === i ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
              </button>
            ))}
          </div>
        )}

        {question.question_type === 'true_false' && (
          <div className="grid grid-cols-2 gap-3">
            {['True', 'False'].map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(currentQ, i === 0)} className={`p-6 rounded-xl text-center font-semibold border-2 transition-all ${answers[currentQ] === (i === 0) ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>{opt}</button>
            ))}
          </div>
        )}

        {question.question_type === 'short_answer' && (
          <textarea value={answers[currentQ] || ''} onChange={(e) => handleAnswer(currentQ, e.target.value)} className="input" rows={4} placeholder="Type your answer..." />
        )}

        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))} disabled={currentQ === 0} className="btn-outline flex items-center gap-2 disabled:opacity-50"><ChevronLeft size={16} />Previous</button>
          {currentQ === questions.length - 1 ? (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2">{submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Test'}</button>
          ) : (
            <button onClick={() => setCurrentQ(prev => Math.min(questions.length - 1, prev + 1))} className="btn-primary flex items-center gap-2">Next<ChevronRight size={16} /></button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Question Navigator</h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)} className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${i === currentQ ? 'bg-blue-600 text-white' : answers[i] !== undefined ? 'bg-green-100 text-green-700' : flagged.has(i) ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
