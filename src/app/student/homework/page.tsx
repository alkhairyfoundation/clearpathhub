'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Upload, Check, Clock, FileText } from 'lucide-react';

export default function StudentHomeworkPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [homework, setHomework] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionUrls, setSubmissionUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [hwRes, subRes] = await Promise.all([
      supabase.from('homework').select('*, subject:subjects(*), class:classes(*)').order('due_date', { ascending: true }),
      supabase.from('homework_submissions').select('*, homework:homework(*)').eq('student_id', profile?.id).order('submitted_at', { ascending: false }),
    ]);
    if (hwRes.data) setHomework(hwRes.data);
    if (subRes.data) setMySubmissions(subRes.data);
    setLoading(false);
  }

  async function handleSubmit(homeworkId: string) {
    const url = submissionUrls[homeworkId];
    if (!url) return;
    await supabase.from('homework_submissions').insert({ homework_id: homeworkId, student_id: profile?.id, submission_url: url, submitted_at: new Date().toISOString() });
    setSubmissionUrls({ ...submissionUrls, [homeworkId]: '' });
    fetchData();
  }

  function isSubmitted(homeworkId: string) {
    return mySubmissions.find(s => s.homework_id === homeworkId);
  }

  function isOverdue(dueDate: string) {
    return new Date(dueDate) < new Date();
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Homework</h1><p className="text-slate-500">View and submit homework</p></div>

      {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
        <div className="space-y-4">
          {homework.length === 0 ? <div className="bg-white rounded-xl p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No homework assigned</p></div> :
          homework.map((hw) => {
            const submitted = isSubmitted(hw.id);
            const overdue = !submitted && isOverdue(hw.due_date);
            return (
              <div key={hw.id} className={`bg-white rounded-xl shadow-md p-6 ${overdue ? 'border-l-4 border-red-500' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1">{hw.title}</h3>
                    <p className="text-sm text-slate-500">{hw.subject?.name} • {hw.class?.name}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${submitted ? 'bg-green-100 text-green-700' : overdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {submitted ? 'Submitted' : overdue ? 'Overdue' : 'Pending'}
                  </div>
                </div>
                {hw.description && <p className="text-sm text-slate-600 mb-4">{hw.description}</p>}
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><Clock size={16} />Due: {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : 'No due date'}</span>
                  <span className="flex items-center gap-1"><FileText size={16} />Total: {hw.total_marks} marks</span>
                </div>
                
                {submitted ? (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700"><Check size={18} /><span>Submitted</span></div>
                    {submitted.marks !== null && <p className="text-sm text-green-600 mt-1">Marks: {submitted.marks}/{hw.total_marks}</p>}
                    {submitted.feedback && <p className="text-sm text-green-600 mt-1">Feedback: {submitted.feedback}</p>}
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input type="text" placeholder="Upload your work (URL)" value={submissionUrls[hw.id] || ''} onChange={(e) => setSubmissionUrls({ ...submissionUrls, [hw.id]: e.target.value })} className="input flex-1" />
                    <button onClick={() => handleSubmit(hw.id)} className="btn-primary flex items-center gap-2"><Upload size={18} />Submit</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}