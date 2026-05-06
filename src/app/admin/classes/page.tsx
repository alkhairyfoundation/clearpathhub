'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, GraduationCap, Users } from 'lucide-react';
import type { Class, Department } from '@/types';

export default function AdminClassesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({ name: '', level: 1, department_id: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [classesRes, deptsRes] = await Promise.all([
      supabase.from('classes').select('*, department:departments(*)').order('level'),
      supabase.from('departments').select('*').order('name'),
    ]);
    
    if (classesRes.data) setClasses(classesRes.data);
    if (deptsRes.data) setDepartments(deptsRes.data);
    setLoading(false);
  }

  async function handleSave() {
    const data = {
      ...formData,
      level: parseInt(formData.level.toString()),
      department_id: formData.department_id || null,
    };
    
    if (editingClass) {
      await supabase.from('classes').update(data).eq('id', editingClass.id);
    } else {
      await supabase.from('classes').insert({ ...data, id: crypto.randomUUID() });
    }
    setShowModal(false);
    setFormData({ name: '', level: 1, department_id: '' });
    setEditingClass(null);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this class?')) {
      await supabase.from('classes').delete().eq('id', id);
      fetchData();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Classes</h1>
          <p className="text-slate-500">Manage school classes</p>
        </div>
        <button
          onClick={() => { setEditingClass(null); setFormData({ name: '', level: 1, department_id: '' }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))
        ) : classes.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-md p-12 text-center">
            <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-slate-500">No classes found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
              Add First Class
            </button>
          </div>
        ) : (
          classes.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="text-emerald-600" size={24} />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingClass(cls); setFormData({ name: cls.name, level: cls.level, department_id: cls.department_id || '' }); setShowModal(true); }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit size={16} className="text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">{cls.name}</h3>
              <p className="text-sm text-slate-500">Level: {cls.level}</p>
              {cls.department && (
                <p className="text-sm text-slate-500">{cls.department.name}</p>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingClass ? 'Edit Class' : 'Add Class'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Class Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Grade 10-A"
                />
              </div>
              <div>
                <label className="label">Level</label>
                <input
                  type="number"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                  className="input"
                  min={1}
                  max={12}
                />
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="btn-outline">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                {editingClass ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}