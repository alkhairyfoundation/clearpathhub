'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, UserCheck, Award, FileText, Calendar, Download, ChevronDown, Brain, BookOpen } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function WeeklyReportContent() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const [child, setChild] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile, authLoading, childId]);

  async function fetchData() {
    setLoading(true);
    try {
      const childrenRes = await supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)').eq('parent_id', profile?.id);
      if (childrenRes.error) throw new Error(childrenRes.error.message);
      if (childrenRes.data?.length) {
        const selectedChild = childId ? childrenRes.data.find(c => c.id === childId) : childrenRes.data[0];
        if (selectedChild) {
          setChild(selectedChild);
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);

          const testRes = await fetch('/api/manage-tests', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'list_attempts', student_id: selectedChild.profile_id, date_from: weekStart.toISOString(), date_to: weekEnd.toISOString() })
          }).then(r => r.json());
          const [attendanceRes, resultsRes, homeworkRes, behaviorRes, quizRes] = await Promise.all([
            supabase.from('attendance').select('status').eq('student_id', selectedChild.profile_id).gte('date', weekStart.toISOString().split('T')[0]).lt('date', weekEnd.toISOString().split('T')[0]),
            supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', selectedChild.profile_id).gte('created_at', weekStart.toISOString()).lt('created_at', weekEnd.toISOString()),
            supabase.from('homework_submissions').select('*, homework:homework!homework_id(title, subject:subjects!subject_id(name))').eq('student_id', selectedChild.profile_id).gte('submitted_at', weekStart.toISOString()).lt('submitted_at', weekEnd.toISOString()),
            supabase.from('behavioral_reports').select('*, teacher:profiles!entered_by(first_name, last_name)').eq('student_id', selectedChild.profile_id).gte('created_at', weekStart.toISOString()).lt('created_at', weekEnd.toISOString()),
            supabase.from('quiz_attempts').select('*, quiz:quizzes!quiz_id(title)').eq('student_id', selectedChild.profile_id).gte('completed_at', weekStart.toISOString()).lt('completed_at', weekEnd.toISOString()),
          ]);

        const totalAttendance = attendanceRes.data?.length || 0;
        const presentDays = attendanceRes.data?.filter(a => a.status === 'present').length || 0;
        const attendanceRate = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;
        const avgScore = resultsRes.data?.length ? Math.round(resultsRes.data.reduce((s: number, r: any) => s + (r.score || 0), 0) / resultsRes.data.length) : 0;

        setReport({
          weekStart: weekStart.toLocaleDateString(),
          weekEnd: weekEnd.toLocaleDateString(),
          attendance: { total: totalAttendance, present: presentDays, rate: attendanceRate },
          results: resultsRes.data || [],
          avgScore,
          homework: homeworkRes.data || [],
          behavior: behaviorRes.data || [],
          quizzes: quizRes.data || [],
          tests: testRes.attempts || [],
          positiveNotes: behaviorRes.data?.filter((b: any) => b.type === 'positive').length || 0,
          concerns: behaviorRes.data?.filter((b: any) => b.type === 'concern' || b.type === 'warning').length || 0,
        });
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function downloadPDF() {
    if (!report || !child) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Weekly Progress Report', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${child.profile?.first_name} ${child.profile?.last_name} - ${child.class?.name}`, pageWidth / 2, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Week: ${report.weekStart} to ${report.weekEnd}`, pageWidth / 2, 32, { align: 'center' });

    doc.setTextColor(30, 58, 95);
    doc.setFontSize(14);
    doc.text('Summary', 14, 45);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Attendance: ${report.attendance.rate}% (${report.attendance.present}/${report.attendance.total} days)`, 14, 55);
    doc.text(`Average Score: ${report.avgScore}%`, 14, 62);
    doc.text(`Homework Submitted: ${report.homework.length}`, 14, 69);
    doc.text(`Positive Notes: ${report.positiveNotes}`, 14, 76);
    doc.text(`Concerns: ${report.concerns}`, 14, 83);

    if (report.results.length > 0) {
      (doc as any).autoTable({
        startY: 95,
        head: [['Subject', 'Score', 'Date']],
        body: report.results.map((r: any) => [r.subject?.name || 'N/A', `${r.score}%`, new Date(r.created_at).toLocaleDateString()]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95] },
      });
    }

    doc.save(`weekly-report-${child.profile?.first_name}-${report.weekStart}.pdf`);
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div><h1 className="text-2xl font-bold text-slate-800">Weekly Report</h1><p className="text-slate-500">{child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}</p></div>
        </div>
        {report && <button onClick={downloadPDF} className="btn-outline flex items-center gap-2"><Download size={16} />Download PDF</button>}
      </div>

      {!child ? (
        <div className="bg-white rounded-xl p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
      ) : !report ? (
        <div className="bg-white rounded-xl p-12 text-center"><Calendar className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No report available for this week</p></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card"><div className="flex items-center gap-3 mb-2"><UserCheck size={20} className="text-green-600" /><span className="text-sm text-slate-500">Attendance</span></div><p className="text-2xl font-bold text-green-600">{report.attendance.rate}%</p></div>
            <div className="card"><div className="flex items-center gap-3 mb-2"><TrendingUp size={20} className="text-primary-600" /><span className="text-sm text-slate-500">Avg Score</span></div><p className="text-2xl font-bold text-primary-600">{report.avgScore}%</p></div>
            <div className="card"><div className="flex items-center gap-3 mb-2"><Brain size={20} className="text-purple-600" /><span className="text-sm text-slate-500">Quizzes/Tests</span></div><p className="text-2xl font-bold text-purple-600">{report.quizzes.length + report.tests.length}</p></div>
            <div className="card"><div className="flex items-center gap-3 mb-2"><Award size={20} className="text-amber-600" /><span className="text-sm text-slate-500">Positive</span></div><p className="text-2xl font-bold text-amber-600">{report.positiveNotes}</p></div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Week of {report.weekStart} - {report.weekEnd}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"><div className="flex items-center gap-3"><UserCheck size={20} className="text-green-600" /><div><p className="font-medium">Attendance</p><p className="text-sm text-slate-500">{report.attendance.present} out of {report.attendance.total} days</p></div></div><span className={`text-lg font-bold ${report.attendance.rate >= 80 ? 'text-green-600' : report.attendance.rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{report.attendance.rate}%</span></div>
              {report.results.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg"><h3 className="font-semibold mb-3">Results This Week</h3><div className="space-y-2">{report.results.map((r: any, i: number) => (<div key={i} className="flex items-center justify-between"><span className="text-sm">{r.subject?.name}</span><span className="font-semibold">{r.score}%</span></div>))}</div></div>
              )}
              {report.homework.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg"><h3 className="font-semibold mb-3">Homework Submitted</h3><div className="space-y-2">{report.homework.map((h: any, i: number) => (<div key={i} className="flex items-center justify-between"><span className="text-sm">{h.homework?.title}</span><span className="text-xs text-slate-500">{h.homework?.subject?.name}</span></div>))}</div></div>
              )}
              {report.quizzes.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg"><h3 className="font-semibold mb-3 flex items-center gap-2"><Brain size={16} className="text-purple-600" />Quizzes Taken</h3><div className="space-y-2">{report.quizzes.map((q: any, i: number) => (<div key={i} className="flex items-center justify-between"><span className="text-sm">{q.quiz?.title || 'Quiz'}</span><span className={`font-semibold text-sm ${q.score >= 70 ? 'text-green-600' : q.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{q.score}%</span></div>))}</div></div>
              )}
              {report.tests.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg"><h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen size={16} className="text-blue-600" />Tests Taken</h3><div className="space-y-2">{report.tests.map((t: any, i: number) => (<div key={i} className="flex items-center justify-between"><span className="text-sm">{t.test?.title || 'Test'}</span><span className={`font-semibold text-sm ${t.score >= 70 ? 'text-green-600' : t.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{t.score}%</span></div>))}</div></div>
              )}
              {report.behavior.length > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg"><h3 className="font-semibold mb-3">Behavior Notes</h3><div className="space-y-2">{report.behavior.map((b: any, i: number) => (<div key={i} className="flex items-center justify-between"><span className="text-sm">{b.title}</span><span className="text-xs text-slate-500">{b.teacher?.first_name}</span></div>))}</div></div>
              )}
              {report.results.length === 0 && report.homework.length === 0 && report.behavior.length === 0 && (
                <div className="text-center py-8 text-slate-500">No activities recorded this week</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ParentWeeklyReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>}>
      <WeeklyReportContent />
    </Suspense>
  );
}
