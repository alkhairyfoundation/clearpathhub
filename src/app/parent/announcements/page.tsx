'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Bell, Calendar, AlertTriangle, Info } from 'lucide-react';

const PAGE_SIZE = 10;

export default function ParentAnnouncementsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
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
      .select('*', { count: 'exact' })
      .in('audience', ['all', 'parents'])
      .order('created_at', { ascending: false })
      .range(from, to);
    if (!error && data) {
      setAnnouncements(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);

      // Update last read timestamp on first load
      if (reset && data.length > 0) {
        await supabase
          .from('profiles')
          .update({ last_read_announcements: new Date().toISOString() })
          .eq('id', profile?.id);
      }
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
      case 'urgent': return <AlertTriangle size={20} className="text-red-600 dark:text-red-400 dark:text-red-400" />;
      case 'high': return <Bell size={20} className="text-yellow-600 dark:text-yellow-400 dark:text-yellow-400" />;
      default: return <Info size={20} className="text-blue-600 dark:text-blue-400 dark:text-blue-400" />;
    }
  }

  function getBorder(priority: string) {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-red-500';
      case 'high': return 'border-l-4 border-yellow-500';
      default: return 'border-l-4 border-blue-500';
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

      <div className="flex gap-2">
        {['all', 'urgent', 'high', 'normal'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700'}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center"><Bell className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No announcements found</p></div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ann => (
            <div key={ann.id} className={`bg-white rounded-xl shadow-sm p-6 ${getBorder(ann.priority || 'normal')}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">{getIcon(ann.priority || 'normal')}<div><h3 className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 text-lg">{ann.title}</h3><div className="flex items-center gap-2 mt-1"><Calendar size={14} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" /><span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{new Date(ann.created_at).toLocaleDateString()}</span><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 capitalize">{ann.priority || 'normal'}</span></div></div></div>
              </div>
              {ann.content && <p className="text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-3">{ann.content}</p>}
            </div>
          ))}
          {hasMore && filtered.length >= PAGE_SIZE && (
            <div className="text-center pt-2">
              <button onClick={loadMore} disabled={loadingMore} className="btn-outline px-6">
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
