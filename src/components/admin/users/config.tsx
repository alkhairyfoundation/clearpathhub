import {
  Users,
  UserCheck,
  GraduationCap,
  UserMinus,
  DollarSign,
} from 'lucide-react';
import type { UserRole } from '@/types';

export const ROLE_CONFIG: Record<UserRole, {
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}> = {
  admin: {
    label: 'Admin',
    color: 'text-primary-700 dark:text-primary-300',
    bg: 'bg-primary-100 dark:bg-primary-900/30',
    icon: <Users size={14} />,
  },
  teacher: {
    label: 'Teacher',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <UserCheck size={14} />,
  },
  student: {
    label: 'Student',
    color: 'text-accent-700 dark:text-accent-300',
    bg: 'bg-accent-100 dark:bg-accent-900/30',
    icon: <GraduationCap size={14} />,
  },
  parent: {
    label: 'Parent',
    color: 'text-secondary-700 dark:text-secondary-300',
    bg: 'bg-secondary-100 dark:bg-secondary-900/30',
    icon: <UserMinus size={14} />,
  },
  accountant: {
    label: 'Accountant',
    color: 'text-success-700 dark:text-success-300',
    bg: 'bg-success-100 dark:bg-success-900/30',
    icon: <DollarSign size={14} />,
  },
};

export const ROLE_ORDER = ['all', 'admin', 'teacher', 'student', 'parent', 'accountant'] as const;

export const GENDER_OPTIONS = ['male', 'female', 'other'];

export const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const RELATIONSHIP_OPTIONS = ['father', 'mother', 'guardian', 'other'];

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function initials(first?: string, last?: string): string {
  return `${(first || '?')[0]?.toUpperCase() || ''}${(last || '')[0]?.toUpperCase() || ''}`;
}

export function formatCurrency(value?: number | null): string {
  if (value == null) return '—';
  return Number(value).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  });
}