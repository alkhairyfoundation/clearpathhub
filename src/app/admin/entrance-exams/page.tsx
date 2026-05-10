'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  ArrowLeft, Plus, Edit, Trash2, X, FileText, Clock, Users, Check, 
  Loader2, Search, QrCode, Eye, Hash, Download, Award, AlertCircle, 
  GraduationCap, ChevronDown, CheckCircle, XCircle
} from 'lucide-react';

export default function AdminEntranceExamsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'exams' | 'codes' | 'applications'>('applications');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', level: '', academic_year: new Date().getFullYear().toString(),
    exam_date: '', duration_minutes: 60, passing_score: 50, total_questions: 10,
    shuffle_questions: false, require_fullscreen: false, prevent_tab_switch: false, max_tab_switches: 3
  });
  const [questionData, setQuestionData] = useState({
    question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: ''
  });
  const [admissionData, setAdmissionData] = useState({
    status: '', admitted_class: '', notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    const [examsRes, codesRes, appsRes, classesRes] = await Promise.all([
      supabase.from('entrance_exams').select('*, questions:entrance_questions(*), applications:entrance_applications(*)').order('exam_date', { ascending: true }),
      supabase.from('entrance_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('entrance_applications').select('*, exam:entrance_exams!exam_id(*)').order('created_at', { ascending: false }),
      supabase.from('classes').select('id, name, level').order('level'),
    ]);
    if (examsRes.data) setExams(examsRes.data);
    if (codesRes.data) setCodes(codesRes.data);
    if (appsRes.data) setApplications(appsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  }

  async function handleCreateExam() {
    if (!formData.title.trim()) { setError('Title is required'); return; }
    setError(''); setSaving(true);
    try {
      const { error } = await supabase.from('entrance_exams').insert({ ...formData, created_by: profile?.id });
      if (error) throw new Error(error.message);
      setSuccess('Exam created');
      setShowExamModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
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
    const { error } = await supabase.from('entrance_codes').insert({
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

  async function handleAssignExam(applicationId: string, examId: string) {
    setSaving(true);
    await supabase.from('entrance_applications').update({
      status: 'assigned',
      exam_id: examId
    }).eq('id', applicationId);
    setSaving(false);
    fetchData();
  }

  async function handleAdmissionDecision() {
    if (!selectedApplication) return;
    setSaving(true);
    
    const updateData: any = {
      status: admissionData.status,
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
    };

    if (admissionData.status === 'admitted' && admissionData.admitted_class) {
      updateData.admitted_class = admissionData.admitted_class;
    }

    await supabase.from('entrance_applications').update(updateData).eq('id', selectedApplication.id);
    setShowApplicationModal(false);
    setAdmissionData({ status: '', admitted_class: '', notes: '' });
    setSaving(false);
    fetchData();
  }

  function openApplicationModal(app: any) {
    setSelectedApplication(app);
    setAdmissionData({
      status: app.status || 'pending',
      admitted_class: app.admitted_class || app.applied_class || '',
      notes: ''
    });
    setShowApplicationModal(true);
  }

  const filteredApps = applications.filter(a =>
    `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    assigned: applications.filter(a => a.status === 'assigned').length,
    passed: applications.filter(a => a.status === 'passed').length,
    failed: applications.filter(a => a.status === 'failed').length,
    admitted: applications.filter(a => a.status === 'admitted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'passed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'admitted': return 'bg-primary-100 text-primary-700';
      case 'rejected': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  return (
    <DashboardLayout title="Entrance Exams" subtitle="Manage entrance exams and admissions">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Entrance Exams & Admissions</h1>
            <p className="text-slate-500 mt-1">Manage applications and admit students</p>
          </div>
          <button onClick={() => setShowExamModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} />Create Exam
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase">Pending</span>
              <Clock size={16} className="text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase">Assigned</span>
              <FileText size={16} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase">Passed</span>
              <Check size={16} className="text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase">Failed</span>
              <X size={16} className="text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase">Admitted</span>
              <Award size={16} className="text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-primary-600">{stats.admitted}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 uppercase">Rejected</span>
              <AlertCircle size={16} className="text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-slate-600">{stats.rejected}</p>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
            {(['applications', 'exams', 'codes'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'applications' && (
            <div>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search applications..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="input pl-10" 
                  />
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No applications found</div>
              ) : (
                <div className="space-y-3">
                  {filteredApps.map(app => (
                    <div key={app.id} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-semibold text-slate-900">{app.first_name} {app.last_name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(app.status)}`}>
                              {app.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{app.email} • {app.phone}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span>Applied: {app.applied_class}</span>
                            {app.admitted_class && <span className="text-primary-600 font-medium">Admitted: {app.admitted_class}</span>}
                            {app.exam_score !== null && (
                              <span className={app.exam_score >= (app.exam?.passing_score || 50) ? 'text-green-600' : 'text-red-600'}>
                                Score: {app.exam_score}%
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => openApplicationModal(app)}
                          className="btn-outline text-sm py-2"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="font-medium text-slate-500">No exams created yet</p>
                <button onClick={() => setShowExamModal(true)} className="btn-primary mt-4">Create First Exam</button>
              </div>
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
                        <button onClick={() => { setSelectedExam(exam); setShowQuestionModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Add Questions">
                          <Hash size={16} className="text-slate-500" />
                        </button>
                        <button onClick={() => { setSelectedExam(exam); setShowCodeModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Generate Codes">
                          <QrCode size={16} className="text-slate-500" />
                        </button>
                        <button onClick={() => handleDeleteExam(exam.id)} disabled={deleting === exam.id} className="p-2 hover:bg-gray-100 rounded-lg">
                          {deleting === exam.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} className="text-red-500" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={14} />{exam.duration_minutes} min</span>
                      <span className="flex items-center gap-1"><FileText size={14} />{exam.questions?.length || 0} questions</span>
                      <span className="flex items-center gap-1"><Users size={14} />{exam.applications?.length || 0} applications</span>
                      <span className="flex items-center gap-1"><Award size={14} />Pass: {exam.passing_score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'codes' && (
            <div>
              {exams.length === 0 ? (
                <div className="text-center py-8 text-slate-500">Create an exam first to generate codes</div>
              ) : codes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No codes generated yet</div>
              ) : (
                <div className="space-y-2">
                  {codes.map(code => (
                    <div key={code.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                      <code className="font-mono font-bold text-primary-600">{code.code}</code>
                      <span className="text-xs text-slate-500">{code.used_count || 0}/{code.max_uses} used</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Exam Modal */}
        {showExamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Create Entrance Exam</h3>
                <button onClick={() => setShowExamModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
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
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-slate-800 mb-3 text-sm">Security Settings</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.shuffle_questions} onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Shuffle Questions</p><p className="text-xs text-slate-400">Display questions in random order for each applicant</p></div></label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.require_fullscreen} onChange={(e) => setFormData({ ...formData, require_fullscreen: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Require Fullscreen</p><p className="text-xs text-slate-400">Force fullscreen mode during the exam</p></div></label>
                    <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.prevent_tab_switch} onChange={(e) => setFormData({ ...formData, prevent_tab_switch: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Prevent Tab Switching</p><p className="text-xs text-slate-400">Auto-submit if applicant switches tabs too many times</p></div></label>
                    {formData.prevent_tab_switch && <div><label className="label text-xs">Max Allowed Tab Switches</label><input type="number" value={formData.max_tab_switches} onChange={(e) => setFormData({ ...formData, max_tab_switches: parseInt(e.target.value) })} className="input" min={1} max={10} /></div>}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
                <button onClick={() => setShowExamModal(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleCreateExam} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Creating...' : 'Create Exam'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Question Modal */}
        {showQuestionModal && selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900">Questions — {selectedExam.title}</h3>
                <button onClick={() => setShowQuestionModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
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
                  <div><label className="label">Options (select the correct one)</label>
                    {questionData.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input type="radio" checked={questionData.correct_answer === i} onChange={() => setQuestionData({...questionData, correct_answer: i})} />
                        <input type="text" value={opt} onChange={e => { const opts = [...questionData.options]; opts[i] = e.target.value; setQuestionData({...questionData, options: opts}); }} className="input flex-1" placeholder={`Option ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                )}

                {questionData.question_type === 'true_false' && (
                  <div><label className="label">Correct Answer</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['True', 'False'].map((opt, i) => (
                        <label key={i} className={`p-3 rounded-lg border-2 cursor-pointer text-center ${questionData.correct_answer === i ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}>
                          <input type="radio" checked={questionData.correct_answer === i} onChange={() => setQuestionData({...questionData, correct_answer: i})} className="sr-only" />
                          <span className="font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {questionData.question_type === 'fill_blank' && (
                  <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700">
                    Students will type the answer. Include <code className="bg-primary-100 px-1 rounded">___</code> in the question text where the blank should be.
                  </div>
                )}

                {questionData.question_type === 'short_answer' && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                    Students will write a short answer. This requires manual grading.
                  </div>
                )}

                {questions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-slate-700 mb-2">{questions.length} Questions Added</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {questions.map((q, i) => (
                        <div key={q.id} className="p-3 bg-slate-50 rounded-lg text-sm">
                          <span className="font-medium">{i + 1}.</span> {q.question} <span className="text-xs text-slate-400">({q.question_type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 sticky bottom-0 bg-white">
                <button onClick={() => setShowQuestionModal(false)} className="btn-ghost">Close</button>
                <button onClick={handleAddQuestion} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Adding...' : 'Add Question'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Code Modal */}
        {showCodeModal && selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Access Codes — {selectedExam.title}</h3>
                <button onClick={() => setShowCodeModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              <div className="p-5">
                <button onClick={handleGenerateCode} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 mb-4 disabled:opacity-50">
                  <QrCode size={18} />{saving ? 'Generating...' : 'Generate New Code'}
                </button>
                {codes.filter(c => c.exam_id === selectedExam.id).length === 0 ? (
                  <p className="text-center text-slate-500 py-4">No codes generated yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {codes.filter(c => c.exam_id === selectedExam.id).map(code => (
                      <div key={code.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <code className="font-mono font-bold text-primary-600">{code.code}</code>
                        <span className="text-xs text-slate-500">{code.used_count || 0}/{code.max_uses} used</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Application Review Modal */}
        {showApplicationModal && selectedApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Review Application</h3>
                <button onClick={() => setShowApplicationModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {/* Applicant Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-800 mb-2">Applicant Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-slate-500">Name:</span> <span className="font-medium">{selectedApplication.first_name} {selectedApplication.last_name}</span></div>
                    <div><span className="text-slate-500">Email:</span> <span className="font-medium">{selectedApplication.email}</span></div>
                    <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{selectedApplication.phone}</span></div>
                    <div><span className="text-slate-500">Applied Class:</span> <span className="font-medium">{selectedApplication.applied_class}</span></div>
                    {selectedApplication.previous_school && <div><span className="text-slate-500">Previous School:</span> <span className="font-medium">{selectedApplication.previous_school}</span></div>}
                  </div>
                </div>

                {/* Exam Results */}
                {selectedApplication.exam_score !== null && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-2">Exam Results</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Score</p>
                        <p className={`text-2xl font-bold ${selectedApplication.exam_score >= (selectedApplication.exam?.passing_score || 50) ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedApplication.exam_score}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Passing Score</p>
                        <p className="text-lg font-semibold text-slate-700">{selectedApplication.exam?.passing_score || 50}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Exam: {selectedApplication.exam?.title}</p>
                  </div>
                )}

                {/* Admission Decision */}
                <div>
                  <label className="label">Admission Decision</label>
                  <select 
                    value={admissionData.status} 
                    onChange={e => setAdmissionData({...admissionData, status: e.target.value})}
                    className="input"
                  >
                    <option value="">Select Decision</option>
                    {selectedApplication.exam_score !== null && (
                      <>
                        <option value="passed">Passed - Awaiting Admission</option>
                        <option value="failed">Failed - Reject</option>
                      </>
                    )}
                    {selectedApplication.exam_score === null && (
                      <option value="assigned">Assign Exam</option>
                    )}
                    <option value="rejected">Reject Application</option>
                    <option value="admitted">Admit Student</option>
                  </select>
                </div>

                {admissionData.status === 'admitted' && (
                  <div>
                    <label className="label">Admit to Class (can be different from applied class)</label>
                    <select 
                      value={admissionData.admitted_class} 
                      onChange={e => setAdmissionData({...admissionData, admitted_class: e.target.value})}
                      className="input"
                    >
                      <option value="">Select Class</option>
                      <option value="PRIMARY 1">Primary 1</option>
                      <option value="PRIMARY 2">Primary 2</option>
                      <option value="PRIMARY 3">Primary 3</option>
                      <option value="PRIMARY 4">Primary 4</option>
                      <option value="PRIMARY 5">Primary 5</option>
                      <option value="PRIMARY 6">Primary 6</option>
                      <option value="JSS 1">JSS 1</option>
                      <option value="JSS 2">JSS 2</option>
                      <option value="JSS 3">JSS 3</option>
                      <option value="SS 1">SS 1</option>
                      <option value="SS 2">SS 2</option>
                      <option value="SS 3">SS 3</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">You can admit the student to a different class than what they applied for.</p>
                  </div>
                )}

                {admissionData.status === 'assigned' && (
                  <div>
                    <label className="label">Select Exam to Assign</label>
                    <select 
                      onChange={e => handleAssignExam(selectedApplication.id, e.target.value)}
                      className="input"
                    >
                      <option value="">Select Exam</option>
                      {exams.map(exam => (
                        <option key={exam.id} value={exam.id}>{exam.title} ({exam.level})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
                <button onClick={() => setShowApplicationModal(false)} className="btn-ghost">Cancel</button>
                {admissionData.status !== 'assigned' && (
                  <button onClick={handleAdmissionDecision} disabled={saving || !admissionData.status} className="btn-primary disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Decision'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}