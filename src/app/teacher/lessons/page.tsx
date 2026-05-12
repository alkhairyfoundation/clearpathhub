'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, FileText, Trash2, X, ArrowLeft, Paperclip, Search, HelpCircle, Loader2 } from 'lucide-react';
import type { Lesson, Subject } from '@/types';
import FileUpload from '@/components/FileUpload';
import { STORAGE_BUCKETS } from '@/lib/supabase';

export default function TeacherLessonsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<(Lesson & { subject?: Subject })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ title: '', content: '', subject_id: '', attachments: '' });
  const [quizForm, setQuizForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: 0, points: 1 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [lessonsRes, subjectsRes] = await Promise.all([
      supabase.from('lessons').select('*, subject:subjects!subject_id(*)').eq('teacher_id', profile?.id).order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
    ]);
    if (lessonsRes.data) setLessons(lessonsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.title.trim()) { setError('Title is required'); return; }
    setError(''); setSaving(true);
    try {
      const { error } = await supabase.from('lessons').insert({
        title: formData.title, content: formData.content,
        subject_id: formData.subject_id || null, teacher_id: profile?.id,
        attachments: formData.attachments ? formData.attachments.split(',').map(a => a.trim()) : [],
        is_published: true,
      });
      if (error) throw new Error(error.message);
      setSuccess('Lesson created');
      setShowModal(false);
      setFormData({ title: '', content: '', subject_id: '', attachments: '' });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lesson?')) return;
    await supabase.from('lessons').delete().eq('id', id);
    fetchData();
  }

  async function openQuizManager(lesson: any) {
    setSelectedLesson(lesson);
    const { data: quizzes } = await supabase.from('quizzes').select('id').eq('session_id', lesson.id);
    let questions: any[] = [];
    if (quizzes?.length) {
      const { data } = await supabase.from('quiz_questions').select('*').in('quiz_id', quizzes.map(q => q.id)).order('created_at');
      questions = data || [];
    }
    setQuizQuestions(questions);
    setShowQuizModal(true);
  }

  async function addQuizQuestion() {
    if (!selectedLesson || !quizForm.question.trim()) return;
    setSaving(true);
    let quizId = null;
    const { data: existing } = await supabase.from('quizzes').select('id').eq('session_id', selectedLesson.id).limit(1);
    if (existing?.length) { quizId = existing[0].id; }
    else {
      const { data: nq } = await supabase.from('quizzes').insert({ session_id: selectedLesson.id, title: `${selectedLesson.title} Quiz`, passing_score: 60 }).select().single();
      if (nq) quizId = nq.id;
    }
    if (quizId) {
      await supabase.from('quiz_questions').insert({
        quiz_id: quizId, question: quizForm.question,
        options: quizForm.options.filter(o => o.trim()),
        correct_answer: quizForm.correct_answer, points: quizForm.points,
      });
      const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quizId).order('created_at');
      setQuizQuestions(data || []);
      setQuizForm({ question: '', options: ['', '', '', ''], correct_answer: 0, points: 1 });
    }
    setSaving(false);
  }

  async function deleteQuizQuestion(id: string) {
    await supabase.from('quiz_questions').delete().eq('id', id);
    if (selectedLesson) openQuizManager(selectedLesson);
  }

  const filtered = lessons.filter(l => `${l.title} ${l.subject?.name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <DashboardLayout title="Lesson Notes" subtitle="Create and share lesson notes with quizzes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div><h1 className="text-2xl font-bold text-slate-800">Lesson Notes</h1><p className="text-slate-500">{lessons.length} lessons</p></div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Add Lesson</button>
        </div>

        <div className="card p-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Search lessons..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-10" /></div>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div></div>) :
          filtered.length === 0 ? <div className="col-span-full bg-white rounded-xl p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No lessons yet</p></div> :
          filtered.map(lesson => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center"><FileText className="text-emerald-600" size={24} /></div>
                <div className="flex gap-1">
                  <button onClick={() => openQuizManager(lesson)} className="p-2 hover:bg-primary-50 rounded-lg" title="Manage Quiz"><HelpCircle size={16} className="text-primary-500" /></button>
                  <button onClick={() => handleDelete(lesson.id)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{lesson.title}</h3>
              <p className="text-sm text-slate-500 mb-3">{lesson.subject?.name}</p>
              <p className="text-sm text-slate-600 line-clamp-3 mb-4">{lesson.content}</p>
              {lesson.attachments && lesson.attachments.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500"><Paperclip size={14} /><span>{lesson.attachments.length} attachment(s)</span></div>
              )}
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Add Lesson</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
              <div className="p-6 space-y-4">
                <div><label className="label">Title *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Lesson title" /></div>
                <div><label className="label">Subject</label><select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="label">Content</label><textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="input" rows={8} placeholder="Lesson content..." /></div>
                
                <div className="space-y-3">
                  <label className="label">Attachments</label>
                  <FileUpload
                    bucket={STORAGE_BUCKETS.LESSONS}
                    onUpload={(url) => {
                      const current = formData.attachments ? formData.attachments.split(',').filter(Boolean) : [];
                      setFormData({ ...formData, attachments: [...current, url].join(',') });
                    }}
                    label=""
                    accept="*"
                    helperText="Upload PDFs, Images, or Documents"
                  />
                  
                  {formData.attachments && formData.attachments.split(',').filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.attachments.split(',').filter(Boolean).map((url, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg text-xs group">
                          <Paperclip size={12} className="text-slate-400" />
                          <span className="max-w-[150px] truncate">{url.split('/').pop()}</span>
                          <button 
                            onClick={() => {
                              const filtered = formData.attachments.split(',').filter(Boolean).filter((_, idx) => idx !== i);
                              setFormData({ ...formData, attachments: filtered.join(',') });
                            }}
                            className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t">
                <button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Publish'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Modal */}
        {showQuizModal && selectedLesson && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-lg font-semibold text-slate-800">Quiz — {selectedLesson.title}</h2>
                <button onClick={() => setShowQuizModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                  <h4 className="font-semibold text-slate-700">Add Question</h4>
                  <div><textarea value={quizForm.question} onChange={e => setQuizForm({ ...quizForm, question: e.target.value })} className="input" rows={2} placeholder="Question..." /></div>
                  <div>
                    {quizForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="radio" checked={quizForm.correct_answer === i} onChange={() => setQuizForm({ ...quizForm, correct_answer: i })} />
                        <input type="text" value={opt} onChange={e => { const opts = [...quizForm.options]; opts[i] = e.target.value; setQuizForm({ ...quizForm, options: opts }); }} className="input flex-1" placeholder={`Option ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                  <button onClick={addQuizQuestion} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
                  </button>
                </div>
                {quizQuestions.length > 0 && (
                  <div className="space-y-2">
                    {quizQuestions.map((q, i) => (
                      <div key={q.id} className="p-3 bg-white rounded-lg border flex items-center justify-between">
                        <div><p className="text-sm font-medium">Q{i + 1}: {q.question}</p><p className="text-xs text-slate-400">{q.options?.length} options · {q.points} pts</p></div>
                        <button onClick={() => deleteQuizQuestion(q.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-500" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end p-6 border-t"><button onClick={() => setShowQuizModal(false)} className="btn-ghost">Close</button></div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}