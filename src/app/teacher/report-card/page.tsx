'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Download, Printer, Award, User, School, GraduationCap,
  Calendar, CheckCircle, Loader2, Save, Edit3, X, AlertCircle, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type ExamType = 'ca1' | 'ca2' | 'ca3' | 'exam';
const EXAM_LABELS: Record<string, string> = { ca1: 'CA 1', ca2: 'CA 2', ca3: 'CA 3', exam: 'Exam' };

const COGNITIVE_FIELDS = [
  { key: 'cognitive_knowledge', label: 'Knowledge' },
  { key: 'cognitive_comprehension', label: 'Comprehension' },
  { key: 'cognitive_application', label: 'Application' },
  { key: 'cognitive_analysis', label: 'Analysis' },
  { key: 'cognitive_synthesis', label: 'Synthesis' },
  { key: 'cognitive_evaluation', label: 'Evaluation' },
];

const AFFECTIVE_FIELDS = [
  { key: 'affective_punctuality', label: 'Punctuality' },
  { key: 'affective_attitude', label: 'Attitude' },
  { key: 'affective_participation', label: 'Participation' },
  { key: 'affective_teamwork', label: 'Teamwork' },
  { key: 'affective_leadership', label: 'Leadership' },
  { key: 'affective_attentiveness', label: 'Attentiveness' },
];

const PSYCHOMOTOR_FIELDS = [
  { key: 'psychomotor_handwriting', label: 'Handwriting' },
  { key: 'psychomotor_verbal_fluency', label: 'Verbal Fluency' },
  { key: 'psychomotor_sports', label: 'Sports' },
  { key: 'psychomotor_creative_arts', label: 'Creative Arts' },
  { key: 'psychomotor_practical_skills', label: 'Practical Skills' },
];

function calculateGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function computeRemark(avg: number): string {
  if (avg >= 85) return 'Excellent';
  if (avg >= 75) return 'Very Good';
  if (avg >= 65) return 'Good';
  if (avg >= 50) return 'Fair';
  return 'Needs Improvement';
}

function getGradePoint(grade: string): number {
  const gp: Record<string, number> = { 'A+': 5, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 0 };
  return gp[grade] || 0;
}

function ReportCardContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentParam = searchParams.get('student');
  const termParam = searchParams.get('term');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<any>(null);
  const [allTerms, setAllTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [subjectScores, setSubjectScores] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>({ present: 0, total: 0, rate: 0 });
  const [reportRemarks, setReportRemarks] = useState<any>({ teacher_remarks: '', principal_remarks: '', next_term_begins: '' });
  const [domainGrades, setDomainGrades] = useState<Record<string, number>>({});

  // Results from Term 1 + Term 2 for cumulative view (3rd term)
  const [term1Results, setTerm1Results] = useState<any[]>([]);
  const [term2Results, setTerm2Results] = useState<any[]>([]);
  const [showDomainEditor, setShowDomainEditor] = useState(false);
  const [showRemarksEditor, setShowRemarksEditor] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchInitial();
  }, [profile]);

  useEffect(() => {
    if (selectedStudent && selectedTerm) fetchReportData();
  }, [selectedStudent, selectedTerm]);

  async function fetchInitial() {
    setLoading(true);
    try {
      const [settingsRes, termsRes, studentRes] = await Promise.all([
        supabase.from('school_settings').select('*').limit(1).maybeSingle(),
        supabase.from('terms').select('*, session:academic_sessions!session_id(name)').order('start_date', { ascending: false }),
        supabase.from('students')
          .select('id, profile_id, admission_number, profile:profiles!profile_id(first_name, last_name, avatar_url), class:classes!class_id(name)')
          .in('class_id', (await supabase.from('subjects').select('class_id').eq('teacher_id', profile?.id)).data?.map(s => s.class_id).filter(Boolean) || ['none']),
      ]);
      setSchoolSettings(settingsRes.data);
      setTerms(termsRes.data || []);
      setAllTerms(termsRes.data || []);
      setSelectedTerm(termParam ? (termsRes.data || []).find((t: any) => t.id === termParam) : (termsRes.data || []).find((t: any) => t.is_current) || (termsRes.data || [])[0]);

      const studentsData = (studentRes.data || []).map((s: any) => ({ ...s, name: `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.trim() }));
      setStudents(studentsData);
      setSelectedStudent(studentParam ? studentsData.find((s: any) => s.profile_id === studentParam) : studentsData[0]);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function fetchReportData() {
    if (!selectedStudent || !selectedTerm) return;
    setLoading(true);
    try {
      const pid = selectedStudent.profile_id;
      const termName = selectedTerm.name;
      const sessionName = selectedTerm.session?.name || '';
      const termStart = selectedTerm.start_date;
      const termEnd = selectedTerm.end_date;

      const [resultsRes, remarksRes, domainRes, attRes] = await Promise.all([
        supabase.from('results')
          .select('*, subject:subjects!subject_id(name)')
          .eq('student_id', pid)
          .eq('term', termName)
          .eq('academic_year', sessionName)
          .order('created_at'),
        supabase.from('report_remarks').select('*').eq('student_id', pid).eq('term_id', selectedTerm.id).maybeSingle(),
        supabase.from('domain_grades').select('*').eq('student_id', pid).eq('term_id', selectedTerm.id).maybeSingle(),
        supabase.from('attendance').select('*').eq('student_id', pid).gte('date', termStart).lte('date', termEnd),
      ]);

      // Group results by subject
      const subjectMap: Record<string, any> = {};
      (resultsRes.data || []).forEach((r: any) => {
        const sid = r.subject_id;
        if (!subjectMap[sid]) subjectMap[sid] = { subject_id: sid, subject_name: r.subject?.name || 'Unknown', ca1: null, ca2: null, ca3: null, exam: null };
        subjectMap[sid][r.exam_type] = { score: r.score, grade: r.grade || calculateGrade(r.score), result_id: r.id };
      });
      setSubjectScores(Object.values(subjectMap));

      // Remarks
      if (remarksRes.data) setReportRemarks(remarksRes.data);
      else setReportRemarks({ teacher_remarks: '', principal_remarks: '', next_term_begins: '' });

      // Domain
      if (domainRes.data) {
        const domData: Record<string, number> = {};
        [...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].forEach(f => {
          if (domainRes.data[f.key] != null) domData[f.key] = domainRes.data[f.key];
        });
        setDomainGrades(domData);
      } else {
        setDomainGrades({});
      }

      // Attendance
      const total = attRes.data?.length || 0;
      const present = attRes.data?.filter((a: any) => a.status === 'present').length || 0;
      setAttendanceData({ total, present, rate: total > 0 ? Math.round((present / total) * 100) : 0 });

      // For 3rd term, fetch Term 1 + Term 2 results
      if (selectedTerm.name?.toLowerCase().includes('third')) {
        const sorted = [...allTerms].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        const t1 = sorted[0];
        const t2 = sorted[1];
        const [t1Res, t2Res] = await Promise.all([
          supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', pid).eq('term', t1?.name).eq('academic_year', sessionName),
          supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', pid).eq('term', t2?.name).eq('academic_year', sessionName),
        ]);
        setTerm1Results(t1Res.data || []);
        setTerm2Results(t2Res.data || []);
      } else {
        setTerm1Results([]);
        setTerm2Results([]);
      }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  async function saveRemarks() {
    if (!selectedStudent || !selectedTerm) return;
    setSaving(true); setError('');
    try {
      const payload = { student_id: selectedStudent.profile_id, term_id: selectedTerm.id, ...reportRemarks };
      const { error: err } = await supabase.from('report_remarks').upsert(payload, { onConflict: 'student_id,term_id' });
      if (err) throw new Error(err.message);
      setSuccess('Remarks saved');
      setShowRemarksEditor(false);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function saveDomainGrades() {
    if (!selectedStudent || !selectedTerm) return;
    setSaving(true); setError('');
    try {
      const payload: any = { student_id: selectedStudent.profile_id, term_id: selectedTerm.id };
      [...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].forEach(f => {
        if (domainGrades[f.key] != null) payload[f.key] = domainGrades[f.key];
      });
      const { error: err } = await supabase.from('domain_grades').upsert(payload, { onConflict: 'student_id,term_id' });
      if (err) throw new Error(err.message);
      setSuccess('Domain grades saved');
      setShowDomainEditor(false);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  function getSubjectCA(subjectScores: any[], subjectId: string, examType: string) {
    const sub = subjectScores.find((s: any) => s.subject_id === subjectId);
    return sub?.[examType] || null;
  }

  // Build cumulative score table for 3rd term
  function getCumulativeSubjects() {
    const allSubjectIds = new Set<string>();
    const allSubjects: any[] = [];
    const allData = [...subjectScores];

    // Merge term 1 and term 2 results
    [...term1Results, ...term2Results].forEach((r: any) => {
      if (!allSubjectIds.has(r.subject_id)) {
        allSubjectIds.add(r.subject_id);
        allSubjects.push({
          subject_id: r.subject_id,
          subject_name: r.subject?.name || 'Unknown',
          ca1: null, ca2: null, ca3: null, exam: null,
          term1_ca: null, term1_exam: null, term2_ca: null, term2_exam: null,
        });
      }
    });
    subjectScores.forEach((s: any) => {
      if (!allSubjectIds.has(s.subject_id)) {
        allSubjectIds.add(s.subject_id);
        allSubjects.push({ ...s, term1_ca: null, term1_exam: null, term2_ca: null, term2_exam: null });
      }
    });

    return allSubjects.map((sub: any) => {
      // Term 1 scores
      const t1Results = term1Results.filter((r: any) => r.subject_id === sub.subject_id);
      const t1CA = t1Results.filter(r => r.exam_type !== 'exam').reduce((sum, r) => sum + r.score, 0);
      const t1CAcount = t1Results.filter(r => r.exam_type !== 'exam').length;
      const t1Exam = t1Results.find(r => r.exam_type === 'exam');
      const t1Avg = t1CAcount + (t1Exam ? 1 : 0) > 0 ? Math.round((t1CA + (t1Exam?.score || 0)) / (t1CAcount + (t1Exam ? 1 : 0))) : null;

      // Term 2 scores
      const t2Results = term2Results.filter((r: any) => r.subject_id === sub.subject_id);
      const t2CA = t2Results.filter(r => r.exam_type !== 'exam').reduce((sum, r) => sum + r.score, 0);
      const t2CAcount = t2Results.filter(r => r.exam_type !== 'exam').length;
      const t2Exam = t2Results.find(r => r.exam_type === 'exam');
      const t2Avg = t2CAcount + (t2Exam ? 1 : 0) > 0 ? Math.round((t2CA + (t2Exam?.score || 0)) / (t2CAcount + (t2Exam ? 1 : 0))) : null;

      // Term 3 scores (current)
      const current = subjectScores.find((s: any) => s.subject_id === sub.subject_id);
      const t3Scores = [current?.ca1?.score, current?.ca2?.score, current?.ca3?.score, current?.exam?.score].filter((s: any) => s != null) as number[];
      const t3Avg = t3Scores.length > 0 ? Math.round(t3Scores.reduce((a, b) => a + b, 0) / t3Scores.length) : null;

      // Cumulative
      const allAvgs = [t1Avg, t2Avg, t3Avg].filter(a => a != null) as number[];
      const cumulativeAvg = allAvgs.length > 0 ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) : null;

      return {
        subject_name: sub.subject_name,
        term1_avg: t1Avg,
        term2_avg: t2Avg,
        term3_avg: t3Avg,
        cumulative_avg: cumulativeAvg,
        term3_ca1: current?.ca1,
        term3_ca2: current?.ca2,
        term3_ca3: current?.ca3,
        term3_exam: current?.exam,
      };
    });
  }

  // Calculate totals
  function calcTotals() {
    const avgs = subjectScores.map(s => {
      const scores = [s.ca1?.score, s.ca2?.score, s.ca3?.score, s.exam?.score].filter((x: any) => x != null) as number[];
      return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    }).filter(a => a != null) as number[];

    const totalAvg = avgs.length > 0 ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : 0;
    const totalGrade = calculateGrade(totalAvg);
    return { totalAvg, totalGrade, remark: computeRemark(totalAvg), subjectCount: subjectScores.length };
  }

  async function downloadPDF() {
    if (!selectedStudent || !selectedTerm) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const schoolName = schoolSettings?.school_name || 'Mastery Engine';
    const totals = calcTotals();
    const isThirdTerm = selectedTerm.name?.toLowerCase().includes('third');
    const cumulative = isThirdTerm ? getCumulativeSubjects() : [];

    // School Header
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(schoolName, pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(10);
    if (schoolSettings?.school_address) doc.text(schoolSettings.school_address, pageWidth / 2, 22, { align: 'center' });
    if (schoolSettings?.school_motto) doc.text(`"${schoolSettings.school_motto}"`, pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(12);
    doc.text('OFFICIAL REPORT CARD', pageWidth / 2, 35, { align: 'center' });

    // Student Info
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    doc.text(`Student: ${selectedStudent.name}`, 14, 50);
    doc.text(`Class: ${selectedStudent.class?.name || 'N/A'}`, 14, 57);
    doc.text(`Admission No: ${selectedStudent.admission_number || 'N/A'}`, 14, 64);
    doc.text(`Term: ${selectedTerm.name} (${selectedTerm.session?.name || ''})`, 14, 71);
    doc.text(`Attendance: ${attendanceData.present}/${attendanceData.total} days (${attendanceData.rate}%)`, 14, 78);

    if (!isThirdTerm) {
      // Standard Single-Term Report
      (doc as any).autoTable({
        startY: 86,
        head: [['Subject', 'CA 1', 'CA 2', 'CA 3', 'Exam', 'Total', 'Grade', 'Remark']],
        body: subjectScores.map(s => {
          const scores = [s.ca1?.score, s.ca2?.score, s.ca3?.score, s.exam?.score].filter((x: any) => x != null) as number[];
          const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
          return [
            s.subject_name,
            s.ca1?.score ?? '-', s.ca2?.score ?? '-', s.ca3?.score ?? '-', s.exam?.score ?? '-',
            scores.length > 0 ? `${avg}%` : '-',
            calculateGrade(avg),
            computeRemark(avg),
          ];
        }),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95] },
        foot: [[{
          content: `Overall Average: ${totals.totalAvg}% (${totals.totalGrade}) — ${totals.remark}`,
          colSpan: 8,
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
        }]],
        footStyles: { fillColor: [240, 240, 240] },
      });
    } else {
      // Cumulative 3-Term Report
      (doc as any).autoTable({
        startY: 86,
        head: [['Subject', 'Term 1', 'Term 2', 'Term 3', 'Cumulative', 'Grade', 'Remark']],
        body: cumulative.map(c => ({
          content: [
            c.subject_name,
            c.term1_avg != null ? `${c.term1_avg}%` : '-',
            c.term2_avg != null ? `${c.term2_avg}%` : '-',
            c.term3_avg != null ? `${c.term3_avg}%` : '-',
            c.cumulative_avg != null ? `${c.cumulative_avg}%` : '-',
            c.cumulative_avg != null ? calculateGrade(c.cumulative_avg) : '-',
            c.cumulative_avg != null ? computeRemark(c.cumulative_avg) : '-',
          ],
          styles: c.cumulative_avg != null && c.cumulative_avg < 50 ? { textColor: [220, 38, 38] } : {},
        })),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95] },
        foot: [[{ content: `Cumulative Average: ${totals.totalAvg}% (${totals.totalGrade}) — ${totals.remark}`, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]],
        footStyles: { fillColor: [240, 240, 240] },
      });
    }

    // Domain Grades section
    const domainKeys = Object.keys(domainGrades);
    if (domainKeys.length > 0) {
      const domainY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 95);
      doc.text('Domain Assessment', 14, domainY);
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      const domainData: any[] = [
        ...COGNITIVE_FIELDS.filter(f => domainGrades[f.key] != null).map(f => ['Cognitive', f.label, `${domainGrades[f.key]}/5`]),
        ...AFFECTIVE_FIELDS.filter(f => domainGrades[f.key] != null).map(f => ['Affective', f.label, `${domainGrades[f.key]}/5`]),
        ...PSYCHOMOTOR_FIELDS.filter(f => domainGrades[f.key] != null).map(f => ['Psychomotor', f.label, `${domainGrades[f.key]}/5`]),
      ];
      if (domainData.length > 0) {
        (doc as any).autoTable({
          startY: domainY + 5,
          head: [['Domain', 'Trait', 'Rating']],
          body: domainData,
          theme: 'striped',
          headStyles: { fillColor: [100, 100, 100] },
        });
      }
    }

    // Remarks
    const remarksY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 86;
    let splitTextHeight = 0;
    if (reportRemarks.teacher_remarks) {
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 95);
      doc.text("Teacher's Remark", 14, remarksY);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const split = doc.splitTextToSize(reportRemarks.teacher_remarks, pageWidth - 28);
      doc.text(split, 14, remarksY + 7);
      splitTextHeight = split.length * 5;
    }
    if (reportRemarks.principal_remarks) {
      const py = (doc as any).lastAutoTable?.finalY || remarksY + 10 + splitTextHeight;
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 95);
      doc.text("Principal's Remark", 14, py);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const split2 = doc.splitTextToSize(reportRemarks.principal_remarks, pageWidth - 28);
      doc.text(split2, 14, py + 7);
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | ClearPath Edu Hub`, pageWidth / 2, 285, { align: 'center' });

    doc.save(`report-card-${selectedStudent.name.replace(/\s+/g, '-')}-${selectedTerm.name}.pdf`);
  }

  function handlePrint() {
    if (!selectedStudent || !selectedTerm) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const totals = calcTotals();
    const isThirdTerm = selectedTerm.name?.toLowerCase().includes('third');
    const cumulative = isThirdTerm ? getCumulativeSubjects() : [];

    let scoreRows = '';
    if (isThirdTerm) {
      cumulative.forEach((c: any) => {
        scoreRows += `<tr${c.cumulative_avg != null && c.cumulative_avg < 50 ? ' style="color:#dc2626"' : ''}><td>${c.subject_name}</td><td>${c.term1_avg != null ? c.term1_avg + '%' : '-'}</td><td>${c.term2_avg != null ? c.term2_avg + '%' : '-'}</td><td>${c.term3_avg != null ? c.term3_avg + '%' : '-'}</td><td style="font-weight:bold">${c.cumulative_avg != null ? c.cumulative_avg + '%' : '-'}</td><td>${c.cumulative_avg != null ? calculateGrade(c.cumulative_avg) : '-'}</td><td>${c.cumulative_avg != null ? computeRemark(c.cumulative_avg) : '-'}</td></tr>`;
      });
    } else {
      subjectScores.forEach((s: any) => {
        const scores = [s.ca1?.score, s.ca2?.score, s.ca3?.score, s.exam?.score].filter((x: any) => x != null) as number[];
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        scoreRows += `<tr><td>${s.subject_name}</td><td>${s.ca1?.score ?? '-'}</td><td>${s.ca2?.score ?? '-'}</td><td>${s.ca3?.score ?? '-'}</td><td>${s.exam?.score ?? '-'}</td><td style="font-weight:bold">${scores.length > 0 ? avg + '%' : '-'}</td><td>${calculateGrade(avg)}</td><td>${computeRemark(avg)}</td></tr>`;
      });
    }

    const domainRows = Object.keys(domainGrades).length > 0 ? `
      <h3 style="color:#1e3a5f;margin-top:20px;font-size:14px">Domain Assessment</h3>
      <table><thead><tr><th>Domain</th><th>Trait</th><th>Rating</th></tr></thead><tbody>
        ${[...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].filter(f => domainGrades[f.key] != null).map(f => {
          const domain = COGNITIVE_FIELDS.includes(f) ? 'Cognitive' : AFFECTIVE_FIELDS.includes(f) ? 'Affective' : 'Psychomotor';
          return `<tr><td>${domain}</td><td>${f.label}</td><td>${domainGrades[f.key]}/5</td></tr>`;
        }).join('')}
      </tbody></table>` : '';

    w.document.write(`<!DOCTYPE html><html><head><title>Report Card - ${selectedStudent.name}</title><style>
      body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:40px;background:#f8fafc;color:#333}
      .card{max-width:850px;margin:0 auto;background:white;border-radius:16px;padding:40px;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
      .header{text-align:center;background:#1e3a5f;color:white;margin:-40px -40px 20px;padding:30px;border-radius:16px 16px 0 0}
      .header h1{margin:0;font-size:22px}.header p{margin:3px 0;font-size:11px;opacity:0.9}
      table{width:100%;border-collapse:collapse;margin-top:15px;font-size:12px}
      th{background:#1e3a5f;color:white;padding:8px;text-align:left;font-size:11px}
      td{padding:8px;border-bottom:1px solid #e2e8f0;text-align:center}
      td:first-child{text-align:left;font-weight:600}
      .summary{display:flex;gap:15px;margin-top:20px}
      .summary-box{flex:1;background:#f1f5f9;border-radius:8px;padding:12px;text-align:center}
      .summary-box .val{font-size:22px;font-weight:bold;color:#1e3a5f}
      .summary-box .lbl{font-size:10px;color:#64748b;margin-top:2px}
      .remarks{margin-top:20px;padding:15px;background:#f1f5f9;border-radius:8px;font-size:12px}
      .remarks strong{color:#1e3a5f}
      .footer{margin-top:25px;font-size:9px;color:#94a3b8;text-align:center}
      @media print{body{background:white;padding:10px}.card{box-shadow:none}}
    </style></head><body><div class="card">
      <div class="header"><h1>${schoolSettings?.school_name || 'Mastery Engine'}</h1>
        ${schoolSettings?.school_address ? `<p>${schoolSettings.school_address}</p>` : ''}
        ${schoolSettings?.school_motto ? `<p>"${schoolSettings.school_motto}"</p>` : ''}
        <p style="font-size:14px;font-weight:bold;margin-top:5px">OFFICIAL REPORT CARD</p>
      </div>
      <div style="font-size:12px;margin-bottom:15px">
        <strong>Student:</strong> ${selectedStudent.name} &nbsp;|&nbsp; <strong>Class:</strong> ${selectedStudent.class?.name || 'N/A'} &nbsp;|&nbsp;
        <strong>Admission:</strong> ${selectedStudent.admission_number || 'N/A'} &nbsp;|&nbsp;
        <strong>Term:</strong> ${selectedTerm.name} (${selectedTerm.session?.name || ''}) &nbsp;|&nbsp;
        <strong>Attendance:</strong> ${attendanceData.present}/${attendanceData.total} days (${attendanceData.rate}%)
      </div>
      <table><thead><tr>${isThirdTerm ? '<th>Subject</th><th>Term 1</th><th>Term 2</th><th>Term 3</th><th>Cumulative</th><th>Grade</th><th>Remark</th>' : '<th>Subject</th><th>CA 1</th><th>CA 2</th><th>CA 3</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th>'}</tr></thead><tbody>${scoreRows}</tbody></table>
      <div class="summary">
        <div class="summary-box"><div class="val">${totals.totalAvg}%</div><div class="lbl">Overall Average</div></div>
        <div class="summary-box"><div class="val">${totals.totalGrade}</div><div class="lbl">Grade</div></div>
        <div class="summary-box"><div class="val">${totals.remark}</div><div class="lbl">Rating</div></div>
      </div>
      ${domainRows}
      ${reportRemarks.teacher_remarks ? `<div class="remarks"><strong>Teacher's Remark:</strong><br>${reportRemarks.teacher_remarks}</div>` : ''}
      ${reportRemarks.principal_remarks ? `<div class="remarks"><strong>Principal's Remark:</strong><br>${reportRemarks.principal_remarks}</div>` : ''}
      <p class="footer">Generated on ${new Date().toLocaleDateString()} | ClearPath Edu Hub</p>
    </div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  const totals = calcTotals();
  const isThirdTerm = selectedTerm?.name?.toLowerCase().includes('third');
  const cumulative = isThirdTerm ? getCumulativeSubjects() : [];

  if (loading && !selectedStudent) {
    return (<DashboardLayout title="Report Card" subtitle="Generate official student report cards"><div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div></DashboardLayout>);
  }

  return (
    <DashboardLayout title="Report Card" subtitle={selectedStudent?.name || ''}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div><h1 className="text-2xl font-bold text-slate-800">Official Report Card</h1><p className="text-slate-500 text-sm">Generate and download comprehensive student report cards</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadPDF} className="btn-primary flex items-center gap-2 text-sm"><Download size={16} /> PDF</button>
            <button onClick={handlePrint} className="btn-outline flex items-center gap-2 text-sm"><Printer size={16} /> Print</button>
          </div>
        </div>

        {/* Error + Success */}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Student</label>
            <select value={selectedStudent?.profile_id || ''} onChange={e => setSelectedStudent(students.find(s => s.profile_id === e.target.value) || null)} className="input py-1.5 text-sm w-auto min-w-[200px]">
              {students.map(s => <option key={s.profile_id} value={s.profile_id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Term</label>
            <select value={selectedTerm?.id || ''} onChange={e => setSelectedTerm(terms.find(t => t.id === e.target.value) || null)} className="input py-1.5 text-sm w-auto min-w-[180px]">
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.session?.name || ''}{t.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
        ) : !selectedStudent ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-500"><User size={48} className="mx-auto mb-4 opacity-30" /><p>No student selected</p></div>
        ) : (
          <>
            {/* School & Student Info Card */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"><School size={28} /></div>
                <div><h2 className="text-xl font-bold">{schoolSettings?.school_name || 'Mastery Engine'}</h2>
                  {schoolSettings?.school_address && <p className="text-sm text-primary-200">{schoolSettings.school_address}</p>}
                  {schoolSettings?.school_motto && <p className="text-xs text-primary-300 italic mt-0.5">"{schoolSettings.school_motto}"</p>}</div>
              </div>
              <div className="border-t border-white/20 pt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-2"><User size={14} /><span><strong>{selectedStudent.name}</strong></span></div>
                <div className="flex items-center gap-2"><GraduationCap size={14} /><span>{selectedStudent.class?.name || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Award size={14} /><span>Adm: {selectedStudent.admission_number || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Calendar size={14} /><span>{selectedTerm?.name} ({selectedTerm?.session?.name || ''})</span></div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card"><p className="text-xs text-slate-500">Overall Average</p><p className={`text-2xl font-bold ${totals.totalAvg >= 70 ? 'text-green-600' : totals.totalAvg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{totals.totalAvg}%</p></div>
              <div className="card"><p className="text-xs text-slate-500">Grade</p><p className="text-2xl font-bold text-slate-800">{totals.totalGrade}</p></div>
              <div className="card"><p className="text-xs text-slate-500">Remark</p><p className="text-lg font-bold text-primary-600">{totals.remark}</p></div>
              <div className="card"><p className="text-xs text-slate-500">Attendance</p><p className="text-2xl font-bold text-green-600">{attendanceData.rate}%</p><p className="text-xs text-slate-400">{attendanceData.present}/{attendanceData.total} days</p></div>
            </div>

            {/* Scores Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Award size={16} />Score Sheet</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowRemarksEditor(!showRemarksEditor)} className="text-xs btn-ghost flex items-center gap-1 px-2 py-1"><Edit3 size={12} /> Remarks</button>
                  <button onClick={() => setShowDomainEditor(!showDomainEditor)} className="text-xs btn-ghost flex items-center gap-1 px-2 py-1"><Edit3 size={12} /> Domain</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                {isThirdTerm ? (
                  /* Cumulative 3-Term Table */
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-100"><th className="p-3 text-left font-semibold text-slate-600">Subject</th><th className="p-3 text-center font-semibold text-slate-600">Term 1</th><th className="p-3 text-center font-semibold text-slate-600">Term 2</th><th className="p-3 text-center font-semibold text-slate-600">Term 3</th><th className="p-3 text-center font-semibold text-slate-600">Cumulative</th><th className="p-3 text-center font-semibold text-slate-600">Grade</th><th className="p-3 text-center font-semibold text-slate-600">Remark</th></tr></thead>
                    <tbody>{cumulative.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-slate-400">No scores</td></tr> : cumulative.map((c: any, i: number) => (
                      <tr key={i} className={`border-t border-slate-100 ${c.cumulative_avg != null && c.cumulative_avg < 50 ? 'bg-red-50' : ''}`}>
                        <td className="p-3 font-medium text-slate-800">{c.subject_name}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{c.term1_avg != null ? `${c.term1_avg}%` : '-'}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{c.term2_avg != null ? `${c.term2_avg}%` : '-'}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{c.term3_avg != null ? `${c.term3_avg}%` : '-'}</td>
                        <td className={`p-3 text-center font-bold ${c.cumulative_avg != null ? (c.cumulative_avg >= 70 ? 'text-green-600' : c.cumulative_avg >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-300'}`}>{c.cumulative_avg != null ? `${c.cumulative_avg}%` : '-'}</td>
                        <td className={`p-3 text-center font-bold ${c.cumulative_avg != null ? (c.cumulative_avg >= 70 ? 'text-green-600' : c.cumulative_avg >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-300'}`}>{c.cumulative_avg != null ? calculateGrade(c.cumulative_avg) : '-'}</td>
                        <td className="p-3 text-center text-slate-600">{c.cumulative_avg != null ? computeRemark(c.cumulative_avg) : '-'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                ) : (
                  /* Standard Single-Term Table */
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-100"><th className="p-3 text-left font-semibold text-slate-600">Subject</th><th className="p-3 text-center font-semibold text-slate-600">CA 1</th><th className="p-3 text-center font-semibold text-slate-600">CA 2</th><th className="p-3 text-center font-semibold text-slate-600">CA 3</th><th className="p-3 text-center font-semibold text-slate-600">Exam</th><th className="p-3 text-center font-semibold text-slate-600">Total</th><th className="p-3 text-center font-semibold text-slate-600">Grade</th><th className="p-3 text-center font-semibold text-slate-600">Remark</th></tr></thead>
                    <tbody>{subjectScores.length === 0 ? <tr><td colSpan={8} className="p-6 text-center text-slate-400">No scores entered yet</td></tr> : subjectScores.map((s: any, i: number) => {
                      const scores = [s.ca1?.score, s.ca2?.score, s.ca3?.score, s.exam?.score].filter((x: any) => x != null) as number[];
                      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                      return (
                        <tr key={i} className={`border-t border-slate-100 ${avg > 0 && avg < 50 ? 'bg-red-50' : ''}`}>
                          <td className="p-3 font-medium text-slate-800">{s.subject_name}</td>
                          <td className="p-3 text-center font-bold">{s.ca1?.score ?? '-'}</td>
                          <td className="p-3 text-center font-bold">{s.ca2?.score ?? '-'}</td>
                          <td className="p-3 text-center font-bold">{s.ca3?.score ?? '-'}</td>
                          <td className="p-3 text-center font-bold">{s.exam?.score ?? '-'}</td>
                          <td className={`p-3 text-center font-bold ${scores.length > 0 ? (avg >= 70 ? 'text-green-600' : avg >= 50 ? 'text-amber-600' : 'text-red-600') : 'text-slate-300'}`}>{scores.length > 0 ? `${avg}%` : '-'}</td>
                          <td className="p-3 text-center font-bold text-slate-600">{scores.length > 0 ? calculateGrade(avg) : '-'}</td>
                          <td className="p-3 text-center text-slate-600">{scores.length > 0 ? computeRemark(avg) : '-'}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                )}
              </div>
              <div className="p-3 border-t bg-slate-50 text-xs text-slate-400 flex justify-between">
                <span>{totals.subjectCount} subject(s)</span>
                <span>Overall: {totals.totalAvg}% ({totals.totalGrade})</span>
              </div>
            </div>

            {/* Remarks Editor */}
            {showRemarksEditor && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 text-sm">Remarks</h3><button onClick={() => setShowRemarksEditor(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button></div>
                <div><label className="label">Teacher's Remark</label><textarea value={reportRemarks.teacher_remarks || ''} onChange={e => setReportRemarks({ ...reportRemarks, teacher_remarks: e.target.value })} className="input" rows={3} placeholder="Enter teacher's comment..." /></div>
                <div><label className="label">Principal's Remark</label><textarea value={reportRemarks.principal_remarks || ''} onChange={e => setReportRemarks({ ...reportRemarks, principal_remarks: e.target.value })} className="input" rows={3} placeholder="Enter principal's comment..." /></div>
                <div><label className="label">Next Term Begins</label><input type="date" value={reportRemarks.next_term_begins || ''} onChange={e => setReportRemarks({ ...reportRemarks, next_term_begins: e.target.value })} className="input" /></div>
                <button onClick={saveRemarks} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Remarks
                </button>
              </div>
            )}

            {/* Domain Grades Editor */}
            {showDomainEditor && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-5">
                <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 text-sm">Domain Assessment (1-5)</h3><button onClick={() => setShowDomainEditor(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button></div>
                {[
                  { title: 'Cognitive Domain', fields: COGNITIVE_FIELDS, color: 'bg-blue-50 border-blue-200' },
                  { title: 'Affective Domain', fields: AFFECTIVE_FIELDS, color: 'bg-green-50 border-green-200' },
                  { title: 'Psychomotor Domain', fields: PSYCHOMOTOR_FIELDS, color: 'bg-purple-50 border-purple-200' },
                ].map(group => (
                  <div key={group.title} className={`p-4 rounded-lg border ${group.color}`}>
                    <h4 className="font-semibold text-slate-700 text-sm mb-3">{group.title}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {group.fields.map(f => (
                        <div key={f.key}>
                          <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button key={star} type="button" onClick={() => setDomainGrades({ ...domainGrades, [f.key]: star })}
                                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${(domainGrades[f.key] || 0) >= star ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{star}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={saveDomainGrades} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Domain Grades
                </button>
              </div>
            )}

            {/* Saved Remarks Display */}
            {!showRemarksEditor && (reportRemarks.teacher_remarks || reportRemarks.principal_remarks) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportRemarks.teacher_remarks && (
                  <div className="card"><h3 className="text-sm font-bold text-slate-800 mb-2">Teacher's Remark</h3><p className="text-sm text-slate-600 italic">"{reportRemarks.teacher_remarks}"</p></div>
                )}
                {reportRemarks.principal_remarks && (
                  <div className="card"><h3 className="text-sm font-bold text-slate-800 mb-2">Principal's Remark</h3><p className="text-sm text-slate-600 italic">"{reportRemarks.principal_remarks}"</p></div>
                )}
              </div>
            )}

            {/* Domain Grades Display */}
            {!showDomainEditor && Object.keys(domainGrades).length > 0 && (
              <div className="card">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Domain Assessment</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: 'Cognitive', fields: COGNITIVE_FIELDS, color: 'text-blue-600' },
                    { title: 'Affective', fields: AFFECTIVE_FIELDS, color: 'text-green-600' },
                    { title: 'Psychomotor', fields: PSYCHOMOTOR_FIELDS, color: 'text-purple-600' },
                  ].map(group => {
                    const entries = group.fields.filter(f => domainGrades[f.key] != null);
                    if (entries.length === 0) return null;
                    return (
                      <div key={group.title}>
                        <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${group.color}`}>{group.title}</h4>
                        <div className="space-y-1">{entries.map(f => (
                          <div key={f.key} className="flex justify-between text-sm"><span className="text-slate-600">{f.label}</span><span className="font-bold text-slate-800">{domainGrades[f.key]}/5</span></div>
                        ))}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function TeacherReportCardPage() {
  return (<Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>}><ReportCardContent /></Suspense>);
}
