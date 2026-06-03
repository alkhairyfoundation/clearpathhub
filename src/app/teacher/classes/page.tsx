'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { GraduationCap, Users, BookOpen, Plus, Edit, Trash2, X, Search, Clock, Calendar, ArrowLeft } from 'lucide-react';

export default function TeacherClassesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', level: '', section: '', teacher_id: '', capacity: 40 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      // Get teacher's class IDs from their subject assignments
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('class_id')
        .eq('teacher_id', profile?.id);

      const teacherClassIds = Array.from(new Set(subjectData?.map(s => s.class_id).filter(Boolean) || []));

      const [classesRes, studentsRes, subjectsRes] = await Promise.all([
        teacherClassIds.length > 0
          ? supabase.from('classes').select('*, teacher:profiles!class_teacher_id(first_name, last_name)').in('id', teacherClassIds).order('level')
          : { data: [], error: null },
        supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)').order('admission_number'),
        supabase.from('subjects').select('*').eq('teacher_id', profile?.id).order('name'),
      ]);
      if (classesRes.error) throw new Error(classesRes.error.message);
      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (classesRes.data) setClasses(classesRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);
      if (subjectsRes.data) setSubjects(subjectsRes.data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.name.trim()) { setError('Class name is required'); return; }
    setError(''); setSaving(true);
    try {
      const data = { ...formData, teacher_id: profile?.id, capacity: parseInt(formData.capacity.toString()) };
      if (editingClass) {
        const { error } = await supabase.from('classes').update(data).eq('id', editingClass.id);
        if (error) throw new Error(error.message);
        setSuccess('Class updated');
      } else {
        const { error } = await supabase.from('classes').insert(data);
        if (error) throw new Error(error.message);
        setSuccess('Class created');
      }
      setTimeout(() => { setShowModal(false); setFormData({ name: '', level: '', section: '', teacher_id: '', capacity: 40 }); setEditingClass(null); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this class?')) return;
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Class deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
    fetchData();
  }

  function openModal(cls?: any) {
    if (cls) {
      setEditingClass(cls);
      setFormData({ name: cls.name, level: cls.level || '', section: cls.section || '', teacher_id: cls.teacher_id || '', capacity: cls.capacity || 40 });
    } else {
      setEditingClass(null);
      setFormData({ name: '', level: '', section: '', teacher_id: '', capacity: 40 });
    }
    setShowModal(true);
  }

  const filtered = classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const getClassStudents = (classId: string) => students.filter(s => s.class_id === classId);

  return (
    <DashboardLayout title="My Classes" subtitle="Manage your classes and view student rosters">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">My Classes</h1>
              <p className="text-slate-500">Manage your classes and view student rosters</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2"><Plus size={18} />Add Class</button>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      <div className="card">
        <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search classes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><GraduationCap className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No classes found</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(cls => {
              const classStudents = getClassStudents(cls.id);
              const isSelected = selectedClass === cls.id;
              return (
                <div key={cls.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5 cursor-pointer" onClick={() => setSelectedClass(isSelected ? null : cls.id)}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><GraduationCap size={24} className="text-blue-600" /></div>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); openModal(cls); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><Edit size={14} className="text-slate-600" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(cls.id); }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={14} className="text-red-600" /></button>
                      </div>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{cls.name}</h3>
                    {cls.section && <p className="text-sm text-slate-500">Section: {cls.section}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <span className="flex items-center gap-1 text-sm text-slate-500"><Users size={14} />{classStudents.length} students</span>
                      <span className="text-xs text-slate-400">{cls.capacity ? `${classStudents.length}/${cls.capacity}` : ''}</span>
                    </div>
                  </div>
                  {isSelected && classStudents.length > 0 && (
                    <div className="border-t border-slate-200 p-4 bg-slate-50">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">Student Roster</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {classStudents.map(s => (
                          <div key={s.id} className="flex items-center justify-between text-sm">
                            <span>{s.profile?.first_name} {s.profile?.last_name}</span>
                            <span className="text-xs text-slate-500 font-mono">{s.admission_number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl"><h3 className="text-lg font-bold text-slate-900">{editingClass ? 'Edit' : 'New'} Class</h3><button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label">Class Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., JSS 1A" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Level</label><input type="text" value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className="input" placeholder="e.g., 1" /></div>
                <div><label className="label">Section</label><input type="text" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })} className="input" placeholder="e.g., A" /></div>
              </div>
              <div><label className="label">Capacity</label><input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} className="input" /></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-white sticky bottom-0"><button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : editingClass ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
