'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, Star, Trophy, Calendar, CheckCircle, Clock, Users, BookOpen, Award, UserCheck } from 'lucide-react';

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
  const [formData, setFormData] = useState({
    teacher_id: '', task_type: 'reading', title: '', description: '', due_date: ''
  });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [tasksRes, evalsRes, teachersRes] = await Promise.all([
      supabase.from('teacher_tasks').select('*, teacher:profiles(*)').order('due_date', { ascending: false }),
      supabase.from('teacher_evaluations').select('*, teacher:profiles(*)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('role', 'teacher').order('first_name'),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (evalsRes.data) setEvaluations(evalsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setLoading(false);
  }

  async function handleCreateTask() {
    await supabase.from('teacher_tasks').insert({ ...formData, created_by: profile?.id, status: 'pending' });
    setShowTaskModal(false);
    setFormData({ teacher_id: '', task_type: 'reading', title: '', description: '', due_date: '' });
    fetchData();
  }

  async function handleGradeTask(id: string, grade: number) {
    await supabase.from('teacher_tasks').update({ status: 'graded', admin_grade: grade }).eq('id', id);
    fetchData();
  }

  async function handleCreateEvaluation() {
    await supabase.from('teacher_evaluations').insert({
      teacher_id: selectedTeacher.id,
      evaluation_type: 'task',
      title: 'Performance Review',
      description: 'End of term evaluation',
      due_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    setShowEvalModal(false);
    fetchData();
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'graded');
  const topTeachers = teachers.map(t => ({
    id: t.id,
    name: `${t.first_name} ${t.last_name}`,
    score: Math.round(Math.random() * 30 + 70),
    tasks: tasks.filter(task => task.teacher_id === t.id && task.admin_grade).reduce((sum, task) => sum + (task.admin_grade || 0), 0)
  })).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Teacher Evaluation</h1><p className="text-slate-500">Evaluate teacher performance and assign tasks</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowTaskModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Assign Task</button>
          <button onClick={() => { setSelectedTeacher(teachers[0]); setShowEvalModal(true); }} className="btn-outline flex items-center gap-2"><Star size={20} />New Evaluation</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Tasks</span><BookOpen size={18} className="text-blue-600" /></div><p className="text-2xl font-bold text-slate-800">{tasks.length}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Pending</span><Clock size={18} className="text-yellow-600" /></div><p className="text-2xl font-bold text-yellow-600">{pendingTasks.length}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Completed</span><CheckCircle size={18} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{completedTasks.length}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Evaluations</span><Star size={18} className="text-purple-600" /></div><p className="text-2xl font-bold text-purple-600">{evaluations.length}</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex gap-4 mb-6 border-b">
          {(['tasks', 'evaluations', 'leaderboard'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-medium ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {tasks.length === 0 ? <div className="text-center py-8 text-slate-500">No tasks assigned</div> : 
            tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${task.task_type === 'reading' ? 'bg-blue-100 text-blue-600' : task.task_type === 'study' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                    <BookOpen size={20} />
                  </div>
                  <div><p className="font-medium text-slate-800">{task.title}</p><p className="text-sm text-slate-500">{task.teacher?.first_name} {task.teacher?.last_name}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${task.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{task.status}</span>
                  {task.status === 'pending' && <span className="text-sm text-slate-500">{new Date(task.due_date).toLocaleDateString()}</span>}
                  {task.status === 'graded' && <span className="font-bold text-blue-600">{task.admin_grade}/100</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center"><Trophy className="text-white" size={24} /></div>
              <h3 className="text-xl font-bold text-slate-800">Teacher Leaderboard</h3>
            </div>
            {topTeachers.map((teacher, index) => (
              <div key={teacher.id} className={`flex items-center justify-between p-4 rounded-lg ${index === 0 ? 'bg-yellow-50 border border-yellow-300' : index === 1 ? 'bg-gray-50 border border-gray-300' : index === 2 ? 'bg-orange-50 border border-orange-300' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-400 text-white' : index === 2 ? 'bg-orange-400 text-white' : 'bg-gray-200'}`}>{index + 1}</div>
                  <div><p className="font-medium text-slate-800">{teacher.name}</p><p className="text-sm text-slate-500">{teacher.tasks} pts</p></div>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} size={16} className={i < teacher.score / 20 ? 'text-yellow-500' : 'text-gray-300'} fill={i < teacher.score / 20 ? 'currentColor' : 'none'} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Assign Task</h2><button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="label">Teacher</label><select value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })} className="input"><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
              <div><label className="label">Task Type</label><select value={formData.task_type} onChange={(e) => setFormData({ ...formData, task_type: e.target.value })} className="input"><option value="reading">Reading</option><option value="study">Study</option><option value="project">Project</option><option value="research">Research</option><option value="other">Other</option></select></div>
              <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" /></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} /></div>
              <div><label className="label">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="input" /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowTaskModal(false)} className="btn-outline">Cancel</button><button onClick={handleCreateTask} className="btn-primary">Assign Task</button></div>
          </div>
        </div>
      )}
    </div>
  );
}