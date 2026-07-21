'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Download, Loader2, Check, X, Award, AlertCircle, BookOpen, GraduationCap, Clock, FileText, BarChart3, Shield, AlertTriangle } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
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
            const s = a.subject || 'General';
            const d = a.difficulty_level || 'Not Specified';
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

  function computePathwayRecommendations(): { label: string; score: number; color: string; }[] {
    const entries = Object.entries(bySubject).map(([n, v]) => ({ n, pct: v.total > 0 ? (v.correct / v.total) * 100 : 0 }));
    const getPct = (namePart: string) => { const found = entries.find(e => e.n.toLowerCase().includes(namePart)); return found ? found.pct : 0; };
    const mathPct = getPct('math');
    const englishPct = getPct('english');
    const sciencePct = (getPct('basic science') + getPct('basic technology') + getPct('science')) / (entries.some(e => e.n.toLowerCase().includes('basic science')) ? 2 : 0);
    const results: { label: string; score: number; color: string; }[] = [];
    if (mathPct > 0 && sciencePct > 0) results.push({ label: 'Science (Sciences)', score: Math.round((mathPct * 0.5 + sciencePct * 0.5)), color: '#1a5276' });
    if (mathPct > 0 && englishPct > 0) results.push({ label: 'Commercial (Business)', score: Math.round((mathPct * 0.5 + englishPct * 0.5)), color: '#922b21' });
    if (englishPct > 0) results.push({ label: 'Arts (Humanities)', score: Math.round(Math.min(100, englishPct * 1.1)), color: '#1e8449' });
    return results.sort((a, b) => b.score - a.score);
  }

  function downloadDOC() {
    const schoolName = schoolSettings?.school_name || 'ClearPath Edu Hub';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const pathwayRecs = computePathwayRecommendations();
    const subjEntries = Object.entries(bySubject);
    const diffEntries = Object.entries(byDifficulty);
    const topEntries = Object.entries(byTopic);
    const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
    const subjRows = subjEntries.map(([s, d]) => {
      const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
      const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
      const assessment = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak';
      const barColor = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
      return `<tr><td>${s}</td><td>${d.correct}</td><td>${d.total}</td><td>${pct}%</td><td>${grade}</td><td><div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${barColor}"></div></div></td><td>${assessment}</td></tr>`;
    }).join('');
    const diffRows = diffEntries.map(([d, v]) => {
      const pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
      return `<tr><td>${d}</td><td>${v.correct}</td><td>${v.total}</td><td>${pct}%</td><td>${pct >= 70 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak'}</td></tr>`;
    }).join('');
    const topRows = topEntries.map(([t, v]) => {
      const pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
      const status = pct >= 80 ? 'Mastered' : pct >= 60 ? 'Good' : pct >= 40 ? 'Developing' : 'Needs Work';
      return `<tr><td>${t}</td><td>${v.correct}</td><td>${v.total}</td><td>${pct}%</td><td>${status}</td></tr>`;
    }).join('');
    const sortedSubj = [...subjEntries].map(([n, d]) => ({ n, p: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 })).filter(s => s.p > 0).sort((a, b) => b.p - a.p);
    const barItems = sortedSubj.map(item => {
      const barColor = item.p >= 70 ? '#16a34a' : item.p >= 40 ? '#d97706' : '#dc2626';
      return `<div class="bar-row"><span class="bar-label">${item.n}</span><div class="bar-bg" style="flex:1"><div class="bar-fill" style="width:${item.p}%;background:${barColor}"></div></div><span style="width:40px;text-align:right;font-weight:bold;font-size:9pt;color:${item.p >= 80 ? '#16a34a' : item.p >= 60 ? '#2563eb' : item.p >= 40 ? '#d97706' : '#dc2626'}">${item.p}%</span></div>`;
    }).join('');
    const questionRows = questionsData.map((q, i) => {
      const qShort = q.question ? (q.question.length > 60 ? q.question.substring(0, 57) + '...' : q.question) : '';
      const pointsStr = Array.from({ length: q.points || 1 }).map((_, di) => di < (q.points_earned || 0) ? '●' : '○').join('');
      return `<tr class="${q.is_correct ? '' : 'wrong-row'}"><td class="center">${i + 1}</td><td>${q.subject || '—'}</td><td>${qShort}</td><td class="center">${q.difficulty_level || '—'}</td><td>${formatCorrectAnswer(q)}</td><td class="${q.is_correct ? 'correct' : 'wrong'}">${formatAnswer(q)}</td><td class="center">${q.is_correct ? '✓' : '✗'}</td><td class="center">${pointsStr} (${q.points_earned || 0}/${q.points || 1})</td></tr>`;
    }).join('');
    const weakSubj = sortedSubj.filter(s => s.p < 40);
    const weakDiff = diffEntries.filter(([_, v]) => v.total > 0 && (v.correct / v.total) < 0.4);
    const weakTop = topEntries.filter(([_, v]) => v.total > 0 && (v.correct / v.total) < 0.4);
    const sortedTop3 = sortedSubj.slice(0, 3);
    const pathwayBars = pathwayRecs.map(p => `<div class="bar-row"><span class="bar-label" style="width:180px">${p.label}</span><div class="bar-bg" style="flex:1"><div class="bar-fill" style="width:${p.score}%;background:${p.color}"></div></div><span style="width:40px;text-align:right;font-weight:bold;font-size:9pt">${p.score}%</span></div>`).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Entrance Exam Report</title>
<style>
  body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #333; margin:0; padding:0; }
  .header { background:#1e3a5f; color:#fff; padding:18px 30px 14px; text-align:center; }
  .header h1 { margin:0; font-size:22pt; font-weight:bold; color:#fff; border:none; }
  .header .gold-bar { height:3px; background:#b3922f; margin:8px 0 4px; }
  .header .sub { font-size:9pt; color:#ccc; }
  .section { padding:14px 30px; }
  .section-title { color:#1e3a5f; font-size:13pt; font-weight:bold; border-bottom:2px solid #b3922f; padding-bottom:4px; margin-top:18px; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; margin:6px 0; }
  th { background:#1e3a5f; color:#fff; padding:5px 7px; text-align:left; font-size:9pt; }
  td { padding:4px 7px; border:1px solid #ddd; font-size:9pt; }
  tr:nth-child(even) { background:#f8f9fa; }
  .center { text-align:center; }
  .correct { color:#16a34a; font-weight:bold; }
  .wrong { color:#dc2626; font-weight:bold; }
  .wrong-row { background:#fef2f2; }
  .bar-row { display:flex; align-items:center; gap:8px; margin:4px 0; }
  .bar-label { width:100px; font-size:9pt; color:#555; text-align:right; white-space:nowrap; overflow:hidden; }
  .bar-bg { background:#eee; border-radius:4px; height:14px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:4px; }
  .gauge-wrap { text-align:center; margin:10px 0; }
  .gauge { display:inline-flex; align-items:center; justify-content:center; width:60px; height:60px; border-radius:50%; font-size:16pt; font-weight:bold; color:#fff; }
  .recs { background:#fef3e7; border:1px solid #fed7aa; padding:12px 16px; border-radius:6px; margin:10px 0; }
  .footer { text-align:center; font-size:8pt; color:#999; margin-top:25px; border-top:1px solid #ddd; padding:10px 30px 20px; }
  .insight { padding:6px 12px; border-radius:4px; margin:4px 0; font-size:9pt; }
  .strength { background:#f0fdf4; border-left:4px solid #16a34a; }
  .weakness { background:#fef2f2; border-left:4px solid #dc2626; }
  .topic-focus { background:#faf5ff; border-left:4px solid #7c3aed; }
  .score-bar-bg { background:#f0f2f5; height:8px; border-radius:4px; margin:6px 0; }
  .score-bar-fill { height:8px; border-radius:4px; }
</style></head><body>
  <div class="header">
    <h1>${schoolName}</h1>
    <div class="gold-bar"></div>
    <div class="sub">ENTRANCE EXAM ANALYSIS REPORT — Generated: ${dateStr}</div>
  </div>

  <div class="section">
    <div class="section-title">Student Information</div>
    <table><tr><th style="width:140px">Field</th><th>Value</th></tr>
      <tr><td>Full Name</td><td>${application.first_name || ''} ${application.last_name || ''}</td></tr>
      <tr><td>Email</td><td>${application.email || 'N/A'}</td></tr>
      <tr><td>Phone</td><td>${application.phone || 'N/A'}</td></tr>
      <tr><td>Applied Class</td><td>${application.applied_class || 'N/A'}</td></tr>
      <tr><td>Admitted Class</td><td>${application.admitted_class || 'Pending'}</td></tr>
      <tr><td>Exam Title</td><td>${exam?.title || 'N/A'}</td></tr>
      <tr><td>Academic Year</td><td>${exam?.academic_year || 'N/A'}</td></tr>
      <tr><td>Exam Level</td><td>${exam?.level || 'N/A'}</td></tr>
    </table>

    <div class="section-title">Exam Results</div>
    <div class="gauge-wrap">
      <div class="gauge" style="background:${passed ? '#16a34a' : '#dc2626'}">${score}%</div>
      <div style="font-weight:bold;font-size:12pt;color:${passed ? '#16a34a' : '#dc2626'};margin-top:4px">${passed ? 'PASSED' : 'FAILED'}</div>
    </div>
    <table><tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Total Questions</td><td>${totalQ}</td></tr>
      <tr><td>Correct Answers</td><td>${correctQ}</td></tr>
      <tr><td>Wrong Answers</td><td>${wrongQ}</td></tr>
      <tr><td>Accuracy</td><td>${accuracy}%</td></tr>
      <tr><td>Passing Score</td><td>${passingScore}%</td></tr>
      <tr><td>Score Obtained</td><td>${score}%</td></tr>
      <tr><td>Mastery Level</td><td>${analytics?.mastery_level || 'N/A'}</td></tr>
      <tr><td>Completed At</td><td>${application.completed_at ? new Date(application.completed_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }) : 'N/A'}</td></tr>
      <tr><td>Status</td><td style="color:${passed ? '#16a34a' : '#dc2626'};font-weight:bold">${passed ? 'PASSED' : 'FAILED'}</td></tr>
    </table>

    ${subjEntries.length > 0 ? `<div class="section-title">Subject Performance</div>
    <table><tr><th>Subject</th><th style="width:60px">Correct</th><th style="width:50px">Total</th><th style="width:55px">Score</th><th style="width:35px">Grade</th><th>Bar</th><th style="width:80px">Assessment</th></tr>${subjRows}</table>
    <p style="font-size:9pt;font-weight:bold;color:#1e3a5f;margin-top:10px">Subject Performance Overview</p>
    ${barItems}` : ''}

    ${diffEntries.length > 0 ? `<div class="section-title">Difficulty Breakdown</div>
    <table><tr><th>Difficulty Level</th><th>Correct</th><th>Total</th><th>Score</th><th>Verdict</th></tr>${diffRows}</table>` : ''}

    ${topEntries.length > 0 ? `<div class="section-title">Topic Performance</div>
    <table><tr><th>Topic</th><th>Correct</th><th>Total</th><th>Score</th><th>Status</th></tr>${topRows}</table>` : ''}

    <div class="section-title">Performance Insights</div>
    ${sortedTop3.length >= 2 ? `<div class="insight strength"><b>Strengths:</b> ${sortedTop3.slice(0,2).map(s => s.n + ' (' + s.p + '%)').join(', ')}</div>` : ''}
    ${weakSubj.length > 0 ? `<div class="insight weakness"><b>Needs Improvement:</b> ${weakSubj.map(s => s.n + ' (' + s.p + '%)').join(', ')}</div>` : ''}
    ${weakDiff.length > 0 ? `<div class="insight weakness"><b>Difficulty Challenges:</b> ${weakDiff.slice(0,3).map(([d, v]) => d + ' (' + Math.round((v.correct / v.total) * 100) + '%)').join(', ')}</div>` : ''}
    ${weakTop.length > 0 ? `<div class="insight topic-focus"><b>Topics to Focus On:</b> ${weakTop.slice(0,4).map(([t, v]) => t + ' (' + Math.round((v.correct / v.total) * 100) + '%)').join(', ')}</div>` : ''}

    ${questionsData.length > 0 ? `<div class="section-title">Per-Question Analysis</div>
    <table><tr><th style="width:25px">#</th><th style="width:65px">Subject</th><th>Question</th><th style="width:45px">Diff</th><th style="width:90px">Correct Answer</th><th style="width:90px">Given Answer</th><th style="width:35px">Result</th><th style="width:55px">Points</th></tr>${questionRows}</table>` : ''}

    ${pathwayRecs.length > 0 ? `<div class="section-title">Recommended Academic Pathways</div>
    ${pathwayBars}` : ''}

    <div style="margin:8px 0">
      <div class="score-bar-bg"><div class="score-bar-fill" style="width:${score}%;background:${passed ? '#16a34a' : '#dc2626'}"></div></div>
      <div style="text-align:center;font-size:8pt;color:#666">Overall Score: ${score}% | ${correctQ} of ${totalQ} correct</div>
    </div>

    <div class="section-title">Recommendations for Improvement</div>
    <div class="recs">
      ${buildRecommendationsText().split('. ').filter(s => s.trim()).map(s => '• ' + s + '.').join('<br>')}
    </div>
  </div>

  <div class="footer">
    ${schoolName} — Official Document — Generated: ${dateStr}<br>
    This report is system-generated and does not require a signature.
  </div>
</body></html>`;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Entrance_Exam_Report_${application.first_name || 'Student'}_${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Entrance PDF Enhancements ──
  function drawEntranceRadarChart(doc: any, bySubj: Record<string, SubjectBreakdown>, cx: number, cy: number, radius: number): void {
    const items = Object.entries(bySubj).filter(([_, d]) => d.total > 0);
    const n = items.length;
    if (n < 2) return;
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
            const px = valR * Math.cos(angle);
            const py = valR * Math.sin(angle);
            pts.push([px, py]);
      const labelR = radius + 10;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      doc.setFontSize(4.5);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'bold');
      doc.text(subject.substring(0, 10), lx, ly, { align: 'center' });
    });
    if (pts.length >= 2) {
      doc.setFillColor(30, 58, 95, 0.12);
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.6);
      doc.lines(pts, cx, cy, [1, 1], 'DF');
    }
  }

  function drawEntranceBarChart(doc: any, bySubj: Record<string, SubjectBreakdown>, x: number, y: number, w: number, maxY: number): number {
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

  function drawEntranceInsights(doc: any, bySubj: Record<string, SubjectBreakdown>, byDiff: Record<string, DifficultyBreakdown>, byTop: Record<string, TopicBreakdown>, x: number, y: number, w: number, maxY: number): number {
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
      doc.setFillColor(...goldColor);
      doc.rect(14, y - 5, pw - 28, 1, 'F');
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
      doc.setFillColor(...goldColor);
      doc.rect(14, y - 5, pw - 28, 1, 'F');
      doc.setFillColor(...primaryColor);
      doc.rect(14, y - 4, pw - 28, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('EXAM RESULTS', 18, y + 0.5);

      y += 11;
      const scoreX = pw - 40;
      const gaugeColor: [number, number, number] = passed ? [22, 163, 74] : [220, 38, 38];
      doc.setDrawColor(...goldColor);
      doc.setFillColor(gaugeColor[0], gaugeColor[1], gaugeColor[2]);
      doc.circle(scoreX, y + 12, 15, 'F');
      doc.setFillColor(255, 255, 255);
      doc.circle(scoreX, y + 12, 12, 'F');
      doc.setDrawColor(...gaugeColor);
      doc.setFillColor(...gaugeColor);
      doc.circle(scoreX, y + 12, 12, 'FD');
      doc.setTextColor(255, 255, 255);
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
        doc.setFillColor(...goldColor);
        doc.rect(14, y - 5, pw - 28, 1, 'F');
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
        const pageH = doc.internal.pageSize.getHeight();
        // Radar chart
        if (subjectEntries.length >= 3) {
          const radarCx = pw / 2;
          const radarCy = y + 45;
          const pageH2 = doc.internal.pageSize.getHeight();
          if (radarCy + 55 > pageH2) { doc.addPage(); y = 45; drawHeader(doc); }
          doc.setFontSize(8);
          doc.setTextColor(30, 58, 95);
          doc.setFont('helvetica', 'bold');
          doc.text('Subject Performance Radar', 18, y);
          y += 3;
          drawEntranceRadarChart(doc, bySubject, radarCx, y + 35, 32);
          y = y + 78;
        }
        y = drawEntranceBarChart(doc, bySubject, 18, y, pw - 36, doc.internal.pageSize.getHeight() - 15);
      }

      const difficultyEntries = Object.entries(byDifficulty);
      if (difficultyEntries.length > 0) {
        if (y > 240) { doc.addPage(); y = 45; drawHeader(doc); }
        doc.setFillColor(...goldColor);
        doc.rect(14, y - 5, pw - 28, 1, 'F');
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
        const pageH2 = doc.internal.pageSize.getHeight();
        y = drawEntranceInsights(doc, bySubject, byDifficulty, byTopic, 18, y, pw - 36, pageH2 - 15);
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
        doc.setFillColor(...goldColor);
        doc.rect(14, y - 5, pw - 28, 1, 'F');
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

      // ── Pathway Recommendations ──
      const pathwayRecs = computePathwayRecommendations();
      if (pathwayRecs.length > 0) {
        if (y + 20 > 270) { doc.addPage(); y = 45; drawHeader(doc); }
        doc.setFillColor(...goldColor);
        doc.rect(14, y - 5, pw - 28, 1, 'F');
        doc.setFillColor(...primaryColor);
        doc.rect(14, y - 4, pw - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('RECOMMENDED PATHWAYS', 18, y + 0.5);
        y += 11;
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'bold');
        doc.text('Pathway', 18, y);
        doc.text('Match', pw - 75, y);
        doc.text('Fit', pw - 40, y);
        y += 1;
        pathwayRecs.forEach((pr, i) => {
          if (y + 7 > 280) { doc.addPage(); y = 45; drawHeader(doc); }
          const barW = Math.max((pr.score / 100) * 80, 1);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(60, 60, 60);
          doc.text(`${i + 1}. ${pr.label}`, 18, y + 3);
          doc.setTextColor(238, 238, 238);
          doc.setFillColor(238, 238, 238);
          doc.rect(pw - 88, y, 80, 4, 'F');
          doc.setFillColor(pr.color);
          doc.rect(pw - 88, y, barW, 4, 'F');
          doc.setTextColor(80, 80, 80);
          doc.setFontSize(6);
          doc.text(`${pr.score}%`, pw - 88 + barW + 2, y + 3);
          y += 7;
        });
        y += 3;
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
        const pageH = doc.internal.pageSize.getHeight();
        if (y + 40 > pageH) { doc.addPage(); y = 45; drawHeader(doc); }
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
  const pathwayRecs = computePathwayRecommendations();
  const sortedInsights = [...subjectEntries].map(([n, d]: [string, any]) => ({ n, p: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 })).filter(s => s.p > 0).sort((a, b) => b.p - a.p);
  const weakSubj = sortedInsights.filter(s => s.p < 40);
  const weakDiff = [...difficultyEntries].filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
  const weakTop = [...topicEntries].filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);

  const [activeTab, setActiveTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'difficulty', label: 'Difficulty & Topics', icon: Award },
    { id: 'questions', label: 'Questions', icon: FileText },
    { id: 'recommendations', label: 'Recommendations', icon: AlertCircle },
  ];

  return (
    <DashboardLayout title="Exam Analysis Report" subtitle={`${application.first_name} ${application.last_name}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link href="/student/entrance-exams" className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Exam Analysis Report</h1>
              <p className="text-slate-500 text-sm">{application.first_name} {application.last_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={downloadDOC} className="btn-outline flex items-center gap-2 text-sm">
              <Download size={14} /> DOC
            </button>
            <button onClick={downloadPDF} disabled={downloading} className="btn-primary flex items-center gap-2 text-sm">
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              PDF
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Score Overview - Always visible */}
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

        {activeTab === 'overview' && (
        <>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card"><p className="text-xs text-slate-500">Total Questions</p><p className="text-2xl font-bold">{totalQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500">Correct</p><p className="text-2xl font-bold text-green-600">{correctQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500">Wrong</p><p className="text-2xl font-bold text-red-600">{wrongQ}</p></div>
          <div className="card"><p className="text-xs text-slate-500">Grade</p><p className={`text-2xl font-bold ${getLetterGradeColor(accuracy)}`}>{getLetterGrade(accuracy)}</p></div>
        </div>

        {/* Time Taken + Mastery Level + Security Events */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {analytics?.time_taken_seconds && (
            <div className="card flex items-center gap-3">
              <Clock size={20} className="text-primary-600" />
              <div><p className="text-xs text-slate-500">Time Taken</p><p className="text-lg font-bold">{Math.floor(analytics.time_taken_seconds / 60)}m {analytics.time_taken_seconds % 60}s</p></div>
            </div>
          )}
          {analytics?.mastery_level && (
            <div className="card flex items-center gap-3">
              <Award size={20} className={`${analytics.mastery_level === 'MASTERED' ? 'text-green-600' : analytics.mastery_level === 'PROFICIENT' ? 'text-blue-600' : analytics.mastery_level === 'EXCELLENT' ? 'text-primary-600' : analytics.mastery_level === 'GOOD' ? 'text-amber-600' : 'text-red-600'}`} />
              <div><p className="text-xs text-slate-500">Mastery Level</p><p className="text-lg font-bold">{analytics.mastery_level}</p></div>
            </div>
          )}
          {application?.security_events && Array.isArray(application.security_events) && application.security_events.length > 0 && (
            <div className="card flex items-center gap-3">
              <Shield size={20} className="text-amber-600" />
              <div>
                <p className="text-xs text-slate-500">Security Events</p>
                <p className="text-lg font-bold text-amber-600">{application.security_events.length}</p>
                <p className="text-xs text-slate-400">
                  {application.security_events.filter((e: any) => e.type === 'tab_switch').length} tab switches
                  {application.security_events.filter((e: any) => e.type === 'fullscreen_exit').length > 0 ? `, ${application.security_events.filter((e: any) => e.type === 'fullscreen_exit').length} fullscreen exits` : ''}
                </p>
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {activeTab === 'subjects' && (
        <>
        {/* Subject Radar Chart */}
        {(radarData.length >= 3 || topicEntries.length >= 3) && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={16} /> {radarData.length >= 3 ? 'Subject Performance Radar' : 'Topic Performance Radar'}</h3>
            <div className="w-full max-w-md mx-auto">
              <ResponsiveContainer width="100%" height={300}>
                {radarData.length >= 3 ? (
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.2} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                  </RadarChart>
                ) : (
                  <RadarChart data={topicEntries.map(([topic, d]: [string, any]) => ({ topic, score: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0, fullMark: 100 }))}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                  </RadarChart>
                )}
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
            {/* Subject Bar Chart */}
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
        </>
        )}

        {activeTab === 'difficulty' && (
        <>
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
        </>
        )}

        {activeTab === 'questions' && (
        <>
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
        </>
        )}

        {activeTab === 'recommendations' && (
        <>
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

        {/* Pathway Recommendations */}
        {pathwayRecs.length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><GraduationCap size={16} /> Recommended Academic Pathways</h3>
            <div className="space-y-3">
              {pathwayRecs.map((pr, i) => (
                <div key={pr.label} className="flex items-center gap-3">
                  <span className="w-48 text-sm text-slate-700 font-medium truncate shrink-0">{i + 1}. {pr.label}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pr.score}%`, backgroundColor: pr.color }} />
                  </div>
                  <span className="w-10 text-xs font-bold text-right text-slate-600">{pr.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations for Improvement */}
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
        </>
        )}
      </div>
    </DashboardLayout>
  );
}
