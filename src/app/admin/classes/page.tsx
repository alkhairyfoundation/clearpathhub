'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, X, GraduationCap, Loader2, ArrowLeft, ArrowUpCircle, ArrowDownCircle, AlertTriangle, CheckCircle } from 'lucide-react';
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
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteResult, setPromoteResult] = useState<any>(null);
  const [classData, setClassData] = useState<any[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  useEffect(() => {
    if (promoteOpen) fetchClassData();
  }, [promoteOpen]);

  async function fetchData() {
    setLoading(true);
    const [classesRes, deptsRes, teachersRes] = await Promise.all([
      db.from('classes').select('*, department:departments!department_id(name), class_teacher:profiles!class_teacher_id(first_name, last_name)').order('level').order('name'),
      db.from('departments').select('*').order('name'),
      db.from('profiles').select('*').eq('role', 'teacher').order('first_name'),
    ]);
    if (classesRes.data) setClasses(classesRes.data);
    if (deptsRes.data) setDepartments(deptsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setLoading(false);
  }

  async function fetchClassData() {
    const { data, error } = await db
      .from('classes')
      .select(`
        id, name, level, next_class_id,
        next_class:next_class_id(name, level),
        students:students!class_id(id)
      `)
      .order('level')
      .order('name');
    if (!error && data) {
      setClassData(data);
    }
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
      const record = {
        name: formData.name,
        level: formData.level,
        department_id: formData.department_id && formData.department_id.trim() !== '' ? formData.department_id : null,
        class_teacher_id: formData.class_teacher_id && formData.class_teacher_id.trim() !== '' ? formData.class_teacher_id : null,
      };
      if (editing) {
        const { error: err } = await db.from('classes').update(record).eq('id', editing.id);
        if (err) throw new Error(err.message);

        if (record.class_teacher_id) {
          const { data: existing } = await db.from('teacher_classes').select('id').eq('teacher_id', record.class_teacher_id).eq('class_id', editing.id).maybeSingle();
          if (!existing) {
            await db.from('teacher_classes').insert({ teacher_id: record.class_teacher_id, class_id: editing.id });
          }
        }

        setSuccess('Class updated successfully');
      } else {
        const { data: newClass, error: err } = await db.from('classes').insert(record).select().maybeSingle();
        if (err) throw new Error(err.message);
        if (newClass && record.class_teacher_id) {
          await db.from('teacher_classes').insert({ teacher_id: record.class_teacher_id, class_id: newClass.id });
        }
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
      await db.from('students').update({ class_id: null }).eq('class_id', id);
      await db.from('subjects').update({ class_id: null }).eq('class_id', id);
      const { error } = await db.from('classes').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Class deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete class');
    } finally {
      setDeleting(null);
    }
  }

  async function handlePromoteAll() {
    setPromoteLoading(true);
    setPromoteResult(null);
    try {
      const res = await fetch('/api/admin/promote-students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classIds: [] }) });
      const data = await res.json();
      if (data.success) {
        setPromoteResult(data);
        setSuccess(`${data.promoted_count} student(s) promoted successfully!`);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Promotion failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to promote students');
    } finally {
      setPromoteLoading(false);
      fetchData();
    }
  }

  return (
    <DashboardLayout title="Classes" subtitle="Manage school classes and class teachers">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 rounded-lg dark:hover:bg-slate-700">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Classes</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Manage school classes and class teachers</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Add Class
            </button>
            <button onClick={() => setPromoteOpen(true)} className="btn-accent flex items-center gap-2">
              <ArrowUpCircle size={18} /> Promote All Students
            </button>
          </div>
        </div>

      {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm">{success}</div>}
      {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      ) : classes.length === 0 ? (
        <div className="card text-center py-16">
          <GraduationCap className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No classes yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1 mb-4">Create your first class</p>
          <button onClick={() => openModal()} className="btn-primary">Add Class</button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Class Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Level</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase hidden md:table-cell">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase hidden lg:table-cell">Class Teacher</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classes.map(cls => {
                const dept = departments.find(d => d.id === cls.department_id);
                const teacher = teachers.find(t => t.id === cls.class_teacher_id);
                return (
                  <tr key={cls.id} className="hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white dark:text-white">{cls.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">Level {cls.level}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 hidden md:table-cell">{dept?.name || '-'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 hidden lg:table-cell">{teacher ? `${teacher.first_name} ${teacher.last_name}` : '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openModal(cls)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 rounded-lg dark:hover:bg-slate-700"><Edit size={16} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" /></button>
                        <button onClick={() => handleDelete(cls.id)} disabled={deleting === cls.id} className="p-2 hover:bg-gray-100 dark:bg-slate-700 rounded-lg dark:hover:bg-slate-700">
                          {deleting === cls.id ? <Loader2 size={16} className="animate-spin text-red-500 dark:text-red-400 dark:text-red-400" /> : <Trash2 size={16} className="text-red-500 dark:text-red-400 dark:text-red-400" />}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md dark:bg-slate-800">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">{editing ? 'Edit Class' : 'Add Class'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 rounded-lg dark:hover:bg-slate-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}
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

      {promoteOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-800">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Promote All Students</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Move every student to their class&rsquo;s next level</p>
              </div>
              <button onClick={() => { setPromoteOpen(false); setPromoteResult(null); }} className="p-2 hover:bg-gray-100 dark:bg-slate-700 rounded-lg dark:hover:bg-slate-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">This action cannot be undone</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    All students will be moved to the next class level based on their current class&rsquo;s configured next_class_id. Students at the highest level (no next class) will be skipped. You can manually adjust assignments afterwards on the User Management page.
                  </p>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Class Hierarchy Preview</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {classData.map((cls: any, i: number) => (
                  <div key={cls.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600">
                    <div className="flex-1">
                      <span className="font-medium text-slate-900 dark:text-white text-sm">{cls.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">Level {cls.level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {cls.next_class ? (
                        <>
                          <ArrowDownCircle size={16} className="text-primary-600" />
                          <span className="text-xs text-primary-600 dark:text-primary-400">→ {cls.next_class.name}</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">— (highest level)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {cls.students?.length || 0} student(s)
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => { setPromoteOpen(false); setPromoteResult(null); }} disabled={promoteLoading} className="btn-outline">Cancel</button>
              <button onClick={handlePromoteAll} disabled={promoteLoading} className="btn-accent flex items-center gap-2">
                {promoteLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpCircle size={18} />}
                {promoteLoading ? 'Promoting...' : 'Confirm Promote All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {promoteResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg dark:bg-slate-800">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Promotion Complete</h2>
              <button onClick={() => setPromoteResult(null)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 rounded-lg dark:hover:bg-slate-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{promoteResult.promoted_count}</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-300">Students Promoted</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{promoteResult.total_eligible}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Eligible</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-900/40">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{promoteResult.skipped_no_next_class}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">Skipped (Highest Level)</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/40">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{promoteResult.total_eligible - promoteResult.promoted_count}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">Total Not Promoted</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="text-emerald-600" size={18} />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">Manual adjustments can be made on the User Management page</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => { setPromoteResult(null); fetchData(); }} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
