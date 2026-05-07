'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Plus, Search, Edit, Trash2, Users, GraduationCap, UserCheck, UserMinus,
  DollarSign, X, Loader2, AlertCircle, Check, UserPlus, Link2, Eye
} from 'lucide-react';
import type { Profile, UserRole, Student } from '@/types';

const roleConfig: Record<UserRole, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: 'text-purple-700', bg: 'bg-purple-100', icon: <Users size={14} /> },
  teacher: { label: 'Teacher', color: 'text-blue-700', bg: 'bg-blue-100', icon: <UserCheck size={14} /> },
  student: { label: 'Student', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <GraduationCap size={14} /> },
  parent: { label: 'Parent', color: 'text-orange-700', bg: 'bg-orange-100', icon: <UserMinus size={14} /> },
  accountant: { label: 'Accountant', color: 'text-green-700', bg: 'bg-green-100', icon: <DollarSign size={14} /> },
};

type UserFormData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone: string;
};

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

  const [formData, setFormData] = useState<UserFormData>({
    email: '', password: '', first_name: '', last_name: '', role: 'teacher', phone: '',
  });

  // Student-specific fields for linking
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchUsers();
  }, [profile, selectedRole]);

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
    setLoading(false);
  }

  async function fetchAvailableStudents() {
    const { data } = await supabase.from('students').select('*, profile:profiles(first_name, last_name)');
    if (data) setAvailableStudents(data);
  }

  function openCreateModal(role?: UserRole) {
    setEditingUser(null);
    setError('');
    setSuccess('');
    setFormData({
      email: '', password: '', first_name: '', last_name: '',
      role: role || 'teacher', phone: '',
    });
    setShowModal(true);
  }

  function openEditModal(user: Profile) {
    setEditingUser(user);
    setError('');
    setSuccess('');
    setFormData({
      email: user.email, password: '', first_name: user.first_name,
      last_name: user.last_name, role: user.role, phone: user.phone || '',
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (editingUser) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            phone: formData.phone || null,
          })
          .eq('id', editingUser.id);

        if (updateError) throw new Error(updateError.message);
        setSuccess('User updated successfully');
      } else {
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to create user');
        setSuccess('User created successfully');
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
      const { error: deleteError } = await supabase.from('profiles').delete().eq('id', user.id);
      if (deleteError) throw new Error(deleteError.message);
      setUsers(users.filter(u => u.id !== user.id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleLinkStudents() {
    if (!linkingParent || selectedStudentIds.length === 0) return;
    setSaving(true);
    setError('');

    try {
      // Check if any selected students already have a parent
      const { data: existingLinks, error: checkError } = await supabase
        .from('students')
        .select('id, admission_number, profile:profiles(first_name, last_name), parent:profiles!parent_id(first_name, last_name)')
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

      const { error } = await supabase
        .from('students')
        .update({ parent_id: linkingParent.id })
        .in('id', selectedStudentIds);

      if (error) throw new Error(error.message);
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

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name} ${user.email} ${user.phone || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  selectedRole === role ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role === 'all' ? 'All' : roleConfig[role]?.label || role}
              </button>
            ))}
          </div>
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

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
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
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
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
                    <td className="py-3 px-4 text-sm text-slate-600 hidden md:table-cell">{user.phone || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-500 hidden lg:table-cell">
                      {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
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
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={15} className="text-blue-600" />
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

              {!editingUser && (
                <div>
                  <label className="label">Password</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input" required placeholder="Minimum 6 characters" minLength={6} />
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
              <p className="text-sm text-slate-600">Select students to link to this parent account:</p>

              {availableStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <GraduationCap size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No students found. Create students first.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
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
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds([...selectedStudentIds, student.id]);
                            } else {
                              setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {student.profile?.first_name?.[0] || '?'}
                        </div>
                        <span className="font-medium text-sm text-slate-800">
                          {student.profile?.first_name} {student.profile?.last_name}
                        </span>
                        <span className="ml-auto text-xs text-slate-400">{student.admission_number}</span>
                      </label>
                    );
                  })}
                </div>
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
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <DashboardLayout title="User Management" subtitle="Manage school users and permissions">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      }>
        <AdminUsersPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
