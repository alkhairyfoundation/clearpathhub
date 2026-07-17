'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, FileText, Trash2, X, ArrowLeft, Paperclip, Search, Eye, Loader2, HelpCircle, CheckCircle, Pencil } from 'lucide-react';
import type { Lesson, Subject } from '@/types';
import FileUpload from '@/components/FileUpload';
import { STORAGE_BUCKETS } from '@/lib/supabase';

export default function AdminLessonsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<(Lesson & { subject?: Subject, teacher?: { first_name: string, last_name: string } })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [formData, setFormData] = useState({ title: '', content: '', subject_id: '', teacher_id: '', class_id: '', attachments: '' });
  const [quizForm, setQuizForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: 0, points: 1 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [lessonsRes, subjectsRes, teachersRes, classesRes] = await Promise.all([
      supabase.from('lessons').select('*, subject:subjects!subject_id(*), teacher:profiles!teacher_id(first_name, last_name), class:classes!class_id(name)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('profiles').select('id, first_name, last_name').eq('role', 'teacher').order('first_name'),
      supabase.from('classes').select('id, name, level').order('name'),
    ]);
    if (lessonsRes.data) setLessons(lessonsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  }

  function handleEdit(lesson: any) {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title || '',
      content: lesson.content || '',
      subject_id: lesson.subject_id || '',
      teacher_id: lesson.teacher_id || '',
      class_id: lesson.class_id || '',
      attachments: (lesson.attachments || []).join(','),
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.title.trim()) { setError('Title is required'); return; }
    setError(''); setSaving(true);
    try {
      const data = {
        title: formData.title, content: formData.content,
        subject_id: formData.subject_id || null,
        teacher_id: formData.teacher_id || null,
        class_id: formData.class_id || null,
        attachments: formData.attachments ? formData.attachments.split(',').map(a => a.trim()) : [],
        is_published: true,
      };

      if (editingLesson) {
        const { error } = await supabase.from('lessons').update(data).eq('id', editingLesson.id);
        if (error) throw new Error(error.message);
        setSuccess('Lesson updated');
      } else {
        const { error } = await supabase.from('lessons').insert(data);
        if (error) throw new Error(error.message);
        setSuccess('Lesson created');
      }

      setShowModal(false);
      setEditingLesson(null);
      setFormData({ title: '', content: '', subject_id: '', teacher_id: '', class_id: '', attachments: '' });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lesson?')) return;
    await supabase.from('lessons').delete().eq('id', id);
    setSuccess('Lesson deleted');
    fetchData();
    setTimeout(() => setSuccess(''), 3000);
  }

  async function ensureSessionForLesson(lesson: any): Promise<string | null> {
    if (lesson.session_id) return lesson.session_id;
    const { data: newSession } = await supabase.from('sessions').insert({
      title: lesson.title,
      subject_id: lesson.subject_id || null,
      class_id: lesson.class_id || null,
      teacher_id: lesson.teacher_id || profile?.id,
      is_published: true,
    }).select('id').single();
    if (!newSession) return null;
    await supabase.from('lessons').update({ session_id: newSession.id }).eq('id', lesson.id);
    lesson.session_id = newSession.id;
    return newSession.id;
  }

  async function openQuizManager(lesson: any) {
    setSelectedLesson(lesson);
    const sessionId = lesson.session_id;
    const { data: bySession } = await supabase.from('quizzes').select('id').eq('session_id', sessionId);
    let questions: any[] = [];
    if (bySession?.length) {
      const { data: qq } = await supabase.from('quiz_questions').select('*').in('quiz_id', bySession.map(q => q.id)).order('created_at');
      questions = qq || [];
    }
    setQuizQuestions(questions);
    setShowQuizModal(true);
  }

  async function addQuizQuestion() {
    if (!selectedLesson || !quizForm.question.trim()) return;
    setSaving(true);
    const sessionId = await ensureSessionForLesson(selectedLesson);
    if (!sessionId) { setError('Could not create session for lesson'); setSaving(false); return; }
    setError('');
    let quizId = null;
    const { data: existing } = await supabase.from('quizzes').select('id').eq('session_id', sessionId).maybeSingle();
    if (existing) { quizId = existing.id; }
    else {
      const { data: nq, error: insErr } = await supabase.from('quizzes').insert({ session_id: sessionId, title: `${selectedLesson.title} Quiz`, passing_score: 60 }).select('id').maybeSingle();
      if (nq) quizId = nq.id;
      else if (insErr) {
        const { data: retry } = await supabase.from('quizzes').select('id').eq('session_id', sessionId).maybeSingle();
        if (retry) quizId = retry.id;
      }
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
    if (selectedLesson) { openQuizManager(selectedLesson); }
  }

  const filtered = lessons.filter(l => {
    const matchSearch = `${l.title} ${l.subject?.name || ''} ${l.teacher?.first_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = !filterSubject || l.subject_id === filterSubject;
    const matchTeacher = !filterTeacher || l.teacher_id === filterTeacher;
    const matchClass = !filterClass || l.class_id === filterClass;
    return matchSearch && matchSubject && matchTeacher && matchClass;
  });

  return (
    <DashboardLayout title="Lesson Notes" subtitle="Create and manage lesson notes with quizzes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></button>
            <div><h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Lesson Notes</h1><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">{lessons.length} lessons</p></div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Add Lesson</button>
        </div>

        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Search lessons..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-10" /></div>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="input w-auto">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="input w-auto">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} className="input w-auto">
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
        </div>

        {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm">{success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div></div>) :
          filtered.length === 0 ? <div className="col-span-full bg-white rounded-xl p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No lessons yet</p></div> :
          filtered.map(lesson => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center"><FileText className="text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" size={24} /></div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(lesson)} className="p-2 hover:bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 rounded-lg" title="Edit Lesson"><Pencil size={16} className="text-primary-500" /></button>
                  <button onClick={() => openQuizManager(lesson)} className="p-2 hover:bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 rounded-lg" title="Manage Quiz"><HelpCircle size={16} className="text-primary-500" /></button>
                  <button onClick={() => handleDelete(lesson.id)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><Trash2 size={16} className="text-red-500 dark:text-red-400 dark:text-red-400" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-1">{lesson.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-3">{lesson.subject?.name}{lesson.class?.name ? ` — ${lesson.class.name}` : ''}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 line-clamp-3 mb-4">{lesson.content?.replace(/<[^>]*>/g, '').substring(0, 300)}</p>
              {lesson.attachments && lesson.attachments.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400"><Paperclip size={14} /><span>{lesson.attachments.length} attachment(s)</span></div>
              )}
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
                By: {lesson.teacher?.first_name && lesson.teacher?.last_name ? `${lesson.teacher.first_name} ${lesson.teacher.last_name}` : 'Unassigned'}
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Lesson Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</h2>
                <button onClick={() => { setShowModal(false); setEditingLesson(null); setFormData({ title: '', content: '', subject_id: '', teacher_id: '', class_id: '', attachments: '' }); }} className="p-2 hover:bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="label">Title *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Lesson title" /></div>
                <div><label className="label">Subject</label><select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="label">Teacher</label><select value={formData.teacher_id} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })} className="input"><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
                <div><label className="label">Class *</label><select value={formData.class_id} onChange={e => setFormData({ ...formData, class_id: e.target.value })} className="input"><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="label">Content (Markdown supported)</label><textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="input" rows={8} placeholder="Lesson content..." /></div>
                
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
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg text-xs group">
                          <Paperclip size={12} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />
                          <span className="max-w-[150px] truncate">{url.split('/').pop()}</span>
                          <button 
                            onClick={() => {
                              const filtered = formData.attachments.split(',').filter(Boolean).filter((_, idx) => idx !== i);
                              setFormData({ ...formData, attachments: filtered.join(',') });
                            }}
                            className="text-red-500 dark:text-red-400 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">{saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : editingLesson ? 'Update' : 'Publish'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Manager Modal */}
        {showQuizModal && selectedLesson && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">Quiz — {selectedLesson.title}</h2>
                <button onClick={() => setShowQuizModal(false)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-900/40 dark:border-primary-900/40 rounded-lg text-sm text-primary-700 dark:text-primary-300 dark:text-primary-300">
                  <p className="font-medium">Lesson Quiz</p>
                  <p className="mt-1">Add quiz questions that students must answer after reading this lesson note.</p>
                </div>

                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-xl">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300">Add Question</h4>
                  <div><label className="label text-xs">Question</label><textarea value={quizForm.question} onChange={e => setQuizForm({ ...quizForm, question: e.target.value })} className="input" rows={2} placeholder="Ask a question..." /></div>
                  <div>
                    <label className="label text-xs">Options (select correct)</label>
                    {quizForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="radio" checked={quizForm.correct_answer === i} onChange={() => setQuizForm({ ...quizForm, correct_answer: i })} />
                        <input type="text" value={opt} onChange={e => { const opts = [...quizForm.options]; opts[i] = e.target.value; setQuizForm({ ...quizForm, options: opts }); }} className="input flex-1" placeholder={`Option ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                  <button onClick={addQuizQuestion} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Question
                  </button>
                </div>

                {quizQuestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">{quizQuestions.length} Questions</h4>
                    <div className="space-y-2">
                      {quizQuestions.map((q, i) => (
                        <div key={q.id} className="p-3 bg-white rounded-lg border border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">Q{i + 1}: {q.question}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">{q.options?.length || 0} options · {q.points} pts</p>
                          </div>
                          <button onClick={() => deleteQuizQuestion(q.id)} className="p-1.5 hover:bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 rounded-lg"><Trash2 size={14} className="text-red-500 dark:text-red-400 dark:text-red-400" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowQuizModal(false)} className="btn-ghost">Close</button></div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}