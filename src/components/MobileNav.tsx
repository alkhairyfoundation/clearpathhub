'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, X, LayoutDashboard, Users, GraduationCap, UserCheck, BookOpen, 
  Calendar, BarChart3, Settings, QrCode, Megaphone, FileText, 
  Shield, DollarSign, ClipboardList, Award, Activity, ScanLine,
  Building2, Upload, TestTube2, FileCheck, DoorOpen, Clipboard, ChevronDown, LogOut, Brain
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

interface MobileNavProps {
  role: UserRole;
}

const navItems = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/classes', label: 'Classes', icon: GraduationCap },
    { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
    { href: '/admin/departments', label: 'Departments', icon: Building2 },
    { href: '/admin/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/admin/staff-attendance', label: 'Staff Attendance', icon: ScanLine },
    { href: '/admin/student-practice', label: 'Student Practice', icon: Brain },
    { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/admin/lessons', label: 'Lesson Notes', icon: FileText },
    { href: '/admin/sessions', label: 'Video Lessons', icon: BookOpen },
    { href: '/admin/tests', label: 'Tests', icon: TestTube2 },
    { href: '/admin/evaluation', label: 'Teacher Evaluation', icon: ClipboardList },
    { href: '/admin/entrance-exams', label: 'Entrance Exams', icon: FileCheck },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/id-cards', label: 'Student ID Cards', icon: QrCode },
    { href: '/admin/scan-id', label: 'Scan Student ID', icon: ScanLine },
    { href: '/admin/staff-id-cards', label: 'Staff ID Cards', icon: QrCode },
    { href: '/admin/school-qr', label: 'School QR Code', icon: QrCode },
    { href: '/admin/staff-qr', label: 'Staff Attendance QR', icon: ScanLine },
    { href: '/admin/import-export', label: 'Import/Export', icon: Upload },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  teacher: [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/classes', label: 'My Classes', icon: GraduationCap },
    { href: '/teacher/sessions', label: 'Video Lessons', icon: BookOpen },
    { href: '/teacher/lessons', label: 'Lessons', icon: FileText },
    { href: '/teacher/homework', label: 'Homework', icon: Clipboard },
    { href: '/teacher/tasks', label: 'My Tasks', icon: ClipboardList },
    { href: '/teacher/tests', label: 'Tests', icon: TestTube2 },
    { href: '/teacher/quizzes', label: 'Quizzes', icon: Award },
    { href: '/teacher/results', label: 'Results', icon: BarChart3 },
    { href: '/teacher/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/teacher/staff-attendance', label: 'Staff Attendance', icon: ScanLine },
    { href: '/teacher/behavior', label: 'Behavior', icon: Activity },
    { href: '/teacher/scan-id', label: 'Scan ID', icon: ScanLine },
    { href: '/teacher/profile', label: 'Profile', icon: Settings },
  ],
  student: [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/student/sessions', label: 'Video Lessons', icon: BookOpen },
    { href: '/student/lessons', label: 'Lessons', icon: FileText },
    { href: '/student/homework', label: 'Homework', icon: Clipboard },
    { href: '/student/quizzes', label: 'Quizzes', icon: Award },
    { href: '/student/results', label: 'Results', icon: BarChart3 },
    { href: '/student/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/student/id-card', label: 'My ID Card', icon: QrCode },
    { href: '/student/profile', label: 'Profile', icon: Settings },
  ],
  parent: [
    { href: '/parent', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/parent/children', label: 'My Children', icon: Users },
    { href: '/parent/progress', label: 'Progress', icon: BarChart3 },
    { href: '/parent/behavior', label: 'Behavior', icon: Activity },
    { href: '/parent/payments', label: 'Payments', icon: DollarSign },
    { href: '/parent/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/parent/weekly-report', label: 'Weekly Report', icon: FileText },
    { href: '/parent/profile', label: 'Profile', icon: Settings },
  ],
  accountant: [
    { href: '/accountant', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/accountant/invoices', label: 'Invoices', icon: FileText },
    { href: '/accountant/payments', label: 'Payments', icon: DollarSign },
    { href: '/accountant/expenses', label: 'Expenses', icon: Activity },
    { href: '/accountant/reports', label: 'Reports', icon: BarChart3 },
    { href: '/accountant/staff-attendance', label: 'Staff Attendance', icon: ScanLine },
    { href: '/accountant/settings', label: 'Settings', icon: Settings },
  ],
};

export default function MobileNav({ role }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const items = navItems[role] || [];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-slate-700" />
          </button>
          
          <Link href={role === 'admin' ? '/admin' : `/${role}`} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cp-gold to-cp-gold-light rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white" size={16} />
            </div>
            <span className="font-bold text-slate-900">ClearPath</span>
          </Link>

          <div className="w-10" />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto animate-slide-left">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-cp-gold to-cp-gold-light rounded-xl flex items-center justify-center">
                    <GraduationCap className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">ClearPath</p>
                    <p className="text-xs text-slate-500">Edu Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden ${!profile?.avatar_url ? 'bg-gradient-to-br from-cp-gold to-cp-gold-light' : ''}`}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-xs text-slate-500 capitalize">{role}</p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1">
              {items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Sign Out */}
            <div className="p-3 border-t border-slate-200 mt-4">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}