'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Edit, Trash2, X, Loader2, AlertCircle, Check, 
  GraduationCap, Link2, Eye, Users, BookOpen, ArrowLeft
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import type { Student, Profile } from '@/types';

export default function TeacherStudentsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ email: '', password: '', admissionNumber: '' });

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    class_id: '',
    phone: '',
  });

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      // First get classes where teacher has subjects
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('class_id')
        .eq('teacher_id', profile?.id);
      
      const teacherClassIds = Array.from(new Set(subjectData?.map(s => s.class_id).filter(Boolean) || []));

      const [studentsRes, classesRes] = await Promise.all([
        supabase
          .from('students')
          .select('*, profile:profiles!profile_id(first_name, last_name, email, phone), class:classes!class_id(name)')
          .in('class_id', teacherClassIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('classes')
          .select('id, name, level')
          .in('id', teacherClassIds)
          .order('level'),
      ]);
      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (studentsRes.data) setStudents(studentsRes.data);
      if (classesRes.data) setClasses(classesRes.data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  function openCreateModal() {
    setEditingStudent(null);
    setError('');
    setSuccess('');
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      class_id: selectedClass || '',
      phone: '',
    });
    setShowModal(true);
  }

  function openEditModal(student: Student) {
    setEditingStudent(student);
    setError('');
    setSuccess('');
    setFormData({
      email: student.profile?.email || '',
      password: '',
      first_name: student.profile?.first_name || '',
      last_name: student.profile?.last_name || '',
      class_id: student.class_id || '',
      phone: student.profile?.phone || '',
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (editingStudent) {
        // Update existing student
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone || null,
          })
          .eq('id', editingStudent.profile_id);

        if (updateError) throw new Error(updateError.message);

        const { error: studentError } = await supabase
          .from('students')
          .update({ class_id: formData.class_id || null })
          .eq('id', editingStudent.id);

        if (studentError) throw new Error(studentError.message);
        setSuccess('Student updated successfully');
      } else {
        // Create new student
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const res = await fetch('/api/teacher/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to create student');
        setSuccess('Student created successfully');
        setNewCredentials({
          email: formData.email,
          password: formData.password,
          admissionNumber: result.admission_number || '',
        });
        setShowCredentialsModal(true);
      }

      fetchData();
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(student: Student) {
    if (!confirm(`Are you sure you want to delete ${student.profile?.first_name} ${student.profile?.last_name}? This cannot be undone.`)) return;

    try {
      const { error: deleteError } = await supabase.from('students').delete().eq('id', student.id);
      if (deleteError) throw new Error(deleteError.message);
      setStudents(students.filter(s => s.id !== student.id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  const filteredStudents = students.filter(s => {
    const matchesSearch = searchQuery
      ? `${s.profile?.first_name} ${s.profile?.last_name} ${s.admission_number} ${s.profile?.email}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true;
    const matchesClass = selectedClass ? s.class_id === selectedClass : true;
    return matchesSearch && matchesClass;
  });

  return (
    <DashboardLayout title="My Students" subtitle="Add and manage your students">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Students</h1>
              <p className="text-slate-500 mt-1">Add and manage your students</p>
            </div>
          </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input md:w-48"
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm flex items-center gap-2">
          <Check size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Students Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <GraduationCap size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No students found</p>
            <p className="text-sm mt-1">Click "Add Student" to create your first student</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Admission #</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Class</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {student.profile?.first_name?.[0]?.toUpperCase()}{student.profile?.last_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 text-sm block truncate">
                            {student.profile?.first_name} {student.profile?.last_name}
                          </span>
                          <span className="text-xs text-slate-400">{student.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 font-mono">{student.admission_number}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{student.class?.name || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden md:table-cell">{student.profile?.email}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-1.5 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={15} className="text-primary-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(student)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} className="text-red-600" />
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

      {/* Create/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-start gap-2">
                  <Check size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                  disabled={!!editingStudent}
                />
              </div>

              {!editingStudent && (
                <div>
                  <label className="label">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input"
                    required
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>
              )}

              <div>
                <label className="label">Class</label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+234..."
                />
              </div>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : editingStudent ? 'Update Student' : 'Create Student'}
                </button>
              </div>
            </form>
      </div>
    </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Student Created Successfully</h3>
              <p className="text-sm text-slate-500 mt-1">Please save these login credentials</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 font-medium mb-2"> Save these credentials now. You won't be able to see the password again.</p>
              </div>
              <div>
                <label className="label text-xs text-slate-500 uppercase font-semibold">Login Email</label>
                <input type="text" value={newCredentials.email} readOnly className="input bg-slate-50 font-mono text-sm" />
              </div>
              <div>
                <label className="label text-xs text-slate-500 uppercase font-semibold">Password</label>
                <input type="text" value={newCredentials.password} readOnly className="input bg-slate-50 font-mono text-sm" />
              </div>
              {newCredentials.admissionNumber && (
                <div>
                  <label className="label text-xs text-slate-500 uppercase font-semibold">Admission Number</label>
                  <input type="text" value={newCredentials.admissionNumber} readOnly className="input bg-slate-50 font-mono text-sm" />
                </div>
              )}
              <div className="p-3 bg-primary-50 rounded-lg">
                <p className="text-xs text-primary-700 font-medium">Login URL: <span className="font-mono">/login</span></p>
              </div>
            </div>
            <div className="p-5 border-t border-slate-200">
              <button onClick={() => setShowCredentialsModal(false)} className="btn-primary w-full">
                I've Saved the Credentials
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  </DashboardLayout>
  );
}
