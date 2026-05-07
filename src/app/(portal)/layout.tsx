'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, Users, Settings, BookOpen, GraduationCap, LogOut, Menu, X, Bell,
  Video, ClipboardList, FileText, CheckSquare, Award, Activity, DollarSign, Printer,
  QrCode, BarChart3, Megaphone, Clock, UserCheck, FileCheck, Star, Download, Upload,
  TestTube, ClipboardCheck, Heart, Github, Mail, ExternalLink, Shield, Home,
  TrendingUp, Calendar, MessageSquare, FileSpreadsheet
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  roles: string[];
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} />, roles: ['admin'] },
  { label: 'Users', href: '/admin/users', icon: <Users size={20} />, roles: ['admin'] },
  { label: 'Departments', href: '/admin/departments', icon: <BookOpen size={20} />, roles: ['admin'] },
  { label: 'Classes', href: '/admin/classes', icon: <GraduationCap size={20} />, roles: ['admin'] },
  { label: 'Subjects', href: '/admin/subjects', icon: <FileText size={20} />, roles: ['admin'] },
  { label: 'Attendance', href: '/admin/attendance', icon: <UserCheck size={20} />, roles: ['admin'] },
  { label: 'Tests & Exams', href: '/admin/tests', icon: <ClipboardCheck size={20} />, roles: ['admin'] },
  { label: 'Entrance Exams', href: '/admin/entrance-exams', icon: <TestTube size={20} />, roles: ['admin'] },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} />, roles: ['admin'] },
  { label: 'Announcements', href: '/admin/announcements', icon: <Megaphone size={20} />, roles: ['admin'] },
  { label: 'Teacher Eval', href: '/admin/evaluation', icon: <Star size={20} />, roles: ['admin'] },
  { label: 'ID Cards', href: '/admin/id-cards', icon: <Printer size={20} />, roles: ['admin'] },
  { label: 'Staff QR', href: '/admin/staff-qr', icon: <QrCode size={20} />, roles: ['admin'] },
  { label: 'School QR', href: '/admin/school-qr', icon: <QrCode size={20} />, roles: ['admin'] },
  { label: 'Import/Export', href: '/admin/import-export', icon: <Download size={20} />, roles: ['admin'] },
  { label: 'My Profile', href: '/admin/profile', icon: <Users size={20} />, roles: ['admin'] },
  { label: 'Settings', href: '/admin/settings', icon: <Settings size={20} />, roles: ['admin'] },
];

const teacherNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard size={20} />, roles: ['teacher'] },
  { label: 'Classes', href: '/teacher/classes', icon: <GraduationCap size={20} />, roles: ['teacher'] },
  { label: 'Video Lessons', href: '/teacher/sessions', icon: <Video size={20} />, roles: ['teacher'] },
  { label: 'Quizzes', href: '/teacher/quizzes', icon: <ClipboardList size={20} />, roles: ['teacher'] },
  { label: 'Lessons', href: '/teacher/lessons', icon: <FileText size={20} />, roles: ['teacher'] },
  { label: 'Homework', href: '/teacher/homework', icon: <FileText size={20} />, roles: ['teacher'] },
  { label: 'Results', href: '/teacher/results', icon: <Award size={20} />, roles: ['teacher'] },
  { label: 'Attendance', href: '/teacher/attendance', icon: <UserCheck size={20} />, roles: ['teacher'] },
  { label: 'Behavior', href: '/teacher/behavior', icon: <Activity size={20} />, roles: ['teacher'] },
  { label: 'Scan ID', href: '/teacher/scan-id', icon: <QrCode size={20} />, roles: ['teacher'] },
  { label: 'My Attendance', href: '/staff/scan-qr', icon: <QrCode size={20} />, roles: ['teacher'] },
];

const studentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/student', icon: <LayoutDashboard size={20} />, roles: ['student'] },
  { label: 'Video Lessons', href: '/student/sessions', icon: <Video size={20} />, roles: ['student'] },
  { label: 'Lessons', href: '/student/lessons', icon: <FileText size={20} />, roles: ['student'] },
  { label: 'Homework', href: '/student/homework', icon: <FileText size={20} />, roles: ['student'] },
  { label: 'Results', href: '/student/results', icon: <Award size={20} />, roles: ['student'] },
  { label: 'Attendance', href: '/student/attendance', icon: <UserCheck size={20} />, roles: ['student'] },
  { label: 'My ID Card', href: '/student/id-card', icon: <Printer size={20} />, roles: ['student'] },
];

const parentNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/parent', icon: <LayoutDashboard size={20} />, roles: ['parent'] },
  { label: 'Children', href: '/parent/children', icon: <Users size={20} />, roles: ['parent'] },
  { label: 'Weekly Report', href: '/parent/weekly-report', icon: <FileText size={20} />, roles: ['parent'] },
  { label: 'Progress', href: '/parent/progress', icon: <Activity size={20} />, roles: ['parent'] },
  { label: 'Behavior', href: '/parent/behavior', icon: <Activity size={20} />, roles: ['parent'] },
  { label: 'Payments', href: '/parent/payments', icon: <DollarSign size={20} />, roles: ['parent'] },
  { label: 'Announcements', href: '/parent/announcements', icon: <Megaphone size={20} />, roles: ['parent'] },
];

const accountantNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/accountant', icon: <LayoutDashboard size={20} />, roles: ['accountant'] },
  { label: 'Transactions', href: '/accountant/transactions', icon: <DollarSign size={20} />, roles: ['accountant'] },
  { label: 'Invoices', href: '/accountant/invoices', icon: <FileText size={20} />, roles: ['accountant'] },
  { label: 'Receipts', href: '/accountant/receipts', icon: <Printer size={20} />, roles: ['accountant'] },
  { label: 'Reports', href: '/accountant/reports', icon: <BarChart3 size={20} />, roles: ['accountant'] },
];

export default function PortalLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const role = profile?.role || 'admin';
  
  const allNavItems: Record<string, NavItem[]> = {
    admin: adminNavItems,
    teacher: teacherNavItems,
    student: studentNavItems,
    parent: parentNavItems,
    accountant: accountantNavItems,
  };
  const navItems = allNavItems[role] || adminNavItems;

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'teacher': return 'Teacher';
      case 'student': return 'Student';
      case 'parent': return 'Parent';
      case 'accountant': return 'Accountant';
      default: return 'Portal';
    }
  };

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="fixed inset-y-0 left-0 right-0 lg:left-64 flex flex-col">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col">
            {/* Logo */}
            <div className="p-4 border-b border-slate-200">
              <Link href={role === 'admin' ? '/admin' : `/${role}`} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <GraduationCap className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="font-bold text-slate-900 leading-tight">Mastery Engine</h1>
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider -mt-0.5">{getRoleLabel()} Portal</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Sign Out */}
            <div className="p-3 border-t border-slate-200">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-2.5 text-red-600 rounded-lg hover:bg-red-50 w-full transition-colors font-medium"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
          {/* Header */}
          <header className="h-16 bg-white shadow-sm border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="hidden lg:flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-4 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-600 w-64 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-slate-100 rounded-lg relative transition-colors">
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {profile?.first_name?.[0]?.toUpperCase()}{profile?.last_name?.[0]?.toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-slate-800">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{role}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
            {children}
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 px-4 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <Link href="/" className="hover:text-blue-600 transition-colors flex items-center gap-1"><Home size={14} />Home</Link>
                <span className="hidden sm:inline text-slate-300">|</span>
                <a href="mailto:support@masteryengine.com" className="hover:text-blue-600 transition-colors flex items-center gap-1"><Mail size={14} />Support</a>
                <span className="hidden sm:inline text-slate-300">|</span>
                <Link href="/admin/settings" className="hover:text-blue-600 transition-colors flex items-center gap-1"><Settings size={14} />Settings</Link>
                <span className="hidden sm:inline text-slate-300">|</span>
                <a href="https://github.com/alkhairyfoundation/clearpathhub" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors flex items-center gap-1"><Github size={14} />GitHub</a>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Crafted with</span>
                <Heart size={14} className="text-red-500 fill-red-500" />
                <span>by <span className="font-semibold text-slate-600">Odebunmi Tawwab</span></span>
                <span className="text-slate-300">·</span>
                <span>© {currentYear}</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
