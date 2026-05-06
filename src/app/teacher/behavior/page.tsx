'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Activity, Star, Edit, Trash2, X, Send, Calendar, User } from 'lucide-react';

export default function TeacherBehaviorPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '', week_start: '', week_end: '', rating: 3, punctuality: 3, class_participation: 3, homework_completion: 3, behavior: '', teacher_notes: ''
  });

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [reportsRes, studentsRes] = await Promise.all([
      supabase.from('behavioral_reports').select('*, student:profiles(*)').order('week_start', { ascending: false }).limit(50),
      supabase.from('profiles').select('*').eq('role', 'student').order('first_name'),
    ]);
    if (reportsRes.data) setReports(reportsRes.data);
    if (studentsRes.data) setStudents(studentsRes.data);
    setLoading(false);
  }

  async function handleSave() {
    await supabase.from('behavioral_reports').insert({ ...formData, student_id: formData.student_id || null, entered_by: profile?.id });
    setShowModal(false); setFormData({ student_id: '', week_start: '', week_end: '', rating: 3, punctuality: 3, class_participation: 3, homework_completion: 3, behavior: '', teacher_notes: '' }); fetchData();
  }

  function getWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    setFormData({ ...formData, week_start: startOfWeek.toISOString().split('T')[0], week_end: endOfWeek.toISOString().split('T')[0] });
  }

  function RatingStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => onChange(star)} className={`text-2xl ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Behavioral Reports</h1><p className="text-slate-500">Weekly behavior reports for students</p></div>
        <button onClick={() => { getWeekRange(); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={20} />Create Report</button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : reports.length === 0 ? <div className="text-center py-12 text-slate-500"><Activity size={48} className="mx-auto mb-4 opacity-50" /><p>No behavior reports yet</p></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <div key={report.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><User className="text-blue-600" size={20} /></div>
                  <div><p className="font-medium text-slate-800">{report.student?.first_name} {report.student?.last_name}</p><p className="text-xs text-slate-500">{new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}</p></div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                  <div><div className="text-lg font-bold text-yellow-500">{report.rating}★</div><div className="text-xs text-slate-500">Overall</div></div>
                  <div><div className="text-lg font-bold text-blue-500">{report.punctuality}</div><div className="text-xs text-slate-500">Punctual</div></div>
                  <div><div className="text-lg font-bold text-emerald-500">{report.class_participation}</div><div className="text-xs text-slate-500">Class</div></div>
                  <div><div className="text-lg font-bold text-purple-500">{report.homework_completion}</div><div className="text-xs text-slate-500">Homework</div></div>
                </div>
                {report.teacher_notes && <p className="text-sm text-slate-600 italic">"{report.teacher_notes}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">New Behavior Report</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="label">Student</label><select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="input"><option value="">Select Student</option>{students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Week Start</label><input type="date" value={formData.week_start} onChange={(e) => setFormData({ ...formData, week_start: e.target.value })} className="input" /></div>
                <div><label className="label">Week End</label><input type="date" value={formData.week_end} onChange={(e) => setFormData({ ...formData, week_end: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Overall Rating</label><RatingStars value={formData.rating} onChange={(v) => setFormData({ ...formData, rating: v })} /></div>
              <div><label className="label">Punctuality (1-5)</label><input type="range" min="1" max="5" value={formData.punctuality} onChange={(e) => setFormData({ ...formData, punctuality: parseInt(e.target.value) })} className="w-full" /><div className="text-center">{formData.punctuality}</div></div>
              <div><label className="label">Class Participation (1-5)</label><input type="range" min="1" max="5" value={formData.class_participation} onChange={(e) => setFormData({ ...formData, class_participation: parseInt(e.target.value) })} className="w-full" /><div className="text-center">{formData.class_participation}</div></div>
              <div><label className="label">Homework Completion (1-5)</label><input type="range" min="1" max="5" value={formData.homework_completion} onChange={(e) => setFormData({ ...formData, homework_completion: parseInt(e.target.value) })} className="w-full" /><div className="text-center">{formData.homework_completion}</div></div>
              <div><label className="label">Behavior Notes</label><textarea value={formData.behavior} onChange={(e) => setFormData({ ...formData, behavior: e.target.value })} className="input" rows={2} placeholder="General behavior observations" /></div>
              <div><label className="label">Teacher Notes</label><textarea value={formData.teacher_notes} onChange={(e) => setFormData({ ...formData, teacher_notes: e.target.value })} className="input" rows={2} placeholder="Private notes for parent" /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSave} className="btn-primary flex items-center gap-2"><Send size={18} />Submit Report</button></div>
          </div>
        </div>
      )}
    </div>
  );
}