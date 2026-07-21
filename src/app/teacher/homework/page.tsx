'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, uploadFile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, FileText, Check, Clock, Upload, Image, Paperclip, Loader2, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import FileUpload from '@/components/FileUpload';
import { STORAGE_BUCKETS } from '@/lib/supabase';

export default function TeacherHomeworkPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [homework, setHomework] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', subject_id: '', class_id: '', due_date: '', total_marks: 100, homework_type: 'assignment' as string
  });
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    try {
      // Get teacher's class IDs
      const { data: tcData } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', profile?.id);

      const teacherClassIds = Array.from(new Set(tcData?.map(tc => tc.class_id).filter(Boolean) || []));

      const [hwRes, clsRes] = await Promise.all([
        teacherClassIds.length > 0
          ? supabase.from('homework').select('*, subject:subjects!subject_id(*), class:classes!class_id(*)').in('class_id', teacherClassIds).order('due_date', { ascending: false })
          : { data: [], error: null },
        teacherClassIds.length > 0
          ? supabase.from('classes').select('*').in('id', teacherClassIds).order('name')
          : { data: [], error: null },
      ]);
      if (hwRes.error) throw new Error(hwRes.error.message);
      if (hwRes.data) setHomework(hwRes.data);
      if (clsRes.data) setClasses(clsRes.data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  function removeAttachment(index: number) {
    setAttachmentUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const data = {
        ...formData,
        subject_id: formData.subject_id || null,
        class_id: formData.class_id || null,
        teacher_id: profile?.id,
        due_date: formData.due_date || null,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        homework_type: formData.homework_type,
        is_active: true,
      };

      let result;
      if (editingHomework) {
        result = await supabase.from('homework').update(data).eq('id', editingHomework.id);
      } else {
        result = await supabase.from('homework').insert(data);
      }
      if (result.error) throw new Error(result.error.message);

      setSuccess(editingHomework ? 'Homework updated successfully' : 'Homework created successfully');
      setShowModal(false);
      setFormData({ title: '', description: '', subject_id: '', class_id: '', due_date: '', total_marks: 100, homework_type: 'assignment' });
      setAttachmentFiles([]);
      setAttachmentUrls([]);
      setEditingHomework(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save homework');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this homework?')) { await supabase.from('homework').delete().eq('id', id); fetchData(); }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'essay': return <FileText size={16} />;
      case 'quiz': return <Check size={16} />;
      case 'project': return <Image size={16} />;
      default: return <Paperclip size={16} />;
    }
  }

  return (
    <DashboardLayout title="Homework" subtitle="Manage homework assignments with attachments">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Homework</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Manage homework assignments with attachments</p>
            </div>
          </div>
          <button onClick={() => { setEditingHomework(null); setFormData({ title: '', description: '', subject_id: '', class_id: '', due_date: '', total_marks: 100, homework_type: 'assignment' }); setAttachmentFiles([]); setAttachmentUrls([]); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={20} />Add Homework</button>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-xl p-4 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}
        {success && <div className="bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 dark:border-green-900/40 rounded-xl p-4 text-green-700 dark:text-green-300 dark:text-green-300 text-sm">{success}</div>}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div> : homework.length === 0 ? <div className="p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No homework found</p><button onClick={() => setShowModal(true)} className="btn-primary mt-4">Add First Homework</button></div> : (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800"><tr><th className="text-left py-3 px-6 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Title</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Type</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Subject</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Class</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Due</th><th className="text-left py-3 px-6 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Marks</th><th className="text-right py-3 px-6 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">Actions</th></tr></thead>
              <tbody>{homework.map((hw) => (<tr key={hw.id} className="border-t hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800"><td className="py-4 px-6 font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">{hw.title}</td><td className="py-4 px-6"><span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">{getTypeIcon(hw.homework_type || 'assignment')}<span className="capitalize">{hw.homework_type || 'assignment'}</span></span></td><td className="py-4 px-6 text-slate-600 dark:text-slate-400 dark:text-slate-400">{hw.subject?.name || '-'}</td><td className="py-4 px-6 text-slate-600 dark:text-slate-400 dark:text-slate-400">{hw.class?.name || '-'}</td><td className="py-4 px-6 text-slate-600 dark:text-slate-400 dark:text-slate-400">{hw.due_date ? new Date(hw.due_date).toLocaleDateString() : '-'}</td><td className="py-4 px-6 text-slate-600 dark:text-slate-400 dark:text-slate-400">{hw.total_marks}</td><td className="py-4 px-6 text-right"><div className="flex items-center justify-end gap-1"><button onClick={() => { setEditingHomework(hw); setFormData({ title: hw.title, description: hw.description || '', subject_id: hw.subject_id || '', class_id: hw.class_id || '', due_date: hw.due_date || '', total_marks: hw.total_marks, homework_type: hw.homework_type || 'assignment' }); setAttachmentUrls(hw.attachments || []); setAttachmentFiles([]); setShowModal(true); }} className="p-2 hover:bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><Edit size={16} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></button><button onClick={() => handleDelete(hw.id)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><Trash2 size={16} className="text-red-500 dark:text-red-400 dark:text-red-400" /></button></div></td></tr>))}</tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">{editingHomework ? 'Edit' : 'New'} Homework</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button></div>
              <div className="p-6 space-y-4">
                <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="input" /></div>
                <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="input" rows={3}></textarea></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Subject</label><select value={formData.subject_id} onChange={(e) => setFormData({...formData, subject_id: e.target.value})} className="input"><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div><label className="label">Class</label><select value={formData.class_id} onChange={(e) => setFormData({...formData, class_id: e.target.value})} className="input"><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Due Date</label><input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="input" /></div>
                  <div><label className="label">Total Marks</label><input type="number" value={formData.total_marks} onChange={(e) => setFormData({...formData, total_marks: parseInt(e.target.value)})} className="input" /></div>
                </div>
                <div><label className="label">Type</label><select value={formData.homework_type} onChange={(e) => setFormData({...formData, homework_type: e.target.value})} className="input"><option value="assignment">Assignment</option><option value="essay">Essay</option><option value="quiz">Quiz</option><option value="project">Project</option><option value="reading">Reading</option></select></div>
                
                <div className="space-y-3">
                  <label className="label">Attachments</label>
                  <FileUpload
                    bucket={STORAGE_BUCKETS.HOMEWORK}
                    onUpload={(url) => setAttachmentUrls(prev => [...prev, url])}
                    label=""
                    accept="*"
                    helperText="Upload reference documents or templates"
                  />
                  
                  {attachmentUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attachmentUrls.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg text-xs group">
                          <Paperclip size={12} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />
                          <span className="max-w-[150px] truncate">{url.split('/').pop()}</span>
                          <button 
                            onClick={() => removeAttachment(i)}
                            className="text-red-500 dark:text-red-400 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSave} disabled={uploading} className="btn-primary disabled:opacity-50">{uploading ? 'Uploading...' : editingHomework ? 'Update' : 'Create'}</button></div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
