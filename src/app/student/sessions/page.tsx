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
  correct_answer: any;
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
  const [checkpointRawAnswers, setCheckpointRawAnswers] = useState<Record<string, any>>({});
  const [checkpointScore, setCheckpointScore] = useState<{ correct: number; total: number } | null>(null);

  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showPostQuiz, setShowPostQuiz] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [passedCheckpoints, setPassedCheckpoints] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [multiSelected, setMultiSelected] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [error, setError] = useState('');
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkpointSavedRef = useRef(false);
  const checkpointAnswersRef = useRef<Record<string, boolean>>({});
  const checkpointActiveRef = useRef(false);
  const checkpointsRef = useRef<CheckpointQuestion[]>([]);

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

  useEffect(() => { checkpointAnswersRef.current = checkpointAnswers; }, [checkpointAnswers]);
  useEffect(() => { checkpointActiveRef.current = checkpointActive; }, [checkpointActive]);
  useEffect(() => { if (checkpointActive && currentCheckpoint) { setMultiSelected([]); setTextAnswer(''); } }, [checkpointActive, currentCheckpoint]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: studentData } = await supabase.from('students').select('class_id').eq('profile_id', profile?.id).maybeSingle();
      const studentClassId = studentData?.class_id;

      let query = supabase.from('sessions').select('*, subject:subjects!subject_id(*), quiz:quizzes(quiz_questions!quiz_id(*))').eq('is_published', true);
      if (studentClassId) {
        query = query.eq('class_id', studentClassId);
      }
      const { data: sessionsData, error: sessionsError } = await query.order('created_at', { ascending: false });
      if (sessionsError) throw new Error(sessionsError.message);
      if (sessionsData) setSessions(sessionsData);
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
    const postQuiz = session.quiz.find((q: any) => {
      const questions = q.quiz_questions || [];
      return questions.length > 0 && !questions.some((qq: any) => qq.timestamp_seconds != null);
    });
    return postQuiz || null;
  }

  function saveProgressToLocal() {
    if (!selectedSession) return;
    const key = `cp_${profile?.id}_${selectedSession.id}`;
    localStorage.setItem(key, JSON.stringify({ answers: checkpointAnswersRef.current, rawAnswers: checkpointRawAnswers }));
  }

  function loadProgressFromLocal(sessionId: string): { answers: Record<string, boolean>; rawAnswers: Record<string, any> } | null {
    const key = `cp_${profile?.id}_${sessionId}`;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { return null; }
  }

  function clearProgressFromLocal(sessionId: string) {
    const key = `cp_${profile?.id}_${sessionId}`;
    localStorage.removeItem(key);
  }

  async function saveCheckpointResults() {
    if (!selectedSession || !profile || checkpointSavedRef.current) return;
    checkpointSavedRef.current = true;
    const checkpoints = getCheckpoints(selectedSession);
    if (checkpoints.length === 0) return;
    const answered = Object.keys(checkpointRawAnswers).length;
    const correct = Object.values(checkpointAnswers).filter(Boolean).length;
    const passed = checkpoints.length > 0 && (correct / checkpoints.length) >= 0.8;
    // Find the quiz that actually has the checkpoint questions
    const checkpointQuiz = selectedSession.quiz?.find((q: any) =>
      q.quiz_questions?.some((qq: any) => qq.timestamp_seconds != null)
    );
    const quizId = checkpointQuiz?.id;
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
    clearProgressFromLocal(selectedSession.id);
  }

  function initYouTubePlayer(videoId: string) {
    const origin = window.location.origin;
    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId,
        playerVars: { modestbranding: 1, rel: 0, origin },
        events: { onStateChange: onPlayerStateChange, onReady: onPlayerReady }
      });
    };
    if ((window as any).YT && (window as any).YT.Player) {
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId,
        playerVars: { modestbranding: 1, rel: 0, origin },
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
    setCheckpointScore(null);
    setVideoEnded(false);
    setShowPostQuiz(false);
    setQuizSubmitted(false);
    checkpointSavedRef.current = false;

    // Restore checkpoint progress from localStorage
    const saved = loadProgressFromLocal(session.id);
    if (saved) {
      setCheckpointAnswers(saved.answers);
      setCheckpointRawAnswers(saved.rawAnswers);
    } else {
      setCheckpointAnswers({});
      setCheckpointRawAnswers({});
    }

    const checkpoints = getCheckpoints(session);
    checkpointsRef.current = checkpoints;
    if (checkpoints.length > 0 && session.video_type === 'youtube') {
      const youtubeId = extractYouTubeId(session.video_url || '');
      if (youtubeId) setTimeout(() => initYouTubePlayer(youtubeId), 500);
    }

    if (checkpoints.length > 0 && intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!playerRef.current || checkpointActiveRef.current) return;
      const currentTime = playerRef.current.getCurrentTime();
      const cp = checkpointsRef.current.find(c => Math.abs(c.timestamp_seconds - currentTime) <= 3 && !checkpointAnswersRef.current[c.id]);
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

  function isAnswerCorrect(questionType: string | undefined, answer: any, correctAnswer: any): boolean {
    switch (questionType) {
      case 'multiple_selection':
        return Array.isArray(answer) && Array.isArray(correctAnswer) &&
          answer.length === correctAnswer.length &&
          [...answer].sort().every((v: any, i: number) => v === [...correctAnswer].sort()[i]);
      case 'fill_blank':
      case 'short_answer':
        return String(answer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
      default:
        return answer === correctAnswer;
    }
  }

  function resolveCheckpoint(wasCorrect: boolean) {
    setCheckpointActive(false);
    setCurrentCheckpoint(null);
    if (wasCorrect) {
      if (youtubePlayer) youtubePlayer.playVideo();
      else { const video = document.querySelector('video'); video?.play(); }
    } else {
      const checkpoints = getCheckpoints(selectedSession);
      const currentIdx = checkpoints.findIndex(c => c.id === currentCheckpoint?.id);
      const previousTimestamp = currentIdx > 0 ? checkpoints[currentIdx - 1].timestamp_seconds : 0;
      if (youtubePlayer) {
        youtubePlayer.seekTo(previousTimestamp);
        youtubePlayer.playVideo();
      } else {
        const video = document.querySelector('video');
        if (video) { video.currentTime = previousTimestamp; video.play(); }
      }
    }
  }

  function handleCheckpointAnswer(optionIndex: number) {
    if (!currentCheckpoint) return;
    const isCorrect = isAnswerCorrect(currentCheckpoint.question_type, optionIndex, currentCheckpoint.correct_answer);
    setCheckpointAnswers(prev => ({ ...prev, [currentCheckpoint.id]: isCorrect }));
    setCheckpointRawAnswers(prev => ({ ...prev, [currentCheckpoint.id]: optionIndex }));
    saveProgressToLocal();
    if (isCorrect) {
      setTimeout(() => resolveCheckpoint(true), 1000);
    } else {
      setCheckpointAnswers(prev => {
        const next = { ...prev };
        delete next[currentCheckpoint.id!];
        return next;
      });
      setCheckpointRawAnswers(prev => {
        const next = { ...prev };
        delete next[currentCheckpoint.id!];
        return next;
      });
      setTimeout(() => resolveCheckpoint(false), 1500);
    }
  }

  function handleCheckpointTextAnswer(text: string) {
    if (!currentCheckpoint) return;
    const isCorrect = isAnswerCorrect(currentCheckpoint.question_type, text, currentCheckpoint.correct_answer);
    setCheckpointAnswers(prev => ({ ...prev, [currentCheckpoint.id]: isCorrect }));
    setCheckpointRawAnswers(prev => ({ ...prev, [currentCheckpoint.id]: text }));
    saveProgressToLocal();
    if (isCorrect) {
      setTimeout(() => resolveCheckpoint(true), 1000);
    } else {
      setTimeout(() => resolveCheckpoint(false), 1500);
    }
  }

  function handleCheckpointMultiAnswer(selected: number[]) {
    if (!currentCheckpoint) return;
    const isCorrect = isAnswerCorrect('multiple_selection', selected, currentCheckpoint.correct_answer);
    setCheckpointAnswers(prev => ({ ...prev, [currentCheckpoint.id]: isCorrect }));
    setCheckpointRawAnswers(prev => ({ ...prev, [currentCheckpoint.id]: selected }));
    saveProgressToLocal();
    if (isCorrect) {
      setTimeout(() => resolveCheckpoint(true), 1000);
    } else {
      setTimeout(() => resolveCheckpoint(false), 1500);
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

                  {(() => {
                    const answered = checkpointAnswers[currentCheckpoint.id] !== undefined;
                    const qtype = currentCheckpoint.question_type;

                    // multiple_choice / true_false: buttons
                    if (!qtype || qtype === 'multiple_choice' || qtype === 'true_false') {
                      return (
                        <div className="space-y-3">
                          {currentCheckpoint.options.map((opt, i) => {
                            const isCorrectIdx = i === currentCheckpoint.correct_answer;
                            return (
                              <button key={i} onClick={() => !answered && handleCheckpointAnswer(i)} disabled={answered} className={`w-full p-4 rounded-lg text-left border transition-colors ${answered ? (isCorrectIdx ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500') : 'hover:border-primary-500 hover:bg-primary-50'}`}>
                                <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                                {answered && isCorrectIdx && <CheckCircle size={16} className="float-right text-green-600" />}
                                {answered && !isCorrectIdx && checkpointAnswers[currentCheckpoint.id] === false && <XCircle size={16} className="float-right text-red-600" />}
                              </button>
                            );
                          })}
                        </div>
                      );
                    }

                    // multiple_selection: checkboxes
                    if (qtype === 'multiple_selection') {
                      return (
                        <div className="space-y-3">
                          {currentCheckpoint.options.map((opt, i) => (
                            <label key={i} className={`w-full p-4 rounded-lg text-left border flex items-center gap-3 cursor-pointer transition-colors ${answered ? 'opacity-60 cursor-default' : 'hover:border-primary-500 hover:bg-primary-50'} ${!answered && multiSelected.includes(i) ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'}`}>
                              <input type="checkbox" checked={multiSelected.includes(i)} disabled={answered} onChange={() => { if (answered) return; setMultiSelected(prev => prev.includes(i) ? prev.filter(v => v !== i) : [...prev, i]); }} className="w-5 h-5" />
                              <span>{opt}</span>
                            </label>
                          ))}
                          {!answered && (
                            <button onClick={() => handleCheckpointMultiAnswer(multiSelected)} className="btn-primary w-full mt-2">Submit Answer</button>
                          )}
                        </div>
                      );
                    }

                    // fill_blank: text input
                    if (qtype === 'fill_blank') {
                      return (
                        <div>
                          <input type="text" value={textAnswer} disabled={answered} onChange={e => setTextAnswer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !answered && textAnswer.trim()) handleCheckpointTextAnswer(textAnswer); }} className="input w-full text-lg" placeholder="Type your answer..." autoFocus />
                          {!answered && (
                            <button onClick={() => { if (textAnswer.trim()) handleCheckpointTextAnswer(textAnswer); }} disabled={!textAnswer.trim()} className="btn-primary w-full mt-3 disabled:opacity-50">Submit Answer</button>
                          )}
                        </div>
                      );
                    }

                    // short_answer: textarea
                    if (qtype === 'short_answer') {
                      return (
                        <div>
                          <textarea value={textAnswer} disabled={answered} onChange={e => setTextAnswer(e.target.value)} className="input w-full" rows={3} placeholder="Write your answer..." />
                          {!answered && (
                            <button onClick={() => { if (textAnswer.trim()) handleCheckpointTextAnswer(textAnswer); }} disabled={!textAnswer.trim()} className="btn-primary w-full mt-3 disabled:opacity-50">Submit Answer</button>
                          )}
                        </div>
                      );
                    }

                    // fallback
                    return <p className="text-slate-500">Unsupported question type.</p>;
                  })()}

                  {checkpointAnswers[currentCheckpoint.id] === false && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-600 flex items-center gap-2"><AlertCircle size={16} />Incorrect. Rewinding to last checkpoint for review...</div>
                  )}
                  {checkpointAnswers[currentCheckpoint.id] === true && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-600 flex items-center gap-2"><CheckCircle size={16} />Correct! Continuing video...</div>
                  )}
                </div>
              </div>
            )}
            
            <button onClick={() => router.push('/student/lessons')} className="absolute top-4 right-4 z-10 p-2 bg-white/90 rounded-lg hover:bg-white" title="View Lesson Notes"><BookOpen size={20} /></button>
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


        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
