'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Play, FileText, Clock, CheckCircle, XCircle, HelpCircle, BookOpen, Pause, PlayCircle } from 'lucide-react';

interface CheckpointQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  timestamp_seconds: number;
}

export default function StudentSessionsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [checkpointActive, setCheckpointActive] = useState(false);
  const [currentCheckpoint, setCurrentCheckpoint] = useState<CheckpointQuestion | null>(null);
  const [checkpointAnswers, setCheckpointAnswers] = useState<number[]>([]);
  const [checkpointScore, setCheckpointScore] = useState<number | null>(null);
  const [lessonNotes, setLessonNotes] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [sessionsRes, quizzesRes] = await Promise.all([
      supabase.from('sessions').select('*, subject:subjects(*), quiz:quizzes(*)').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('quizzes').select('*, quiz_attempts(*)').order('created_at', { ascending: false }),
    ]);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (quizzesRes.data) setQuizzes(quizzesRes.data);
    setLoading(false);
  }

  async function fetchLessonNotes(subjectId: string) {
    const { data } = await supabase.from('lessons').select('*').eq('subject_id', subjectId).eq('is_published', true).order('created_at', { ascending: false });
    if (data) setLessonNotes(data);
  }

  function extractYouTubeId(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  }

  function handlePlaySession(session: any) {
    setSelectedSession(session);
    setShowVideo(true);
    setCheckpointActive(false);
    setCurrentCheckpoint(null);
    setCheckpointAnswers([]);
    setCheckpointScore(null);
    
    if (session.subject_id) {
      fetchLessonNotes(session.subject_id);
    }
    
    // Get checkpoint questions from quizzes
    if (session.quiz && session.quiz.length > 0) {
      const checkpointQuiz = session.quiz[0];
      if (checkpointQuiz.quiz_questions) {
        // Load checkpoint in background
      }
    }
  }

  function handleVideoTimeUpdate() {
    if (!selectedSession?.quiz || selectedSession.quiz.length === 0 || checkpointActive) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    const currentTime = Math.floor(video.currentTime);
    const checkpointQuiz = selectedSession.quiz[0];
    
    if (checkpointQuiz?.quiz_questions) {
      const cp = checkpointQuiz.quiz_questions.find((q: any) => Math.abs(q.timestamp_seconds - currentTime) <= 2);
      if (cp) {
        setCurrentCheckpoint(cp);
        setCheckpointActive(true);
        video.pause();
      }
    }
  }

  function handleCheckpointAnswer(optionIndex: number) {
    if (!currentCheckpoint) return;
    
    const newAnswers = [...checkpointAnswers, optionIndex];
    setCheckpointAnswers(newAnswers);
    
    // Check if correct
    const isCorrect = optionIndex === currentCheckpoint.correct_answer;
    
    if (isCorrect) {
      setCheckpointActive(false);
      setCurrentCheckpoint(null);
      videoRef.current?.play();
    } else {
      // Allow retry or mark wrong
      alert('Incorrect! Watch the video again from this point.');
    }
  }

  function handleCloseVideo() {
    setShowVideo(false);
    setSelectedSession(null);
    setCheckpointActive(false);
    setCurrentCheckpoint(null);
    setLessonNotes([]);
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Video Lessons</h1><p className="text-slate-500">Watch lessons and complete checkpoint quizzes</p></div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const youtubeId = session.video_type === 'youtube' ? extractYouTubeId(session.video_url || '') : null;
            const hasCheckpoint = session.quiz && session.quiz.length > 0;
            return (
              <div key={session.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handlePlaySession(session)}>
                {youtubeId ? (
                  <div className="relative pt-[56.25%] bg-gray-900">
                    <img src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt={session.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center"><Play className="text-red-600 ml-1" size={32} /></div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-[56.25%] bg-gray-900 flex items-center justify-center cursor-pointer"><Play className="text-gray-500" size={48} /></div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 mb-1">{session.title}</h3>
                  <p className="text-sm text-slate-500">{session.subject?.name} • {session.duration} min</p>
                  {hasCheckpoint && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                      <HelpCircle size={12} /> Has checkpoint quiz
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIDEO PLAYER MODAL */}
      {showVideo && selectedSession && (
        <div className="fixed inset-0 bg-black z-50 flex">
          <div className="flex-1 relative">
            {selectedSession.video_type === 'youtube' && extractYouTubeId(selectedSession.video_url) ? (
              <iframe
                ref={videoRef as any}
                src={`https://www.youtube.com/embed/${extractYouTubeId(selectedSession.video_url)}?enablejsapi=1`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                src={selectedSession.video_url}
                className="absolute inset-0 w-full h-full object-contain"
                controls
                onTimeUpdate={handleVideoTimeUpdate}
              />
            )}
            
            {/* CHECKPOINT OVERLAY */}
            {checkpointActive && currentCheckpoint && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8">
                <div className="bg-white rounded-xl max-w-xl w-full p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <HelpCircle className="text-yellow-500" size={24} />
                    <span className="text-yellow-600 font-medium">Checkpoint!</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">{currentCheckpoint.question}</h3>
                  <div className="space-y-3">
                    {currentCheckpoint.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleCheckpointAnswer(i)}
                        className="w-full p-4 rounded-lg text-left border hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                      </button>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 mt-4">Watch the video carefully to answer this question</p>
                </div>
              </div>
            )}
            
            {/* LESSON NOTES SIDEBAR TOGGLE */}
            <button className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-lg" onClick={() => setLessonNotes([])}>
              <BookOpen size={20} />
            </button>

            {/* CLOSE BUTTON */}
            <button onClick={handleCloseVideo} className="absolute top-4 left-4 z-10 p-2 bg-white/90 rounded-lg">
              <XCircle size={20} />
            </button>
          </div>

          {/* LESSON NOTES PANEL */}
          {lessonNotes.length > 0 && (
            <div className="w-96 bg-white overflow-y-auto p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BookOpen size={20} className="text-green-600" />
                Lesson Notes
              </h2>
              <div className="space-y-4">
                {lessonNotes.map((note: any) => (
                  <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-slate-800 mb-2">{note.title}</h3>
                    <div className="prose prose-sm max-w-none text-slate-600">
                      {note.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}