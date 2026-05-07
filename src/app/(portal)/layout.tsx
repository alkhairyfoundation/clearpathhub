'use client';

import { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, Users, Settings, BookOpen, GraduationCap, LogOut, Menu, X, Bell,
  Video, ClipboardList, FileText, Award, Activity, DollarSign, Printer,
  QrCode, BarChart3, Megaphone, UserCheck, Star, Download,
  TestTube, ClipboardCheck, Home, Mail, ChevronDown, ChevronUp, User
} from 'lucide-react';

interface NavItem {
  label?: string;
  href?: string;
  icon?: ReactNode;
  roles?: string[];
  section?: string;
}

const navConfig: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} />, roles: ['admin'] },
    { label: 'Users', href: '/admin/users', icon: <Users size={20} />, roles: ['admin'] },
    { section: 'Academic' },
    { label: 'Departments', href: '/admin/departments', icon: <BookOpen size={20} />, roles: ['admin'] },
    { label: 'Classes', href: '/admin/classes', icon: <GraduationCap size={20} />, roles: ['admin'] },
    { label: 'Subjects', href: '/admin/subjects', icon: <FileText size={20} />, roles: ['admin'] },
    { section: 'Operations' },
    { label: 'Attendance', href: '/admin/attendance', icon: <UserCheck size={20} />, roles: ['admin'] },
    { label: 'Tests & Exams', href: '/admin/tests', icon: <ClipboardCheck size={20} />, roles: ['admin'] },
    { label: 'Entrance Exams', href: '/admin/entrance-exams', icon: <TestTube size={20} />, roles: ['admin'] },
    { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} />, roles: ['admin'] },
    { label: 'Announcements', href: '/admin/announcements', icon: <Megaphone size={20} />, roles: ['admin'] },
    { label: 'Teacher Eval', href: '/admin/evaluation', icon: <Star size={20} />, roles: ['admin'] },
    { section: 'Identity' },
    { label: 'ID Cards', href: '/admin/id-cards', icon: <Printer size={20} />, roles: ['admin'] },
    { label: 'Staff QR', href: '/admin/staff-qr', icon: <QrCode size={20} />, roles: ['admin'] },
    { label: 'School QR', href: '/admin/school-qr', icon: <QrCode size={20} />, roles: ['admin'] },
    { label: 'Import/Export', href: '/admin/import-export', icon: <Download size={20} />, roles: ['admin'] },
  ],
  teacher: [
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
  ],
  student: [
    { label: 'Dashboard', href: '/student', icon: <LayoutDashboard size={20} />, roles: ['student'] },
    { label: 'Video Lessons', href: '/student/sessions', icon: <Video size={20} />, roles: ['student'] },
    { label: 'Lessons', href: '/student/lessons', icon: <FileText size={20} />, roles: ['student'] },
    { label: 'Homework', href: '/student/homework', icon: <FileText size={20} />, roles: ['student'] },
    { label: 'Results', href: '/student/results', icon: <Award size={20} />, roles: ['student'] },
    { label: 'Attendance', href: '/student/attendance', icon: <UserCheck size={20} />, roles: ['student'] },
    { label: 'My ID Card', href: '/student/id-card', icon: <Printer size={20} />, roles: ['student'] },
  ],
  parent: [
    { label: 'Dashboard', href: '/parent', icon: <LayoutDashboard size={20} />, roles: ['parent'] },
    { label: 'Children', href: '/parent/children', icon: <Users size={20} />, roles: ['parent'] },
    { label: 'Weekly Report', href: '/parent/weekly-report', icon: <FileText size={20} />, roles: ['parent'] },
    { label: 'Progress', href: '/parent/progress', icon: <Activity size={20} />, roles: ['parent'] },
    { label: 'Behavior', href: '/parent/behavior', icon: <Activity size={20} />, roles: ['parent'] },
    { label: 'Payments', href: '/parent/payments', icon: <DollarSign size={20} />, roles: ['parent'] },
    { label: 'Announcements', href: '/parent/announcements', icon: <Megaphone size={20} />, roles: ['parent'] },
  ],
  accountant: [
    { label: 'Dashboard', href: '/accountant', icon: <LayoutDashboard size={20} />, roles: ['accountant'] },
    { label: 'Transactions', href: '/accountant/transactions', icon: <DollarSign size={20} />, roles: ['accountant'] },
    { label: 'Invoices', href: '/accountant/invoices', icon: <FileText size={20} />, roles: ['accountant'] },
    { label: 'Receipts', href: '/accountant/receipts', icon: <Printer size={20} />, roles: ['accountant'] },
    { label: 'Reports', href: '/accountant/reports', icon: <BarChart3 size={20} />, roles: ['accountant'] },
  ],
};

const getRolePath = (role: string) => `/${role}`;

export default function PortalLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMobileDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
        setMobileDropdownOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const navItems = navConfig[role] || navConfig.admin;
  const dashboardPath = getRolePath(role);

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

  function NavContent({ onClick }: { onClick?: () => void }) {
    return (
      <>
        {navItems.map((item, i) => {
          if (item.section) {
            return (
              <div key={i} className="px-3 pt-4 pb-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.section}</p>
              </div>
            );
          }
          if (!item.href || !item.label) return null;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <Link href={dashboardPath} className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
              <GraduationCap className="text-white" size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-sm leading-tight truncate">Mastery Engine</h1>
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{getRoleLabel()}</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <NavContent />
        </nav>

        <div className="border-t border-slate-200 p-3">
          <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)} className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-lg">
                {mobileDropdownOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <Link href={dashboardPath} className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <GraduationCap className="text-white" size={18} />
                </div>
                <span className="font-bold text-slate-900 text-sm">Mastery Engine</span>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button className="p-2 hover:bg-slate-100 rounded-lg relative">
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {profile?.first_name?.[0]?.toUpperCase()}{profile?.last_name?.[0]?.toUpperCase()}
                </div>
                <div className="hidden sm:block min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate max-w-[150px]">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Dropdown Nav */}
          {mobileDropdownOpen && (
            <div className="lg:hidden border-t border-slate-200 bg-white max-h-[80vh] overflow-y-auto">
              <nav className="py-2 px-3 space-y-0.5">
                <NavContent onClick={() => setMobileDropdownOpen(false)} />
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <button onClick={() => { handleSignOut(); setMobileDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full">
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </nav>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Link href="/" className="hover:text-blue-600 transition-colors flex items-center gap-1"><Home size={12} />Home</Link>
              <a href="mailto:support@masteryengine.com" className="hover:text-blue-600 transition-colors flex items-center gap-1"><Mail size={12} />Support</a>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span>&copy; {currentYear} <span className="font-semibold text-slate-600">Odebunmi Tawwab</span></span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile overlay when sidebar is open (for larger screens) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
