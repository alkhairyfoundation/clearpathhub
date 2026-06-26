'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Award, TrendingUp, BookOpen, Calendar, ArrowLeft, AlertTriangle, TrendingDown, BarChart3, PieChart, Download, Loader2, FileText } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardLayout from '@/components/DashboardLayout';

export default function StudentResultsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [testAttempts, setTestAttempts] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [resRes, testsRes, quizzesRes, settingsRes] = await Promise.all([
      supabase.from('results').select('*, subject:subjects!subject_id(*)').eq('student_id', profile?.id).order('created_at', { ascending: false }),
      fetch(`/api/test-attempts?studentId=${profile?.id}`).then(r => r.json()),
      supabase.from('quiz_attempts').select('*, quiz:quizzes!quiz_id(title)').eq('student_id', profile?.id).order('completed_at', { ascending: false }),
      supabase.from('school_settings').select('*').limit(1).maybeSingle(),
    ]);
    if (resRes.data) setResults(resRes.data);
    if (testsRes.attempts) setTestAttempts(testsRes.attempts);
    if (quizzesRes.data) setQuizAttempts(quizzesRes.data);
    if (settingsRes.data) setSchoolSettings(settingsRes.data);
    setLoading(false);
  }

  const allScores = [
    ...results.map(r => ({ score: r.score, type: 'exam', label: r.subject?.name || 'Exam', date: r.created_at, id: r.id, grade: r.grade, topic_performance: null })),
    ...testAttempts.map(a => ({ score: a.score, type: 'test', label: a.test?.title || 'Test', date: a.completed_at || a.started_at, id: a.id, grade: '', topic_performance: null })),
    ...quizAttempts.map(a => ({ score: a.score, type: 'quiz', label: a.quiz?.title || 'Quiz', date: a.completed_at || a.started_at, id: a.id, grade: '', topic_performance: a.topic_performance })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const scores = allScores.map(s => s.score);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowest = scores.length > 0 ? Math.min(...scores) : 0;

  const subjectAverages: Record<string, { name: string; scores: number[]; count: number }> = {};
  results.forEach(r => {
    const key = r.subject?.id || 'unknown';
    if (!subjectAverages[key]) subjectAverages[key] = { name: r.subject?.name || 'Unknown', scores: [], count: 0 };
    subjectAverages[key].scores.push(r.score);
    subjectAverages[key].count++;
  });
  const subjectBreakdown = Object.entries(subjectAverages).map(([id, data]) => ({
    id,
    name: data.name,
    avg: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
    count: data.count,
  })).sort((a, b) => a.avg - b.avg);

  const weakAreas = subjectBreakdown.filter(s => s.avg < 50);

  const examTypeBreakdown: Record<string, number[]> = {};
  results.forEach(r => {
    if (!examTypeBreakdown[r.exam_type]) examTypeBreakdown[r.exam_type] = [];
    examTypeBreakdown[r.exam_type].push(r.score);
  });
  const examTypeAvgs = Object.entries(examTypeBreakdown).map(([type, scores]) => ({
    type: type.toUpperCase(),
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    count: scores.length,
  }));

  const gradeDist: Record<string, number> = {};
  results.forEach(r => {
    const g = r.grade?.[0] || 'F';
    gradeDist[g] = (gradeDist[g] || 0) + 1;
  });

  const sortedResults = [...allScores].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  function getGradeColor(grade: string) {
    if (grade?.includes('A')) return 'bg-green-100 text-green-700';
    if (grade?.includes('B')) return 'bg-primary-100 text-primary-700';
    if (grade?.includes('C')) return 'bg-yellow-100 text-yellow-700';
    if (grade?.includes('D')) return 'bg-orange-100 text-orange-700';
    if (grade?.includes('F')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  }

  function getLetterGrade(pct: number): string {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  }

  const radarData = subjectBreakdown.map(s => ({
    subject: s.name,
    score: s.avg,
    fullMark: 100,
  }));

  function buildPerformanceText(): string {
    const parts: string[] = [];
    if (avg >= 90) parts.push('Outstanding academic performance. Consistently excellent across all areas.');
    else if (avg >= 80) parts.push('Excellent performance. Strong understanding of core concepts.');
    else if (avg >= 70) parts.push('Good performance with solid comprehension. Continue to build on strengths.');
    else if (avg >= 60) parts.push('Satisfactory performance. Consistent effort needed for improvement.');
    else if (avg >= 50) parts.push('Below average performance. Focused academic support recommended.');
    else parts.push('Academic intervention needed. Comprehensive support required to meet standards.');

    if (weakAreas.length > 0) parts.push(`Weak areas: ${weakAreas.map(s => s.name).join(', ')}.`);
    const strong = subjectBreakdown.filter(s => s.avg >= 70);
    if (strong.length > 0) parts.push(`Strong areas: ${strong.map(s => s.name).join(', ')}.`);
    parts.push(`Overall average: ${avg}% across ${allScores.length} assessments.`);
    return parts.join(' ');
  }

  async function downloadPDF() {
    if (!results.length && !testAttempts.length && !quizAttempts.length) return;
    setDownloading(true);
    try {
      const schoolName = schoolSettings?.school_name || 'ClearPath Edu Hub';
      const primaryColor: [number, number, number] = [30, 58, 95];
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();

      const drawHeader = (d: typeof doc) => {
        d.setFillColor(...primaryColor);
        d.rect(0, 0, pw, 40, 'F');
        d.setFillColor(179, 146, 47);
        d.rect(0, 38, pw, 2, 'F');
        d.setTextColor(255, 255, 255);
        d.setFontSize(20);
        d.setFont('helvetica', 'bold');
        d.text(schoolName, pw / 2, 16, { align: 'center' });
        d.setFontSize(9);
        d.setFont('helvetica', 'normal');
        d.text('ACADEMIC RESULTS REPORT', pw / 2, 24, { align: 'center' });
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

      // Student Info
      const studentInfo = [
        ['Student', `${profile?.first_name || ''} ${profile?.last_name || ''}`],
        ['Email', profile?.email || 'N/A'],
        ['Overall Avg', `${avg}%`],
        ['Highest', `${highest}%`],
        ['Lowest', `${lowest}%`],
        ['Assessments', `${allScores.length}`],
      ];
      studentInfo.forEach(([label, value], i) => {
        const ry = y + i * 5.5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.text(label + ':', 18, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 45, ry);
      });
      y += studentInfo.length * 5.5 + 7;

      // Subject Performance Table
      if (subjectBreakdown.length > 0) {
        autoTable(doc, {
          startY: y, head: [['Subject', 'Avg Score', 'Grade', 'Assessments']],
          body: subjectBreakdown.map(s => [s.name, `${s.avg}%`, getLetterGrade(s.avg), `${s.count}`]),
          theme: 'striped', headStyles: { fillColor: [...primaryColor] as [number, number, number] },
          columnStyles: { 0: { cellWidth: 50 }, 2: { cellWidth: 15 } },
          margin: { left: 14, right: 14 }, tableLineWidth: 0,
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      // Recent Results Table
      if (allScores.length > 0) {
        if (y > 230) { doc.addPage(); y = 45; drawHeader(doc); }
        autoTable(doc, {
          startY: y, head: [['Assessment', 'Type', 'Score', 'Date', 'Subject Breakdown']],
          body: allScores.slice(0, 30).map(r => {
            const tp = r.topic_performance;
            const breakdown = tp?.by_subject ? Object.entries(tp.by_subject).map(([s, d]: any) => `${s}:${d.total > 0 ? Math.round((d.correct/d.total)*100) : 0}%`).join(', ') : '';
            return [r.label, r.type, `${r.score}%`, new Date(r.date).toLocaleDateString(), breakdown || '—'];
          }),
          theme: 'striped', headStyles: { fillColor: [...primaryColor] as [number, number, number] },
          columnStyles: { 4: { cellWidth: 45, fontSize: 6.5 } },
          margin: { left: 14, right: 14 }, tableLineWidth: 0,
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      // Quiz Subject Breakdown Section
      const quizWithBreakdown = quizAttempts.filter(a => a.topic_performance?.by_subject);
      if (quizWithBreakdown.length > 0) {
        if (y + 40 > 250) { doc.addPage(); y = 45; drawHeader(doc); }
        doc.setFillColor(30, 58, 95); doc.rect(14, y - 4, pw - 28, 7, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.text('QUIZ SUBJECT PERFORMANCE', 18, y + 0.5); y += 9;
        quizWithBreakdown.forEach(qa => {
          if (y + 20 > 275) { doc.addPage(); y = 45; drawHeader(doc); }
          const tp = qa.topic_performance;
          doc.setFontSize(7); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'bold');
          doc.text(qa.quiz?.title || 'Quiz', 18, y); y += 4;
          const subjRows = Object.entries(tp.by_subject).map(([s, d]: any) => {
            const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            return [s, `${d.correct}/${d.total}`, `${pct}%`];
          });
          autoTable(doc, {
            startY: y, head: [['Subject', 'Correct/Total', 'Score']],
            body: subjRows, theme: 'striped',
            headStyles: { fillColor: [30, 58, 95] as [number, number, number], fontSize: 7 },
            bodyStyles: { fontSize: 6.5 }, margin: { left: 18, right: 14 }, tableLineWidth: 0,
          });
          y = (doc as any).lastAutoTable.finalY + 4;
        });
      }

      drawFooter(doc);
      doc.save(`Academic_Results_${profile?.first_name || 'Student'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <DashboardLayout title="My Results" subtitle="View your academic performance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">My Results</h1>
            <p className="text-slate-500">View your academic performance</p>
          </div>
          <button onClick={downloadPDF} disabled={downloading || allScores.length === 0} className="btn-outline flex items-center gap-2 disabled:opacity-50">
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {downloading ? 'Generating...' : 'Download Report'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Average</span><Award className="text-primary-600" size={18} /></div><p className={`text-2xl font-bold ${avg >= 70 ? 'text-green-600' : avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avg}%</p></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Highest</span><TrendingUp className="text-green-600" size={18} /></div><p className="text-2xl font-bold text-green-600">{highest}%</p></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Lowest</span><BookOpen className="text-red-600" size={18} /></div><p className="text-2xl font-bold text-red-600">{lowest}%</p></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Assessments</span><Calendar className="text-purple-600" size={18} /></div><p className="text-2xl font-bold text-slate-800">{allScores.length}</p></div>
        </div>

        {subjectBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary-600" />Per-Subject Performance</h3>
              <div className="space-y-3">
                {subjectBreakdown.map(s => (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-sm mb-1"><span className="font-medium text-slate-700">{s.name}</span><span className={`font-bold ${s.avg >= 70 ? 'text-green-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avg}%</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${s.avg >= 70 ? 'bg-green-500' : s.avg >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.avg}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary-600" />Subject Radar</h3>
              {radarData.length >= 3 && (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="#1e3a5f" fill="#1e3a5f" fillOpacity={0.2} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Score']} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
              {radarData.length < 3 && <p className="text-slate-400 text-sm py-8 text-center">Add more subjects to see radar</p>}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><PieChart size={18} className="text-purple-600" />Grade Distribution</h3>
              <div className="space-y-2">
                {Object.entries(gradeDist).sort(([a], [b]) => a.localeCompare(b)).map(([grade, count]) => {
                  const pct = Math.round((count / results.length) * 100);
                  return (
                    <div key={grade} className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${getGradeColor(grade)}`}>{grade}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3">
                        <div className={`h-3 rounded-full ${grade === 'F' ? 'bg-red-500' : grade === 'A' ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-slate-500 w-12 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {subjectBreakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Award size={18} className="text-primary-600" />Performance Insights</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{buildPerformanceText()}</p>
          </div>
        )}

        {weakAreas.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><AlertTriangle size={18} />Weak Areas Need Attention</h3>
            <p className="text-sm text-red-700 mb-3">These subjects are below 50%. Consider extra study and practice.</p>
            <div className="flex flex-wrap gap-2">
              {weakAreas.map(s => <span key={s.id} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{s.name} ({s.avg}%)</span>)}
            </div>
          </div>
        )}

        {examTypeAvgs.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-green-600" />Performance by Assessment Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {examTypeAvgs.map(e => (
                <div key={e.type} className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">{e.type}</p>
                  <p className={`text-xl font-bold mt-1 ${e.avg >= 70 ? 'text-green-600' : e.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{e.avg}%</p>
                  <p className="text-xs text-slate-400">{e.count} exam{e.count > 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {sortedResults.length > 3 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-primary-600" />Score Trend</h3>
            <div className="flex items-end gap-1 h-32">
              {sortedResults.slice(-20).map((r, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600" style={{ height: `${r.score}%`, minHeight: '4px' }} title={`${r.score}%`} />
                  <span className="text-[8px] text-slate-400 rotate-45 origin-left whitespace-nowrap">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : allScores.length === 0 ? <div className="p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No results yet</p></div> : (
            <table className="w-full">
              <thead className="bg-gray-50"><tr><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Assessment</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Type</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Score</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Grade</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Date</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Details</th></tr></thead>
              <tbody>{allScores.map((r) => {
                const grade = results.find(res => res.id === r.id)?.grade || (r.score >= 90 ? 'A+' : r.score >= 80 ? 'A' : r.score >= 70 ? 'B' : r.score >= 60 ? 'C' : r.score >= 50 ? 'D' : 'F');
                const tp = r.topic_performance;
                const subjKeys = tp?.by_subject ? Object.keys(tp.by_subject) : [];
                return (
                <tr key={`${r.type}-${r.id}`} className="border-t hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium text-slate-800">{r.label}</td>
                  <td className="py-4 px-6"><span className={`capitalize text-xs font-semibold px-2 py-0.5 rounded-full ${r.type === 'exam' ? 'bg-primary-100 text-primary-700' : r.type === 'test' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{r.type}</span></td>
                  <td className="py-4 px-6"><span className={`font-bold ${r.score >= 70 ? 'text-green-600' : r.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.score}</span></td>
                  <td className="py-4 px-6"><span className={`px-2 py-1 rounded text-xs font-medium ${getGradeColor(grade)}`}>{grade}</span></td>
                  <td className="py-4 px-6 text-slate-500">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="py-4 px-6">
                    {subjKeys.length > 0 ? (
                      <div className="text-xs text-slate-600 space-y-0.5">
                        {subjKeys.map(sk => {
                          const sd = tp.by_subject[sk];
                          const sp = sd.total > 0 ? Math.round((sd.correct / sd.total) * 100) : 0;
                          return <div key={sk} className="flex items-center gap-1"><span className="font-medium w-16 truncate">{sk}:</span><span className={`font-bold ${sp >= 70 ? 'text-green-600' : sp >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{sp}%</span></div>;
                        })}
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              )})}</tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
