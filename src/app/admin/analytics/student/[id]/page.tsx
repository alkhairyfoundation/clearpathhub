'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Search, Download, Filter, BarChart3, BookOpen,
  Brain, Target, TrendingUp, Award, Star, Zap, Clock,
  CheckCircle, XCircle, AlertTriangle, Loader2, User,
  Calendar, FileText, Flame, Activity, RefreshCw
} from 'lucide-react';
import {
  MetricCard, TabOverview, TabAcademic, TabMastery,
  TabPractice, TabEngagement, TabHolistic, TabRisk
} from './components/TabPanels';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'academic', label: 'Academic', icon: BookOpen },
  { id: 'mastery', label: 'Mastery', icon: Brain },
  { id: 'practice', label: 'Practice & Homework', icon: FileText },
  { id: 'engagement', label: 'Engagement', icon: Activity },
  { id: 'holistic', label: 'Holistic', icon: Star },
  { id: 'risk', label: 'Risk & Promotion', icon: AlertTriangle },
];

export default function StudentAnalyticsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [term, setTerm] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile, id, term, academicYear, subjectFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.set('term', term);
      if (academicYear) params.set('academic_year', academicYear);
      if (subjectFilter) params.set('subject_id', subjectFilter);
      const res = await fetch('/api/admin/analytics/student/' + id + '?' + params.toString());
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  if (loading && !data) {
    return (
      <DashboardLayout title="Student Analytics" subtitle="Loading comprehensive analysis...">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Student Analytics" subtitle="Error loading data">
        <div className="text-center py-16"><AlertTriangle size={48} className="text-red-400 mx-auto mb-4" /><p className="text-slate-500">Failed to load student data.</p></div>
      </DashboardLayout>
    );
  }

  const p = data.profile;

  return (
    <DashboardLayout title="Student Analytics" subtitle="Comprehensive student analysis">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/admin/analytics" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></Link>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center"><User size={20} className="text-primary-600" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{p.first_name} {p.last_name}</h1>
              <p className="text-xs text-slate-500">{p.class_name || 'No class'} &middot; {p.admission_number || 'No ID'} &middot; Level {p.level} &middot; {p.total_xp} XP</p>
            </div>
          </div>
          <button onClick={fetchData} className="btn-ghost p-2"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <Filter size={14} className="text-slate-400" />
          <input type="text" placeholder="Term (e.g. Term 1)" value={term} onChange={e => setTerm(e.target.value)} className="input py-1.5 px-2.5 text-xs w-28" />
          <input type="text" placeholder="Year (e.g. 2024/2025)" value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="input py-1.5 px-2.5 text-xs w-32" />
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="input py-1.5 px-2.5 text-xs w-40">
            <option value="">All Subjects</option>
            {data.academic?.subjects?.map((s: any) => (
              <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
            ))}
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <MetricCard label="Avg Score" value={data.academic?.summary?.avg_score != null ? data.academic.summary.avg_score + '%' : 'N/A'} icon={<BarChart3 size={16} className="text-blue-600" />} color="#3b82f6" />
          <MetricCard label="Attendance" value={data.attendance?.summary?.rate != null ? data.attendance.summary.rate + '%' : 'N/A'} icon={<Calendar size={16} className="text-emerald-600" />} color="#10b981" />
          <MetricCard label="Streak" value={data.gamification?.current_streak ? data.gamification.current_streak + 'd' : '0d'} icon={<Flame size={16} className="text-orange-600" />} color="#f97316" />
          <MetricCard label="Level" value={data.gamification?.level || 1} icon={<Zap size={16} className="text-amber-600" />} color="#f59e0b" />
          <MetricCard label="Mastery" value={data.mastery?.summary?.avg_mastery_score != null ? data.mastery.summary.avg_mastery_score + '%' : 'N/A'} icon={<Brain size={16} className="text-purple-600" />} color="#8b5cf6" />
          <MetricCard label="Risk" value={data.risk?.current?.risk_level ? data.risk.current.risk_level.toUpperCase() : 'N/A'} icon={<AlertTriangle size={16} className={data.risk?.current?.risk_level === 'high' || data.risk?.current?.risk_level === 'critical' ? 'text-red-600' : 'text-emerald-600'} />} color={data.risk?.current?.risk_level === 'high' || data.risk?.current?.risk_level === 'critical' ? '#ef4444' : '#10b981'} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ' + (activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-800')}
            >{<tab.icon size={14} />} {tab.label}</button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && <TabOverview data={data} />}
        {activeTab === 'academic' && <TabAcademic data={data} />}
        {activeTab === 'mastery' && <TabMastery data={data} />}
        {activeTab === 'practice' && <TabPractice data={data} />}
        {activeTab === 'engagement' && <TabEngagement data={data} />}
        {activeTab === 'holistic' && <TabHolistic data={data} />}
        {activeTab === 'risk' && <TabRisk data={data} />}
      </div>
    </DashboardLayout>
  );
}
