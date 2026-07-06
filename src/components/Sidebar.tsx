'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Users, GraduationCap, UserCheck, BookOpen, 
  Calendar, BarChart3, Settings, QrCode, Megaphone, FileText, 
  Shield, DollarSign, ClipboardList, Award, Activity, ScanLine,
  Building2, Upload, TestTube2, FileCheck, DoorOpen, Clipboard, ClipboardEdit, HelpCircle, Brain,
  Target, TrendingUp, TrendingDown, Zap, Trophy, CheckCircle, Star, Bot, Map,
} from 'lucide-react';
import type { UserRole } from '@/types';

interface SidebarProps {
  role: UserRole;
}

const navItems = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/academic-sessions', label: 'Academic Sessions', icon: Calendar },
    { href: '/admin/scheme-of-work', label: 'Scheme of Work', icon: Clipboard },
    { href: '/admin/question-bank', label: 'Question Bank', icon: HelpCircle },
    { href: '/admin/classes', label: 'Classes', icon: GraduationCap },
    { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
    { href: '/admin/results', label: 'Results & Analytics', icon: BarChart3 },
    { href: '/admin/departments', label: 'Departments', icon: Building2 },
    { href: '/admin/lessons', label: 'Lesson Notes', icon: FileText },
    { href: '/admin/sessions', label: 'Video Lessons', icon: BookOpen },
    { href: '/admin/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/admin/staff-attendance', label: 'Scan Staff Attendance', icon: ScanLine },
    { href: '/admin/staff-attendance-dashboard', label: 'Attendance Records', icon: UserCheck },
    { href: '/admin/student-practice', label: 'Student Practice', icon: Brain },
    { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/admin/tests', label: 'Tests', icon: TestTube2 },
    { href: '/admin/evaluation', label: 'Teacher Evaluation', icon: ClipboardList },
    { href: '/admin/entrance-exams', label: 'Entrance Exams', icon: FileCheck },
    { href: '/admin/mock-exams', label: 'Mock Exams', icon: ClipboardEdit },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/id-cards', label: 'Student ID Cards', icon: QrCode },
    { href: '/admin/scan-id', label: 'Scan Student ID', icon: ScanLine },
    { href: '/admin/staff-id-cards', label: 'Staff ID Cards', icon: QrCode },
    { href: '/admin/school-qr', label: 'School QR Code', icon: QrCode },
    { href: '/admin/import-export', label: 'Import/Export', icon: Upload },
    { href: '/admin/archetypes', label: 'Archetypes', icon: Target },
    { href: '/admin/skills', label: 'Skills Bank', icon: Brain },
    { href: '/admin/growth-frameworks', label: 'Growth Frameworks', icon: Clipboard },
    { href: '/admin/portfolio-reports', label: 'Portfolio Reports', icon: BarChart3 },
    { href: '/admin/profile', label: 'Profile', icon: Settings },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  teacher: [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/classes', label: 'My Classes', icon: GraduationCap },
    { href: '/teacher/scheme-of-work', label: 'Scheme of Work', icon: Clipboard },
    { href: '/teacher/question-bank', label: 'Question Bank', icon: HelpCircle },
    { href: '/teacher/students', label: 'My Students', icon: Users },
    { href: '/teacher/sessions', label: 'Video Lessons', icon: BookOpen },
    { href: '/teacher/lessons', label: 'Lesson Notes', icon: FileText },
    { href: '/teacher/homework', label: 'Homework', icon: Clipboard },
    { href: '/teacher/tasks', label: 'My Tasks', icon: ClipboardList },
    { href: '/teacher/tests', label: 'Tests', icon: TestTube2 },
    { href: '/teacher/mock-exams', label: 'Mock Exams', icon: ClipboardEdit },
    { href: '/teacher/quizzes', label: 'Quizzes', icon: Award },
    { href: '/teacher/results', label: 'Results & Analytics', icon: BarChart3 },
    { href: '/teacher/report-card', label: 'Report Card', icon: Award },
    { href: '/teacher/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/teacher/staff-attendance', label: 'Staff Attendance', icon: ScanLine },
    { href: '/teacher/behavior', label: 'Behavior', icon: Activity },
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
    { href: '/student/quizzes', label: 'Quizzes', icon: Award },
    { href: '/student/results', label: 'Results', icon: BarChart3 },
    { href: '/student/attendance', label: 'Attendance', icon: UserCheck },
    { href: '/student/accountability', label: 'Accountability', icon: CheckCircle },
    { href: '/student/xp-history', label: 'XP & Levels', icon: Zap },
    { href: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/student/promotion', label: 'Promotion', icon: TrendingUp },
    { href: '/student/islamic-growth', label: 'Islamic Growth', icon: Star },
    { href: '/student/skills-growth', label: 'Skills Growth', icon: Award },
    { href: '/student/announcements', label: 'Announcements', icon: Megaphone },
    { href: '/student/entrance-exams', label: 'Entrance Exams', icon: FileCheck },
    { href: '/student/mock-exams', label: 'Mock Exams', icon: ClipboardEdit },
    { href: '/student/id-card', label: 'My ID Card', icon: QrCode },
    { href: '/student/profile', label: 'Profile', icon: Settings },
  ],
  parent: [
    { href: '/parent', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/parent/children', label: 'My Children', icon: Users },
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
    { href: '/accountant/profile', label: 'Profile', icon: Settings },
    { href: '/accountant/settings', label: 'Settings', icon: Settings },
  ],
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = navItems[role] || [];

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500'} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}