'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Eye, Paperclip, ArrowLeft, Loader2 } from 'lucide-react';

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
        .select('*, subject:subjects(*)', { count: 'exact' })
        .eq('is_published', true);

      if (student?.class_id) {
        query = query.or(`class_id.eq.${student.class_id},class_id.is.null`);
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl p-12 text-center">
                  <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-slate-500">No lessons available</p>
                </div>
              ) : (
                lessons.map((lesson) => (
                  <div key={lesson.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <FileText className="text-emerald-600" size={24} />
                      </div>
                      <button onClick={() => setSelectedLesson(lesson)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <Eye size={16} className="text-slate-600" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">{lesson.title}</h3>
                    <p className="text-sm text-slate-500 mb-3">{lesson.subject?.name || 'No subject'}</p>
                    <p className="text-sm text-slate-600 line-clamp-3 mb-4">{lesson.content}</p>
                    {lesson.attachments && lesson.attachments.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Paperclip size={14} />
                        <span>{lesson.attachments.length} attachment(s)</span>
                      </div>
                    )}
                  </div>
                ))
              )}
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
                <div className="prose max-w-none whitespace-pre-wrap">{selectedLesson.content}</div>
              </div>
              {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
                <div className="p-6 border-t">
                  <h3 className="font-medium text-slate-800 mb-3">Attachments</h3>
                  <div className="space-y-2">
                    {selectedLesson.attachments.map((url: string, i: number) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Download size={16} />
                        <span className="truncate">{url.split('/').pop()}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
