'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
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

  const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True / False' },
    { value: 'fill_blank', label: 'Fill in the Blank' },
    { value: 'short_answer', label: 'Short Answer' },
  ];

  function resetQuestionDefaults(type: string) {
    let opts = ['', '', '', ''];
    let correct: any = 0;
    if (type === 'true_false') { opts = ['True', 'False']; correct = 0; }
    else if (type === 'fill_blank') { opts = []; correct = 0; }
    else if (type === 'short_answer') { opts = []; correct = 0; }
    setQuestionData({ ...questionData, options: opts, correct_answer: correct, question_type: type });
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [examsRes, codesRes, appsRes] = await Promise.all([
      supabase.from('entrance_exams').select('*, questions:entrance_questions(*), applications:exam_applications(*)').order('exam_date', { ascending: true }),
      supabase.from('access_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('exam_applications').select('*, exam:entrance_exams(title)').order('created_at', { ascending: false }),
    ]);
    if (examsRes.data) setExams(examsRes.data);
    if (codesRes.data) setCodes(codesRes.data);
    if (appsRes.data) setApplications(appsRes.data);
    setLoading(false);
  }

  async function handleCreateExam() {
    setSaving(true);
    const { error } = await supabase.from('entrance_exams').insert({ ...formData, created_by: profile?.id });
    if (!error) { setShowExamModal(false); fetchData(); }
    setSaving(false);
  }

  async function handleAddQuestion() {
    if (!selectedExam) return;
    setSaving(true);
    const payload: any = {
      exam_id: selectedExam.id,
      question: questionData.question,
      options: questionData.options,
      correct_answer: questionData.correct_answer,
      points: questionData.points || 1,
      question_type: questionData.question_type || 'multiple_choice',
      subject: questionData.subject || null,
    };
    if (questionData.question_image) payload.question_image = questionData.question_image;
    const { error } = await supabase.from('entrance_questions').insert(payload);
    if (!error) {
      setQuestionData({ question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '' });
      const { data } = await supabase.from('entrance_questions').select('*').eq('exam_id', selectedExam.id);
      if (data) setQuestions(data);
    }
    setSaving(false);
  }

  async function handleGenerateCode() {
    if (!selectedExam) return;
    setSaving(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('access_codes').insert({
      code, exam_id: selectedExam.id, max_uses: 100, used_count: 0
    });
    if (!error) fetchData();
    setSaving(false);
  }

  async function handleDeleteExam(id: string) {
    if (!confirm('Delete this exam?')) return;
    setDeleting(id);
    await supabase.from('entrance_exams').delete().eq('id', id);
    setDeleting(null); fetchData();
  }

  const filteredApps = applications.filter(a =>
    `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const passedApps = applications.filter(a => a.status === 'passed').length;
  const pendingApps = applications.filter(a => a.status === 'pending').length;

  return (
    <DashboardLayout title="Entrance Exams" subtitle="Manage entrance exams, questions, access codes, and applications">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Entrance Exams</h1>
            <p className="text-slate-500 mt-1">Manage entrance exams, questions, access codes, and applications</p>
          </div>
          <button onClick={() => setShowExamModal(true)} className="btn-primary flex items-center gap-2"><Plus size={18} />Create Exam</button>
        </div>

        <div className="card p-4">
          <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
            {(['exams', 'codes', 'applications'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'exams' && (
            loading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
            ) : exams.length === 0 ? (
              <div className="text-center py-16"><FileText className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No exams created yet</p><button onClick={() => setShowExamModal(true)} className="btn-primary mt-4">Create First Exam</button></div>
            ) : (
              <div className="space-y-4">
                {exams.map(exam => (
                  <div key={exam.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{exam.title}</h3>
                        <p className="text-sm text-slate-500">{exam.level} • {exam.academic_year}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setSelectedExam(exam); setShowQuestionModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg"><Hash size={16} className="text-slate-500" /></button>
                        <button onClick={() => { setSelectedExam(exam); setShowCodeModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg"><QrCode size={16} className="text-slate-500" /></button>
                        <button onClick={() => handleDeleteExam(exam.id)} disabled={deleting === exam.id} className="p-2 hover:bg-gray-100 rounded-lg">
                          {deleting === exam.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} className="text-red-500" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={14} />{exam.duration_minutes} min</span>
                      <span className="flex items-center gap-1"><FileText size={14} />{exam.questions?.length || 0} questions</span>
                      <span className="flex items-center gap-1"><Users size={14} />{exam.applications?.length || 0} applications</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'applications' && (
            <div>
              <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} /><input type="text" placeholder="Search applications..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-10" /></div></div>
              {filteredApps.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No applications found</div>
              ) : (
                <div className="space-y-3">
                  {filteredApps.map(app => (
                    <div key={app.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{app.first_name} {app.last_name}</p>
                          <p className="text-sm text-slate-500">{app.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${app.status === 'passed' ? 'bg-green-100 text-green-700' : app.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{app.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'codes' && (
            <div>
              {codes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No codes generated yet</div>
              ) : (
                <div className="space-y-2">
                  {codes.map(code => (
                    <div key={code.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                      <code className="font-mono font-bold text-blue-600">{code.code}</code>
                      <span className="text-xs text-slate-500">{code.used_count || 0}/{code.max_uses} used</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showExamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Create Entrance Exam</h3><button onClick={() => setShowExamModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
              <div className="p-5 space-y-4">
                <div><label className="label">Exam Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input" /></div>
                <div><label className="label">Level</label><select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value})} className="input"><option value="">Select Level</option><option value="PRIMARY">Primary (1-6)</option><option value="JSS">JSS (1-3)</option><option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option></select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Academic Year</label><input type="text" value={formData.academic_year} onChange={e => setFormData({...formData, academic_year: e.target.value})} className="input" /></div>
                  <div><label className="label">Exam Date</label><input type="date" value={formData.exam_date} onChange={e => setFormData({...formData, exam_date: e.target.value})} className="input" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="label">Duration (min)</label><input type="number" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="input" /></div>
                  <div><label className="label">Questions</label><input type="number" value={formData.total_questions} onChange={e => setFormData({...formData, total_questions: parseInt(e.target.value)})} className="input" /></div>
                  <div><label className="label">Pass %</label><input type="number" value={formData.passing_score} onChange={e => setFormData({...formData, passing_score: parseInt(e.target.value)})} className="input" /></div>
                </div>
                <div><label className="label">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input" rows={3} /></div>
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
                <div className="flex items-center gap-2">
                  <div className="flex-1"><label className="label">Question Type</label></div>
                  <select value={questionData.question_type} onChange={e => resetQuestionDefaults(e.target.value)} className="input w-48">
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className="label">Question</label><textarea value={questionData.question} onChange={e => setQuestionData({...questionData, question: e.target.value})} className="input" rows={3} /></div>
                <div><label className="label">Subject</label><input type="text" value={questionData.subject} onChange={e => setQuestionData({...questionData, subject: e.target.value})} className="input" placeholder="e.g., Mathematics" /></div>

                {questionData.question_type === 'multiple_choice' && (
                  <div><label className="label">Options (select the correct one)</label>{questionData.options.map((opt, i) => (<div key={i} className="flex items-center gap-2 mb-2"><input type="radio" checked={questionData.correct_answer === i} onChange={() => setQuestionData({...questionData, correct_answer: i})} /><input type="text" value={opt} onChange={e => { const opts = [...questionData.options]; opts[i] = e.target.value; setQuestionData({...questionData, options: opts}); }} className="input flex-1" placeholder={`Option ${i + 1}`} /></div>))}</div>
                )}

                {questionData.question_type === 'true_false' && (
                  <div><label className="label">Correct Answer</label><div className="grid grid-cols-2 gap-2">{['True', 'False'].map((opt, i) => (<label key={i} className={`p-3 rounded-lg border-2 cursor-pointer text-center ${questionData.correct_answer === i ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}><input type="radio" checked={questionData.correct_answer === i} onChange={() => setQuestionData({...questionData, correct_answer: i})} className="sr-only" /><span className="font-medium">{opt}</span></label>))}</div></div>
                )}

                {questionData.question_type === 'fill_blank' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">Students will type the answer. Include <code className="bg-blue-100 px-1 rounded">___</code> in the question text where the blank should be.</div>
                )}

                {questionData.question_type === 'short_answer' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">Students will write a short answer. This requires manual grading.</div>
                )}



                {questions.length > 0 && (<div className="mt-4"><h4 className="font-semibold text-slate-700 mb-2">{questions.length} Questions Added</h4><div className="space-y-2 max-h-48 overflow-y-auto">{questions.map((q, i) => (<div key={q.id} className="p-3 bg-slate-50 rounded-lg text-sm"><span className="font-medium">{i + 1}.</span> {q.question} <span className="text-xs text-slate-400">({q.question_type})</span></div>))}</div></div>)}
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
                {codes.filter(c => c.exam_id === selectedExam.id).length === 0 ? (
                  <p className="text-center text-slate-500 py-4">No codes generated yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">{codes.filter(c => c.exam_id === selectedExam.id).map(code => (
                    <div key={code.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><code className="font-mono font-bold text-blue-600">{code.code}</code><span className="text-xs text-slate-500">{code.used_count || 0}/{code.max_uses} used</span></div>
                  ))}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
