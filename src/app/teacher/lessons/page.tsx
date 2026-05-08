'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, FileText, Edit, Trash2, X, Download, Eye, Paperclip, ArrowLeft } from 'lucide-react';
import type { Lesson, Subject } from '@/types';

export default function TeacherLessonsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<(Lesson & { subject?: Subject })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', subject_id: '', attachments: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const [lessonsRes, subjectsRes] = await Promise.all([
        supabase.from('lessons').select('*, subject:subjects!subject_id(*)').order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('name'),
      ]);
      if (lessonsRes.error) throw new Error(lessonsRes.error.message);
      if (lessonsRes.data) setLessons(lessonsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.title.trim()) { setError('Title is required'); return; }
    setError(''); setSuccess('');
    try {
      const data = { title: formData.title, content: formData.content, subject_id: formData.subject_id || null, teacher_id: profile?.id, attachments: formData.attachments ? formData.attachments.split(',').map(a => a.trim()) : [], is_published: true };
      const { error } = await supabase.from('lessons').insert(data);
      if (error) throw new Error(error.message);
      setSuccess('Lesson created');
      setTimeout(() => { setShowModal(false); setFormData({ title: '', content: '', subject_id: '', attachments: '' }); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lesson?')) return;
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Lesson deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
    fetchData();
  }

  return (
    <DashboardLayout title="Lesson Notes" subtitle="Upload and share lesson notes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Lesson Notes</h1>
              <p className="text-slate-500">Upload and share lesson notes</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Add Lesson</button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div></div>) :
        lessons.length === 0 ? <div className="col-span-full bg-white rounded-xl p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No lessons yet</p></div> :
        lessons.map((lesson) => (
          <div key={lesson.id} className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center"><FileText className="text-emerald-600" size={24} /></div>
              <div className="flex gap-1"><button onClick={() => handleDelete(lesson.id)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 size={16} className="text-red-500" /></button></div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{lesson.title}</h3>
            <p className="text-sm text-slate-500 mb-3">{lesson.subject?.name}</p>
            <p className="text-sm text-slate-600 line-clamp-3 mb-4">{lesson.content}</p>
            {lesson.attachments && lesson.attachments.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500"><Paperclip size={14} /><span>{lesson.attachments.length} attachment(s)</span></div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Add Lesson</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Lesson title" /></div>
              <div><label className="label">Subject</label><select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="label">Content (Markdown supported)</label><textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="input" rows={8} placeholder="Lesson content..." /></div>
              <div><label className="label">Attachments (comma-separated URLs)</label><input type="text" value={formData.attachments} onChange={(e) => setFormData({ ...formData, attachments: e.target.value })} className="input" placeholder="URL1, URL2, URL3" /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSave} className="btn-primary">Publish</button></div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}