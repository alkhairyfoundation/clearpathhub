'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  BarChart3, TrendingUp, Users, BookOpen, UserCheck,
  Award, AlertTriangle, Download, Search, Filter, Loader2,
  Flame, Zap, Brain, RefreshCw, CheckCircle, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
const GRADE_COLORS: Record<string, string> = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile, classFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set('class_id', classFilter);
      const res = await fetch(`/api/admin/analytics/overview?${params.toString()}`);
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const summary = data?.summary;
  const students = (data?.students || [])
    .filter((s: any) =>
      !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (loading && !data) {
    return (
      <DashboardLayout title="Analytics" subtitle="Advanced student analytics">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics" subtitle="Advanced student analytics dashboard">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Filter size={14} className="text-slate-400 dark:text-slate-500 dark:text-slate-500 shrink-0" />
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="input py-1.5 px-2.5 text-xs w-44"
            >
              <option value="">All Classes</option>
              {data?.filters?.classes?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-500" />
            <input
              type="text" placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input py-1.5 pl-8 pr-3 text-xs w-full"
            />
          </div>
          <Link href="/admin/analytics/compare" className="btn-ghost py-1.5 px-2.5 text-xs flex items-center gap-1"><BarChart3 size={14} /> Compare</Link>
          <button onClick={fetchData} className="btn-ghost p-2 text-xs"><RefreshCw size={14} /></button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <div className="card py-2.5 px-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 flex items-center justify-center"><Users size={16} className="text-blue-600 dark:text-blue-400 dark:text-blue-400" /></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Students</p><p className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{summary?.total_students || 0}</p></div>
            </div>
          </div>
          <div className="card py-2.5 px-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 flex items-center justify-center"><BarChart3 size={16} className="text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" /></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Avg Score</p><p className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{summary?.avg_score ? `${summary.avg_score}%` : 'N/A'}</p></div>
            </div>
          </div>
          <div className="card py-2.5 px-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 flex items-center justify-center"><UserCheck size={16} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" /></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Attendance</p><p className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{summary?.attendance_rate ? `${summary.attendance_rate}%` : 'N/A'}</p></div>
            </div>
          </div>
          <div className="card py-2.5 px-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30 flex items-center justify-center"><Brain size={16} className="text-purple-600 dark:text-purple-400 dark:text-purple-400" /></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Mastery Avg</p><p className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{summary?.avg_mastery ? `${summary.avg_mastery}%` : 'N/A'}</p></div>
            </div>
          </div>
          <div className="card py-2.5 px-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 flex items-center justify-center"><AlertTriangle size={16} className="text-red-600 dark:text-red-400 dark:text-red-400" /></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">At Risk</p><p className="text-lg font-bold text-red-600 dark:text-red-400 dark:text-red-400">{summary?.at_risk_count || 0}</p></div>
            </div>
          </div>
          <div className="card py-2.5 px-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center"><Flame size={16} className="text-orange-600 dark:text-orange-400 dark:text-orange-400" /></div>
              <div><p className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Avg Streak</p><p className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{summary?.avg_streak ? `${summary.avg_streak}d` : '0d'}</p></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grade Distribution */}
          <div className="card">
            <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-3 text-sm">Grade Distribution</h3>
            {data?.grade_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.grade_distribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80} innerRadius={45} label={({ grade, count }) => `${grade}: ${count}`}>
                    {data.grade_distribution.map((entry: any) => (
                      <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-[240px] text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500">No data</div>}
          </div>

          {/* Subject Performance */}
          <div className="card lg:col-span-2">
            <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-3 text-sm">Subject Performance</h3>
            {data?.subject_performance?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.subject_performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip />
                  <Bar dataKey="avg_score" name="Avg Score" radius={[4, 4, 0, 0]}>
                    {data.subject_performance.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.avg_score >= 75 ? '#10b981' : entry.avg_score >= 60 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-[240px] text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500">No data</div>}
          </div>
        </div>

        {/* Attendance Trend */}
        {data?.attendance_trend?.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-3 text-sm">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.attendance_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" name="Attendance Rate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Student List */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white dark:text-white text-sm">Students ({students.length})</h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500">
              <span>{summary?.active_today || 0} practiced today</span>
              <span>·</span>
              <span>Max streak: {summary?.max_streak || 0}d</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                  <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Student</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Class</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Avg Score</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Attendance</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Streak</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Level</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Risk</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Today</th>
                  <th className="text-center py-2 px-2 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400 dark:text-slate-500 dark:text-slate-500">No students found</td></tr>
                )}
                {students.map((s: any) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-700 dark:border-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                    <td className="py-2 px-3">
                      <Link href={`/admin/analytics/student/${s.id}`} className="font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200 hover:text-primary-600 dark:text-primary-400 dark:text-primary-400">
                        {s.name}
                      </Link>
                    </td>
                    <td className="text-center py-2 px-2 text-slate-600 dark:text-slate-400 dark:text-slate-400">{s.class_name}</td>
                    <td className="text-center py-2 px-2">
                      <span className={`font-bold ${!s.avg_score ? 'text-slate-400 dark:text-slate-500 dark:text-slate-500' : s.avg_score >= 75 ? 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400' : s.avg_score >= 50 ? 'text-amber-600 dark:text-amber-400 dark:text-amber-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>
                        {s.avg_score != null ? `${s.avg_score}%` : '-'}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className={`font-bold ${!s.attendance_rate ? 'text-slate-400 dark:text-slate-500 dark:text-slate-500' : s.attendance_rate >= 90 ? 'text-emerald-600 dark:text-emerald-400 dark:text-emerald-400' : s.attendance_rate >= 75 ? 'text-amber-600 dark:text-amber-400 dark:text-amber-400' : 'text-red-600 dark:text-red-400 dark:text-red-400'}`}>
                        {s.attendance_rate != null ? `${s.attendance_rate}%` : '-'}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="flex items-center justify-center gap-0.5">
                        <Flame size={10} className={s.current_streak > 0 ? 'text-orange-500' : 'text-slate-300'} />
                        <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{s.current_streak || 0}d</span>
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className="flex items-center justify-center gap-0.5">
                        <Zap size={10} className="text-amber-500 dark:text-amber-400 dark:text-amber-400" />
                        <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{s.level || 1}</span>
                      </span>
                    </td>
                    <td className="text-center py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        s.risk_level === 'critical' ? 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400' :
                        s.risk_level === 'high' ? 'bg-orange-100 text-orange-700' :
                        s.risk_level === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300' :
                        s.risk_level === 'low' ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300' :
                        'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-400 dark:text-slate-500 dark:text-slate-500'
                      }`}>{s.risk_level || 'N/A'}</span>
                    </td>
                    <td className="text-center py-2 px-2">
                      {s.practiced_today ? <CheckCircle size={14} className="text-emerald-500 mx-auto" /> : <XCircle size={14} className="text-slate-300 mx-auto" />}
                    </td>
                    <td className="text-center py-2 px-2">
                      <Link
                        href={`/admin/analytics/student/${s.id}`}
                        className="text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:text-primary-800 dark:text-primary-200 dark:text-primary-200 text-[10px] font-medium"
                      >View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
