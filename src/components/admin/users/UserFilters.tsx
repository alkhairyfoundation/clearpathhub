'use client';

import { Search, X } from 'lucide-react';
import { ROLE_CONFIG, ROLE_ORDER } from './config';
import type { UserRole } from '@/types';

export interface ClassOption {
  id: string;
  name: string;
  level: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export interface UserFiltersState {
  search: string;
  role: UserRole | 'all';
  classId: string;
  departmentId: string;
}

interface UserFiltersProps {
  filters: UserFiltersState;
  onChange: (filters: UserFiltersState) => void;
  classes: ClassOption[];
  departments: DepartmentOption[];
  loadingClasses: boolean;
  loadingDepartments: boolean;
}

export default function UserFilters({
  filters,
  onChange,
  classes,
  departments,
  loadingClasses,
  loadingDepartments,
}: UserFiltersProps) {
  const set = (patch: Partial<UserFiltersState>) => onChange({ ...filters, ...patch });

  const showClassFilter = filters.role === 'all' || filters.role === 'student' || filters.role === 'teacher';
  const showDeptFilter = filters.role === 'all' || filters.role === 'teacher' || filters.role === 'accountant' || filters.role === 'admin';

  return (
    <div className="card">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, phone, admission or staff number..."
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            className="input pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              onClick={() => set({ role })}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.role === role
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {role === 'all' ? 'All' : ROLE_CONFIG[role as UserRole]?.label || role}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        {showClassFilter && (
          <div className="flex-1">
            <label className="label text-xs uppercase tracking-wider">Class</label>
            <div className="relative">
              <select
                value={filters.classId}
                onChange={(e) => set({ classId: e.target.value })}
                className="input text-sm pr-8"
                disabled={loadingClasses}
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (Level {c.level})</option>
                ))}
              </select>
              {filters.classId && (
                <button
                  onClick={() => set({ classId: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
        {showDeptFilter && (
          <div className="flex-1">
            <label className="label text-xs uppercase tracking-wider">Department</label>
            <div className="relative">
              <select
                value={filters.departmentId}
                onChange={(e) => set({ departmentId: e.target.value })}
                className="input text-sm pr-8"
                disabled={loadingDepartments}
              >
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {filters.departmentId && (
                <button
                  onClick={() => set({ departmentId: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}