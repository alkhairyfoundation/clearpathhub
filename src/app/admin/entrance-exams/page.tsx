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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      title: '', description: '', level: '', subjects: [] as string[], academic_year: new Date().getFullYear().toString(),
      exam_date: '', duration_minutes: 60, passing_score: 50, total_questions: 40,
      shuffle_questions: false, require_fullscreen: false, prevent_tab_switch: false, max_tab_switches: 3
    });

    const SUBJECT_OPTIONS: Record<string, string[]> = {
      'PRIMARY': ['MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'VERBAL REASONING', 'QUANTITATIVE REASONING', 'ISLAMIC STUDIES', 'GENERAL KNOWLEDGE'],
      'JSS': ['MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'BUSINESS STUDIES', 'PRE-VOCATIONAL STUDIES'],
      'SS1': ['MATHEMATICS', 'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY'],
      'SS2': ['MATHEMATICS', 'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY'],
      'SS3': ['MATHEMATICS', 'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY'],
    };
    const [questionData, setQuestionData] = useState({
      question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'MCQ', subject: '',
      level: '', difficulty_level: 'MEDIUM', topic: '', subtopic: '', explanation: ''
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
   const [showBankSelectModal, setShowBankSelectModal] = useState(false);
   const [bankSelectSearch, setBankSelectSearch] = useState('');
   const [bankSelectQuestions, setBankSelectQuestions] = useState<any[]>([]);
   const [bankSelectFiltered, setBankSelectFiltered] = useState<any[]>([]);
   const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
   
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
    const [selectedAnalytics, setSelectedAnalytics] = useState<any>(null);
    const [showAnalyticsDetailModal, setShowAnalyticsDetailModal] = useState(false);
    const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
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
      if (type === 'true_false' || type === 'TRUE_FALSE') { opts = ['True', 'False']; correct = 0; }
      else if (type === 'fill_blank' || type === 'FILL_IN_THE_GAP') { opts = []; correct = 0; }
      
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
      if (!formData.level) { setError('Level is required'); return; }
      if (!formData.subjects || formData.subjects.length === 0) { setError('Please select at least one subject'); return; }
      setError(''); setSaving(true);
      try {
        const subjects = formData.subjects || [];
        const { data: examData, error } = await supabase
          .from('entrance_exams')
          .insert({
            title: formData.title,
            description: formData.description,
            level: formData.level,
            academic_year: formData.academic_year,
            exam_date: formData.exam_date || null,
            duration_minutes: formData.duration_minutes,
            passing_score: formData.passing_score,
            total_questions: formData.total_questions,
            shuffle_questions: formData.shuffle_questions,
            require_fullscreen: formData.require_fullscreen,
            prevent_tab_switch: formData.prevent_tab_switch,
            max_tab_switches: formData.max_tab_switches,
            subjects,
            is_published: true,
            created_by: profile?.id,
          })
          .select()
          .single();
        
        if (error) throw new Error(error.message);
        
        // Auto-populate questions from question bank if exam has level and subjects specified
        if (formData.level && formData.subjects && formData.subjects.length > 0) {
          await autoPopulateExamQuestions(examData.id, formData.level, formData.subjects, formData.total_questions);
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
    
    function getQuestionBankLevels(examLevel: string): string[] {
      switch (examLevel) {
        case 'PRIMARY':
          return ['PRIMARY', 'PRIMARY 1', 'PRIMARY 2', 'PRIMARY 3', 'PRIMARY 4', 'PRIMARY 5', 'PRIMARY 6'];
        case 'JSS':
          return ['JSS1', 'JSS2', 'JSS3'];
        case 'SS1':
          return ['SS1'];
        case 'SS2':
          return ['SS2'];
        case 'SS3':
          return ['SS3', 'SS2']; // SS3 can include SS2 questions
        default:
          return [examLevel];
      }
    }

    async function autoPopulateExamQuestions(examId: string, examLevel: string, subjects: string[], totalQuestions?: number) {
      try {
        if (!subjects || subjects.length === 0) {
          console.warn('No subjects selected for exam');
          return;
        }

        const questionCount = totalQuestions || formData.total_questions || 40;
        const questionsPerSubject = Math.max(1, Math.floor(questionCount / subjects.length));
        
        let allSelectedQuestions: any[] = [];
        const bankLevels = getQuestionBankLevels(examLevel);
        
        for (const subject of subjects) {
          // Fetch questions for the subject across relevant levels
          const { data: subjectQuestions } = await supabase
            .from('question_bank')
            .select('*')
            .eq('subject', subject)
            .in('level', bankLevels);

          if (subjectQuestions && subjectQuestions.length > 0) {
            // Distribution favoring harder questions if available
            const veryHard = subjectQuestions.filter(q => q.difficulty_level === 'VERY_HARD');
            const hard = subjectQuestions.filter(q => q.difficulty_level === 'HARD');
            const medium = subjectQuestions.filter(q => q.difficulty_level === 'MEDIUM');
            const easy = subjectQuestions.filter(q => q.difficulty_level === 'EASY');

            const veryHardCount = Math.max(0, Math.round(questionsPerSubject * 0.4));
            const hardCount = Math.max(0, Math.round(questionsPerSubject * 0.3));
            const mediumCount = Math.max(0, Math.round(questionsPerSubject * 0.2));
            const easyCount = Math.max(0, questionsPerSubject - veryHardCount - hardCount - mediumCount);

            const selected = [
              ...veryHard.sort(() => Math.random() - 0.5).slice(0, veryHardCount),
              ...hard.sort(() => Math.random() - 0.5).slice(0, hardCount),
              ...medium.sort(() => Math.random() - 0.5).slice(0, mediumCount),
              ...easy.sort(() => Math.random() - 0.5).slice(0, easyCount),
            ];

            // If still short, add more from any difficulty in this subject
            if (selected.length < questionsPerSubject) {
              const remaining = subjectQuestions
                .filter(q => !selected.find(s => s.id === q.id))
                .sort(() => Math.random() - 0.5)
                .slice(0, questionsPerSubject - selected.length);
              allSelectedQuestions = [...allSelectedQuestions, ...selected, ...remaining];
            } else {
              allSelectedQuestions = [...allSelectedQuestions, ...selected];
            }
          }
        }
        
        // Shuffle all selected questions
        if (allSelectedQuestions.length > 0) {
          allSelectedQuestions = allSelectedQuestions.sort(() => Math.random() - 0.5);
        }
        
        // Insert selected questions into entrance_questions
        if (allSelectedQuestions.length > 0) {
          const questionsToInsert = allSelectedQuestions.map((q, index) => {
            const qt = (q.question_type || 'MCQ').toUpperCase();
            const mappedType = qt === 'MULTIPLE_CHOICE' ? 'MCQ' : qt === 'TRUE_FALSE' ? 'TRUE_FALSE' : qt === 'FILL_IN_THE_GAP' || qt === 'FILL_BLANK' ? 'FILL_IN_THE_GAP' : 'MCQ';
            return {
            exam_id: examId,
            question: q.question,
            question_image: q.question_image || null,
            options: q.options || [''],
            correct_answer: q.correct_answer ?? 0,
            points: q.points ?? 1,
            question_type: mappedType,
            subject: q.subject || null,
            difficulty_level: q.difficulty_level || null,
            topic: q.topic || null,
            subtopic: q.subtopic || null,
            explanation: q.explanation || null,
            order_index: index,
          };
          });
          
          const { error } = await supabase.from('entrance_questions').insert(questionsToInsert);
          if (error) throw new Error(`Failed to insert questions: ${error.message}`);
        } else {
          setWarning('No questions found in question bank for the selected level and subjects.');
        }
      } catch (error) {
        console.error('Error auto-populating exam questions:', error);
        setWarning('Exam created but question auto-population had issues. You can add questions manually.');
      }
    }

  async function handlePopulateQuestions(exam: any) {
    const level = exam.level;
    let subjects: string[] = [];
    
    // Get subjects from exam or use default based on level
    if (exam.subjects && Array.isArray(exam.subjects) && exam.subjects.length > 0) {
      subjects = exam.subjects;
    } else {
      // Default subjects based on level
      if (level === 'PRIMARY') {
        subjects = ['MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'VERBAL REASONING', 'QUANTITATIVE REASONING'];
      } else if (level === 'JSS') {
        subjects = ['MATHEMATICS', 'ENGLISH', 'BASIC SCIENCE', 'BUSINESS STUDIES', 'PRE-VOCATIONAL STUDIES'];
      } else if (level?.includes('SS')) {
        subjects = ['MATHEMATICS', 'ENGLISH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'GEOGRAPHY'];
      } else {
        subjects = ['MATHEMATICS', 'ENGLISH'];
      }
    }

    const totalQuestions = exam.total_questions || 40;
    
    // Persist subjects on the exam if they were derived from defaults
    if (!exam.subjects || !Array.isArray(exam.subjects) || exam.subjects.length === 0) {
      await supabase.from('entrance_exams').update({ subjects }).eq('id', exam.id);
    }
    
    try {
      await autoPopulateExamQuestions(exam.id, level, subjects, totalQuestions);
      setSuccess('Questions populated successfully!');
      fetchData();
    } catch (error) {
      setError('Failed to populate questions. Please add manually.');
    }
  }

   async function handleRemoveQuestion(questionId: string) {
     if (!confirm('Remove this question from the exam?')) return;
     try {
       await supabase.from('entrance_questions').delete().eq('id', questionId);
       setQuestions(prev => prev.filter(q => q.id !== questionId));
     } catch (err) {
       console.error('Failed to remove question:', err);
     }
   }

   async function handleAddQuestionsFromBank(examId: string, selectedIds: string[]) {
     if (selectedIds.length === 0) return;
     setSaving(true);
     try {
       const { data: selectedQbank } = await supabase
         .from('question_bank')
         .select('*')
         .in('id', selectedIds);
       
        if (selectedQbank && selectedQbank.length > 0) {
          const toInsert = selectedQbank.map((q, index) => {
            const qt = (q.question_type || 'MCQ').toUpperCase();
            const mappedType = qt === 'MULTIPLE_CHOICE' ? 'MCQ' : qt === 'TRUE_FALSE' ? 'TRUE_FALSE' : qt === 'FILL_IN_THE_GAP' || qt === 'FILL_BLANK' ? 'FILL_IN_THE_GAP' : 'MCQ';
            return {
            exam_id: examId,
            question: q.question,
            question_image: q.question_image || null,
            options: q.options || [''],
            correct_answer: q.correct_answer ?? 0,
            points: q.points ?? 1,
            question_type: mappedType,
            subject: q.subject || null,
            difficulty_level: q.difficulty_level || null,
            topic: q.topic || null,
            subtopic: q.subtopic || null,
            explanation: q.explanation || null,
            order_index: index,
          };
          });
          
          await supabase.from('entrance_questions').insert(toInsert);
         
         const { data: updated } = await supabase.from('entrance_questions').select('*').eq('exam_id', examId);
         if (updated) setQuestions(updated);
         
         setSuccess(`Added ${toInsert.length} question(s) from question bank`);
       }
     } catch (err: any) {
       setError(err.message || 'Failed to add questions');
     } finally {
       setSaving(false);
     }
   }

    async function openBankSelectModal(exam: any) {
      setSelectedExam(exam);
      setSelectedBankIds(new Set());
      setBankSelectSearch('');
      const qbLevels = getQuestionBankLevels(exam.level);
      let query = supabase.from('question_bank').select('*').in('level', qbLevels);
      const examSubjects = exam.subjects;
      if (examSubjects && Array.isArray(examSubjects) && examSubjects.length > 0) {
        query = query.in('subject', examSubjects);
      }
      const { data } = await query.order('created_at', { ascending: false });
      setBankSelectQuestions(data || []);
      setBankSelectFiltered(data || []);
      setShowBankSelectModal(true);
    }

   function filterBankSelect(search: string) {
     setBankSelectSearch(search);
     const lower = search.toLowerCase();
     setBankSelectFiltered(
       bankSelectQuestions.filter(q => q.question.toLowerCase().includes(lower))
     );
   }

   function toggleBankSelect(id: string) {
     setSelectedBankIds(prev => {
       const next = new Set(prev);
       if (next.has(id)) next.delete(id); else next.add(id);
       return next;
     });
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
      question_type: questionData.question_type || 'MCQ',
      subject: questionData.subject || null,
      difficulty_level: questionData.difficulty_level || null,
      topic: questionData.topic || null,
      subtopic: questionData.subtopic || null,
      explanation: questionData.explanation || null,
    };
    if (questionData.question_image) payload.question_image = questionData.question_image;
    const { error } = await supabase.from('entrance_questions').insert(payload);
    if (!error) {
      setQuestionData({ question: '', question_image: '', options: ['', '', '', ''], correct_answer: 0, points: 1, question_type: 'MCQ', subject: '', level: '', difficulty_level: 'MEDIUM', topic: '', subtopic: '', explanation: '' });
      const { data } = await supabase.from('entrance_questions').select('*').eq('exam_id', selectedExam.id);
      if (data) setQuestions(data);
    }
    setSaving(false);
  }

  async function handleGenerateCode() {
    if (!selectedExam) return;
    setSaving(true);
    
    let code = '';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: existing } = await supabase
        .from('entrance_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle();
      
      if (!existing) break;
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      setError('Failed to generate unique code. Please try again.');
      setSaving(false);
      return;
    }
    
    const { error } = await supabase.from('entrance_codes').insert({
      code, exam_id: selectedExam.id, max_uses: 100, used_count: 0, is_active: true
    });
    if (error) setError('Failed to generate code: ' + error.message);
    if (!error) fetchData();
    setSaving(false);
  }

  async function handleDeleteExam(id: string) {
    if (!confirm('Delete this exam and all associated questions, codes, and applications?')) return;
    setDeleting(id);
    try {
      await supabase.from('entrance_questions').delete().eq('exam_id', id);
      await supabase.from('entrance_codes').delete().eq('exam_id', id);
      await supabase.from('entrance_applications').delete().eq('exam_id', id);
      const { error } = await supabase.from('entrance_exams').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Exam and all associated data deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete exam');
    } finally {
      setDeleting(null);
      fetchData();
    }
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

   async function handleDeleteApplication(appId: string) {
     if (!confirm('Are you sure you want to permanently delete this application? This cannot be undone.')) return;
     setDeleting(appId);
     try {
       await supabase.from('entrance_applications').delete().eq('id', appId);
       setSuccess('Application deleted successfully');
       fetchData();
     } catch (err: any) {
       setError(err.message || 'Failed to delete application');
     } finally {
       setDeleting(null);
     }
   }

   async function handleBanApplication(appId: string, email: string) {
     if (!confirm(`Ban this applicant (${email})? They will not be able to apply again.`)) return;
     setDeleting(appId);
     try {
       await supabase.from('entrance_applications').update({
         status: 'banned',
         reviewed_by: profile?.id,
         reviewed_at: new Date().toISOString(),
       }).eq('id', appId);
       setSuccess('Applicant banned successfully');
       fetchData();
     } catch (err: any) {
       setError(err.message || 'Failed to ban applicant');
     } finally {
       setDeleting(null);
     }
   }

   async function handleAdmissionDecision() {
    if (!selectedApplication) return;
    setSaving(true);
    setError('');

    const updateData: any = {
      status: admissionData.status,
      reviewed_by: profile?.id,
      reviewed_at: new Date().toISOString(),
    };

    if (admissionData.status === 'admitted' && admissionData.admitted_class) {
      updateData.admitted_class = admissionData.admitted_class;

      try {
        const selectedClass = classes.find(c => c.name === admissionData.admitted_class);
        const password = Math.random().toString(36).slice(2, 10) + 'A1!';
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: selectedApplication.email,
            password,
            first_name: selectedApplication.first_name,
            last_name: selectedApplication.last_name,
            role: 'student',
            phone: selectedApplication.phone || '',
            class_id: selectedClass?.id || '',
          }),
        });

        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to create user');

        setSuccess(`Student admitted! Login: ${selectedApplication.email} | Password: ${password} ` +
          `| Class: ${admissionData.admitted_class}`);
      } catch (err: any) {
        setError('Application status saved but user creation failed: ' + err.message);
      }
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
   
   async function fetchQuestionBank() {
     setQuestionBankLoading(true);
     setQuestionBankError('');
     try {
       let query = supabase.from('question_bank').select('*');
       if (questionBankFilter.subject) query = query.eq('subject', questionBankFilter.subject);
       if (questionBankFilter.level) query = query.eq('level', questionBankFilter.level);
       if (questionBankFilter.difficulty) query = query.eq('difficulty_level', questionBankFilter.difficulty);
       if (questionBankFilter.questionType) query = query.eq('question_type', questionBankFilter.questionType);
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
   
    async function addQuestionToBank(data: any) {
      setQuestionBankError('');
      setQuestionBankSuccess('');
      try {
        const payload = {
          question: data.question,
          subject: data.subject || null,
          level: data.level || null,
          difficulty_level: data.difficulty_level || 'MEDIUM',
          topic: data.topic || 'General',
          subtopic: data.subtopic || null,
          question_type: data.question_type || 'MCQ',
          options: data.options || [''],
          correct_answer: data.correct_answer ?? 0,
          points: data.points ?? 1,
          explanation: data.explanation || null,
          question_image: data.question_image || null,
          is_active: true,
          status: 'active',
        };
        if (editingQuestion) {
          const { error } = await supabase.from('question_bank').update(payload).eq('id', editingQuestion.id);
          if (error) throw new Error(error.message);
          setQuestionBankSuccess('Question updated successfully');
        } else {
          const { error } = await supabase.from('question_bank').insert(payload);
          if (error) throw new Error(error.message);
          setQuestionBankSuccess('Question added successfully');
        }
        setEditingQuestion(null);
        await fetchQuestionBank();
        setShowQuestionBankModal(false);
      } catch (err: any) {
        setQuestionBankError(err.message || 'Failed to save question');
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
      setQuestionData({
        question: question.question || '',
        question_image: question.question_image || '',
        options: question.options || ['', '', '', ''],
        correct_answer: question.correct_answer ?? 0,
        points: question.points ?? 1,
        question_type: question.question_type || 'MCQ',
        subject: question.subject || '',
        level: question.level || '',
        difficulty_level: question.difficulty_level || 'MEDIUM',
        topic: question.topic || '',
        subtopic: question.subtopic || '',
        explanation: question.explanation || '',
      });
      setShowQuestionBankModal(true);
    }
   
   function openQuestionBankModal() {
     setEditingQuestion(null);
     setShowQuestionBankModal(true);
   }
   
   async function fetchAnalytics() {
     setAnalyticsLoading(true);
     try {
       const { data } = await supabase
         .from('student_analytics')
         .select('*, entrance_applications!inner(first_name, last_name)')
         .order('generated_at', { ascending: false });
       
       if (data) {
         const processedData = data.map((record: any) => ({
           ...record,
           student_name: `${record.entrance_applications.first_name} ${record.entrance_applications.last_name}`
         }));
         setAnalyticsData(processedData);
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
         const distribution = { POOR: 0, GOOD: 0, EXCELLENT: 0, PROFICIENT: 0, MASTERED: 0 };
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
      alert('PDF report generation functionality would be implemented here in a production system. '
        + 'This would generate detailed reports for selected students or groups of students '
        + 'with mastery levels, topic breakdowns, and recommendations.');
   }
   
function viewAnalyticsDetails(record: any) {
      setSelectedAnalytics(record);
      setShowAnalyticsDetailModal(true);
    }
    
    async function downloadAnalyticsReport(id: string) {
      const record = analyticsData.find(r => r.id === id);
      if (!record) return;

      setDownloadingReport(id);

      try {
        const { data: application } = await supabase
          .from('entrance_applications')
          .select('*, exam:entrance_exams!exam_id(*)')
          .eq('id', record.application_id)
          .maybeSingle();

        const { data: schoolSettings } = await supabase
          .from('school_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        const exam = application?.exam;
        const score = record.score || 0;
        const passingScore = exam?.passing_score || 50;
        const passed = score >= passingScore;
        const tp = record.topic_performance || {};
        let questionsData = tp.questions || [];
        const bySubject = tp.by_subject || {};
        const byDifficulty = tp.by_difficulty || {};
        const byTopic = tp.by_topic || {};

        // Fallback: if analytics questions are empty, try raw answers from application
        if (questionsData.length === 0 && application?.answers) {
          const answers = typeof application.answers === 'string' ? JSON.parse(application.answers) : application.answers;
          if (Array.isArray(answers)) questionsData = answers;
        }

        const totalQ = tp.total_questions || questionsData.length || exam?.total_questions || 0;
        const correctQ = tp.correct_count || questionsData.filter((q: any) => q.is_correct).length || 0;
        const wrongQ = totalQ - correctQ;
        const timeTakenMins = record.time_taken_seconds
          ? Math.round(record.time_taken_seconds / 60)
          : record.time_taken || 'N/A';
        const completedDate = application?.completed_at
          ? new Date(application.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : 'N/A';

        const schoolName = schoolSettings?.school_name || 'ClearPath Edu Hub';
        const primaryColor: [number, number, number] = [30, 58, 95];
        const goldColor: [number, number, number] = [179, 146, 47];

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw = doc.internal.pageSize.getWidth();

        // ── Helper: draw school header ──
        const drawSchoolHeader = (d: typeof doc) => {
          d.setFillColor(...primaryColor);
          d.rect(0, 0, pw, 40, 'F');
          d.setFillColor(...goldColor);
          d.rect(0, 38, pw, 2, 'F');
          d.setTextColor(255, 255, 255);
          d.setFontSize(20);
          d.setFont('helvetica', 'bold');
          d.text(schoolName, pw / 2, 16, { align: 'center' });
          d.setFontSize(9);
          d.setFont('helvetica', 'normal');
          d.text('ENTRANCE EXAM ANALYSIS REPORT', pw / 2, 24, { align: 'center' });
          d.setFontSize(7);
          d.text(`Generated: ${new Date().toLocaleString()}`, pw / 2, 31, { align: 'center' });
        };

        // ── Helper: draw footer ──
        const drawFooter = (d: typeof doc) => {
          const ph = d.internal.pageSize.getHeight();
          d.setFillColor(...primaryColor);
          d.rect(0, ph - 12, pw, 12, 'F');
          d.setTextColor(255, 255, 255);
          d.setFontSize(6);
          d.setFont('helvetica', 'normal');
          d.text(schoolName + ' — Official Document', pw / 2, ph - 6, { align: 'center' });
          d.text('This report is system-generated and does not require a signature.', pw / 2, ph - 2.5, { align: 'center' });
        };

        // ═══════════════════════════════════════════
        // PAGE 1
        // ═══════════════════════════════════════════
        drawSchoolHeader(doc);

        // ── Student Information ──
        let y = 50;
        doc.setFillColor(...primaryColor);
        doc.rect(14, y - 4, pw - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('STUDENT INFORMATION', 18, y + 0.5);

        y += 11;
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const studentInfo = [
          ['Full Name', record.student_name || (application?.first_name || '') + ' ' + (application?.last_name || '') || 'N/A'],
          ['Email', record.student_email || application?.email || 'N/A'],
          ['Phone', application?.phone || 'N/A'],
          ['Applied Class', application?.applied_class || 'N/A'],
          ['Admitted Class', application?.admitted_class || 'Pending'],
          ['Exam Completed', completedDate],
        ];
        studentInfo.forEach(([label, value], i) => {
          const rowY = y + i * 5.5;
          doc.setFont('helvetica', 'bold');
          doc.text(label + ':', 18, rowY);
          doc.setFont('helvetica', 'normal');
          doc.text(value, 55, rowY);
        });

        // ── Score Summary ──
        y += studentInfo.length * 5.5 + 7;
        doc.setFillColor(...primaryColor);
        doc.rect(14, y - 4, pw - 28, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('EXAM RESULTS', 18, y + 0.5);

        y += 11;

        const scoreX = pw - 40;
        doc.setDrawColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
        doc.setFillColor(passed ? 240 : 254, passed ? 253 : 242, passed ? 244 : 242);
        doc.circle(scoreX, y + 12, 12, 'FD');
        doc.setTextColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${score}%`, scoreX, y + 15, { align: 'center' });

        const resultsInfo = [
          ['Exam Title', exam?.title || 'N/A'],
          ['Academic Year', exam?.academic_year || 'N/A'],
          ['Exam Level', exam?.level || 'N/A'],
          ['Total Questions', `${totalQ}`],
          ['Correct Answers', `${correctQ}`],
          ['Wrong Answers', `${wrongQ}`],
          ['Accuracy', `${totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0}%`],
          ['Passing Score', `${passingScore}%`],
          ['Score Obtained', `${score}%`],
          ['Mastery Level', record.mastery_level || 'N/A'],
          ['Time Taken', typeof timeTakenMins === 'number' ? `${timeTakenMins} minutes` : `${timeTakenMins}`],
          ['Status', passed ? 'PASSED' : 'FAILED'],
        ];
        resultsInfo.forEach(([label, value], i) => {
          const rowY = y + i * 5;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(7.5);
          doc.text(label + ':', 18, rowY);
          doc.setFont('helvetica', 'normal');
          if (label === 'Status') {
            doc.setTextColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 38 : 38);
            doc.text(value, 55, rowY);
          } else if (label === 'Mastery Level') {
            doc.setTextColor(30, 58, 95);
            doc.text(value, 55, rowY);
          } else if (label === 'Accuracy') {
            const acc = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
            doc.setTextColor(acc >= 70 ? 22 : acc >= 50 ? 180 : 220, acc >= 70 ? 163 : acc >= 50 ? 130 : 38, acc >= 70 ? 74 : acc >= 50 ? 40 : 38);
            doc.text(value, 55, rowY);
          } else {
            doc.setTextColor(60, 60, 60);
            doc.text(value, 55, rowY);
          }
        });

        // ── Subject-wise Performance ──
        const subjectEntries = Object.entries(bySubject);
        if (subjectEntries.length > 0) {
          y += resultsInfo.length * 5 + 7;
          if (y > 240) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
          doc.setFillColor(...primaryColor);
          doc.rect(14, y - 4, pw - 28, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('SUBJECT PERFORMANCE', 18, y + 0.5);

          y += 9;
          autoTable(doc, {
            startY: y,
            head: [['Subject', 'Correct', 'Total', 'Score', 'Assessment']],
            body: subjectEntries.map(([subj, d]: [string, any]) => {
              const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
              const assess = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Weak';
              return [subj, `${d.correct}`, `${d.total}`, `${pct}%`, assess];
            }),
            theme: 'striped',
            headStyles: { fillColor: [...primaryColor] as [number, number, number] },
            columnStyles: { 0: { cellWidth: 50 }, 4: { cellWidth: 30 } },
            margin: { left: 14, right: 14 },
            tableLineWidth: 0,
          });
          y = (doc as any).lastAutoTable.finalY + 5;
          // ── Subject Bar Chart ──
          const subjItems = Object.entries(bySubject).map(([name, d]: [string, any]) => ({ name, pct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 })).sort((a: any, b: any) => b.pct - a.pct);
          if (subjItems.length > 0) {
            if (y + subjItems.length * 8 + 15 > 280) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
            const barH = 4, gap = 2, lw = 36, pw2 = 14, bmw = pw - 36 - lw - pw2;
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
            doc.line(18, y, 18 + pw - 36, y); y += 3;
            doc.setFontSize(8); doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold');
            doc.text('Subject Performance Overview', 18, y); y += 5;
            subjItems.forEach((item: any, i: number) => {
              const by = y + i * (barH + gap);
              doc.setFontSize(6.5); doc.setTextColor(60, 60, 60); doc.setFont('helvetica', 'normal');
              doc.text(item.name.substring(0, 14), 18, by + barH - 0.5);
              doc.setFillColor(238, 238, 238);
              doc.roundedRect(18 + lw, by, bmw, barH, 0.8, 0.8, 'F');
              const bw = Math.max((item.pct / 100) * bmw, 1);
              const bc: [number, number, number] = item.pct >= 70 ? [22, 163, 74] : item.pct >= 40 ? [245, 158, 11] : [220, 38, 38];
              doc.setFillColor(...bc);
              doc.roundedRect(18 + lw, by, bw, barH, 0.8, 0.8, 'F');
              doc.setTextColor(80, 80, 80); doc.setFontSize(6);
              doc.text(`${item.pct}%`, 18 + lw + bmw + 1.5, by + barH - 0.5);
            });
            y += subjItems.length * (barH + gap) + 3;
          }
        }

        // ── Difficulty-wise Performance ──
        const difficultyEntries = Object.entries(byDifficulty);
        if (difficultyEntries.length > 0) {
          if (y > 240) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
          doc.setFillColor(...primaryColor);
          doc.rect(14, y - 4, pw - 28, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('DIFFICULTY BREAKDOWN', 18, y + 0.5);

          y += 9;
          autoTable(doc, {
            startY: y,
            head: [['Difficulty Level', 'Correct', 'Total', 'Score', 'Verdict']],
            body: difficultyEntries.map(([diff, d]: [string, any]) => {
              const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
              const color = pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600';
              return [diff, `${d.correct}`, `${d.total}`, `${pct}%`, color];
            }),
            theme: 'striped',
            headStyles: { fillColor: [...primaryColor] as [number, number, number] },
            margin: { left: 14, right: 14 },
            tableLineWidth: 0,
          });
          y = (doc as any).lastAutoTable.finalY + 5;
          // ── Performance Insights ──
          const subjSorted = Object.entries(bySubject).map(([n, d]: [string, any]) => ({ n, p: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 })).filter((s: any) => s.p > 0).sort((a: any, b: any) => b.p - a.p);
          const diffWeak = Object.entries(byDifficulty).filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
          const topWeak = Object.entries(byTopic).filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
          if (subjSorted.length > 0 || diffWeak.length > 0 || topWeak.length > 0) {
            if (y + 30 > 280) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
            doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
            doc.line(14, y, 14 + pw - 28, y); y += 3;
            doc.setFontSize(8); doc.setTextColor(30, 58, 95); doc.setFont('helvetica', 'bold');
            doc.text('Performance Insights', 18, y); y += 5;
            doc.setFontSize(6.5); doc.setTextColor(22, 163, 74); doc.setFont('helvetica', 'bold');
            doc.text('Strengths', 18, y); y += 3.5;
            doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
            const best = subjSorted.slice(0, 2);
            best.forEach((s: any) => { doc.text(`${s.n}: ${s.p}%`, 21, y + 0.5); y += 4; });
            y += 1;
            const weakSubj = subjSorted.filter((s: any) => s.p < 40);
            if (weakSubj.length > 0 || diffWeak.length > 0) {
              if (y + 10 > 280) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
              doc.setFontSize(6.5); doc.setTextColor(220, 38, 38); doc.setFont('helvetica', 'bold');
              doc.text('Needs Improvement', 18, y); y += 3.5;
              doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
              weakSubj.forEach((s: any) => { doc.text(`${s.n}: ${s.p}%`, 21, y + 0.5); y += 4; });
              diffWeak.slice(0, 2).forEach(([d, dd]: [string, any]) => { const p = Math.round((dd.correct / dd.total) * 100); doc.text(`${d}: ${p}%`, 21, y + 0.5); y += 4; });
            }
            if (topWeak.length > 0) {
              if (y + 10 > 280) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
              doc.setFontSize(6.5); doc.setTextColor(124, 58, 237); doc.setFont('helvetica', 'bold');
              doc.text('Topics to Focus On', 18, y); y += 3.5;
              doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
              topWeak.slice(0, 3).forEach(([t, td]: [string, any]) => { const p = Math.round((td.correct / td.total) * 100); doc.text(`${t}: ${p}%`, 21, y + 0.5); y += 4; });
            }
            y += 2;
          }
        }

        // ═══════════════════════════════════════════
        // PER-QUESTION BREAKDOWN (new page)
        // ═══════════════════════════════════════════
        if (questionsData.length > 0) {
          doc.addPage();
          y = 45;
          drawSchoolHeader(doc);

          doc.setFillColor(...primaryColor);
          doc.rect(14, y - 4, pw - 28, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('PER-QUESTION ANALYSIS', 18, y + 0.5);

          y += 9;

          const rowCorrectness = questionsData.map((q: any) => q.is_correct);
          const questionRows = questionsData.map((q: any, i: number) => {
            let correctAnswerText = `${q.correct_answer}`;
            if (q.options && Array.isArray(q.options) && typeof q.correct_answer === 'number' && q.options[q.correct_answer]) {
              correctAnswerText = `${q.correct_answer + 1}. ${q.options[q.correct_answer]}`;
            }
            let givenAnswerText = `${q.given_answer}`;
            if (q.options && Array.isArray(q.options) && typeof q.given_answer === 'number' && q.options[q.given_answer]) {
              givenAnswerText = `${q.given_answer + 1}. ${q.options[q.given_answer]}`;
            }
            if (q.question_type === 'TRUE_FALSE' || q.question_type === 'true_false') {
              if (typeof q.correct_answer === 'number') correctAnswerText = q.correct_answer === 0 ? 'True' : 'False';
              if (typeof q.given_answer === 'number') givenAnswerText = q.given_answer === 0 ? 'True' : 'False';
            }
            const questionShort = q.question ? (q.question.length > 50 ? q.question.substring(0, 47) + '...' : q.question) : '';
            const subject = q.subject || '—';
            const diff = q.difficulty_level || '—';

            return [
              i + 1,
              subject,
              questionShort,
              diff,
              correctAnswerText,
              givenAnswerText,
              '',
              `${q.points_earned || 0}/${q.points || 1}`,
            ];
          });

          autoTable(doc, {
            startY: y,
            head: [['#', 'Subject', 'Question', 'Diff', 'Correct Answer', 'Given Answer', 'Correct', 'Pts']],
            body: questionRows,
            theme: 'striped',
            headStyles: { fillColor: [...primaryColor] as [number, number, number], fontSize: 7 },
            bodyStyles: { fontSize: 6.5 },
            columnStyles: {
              0: { cellWidth: 8 },
              1: { cellWidth: 18 },
              2: { cellWidth: 55 },
              3: { cellWidth: 12 },
              4: { cellWidth: 28 },
              5: { cellWidth: 28 },
              6: { cellWidth: 12, halign: 'center' },
              7: { cellWidth: 12, halign: 'center' },
            },
            margin: { left: 10, right: 10 },
            didDrawCell: (data: any) => {
              if (data.section === 'body' && data.column.index === 6) {
                const isCorrect = rowCorrectness[data.row.index] === true;
                doc.setTextColor(isCorrect ? 22 : 220, isCorrect ? 163 : 38, isCorrect ? 74 : 38);
                doc.setFont('helvetica', 'bold');
                doc.text(isCorrect ? 'Yes' : 'No', data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1.5, { align: 'center' });
              }
              if (data.section === 'body' && data.column.index === 7) {
                const raw = data.cell.raw.toString();
                const parts = raw.split('/');
                const earned = parseInt(parts[0]) || 0;
                const max = parseInt(parts[1]) || 1;
                if (max > 0) {
                  const dotR = 0.6, spacing = 2.2;
                  const startX = data.cell.x + (data.cell.width - max * spacing) / 2;
                  const dotY = data.cell.y + data.cell.height / 2;
                  for (let i = 0; i < max; i++) {
                    doc.setFillColor(i < earned ? 22 : 200, i < earned ? 163 : 200, i < earned ? 74 : 200);
                    doc.circle(startX + i * spacing, dotY, dotR, 'F');
                  }
                }
              }
            },
            tableLineWidth: 0,
          });
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // ── Topic Performance ──
        const topicEntries = Object.entries(byTopic);
        if (topicEntries.length > 0) {
          if (y > 240) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
          doc.setFillColor(...primaryColor);
          doc.rect(14, y - 4, pw - 28, 7, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('TOPIC PERFORMANCE', 18, y + 0.5);

          y += 9;
          autoTable(doc, {
            startY: y,
            head: [['Topic', 'Correct', 'Total', 'Score', 'Status']],
            body: topicEntries.map(([topic, d]: [string, any]) => {
              const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
              const status = pct >= 80 ? 'Mastered' : pct >= 60 ? 'Good' : pct >= 40 ? 'Developing' : 'Needs Work';
              return [topic, `${d.correct}`, `${d.total}`, `${pct}%`, status];
            }),
            theme: 'striped',
            headStyles: { fillColor: [...primaryColor] as [number, number, number] },
            margin: { left: 14, right: 14 },
            tableLineWidth: 0,
          });
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // ── Performance Summary Bar ──
        if (y < 250) {
          y += 3;
          doc.setFillColor(240, 242, 245);
          doc.roundedRect(18, y, pw - 36, 6, 3, 3, 'F');
          doc.setFillColor(passed ? 22 : 220, passed ? 163 : 38, passed ? 74 : 38);
          doc.roundedRect(18, y, Math.max((pw - 36) * score / 100, 6), 6, 3, 3, 'F');
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.text(`Overall Score: ${score}% | ${correctQ} of ${totalQ} correct`, pw / 2, y + 10, { align: 'center' });
        }

        // ── Recommendations (new page if needed) ──
        const weakSubjects = subjectEntries
          .filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.5)
          .map(([s]: [string, any]) => s);
        const weakDifficulties = difficultyEntries
          .filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4)
          .map(([d]: [string, any]) => d);
        const weakTopics = topicEntries
          .filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4)
          .map(([t]: [string, any]) => t);

        const recommendations = buildDetailedRecommendations(record.mastery_level, score, weakSubjects, weakDifficulties, weakTopics, totalQ, correctQ);

        if (recommendations) {
          if (y > 250) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
          y = Math.max(y + 10, 245);
          const pageH = doc.internal.pageSize.getHeight();
          if (y + 40 > pageH) { doc.addPage(); y = 45; drawSchoolHeader(doc); }
          doc.setFillColor(253, 237, 236);
          doc.roundedRect(14, y, pw - 28, 22, 2, 2, 'F');
          doc.setTextColor(180, 80, 60);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('Recommendations for Improvement', 18, y + 5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(100, 60, 40);
          const split = doc.splitTextToSize(recommendations, pw - 40);
          const linesUsed = split.length;
          const boxHeight = Math.max(22, linesUsed * 4 + 8);
          doc.setFillColor(253, 237, 236);
          doc.roundedRect(14, y, pw - 28, boxHeight, 2, 2, 'F');
          doc.text(split, 18, y + 11);
          y += boxHeight + 5;
        }

        drawFooter(doc);

        doc.save(`Entrance_Exam_Report_${record.student_name?.replace(/\s+/g, '_') || 'Student'}_${new Date().toISOString().split('T')[0]}.pdf`);
        setSuccess('Report downloaded successfully');
      } catch (err) {
        console.error('Error generating report:', err);
        setError('Failed to generate report');
      } finally {
        setDownloadingReport(null);
      }
    }

    function buildDetailedRecommendations(mastery: string, score: number, weakSubjects: string[], weakDifficulties: string[], weakTopics: string[], totalQuestions: number, correctQuestions: number): string {
      const parts: string[] = [];

      if (mastery === 'MASTERED') {
        parts.push('OUTSTANDING PERFORMANCE: The student demonstrates exceptional understanding across all areas.');
        parts.push('Recommendation: Consider advanced placement, enrichment programs, or mentorship opportunities.');
      } else if (mastery === 'PROFICIENT') {
        parts.push('STRONG PERFORMANCE: The student shows solid comprehension of the material.');
        parts.push('Recommendation: Continue with current curriculum. Provide extension activities and challenge problems to reinforce learning.');
      } else if (mastery === 'EXCELLENT') {
        parts.push('GOOD PERFORMANCE: The student performs well overall with some areas to strengthen.');
        parts.push('Recommendation: Focus on strengthening weaker areas through targeted practice and review sessions.');
      } else if (mastery === 'GOOD') {
        parts.push('BASIC UNDERSTANDING: The student has foundational knowledge but needs improvement.');
        parts.push('Recommendation: Enroll in remedial support programs. Schedule additional practice sessions. Revisit core concepts.');
      } else {
        parts.push('SIGNIFICANT SUPPORT NEEDED: The student requires intensive academic intervention.');
        parts.push('Recommendation: Consider one-on-one tutoring, foundational skill development, and a structured learning plan.');
      }

      if (weakSubjects.length > 0) {
        parts.push(`Weak Subjects: ${weakSubjects.join(', ')}. Focused study and additional practice in these subjects is strongly advised.`);
      }

      if (weakDifficulties.length > 0) {
        const diffAdvice = weakDifficulties.map(d => {
          if (d === 'VERY_HARD' || d === 'HARD') return `${d} questions: Start with easier problems to build confidence, then gradually increase difficulty.`;
          if (d === 'MEDIUM') return `Medium difficulty: Review fundamental concepts and practice with varied question formats.`;
          return `${d} questions: Master the basics before moving to advanced topics.`;
        });
        parts.push(...diffAdvice);
      }

      if (weakTopics.length > 0) {
        parts.push(`Topics requiring attention: ${weakTopics.join(', ')}. Targeted revision in these topic areas will significantly improve overall performance.`);
      }

      const accuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
      parts.push(`Accuracy Rate: ${accuracy}% (${correctQuestions}/${totalQuestions} questions answered correctly). Consistent practice is key to improvement.`);

      return parts.join(' ');
    }

    function getRecommendations(record: any): string {
      const tp = record.topic_performance || {};
      const qs = tp.questions || [];
      return buildDetailedRecommendations(record.mastery_level, record.score || 0, [], [], [], qs.length, qs.filter((q: any) => q.is_correct).length);
    }

  const filteredApps = applications.filter(a =>
    `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statsCount = {
    pending: applications.filter(a => a.status === 'pending').length,
    assigned: applications.filter(a => a.status === 'assigned').length,
    passed: applications.filter(a => a.status === 'passed').length,
    failed: applications.filter(a => a.status === 'failed').length,
    admitted: applications.filter(a => a.status === 'admitted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    banned: applications.filter(a => a.status === 'banned').length,
  };

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'passed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'admitted': return 'bg-primary-100 text-primary-700';
      case 'rejected': return 'bg-slate-100 text-slate-700';
      case 'banned': return 'bg-red-100 text-red-700';
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
          <button onClick={() => { setFormData({ title: '', description: '', level: '', subjects: [], academic_year: new Date().getFullYear().toString(), exam_date: '', duration_minutes: 60, passing_score: 50, total_questions: 40, shuffle_questions: false, require_fullscreen: false, prevent_tab_switch: false, max_tab_switches: 3 }); setShowExamModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={18} />Create Exam
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Pending</span><Clock size={16} className="text-amber-600" /></div><p className="text-2xl font-bold text-amber-600">{statsCount.pending}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Assigned</span><FileText size={16} className="text-blue-600" /></div><p className="text-2xl font-bold text-blue-600">{statsCount.assigned}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Passed</span><Check size={16} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{statsCount.passed}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Failed</span><X size={16} className="text-red-600" /></div><p className="text-2xl font-bold text-red-600">{statsCount.failed}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Admitted</span><Award size={16} className="text-primary-600" /></div><p className="text-2xl font-bold text-primary-600">{statsCount.admitted}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Rejected</span><AlertCircle size={16} className="text-slate-600" /></div><p className="text-2xl font-bold text-slate-600">{statsCount.rejected}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Banned</span><XCircle size={16} className="text-red-600" /></div><p className="text-2xl font-bold text-red-600">{statsCount.banned}</p></div>
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
                  <input type="text" placeholder="Search applications..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-10" />
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
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
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(app.status)}`}>{app.status}</span>
                          </div>
                          <p className="text-sm text-slate-500">{app.email} • {app.phone}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                            <span>Applied: {app.applied_class}</span>
                            {app.admitted_class && <span className="text-primary-600 font-medium">Admitted: {app.admitted_class}</span>}
                            {app.exam_score !== null && <span className={app.exam_score >= (app.exam?.passing_score || 50) ? 'text-green-600' : 'text-red-600'}>Score: {app.exam_score}%</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openApplicationModal(app)} className="btn-outline text-sm py-2">Review</button>
                          <div className="flex gap-1">
                            <button onClick={() => handleDeleteApplication(app.id)} disabled={deleting === app.id} className="p-2 hover:bg-red-50 rounded-lg text-red-500 disabled:opacity-50" title="Delete Application">{deleting === app.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button>
                            {app.status !== 'banned' && <button onClick={() => handleBanApplication(app.id, app.email)} disabled={deleting === app.id} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 disabled:opacity-50" title="Ban Applicant"><XCircle size={14} /></button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            loading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
            ) : exams.length === 0 ? (
              <div className="text-center py-16"><FileText className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">No exams created yet</p><button onClick={() => setShowExamModal(true)} className="btn-primary mt-4">Create First Exam</button></div>
            ) : (
              <div className="space-y-4">
                {exams.map(exam => (
                  <div key={exam.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div><h3 className="font-bold text-slate-900">{exam.title}</h3><p className="text-sm text-slate-500">{exam.level} • {exam.academic_year}</p></div>
                      <div className="flex gap-1">
                        {(!exam.questions || exam.questions.length === 0) && <button onClick={() => handlePopulateQuestions(exam)} className="p-2 hover:bg-amber-50 rounded-lg text-amber-600" title="Auto-populate from Question Bank"><Download size={16} /></button>}
                        <button onClick={() => { setSelectedExam(exam); setShowQuestionModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Add Questions"><Hash size={16} className="text-slate-500" /></button>
                        <button onClick={() => { setSelectedExam(exam); setShowCodeModal(true); }} className="p-2 hover:bg-gray-100 rounded-lg" title="Generate Codes"><QrCode size={16} className="text-slate-500" /></button>
                        <button onClick={() => handleDeleteExam(exam.id)} disabled={deleting === exam.id} className="p-2 hover:bg-gray-100 rounded-lg">{deleting === exam.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} className="text-red-500" />}</button>
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
               {exams.length === 0 ? <div className="text-center py-8 text-slate-500">Create an exam first to generate codes</div> : codes.length === 0 ? <div className="text-center py-8 text-slate-500">No codes generated yet</div> : (
                 <div className="space-y-2">
                   {codes.map(code => (
                     <div key={code.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between"><code className="font-mono font-bold text-primary-600">{code.code}</code><span className="text-xs text-slate-500">{code.used_count || 0}/{code.max_uses} used</span></div>
                   ))}
                 </div>
               )}
             </div>
           )}
           
           {activeTab === 'questionBank' && (
             <div>
               <div className="space-y-4">
                 <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-slate-900">Question Bank</h2><button onClick={() => setShowQuestionBankModal(true)} className="btn-primary"><Plus size={18} />Add Question</button></div>
                 <div className="mb-4">
                   <div className="flex gap-4">
                      <div><label className="label">Subject</label><select value={questionBankFilter.subject} onChange={e => setQuestionBankFilter({...questionBankFilter, subject: e.target.value})} className="input"><option value="">All Subjects</option><option value="MATHEMATICS">Mathematics</option><option value="ENGLISH">English</option><option value="BASIC SCIENCE">Basic Science</option><option value="VERBAL REASONING">Verbal Reasoning</option><option value="QUANTITATIVE REASONING">Quantitative Reasoning</option><option value="ISLAMIC STUDIES">Islamic Studies</option><option value="GENERAL KNOWLEDGE">General Knowledge</option><option value="PHYSICS">Physics</option><option value="CHEMISTRY">Chemistry</option><option value="BIOLOGY">Biology</option><option value="GEOGRAPHY">Geography</option><option value="BUSINESS STUDIES">Business Studies</option><option value="PRE-VOCATIONAL STUDIES">Pre-Vocational Studies</option></select></div>
                      <div><label className="label">Level</label><select value={questionBankFilter.level} onChange={e => setQuestionBankFilter({...questionBankFilter, level: e.target.value})} className="input"><option value="">All Levels</option><option value="PRIMARY">Primary</option><option value="PRIMARY 1">Primary 1</option><option value="PRIMARY 2">Primary 2</option><option value="PRIMARY 3">Primary 3</option><option value="PRIMARY 4">Primary 4</option><option value="PRIMARY 5">Primary 5</option><option value="PRIMARY 6">Primary 6</option><option value="JSS1">JSS 1</option><option value="JSS2">JSS 2</option><option value="JSS3">JSS 3</option><option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option></select></div>
                     <div><label className="label">Difficulty</label><select value={questionBankFilter.difficulty} onChange={e => setQuestionBankFilter({...questionBankFilter, difficulty: e.target.value})} className="input"><option value="">All Difficulties</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option><option value="VERY_HARD">Very Hard</option></select></div>
                     <div><label className="label">Type</label><select value={questionBankFilter.questionType} onChange={e => setQuestionBankFilter({...questionBankFilter, questionType: e.target.value})} className="input"><option value="">All Types</option><option value="MCQ">MCQ</option><option value="FILL_IN_THE_GAP">Gap Fill</option><option value="TRUE_FALSE">True/False</option></select></div>
                   </div>
                   <div className="mt-2 flex items-center gap-4"><input type="text" placeholder="Search questions..." value={questionBankSearch} onChange={e => setQuestionBankSearch(e.target.value)} className="input pl-10" /><button onClick={fetchQuestionBank} className="btn-outline"><Search size={18} />Search</button></div>
                 </div>
                 {questionBankLoading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : filteredQuestionBank.length === 0 ? <div className="text-center py-8 text-slate-500">No questions found matching criteria</div> : (
                   <div className="space-y-3">
                     {filteredQuestionBank.map(q => (
                       <div key={q.id} className="p-4 bg-slate-50 rounded-lg border-l-4 border-primary-500">
                         <div className="flex items-start justify-between mb-2"><div className="flex-1"><h3 className="text-lg font-medium text-slate-900">{q.question}</h3><div className="flex items-center gap-3 mt-1 text-sm"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">{q.subject}</span><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800">{q.level}</span><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${q.difficulty_level === 'VERY_HARD' ? 'bg-red-100 text-red-800' : q.difficulty_level === 'HARD' ? 'bg-orange-100 text-orange-800' : q.difficulty_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{q.difficulty_level}</span></div></div><div className="flex items-center gap-2"><button onClick={() => editQuestion(q)} className="p-1 hover:bg-slate-100 rounded-lg"><Edit size={16} className="text-slate-500" /></button><button onClick={() => deleteQuestion(q.id)} className="p-1 hover:bg-slate-100 rounded-lg"><Trash2 size={16} className="text-red-500" /></button></div></div>
                         {q.options && q.question_type === 'MCQ' && <div className="mt-3 space-y-2">{q.options.map((opt: string, i: number) => (<div key={i} className="flex items-center gap-2 text-sm"><span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-sm">{String.fromCharCode(65 + i)}</span><span>{opt}</span>{q.correct_answer === i && <span className="ml-2 text-xs font-medium bg-primary-100 text-primary-800 rounded-full px-1.5">Correct</span>}</div>))}</div>}
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
                 <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-slate-900">Student Analytics</h2><div className="flex gap-2"><button onClick={() => setShowAnalyticsFilterModal(true)} className="btn-outline"><Filter size={18} />Filter</button><button onClick={generateReports} className="btn-primary"><Download size={18} />Generate Reports</button></div></div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="card"><p className="text-sm text-slate-500">Total Analyzed</p><p className="text-2xl font-bold text-primary-600">{analyticsSummary.totalStudents}</p></div>
                   <div className="card"><p className="text-sm text-slate-500">Avg Score</p><p className="text-2xl font-bold text-primary-600">{analyticsSummary.averageScore}%</p></div>
                   <div className="card"><p className="text-sm text-slate-500">Mastered</p><p className="text-2xl font-bold text-primary-600">{analyticsSummary.masteredCount}</p></div>
                 </div>
                 {analyticsLoading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div> : analyticsData.length === 0 ? <div className="text-center py-8 text-slate-500">No analytics data available</div> : (
                   <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead><tr className="bg-slate-50"><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Student</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Subject</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Score</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Level</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">{analyticsData.map(record => (<tr key={record.id} className="hover:bg-slate-50"><td className="px-6 py-4 whitespace-nowrap"><p className="text-sm font-medium text-slate-900">{record.student_name}</p></td><td className="px-6 py-4 whitespace-nowrap text-sm">{record.subject}</td><td className="px-6 py-4 whitespace-nowrap"><p className={`text-sm font-medium ${record.score >= 70 ? 'text-green-600' : 'text-red-600'}`}>{record.score}%</p></td><td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100">{record.mastery_level}</span></td><td className="px-6 py-4 whitespace-nowrap text-sm"><div className="flex space-x-2"><button onClick={() => viewAnalyticsDetails(record)} className="p-1 hover:bg-slate-100 rounded-lg"><Eye size={16} /></button><button onClick={() => downloadAnalyticsReport(record.id)} className="p-1 hover:bg-slate-100 rounded-lg"><Download size={16} className="text-primary-600" /></button></div></td></tr>))}</tbody></table></div>
                 )}
               </div>
             </div>
           )}
         </div>

         {/* Create Exam Modal */}
         {showExamModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
               <div className="p-5 border-b flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Create Exam</h3><button onClick={() => setShowExamModal(false)}><X size={20} /></button></div>
               <div className="p-5 space-y-4">
                <div><label className="label">Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input" /></div>
                <div><label className="label">Level</label><select value={formData.level} onChange={e => setFormData({...formData, level: e.target.value, subjects: SUBJECT_OPTIONS[e.target.value] || []})} className="input"><option value="">Select Level</option><option value="PRIMARY">Primary</option><option value="JSS">JSS</option><option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option></select></div>
                {formData.level && (<div><label className="label">Subjects</label><div className="flex flex-wrap gap-2">{SUBJECT_OPTIONS[formData.level].map(s => (<label key={s} className={`px-2 py-1 rounded-md cursor-pointer border ${formData.subjects.includes(s) ? 'bg-primary-600 text-white' : 'bg-white'}`}><input type="checkbox" checked={formData.subjects.includes(s)} onChange={e => {const ns = e.target.checked ? [...formData.subjects, s] : formData.subjects.filter(x => x !== s); setFormData({...formData, subjects: ns});}} className="sr-only" />{s}</label>))}</div></div>)}
                <div className="grid grid-cols-2 gap-4"><div><label className="label">Academic Year</label><input type="text" value={formData.academic_year} onChange={e => setFormData({...formData, academic_year: e.target.value})} className="input" /></div><div><label className="label">Date</label><input type="date" value={formData.exam_date} onChange={e => setFormData({...formData, exam_date: e.target.value})} className="input" /></div></div>
                <div className="grid grid-cols-3 gap-4"><div><label className="label">Mins</label><input type="number" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})} className="input" /></div><div><label className="label">Qs</label><input type="number" value={formData.total_questions} onChange={e => setFormData({...formData, total_questions: parseInt(e.target.value)})} className="input" /></div><div><label className="label">Pass%</label><input type="number" value={formData.passing_score} onChange={e => setFormData({...formData, passing_score: parseInt(e.target.value)})} className="input" /></div></div>
               </div>
               <div className="flex justify-end gap-3 p-5 border-t"><button onClick={() => setShowExamModal(false)} className="btn-ghost">Cancel</button><button onClick={handleCreateExam} disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create'}</button></div>
            </div>
          </div>
        )}

        {/* Question Modal */}
        {showQuestionModal && selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex items-center justify-between"><h3>Questions — {selectedExam.title}</h3><button onClick={() => setShowQuestionModal(false)}><X size={20} /></button></div>
              <div className="p-5 space-y-4">
                <select value={questionData.question_type} onChange={e => resetQuestionDefaults(e.target.value)} className="input"><option value="MCQ">Multiple Choice</option><option value="TRUE_FALSE">True/False</option><option value="FILL_IN_THE_GAP">Fill Blank</option></select>
                <textarea value={questionData.question} onChange={e => setQuestionData({...questionData, question: e.target.value})} className="input" placeholder="Question text" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={questionData.subject} onChange={e => setQuestionData({...questionData, subject: e.target.value})} className="input"><option value="">Subject</option><option value="MATHEMATICS">Mathematics</option><option value="ENGLISH">English</option><option value="BASIC SCIENCE">Basic Science</option><option value="VERBAL REASONING">Verbal Reasoning</option><option value="QUANTITATIVE REASONING">Quantitative Reasoning</option><option value="ISLAMIC STUDIES">Islamic Studies</option><option value="GENERAL KNOWLEDGE">General Knowledge</option></select>
                  <select value={questionData.difficulty_level} onChange={e => setQuestionData({...questionData, difficulty_level: e.target.value})} className="input"><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option><option value="VERY_HARD">Very Hard</option></select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={questionData.topic} onChange={e => setQuestionData({...questionData, topic: e.target.value})} className="input" placeholder="Topic (e.g. Fractions, Grammar)" />
                  <input type="text" value={questionData.subtopic} onChange={e => setQuestionData({...questionData, subtopic: e.target.value})} className="input" placeholder="Subtopic (optional)" />
                </div>
                {questionData.question_type === 'MCQ' && questionData.options.map((opt, i) => (<div key={i} className="flex gap-2 mb-2"><input type="radio" checked={questionData.correct_answer === i} onChange={() => setQuestionData({...questionData, correct_answer: i})} /><input type="text" value={opt} onChange={e => {const os = [...questionData.options]; os[i] = e.target.value; setQuestionData({...questionData, options: os});}} className="input flex-1" /></div>))}
                <div className="mt-4 border-t pt-4"><div className="flex justify-between"><h4>{questions.length} Questions Added</h4><button onClick={() => openBankSelectModal(selectedExam)} className="text-xs text-primary-600">+ From Bank</button></div>{questions.map((q, i) => (<div key={q.id} className="flex justify-between p-2 bg-slate-50 mt-2"><span>{i+1}. {q.question}</span><button onClick={() => handleRemoveQuestion(q.id)} className="text-red-500"><Trash2 size={12} /></button></div>))}</div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t"><button onClick={() => setShowQuestionModal(false)} className="btn-ghost">Close</button><button onClick={handleAddQuestion} disabled={saving} className="btn-primary">Add Question</button></div>
            </div>
          </div>
        )}

        {/* Code Modal */}
        {showCodeModal && selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"><div className="p-5 border-b flex justify-between sticky top-0 bg-white z-10 rounded-t-2xl"><h3>Codes — {selectedExam.title}</h3><button onClick={() => setShowCodeModal(false)}><X size={20} /></button></div><div className="p-5"><button onClick={handleGenerateCode} disabled={saving} className="btn-primary w-full mb-4">Generate Code</button>{codes.filter(c => c.exam_id === selectedExam.id).map(c => (<div key={c.id} className="flex justify-between p-2 bg-slate-50 mt-1"><code className="font-bold">{c.code}</code><span>{c.used_count}/{c.max_uses}</span></div>))}</div></div>
          </div>
        )}

        {/* Bank Select Modal */}
        {showBankSelectModal && selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b flex justify-between"><h3>Select from Bank</h3><button onClick={() => setShowBankSelectModal(false)}><X size={20} /></button></div>
              <div className="p-5 space-y-4"><input type="text" placeholder="Search..." value={bankSelectSearch} onChange={e => filterBankSelect(e.target.value)} className="input" />{bankSelectFiltered.map(q => (<label key={q.id} className="flex gap-2 p-2 border mt-1"><input type="checkbox" checked={selectedBankIds.has(q.id)} onChange={() => toggleBankSelect(q.id)} /><span>{q.question} ({q.level})</span></label>))}</div>
              <div className="p-5 border-t flex justify-between"><button onClick={() => setShowBankSelectModal(false)}>Cancel</button><button onClick={async () => {await handleAddQuestionsFromBank(selectedExam.id, Array.from(selectedBankIds)); setShowBankSelectModal(false);}} className="btn-primary">Add {selectedBankIds.size}</button></div>
            </div>
          </div>
        )}

         {/* Application Modal */}
         {showApplicationModal && selectedApplication && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
               <div className="p-5 border-b flex justify-between"><h3>Review Application</h3><button onClick={() => setShowApplicationModal(false)}><X size={20} /></button></div>
               <div className="p-5 space-y-4">
                 <div className="bg-slate-50 p-3"><strong>{selectedApplication.first_name} {selectedApplication.last_name}</strong><br/>{selectedApplication.email} | {selectedApplication.applied_class}</div>
                 {selectedApplication.exam_score !== null && (<div className="bg-primary-50 p-3 font-bold text-center text-xl">{selectedApplication.exam_score}%</div>)}
                 <select value={admissionData.status} onChange={e => setAdmissionData({...admissionData, status: e.target.value})} className="input"><option value="">Decision</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="admitted">Admit</option><option value="assigned">Assign Exam</option></select>
                 {admissionData.status === 'admitted' && (<select value={admissionData.admitted_class} onChange={e => setAdmissionData({...admissionData, admitted_class: e.target.value})} className="input">{classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>)}
                 {admissionData.status === 'assigned' && (<select onChange={e => handleAssignExam(selectedApplication.id, e.target.value)} className="input"><option value="">Select Exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select>)}
               </div>
               <div className="p-5 border-t flex justify-end gap-2"><button onClick={() => setShowApplicationModal(false)}>Cancel</button><button onClick={handleAdmissionDecision} className="btn-primary">Save</button></div>
             </div>
           </div>
         )}
         
         {/* Question Bank Modal */}
         {showQuestionBankModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
               <div className="p-5 border-b flex justify-between sticky top-0 bg-white z-10 rounded-t-2xl"><h3>{editingQuestion ? 'Edit' : 'Add'} Question</h3><button onClick={() => setShowQuestionBankModal(false)}><X size={20} /></button></div>
                <div className="p-5 space-y-4">
                  <textarea value={questionData.question} onChange={e => setQuestionData({...questionData, question: e.target.value})} className="input" placeholder="Question" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={questionData.subject} onChange={e => setQuestionData({...questionData, subject: e.target.value})} className="input"><option value="">Subject</option><option value="MATHEMATICS">Mathematics</option><option value="ENGLISH">English</option><option value="BASIC SCIENCE">Basic Science</option><option value="VERBAL REASONING">Verbal Reasoning</option><option value="QUANTITATIVE REASONING">Quantitative Reasoning</option><option value="ISLAMIC STUDIES">Islamic Studies</option><option value="GENERAL KNOWLEDGE">General Knowledge</option><option value="PHYSICS">Physics</option><option value="CHEMISTRY">Chemistry</option><option value="BIOLOGY">Biology</option><option value="GEOGRAPHY">Geography</option><option value="BUSINESS STUDIES">Business Studies</option><option value="PRE-VOCATIONAL STUDIES">Pre-Vocational Studies</option></select>
                    <select value={questionData.level} onChange={e => setQuestionData({...questionData, level: e.target.value})} className="input"><option value="">Level</option><option value="PRIMARY">Primary</option><option value="PRIMARY 1">Primary 1</option><option value="PRIMARY 2">Primary 2</option><option value="PRIMARY 3">Primary 3</option><option value="PRIMARY 4">Primary 4</option><option value="PRIMARY 5">Primary 5</option><option value="PRIMARY 6">Primary 6</option><option value="JSS1">JSS 1</option><option value="JSS2">JSS 2</option><option value="JSS3">JSS 3</option><option value="SS1">SS 1</option><option value="SS2">SS 2</option><option value="SS3">SS 3</option></select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={questionData.topic} onChange={e => setQuestionData({...questionData, topic: e.target.value})} className="input" placeholder="Topic (e.g. Algebra, Grammar)" />
                    <input type="text" value={questionData.subtopic} onChange={e => setQuestionData({...questionData, subtopic: e.target.value})} className="input" placeholder="Subtopic (optional)" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={questionData.difficulty_level} onChange={e => setQuestionData({...questionData, difficulty_level: e.target.value})} className="input"><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option><option value="VERY_HARD">Very Hard</option></select>
                    <select value={questionData.question_type} onChange={e => setQuestionData({...questionData, question_type: e.target.value})} className="input"><option value="MCQ">Multiple Choice</option><option value="TRUE_FALSE">True/False</option><option value="FILL_IN_THE_GAP">Fill Blank</option></select>
                  </div>
                  {questionData.question_type === 'MCQ' && questionData.options.map((opt, i) => (
                    <div key={i} className="flex gap-2"><input type="radio" checked={questionData.correct_answer === i} onChange={() => setQuestionData({...questionData, correct_answer: i})} /><input type="text" value={opt} onChange={e => {const os = [...questionData.options]; os[i] = e.target.value; setQuestionData({...questionData, options: os});}} className="input flex-1" placeholder={`Option ${String.fromCharCode(65 + i)}`} /></div>
                  ))}
                </div>
               <div className="p-5 border-t flex justify-end gap-2 bg-white sticky bottom-0"><button onClick={() => setShowQuestionBankModal(false)}>Cancel</button><button onClick={() => addQuestionToBank(questionData)} className="btn-primary">Save</button></div>
             </div>
           </div>
         )}
         
         {/* Analytics Details Modal */}
          {showAnalyticsDetailModal && selectedAnalytics && (
            (() => {
              const tp = selectedAnalytics.topic_performance || {};
              const bySubject = tp.by_subject || {};
              const byDifficulty = tp.by_difficulty || {};
              const byTopic = tp.by_topic || {};
              const questions = tp.questions || [];
              const subjectEntries = Object.entries(bySubject);
              const difficultyEntries = Object.entries(byDifficulty);
              const topicEntries = Object.entries(byTopic);
              const totalQ = tp.total_questions || questions.length || 0;
              const correctQ = tp.correct_count || questions.filter((q: any) => q.is_correct).length || 0;
              return (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
               <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                 <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-2xl"><h3 className="text-lg font-bold">Analytics Details</h3><button onClick={() => setShowAnalyticsDetailModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button></div>
                 <div className="p-5 space-y-5">
                   {/* Student Info */}
                   <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                     <div><p className="font-bold text-lg">{selectedAnalytics.student_name}</p><p className="text-sm text-slate-500">Mastery: {selectedAnalytics.mastery_level}</p></div>
                     <div className={`text-2xl font-bold ${(selectedAnalytics.score || 0) >= 70 ? 'text-green-600' : 'text-red-600'}`}>{selectedAnalytics.score}%</div>
                   </div>

                   {/* Subject Bar Chart */}
                   {subjectEntries.length > 0 && (
                     <div className="bg-white border rounded-xl p-4">
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Subject Performance Overview</p>
                       <div className="space-y-2">
                         {subjectEntries.map(([subj, d]: [string, any]) => {
                           const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                           const barColor = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
                           return (
                             <div key={subj} className="flex items-center gap-3">
                               <span className="w-24 text-xs text-slate-700 text-right truncate shrink-0">{subj}</span>
                               <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                 <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                               </div>
                               <span className={`w-10 text-xs font-bold text-right ${pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{pct}%</span>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   )}

                   {/* Performance Insights */}
                   {(() => {
                     const sorted = subjectEntries.map(([n, d]: [string, any]) => ({ n, p: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0 })).filter((s: any) => s.p > 0).sort((a: any, b: any) => b.p - a.p);
                     const weakSubj = sorted.filter((s: any) => s.p < 40);
                     const weakDiff = difficultyEntries.filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
                     const weakTop = topicEntries.filter(([_, d]: [string, any]) => d.total > 0 && (d.correct / d.total) < 0.4);
                     if (sorted.length === 0 && weakDiff.length === 0 && weakTop.length === 0) return null;
                     return (
                       <div className="bg-white border rounded-xl p-4">
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Performance Insights</p>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                           {sorted.length >= 2 && (
                             <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                               <p className="text-xs font-bold text-green-700 uppercase mb-1">Strengths</p>
                               {sorted.slice(0, 2).map(s => <p key={s.n} className="text-sm text-green-800">{s.n}: {s.p}%</p>)}
                             </div>
                           )}
                           {(weakSubj.length > 0 || weakDiff.length > 0) && (
                             <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                               <p className="text-xs font-bold text-red-700 uppercase mb-1">Needs Improvement</p>
                               {weakSubj.map(s => <p key={s.n} className="text-sm text-red-800">{s.n}: {s.p}%</p>)}
                               {weakDiff.slice(0, 2).map(([d, dd]: [string, any]) => <p key={d} className="text-sm text-red-800">{d}: {Math.round((dd.correct / dd.total) * 100)}%</p>)}
                             </div>
                           )}
                           {weakTop.length > 0 && (
                             <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                               <p className="text-xs font-bold text-purple-700 uppercase mb-1">Topics to Focus On</p>
                               {weakTop.slice(0, 3).map(([t, td]: [string, any]) => <p key={t} className="text-sm text-purple-800">{t}: {Math.round((td.correct / td.total) * 100)}%</p>)}
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })()}

                   {/* Per-Question Analysis */}
                   {questions.length > 0 && (
                     <div className="bg-white border rounded-xl p-4">
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Per-Question Analysis</p>
                       <div className="overflow-x-auto max-h-64 overflow-y-auto">
                         <table className="w-full text-xs">
                           <thead><tr className="bg-slate-100"><th className="p-2 text-center">#</th><th className="p-2 text-left">Q</th><th className="p-2 text-center">Pts</th><th className="p-2 text-center">Result</th></tr></thead>
                           <tbody className="divide-y divide-slate-100">
                             {questions.map((q: any, i: number) => (
                               <tr key={i} className={q.is_correct ? '' : 'bg-red-50'}>
                                 <td className="p-2 text-center text-slate-400">{i + 1}</td>
                                 <td className="p-2 max-w-[200px] truncate" title={q.question}>{q.question}</td>
                                 <td className="p-2 text-center">
                                   <span className="inline-flex items-center gap-0.5">
                                     {Array.from({ length: q.points || 1 }).map((_, di) => (
                                       <span key={di} className={`w-2 h-2 rounded-full inline-block ${di < (q.points_earned || 0) ? 'bg-green-500' : 'bg-slate-200'}`} />
                                     ))}
                                     <span className="ml-1 text-slate-400">{(q.points_earned || 0)}/{(q.points || 1)}</span>
                                   </span>
                                 </td>
                                 <td className="p-2 text-center">{q.is_correct ? <Check size={14} className="text-green-500 inline" /> : <X size={14} className="text-red-500 inline" />}</td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     </div>
                   )}
                 </div>
                 <div className="p-5 border-t flex justify-end gap-2 sticky bottom-0 bg-white"><button onClick={() => setShowAnalyticsDetailModal(false)} className="btn-outline">Close</button><button onClick={() => downloadAnalyticsReport(selectedAnalytics.id)} className="btn-primary">Download PDF</button></div>
               </div>
             </div>
              );
            })()
          )}
      </div>
    </DashboardLayout>
  );
}
