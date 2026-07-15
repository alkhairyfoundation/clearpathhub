'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, X, LayoutDashboard, Users, GraduationCap, UserCheck, BookOpen, 
  Calendar, BarChart3, Settings, QrCode, Megaphone, FileText, 
  Shield, DollarSign, ClipboardList, Award, Activity, ScanLine,
  Building2, Upload, TestTube2, FileCheck, DoorOpen, Clipboard, ChevronDown, LogOut, Brain,
  Target, TrendingDown, TrendingUp, Zap, Trophy, Star, Bot, Map, CheckCircle, ClipboardEdit, Sun, Moon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
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
    { href: '/admin/results', label: 'Results & Analytics', icon: BarChart3 },
    { href: '/admin/departments', label: 'Departments', icon: Building2 },
    { href: '/admin/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/admin/staff-attendance', label: 'Scan Staff Attendance', icon: ScanLine },
    { href: '/admin/staff-attendance-dashboard', label: 'Attendance Records', icon: UserCheck },
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
    { href: '/admin/import-export', label: 'Import/Export', icon: Upload },
    { href: '/admin/ccr', label: 'CCR Administration', icon: ClipboardList },
    { href: '/admin/archetypes', label: 'Archetypes', icon: Target },
    { href: '/admin/skills', label: 'Skills Bank', icon: Brain },
    { href: '/admin/growth-frameworks', label: 'Growth Frameworks', icon: Clipboard },
    { href: '/admin/portfolio-reports', label: 'Portfolio Reports', icon: BarChart3 },
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
    { href: '/teacher/ccr', label: 'Child Review', icon: ClipboardList },
    { href: '/teacher/goal-approvals', label: 'Goal Approvals', icon: Target },
    { href: '/teacher/portfolio-tracking', label: 'Portfolio Tracking', icon: Award },
    { href: '/teacher/scan-id', label: 'Scan ID', icon: ScanLine },
    { href: '/teacher/profile', label: 'Profile', icon: Settings },
  ],
  student: [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/student/growth-path', label: 'My Growth Path', icon: Target },
    { href: '/student/growth-map', label: 'Growth Map', icon: Map },
    { href: '/student/learning-path', label: 'Learning Path', icon: BookOpen },
    { href: '/student/retention', label: 'Knowledge Retention', icon: Brain },
    { href: '/student/ai-coach', label: 'AI Coach', icon: Bot },
    { href: '/student/portfolio', label: 'My Portfolio', icon: Award },
    { href: '/student/practice', label: 'Daily Practice', icon: Brain },
    { href: '/student/practice/history', label: 'Practice History', icon: BarChart3 },
    { href: '/student/goals/weekly', label: 'Weekly Goals', icon: Calendar },
    { href: '/student/goals/monthly', label: 'Monthly Goals', icon: BarChart3 },
    { href: '/student/goals/yearly', label: 'Year Goals', icon: TrendingUp },
    { href: '/student/sessions', label: 'Video Lessons', icon: BookOpen },
    { href: '/student/lessons', label: 'Lessons', icon: FileText },
    { href: '/student/homework', label: 'Homework', icon: Clipboard },
    { href: '/student/tests', label: 'Tests', icon: TestTube2 },
    { href: '/student/quizzes', label: 'Quizzes', icon: Award },
    { href: '/student/results', label: 'Results', icon: BarChart3 },
    { href: '/student/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/student/accountability', label: 'Accountability', icon: CheckCircle },
    { href: '/student/xp-history', label: 'XP & Levels', icon: Zap },
    { href: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/student/promotion', label: 'Promotion', icon: TrendingUp },
    { href: '/student/islamic-growth', label: 'Islamic Growth', icon: Star },
    { href: '/student/skills-growth', label: 'Skills Growth', icon: Award },
    { href: '/student/ccr', label: 'Child Review', icon: ClipboardList },
    { href: '/student/ccr/report', label: 'My CCR Report', icon: BarChart3 },
    { href: '/student/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/student/entrance-exams', label: 'Entrance Exams', icon: FileCheck },
    { href: '/student/mock-exams', label: 'Mock Exams', icon: ClipboardEdit },
    { href: '/student/id-card', label: 'My ID Card', icon: QrCode },
    { href: '/student/profile', label: 'Profile', icon: Settings },
  ],
  parent: [
    { href: '/parent', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/parent/children', label: 'My Children', icon: Users },
    { href: '/parent/tests', label: 'Test Reports', icon: FileText },
    { href: '/parent/ccr', label: 'Child Review', icon: ClipboardList },
    { href: '/parent/progress', label: 'Analytics', icon: BarChart3 },
    { href: '/parent/report-card', label: 'Report Card', icon: Award },
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
    { href: '/accountant/expenses', label: 'Expenses', icon: TrendingDown },
    { href: '/accountant/fee-structures', label: 'Fee Structures', icon: BookOpen },
    { href: '/accountant/payment-uploads', label: 'Payment Uploads', icon: Upload },
    { href: '/accountant/reports', label: 'Reports', icon: BarChart3 },
    { href: '/accountant/staff-attendance', label: 'Staff Attendance', icon: ScanLine },
    { href: '/accountant/settings', label: 'Settings', icon: Settings },
  ],
};

export default function MobileNav({ role }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const items = navItems[role] || [];

  useEffect(() => { setMounted(true); }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-slate-700 dark:text-slate-300" />
          </button>
          
          <Link href={role === 'admin' ? '/admin' : `/${role}`} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cp-gold to-cp-gold-light rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white" size={16} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">ClearPath</span>
          </Link>

          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <Sun size={20} className="text-amber-400" />
              ) : (
                <Moon size={20} className="text-slate-600" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto animate-slide-left">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-cp-gold to-cp-gold-light rounded-xl flex items-center justify-center">
                    <GraduationCap className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">ClearPath</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Edu Hub</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X size={20} className="text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden ${!profile?.avatar_url ? 'bg-gradient-to-br from-cp-gold to-cp-gold-light' : ''}`}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{profile?.first_name} {profile?.last_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{role}</p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1">
              {items.map((item) => {
                const hrefDepth = item.href.split('/').filter(Boolean).length;
                const isActive = hrefDepth <= 1
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Sign Out */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 mt-4">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 w-full"
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
