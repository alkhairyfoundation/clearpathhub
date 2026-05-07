'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, BookOpen, Loader2 } from 'lucide-react';
import type { Department } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminDepartmentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchDepartments();
  }, [profile]);

  async function fetchDepartments() {
    setLoading(true);
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (!error && data) setDepartments(data);
    setLoading(false);
  }

  function openModal(dept?: Department) {
    if (dept) {
      setEditingDepartment(dept);
      setFormData({ name: dept.name, code: dept.code });
    } else {
      setEditingDepartment(null);
      setFormData({ name: '', code: '' });
    }
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.code) return;
    setSaving(true);
    if (editingDepartment) {
      await supabase.from('departments').update(formData).eq('id', editingDepartment.id);
    } else {
      await supabase.from('departments').insert({ ...formData, id: crypto.randomUUID() });
    }
    setSaving(false);
    setShowModal(false);
    fetchDepartments();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this department?')) return;
    setDeleting(id);
    await supabase.from('departments').delete().eq('id', id);
    setDeleting(null);
    fetchDepartments();
  }

  return (
    <DashboardLayout title="Departments" subtitle="Manage school departments">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
            <p className="text-slate-500 mt-1">Manage school departments</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Department
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-slate-100 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="card text-center py-16">
            <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No departments yet</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Create your first department</p>
            <button onClick={() => openModal()} className="btn-primary">Add Department</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="text-blue-600" size={20} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(dept)} className="p-1.5 hover:bg-blue-50 rounded-lg">
                      <Edit className="text-blue-600" size={15} />
                    </button>
                    <button onClick={() => handleDelete(dept.id)} disabled={deleting === dept.id} className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50">
                      {deleting === dept.id ? <Loader2 className="text-red-600 animate-spin" size={15} /> : <Trash2 className="text-red-600" size={15} />}
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-slate-900">{dept.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Code: <span className="font-mono font-medium">{dept.code}</span></p>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{editingDepartment ? 'Edit' : 'Add'} Department</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="text-slate-500" size={20} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div><label className="label">Department Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input" placeholder="e.g., Science Department" /></div>
                <div><label className="label">Department Code</label><input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="input" placeholder="e.g., SCI" /></div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
                <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
