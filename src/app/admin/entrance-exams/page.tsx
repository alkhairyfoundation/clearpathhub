'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, X, FileText, Clock, Users, Check, Loader2, Search, QrCode, Eye, Hash } from 'lucide-react';

export default function AdminEntranceExamsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'exams' | 'codes' | 'applications'>('exams');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', level: '', academic_year: new Date().getFullYear().toString(),
    exam_date: '', duration_minutes: 60, passing_score: 50, total_questions: 10
  });
  const [questionData, setQuestionData] = useState({
    question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: ''
  });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [examsRes, appsRes] = await Promise.all([
      supabase.from('entrance_exams').select('*').order('created_at', { ascending: false }),
      supabase.from('entrance_applications').select('*').order('created_at', { ascending: false }),
    ]);
    if (examsRes.data) setExams(examsRes.data);
    if (appsRes.data) setApplications(appsRes.data);
    setLoading(false);
  }

  async function fetchQuestions(examId: string) {
    const { data } = await supabase.from('entrance_questions').select('*').eq('exam_id', examId).order('created_at');
    if (data) setQuestions(data);
  }

  async function fetchCodes(examId: string) {
    const { data } = await supabase.from('entrance_codes').select('*').eq('exam_id', examId).order('created_at', { ascending: false });
    if (data) setCodes(data);
  }

  async function handleCreateExam() {
    if (!formData.title.trim()) return;
    setSaving(true);
    const { data: exam } = await supabase.from('entrance_exams').insert({ ...formData, created_by: profile?.id, is_published: true, is_active: true }).select().single();
    setSaving(false);
    if (exam) { setExams([exam, ...exams]); setShowExamModal(false); setFormData({ title: '', description: '', level: '', academic_year: new Date().getFullYear().toString(), exam_date: '', duration_minutes: 60, passing_score: 50, total_questions: 10 }); }
  }

  async function handleAddQuestion() {
    if (!selectedExam || !questionData.question.trim()) return;
    setSaving(true);
    await supabase.from('entrance_questions').insert({ ...questionData, exam_id: selectedExam.id, options: questionData.options, points: 1 });
    setSaving(false);
    fetchQuestions(selectedExam.id);
    setQuestionData({ question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '' });
  }

  async function handleGenerateCode() {
    if (!selectedExam) return;
    setSaving(true);
    const code = `${selectedExam.level}-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from('entrance_codes').insert({ exam_id: selectedExam.id, code, max_uses: 100, is_active: true });
    setSaving(false);
    fetchCodes(selectedExam.id);
  }

  async function deleteExam(id: string) {
    if (!confirm('Delete this exam and all related data?')) return;
    setDeleting(id);
    await supabase.from('entrance_exams').delete().eq('id', id);
    await supabase.from('entrance_questions').delete().eq('exam_id', id);
    await supabase.from('entrance_codes').delete().eq('exam_id', id);
    setDeleting(null);
    fetchData();
  }

  const filteredApps = applications.filter(a =>
    `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const passedApps = applications.filter(a => a.status === 'passed').length;
  const pendingApps = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Entrance Exams</h1>
          <p className="text-slate-500 mt-1">Manage entrance exams, questions, access codes, and applications</p>
        </div>
        <button onClick={() => setShowExamModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} />Create Exam</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Total Exams</span><FileText size={16} className="text-blue-600" /></div><p className="text-2xl font-bold text-slate-900">{exams.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Applications</span><Users size={16} className="text-purple-600" /></div><p className="text-2xl font-bold text-slate-900">{applications.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Passed</span><Check size={16} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{passedApps}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Pending</span><Clock size={16} className="text-amber-600" /></div><p className="text-2xl font-bold text-amber-600">{pendingApps}</p></div>
      </div>

      <div className="card">
        <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1">
          {(['exams', 'codes', 'applications'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'exams' && (
          loading ? <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div> :
          exams.length === 0 ? <div className="text-center py-16"><FileText className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No exams created yet</p><button onClick={() => setShowExamModal(true)} className="btn-primary mt-4">Create First Exam</button></div> :
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map(exam => (
              <div key={exam.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-bold text-slate-900">{exam.title}</h3><p className="text-sm text-slate-500">{exam.level} • {exam.academic_year}</p></div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${exam.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{exam.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><Clock size={14} />{exam.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><FileText size={14} />Pass: {exam.passing_score}%</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedExam(exam); fetchQuestions(exam.id); setShowQuestionModal(true); }} className="btn-outline flex-1 text-xs py-2">Questions</button>
                  <button onClick={() => { setSelectedExam(exam); fetchCodes(exam.id); setShowCodeModal(true); }} className="btn-outline flex-1 text-xs py-2 flex items-center justify-center gap-1"><Hash size={14} />Codes</button>
                  <button onClick={() => deleteExam(exam.id)} disabled={deleting === exam.id} className="p-2 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-50">
                    {deleting === exam.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'applications' && (
          <>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search applicants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
            {filteredApps.length === 0 ? <div className="text-center py-12 text-slate-500"><Users className="mx-auto text-slate-300 mb-3" size={40} /><p>No applications found</p></div> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Name</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Email</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Applied Class</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Score</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{filteredApps.map(app => (<tr key={app.id} className="hover:bg-slate-50"><td className="py-3 px-4 font-medium text-slate-900">{app.first_name} {app.last_name}</td><td className="py-3 px-4 text-sm text-slate-600 hidden sm:table-cell">{app.email}</td><td className="py-3 px-4 text-sm">{app.applied_class}</td><td className="py-3 px-4 font-semibold">{app.exam_score ?? '—'}</td><td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${app.status === 'passed' ? 'bg-green-100 text-green-700' : app.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{app.status}</span></td><td className="py-3 px-4 text-sm text-slate-500 hidden md:table-cell">{new Date(app.created_at).toLocaleDateString()}</td></tr>))}</tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'codes' && (
          <div className="text-center py-12 text-slate-500">
            <QrCode className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="font-medium">Select an exam to manage codes</p>
            <p className="text-sm mt-1">Go to the Exams tab and click "Codes" on any exam</p>
          </div>
        )}
      </div>

      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Create Entrance Exam</h3><button onClick={() => setShowExamModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label">Exam Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="e.g., Entrance Exam 2024" /></div>
              <div><label className="label">Level</label><select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className="input"><option value="">Select Level</option><option value="PRIMARY">Primary (1-6)</option><option value="JSS">JSS (1-3)</option><option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option></select></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Academic Year</label><input type="text" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} className="input" /></div><div><label className="label">Exam Date</label><input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} className="input" /></div></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="label">Duration (min)</label><input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} className="input" /></div><div><label className="label">Questions</label><input type="number" value={formData.total_questions} onChange={(e) => setFormData({ ...formData, total_questions: parseInt(e.target.value) })} className="input" /></div><div><label className="label">Pass %</label><input type="number" value={formData.passing_score} onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })} className="input" /></div></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} /></div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200"><button onClick={() => setShowExamModal(false)} className="btn-ghost">Cancel</button><button onClick={handleCreateExam} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Creating...' : 'Create Exam'}</button></div>
          </div>
        </div>
      )}

      {showQuestionModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10"><h3 className="text-lg font-bold text-slate-900">Questions — {selectedExam.title}</h3><button onClick={() => setShowQuestionModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
            <div className="p-5 space-y-4">
              <div><label className="label">Question</label><textarea value={questionData.question} onChange={(e) => setQuestionData({ ...questionData, question: e.target.value })} className="input" rows={3} placeholder="Enter question..." /></div>
              <div><label className="label">Subject</label><input type="text" value={questionData.subject} onChange={(e) => setQuestionData({ ...questionData, subject: e.target.value })} className="input" placeholder="e.g., Mathematics" /></div>
              <div><label className="label">Options (select the correct one)</label>{questionData.options.map((opt, i) => (<div key={i} className="flex items-center gap-2 mb-2"><input type="radio" checked={questionData.correct_answer === i} onChange={() => setQuestionData({ ...questionData, correct_answer: i })} /><input type="text" value={opt} onChange={(e) => { const opts = [...questionData.options]; opts[i] = e.target.value; setQuestionData({ ...questionData, options: opts }); }} className="input flex-1" placeholder={`Option ${i + 1}`} /></div>))}</div>
              {questions.length > 0 && (<div className="mt-4"><h4 className="font-semibold text-slate-700 mb-2">{questions.length} Questions Added</h4><div className="space-y-2 max-h-48 overflow-y-auto">{questions.map((q, i) => (<div key={q.id} className="p-3 bg-slate-50 rounded-lg text-sm"><span className="font-medium">{i + 1}.</span> {q.question}</div>))}</div></div>)}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 sticky bottom-0 bg-white"><button onClick={() => setShowQuestionModal(false)} className="btn-ghost">Close</button><button onClick={handleAddQuestion} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Adding...' : 'Add Question'}</button></div>
          </div>
        </div>
      )}

      {showCodeModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Access Codes — {selectedExam.title}</h3><button onClick={() => setShowCodeModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
            <div className="p-5">
              <button onClick={handleGenerateCode} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mb-4 disabled:opacity-50"><QrCode size={18} />{saving ? 'Generating...' : 'Generate New Code'}</button>
              {codes.length === 0 ? <p className="text-center text-slate-500 py-4">No codes generated yet</p> : (
                <div className="space-y-2 max-h-64 overflow-y-auto">{codes.map(code => (<div key={code.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><code className="font-mono font-bold text-blue-600">{code.code}</code><span className="text-xs text-slate-500">{code.used_count || 0}/{code.max_uses} used</span></div>))}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
