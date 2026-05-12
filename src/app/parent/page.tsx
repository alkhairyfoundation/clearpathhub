'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Activity, DollarSign, Bell, ArrowRight, ChevronRight, Award, UserCheck, FileText, TrendingUp, GraduationCap, BookOpen, Brain, ShieldAlert, Clock } from 'lucide-react';

export default function ParentDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalChildren: 0, avgPerformance: 0, pendingFees: 0, unreadAnnouncements: 0, totalQuizzes: 0, totalTests: 0, totalHomework: 0, behaviorReports: 0, securityEvents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

useEffect(() => {
     if (!profile) return;
     if (profile.role !== 'parent') { router.push('/login'); return; }
     fetchDashboard();
   }, [profile]);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const [childrenRes, announcementsRes] = await Promise.all([
        supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)').eq('parent_id', profile?.id),
        supabase.from('announcements').select('*').in('audience', ['all', 'parents']).order('created_at', { ascending: false }).limit(5),
      ]);
      if (childrenRes.error) throw new Error(childrenRes.error.message);

      if (childrenRes.data) {
        setChildren(childrenRes.data);
        setStats(prev => ({ ...prev, totalChildren: childrenRes.data.length }));

        const childIds = childrenRes.data.map(c => c.profile_id);
        if (childIds.length > 0) {
          const [resultsData, quizData, testData, homeworkData, behaviorData, examLogsData, invoiceData] = await Promise.all([
            supabase.from('results').select('score, subject:subjects!subject_id(name), created_at').in('student_id', childIds).order('created_at', { ascending: false }),
            supabase.from('quiz_attempts').select('id, score, passed, completed_at, quiz:quizzes!quiz_id(title)').in('student_id', childIds).order('completed_at', { ascending: false }),
            supabase.from('test_attempts').select('id, score, passed, completed_at, test:tests!test_id(title), tab_switches, fullscreen_exits').in('student_id', childIds).order('completed_at', { ascending: false }),
            supabase.from('homework_submissions').select('id, marks, submitted_at, homework:homework!homework_id(title, subject:subjects!subject_id(name))').in('student_id', childIds).order('submitted_at', { ascending: false }),
            supabase.from('behavioral_reports').select('id, rating, behavior, created_at').in('student_id', childIds).order('created_at', { ascending: false }),
            supabase.from('exam_activity_logs').select('id, event_type, severity, created_at').in('student_id', childIds).order('created_at', { ascending: false }),
            supabase.from('invoices').select('id, amount, status').in('student_id', childIds).eq('status', 'pending'),
          ]);

          if (resultsData.data?.length) {
            const avg = Math.round(resultsData.data.reduce((sum: number, r: any) => sum + r.score, 0) / resultsData.data.length);
            setStats(prev => ({ ...prev, avgPerformance: avg }));
          }
          setStats(prev => ({ ...prev, totalQuizzes: quizData.data?.length || 0, totalTests: testData.data?.length || 0, totalHomework: homeworkData.data?.length || 0, behaviorReports: behaviorData.data?.length || 0, securityEvents: examLogsData.data?.length || 0, pendingFees: invoiceData.data?.length || 0 }));

          const activity: any[] = [];
          (resultsData.data || []).slice(0, 5).forEach((r: any) => activity.push({ type: 'result', label: `${r.subject?.name || 'Subject'} - ${r.score}%`, time: r.created_at, icon: 'score', href: '/parent/progress' }));
          (quizData.data || []).slice(0, 5).forEach((q: any) => activity.push({ type: 'quiz', label: `${q.quiz?.title || 'Quiz'} - ${q.score}%`, time: q.completed_at, icon: 'quiz', href: '/parent/progress' }));
          (testData.data || []).slice(0, 5).forEach((t: any) => activity.push({ type: 'test', label: `${t.test?.title || 'Test'} - ${t.score}%`, time: t.completed_at, icon: 'test', href: '/parent/progress' }));
          (homeworkData.data || []).slice(0, 5).forEach((h: any) => activity.push({ type: 'homework', label: `${h.homework?.title || 'Homework'}${h.marks != null ? ` - ${h.marks} marks` : ''}`, time: h.submitted_at, icon: 'homework', href: '/parent/progress' }));
          (behaviorData.data || []).slice(0, 5).forEach((b: any) => activity.push({ type: 'behavior', label: b.behavior || `Rating: ${b.rating}/5`, time: b.created_at, icon: 'behavior', href: '/parent/behavior' }));
          (examLogsData.data || []).slice(0, 5).forEach((e: any) => activity.push({ type: 'security', label: `Security: ${e.event_type}`, time: e.created_at, icon: 'security', href: '/parent/behavior' }));
          activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
          setRecentActivity(activity.slice(0, 10));
        }
      }

      if (announcementsRes.data) {
        setAnnouncements(announcementsRes.data);
        setStats(prev => ({ ...prev, unreadAnnouncements: announcementsRes.data.length }));
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  function activityIcon(icon: string) {
    switch (icon) {
      case 'quiz': return <Brain size={16} className="text-purple-600" />;
      case 'test': return <BookOpen size={16} className="text-blue-600" />;
      case 'homework': return <FileText size={16} className="text-amber-600" />;
      case 'behavior': return <Award size={16} className="text-green-600" />;
      case 'security': return <ShieldAlert size={16} className="text-red-600" />;
      default: return <TrendingUp size={16} className="text-primary-600" />;
    }
  }

  function activityBg(icon: string) {
    switch (icon) {
      case 'quiz': return 'bg-purple-100';
      case 'test': return 'bg-blue-100';
      case 'homework': return 'bg-amber-100';
      case 'behavior': return 'bg-green-100';
      case 'security': return 'bg-red-100';
      default: return 'bg-primary-100';
    }
  }

  return (
    <DashboardLayout title="Parent Dashboard" subtitle={`Bismillah! Welcome, ${profile?.first_name} ${profile?.last_name}`}>
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'My Children', value: stats.totalChildren, icon: <Users size={24} />, href: '/parent/children', bg: 'bg-primary-100', color: 'text-primary-600' },
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Quizzes Taken', value: stats.totalQuizzes, icon: <Brain size={20} />, bg: 'bg-purple-100', color: 'text-purple-600' },
              { title: 'Tests Taken', value: stats.totalTests, icon: <BookOpen size={20} />, bg: 'bg-blue-100', color: 'text-blue-600' },
              { title: 'Homework', value: stats.totalHomework, icon: <FileText size={20} />, bg: 'bg-amber-100', color: 'text-amber-600' },
              { title: 'Behavior Reports', value: stats.behaviorReports, icon: <Award size={20} />, bg: 'bg-green-100', color: 'text-green-600' },
            ].map((card, i) => (
              <div key={i} className="card">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
                  <div><p className="text-xs text-slate-500">{card.title}</p><p className="text-lg font-bold text-slate-900">{card.value}</p></div>
                </div>
              </div>
            ))}
          </div>

          {stats.securityEvents > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <ShieldAlert size={24} className="text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800 text-sm">{stats.securityEvents} security event{stats.securityEvents > 1 ? 's' : ''} detected during exams</p>
                <p className="text-xs text-red-600 mt-0.5">Tab switches, copy/paste attempts, or fullscreen exits recorded. <Link href="/parent/behavior" className="underline font-medium">View details</Link></p>
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><GraduationCap size={18} className="text-slate-400" />My Children</h2>
              <Link href="/parent/children" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">View all <ArrowRight size={14} /></Link>
            </div>
            {children.length === 0 ? (
              <div className="text-center py-16"><Users className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No children linked to your account</p><p className="text-sm text-slate-400 mt-1">Contact the school admin to link your children</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map(child => (
                  <div key={child.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center font-bold text-primary-700">{child.profile?.first_name?.[0]}{child.profile?.last_name?.[0]}</div>
                      <div><p className="font-bold text-slate-900">{child.profile?.first_name} {child.profile?.last_name}</p><p className="text-sm text-slate-500">{child.class?.name || 'No class'}</p></div>
                    </div>
                    {child.admission_number && <p className="text-xs text-slate-400 font-mono">ID: {child.admission_number}</p>}
                    <div className="flex gap-2 mt-4">
                      <Link href={`/parent/progress?child=${child.id}`} className="btn-outline flex-1 text-xs py-2 text-center">Progress</Link>
                      <Link href={`/parent/behavior?child=${child.id}`} className="btn-outline flex-1 text-xs py-2 text-center">Behavior</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Clock size={18} className="text-slate-400" />Recent Activity</h2>
              </div>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-slate-400"><Activity size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No recent activity</p></div>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((a, i) => (
                    <Link key={i} href={a.href} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 ${activityBg(a.icon)} rounded-lg flex items-center justify-center flex-shrink-0`}>{activityIcon(a.icon)}</div>
                      <div className="flex-1 min-w-0"><p className="text-sm text-slate-700 truncate">{a.label}</p><p className="text-xs text-slate-400">{new Date(a.time).toLocaleDateString()}</p></div>
                      <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

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
                    <div key={a.id} className={`p-3 rounded-lg border-l-4 ${a.priority === 'urgent' ? 'bg-red-50 border-red-500' : a.priority === 'high' ? 'bg-amber-50 border-amber-500' : 'bg-primary-50 border-primary-500'}`}>
                      <p className="font-semibold text-sm text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{a.content}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
