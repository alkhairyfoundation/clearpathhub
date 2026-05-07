'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, uploadFile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Upload, Check, Clock, FileText, Paperclip, Image, FileVideo, ExternalLink, Loader2 } from 'lucide-react';

export default function StudentHomeworkPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [homework, setHomework] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionUrls, setSubmissionUrls] = useState<Record<string, string>>({});
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, File[]>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expandedHw, setExpandedHw] = useState<string | null>(null);

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

  async function handleFileUpload(homeworkId: string, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSubmissionFiles(prev => ({ ...prev, [homeworkId]: [...(prev[homeworkId] || []), ...files] }));
  }

  async function handleSubmit(homeworkId: string) {
    const url = submissionUrls[homeworkId] || '';
    const files = submissionFiles[homeworkId] || [];
    if (!url && files.length === 0) return;

    setSubmitting(prev => ({ ...prev, [homeworkId]: true }));
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const { url: fileUrl } = await uploadFile('homework', file, `submissions-${homeworkId}`);
      if (fileUrl) uploadedUrls.push(fileUrl);
    }

    await supabase.from('homework_submissions').insert({
      homework_id: homeworkId,
      student_id: profile?.id,
      submission_url: url || uploadedUrls.join(','),
      submission_files: uploadedUrls.length > 0 ? uploadedUrls : null,
      submitted_at: new Date().toISOString()
    });
    setSubmissionUrls(prev => ({ ...prev, [homeworkId]: '' }));
    setSubmissionFiles(prev => ({ ...prev, [homeworkId]: [] }));
    setSubmitting(prev => ({ ...prev, [homeworkId]: false }));
    fetchData();
  }

  function isSubmitted(homeworkId: string) {
    return mySubmissions.find(s => s.homework_id === homeworkId);
  }

  function isOverdue(dueDate: string) {
    return new Date(dueDate) < new Date();
  }

  function getFileIcon(filename: string) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <Image size={14} className="text-purple-600" />;
    if (['mp4', 'mov', 'avi'].includes(ext || '')) return <FileVideo size={14} className="text-red-600" />;
    return <Paperclip size={14} className="text-blue-600" />;
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Homework</h1><p className="text-slate-500">View and submit homework assignments</p></div>

      {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
        <div className="space-y-4">
          {homework.length === 0 ? <div className="bg-white rounded-xl p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No homework assigned</p></div> :
          homework.map((hw) => {
            const submitted = isSubmitted(hw.id);
            const overdue = !submitted && isOverdue(hw.due_date);
            const attachments = hw.attachments || [];
            const isExpanded = expandedHw === hw.id;
            return (
              <div key={hw.id} className={`bg-white rounded-xl shadow-md overflow-hidden ${overdue ? 'border-l-4 border-red-500' : ''}`}>
                <div className="p-6 cursor-pointer" onClick={() => setExpandedHw(isExpanded ? null : hw.id)}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-1">{hw.title}</h3>
                      <p className="text-sm text-slate-500">{hw.subject?.name} &bull; {hw.class?.name}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm ${submitted ? 'bg-green-100 text-green-700' : overdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {submitted ? 'Submitted' : overdue ? 'Overdue' : 'Pending'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1"><Clock size={16} />Due: {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : 'No due date'}</span>
                    <span className="flex items-center gap-1"><FileText size={16} />Total: {hw.total_marks} marks</span>
                    {attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip size={16} />{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</span>}
                  </div>
                  {hw.description && <p className="text-sm text-slate-600">{isExpanded ? hw.description : hw.description.substring(0, 100) + (hw.description.length > 100 ? '...' : '')}</p>}
                </div>

                {isExpanded && attachments.length > 0 && (
                  <div className="px-6 pb-4 border-t pt-4">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          {getFileIcon(url)}<span className="text-sm truncate max-w-[150px]">{url.split('/').pop()}</span><ExternalLink size={12} className="text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="px-6 pb-6">
                  {submitted ? (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700"><Check size={18} /><span>Submitted on {new Date(submitted.submitted_at).toLocaleDateString()}</span></div>
                      {submitted.marks !== null && submitted.marks !== undefined && <p className="text-sm text-green-600 mt-1">Marks: {submitted.marks}/{hw.total_marks}</p>}
                      {submitted.feedback && <p className="text-sm text-green-600 mt-1">Feedback: {submitted.feedback}</p>}
                      {submitted.submission_files && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {submitted.submission_files.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-600 hover:underline">{getFileIcon(url)}{url.split('/').pop()}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input type="text" placeholder="Or paste a URL to your work" value={submissionUrls[hw.id] || ''} onChange={(e) => setSubmissionUrls({ ...submissionUrls, [hw.id]: e.target.value })} className="input flex-1" />
                      </div>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center">
                        <input type="file" multiple onChange={(e) => handleFileUpload(hw.id, e)} className="hidden" id={`file-${hw.id}`} />
                        <label htmlFor={`file-${hw.id}`} className="cursor-pointer flex items-center justify-center gap-2 text-sm text-slate-500"><Upload size={16} />Upload files</label>
                      </div>
                      {submissionFiles[hw.id]?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {submissionFiles[hw.id].map((f, i) => (
                            <span key={i} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{getFileIcon(f.name)}{f.name}</span>
                          ))}
                        </div>
                      )}
                      <button onClick={() => handleSubmit(hw.id)} disabled={submitting[hw.id]} className="btn-primary w-full flex items-center justify-center gap-2">{submitting[hw.id] ? <><Loader2 size={16} className="animate-spin" />Submitting...</> : <><Upload size={18} />Submit</>}</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
