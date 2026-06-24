'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Plus, Award, Save, ArrowLeft, BarChart3, Users, TrendingUp,
  AlertTriangle, Download, CheckCircle, XCircle, Loader2, Edit3, Send, GraduationCap, Printer
} from 'lucide-react';
import type { Subject } from '@/types';
import SendResultButton from '@/components/SendResultButton';

type ExamType = 'ca1' | 'ca2' | 'ca3' | 'exam';
type ScoreCell = { result_id?: string; score: number; grade: string } | null;

interface StudentScoreRow {
  student_id: string;
  student_name: string;
  admission_number?: string;
  ca1: ScoreCell;
  ca2: ScoreCell;
  ca3: ScoreCell;
  exam: ScoreCell;
  dirty: boolean;
}

function buildScoreTypes(config: any): { key: ExamType; label: string; maxScore: number }[] {
  if (!config) return [{ key: 'ca1', label: 'Mid-Term Test', maxScore: 40 }, { key: 'exam', label: 'Exam', maxScore: 60 }];
  const types: { key: ExamType; label: string; maxScore: number }[] = [];
  if (config.ca1_enabled) types.push({ key: 'ca1', label: config.ca1_label || 'Mid-Term Test', maxScore: config.ca1_max || 40 });
  if (config.ca2_enabled) types.push({ key: 'ca2', label: config.ca2_label || '2nd CA', maxScore: config.ca2_max || 10 });
  if (config.ca3_enabled) types.push({ key: 'ca3', label: config.ca3_label || '3rd CA', maxScore: config.ca3_max || 10 });
  if (config.exam_enabled) types.push({ key: 'exam', label: config.exam_label || 'Exam', maxScore: config.exam_max || 60 });
  return types;
}

function totalScore(row: StudentScoreRow, config?: any): number {
  let total = 0;
  const types = config ? buildScoreTypes(config) : [{ key: 'ca1' as ExamType, maxScore: 40 }, { key: 'exam' as ExamType, maxScore: 60 }];
  for (const t of types) {
    total += row[t.key]?.score ?? 0;
  }
  return Math.min(100, total);
}

function calculateGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function safeScore(val: string | number): number {
  const n = typeof val === 'string' ? parseInt(val) : val;
  if (isNaN(n)) return 0;
  return Math.max(0, n);
}

