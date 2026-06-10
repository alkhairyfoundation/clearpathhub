'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Play, Youtube, Edit, Trash2, X, FileVideo, Clock, CheckCircle, AlertCircle, HelpCircle, Pause, BookOpen, Loader2, Search } from 'lucide-react';
import type { Session, Subject } from '@/types';
import FileUpload from '@/components/FileUpload';
import { STORAGE_BUCKETS } from '@/lib/supabase';

interface VideoCheckpoint {
  id?: string;
  timestamp_seconds: number;
  question: string;
  question_image?: string;
  options: string[];
  option_images?: string[];
  correct_answer: any;
  points: number;
  question_type: string;
}

const CHECKPOINT_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'multiple_selection', label: 'Multiple Selection' },
] as const;

function getDefaultOptionsForType(type: string): string[] {
  switch (type) {
    case 'true_false': return ['True', 'False'];
    case 'fill_blank': return [];
    case 'short_answer': return [];
    default: return ['', '', '', ''];
  }
}

function getDefaultCorrectForType(type: string): any {
  return type === 'multiple_selection' ? [] : 0;
}

export default function TeacherSessionsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedSessionForLesson, setSelectedSessionForLesson] = useState<Session | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    video_type: 'youtube' as 'youtube' | 'upload',
    subject_id: '',
    class_id: '',
    duration: 0,
  });
  const [detectingDuration, setDetectingDuration] = useState(false);
  const [checkpoints, setCheckpoints] = useState<VideoCheckpoint[]>([]);
  const [lessonNotes, setLessonNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const [sessionsRes, subjectsRes, classesRes] = await Promise.all([
        supabase.from('sessions').select('*, subject:subjects!subject_id(*), class:classes!class_id(name), quiz:quizzes(*)').eq('teacher_id', profile?.id).not('video_url', 'is', null).order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('classes').select('id, name').order('level'),
      ]);
      if (sessionsRes.error) throw new Error(sessionsRes.error.message);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (classesRes.data) setClasses(classesRes.data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    setError(''); setSuccess('');
    if (saving) return;
    if (!formData.title.trim()) { setError('Title is required'); return; }
    if (!formData.video_url.trim()) { setError('Video URL is required'); return; }
    setSaving(true);
    try {
      const data = {
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        video_type: formData.video_type,
        subject_id: formData.subject_id || null,
        class_id: formData.class_id || null,
        teacher_id: profile?.id,
        duration: Math.round(formData.duration),
        is_published: true,
      };

      let sessionId = editingSession?.id;

      if (editingSession) {
        const { error } = await supabase.from('sessions').update(data).eq('id', editingSession.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: newSession, error: sessionError } = await supabase.from('sessions').insert(data).select().single();
        if (sessionError) throw new Error(sessionError.message);
        if (newSession) sessionId = newSession.id;
      }

      // Save checkpoints
      if (checkpoints.length > 0 && sessionId) {
        const quizData = {
          session_id: sessionId,
          title: `${formData.title} - Checkpoints`,
          passing_score: 50,
          time_limit: formData.duration,
        };
        
        const { data: existingQuiz } = await supabase
          .from('quizzes')
          .select('id')
          .eq('session_id', sessionId)
          .maybeSingle();

        let quizId = existingQuiz?.id;
        
        if (!quizId) {
          const { data: quiz, error: insErr } = await supabase.from('quizzes').insert(quizData).select().maybeSingle();
          if (quiz) quizId = quiz.id;
          else if (insErr) {
            const { data: retry } = await supabase.from('quizzes').select('id').eq('session_id', sessionId).maybeSingle();
            if (retry) quizId = retry.id;
          }
        }
        
        if (quizId) {
          await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
          const questions = checkpoints.map(cp => ({
            quiz_id: quizId,
            question: cp.question,
            options: cp.options,
            correct_answer: cp.correct_answer,
            points: cp.points || 1,
            question_type: cp.question_type || 'multiple_choice',
            timestamp_seconds: cp.timestamp_seconds,
            is_checkpoint: true,
            order_index: checkpoints.indexOf(cp),
          }));
          await supabase.from('quiz_questions').insert(questions);
        }
      }

      // Save lesson notes if provided
      if (lessonNotes && sessionId) {
        const { data: existingLesson } = await supabase
          .from('lessons')
          .select('id')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (existingLesson) {
          await supabase.from('lessons').update({
            content: lessonNotes,
          }).eq('id', existingLesson.id);
        } else {
          await supabase.from('lessons').insert({
            subject_id: formData.subject_id || null,
            teacher_id: profile?.id,
            session_id: sessionId,
            class_id: formData.class_id || null,
            title: `${formData.title} - Notes`,
            content: lessonNotes,
            is_published: true,
          });
        }
      }

    setSuccess(editingSession ? 'Session updated' : 'Session created');
    setShowModal(false);
    setShowLessonModal(false);
    setFormData({ title: '', description: '', video_url: '', video_type: 'youtube', subject_id: '', class_id: '', duration: 0 });
    setEditingSession(null);
    setCheckpoints([]);
    setLessonNotes('');
    fetchData();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this video lesson?')) {
      await supabase.from('sessions').delete().eq('id', id);
      fetchData();
    }
  }

  function addCheckpoint() {
    const totalSecs = formData.duration * 60 || 300;
    const count = checkpoints.length;
    const newTimestamp = count > 0 ? Math.round(count * (totalSecs / (count + 1))) : 0;
    setCheckpoints([...checkpoints, {
      timestamp_seconds: newTimestamp,
      question: '',
      options: getDefaultOptionsForType('multiple_choice'),
      correct_answer: getDefaultCorrectForType('multiple_choice'),
      points: 1,
      question_type: 'multiple_choice',
    }]);
  }

  function updateCheckpoint(index: number, field: string, value: any) {
    const updated = [...checkpoints];
    (updated[index] as any)[field] = value;
    if (field === 'question_type') {
      updated[index].options = getDefaultOptionsForType(value);
      updated[index].correct_answer = getDefaultCorrectForType(value);
    }
    setCheckpoints(updated);
  }

  function updateCheckpointOption(index: number, optIndex: number, value: string) {
    const updated = [...checkpoints];
    updated[index].options[optIndex] = value;
    setCheckpoints(updated);
  }

  function toggleCheckpointMultiSelect(index: number, optIndex: number) {
    const updated = [...checkpoints];
    const current = Array.isArray(updated[index].correct_answer) ? [...updated[index].correct_answer] : [];
    const pos = current.indexOf(optIndex);
    if (pos >= 0) current.splice(pos, 1);
    else current.push(optIndex);
    updated[index].correct_answer = current.sort();
    setCheckpoints(updated);
  }

  function removeCheckpoint(index: number) {
    setCheckpoints(checkpoints.filter((_, i) => i !== index));
  }

  async function openEditModal(session: Session) {
    setEditingSession(session);
    setFormData({
      title: session.title,
      description: session.description || '',
      video_url: session.video_url || '',
      video_type: session.video_type === 'youtube' ? 'youtube' : 'upload',
      subject_id: session.subject_id || '',
      class_id: session.class_id || '',
      duration: session.duration || 0,
    });
    // Load existing checkpoints
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id')
      .eq('session_id', session.id)
      .maybeSingle();
    if (quiz) {
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('timestamp_seconds', { ascending: true });
      if (questions) {
        setCheckpoints(questions.map(q => ({
          id: q.id,
          timestamp_seconds: q.timestamp_seconds || 0,
          question: q.question,
          options: q.options || [],
          correct_answer: q.correct_answer,
          points: q.points || 1,
          question_type: q.question_type || 'multiple_choice',
        })));
      }
    }
    // Load existing lesson notes
    const { data: lesson } = await supabase
      .from('lessons')
      .select('content')
      .eq('session_id', session.id)
      .maybeSingle();
    setLessonNotes(lesson?.content || '');
    setShowModal(true);
  }

  function extractYouTubeId(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  }

  async function detectVideoDuration() {
    if (!formData.video_url) return;
    setDetectingDuration(true);
    try {
      if (formData.video_type === 'youtube') {
        const videoId = extractYouTubeId(formData.video_url);
        if (!videoId) { setDetectingDuration(false); return; }
        const W = window as any;
        const duration = await new Promise<number>((resolve) => {
          if (typeof W.YT === 'undefined' || !W.YT.Player) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const prevReady = W.onYouTubeIframeAPIReady;
            W.onYouTubeIframeAPIReady = () => {
              W.onYouTubeIframeAPIReady = prevReady || (() => {});
              const el = document.createElement('div');
              el.id = 'yt-detect';
              el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
              document.body.appendChild(el);
              new W.YT.Player('yt-detect', { videoId, height: '1', width: '1', playerVars: { autoplay: 0, controls: 0 }, events: { onReady: (e: any) => { const d = e.target.getDuration(); e.target.destroy(); document.body.removeChild(el); resolve(Math.round(d / 60)); }, onError: () => { document.body.removeChild(el); resolve(0); } } });
            };
            document.head.appendChild(tag);
          } else {
            const el = document.createElement('div');
            el.id = 'yt-detect';
            el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
            document.body.appendChild(el);
            new W.YT.Player('yt-detect', { videoId, height: '1', width: '1', playerVars: { autoplay: 0, controls: 0 }, events: { onReady: (e: any) => { const d = e.target.getDuration(); e.target.destroy(); document.body.removeChild(el); resolve(Math.round(d / 60)); }, onError: () => { document.body.removeChild(el); resolve(0); } } });
          }
        });
        if (duration > 0) setFormData(prev => ({ ...prev, duration }));
      } else {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const dur = await new Promise<number>((resolve) => {
          video.onloadedmetadata = () => { const d = video.duration; URL.revokeObjectURL(video.src); resolve(Math.round(d / 60)); };
          video.onerror = () => resolve(0);
          video.src = formData.video_url;
        });
        if (dur > 0) setFormData(prev => ({ ...prev, duration: dur }));
      }
    } catch { /* ignore */ }
    setDetectingDuration(false);
  }

  useEffect(() => {
    if (formData.video_url && formData.duration === 0) detectVideoDuration();
  }, [formData.video_url]);

  return (
    <DashboardLayout title="Video Lessons" subtitle="Create video lessons with checkpoints and notes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Video Lessons</h1>
            <p className="text-slate-500">Create video lessons with checkpoints and notes</p>
          </div>
          <button
            onClick={() => { 
              setEditingSession(null); 
              setFormData({ title: '', description: '', video_url: '', video_type: 'youtube', subject_id: '', class_id: '', duration: 0 });
              setCheckpoints([]);
              setLessonNotes('');
              setShowModal(true); 
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Add Video Lesson
          </button>
        </div>

      {!loading && (
        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search video lessons..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="input pl-10" />
            </div>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="input w-auto">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="input w-auto">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {(() => {
        const filtered = sessions.filter(s => {
          const matchSearch = !filterSearch || s.title.toLowerCase().includes(filterSearch.toLowerCase());
          const matchSubject = !filterSubject || s.subject_id === filterSubject;
          const matchClass = !filterClass || s.class_id === filterClass;
          return matchSearch && matchSubject && matchClass;
        });
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
            <FileVideo className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-slate-500">No video lessons found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add First Lesson</button>
          </div>
        ) : (
          filtered.map((session) => {
            const youtubeId = session.video_type === 'youtube' ? extractYouTubeId(session.video_url || '') : null;
            const hasCheckpoint = session.quiz && session.quiz.length > 0;
            return (
              <div key={session.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {youtubeId ? (
                  <div className="relative pt-[56.25%] bg-gray-900">
                    <img
                      src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                      alt={session.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="text-red-600 ml-1" size={32} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-[56.25%] bg-gray-900 flex items-center justify-center">
                    <FileVideo className="text-gray-500" size={48} />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 mb-1">{session.title}</h3>
                  <p className="text-sm text-slate-500">{session.subject?.name}{session.class?.name ? ` • ${session.class.name}` : ''} • {session.duration || '?'} min</p>
                  <div className="flex items-center gap-2 mt-2">
                    {hasCheckpoint && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        <CheckCircle size={12} /> Checkpoints
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-3">
                    <button onClick={() => openEditModal(session)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Edit size={16} className="text-slate-600" />
                    </button>
                    <button onClick={() => handleDelete(session.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  })()}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-800">{editingSession ? 'Edit' : 'New'} Video Lesson</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="label">Title</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Lesson title" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} placeholder="Lesson description" />
              </div>
              <div>
                <label className="label">Subject</label>
                <select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="input">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class</label>
                <select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="input">
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
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
                    <input type="url" value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} className="input" placeholder="https://youtube.com/watch?v=..." />
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
              <div>
                <label className="label">Duration</label>
                {detectingDuration ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Detecting video duration...</div>
                ) : formData.duration > 0 ? (
                  <div className="flex items-center gap-2 text-sm"><span className="font-medium">{formData.duration} minutes</span>
                    {formData.video_url && <button type="button" onClick={detectVideoDuration} className="text-primary-600 text-xs hover:underline">Re-detect</button>}
                  </div>
                ) : formData.video_url ? (
                  <button type="button" onClick={detectVideoDuration} className="btn-outline text-sm">Detect Video Duration</button>
                ) : (
                  <p className="text-sm text-slate-400">Enter or upload a video to auto-detect duration</p>
                )}
              </div>

              {/* CHECKPOINTS SECTION */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <HelpCircle size={18} className="text-primary-600" />
                      Video Checkpoints
                    </h3>
                    <p className="text-sm text-slate-500">Set questions at specific timestamps during the video</p>
                  </div>
                  <button type="button" onClick={addCheckpoint} className="btn-outline text-sm">
                    + Add Checkpoint
                  </button>
                </div>

                {checkpoints.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <Clock className="mx-auto text-gray-400 mb-2" size={24} />
                    <p className="text-sm text-slate-500">No checkpoints added. Add questions that will appear during video playback.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {checkpoints.map((cp, i) => (
                      <div key={i} className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-primary-700">Checkpoint {i + 1}</span>
                          <div className="flex items-center gap-2">
                            <select value={cp.question_type} onChange={(e) => updateCheckpoint(i, 'question_type', e.target.value)} className="input text-xs py-1 w-36">
                              {CHECKPOINT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <button type="button" onClick={() => removeCheckpoint(i)} className="text-red-500 hover:text-red-700">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="col-span-2">
                            <label className="label text-xs">Timestamp (seconds into video)</label>
                            <input 
                              type="number" 
                              value={cp.timestamp_seconds} 
                              onChange={(e) => updateCheckpoint(i, 'timestamp_seconds', parseInt(e.target.value))}
                              className="input"
                              min={0}
                              max={formData.duration * 60 || 99999}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              Video is {formData.duration || '?'} min = {(formData.duration || 0) * 60 || '?'} seconds
                            </p>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="label text-xs">Question</label>
                          <input 
                            type="text" 
                            value={cp.question} 
                            onChange={(e) => updateCheckpoint(i, 'question', e.target.value)}
                            className="input"
                            placeholder="Enter checkpoint question"
                          />
                        </div>

                        {cp.question_type === 'true_false' && (
                          <div>
                            <label className="label text-xs">Correct Answer</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['True', 'False'].map((opt, j) => (
                                <label key={j} className={`p-2 rounded-lg border-2 cursor-pointer text-center text-sm transition-all ${cp.correct_answer === j ? 'border-primary-500 bg-primary-100' : 'border-slate-200 bg-white'}`}>
                                  <input type="radio" name={`cp-tf-${i}`} checked={cp.correct_answer === j} onChange={() => updateCheckpoint(i, 'correct_answer', j)} className="sr-only" />
                                  <span className="font-medium">{opt}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {cp.question_type === 'fill_blank' && (
                          <div>
                            <label className="label text-xs">Correct Answer</label>
                            <input
                              type="text"
                              value={typeof cp.correct_answer === 'string' ? cp.correct_answer : ''}
                              onChange={(e) => updateCheckpoint(i, 'correct_answer', e.target.value)}
                              className="input"
                              placeholder="e.g., photosynthesis"
                            />
                            <p className="text-xs text-slate-500 mt-1">Use <code className="bg-slate-200 px-1 rounded">___</code> in the question text to mark the blank.</p>
                          </div>
                        )}

                        {cp.question_type === 'short_answer' && (
                          <div>
                            <label className="label text-xs">Expected Answer (case-insensitive)</label>
                            <textarea
                              value={typeof cp.correct_answer === 'string' ? cp.correct_answer : ''}
                              onChange={(e) => updateCheckpoint(i, 'correct_answer', e.target.value)}
                              className="input"
                              rows={2}
                              placeholder="Enter the expected answer or keywords"
                            />
                          </div>
                        )}

                        {cp.question_type === 'multiple_choice' && (
                          <div>
                            <label className="label text-xs">Options (select correct answer)</label>
                            {cp.options.map((opt, optI) => (
                              <div key={optI} className="flex items-center gap-2 mb-2">
                                <input 
                                  type="radio" 
                                  name={`cp-correct-${i}`}
                                  checked={cp.correct_answer === optI}
                                  onChange={() => updateCheckpoint(i, 'correct_answer', optI)}
                                  className="w-4 h-4 flex-shrink-0"
                                />
                                <input 
                                  type="text" 
                                  value={opt} 
                                  onChange={(e) => updateCheckpointOption(i, optI, e.target.value)}
                                  className="input flex-1"
                                  placeholder={`Option ${optI + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {cp.question_type === 'multiple_selection' && (
                          <div>
                            <label className="label text-xs">Options (check correct answers)</label>
                            {cp.options.map((opt, optI) => (
                              <div key={optI} className="flex items-center gap-2 mb-2">
                                <input 
                                  type="checkbox"
                                  checked={Array.isArray(cp.correct_answer) && cp.correct_answer.includes(optI)}
                                  onChange={() => toggleCheckpointMultiSelect(i, optI)}
                                  className="w-4 h-4 flex-shrink-0"
                                />
                                <input 
                                  type="text" 
                                  value={opt} 
                                  onChange={(e) => updateCheckpointOption(i, optI, e.target.value)}
                                  className="input flex-1"
                                  placeholder={`Option ${optI + 1}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LESSON NOTES SECTION */}
              <div className="border-t pt-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <BookOpen size={18} className="text-green-600" />
                    Lesson Notes
                  </h3>
                  <p className="text-sm text-slate-500">Add notes for students to read alongside the video</p>
                </div>
                <textarea 
                  value={lessonNotes} 
                  onChange={(e) => setLessonNotes(e.target.value)} 
                  className="input" 
                  rows={8}
                  placeholder="Write your lesson notes here...

# Topics Covered
- Topic 1
- Topic 2

# Key Points
1. Important point
2. Another point

# Additional Resources
[Links to additional materials]"
                />
                <p className="text-xs text-slate-500 mt-2">Supports Markdown formatting</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white">
              <button onClick={() => { setShowModal(false); setSaving(false); }} className="btn-outline">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50 flex items-center gap-2">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : (editingSession ? 'Update' : 'Create') + ' Lesson'}
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}