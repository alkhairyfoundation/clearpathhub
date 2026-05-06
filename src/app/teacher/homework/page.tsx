'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, FileText, Check, Clock } from 'lucide-react';
import type { Homework, Subject, Class } from '@/types';

export default function TeacherHomeworkPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [homework, setHomework] = useState<(Homework & { subject?: Subject; class?: Class })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', subject_id: '', class_id: '', due_date: '', total_marks: 100
  });

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [hwRes, subsRes, clsRes] = await Promise.all([
      supabase.from('homework').select('*, subject:subjects(*), class:classes(*)').order('due_date', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('classes').select('*').order('name'),
    ]);
    if (hwRes.data) setHomework(hwRes.data);
    if (subsRes.data) setSubjects(subsRes.data);
    if (clsRes.data) setClasses(clsRes.data);
    setLoading(false);
  }

  async function handleSave() {
    const data = { ...formData, subject_id: formData.subject_id || null, class_id: formData.class_id || null, teacher_id: profile?.id, due_date: formData.due_date || null };
    if (editingHomework) { await supabase.from('homework').update(data).eq('id', editingHomework.id); }
    else { await supabase.from('homework').insert({ ...data, id: crypto.randomUUID() }); }
    setShowModal(false); setFormData({ title: '', description: '', subject_id: '', class_id: '', due_date: '', total_marks: 100 }); setEditingHomework(null); fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this homework?')) { await supabase.from('homework').delete().eq('id', id); fetchData(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Homework</h1><p className="text-slate-500">Manage homework assignments</p></div>
        <button onClick={() => { setEditingHomework(null); setFormData({ title: '', description: '', subject_id: '', class_id: '', due_date: '', total_marks: 100 }); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={20} />Add Homework</button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div> : homework.length === 0 ? <div className="p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No homework found</p><button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add Homework</button></div> : (
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Title</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Subject</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Class</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Due</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Marks</th><th className="text-right py-3 px-6 text-sm font-medium text-slate-500">Actions</th></tr></thead>
            <tbody>{homework.map((hw) => (<tr key={hw.id} className="border-t hover:bg-gray-50"><td className="py-4 px-6 font-medium text-slate-800">{hw.title}</td><td className="py-4 px-6 text-slate-600">{hw.subject?.name || '-'}</td><td className="py-4 px-6 text-slate-600">{hw.class?.name || '-'}</td><td className="py-4 px-6 text-slate-600">{hw.due_date ? new Date(hw.due_date).toLocaleDateString() : '-'}</td><td className="py-4 px-6 text-slate-600">{hw.total_marks}</td><td className="py-4 px-6 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => { setEditingHomework(hw); setFormData({ title: hw.title, description: hw.description || '', subject_id: hw.subject_id || '', class_id: hw.class_id || '', due_date: hw.due_date || '', total_marks: hw.total_marks }); setShowModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-slate-600" /></button><button onClick={() => handleDelete(hw.id)} className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 size={16} className="text-red-500" /></button></div></td></tr>))}</tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">{editingHomework ? 'Edit' : 'New'} Homework</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Homework title" /></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} placeholder="Instructions" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Subject</label><select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="label">Class</label><select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="input"><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="input" /></div><div><label className="label">Total Marks</label><input type="number" value={formData.total_marks} onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })} className="input" /></div></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSave} className="btn-primary">{editingHomework ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}