'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, X, GraduationCap, Loader2, ArrowLeft } from 'lucide-react';
import type { Class } from '@/types';

export default function AdminClassesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', level: 1, department_id: '', class_teacher_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [classesRes, deptsRes, teachersRes] = await Promise.all([
      supabase.from('classes').select('*, department:departments!department_id(name), class_teacher:profiles!class_teacher_id(first_name, last_name)').order('level').order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'teacher').order('first_name'),
    ]);
    if (classesRes.data) setClasses(classesRes.data);
    if (deptsRes.data) setDepartments(deptsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setLoading(false);
  }

  function openModal(cls?: Class) {
    if (cls) { setEditing(cls); setFormData({ name: cls.name, level: cls.level, department_id: cls.department_id || '', class_teacher_id: cls.class_teacher_id || '' }); }
    else { setEditing(null); setFormData({ name: '', level: 1, department_id: '', class_teacher_id: '' }); }
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) { setError('Class name is required'); return; }
    if (formData.level < 1 || formData.level > 12) { setError('Level must be between 1 and 12'); return; }
    
    setError(''); setSaving(true);
    try {
      if (editing) {
        const { error: err } = await supabase.from('classes').update(formData).eq('id', editing.id);
        if (err) throw new Error(err.message);
        setSuccess('Class updated successfully');
      } else {
        const { error: err } = await supabase.from('classes').insert(formData);
        if (err) throw new Error(err.message);
        setSuccess('Class created successfully');
      }
      setTimeout(() => { setShowModal(false); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save class');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this class? This will unlink associated students and subjects.')) return;
    setDeleting(id);
    try {
      await supabase.from('students').update({ class_id: null }).eq('class_id', id);
      await supabase.from('subjects').update({ class_id: null }).eq('class_id', id);
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Class deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete class');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <DashboardLayout title="Classes" subtitle="Manage school classes and class teachers">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
            <p className="text-slate-500 mt-1">Manage school classes and class teachers</p>
          </div>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Class
        </button>
      </div>

      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-16">
          <GraduationCap className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="font-medium text-slate-500">No classes yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Create your first class</p>
          <button onClick={() => openModal()} className="btn-primary">Add Class</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Class Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Level</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Class Teacher</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map(cls => {
                const dept = departments.find(d => d.id === cls.department_id);
                const teacher = teachers.find(t => t.id === cls.class_teacher_id);
                return (
                  <tr key={cls.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{cls.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">Level {cls.level}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden md:table-cell">{dept?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden lg:table-cell">{teacher ? `${teacher.first_name} ${teacher.last_name}` : '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openModal(cls)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit size={16} className="text-slate-500" /></button>
                        <button onClick={() => handleDelete(cls.id)} disabled={deleting === cls.id} className="p-2 hover:bg-gray-100 rounded-lg">
                          {deleting === cls.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} className="text-red-500" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-800">{editing ? 'Edit Class' : 'Add Class'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div><label className="label">Class Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input" placeholder="e.g., JSS 1A" /></div>
              <div><label className="label">Level</label><input type="number" value={formData.level} onChange={e => setFormData({...formData, level: parseInt(e.target.value) || 1})} className="input" min={1} max={12} /></div>
              <div><label className="label">Department</label><select value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})} className="input"><option value="">No Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="label">Class Teacher</label><select value={formData.class_teacher_id} onChange={e => setFormData({...formData, class_teacher_id: e.target.value})} className="input"><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => { setShowModal(false); setError(''); }} className="btn-outline">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
