'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  BookOpen, 
  GraduationCap,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  Video,
  ClipboardList,
  FileText,
  CheckSquare,
  Award,
  Activity,
  DollarSign,
  Printer,
  QrCode,
  BarChart3,
  Megaphone,
  Clock,
  UserCheck,
  FileCheck,
  Star,
  Download,
  Upload,
  TestTube,
  ClipboardCheck
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
  { label: 'ID Cards', href: '/admin/id-cards', icon: <Printer size={20} />, roles: ['admin'] },
  { label: 'Staff QR', href: '/admin/staff-qr', icon: <QrCode size={20} />, roles: ['admin'] },
  { label: 'Attendance', href: '/admin/attendance', icon: <UserCheck size={20} />, roles: ['admin'] },
  { label: 'Entrance Exams', href: '/admin/entrance-exams', icon: <TestTube size={20} />, roles: ['admin'] },
  { label: 'Tests & Exams', href: '/admin/tests', icon: <ClipboardCheck size={20} />, roles: ['admin'] },
  { label: 'Teacher Eval', href: '/admin/evaluation', icon: <Star size={20} />, roles: ['admin'] },
  { label: 'Import/Export', href: '/admin/import-export', icon: <Download size={20} />, roles: ['admin'] },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} />, roles: ['admin'] },
  { label: 'Announcements', href: '/admin/announcements', icon: <Megaphone size={20} />, roles: ['admin'] },
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-0 flex">
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <Link href={role === 'admin' ? '/admin' : `/${role}`} className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="font-bold text-slate-800">ClearPath</h1>
                  <p className="text-xs text-slate-500">{getRoleLabel()} Portal</p>
                </div>
              </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 w-full"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="h-16 bg-white shadow-sm flex items-center justify-between px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="hidden lg:flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{role}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}