'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Eye, Paperclip, ArrowLeft, Loader2, HelpCircle, CheckCircle, XCircle, Search } from 'lucide-react';

const PAGE_SIZE = 9;

export default function StudentLessonsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const [lessonQuiz, setLessonQuiz] = useState<any>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({} as Record<string, number>);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState(false);
  const [quizResults, setQuizResults] = useState<{ correct: number; total: number } | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData(0, true);
  }, [profile]);

  async function fetchData(pageNum: number, reset = false) {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    setError('');
    try {
      const { data: student } = await supabase.from('students').select('class_id').eq('profile_id', profile?.id).maybeSingle();

      let query = supabase
        .from('lessons')
        .select('*, subject:subjects(*), class:classes!class_id(name)', { count: 'exact' })
        .eq('is_published', true);

      if (student?.class_id) {
        query = query.eq('class_id', student.class_id);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: err, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (err) throw new Error(err.message);

      if (data) {
        setLessons(prev => reset ? data : [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE && (count ? (from + data.length) < count : true));
      }

      if (reset) {
        const { data: subjectsData } = await supabase.from('subjects').select('id, name').order('name');
        if (subjectsData) setSubjects(subjectsData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage);
  }

  async function openLesson(lesson: any) {
    setSelectedLesson(lesson);
    setShowQuiz(false);
    setQuizResults(null);
    setQuizFinished(false);
    setQuizIdx(0);
    setQuizAnswer(null);
    setQuizFeedback(false);
    setQuizAnswers({});

    if (lesson.session_id) {
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, passing_score')
        .eq('session_id', lesson.session_id);
      if (quizzes && quizzes.length > 0) {
        const { data: questions } = await supabase
          .from('quiz_questions')
          .select('*')
          .in('quiz_id', quizzes.map(q => q.id))
          .order('order_index', { ascending: true });
        setLessonQuiz(quizzes[0]);
        setQuizQuestions(questions || []);
      } else {
        setLessonQuiz(null);
        setQuizQuestions([]);
      }
    } else {
      setLessonQuiz(null);
      setQuizQuestions([]);
    }
  }

  function handleQuizAnswer(idx: number) {
    if (quizFeedback) return;
    setQuizAnswer(idx);
    setQuizFeedback(true);
  }

  async function handleQuizNext() {
    const q = quizQuestions[quizIdx] as any;
    setQuizAnswers(prev => ({ ...prev, [q.id]: quizAnswer! }));

    if (quizIdx + 1 >= quizQuestions.length) {
      await finishQuiz();
    } else {
      setQuizIdx(prev => prev + 1);
      setQuizAnswer(null);
      setQuizFeedback(false);
    }
  }

  async function finishQuiz() {
    if (submittingQuiz) return;
    setSubmittingQuiz(true);
    const finalAnswers: Record<string, number> = { ...quizAnswers, [quizQuestions[quizIdx].id]: quizAnswer! };
    setQuizAnswers(finalAnswers);

    let correctCount = 0;
    quizQuestions.forEach((q: any) => {
      if (finalAnswers[q.id] === q.correct_answer) correctCount++;
    });

    const score = Math.round((correctCount / quizQuestions.length) * 100);
    if (lessonQuiz && profile) {
      await supabase.from('quiz_attempts').insert({
        quiz_id: lessonQuiz.id,
        student_id: profile.id,
        score,
        passed: score >= (lessonQuiz.passing_score || 50),
        answers: finalAnswers,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    }

    setQuizResults({ correct: correctCount, total: quizQuestions.length });
    setQuizFinished(true);
    setSubmittingQuiz(false);
  }

  async function startQuiz() {
    setQuizResults(null);
    setQuizAnswers({});
    setQuizFinished(false);
    setQuizIdx(0);
    setQuizAnswer(null);
    setQuizFeedback(false);
    setShowQuiz(true);
  }

  return (
    <DashboardLayout title="Lesson Notes" subtitle="Download and view lesson materials">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Lesson Notes</h1>
            <p className="text-slate-500">Download and view lesson materials</p>
          </div>
        </div>
        
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>}

        <div className="card p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search lessons..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="input pl-10" />
            </div>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="input w-auto">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(() => {
                const filtered = lessons.filter(l => {
                  const matchSearch = !filterSearch || l.title.toLowerCase().includes(filterSearch.toLowerCase());
                  const matchSubject = !filterSubject || l.subject_id === filterSubject;
                  return matchSearch && matchSubject;
                });
                return filtered.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl p-12 text-center">
                  <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-slate-500">No lessons available</p>
                </div>
              ) : (
                filtered.map((lesson) => (
                  <div key={lesson.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openLesson(lesson)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <FileText className="text-emerald-600" size={24} />
                      </div>
                      <Eye size={16} className="text-slate-600" />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">{lesson.title}</h3>
                    <p className="text-sm text-slate-500 mb-3">{lesson.subject?.name || 'No subject'}</p>
                    <p className="text-sm text-slate-600 line-clamp-3 mb-4">{lesson.content?.replace(/<[^>]*>/g, '').substring(0, 300)}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {lesson.class?.name && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">{lesson.class.name}</span>
                      )}
                      {lesson.session_id && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Has Quiz</span>
                      )}
                      {lesson.attachments && lesson.attachments.length > 0 && (
                        <span className="flex items-center gap-1"><Paperclip size={12} />{lesson.attachments.length}</span>
                      )}
                    </div>
                  </div>
                ))
              );
              })()}
            </div>

            {hasMore && (
              <div className="text-center pb-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-outline px-8 py-2 flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lesson Detail Modal (with inline quiz) */}
        {selectedLesson && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLesson(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">{selectedLesson.title}</h2>
                  <p className="text-sm text-slate-500">{selectedLesson.subject?.name}</p>
                </div>
                <button onClick={() => setSelectedLesson(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <ArrowLeft size={20} className="rotate-90 text-slate-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedLesson.content || '' }} />
              </div>
              {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
                <div className="p-6 border-t">
                  <h3 className="font-medium text-slate-800 mb-3">Attachments</h3>
                  <div className="space-y-2">
                    {selectedLesson.attachments.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"><Download size={16} /><span className="truncate">{url.split('/').pop()}</span></a>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline Quiz */}
              {quizQuestions.length > 0 && !showQuiz && !quizFinished && (
                <div className="p-6 border-t">
                  <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><HelpCircle size={20} className="text-primary-600" /></div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">Lesson Quiz Available</p>
                        <p className="text-sm text-slate-600">{quizQuestions.length} question{quizQuestions.length > 1 ? 's' : ''} to test your understanding</p>
                      </div>
                      <button onClick={startQuiz} className="btn-primary text-sm">Take Quiz</button>
                    </div>
                  </div>
                </div>
              )}

              {showQuiz && !quizFinished && quizQuestions.length > 0 && (
                <div className="p-6 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">Lesson Quiz</h3>
                    <span className="text-sm text-slate-500">Question {quizIdx + 1} of {quizQuestions.length}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div className="bg-primary-600 h-1.5 rounded-full transition-all" style={{ width: `${((quizIdx + 1) / quizQuestions.length) * 100}%` }} />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg">{quizQuestions[quizIdx].question}</h4>
                  <div className="space-y-2">
                    {quizQuestions[quizIdx].options.map((opt: string, i: number) => {
                      const isSelected = quizAnswer === i;
                      const isCorrectAnswer = i === quizQuestions[quizIdx].correct_answer;
                      let btnClass = 'w-full text-left p-3 rounded-lg border-2 transition-all text-sm ';
                      if (!quizFeedback) {
                        btnClass += isSelected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300 text-slate-700';
                      } else {
                        btnClass += isCorrectAnswer ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : isSelected ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-400';
                      }
                      return (
                        <button key={i} onClick={() => handleQuizAnswer(i)} disabled={quizFeedback} className={btnClass}>
                          <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                          {quizFeedback && isCorrectAnswer && <CheckCircle size={16} className="inline ml-2 text-emerald-600" />}
                          {quizFeedback && isSelected && !isCorrectAnswer && <XCircle size={16} className="inline ml-2 text-red-600" />}
                        </button>
                      );
                    })}
                  </div>
                  {quizFeedback && (
                    <button onClick={handleQuizNext} className="btn-primary w-full">
                      {quizIdx + 1 >= quizQuestions.length ? 'Finish' : 'Next Question'}
                    </button>
                  )}
                </div>
              )}

              {quizFinished && quizResults && (
                <div className="p-6 border-t text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${quizResults.correct / quizResults.total >= 0.7 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {quizResults.correct / quizResults.total >= 0.7 ? <CheckCircle size={32} className="text-emerald-600" /> : <XCircle size={32} className="text-amber-600" />}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Quiz Complete</h3>
                  <p className="text-3xl font-bold text-primary-600 mb-2">{quizResults.correct}/{quizResults.total}</p>
                  <p className="text-slate-500 mb-6">{Math.round((quizResults.correct / quizResults.total) * 100)}% score</p>
                  <button onClick={startQuiz} className="btn-primary">Retry Quiz</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
