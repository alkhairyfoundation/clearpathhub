'use client';

import {
  BarChart3, BookOpen, Brain, Target, TrendingUp, Award, Star, Zap, Clock,
  CheckCircle, XCircle, AlertTriangle, User, Calendar, FileText, Flame, Activity
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  Legend
} from 'recharts';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const GRADE_COLORS: Record<string, string> = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
const RISK_COLORS: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };

export function MetricCard({ label, value, icon, color }: { label: string; value: string | number | null | undefined; icon: any; color: string }) {
  return (
    <div className="card py-2.5 px-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value ?? 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}

export function TabOverview({ data }: { data: any }) {
  const academicData = data.academic;
  const practiceData = data.practice;
  const homeworkData = data.homework;
  const goalsData = data.goals;
  const islamicData = data.islamic;
  const attendanceData = data.attendance;
  const masteryData = data.mastery;
  const gamificationData = data.gamification;
  const riskData = data.risk;
  const behaviorData = data.behavior;
  const insights = data.insights;

  const radarSubjects = academicData?.subjects?.filter((s: any) => s.total != null).map((s: any) => ({
    subject: s.subject_name, score: s.total, fullMark: 100,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="font-bold text-slate-900 mb-3">Subject Performance Radar</h3>
          {radarSubjects.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarSubjects}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No subject data available</p>}
        </div>
        <div className="card space-y-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><Brain size={16} className="text-primary-500" /> Insights</h3>
          {insights?.strengths?.length > 0 && (
            <div>
              <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1 flex items-center gap-1"><CheckCircle size={12} /> Strengths</p>
              <ul className="space-y-1">{insights.strengths.map((s: string, i: number) => (
                <li key={i} className="text-[11px] text-slate-600 bg-emerald-50 rounded-lg px-2 py-1">{s}</li>
              ))}</ul>
            </div>
          )}
          {insights?.weaknesses?.length > 0 && (
            <div>
              <p className="text-[10px] text-red-600 uppercase font-bold mb-1 flex items-center gap-1"><XCircle size={12} /> Weaknesses</p>
              <ul className="space-y-1">{insights.weaknesses.map((s: string, i: number) => (
                <li key={i} className="text-[11px] text-slate-600 bg-red-50 rounded-lg px-2 py-1">{s}</li>
              ))}</ul>
            </div>
          )}
          {insights?.recommendations?.length > 0 && (
            <div>
              <p className="text-[10px] text-primary-600 uppercase font-bold mb-1 flex items-center gap-1"><Target size={12} /> Recommendations</p>
              <ul className="space-y-1">{insights.recommendations.map((s: string, i: number) => (
                <li key={i} className="text-[11px] text-slate-600 bg-blue-50 rounded-lg px-2 py-1">{s}</li>
              ))}</ul>
            </div>
          )}
          {(!insights?.strengths?.length && !insights?.weaknesses?.length) && <p className="text-sm text-slate-400 text-center py-4">Insufficient data for insights</p>}
        </div>
      </div>
      {academicData?.scores_over_time?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Score Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={academicData.scores_over_time.sort((a: any, b: any) => a.date?.localeCompare(b.date))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card"><p className="text-xs text-slate-500">Total Practice Sessions</p><p className="text-xl font-bold text-slate-900">{practiceData?.summary?.total_sessions || 0}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Homework Completion</p><p className="text-xl font-bold text-slate-900">{homeworkData?.summary?.completion_rate != null ? homeworkData.summary.completion_rate + '%' : 'N/A'}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Goal Completion</p><p className="text-xl font-bold text-slate-900">{goalsData?.summary?.completion_rate != null ? goalsData.summary.completion_rate + '%' : 'N/A'}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Islamic Perfect Days</p><p className="text-xl font-bold text-slate-900">{islamicData?.summary?.perfect_days || 0}</p></div>
      </div>
    </div>
  );
}

export function TabAcademic({ data }: { data: any }) {
  const academicData = data.academic;
  const gradeDist = academicData?.grade_distribution || [];
  const subjects = academicData?.subjects || [];
  const validSubjects = subjects.filter((s: any) => s.total != null);

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-slate-900 mb-3">Subject Scores Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 text-slate-500">Subject</th>
                <th className="text-center py-2 px-2 text-slate-500">CA1</th><th className="text-center py-2 px-2 text-slate-500">CA2</th>
                <th className="text-center py-2 px-2 text-slate-500">CA3</th><th className="text-center py-2 px-2 text-slate-500">Exam</th>
                <th className="text-center py-2 px-2 text-slate-500 font-bold">Total</th>
                <th className="text-center py-2 px-2 text-slate-500">Grade</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s: any) => (
                <tr key={s.subject_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-2 font-medium text-slate-800">{s.subject_name}</td>
                  <td className="text-center py-2 px-2">{s.ca1 ?? '-'}</td>
                  <td className="text-center py-2 px-2">{s.ca2 ?? '-'}</td>
                  <td className="text-center py-2 px-2">{s.ca3 ?? '-'}</td>
                  <td className="text-center py-2 px-2">{s.exam ?? '-'}</td>
                  <td className="text-center py-2 px-2 font-bold">{s.total ?? '-'}</td>
                  <td className="text-center py-2 px-2">
                    <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold ' + (
                      s.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                      s.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                      s.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                      s.grade === 'D' ? 'bg-orange-100 text-orange-700' :
                      s.grade === 'F' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                    )}>{s.grade || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Subject Totals</h3>
          {validSubjects.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={validSubjects}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="subject_name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {validSubjects.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.total >= 80 ? '#10b981' : entry.total >= 60 ? '#f59e0b' : entry.total >= 50 ? '#f97316' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No data</p>}
        </div>
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Grade Distribution</h3>
          {gradeDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={gradeDist} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={100} innerRadius={50} label={({ grade, count }: any) => grade + ': ' + count}>
                  {gradeDist.map((entry: any) => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No grade data</p>}
        </div>
      </div>
    </div>
  );
}

export function TabMastery({ data }: { data: any }) {
  const masteryData = data.mastery;
  const topics = masteryData?.topics || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Avg Mastery</p>
          <p className="text-lg font-bold text-slate-800">{masteryData?.summary?.avg_mastery_score != null ? masteryData.summary.avg_mastery_score + '%' : 'N/A'}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Mastered (80%+)</p>
          <p className="text-lg font-bold text-emerald-600">{masteryData?.summary?.mastered || 0}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Developing</p>
          <p className="text-lg font-bold text-amber-600">{masteryData?.summary?.developing || 0}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Needs Support</p>
          <p className="text-lg font-bold text-red-600">{masteryData?.summary?.needs_support || 0}</p>
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold text-slate-900 mb-3">Topic-Level Mastery Scores</h3>
        {topics.length > 0 ? (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {topics.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className="text-[11px] text-slate-600 w-24 truncate shrink-0" title={t.subject_name + ': ' + t.topic}>{t.topic}</span>
                <span className="text-[10px] text-slate-400 w-20 truncate">{t.subject_name}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: (t.mastery_score || 0) + '%', backgroundColor: (t.mastery_score || 0) >= 80 ? '#10b981' : (t.mastery_score || 0) >= 60 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <span className="text-[11px] font-bold w-10 text-right" style={{ color: (t.mastery_score || 0) >= 80 ? '#059669' : (t.mastery_score || 0) >= 60 ? '#d97706' : '#dc2626' }}>{Math.round(t.mastery_score || 0)}%</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400 text-center py-8">No mastery data available</p>}
      </div>
      {topics.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Mastery Components</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topics.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="topic" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={0} angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="accuracy" name="Accuracy" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="consistency" name="Consistency" fill="#10b981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="recency" name="Recency" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function TabPractice({ data }: { data: any }) {
  const practiceData = data.practice;
  const homeworkData = data.homework;
  const trend = practiceData?.trend || [];
  const diffDist = practiceData?.difficulty_distribution || [];
  const topicAcc = practiceData?.topic_accuracy || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Sessions</p><p className="text-lg font-bold text-slate-800">{practiceData?.summary?.total_sessions || 0}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Avg Score</p><p className="text-lg font-bold text-slate-800">{practiceData?.summary?.avg_score != null ? practiceData.summary.avg_score + '%' : 'N/A'}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Questions</p><p className="text-lg font-bold text-slate-800">{practiceData?.summary?.total_questions || 0}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Homework Rate</p><p className="text-lg font-bold text-slate-800">{homeworkData?.summary?.completion_rate != null ? homeworkData.summary.completion_rate + '%' : 'N/A'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Practice Score Trend</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="avg_score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No practice data</p>}
        </div>
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Difficulty Distribution</h3>
          {diffDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={diffDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="difficulty" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="count" name="Questions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avg_score" name="Avg Score" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No difficulty data</p>}
        </div>
      </div>
      {topicAcc.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Topic Accuracy</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {topicAcc.map((t: any, i: number) => (
              <div key={i} className="bg-slate-50 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-medium text-slate-700">{t.topic}</span>
                  <span className="text-[11px] font-bold" style={{ color: t.accuracy >= 70 ? '#059669' : t.accuracy >= 50 ? '#d97706' : '#dc2626' }}>{t.accuracy}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: t.accuracy + '%', backgroundColor: t.accuracy >= 70 ? '#10b981' : t.accuracy >= 50 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">{t.attempts} attempts, {t.correct} correct</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TabEngagement({ data }: { data: any }) {
  const attendanceData = data.attendance;
  const behaviorData = data.behavior;
  const goalsData = data.goals;
  const accountabilityData = data.accountability;
  const accTrend = accountabilityData?.daily_trend || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Attendance</p><p className="text-lg font-bold text-slate-800">{attendanceData?.summary?.rate != null ? attendanceData.summary.rate + '%' : 'N/A'}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Behavior (Avg)</p><p className="text-lg font-bold text-slate-800">{behaviorData?.summary?.avg_rating != null ? behaviorData.summary.avg_rating + '/5' : 'N/A'}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Accountability</p><p className="text-lg font-bold text-slate-800">{accountabilityData?.summary?.avg_score != null ? accountabilityData.summary.avg_score + '%' : 'N/A'}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Goals Rate</p><p className="text-lg font-bold text-slate-800">{goalsData?.summary?.completion_rate != null ? goalsData.summary.completion_rate + '%' : 'N/A'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Attendance Trend (Monthly)</h3>
          {attendanceData?.monthly_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attendanceData.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" name="Rate %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No attendance data</p>}
        </div>
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Behavioral Rating Trend</h3>
          {behaviorData?.weekly_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={behaviorData.weekly_trend.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week_start" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="rating" name="Overall" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="participation" name="Participation" stroke="#10b981" strokeWidth={1.5} />
                <Line type="monotone" dataKey="punctuality" name="Punctuality" stroke="#f59e0b" strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No behavioral data</p>}
        </div>
      </div>
      {accTrend.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Daily Accountability Score Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={accTrend.slice(0, 30).reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Bar dataKey="total_score" name="Accountability" radius={[3, 3, 0, 0]}>
                {accTrend.slice(0, 30).reverse().map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.total_score >= 75 ? '#10b981' : entry.total_score >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function TabHolistic({ data }: { data: any }) {
  const islamicData = data.islamic;
  const skillsData = data.skills;
  const st = islamicData?.summary?.salah_totals;
  const salahData = st ? [
    { name: 'Fajr', prayed: st.fajr, missed: st.total - st.fajr },
    { name: 'Dhuhr', prayed: st.dhuhr, missed: st.total - st.dhuhr },
    { name: 'Asr', prayed: st.asr, missed: st.total - st.asr },
    { name: 'Maghrib', prayed: st.maghrib, missed: st.total - st.maghrib },
    { name: 'Isha', prayed: st.isha, missed: st.total - st.isha },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Islamic Days</p><p className="text-lg font-bold text-slate-800">{islamicData?.summary?.days_tracked || 0}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Salah Consistency</p><p className="text-lg font-bold text-slate-800">{islamicData?.summary?.salah_consistency != null ? islamicData.summary.salah_consistency + '%' : 'N/A'}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Ayahs Memorized</p><p className="text-lg font-bold text-slate-800">{islamicData?.summary?.total_ayahs_memorized || 0}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Perfect Days</p><p className="text-lg font-bold text-slate-800">{islamicData?.summary?.perfect_days || 0}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Skills Activities</p><p className="text-lg font-bold text-slate-800">{skillsData?.summary?.total_activities || 0}</p>
        </div>
        <div className="card py-2 px-3 text-center">
          <p className="text-xs text-slate-500">Avg Skill Rating</p><p className="text-lg font-bold text-slate-800">{skillsData?.summary?.avg_rating != null ? skillsData.summary.avg_rating + '/5' : 'N/A'}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Salah Performance</h3>
          {salahData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salahData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="prayed" name="Prayed" stackId="a" fill="#10b981" />
                <Bar dataKey="missed" name="Missed" stackId="a" fill="#fca5a5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No salah data</p>}
        </div>
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Skills Activities Breakdown</h3>
          {skillsData?.by_skill?.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={skillsData.by_skill} dataKey="total_minutes" nameKey="skill_name" cx="50%" cy="50%" outerRadius={90} innerRadius={40} label={({ skill_name, total_minutes }: any) => skill_name + ': ' + total_minutes + 'm'}>
                  {skillsData.by_skill.map((entry: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 text-center py-8">No skills data</p>}
        </div>
      </div>
    </div>
  );
}

export function TabRisk({ data }: { data: any }) {
  const riskData = data.risk;
  const promotionData = data.promotion;
  const learningPathData = data.learning_path;
  const retentionData = data.retention;

  const radarData = promotionData ? [
    { subject: 'Academic', score: promotionData.academic_mastery_score || 0, fullMark: 100 },
    { subject: 'Islamic', score: promotionData.islamic_development_score || 0, fullMark: 100 },
    { subject: 'Skills', score: promotionData.skills_development_score || 0, fullMark: 100 },
    { subject: 'Behavior', score: promotionData.behavior_score || 0, fullMark: 100 },
    { subject: 'Attendance', score: promotionData.attendance_score || 0, fullMark: 100 },
    { subject: 'Consistency', score: promotionData.consistency_score || 0, fullMark: 100 },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-slate-900 mb-3">Risk Assessment</h3>
        {riskData?.current ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: (RISK_COLORS[riskData.current.risk_level] || '#94a3b8') + '20' }}>
                <span className="text-xl font-bold" style={{ color: RISK_COLORS[riskData.current.risk_level] || '#94a3b8' }}>{riskData.current.risk_score || '?'}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: RISK_COLORS[riskData.current.risk_level] || '#94a3b8' }}>{(riskData.current.risk_level || 'UNKNOWN').toUpperCase()}</p>
              <p className="text-[10px] text-slate-500">Confidence: {riskData.current.confidence || 'N/A'}</p>
            </div>
            <div className="lg:col-span-2 space-y-2">
              {riskData.current.contributing_factors && typeof riskData.current.contributing_factors === 'object' && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-1">Contributing Factors</p>
                  {Object.entries(riskData.current.contributing_factors).map(([factor, weight]: [string, any]) => (
                    <div key={factor} className="flex items-center gap-2 py-0.5">
                      <span className="text-[11px] text-slate-600 capitalize w-32">{factor.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-red-400" style={{ width: (weight * 100) + '%' }} />
                      </div>
                      <span className="text-[10px] text-slate-500 w-8 text-right">{Math.round(weight * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
              {riskData.current.predicted_outcome && (
                <div className="bg-amber-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-amber-700 font-bold">Predicted Outcome</p>
                  <p className="text-xs text-amber-800">{riskData.current.predicted_outcome}</p>
                </div>
              )}
            </div>
          </div>
        ) : <p className="text-sm text-slate-400 text-center py-6">No risk assessment data available</p>}
      </div>
      {riskData?.history?.length > 1 && (
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-3">Risk Score History</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={riskData.history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="prediction_date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip />
              <Line type="monotone" dataKey="risk_score" name="Risk Score" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="card">
        <h3 className="font-bold text-slate-900 mb-3">Promotion Readiness</h3>
        {promotionData ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-slate-50">
                <span className="text-2xl font-bold" style={{ color: promotionData.overall_score >= 75 ? '#059669' : promotionData.overall_score >= 50 ? '#d97706' : '#dc2626' }}>
                  {Math.round(promotionData.overall_score)}%
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Status: <span className={'px-2 py-0.5 rounded-full text-xs ' + (
                  promotionData.promotion_status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                  promotionData.promotion_status === 'conditional' ? 'bg-amber-100 text-amber-700' :
                  promotionData.promotion_status === 'needs_intervention' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                )}>{(promotionData.promotion_status || 'N/A').replace(/_/g, ' ')}</span></p>
                {promotionData.recommended_next_class && <p className="text-xs text-slate-500">Next: {promotionData.recommended_next_class}</p>}
              </div>
            </div>
            {radarData.length > 0 && (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Radar name="Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            )}
            {promotionData.conditional_requirements?.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-bold text-amber-700 mb-1">Conditional Requirements</p>
                <ul className="space-y-0.5">{promotionData.conditional_requirements.map((req: string, i: number) => (
                  <li key={i} className="text-[11px] text-amber-800 flex items-center gap-1"><AlertTriangle size={10} /> {req}</li>
                ))}</ul>
              </div>
            )}
          </div>
        ) : <p className="text-sm text-slate-400 text-center py-6">No promotion data available</p>}
      </div>
      {learningPathData?.summary?.intervention_needed > 0 && (
        <div className="card bg-red-50 border-red-200">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Topics Requiring Intervention ({learningPathData.summary.intervention_needed})
          </h3>
          <div className="space-y-1">
            {learningPathData.subjects?.map((sub: any, si: number) =>
              sub.stages?.filter((st: any) => st.intervention).map((st: any, ti: number) => (
                <div key={si + '-' + ti} className="text-xs text-slate-700 bg-white rounded-lg px-3 py-1.5">
                  {sub.subject_name}: {st.topic} (Stage: {st.stage}, {st.attempts} attempts)
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {retentionData?.summary?.total_checks > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-900 mb-2">Knowledge Retention</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 rounded-lg p-2"><p className="text-lg font-bold text-emerald-600">{retentionData.summary.passed}</p><p className="text-[10px] text-slate-500">Passed</p></div>
            <div className="bg-red-50 rounded-lg p-2"><p className="text-lg font-bold text-red-600">{retentionData.summary.failed}</p><p className="text-[10px] text-slate-500">Failed</p></div>
            <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-bold text-slate-600">{retentionData.summary.pending}</p><p className="text-[10px] text-slate-500">Pending</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
