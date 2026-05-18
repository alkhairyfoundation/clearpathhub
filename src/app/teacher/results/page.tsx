'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Award, Save, ArrowLeft, BarChart3, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Result, Subject, Profile } from '@/types';
import SendResultButton from '@/components/SendResultButton';

export default function TeacherResultsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<(Result & { student?: Profile; subject?: Subject })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', subject_id: '', exam_type: 'ca1' as const, score: 0, grade: '', remarks: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      // Get teacher's subjects and their class IDs
      const { data: teacherSubjects } = await supabase
        .from('subjects')
        .select('id, class_id')
        .eq('teacher_id', profile?.id);

      const teacherSubjectIds = teacherSubjects?.map(s => s.id) || [];
      const teacherClassIds = Array.from(new Set(teacherSubjects?.map(s => s.class_id).filter(Boolean) || []));

      const [resRes, subsRes, stuRes] = await Promise.all([
        teacherSubjectIds.length > 0
          ? supabase.from('results').select('*, student:profiles!student_id(*), subject:subjects!subject_id(*)').in('subject_id', teacherSubjectIds).order('created_at', { ascending: false }).limit(50)
          : { data: [], error: null },
        supabase.from('subjects').select('*').eq('teacher_id', profile?.id).order('name'),
        teacherClassIds.length > 0
          ? supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name)').in('class_id', teacherClassIds).then(r => ({ data: r.data?.map(s => s.profile).filter(Boolean) || [], error: r.error }))
          : { data: [], error: null },
      ]);
      if (resRes.error) throw new Error(resRes.error.message);
      if (resRes.data) setResults(resRes.data);
      if (subsRes.data) setSubjects(subsRes.data);
      if (stuRes.data) setStudents(stuRes.data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.student_id || !formData.subject_id) { setError('Student and subject are required'); return; }
    setError(''); setSuccess('');
    try {
      const grade = calculateGrade(formData.score);
      const { error } = await supabase.from('results').insert({ student_id: formData.student_id, subject_id: formData.subject_id, exam_type: formData.exam_type, score: formData.score, grade, remarks: formData.remarks, entered_by: profile?.id });
      if (error) throw new Error(error.message);
      setSuccess('Result saved');
      setTimeout(() => { setShowModal(false); setFormData({ student_id: '', subject_id: '', exam_type: 'ca1', score: 0, grade: '', remarks: '' }); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function calculateGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  const scores = results.map(r => r.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passRate = scores.length > 0 ? Math.round((scores.filter(s => s >= 50).length / scores.length) * 100) : 0;

  const subjectStats: Record<string, { name: string; scores: number[]; count: number }> = {};
  results.forEach(r => {
    const key = r.subject?.id || 'unknown';
    if (!subjectStats[key]) subjectStats[key] = { name: r.subject?.name || 'Unknown', scores: [], count: 0 };
    subjectStats[key].scores.push(r.score);
    subjectStats[key].count++;
  });
  const subjectSummary = Object.entries(subjectStats).map(([id, d]) => ({
    id, name: d.name, avg: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length), count: d.count,
  })).sort((a, b) => b.avg - a.avg);

  const studentStats: Record<string, { name: string; scores: number[]; count: number }> = {};
  results.forEach(r => {
    const key = r.student?.id || 'unknown';
    if (!studentStats[key]) studentStats[key] = { name: `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim() || 'Unknown', scores: [], count: 0 };
    studentStats[key].scores.push(r.score);
    studentStats[key].count++;
  });
  const studentSummary = Object.entries(studentStats).map(([id, d]) => ({
    id, name: d.name, avg: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length), count: d.count,
  })).sort((a, b) => a.avg - b.avg);

  const atRisk = studentSummary.filter(s => s.avg < 50);
  const gradeDist = ['A+', 'A', 'B', 'C', 'D', 'F'].map(g => ({
    grade: g, count: results.filter(r => r.grade === g).length,
  }));

  return (
    <DashboardLayout title="Results" subtitle="Enter and manage student results">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Results</h1>
              <p className="text-slate-500">Enter and manage student results</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSummary(!showSummary)} className="btn-outline flex items-center gap-2"><BarChart3 size={18} />{showSummary ? 'Hide Summary' : 'Summary'}</button>
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Enter Result</button>
          </div>
        </div>

        {showSummary && (
          <div className="space-y-4 animate-scale-in">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6"><p className="text-sm text-slate-500">Total Results</p><p className="text-2xl font-bold text-slate-800">{results.length}</p></div>
              <div className="bg-white rounded-xl shadow-md p-6"><p className="text-sm text-slate-500">Average Score</p><p className={`text-2xl font-bold ${avgScore >= 70 ? 'text-green-600' : avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avgScore}%</p></div>
              <div className="bg-white rounded-xl shadow-md p-6"><p className="text-sm text-slate-500">Pass Rate</p><p className={`text-2xl font-bold ${passRate >= 70 ? 'text-green-600' : passRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{passRate}%</p></div>
              <div className="bg-white rounded-xl shadow-md p-6"><p className="text-sm text-slate-500">Students</p><p className="text-2xl font-bold text-slate-800">{studentSummary.length}</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary-600" />Subject Performance</h3>
                {subjectSummary.length === 0 ? <p className="text-sm text-slate-500">No data</p> : (
                  <div className="space-y-3">{subjectSummary.map(s => (
                    <div key={s.id}><div className="flex justify-between text-sm mb-1"><span>{s.name}</span><span className={`font-bold ${s.avg >= 70 ? 'text-green-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avg}%</span></div><div className="w-full bg-slate-100 rounded-full h-2"><div className="h-2 rounded-full bg-primary-500" style={{ width: `${s.avg}%` }} /></div></div>
                  ))}</div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Award size={18} className="text-purple-600" />Grade Distribution</h3>
                <div className="space-y-2">{gradeDist.filter(g => g.count > 0).map(g => {
                  const pct = Math.round((g.count / results.length) * 100);
                  return (<div key={g.grade} className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-slate-100">{g.grade}</span><div className="flex-1 bg-slate-100 rounded-full h-3"><div className="h-3 rounded-full bg-primary-500" style={{ width: `${pct}%` }} /></div><span className="text-sm text-slate-500 w-8 text-right">{g.count}</span></div>);
                })}</div>
              </div>
            </div>

            {atRisk.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2"><AlertTriangle size={18} />At-Risk Students (Average &lt; 50%)</h3>
                <div className="flex flex-wrap gap-2">{atRisk.map(s => <span key={s.id} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">{s.name} (avg {s.avg}%)</span>)}</div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Users size={18} className="text-green-600" />Student Performance Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-4">Student</th><th className="py-2 pr-4">Results</th><th className="py-2 pr-4">Average</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4"></th></tr></thead>
                  <tbody>{studentSummary.map(s => {
                    const studentRes = results.filter(r => r.student?.id === s.id).map(r => ({
                      subject_name: r.subject?.name || 'Unknown',
                      exam_type: r.exam_type,
                      score: r.score,
                      grade: r.grade || '',
                    }));
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium text-slate-800">{s.name}</td>
                        <td className="py-2 pr-4 text-slate-500">{s.count}</td>
                        <td className={`py-2 pr-4 font-bold ${s.avg >= 70 ? 'text-green-600' : s.avg >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.avg}%</td>
                        <td className="py-2 pr-4">{s.avg >= 70 ? <span className="text-green-600 text-xs font-medium">Good</span> : s.avg >= 50 ? <span className="text-amber-600 text-xs font-medium">Average</span> : <span className="text-red-600 text-xs font-medium">At Risk</span>}</td>
                        <td className="py-2 pr-4">
                          {studentRes.length > 0 && (
                            <SendResultButton
                              studentId={s.id}
                              studentName={s.name}
                              results={studentRes}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div></div> : results.length === 0 ? <div className="p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No results yet</p></div> : (
            <table className="w-full">
              <thead className="bg-gray-50"><tr><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Student</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Subject</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Exam</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Score</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Grade</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Date</th></tr></thead>
              <tbody>{results.map((r) => (<tr key={r.id} className="border-t hover:bg-gray-50"><td className="py-4 px-6">{r.student?.first_name} {r.student?.last_name}</td><td className="py-4 px-6">{r.subject?.name || '-'}</td><td className="py-4 px-6 capitalize">{r.exam_type}</td><td className="py-4 px-6 font-bold">{r.score}</td><td className="py-4 px-6"><span className={`px-2 py-1 rounded text-xs font-medium ${r.grade?.includes('A') ? 'bg-green-100 text-green-700' : r.grade?.includes('F') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{r.grade}</span></td><td className="py-4 px-6 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td></tr>))}</tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Enter Result</h2></div>
              <div className="p-6 space-y-4">
                <div><label className="label">Student</label><select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="input"><option value="">Select Student</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
                <div><label className="label">Subject</label><select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div><label className="label">Exam Type</label><select value={formData.exam_type} onChange={(e) => setFormData({ ...formData, exam_type: e.target.value as any })} className="input"><option value="ca1">CA 1</option><option value="ca2">CA 2</option><option value="ca3">CA 3</option><option value="exam">Exam</option></select></div>
                <div><label className="label">Score</label><input type="number" value={formData.score} onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value), grade: calculateGrade(parseInt(e.target.value)) })} className="input" max={100} /></div>
                <div><label className="label">Grade</label><input type="text" value={formData.grade || calculateGrade(formData.score)} disabled className="input bg-gray-50" /></div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save size={18} />Save</button></div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
