'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Activity, DollarSign, Bell, ArrowRight, ChevronRight, Award, UserCheck, FileText, TrendingUp, GraduationCap } from 'lucide-react';

export default function ParentDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalChildren: 0, avgPerformance: 0, pendingFees: 0, unreadAnnouncements: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchDashboard();
  }, [profile]);

  async function fetchDashboard() {
    setLoading(true);

    const [childrenRes, announcementsRes] = await Promise.all([
      supabase.from('students').select('*, profile:profiles(first_name, last_name), class:classes(name)').eq('parent_id', profile?.id),
      supabase.from('announcements').select('*').in('audience', ['all', 'parents']).order('created_at', { ascending: false }).limit(5),
    ]);

    if (childrenRes.data) {
      setChildren(childrenRes.data);
      setStats(prev => ({ ...prev, totalChildren: childrenRes.data.length }));

      const childIds = childrenRes.data.map(c => c.profile_id);
      if (childIds.length > 0) {
        const { data: resultsData } = await supabase.from('results').select('score').in('student_id', childIds);
        if (resultsData?.length) {
          const avg = Math.round(resultsData.reduce((sum: number, r: any) => sum + r.score, 0) / resultsData.length);
          setStats(prev => ({ ...prev, avgPerformance: avg }));
        }

        const { data: invoiceData } = await supabase.from('invoices').select('id, amount, status').in('student_id', childIds).eq('status', 'pending');
        setStats(prev => ({ ...prev, pendingFees: invoiceData?.length || 0 }));
      }
    }

    if (announcementsRes.data) {
      setAnnouncements(announcementsRes.data);
      setStats(prev => ({ ...prev, unreadAnnouncements: announcementsRes.data.length }));
    }

    setLoading(false);
  }

  return (
    <DashboardLayout title="Parent Dashboard" subtitle={`Bismillah! Welcome, ${profile?.first_name} ${profile?.last_name}`}>
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'My Children', value: stats.totalChildren, icon: <Users size={24} />, href: '/parent/children', bg: 'bg-blue-100', color: 'text-blue-600' },
              { title: 'Avg Performance', value: `${stats.avgPerformance}%`, icon: <TrendingUp size={24} />, href: '/parent/progress', bg: 'bg-emerald-100', color: 'text-emerald-600' },
              { title: 'Pending Fees', value: stats.pendingFees, icon: <DollarSign size={24} />, href: '/parent/payments', bg: 'bg-amber-100', color: 'text-amber-600' },
              { title: 'Announcements', value: stats.unreadAnnouncements, icon: <Bell size={24} />, href: '/parent/announcements', bg: 'bg-purple-100', color: 'text-purple-600' },
            ].map((card, i) => (
              <Link key={i} href={card.href} className="card hover:shadow-md cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </Link>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><GraduationCap size={18} className="text-slate-400" />My Children</h2>
              <Link href="/parent/children" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
            </div>
            {children.length === 0 ? (
              <div className="text-center py-16"><Users className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No children linked to your account</p><p className="text-sm text-slate-400 mt-1">Contact the school admin to link your children</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map(child => (
                  <div key={child.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">{child.profile?.first_name?.[0]}{child.profile?.last_name?.[0]}</div>
                      <div><p className="font-bold text-slate-900">{child.profile?.first_name} {child.profile?.last_name}</p><p className="text-sm text-slate-500">{child.class?.name || 'No class'}</p></div>
                    </div>
                    {child.admission_number && <p className="text-xs text-slate-400 font-mono">ID: {child.admission_number}</p>}
                    <div className="flex gap-2 mt-4">
                      <Link href="/parent/progress" className="btn-outline flex-1 text-xs py-2 text-center">Progress</Link>
                      <Link href="/parent/payments" className="btn-outline flex-1 text-xs py-2 text-center">Payments</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Bell size={18} className="text-slate-400" />Announcements</h2>
                {announcements.length > 0 && <span className="badge badge-red">{announcements.length}</span>}
              </div>
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-slate-400"><Bell size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No new announcements</p></div>
              ) : (
                <div className="space-y-3">
                  {announcements.map(a => (
                    <div key={a.id} className={`p-3 rounded-lg border-l-4 ${a.priority === 'urgent' ? 'bg-red-50 border-red-500' : a.priority === 'high' ? 'bg-amber-50 border-amber-500' : 'bg-blue-50 border-blue-500'}`}>
                      <p className="font-semibold text-sm text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{a.content}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400" />Quick Links</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Children', href: '/parent/children', icon: <Users size={20} />, bg: 'bg-blue-50 text-blue-600' },
                  { label: 'Progress', href: '/parent/progress', icon: <Activity size={20} />, bg: 'bg-emerald-50 text-emerald-600' },
                  { label: 'Payments', href: '/parent/payments', icon: <DollarSign size={20} />, bg: 'bg-amber-50 text-amber-600' },
                  { label: 'Behavior', href: '/parent/behavior', icon: <Award size={20} />, bg: 'bg-purple-50 text-purple-600' },
                ].map((link, i) => (
                  <Link key={i} href={link.href} className={`p-4 rounded-xl ${link.bg} hover:opacity-80 transition-all text-center`}>
                    <div className="mb-2 flex justify-center">{link.icon}</div>
                    <p className="text-sm font-semibold">{link.label}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
