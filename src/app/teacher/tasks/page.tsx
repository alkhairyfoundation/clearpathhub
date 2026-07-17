'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, uploadFile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, BookOpen, CheckCircle, Clock, Loader2, Upload, FileText, Award, X, Calendar, ExternalLink } from 'lucide-react';

export default function TeacherTasksPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'pending' | 'submitted' | 'graded'>('pending');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchTasks();
  }, [profile]);

  async function fetchTasks() {
    setLoading(true);
    const { data } = await supabase
      .from('teacher_tasks')
      .select('*')
      .eq('teacher_id', profile?.id)
      .order('created_at', { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!selectedTask) return;
    if (!submissionText.trim() && !submissionFile) return;
    setSubmitting(true);
    setError('');
    try {
      let submissionUrl = submissionText.trim();
      if (submissionFile) {
        const { url } = await uploadFile('homework', submissionFile, `task-${selectedTask.id}`);
        if (url) submissionUrl = url;
      }
      const { error: updateError } = await supabase
        .from('teacher_tasks')
        .update({ status: 'submitted', submission_url: submissionUrl })
        .eq('id', selectedTask.id);
      if (updateError) throw new Error(updateError.message);
      setSuccess('Task submitted successfully');
      setSelectedTask(null);
      setSubmissionText('');
      setSubmissionFile(null);
      fetchTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit task');
    }
    setSubmitting(false);
  }

  const taskTypeIcons: Record<string, { bg: string; color: string }> = {
    reading: { bg: 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400 dark:text-blue-400' },
    study: { bg: 'bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400 dark:text-purple-400' },
    project: { bg: 'bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400 dark:text-green-400' },
    research: { bg: 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400 dark:text-amber-400' },
    other: { bg: 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700', color: 'text-slate-600 dark:text-slate-400 dark:text-slate-400' },
  };

  const filteredTasks = tasks.filter(t => t.status === tab);
  const counts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    graded: tasks.filter(t => t.status === 'graded').length,
  };

  return (
    <DashboardLayout title="My Tasks" subtitle="View and submit tasks assigned by admin">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">My Tasks</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">View, submit, and track tasks assigned by the admin</p>
          </div>
        </div>

        {success && <div className="bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 dark:border-green-900/40 rounded-lg p-3 text-green-700 dark:text-green-300 dark:text-green-300 text-sm">{success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{counts.pending}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Pending</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 dark:text-blue-400">{counts.submitted}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Submitted</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">{counts.graded}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Graded</p>
          </div>
        </div>

        <div className="card">
          <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg p-1">
            {(['pending', 'submitted', 'graded'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-all capitalize ${tab === t ? 'bg-white text-primary-600 dark:text-primary-400 dark:text-primary-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 dark:text-slate-300'}`}>
                {t} ({counts[t]})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400 dark:text-slate-400"><BookOpen size={48} className="mx-auto mb-4 opacity-50" /><p>No {tab} tasks</p></div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(task => {
                const typeStyle = taskTypeIcons[task.task_type] || taskTypeIcons.other;
                return (
                  <div key={task.id} className="p-4 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeStyle.bg}`}>
                          <FileText size={20} className={typeStyle.color} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white dark:text-white">{task.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 capitalize">{task.task_type}{task.due_date ? ` • Due ${new Date(task.due_date).toLocaleDateString()}` : ''}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${task.status === 'graded' ? 'bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300' : task.status === 'submitted' ? 'bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300'}`}>{task.status}</span>
                    </div>
                    {task.description && <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-3">{task.description}</p>}
                    <div className="flex items-center gap-3">
                      {task.status === 'pending' && (
                        <button onClick={() => setSelectedTask(task)} className="btn-primary text-sm px-4 py-1.5">Submit Task</button>
                      )}
                      {task.status === 'graded' && task.admin_grade !== null && (
                        <div className="flex items-center gap-2">
                          <Award size={16} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" />
                          <span className="font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{task.admin_grade}/100</span>
                        </div>
                      )}
                      {task.feedback && <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Feedback: {task.feedback}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">Submit Task</h3>
                <button onClick={() => { setSelectedTask(null); setSubmissionText(''); setSubmissionFile(null); }} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white dark:text-white">{selectedTask.title}</p>
                  {selectedTask.description && <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-1">{selectedTask.description}</p>}
                  {selectedTask.due_date && <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1 flex items-center gap-1"><Calendar size={12} />Due: {new Date(selectedTask.due_date).toLocaleDateString()}</p>}
                </div>
                <div>
                  <label className="label">Your Answer</label>
                  <textarea value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} className="input w-full" rows={4} placeholder="Type your submission here..." />
                </div>
                <div>
                  <label className="label">Or upload a file</label>
                  <input type="file" onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} className="input" />
                  {submissionFile && <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">{submissionFile.name}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-white sticky bottom-0">
                <button onClick={() => { setSelectedTask(null); setSubmissionText(''); setSubmissionFile(null); }} className="btn-ghost">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || (!submissionText.trim() && !submissionFile)} className="btn-primary disabled:opacity-50">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : <><Upload size={16} /> Submit</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
