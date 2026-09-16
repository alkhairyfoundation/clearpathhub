'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Upload,
} from 'lucide-react';
import type { UserRole } from '@/types';
import type { AdminUserDetail, AdminUserItem } from '@/lib/user-queries';
import UserFilters, { type ClassOption, type DepartmentOption, type UserFiltersState } from './UserFilters';
import UserTable from './UserTable';
import UserDetailPanel from './UserDetailPanel';
import UserFormModal from './UserFormModal';
import LinkStudentsModal from './LinkStudentsModal';
import BulkStudentUpload from '@/components/BulkStudentUpload';
import BulkStaffUpload from '@/components/BulkStaffUpload';
import { ROLE_CONFIG } from './config';

const PAGE_SIZE = 50;

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export default function UserManagement() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole | null) || 'all';

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<UserFiltersState>({
    search: '',
    role: initialRole,
    classId: '',
    departmentId: '',
  });
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === searchInput ? f : { ...f, search: searchInput }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [viewing, setViewing] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserDetail | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [linkingParent, setLinkingParent] = useState<AdminUserDetail | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUserItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [showBulkStudent, setShowBulkStudent] = useState(false);
  const [showBulkStaff, setShowBulkStaff] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMeta = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users/meta');
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to load options');
      setClasses(result.classes || []);
      setDepartments(result.departments || []);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role !== 'all') params.set('role', filters.role);
      if (filters.search) params.set('search', filters.search);
      if (filters.classId) params.set('class_id', filters.classId);
      if (filters.departmentId) params.set('department_id', filters.departmentId);
      params.set('limit', String(PAGE_SIZE));

      const res = await fetch(`/api/admin/users/list?${params.toString()}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to load users');
      setUsers(result.users || []);
      setTotal(result.total || 0);
      setSelectedIds(new Set());
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function showToast(type: 'success' | 'error', message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (filters.role !== 'all') params.set('role', filters.role);
      if (filters.search) params.set('search', filters.search);
      if (filters.classId) params.set('class_id', filters.classId);
      if (filters.departmentId) params.set('department_id', filters.departmentId);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(users.length));

      const res = await fetch(`/api/admin/users/list?${params.toString()}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to load more users');
      setUsers((prev) => [...prev, ...(result.users || [])]);
      setTotal(result.total || 0);
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function openDetail(user: AdminUserItem) {
    setDetailLoading(true);
    setViewing(user as AdminUserDetail);
    try {
      const res = await fetch(`/api/admin/users/detail/${user.id}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to load details');
      setViewing(result.data);
    } catch (e: any) {
      setDetailLoading(false);
      showToast('error', e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function refreshAfterChange() {
    loadUsers();
    if (viewing) {
      const id = viewing.id;
      fetch(`/api/admin/users/detail/${id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setViewing(res.data);
        })
        .catch(() => {});
    }
  }

  function openCreate() {
    setEditingUser(null);
    setShowForm(true);
  }

  function openEdit(user: AdminUserItem | AdminUserDetail) {
    setEditingUser(user as AdminUserDetail);
    setShowForm(true);
  }

  function handleFormSaved(message: string, credentialsArg?: { email: string; password: string }) {
    setShowForm(false);
    setEditingUser(null);
    if (credentialsArg) setCredentials(credentialsArg);
    showToast('success', message);
    refreshAfterChange();
  }

  function openLink(user: AdminUserItem | AdminUserDetail) {
    setLinkingParent(user as AdminUserDetail);
    setShowLink(true);
  }

  async function handleDelete(user: AdminUserItem) {
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to delete user');
      showToast('success', result.message || 'User deleted');
      setConfirmDelete(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
      loadUsers();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/admin/users/${id}`, { method: 'DELETE' }).then((r) => r.json())
      )
    );
    const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    setBulkDeleting(false);
    setSelectedIds(new Set());
    loadUsers();
    if (failed > 0) {
      showToast('error', `${ids.length - failed} deleted, ${failed} failed`);
    } else {
      showToast('success', `${ids.length} user(s) deleted`);
    }
  }

  function exportCsv() {
    const rows = users.filter((u) => selectedIds.size === 0 || selectedIds.has(u.id));
    const header = ['First Name', 'Last Name', 'Email', 'Phone', 'Role', 'Class / Dept', 'Created'];
    const lines = rows.map((u) => {
      const classOrDept =
        u.role === 'student'
          ? (u.student?.class_name || '')
          : (u.staff?.department_name || '');
      return [
        u.first_name,
        u.last_name,
        u.email,
        u.phone || '',
        ROLE_CONFIG[u.role]?.label || u.role,
        classOrDept,
        u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasMore = users.length < total;
  const selectedList = useMemo(
    () => users.filter((u) => selectedIds.has(u.id)),
    [users, selectedIds]
  );

  const roleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (users.length > 0 && users.every((u) => selectedIds.has(u.id))) {
      const next = new Set(selectedIds);
      users.forEach((u) => next.delete(u.id));
      setSelectedIds(next);
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {total} total user{total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBulkStaff(true)}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <Upload size={15} /> Bulk Staff
          </button>
          <button
            onClick={() => setShowBulkStudent(true)}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <ClipboardList size={15} /> Bulk Students
          </button>
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <UserFilters
        filters={filters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onChange={(next) => {
          if (next.role !== filters.role) {
            next = { ...next, search: '', classId: '', departmentId: '' };
            setSearchInput('');
          }
          setFilters(next);
        }}
        classes={classes}
        departments={departments}
        loadingClasses={loadingMeta}
        loadingDepartments={loadingMeta}
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-4 py-3 animate-scale-in">
          <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="btn-ghost text-sm">
              Export CSV
            </button>
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="btn-danger text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {bulkDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              {bulkDeleting ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <UserTable
        users={users}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={roleToggle}
        onToggleSelectAll={toggleAll}
        onView={openDetail}
        onEdit={openEdit}
        onDelete={(u) => setConfirmDelete(u)}
        onLinkStudents={openLink}
        deletingId={deletingId}
        hasMore={hasMore}
        onLoadMore={loadMore}
        total={total}
      />

      {/* Detail slide-over */}
      {viewing && (
        <UserDetailPanel
          user={viewing}
          loading={detailLoading}
          onClose={() => setViewing(null)}
          onEdit={openEdit}
          onLinkStudents={openLink}
        />
      )}

      {/* Create / edit modal */}
      <UserFormModal
        open={showForm}
        editingUser={editingUser}
        classes={classes}
        departments={departments}
        onClose={() => {
          setShowForm(false);
          setEditingUser(null);
        }}
        onSaved={handleFormSaved}
        onFailed={(err) => showToast('error', err)}
      />

      {/* Link students modal */}
      <LinkStudentsModal
        open={showLink}
        parent={linkingParent}
        onClose={() => {
          setShowLink(false);
          setLinkingParent(null);
        }}
        onSaved={(msg) => {
          showToast('success', msg);
          refreshAfterChange();
        }}
        onFailed={(err) => showToast('error', err)}
      />

      {/* Credentials modal */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">User Created</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Share these temporary credentials with the user. They can sign in immediately.
            </p>
            <div className="space-y-2 mb-5">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Email</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white break-all text-right">{credentials.email}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Password</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{credentials.password}</span>
              </div>
            </div>
            <button onClick={() => setCredentials(null)} className="btn-primary w-full">Done</button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete user?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {confirmDelete.first_name} {confirmDelete.last_name}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              This permanently removes their account and all related records. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId !== null}
                className="btn-danger flex-1 disabled:opacity-50"
              >
                {deletingId === confirmDelete.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk upload modals (legacy endpoints retained) */}
      <BulkStudentUpload
        isOpen={showBulkStudent}
        onClose={() => setShowBulkStudent(false)}
        role="admin"
        onSuccess={(count) => {
          showToast('success', `${count} student(s) imported`);
          loadUsers();
        }}
      />
      <BulkStaffUpload
        isOpen={showBulkStaff}
        onClose={() => setShowBulkStaff(false)}
        onSuccess={(count) => {
          showToast('success', `${count} staff record(s) imported`);
          loadUsers();
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white animate-scale-in max-w-sm ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="break-words">{toast.message}</span>
        </div>
      )}
    </div>
  );
}