'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Download, Printer, Award, BookOpen, UserCheck,
  FileText, Calendar, CheckCircle, Loader2, TrendingUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function ReportCardContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const termId = searchParams.get('term');
  const [child, setChild] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [behaviorReports, setBehaviorReports] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchInitial();
  }, [profile]);

  useEffect(() => {
    if (child && selectedTerm) fetchReport();
  }, [child, selectedTerm]);

  async function fetchInitial() {
    setLoading(true);
    try {
      const [childrenRes, termsRes] = await Promise.all([
        supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)').eq('parent_id', profile?.id),
        supabase.from('terms').select('*, session:academic_sessions!session_id(name)').order('start_date', { ascending: false }),
      ]);
      if (childrenRes.error) throw new Error(childrenRes.error.message);
      if (termsRes.error) throw new Error(termsRes.error.message);
      setChildren(childrenRes.data || []);
      setTerms(termsRes.data || []);

      if (childrenRes.data?.length) {
        const selected = childId ? childrenRes.data.find((c: any) => c.id === childId) : childrenRes.data[0];
        setChild(selected);
      }

      if (termsRes.data?.length) {
        const selectedTermData = termId
          ? termsRes.data.find((t: any) => t.id === termId)
          : termsRes.data.find((t: any) => t.is_current) || termsRes.data[0];
        setSelectedTerm(selectedTermData);
      }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function fetchReport() {
    setLoading(true);
    if (!child || !selectedTerm) return;
    try {
      const pid = child.profile_id;
      const termName = selectedTerm.name || '';
      const startDate = (selectedTerm.start_date || '').split('T')[0];
      const endDate = (selectedTerm.end_date || '').split('T')[0];
      const endOfDay = endDate + 'T23:59:59';

      const [resR, attR, behR, hwR] = await Promise.all([
        supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', pid).eq('term', termName).order('created_at'),
        supabase.from('attendance').select('*').eq('student_id', pid).gte('date', startDate).lte('date', endDate).order('date'),
        supabase.from('behavioral_reports').select('*, teacher:profiles!entered_by(first_name, last_name)').eq('student_id', pid).gte('created_at', startDate).lte('created_at', endOfDay),
        supabase.from('homework_submissions').select('*, homework:homework!homework_id(title, subject:subjects!subject_id(name))').eq('student_id', pid).gte('submitted_at', startDate).lte('submitted_at', endOfDay),
      ]);
      setResults(resR.data || []);
      setAttendance(attR.data || []);
      setBehaviorReports(behR.data || []);
      setHomework(hwR.data || []);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  function switchChild(id: string) {
    const c = children.find(ch => ch.id === id);
    if (c) setChild(c);
  }

  function switchTerm(id: string) {
    const t = terms.find(term => term.id === id);
    if (t) setSelectedTerm(t);
  }

  const subjectGrades = results.reduce((acc: any[], r) => {
    const existing = acc.find(s => s.subjectId === r.subject_id);
    if (existing) {
      existing.scores.push(r.score);
    } else {
      acc.push({ subjectId: r.subject_id, subjectName: r.subject?.name || 'Unknown', scores: [r.score] });
    }
    return acc;
  }, []).map((s: any) => {
    const avg = Math.round(s.scores.reduce((a: number, b: number) => a + b, 0) / s.scores.length);
    const grade = avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : avg >= 50 ? 'D' : 'F';
    const gradeColor = avg >= 80 ? 'text-green-600' : avg >= 70 ? 'text-blue-600' : avg >= 60 ? 'text-yellow-600' : avg >= 50 ? 'text-orange-600' : 'text-red-600';
    return { ...s, average: avg, grade, gradeColor };
  });

  const overallAvg = subjectGrades.length ? Math.round(subjectGrades.reduce((s: number, sg: any) => s + sg.average, 0) / subjectGrades.length) : 0;
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;
  const homeworkCount = homework.length;

  const subjectRemarks = subjectGrades.map((sg: any) => {
    if (sg.average >= 80) return 'Excellent';
    if (sg.average >= 70) return 'Very Good';
    if (sg.average >= 60) return 'Good';
    if (sg.average >= 50) return 'Fair';
    return 'Needs Improvement';
  });

  function downloadPDF() {
    if (!selectedTerm || !child) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const schoolName = 'Mastery Engine';

    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(schoolName, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Report Card', pageWidth / 2, 24, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${selectedTerm.name} ${selectedTerm.session?.name || ''}`, pageWidth / 2, 32, { align: 'center' });

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.text(`Student: ${child.profile?.first_name} ${child.profile?.last_name}`, 14, 48);
    doc.text(`Class: ${child.class?.name || 'N/A'}`, 14, 55);
    doc.text(`Admission No: ${child.admission_number || 'N/A'}`, 14, 62);

    (doc as any).autoTable({
      startY: 70,
      head: [['Subject', 'Average', 'Grade', 'Remark']],
      body: subjectGrades.map((sg: any, i: number) => [sg.subjectName, `${sg.average}%`, sg.grade, subjectRemarks[i]]),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95] },
      foot: [[{ content: `Overall Average: ${overallAvg}%`, colSpan: 2, styles: { fontStyle: 'bold' } }, { content: `Attendance: ${attendanceRate}%`, colSpan: 2, styles: { fontStyle: 'bold' } }]],
      footStyles: { fillColor: [240, 240, 240] },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 95);
    doc.text('Summary', 14, finalY);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Days Present: ${presentDays}/${totalDays}`, 14, finalY + 8);
    doc.text(`Homework Submitted: ${homeworkCount}`, 14, finalY + 15);

    if (behaviorReports.length > 0) {
      doc.text('Behavior Notes:', 14, finalY + 25);
      behaviorReports.slice(0, 3).forEach((b, i) => {
        doc.setFontSize(9);
        doc.text(`- ${b.teacher_notes || b.behavior || `Rating: ${b.rating}/5`} (${b.teacher?.first_name || 'Teacher'})`, 18, finalY + 33 + i * 6);
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 285, { align: 'right' });

    doc.save(`report-card-${child.profile?.first_name}-${selectedTerm.name}.pdf`);
  }

  function handlePrint() {
    if (!child || !selectedTerm) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const name = `${child.profile?.first_name} ${child.profile?.last_name}`;
    const rows = subjectGrades.map((sg: any, i: number) =>
      `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${sg.subjectName}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:bold">${sg.average}%</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:bold">${sg.grade}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${subjectRemarks[i]}</td></tr>`
    ).join('');

    w.document.write(`<!DOCTYPE html><html><head><title>Report Card - ${name}</title><style>
      body { font-family: 'Segoe UI',Arial,sans-serif; margin:0; padding:40px; background:#f8fafc; }
      .card { max-width:800px; margin:0 auto; background:white; border-radius:16px; padding:40px; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
      h1 { color:#1e3a5f; margin:0 0 5px; font-size:24px; }
      .subtitle { color:#64748b; margin:0 0 20px; font-size:13px; }
      table { width:100%; border-collapse:collapse; margin-top:20px; }
      th { background:#1e3a5f; color:white; padding:10px; text-align:left; font-size:13px; }
      .summary { margin-top:20px; display:flex; gap:20px; }
      .summary-box { flex:1; background:#f1f5f9; border-radius:8px; padding:12px; text-align:center; }
      .summary-box .val { font-size:20px; font-weight:bold; color:#1e3a5f; }
      .summary-box .lbl { font-size:11px; color:#64748b; }
      .footer { margin-top:30px; font-size:10px; color:#94a3b8; text-align:center; }
      @media print { body { background:white; padding:10px; } .card { box-shadow:none; } }
    </style></head><body><div class="card">
      <div style="text-align:center;margin-bottom:20px"><h1>Mastery Engine</h1><p class="subtitle">Report Card — ${selectedTerm.name}</p></div>
      <div style="margin-bottom:20px"><p><strong>Student:</strong> ${name} &nbsp;|&nbsp; <strong>Class:</strong> ${child.class?.name || 'N/A'} &nbsp;|&nbsp; <strong>Admission:</strong> ${child.admission_number || 'N/A'}</p></div>
      <table><thead><tr><th>Subject</th><th>Average</th><th>Grade</th><th>Remark</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="summary"><div class="summary-box"><div class="val">${overallAvg}%</div><div class="lbl">Overall Average</div></div><div class="summary-box"><div class="val">${attendanceRate}%</div><div class="lbl">Attendance</div></div><div class="summary-box"><div class="val">${homeworkCount}</div><div class="lbl">Homework Submitted</div></div></div>
      <p class="footer">Generated on ${new Date().toLocaleDateString()}</p>
    </div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  if (loading && !child) {
    return (
      <DashboardLayout title="Report Card" subtitle="Termly academic report card">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Report Card" subtitle={child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div><h1 className="text-2xl font-bold text-slate-800">Report Card</h1><p className="text-slate-500 text-sm">Termly academic report card</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadPDF} className="btn-primary flex items-center gap-2 text-sm"><Download size={16} /> PDF</button>
            <button onClick={handlePrint} className="btn-outline flex items-center gap-2 text-sm"><Printer size={16} /> Print</button>
          </div>
        </div>

        {!child ? (
          <div className="bg-white rounded-xl p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
        ) : (
          <>
            {/* Selectors */}
            <div className="flex flex-wrap items-center gap-4">
              {children.length > 1 && (
                <select value={child.id} onChange={e => switchChild(e.target.value)} className="input py-2 text-sm w-auto">
                  {children.map(c => <option key={c.id} value={c.id}>{c.profile?.first_name} {c.profile?.last_name}</option>)}
                </select>
              )}
              <select value={selectedTerm?.id || ''} onChange={e => switchTerm(e.target.value)} className="input py-2 text-sm w-auto">
                {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.session?.name || ''}{t.is_current ? ' (Current)' : ''}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card"><div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-primary-600" /><span className="text-xs text-slate-500">Overall Average</span></div><p className={`text-2xl font-bold ${overallAvg >= 70 ? 'text-green-600' : overallAvg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{overallAvg}%</p></div>
                  <div className="card"><div className="flex items-center gap-2 mb-1"><UserCheck size={16} className="text-green-600" /><span className="text-xs text-slate-500">Attendance</span></div><p className="text-2xl font-bold text-green-600">{attendanceRate}%</p><p className="text-xs text-slate-400">{presentDays}/{totalDays} days</p></div>
                  <div className="card"><div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-amber-600" /><span className="text-xs text-slate-500">Homework</span></div><p className="text-2xl font-bold text-amber-600">{homeworkCount}</p><p className="text-xs text-slate-400">submitted</p></div>
                  <div className="card"><div className="flex items-center gap-2 mb-1"><BookOpen size={16} className="text-purple-600" /><span className="text-xs text-slate-500">Subjects</span></div><p className="text-2xl font-bold text-purple-600">{subjectGrades.length}</p><p className="text-xs text-slate-400">total</p></div>
                </div>

                {/* Report Card Table */}
                <div className="card">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Award size={18} className="text-slate-400" />
                    {selectedTerm?.name} Report
                  </h2>

                  {subjectGrades.length === 0 ? (
                    <div className="text-center py-12 text-slate-500"><Calendar size={40} className="mx-auto mb-3 opacity-50" /><p>No results found for this term</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-primary-600 text-white">
                            <th className="p-3 text-left font-medium">Subject</th>
                            <th className="p-3 text-center font-medium">Average</th>
                            <th className="p-3 text-center font-medium">Grade</th>
                            <th className="p-3 text-right font-medium">Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectGrades.map((sg: any, i: number) => (
                            <tr key={sg.subjectId} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                              <td className="p-3 font-medium text-slate-800">{sg.subjectName}</td>
                              <td className="p-3 text-center font-bold">{sg.average}%</td>
                              <td className={`p-3 text-center font-bold ${sg.gradeColor}`}>{sg.grade}</td>
                              <td className="p-3 text-right text-slate-600">{subjectRemarks[i]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Behavior Notes */}
                      {behaviorReports.length > 0 && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                          <h3 className="text-sm font-semibold text-slate-800 mb-3">Teacher Remarks & Behavior Notes</h3>
                          <div className="space-y-2">
                            {behaviorReports.map((b, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-primary-600 mt-0.5">•</span>
                                <div>
                                  <p className="text-slate-700">{b.teacher_notes || b.behavior || `Rating: ${b.rating}/5`}</p>
                                  <p className="text-xs text-slate-400">{b.teacher?.first_name} {b.teacher?.last_name} &middot; {new Date(b.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ParentReportCardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>}>
      <ReportCardContent />
    </Suspense>
  );
}
