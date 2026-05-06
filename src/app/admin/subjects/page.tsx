'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, FileText, Users, BookOpen } from 'lucide-react';
import type { Subject, Class, Department, Profile } from '@/types';

export default function AdminSubjectsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', department_id: '', class_id: '', teacher_id: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [subjectsRes, classesRes, deptsRes, teachersRes] = await Promise.all([
      supabase.from('subjects').select('*, department:departments(*), class:classes(*), teacher:profiles!teacher_id(*)').order('name'),
      supabase.from('classes').select('*').order('level'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'teacher').order('first_name'),
    ]);
    
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    if (deptsRes.data) setDepartments(deptsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setLoading(false);
  }

  async function handleSave() {
    const data = {
      name: formData.name,
      code: formData.code,
      department_id: formData.department_id || null,
      class_id: formData.class_id || null,
      teacher_id: formData.teacher_id || null,
    };
    
    if (editingSubject) {
      await supabase.from('subjects').update(data).eq('id', editingSubject.id);
    } else {
      await supabase.from('subjects').insert({ ...data, id: crypto.randomUUID() });
    }
    setShowModal(false);
    setFormData({ name: '', code: '', department_id: '', class_id: '', teacher_id: '' });
    setEditingSubject(null);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this subject?')) {
      await supabase.from('subjects').delete().eq('id', id);
      fetchData();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Subjects</h1>
          <p className="text-slate-500">Manage school subjects</p>
        </div>
        <button
          onClick={() => { setEditingSubject(null); setFormData({ name: '', code: '', department_id: '', class_id: '', teacher_id: '' }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add Subject
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-slate-500">No subjects found</p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4">
              Add First Subject
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Subject</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Code</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Class</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Teacher</th>
                <th className="text-right py-3 px-6 text-sm font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id} className="border-t hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="text-purple-600" size={20} />
                      </div>
                      <span className="font-medium text-slate-800">{subject.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{subject.code}</td>
                  <td className="py-4 px-6 text-slate-600">{subject.class?.name || '-'}</td>
                  <td className="py-4 px-6 text-slate-600">
                    {subject.teacher ? `${subject.teacher.first_name} ${subject.teacher.last_name}` : '-'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingSubject(subject); setFormData({ name: subject.name, code: subject.code, department_id: subject.department_id || '', class_id: subject.class_id || '', teacher_id: subject.teacher_id || '' }); setShowModal(true); }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit size={16} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Subject Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Mathematics"
                />
              </div>
              <div>
                <label className="label">Subject Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="input"
                  placeholder="e.g., MATH"
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
              <div>
                <label className="label">Class</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Teacher</label>
                <select
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="input"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.first_name} {teacher.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="btn-outline">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-primary">
                {editingSubject ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}