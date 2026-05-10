'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Play, Youtube, Edit, Trash2, X, FileVideo, Clock, CheckCircle, AlertCircle, HelpCircle, Pause, BookOpen } from 'lucide-react';
import type { Session, Subject } from '@/types';

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
    duration: 30,
  });
  const [checkpoints, setCheckpoints] = useState<VideoCheckpoint[]>([]);
  const [lessonNotes, setLessonNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      const [sessionsRes, subjectsRes] = await Promise.all([
        supabase.from('sessions').select('*, subject:subjects!subject_id(*), quiz:quizzes(*)').order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('name'),
      ]);
      if (sessionsRes.error) throw new Error(sessionsRes.error.message);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    setError(''); setSuccess('');
    try {
      const data = {
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        video_type: formData.video_type,
        subject_id: formData.subject_id || null,
        teacher_id: profile?.id,
        duration: parseInt(formData.duration.toString()),
        is_published: true,
      };

      if (editingSession) {
        const { error } = await supabase.from('sessions').update(data).eq('id', editingSession.id);
        if (error) throw new Error(error.message);
      } else {
        const { data: newSession, error: sessionError } = await supabase.from('sessions').insert(data).select().single();
        if (sessionError) throw new Error(sessionError.message);
      }

      // Save checkpoints
      if (checkpoints.length > 0) {
        const sessionId = editingSession?.id;
        if (sessionId) {
          const quizData = {
            session_id: sessionId,
            title: `${formData.title} - Checkpoints`,
            passing_score: 50,
            time_limit: formData.duration,
          };
          const { data: quiz } = await supabase.from('quizzes').insert(quizData).select().single();
          if (quiz) {
            await supabase.from('quiz_questions').delete().eq('quiz_id', quiz.id);
            const questions = checkpoints.map(cp => ({
              quiz_id: quiz.id,
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
      }

    // Save lesson notes if provided
    if (selectedSessionForLesson && lessonNotes) {
      await supabase.from('lessons').insert({
        subject_id: formData.subject_id || null,
        teacher_id: profile?.id,
        title: `${formData.title} - Notes`,
        content: lessonNotes,
        is_published: true,
      });
    }

    setSuccess(editingSession ? 'Session updated' : 'Session created');
    setShowModal(false);
    setShowLessonModal(false);
    setFormData({ title: '', description: '', video_url: '', video_type: 'youtube', subject_id: '', duration: 30 });
    setEditingSession(null);
    setCheckpoints([]);
    setLessonNotes('');
    fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this video lesson?')) {
      await supabase.from('sessions').delete().eq('id', id);
      fetchData();
    }
  }

  function addCheckpoint() {
    const duration = parseInt(formData.duration.toString()) || 60;
    const count = checkpoints.length;
    const newTimestamp = count > 0 ? Math.round(count * (duration / (count + 1))) : 0;
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

  function extractYouTubeId(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  }

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
              setFormData({ title: '', description: '', video_url: '', video_type: 'youtube', subject_id: '', duration: 30 });
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))
        ) : sessions.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
            <FileVideo className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-slate-500">No video lessons found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add First Lesson</button>
          </div>
        ) : (
          sessions.map((session) => {
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
                  <p className="text-sm text-slate-500">{session.subject?.name} • {session.duration} min</p>
                  <div className="flex items-center gap-2 mt-2">
                    {hasCheckpoint && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        <CheckCircle size={12} /> Checkpoints
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 mt-3">
                    <button onClick={() => { setEditingSession(session); setFormData({ title: session.title, description: session.description || '', video_url: session.video_url || '', video_type: session.video_type === 'youtube' ? 'youtube' : 'upload', subject_id: session.subject_id || '', duration: session.duration || 30 }); setShowModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg">
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
                <label className="label">Video Type</label>
                <select value={formData.video_type} onChange={(e) => setFormData({ ...formData, video_type: e.target.value as any })} className="input">
                  <option value="youtube">YouTube</option>
                  <option value="upload">Direct Upload</option>
                </select>
              </div>
              <div>
                <label className="label">{formData.video_type === 'youtube' ? 'YouTube URL' : 'Video URL'}</label>
                <input type="url" value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} className="input" placeholder={formData.video_type === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'} />
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} className="input" min={1} />
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
                              max={parseInt(formData.duration.toString()) * 60}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                              Video is {formData.duration} min = {parseInt(formData.duration.toString()) * 60} seconds
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
                          <div className="p-3 bg-white rounded-lg border text-sm text-slate-600">
                            Students will type the answer. The blank is represented by <code className="bg-slate-200 px-1 rounded">___</code> in the question text.
                          </div>
                        )}

                        {cp.question_type === 'short_answer' && (
                          <div className="p-3 bg-white rounded-lg border text-sm text-slate-600">
                            Students will write a short answer. This requires manual review.
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
              <button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
              <button onClick={handleSave} className="btn-primary">
                {editingSession ? 'Update' : 'Create'} Lesson
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}