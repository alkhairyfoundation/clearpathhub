'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Activity, Star, Edit, Trash2, X, Send, Calendar, User, ArrowLeft, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export default function TeacherBehaviorPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    student_id: '', week_start: '', week_end: '', rating: 3, punctuality: 3, class_participation: 3, homework_completion: 3, behavior: '', teacher_notes: '',
    title: '', type: 'general', severity: 'medium'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('class_id')
        .eq('teacher_id', profile?.id);

      const teacherClassIds = Array.from(new Set(subjectData?.map(s => s.class_id).filter(Boolean) || []));

      const [reportsRes, studentsRes] = await Promise.all([
        supabase.from('behavioral_reports').select('*, student:profiles!student_id(*)').order('created_at', { ascending: false }).limit(50),
        teacherClassIds.length > 0
          ? supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name)').in('class_id', teacherClassIds).then(r => ({ data: r.data?.map(s => s.profile).filter(Boolean) || [], error: r.error }))
          : supabase.from('profiles').select('*').eq('role', 'student').order('first_name'),
      ]);
      if (reportsRes.error) throw new Error(reportsRes.error.message);
      if (reportsRes.data) setReports(reportsRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.student_id || !formData.week_start) { setError('Student and week start are required'); return; }
    setError(''); setSuccess('');
    try {
      const { error } = await supabase.from('behavioral_reports').insert({
        student_id: formData.student_id,
        week_start: formData.week_start,
        week_end: formData.week_end,
        rating: formData.rating,
        punctuality: formData.punctuality,
        class_participation: formData.class_participation,
        homework_completion: formData.homework_completion,
        behavior: formData.behavior,
        teacher_notes: formData.teacher_notes,
        entered_by: profile?.id,
        title: formData.title || `Weekly Report`,
        type: formData.type,
        severity: formData.severity
      });
      if (error) throw new Error(error.message);
      setSuccess('Report saved successfully');
      setTimeout(() => {
        setShowModal(false);
        setFormData({
          student_id: '', week_start: '', week_end: '', rating: 3, punctuality: 3,
          class_participation: 3, homework_completion: 3, behavior: '', teacher_notes: '',
          title: '', type: 'general', severity: 'medium'
        });
        fetchData();
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function getWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    setFormData({
      ...formData,
      week_start: startOfWeek.toISOString().split('T')[0],
      week_end: endOfWeek.toISOString().split('T')[0]
    });
  }

  function RatingStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" onClick={() => onChange(star)} className={`text-2xl transition-colors ${star <= value ? 'text-yellow-400' : 'text-gray-200 hover:text-gray-300'}`}>★</button>
        ))}
      </div>
    );
  }

  return (
    <DashboardLayout title="Behavioral Reports" subtitle="Weekly behavior reports for students">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Behavioral Reports</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Weekly behavior reports for students</p>
            </div>
          </div>
          <button onClick={() => { getWeekRange(); setShowModal(true); }} className="btn-primary flex items-center justify-center gap-2">
            <Plus size={20} /> Create Report
          </button>
        </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400 dark:text-slate-400">
            <Activity size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">No behavior reports yet</p>
            <p className="text-sm opacity-60">Create your first report to start tracking student progress</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {reports.map((report) => (
              <div key={report.id} className="p-5 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 dark:border-slate-700 hover:border-slate-200 dark:border-slate-700 dark:border-slate-700 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      <User className="text-primary-600 dark:text-primary-400 dark:text-primary-400" size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white dark:text-white">{report.student?.first_name} {report.student?.last_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    report.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400' :
                    report.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                    report.severity === 'medium' ? 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300' :
                    'bg-slate-200 text-slate-600 dark:text-slate-400 dark:text-slate-400'
                  }`}>
                    {report.severity}
                  </span>
                </div>

                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-2">{report.title || 'Weekly Report'}</p>

                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <div className="text-sm font-bold text-yellow-500 dark:text-yellow-400 dark:text-yellow-400">{report.rating}★</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Rating</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <div className="text-sm font-bold text-blue-500 dark:text-blue-400 dark:text-blue-400">{report.punctuality}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Punctual</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <div className="text-sm font-bold text-emerald-500">{report.class_participation}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">Class</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <div className="text-sm font-bold text-purple-500 dark:text-purple-400 dark:text-purple-400">{report.homework_completion}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium">H.Work</div>
                  </div>
                </div>

                {report.behavior && <p className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2 line-clamp-2">{report.behavior}</p>}
                {report.teacher_notes && <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 italic border-l-2 border-slate-200 dark:border-slate-700 dark:border-slate-700 pl-3">"{report.teacher_notes}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">New Behavior Report</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full transition-colors">
                <X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">
                  <AlertCircle size={20} /> {error}
                </div>
              )}
              {success && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm">
                  <Info size={20} /> {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Target Student</label>
                  <select value={formData.student_id} onChange={(e) => setFormData({ ...formData, student_id: e.target.value })} className="input">
                    <option value="">Select Student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Report Title</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input" placeholder="e.g. Week 4 Performance" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Report Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input">
                    <option value="general">General Performance</option>
                    <option value="academic">Academic Focus</option>
                    <option value="discipline">Behavioral/Discipline</option>
                    <option value="attendance">Attendance Related</option>
                  </select>
                </div>
                <div>
                  <label className="label">Severity Level</label>
                  <select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})} className="input">
                    <option value="low">Low (Routine)</option>
                    <option value="medium">Medium (Notable)</option>
                    <option value="high">High (Action Required)</option>
                    <option value="critical">Critical (Immediate Attention)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Overall Rating</label>
                  <div className="pt-1">
                    <RatingStars value={formData.rating} onChange={(v) => setFormData({ ...formData, rating: v })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="label">Week Start</label><input type="date" value={formData.week_start} onChange={(e) => setFormData({ ...formData, week_start: e.target.value })} className="input" /></div>
                <div><label className="label">Week End</label><input type="date" value={formData.week_end} onChange={(e) => setFormData({ ...formData, week_end: e.target.value })} className="input" /></div>
              </div>

              <div className="space-y-4 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300 uppercase tracking-wider">Metrics (1-5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="label text-xs">Punctuality</label>
                    <input type="range" min="1" max="5" value={formData.punctuality} onChange={(e) => setFormData({ ...formData, punctuality: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
                    <div className="text-center font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400 mt-1">{formData.punctuality}</div>
                  </div>
                  <div>
                    <label className="label text-xs">Participation</label>
                    <input type="range" min="1" max="5" value={formData.class_participation} onChange={(e) => setFormData({ ...formData, class_participation: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
                    <div className="text-center font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400 mt-1">{formData.class_participation}</div>
                  </div>
                  <div>
                    <label className="label text-xs">H.Work Completion</label>
                    <input type="range" min="1" max="5" value={formData.homework_completion} onChange={(e) => setFormData({ ...formData, homework_completion: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
                    <div className="text-center font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400 mt-1">{formData.homework_completion}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Detailed Observation</label>
                  <textarea value={formData.behavior} onChange={(e) => setFormData({ ...formData, behavior: e.target.value })} className="input min-h-[100px]" placeholder="Specific observations about student behavior and engagement..." />
                </div>
                <div>
                  <label className="label">Private Teacher Notes (for Parents)</label>
                  <textarea value={formData.teacher_notes} onChange={(e) => setFormData({ ...formData, teacher_notes: e.target.value })} className="input min-h-[100px]" placeholder="Direct feedback or recommendations for parents..." />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 sticky bottom-0">
              <button onClick={() => setShowModal(false)} className="btn-ghost px-6">Cancel</button>
              <button onClick={handleSave} className="btn-primary flex items-center gap-2 px-8">
                <Send size={18} /> Submit Report
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
