'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Download, Loader2, Check, X, Award, AlertCircle, BookOpen, GraduationCap, Clock, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type QuestionDetail = {
  question_index: number;
  question: string;
  question_type: string;
  subject: string;
  difficulty_level: string;
  topic: string;
  correct_answer: any;
  given_answer: any;
  is_correct: boolean;
  points: number;
  points_earned: number;
  options?: string[];
};

type SubjectBreakdown = { correct: number; total: number };
type DifficultyBreakdown = { correct: number; total: number };
type TopicBreakdown = { correct: number; total: number };

export default function StudentEntranceReportPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const applicationId = params?.applicationId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [application, setApplication] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [questionsData, setQuestionsData] = useState<QuestionDetail[]>([]);
  const [bySubject, setBySubject] = useState<Record<string, SubjectBreakdown>>({});
  const [byDifficulty, setByDifficulty] = useState<Record<string, DifficultyBreakdown>>({});
  const [byTopic, setByTopic] = useState<Record<string, TopicBreakdown>>({});
  const [downloading, setDownloading] = useState(false);

  const score = application?.exam_score || 0;
  const passingScore = exam?.passing_score || 50;
  const passed = score >= passingScore;
  const totalQ = questionsData.length;
  const correctQ = questionsData.filter(q => q.is_correct).length;
  const wrongQ = totalQ - correctQ;

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile, applicationId]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [appRes, settingsRes] = await Promise.all([
        supabase.from('entrance_applications').select('*, exam:entrance_exams(*)').eq('id', applicationId).maybeSingle(),
        supabase.from('school_settings').select('*').limit(1).maybeSingle(),
      ]);

      if (!appRes.data) { setError('Application not found'); setLoading(false); return; }
      if (appRes.data.email !== profile?.email) { setError('Access denied'); setLoading(false); return; }

      setApplication(appRes.data);
      setExam(appRes.data.exam);
      setSchoolSettings(settingsRes.data);

      const { data: analyticsData } = await supabase
        .from('student_analytics')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle();

      if (analyticsData?.topic_performance) {
        const tp = typeof analyticsData.topic_performance === 'string'
          ? JSON.parse(analyticsData.topic_performance)
          : analyticsData.topic_performance;
        setAnalytics(analyticsData);
        setQuestionsData(tp.questions || []);
        setBySubject(tp.by_subject || {});
        setByDifficulty(tp.by_difficulty || {});
        setByTopic(tp.by_topic || {});
      } else if (appRes.data.answers) {
        const answers = typeof appRes.data.answers === 'string' ? JSON.parse(appRes.data.answers) : appRes.data.answers;
        if (Array.isArray(answers)) {
          setQuestionsData(answers);
          const bs: Record<string, SubjectBreakdown> = {};
          const bd: Record<string, DifficultyBreakdown> = {};
          const bt: Record<string, TopicBreakdown> = {};
          answers.forEach((a: any) => {
            const s = a.subject || 'UNSPECIFIED';
            const d = a.difficulty_level || 'UNSPECIFIED';
            const t = a.topic || 'General';
            if (!bs[s]) bs[s] = { correct: 0, total: 0 };
            bs[s].total++; if (a.is_correct) bs[s].correct++;
            if (!bd[d]) bd[d] = { correct: 0, total: 0 };
            bd[d].total++; if (a.is_correct) bd[d].correct++;
            if (!bt[t]) bt[t] = { correct: 0, total: 0 };
            bt[t].total++; if (a.is_correct) bt[t].correct++;
          });
          setBySubject(bs); setByDifficulty(bd); setByTopic(bt);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  function getGradeColor(pct: number): string {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-600';
  }

  function getBarColor(pct: number): string {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  }

  function formatAnswer(q: QuestionDetail): string {
    if (q.options && Array.isArray(q.options) && typeof q.given_answer === 'number' && q.options[q.given_answer]) {
      return `${q.given_answer + 1}. ${q.options[q.given_answer]}`;
    }
    if ((q.question_type === 'TRUE_FALSE' || q.question_type === 'true_false') && typeof q.given_answer === 'number') {
      return q.given_answer === 0 ? 'True' : 'False';
    }
    return String(q.given_answer ?? '—');
  }

  function formatCorrectAnswer(q: QuestionDetail): string {
    if (q.options && Array.isArray(q.options) && typeof q.correct_answer === 'number' && q.options[q.correct_answer]) {
      return `${q.correct_answer + 1}. ${q.options[q.correct_answer]}`;
    }
    if ((q.question_type === 'TRUE_FALSE' || q.question_type === 'true_false') && typeof q.correct_answer === 'number') {
      return q.correct_answer === 0 ? 'True' : 'False';
    }
    return String(q.correct_answer ?? '—');
  }

  function buildRecommendationsText(): string {
    const weakSubjects = Object.entries(bySubject)
      .filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.5)
      .map(([s]) => s);
    const weakDifficulties = Object.entries(byDifficulty)
      .filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.4)
      .map(([d]) => d);
    const weakTopics = Object.entries(byTopic)
      .filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.4)
      .map(([t]) => t);

    const parts: string[] = [];

    if (analytics?.mastery_level === 'MASTERED') {
      parts.push('OUTSTANDING PERFORMANCE: The student demonstrates exceptional understanding across all areas. Consider advanced placement, enrichment programs, or mentorship opportunities.');
    } else if (analytics?.mastery_level === 'PROFICIENT') {
      parts.push('STRONG PERFORMANCE: The student shows solid comprehension. Continue with current curriculum and provide extension activities.');
    } else if (analytics?.mastery_level === 'EXCELLENT') {
      parts.push('GOOD PERFORMANCE: The student performs well overall. Focus on strengthening weaker areas through targeted practice.');
    } else if (analytics?.mastery_level === 'GOOD') {
      parts.push('BASIC UNDERSTANDING: The student has foundational knowledge but needs improvement. Enroll in remedial support programs and revisit core concepts.');
    } else {
      parts.push('SIGNIFICANT SUPPORT NEEDED: The student requires intensive academic intervention. Consider one-on-one tutoring and a structured learning plan.');
    }

    if (weakSubjects.length > 0) parts.push(`Weak Subjects: ${weakSubjects.join(', ')}. Focused study in these areas is strongly advised.`);
    if (weakDifficulties.length > 0) {
      weakDifficulties.forEach(d => {
        if (d === 'VERY_HARD' || d === 'HARD') parts.push(`${d} questions: Start with easier problems to build confidence, then increase difficulty.`);
        else if (d === 'MEDIUM') parts.push('Medium difficulty: Review fundamental concepts and practice varied question formats.');
        else parts.push(`${d} questions: Master the basics before moving to advanced topics.`);
      });
    }
    if (weakTopics.length > 0) parts.push(`Topics requiring attention: ${weakTopics.join(', ')}. Targeted revision in these areas will significantly improve performance.`);

    const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
    parts.push(`Accuracy Rate: ${accuracy}% (${correctQ}/${totalQ} questions answered correctly).`);

    return parts.join(' ');
  }

  async function downloadPDF() {
    if (!application || !exam) return;
    setDownloading(true);
    try {
      const schoolName = schoolSettings?.school_name || 'ClearPath Edu Hub';
      const primaryColor: [number, number, number] = [30, 58, 95];
      const goldColor: [number, number, number] = [179, 146, 47];
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();

      const drawHeader = (d: typeof doc) => {
        d.setFillColor(...primaryColor);
        d.rect(0, 0, pw, 40, 'F');
        d.setFillColor(...goldColor);
        d.rect(0, 38, pw, 2, 'F');
        d.setTextColor(255, 255, 255);
        d.setFontSize(20);
        d.setFont('helvetica', 'bold');
        d.text(schoolName, pw / 2, 16, { align: 'center' });
        d.setFontSize(9);
        d.setFont('helvetica', 'normal');
        d.text('ENTRANCE EXAM ANALYSIS REPORT', pw / 2, 24, { align: 'center' });
        d.setFontSize(7);
        d.text(`Generated: ${new Date().toLocaleString()}`, pw / 2, 31, { align: 'center' });
      };

      const drawFooter = (d: typeof doc) => {
        const ph = d.internal.pageSize.getHeight();
        d.setFillColor(...primaryColor);
        d.rect(0, ph - 12, pw, 12, 'F');
        d.setTextColor(255, 255, 255);
        d.setFontSize(6);
        d.setFont('helvetica', 'normal');
        d.text(schoolName + ' — Official Document', pw / 2, ph - 6, { align: 'center' });
        d.text('This report is system-generated and does not require a signature.', pw / 2, ph - 2.5, { align: 'center' });
      };

      drawHeader(doc);

      let y = 50;
      doc.setFillColor(...primaryColor);
      doc.rect(14, y - 4, pw - 28, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('STUDENT INFORMATION', 18, y + 0.5);

      y += 11;
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const studentInfo = [
        ['Full Name', `${application.first_name || ''} ${application.last_name || ''}`],
        ['Email', application.email || 'N/A'],
        ['Phone', application.phone || 'N/A'],
        ['Applied Class', application.applied_class || 'N/A'],
        ['Admitted Class', application.admitted_class || 'Pending'],
        ['Exam Completed', application.completed_at ? new Date(application.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'],
      ];
      studentInfo.forEach(([label, value], i) => {
        const rowY = y + i * 5.5;
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', 18, rowY);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 55, rowY);
      });

      y += studentInfo.length * 5.5 + 7;
      doc.setFillColor(...primaryColor);
      doc.rect(14, y - 4, pw - 28, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('EXAM RESULTS', 18, y + 0.5);

      y += 11;
      const scoreX = pw - 40;
      doc.setDrawColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
      doc.setFillColor(passed ? 240 : 254, passed ? 253 : 242, passed ? 244 : 242);
      doc.circle(scoreX, y + 12, 12, 'FD');
      doc.setTextColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}%`, scoreX, y + 15, { align: 'center' });

      const resultsInfo = [
        ['Exam Title', exam?.title || 'N/A'],
        ['Academic Year', exam?.academic_year || 'N/A'],
        ['Exam Level', exam?.level || 'N/A'],
        ['Total Questions', `${totalQ}`],
        ['Correct Answers', `${correctQ}`],
        ['Wrong Answers', `${wrongQ}`],
        ['Accuracy', `${totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0}%`],
        ['Passing Score', `${passingScore}%`],
        ['Score Obtained', `${score}%`],
        ['Mastery Level', analytics?.mastery_level || 'N/A'],
        ['Status', passed ? 'PASSED' : 'FAILED'],
      ];
      resultsInfo.forEach(([label, value], i) => {
        const rowY = y + i * 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(7.5);
        doc.text(label + ':', 18, rowY);
        doc.setFont('helvetica', 'normal');
        if (label === 'Status') {
          doc.setTextColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 38 : 38);
        } else if (label === 'Mastery Level') {
          doc.setTextColor(30, 58, 95);
        } else {
          doc.setTextColor(60, 60, 60);
        }
        doc.text(value, 55, rowY);
      });

      const subjectEntries = Object.entries(bySubject);
      if (subjectEntries.length > 0) {
        y += resultsInfo.length * 5 + 7;
        if (y > 240) { doc.addPage(); y = 45; drawHeader(doc); }
        doc.setFillColor(...primaryColor);
        doc.rect(14, y - 4, pw - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('SUBJECT PERFORMANCE', 18, y + 0.5);
        y += 9;
        autoTable(doc, {
          startY: y, head: [['Subject', 'Correct', 'Total', 'Score', 'Assessment']],
          body: subjectEntries.map(([subj, d]: [string, any]) => {
            const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            return [subj, `${d.correct}`, `${d.total}`, `${pct}%`, pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'];
          }),
          theme: 'striped', headStyles: { fillColor: [...primaryColor] as [number, number, number] },
          columnStyles: { 0: { cellWidth: 50 }, 4: { cellWidth: 30 } },
          margin: { left: 14, right: 14 }, tableLineWidth: 0,
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      const difficultyEntries = Object.entries(byDifficulty);
      if (difficultyEntries.length > 0) {
        if (y > 240) { doc.addPage(); y = 45; drawHeader(doc); }
        doc.setFillColor(...primaryColor);
        doc.rect(14, y - 4, pw - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('DIFFICULTY BREAKDOWN', 18, y + 0.5);
        y += 9;
        autoTable(doc, {
          startY: y, head: [['Difficulty Level', 'Correct', 'Total', 'Score', 'Verdict']],
          body: difficultyEntries.map(([diff, d]: [string, any]) => {
            const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            return [diff, `${d.correct}`, `${d.total}`, `${pct}%`, pct >= 70 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'];
          }),
          theme: 'striped', headStyles: { fillColor: [...primaryColor] as [number, number, number] },
          margin: { left: 14, right: 14 }, tableLineWidth: 0,
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      if (questionsData.length > 0) {
        doc.addPage();
        y = 45;
        drawHeader(doc);
        doc.setFillColor(...primaryColor);
        doc.rect(14, y - 4, pw - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('PER-QUESTION ANALYSIS', 18, y + 0.5);
        y += 9;

        const rowCorrectness = questionsData.map((q: any) => q.is_correct);
        const questionRows = questionsData.map((q, i) => {
          const qShort = q.question ? (q.question.length > 50 ? q.question.substring(0, 47) + '...' : q.question) : '';
          return [i + 1, q.subject || '—', qShort, q.difficulty_level || '—', formatCorrectAnswer(q), formatAnswer(q), '', `${q.points_earned || 0}/${q.points || 1}`];
        });

        autoTable(doc, {
          startY: y, head: [['#', 'Subject', 'Question', 'Diff', 'Correct Answer', 'Given Answer', 'Correct', 'Pts']],
          body: questionRows, theme: 'striped',
          headStyles: { fillColor: [...primaryColor] as [number, number, number], fontSize: 7 },
          bodyStyles: { fontSize: 6.5 },
          columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 18 }, 2: { cellWidth: 55 }, 3: { cellWidth: 12 }, 4: { cellWidth: 28 }, 5: { cellWidth: 28 }, 6: { cellWidth: 12, halign: 'center' }, 7: { cellWidth: 12, halign: 'center' } },
          margin: { left: 10, right: 10 }, tableLineWidth: 0,
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 6) {
              const isC = rowCorrectness[data.row.index] === true;
              doc.setTextColor(isC ? 22 : 220, isC ? 163 : 38, isC ? 38 : 38);
              doc.setFont('helvetica', 'bold');
              doc.text(isC ? 'Yes' : 'No', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.5, { align: 'center' });
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      const topicEntries = Object.entries(byTopic);
      if (topicEntries.length > 0) {
        if (y > 240) { doc.addPage(); y = 45; drawHeader(doc); }
        doc.setFillColor(...primaryColor);
        doc.rect(14, y - 4, pw - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('TOPIC PERFORMANCE', 18, y + 0.5);
        y += 9;
        autoTable(doc, {
          startY: y, head: [['Topic', 'Correct', 'Total', 'Score', 'Status']],
          body: topicEntries.map(([topic, d]: [string, any]) => {
            const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            return [topic, `${d.correct}`, `${d.total}`, `${pct}%`, pct >= 80 ? 'Mastered' : pct >= 60 ? 'Good' : pct >= 40 ? 'Developing' : 'Needs Work'];
          }),
          theme: 'striped', headStyles: { fillColor: [...primaryColor] as [number, number, number] },
          margin: { left: 14, right: 14 }, tableLineWidth: 0,
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      if (y < 250) {
        y += 3;
        doc.setFillColor(240, 242, 245);
        doc.roundedRect(18, y, pw - 36, 6, 3, 3, 'F');
        doc.setFillColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
        doc.roundedRect(18, y, Math.max((pw - 36) * score / 100, 6), 6, 3, 3, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Overall Score: ${score}% | ${correctQ} of ${totalQ} correct`, pw / 2, y + 10, { align: 'center' });
      }

      const recText = buildRecommendationsText();
      if (recText) {
        if (y > 245) { doc.addPage(); y = 45; drawHeader(doc); }
        y = Math.max(y + 10, 245);
        const pageH = doc.internal.pageSize.getHeight();
        if (y + 40 > pageH) { doc.addPage(); y = 45; drawHeader(doc); }
        const split = doc.splitTextToSize(recText, pw - 40);
        const boxHeight = Math.max(22, split.length * 4 + 8);
        doc.setFillColor(253, 237, 236);
        doc.roundedRect(14, y, pw - 28, boxHeight, 2, 2, 'F');
        doc.setTextColor(180, 80, 60);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Recommendations for Improvement', 18, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 60, 40);
        doc.text(split, 18, y + 11);
      }

      drawFooter(doc);
      doc.save(`Entrance_Exam_Report_${application.first_name || 'Student'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Report" subtitle="Loading...">
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Report" subtitle="Error">
        <div className="card text-center py-16">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <Link href="/student/entrance-exams" className="btn-outline mt-4 inline-flex items-center gap-2"><ArrowLeft size={16} /> Back</Link>
        </div>
      </DashboardLayout>
    );
  }

  const subjectEntries = Object.entries(bySubject);
  const difficultyEntries = Object.entries(byDifficulty);
  const topicEntries = Object.entries(byTopic);
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

  return (
    <DashboardLayout title="Exam Analysis Report" subtitle={`${application.first_name} ${application.last_name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/entrance-exams" className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Exam Analysis Report</h1>
              <p className="text-slate-500 text-sm">{application.first_name} {application.last_name}</p>
            </div>
          </div>
          <button onClick={downloadPDF} disabled={downloading} className="btn-primary flex items-center gap-2">
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
        </div>

        {/* Score Overview */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-200 text-sm">Exam Score</p>
              <p className="text-5xl font-bold">{score}%</p>
              <p className="text-primary-200 text-sm mt-1">{exam?.title} — {exam?.level}</p>
            </div>
            <div className="text-right">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-2 ${passed ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                {passed ? <Check size={40} className="text-green-300" /> : <X size={40} className="text-red-300" />}
              </div>
              <p className="text-sm font-semibold">{passed ? 'PASSED' : 'FAILED'}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card"><p className="text-xs text-slate-500">Total Questions</p><p className="text-2xl font-bold">{totalQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500">Correct</p><p className="text-2xl font-bold text-green-600">{correctQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500">Wrong</p><p className="text-2xl font-bold text-red-600">{wrongQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500">Accuracy</p><p className={`text-2xl font-bold ${getGradeColor(accuracy)}`}>{accuracy}%</p></div>
        </div>

        {/* Subject Performance */}
        {subjectEntries.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen size={16} /> Subject Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-3 text-left font-semibold text-slate-600">Subject</th><th className="p-3 text-center font-semibold text-slate-600">Correct</th><th className="p-3 text-center font-semibold text-slate-600">Total</th><th className="p-3 text-center font-semibold text-slate-600">Score</th><th className="p-3 text-center font-semibold text-slate-600">Bar</th><th className="p-3 text-center font-semibold text-slate-600">Assessment</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectEntries.map(([subj, d]: [string, any]) => {
                    const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                    return (
                      <tr key={subj}>
                        <td className="p-3 font-medium">{subj}</td>
                        <td className="p-3 text-center">{d.correct}</td>
                        <td className="p-3 text-center">{d.total}</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(pct)}`}>{pct}%</td>
                        <td className="p-3"><div className="w-20 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} /></div></td>
                        <td className={`p-3 text-center font-semibold ${getGradeColor(pct)}`}>{pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Difficulty Breakdown */}
        {difficultyEntries.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Award size={16} /> Difficulty Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-3 text-left font-semibold text-slate-600">Difficulty</th><th className="p-3 text-center font-semibold text-slate-600">Correct</th><th className="p-3 text-center font-semibold text-slate-600">Total</th><th className="p-3 text-center font-semibold text-slate-600">Score</th><th className="p-3 text-center font-semibold text-slate-600">Bar</th><th className="p-3 text-center font-semibold text-slate-600">Verdict</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {difficultyEntries.map(([diff, d]: [string, any]) => {
                    const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                    return (
                      <tr key={diff}>
                        <td className="p-3 font-medium">{diff}</td>
                        <td className="p-3 text-center">{d.correct}</td>
                        <td className="p-3 text-center">{d.total}</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(pct)}`}>{pct}%</td>
                        <td className="p-3"><div className="w-20 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} /></div></td>
                        <td className={`p-3 text-center font-semibold ${getGradeColor(pct)}`}>{pct >= 70 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Per-Question Analysis */}
        {questionsData.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={16} /> Per-Question Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-2 text-center font-semibold text-slate-600 text-xs">#</th><th className="p-2 text-left font-semibold text-slate-600 text-xs">Subject</th><th className="p-2 text-left font-semibold text-slate-600 text-xs">Question</th><th className="p-2 text-center font-semibold text-slate-600 text-xs">Diff</th><th className="p-2 text-left font-semibold text-slate-600 text-xs">Correct Answer</th><th className="p-2 text-left font-semibold text-slate-600 text-xs">Your Answer</th><th className="p-2 text-center font-semibold text-slate-600 text-xs">Result</th><th className="p-2 text-center font-semibold text-slate-600 text-xs">Pts</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {questionsData.map((q, i) => (
                    <tr key={i} className={q.is_correct ? '' : 'bg-red-50'}>
                      <td className="p-2 text-center text-slate-400">{i + 1}</td>
                      <td className="p-2 text-xs">{q.subject || '—'}</td>
                      <td className="p-2 text-xs max-w-[200px] truncate" title={q.question}>{q.question}</td>
                      <td className="p-2 text-center text-xs">{q.difficulty_level || '—'}</td>
                      <td className="p-2 text-xs text-green-700 font-medium">{formatCorrectAnswer(q)}</td>
                      <td className={`p-2 text-xs font-medium ${q.is_correct ? 'text-green-700' : 'text-red-700'}`}>{formatAnswer(q)}</td>
                      <td className="p-2 text-center">{q.is_correct ? <Check size={16} className="text-green-500 inline" /> : <X size={16} className="text-red-500 inline" />}</td>
                      <td className="p-2 text-center text-xs">{q.points_earned || 0}/{q.points || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Topic Performance */}
        {topicEntries.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><GraduationCap size={16} /> Topic Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-3 text-left font-semibold text-slate-600">Topic</th><th className="p-3 text-center font-semibold text-slate-600">Correct</th><th className="p-3 text-center font-semibold text-slate-600">Total</th><th className="p-3 text-center font-semibold text-slate-600">Score</th><th className="p-3 text-center font-semibold text-slate-600">Bar</th><th className="p-3 text-center font-semibold text-slate-600">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {topicEntries.map(([topic, d]: [string, any]) => {
                    const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                    return (
                      <tr key={topic}>
                        <td className="p-3 font-medium">{topic}</td>
                        <td className="p-3 text-center">{d.correct}</td>
                        <td className="p-3 text-center">{d.total}</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(pct)}`}>{pct}%</td>
                        <td className="p-3"><div className="w-20 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} /></div></td>
                        <td className={`p-3 text-center font-semibold ${getGradeColor(pct)}`}>{pct >= 80 ? 'Mastered' : pct >= 60 ? 'Good' : pct >= 40 ? 'Developing' : 'Needs Work'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><AlertCircle size={16} className="text-orange-600" /> Recommendations for Improvement</h3>
          <div className="text-sm text-slate-700 space-y-2">
            {buildRecommendationsText().split('. ').filter(s => s.trim()).map((sentence, i) => (
              <p key={i} className="flex gap-2"><span className="text-orange-500 font-bold mt-0.5">•</span><span>{sentence}.</span></p>
            ))}
          </div>
        </div>

        {/* Mastery Level */}
        {analytics?.mastery_level && (
          <div className="card text-center">
            <p className="text-sm text-slate-500 mb-1">Mastery Level</p>
            <p className={`text-2xl font-bold ${analytics.mastery_level === 'MASTERED' ? 'text-green-600' : analytics.mastery_level === 'PROFICIENT' ? 'text-blue-600' : analytics.mastery_level === 'EXCELLENT' ? 'text-primary-600' : analytics.mastery_level === 'GOOD' ? 'text-amber-600' : 'text-red-600'}`}>
              {analytics.mastery_level}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
