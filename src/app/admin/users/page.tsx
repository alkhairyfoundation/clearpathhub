'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users,
  GraduationCap,
  UserCheck,
  UserMinus,
  DollarSign,
  X,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';
import type { Profile, UserRole } from '@/types';

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Users className="text-purple-600" size={16} />,
  teacher: <UserCheck className="text-blue-600" size={16} />,
  student: <GraduationCap className="text-emerald-600" size={16} />,
  parent: <UserMinus className="text-orange-600" size={16} />,
  accountant: <DollarSign className="text-green-600" size={16} />,
};

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-emerald-100 text-emerald-700',
  parent: 'bg-orange-100 text-orange-700',
  accountant: 'bg-green-100 text-green-700',
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'teacher' as UserRole,
    phone: '',
  });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchUsers();
  }, [profile, selectedRole]);

  async function fetchUsers() {
    setLoading(true);
    let query = supabase.from('profiles').select('*');
    
    if (selectedRole !== 'all') {
      query = query.eq('role', selectedRole);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  }

  function openCreateModal(role?: UserRole) {
    setEditingUser(null);
    setError('');
    setSuccess('');
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: role || 'teacher',
      phone: '',
    });
    setShowModal(true);
  }

  function openEditModal(user: Profile) {
    setEditingUser(user);
    setError('');
    setSuccess('');
    setFormData({
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      phone: user.phone || '',
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

        if (updateError) throw updateError;
        setSuccess('User updated successfully');
      } else {
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
    if (!confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) return;

    try {
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) throw deleteError;
      setUsers(users.filter(u => u.id !== user.id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  const filteredUsers = users.filter(user => 
    `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 mt-1">Manage all users in the system</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openCreateModal('teacher')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Teacher
          </button>
          <button
            onClick={() => openCreateModal('student')}
            className="btn-accent flex items-center gap-2"
          >
            <Plus size={18} />
            Add Student
          </button>
          <button
            onClick={() => openCreateModal('parent')}
            className="btn-outline flex items-center gap-2"
          >
            <Plus size={18} />
            Add Parent
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'admin', 'teacher', 'student', 'parent', 'accountant'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  selectedRole === role
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {user.first_name[0]?.toUpperCase()}{user.last_name[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-sm">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors[user.role] || 'bg-slate-100 text-slate-600'}`}>
                        {roleIcons[user.role]}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-sm hidden md:table-cell">{user.phone || '-'}</td>
                    <td className="py-3 px-4 text-slate-600 text-sm hidden lg:table-cell">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} className="text-slate-500 hover:text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-slate-500 hover:text-red-600" />
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
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

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                  required
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
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
                <label className="label">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="input"
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Admin</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>

              <div>
                <label className="label">Phone (optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+234 XXX XXX XXXX"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {editingUser ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingUser ? 'Update User' : 'Create User'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <AdminUsersPageContent />
    </Suspense>
  );
}
