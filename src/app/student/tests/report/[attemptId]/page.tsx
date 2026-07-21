'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Loader2, AlertCircle, CheckCircle, XCircle, Clock, Award, BarChart3,
  Brain, Target, TrendingUp, TrendingDown, Minus, Download, Share2,
  FileText, Shield, AlertTriangle, ArrowLeft, Eye
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { formatDate, formatDateTime } from '@/lib/date-utils';

const COLORS = ['#b3922f', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function TestReportPage({ params }: { params: { attemptId: string } }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!profile) { router.push('/login'); return; }
    if (!['student', 'teacher', 'admin', 'parent'].includes(profile.role)) { router.push('/login'); return; }
    fetchReport();
  }, [profile]);

  async function fetchReport() {
    try {
      const [res, settingsRes] = await Promise.all([
        fetch(`/api/tests/report/${params.attemptId}`),
        supabase.from('school_settings').select('*').limit(1).maybeSingle(),
      ]);
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setData(result.data);
      setSchoolSettings(settingsRes.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendToParent() {
    if (!data) return;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      const { data: student } = await supabase
        .from('students')
        .select('*, parent:parent_id!inner(profiles!profile_id(phone, email))')
        .eq('profile_id', profile?.id)
        .maybeSingle();
      if (!student) { alert('No parent contact found.'); return; }
      const parentProfile = (student as any).parent?.profiles;
      if (!parentProfile) { alert('No parent contact found.'); return; }
      const { phone, email } = parentProfile;

      const subjLines = data.subjectPerformance.map((s: any) =>
        `  ${s.name}: ${s.correct}/${s.total} (${s.percentage}%)`
      ).join('\n');
      const studentDisplay = data.student?.name || `${profile?.first_name} ${profile?.last_name}`;
      const message = `*Test Report*\n\nStudent: ${studentDisplay}\nTest: ${data.test.title}\nClass: ${data.test.class_name}\nScore: ${data.attempt.score}% (${data.attempt.passed ? '✅ Passed' : '❌ Failed'})\n\n*Subject Breakdown:*\n${subjLines}\n\nView full report: ${window.location.href}`;

      const mode = window.confirm('Send via WhatsApp? OK = WhatsApp, Cancel = Email');
      if (mode) {
        if (phone) window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        else alert('No phone number found.');
      } else {
        if (email) window.open(`mailto:${email}?subject=Test Report - ${data.test.title}&body=${encodeURIComponent(message)}`, '_blank');
        else alert('No email found.');
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  async function handleDownloadPdf() {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      if (!data) return;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      let y = 15;
      let page = 1;

      const schoolName = schoolSettings?.school_name || 'ClearPath Edu Hub';
      const pdfHeader = () => {
        doc.setFillColor(30, 58, 95);
        doc.rect(0, 0, pageW, 38, 'F');
        doc.setFillColor(179, 146, 47);
        doc.rect(0, 36, pageW, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, pageW / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Test Report', pageW / 2, 23, { align: 'center' });
        doc.setFontSize(7);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageW / 2, 31, { align: 'center' });
        y = 52;
      };
      const checkPage = () => {
        if (y > 265) { doc.addPage(); page++; y = 15; pdfHeader(); }
      };

      pdfHeader();
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const studentDisplay = data.student?.name || `${profile?.first_name} ${profile?.last_name}`;
      doc.text(`Student: ${studentDisplay}`, 15, y); y += 6;
      doc.text(`Test: ${data.test.title}`, 15, y); y += 6;
      doc.text(`Class: ${data.test.class_name} | Subject: ${data.test.subject_name}`, 15, y); y += 6;
      doc.text(`Score: ${data.attempt.score}% - ${data.attempt.passed ? 'Passed' : 'Failed'}`, 15, y); y += 6;
      if (data.attempt.time_taken) {
        const mins = Math.floor(data.attempt.time_taken / 60);
        const secs = data.attempt.time_taken % 60;
        doc.text(`Time Taken: ${mins}m ${secs}s`, 15, y); y += 6;
      }
      y += 4;

      // Subject Performance table
      doc.setFontSize(13);
      doc.setTextColor(179, 146, 47);
      doc.text('Subject Performance', 15, y); y += 8;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const subjRows = data.subjectPerformance.map((s: any) => [s.name, `${s.correct}/${s.total}`, `${s.percentage}%`]);
      autoTable(doc, {
        startY: y, head: [['Subject', 'Correct/Total', 'Score']],
        body: subjRows, theme: 'grid', headStyles: { fillColor: [179, 146, 47] },
        styles: { fontSize: 9 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Topic Breakdown per Subject
      if (data.subjectTopicBreakdown && data.subjectTopicBreakdown.length > 0) {
        checkPage();
        doc.setFontSize(13);
        doc.setTextColor(179, 146, 47);
        doc.text('Topic Breakdown by Subject', 15, y); y += 8;
        for (const st of data.subjectTopicBreakdown) {
          checkPage();
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          doc.text(`Subject: ${st.subject}`, 15, y); y += 6;
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          const topicRows = st.topics.map((t: any) => [t.name, `${t.correct}/${t.total}`, `${t.percentage}%`]);
          autoTable(doc, {
            startY: y, head: [['Topic', 'Correct/Total', 'Score']],
            body: topicRows, theme: 'grid', headStyles: { fillColor: [100, 100, 100] },
            styles: { fontSize: 8 },
          });
          y = (doc as any).lastAutoTable.finalY + 6;
        }
        y += 4;
      }

      // Per-Question Analysis
      checkPage();
      doc.setFontSize(13);
      doc.setTextColor(179, 146, 47);
      doc.text('Per-Question Analysis', 15, y); y += 8;
      const qRows = data.questions.map((q: any) => [
        `Q${q.index}`, q.subject.substring(0, 12), q.topic.substring(0, 12), q.is_correct ? '✓' : '✗',
        `${q.points_earned}/${q.points}`
      ]);
      autoTable(doc, {
        startY: y, head: [['#', 'Subject', 'Topic', 'Result', 'Points']],
        body: qRows, theme: 'grid', headStyles: { fillColor: [179, 146, 47] },
        styles: { fontSize: 7 },
        columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 12 }, 4: { cellWidth: 15 } },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // Difficulty Breakdown
      if (data.difficultyBreakdown.length > 0) {
        checkPage();
        doc.setFontSize(13);
        doc.setTextColor(179, 146, 47);
        doc.text('Difficulty Breakdown', 15, y); y += 8;
        const diffRows = data.difficultyBreakdown.map((d: any) => [d.level, `${d.correct}/${d.total}`, `${d.percentage}%`]);
        autoTable(doc, {
          startY: y, head: [['Level', 'Correct/Total', 'Score']],
          body: diffRows, theme: 'grid', headStyles: { fillColor: [179, 146, 47] },
          styles: { fontSize: 9 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Weak Topics
      if (data.topicPerformance && data.topicPerformance.length > 0) {
        checkPage();
        doc.setFontSize(13);
        doc.setTextColor(179, 146, 47);
        doc.text('All Topics Performance', 15, y); y += 8;
        const topRows = data.topicPerformance.map((t: any) => [t.name, `${t.correct}/${t.total}`, `${t.percentage}%`]);
        autoTable(doc, {
          startY: y, head: [['Topic', 'Correct/Total', 'Score']],
          body: topRows, theme: 'grid', headStyles: { fillColor: [179, 146, 47] },
          styles: { fontSize: 9 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Insights
      checkPage();
      doc.setFontSize(13);
      doc.setTextColor(179, 146, 47);
      doc.text('Performance Insights', 15, y); y += 8;

      doc.setFontSize(10);
      if (data.insights.strengths.length > 0) {
        doc.setTextColor(0, 128, 0);
        doc.text('Strengths:', 15, y); y += 5;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        data.insights.strengths.forEach((s: string) => { checkPage(); doc.text(`  ✓ ${s}`, 15, y); y += 5; });
        y += 3;
      }
      if (data.insights.needsImprovement.length > 0) {
        checkPage();
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.text('Needs Improvement:', 15, y); y += 5;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        data.insights.needsImprovement.forEach((s: string) => { checkPage(); doc.text(`  ✗ ${s}`, 15, y); y += 5; });
        y += 3;
      }
      if (data.insights.weakTopics.length > 0) {
        checkPage();
        doc.setFontSize(10);
        doc.setTextColor(180, 120, 0);
        doc.text('Topics to Focus On:', 15, y); y += 5;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        data.insights.weakTopics.forEach((t: string) => { checkPage(); doc.text(`  • ${t}`, 15, y); y += 5; });
      }

      // Footer
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(30, 58, 95);
      doc.rect(0, pageH - 12, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(schoolName + ' — Official Document', pageW / 2, pageH - 6, { align: 'center' });
      doc.text('This report is system-generated and does not require a signature.', pageW / 2, pageH - 2.5, { align: 'center' });

      doc.save(`Test_Report_${data.test.subject_code || 'test'}_${profile?.id?.substring(0, 8)}.pdf`);
    } catch (pdfErr: any) {
      console.error('PDF generation error:', pdfErr);
      alert('Failed to generate PDF: ' + pdfErr.message);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Test Report" subtitle="Loading analysis...">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Test Report" subtitle="Error">
        <div className="text-center py-20 text-red-500">{error}</div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const { attempt, test, questions, subjectPerformance, difficultyBreakdown, topicPerformance, subjectTopicBreakdown, insights } = data;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'subjects', label: 'Subjects' },
    { id: 'difficulty', label: 'Difficulty & Topics' },
    { id: 'questions', label: 'Questions' },
    { id: 'insights', label: 'Insights' },
    { id: 'security', label: 'Security Log' },
  ];
  if (subjectTopicBreakdown && subjectTopicBreakdown.length > 0) {
    tabs.splice(2, 0, { id: 'topic-breakdown', label: 'Topics by Subject' });
  }

  return (
    <DashboardLayout title={test.title} subtitle={`Report • ${test.subject_name} • ${test.class_name}`}>
      {/* School Branding Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/student/tests" className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft size={20} className="text-white/80" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{schoolSettings?.school_name || 'ClearPath Edu Hub'}</h1>
              <p className="text-primary-200 text-sm">Student Test Report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary-200 text-sm">{test.subject_name}</p>
            <p className="text-white font-semibold">{test.class_name}</p>
          </div>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Student</p>
            <p className="font-semibold text-slate-800 dark:text-white">
              {profile?.first_name} {profile?.last_name}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Class</p>
            <p className="font-semibold text-slate-800 dark:text-white">{test.class_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Subject</p>
            <p className="font-semibold text-slate-800 dark:text-white">{test.subject_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Test Date</p>
            <p className="font-semibold text-slate-800 dark:text-white">
              {attempt.completed_at
                ? new Date(attempt.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                : attempt.started_at
                  ? new Date(attempt.started_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'N/A'
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Time Taken</p>
            <p className="font-semibold text-slate-800 dark:text-white">
              {attempt.time_taken ? `${Math.floor(attempt.time_taken / 60)}m ${attempt.time_taken % 60}s` : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={handleDownloadPdf} className="btn-outline flex items-center gap-2 text-sm">
          <Download size={16} /> Download PDF
        </button>
        <button onClick={handleSendToParent} className="btn-primary flex items-center gap-2 text-sm">
          <Share2 size={16} /> Share with Parent
        </button>
      </div>

      {/* Score Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Score</p>
          <p className={`text-3xl font-bold ${attempt.passed ? 'text-green-600' : 'text-red-600'}`}>{attempt.score}%</p>
          <p className={`text-xs font-semibold mt-1 ${attempt.passed ? 'text-green-500' : 'text-red-500'}`}>
            {attempt.passed ? 'Passed' : 'Failed'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Correct</p>
          <p className="text-3xl font-bold text-primary-600">{attempt.correct_answers}/{attempt.total_questions}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Time Taken</p>
          <p className="text-3xl font-bold text-blue-600">
            {attempt.time_taken ? `${Math.floor(attempt.time_taken / 60)}m ${attempt.time_taken % 60}s` : '--'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Security</p>
          <p className="text-3xl font-bold text-amber-600">
            {(attempt.tab_switches || 0) + (attempt.fullscreen_exits || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">tab switches + exits</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Radar Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
                {subjectPerformance.length >= 3 ? 'Subject Performance Radar' : topicPerformance.length >= 3 ? 'Topic Performance Radar' : 'Performance Overview'}
              </h3>
              {subjectPerformance.length >= 3 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={subjectPerformance}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Radar name="Score" dataKey="percentage" stroke="#b3922f" fill="#b3922f" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : topicPerformance.length >= 3 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={topicPerformance.map((t: any) => ({ name: t.name, percentage: t.percentage, fullMark: 100 }))}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Radar name="Score" dataKey="percentage" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-500 text-sm">Not enough data points to display radar chart.</p>
              )}
            </div>

            {/* Subject Bars */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Subject Scores</h3>
              <div className="space-y-3">
                {subjectPerformance.map((s: any, i: number) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 dark:text-slate-300">{s.name}</span>
                      <span className="text-slate-500 dark:text-slate-400">{s.correct}/{s.total} ({s.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{ width: `${s.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="font-semibold text-green-700 dark:text-green-400">Strengths ({insights.strengths.length})</p>
                  {insights.strengths.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {insights.strengths.map((s: string) => <li key={s} className="text-green-600 dark:text-green-300">✓ {s}</li>)}
                    </ul>
                  ) : <p className="text-green-500 mt-1">None identified</p>}
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="font-semibold text-red-700 dark:text-red-400">Needs Improvement ({insights.needsImprovement.length})</p>
                  {insights.needsImprovement.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {insights.needsImprovement.map((s: string) => <li key={s} className="text-red-600 dark:text-red-300">✗ {s}</li>)}
                    </ul>
                  ) : <p className="text-red-500 mt-1">All subjects performing well!</p>}
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Weak Topics ({insights.weakTopics.length})</p>
                  {insights.weakTopics.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {insights.weakTopics.slice(0, 5).map((t: string) => <li key={t} className="text-amber-600 dark:text-amber-300">• {t}</li>)}
                    </ul>
                  ) : <p className="text-amber-500 mt-1">No weak topics!</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Subject Performance Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Subject</th>
                    <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Correct</th>
                    <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Total</th>
                    <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Score</th>
                    <th className="py-3 px-2 w-1/3"><span className="sr-only">Bar</span></th>
                  </tr>
                </thead>
                <tbody>
                  {subjectPerformance.map((s: any, i: number) => (
                    <tr key={s.name} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-medium">{s.name}</td>
                      <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{s.correct}</td>
                      <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{s.total}</td>
                      <td className="py-3 px-2 text-center font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{s.percentage}%</td>
                      <td className="py-3 px-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                          <div className="h-3 rounded-full" style={{ width: `${s.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'difficulty' && (
          <div className="space-y-6">
            {difficultyBreakdown.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Difficulty Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Level</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Correct</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Total</th>
                        <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Score</th>
                        <th className="py-3 px-2 w-1/3"><span className="sr-only">Bar</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {difficultyBreakdown.map((d: any) => (
                        <tr key={d.level} className="border-b border-slate-100 dark:border-slate-700/50">
                          <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-medium capitalize">{d.level}</td>
                          <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{d.correct}</td>
                          <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{d.total}</td>
                          <td className="py-3 px-2 text-center font-semibold text-primary-600">{d.percentage}%</td>
                          <td className="py-3 px-2">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                              <div className="h-3 rounded-full bg-primary-600" style={{ width: `${d.percentage}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {topicPerformance.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Topic Performance</h3>
                <div className="space-y-3">
                  {topicPerformance.map((t: any) => (
                    <div key={t.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                        <span className="text-slate-500 dark:text-slate-400">{t.correct}/{t.total} ({t.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${t.percentage >= 70 ? 'bg-green-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${t.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'topic-breakdown' && subjectTopicBreakdown && (
          <div className="space-y-6">
            {subjectTopicBreakdown.map((st: any) => (
              <div key={st.subject} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{st.subject}</h3>
                <p className="text-xs text-slate-500 mb-4">Topic-level breakdown</p>
                <div className="space-y-3">
                  {st.topics.map((t: any) => (
                    <div key={t.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                        <span className="text-slate-500 dark:text-slate-400">{t.correct}/{t.total} ({t.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${t.percentage >= 70 ? 'bg-green-500' : t.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${t.percentage}%` }}
                        />
                      </div>
                      {t.percentage < 50 && (
                        <p className="text-xs text-red-500 mt-0.5">Needs revision — focus on this topic</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Per-Question Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">#</th>
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Question</th>
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Subject</th>
                    <th className="text-left py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Topic</th>
                    <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Result</th>
                    <th className="text-center py-3 px-2 text-slate-600 dark:text-slate-400 font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q: any) => (
                    <tr key={q.index} className={`border-b border-slate-100 dark:border-slate-700/50 ${q.is_correct ? '' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
                      <td className="py-3 px-2 text-slate-500 dark:text-slate-400">Q{q.index}</td>
                      <td className="py-3 px-2 text-slate-800 dark:text-slate-200 max-w-xs truncate">{q.question}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{q.subject}</td>
                      <td className="py-3 px-2 text-slate-600 dark:text-slate-400">{q.topic}</td>
                      <td className="py-3 px-2 text-center">
                        {q.is_correct ? (
                          <CheckCircle size={18} className="text-green-500 inline" />
                        ) : (
                          <XCircle size={18} className="text-red-500 inline" />
                        )}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-600 dark:text-slate-400">{q.points_earned}/{q.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'security' && data?.securityEvents && (
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Security Event Log</h3>
            {data.securityEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Shield size={40} className="mx-auto mb-3 text-emerald-400" />
                <p className="font-medium">No security events recorded</p>
                <p className="text-sm">This test was completed without any suspicious activity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.securityEvents.map((evt: any, i: number) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                    evt.severity === 'high' ? 'bg-red-50 border border-red-200' :
                    evt.severity === 'medium' ? 'bg-amber-50 border border-amber-200' :
                    'bg-slate-50 border border-slate-200'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      evt.severity === 'high' ? 'bg-red-200' :
                      evt.severity === 'medium' ? 'bg-amber-200' :
                      'bg-slate-200'
                    }`}>
                      {evt.event_type === 'tab_switch' ? <AlertTriangle size={16} /> :
                       evt.event_type === 'fullscreen_exit' ? <XCircle size={16} /> :
                       evt.event_type === 'page_reload' ? <AlertCircle size={16} /> :
                       evt.event_type === 'back_navigation' ? <ArrowLeft size={16} /> :
                       evt.event_type === 'copy_attempt' ? <FileText size={16} /> :
                       evt.event_type === 'screenshot' ? <Eye size={16} /> :
                       evt.event_type === 'keyboard_shortcut' ? <AlertTriangle size={16} /> : <AlertCircle size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        evt.severity === 'high' ? 'text-red-700' :
                        evt.severity === 'medium' ? 'text-amber-700' :
                        'text-slate-700'
                      }`}>
                        {evt.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDateTime(evt.created_at)}
                        {evt.event_data?.count ? ` · Count: ${evt.event_data.count}` : ''}
                        {evt.event_data?.key ? ` · Key: ${evt.event_data.key}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      evt.severity === 'high' ? 'bg-red-200 text-red-700' :
                      evt.severity === 'medium' ? 'bg-amber-200 text-amber-700' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {evt.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block"></span> High severity</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block"></span> Medium severity</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 inline-block"></span> Low severity</span>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Performance Insights</h3>
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  insights.overall === 'Good' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  insights.overall === 'Average' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {insights.overall}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-sm">Overall Performance Level</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                {attempt.passed
                  ? `You scored ${attempt.score}% which is a passing score. `
                  : `You scored ${attempt.score}% which is below the passing mark of ${test.passing_score || 50}%. `}
                {subjectPerformance.length} subject(s) assessed across {attempt.total_questions} questions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.strengths.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
                    <TrendingUp size={18} /> Strengths
                  </h4>
                  <ul className="space-y-2">
                    {insights.strengths.map((s: string) => (
                      <li key={s} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{s} — performing well above average.</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {insights.needsImprovement.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
                    <TrendingDown size={18} /> Needs Improvement
                  </h4>
                  <ul className="space-y-2">
                    {insights.needsImprovement.map((s: string) => (
                      <li key={s} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{s} — needs focused attention.</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {insights.weakTopics.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h4 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
                  <AlertCircle size={18} /> Topics to Focus On
                </h4>
                <ul className="space-y-2">
                  {insights.weakTopics.slice(0, 8).map((t: string) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Target size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h4 className="font-semibold text-primary-700 dark:text-primary-400 flex items-center gap-2 mb-3">
                <Brain size={18} /> Recommendations
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {insights.needsImprovement.length > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600 font-bold">•</span>
                    <span>Focus on improving <strong>{insights.needsImprovement.join(', ')}</strong>. Review the relevant topics and practice more questions.</span>
                  </li>
                )}
                {insights.weakTopics.length > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600 font-bold">•</span>
                    <span>Pay special attention to <strong>{insights.weakTopics.slice(0, 3).join(', ')}</strong> — these topics need revision.</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">•</span>
                  <span>Review incorrect answers in the Questions tab to understand mistakes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">•</span>
                  <span>Practice regularly to strengthen weak areas and maintain strong subjects.</span>
                </li>
                {attempt.time_taken && attempt.time_taken > (test.duration_minutes || 30) * 60 * 0.9 && (
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600 font-bold">•</span>
                    <span>Work on time management — you used most of the allotted time.</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
    </DashboardLayout>
  );
}
