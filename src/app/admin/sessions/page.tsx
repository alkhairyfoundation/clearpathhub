'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, FileText, Trash2, X, Eye, ArrowLeft, Video, Clock, Users, BookOpen, Loader2, Search, PlayCircle } from 'lucide-react';
import type { Subject } from '@/types';
import FileUpload from '@/components/FileUpload';
import { STORAGE_BUCKETS } from '@/lib/supabase';

export default function AdminSessionsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', video_url: '', video_type: 'youtube' as 'youtube' | 'upload',
    subject_id: '', teacher_id: '', duration: 0, is_published: true,
  });
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [checkpointForm, setCheckpointForm] = useState({
    timestamp_seconds: 0, question: '', options: ['', '', '', ''], correct_answer: 0, points: 1,
  });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [sessionsRes, subjectsRes, teachersRes, classesRes] = await Promise.all([
      supabase.from('sessions').select('*, subject:subjects!subject_id(name), teacher:profiles!teacher_id(first_name, last_name), quiz:quizzes(id, title)').order('created_at', { ascending: false }),
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('profiles').select('id, first_name, last_name').eq('role', 'teacher').order('first_name'),
      supabase.from('classes').select('id, name').order('level'),
    ]);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  }

  async function handleCreateSession() {
    if (!formData.title.trim()) { setError('Title is required'); return; }
    if (!formData.video_url.trim()) { setError('Video URL is required'); return; }
    setError(''); setSaving(true);
    try {
      const { error } = await supabase.from('sessions').insert({
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        video_type: formData.video_type,
        subject_id: formData.subject_id || null,
        teacher_id: formData.teacher_id || null,
        duration: formData.duration || null,
        is_published: formData.is_published,
      });
      if (error) throw new Error(error.message);
      setSuccess('Video lesson created!');
      setShowModal(false);
      setFormData({ title: '', description: '', video_url: '', video_type: 'youtube', subject_id: '', teacher_id: '', duration: 0, is_published: true });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleDeleteSession(id: string) {
    if (!confirm('Delete this video lesson?')) return;
    await supabase.from('sessions').delete().eq('id', id);
    fetchData();
  }

  async function openCheckpoints(session: any) {
    setSelectedSession(session);
    const { data } = await supabase.from('quiz_questions').select('*').eq('session_id', session.id).order('timestamp_seconds');
    setCheckpoints(data || []);
    setShowCheckpointModal(true);
  }

  async function addCheckpoint() {
    if (!selectedSession || !checkpointForm.question.trim()) return;
    setSaving(true);
    
    // First ensure a quiz exists for this session
    let quizId = selectedSession.quiz?.[0]?.id;
    if (!quizId) {
      const { data: quiz } = await supabase.from('quizzes').insert({
        session_id: selectedSession.id,
        title: `${selectedSession.title} - Checkpoint Quiz`,
        passing_score: 80,
      }).select().single();
      if (quiz) quizId = quiz.id;
    }

    if (quizId) {
      await supabase.from('quiz_questions').insert({
        quiz_id: quizId,
        session_id: selectedSession.id,
        question: checkpointForm.question,
        options: checkpointForm.options.filter(o => o.trim()),
        correct_answer: checkpointForm.correct_answer,
        points: checkpointForm.points,
        timestamp_seconds: checkpointForm.timestamp_seconds,
        is_checkpoint: true,
      });
      
      const { data } = await supabase.from('quiz_questions').select('*').eq('session_id', selectedSession.id).order('timestamp_seconds');
      setCheckpoints(data || []);
      setCheckpointForm({ timestamp_seconds: 0, question: '', options: ['', '', '', ''], correct_answer: 0, points: 1 });
    }
    setSaving(false);
  }

  async function deleteCheckpoint(id: string) {
    await supabase.from('quiz_questions').delete().eq('id', id);
    const { data } = await supabase.from('quiz_questions').select('*').eq('session_id', selectedSession.id).order('timestamp_seconds');
    setCheckpoints(data || []);
  }

  const filtered = sessions.filter(s =>
    `${s.title} ${s.subject?.name || ''} ${s.teacher?.first_name || ''} ${s.teacher?.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <DashboardLayout title="Video Lessons" subtitle="Manage all video lessons and checkpoints">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Video Lessons</h1>
              <p className="text-slate-500 mt-1">{sessions.length} video lessons across all teachers</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Video Lesson
          </button>
        </div>

        <div className="card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search video lessons..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-10" />
          </div>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Video className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No video lessons yet</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Create First Video Lesson</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(session => (
              <div key={session.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <PlayCircle className="text-white" size={24} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openCheckpoints(session)} className="p-2 hover:bg-primary-50 rounded-lg" title="Manage Checkpoints">
                      <Clock size={16} className="text-primary-600" />
                    </button>
                    <button onClick={() => handleDeleteSession(session.id)} className="p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{session.title}</h3>
                <p className="text-sm text-slate-500 mb-2">{session.subject?.name || 'No Subject'}</p>
                {session.description && <p className="text-sm text-slate-600 line-clamp-2 mb-3">{session.description}</p>}
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {session.teacher && <span>By: {session.teacher.first_name} {session.teacher.last_name}</span>}
                  {session.duration && <span className="flex items-center gap-1"><Clock size={12} />{session.duration} min</span>}
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${session.is_published ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {session.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Session Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900">Add Video Lesson</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div><label className="label">Title *</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Lesson title" /></div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={formData.video_type === 'youtube'} onChange={() => setFormData({ ...formData, video_type: 'youtube' })} />
                      <span className="text-sm font-medium">YouTube Link</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={formData.video_type === 'upload'} onChange={() => setFormData({ ...formData, video_type: 'upload' })} />
                      <span className="text-sm font-medium">Upload Video</span>
                    </label>
                  </div>

                  {formData.video_type === 'youtube' ? (
                    <div>
                      <label className="label">YouTube URL *</label>
                      <input type="url" value={formData.video_url} onChange={e => setFormData({ ...formData, video_url: e.target.value })} className="input" placeholder="https://youtube.com/watch?v=..." />
                    </div>
                  ) : (
                    <div>
                      <label className="label">Video File *</label>
                      <FileUpload
                        bucket={STORAGE_BUCKETS.VIDEOS}
                        onUpload={(url) => setFormData({ ...formData, video_url: url })}
                        label=""
                        accept="video/*"
                        helperText="Upload MP4, WebM up to 50MB"
                        defaultValue={formData.video_url}
                      />
                      {formData.video_url && (
                        <p className="text-xs text-slate-500 mt-2 truncate">Uploaded: {formData.video_url}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Duration (minutes)</label><input type="number" value={formData.duration} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} className="input" /></div>
                  <div></div>
                </div>
                <div><label className="label">Subject</label><select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="label">Teacher</label><select value={formData.teacher_id} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })} className="input"><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
                <div><label className="label">Description</label><textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} placeholder="Lesson description..." /></div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={formData.is_published} onChange={e => setFormData({ ...formData, is_published: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-medium text-slate-700">Publish immediately</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
                <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleCreateSession} disabled={saving} className="btn-primary disabled:opacity-50 flex items-center gap-2">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : 'Create Lesson'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checkpoints Modal */}
        {showCheckpointModal && selectedSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900">Checkpoints — {selectedSession.title}</h3>
                <button onClick={() => setShowCheckpointModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700">
                  <p className="font-medium">Video Checkpoints</p>
                  <p className="mt-1">Add questions at specific timestamps. Students must answer correctly to continue watching.</p>
                </div>

                {/* Add Checkpoint Form */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
                  <h4 className="font-semibold text-slate-700">Add New Checkpoint</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Timestamp (seconds)</label>
                      <input type="number" value={checkpointForm.timestamp_seconds} onChange={e => setCheckpointForm({ ...checkpointForm, timestamp_seconds: parseInt(e.target.value) || 0 })} className="input" placeholder="e.g., 120" />
                    </div>
                    <div>
                      <label className="label text-xs">Points</label>
                      <input type="number" value={checkpointForm.points} onChange={e => setCheckpointForm({ ...checkpointForm, points: parseInt(e.target.value) || 1 })} className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Question</label>
                    <textarea value={checkpointForm.question} onChange={e => setCheckpointForm({ ...checkpointForm, question: e.target.value })} className="input" rows={2} placeholder="What did you learn about...?" />
                  </div>
                  <div>
                    <label className="label text-xs">Options (select the correct one)</label>
                    {checkpointForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="radio" checked={checkpointForm.correct_answer === i} onChange={() => setCheckpointForm({ ...checkpointForm, correct_answer: i })} />
                        <input type="text" value={opt} onChange={e => { const opts = [...checkpointForm.options]; opts[i] = e.target.value; setCheckpointForm({ ...checkpointForm, options: opts }); }} className="input flex-1" placeholder={`Option ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                  <button onClick={addCheckpoint} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add Checkpoint
                  </button>
                </div>

                {/* Existing Checkpoints */}
                {checkpoints.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-2">{checkpoints.length} Checkpoints</h4>
                    <div className="space-y-2">
                      {checkpoints.map((cp, i) => (
                        <div key={cp.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                                {formatDuration(cp.timestamp_seconds)}
                              </span>
                              <span className="text-xs text-slate-400">{cp.points} pts</span>
                            </div>
                            <p className="text-sm text-slate-800">{cp.question}</p>
                          </div>
                          <button onClick={() => deleteCheckpoint(cp.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
                <button onClick={() => setShowCheckpointModal(false)} className="btn-ghost">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
