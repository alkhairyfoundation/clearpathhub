'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Play, FileText, Clock, CheckCircle, XCircle, HelpCircle, BookOpen, Pause, PlayCircle, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface CheckpointQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  timestamp_seconds: number;
  question_type?: string;
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
  const [checkpointRawAnswers, setCheckpointRawAnswers] = useState<Record<string, number>>({});
  const [checkpointScore, setCheckpointScore] = useState<{ correct: number; total: number } | null>(null);
  const [lessonNotes, setLessonNotes] = useState<any[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showPostQuiz, setShowPostQuiz] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [passedCheckpoints, setPassedCheckpoints] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [error, setError] = useState('');
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkpointSavedRef = useRef(false);

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
    try {
      const { data: studentData } = await supabase.from('students').select('class_id').eq('profile_id', profile?.id).maybeSingle();
      const studentClassId = studentData?.class_id;

      let query = supabase.from('sessions').select('*, subject:subjects!subject_id(*), quiz:quizzes(quiz_questions!quiz_id(*))').eq('is_published', true);
      if (studentClassId) {
        query = query.or(`class_id.eq.${studentClassId},class_id.is.null`);
      }
      const [sessionsRes, notesRes] = await Promise.all([
        query.order('created_at', { ascending: false }),
        supabase.from('lessons').select('*').eq('is_published', true).order('created_at', { ascending: false }),
      ]);
      if (sessionsRes.error) throw new Error(sessionsRes.error.message);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (notesRes.data) setLessonNotes(notesRes.data);
    } catch (err: any) {
      setError(err.message);
    }
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
          questions.push({ id: q.id, question: q.question, options: q.options, correct_answer: q.correct_answer, timestamp_seconds: q.timestamp_seconds, question_type: q.question_type });
        }
      });
    });
    return questions.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
  }

  function getPostVideoQuiz(session: any): any | null {
    if (!session.quiz) return null;
    const postQuiz = session.quiz.find((q: any) =>
      !q.quiz_questions?.some((qq: any) => qq.timestamp_seconds !== undefined && qq.timestamp_seconds !== null)
    );
    return postQuiz || null;
  }

  async function saveCheckpointResults() {
    if (!selectedSession || !profile || checkpointSavedRef.current) return;
    checkpointSavedRef.current = true;
    const checkpoints = getCheckpoints(selectedSession);
    if (checkpoints.length === 0) return;
    const answered = Object.keys(checkpointRawAnswers).length;
    const correct = Object.values(checkpointAnswers).filter(Boolean).length;
    const passed = checkpoints.length > 0 && (correct / checkpoints.length) >= 0.8;
    const quizId = selectedSession.quiz?.[0]?.id;
    if (quizId) {
      await supabase.from('quiz_attempts').insert({
        quiz_id: quizId,
        student_id: profile.id,
        score: checkpoints.length > 0 ? Math.round((correct / checkpoints.length) * 100) : 0,
        passed,
        answers: checkpointRawAnswers,
        started_at: new Date(Date.now() - selectedSession.duration * 60000).toISOString(),
        completed_at: new Date().toISOString(),
      });
    }
    setPassedCheckpoints(passed);
    setCheckpointScore({ correct, total: checkpoints.length });
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
    if (event.data === (window as any).YT.PlayerState.ENDED) {
      setVideoEnded(true);
      saveCheckpointResults();
    }
  }

  function handlePlaySession(session: any) {
    setSelectedSession(session);
    setShowVideo(true);
    setCheckpointActive(false);
    setCurrentCheckpoint(null);
    setCheckpointAnswers({});
    setCheckpointRawAnswers({});
    setCheckpointScore(null);
    setVideoEnded(false);
    setShowNotes(false);
    setShowPostQuiz(false);
    setQuizSubmitted(false);
    checkpointSavedRef.current = false;

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
    setCheckpointRawAnswers(prev => ({ ...prev, [currentCheckpoint.id]: optionIndex }));
    if (isCorrect) {
      setTimeout(() => {
        setCheckpointActive(false);
        setCurrentCheckpoint(null);
        if (youtubePlayer) youtubePlayer.playVideo();
        else { const video = document.querySelector('video'); video?.play(); }
      }, 1000);
    }
  }

  async function handleCloseVideo() {
    if (!checkpointSavedRef.current) await saveCheckpointResults();
    setShowVideo(false);
    setSelectedSession(null);
    setCheckpointActive(false);
    setCurrentCheckpoint(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    setYoutubePlayer(null);
  }

  async function handleStartPostQuiz(quiz: any) {
    if (!quiz) return;
    setQuizSubmitted(true);
    const quizAttempts = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quiz.id,
        student_id: profile?.id,
        score: 0,
        passed: false,
        answers: {},
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (quizAttempts.data) {
      router.push(`/student/tests/${quiz.id}?type=quiz`);
    }
  }

  function calculateScore() {
    const checkpoints = getCheckpoints(selectedSession);
    const answered = Object.keys(checkpointAnswers).length;
    const correct = Object.values(checkpointAnswers).filter(Boolean).length;
    return { correct, total: answered, allAnswered: answered >= checkpoints.length };
  }

  const completedSessionIds = new Set<string>();

  return (
    <DashboardLayout title="Video Lessons" subtitle="Watch lessons and complete checkpoint quizzes to unlock content">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-800">Video Lessons</h1><p className="text-slate-500">Watch lessons and complete checkpoint quizzes to unlock content</p></div>
        
          {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-16">
          <PlayCircle className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="font-medium text-slate-500">No video lessons available</p>
          <p className="text-sm text-slate-400 mt-1">Lessons will appear here once assigned to your class</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const youtubeId = session.video_type === 'youtube' ? extractYouTubeId(session.video_url || '') : null;
            const checkpoints = getCheckpoints(session);
            const postQuiz = getPostVideoQuiz(session);
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
                  <p className="text-sm text-slate-500">{session.subject?.name} &bull; {session.duration || '?'} min</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {checkpoints.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs"><Lock size={12} />{checkpoints.length} checkpoint{checkpoints.length > 1 ? 's' : ''}</span>
                    )}
                    {postQuiz && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"><FileText size={12} />Post-video quiz</span>
                    )}
                  </div>
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
              <video src={selectedSession.video_url} className="absolute inset-0 w-full h-full object-contain" controls onTimeUpdate={handleVideoTimeUpdate} onEnded={() => { setVideoEnded(true); saveCheckpointResults(); }} />
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
                        <button key={i} onClick={() => !answered && handleCheckpointAnswer(i)} disabled={answered} className={`w-full p-4 rounded-lg text-left border transition-colors ${answered ? (isCorrect ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500') : 'hover:border-primary-500 hover:bg-primary-50'}`}>
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
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-xl px-6 py-4 shadow-lg">
                <div className="flex items-center gap-4">
                  <CheckCircle size={24} className="text-green-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">Lesson Complete!</p>
                    {checkpointScore && <p className="text-sm text-slate-500">Checkpoints: {checkpointScore.correct}/{checkpointScore.total} correct {checkpointScore.total > 0 && `(${Math.round((checkpointScore.correct / checkpointScore.total) * 100)}%)`}</p>}
                  </div>
                  {!checkpointSavedRef.current && (
                    <button onClick={() => saveCheckpointResults()} className="btn-outline text-sm">Save Results</button>
                  )}
                  {getPostVideoQuiz(selectedSession) && (
                    <button onClick={() => setShowPostQuiz(true)} className="btn-primary text-sm flex items-center gap-1"><FileText size={14} />Start Quiz</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Post-video quiz modal */}
          {showPostQuiz && (() => {
            const quiz = getPostVideoQuiz(selectedSession);
            return (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                <div className="bg-white rounded-xl max-w-lg w-full p-8 mx-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"><FileText size={32} className="text-purple-600" /></div>
                  <h2 className="text-xl font-bold text-slate-900 text-center mb-2">Post-Video Quiz</h2>
                  <p className="text-slate-500 text-center mb-6">Test your understanding with this short quiz based on the lesson.</p>
                  <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-slate-600"><strong>{quiz?.title || 'Quiz'}</strong></p>
                    <p className="text-sm text-slate-500 mt-1">{quiz?.quiz_questions?.length || 0} questions &bull; {quiz?.time_limit || 'No'} time limit</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowPostQuiz(false)} className="btn-ghost flex-1">Skip</button>
                    <button onClick={() => handleStartPostQuiz(quiz)} className="btn-primary flex-1 flex items-center justify-center gap-2">Start Quiz <ArrowRight size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })()}

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
