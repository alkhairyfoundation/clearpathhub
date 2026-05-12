'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  GraduationCap, Video, ClipboardList, FileText, Award, UserCheck, Activity,
  QrCode, Bell, TrendingUp, ArrowRight, ChevronRight, Clock, Users,
  BookOpen, CheckCircle, AlertCircle, Megaphone, BarChart3, Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ classes: 0, subjects: 0, pendingHomework: 0, pendingQuizzes: 0, sessions: 0, students: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [sowCoverage, setSowCoverage] = useState<{ subject: string; totalWeeks: number; filledWeeks: number }[]>([]);
  const [classMastery, setClassMastery] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

useEffect(() => {
     if (!profile) return;
     if (profile.role !== 'teacher') { router.push('/login'); return; }
     fetchDashboard();
   }, [profile]);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const [
        subjectsRes, classesRes, homeworkRes, quizzesRes, sessionsRes, announcementsRes, resultsRes
      ] = await Promise.all([
        supabase.from('subjects').select('id, name, class_id', { count: 'exact' }).eq('teacher_id', profile?.id),
        supabase.from('classes').select('id, name, level').order('level'),
        supabase.from('homework').select('id, title, due_date, class_id', { count: 'exact' }).eq('teacher_id', profile?.id).eq('is_active', true),
        supabase.from('quizzes').select('id, title, due_date', { count: 'exact' }).eq('teacher_id', profile?.id).eq('is_active', true),
        supabase.from('sessions').select('*, class:classes!class_id(name), subject:subjects!subject_id(name)').eq('teacher_id', profile?.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('announcements').select('*, creator:profiles!created_by(first_name, last_name)').in('audience', ['all', 'teachers', 'staff']).order('created_at', { ascending: false }).limit(5),
        supabase.from('results').select('*, student:profiles!student_id(first_name, last_name), subject:subjects!subject_id(name)').limit(100)
      ]);

      if (subjectsRes.error) throw new Error(subjectsRes.error.message);
      
      const myClassIds = subjectsRes.data?.map(s => s.class_id).filter(Boolean) || [];
      const uniqueClassIds = Array.from(new Set(myClassIds));
      
      // Fetch students count
      const { count: studentCount } = await supabase.from('students').select('id', { count: 'exact', head: true }).in('class_id', uniqueClassIds);

      setStats({
        classes: uniqueClassIds.length,
        subjects: subjectsRes.count || 0,
        pendingHomework: homeworkRes.count || 0,
        pendingQuizzes: quizzesRes.count || 0,
        sessions: sessionsRes.data?.length || 0,
        students: studentCount || 0,
      });

      if (sessionsRes.data) setRecentActivity(sessionsRes.data);
      if (announcementsRes.data) setAnnouncements(announcementsRes.data);

      let classMap: Record<string, string> = {};
      if (uniqueClassIds.length > 0) {
        const { data: classData } = await supabase.from('classes').select('id, name, level').in('id', uniqueClassIds);
        if (classData) {
          setMyClasses(classData);
          classData.forEach(c => { classMap[c.id] = c.name; });
        }
      }

      // Fetch scheme of work coverage
      if (subjectsRes.data && subjectsRes.data.length > 0) {
        const { data: currentTerm } = await supabase.from('terms').select('id, name, start_date, end_date').eq('is_current', true).maybeSingle();
        if (currentTerm) {
          const coverage = await Promise.all(
            subjectsRes.data.map(async (subj) => {
              const { count } = await supabase
                .from('scheme_of_work')
                .select('id', { count: 'exact', head: true })
                .eq('term_id', currentTerm.id)
                .eq('subject_id', subj.id);
              const start = new Date(currentTerm.start_date);
              const end = new Date(currentTerm.end_date);
              const totalWeeks = Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) / 7), 1);
              return { subject: subj.name, totalWeeks, filledWeeks: count || 0 };
            })
          );
          setSowCoverage(coverage);
        }
      }

      // Fetch class mastery data
      if (uniqueClassIds.length > 0 && subjectsRes.data && subjectsRes.data.length > 0) {
        const subjectIds = subjectsRes.data.map(s => s.id);
        const { data: studentsData } = await supabase
          .from('students')
          .select('profile_id, class_id')
          .in('class_id', uniqueClassIds);
        const studentIds = studentsData?.map(s => s.profile_id) || [];
        if (studentIds.length > 0) {
          const { data: masteryData } = await supabase
            .from('mastery_scores')
            .select('*, subject:subjects!subject_id(name, code)')
            .in('student_id', studentIds)
            .in('subject_id', subjectIds);
          if (masteryData) {
            const studentClassMap = new Map(studentsData!.map(s => [s.profile_id, s.class_id]));
            const groups: Record<string, any> = {};
            for (const ms of masteryData) {
              const cId = studentClassMap.get(ms.student_id);
              if (!cId) continue;
              const key = `${cId}-${ms.subject_id}`;
              if (!groups[key]) {
                groups[key] = {
                  classId: cId,
                  className: classMap[cId] || 'Unknown',
                  subjectId: ms.subject_id,
                  subjectName: ms.subject?.name || '',
                  subjectCode: ms.subject?.code || '',
                  levels: { mastered: 0, good_progress: 0, developing: 0, needs_support: 0 },
                  scores: [],
                  studentSet: new Set<string>(),
                };
              }
              groups[key].levels[ms.level] = (groups[key].levels[ms.level] || 0) + 1;
              groups[key].scores.push(ms.mastery_score);
              groups[key].studentSet.add(ms.student_id);
            }
            setClassMastery(
              Object.values(groups).map((g: any) => {
                const total = (Object.values(g.levels) as number[]).reduce((a, b) => a + b, 0);
                return {
                  ...g,
                  totalTopics: total,
                  totalStudents: g.studentSet.size,
                  avgScore: g.scores.length > 0
                    ? Math.round(g.scores.reduce((a: number, b: number) => a + b, 0) / g.scores.length)
                    : 0,
                  studentSet: undefined,
                };
              })
            );
          }
        }
      }

      // Calculate performance data for charts
      if (resultsRes.data) {
        const distribution = ['A', 'B', 'C', 'D', 'F'].map(grade => ({
          name: grade,
          value: resultsRes.data.filter((r: any) => r.grade.startsWith(grade)).length
        }));
        setPerformanceData(distribution);
      }

    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1'];

  const quickActions = [
    { label: 'Take Attendance', href: '/teacher/attendance', icon: <UserCheck size={18} />, color: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
    { label: 'Scan Student ID', href: '/teacher/scan-id', icon: <QrCode size={18} />, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
    { label: 'Record Results', href: '/teacher/results', icon: <Award size={18} />, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { label: 'Behavior Report', href: '/teacher/behavior', icon: <Activity size={18} />, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
    { label: 'Scheme of Work', href: '/teacher/scheme-of-work', icon: <BookOpen size={18} />, color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
  ];

  return (
    <DashboardLayout title="Teacher Dashboard" subtitle={`Bismillah! Welcome back, ${profile?.first_name} ${profile?.last_name}`}>
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">{error}</div>}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'My Students', value: stats.students, icon: <Users size={24} />, href: '/teacher/students', bg: 'bg-primary-50', iconBg: 'bg-primary-600', text: 'text-primary-600' },
              { title: 'Subjects', value: stats.subjects, icon: <BookOpen size={24} />, href: '/teacher/classes', bg: 'bg-emerald-50', iconBg: 'bg-emerald-600', text: 'text-emerald-600' },
              { title: 'Video Lessons', value: stats.sessions, icon: <Video size={24} />, href: '/teacher/sessions', bg: 'bg-purple-50', iconBg: 'bg-purple-600', text: 'text-purple-600' },
              { title: 'Assignments', value: stats.pendingHomework, icon: <ClipboardList size={24} />, href: '/teacher/homework', bg: 'bg-amber-50', iconBg: 'bg-amber-600', text: 'text-amber-600' },
            ].map((card, i) => (
              <Link key={i} href={card.href} className="card hover:shadow-md cursor-pointer transition-all border-slate-100 relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${card.iconBg}`} />
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                    <span className="text-white">{card.icon}</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
                <h3 className="text-sm font-medium text-slate-500">{card.title}</h3>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 size={18} className="text-primary-600" />
                  Student Grade Distribution
                </h2>
                <Link href="/teacher/results" className="text-xs font-semibold text-primary-600 hover:underline">View All Results</Link>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400" />Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action, i) => (
                  <Link key={i} href={action.href} className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-transparent hover:border-slate-100 transition-all text-center ${action.color.split(' ').filter(c => !c.includes('hover')).join(' ')} hover:shadow-sm`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm mb-1">
                      {action.icon}
                    </div>
                    <p className="text-xs font-semibold">{action.label}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Scheme of Work Coverage */}
          {sowCoverage.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BookOpen size={18} className="text-slate-400" />Curriculum Coverage</h2>
                <Link href="/teacher/scheme-of-work" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  Edit SOW <ArrowRight size={14} />
                </Link>
              </div>
              <div className="space-y-3">
                {sowCoverage.map((item, i) => {
                  const pct = item.totalWeeks > 0 ? Math.round((item.filledWeeks / item.totalWeeks) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{item.subject}</span>
                        <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {item.filledWeeks}/{item.totalWeeks} weeks ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Class Mastery Overview */}
          {classMastery.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award size={18} className="text-slate-400" />
                  Class Mastery Overview
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="pb-3 font-semibold">Class</th>
                      <th className="pb-3 font-semibold">Subject</th>
                      <th className="pb-3 font-semibold text-center">Students</th>
                      <th className="pb-3 font-semibold text-center">Avg Score</th>
                      <th className="pb-3 font-semibold">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classMastery.map((cm, i) => {
                      const total = cm.totalTopics;
                      const levelColors: Record<string, string> = {
                        mastered: 'bg-emerald-500',
                        good_progress: 'bg-blue-500',
                        developing: 'bg-amber-500',
                        needs_support: 'bg-red-500',
                      };
                      return (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-3 pr-4">
                            <span className="font-semibold text-slate-900">{cm.className}</span>
                          </td>
                          <td className="py-3 pr-4 text-slate-700">{cm.subjectName}</td>
                          <td className="py-3 text-center text-slate-600">{cm.totalStudents}</td>
                          <td className={`py-3 text-center font-bold ${
                            cm.avgScore >= 80 ? 'text-emerald-600' : cm.avgScore >= 60 ? 'text-blue-600' : cm.avgScore >= 40 ? 'text-amber-600' : 'text-red-600'
                          }`}>{cm.avgScore}%</td>
                          <td className="py-3 min-w-[220px]">
                            <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden bg-slate-100">
                              {['mastered', 'good_progress', 'developing', 'needs_support'].map(level => {
                                const count = cm.levels[level] || 0;
                                const pct = total > 0 ? (count / total) * 100 : 0;
                                return pct > 0 ? (
                                  <div key={level} className={`${levelColors[level]} transition-all`} style={{ width: `${pct}%` }} title={`${level}: ${count}`} />
                                ) : null;
                              })}
                            </div>
                            <div className="flex gap-2 mt-1.5 text-[10px] text-slate-400">
                              {['mastered', 'good_progress', 'developing', 'needs_support'].map(level => (
                                <span key={level} className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${levelColors[level]}`} />
                                  {cm.levels[level] || 0}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {myClasses.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><GraduationCap size={18} className="text-slate-400" />My Classes</h2>
                <div className="space-y-2">
                  {myClasses.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><GraduationCap size={16} className="text-emerald-600" /></div>
                        <span className="font-semibold text-slate-900">{cls.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">Level {cls.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Bell size={18} className="text-slate-400" />Announcements</h2>
                {announcements.length > 0 && <span className="badge badge-red">{announcements.length}</span>}
              </div>
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-slate-400"><Megaphone size={32} className="mx-auto mb-2 opacity-50" /><p className="text-sm">No new announcements</p></div>
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
