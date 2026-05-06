'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical,
  Filter,
  Download,
  Upload,
  Users,
  GraduationCap,
  UserCheck,
  UserMinus
} from 'lucide-react';
import type { Profile, UserRole } from '@/types';

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>((searchParams.get('role') as UserRole) || 'all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Users className="text-purple-600" size={16} />;
      case 'teacher': return <UserCheck className="text-blue-600" size={16} />;
      case 'student': return <GraduationCap className="text-emerald-600" size={16} />;
      case 'parent': return <UserMinus className="text-orange-600" size={16} />;
      case 'accountant': return <Users className="text-green-600" size={16} />;
      default: return <Users size={16} />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'teacher': return 'Teacher';
      case 'student': return 'Student';
      case 'parent': return 'Parent';
      case 'accountant': return 'Accountant';
      default: return role;
    }
  };

  const filteredUsers = users.filter(user => 
    `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500">Manage all users in the system</p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'admin', 'teacher', 'student', 'parent', 'accountant'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedRole === role
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {role === 'all' ? 'All' : getRoleLabel(role)}
              </button>
            ))}
          </div>
        </div>

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
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Phone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Created</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {user.first_name[0]}{user.last_name[0]}
                          </span>
                        </div>
                        <span className="font-medium text-slate-800">
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'student' ? 'bg-emerald-100 text-emerald-700' :
                        user.role === 'parent' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {getRoleIcon(user.role)}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{user.phone || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingUser(user); setShowModal(true); }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit size={16} className="text-slate-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg">
                          <Trash2 size={16} className="text-red-500" />
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
    </div>
  );
}