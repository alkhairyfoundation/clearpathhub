'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Loader2, Link2, Search, AlertCircle } from 'lucide-react';
import type { AdminUserDetail, AdminUserItem } from '@/lib/user-queries';
import { RELATIONSHIP_OPTIONS, initials } from './config';

interface LinkStudentsModalProps {
  open: boolean;
  parent: AdminUserDetail | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onFailed: (error: string) => void;
}

export default function LinkStudentsModal({
  open,
  parent,
  onClose,
  onSaved,
  onFailed,
}: LinkStudentsModalProps) {
  const [students, setStudents] = useState<AdminUserItem[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [relationship, setRelationship] = useState('father');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const parentId = parent?.id;
    if (!open || !parentId) return;
    setError('');
    setSearch('');
    setRelationship('father');
    setLoading(true);
    fetch(`/api/admin/users/${parentId}/children`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) throw new Error(res.error || 'Failed to load students');
        setStudents(res.students || []);
        setLinkedIds(res.linked || []);
      })
      .catch((e) => {
        setError(e.message);
        onFailed(e.message);
      })
      .finally(() => setLoading(false));
  }, [open, parent, onFailed]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.student?.admission_number || '').toLowerCase().includes(q)
    );
  }, [students, search]);

  if (!open || !parent) return null;
  const parentId = parent.id;

  function toggle(id: string) {
    setLinkedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${parentId}/children`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: linkedIds, relationship }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to link students');
      onSaved(result.message || 'Students linked successfully');
      onClose();
    } catch (e: any) {
      setError(e.message);
      onFailed(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-scale-in">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Link Students</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {parent.first_name} {parent.last_name} • {parent.email}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="label">Relationship</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="input"
            >
              {RELATIONSHIP_OPTIONS.map((r) => (
                <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
              placeholder="Search students by name, email or admission no..."
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Students ({linkedIds.length} selected)
            </p>
            <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={22} className="animate-spin text-primary-600" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center py-10 text-sm text-slate-400 dark:text-slate-500">No students found</p>
              ) : (
                filtered.map((s) => {
                  const linked = linkedIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={linked}
                        onChange={() => toggle(s.id)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 shrink-0"
                      />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials(s.first_name, s.last_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {s.first_name} {s.last_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {s.student?.admission_number || s.email}
                          {s.student?.class_name ? ` • ${s.student.class_name}` : ''}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" />Linking...</>
            ) : (
              <><Link2 size={16} /> Link {linkedIds.length} Student{linkedIds.length !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}