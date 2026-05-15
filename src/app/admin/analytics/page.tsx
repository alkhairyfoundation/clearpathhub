'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  BarChart3, TrendingUp, Users, GraduationCap, BookOpen, UserCheck,
  Award, AlertTriangle, ArrowUp, ArrowDown, Download, Search, X, User
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import SendResultButton from '@/components/SendResultButton';

const COLORS = ['#b3922f', '#063b29', '#10b981', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#f59e0b', '#ec4899'];

interface AnalyticsData {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalClasses: number;
  totalSubjects: number;
  attendanceRate: number;
  averageScore: number;
  passRate: number;
  atRiskCount: number;
  topPerformers: number;
}

export default function AdminAnalyticsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    totalStudents: 0, totalTeachers: 0, totalParents: 0,
    totalClasses: 0, totalSubjects: 0, attendanceRate: 0,
    averageScore: 0, passRate: 0, atRiskCount: 0, topPerformers: 0,
  });
  const [classPerformance, setClassPerformance] = useState<any[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<any[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentList, setStudentList] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchAnalytics();
  }, [profile]);

  async function fetchAnalytics() {
    setLoading(true);

    const [
      studentsRes, teachersRes, parentsRes,
      classesRes, subjectsRes, attendanceRes,
      resultsRes
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
      supabase.from('classes').select('id', { count: 'exact', head: true }),
      supabase.from('subjects').select('id', { count: 'exact', head: true }),
      supabase.from('attendance').select('status, date').order('date', { ascending: false }).limit(200),
      supabase.from('results').select('*, student:profiles!student_id(first_name, last_name), subject:subjects!subject_id(name), class:classes!class_id(name)').order('created_at', { ascending: false }).limit(200),
    ]);

    const scores = resultsRes.data?.map(r => r.score) || [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const passCount = scores.filter(s => s >= 50).length;
    const passRate = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;

    const presentCount = attendanceRes.data?.filter(a => a.status === 'present').length || 0;
    const totalAttendance = attendanceRes.data?.length || 0;

    setData({
      totalStudents: studentsRes.count || 0,
      totalTeachers: teachersRes.count || 0,
      totalParents: parentsRes.count || 0,
      totalClasses: classesRes.count || 0,
      totalSubjects: subjectsRes.count || 0,
      attendanceRate: totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0,
      averageScore: avgScore,
      passRate,
      atRiskCount: scores.filter(s => s < 50).length,
      topPerformers: scores.filter(s => s >= 80).length,
    });

    if (attendanceRes.data?.length) {
      const grouped: Record<string, { present: number; total: number }> = {};
      attendanceRes.data.forEach((a: any) => {
        if (!grouped[a.date]) grouped[a.date] = { present: 0, total: 0 };
        grouped[a.date].total++;
        if (a.status === 'present') grouped[a.date].present++;
      });
      const trend = Object.entries(grouped).slice(0, 14).map(([date, d]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: Math.round((d.present / d.total) * 100),
      })).reverse();
      setAttendanceTrend(trend);
    }

    if (resultsRes.data?.length) {
      const classPerf: Record<string, { scores: number[]; count: number }> = {};
      const subjectPerf: Record<string, { scores: number[]; count: number }> = {};
      const grades: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

      resultsRes.data.forEach((r: any) => {
        const cls = r.class?.name || 'Unknown';
        if (!classPerf[cls]) classPerf[cls] = { scores: [], count: 0 };
        classPerf[cls].scores.push(r.score);
        classPerf[cls].count++;

        const subj = r.subject?.name || 'Unknown';
        if (!subjectPerf[subj]) subjectPerf[subj] = { scores: [], count: 0 };
        subjectPerf[subj].scores.push(r.score);
        subjectPerf[subj].count++;

        const grade = r.score >= 80 ? 'A' : r.score >= 70 ? 'B' : r.score >= 60 ? 'C' : r.score >= 50 ? 'D' : 'F';
        grades[grade]++;
      });

      setClassPerformance(
        Object.entries(classPerf).map(([name, d]) => ({
          name, avg: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length), count: d.count,
        })).sort((a, b) => b.avg - a.avg)
      );

      setSubjectPerformance(
        Object.entries(subjectPerf).map(([name, d]) => ({
          name, avg: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length), count: d.count,
        })).sort((a, b) => b.avg - a.avg)
      );

      setGradeDistribution(Object.entries(grades).map(([name, value]) => ({ name, value })));

      setAtRiskStudents(
        resultsRes.data.filter((r: any) => r.score < 50).slice(0, 5)
      );

      setRecentResults(resultsRes.data.slice(0, 10));
    }

    setLoading(false);
  }

  const statsCards = [
    { label: 'Total Students', value: data.totalStudents, icon: <GraduationCap size={20} />, color: 'text-primary-600', bg: 'bg-primary-100' },
    { label: 'Teachers', value: data.totalTeachers, icon: <Users size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Parents', value: data.totalParents, icon: <UserCheck size={20} />, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Classes', value: data.totalClasses, icon: <BookOpen size={20} />, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Avg Score', value: `${data.averageScore}%`, icon: <BarChart3 size={20} />, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: 'Pass Rate', value: `${data.passRate}%`, icon: <Award size={20} />, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Attendance', value: `${data.attendanceRate}%`, icon: <UserCheck size={20} />, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { label: 'At Risk', value: data.atRiskCount, icon: <AlertTriangle size={20} />, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Analytics" subtitle="Comprehensive school performance insights">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics" subtitle="Comprehensive school performance insights">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
            <p className="text-slate-500 mt-1">Comprehensive school performance insights</p>
          </div>
          <button onClick={() => window.print()} className="btn-outline flex items-center gap-2">
            <Download size={18} /> Export Report
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statsCards.map((card, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <div className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center ${card.color}`}>{card.icon}</div>
              </div>
              <p className="text-xl font-bold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Class Performance</h2>
            {classPerformance.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No performance data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={classPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#b3922f" radius={[4, 4, 0, 0]} name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Subject Performance</h2>
            {subjectPerformance.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No performance data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={subjectPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} width={100} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#b3922f" radius={[0, 4, 4, 0]} name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Attendance Trend</h2>
            {attendanceTrend.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No attendance data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#b3922f" strokeWidth={2} dot={{ fill: '#b3922f', r: 3 }} name="Attendance %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Grade Distribution</h2>
            {gradeDistribution.length === 0 || gradeDistribution.every(g => g.value === 0) ? (
              <div className="text-center py-12 text-slate-400">
                <Award size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No grades yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={gradeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {gradeDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {gradeDistribution.map((g, i) => (
                    <div key={g.name} className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{g.name}: {g.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {atRiskStudents.length > 0 && (
          <div className="card border-l-4 border-red-500">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-600" size={20} />
              <h2 className="text-lg font-bold text-slate-900">Students Needing Attention</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {atRiskStudents.map((student: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-sm">
                    {student.student?.first_name?.[0] || '?'}{student.student?.last_name?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">
                      {student.student?.first_name} {student.student?.last_name}
                    </p>
                    <p className="text-xs text-slate-500">{student.subject?.name || 'Subject'}</p>
                    <p className="text-xs text-red-600 font-medium">Score: {student.score}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentResults.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Award size={18} className="text-slate-400" /> Recent Results Overview
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Student</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Subject</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Score</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Grade</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentResults.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-sm font-medium text-slate-900">{r.student?.first_name} {r.student?.last_name}</td>
                      <td className="py-2 px-3 text-sm text-slate-600">{r.subject?.name || '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`text-sm font-semibold ${r.score >= 50 ? 'text-success-600' : 'text-danger-600'}`}>{r.score}%</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.grade?.includes('A') ? 'bg-green-100 text-green-700' : r.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{r.grade || '-'}</span>
                      </td>
                      <td className="py-2 px-3 text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student Drill-Down Section */}
        <div className="card border-l-4 border-primary-500">
          <div className="flex items-center gap-2 mb-4">
            <User className="text-primary-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Individual Student Analytics</h2>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text" placeholder="Search student by name..."
              value={studentSearch}
              onChange={async (e) => {
                setStudentSearch(e.target.value);
                if (e.target.value.length >= 2) {
                  const { data } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'student').or(`first_name.ilike.%${e.target.value}%,last_name.ilike.%${e.target.value}%`).limit(10);
                  setStudentList(data || []);
                } else { setStudentList([]); }
              }}
              className="input pl-10"
            />
            {selectedStudent && (
              <button onClick={() => { setSelectedStudent(null); setStudentResults([]); setStudentAttendance([]); setStudentSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded">
                <X size={16} className="text-slate-400" />
              </button>
            )}
          </div>

          {studentList.length > 0 && !selectedStudent && (
            <div className="border border-slate-200 rounded-lg mb-4 max-h-48 overflow-y-auto">
              {studentList.map(s => (
                <button key={s.id} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-left" onClick={async () => {
                  setSelectedStudent(s); setStudentList([]); setStudentSearch(`${s.first_name} ${s.last_name}`); setStudentLoading(true);
                  const [resRes, attRes] = await Promise.all([
                    supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', s.id).order('created_at', { ascending: false }),
                    supabase.from('attendance').select('*').eq('student_id', s.id).order('date', { ascending: false }).limit(30),
                  ]);
                  setStudentResults(resRes.data || []); setStudentAttendance(attRes.data || []); setStudentLoading(false);
                }}>
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">{s.first_name?.[0]}{s.last_name?.[0]}</div>
                  <div><p className="text-sm font-medium text-slate-800">{s.first_name} {s.last_name}</p><p className="text-xs text-slate-500">{s.email}</p></div>
                </button>
              ))}
            </div>
          )}

          {selectedStudent && (
            <div className="space-y-4">
              {studentLoading ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-primary-50 p-3 rounded-lg"><p className="text-xs text-slate-500">Total Exams</p><p className="text-xl font-bold text-slate-900">{studentResults.length}</p></div>
                    <div className="bg-green-50 p-3 rounded-lg"><p className="text-xs text-slate-500">Avg Score</p><p className="text-xl font-bold text-slate-900">{studentResults.length > 0 ? Math.round(studentResults.reduce((a: number, r: any) => a + r.score, 0) / studentResults.length) : 0}%</p></div>
                    <div className="bg-amber-50 p-3 rounded-lg"><p className="text-xs text-slate-500">Attendance</p><p className="text-xl font-bold text-slate-900">{studentAttendance.length > 0 ? Math.round((studentAttendance.filter((a: any) => a.status === 'present').length / studentAttendance.length) * 100) : 0}%</p></div>
                    <div className="bg-purple-50 p-3 rounded-lg"><p className="text-xs text-slate-500">Pass Rate</p><p className="text-xl font-bold text-slate-900">{studentResults.length > 0 ? Math.round((studentResults.filter((r: any) => r.score >= 50).length / studentResults.length) * 100) : 0}%</p></div>
                  </div>

                  {studentResults.length > 0 && (
                    <>
                      <h3 className="font-semibold text-slate-800">Subject Scores</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={(() => {
                          const bySubj: Record<string, number[]> = {};
                          studentResults.forEach((r: any) => { const n = r.subject?.name || 'Other'; if (!bySubj[n]) bySubj[n] = []; bySubj[n].push(r.score); });
                          return Object.entries(bySubj).map(([name, scores]) => ({ name, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }));
                        })()}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <Tooltip />
                          <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Avg Score" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex items-center justify-between mt-4">
                        <h3 className="font-semibold text-slate-800">Recent Results</h3>
                        <SendResultButton
                          studentId={selectedStudent.id}
                          studentName={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
                          results={studentResults.map((r: any) => ({
                            subject_name: r.subject?.name || 'Unknown',
                            exam_type: r.exam_type,
                            score: r.score,
                            grade: r.grade || '',
                          }))}
                        />
                      </div>
                      <div className="overflow-x-auto"><table className="w-full"><thead className="bg-slate-50"><tr>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Subject</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Type</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Score</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Date</th>
                      </tr></thead><tbody className="divide-y divide-slate-100">
                        {studentResults.slice(0, 15).map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 text-sm">{r.subject?.name || '-'}</td>
                            <td className="py-2 px-3 text-sm text-slate-500">{r.exam_type}</td>
                            <td className="py-2 px-3"><span className={`text-sm font-semibold ${r.score >= 50 ? 'text-green-600' : 'text-red-600'}`}>{r.score}%</span></td>
                            <td className="py-2 px-3 text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody></table></div>
                    </>
                  )}

                  {studentResults.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No results found for this student.</p>}
                </>
              )}
            </div>
          )}

          {!selectedStudent && !studentSearch && <p className="text-sm text-slate-400 text-center py-4">Search for a student to view detailed analytics</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
