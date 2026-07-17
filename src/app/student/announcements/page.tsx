'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Bell, Calendar, AlertTriangle, Info, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';

const PAGE_SIZE = 10;

export default function StudentAnnouncementsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedAnn, setSelectedAnn] = useState<any>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    setAnnouncements([]);
    setPage(0);
    setHasMore(true);
    fetchData(0, true);
  }, [profile]);

  async function fetchData(pageNum: number, reset = false) {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('announcements')
      .select('*, creator:profiles!created_by(first_name, last_name)', { count: 'exact' })
      .in('audience', ['all', 'students'])
      .order('created_at', { ascending: false })
      .range(from, to);
    if (!error && data) {
      setAnnouncements(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    if (reset) setLoading(false);
    else setLoadingMore(false);
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage);
  }

  const filtered = filter === 'all' ? announcements : announcements.filter(a => a.priority === filter);

  function getIcon(priority: string) {
    switch (priority) {
      case 'urgent': return <AlertTriangle size={24} className="text-red-600 dark:text-red-400 dark:text-red-400" />;
      case 'high': return <Bell size={24} className="text-yellow-600 dark:text-yellow-400 dark:text-yellow-400" />;
      default: return <Info size={24} className="text-blue-600 dark:text-blue-400 dark:text-blue-400" />;
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'urgent': return 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400 border-red-200 dark:border-red-900/40 dark:border-red-900/40';
      case 'high': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300 border-blue-200 dark:border-blue-900/40 dark:border-blue-900/40';
    }
  }

  return (
    <DashboardLayout title="Announcements" subtitle="School updates and important notices">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Announcements</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">School updates and important notices</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'urgent', 'high', 'normal'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 dark:border-slate-700'}`}>{f}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center"><Bell className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No announcements found</p></div>
        ) : (
          <div className="space-y-4">
            {filtered.map(ann => {
              const short = ann.content && ann.content.length > 120;
              return (
                <div key={ann.id} className="bg-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 mt-1">{getIcon(ann.priority || 'normal')}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 text-lg">{ann.title}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                              <span className="flex items-center gap-1"><Calendar size={12} />{new Date(ann.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${getPriorityColor(ann.priority || 'normal')}`}>{ann.priority || 'normal'}</span>
                            </div>
                          </div>
                          {ann.content && ann.content.length > 120 && (
                            <button onClick={() => setSelectedAnn(ann)} className="shrink-0 btn-outline text-xs flex items-center gap-1 px-3 py-1.5">
                              <Eye size={14} /> Read More
                            </button>
                          )}
                        </div>
                        {ann.content && (
                          <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                            {short ? ann.content.substring(0, 120) + '...' : ann.content}
                          </p>
                        )}
                        {ann.creator && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-3">Posted by {ann.creator.first_name} {ann.creator.last_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore && filtered.length >= PAGE_SIZE && (
              <div className="text-center pt-2">
                <button onClick={loadMore} disabled={loadingMore} className="btn-outline px-8">
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Full Message Modal */}
        {selectedAnn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedAnn(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b shrink-0">
                <div className="flex items-center gap-3">
                  {getIcon(selectedAnn.priority || 'normal')}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{selectedAnn.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">
                      <Calendar size={12} />{new Date(selectedAnn.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedAnn(null)} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg shrink-0"><X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" /></button>
              </div>
              <div className="p-6 overflow-y-auto">
                {selectedAnn.content && (
                  <div className="text-slate-700 dark:text-slate-300 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap space-y-4">
                    {selectedAnn.content.split('\n\n').map((p: string, i: number) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
                {!selectedAnn.content && (
                  <p className="text-slate-400 dark:text-slate-500 dark:text-slate-500 text-center py-8">No additional content</p>
                )}
                {selectedAnn.creator && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">
                    Posted by {selectedAnn.creator.first_name} {selectedAnn.creator.last_name}
                  </div>
                )}
              </div>
              <div className="flex justify-end p-5 border-t shrink-0">
                <button onClick={() => setSelectedAnn(null)} className="btn-primary px-6">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
