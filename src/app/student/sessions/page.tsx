'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Play, FileText, Clock, CheckCircle, XCircle, HelpCircle, BookOpen, Pause, PlayCircle, Lock, AlertCircle } from 'lucide-react';

interface CheckpointQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  timestamp_seconds: number;
}

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

export default function StudentSessionsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [checkpointActive, setCheckpointActive] = useState(false);
  const [currentCheckpoint, setCurrentCheckpoint] = useState<CheckpointQuestion | null>(null);
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<string, boolean>>({});
  const [checkpointScore, setCheckpointScore] = useState<{ correct: number; total: number } | null>(null);
  const [lessonNotes, setLessonNotes] = useState<any[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [sessionsRes, notesRes] = await Promise.all([
      supabase.from('sessions').select('*, subject:subjects(*), quiz:quizzes(quiz_questions(*))').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('lessons').select('*').eq('is_published', true).order('created_at', { ascending: false }),
    ]);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (notesRes.data) setLessonNotes(notesRes.data);
    setLoading(false);
  }

  function extractYouTubeId(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  }

  function getCheckpoints(session: any): CheckpointQuestion[] {
    const questions: CheckpointQuestion[] = [];
    session.quiz?.forEach((quiz: any) => {
      quiz.quiz_questions?.forEach((q: any) => {
        if (q.timestamp_seconds !== undefined && q.timestamp_seconds !== null) {
          questions.push({ id: q.id, question: q.question, options: q.options, correct_answer: q.correct_answer, timestamp_seconds: q.timestamp_seconds });
        }
      });
    });
    return questions.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  }

  function initYouTubePlayer(videoId: string) {
    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId,
        playerVars: { modestbranding: 1, rel: 0 },
        events: { onStateChange: onPlayerStateChange, onReady: onPlayerReady }
      });
    };
    if ((window as any).YT && (window as any).YT.Player) {
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId,
        playerVars: { modestbranding: 1, rel: 0 },
        events: { onStateChange: onPlayerStateChange, onReady: onPlayerReady }
      });
    }
  }

  function onPlayerReady(event: any) { setYoutubePlayer(event.target); }

  function onPlayerStateChange(event: any) {
    if (event.data === (window as any).YT.PlayerState.ENDED) { setVideoEnded(true); }
  }

  function handlePlaySession(session: any) {
    setSelectedSession(session);
    setShowVideo(true);
    setCheckpointActive(false);
    setCurrentCheckpoint(null);
    setCheckpointAnswers({});
    setCheckpointScore(null);
    setVideoEnded(false);
    setShowNotes(false);

    const checkpoints = getCheckpoints(session);
    if (checkpoints.length > 0 && session.video_type === 'youtube') {
      const youtubeId = extractYouTubeId(session.video_url || '');
      if (youtubeId) setTimeout(() => initYouTubePlayer(youtubeId), 500);
    }

    if (checkpoints.length > 0 && intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!playerRef.current || checkpointActive) return;
      const currentTime = playerRef.current.getCurrentTime();
      const cp = checkpoints.find(c => Math.abs(c.timestamp_seconds - currentTime) <= 3 && !checkpointAnswers[c.id]);
      if (cp) {
        playerRef.current.pauseVideo();
        setCurrentCheckpoint(cp);
        setCheckpointActive(true);
      }
    }, 2000);
  }

  function handleVideoTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (!selectedSession || checkpointActive) return;
    const currentTime = e.currentTarget.currentTime;
    const checkpoints = getCheckpoints(selectedSession);
    const cp = checkpoints.find(c => Math.abs(c.timestamp_seconds - currentTime) <= 3 && !checkpointAnswers[c.id]);
    if (cp) {
      e.currentTarget.pause();
      setCurrentCheckpoint(cp);
      setCheckpointActive(true);
    }
  }

  function handleCheckpointAnswer(optionIndex: number) {
    if (!currentCheckpoint) return;
    const isCorrect = optionIndex === currentCheckpoint.correct_answer;
    setCheckpointAnswers(prev => ({ ...prev, [currentCheckpoint.id]: isCorrect }));
    if (isCorrect) {
      setTimeout(() => {
        setCheckpointActive(false);
        setCurrentCheckpoint(null);
        if (youtubePlayer) youtubePlayer.playVideo();
        else {
          const video = document.querySelector('video');
          video?.play();
        }
      }, 1000);
    }
  }

  function handleCloseVideo() {
    setShowVideo(false);
    setSelectedSession(null);
    setCheckpointActive(false);
    setCurrentCheckpoint(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    setYoutubePlayer(null);
  }

  function calculateScore() {
    const checkpoints = getCheckpoints(selectedSession);
    const answered = Object.keys(checkpointAnswers).length;
    const correct = Object.values(checkpointAnswers).filter(Boolean).length;
    return { correct, total: answered, allAnswered: answered >= checkpoints.length };
  }

  return (
    <DashboardLayout title="Video Lessons" subtitle="Watch lessons and complete checkpoint quizzes to unlock content">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-800">Video Lessons</h1><p className="text-slate-500">Watch lessons and complete checkpoint quizzes to unlock content</p></div>
        
        {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const youtubeId = session.video_type === 'youtube' ? extractYouTubeId(session.video_url || '') : null;
            const checkpoints = getCheckpoints(session);
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
                  <div className="pt-[56.25%] bg-gray-900 flex items-center justify-center"><Play className="text-gray-500" size={48} /></div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 mb-1">{session.title}</h3>
                  <p className="text-sm text-slate-500">{session.subject?.name} &bull; {session.duration} min</p>
                  {checkpoints.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600"><Lock size={12} />{checkpoints.length} checkpoint{checkpoints.length > 1 ? 's' : ''} required</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showVideo && selectedSession && (
        <div className="fixed inset-0 bg-black z-50 flex">
          <div className="flex-1 relative">
            {selectedSession.video_type === 'youtube' && extractYouTubeId(selectedSession.video_url) ? (
              <div id="youtube-player" className="absolute inset-0 w-full h-full" />
            ) : (
              <video src={selectedSession.video_url} className="absolute inset-0 w-full h-full object-contain" controls onTimeUpdate={handleVideoTimeUpdate} onEnded={() => setVideoEnded(true)} />
            )}
            
            {checkpointActive && currentCheckpoint && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-8">
                <div className="bg-white rounded-xl max-w-xl w-full p-6">
                  <div className="flex items-center gap-2 mb-4"><Lock className="text-amber-500" size={24} /><span className="text-amber-600 font-medium">Checkpoint Required</span></div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">{currentCheckpoint.question}</h3>
                  <div className="space-y-3">
                    {currentCheckpoint.options.map((opt, i) => {
                      const answered = checkpointAnswers[currentCheckpoint.id] !== undefined;
                      const isCorrect = i === currentCheckpoint.correct_answer;
                      return (
                        <button key={i} onClick={() => !answered && handleCheckpointAnswer(i)} disabled={answered} className={`w-full p-4 rounded-lg text-left border transition-colors ${answered ? (isCorrect ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500') : 'hover:border-blue-500 hover:bg-blue-50'}`}>
                          <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                          {answered && isCorrect && <CheckCircle size={16} className="float-right text-green-600" />}
                          {answered && !isCorrect && checkpointAnswers[currentCheckpoint.id] === false && i === currentCheckpoint.correct_answer && <CheckCircle size={16} className="float-right text-green-600" />}
                        </button>
                      );
                    })}
                  </div>
                  {checkpointAnswers[currentCheckpoint.id] === false && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-600 flex items-center gap-2"><AlertCircle size={16} />Incorrect. You must answer correctly to continue.</div>
                  )}
                  {checkpointAnswers[currentCheckpoint.id] === true && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-600 flex items-center gap-2"><CheckCircle size={16} />Correct! Continuing video...</div>
                  )}
                </div>
              </div>
            )}
            
            <button onClick={() => setShowNotes(!showNotes)} className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-lg hover:bg-white"><BookOpen size={20} /></button>
            <button onClick={handleCloseVideo} className="absolute top-4 left-4 z-10 p-2 bg-white/90 rounded-lg hover:bg-white"><XCircle size={20} /></button>

            {videoEnded && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-lg px-6 py-3 shadow-lg">
                <div className="flex items-center gap-4">
                  <CheckCircle size={24} className="text-green-600" />
                  <div>
                    <p className="font-semibold text-slate-800">Lesson Complete!</p>
                    {(() => { const s = calculateScore(); return s.total > 0 ? <p className="text-sm text-slate-500">Checkpoints: {s.correct}/{s.total} correct</p> : null; })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {showNotes && (
            <div className="w-96 bg-white overflow-y-auto p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><BookOpen size={20} className="text-green-600" />Lesson Notes</h2>
              {lessonNotes.filter(n => n.subject_id === selectedSession.subject_id).length === 0 ? (
                <p className="text-slate-500 text-sm">No notes available for this lesson</p>
              ) : (
                <div className="space-y-4">
                  {lessonNotes.filter(n => n.subject_id === selectedSession.subject_id).map((note: any) => (
                    <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-slate-800 mb-2">{note.title}</h3>
                      <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">{note.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