export default function AdminResultsPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [students, setStudents] = useState<{ id: string; profile_id: string; name: string; admission_number?: string }[]>([]);
  const [rows, setRows] = useState<StudentScoreRow[]>([]);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [assessmentConfig, setAssessmentConfig] = useState<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', subject_id: '', exam_type: 'ca1' as ExamType, score: 0, grade: '', remarks: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchInitial();
  }, [profile]);

  useEffect(() => {
    if (selectedTerm && selectedClassId && selectedSubjectId) fetchMatrix();
  }, [selectedTerm, selectedClassId, selectedSubjectId]);

  async function fetchInitial() {
    setLoading(true);
    try {
      const [{ data: termData }, { data: classData }] = await Promise.all([
        supabase.from('terms').select('*, session:academic_sessions!session_id(name)').order('start_date', { ascending: false }),
        supabase.from('classes').select('*').order('name'),
      ]);

      setTerms(termData || []);
      const current = termData?.find((t: any) => t.is_current) || termData?.[0] || null;
      setSelectedTerm(current);

      const cls = classData || [];
      setClasses(cls);
      const firstClassId = cls.length > 0 ? cls[0].id : '';
      if (firstClassId) setSelectedClassId(firstClassId);

      const { data: settingsData } = await supabase.from('school_settings').select('assessment_config').limit(1).maybeSingle();
      setAssessmentConfig(settingsData?.assessment_config || null);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  // Fetch subjects whenever class changes
  useEffect(() => {
    if (!selectedClassId) return;
    setSelectedSubjectId('');
    supabase.from('subjects').select('*').eq('class_id', selectedClassId).order('name')
      .then(({ data }) => {
        setSubjects(data || []);
        if (data && data.length > 0) setSelectedSubjectId(data[0].id);
      });
  }, [selectedClassId]);

  async function fetchMatrix() {
    setLoading(true);
    try {
      const { data: classStudents } = await supabase
        .from('students')
        .select('id, profile_id, admission_number, profile:profiles!profile_id(first_name, last_name)')
        .eq('class_id', selectedClassId)
        .order('admission_number');

      const studentList = (classStudents || []).map((s: any) => ({
        id: s.id,
        profile_id: s.profile_id,
        name: `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.trim() || 'Unknown',
        admission_number: s.admission_number,
      }));
      setStudents(studentList);

      const { data: existing } = await supabase
        .from('results')
        .select('*, student:profiles!student_id(first_name, last_name), subject:subjects!subject_id(name)')
        .eq('subject_id', selectedSubjectId)
        .eq('term', selectedTerm?.name)
        .eq('academic_year', selectedTerm?.session?.name || '');
      setAllResults(existing || []);

      const matrix: StudentScoreRow[] = studentList.map(s => {
        const studentResults = (existing || []).filter((r: any) => r.student_id === s.profile_id);
        const getCell = (et: ExamType): ScoreCell => {
          const r = studentResults.find((res: any) => res.exam_type === et);
          return r ? { result_id: r.id, score: r.score, grade: r.grade || calculateGrade(r.score) } : null;
        };
        const scoreTypes = buildScoreTypes(assessmentConfig);
        const cellInit: any = {};
        scoreTypes.forEach(st => { cellInit[st.key] = getCell(st.key); });
        return { student_id: s.profile_id, student_name: s.name, admission_number: s.admission_number, ...cellInit, dirty: false };
      });
      setRows(matrix);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  function updateCell(rowIdx: number, et: ExamType, value: number) {
    setRows(prev => {
      const next = [...prev];
      const row = { ...next[rowIdx] };
      const existing = row[et];
      const clamped = safeScore(value);
      const cell: ScoreCell = existing
        ? { ...existing, score: clamped, grade: calculateGrade(clamped) }
        : { score: clamped, grade: calculateGrade(clamped) };
      next[rowIdx] = { ...row, [et]: cell, dirty: true };
      return next;
    });
  }

  function cellTotal(row: StudentScoreRow): number {
    return totalScore(row, assessmentConfig);
  }

  function cellCount(row: StudentScoreRow): number {
    const types = assessmentConfig ? buildScoreTypes(assessmentConfig) : [{ key: 'ca1' as ExamType }, { key: 'exam' as ExamType }];
    return types.filter(t => row[t.key]).length;
  }

  async function saveRow(row: StudentScoreRow) {
    const ops: PromiseLike<any>[] = [];
    const term = selectedTerm?.name || '';
    const academicYear = selectedTerm?.session?.name || '';

    const scoreTypes = buildScoreTypes(assessmentConfig);
    for (const et of scoreTypes.map(st => st.key)) {
      const cell = row[et];
      if (!cell) continue;
      if (cell.result_id) {
        ops.push(
          supabase.from('results').update({ score: cell.score, grade: cell.grade }).eq('id', cell.result_id).then(r => r)
        );
      } else {
        ops.push(
          supabase.from('results').insert({
            student_id: row.student_id,
            subject_id: selectedSubjectId,
            exam_type: et,
            score: cell.score,
            grade: cell.grade,
            term,
            academic_year: academicYear,
            entered_by: profile?.id,
          }).select().then(r => r)
        );
      }
    }
    const res = await Promise.all(ops);
    for (const r of res) {
      if (r.error) throw new Error(r.error.message);
    }
    const newIds: string[] = [];
    for (const r of res) {
      if (r.data) newIds.push(r.data[0]?.id);
    }
    return newIds;
  }

  async function handleSaveAll() {
    const dirty = rows.filter(r => r.dirty);
    if (dirty.length === 0) { setError('No changes to save'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      for (const row of dirty) { await saveRow(row); }
      setSuccess(`Saved ${dirty.length} student(s) successfully`);
      await fetchMatrix();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function handleSaveSingle(row: StudentScoreRow) {
    setSaving(true); setError(''); setSuccess('');
    try {
      await saveRow(row);
      setSuccess(`Saved ${row.student_name}'s scores`);
      await fetchMatrix();
    } catch (err: any) { setError(err.message); }
    setSaving(false);
  }

  async function handleModalSave() {
    if (!formData.student_id || !formData.subject_id) { setError('Student and subject are required'); return; }
    setError(''); setSuccess('');
    const score = safeScore(formData.score);
    const grade = calculateGrade(score);
    try {
      const term = selectedTerm?.name || '';
      const academicYear = selectedTerm?.session?.name || '';
      const { error: err } = await supabase.from('results').insert({
        student_id: formData.student_id,
        subject_id: formData.subject_id,
        exam_type: formData.exam_type,
        score,
        grade,
        remarks: formData.remarks,
        term,
        academic_year: academicYear,
        entered_by: profile?.id,
      });
      if (err) throw new Error(err.message);
      setSuccess('Result saved');
      setTimeout(() => {
        setShowModal(false);
        setFormData({ student_id: '', subject_id: '', exam_type: 'ca1', score: 0, grade: '', remarks: '' });
        fetchMatrix();
      }, 1000);
    } catch (err: any) { setError(err.message); }
  }

  function exportCSV() {
    if (allResults.length === 0) { setError('No results to export'); return; }
    const headers = 'Student,Admission,Subject,Exam Type,Score,Grade,Term,Date';
    const csvRows = allResults.map((r: any) =>
      `"${r.student?.first_name || ''} ${r.student?.last_name || ''}","${students.find(s => s.profile_id === r.student_id)?.admission_number || ''}","${r.subject?.name || ''}","${r.exam_type}","${r.score}","${r.grade || ''}","${r.term || ''}","${new Date(r.created_at).toLocaleDateString()}"`
    ).join('\n');
    const blob = new Blob([`${headers}\n${csvRows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'results_export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const allScores = allResults.map((r: any) => r.score);
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const passRate = allScores.length > 0 ? Math.round((allScores.filter((s: number) => s >= 50).length / allScores.length) * 100) : 0;
  const atRisk = rows.filter(r => { const t = cellTotal(r); return cellCount(r) > 0 && t < 50; });
  const gradeDist = ['A+', 'A', 'B', 'C', 'D', 'F'].map(g => ({ grade: g, count: allResults.filter((r: any) => r.grade === g).length }));
  const hasChanges = rows.some(r => r.dirty);
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);

  const scoreTypes = buildScoreTypes(assessmentConfig);
  return (
    <DashboardLayout title="Score Declaration" subtitle="Admin - Enter CA and Exam scores per student per term">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
            <div><h1 className="text-2xl font-bold text-slate-800">Score Declaration</h1><p className="text-slate-500 text-sm">Admin - Enter CA and Exam scores per student per term</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSummary(!showSummary)} className="btn-outline flex items-center gap-2 text-sm"><BarChart3 size={16} />{showSummary ? 'Hide' : 'Summary'}</button>
            <button onClick={exportCSV} className="btn-outline flex items-center gap-2 text-sm"><Download size={16} />CSV</button>
            <button onClick={() => setShowModal(true)} className="btn-outline flex items-center gap-2 text-sm"><Plus size={16} />Quick Entry</button>
            {hasChanges && (
              <button onClick={handleSaveAll} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : `Save All (${rows.filter(r => r.dirty).length})`}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Term</label>
            <select value={selectedTerm?.id || ''} onChange={e => setSelectedTerm(terms.find(t => t.id === e.target.value) || null)} className="input py-1.5 text-sm w-auto min-w-[160px]">
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.session?.name || ''}{t.is_current ? ' (Current)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Class</label>
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="input py-1.5 text-sm w-auto min-w-[160px]">
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Subject</label>
            <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="input py-1.5 text-sm w-auto min-w-[160px]">
              {subjects.filter(s => !selectedClassId || s.class_id === selectedClassId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Term info banner */}
        {selectedTerm && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-primary-800">
            <GraduationCap size={18} />
            <span>Declaring scores for <strong>{selectedTerm.name}</strong> — {selectedTerm.session?.name || ''} ({new Date(selectedTerm.start_date).toLocaleDateString()} to {new Date(selectedTerm.end_date).toLocaleDateString()})</span>
          </div>
        )}

        {/* Error + Success */}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2"><XCircle size={16} />{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
        ) : (
          <>
            {/* Summary Panel */}
            {showSummary && (
              <div className="space-y-4 animate-scale-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"><p className="text-xs text-slate-500">Total Entries</p><p className="text-2xl font-bold text-slate-800">{allResults.length}</p></div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"><p className="text-xs text-slate-500">Average Score</p><p className={`text-2xl font-bold ${avgScore >= 70 ? 'text-green-600' : avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avgScore}%</p></div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"><p className="text-xs text-slate-500">Pass Rate</p><p className={`text-2xl font-bold ${passRate >= 70 ? 'text-green-600' : passRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{passRate}%</p></div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5"><p className="text-xs text-slate-500">Students</p><p className="text-2xl font-bold text-slate-800">{rows.length}</p></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-800 mb-3 text-sm">Grade Distribution</h3>
                    {gradeDist.filter(g => g.count > 0).length === 0 ? <p className="text-sm text-slate-400">No data</p> : (
                      <div className="space-y-2">{gradeDist.filter(g => g.count > 0).map(g => {
                        const pct = Math.round((g.count / allResults.length) * 100);
                        return (<div key={g.grade} className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-slate-100 text-slate-700">{g.grade}</span><div className="flex-1 bg-slate-100 rounded-full h-3"><div className="h-3 rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} /></div><span className="text-sm text-slate-500 w-8 text-right">{g.count}</span></div>);
                      })}</div>
                    )}
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-800 mb-3 text-sm">Subject Summary</h3>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm text-slate-600">Subject</span><span className="text-sm font-bold text-slate-800">{currentSubject?.name || 'N/A'}</span></div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mt-2"><span className="text-sm text-slate-600">Class</span><span className="text-sm font-bold text-slate-800">{classes.find(c => c.id === selectedClassId)?.name || 'N/A'}</span></div>
                  </div>
                </div>
                {atRisk.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <h3 className="font-semibold text-red-800 mb-2 text-sm flex items-center gap-2"><AlertTriangle size={16} />At-Risk Students (Avg &lt; 50%)</h3>
                    <div className="flex flex-wrap gap-2">{atRisk.map(r => <span key={r.student_id} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">{r.student_name} (avg {cellTotal(r)}%)</span>)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Score Declaration Matrix */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Edit3 size={16} className="text-primary-600" />
                  Score Matrix — <span className="text-primary-600">{currentSubject?.name}</span>
                </h2>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <button onClick={handleSaveAll} disabled={saving} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save All
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="py-3 px-4 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[180px]">Student</th>
                      {scoreTypes.map(st => (
                        <th key={st.key} className="py-3 px-3 font-semibold text-slate-600 text-center min-w-[100px]">{st.label}<br /><span className="text-[10px] font-normal text-slate-400">(/{st.maxScore})</span></th>
                      ))}
                      <th className="py-3 px-3 font-semibold text-slate-600 text-center min-w-[60px]">Total</th>
                      <th className="py-3 px-3 font-semibold text-slate-600 text-center min-w-[60px]">Grade</th>
                      <th className="py-3 px-3 font-semibold text-slate-600 text-center min-w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-slate-400">No students in this class</td></tr>
                    ) : rows.map((row, ri) => {
                      const total = cellTotal(row);
                      const filled = cellCount(row);
                      const grade = filled > 0 ? calculateGrade(total) : '-';
                      const gradeColor = total >= 70 ? 'text-green-600' : total >= 50 ? 'text-amber-600' : 'text-red-600';
                      return (
                        <tr key={row.student_id} className={`border-t border-slate-100 hover:bg-slate-50/50 transition-colors ${row.dirty ? 'bg-amber-50/50' : ''}`}>
                          <td className="py-2.5 px-4 font-medium text-slate-800 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-2">
                              {row.student_name}
                              {row.dirty && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />}
                            </div>
                          </td>
                          {scoreTypes.map(st => {
                             const cell = row[st.key];
                            return (
                              <td key={st.key} className="py-2.5 px-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={st.maxScore}
                                  value={cell?.score ?? ''}
                                  onChange={e => updateCell(ri, st.key, e.target.value === '' ? 0 : Math.min(st.maxScore, Math.max(0, parseInt(e.target.value) || 0)))}
                                  className={`w-20 text-center text-sm font-bold py-1.5 rounded-lg border transition-colors ${
                                    cell ? 'bg-white border-slate-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                                  }`}
                                  placeholder="-"
                                />
                              </td>
                            );
                          })}
                          <td className={`py-2.5 px-3 text-center font-bold ${filled > 0 ? gradeColor : 'text-slate-300'}`}>{filled > 0 ? `${total}%` : '-'}</td>
                          <td className={`py-2.5 px-3 text-center font-bold ${gradeColor}`}>{grade}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {row.dirty && (
                                <button onClick={() => handleSaveSingle(row)} disabled={saving} className="p-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors" title="Save this student">
                                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                </button>
                              )}
                              {filled > 0 && (
                                <SendResultButton
                                  studentId={row.student_id}
                                  studentName={row.student_name}
                                  results={scoreTypes
                                    .filter(st => row[st.key])
                                    .map(st => ({
                                      subject_name: currentSubject?.name || 'Subject',
                                      exam_type: st.label,
                                      score: row[st.key]!.score,
                                      grade: row[st.key]!.grade,
                                    }))}
                                />
                              )}
                              {filled > 0 && (
                                <button
                                  onClick={() => router.push(`/teacher/report-card?student=${row.student_id}&term=${selectedTerm?.id}`)}
                                  className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                                  title="View Report Card"
                                >
                                  <Printer size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 0 && (
                <div className="p-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between">
                  <span>{rows.length} student(s) &middot; {allResults.length} entries</span>
                  {hasChanges && <span className="text-amber-600 font-medium">{rows.filter(r => r.dirty).length} unsaved</span>}
                </div>
              )}
            </div>

            {/* All Entries Table */}
            {allResults.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Award size={18} className="text-slate-400" />All Entries</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-500 border-b"><th className="py-2 pr-4">Student</th><th className="py-2 pr-4">Subject</th><th className="py-2 pr-4">Exam</th><th className="py-2 pr-4">Score</th><th className="py-2 pr-4">Grade</th><th className="py-2 pr-4">Term</th></tr></thead>
                    <tbody>{allResults.map((r: any) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium text-slate-800">{r.student?.first_name} {r.student?.last_name}</td>
                        <td className="py-2 pr-4 text-slate-600">{r.subject?.name || '-'}</td>
                        <td className="py-2 pr-4 capitalize text-slate-600">{r.exam_type}</td>
                        <td className="py-2 pr-4 font-bold">{r.score}</td>
                        <td className="py-2 pr-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${r.grade?.includes('A') ? 'bg-green-100 text-green-700' : r.grade?.includes('F') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{r.grade}</span></td>
                        <td className="py-2 pr-4 text-slate-400 text-xs">{r.term || '-'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Quick Entry Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-5 border-b"><h2 className="text-lg font-semibold text-slate-800">Quick Result Entry</h2></div>
              <div className="p-5 space-y-4">
                <div><label className="label">Student</label>
                  <select value={formData.student_id} onChange={e => setFormData({ ...formData, student_id: e.target.value })} className="input">
                    <option value="">Select Student</option>
                    {students.map(s => <option key={s.profile_id} value={s.profile_id}>{s.name}</option>)}
                  </select>
                </div>
                <div><label className="label">Subject</label>
                  <select value={formData.subject_id} onChange={e => setFormData({ ...formData, subject_id: e.target.value })} className="input">
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div><label className="label">Assessment Type</label>
                  <select value={formData.exam_type} onChange={e => {
                    const st = scoreTypes.find(s => s.key === e.target.value);
                    const max = st?.maxScore || 100;
                    setFormData({ ...formData, exam_type: e.target.value as ExamType, score: Math.min(formData.score, max) });
                  }} className="input">
                    {scoreTypes.map(st => (
                      <option key={st.key} value={st.key}>{st.label} (/{st.maxScore})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Score</label>
                  <input type="number" min={0} max={scoreTypes.find(st => st.key === formData.exam_type)?.maxScore || 100}
                    value={formData.score ?? ''}
                    onChange={e => {
                      const raw = e.target.value;
                      const max = scoreTypes.find(st => st.key === formData.exam_type)?.maxScore || 100;
                      const score = raw === '' ? 0 : Math.min(max, Math.max(0, parseInt(raw) || 0));
                      setFormData({ ...formData, score, grade: calculateGrade(score) });
                    }}
                    className="input" />
                </div>
                <div><label className="label">Grade</label><input type="text" value={formData.grade || calculateGrade(safeScore(formData.score))} disabled className="input bg-slate-50" /></div>
                <div><label className="label">Remarks (optional)</label><input type="text" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="input" /></div>
                {selectedTerm && <p className="text-xs text-slate-400">Term: {selectedTerm.name} &middot; {selectedTerm.session?.name || ''}</p>}
              </div>
              <div className="flex justify-end gap-3 p-5 border-t">
                <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleModalSave} className="btn-primary flex items-center gap-2"><Save size={16} />Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
