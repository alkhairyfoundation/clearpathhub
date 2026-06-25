'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Download, Loader2, Check, X, Award, AlertCircle, BookOpen, GraduationCap, Clock, FileText, BarChart3, Shield, AlertTriangle, TrendingUp, Brain, Lightbulb } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
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
  explanation?: string;
};

type SubjectBreakdown = { correct: number; total: number };
type DifficultyBreakdown = { correct: number; total: number };
type TopicBreakdown = { correct: number; total: number };

export default function StudentMockExamReportPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const attemptId = params?.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [cumulativeAnalytics, setCumulativeAnalytics] = useState<any>(null);
  const [questionsData, setQuestionsData] = useState<QuestionDetail[]>([]);
  const [bySubject, setBySubject] = useState<Record<string, SubjectBreakdown>>({});
  const [byDifficulty, setByDifficulty] = useState<Record<string, DifficultyBreakdown>>({});
  const [byTopic, setByTopic] = useState<Record<string, TopicBreakdown>>({});
  const [allAttempts, setAllAttempts] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);

  const score = attempt?.score || 0;
  const passingScore = exam?.passing_score || 50;
  const passed = score >= passingScore;
  const totalQ = questionsData.length;
  const correctQ = questionsData.filter(q => q.is_correct).length;
  const wrongQ = totalQ - correctQ;

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile, attemptId]);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const { data: attemptData, error: attemptErr } = await supabase
        .from('mock_attempts')
        .select('*, exam:mock_exams(*)')
        .eq('id', attemptId)
        .single();

      if (attemptErr || !attemptData) { setError('Attempt not found'); setLoading(false); return; }
      if (attemptData.student_id !== profile?.id) { setError('Access denied'); setLoading(false); return; }

      setAttempt(attemptData);
      setExam(attemptData.exam);

      const { data: settingsRes } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
      setSchoolSettings(settingsRes);

      const { data: analyticsData } = await supabase
        .from('mock_analytics')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('exam_id', attemptData.exam_id)
        .maybeSingle();
      setCumulativeAnalytics(analyticsData);

      const { data: allAtts } = await supabase
        .from('mock_attempts')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('exam_id', attemptData.exam_id)
        .not('completed_at', 'is', null)
        .order('created_at', { ascending: true });
      setAllAttempts(allAtts || []);

      if (attemptData.topic_mastery) {
        const tp = typeof attemptData.topic_mastery === 'string' ? JSON.parse(attemptData.topic_mastery) : attemptData.topic_mastery;
        setQuestionsData(tp.questions || []);
        setBySubject(tp.by_subject || {});
        setByDifficulty(tp.by_difficulty || {});
        setByTopic(tp.by_topic || {});
      } else if (attemptData.answers) {
        const answers = typeof attemptData.answers === 'string' ? JSON.parse(attemptData.answers) : attemptData.answers;
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

  function getLetterGrade(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  }

  function getLetterGradeColor(pct: number): string {
    if (pct >= 80) return 'text-green-600';
    if (pct >= 70) return 'text-blue-600';
    if (pct >= 60) return 'text-amber-600';
    if (pct >= 50) return 'text-orange-600';
    return 'text-red-600';
  }

  const radarData = Object.entries(bySubject)
    .filter(([_, d]) => d.total > 0)
    .map(([subject, d]) => ({
      subject,
      score: Math.round((d.correct / d.total) * 100),
      fullMark: 100,
    }));

  const progressData = allAttempts.map((a, i) => ({
    attempt: `#${a.attempt_number}`,
    score: a.score || 0,
  }));

  const masteryDistData = cumulativeAnalytics?.total_attempts ? [
    { name: 'POOR', value: allAttempts.filter(a => a.mastery_level === 'POOR').length, color: '#ef4444' },
    { name: 'GOOD', value: allAttempts.filter(a => a.mastery_level === 'GOOD').length, color: '#f59e0b' },
    { name: 'EXCELLENT', value: allAttempts.filter(a => a.mastery_level === 'EXCELLENT').length, color: '#3b82f6' },
    { name: 'PROFICIENT', value: allAttempts.filter(a => a.mastery_level === 'PROFICIENT').length, color: '#8b5cf6' },
    { name: 'MASTERED', value: allAttempts.filter(a => a.mastery_level === 'MASTERED').length, color: '#22c55e' },
  ].filter(d => d.value > 0) : [];

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

    if (attempt?.mastery_level === 'MASTERED') {
      parts.push('OUTSTANDING PERFORMANCE: The student demonstrates exceptional understanding across all areas. Consider advanced placement, enrichment programs, or mentorship opportunities.');
    } else if (attempt?.mastery_level === 'PROFICIENT') {
      parts.push('STRONG PERFORMANCE: The student shows solid comprehension. Continue with current curriculum and provide extension activities.');
    } else if (attempt?.mastery_level === 'EXCELLENT') {
      parts.push('GOOD PERFORMANCE: The student performs well overall. Focus on strengthening weaker areas through targeted practice.');
    } else if (attempt?.mastery_level === 'GOOD') {
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

    if (cumulativeAnalytics?.recommended_pathway) {
      parts.push(`RECOMMENDED PATHWAY: ${cumulativeAnalytics.recommended_pathway} — ${cumulativeAnalytics.pathway_reasoning}`);
    }

    const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
    parts.push(`Accuracy Rate: ${accuracy}% (${correctQ}/${totalQ} questions answered correctly).`);

    return parts.join(' ');
  }

  function drawRadarChart(doc: any, bySubj: Record<string, SubjectBreakdown>, cx: number, cy: number, radius: number): void {
    const items = Object.entries(bySubj).filter(([_, d]) => d.total > 0);
    const n = items.length;
    if (n < 3) return;
    const angleStep = (2 * Math.PI) / n;
    for (let level = 1; level <= 5; level++) {
      const r = (level / 5) * radius;
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.2);
      doc.ellipse(cx, cy, r, r);
    }
    const pts: number[][] = [];
    items.forEach(([subject, d], i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
      const endX = cx + radius * Math.cos(angle);
      const endY = cy + radius * Math.sin(angle);
      doc.setDrawColor(200, 200, 215);
      doc.setLineWidth(0.2);
      doc.line(cx, cy, endX, endY);
      const valR = (pct / 100) * radius;
      const px = cx + valR * Math.cos(angle);
      const py = cy + valR * Math.sin(angle);
      pts.push([px, py]);
      const labelR = radius + 10;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      doc.setFontSize(4.5);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(subject.substring(0, 10), lx, ly, { align: 'center' });
    });
    if (pts.length > 2) {
      doc.setFillColor(30, 58, 95, 0.12);
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.6);
      doc.lines(pts, cx, cy, [1, 1], 'DF');
    }
  }

  function drawBarChart(doc: any, bySubj: Record<string, SubjectBreakdown>, x: number, y: number, w: number, maxY: number): number {
    const items = Object.entries(bySubj)
      .map(([name, d]) => ({ name, pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct);
    if (items.length === 0) return y;
    const barH = 4.5, gap = 2.5, labelW = 36, pctW = 12, barMaxW = w - labelW - pctW;
    const chartH = items.length * (barH + gap) + 11;
    if (y + chartH > maxY) { doc.addPage(); y = 25; }
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(x, y, x + w, y); y += 3;
    doc.setFontSize(8); doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold');
    doc.text('Subject Performance Overview', x, y); y += 5.5;
    items.forEach((item, i) => {
      const by = y + i * (barH + gap);
      doc.setFontSize(6.5); doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal');
      doc.text(item.name.substring(0, 14), x, by + barH - 0.5);
      doc.setFillColor(238, 238, 238);
      doc.rect(x + labelW, by, barMaxW, barH, 'F');
      const barW = Math.max((item.pct / 100) * barMaxW, 1);
      const bc: [number, number, number] = item.pct >= 70 ? [22, 163, 74] : item.pct >= 40 ? [245, 158, 11] : [220, 38, 38];
      doc.setFillColor(...bc);
      doc.rect(x + labelW, by, barW, barH, 'F');
      doc.setTextColor(80, 80, 80); doc.setFontSize(6);
      doc.text(`${item.pct}%`, x + labelW + barMaxW + 1.5, by + barH - 0.5);
    });
    return y + items.length * (barH + gap) + 3;
  }

  function drawInsights(doc: any, bySubj: Record<string, SubjectBreakdown>, byDiff: Record<string, DifficultyBreakdown>, byTop: Record<string, TopicBreakdown>, x: number, y: number, w: number, maxY: number): number {
    const subjItems = Object.entries(bySubj)
      .map(([name, d]) => ({ name, pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 }))
      .filter(s => s.pct > 0);
    if (subjItems.length === 0 && Object.keys(byDiff).length === 0) return y;
    let estH = 12;
    if (subjItems.length > 0) estH += 6 + Math.min(subjItems.length, 2) * 4.5;
    estH += 6 + Math.min(Object.keys(byDiff).length, 3) * 4.5;
    if (y + estH > maxY) { doc.addPage(); y = 25; }
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(x, y, x + w, y); y += 3;
    doc.setFontSize(8); doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold');
    doc.text('Performance Insights', x, y); y += 5;
    if (subjItems.length > 0) {
      const sorted = [...subjItems].sort((a, b) => b.pct - a.pct);
      doc.setFontSize(6.5); doc.setTextColor(22, 163, 74);
      doc.setFont('helvetica', 'bold');
      doc.text('Strongest', x, y); y += 3.5;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      sorted.slice(0, 2).forEach(s => { doc.text(`${s.name}: ${s.pct}%`, x + 3, y + 0.5); y += 4; });
      y += 1;
      const weak = sorted.filter(s => s.pct < 40);
      if (weak.length > 0) {
        doc.setFontSize(6.5); doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'bold');
        doc.text('Needs Improvement', x, y); y += 3.5;
        doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
        weak.forEach(s => { doc.text(`${s.name}: ${s.pct}%`, x + 3, y + 0.5); y += 4; });
        y += 1;
      }
    }
    const diffWeak = Object.entries(byDiff).filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.4);
    if (diffWeak.length > 0) {
      doc.setFontSize(6.5); doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.text('Difficulty Challenges', x, y); y += 3.5;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      diffWeak.slice(0, 3).forEach(([diff, d]) => {
        const pct = Math.round((d.correct / d.total) * 100);
        doc.text(`${diff}: ${pct}% correct`, x + 3, y + 0.5); y += 4;
      });
      y += 1;
    }
    const topWeak = Object.entries(byTop).filter(([_, d]) => d.total > 0 && (d.correct / d.total) < 0.4);
    if (topWeak.length > 0) {
      if (y + 8 > maxY) { doc.addPage(); y = 25; }
      doc.setFontSize(6.5); doc.setTextColor(124, 58, 237);
      doc.setFont('helvetica', 'bold');
      doc.text('Topics to Focus On', x, y); y += 3.5;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
      topWeak.slice(0, 4).forEach(([t, d]) => {
        const pct = Math.round((d.correct / d.total) * 100);
        doc.text(`${t}: ${pct}%`, x + 3, y + 0.5); y += 4;
      });
    }
    return y + 2;
  }

  function drawProgressDots(doc: any, data: any, earned: number, max: number): void {
    if (max <= 0) return;
    const dotR = 0.6;
    const spacing = 2.2;
    const startX = data.cell.x + (data.cell.width - (max * spacing)) / 2;
    const dotY = data.cell.y + data.cell.height / 2;
    for (let i = 0; i < max; i++) {
      doc.setFillColor(i < earned ? 22 : 200, i < earned ? 163 : 200, i < earned ? 74 : 200);
      doc.ellipse(startX + i * spacing, dotY, dotR, dotR, 'F');
    }
  }

  async function downloadPDF() {
    if (!attempt || !exam) return;
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
        d.text('MOCK EXAM ANALYSIS REPORT', pw / 2, 24, { align: 'center' });
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
        ['Student ID', profile?.id?.substring(0, 8) || 'N/A'],
        ['Email', profile?.email || 'N/A'],
        ['Exam Title', exam?.title || 'N/A'],
        ['Exam Type', exam?.exam_type || 'N/A'],
        ['Attempt #', `${attempt?.attempt_number || 1}`],
        ['Completed', attempt?.completed_at ? new Date(attempt.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'],
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
      doc.ellipse(scoreX, y + 12, 12, 12, 'FD');
      doc.setTextColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}%`, scoreX, y + 15, { align: 'center' });

      const resultsInfo = [
        ['Total Questions', `${totalQ}`],
        ['Correct Answers', `${correctQ}`],
        ['Wrong Answers', `${wrongQ}`],
        ['Accuracy', `${totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0}%`],
        ['Passing Score', `${passingScore}%`],
        ['Score Obtained', `${score}%`],
        ['Mastery Level', attempt?.mastery_level || 'N/A'],
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
          startY: y, head: [['Subject', 'Correct', 'Total', 'Score', 'Grade', 'Assessment']],
          body: subjectEntries.map(([subj, d]: [string, any]) => {
            const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            return [subj, `${d.correct}`, `${d.total}`, `${pct}%`, getLetterGrade(pct), pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'];
          }),
          theme: 'striped', headStyles: { fillColor: [...primaryColor] as [number, number, number] },
          columnStyles: { 0: { cellWidth: 45 }, 4: { cellWidth: 15 }, 5: { cellWidth: 25 } },
          margin: { left: 14, right: 14 }, tableLineWidth: 0,
        });
        y = (doc as any).lastAutoTable.finalY + 5;
        if (subjectEntries.length >= 3) {
          const radarCx = pw / 2;
          const radarCy = y + 45;
          if (radarCy + 55 > doc.internal.pageSize.getHeight()) { doc.addPage(); y = 45; drawHeader(doc); }
          doc.setFontSize(8);
          doc.setTextColor(30, 58, 95);
          doc.setFont('helvetica', 'bold');
          doc.text('Subject Performance Radar', 18, y);
          y += 3;
          drawRadarChart(doc, bySubject, radarCx, y + 35, 32);
          y = y + 78;
        }
        y = drawBarChart(doc, bySubject, 18, y, pw - 36, doc.internal.pageSize.getHeight() - 15);
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
        y = drawInsights(doc, bySubject, byDifficulty, byTopic, 18, y, pw - 36, doc.internal.pageSize.getHeight() - 15);
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
            if (data.section === 'body' && data.column.index === 7) {
              const raw = data.cell.raw.toString();
              const parts = raw.split('/');
              const earned = parseInt(parts[0]) || 0;
              const max = parseInt(parts[1]) || 1;
              drawProgressDots(doc, data, earned, max);
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

      if (cumulativeAnalytics?.recommended_pathway) {
        if (y + 30 > doc.internal.pageSize.getHeight()) { doc.addPage(); y = 45; drawHeader(doc); }
        doc.setFillColor(239, 246, 255);
        doc.rect(14, y, pw - 28, 18, 'F');
        doc.setTextColor(30, 58, 95);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('PATHWAY RECOMMENDATION', 18, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 80);
        doc.text(`Recommended: ${cumulativeAnalytics.recommended_pathway}`, 18, y + 10);
        doc.text(cumulativeAnalytics.pathway_reasoning || '', 18, y + 15);
        y += 22;
      }

      if (y < 250) {
        y += 3;
        doc.setFillColor(240, 242, 245);
        doc.rect(18, y, pw - 36, 6, 'F');
        doc.setFillColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
        doc.rect(18, y, Math.max((pw - 36) * score / 100, 6), 6, 'F');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Overall Score: ${score}% | ${correctQ} of ${totalQ} correct`, pw / 2, y + 10, { align: 'center' });
      }

      const recText = buildRecommendationsText();
      if (recText) {
        if (y > 245) { doc.addPage(); y = 45; drawHeader(doc); }
        y = Math.max(y + 10, 245);
        if (y + 40 > doc.internal.pageSize.getHeight()) { doc.addPage(); y = 45; drawHeader(doc); }
        const split = doc.splitTextToSize(recText, pw - 40);
        const boxHeight = Math.max(22, split.length * 4 + 8);
        doc.setFillColor(253, 237, 236);
        doc.rect(14, y, pw - 28, boxHeight, 'F');
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
      doc.save(`Mock_Exam_Report_Attempt_${attempt.attempt_number}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Mock Exam Report" subtitle="Loading...">
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
          <Link href="/student/mock-exams" className="btn-outline mt-4 inline-flex items-center gap-2"><ArrowLeft size={16} /> Back</Link>
        </div>
      </DashboardLayout>
    );
  }

  const subjectEntries = Object.entries(bySubject);
  const difficultyEntries = Object.entries(byDifficulty);
  const topicEntries = Object.entries(byTopic);
  const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

  return (
    <DashboardLayout title="Mock Exam Report" subtitle={`Attempt #${attempt?.attempt_number}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/mock-exams" className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mock Exam Report</h1>
              <p className="text-slate-500 text-sm">{exam?.title} — Attempt #{attempt?.attempt_number}</p>
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
              <p className="text-primary-200 text-sm">Exam Score — {exam?.exam_type === 'JSS3_BECE' ? 'JSS3 BECE' : 'SS3 WAEC'}</p>
              <p className="text-5xl font-bold">{score}%</p>
              <p className="text-primary-200 text-sm mt-1">{exam?.title}</p>
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
          <div className="card"><p className="text-xs text-slate-500">Grade</p><p className={`text-2xl font-bold ${getLetterGradeColor(accuracy)}`}>{getLetterGrade(accuracy)}</p></div>
        </div>

        {/* Time + Mastery + Security */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {attempt?.time_taken_seconds && (
            <div className="card flex items-center gap-3">
              <Clock size={20} className="text-primary-600" />
              <div><p className="text-xs text-slate-500">Time Taken</p><p className="text-lg font-bold">{Math.floor(attempt.time_taken_seconds / 60)}m {attempt.time_taken_seconds % 60}s</p></div>
            </div>
          )}
          {attempt?.mastery_level && (
            <div className="card flex items-center gap-3">
              <Award size={20} className={`${attempt.mastery_level === 'MASTERED' ? 'text-green-600' : attempt.mastery_level === 'PROFICIENT' ? 'text-blue-600' : attempt.mastery_level === 'EXCELLENT' ? 'text-primary-600' : attempt.mastery_level === 'GOOD' ? 'text-amber-600' : 'text-red-600'}`} />
              <div><p className="text-xs text-slate-500">Mastery Level</p><p className="text-lg font-bold">{attempt.mastery_level}</p></div>
            </div>
          )}
          {cumulativeAnalytics?.recommended_pathway && (
            <div className="card flex items-center gap-3">
              <TrendingUp size={20} className="text-purple-600" />
              <div><p className="text-xs text-slate-500">Recommended Pathway</p><p className="text-lg font-bold text-purple-600">{cumulativeAnalytics.recommended_pathway}</p></div>
            </div>
          )}
        </div>

        {/* Progress Over Time (if multiple attempts) */}
        {progressData.length > 1 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={16} /> Progress Over Attempts</h3>
            <div className="w-full max-w-lg mx-auto">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="attempt" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                  <Bar dataKey="score" fill="#1e3a5f" radius={[4, 4, 0, 0]}>
                    {progressData.map((entry, index) => (
                      <Cell key={index} fill={entry.score >= (exam?.passing_score || 50) ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Mastery Distribution Pie */}
        {masteryDistData.length > 1 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Award size={16} /> Mastery Distribution (All Attempts)</h3>
            <div className="w-full max-w-xs mx-auto">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={masteryDistData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {masteryDistData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Subject Radar Chart */}
        {radarData.length >= 3 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={16} /> Subject Performance Radar</h3>
            <div className="w-full max-w-md mx-auto">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Score" dataKey="score" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.2} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Subject Performance */}
        {subjectEntries.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen size={16} /> Subject Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100"><th className="p-3 text-left font-semibold text-slate-600">Subject</th><th className="p-3 text-center font-semibold text-slate-600">Correct</th><th className="p-3 text-center font-semibold text-slate-600">Total</th><th className="p-3 text-center font-semibold text-slate-600">Score</th><th className="p-3 text-center font-semibold text-slate-600">Grade</th><th className="p-3 text-center font-semibold text-slate-600">Bar</th><th className="p-3 text-center font-semibold text-slate-600">Assessment</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectEntries.map(([subj, d]: [string, any]) => {
                    const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                    return (
                      <tr key={subj}>
                        <td className="p-3 font-medium">{subj}</td>
                        <td className="p-3 text-center">{d.correct}</td>
                        <td className="p-3 text-center">{d.total}</td>
                        <td className={`p-3 text-center font-bold ${getGradeColor(pct)}`}>{pct}%</td>
                        <td className="p-3 text-center"><span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getLetterGradeColor(pct)}`}>{getLetterGrade(pct)}</span></td>
                        <td className="p-3"><div className="w-20 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} /></div></td>
                        <td className={`p-3 text-center font-semibold ${getGradeColor(pct)}`}>{pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(() => {
              const items = [...subjectEntries].map(([n, d]: [string, any]) => ({ n, p: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 })).sort((a, b) => b.p - a.p);
              return (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Subject Performance Overview</p>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const barColor = item.p >= 70 ? 'bg-green-500' : item.p >= 40 ? 'bg-amber-500' : 'bg-red-500';
                      return (
                        <div key={item.n} className="flex items-center gap-3">
                          <span className="w-24 text-xs text-slate-700 text-right truncate shrink-0">{item.n}</span>
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${item.p}%` }} />
                          </div>
                          <span className={`w-10 text-xs font-bold text-right ${getGradeColor(item.p)}`}>{item.p}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
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

        {/* Performance Insights */}
        {(() => {
          const sorted = [...subjectEntries].map(([n, d]: [string, any]) => ({ n, p: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 })).filter(s => s.p > 0).sort((a, b) => b.p - a.p);
          const weakSubj = sorted.filter(s => s.p < 40);
          const weakDiff = [...difficultyEntries].filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
          const weakTop = [...topicEntries].filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
          if (sorted.length === 0 && weakDiff.length === 0 && weakTop.length === 0) return null;
          return (
            <div className="card">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={16} /> Performance Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sorted.length >= 2 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Strengths</p>
                    {sorted.slice(0, 2).map(s => (
                      <p key={s.n} className="text-sm text-green-800"><span className="font-semibold">{s.n}</span> — {s.p}%</p>
                    ))}
                  </div>
                )}
                {(weakSubj.length > 0 || weakDiff.length > 0) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Needs Improvement</p>
                    {weakSubj.map(s => <p key={s.n} className="text-sm text-red-800">{s.n}: {s.p}%</p>)}
                    {weakDiff.slice(0, 2).map(([d, dd]: [string, any]) => <p key={d} className="text-sm text-red-800">{d}: {Math.round((dd.correct / dd.total) * 100)}%</p>)}
                  </div>
                )}
                {weakTop.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Topics to Focus On</p>
                    {weakTop.slice(0, 3).map(([t, td]: [string, any]) => (
                      <p key={t} className="text-sm text-purple-800">{t}: {Math.round((td.correct / td.total) * 100)}%</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Pathway Recommendation */}
        {cumulativeAnalytics?.recommended_pathway && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Lightbulb size={16} className="text-blue-600" /> Pathway Recommendation</h3>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-primary-700">{cumulativeAnalytics.recommended_pathway}</span>
              <span className="text-sm text-slate-500">Track</span>
            </div>
            <p className="text-sm text-slate-700">{cumulativeAnalytics.pathway_reasoning}</p>
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
                      <td className="p-2 text-center text-xs">
                        <span className="inline-flex items-center gap-0.5">
                          {Array.from({ length: q.points || 1 }).map((_, di) => (
                            <span key={di} className={`w-2 h-2 rounded-full inline-block ${di < (q.points_earned || 0) ? 'bg-green-500' : 'bg-slate-200'}`} />
                          ))}
                          <span className="ml-1 text-slate-400">{(q.points_earned || 0)}/{(q.points || 1)}</span>
                        </span>
                      </td>
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
      </div>
    </DashboardLayout>
  );
}
