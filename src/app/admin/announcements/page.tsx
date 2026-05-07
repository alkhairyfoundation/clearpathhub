'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, X, Megaphone, Calendar, Users, Eye, Clock, AlertTriangle, CheckCircle, Loader2, Search, Filter } from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnn, setEditingAnn] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAudience, setFilterAudience] = useState('all');
  const [formData, setFormData] = useState({
    title: '', content: '', priority: 'normal', audience: 'all', scheduled_at: '', expires_at: ''
  });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('announcements').select('*, creator:profiles(first_name, last_name)').order('created_at', { ascending: false });
    if (data) setAnnouncements(data);
    setLoading(false);
  }

  function openModal(ann?: any) {
    if (ann) {
      setEditingAnn(ann);
      setFormData({
        title: ann.title, content: ann.content || '', priority: ann.priority || 'normal',
        audience: ann.audience || 'all', scheduled_at: ann.scheduled_at || '', expires_at: ann.expires_at || ''
      });
    } else {
      setEditingAnn(null);
      setFormData({ title: '', content: '', priority: 'normal', audience: 'all', scheduled_at: '', expires_at: '' });
    }
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.title.trim()) return;
    setSaving(true);
    const data = {
      ...formData,
      creator_id: profile?.id,
      scheduled_at: formData.scheduled_at || null,
      expires_at: formData.expires_at || null,
      is_active: formData.scheduled_at ? new Date(formData.scheduled_at) > new Date() : true,
    };
    if (editingAnn) {
      await supabase.from('announcements').update(data).eq('id', editingAnn.id);
    } else {
      await supabase.from('announcements').insert({ ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return;
    await supabase.from('announcements').delete().eq('id', id);
    fetchData();
  }

  async function toggleActive(ann: any) {
    await supabase.from('announcements').update({ is_active: !ann.is_active }).eq('id', ann.id);
    fetchData();
  }

  const filtered = announcements.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPriority = filterPriority === 'all' || a.priority === filterPriority;
    const matchAudience = filterAudience === 'all' || a.audience === filterAudience;
    return matchSearch && matchPriority && matchAudience;
  });

  const activeCount = announcements.filter(a => a.is_active !== false).length;
  const scheduledCount = announcements.filter(a => a.scheduled_at && new Date(a.scheduled_at) > new Date()).length;
  const expiredCount = announcements.filter(a => a.expires_at && new Date(a.expires_at) < new Date()).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 mt-1">Manage school-wide communications</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2"><Plus size={18} />New Announcement</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Total</span><Megaphone size={16} className="text-blue-600" /></div><p className="text-2xl font-bold text-slate-900">{announcements.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Active</span><CheckCircle size={16} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{activeCount}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Scheduled</span><Clock size={16} className="text-amber-600" /></div><p className="text-2xl font-bold text-amber-600">{scheduledCount}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Expired</span><AlertTriangle size={16} className="text-red-600" /></div><p className="text-2xl font-bold text-red-600">{expiredCount}</p></div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search announcements..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input w-auto"><option value="all">All Priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="normal">Normal</option></select>
          <select value={filterAudience} onChange={(e) => setFilterAudience(e.target.value)} className="input w-auto"><option value="all">All Audiences</option><option value="all">Everyone</option><option value="parents">Parents</option><option value="teachers">Teachers</option><option value="students">Students</option></select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><Megaphone className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No announcements found</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ann => {
              const isScheduled = ann.scheduled_at && new Date(ann.scheduled_at) > new Date();
              const isExpired = ann.expires_at && new Date(ann.expires_at) < new Date();
              return (
                <div key={ann.id} className={`p-4 rounded-xl border ${ann.is_active === false || isExpired ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-100'} ${ann.priority === 'urgent' ? 'border-l-4 border-l-red-500' : ann.priority === 'high' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-blue-500'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100"><Megaphone size={20} className="text-slate-600" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{ann.title}</p>
                        <p className="text-sm text-slate-500 line-clamp-1">{ann.content}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Users size={12} />{ann.audience || 'all'}</span>
                          <span className="flex items-center gap-1"><Calendar size={12} />{new Date(ann.created_at).toLocaleDateString()}</span>
                          {ann.scheduled_at && <span className="flex items-center gap-1"><Clock size={12} />Scheduled: {new Date(ann.scheduled_at).toLocaleString()}</span>}
                          {ann.expires_at && <span className="flex items-center gap-1"><Clock size={12} />Expires: {new Date(ann.expires_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ann.priority === 'urgent' ? 'bg-red-100 text-red-700' : ann.priority === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{ann.priority}</span>
                      {isScheduled && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 flex items-center gap-1"><Clock size={10} />Scheduled</span>}
                      {isExpired && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Expired</span>}
                      {ann.is_active !== false && !isExpired && !isScheduled && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1"><Eye size={10} />Active</span>}
                      <button onClick={() => toggleActive(ann)} className="p-1.5 hover:bg-slate-100 rounded-lg" title={ann.is_active === false ? 'Activate' : 'Deactivate'}>{ann.is_active === false ? <CheckCircle size={15} className="text-green-600" /> : <Eye size={15} className="text-slate-400" />}</button>
                      <button onClick={() => openModal(ann)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Edit size={15} className="text-blue-600" /></button>
                      <button onClick={() => handleDelete(ann.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={15} className="text-red-600" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10"><h3 className="text-lg font-bold text-slate-900">{editingAnn ? 'Edit' : 'New'} Announcement</h3><button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Announcement title" /></div>
              <div><label className="label">Content</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="input" rows={4} placeholder="Announcement details..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Priority</label><select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="input"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div><label className="label">Audience</label><select value={formData.audience} onChange={(e) => setFormData({ ...formData, audience: e.target.value })} className="input"><option value="all">Everyone</option><option value="parents">Parents Only</option><option value="teachers">Teachers Only</option><option value="students">Students Only</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Schedule (optional)</label><input type="datetime-local" value={formData.scheduled_at} onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })} className="input" /></div>
                <div><label className="label">Expires (optional)</label><input type="datetime-local" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} className="input" /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 sticky bottom-0 bg-white"><button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : editingAnn ? 'Update' : 'Publish'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
