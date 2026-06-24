'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Download, Printer, Award, BookOpen, UserCheck,
  FileText, Calendar, CheckCircle, Loader2, TrendingUp, School, User,
  AlertCircle, Edit3, X, Save, GraduationCap
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

function buildScoreTypes(config: any): { key: string; label: string; maxScore: number }[] {
  if (!config) return [{ key: 'ca1', label: 'Mid-Term Test', maxScore: 40 }, { key: 'exam', label: 'Exam', maxScore: 60 }];
  const types: { key: string; label: string; maxScore: number }[] = [];
  if (config.ca1_enabled) types.push({ key: 'ca1', label: config.ca1_label || 'Mid-Term Test', maxScore: config.ca1_max || 40 });
  if (config.ca2_enabled) types.push({ key: 'ca2', label: config.ca2_label || '2nd CA', maxScore: config.ca2_max || 10 });
  if (config.ca3_enabled) types.push({ key: 'ca3', label: config.ca3_label || '3rd CA', maxScore: config.ca3_max || 10 });
  if (config.exam_enabled) types.push({ key: 'exam', label: config.exam_label || 'Exam', maxScore: config.exam_max || 60 });
  return types;
}

async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return ''; }
}

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
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [assessmentConfig, setAssessmentConfig] = useState<any>(null);
  const [domainGrades, setDomainGrades] = useState<Record<string, number>>({});
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [photoBase64, setPhotoBase64] = useState<string>('');

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
      const [childrenRes, termsRes, settingsRes] = await Promise.all([
        supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name, avatar_url), class:classes!class_id(name)').eq('parent_id', profile?.id),
        supabase.from('terms').select('*, session:academic_sessions!session_id(name)').order('start_date', { ascending: false }),
        supabase.from('school_settings').select('*').limit(1).maybeSingle(),
      ]);
      if (childrenRes.error) throw new Error(childrenRes.error.message);
      if (termsRes.error) throw new Error(termsRes.error.message);
      setChildren(childrenRes.data || []);
      setTerms(termsRes.data || []);
      setSchoolSettings(settingsRes.data);
      setAssessmentConfig(settingsRes.data?.assessment_config || null);
      if (settingsRes.data?.school_logo) {
        urlToBase64(settingsRes.data.school_logo).then(b64 => { if (b64) setLogoBase64(b64); });
      }

      if (childrenRes.data?.length) {
        const selected = childId ? childrenRes.data.find((c: any) => c.id === childId) : childrenRes.data[0];
        setChild(selected);
        if (selected?.profile?.avatar_url) {
          urlToBase64(selected.profile.avatar_url).then(b64 => { if (b64) setPhotoBase64(b64); });
        }
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

      const [resR, attR, behR, hwR, remR, domR] = await Promise.all([
        supabase.from('results').select('*, subject:subjects!subject_id(name)').eq('student_id', pid).eq('term', termName).order('created_at'),
        supabase.from('attendance').select('*').eq('student_id', pid).gte('date', startDate).lte('date', endDate).order('date'),
        supabase.from('behavioral_reports').select('*, teacher:profiles!entered_by(first_name, last_name)').eq('student_id', pid).gte('created_at', startDate).lte('created_at', endOfDay),
        supabase.from('homework_submissions').select('*, homework:homework!homework_id(title, subject:subjects!subject_id(name))').eq('student_id', pid).gte('submitted_at', startDate).lte('submitted_at', endOfDay),
        supabase.from('report_remarks').select('*').eq('student_id', pid).eq('term_id', selectedTerm.id).maybeSingle(),
        supabase.from('domain_grades').select('*').eq('student_id', pid).eq('term_id', selectedTerm.id).maybeSingle(),
      ]);
      setResults(resR.data || []);
      setAttendance(attR.data || []);
      setBehaviorReports(behR.data || []);
      setHomework(hwR.data || []);
      if (remR.data) setReportRemarks(remR.data);
      if (domR.data) {
        const domData: Record<string, number> = {};
        [...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].forEach(f => {
          if (domR.data[f.key] != null) domData[f.key] = domR.data[f.key];
        });
        setDomainGrades(domData);
      }
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  const [reportRemarks, setReportRemarks] = useState<any>({ teacher_remarks: '', principal_remarks: '', next_term_begins: '' });

  function switchChild(id: string) {
    const c = children.find(ch => ch.id === id);
    if (c) {
      setChild(c);
      if (c?.profile?.avatar_url) {
        urlToBase64(c.profile.avatar_url).then(b64 => { if (b64) setPhotoBase64(b64); });
      }
    }
  }

  function switchTerm(id: string) {
    const t = terms.find(term => term.id === id);
    if (t) setSelectedTerm(t);
  }

  const scoreTypes = buildScoreTypes(assessmentConfig);

  const subjectGrades = results.reduce((acc: any[], r) => {
    let sub = acc.find(s => s.subjectId === r.subject_id);
    if (!sub) {
      sub = { subjectId: r.subject_id, subjectName: r.subject?.name || 'Unknown' };
      scoreTypes.forEach(st => { sub[st.key] = null; });
      acc.push(sub);
    }
    if (scoreTypes.find(st => st.key === r.exam_type)) {
      sub[r.exam_type] = r.score;
    }
    return acc;
  }, []).map((s: any) => {
    let total = 0;
    scoreTypes.forEach(st => { total += s[st.key] ?? 0; });
    total = Math.min(100, total);
    const grade = calculateGrade(total);
    const gradeColor = total >= 70 ? 'text-green-600' : total >= 50 ? 'text-amber-600' : 'text-red-600';
    return { ...s, average: total, grade, gradeColor };
  });

  const overallAvg = subjectGrades.length ? Math.round(subjectGrades.reduce((s: number, sg: any) => s + sg.average, 0) / subjectGrades.length) : 0;
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;
  const homeworkCount = homework.length;

  const subjectRemarks = subjectGrades.map((sg: any) => computeRemark(sg.average));

  const insights = (() => {
    const withScores = subjectGrades.filter((s: any) => s.average > 0);
    const sorted = [...withScores].sort((a: any, b: any) => b.average - a.average);
    return {
      strengths: sorted.filter((s: any) => s.average >= 75),
      weaknesses: sorted.filter((s: any) => s.average < 50),
      gapAnalysis: sorted.filter((s: any) => s.average < 70).map((s: any) => ({ name: s.subjectName, gap: 70 - s.average })),
      sortedByScore: sorted,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
    };
  })();

  function drawDomainRadarChart(doc: jsPDF, dg: Record<string, number>, cx: number, cy: number, radius: number): void {
    const allFields: { key: string; label: string; domain: string }[] = [
      ...COGNITIVE_FIELDS.map(f => ({ ...f, domain: 'Cognitive' })),
      ...AFFECTIVE_FIELDS.map(f => ({ ...f, domain: 'Affective' })),
      ...PSYCHOMOTOR_FIELDS.map(f => ({ ...f, domain: 'Psychomotor' })),
    ];
    const n = allFields.length;
    const angleStep = (2 * Math.PI) / n;
    for (let level = 1; level <= 5; level++) {
      const r = (level / 5) * radius;
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.2);
      doc.circle(cx, cy, r);
    }
    const lines: number[][] = [];
    allFields.forEach((field, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const endX = cx + radius * Math.cos(angle);
      const endY = cy + radius * Math.sin(angle);
      doc.setDrawColor(200, 200, 215);
      doc.setLineWidth(0.2);
      doc.line(cx, cy, endX, endY);
      const val = dg[field.key] || 0;
      const valR = (val / 5) * radius;
      const px = cx + valR * Math.cos(angle);
      const py = cy + valR * Math.sin(angle);
      lines.push([px, py]);
    });
    if (lines.length > 2) {
      const poly: number[][] = [];
      lines.forEach((p, i) => {
        if (i === 0) poly.push([p[0] - cx, p[1] - cy]);
        else poly.push([p[0] - lines[i - 1][0], p[1] - lines[i - 1][1]]);
      });
      doc.setFillColor(30, 58, 95, 0.12);
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.6);
      doc.lines(poly, cx, cy, [1, 1], 'DF');
    }
  }

  function generateRecommendations(): { subjectRecs: string[]; domainRecs: string[]; generalRecs: string[] } {
    const subjectRecs: string[] = [];
    const domainRecs: string[] = [];
    const generalRecs: string[] = [];
    subjectGrades.forEach((s: any) => {
      if (s.average < 40) subjectRecs.push(`${s.subjectName} (${s.average}%): Critical — requires intensive remedial tutoring.`);
      else if (s.average < 50) subjectRecs.push(`${s.subjectName} (${s.average}%): Needs significant improvement.`);
      else if (s.average < 60) subjectRecs.push(`${s.subjectName} (${s.average}%): Below average. Focus on weak areas.`);
      else if (s.average < 70) subjectRecs.push(`${s.subjectName} (${s.average}%): Fair. Concentrate on challenging topics.`);
      else if (s.average < 85) subjectRecs.push(`${s.subjectName} (${s.average}%): Good. Aim for deeper mastery.`);
      else subjectRecs.push(`${s.subjectName} (${s.average}%): Excellent! Keep it up.`);
    });
    const lowTraits = [...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].filter(f => (domainGrades[f.key] || 0) < 3);
    if (lowTraits.length > 0) {
      lowTraits.slice(0, 5).forEach(f => domainRecs.push(`${f.label}: Practice and seek guidance to improve.`));
    }
    if (attendanceRate < 80) generalRecs.push(`Attendance is ${attendanceRate}%. Regular attendance (above 90%) is strongly linked to better academic performance.`);
    if (overallAvg < 50) generalRecs.push('Overall performance needs improvement. A structured study plan is recommended.');
    else if (overallAvg < 70) generalRecs.push('Overall performance is fair. A consistent study routine will help raise the average.');
    else generalRecs.push('Overall performance is commendable. Keep up the excellent work!');
    return { subjectRecs, domainRecs, generalRecs };
  }

  function downloadPDF() {
    if (!selectedTerm || !child) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const ml = 14;
    const contentW = pageWidth - ml * 2;
    const maxY = pageHeight - 15;
    const schoolName = schoolSettings?.school_name || 'School Name';

    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 28, 'F');
    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', 5, 3, 12, 12); } catch (e) { /* skip */ }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName, pageWidth / 2, 10, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    if (schoolSettings?.school_address) doc.text(schoolSettings.school_address, pageWidth / 2, 16, { align: 'center' });
    if (schoolSettings?.school_motto) doc.text(`"${schoolSettings.school_motto}"`, pageWidth / 2, 21, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL REPORT CARD', pageWidth / 2, 26, { align: 'center' });

    let y = 36;
    let infoX = ml;
    if (photoBase64) {
      try {
        doc.addImage(photoBase64, 'PNG', ml, y, 12, 14);
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(ml, y, 12, 14);
        infoX = ml + 16;
      } catch (e) { /* skip */ }
    }
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const infoLines = [
      `Student: ${child.profile?.first_name} ${child.profile?.last_name}`,
      `Class: ${child.class?.name || 'N/A'}  |  Adm No: ${child.admission_number || 'N/A'}`,
      `Term: ${selectedTerm.name} (${selectedTerm.session?.name || ''})  |  Attendance: ${presentDays}/${totalDays} days (${attendanceRate}%)`,
    ];
    infoLines.forEach(line => { doc.text(line, infoX, y); y += 5.5; });
    y += 1;

    const headers = scoreTypes.length > 0 ? scoreTypes : [{ key: 'ca1', label: 'Mid-Term Test', maxScore: 40 }, { key: 'exam', label: 'Exam', maxScore: 60 }];
    const headRow: string[] = ['Subject'];
    headers.forEach(h => { headRow.push(`${h.label}\n(/${h.maxScore})`); });
    headRow.push('Total', 'Grade', 'Remark');

    (doc as any).autoTable({
      startY: y,
      head: [headRow],
      body: subjectGrades.map((sg: any) => {
        const row: any[] = [sg.subjectName];
        let total = 0;
        headers.forEach(h => {
          const val = sg[h.key];
          row.push(val != null ? val : '-');
          total += val ?? 0;
        });
        total = Math.min(100, total);
        row.push(`${total}%`, calculateGrade(total), computeRemark(total));
        return row;
      }),
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 95] },
      foot: [[{ content: `Overall Average: ${overallAvg}% — ${computeRemark(overallAvg)}`, colSpan: headRow.length, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]],
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    if (insights.sortedByScore.length > 0) {
      if (y + 15 > maxY) { doc.addPage(); y = 30; }
      doc.setDrawColor(200, 200, 200);
      doc.line(ml, y, ml + contentW, y);
      y += 3;
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.setFont('helvetica', 'bold');
      doc.text('Performance Analysis', ml, y);
      y += 5;
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      if (insights.best) doc.text(`Best: ${insights.best.subjectName} (${insights.best.average}%)`, ml, y);
      if (insights.worst) doc.text(`Lowest: ${insights.worst.subjectName} (${insights.worst.average}%)`, ml + 55, y);
      y += 6;
    }

    const domainKeys = Object.keys(domainGrades);
    if (domainKeys.length > 0) {
      if (y + 30 > maxY) { doc.addPage(); y = 30; }
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.setFont('helvetica', 'bold');
      doc.text('Domain Skills Radar', ml, y);
      y += 3;
      drawDomainRadarChart(doc, domainGrades, pageWidth / 2, y + 30, 30);
      y += 70;
    }

    if (reportRemarks.teacher_remarks || reportRemarks.principal_remarks) {
      if (y + 10 > maxY) { doc.addPage(); y = 30; }
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.setFont('helvetica', 'bold');
      if (reportRemarks.teacher_remarks) {
        doc.text("Teacher's Remark", ml, y);
        y += 3;
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
        const split = doc.splitTextToSize(reportRemarks.teacher_remarks, contentW);
        if (y + split.length * 3.5 > maxY) { doc.addPage(); y = 30; }
        doc.text(split, ml, y);
        y += split.length * 3.5 + 4;
      }
      if (reportRemarks.principal_remarks) {
        if (y + 10 > maxY) { doc.addPage(); y = 30; }
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 95);
        doc.setFont('helvetica', 'bold');
        doc.text("Principal's Remark", ml, y);
        y += 3;
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
        const split2 = doc.splitTextToSize(reportRemarks.principal_remarks, contentW);
        if (y + split2.length * 3.5 > maxY) { doc.addPage(); y = 30; }
        doc.text(split2, ml, y);
        y += split2.length * 3.5 + 4;
      }
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | ${schoolName}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Page 2: Recommendations
    doc.addPage();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${schoolName} — Report Card (continued)`, pageWidth / 2, 12, { align: 'center' });
    y = 25;

    const recs = generateRecommendations();
    doc.setDrawColor(200, 200, 200);
    doc.line(ml, y, ml + contentW, y);
    y += 3;
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 95);
    doc.setFont('helvetica', 'bold');
    doc.text('Personalized Recommendations', ml, y);
    y += 5;

    if (recs.subjectRecs.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(22, 163, 74);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject-Specific Guidance', ml, y);
      y += 4;
      doc.setFontSize(6.5);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      recs.subjectRecs.forEach(r => {
        const lines = doc.splitTextToSize(`• ${r}`, contentW - 10);
        if (y + lines.length * 3.5 > maxY) { doc.addPage(); y = 30; }
        doc.text(lines, ml + 3, y);
        y += lines.length * 3.5 + 1.5;
      });
      y += 2;
    }

    if (recs.domainRecs.length > 0) {
      if (y + 8 > maxY) { doc.addPage(); y = 30; }
      doc.setFontSize(8);
      doc.setTextColor(124, 58, 237);
      doc.setFont('helvetica', 'bold');
      doc.text('Character & Skill Development', ml, y);
      y += 4;
      doc.setFontSize(6.5);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      recs.domainRecs.forEach(r => {
        const lines = doc.splitTextToSize(`• ${r}`, contentW - 10);
        if (y + lines.length * 3.5 > maxY) { doc.addPage(); y = 30; }
        doc.text(lines, ml + 3, y);
        y += lines.length * 3.5 + 1.5;
      });
      y += 2;
    }

    if (recs.generalRecs.length > 0) {
      if (y + 8 > maxY) { doc.addPage(); y = 30; }
      doc.setFontSize(8);
      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.text('General Advice', ml, y);
      y += 4;
      doc.setFontSize(6.5);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      recs.generalRecs.forEach(r => {
        const lines = doc.splitTextToSize(`• ${r}`, contentW - 10);
        if (y + lines.length * 3.5 > maxY) { doc.addPage(); y = 30; }
        doc.text(lines, ml + 3, y);
        y += lines.length * 3.5 + 1.5;
      });
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | ${schoolName}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    doc.save(`report-card-${child.profile?.first_name}-${selectedTerm.name}.pdf`);
  }

  function handlePrint() {
    if (!child || !selectedTerm) return;
    const w = window.open('', '_blank');
    if (!w) return;
    const name = `${child.profile?.first_name} ${child.profile?.last_name}`;
    const headers = scoreTypes.length > 0 ? scoreTypes : [{ key: 'ca1', label: 'Mid-Term Test', maxScore: 40 }, { key: 'exam', label: 'Exam', maxScore: 60 }];
    const rows = subjectGrades.map((sg: any) => {
      let cells = '';
      let total = 0;
      headers.forEach(h => {
        const val = sg[h.key];
        cells += `<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">${val != null ? val : '-'}</td>`;
        total += val ?? 0;
      });
      total = Math.min(100, total);
      return `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${sg.subjectName}</td>${cells}<td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:bold">${total}%</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:bold">${calculateGrade(total)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${computeRemark(total)}</td></tr>`;
    }).join('');

    const schoolName = schoolSettings?.school_name || 'School Name';
    const recs = generateRecommendations();

    let recsHtml = '<h3 style="color:#1e3a5f;margin-top:25px;font-size:14px">Personalized Recommendations</h3>';
    if (recs.subjectRecs.length > 0) {
      recsHtml += '<div><p style="font-weight:bold;color:#16a34a;font-size:12px">Subject-Specific Guidance</p>';
      recs.subjectRecs.forEach(r => { recsHtml += `<p style="font-size:11px;color:#333;margin:3px 0">• ${r}</p>`; });
      recsHtml += '</div>';
    }
    if (recs.domainRecs.length > 0) {
      recsHtml += '<div style="margin-top:10px"><p style="font-weight:bold;color:#7c3aed;font-size:12px">Character & Skill Development</p>';
      recs.domainRecs.forEach(r => { recsHtml += `<p style="font-size:11px;color:#333;margin:3px 0">• ${r}</p>`; });
      recsHtml += '</div>';
    }
    if (recs.generalRecs.length > 0) {
      recsHtml += '<div style="margin-top:10px"><p style="font-weight:bold;color:#f59e0b;font-size:12px">General Advice</p>';
      recs.generalRecs.forEach(r => { recsHtml += `<p style="font-size:11px;color:#333;margin:3px 0">• ${r}</p>`; });
      recsHtml += '</div>';
    }

    w.document.write(`<!DOCTYPE html><html><head><title>Report Card - ${name}</title><style>
      body { font-family: 'Segoe UI',Arial,sans-serif; margin:0; padding:40px; background:#f8fafc; }
      .card { max-width:850px; margin:0 auto; background:white; border-radius:16px; padding:40px; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
      .header { text-align:center; background:#1e3a5f; color:white; margin:-40px -40px 20px; padding:30px; border-radius:16px 16px 0 0; }
      .header h1 { margin:0; font-size:22px; } .header p { margin:3px 0; font-size:11px; opacity:0.9; }
      table { width:100%; border-collapse:collapse; margin-top:20px; }
      th { background:#1e3a5f; color:white; padding:10px; text-align:left; font-size:12px; }
      .summary { margin-top:20px; display:flex; gap:20px; }
      .summary-box { flex:1; background:#f1f5f9; border-radius:8px; padding:12px; text-align:center; }
      .summary-box .val { font-size:22px; font-weight:bold; color:#1e3a5f; }
      .summary-box .lbl { font-size:11px; color:#64748b; }
      .footer { margin-top:30px; font-size:10px; color:#94a3b8; text-align:center; }
      @media print { body { background:white; padding:10px; } .card { box-shadow:none; } }
    </style></head><body><div class="card">
      <div class="header">
        ${logoBase64 ? `<img src="${logoBase64}" style="height:50px;margin-bottom:8px" />` : ''}
        <h1>${schoolName}</h1>
        ${schoolSettings?.school_address ? `<p>${schoolSettings.school_address}</p>` : ''}
        ${schoolSettings?.school_motto ? `<p>"${schoolSettings.school_motto}"</p>` : ''}
        <p style="font-size:14px;font-weight:bold;margin-top:5px">OFFICIAL REPORT CARD</p>
      </div>
      <div style="font-size:12px;margin-bottom:15px">
        ${photoBase64 ? `<div style="float:right"><img src="${photoBase64}" style="width:50px;height:60px;object-fit:cover;border-radius:4px;border:2px solid #ccc" /></div>` : ''}
        <strong>Student:</strong> ${name} &nbsp;|&nbsp; <strong>Class:</strong> ${child.class?.name || 'N/A'} &nbsp;|&nbsp;
        <strong>Admission:</strong> ${child.admission_number || 'N/A'} &nbsp;|&nbsp;
        <strong>Term:</strong> ${selectedTerm.name} (${selectedTerm.session?.name || ''}) &nbsp;|&nbsp;
        <strong>Attendance:</strong> ${presentDays}/${totalDays} days (${attendanceRate}%)
      </div>
      <table><thead><tr><th>Subject</th>${headers.map(h => `<th>${h.label}<br><span style="font-weight:normal;font-size:10px">(/${h.maxScore})</span></th>`).join('')}<th>Total</th><th>Grade</th><th>Remark</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="summary">
        <div class="summary-box"><div class="val">${overallAvg}%</div><div class="lbl">Overall Average</div></div>
        <div class="summary-box"><div class="val">${attendanceRate}%</div><div class="lbl">Attendance</div></div>
        <div class="summary-box"><div class="val">${homeworkCount}</div><div class="lbl">Homework</div></div>
      </div>
      ${insights.sortedByScore.length > 0 ? `
      <div style="margin-top:20px">
        <h3 style="color:#1e3a5f;font-size:14px;margin-bottom:5px">Performance Analysis</h3>
        <p style="font-size:12px;color:#555"><strong>Best:</strong> ${insights.best?.subjectName} (${insights.best?.average}%) &nbsp;|&nbsp; <strong>Lowest:</strong> ${insights.worst?.subjectName} (${insights.worst?.average}%)</p>
      </div>` : ''}
      ${Object.keys(domainGrades).length > 0 ? `
      <div style="margin-top:15px">
        <h3 style="color:#1e3a5f;font-size:14px">Domain Assessment</h3>
        <table style="margin-top:5px"><thead><tr><th>Domain</th><th>Trait</th><th>Rating</th></tr></thead><tbody>
          ${[...COGNITIVE_FIELDS, ...AFFECTIVE_FIELDS, ...PSYCHOMOTOR_FIELDS].filter(f => domainGrades[f.key] != null).map(f => {
            const domain = COGNITIVE_FIELDS.includes(f) ? 'Cognitive' : AFFECTIVE_FIELDS.includes(f) ? 'Affective' : 'Psychomotor';
            return `<tr><td>${domain}</td><td>${f.label}</td><td>${domainGrades[f.key]}/5</td></tr>`;
          }).join('')}
        </tbody></table>
      </div>` : ''}
      ${reportRemarks.teacher_remarks ? `<div style="margin-top:15px;padding:15px;background:#f1f5f9;border-radius:8px;font-size:12px"><strong>Teacher's Remark:</strong><br>${reportRemarks.teacher_remarks}</div>` : ''}
      ${reportRemarks.principal_remarks ? `<div style="margin-top:10px;padding:15px;background:#f1f5f9;border-radius:8px;font-size:12px"><strong>Principal's Remark:</strong><br>${reportRemarks.principal_remarks}</div>` : ''}
      <p class="footer">Generated on ${new Date().toLocaleDateString()} | Page 1</p>
    </div>
    <div class="card" style="margin-top:30px">
      ${recsHtml}
      <p class="footer">Generated on ${new Date().toLocaleDateString()} | Page 2</p>
    </div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  if (loading && !child) {
    return (
      <DashboardLayout title="Report Card" subtitle="Comprehensive student report card">
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
            <div><h1 className="text-2xl font-bold text-slate-800">Report Card</h1><p className="text-slate-500 text-sm">Comprehensive student report card</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadPDF} className="btn-primary flex items-center gap-2 text-sm"><Download size={16} /> PDF</button>
            <button onClick={handlePrint} className="btn-outline flex items-center gap-2 text-sm"><Printer size={16} /> Print</button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

        {!child ? (
          <div className="bg-white rounded-xl p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
        ) : (
          <>
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

            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4 mb-4">
                {logoBase64 ? <img src={logoBase64} alt="logo" className="w-12 h-12 rounded-full object-cover" /> : <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"><School size={28} /></div>}
                <div><h2 className="text-xl font-bold">{schoolSettings?.school_name || 'School Name'}</h2>
                  {schoolSettings?.school_address && <p className="text-sm text-primary-200">{schoolSettings.school_address}</p>}
                  {schoolSettings?.school_motto && <p className="text-xs text-primary-300 italic mt-0.5">"{schoolSettings.school_motto}"</p>}</div>
              </div>
              <div className="border-t border-white/20 pt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {photoBase64 ? <img src={photoBase64} alt="photo" className="w-8 h-8 rounded-full object-cover border-2 border-white/50" /> : <User size={14} />}
                  <span><strong>{child.profile?.first_name} {child.profile?.last_name}</strong></span>
                </div>
                <div className="flex items-center gap-2"><GraduationCap size={14} /><span>{child.class?.name || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Award size={14} /><span>Adm: {child.admission_number || 'N/A'}</span></div>
                <div className="flex items-center gap-2"><Calendar size={14} /><span>{selectedTerm?.name} ({selectedTerm?.session?.name || ''})</span></div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card"><div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-primary-600" /><span className="text-xs text-slate-500">Overall Average</span></div><p className={`text-2xl font-bold ${overallAvg >= 70 ? 'text-green-600' : overallAvg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{overallAvg}%</p></div>
                  <div className="card"><div className="flex items-center gap-2 mb-1"><UserCheck size={16} className="text-green-600" /><span className="text-xs text-slate-500">Attendance</span></div><p className="text-2xl font-bold text-green-600">{attendanceRate}%</p><p className="text-xs text-slate-400">{presentDays}/{totalDays} days</p></div>
                  <div className="card"><div className="flex items-center gap-2 mb-1"><FileText size={16} className="text-amber-600" /><span className="text-xs text-slate-500">Homework</span></div><p className="text-2xl font-bold text-amber-600">{homeworkCount}</p><p className="text-xs text-slate-400">submitted</p></div>
                  <div className="card"><div className="flex items-center gap-2 mb-1"><BookOpen size={16} className="text-purple-600" /><span className="text-xs text-slate-500">Grade</span></div><p className="text-2xl font-bold text-purple-600">{calculateGrade(overallAvg)}</p><p className="text-xs text-slate-400">{computeRemark(overallAvg)}</p></div>
                </div>

                <div className="card">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Award size={18} className="text-slate-400" />
                    {selectedTerm?.name} Score Sheet
                  </h2>
                  {subjectGrades.length === 0 ? (
                    <div className="text-center py-12 text-slate-500"><Calendar size={40} className="mx-auto mb-3 opacity-50" /><p>No results found for this term</p></div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-primary-600 text-white">
                            <th className="p-3 text-left font-medium">Subject</th>
                            {scoreTypes.map(st => (
                              <th key={st.key} className="p-3 text-center font-medium">{st.label}<br /><span className="text-[10px] font-normal opacity-80">(/{st.maxScore})</span></th>
                            ))}
                            <th className="p-3 text-center font-medium">Total</th>
                            <th className="p-3 text-center font-medium">Grade</th>
                            <th className="p-3 text-right font-medium">Remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjectGrades.map((sg: any, i: number) => {
                            let total = 0;
                            scoreTypes.forEach(st => { total += sg[st.key] ?? 0; });
                            total = Math.min(100, total);
                            const grade = calculateGrade(total);
                            const remark = computeRemark(total);
                            return (
                              <tr key={sg.subjectId} className={i % 2 === 0 ? 'bg-slate-50' : ''}>
                                <td className="p-3 font-medium text-slate-800">{sg.subjectName}</td>
                                {scoreTypes.map(st => (
                                  <td key={st.key} className="p-3 text-center font-bold">{sg[st.key] != null ? sg[st.key] : '-'}</td>
                                ))}
                                <td className={`p-3 text-center font-bold ${total >= 70 ? 'text-green-600' : total >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{total}%</td>
                                <td className={`p-3 text-center font-bold ${grade === 'A+' || grade === 'A' ? 'text-green-600' : grade === 'F' ? 'text-red-600' : 'text-slate-600'}`}>{grade}</td>
                                <td className="p-3 text-right text-slate-600">{remark}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

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

                {insights.strengths.length > 0 || insights.weaknesses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.strengths.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <h3 className="font-semibold text-green-800 text-sm mb-2">Strengths</h3>
                        {insights.strengths.map((s: any) => (
                          <div key={s.subjectId} className="flex items-center gap-2 text-sm text-green-700"><span>✅</span><span>{s.subjectName}: {s.average}%</span></div>
                        ))}
                      </div>
                    )}
                    {insights.weaknesses.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <h3 className="font-semibold text-red-800 text-sm mb-2">Needs Improvement</h3>
                        {insights.weaknesses.map((s: any) => (
                          <div key={s.subjectId} className="flex items-center gap-2 text-sm text-red-700"><span>⚠️</span><span>{s.subjectName}: {s.average}%</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {Object.keys(domainGrades).length > 0 && (
                  <div className="card">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Domain Assessment</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[{ title: 'Cognitive', fields: COGNITIVE_FIELDS, color: 'text-blue-600' },
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

                {(reportRemarks.teacher_remarks || reportRemarks.principal_remarks) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reportRemarks.teacher_remarks && (
                      <div className="card"><h3 className="text-sm font-bold text-slate-800 mb-2">Teacher's Remark</h3><p className="text-sm text-slate-600 italic">"{reportRemarks.teacher_remarks}"</p></div>
                    )}
                    {reportRemarks.principal_remarks && (
                      <div className="card"><h3 className="text-sm font-bold text-slate-800 mb-2">Principal's Remark</h3><p className="text-sm text-slate-600 italic">"{reportRemarks.principal_remarks}"</p></div>
                    )}
                  </div>
                )}
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
