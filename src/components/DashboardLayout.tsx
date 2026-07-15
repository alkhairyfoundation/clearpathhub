'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { 
  Menu, X, Bell, Search, GraduationCap, ChevronDown, LogOut, 
  Settings, User, Calendar, Sun, Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type { UserRole } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { user, profile, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && !user && !profile) {
      router.push('/login');
    }
  }, [loading, user, profile, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp-gold"></div>
      </div>
    );
  }

  // If NextAuth confirms the user but profile is null (e.g., Supabase RLS
  // recovery hasn't completed yet), use a fallback profile so the UI renders.
  const displayProfile = profile || (user ? {
    id: user.id || '',
    email: user.email || '',
    first_name: user.name?.split(' ')[0] || 'User',
    last_name: user.name?.split(' ')[1] || '',
    role: (user as any).role || 'student',
    created_at: '',
    updated_at: '',
  } as any : null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Navigation */}
      <MobileNav role={displayProfile?.role} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:block">
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/25">
              <GraduationCap className="text-white" size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">ClearPath</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Edu Hub</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <Sidebar role={displayProfile?.role} />
          </div>

          {/* User Section at Bottom */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden ${!displayProfile?.avatar_url ? 'bg-gradient-to-br from-cp-gold to-cp-gold-light' : ''}`}>
                {displayProfile?.avatar_url ? (
                  <img src={displayProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  `${displayProfile?.first_name?.[0] || ''}${displayProfile?.last_name?.[0] || ''}`
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{displayProfile?.first_name} {displayProfile?.last_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{displayProfile?.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-2 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Desktop Header */}
        <header className="hidden lg:sticky lg:top-0 lg:z-30 lg:bg-white lg:dark:bg-slate-800 lg:border-b lg:border-slate-200 lg:dark:border-slate-700 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Menu size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg">
                <Calendar size={14} />
                <span>{currentDate}</span>
              </div>

              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Toggle dark mode"
                >
                  {theme === 'dark' ? (
                    <Sun size={20} className="text-amber-400" />
                  ) : (
                    <Moon size={20} className="text-slate-600" />
                  )}
                </button>
              )}

              {/* Notifications */}
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors relative">
                <Bell size={20} className="text-slate-600 dark:text-slate-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs overflow-hidden ${!displayProfile?.avatar_url ? 'bg-gradient-to-br from-cp-gold to-cp-gold-light' : ''}`}>
                    {displayProfile?.avatar_url ? (
                      <img src={displayProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      `${displayProfile?.first_name?.[0] || ''}${displayProfile?.last_name?.[0] || ''}`
                    )}
                  </div>
                  <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 animate-scale-in z-50">
                    <button
                      onClick={() => router.push(`/${displayProfile?.role || 'student'}/profile`)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <User size={16} />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => router.push(`/${displayProfile?.role || 'student'}/settings`)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Header Spacer */}
        <div className="lg:hidden h-16" />

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-[calc(100vh-8rem)]">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500 dark:text-slate-400">
            <p>&copy; {new Date().getFullYear()} ClearPath Edu Hub. All rights reserved.</p>
            <p>Developed by: Odebunmi Tawwab A.</p>
          </div>
        </footer>
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}