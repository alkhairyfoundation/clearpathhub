'use client';

import {
  Eye,
  Edit,
  Trash2,
  Link2,
  Loader2,
  Users,
} from 'lucide-react';
import type { AdminUserItem } from '@/lib/user-queries';
import { ROLE_CONFIG, formatDate, formatCurrency, initials } from './config';

interface UserTableProps {
  users: AdminUserItem[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onView: (user: AdminUserItem) => void;
  onEdit: (user: AdminUserItem) => void;
  onDelete: (user: AdminUserItem) => void;
  onLinkStudents: (user: AdminUserItem) => void;
  deletingId: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  total: number;
}

function classOrDeptLabel(user: AdminUserItem): string {
  if (user.role === 'student') {
    return user.student?.class_name ? user.student.class_name : '—';
  }
  if (user.role === 'teacher') {
    const names = user.assigned_classes.map((c) => c.name);
    if (names.length > 0) return names.join(', ');
    return user.staff?.department_name || '—';
  }
  if (user.role === 'accountant') {
    return user.staff?.department_name || '—';
  }
  if (user.role === 'parent') {
    const count = user.linked_children.length;
    return count > 0 ? `${count} child${count === 1 ? '' : 'ren'}` : '—';
  }
  return '—';
}

function UserAvatar({ user, size }: { user: AdminUserItem; size: 'sm' | 'md' }) {
  const cls = size === 'sm'
    ? 'w-9 h-9 text-sm'
    : 'w-12 h-12 text-lg';
  return (
    <div className={`${cls} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden ${!user.avatar_url ? 'bg-gradient-to-br from-primary-500 to-primary-600' : ''}`}>
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(user.first_name, user.last_name)
      )}
    </div>
  );
}

export default function UserTable({
  users,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onEdit,
  onDelete,
  onLinkStudents,
  deletingId,
  hasMore,
  onLoadMore,
  total,
}: UserTableProps) {
  const allVisibleSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));

  return (
    <div className="card overflow-hidden p-0">
      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <Users size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">No users found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={onToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                    title="Select all on this page"
                  />
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Class / Dept</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Created</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {users.map((user) => {
                const isSelected = selectedIds.has(user.id);
                const isDeleting = deletingId === user.id;
                const isInactiveStaff = user.staff && user.staff.status === 'inactive';
                return (
                  <tr
                    key={user.id}
                    onClick={() => onView(user)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-50/70 dark:bg-primary-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    title="Click to view full details"
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(user.id)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} size="sm" />
                        <div className="min-w-0">
                          <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm block truncate">
                            {user.first_name} {user.last_name}
                            {user.role === 'student' && user.student?.admission_number && (
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {user.student.admission_number}
                              </span>
                            )}
                            {(user.role === 'teacher' || user.role === 'accountant') && user.staff?.staff_number && (
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {user.staff.staff_number}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-500">
                            {user.email}
                            {user.role === 'teacher' && user.staff && isInactiveStaff && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">• inactive</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_CONFIG[user.role]?.bg} ${ROLE_CONFIG[user.role]?.color}`}>
                        {ROLE_CONFIG[user.role]?.icon}
                        {ROLE_CONFIG[user.role]?.label}
                      </span>
                      {user.role === 'teacher' && !isInactiveStaff && (
                        <span className="block mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {user.staff?.designation || ''}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 hidden md:table-cell">
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{classOrDeptLabel(user)}</span>
                      {user.role === 'parent' && user.linked_children.length > 0 && (
                        <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {user.linked_children.map((c) => `${c.first_name} ${c.last_name}`).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">{user.phone || '—'}</td>
                    <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onView(user)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye size={15} className="text-slate-500 dark:text-slate-400" />
                        </button>
                        {user.role === 'parent' && (
                          <button
                            onClick={() => onLinkStudents(user)}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            title="Link students"
                          >
                            <Link2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(user)}
                          className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={15} className="text-primary-600 dark:text-primary-400" />
                        </button>
                        <button
                          onClick={() => onDelete(user)}
                          disabled={isDeleting}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {isDeleting ? (
                            <Loader2 size={15} className="text-red-600 dark:text-red-400 animate-spin" />
                          ) : (
                            <Trash2 size={15} className="text-red-600 dark:text-red-400" />
                          )}
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
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>
          Showing {users.length}{total > users.length ? ` of ${total}` : ''} users
          {selectedIds.size > 0 && <span className="font-medium text-primary-600 dark:text-primary-400"> • {selectedIds.size} selected</span>}
        </span>
        {hasMore && (
          <button
            onClick={onLoadMore}
            className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}