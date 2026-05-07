'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, X, FileText, Loader2, Search, Filter, Download, Hash } from 'lucide-react';

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

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [subjectsRes, classesRes, deptsRes, teachersRes] = await Promise.all([
      supabase.from('subjects').select('*, department:departments(name), class:classes(name), teacher:profiles!teacher_id(first_name, last_name)').order('name'),
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
    if (!formData.name.trim()) return;
    setSaving(true);
    const data = {
      name: formData.name.trim(),
      code: formData.code.trim() || formData.name.substring(0, 4).toUpperCase(),
      department_id: formData.department_id || null,
      class_id: formData.class_id || null,
      teacher_id: formData.teacher_id || null,
    };
    if (editingSubject) {
      await supabase.from('subjects').update(data).eq('id', editingSubject.id);
    } else {
      await supabase.from('subjects').insert({ ...data, id: crypto.randomUUID() });
    }
    setSaving(false);
    setShowModal(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this subject? This action cannot be undone.')) return;
    setDeleting(id);
    await supabase.from('subjects').delete().eq('id', id);
    setDeleting(null);
    fetchData();
  }

  const filtered = subjects.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = filterDepartment === 'all' || s.department_id === filterDepartment;
    const matchClass = filterClass === 'all' || s.class_id === filterClass;
    return matchSearch && matchDept && matchClass;
  });

  return (
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

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search subjects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" />
          </div>
          <div className="flex gap-2">
            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="input w-auto">
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="input w-auto">
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">{subjects.length === 0 ? 'No subjects yet' : 'No subjects match your filters'}</p>
            {subjects.length === 0 && <button onClick={() => openModal()} className="btn-primary mt-4">Add First Subject</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Department</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Class</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Teacher</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center"><FileText size={16} className="text-purple-600" /></div>
                        <span className="font-semibold text-slate-900">{subject.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4"><span className="font-mono text-sm font-medium bg-slate-100 px-2 py-0.5 rounded">{subject.code}</span></td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden md:table-cell">{subject.department?.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden lg:table-cell">{subject.class?.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden lg:table-cell">{subject.teacher ? `${subject.teacher.first_name} ${subject.teacher.last_name}` : '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openModal(subject)} className="p-1.5 hover:bg-blue-50 rounded-lg"><Edit size={15} className="text-blue-600" /></button>
                        <button onClick={() => handleDelete(subject.id)} disabled={deleting === subject.id} className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50">
                          {deleting === subject.id ? <Loader2 size={15} className="text-red-600 animate-spin" /> : <Trash2 size={15} className="text-red-600" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="label">Subject Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., Mathematics" /></div>
              <div><label className="label">Subject Code</label><input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="input" placeholder="e.g., MATH" /></div>
              <div><label className="label">Department</label><select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })} className="input"><option value="">None</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="label">Class</label><select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="input"><option value="">None</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="label">Teacher</label><select value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })} className="input"><option value="">None</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? <><Loader2 size={16} className="animate-spin mr-2" />Saving...</> : editingSubject ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
