'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, Check, X, FileText, Upload, AlertCircle } from 'lucide-react';

function ApplyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'info' | 'form' | 'exam' | 'result'>('info');
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', gender: '', applied_class: '', previous_school: ''
  });
  const [codeValid, setCodeValid] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [startTime, setStartTime] = useState<number>(0);
  const [codeData, setCodeData] = useState<any>(null);

  useEffect(() => {
    if (code) {
      setCodeInput(code);
      verifyCode(code);
    }
  }, [code]);

  async function verifyCode(codeToVerify: string) {
    setLoading(true);
    const { data: codeData } = await supabase.from('entrance_codes').select('*, exam:entrance_exams(*)').eq('code', codeToVerify).eq('is_active', true).single();
    if (codeData && codeData.exam) {
      setCodeValid(true);
      setCodeData(codeData);
      setExam(codeData.exam);
      const { data: questionsData } = await supabase.from('entrance_questions').select('*').eq('exam_id', codeData.exam_id).order('created_at', { ascending: true });
      if (questionsData) setQuestions(questionsData);
    }
    setLoading(false);
  }

  async function handleApply() {
    const { data: codeData } = await supabase.from('entrance_codes').select('*').eq('code', codeInput).single();
    if (!codeData) {
      alert('Invalid code');
      return;
    }
    setCodeData(codeData);
    verifyCode(codeInput);
  }

  async function startExam() {
    if (!exam || !formData.first_name || !formData.last_name || !formData.email || !formData.applied_class) {
      alert('Please fill all required fields');
      return;
    }

    const { data: application } = await supabase.from('entrance_applications').insert({
      exam_id: exam.id,
      code_id: codeData?.id,
      ...formData,
      status: 'pending'
    }).select().single();

    if (application) {
      setStartTime(Date.now());
      setStep('exam');
    }
  }

  async function submitExam() {
    const timeTaken = Math.round((Date.now() - startTime) / 60000);
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) score += q.points;
    });
    const percentage = Math.round((score / questions.reduce((s, q) => s + q.points, 0)) * 100);
    const passed = percentage >= exam.passing_score;

    await supabase.from('entrance_applications').update({
      exam_score: percentage,
      status: passed ? 'passed' : 'failed',
      completed_at: new Date().toISOString()
    }).eq('id', formData.email);

    setStep('result');
  }

  function getScore() {
    let score = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) score += q.points;
    });
    return questions.length > 0 ? Math.round((score / questions.reduce((s, q) => s + q.points, 0)) * 100) : 0;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">ClearPath Edu Hub</h1>
          <p className="text-slate-600">Entrance Examination</p>
        </div>

        {step === 'info' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            {!codeValid && !exam ? (
              <div className="space-y-6">
                <div className="text-center">
                  <AlertCircle className="mx-auto text-yellow-500" size={48} />
                  <h2 className="text-xl font-bold text-slate-800 mt-4">Enter Exam Code</h2>
                  <p className="text-slate-500">You need an exam code to proceed</p>
                </div>
                <div>
                  <label className="label">Exam Code</label>
                  <input type="text" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} className="input text-center text-xl font-mono" placeholder="XXXXX-XXXXX" />
                </div>
                <button onClick={handleApply} className="btn-primary w-full py-3">Verify Code</button>
              </div>
            ) : exam ? (
              <div className="space-y-6">
                <div className="text-center">
                  <Check className="mx-auto text-green-500" size={48} />
                  <h2 className="text-xl font-bold text-slate-800 mt-4">{exam.title}</h2>
                  <p className="text-slate-500">{exam.level} - {exam.academic_year}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-4 rounded-lg"><p className="text-slate-500">Duration</p><p className="font-bold text-lg">{exam.duration_minutes} minutes</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><p className="text-slate-500">Questions</p><p className="font-bold text-lg">{questions.length}</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><p className="text-slate-500">Passing Score</p><p className="font-bold text-lg">{exam.passing_score}%</p></div>
                  <div className="bg-gray-50 p-4 rounded-lg"><p className="text-slate-500">Level</p><p className="font-bold text-lg">{exam.level}</p></div>
                </div>
                <button onClick={() => setStep('form')} className="btn-primary w-full py-3">Proceed to Apply</button>
              </div>
            ) : null}
          </div>
        )}

        {step === 'form' && exam && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Application Form</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">First Name *</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input" /></div>
                <div><label className="label">Last Name *</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Email *</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" /></div>
              <div><label className="label">Phone *</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="input" /></div>
                <div><label className="label">Gender</label><select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} className="input"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select></div>
              </div>
              <div><label className="label">Applied Class *</label><select value={formData.applied_class} onChange={(e) => setFormData({ ...formData, applied_class: e.target.value })} className="input"><option value="">Select Class</option><option value="PRIMARY">Primary (1-6)</option><option value="JSS">JSS (1-3)</option><option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option></select></div>
              <div><label className="label">Previous School</label><input type="text" value={formData.previous_school} onChange={(e) => setFormData({ ...formData, previous_school: e.target.value })} className="input" placeholder="School name" /></div>
            </div>
            <button onClick={startExam} className="btn-primary w-full py-3 mt-6">Start Examination</button>
          </div>
        )}

        {step === 'exam' && exam && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="font-medium text-slate-600">Question {currentQuestion + 1} of {questions.length}</span>
              <div className="flex items-center gap-2 text-red-600"><Clock size={18} /><span>{Math.max(0, exam.duration_minutes - Math.round((Date.now() - startTime) / 60000))} min left</span></div>
            </div>
            
            {questions[currentQuestion] && (
              <div className="space-y-6">
                {questions[currentQuestion].question_image && (
                  <img src={questions[currentQuestion].question_image} alt="Question" className="w-full rounded-lg" />
                )}
                <p className="text-lg font-medium text-slate-800">{questions[currentQuestion].question}</p>
                
                <div className="space-y-3">
                  {questions[currentQuestion].options.map((opt: string, i: number) => (
                    <button key={i} onClick={() => setAnswers({ ...answers, [currentQuestion]: i })} className={`w-full p-4 rounded-lg text-left border ${answers[currentQuestion] === i ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0} className="btn-outline">Previous</button>
                  {currentQuestion < questions.length - 1 ? (
                    <button onClick={() => setCurrentQuestion(currentQuestion + 1)} className="btn-primary">Next</button>
                  ) : (
                    <button onClick={submitExam} className="btn-primary">Submit Exam</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'result' && exam && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${getScore() >= exam.passing_score ? 'bg-green-100' : 'bg-red-100'}`}>
              {getScore() >= exam.passing_score ? <Check className="text-green-600" size={48} /> : <X className="text-red-600" size={48} />}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mt-6">
              {getScore() >= exam.passing_score ? 'Congratulations!' : 'Keep Trying!'}
            </h2>
            <p className="text-slate-600 mt-2">
              {getScore() >= exam.passing_score ? 'You have passed the entrance exam.' : 'You did not meet the passing score.'}
            </p>
            <div className="text-4xl font-bold text-blue-600 my-6">{getScore()}%</div>
            <p className="text-sm text-slate-500">Passing score: {exam.passing_score}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>}>
      <ApplyPageContent />
    </Suspense>
  );
}