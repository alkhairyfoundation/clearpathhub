'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  ArrowLeft, Plus, Edit, Trash2, X, FileText, Clock, Users, Check, 
  Loader2, Search, QrCode, Eye, Hash, Download, Award, AlertCircle, 
  GraduationCap, ChevronDown, CheckCircle, XCircle, Filter
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
  const [activeTab, setActiveTab] = useState<'exams' | 'codes' | 'applications' | 'questionBank' | 'analytics'>('applications');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
   const [formData, setFormData] = useState({
     title: '', description: '', level: '', academic_year: new Date().getFullYear().toString(),
     exam_date: '', duration_minutes: 60, passing_score: 50, total_questions: 40,
     shuffle_questions: false, require_fullscreen: false, prevent_tab_switch: false, max_tab_switches: 3
   });
   const [questionData, setQuestionData] = useState({
     question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'multiple_choice', subject: '',
     difficulty_level: 'MEDIUM', topic: '', subtopic: '', explanation: ''
   });
   const [admissionData, setAdmissionData] = useState({
     status: '', admitted_class: '', notes: ''
   });
   
   // Question Bank State
   const [questionBankFilter, setQuestionBankFilter] = useState({
     subject: '',
     level: '',
     difficulty: '',
     questionType: ''
   });
   const [questionBankSearch, setQuestionBankSearch] = useState('');
   const [questionBankLoading, setQuestionBankLoading] = useState(false);
   const [questionBank, setQuestionBank] = useState<any[]>([]);
   const [filteredQuestionBank, setFilteredQuestionBank] = useState<any[]>([]);
   const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
   const [editingQuestion, setEditingQuestion] = useState<any>(null);
   const [questionBankError, setQuestionBankError] = useState('');
   const [questionBankSuccess, setQuestionBankSuccess] = useState('');
   
   // Analytics State
   const [analyticsLoading, setAnalyticsLoading] = useState(false);
   const [analyticsData, setAnalyticsData] = useState<any[]>([]);
   const [analyticsSummary, setAnalyticsSummary] = useState({
     totalStudents: 0,
     averageScore: 0,
     masteredCount: 0
   });
   const [analyticsMasteryDistribution, setAnalyticsMasteryDistribution] = useState({
     POOR: 0,
     GOOD: 0,
     EXCELLENT: 0,
     PROFICIENT: 0,
     MASTERED: 0
   });
   const [showAnalyticsFilterModal, setShowAnalyticsFilterModal] = useState(false);
const [error, setError] = useState('');
   const [success, setSuccess] = useState('');
   const [warning, setWarning] = useState('');

   const QUESTION_TYPES = [
     { value: 'multiple_choice', label: 'Multiple Choice' },
     { value: 'true_false', label: 'True / False' },
     { value: 'fill_blank', label: 'Fill in the Blank' },
   ];

function resetQuestionDefaults(type: string) {
      let opts = ['', '', '', ''];
      let correct: any = 0;
      if (type === 'true_false') { opts = ['True', 'False']; correct = 0; }
      else if (type === 'fill_blank') { opts = []; correct = 0; }
      else if (type === 'MCQ') { opts = ['', '', '', '']; correct = 0; }
      
      setQuestionData({ 
        ...questionData, 
        options: opts, 
        correct_answer: correct, 
        question_type: type,
        difficulty_level: 'MEDIUM',
        topic: '',
        subtopic: '',
        explanation: ''
      });
    }

