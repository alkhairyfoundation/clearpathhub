'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, X, Megaphone, Send, Calendar, AlertTriangle } from 'lucide-react';
import type { Announcement, Profile } from '@/types';

export default function AdminAnnouncementsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<(Announcement & { creator?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'all' as 'all' | 'students' | 'teachers' | 'parents' | 'staff',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    expires_at: '',
  });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchAnnouncements();
  }, [profile, filterAudience]);

  async function fetchAnnouncements() {
    setLoading(true);
    let query = supabase
      .from('announcements')
      .select('*, creator:profiles(*)')
      .order('created_at', { ascending: false });

    if (filterAudience !== 'all') {
      query = query.eq('audience', filterAudience);
    }

    const { data } = await query;
    if (data) setAnnouncements(data);
    setLoading(false);
  }

  async function handleSave() {
    const data = {
      ...formData,
      created_by: profile?.id,
      expires_at: formData.expires_at || null,
    };

    if (editingAnnouncement) {
      await supabase.from('announcements').update(data).eq('id', editingAnnouncement.id);
    } else {
      await supabase.from('announcements').insert({ ...data, id: crypto.randomUUID() });
    }
    setShowModal(false);
    setFormData({ title: '', content: '', audience: 'all', priority: 'normal', expires_at: '' });
    setEditingAnnouncement(null);
    fetchAnnouncements();
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this announcement?')) {
      await supabase.from('announcements').delete().eq('id', id);
      fetchAnnouncements();
    }
  }

  const filteredAnnouncements = announcements.filter(a =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-slate-500">Create and manage announcements</p>
        </div>
        <button
          onClick={() => { setEditingAnnouncement(null); setFormData({ title: '', content: '', audience: 'all', priority: 'normal', expires_at: '' }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Announcement
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'all', 'students', 'teachers', 'parents', 'staff'] as const).map((audience) => (
              <button
                key={audience}
                onClick={() => setFilterAudience(audience)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterAudience === audience
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {audience === 'all' ? 'All' : audience.charAt(0).toUpperCase() + audience.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Megaphone size={48} className="mx-auto mb-4 opacity-50" />
            <p>No announcements found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-4 rounded-lg border-l-4 ${
                  announcement.priority === 'urgent' ? 'border-red-500 bg-red-50' :
                  announcement.priority === 'high' ? 'border-orange-500 bg-orange-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-800">{announcement.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{announcement.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>To: {announcement.audience}</span>
                      <span>By: {announcement.creator?.first_name} {announcement.creator?.last_name}</span>
                      <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditingAnnouncement(announcement); setFormData({ title: announcement.title, content: announcement.content, audience: announcement.audience, priority: announcement.priority, expires_at: announcement.expires_at || '' }); setShowModal(true); }}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit size={16} className="text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="label">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="input"
                  rows={4}
                  placeholder="Write your announcement..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Audience</label>
                  <select
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value as any })}
                    className="input"
                  >
                    <option value="all">All</option>
                    <option value="students">Students</option>
                    <option value="teachers">Teachers</option>
                    <option value="parents">Parents</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="btn-outline">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                <Send size={18} />
                {editingAnnouncement ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}