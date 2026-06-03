'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Plus, Edit, Trash2, X, Star, Trophy, Calendar, CheckCircle, Clock, BookOpen, Loader2, Search, Award } from 'lucide-react';

export default function AdminEvaluationPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'evaluations' | 'leaderboard'>('tasks');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ teacher_id: '', task_type: 'reading', title: '', description: '', due_date: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [tasksRes, evalsRes, teachersRes] = await Promise.all([
      supabase.from('teacher_tasks').select('*, teacher:profiles!teacher_id(first_name, last_name)').order('due_date', { ascending: false }),
      supabase.from('teacher_evaluations').select('*, teacher:profiles!teacher_id(first_name, last_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'teacher').order('first_name'),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (evalsRes.data) setEvaluations(evalsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setLoading(false);
  }

  async function handleCreateTask() {
    if (!formData.teacher_id) { setError('Please select a teacher'); return; }
    if (!formData.title.trim()) { setError('Title is required'); return; }
    setError(''); setSaving(true);
    try {
      const { error } = await supabase.from('teacher_tasks').insert({ ...formData, created_by: profile?.id, status: 'pending' });
      if (error) throw new Error(error.message);
      setSuccess('Task assigned successfully');
      setShowTaskModal(false);
      setFormData({ teacher_id: '', task_type: 'reading', title: '', description: '', due_date: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to assign task');
    } finally {
      setSaving(false);
    }
  }

  async function handleGradeTask(id: string, grade: number) {
    try {
      const { error } = await supabase.from('teacher_tasks').update({ status: 'graded', admin_grade: grade }).eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Task graded');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.message);
    }
    fetchData();
  }

  async function handleCreateEvaluation() {
    if (!selectedTeacher) { setError('Please select a teacher'); return; }
    setError(''); setSaving(true);
    try {
      const { error } = await supabase.from('teacher_evaluations').insert({
        teacher_id: selectedTeacher.id, evaluation_type: 'task', title: 'Performance Review',
        description: 'End of term evaluation', due_date: new Date().toISOString().split('T')[0], status: 'pending'
      });
      if (error) throw new Error(error.message);
      setSuccess('Evaluation created');
      setShowEvalModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create evaluation');
    } finally {
      setSaving(false);
    }
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const gradedTasks = tasks.filter(t => t.status === 'graded');

  const teacherScores = teachers.map(t => {
    const teacherTasks = tasks.filter(task => task.teacher_id === t.id && task.admin_grade);
    const avgGrade = teacherTasks.length > 0 ? Math.round(teacherTasks.reduce((sum, task) => sum + (task.admin_grade || 0), 0) / teacherTasks.length) : 0;
    return { id: t.id, name: `${t.first_name} ${t.last_name}`, avgGrade, tasksCompleted: teacherTasks.length, totalTasks: tasks.filter(t => t.teacher_id === t.id).length };
  }).sort((a, b) => b.avgGrade - a.avgGrade);

  const filteredTasks = tasks.filter(t =>
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.teacher?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.teacher?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const taskTypeIcons: Record<string, { bg: string; color: string }> = {
    reading: { bg: 'bg-primary-100', color: 'text-primary-600' }, study: { bg: 'bg-purple-100', color: 'text-purple-600' },
    project: { bg: 'bg-green-100', color: 'text-green-600' }, research: { bg: 'bg-amber-100', color: 'text-amber-600' },
  };

  return (
    <DashboardLayout title="Teacher Evaluation" subtitle="Assign tasks, evaluate performance, and track progress">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Teacher Evaluation</h1>
            <p className="text-slate-500 mt-1">Assign tasks, evaluate performance, and track progress</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTaskModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} />Assign Task</button>
            <button onClick={() => { setSelectedTeacher(teachers[0]); setShowEvalModal(true); }} className="btn-outline flex items-center gap-2"><Star size={18} />Evaluate</button>
          </div>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Total Tasks</span><BookOpen size={16} className="text-primary-600" /></div><p className="text-2xl font-bold text-slate-900">{tasks.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Pending</span><Clock size={16} className="text-amber-600" /></div><p className="text-2xl font-bold text-amber-600">{pendingTasks.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Graded</span><CheckCircle size={16} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{gradedTasks.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Evaluations</span><Star size={16} className="text-purple-600" /></div><p className="text-2xl font-bold text-purple-600">{evaluations.length}</p></div>
      </div>

      <div className="card">
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1">
          {(['tasks', 'evaluations', 'leaderboard'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'tasks' && (
          <>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
            {loading ? <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div> :
            filteredTasks.length === 0 ? <div className="text-center py-16"><BookOpen className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No tasks assigned yet</p></div> :
            <div className="space-y-3">
              {filteredTasks.map(task => {
                const typeStyle = taskTypeIcons[task.task_type] || taskTypeIcons.reading;
                return (
                  <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeStyle.bg}`}>
                        <BookOpen size={20} className={typeStyle.color} />
                      </div>
                      <div><p className="font-semibold text-slate-900">{task.title}</p><p className="text-sm text-slate-500">{task.teacher?.first_name} {task.teacher?.last_name}{task.due_date ? ` • Due ${new Date(task.due_date).toLocaleDateString()}` : ''}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${task.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{task.status}</span>
                      {task.status === 'pending' && (
                        <div className="flex gap-1">
                          {[70, 80, 90, 100].map(grade => (
                            <button key={grade} onClick={() => handleGradeTask(task.id, grade)} className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:bg-primary-50 hover:border-primary-300">{grade}</button>
                          ))}
                        </div>
                      )}
                      {task.status === 'graded' && <span className="font-bold text-primary-600">{task.admin_grade}/100</span>}
                    </div>
                  </div>
                );
              })}
            </div>}
          </>
        )}

        {activeTab === 'evaluations' && (
          evaluations.length === 0 ? <div className="text-center py-16"><Star className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No evaluations yet</p></div> :
          <div className="space-y-3">
            {evaluations.map(eval_ => (
              <div key={eval_.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center"><Award size={20} className="text-purple-600" /></div>
                  <div><p className="font-semibold text-slate-900">{eval_.title}</p><p className="text-sm text-slate-500">{eval_.teacher?.first_name} {eval_.teacher?.last_name} • {new Date(eval_.created_at).toLocaleDateString()}</p></div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${eval_.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{eval_.status}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Trophy className="text-amber-600" size={20} /></div>
              <h3 className="text-lg font-bold text-slate-900">Teacher Performance Rankings</h3>
            </div>
            {teacherScores.length === 0 ? <p className="text-center text-slate-500 py-8">No task data available</p> :
            teacherScores.map((teacher, index) => (
              <div key={teacher.id} className={`flex items-center justify-between p-4 rounded-xl border ${index === 0 ? 'bg-amber-50 border-amber-200' : index === 1 ? 'bg-slate-50 border-slate-200' : index === 2 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-amber-400 text-white' : index === 1 ? 'bg-slate-400 text-white' : index === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 text-slate-600'}`}>{index + 1}</div>
                  <div><p className="font-semibold text-slate-900">{teacher.name}</p><p className="text-xs text-slate-500">{teacher.tasksCompleted}/{teacher.totalTasks} tasks graded</p></div>
                </div>
                <div className="flex items-center gap-1">
                  {teacher.avgGrade > 0 ? (
                    <>
                      {[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < Math.round(teacher.avgGrade / 20) ? 'text-amber-400' : 'text-slate-200'} fill={i < Math.round(teacher.avgGrade / 20) ? 'currentColor' : 'none'} />)}
                      <span className="ml-2 font-bold text-slate-900">{teacher.avgGrade}</span>
                    </>
                  ) : <span className="text-sm text-slate-400">Not graded</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl"><h3 className="text-lg font-bold text-slate-900">Assign Task</h3><button onClick={() => setShowTaskModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label">Teacher</label><select value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })} className="input"><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
              <div><label className="label">Task Type</label><select value={formData.task_type} onChange={(e) => setFormData({ ...formData, task_type: e.target.value })} className="input"><option value="reading">Reading</option><option value="study">Study</option><option value="project">Project</option><option value="research">Research</option><option value="other">Other</option></select></div>
              <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" /></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} /></div>
              <div><label className="label">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="input" /></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-white sticky bottom-0"><button onClick={() => setShowTaskModal(false)} className="btn-ghost">Cancel</button><button onClick={handleCreateTask} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Assigning...' : 'Assign Task'}</button></div>
          </div>
        </div>
      )}

      {showEvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl"><h3 className="text-lg font-bold text-slate-900">New Evaluation</h3><button onClick={() => setShowEvalModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label">Teacher</label><select value={selectedTeacher?.id || ''} onChange={(e) => setSelectedTeacher(teachers.find(t => t.id === e.target.value))} className="input"><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 bg-white sticky bottom-0"><button onClick={() => setShowEvalModal(false)} className="btn-ghost">Cancel</button><button onClick={handleCreateEvaluation} disabled={saving || !selectedTeacher} className="btn-primary disabled:opacity-50">{saving ? 'Creating...' : 'Create Evaluation'}</button></div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
