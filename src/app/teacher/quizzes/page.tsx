'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Play, Youtube, Edit, Trash2, X, FileVideo, Clock, Users, CheckCircle } from 'lucide-react';
import type { Session, Subject, Class, Profile } from '@/types';

export default function TeacherQuizzesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', description: '', session_id: '', passing_score: 50, time_limit: 30 });
  const [questions, setQuestions] = useState<{ question: string; options: string[]; correct_answer: number }[]>([]);

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
      const quizQuestions = questions.map((q, i) => ({ ...q, quiz_id: quiz.id, points: 1 }));
      await supabase.from('quiz_questions').insert(quizQuestions);
    }
    setShowModal(false); setFormData({ title: '', description: '', session_id: '', passing_score: 50, time_limit: 30 }); setQuestions([]); fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this quiz?')) { await supabase.from('quizzes').delete().eq('id', id); fetchData(); }
  }

  function addQuestion() {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correct_answer: 0 }]);
  }

  function updateQuestion(index: number, field: string, value: any) {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  }

  function updateOption(index: number, optIndex: number, value: string) {
    const updated = [...questions];
    updated[index].options[optIndex] = value;
    setQuestions(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Quizzes</h1><p className="text-slate-500">Create and manage quizzes</p></div>
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
                    <div className="mb-3"><label className="label">Question {i + 1}</label><input type="text" value={q.question} onChange={(e) => updateQuestion(i, 'question', e.target.value)} className="input" placeholder="Enter question" /></div>
                    <div className="grid grid-cols-2 gap-3 mb-3">{q.options.map((opt, j) => (<div key={j} className="flex items-center gap-2"><input type="radio" name={`correct-${i}`} checked={q.correct_answer === j} onChange={() => updateQuestion(i, 'correct_answer', j)} className="w-4 h-4" /><input type="text" value={opt} onChange={(e) => updateOption(i, j, e.target.value)} className="input" placeholder={`Option ${j + 1}`} /></div>))}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSaveQuiz} className="btn-primary">Create Quiz</button></div>
          </div>
        </div>
      )}
    </div>
  );
}