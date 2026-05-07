'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, GraduationCap, Loader2 } from 'lucide-react';
import type { Class } from '@/types';

export default function AdminClassesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', level: 1, department_id: '', class_teacher_id: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [classesRes, deptRes, teacherRes] = await Promise.all([
      supabase.from('classes').select('*').order('level'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('profiles').select('id, first_name, last_name').eq('role', 'teacher').order('first_name'),
    ]);
    if (classesRes.data) setClasses(classesRes.data);
    if (deptRes.data) setDepartments(deptRes.data);
    if (teacherRes.data) setTeachers(teacherRes.data);
    setLoading(false);
  }

  function openModal(cls?: Class) {
    if (cls) {
      setEditingClass(cls);
      setFormData({ name: cls.name, level: cls.level, department_id: cls.department_id || '', class_teacher_id: cls.class_teacher_id || '' });
    } else {
      setEditingClass(null);
      setFormData({ name: '', level: 1, department_id: '', class_teacher_id: '' });
    }
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name) return;
    setSaving(true);
    if (editingClass) {
      await supabase.from('classes').update(formData).eq('id', editingClass.id);
    } else {
      await supabase.from('classes').insert({ ...formData, id: crypto.randomUUID() });
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this class?')) return;
    setDeleting(id);
    await supabase.from('classes').delete().eq('id', id);
    setDeleting(null);
    fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
          <p className="text-slate-500 mt-1">Manage school classes and class teachers</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Class
        </button>
      </div>

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
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Class Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Class Teacher</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map((cls) => {
                const teacher = teachers.find(t => t.id === cls.class_teacher_id);
                const dept = departments.find(d => d.id === cls.department_id);
                return (
                  <tr key={cls.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{cls.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">Level {cls.level}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden md:table-cell">{dept?.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden lg:table-cell">{teacher ? `${teacher.first_name} ${teacher.last_name}` : '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openModal(cls)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Edit size={15} className="text-blue-600" /></button>
                        <button onClick={() => handleDelete(cls.id)} disabled={deleting === cls.id} className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50">
                          {deleting === cls.id ? <Loader2 size={15} className="text-red-600 animate-spin" /> : <Trash2 size={15} className="text-red-600" />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingClass ? 'Edit Class' : 'Add Class'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="label">Class Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., JSS 1A" /></div>
              <div><label className="label">Level</label><input type="number" value={formData.level} onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })} className="input" min={1} /></div>
              <div><label className="label">Department (optional)</label><select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} className="input"><option value="">None</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="label">Class Teacher (optional)</label><select value={formData.class_teacher_id} onChange={(e) => setFormData({ ...formData, class_teacher_id: e.target.value })} className="input"><option value="">None</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : editingClass ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
