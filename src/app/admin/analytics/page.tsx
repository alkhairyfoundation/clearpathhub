'use client';


import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, TrendingUp, Users, GraduationCap, BookOpen, AlertTriangle, Download, ArrowUp, ArrowDown,
  Shield, Activity, Zap, CalendarCheck, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalStaff: 0, attendanceRate: 0, avgScore: 0, atRisk: 0
  });
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

    const [studentsRes, teachersRes, staffRes, attendanceRes, resultsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'accountant'),
      supabase.from('attendance').select('status, date').order('date', { ascending: false }).limit(30),
      supabase.from('results').select('score, subject_id, student_id'),
    ]);

    const presentCount = attendanceRes.data?.filter((a: { status: string }) => a.status === 'present').length || 0;
    const totalAttendance = attendanceRes.data?.length || 0;
    const avgScore = resultsRes.data?.length ? Math.round(resultsRes.data.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / resultsRes.data.length * 10) / 10 : 0;
    const atRiskCount = resultsRes.data?.filter((r: { score: number }) => r.score < 50).length || 0;

    setStats({
      totalStudents: studentsRes.count || studentsRes.data?.length || 0,
      totalTeachers: teachersRes.count || teachersRes.data?.length || 0,
      totalStaff: staffRes.count || staffRes.data?.length || 0,
      attendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
      avgScore,
      atRisk: atRiskCount
    });

    if (attendanceRes.data) {
      const grouped: Record<string, { present: number; absent: number; total: number }> = {};
      attendanceRes.data.forEach((a: { date: string; status: string }) => {
        if (!grouped[a.date]) grouped[a.date] = { present: 0, absent: 0, total: 0 };
        grouped[a.date][a.status === 'present' ? 'present' : 'absent']++;
        grouped[a.date].total++;
      });
      const chartData = Object.entries(grouped).slice(0, 14).map(([date, d]: [string, { present: number; total: number }]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        attendance: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0
      })).reverse();
      setAttendanceData(chartData);
    }

    if (resultsRes.data) {
      const subjectScores: Record<string, number[]> = {};
      resultsRes.data.forEach((r: { subject_id: string; score: number }) => {
        if (!subjectScores[r.subject_id]) subjectScores[r.subject_id] = [];
        subjectScores[r.subject_id].push(r.score);
      });
      const perfData = Object.entries(subjectScores).slice(0, 6).map(([id, scores]: [string, number[]]) => ({
        subject: 'Subject ' + id.slice(-4),
        average: Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
      }));
      setSubjectPerformance(perfData);
    }

    setClassDistribution([
      { name: 'Grade 9', value: 45 },
      { name: 'Grade 10', value: 38 },
      { name: 'Grade 11', value: 32 },
      { name: 'Grade 12', value: 28 }
    ]);

    setLoading(false);
  }

  async function fetchRiskPredictions() {
    try {
      const response = await fetch('/api/analytics?limit=10');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success) {
        setRiskPredictions(data.data);
      }
    } catch (error) {
      console.error('Error fetching risk predictions:', error);
    }
  }

  async function generatePredictions() {
    setLoadingPredictions(true);
    try {
      const response = await fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error('Failed to generate predictions');
      await fetchRiskPredictions();
    } catch (error) {
      console.error('Error generating predictions:', error);
      alert('Failed to generate predictions. Please try again.');
    } finally {
      setLoadingPredictions(false);
    }
  }

  async function acknowledgePrediction(predictionId: string) {
    try {
      const response = await fetch(`/api/analytics/predictions/${predictionId}/acknowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error('Failed to acknowledge');
      await fetchRiskPredictions();
    } catch (error) {
      console.error('Error acknowledging prediction:', error);
    }
  }

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Analytics</h1><p className="text-slate-500">Comprehensive school performance analytics</p></div>
        <button className="btn-primary flex items-center gap-2"><Download size={18} />Export Report</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Students</span><GraduationCap size={18} className="text-blue-600" /></div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalStudents}</p>
          <p className="text-xs text-green-600 flex items-center gap-1"><ArrowUp size={12} />+5%</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Teachers</span><BookOpen size={18} className="text-emerald-600" /></div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalTeachers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Staff</span><Users size={18} className="text-purple-600" /></div>
          <p className="text-2xl font-bold text-slate-800">{stats.totalStaff}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Attendance</span><TrendingUp size={18} className="text-green-600" /></div>
          <p className="text-2xl font-bold text-green-600">{stats.attendanceRate}%</p>
          <p className="text-xs text-green-600 flex items-center gap-1"><ArrowUp size={12} />+2.5%</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Avg Score</span><BarChart3 size={18} className="text-purple-600" /></div>
          <p className="text-2xl font-bold text-purple-600">{stats.avgScore}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">At Risk</span><AlertTriangle size={18} className="text-red-600" /></div>
          <p className="text-2xl font-bold text-red-600">{stats.atRisk}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Attendance Trend</h2>
          {loading ? <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Class Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={classDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {classDistribution.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Subject Performance</h2>
          {loading ? <div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="average" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-slate-600">Students with Perfect Attendance</span>
              <span className="font-bold text-green-600">12</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-slate-600">Top Performing Class</span>
              <span className="font-bold text-blue-600">Grade 11-A</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-slate-600">Most Active Subject</span>
              <span className="font-bold text-purple-600">Mathematics</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-slate-600">Average Homework Completion</span>
              <span className="font-bold text-emerald-600">87%</span>
            </div>
          </div>
        </div>
      </div>
        
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-800">Student Risk Predictions</h2>
          <div className="flex items-center gap-2">
            <button onClick={generatePredictions} className="btn-primary flex items-center gap-2">
              <Zap size={18} />Generate Predictions
            </button>
            <Link href="/admin/risk-predictions" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm">
              View All <ArrowRight size={16} />
            </Link>
          </div>
        </div>
          
        {loadingPredictions ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {riskPredictions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Student</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Risk Level</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskPredictions.map((prediction) => (
                      <tr key={prediction.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800">
                            {prediction.student?.first_name} {prediction.student?.last_name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            prediction.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                            prediction.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            prediction.risk_level === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {prediction.risk_level}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!prediction.is_acknowledged && (
                            <button onClick={() => acknowledgePrediction(prediction.id)} className="p-2 hover:bg-gray-100 rounded-lg text-blue-600">
                              <CalendarCheck size={16} />
                            </button>
                          )}
                          {prediction.is_acknowledged && <span className="text-green-600 text-xs">Viewed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Shield size={48} className="mx-auto mb-4 opacity-50" />
                <p>No risk predictions available. Generate predictions to see insights.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}