'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, Check, X, FileText, Upload, AlertCircle, ArrowLeft, GraduationCap } from 'lucide-react';

function ApplyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'info' | 'form' | 'exam' | 'result'>('info');
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', gender: '', applied_class: '', previous_school: ''
  });
  const [codeValid, setCodeValid] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [codeData, setCodeData] = useState<any>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [examScore, setExamScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (code) {
      setCodeInput(code);
      verifyCode(code);
    }
  }, [code]);

  // Timer effect
  useEffect(() => {
    if (step !== 'exam' || !exam || !startTime) return;
    const interval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 60000);
      const remaining = Math.max(0, exam.duration_minutes - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        submitExam();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [step, exam, startTime]);

  async function verifyCode(codeToVerify: string) {
    setLoading(true);
    setError('');
    try {
      const { data: codeResult } = await supabase
        .from('entrance_codes')
        .select('*, exam:entrance_exams(*)')
        .eq('code', codeToVerify.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (codeResult && codeResult.exam) {
        setCodeValid(true);
        setCodeData(codeResult);
        setExam(codeResult.exam);
        const { data: questionsData } = await supabase
          .from('entrance_questions')
          .select('*')
          .eq('exam_id', codeResult.exam_id)
          .order('created_at', { ascending: true });
        if (questionsData) setQuestions(questionsData);
      } else {
        setError('Invalid or expired exam code. Please check and try again.');
      }
    } catch (err: any) {
      setError('Failed to verify code. Please try again.');
    }
    setLoading(false);
  }

  async function handleApply() {
    if (!codeInput.trim()) {
      setError('Please enter an exam code');
      return;
    }
    setError('');
    await verifyCode(codeInput);
  }

  async function startExam() {
    if (!exam || !formData.first_name || !formData.last_name || !formData.email || !formData.applied_class) {
      setError('Please fill all required fields');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const { data: application, error: insertError } = await supabase
        .from('entrance_applications')
        .insert({
          exam_id: exam.id,
          code_id: codeData?.id,
          ...formData,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      if (application) {
        setApplicationId(application.id);
        setStartTime(Date.now());
        setTimeRemaining(exam.duration_minutes);
        setStep('exam');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start exam. Please try again.');
    }
    setSubmitting(false);
  }

  async function submitExam() {
    if (!applicationId || submitting) return;
    setSubmitting(true);

    const timeTaken = Math.round((Date.now() - startTime) / 60000);
    let score = 0;
    let totalPoints = 0;

    questions.forEach((q, i) => {
      totalPoints += (q.points || 1);
      if (answers[i] === q.correct_answer) score += (q.points || 1);
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= exam.passing_score;
    setExamScore(percentage);

    try {
      await supabase
        .from('entrance_applications')
        .update({
          exam_score: percentage,
          status: passed ? 'passed' : 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', applicationId);

      // Update code usage count
      if (codeData?.id) {
        await supabase
          .from('entrance_codes')
          .update({ used_count: (codeData.used_count || 0) + 1 })
          .eq('id', codeData.id);
      }
    } catch (err) {
      console.error('Failed to save results:', err);
    }

    setStep('result');
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <GraduationCap className="text-white" size={22} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight">ClearPath</h1>
              <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider -mt-0.5">Edu Hub</p>
            </div>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Entrance Examination</h1>
          <p className="text-slate-600 mt-2">Take your entrance exam to begin the admission process</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {step === 'info' && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
            {!codeValid && !exam ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="text-primary-600" size={36} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Enter Exam Code</h2>
                  <p className="text-slate-500 mt-1">You need an exam code from the school to proceed</p>
                </div>
                <div>
                  <label className="label">Exam Code</label>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    className="input text-center text-xl font-mono tracking-widest"
                    placeholder="ABCDEF"
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  />
                </div>
                <button onClick={handleApply} disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  {loading ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> Verifying...</>
                  ) : (
                    'Verify Code'
                  )}
                </button>
              </div>
            ) : exam ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="text-green-600" size={36} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{exam.title}</h2>
                  <p className="text-slate-500">{exam.level} • {exam.academic_year}</p>
                </div>
                {exam.description && (
                  <p className="text-sm text-slate-600 text-center bg-slate-50 p-4 rounded-xl">{exam.description}</p>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                    <p className="text-slate-500 text-xs uppercase font-semibold">Duration</p>
                    <p className="font-bold text-lg text-slate-900">{exam.duration_minutes} min</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <p className="text-slate-500 text-xs uppercase font-semibold">Questions</p>
                    <p className="font-bold text-lg text-slate-900">{questions.length}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <p className="text-slate-500 text-xs uppercase font-semibold">Passing Score</p>
                    <p className="font-bold text-lg text-slate-900">{exam.passing_score}%</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-slate-500 text-xs uppercase font-semibold">Level</p>
                    <p className="font-bold text-lg text-slate-900">{exam.level}</p>
                  </div>
                </div>
                <button onClick={() => setStep('form')} className="btn-primary w-full py-3">Proceed to Application Form</button>
              </div>
            ) : null}
          </div>
        )}

        {step === 'form' && exam && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Application Form</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">First Name *</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input" /></div>
                <div><label className="label">Last Name *</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" /></div>
              <div><label className="label">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" placeholder="+234..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="input" /></div>
                <div><label className="label">Gender</label><select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="input"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></div>
              </div>
              <div><label className="label">Applied Class *</label><select value={formData.applied_class} onChange={(e) => setFormData({ ...formData, applied_class: e.target.value })} className="input"><option value="">Select Class</option><option value="PRIMARY 1">Primary 1</option><option value="PRIMARY 2">Primary 2</option><option value="PRIMARY 3">Primary 3</option><option value="PRIMARY 4">Primary 4</option><option value="PRIMARY 5">Primary 5</option><option value="PRIMARY 6">Primary 6</option><option value="JSS 1">JSS 1</option><option value="JSS 2">JSS 2</option><option value="JSS 3">JSS 3</option><option value="SS 1">SS 1</option><option value="SS 2">SS 2</option><option value="SS 3">SS 3</option></select></div>
              <div><label className="label">Previous School</label><input type="text" value={formData.previous_school} onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })} className="input" placeholder="School name" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep('info')} className="btn-outline flex-1">Back</button>
              <button onClick={startExam} disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {submitting ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> Starting...</> : 'Start Examination'}
              </button>
            </div>
          </div>
        )}

        {step === 'exam' && exam && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="font-medium text-slate-600">Question {currentQuestion + 1} of {questions.length}</span>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${timeRemaining <= 5 ? 'bg-red-100 text-red-700' : 'bg-primary-100 text-primary-700'}`}>
                <Clock size={16} />
                <span>{timeRemaining} min left</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 mb-6">
              <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}></div>
            </div>
            
            {questions[currentQuestion] && (
              <div className="space-y-6">
                {questions[currentQuestion].question_image && (
                  <img src={questions[currentQuestion].question_image} alt="Question" className="w-full rounded-lg" />
                )}
                <p className="text-lg font-medium text-slate-800">{questions[currentQuestion].question}</p>
                
                <div className="space-y-3">
                  {questions[currentQuestion].options?.map((opt: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setAnswers({ ...answers, [currentQuestion]: i })}
                      className={`w-full p-4 rounded-xl text-left border-2 transition-all ${
                        answers[currentQuestion] === i
                          ? 'border-primary-500 bg-primary-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-semibold text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className="btn-outline disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {currentQuestion < questions.length - 1 ? (
                    <button onClick={() => setCurrentQuestion(currentQuestion + 1)} className="btn-primary">
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={submitExam}
                      disabled={submitting}
                      className="btn-primary flex items-center gap-2"
                    >
                      {submitting ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> Submitting...</> : 'Submit Exam'}
                    </button>
                  )}
                </div>

                {/* Question navigation dots */}
                <div className="flex flex-wrap gap-2 justify-center pt-4 border-t border-slate-100">
                  {questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentQuestion(i)}
                      className={`w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                        i === currentQuestion
                          ? 'bg-primary-600 text-white'
                          : answers[i] !== undefined
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'result' && exam && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8 text-center">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${examScore >= exam.passing_score ? 'bg-gradient-to-br from-green-100 to-green-200' : 'bg-gradient-to-br from-red-100 to-red-200'}`}>
              {examScore >= exam.passing_score ? <Check className="text-green-600" size={48} /> : <X className="text-red-600" size={48} />}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mt-6">
              {examScore >= exam.passing_score ? 'Congratulations! 🎉' : 'Keep Trying!'}
            </h2>
            <p className="text-slate-600 mt-2">
              {examScore >= exam.passing_score
                ? 'You have passed the entrance exam. The school will contact you regarding admission.'
                : 'You did not meet the passing score this time. Please contact the school for more information.'}
            </p>
            <div className={`text-5xl font-bold my-6 ${examScore >= exam.passing_score ? 'text-green-600' : 'text-red-600'}`}>
              {examScore}%
            </div>
            <p className="text-sm text-slate-500">Passing score: {exam.passing_score}%</p>
            <div className="mt-8">
              <Link href="/" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-primary-50 to-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ApplyPageContent />
    </Suspense>
  );
}