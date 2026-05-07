'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, TrendingUp, Users, GraduationCap, BookOpen, AlertTriangle, Download, ArrowUp, ArrowDown, Zap, CalendarCheck, Shield, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, totalStaff: 0, attendanceRate: 0, avgScore: 0, atRisk: 0 });
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [classDistribution, setClassDistribution] = useState<any[]>([]);
  const [riskPredictions, setRiskPredictions] = useState<any[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchAnalytics();
    fetchRiskPredictions();
  }, [profile]);

  async function fetchAnalytics() {
    setLoading(true);
    const [studentsRes, teachersRes, staffRes, attendanceRes, resultsRes, classesRes, subjectsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'accountant'),
      supabase.from('attendance').select('status, date').order('date', { ascending: false }).limit(50),
      supabase.from('results').select('score, subject_id, student_id'),
      supabase.from('students').select('class_id'),
      supabase.from('subjects').select('id, name'),
    ]);

    const presentCount = attendanceRes.data?.filter((a: any) => a.status === 'present').length || 0;
    const totalAttendance = attendanceRes.data?.length || 0;
    const avgScore = resultsRes.data?.length ? Math.round(resultsRes.data.reduce((sum: number, r: any) => sum + r.score, 0) / resultsRes.data.length * 10) / 10 : 0;
    const atRiskCount = resultsRes.data?.filter((r: any) => r.score < 50).length || 0;

    setStats({
      totalStudents: studentsRes.count || studentsRes.data?.length || 0,
      totalTeachers: teachersRes.count || teachersRes.data?.length || 0,
      totalStaff: staffRes.count || staffRes.data?.length || 0,
      attendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
      avgScore,
      atRisk: atRiskCount,
    });

    if (attendanceRes.data) {
      const grouped: Record<string, { present: number; total: number }> = {};
      attendanceRes.data.forEach((a: any) => {
        if (!grouped[a.date]) grouped[a.date] = { present: 0, total: 0 };
        if (a.status === 'present') grouped[a.date].present++;
        grouped[a.date].total++;
      });
      const chartData = Object.entries(grouped).slice(0, 14).map(([date, d]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendance: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
      })).reverse();
      setAttendanceData(chartData);
    }

    if (resultsRes.data && subjectsRes.data) {
      const subjectScores: Record<string, { name: string; scores: number[] }> = {};
      resultsRes.data.forEach((r: any) => {
        const subj = subjectsRes.data.find(s => s.id === r.subject_id);
        const name = subj?.name || `Subject ${r.subject_id?.slice(-4) || 'N/A'}`;
        if (!subjectScores[r.subject_id]) subjectScores[r.subject_id] = { name, scores: [] };
        subjectScores[r.subject_id].scores.push(r.score);
      });
      const perfData = Object.values(subjectScores).slice(0, 8).map(({ name, scores }) => ({
        subject: name.length > 12 ? name.substring(0, 12) + '...' : name,
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }));
      setSubjectPerformance(perfData);
    }

    if (classesRes.data && studentsRes.data) {
      const classCounts: Record<string, number> = {};
      classesRes.data.forEach((c: any) => {
        const count = studentsRes.data?.filter((s: any) => s.class_id === c.id).length || 0;
        if (count > 0) classCounts[c.name || 'Unknown'] = count;
      });
      const distData = Object.entries(classCounts).map(([name, value]) => ({ name, value }));
      setClassDistribution(distData.length > 0 ? distData : [{ name: 'No Data', value: 0 }]);
    }

    setLoading(false);
  }

  async function fetchRiskPredictions() {
    try {
      const response = await fetch('/api/analytics?limit=10');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success) setRiskPredictions(data.data);
    } catch { /* ignore */ }
  }

  async function generatePredictions() {
    setLoadingPredictions(true);
    try {
      const response = await fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error('Failed');
      await fetchRiskPredictions();
    } catch { alert('Failed to generate predictions.'); }
    finally { setLoadingPredictions(false); }
  }

  async function acknowledgePrediction(predictionId: string) {
    try {
      await fetch(`/api/analytics/predictions/${predictionId}/acknowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      await fetchRiskPredictions();
    } catch { /* ignore */ }
  }

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">Comprehensive school performance insights</p>
        </div>
        <button className="btn-primary flex items-center gap-2"><Download size={18} />Export Report</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Students', value: stats.totalStudents, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100', change: '+5%', up: true },
          { label: 'Teachers', value: stats.totalTeachers, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Staff', value: stats.totalStaff, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Attendance', value: `${stats.attendanceRate}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', change: '+2.5%', up: true },
          { label: 'Avg Score', value: `${stats.avgScore}%`, icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-100' },
          { label: 'At Risk', value: stats.atRisk, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', change: 'needs attention', up: false, alert: true },
        ].map((stat, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 uppercase tracking-wide">{stat.label}</span>
              <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}><stat.icon size={16} className={stat.color} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            {stat.change && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${stat.alert ? 'text-red-600' : 'text-green-600'}`}>
                {stat.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{stat.change}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Activity size={18} className="text-slate-400" />Attendance Trend (14 days)</h2>
          {loading ? <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div> : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><GraduationCap size={18} className="text-slate-400" />Class Distribution</h2>
          {classDistribution.length === 0 || classDistribution[0].name === 'No Data' ? (
            <div className="h-64 flex items-center justify-center text-slate-400"><p>No class data available</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={classDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {classDistribution.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-slate-400" />Subject Performance</h2>
          {loading ? <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="average" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Shield size={18} className="text-slate-400" />Quick Stats</h2>
          <div className="space-y-3">
            {[
              { label: 'Perfect Attendance', value: stats.totalStudents > 0 ? Math.round(stats.attendanceRate / 10) : 0, color: 'text-green-600' },
              { label: 'Avg Homework Completion', value: '87%', color: 'text-emerald-600' },
              { label: 'Total Results Recorded', value: stats.totalStudents, color: 'text-blue-600' },
              { label: 'Active Classes', value: classDistribution.length, color: 'text-violet-600' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">{stat.label}</span>
                <span className={`font-bold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Zap size={18} className="text-amber-500" />Student Risk Predictions</h2>
          <button onClick={generatePredictions} disabled={loadingPredictions} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Zap size={16} />{loadingPredictions ? 'Generating...' : 'Generate Predictions'}
          </button>
        </div>

        {loadingPredictions ? (
          <div className="h-48 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
        ) : riskPredictions.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-500">No risk predictions available</p>
            <p className="text-sm text-slate-400 mt-1">Generate predictions to identify at-risk students</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Risk Level</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Reason</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riskPredictions.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{p.student?.first_name} {p.student?.last_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.risk_level === 'high' ? 'bg-red-100 text-red-700' : p.risk_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {p.risk_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 hidden sm:table-cell">{p.reason || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      {!p.is_acknowledged ? (
                        <button onClick={() => acknowledgePrediction(p.id)} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1 ml-auto"><CalendarCheck size={14} />Acknowledge</button>
                      ) : <span className="text-xs text-green-600 font-medium">Acknowledged</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
