'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Play, Youtube, Edit, Trash2, X, FileVideo, Clock, Users, CheckCircle, ArrowLeft, ImageIcon } from 'lucide-react';
import type { Session, Subject, Class, Profile } from '@/types';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'multiple_selection', label: 'Multiple Selection' },
] as const;

interface Question {
  question: string;
  question_image?: string;
  options: string[];
  option_images?: string[];
  correct_answer: any;
  points: number;
  question_type: string;
}

function getDefaultOptions(type: string): string[] {
  switch (type) {
    case 'true_false': return ['True', 'False'];
    case 'fill_blank': return [];
    case 'short_answer': return [];
    default: return ['', '', '', ''];
  }
}

function getDefaultCorrect(type: string): any {
  return type === 'multiple_selection' ? [] : 0;
}

export default function TeacherQuizzesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', description: '', session_id: '', passing_score: 50, time_limit: 30 });
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [quizzesRes, sessionsRes] = await Promise.all([
      supabase.from('quizzes').select('*, session:sessions(*), questions:quiz_questions(*)').order('created_at', { ascending: false }),
      supabase.from('sessions').select('*').order('title'),
    ]);
    if (quizzesRes.data) setQuizzes(quizzesRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    setLoading(false);
  }

  async function handleSaveQuiz() {
    const { data: quiz } = await supabase.from('quizzes').insert({ ...formData, session_id: formData.session_id || null }).select().single();
    if (quiz && questions.length > 0) {
      const quizQuestions = questions.map((q, i) => ({
        quiz_id: quiz.id,
        question: q.question,
        question_image: q.question_image || null,
        options: q.options,
        option_images: q.option_images || null,
        correct_answer: typeof q.correct_answer === 'object' ? q.correct_answer : q.correct_answer,
        points: q.points || 1,
        question_type: q.question_type || 'multiple_choice',
        order_index: i,
      }));
      await supabase.from('quiz_questions').insert(quizQuestions);
    }
    setShowModal(false);
    setFormData({ title: '', description: '', session_id: '', passing_score: 50, time_limit: 30 });
    setQuestions([]);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this quiz?')) { await supabase.from('quizzes').delete().eq('id', id); fetchData(); }
  }

  function addQuestion() {
    setQuestions([...questions, {
      question: '',
      options: getDefaultOptions('multiple_choice'),
      correct_answer: getDefaultCorrect('multiple_choice'),
      points: 1,
      question_type: 'multiple_choice',
    }]);
  }

  function updateQuestion(index: number, field: string, value: any) {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    if (field === 'question_type') {
      updated[index].options = getDefaultOptions(value);
      updated[index].correct_answer = getDefaultCorrect(value);
      updated[index].question_image = undefined;
      updated[index].option_images = undefined;
    }
    setQuestions(updated);
  }

  function updateOption(index: number, optIndex: number, value: string) {
    const updated = [...questions];
    updated[index].options[optIndex] = value;
    setQuestions(updated);
  }

  async function handleImageUpload(index: number): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  async function addQuestionImage(index: number) {
    const dataUrl = await handleImageUpload(index);
    if (dataUrl) updateQuestion(index, 'question_image', dataUrl);
  }

  async function addOptionImage(index: number, optIndex: number) {
    const dataUrl = await handleImageUpload(index);
    if (dataUrl) {
      const updated = [...questions];
      if (!updated[index].option_images) updated[index].option_images = [];
      updated[index].option_images[optIndex] = dataUrl;
      setQuestions(updated);
    }
  }

  function toggleMultipleSelection(index: number, optIndex: number) {
    const updated = [...questions];
    const current = Array.isArray(updated[index].correct_answer) ? updated[index].correct_answer : [];
    const idx = current.indexOf(optIndex);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(optIndex);
    updated[index].correct_answer = current.sort();
    setQuestions(updated);
  }

  return (
    <DashboardLayout title="Quizzes" subtitle="Create and manage quizzes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Quizzes</h1>
              <p className="text-slate-500">Create and manage quizzes</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Create Quiz</button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div></div>) :
        quizzes.length === 0 ? <div className="col-span-full bg-white rounded-xl p-12 text-center"><p className="text-slate-500">No quizzes yet</p></div> :
        quizzes.map((quiz) => (
          <div key={quiz.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><Users className="text-purple-600" size={24} /></div>
              <button onClick={() => handleDelete(quiz.id)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{quiz.title}</h3>
            <p className="text-sm text-slate-500 mb-3">{quiz.session?.title}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle size={14} />{quiz.questions?.length || 0} questions</span>
              <span className="flex items-center gap-1"><Clock size={14} />{quiz.time_limit} min</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-slate-500">Passing: {quiz.passing_score}%</p>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white"><h2 className="text-lg font-semibold text-slate-800">Create Quiz</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="label">Quiz Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Quiz title" /></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} placeholder="Description" /></div>
              <div><label className="label">Video Lesson</label><select value={formData.session_id} onChange={(e) => setFormData({ ...formData, session_id: e.target.value })} className="input"><option value="">Select Session</option>{sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Passing Score (%)</label><input type="number" value={formData.passing_score} onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })} className="input" /></div>
                <div><label className="label">Time Limit (min)</label><input type="number" value={formData.time_limit} onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) })} className="input" /></div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-slate-800">Questions</h3><button onClick={addQuestion} className="btn-outline text-sm">Add Question</button></div>
                {questions.map((q, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-600">Question {i + 1}</span>
                      <select value={q.question_type} onChange={(e) => updateQuestion(i, 'question_type', e.target.value)} className="input text-sm py-1 w-44">
                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <input type="text" value={q.question} onChange={(e) => updateQuestion(i, 'question', e.target.value)} className="input flex-1" placeholder="Enter question" />
                        <button onClick={() => addQuestionImage(i)} className="p-2 hover:bg-slate-200 rounded-lg" title="Add image">
                          <ImageIcon size={16} className="text-slate-500" />
                        </button>
                      </div>
                      {q.question_image && (
                        <div className="relative mt-2 inline-block">
                          <img src={q.question_image} alt="" className="max-h-32 rounded-lg border" />
                          <button onClick={() => updateQuestion(i, 'question_image', undefined)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
                        </div>
                      )}
                    </div>

                    {q.question_type === 'true_false' && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {['True', 'False'].map((opt, j) => (
                          <label key={j} className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${q.correct_answer === j ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                            <input type="radio" name={`tf-${i}`} checked={q.correct_answer === j} onChange={() => updateQuestion(i, 'correct_answer', j)} className="sr-only" />
                            <span className="font-medium">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.question_type === 'fill_blank' && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                        Students will type the answer. The blank is represented by <code className="bg-blue-100 px-1 rounded">___</code> in the question text.
                      </div>
                    )}

                    {q.question_type === 'short_answer' && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                        Students will write a short answer. This requires manual grading.
                      </div>
                    )}

                    {q.question_type === 'multiple_choice' && (
                      <div className="space-y-2 mb-3">
                        {q.options.map((opt, j) => (
                          <div key={j} className="flex items-center gap-2">
                            <input type="radio" name={`mc-${i}`} checked={q.correct_answer === j} onChange={() => updateQuestion(i, 'correct_answer', j)} className="w-4 h-4 flex-shrink-0" />
                            <input type="text" value={opt} onChange={(e) => updateOption(i, j, e.target.value)} className="input flex-1" placeholder={`Option ${String.fromCharCode(65 + j)}`} />
                            <button onClick={() => addOptionImage(i, j)} className="p-1.5 hover:bg-slate-200 rounded-lg flex-shrink-0" title="Add option image"><ImageIcon size={14} className="text-slate-400" /></button>
                            {q.option_images?.[j] && <span className="text-xs text-green-600">img</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.question_type === 'multiple_selection' && (
                      <div className="space-y-2 mb-3">
                        {q.options.map((opt, j) => {
                          const selected = Array.isArray(q.correct_answer) && q.correct_answer.includes(j);
                          return (
                            <div key={j} className="flex items-center gap-2">
                              <input type="checkbox" checked={selected} onChange={() => toggleMultipleSelection(i, j)} className="w-4 h-4 flex-shrink-0" />
                              <input type="text" value={opt} onChange={(e) => updateOption(i, j, e.target.value)} className="input flex-1" placeholder={`Option ${String.fromCharCode(65 + j)}`} />
                              <button onClick={() => addOptionImage(i, j)} className="p-1.5 hover:bg-slate-200 rounded-lg flex-shrink-0"><ImageIcon size={14} className="text-slate-400" /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.question_type === 'multiple_choice' && q.options.length < 8 && (
                      <button onClick={() => {
                        const updated = [...questions];
                        updated[i].options.push('');
                        setQuestions(updated);
                      }} className="text-xs text-blue-600 hover:text-blue-800">+ Add option</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSaveQuiz} className="btn-primary">Create Quiz</button></div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
