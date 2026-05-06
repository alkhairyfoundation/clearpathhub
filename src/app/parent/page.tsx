'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Activity, DollarSign, Bell } from 'lucide-react';

export default function ParentDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
  }, [profile]);

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold text-slate-800">Parent Dashboard</h1><p className="text-slate-500">Welcome, {profile?.first_name}!</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6"><div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4"><Users className="text-blue-600" size={24} /></div><h3 className="text-slate-600 text-sm">Children</h3><p className="text-2xl font-bold text-slate-800">{children.length}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4"><Activity className="text-emerald-600" size={24} /></div><h3 className="text-slate-600 text-sm">Avg Performance</h3><p className="text-2xl font-bold text-slate-800">85%</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4"><DollarSign className="text-purple-600" size={24} /></div><h3 className="text-slate-600 text-sm">Pending Fees</h3><p className="text-2xl font-bold text-slate-800">2</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4"><Bell className="text-orange-600" size={24} /></div><h3 className="text-slate-600 text-sm">Announcements</h3><p className="text-2xl font-bold text-slate-800">3</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6"><h2 className="text-lg font-semibold text-slate-800 mb-6">My Children</h2>
        <div className="text-center py-8 text-slate-500"><Users size={48} className="mx-auto mb-4 opacity-50" /><p>No children linked to your account</p></div>
      </div>
    </div>
  );
}