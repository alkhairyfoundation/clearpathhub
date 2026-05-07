'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Calendar, AlertTriangle, Info } from 'lucide-react';

export default function ParentAnnouncementsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const query = supabase.from('announcements').select('*').in('audience', ['all', 'parents']).order('created_at', { ascending: false });
    const { data } = await query;
    if (data) setAnnouncements(data);
    setLoading(false);
  }

  const filtered = filter === 'all' ? announcements : announcements.filter(a => a.priority === filter);

  function getIcon(priority: string) {
    switch (priority) {
      case 'urgent': return <AlertTriangle size={20} className="text-red-600" />;
      case 'high': return <Bell size={20} className="text-yellow-600" />;
      default: return <Info size={20} className="text-blue-600" />;
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-slate-500">School updates and important notices</p>
        </div>
      </div>

      <div className="flex gap-2">
        {['all', 'urgent', 'high', 'normal'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center"><Bell className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No announcements found</p></div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ann => (
            <div key={ann.id} className={`bg-white rounded-xl shadow-sm p-6 ${getBorder(ann.priority || 'normal')}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">{getIcon(ann.priority || 'normal')}<div><h3 className="font-semibold text-slate-800 text-lg">{ann.title}</h3><div className="flex items-center gap-2 mt-1"><Calendar size={14} className="text-slate-400" /><span className="text-sm text-slate-500">{new Date(ann.created_at).toLocaleDateString()}</span><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize">{ann.priority || 'normal'}</span></div></div></div>
              </div>
              {ann.content && <p className="text-slate-600 mt-3">{ann.content}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
