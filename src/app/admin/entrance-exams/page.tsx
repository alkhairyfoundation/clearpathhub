'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, Copy, Download, Upload, Eye, Check, Clock, Users, FileText, QrCode, BarChart3 } from 'lucide-react';

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

  async function handleCreateExam() {
    const { data: exam } = await supabase.from('entrance_exams').insert({ ...formData, created_by: profile?.id, is_published: true, is_active: true }).select().single();
    if (exam) {
      setExams([exam, ...exams]);
      setSelectedExam(exam);
      setShowExamModal(false);
      setFormData({ title: '', description: '', level: '', academic_year: new Date().getFullYear().toString(), exam_date: '', duration_minutes: 60, passing_score: 50, total_questions: 10 });
    }
  }

  async function handleAddQuestion() {
    if (!selectedExam) return;
    await supabase.from('entrance_questions').insert({ ...questionData, exam_id: selectedExam.id, options: questionData.options, points: 1 });
    fetchQuestions(selectedExam.id);
    setQuestionData({ question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '' });
    setShowQuestionModal(false);
  }

  async function handleGenerateCode() {
    if (!selectedExam) return;
    const code = `${selectedExam.level}-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from('entrance_codes').insert({ exam_id: selectedExam.id, code, max_uses: 100, is_active: true });
    setShowCodeModal(false);
    fetchCodes();
  }

  async function fetchCodes() {
    if (!selectedExam) return;
    const { data } = await supabase.from('entrance_codes').select('*').eq('exam_id', selectedExam.id).order('created_at', { ascending: false });
    if (data) setCodes(data);
  }

  async function deleteExam(id: string) {
    if (confirm('Delete this exam and all questions?')) {
      await supabase.from('entrance_exams').delete().eq('id', id);
      await supabase.from('entrance_questions').delete().eq('exam_id', id);
      await supabase.from('entrance_codes').delete().eq('exam_id', id);
      fetchData();
    }
  }

  const passedApps = applications.filter(a => a.status === 'passed').length;
  const failedApps = applications.filter(a => a.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Entrance Exams</h1><p className="text-slate-500">Manage entrance exams for new students</p></div>
        <button onClick={() => setShowExamModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Create Exam</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total Exams</span><FileText size={18} className="text-blue-600" /></div><p className="text-2xl font-bold text-slate-800">{exams.length}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Applications</span><Users size={18} className="text-purple-600" /></div><p className="text-2xl font-bold text-slate-800">{applications.length}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Passed</span><Check size={18} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{passedApps}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Failed</span><X size={18} className="text-red-600" /></div><p className="text-2xl font-bold text-red-600">{failedApps}</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex gap-4 mb-6 border-b">
          {(['exams', 'codes', 'applications'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-medium ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'exams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(exam => (
              <div key={exam.id} className="border rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div><h3 className="font-semibold text-slate-800">{exam.title}</h3><p className="text-sm text-slate-500">{exam.level} • {exam.academic_year}</p></div>
                  <span className={`px-2 py-1 rounded-full text-xs ${exam.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{exam.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1"><Clock size={14} />{exam.duration_minutes} min</span>
                  <span className="flex items-center gap-1"><FileText size={14} />{exam.total_questions} Qs</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedExam(exam); fetchQuestions(exam.id); setShowQuestionModal(true); }} className="btn-outline flex-1 text-sm">Add Questions</button>
                  <button onClick={() => { setSelectedExam(exam); fetchCodes(); setShowCodeModal(true); }} className="btn-outline flex-1 text-sm">Codes</button>
                  <button onClick={() => deleteExam(exam.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b"><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Name</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Email</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Applied Class</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Score</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th><th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Date</th></tr></thead>
              <tbody>{applications.map(app => (<tr key={app.id} className="border-b"><td className="py-3 px-4">{app.first_name} {app.last_name}</td><td className="py-3 px-4 text-slate-600">{app.email}</td><td className="py-3 px-4">{app.applied_class}</td><td className="py-3 px-4 font-medium">{app.exam_score || '-'}</td><td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs ${app.status === 'passed' ? 'bg-green-100 text-green-700' : app.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{app.status}</span></td><td className="py-3 px-4 text-slate-500">{new Date(app.created_at).toLocaleDateString()}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>

      {showExamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Create Entrance Exam</h2><button onClick={() => setShowExamModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="label">Exam Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="e.g., Entrance Exam 2024" /></div>
              <div><label className="label">Level</label><select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className="input"><option value="">Select Level</option><option value="PRIMARY">Primary (1-6)</option><option value="JSS">JSS (1-3)</option><option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Academic Year</label><input type="text" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} className="input" /></div>
                <div><label className="label">Exam Date</label><input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} className="input" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Duration (min)</label><input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} className="input" /></div>
                <div><label className="label">Questions</label><input type="number" value={formData.total_questions} onChange={(e) => setFormData({ ...formData, total_questions: parseInt(e.target.value) })} className="input" /></div>
                <div><label className="label">Pass Score (%)</label><input type="number" value={formData.passing_score} onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })} className="input" /></div>
              </div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} /></div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowExamModal(false)} className="btn-outline">Cancel</button><button onClick={handleCreateExam} className="btn-primary">Create Exam</button></div>
          </div>
        </div>
      )}

      {showQuestionModal && selectedExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white"><h2 className="text-lg font-semibold text-slate-800">Add Questions - {selectedExam.title}</h2><button onClick={() => setShowQuestionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="label">Question</label><textarea value={questionData.question} onChange={(e) => setQuestionData({ ...questionData, question: e.target.value })} className="input" rows={3} placeholder="Enter question..." /></div>
              <div><label className="label">Question Image (optional URL)</label><input type="text" value={questionData.question_image} onChange={(e) => setQuestionData({ ...questionData, question_image: e.target.value })} className="input" placeholder="https://..." /></div>
              <div><label className="label">Subject</label><input type="text" value={questionData.subject} onChange={(e) => setQuestionData({ ...questionData, subject: e.target.value })} className="input" placeholder="e.g., Mathematics, English" /></div>
              <div><label className="label">Options (select correct)</label>{questionData.options.map((opt, i) => (<div key={i} className="flex items-center gap-2 mb-2"><input type="radio" checked={questionData.correct_answer === i} onChange={() => setQuestionData({ ...questionData, correct_answer: i })} /><input type="text" value={opt} onChange={(e) => { const opts = [...questionData.options]; opts[i] = e.target.value; setQuestionData({ ...questionData, options: opts }); }} className="input flex-1" placeholder={`Option ${i + 1}`} /></div>))}</div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white"><button onClick={() => setShowQuestionModal(false)} className="btn-outline">Done</button><button onClick={handleAddQuestion} className="btn-primary">Add Question</button></div>
          </div>
        </div>
      )}

      {showCodeModal && selectedExam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Generate Codes - {selectedExam.title}</h2><button onClick={() => setShowCodeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
            <div className="p-6">
              <button onClick={handleGenerateCode} className="btn-primary w-full flex items-center justify-center gap-2 mb-4"><QrCode size={18} />Generate New Code</button>
              <div className="space-y-2">{codes.map(code => (<div key={code.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><code className="font-mono font-bold text-lg text-blue-600">{code.code}</code><span className="text-sm text-slate-500">Used: {code.used_count}/{code.max_uses}</span></div>))}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}