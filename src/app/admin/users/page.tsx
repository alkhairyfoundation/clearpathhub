'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, uploadFile } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Plus, Search, Edit, Trash2, Users, GraduationCap, UserCheck, UserMinus,
  DollarSign, X, Loader2, AlertCircle, Check, UserPlus, Link2, Eye, Upload
} from 'lucide-react';
import BulkStudentUpload from '@/components/BulkStudentUpload';
import type { Profile, UserRole, Student } from '@/types';

const roleConfig: Record<UserRole, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: 'text-primary-700', bg: 'bg-primary-100', icon: <Users size={14} /> },
  teacher: { label: 'Teacher', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <UserCheck size={14} /> },
  student: { label: 'Student', color: 'text-accent-700', bg: 'bg-accent-100', icon: <GraduationCap size={14} /> },
  parent: { label: 'Parent', color: 'text-secondary-700', bg: 'bg-secondary-100', icon: <UserMinus size={14} /> },
  accountant: { label: 'Accountant', color: 'text-success-700', bg: 'bg-success-100', icon: <DollarSign size={14} /> },
};

type UserFormData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone: string;
  class_id: string;
  avatar_url: string;
};

type ClassOption = { id: string; name: string; level: number };

function AdminUsersPageContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') as UserRole | null;

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>(initialRole || 'all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingParent, setLinkingParent] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ email: '', password: '' });
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);
  const [userExtraInfo, setUserExtraInfo] = useState<Record<string, any>>({});
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [studentClassMap, setStudentClassMap] = useState<Record<string, string>>({});
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);
  const [teacherSubjectName, setTeacherSubjectName] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    email: '', password: '', first_name: '', last_name: '', role: 'teacher', phone: '', class_id: '', avatar_url: '',
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 512, useWebWorker: true });
      const { url, error } = await uploadFile('avatars', compressed, 'admin-upload');
      if (error) throw error;
      if (url) setFormData(prev => ({ ...prev, avatar_url: url }));
    } catch (err: any) {
      setError(err.message || 'Avatar upload failed');
    }
    setUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  // Student-specific fields for linking
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchUsers();
  }, [profile, selectedRole]);

  useEffect(() => {
    if (!viewingUser) { setUserExtraInfo({}); return; }
    const uid = viewingUser.id;
    const role = viewingUser.role;
    async function fetchExtraInfo() {
      if (role === 'student') {
        const { data } = await supabase.from('students').select('*, class:class_id(name, level)').eq('profile_id', uid).maybeSingle();
        if (data) setUserExtraInfo(data);
      } else       if (role === 'teacher') {
        const [staffRes, subjectsRes] = await Promise.all([
          supabase.from('staff').select('*, department:departments(name)').eq('profile_id', uid).maybeSingle(),
          supabase.from('subjects').select('id, name, code, class:classes!class_id(name)').eq('teacher_id', uid),
        ]);
        if (staffRes.data || subjectsRes.data) {
          setUserExtraInfo({ ...staffRes.data, subjects: subjectsRes.data || [] });
        }
      } else if (role === 'accountant') {
        const { data } = await supabase.from('staff').select('*, department:departments(name)').eq('profile_id', uid).maybeSingle();
        if (data) setUserExtraInfo(data);
      } else if (role === 'parent') {
        const { data } = await supabase.from('parent_students').select('*, student:students!student_id(profile:profiles!profile_id(first_name, last_name), admission_number, class_id)').eq('parent_id', uid);
        if (data) setUserExtraInfo({ children: data });
      }
    }
    fetchExtraInfo();
  }, [viewingUser]);

  async function fetchUsers() {
    setLoading(true);
    let query = supabase.from('profiles').select('*');

    if (selectedRole !== 'all') {
      query = query.eq('role', selectedRole);
    }

    const { data, error: fetchError } = await query.order('created_at', { ascending: false });

    if (!fetchError && data) {
      setUsers(data);
    }

    // Fetch class info for student filtering/display
    if (selectedRole === 'all' || selectedRole === 'student') {
      const { data: classList } = await supabase.from('classes').select('id, name, level').order('name');
      if (classList) setAllClasses(classList);
      const { data: studentRecords } = await supabase.from('students').select('profile_id, class_id');
      if (studentRecords) {
        const map: Record<string, string> = {};
        studentRecords.forEach(s => { if (s.class_id) map[s.profile_id] = s.class_id; });
        setStudentClassMap(map);
      }
    } else {
      setAllClasses([]);
      setStudentClassMap({});
    }

    setLoading(false);
  }

  async function fetchAvailableStudents() {
    const { data } = await supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), parent:profiles!parent_id(first_name, last_name)');
    if (data) setAvailableStudents(data);
  }

  async function openCreateModal(role?: UserRole) {
    setEditingUser(null);
    setError('');
    setSuccess('');
    const selectedRole = role || 'teacher';
    setFormData({
      email: '', password: '', first_name: '', last_name: '',
      role: selectedRole, phone: '', class_id: '', avatar_url: '',
    });
    setTeacherClassIds([]);
    setTeacherSubjectName('');
    if (selectedRole === 'student' || selectedRole === 'teacher') {
      const { data } = await supabase.from('classes').select('id, name, level').order('name');
      setClasses(data || []);
    } else {
      setClasses([]);
    }
    setShowModal(true);
  }

  function openEditModal(user: Profile) {
    setEditingUser(user);
    setError('');
    setSuccess('');
    setResetPasswordMode(false);
    setFormData({
      email: user.email, password: '', first_name: user.first_name,
      last_name: user.last_name, role: user.role, phone: user.phone || '', class_id: '', avatar_url: user.avatar_url || '',
    });
    setTeacherSubjectName('');
    if (user.role === 'student' || user.role === 'teacher') {
      supabase.from('classes').select('id, name, level').order('name').then(({ data }) => setClasses(data || []));
    } else {
      setClasses([]);
    }
    if (user.role === 'teacher') {
      supabase.from('subjects').select('class_id').eq('teacher_id', user.id).then(({ data }) => {
        setTeacherClassIds(data?.map(s => s.class_id).filter(Boolean) as string[] || []);
      });
    } else {
      setTeacherClassIds([]);
    }
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (editingUser) {
        const body: Record<string, any> = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          phone: formData.phone || null,
          avatar_url: formData.avatar_url || null,
        };
        if (formData.password) body.password = formData.password;
        if (formData.role === 'teacher') {
          body.class_ids = teacherClassIds;
          body.subject_name = teacherSubjectName || undefined;
        }
        if (formData.role === 'student') {
          body.class_id = formData.class_id || null;
        }

        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to update user');
        setSuccess(result.message);
        setResetPasswordMode(false);
      } else {
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            class_ids: formData.role === 'teacher' ? teacherClassIds : undefined,
            subject_name: formData.role === 'teacher' ? (teacherSubjectName || undefined) : undefined,
          }),
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to create user');
        setSuccess(result.message || 'User created successfully');
        if (result.warning) setError(result.warning);
        setNewCredentials({ email: formData.email, password: formData.password });
        setShowCredentialsModal(true);
      }

      fetchUsers();
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

  async function handleDelete(user: Profile) {
    if (!confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}? This cannot be undone.`)) return;

    setDeleting(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete user');

      setUsers(users.filter(u => u.id !== user.id));
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleUnlinkStudent(studentId: string) {
    if (!linkingParent) return;
    if (!window.confirm('Remove this student from the parent?')) return;
    setSaving(true);
    try {
      // Clear students table (legacy)
      const { error: studentError } = await supabase.from('students').update({ parent_id: null }).eq('id', studentId);
      if (studentError) throw new Error(studentError.message);

      // Clear parent_students junction
      const { error: junctionError } = await supabase
        .from('parent_students')
        .delete()
        .eq('parent_id', linkingParent.id)
        .eq('student_id', studentId);

      if (junctionError) throw new Error(junctionError.message);

      setSuccess('Student unlinked successfully');
      fetchAvailableStudents();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleLinkStudents() {
    if (!linkingParent || selectedStudentIds.length === 0) return;
    setSaving(true);
    setError('');

    try {
      // Check if any selected students already have a parent
      const { data: existingLinks, error: checkError } = await supabase
        .from('students')
        .select('id, admission_number, profile:profiles!profile_id(first_name, last_name), parent:profiles!parent_id(first_name, last_name)')
        .in('id', selectedStudentIds)
        .not('parent_id', 'is', null);

      if (checkError) throw new Error(checkError.message);

      if (existingLinks && existingLinks.length > 0) {
        const confirmReassign = window.confirm(
          `${existingLinks.length} student(s) already have a parent assigned. Do you want to reassign them to ${linkingParent.first_name} ${linkingParent.last_name}?`
        );
        if (!confirmReassign) {
          setSaving(false);
          return;
        }
      }

      // Update students table (legacy)
      const { error: studentError } = await supabase
        .from('students')
        .update({ parent_id: linkingParent.id })
        .in('id', selectedStudentIds);

      if (studentError) throw new Error(studentError.message);

      // Insert into parent_students junction table
      const junctionData = selectedStudentIds.map(sid => ({
        parent_id: linkingParent.id,
        student_id: sid,
        relationship: 'other' // Default
      }));

      const { error: junctionError } = await supabase
        .from('parent_students')
        .upsert(junctionData, { onConflict: 'parent_id, student_id' });

      if (junctionError) throw new Error(junctionError.message);

      setSuccess(`${selectedStudentIds.length} student(s) linked to ${linkingParent.first_name}`);
      setShowLinkModal(false);
      setLinkingParent(null);
      setSelectedStudentIds([]);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.first_name} ${user.last_name} ${user.email} ${user.phone || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedClass && (user.role === 'student' || selectedRole === 'all')) {
      return studentClassMap[user.id] === selectedClass;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Create, edit, and manage all users</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openCreateModal('teacher')} className="btn-primary flex items-center gap-2">
            <UserPlus size={16} /> Add Teacher
          </button>
          <button onClick={() => openCreateModal('student')} className="btn-accent flex items-center gap-2">
            <UserPlus size={16} /> Add Student
          </button>
          <button onClick={() => setShowBulkModal(true)} className="btn-outline flex items-center gap-2">
            <Upload size={16} /> Bulk Import
          </button>
          <button onClick={() => openCreateModal('parent')} className="btn-outline flex items-center gap-2">
            <UserPlus size={16} /> Add Parent
          </button>
          <button onClick={() => openCreateModal('accountant')} className="btn-secondary flex items-center gap-2">
            <UserPlus size={16} /> Add Accountant
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text" placeholder="Search by name, email, or phone..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'admin', 'teacher', 'student', 'parent', 'accountant'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedRole === role ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role === 'all' ? 'All' : roleConfig[role]?.label || role}
              </button>
            ))}
          </div>
          {(selectedRole === 'all' || selectedRole === 'student') && allClasses.length > 0 && (
            <div className="w-full lg:w-64">
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="input text-sm">
                <option value="">All Classes</option>
                {allClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} (Level {c.level})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      {selectedClass && (
        <div className="flex items-center gap-2 text-sm text-primary-700 bg-primary-50 px-3 py-2 rounded-lg">
          <span>Filtered by class</span>
          <button onClick={() => setSelectedClass('')} className="ml-1 hover:underline">Clear</button>
        </div>
      )}

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

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p className="font-medium">No users found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Class</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {user.first_name[0]?.toUpperCase()}{user.last_name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 text-sm block truncate">
                            {user.first_name} {user.last_name}
                          </span>
                          <span className="text-xs text-slate-400">{user.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleConfig[user.role]?.bg} ${roleConfig[user.role]?.color}`}>
                        {roleConfig[user.role]?.icon}
                        {roleConfig[user.role]?.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden md:table-cell">
                      {user.role === 'student' ? (() => {
                        const cId = studentClassMap[user.id];
                        const c = allClasses.find(cl => cl.id === cId);
                        return c ? c.name : '—';
                      })() : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden md:table-cell">{user.phone || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-500 hidden lg:table-cell">
                      {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingUser(user)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} className="text-slate-500" />
                        </button>
                        {user.role === 'parent' && (
                          <button
                            onClick={() => { setLinkingParent(user); setSelectedStudentIds([]); fetchAvailableStudents(); setShowLinkModal(true); }}
                            className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Link Students"
                          >
                            <Link2 size={15} className="text-emerald-600" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={15} className="text-primary-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deleting === user.id}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === user.id ? <Loader2 size={15} className="text-red-600 animate-spin" /> : <Trash2 size={15} className="text-red-600" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredUsers.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit User' : `Create ${roleConfig[formData.role]?.label || 'User'}`}
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
                  <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input" required />
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" required disabled={!!editingUser} />
              </div>

              {!editingUser ? (
                <div>
                  <label className="label">Password</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input" required placeholder="Minimum 6 characters" minLength={6} />
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={resetPasswordMode} onChange={(e) => { setResetPasswordMode(e.target.checked); if (!e.target.checked) setFormData({ ...formData, password: '' }); }} className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium text-slate-700">Reset Password</span>
                  </label>
                  {resetPasswordMode && (
                    <div className="mt-3">
                      <label className="label">New Password</label>
                      <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input" required={resetPasswordMode} placeholder="Minimum 6 characters" minLength={6} />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="label">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="input">
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="label">Phone (optional)</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" placeholder="+234..." />
              </div>

              <div>
                <label className="label">Avatar Photo</label>
                <div className="flex items-center gap-3">
                  <input type="text" value={formData.avatar_url} onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })} className="input flex-1" placeholder="https://... or upload" />
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
                  <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} className="btn-outline flex items-center gap-2 whitespace-nowrap">
                    {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploadingAvatar ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>

              {formData.role === 'teacher' && (
                <>
                  <div>
                    <label className="label">Subject Name (optional)</label>
                    <input type="text" value={teacherSubjectName} onChange={(e) => setTeacherSubjectName(e.target.value)} className="input" placeholder="e.g., Mathematics (applies to all selected classes)" />
                  </div>
                  <div>
                    <label className="label">Assigned Classes</label>
                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                      {classes.map(c => (
                        <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                          <input type="checkbox" checked={teacherClassIds.includes(c.id)} onChange={(e) => {
                            if (e.target.checked) {
                              setTeacherClassIds([...teacherClassIds, c.id]);
                            } else {
                              setTeacherClassIds(teacherClassIds.filter(id => id !== c.id));
                            }
                          }} className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                          <span className="text-sm text-slate-700">{c.name} (Level {c.level})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {formData.role === 'student' && (
                <div>
                  <label className="label">Class</label>
                  <select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="input">
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Level {c.level})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <><Loader2 size={16} className="animate-spin" />Saving...</> : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail View Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setViewingUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">User Details</h3>
              <button onClick={() => setViewingUser(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden ${!viewingUser.avatar_url ? 'bg-gradient-to-br from-primary-500 to-primary-600' : ''}`}>
                  {viewingUser.avatar_url ? (
                    <img src={viewingUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${viewingUser.first_name[0]?.toUpperCase()}${viewingUser.last_name[0]?.toUpperCase()}`
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900">{viewingUser.first_name} {viewingUser.last_name}</h4>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mt-1 ${roleConfig[viewingUser.role]?.bg} ${roleConfig[viewingUser.role]?.color}`}>
                    {roleConfig[viewingUser.role]?.icon}
                    {roleConfig[viewingUser.role]?.label}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-500">Email</span>
                  <span className="text-sm font-medium text-slate-900">{viewingUser.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-500">Phone</span>
                  <span className="text-sm font-medium text-slate-900">{viewingUser.phone || '—'}</span>
                </div>
                {viewingUser.role === 'student' && userExtraInfo?.class && (
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500">Class</span>
                    <span className="text-sm font-medium text-slate-900">{userExtraInfo.class?.name || 'N/A'}</span>
                  </div>
                )}
                {viewingUser.role === 'student' && userExtraInfo?.admission_number && (
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500">Admission No.</span>
                    <span className="text-sm font-medium text-slate-900">{userExtraInfo.admission_number}</span>
                  </div>
                )}
                {(viewingUser.role === 'teacher' || viewingUser.role === 'accountant') && userExtraInfo?.staff_id && (
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500">Staff ID</span>
                    <span className="text-sm font-medium text-slate-900">{userExtraInfo.staff_id}</span>
                  </div>
                )}
                {(viewingUser.role === 'teacher' || viewingUser.role === 'accountant') && userExtraInfo?.department && (
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500">Department</span>
                    <span className="text-sm font-medium text-slate-900">{userExtraInfo.department?.name || 'N/A'}</span>
                  </div>
                )}
                {viewingUser.role === 'teacher' && userExtraInfo?.subjects && userExtraInfo.subjects.length > 0 && (
                  <div className="py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500 block mb-1">Assigned Subjects ({userExtraInfo.subjects.length})</span>
                    {userExtraInfo.subjects.map((s: any, i: number) => (
                      <span key={i} className="text-sm font-medium text-slate-900 block">
                        {s.name} ({s.code}) — {s.class?.name || 'No class'}
                      </span>
                    ))}
                  </div>
                )}
                {viewingUser.role === 'parent' && userExtraInfo?.children && (
                  <div className="py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-500 block mb-1">Linked Children ({userExtraInfo.children.length})</span>
                    {userExtraInfo.children.map((c: any, i: number) => (
                      <span key={i} className="text-sm font-medium text-slate-900 block">
                        {c.student?.profile?.first_name} {c.student?.profile?.last_name} ({c.student?.admission_number})
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-500">User ID</span>
                  <span className="text-sm font-mono text-slate-600">{viewingUser.id}</span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-500">Created</span>
                  <span className="text-sm font-medium text-slate-900">
                    {new Date(viewingUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-500">Last Updated</span>
                  <span className="text-sm font-medium text-slate-900">
                    {new Date(viewingUser.updated_at || viewingUser.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setViewingUser(null); openEditModal(viewingUser); }} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Edit size={16} /> Edit User
                </button>
                <button onClick={() => setViewingUser(null)} className="btn-ghost flex-1">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Students to Parent Modal */}
      {showLinkModal && linkingParent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Link Students to {linkingParent.first_name}</h3>
              <button onClick={() => setShowLinkModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

              <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">Manage students linked to {linkingParent.first_name} {linkingParent.last_name}:</p>

              {/* Currently linked students */}
              {(() => {
                const linkedStudents = availableStudents.filter(s => s.parent_id === linkingParent.id);
                if (linkedStudents.length > 0) {
                  return (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Currently Linked</h4>
                      <div className="space-y-2 mb-4">
                        {linkedStudents.map((student) => (
                          <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {student.profile?.first_name?.[0] || '?'}
                            </div>
                            <span className="font-medium text-sm text-slate-800 flex-1">
                              {student.profile?.first_name} {student.profile?.last_name}
                            </span>
                            <span className="text-xs text-slate-400">{student.admission_number}</span>
                            <button
                              onClick={() => handleUnlinkStudent(student.id)}
                              disabled={saving}
                              className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                            >
                              Unlink
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {availableStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <GraduationCap size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No students found. Create students first.</p>
                </div>
              ) : (
                <>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">All Students</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!!student.parent_id && student.parent_id !== linkingParent.id}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, student.id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                          />
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {student.profile?.first_name?.[0] || '?'}
                          </div>
                          <span className="font-medium text-sm text-slate-800 flex-1">
                            {student.profile?.first_name} {student.profile?.last_name}
                          </span>
                          <span className="text-xs text-slate-400">{student.admission_number}</span>
                          {student.parent && student.parent_id !== linkingParent.id && (
                            <span className="text-xs text-amber-600">(linked to {student.parent.first_name})</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLinkModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button
                  type="button"
                  onClick={handleLinkStudents}
                  disabled={saving || selectedStudentIds.length === 0}
                  className="btn-accent flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <><Loader2 size={16} className="animate-spin" />Linking...</> : `Link ${selectedStudentIds.length} Student${selectedStudentIds.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkStudentUpload isOpen={showBulkModal} onClose={() => { setShowBulkModal(false); fetchUsers(); }} role="admin" onSuccess={(count) => setSuccess(`${count} students imported successfully`)} />

      {/* Credentials Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">User Created Successfully</h3>
              <p className="text-sm text-slate-500 mt-1">Please save these login credentials</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700 font-medium mb-2">⚠️ Save these credentials now. You won't be able to see the password again.</p>
              </div>
              <div>
                <label className="label text-xs text-slate-500 uppercase font-semibold">Login Email</label>
                <input type="text" value={newCredentials.email} readOnly className="input bg-slate-50 font-mono text-sm" />
              </div>
              <div>
                <label className="label text-xs text-slate-500 uppercase font-semibold">Password</label>
                <input type="text" value={newCredentials.password} readOnly className="input bg-slate-50 font-mono text-sm" />
              </div>
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
  );
}

export default function AdminUsersPage() {
  return (
    <DashboardLayout title="User Management" subtitle="Manage school users and permissions">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      }>
        <AdminUsersPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
