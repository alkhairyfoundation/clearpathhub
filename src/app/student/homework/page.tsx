'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, uploadFile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Upload, Check, Clock, FileText, Paperclip, Image, FileVideo, ExternalLink, Loader2, ArrowLeft } from 'lucide-react';

const PAGE_SIZE = 10;

export default function StudentHomeworkPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [homework, setHomework] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [submissionUrls, setSubmissionUrls] = useState<Record<string, string>>({});
  const [submissionText, setSubmissionText] = useState<Record<string, string>>({});
  const [submissionFiles, setSubmissionFiles] = useState<Record<string, File[]>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [expandedHw, setExpandedHw] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData(0, true);
  }, [profile]);

  async function fetchData(pageNum: number, reset = false) {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError('');

    try {
      const { data: student } = await supabase.from('students').select('class_id').eq('profile_id', profile?.id).maybeSingle();

      let hwQuery = supabase
        .from('homework')
        .select('*, subject:subjects(*), class:classes(*)', { count: 'exact' })
        .eq('is_active', true);

      if (student?.class_id) {
        hwQuery = hwQuery.eq('class_id', student.class_id);
      }

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const [hwRes, subRes] = await Promise.all([
        hwQuery.order('due_date', { ascending: true }).range(from, to),
        supabase.from('homework_submissions').select('*, homework:homework(*)').eq('student_id', profile?.id).order('submitted_at', { ascending: false }),
      ]);

      if (hwRes.error) throw new Error(hwRes.error.message);
      if (subRes.error) throw new Error(subRes.error.message);

      if (hwRes.data) {
        setHomework(prev => reset ? hwRes.data : [...prev, ...hwRes.data]);
        setHasMore(hwRes.data.length === PAGE_SIZE && (hwRes.count ? (from + hwRes.data.length) < hwRes.count : true));
      }
      if (subRes.data) setMySubmissions(subRes.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage);
  }

  async function handleFileUpload(homeworkId: string, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSubmissionFiles(prev => ({ ...prev, [homeworkId]: [...(prev[homeworkId] || []), ...files] }));
  }

  async function handleSubmit(homeworkId: string) {
    const url = submissionUrls[homeworkId] || '';
    const text = submissionText[homeworkId] || '';
    const files = submissionFiles[homeworkId] || [];
    if (!url && files.length === 0 && !text) return;

    setSubmitting(prev => ({ ...prev, [homeworkId]: true }));
    setError('');
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const { url: fileUrl } = await uploadFile('homework', file, `submissions-${homeworkId}`);
        if (fileUrl) uploadedUrls.push(fileUrl);
      }

      const submissionValue = text || url || uploadedUrls.join(',');

      const { error: submitError } = await supabase.from('homework_submissions').insert({
        homework_id: homeworkId,
        student_id: profile?.id,
        submission_url: submissionValue,
        submitted_at: new Date().toISOString()
      });
      if (submitError) throw new Error(submitError.message);

      setSubmissionUrls(prev => ({ ...prev, [homeworkId]: '' }));
      setSubmissionText(prev => ({ ...prev, [homeworkId]: '' }));
      setSubmissionFiles(prev => ({ ...prev, [homeworkId]: [] }));
      fetchData(0, true); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to submit homework');
    } finally {
      setSubmitting(prev => ({ ...prev, [homeworkId]: false }));
    }
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

  function isUrl(str: string) {
    return /^https?:\/\//i.test(str);
  }

  return (
    <DashboardLayout title="Homework" subtitle="View and submit homework assignments">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Homework</h1>
            <p className="text-slate-500">View and submit homework assignments</p>
          </div>
        </div>
        
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {homework.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-slate-500">No homework assigned</p>
                </div>
              ) : (
                homework.map((hw) => {
                  const submitted = isSubmitted(hw.id);
                  const overdue = !submitted && isOverdue(hw.due_date);
                  const attachments = hw.attachments || [];
                  const isExpanded = expandedHw === hw.id;
                  return (
                    <div key={hw.id} className={`bg-white rounded-xl shadow-md overflow-hidden transition-all ${overdue ? 'border-l-4 border-red-500' : ''}`}>
                      <div className="p-6 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedHw(isExpanded ? null : hw.id)}>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-800 mb-1">{hw.title}</h3>
                            <p className="text-sm text-slate-500">{hw.subject?.name || 'No subject'} &bull; {hw.class?.name || 'All Classes'}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${submitted ? 'bg-green-100 text-green-700' : overdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {submitted ? 'Submitted' : overdue ? 'Overdue' : 'Pending'}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
                          <span className="flex items-center gap-1"><Clock size={16} />Due: {hw.due_date ? new Date(hw.due_date).toLocaleDateString() : 'No due date'}</span>
                          <span className="flex items-center gap-1"><FileText size={16} />Total: {hw.total_marks} marks</span>
                          {attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip size={16} />{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</span>}
                        </div>
                        {hw.description && (
                          <p className="text-sm text-slate-600">
                            {isExpanded ? hw.description : (hw.description.substring(0, 100) + (hw.description.length > 100 ? '...' : ''))}
                          </p>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="px-6 pb-6 space-y-4 border-t pt-4 bg-slate-50/50">
                          {attachments.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800 mb-2">Attachments</h4>
                              <div className="flex flex-wrap gap-2">
                                {attachments.map((url: string, i: number) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                    {getFileIcon(url)}
                                    <span className="text-sm truncate max-w-[150px]">{url.split('/').pop()}</span>
                                    <ExternalLink size={12} className="text-slate-400" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {submitted ? (
                            <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                                <Check size={18} />
                                <span>Submitted on {new Date(submitted.submitted_at).toLocaleDateString()}</span>
                              </div>
                              {submitted.marks !== null && submitted.marks !== undefined && (
                                <p className="text-sm text-green-600 mb-1">Marks: <span className="font-bold">{submitted.marks}/{hw.total_marks}</span></p>
                              )}
                              {submitted.feedback && (
                                <div className="mt-2 text-sm text-green-700 bg-white/50 p-2 rounded">
                                  <p className="font-semibold text-xs uppercase tracking-wider text-green-600 mb-1">Teacher's Feedback</p>
                                  {submitted.feedback}
                                </div>
                              )}
                              {submitted.submission_url && (
                                <div className="mt-3">
                                  {isUrl(submitted.submission_url) ? (
                                    <a href={submitted.submission_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline font-medium">
                                      <ExternalLink size={14} /> View My Submission
                                    </a>
                                  ) : (
                                    <div className="text-sm text-green-700 bg-white p-3 rounded-lg border border-green-200 whitespace-pre-wrap">
                                      {submitted.submission_url}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-4 bg-white p-4 rounded-lg border border-slate-200 shadow-inner">
                              <h4 className="text-sm font-semibold text-slate-800">Your Submission</h4>
                              <div className="space-y-3">
                                <textarea
                                  placeholder="Type your answer here..."
                                  value={submissionText[hw.id] || ''}
                                  onChange={(e) => setSubmissionText({ ...submissionText, [hw.id]: e.target.value })}
                                  className="input w-full"
                                  rows={3}
                                />
                                <div className="flex gap-3">
                                  <input
                                    type="text"
                                    placeholder="Or paste a URL to your work"
                                    value={submissionUrls[hw.id] || ''}
                                    onChange={(e) => setSubmissionUrls({ ...submissionUrls, [hw.id]: e.target.value })}
                                    className="input flex-1"
                                  />
                                </div>
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group">
                                  <input
                                    type="file"
                                    multiple
                                    onChange={(e) => handleFileUpload(hw.id, e)}
                                    className="hidden"
                                    id={`file-${hw.id}`}
                                  />
                                  <label htmlFor={`file-${hw.id}`} className="cursor-pointer flex flex-col items-center justify-center gap-2 text-slate-500 group-hover:text-blue-600">
                                    <Upload size={24} />
                                    <span className="text-sm font-medium">Click to upload files or drag and drop</span>
                                    <span className="text-xs opacity-60">Images, PDFs, Documents, or Videos</span>
                                  </label>
                                </div>
                                {submissionFiles[hw.id]?.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {submissionFiles[hw.id].map((f, i) => (
                                      <span key={i} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">
                                        {getFileIcon(f.name)}
                                        {f.name}
                                        <button onClick={() => {
                                          const newFiles = [...submissionFiles[hw.id]];
                                          newFiles.splice(i, 1);
                                          setSubmissionFiles({ ...submissionFiles, [hw.id]: newFiles });
                                        }} className="ml-1 text-blue-400 hover:text-red-500">×</button>
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <button
                                  onClick={() => handleSubmit(hw.id)}
                                  disabled={submitting[hw.id] || (isOverdue(hw.due_date) && !submitted)}
                                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                                >
                                  {submitting[hw.id] ? (
                                    <><Loader2 size={18} className="animate-spin" />Submitting...</>
                                  ) : (
                                    <><Upload size={18} />Submit Assignment</>
                                  )}
                                </button>
                                {isOverdue(hw.due_date) && !submitted && (
                                  <p className="text-xs text-red-500 text-center font-medium">This assignment is overdue. Submissions might be disabled or marked as late.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="btn-outline px-8 py-2 flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? <Loader2 size={18} className="animate-spin" /> : null}
                  {loadingMore ? 'Loading...' : 'Load More Homework'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
