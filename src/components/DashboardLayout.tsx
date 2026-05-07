'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { 
  Menu, X, Bell, Search, GraduationCap, ChevronDown, LogOut, 
  Settings, User, Calendar
} from 'lucide-react';
import type { UserRole } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Navigation */}
      <MobileNav role={profile.role} />

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:block">
        <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
              <GraduationCap className="text-white" size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-900">ClearPath</p>
              <p className="text-xs text-slate-500">Edu Hub</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <Sidebar role={profile.role} />
          </div>

          {/* User Section at Bottom */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{profile.first_name} {profile.last_name}</p>
                <p className="text-xs text-slate-500 capitalize">{profile.role}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-2 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <header className="hidden lg:sticky lg:top-0 lg:z-30 lg:bg-white lg:border-b lg:border-slate-200 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu size={20} className="text-slate-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg">
                <Calendar size={14} />
                <span>{currentDate}</span>
              </div>

              {/* Notifications */}
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors relative">
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </div>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 animate-scale-in z-50">
                    <button
                      onClick={() => router.push(`/${profile.role}/profile`)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User size={16} />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => router.push(`/${profile.role}/settings`)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
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