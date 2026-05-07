'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Trash2, Award, Save } from 'lucide-react';
import type { Result, Subject, Profile } from '@/types';

export default function TeacherResultsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<(Result & { student?: Profile; subject?: Subject })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', subject_id: '', exam_type: 'ca1' as const, score: 0, grade: '', remarks: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [resRes, subsRes, stuRes] = await Promise.all([
      supabase.from('results').select('*, student:profiles(*), subject:subjects(*)').order('created_at', { ascending: false }).limit(50),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'student').order('first_name'),
    ]);
    if (resRes.data) setResults(resRes.data);
    if (subsRes.data) setSubjects(subsRes.data);
    if (stuRes.data) setStudents(stuRes.data);
    setLoading(false);
  }

  async function handleSave() {
    const grade = calculateGrade(formData.score);
    await supabase.from('results').insert({ id: crypto.randomUUID(), ...formData, grade, entered_by: profile?.id });
    setShowModal(false); setFormData({ student_id: '', subject_id: '', exam_type: 'ca1', score: 0, grade: '', remarks: '' }); fetchData();
  }

  function calculateGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  return (
    <DashboardLayout title="Results" subtitle="Enter and manage student results">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-slate-800">Results</h1><p className="text-slate-500">Enter and manage student results</p></div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Enter Result</button>
        </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {loading ? <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div> : results.length === 0 ? <div className="p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No results yet</p></div> : (
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Student</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Subject</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Exam</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Score</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Grade</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500">Date</th></tr></thead>
            <tbody>{results.map((r) => (<tr key={r.id} className="border-t hover:bg-gray-50"><td className="py-4 px-6">{r.student?.first_name} {r.student?.last_name}</td><td className="py-4 px-6">{r.subject?.name || '-'}</td><td className="py-4 px-6 capitalize">{r.exam_type}</td><td className="py-4 px-6">{r.score}</td><td className="py-4 px-6"><span className={`px-2 py-1 rounded text-xs font-medium ${r.grade?.includes('A') ? 'bg-green-100 text-green-700' : r.grade?.includes('F') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{r.grade}</span></td><td className="py-4 px-6 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td></tr>))}</tbody>
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