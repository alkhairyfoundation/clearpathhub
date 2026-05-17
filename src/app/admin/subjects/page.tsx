'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, X, FileText, Loader2, Search, Filter, Download, Hash } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

type Subject = {
  id: string;
  name: string;
  code: string;
  department_id: string | null;
  class_id: string | null;
  teacher_id: string | null;
  created_at?: string;
  department?: { name: string };
  class?: { name: string };
  teacher?: { first_name: string; last_name: string };
};

export default function AdminSubjectsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [formData, setFormData] = useState({ name: '', code: '', department_id: '', class_id: '', teacher_id: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [subjectsRes, classesRes, deptsRes, teachersRes] = await Promise.all([
      supabase.from('subjects').select('*, department:departments!department_id(name), class:classes!class_id(name), teacher:profiles!teacher_id(first_name, last_name)').order('name'),
      supabase.from('classes').select('id, name').order('level'),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('profiles').select('id, first_name, last_name').eq('role', 'teacher').order('first_name'),
    ]);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    if (deptsRes.data) setDepartments(deptsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setLoading(false);
  }

  function openModal(subject?: Subject) {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        code: subject.code,
        department_id: subject.department_id || '',
        class_id: subject.class_id || '',
        teacher_id: subject.teacher_id || '',
      });
    } else {
      setEditingSubject(null);
      setFormData({ name: '', code: '', department_id: '', class_id: '', teacher_id: '' });
    }
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) { setError('Subject name is required'); return; }
    setError(''); setSaving(true);
    try {
      const data = {
        name: formData.name.trim(),
        code: formData.code.trim() || formData.name.substring(0, 4).toUpperCase(),
        department_id: formData.department_id || null,
        class_id: formData.class_id || null,
        teacher_id: formData.teacher_id || null,
      };
      if (editingSubject) {
        const { error: err } = await supabase.from('subjects').update(data).eq('id', editingSubject.id);
        if (err) throw new Error(err.message);
        setSuccess('Subject updated successfully');
      } else {
        const { error: err } = await supabase.from('subjects').insert(data);
        if (err) throw new Error(err.message);
        setSuccess('Subject created successfully');
      }
      setTimeout(() => { setShowModal(false); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save subject');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this subject? This will unlink related sessions and lessons.')) return;
    setDeleting(id);
    try {
      await supabase.from('sessions').update({ subject_id: null }).eq('subject_id', id);
      await supabase.from('lessons').update({ subject_id: null }).eq('subject_id', id);
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Subject deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete subject');
    } finally {
      setDeleting(null);
    }
  }

  const filtered = subjects.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = filterDepartment === 'all' || s.department_id === filterDepartment;
    const matchClass = filterClass === 'all' || s.class_id === filterClass;
    return matchSearch && matchDept && matchClass;
  });

  return (
    <DashboardLayout title="Subjects" subtitle="Manage school subjects and assignments">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
            <p className="text-slate-500 mt-1">{subjects.length} subjects across {departments.length} departments</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Subject
          </button>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
        
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Search subjects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-10" />
            </div>
            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="input sm:w-48">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="input sm:w-48">
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No subjects found</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">Create your first subject</p>
            <button onClick={() => openModal()} className="btn-primary">Add Subject</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(subj => (
              <div key={subj.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{subj.name}</h3>
                    <p className="text-sm text-slate-500">{subj.code} • {subj.class?.name || 'All Classes'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openModal(subj)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Edit size={15} className="text-blue-600" /></button>
                    <button onClick={() => handleDelete(subj.id)} disabled={deleting === subj.id} className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50">
                      {deleting === subj.id ? <Loader2 size={15} className="text-red-600 animate-spin" /> : <Trash2 size={15} className="text-red-600" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>{subj.department?.name || 'No Department'}</span>
                  {subj.teacher && <span>• {subj.teacher.first_name} {subj.teacher.last_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{editingSubject ? 'Edit' : 'Add'} Subject</h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                <div><label className="label">Subject Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input" placeholder="e.g., Mathematics" /></div>
                <div><label className="label">Subject Code</label><input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="input" placeholder="e.g., MATH101" /></div>
                <div><label className="label">Department</label><select value={formData.department_id} onChange={e => setFormData({...formData, department_id: e.target.value})} className="input"><option value="">No Department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div><label className="label">Class (Optional)</label><select value={formData.class_id} onChange={e => setFormData({...formData, class_id: e.target.value})} className="input"><option value="">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="label">Assigned Teacher</label><select value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})} className="input"><option value="">No Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
                <button onClick={() => { setShowModal(false); setError(''); }} className="btn-ghost">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