useEffect(() => {
     if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
     fetchData();
   }, [profile]);

   // Fetch question bank when tab changes to question bank
   useEffect(() => {
     if (activeTab === 'questionBank') {
       fetchQuestionBank();
     }
   }, [activeTab]);

   // Fetch analytics when tab changes to analytics
   useEffect(() => {
     if (activeTab === 'analytics') {
       fetchAnalytics();
     }
   }, [activeTab]);

   // Filter question bank when search changes
   useEffect(() => {
     if (activeTab === 'questionBank') {
       filterQuestionBank();
     }
   }, [questionBankSearch, activeTab]);

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
       const { data: examData, error } = await supabase
         .from('entrance_exams')
         .insert({ ...formData, created_by: profile?.id })
         .select()
         .single();
       
       if (error) throw new Error(error.message);
       
       // Auto-populate questions from question bank if exam has level and subjects specified
       if (formData.level && (formData.level.includes('JSS') || formData.level.includes('SS'))) {
         await autoPopulateExamQuestions(examData.id, formData.level);
       }
       
       setSuccess('Exam created and populated with questions');
       setShowExamModal(false);
       fetchData();
     } catch (err: any) {
       setError(err.message || 'Failed to create exam');
     } finally {
       setSaving(false);
     }
   }
   
   async function autoPopulateExamQuestions(examId: string, level: string) {
     try {
       // Determine subjects based on level (for now, always English and Mathematics)
       const subjects = ['ENGLISH', 'MATHEMATICS'];
       const questionsPerSubject = Math.max(1, Math.floor(formData.total_questions / subjects.length));
       
       let allSelectedQuestions: any[] = [];
       
       for (const subject of subjects) {
         // Select questions from question bank with a distribution favoring harder questions
         // 40% VERY_HARD, 30% HARD, 20% MEDIUM, 10% EASY
         const veryHardCount = Math.max(1, Math.round(questionsPerSubject * 0.4));
         const hardCount = Math.max(1, Math.round(questionsPerSubject * 0.3));
         const mediumCount = Math.max(1, Math.round(questionsPerSubject * 0.2));
         const easyCount = Math.max(0, questionsPerSubject - veryHardCount - hardCount - mediumCount);
         
         // Fetch questions for each difficulty level
         const { data: veryHardData } = await supabase
           .from('question_bank')
           .select('*')
           .eq('subject', subject)
           .eq('level', level)
           .eq('difficulty_level', 'VERY_HARD')
           .eq('is_active', true)
           .limit(veryHardCount * 2); // Get extra for random selection
           
         const { data: hardData } = await supabase
           .from('question_bank')
           .select('*')
           .eq('subject', subject)
           .eq('level', level)
           .eq('difficulty_level', 'HARD')
           .eq('is_active', true)
           .limit(hardCount * 2);
           
         const { data: mediumData } = await supabase
           .from('question_bank')
           .select('*')
           .eq('subject', subject)
           .eq('level', level)
           .eq('difficulty_level', 'MEDIUM')
           .eq('is_active', true)
           .limit(mediumCount * 2);
           
         const { data: easyData } = await supabase
           .from('question_bank')
           .select('*')
           .eq('subject', subject)
           .eq('level', level)
           .eq('difficulty_level', 'EASY')
           .eq('is_active', true)
           .limit(easyCount * 2);
         
         // Select random questions from each difficulty category
         if (veryHardData && veryHardData.length > 0) {
           const shuffledVeryHard = veryHardData.sort(() => Math.random() - 0.5);
           const selectedVeryHard = shuffledVeryHard.slice(0, veryHardCount);
           allSelectedQuestions = [...allSelectedQuestions, ...selectedVeryHard];
         }
         
         if (hardData && hardData.length > 0) {
           const shuffledHard = hardData.sort(() => Math.random() - 0.5);
           const selectedHard = shuffledHard.slice(0, hardCount);
           allSelectedQuestions = [...allSelectedQuestions, ...selectedHard];
         }
         
         if (mediumData && mediumData.length > 0) {
           const shuffledMedium = mediumData.sort(() => Math.random() - 0.5);
           const selectedMedium = shuffledMedium.slice(0, mediumCount);
           allSelectedQuestions = [...allSelectedQuestions, ...selectedMedium];
         }
         
         if (easyData && easyData.length > 0) {
           const shuffledEasy = easyData.sort(() => Math.random() - 0.5);
           const selectedEasy = shuffledEasy.slice(0, easyCount);
           allSelectedQuestions = [...allSelectedQuestions, ...selectedEasy];
         }
       }
       
       // If we don't have enough questions, fill with any available questions for the level
       if (allSelectedQuestions.length < formData.total_questions) {
         const { data: additionalQuestions } = await supabase
           .from('question_bank')
           .select('*')
           .eq('level', level)
           .eq('is_active', true)
           .not('id', 'in', allSelectedQuestions.map(q => q.id))
           .order('difficulty_level', { ascending: false })
           .limit(formData.total_questions - allSelectedQuestions.length);
           
         if (additionalQuestions) {
           allSelectedQuestions = [...allSelectedQuestions, ...additionalQuestions];
         }
       }
       
       // Shuffle all selected questions to distribute difficulty levels throughout the exam
       if (allSelectedQuestions.length > 0) {
         allSelectedQuestions = allSelectedQuestions.sort(() => Math.random() - 0.5);
       }
       
       // Insert selected questions into entrance_questions
       if (allSelectedQuestions.length > 0) {
         const questionsToInsert = allSelectedQuestions.map(q => ({
           exam_id: examId,
           question: q.question,
           question_image: q.question_image,
           options: q.options,
           option_images: q.option_images,
           correct_answer: q.correct_answer,
           points: q.points,
           question_type: q.question_type,
           subject: q.subject,
           difficulty_level: q.difficulty_level,
           topic: q.topic,
           subtopic: q.subtopic,
           explanation: q.explanation
         }));
         
         const { error } = await supabase.from('entrance_questions').insert(questionsToInsert);
         if (error) throw new Error(`Failed to insert questions: ${error.message}`);
       }
     } catch (error) {
       console.error('Error auto-populating exam questions:', error);
       // Don't fail the exam creation if question population fails
       setWarning('Exam created but question auto-population had issues. You can add questions manually.');
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
   
   // Question Bank Functions
   async function fetchQuestionBank() {
     setQuestionBankLoading(true);
     setQuestionBankError('');
     try {
       let query = supabase.from('question_bank').select('*');
       
       // Apply filters
       if (questionBankFilter.subject) query = query.eq('subject', questionBankFilter.subject);
       if (questionBankFilter.level) query = query.eq('level', questionBankFilter.level);
       if (questionBankFilter.difficulty) query = query.eq('difficulty_level', questionBankFilter.difficulty);
       if (questionBankFilter.questionType) query = query.eq('question_type', questionBankFilter.questionType);
       
       // Apply search
       if (questionBankSearch) {
         query = query.ilike('question', `%${questionBankSearch}%`);
       }
       
       const { data, error } = await query.order('created_at', { ascending: false });
       
       if (error) throw new Error(error.message);
       setQuestionBank(data);
       setFilteredQuestionBank(data);
     } catch (err: any) {
       setQuestionBankError(err.message || 'Failed to fetch questions');
     } finally {
       setQuestionBankLoading(false);
     }
   }
   
   function filterQuestionBank() {
     const searchLower = questionBankSearch.toLowerCase();
     setFilteredQuestionBank(
       questionBank.filter(q => 
         q.question.toLowerCase().includes(searchLower)
       )
     );
   }
   
   async function addQuestionToBank(questionData: any) {
     setQuestionBankError('');
     setQuestionBankSuccess('');
     try {
       const { error } = await supabase.from('question_bank').insert(questionData);
       if (error) throw new Error(error.message);
       setQuestionBankSuccess('Question added successfully');
       await fetchQuestionBank();
       setShowQuestionBankModal(false);
     } catch (err: any) {
       setQuestionBankError(err.message || 'Failed to add question');
     }
   }
   
   async function updateQuestionInBank(id: string, questionData: any) {
     setQuestionBankError('');
     setQuestionBankSuccess('');
     try {
       const { error } = await supabase.from('question_bank').update(questionData).eq('id', id);
       if (error) throw new Error(error.message);
       setQuestionBankSuccess('Question updated successfully');
       await fetchQuestionBank();
       setEditingQuestion(null);
     } catch (err: any) {
       setQuestionBankError(err.message || 'Failed to update question');
     }
   }
   
   async function deleteQuestion(id: string) {
     if (!confirm('Delete this question?')) return;
     setQuestionBankError('');
     try {
       const { error } = await supabase.from('question_bank').delete().eq('id', id);
       if (error) throw new Error(error.message);
       await fetchQuestionBank();
     } catch (err: any) {
       setQuestionBankError(err.message || 'Failed to delete question');
     }
   }
   
   function editQuestion(question: any) {
     setEditingQuestion(question);
     setShowQuestionBankModal(true);
   }
   
   function openQuestionBankModal() {
     setEditingQuestion(null);
     setShowQuestionBankModal(true);
   }
   
   // Analytics Functions
   async function fetchAnalytics() {
     setAnalyticsLoading(true);
     try {
       const { data } = await supabase
         .from('student_analytics')
         .select('*, entrance_applications!inner(first_name, last_name)')
         .order('generated_at', { ascending: false });
       
       if (data) {
         // Process data for display
         const processedData = data.map((record: any) => ({
           ...record,
           student_name: `${record.entrance_applications.first_name} ${record.entrance_applications.last_name}`
         }));
         
         setAnalyticsData(processedData);
         
         // Calculate summary
         const totalStudents = processedData.length;
         const averageScore = totalStudents > 0 
           ? processedData.reduce((sum, r) => sum + r.score, 0) / totalStudents 
           : 0;
         const masteredCount = processedData.filter(r => r.mastery_level === 'MASTERED').length;
         
         setAnalyticsSummary({
           totalStudents,
           averageScore: Math.round(averageScore * 100) / 100,
           masteredCount
         });
         
         // Calculate mastery distribution
         const distribution = {
           POOR: 0,
           GOOD: 0,
           EXCELLENT: 0,
           PROFICIENT: 0,
           MASTERED: 0
         };
         
         processedData.forEach(record => {
           if (record.mastery_level in distribution) {
             distribution[record.mastery_level as keyof typeof distribution] += 1;
           }
         });
         
         setAnalyticsMasteryDistribution(distribution);
       }
     } catch (err: any) {
       console.error('Error fetching analytics:', err);
     } finally {
       setAnalyticsLoading(false);
     }
   }
   
   async function generateReports() {
     // In a real implementation, this would generate PDF reports
     // For now, we'll show a message that this would be implemented
     alert('PDF report generation functionality would be implemented here in a production system. '\
           'This would generate detailed reports for selected students or groups of students '\
           'with mastery levels, topic breakdowns, and recommendations.');
   }
   
   function viewAnalyticsDetails(record: any) {
     // In a real implementation, this would show a detailed modal
     alert(`Viewing detailed analytics for ${record.student_name}`);
   }
   
   function downloadAnalyticsReport(id: string) {
     // In a real implementation, this would generate and download a PDF
     alert(`Downloading PDF report for analytics record ${id}`);
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
  {(['applications', 'exams', 'codes', 'questionBank', 'analytics'] as const).map(tab => (
    <button 
      key={tab} 
      onClick={() => setActiveTab(tab)} 
      className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
    >
      {tab === 'questionBank' ? 'Question Bank' : tab === 'analytics' ? 'Analytics' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
           
           {activeTab === 'questionBank' && (
             <div>
               <div className="space-y-4">
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-bold text-slate-900">Question Bank</h2>
                   <button onClick={() => setShowQuestionBankModal(true)} className="btn-primary">
                     <Plus size={18} />Add Question
                   </button>
                 </div>
                 
                 <div className="mb-4">
                   <div className="flex gap-4">
                     <div>
                       <label className="label">Subject</label>
                       <select value={questionBankFilter.subject} onChange={e => setQuestionBankFilter({...questionBankFilter, subject: e.target.value})} className="input">
                         <option value="">All Subjects</option>
                         <option value="ENGLISH">English</option>
                         <option value="MATHEMATICS">Mathematics</option>
                       </select>
                     </div>
                     <div>
                       <label className="label">Level</label>
                       <select value={questionBankFilter.level} onChange={e => setQuestionBankFilter({...questionBankFilter, level: e.target.value})} className="input">
                         <option value="">All Levels</option>
                         <option value="JSS1">JSS 1</option>
                         <option value="JSS2">JSS 2</option>
                         <option value="JSS3">JSS 3</option>
                         <option value="SS1">SS 1</option>
                         <option value="SS2">SS 2</option>
                       </select>
                     </div>
                     <div>
                       <label className="label">Difficulty</label>
                       <select value={questionBankFilter.difficulty} onChange={e => setQuestionBankFilter({...questionBankFilter, difficulty: e.target.value})} className="input">
                         <option value="">All Difficulties</option>
                         <option value="EASY">Easy</option>
                         <option value="MEDIUM">Medium</option>
                         <option value="HARD">Hard</option>
                         <option value="VERY_HARD">Very Hard</option>
                       </select>
                     </div>
                     <div>
                       <label className="label">Question Type</label>
                       <select value={questionBankFilter.questionType} onChange={e => setQuestionBankFilter({...questionBankFilter, questionType: e.target.value})} className="input">
                         <option value="">All Types</option>
                         <option value="MCQ">Multiple Choice</option>
                         <option value="FILL_IN_THE_GAP">Fill in the Gap</option>
                         <option value="TRUE_FALSE">True/False</option>
                       </select>
                     </div>
                   </div>
                   
                   <div className="mt-2 flex items-center gap-4">
                     <input 
                       type="text" 
                       placeholder="Search questions..." 
                       value={questionBankSearch} 
                       onChange={e => setQuestionBankSearch(e.target.value)} 
                       className="input pl-10"
                     />
                     <button onClick={fetchQuestionBank} className="btn-outline">
                       <Search size={18} />Search
                     </button>
                   </div>
                 </div>
                 
                 {questionBankLoading ? (
                   <div className="flex items-center justify-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                   </div>
                 ) : filteredQuestionBank.length === 0 ? (
                   <div className="text-center py-8 text-slate-500">No questions found matching your criteria</div>
                 ) : (
                   <div className="space-y-3">
                     {filteredQuestionBank.map(q => (
                       <div key={q.id} className="p-4 bg-slate-50 rounded-lg border-l-4 border-primary-500">
                         <div className="flex items-start justify-between mb-2">
                           <div className="flex-1">
                             <h3 className="text-lg font-medium text-slate-900">{q.question}</h3>
                             <div className="flex items-center gap-3 mt-1 text-sm">
                               <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">{q.subject}</span>
                               <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">{q.level}</span>
                               <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${q.difficulty_level === 'VERY_HARD' ? 'bg-red-100 text-red-800' : q.difficulty_level === 'HARD' ? 'bg-orange-100 text-orange-800' : q.difficulty_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                 {q.difficulty_level}
                               </span>
                               <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">{q.question_type}</span>
                             </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <button onClick={() => editQuestion(q)} className="p-1 hover:bg-slate-100 rounded-lg" title="Edit">
                               <Edit size={16} className="text-slate-500" />
                             </button>
                             <button onClick={() => deleteQuestion(q.id)} className="p-1 hover:bg-slate-100 rounded-lg" title="Delete">
                               <Trash2 size={16} className="text-red-500" />
                             </button>
                           </div>
                         </div>
                         
                         {q.question_image && (
                           <div className="mt-3">
                             <img src={q.question_image} alt="Question illustration" className="max-h-48 rounded-lg border object-contain" />
                           </div>
                         )}
                         
                         {q.question_type === 'MCQ' && q.options && (
                           <div className="mt-3 space-y-2">
                             <p className="font-medium text-slate-700">Options:</p>
                             {q.options.map((opt, i) => (
                               <div key={i} className="flex items-center gap-2 text-sm">
                                 <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-sm flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                                 <span className="flex-1">{opt}</span>
                                 {q.correct_answer === i && <span className="ml-2 text-xs font-medium bg-primary-100 text-primary-800 rounded-full px-1.5">Correct</span>}
                               </div>
                             ))}
                           </div>
                         )}
                         
                         {q.question_type === 'TRUE_FALSE' && (
                           <div className="mt-3 space-y-2">
                             <p className="font-medium text-slate-700">Options:</p>
                             <div className="flex items-center gap-2 text-sm">
                               <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-sm flex-shrink-0">T</span>
                               <span className="flex-1">True</span>
                               {q.correct_answer === 0 && <span className="ml-2 text-xs font-medium bg-primary-100 text-primary-800 rounded-full px-1.5">Correct</span>}
                             </div>
                             <div className="flex items-center gap-2 text-sm">
                               <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-sm flex-shrink-0">F</span>
                               <span className="flex-1">False</span>
                               {q.correct_answer === 1 && <span className="ml-2 text-xs font-medium bg-primary-100 text-primary-800 rounded-full px-1.5">Correct</span>}
                             </div>
                           </div>
                         )}
                         
                         {q.question_type === 'FILL_IN_THE_GAP' && (
                           <div className="mt-3">
                             <p className="font-medium text-slate-700">Correct Answer:</p>
                             <p className="text-sm text-slate-500">{q.options?.[q.correct_answer] || 'N/A'}</p>
                           </div>
                         )}
                         
                         {q.explanation && (
                           <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                             <p className="font-medium text-slate-700 mb-1">Explanation:</p>
                             <p className="text-sm text-slate-500">{q.explanation}</p>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
           )}
           
           {activeTab === 'analytics' && (
             <div>
               <div className="space-y-4">
                 <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-bold text-slate-900">Student Analytics</h2>
                   <div className="flex gap-2">
                     <button onClick={() => setShowAnalyticsFilterModal(true)} className="btn-outline">
                       <Filter size={18} />Filter
                     </button>
                     <button onClick={generateReports} className="btn-primary">
                       <Download size={18} />Generate Reports
                     </button>
                   </div>
                 </div>
                 
                 <div className="mb-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="card">
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-sm text-slate-500">Total Students Analyzed</span>
                       </div>
                       <p className="text-2xl font-bold text-primary-600">{analyticsSummary.totalStudents}</p>
                     </div>
                     <div className="card">
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-sm text-slate-500">Average Score</span>
                       </div>
                       <p className="text-2xl font-bold text-primary-600">{analyticsSummary.averageScore}%</p>
                     </div>
                     <div className="card">
                       <div className="flex items-center justify-between mb-2">
                         <span className="text-sm text-slate-500">Mastered Students</span>
                       </div>
                       <p className="text-2xl font-bold text-primary-600">{analyticsSummary.masteredCount}</p>
                     </div>
                   </div>
                 </div>
                 
                 <div className="mb-4">
                   <div className="flex gap-4 mb-2">
                     <span className="text-sm font-medium text-slate-700">Mastery Level Distribution</span>
                   </div>
                   <div className="grid grid-cols-5 gap-4">
                     {['POOR', 'GOOD', 'EXCELLENT', 'PROFICIENT', 'MASTERED'].map(level => (
                       <div key={level} className="p-4 bg-slate-50 rounded-lg text-center">
                         <p className="text-sm font-medium text-slate-700">{level}</p>
                         <p className="text-2xl font-bold">{analyticsMasteryDistribution[level] || 0}</p>
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 {analyticsLoading ? (
                   <div className="flex items-center justify-center py-12">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                   </div>
                 ) : analyticsData.length === 0 ? (
                   <div className="text-center py-8 text-slate-500">No analytics data available</div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-slate-200">
                       <thead>
                         <tr className="bg-slate-50">
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Student</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Subject</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Score</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Mastery Level</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time Taken</th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-200">
                         {analyticsData.map(record => (
                           <tr key={record.id} className="hover:bg-slate-50">
                             <td className="px-6 py-4 whitespace-nowrap">
                               <div className="flex items-center">
                                 <div className="h-8 w-8 flex-shrink-0">
                                   <div className="flex items-center justify-center bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                                     {record.student_name?.charAt(0) || 'A'}
                                   </div>
                                 </div>
                                 <div className="ml-3">
                                   <p className="text-sm font-medium text-slate-900">{record.student_name}</p>
                                 </div>
                               </div>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm">{record.subject}</td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <p className={`text-sm font-medium ${record.score >= 90 ? 'text-green-600' : record.score >= 80 ? 'text-yellow-600' : record.score >= 70 ? 'text-orange-600' : 'text-red-600'}`}>
                                 {record.score}%
                               </p>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${record.mastery_level === 'POOR' ? 'bg-red-100 text-red-800' : record.mastery_level === 'GOOD' ? 'bg-yellow-100 text-yellow-800' : record.mastery_level === 'EXCELLENT' ? 'bg-green-100 text-green-800' : record.mastery_level === 'PROFICIENT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                 {record.mastery_level}
                               </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm">{record.time_taken} min</td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                               <div className="flex space-x-2">
                                 <button onClick={() => viewAnalyticsDetails(record)} className="p-1 hover:bg-slate-100 rounded-lg" title="View Details">
                                   <Eye size={16} className="text-slate-500" />
                                 </button>
                                 <button onClick={() => downloadAnalyticsReport(record.id)} className="p-1 hover:bg-slate-100 rounded-lg" title="Download PDF">
                                   <Download size={16} className="text-primary-600" />
                                 </button>
                               </div>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
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
               {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
               {success && <p className="mb-2 text-sm text-green-600">{success}</p>}
               {warning && <p className="mb-2 text-sm text-amber-600">{warning}</p>}
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
         
         {/* Question Bank Modal */}
         {showQuestionBankModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
               <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                 <h3 className="text-lg font-bold text-slate-900">
                   {editingQuestion ? 'Edit Question' : 'Add Question to Bank'}
                 </h3>
                 <button onClick={() => setShowQuestionBankModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                   <X size={20} className="text-slate-500" />
                 </button>
               </div>
               <div className="p-5 space-y-4">
                 <div className="mb-4">
                   <div className="flex items-center gap-2">
                     <div className="flex-1"><label className="label">Question Type</label></div>
                     <select 
                       value={editingQuestion?.question_type || questionData.question_type} 
                       onChange={e => {
                         const questionType = e.target.value;
                         let opts = ['', '', '', ''];
                         let correct: any = 0;
                         if (questionType === 'true_false') { opts = ['True', 'False']; correct = 0; }
                         else if (questionType === 'fill_blank') { opts = []; correct = 0; }
                         else if (questionType === 'short_answer') { opts = []; correct = 0; }
                         else if (questionType === 'MCQ') { opts = ['', '', '', '']; correct = 0; }
                         
                         setQuestionData(prev => ({
                           ...prev,
                           options: opts,
                           correct_answer: correct,
                           question_type: questionType
                         }));
                       }}
                       className="input w-48"
                     >
                       <option value="MCQ">Multiple Choice</option>
                       <option value="TRUE_FALSE">True/False</option>
                       <option value="FILL_IN_THE_GAP">Fill in the Gap</option>
                       <option value="SHORT_ANSWER">Short Answer</option>
                     </select>
                   </div>
                 </div>
                 
                 <div><label className="label">Question</label>
                   <textarea 
                     value={editingQuestion?.question || questionData.question} 
                     onChange={e => setQuestionData({...questionData, question: e.target.value})} 
                     className="input" 
                     rows={3}
                   />
                 </div>
                 
                 <div><label className="label">Subject</label>
                   <select 
                     value={editingQuestion?.subject || questionData.subject} 
                     onChange={e => setQuestionData({...questionData, subject: e.target.value})} 
                     className="input"
                   >
                     <option value="">Select Subject</option>
                     <option value="ENGLISH">English</option>
                     <option value="MATHEMATICS">Mathematics</option>
                   </select>
                 </div>
                 
                 <div><label className="label">Level</label>
                   <select 
                     value={editingQuestion?.level || questionData.level} 
                     onChange={e => setQuestionData({...questionData, level: e.target.value})} 
                     className="input"
                   >
                     <option value="">Select Level</option>
                     <option value="JSS1">JSS 1</option>
                     <option value="JSS2">JSS 2</option>
                     <option value="JSS3">JSS 3</option>
                     <option value="SS1">SS 1</option>
                     <option value="SS2">SS 2</option>
                   </select>
                 </div>
                 
                 <div><label className="label">Difficulty Level</label>
                   <select 
                     value={editingQuestion?.difficulty_level || questionData.difficulty_level} 
                     onChange={e => setQuestionData({...questionData, difficulty_level: e.target.value})} 
                     className="input"
                   >
                     <option value="">Select Difficulty</option>
                     <option value="EASY">Easy</option>
                     <option value="MEDIUM">Medium</option>
                     <option value="HARD">Hard</option>
                     <option value="VERY_HARD">Very Hard</option>
                   </select>
                 </div>
                 
                 <div><label className="label">Topic</label>
                   <input 
                     type="text" 
                     value={editingQuestion?.topic || questionData.topic} 
                     onChange={e => setQuestionData({...questionData, topic: e.target.value})} 
                     className="input"
                   />
                 </div>
                 
                 <div><label className="label">Subtopic</label>
                   <input 
                     type="text" 
                     value={editingQuestion?.subtopic || questionData.subtopic} 
                     onChange={e => setQuestionData({...questionData, subtopic: e.target.value})} 
                     className="input"
                   />
                 </div>
                 
                 {editingQuestion?.question_type === 'MCQ' || questionData.question_type === 'MCQ' && (
                   <div><label className="label">Options (select the correct one)</label>
                     {(editingQuestion?.options || questionData.options || ['', '', '', '']).map((opt, i) => (
                       <div key={i} className="flex items-center gap-2 mb-2">
                         <input 
                           type="radio" 
                           checked={(editingQuestion?.correct_answer || questionData.correct_answer) === i} 
                           onChange={() => {
                             setQuestionData(prev => ({
                               ...prev,
                               correct_answer: i
                             }));
                           }} 
                         />
                         <input 
                           type="text" 
                           value={(editingQuestion?.options || questionData.options || ['', '', '', ''])[i] || ''} 
                           onChange={e => {
                             const opts = [...(editingQuestion?.options || questionData.options || ['', '', '', ''])];
                             opts[i] = e.target.value;
                             setQuestionData(prev => ({
                               ...prev,
                               options: opts
                             }));
                           }} 
                           className="input flex-1" 
                           placeholder={`Option ${i + 1}`}
                         />
                       </div>
                     ))}
                   </div>
                 )}
                 
                 {editingQuestion?.question_type === 'TRUE_FALSE' || questionData.question_type === 'TRUE_FALSE' && (
                   <div><label className="label">Correct Answer</label>
                     <div className="grid grid-cols-2 gap-2">
                       {['True', 'False'].map((opt, i) => (
                         <label key={i} className={`p-3 rounded-lg border-2 cursor-pointer text-center ${(editingQuestion?.correct_answer || questionData.correct_answer) === i ? 'border-primary-500 bg-primary-50' : 'border-slate-200'}`}>
                           <input 
                             type="radio" 
                             checked={(editingQuestion?.correct_answer || questionData.correct_answer) === i} 
                             onChange={() => {
                               setQuestionData(prev => ({
                                 ...prev,
                                 correct_answer: i
                               }));
                             }} 
                             className="sr-only"
                           />
                           <span className="font-medium">{opt}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                 )}
                 
                 {editingQuestion?.question_type === 'FILL_IN_THE_GAP' || questionData.question_type === 'FILL_IN_THE_GAP' && (
                   <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700">
                     Students will type the answer. Include <code className="bg-primary-100 px-1 rounded">___</code> in the question text where the blank should be.
                   </div>
                 )}
                 
                 {editingQuestion?.question_type === 'SHORT_ANSWER' || questionData.question_type === 'SHORT_ANSWER' && (
                   <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
                     Students will write a short answer. This requires manual grading.
                   </div>
                 )}
                 
                 <div><label className="label">Explanation</label>
                   <textarea 
                     value={editingQuestion?.explanation || questionData.explanation || ''} 
                     onChange={e => setQuestionData({...questionData, explanation: e.target.value})} 
                     className="input" 
                     rows={3}
                   />
                 </div>
                 
                 <div><label className="label">Points</label>
                   <input 
                     type="number" 
                     value={editingQuestion?.points || questionData.points || 1} 
                     onChange={e => setQuestionData({...questionData, points: parseInt(e.target.value) || 1})} 
                     className="input"
                   />
                 </div>
               </div>
               
               <div className="flex justify-end gap-3 p-5 border-t border-slate-200 sticky bottom-0 bg-white">
                 <button onClick={() => setShowQuestionBankModal(false)} className="btn-ghost">Cancel</button>
                 {editingQuestion ? (
                   <button 
                     onClick={() => updateQuestionInBank(editingQuestion.id, {
                       ...questionData,
                       level: questionData.level,
                       difficulty_level: questionData.difficulty_level,
                       topic: questionData.topic,
                       subtopic: questionData.subtopic,
                       points: questionData.points
                     })} 
                     disabled={questionBankLoading} 
                     className="btn-primary disabled:opacity-50"
                   >
                     {questionBankLoading ? 'Updating...' : 'Update Question'}
                   </button>
                 ) : (
                   <button 
                     onClick={() => addQuestionToBank({
                       ...questionData,
                       level: questionData.level,
                       difficulty_level: questionData.difficulty_level,
                       topic: questionData.topic,
                       subtopic: questionData.subtopic,
                       points: questionData.points
                     })} 
                     disabled={questionBankLoading} 
                     className="btn-primary disabled:opacity-50"
                   >
                     {questionBankLoading ? 'Adding...' : 'Add to Question Bank'}
                   </button>
                 )}
               </div>
             </div>
           </div>
         )}
         
         {/* Analytics Filter Modal */}
         {showAnalyticsFilterModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
               <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                 <h3 className="text-lg font-bold text-slate-900">Analytics Filters</h3>
                 <button onClick={() => setShowAnalyticsFilterModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                   <X size={20} className="text-slate-500" />
                 </button>
               </div>
               <div className="p-5">
                 <p className="text-sm text-slate-500 mb-4">Analytics filter functionality would be implemented here</p>
                 <div className="flex justify-end pt-4">
                   <button onClick={() => setShowAnalyticsFilterModal(false)} className="btn-ghost">Cancel</button>
                   <button onClick={() => {
                     setShowAnalyticsFilterModal(false);
                     // In a real implementation, apply filters and fetch data
                   }} className="btn-primary">Apply Filters</button>
                 </div>
               </div>
             </div>
           </div>
         )}
       </div>
     </DashboardLayout>
   );
 }