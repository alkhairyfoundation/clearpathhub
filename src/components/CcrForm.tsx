'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getQuestionsByType, DOMAINS, getDomainQuestions } from '@/lib/ccr-questions';
import { Save, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { CcrQuestion, CcrRespondentType } from '@/types';

interface CcrFormProps {
  respondentType: CcrRespondentType;
  studentId: string;
  studentName?: string;
  subjectId?: string;
  onComplete?: () => void;
}

export default function CcrForm({ respondentType, studentId, studentName, subjectId, onComplete }: CcrFormProps) {
  const { profile } = useAuth();
  const questions = getQuestionsByType(respondentType);
  const domains = DOMAINS.filter(d => getDomainQuestions(respondentType, d.key).length > 0);

  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentDomainIdx, setCurrentDomainIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const currentDomain = domains[currentDomainIdx];
  const domainQuestions = currentDomain ? getDomainQuestions(respondentType, currentDomain.key) : [];
  const progress = questions.length > 0 ? (Object.keys(responses).filter(k => responses[k] !== undefined && responses[k] !== null && responses[k] !== '').length / questions.length) * 100 : 0;

  useEffect(() => {
    loadExisting();
  }, [studentId, respondentType]);

  async function loadExisting() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('ccr_responses')
        .select('*')
        .eq('student_id', studentId)
        .eq('respondent_type', respondentType)
        .maybeSingle();

      if (data) {
        setResponses(data.data || {});
        setIsSubmitted(data.is_submitted);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const saveProgress = useCallback(async (finalSubmit = false) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: any = {
        student_id: studentId,
        respondent_type: respondentType,
        responses,
        is_submitted: finalSubmit,
      };

      const { data: sessionData } = await supabase.from('school_settings').select('current_session_id, current_term_id').single();
      if (sessionData) {
        payload.academic_session_id = sessionData.current_session_id;
        payload.term_id = sessionData.current_term_id;
      }

      if (respondentType === 'subject_teacher' && subjectId) {
        responses['ST_meta_subject_id'] = subjectId;
      }

      const res = await fetch('/api/ccr/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      if (finalSubmit) setIsSubmitted(true);
      setSuccess(finalSubmit ? 'Questionnaire submitted successfully!' : 'Progress saved!');
      if (finalSubmit && onComplete) onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }, [studentId, respondentType, responses, subjectId, onComplete]);

  function handleResponse(qId: string, value: any) {
    setResponses(prev => ({ ...prev, [qId]: value }));
    setError('');
    setSuccess('');
  }

  function isQuestionValid(q: CcrQuestion): boolean {
    if (!q.required) return true;
    const val = responses[q.id];
    if (q.type === 'scale_1_5') return typeof val === 'number' && val >= 1 && val <= 5;
    if (q.type === 'single_choice') return typeof val === 'string' && val.length > 0;
    if (q.type === 'multi_choice') return Array.isArray(val) && val.length > 0;
    if (q.type === 'open_text') return typeof val === 'string' && val.trim().length > 0;
    return true;
  }

  function getRequiredErrors(): string[] {
    const errors: string[] = [];
    for (const q of questions) {
      if (q.required && !isQuestionValid(q)) {
        errors.push(`"${q.text.substring(0, 60)}..." is required.`);
      }
    }
    return errors;
  }

  async function handleSubmit() {
    const errors = getRequiredErrors();
    if (errors.length > 0) {
      setError(`Please answer all required questions:\n${errors.join('\n')}`);
      return;
    }
    setSubmitting(true);
    await saveProgress(true);
    setSubmitting(false);
  }

  function renderQuestion(q: CcrQuestion) {
    const val = responses[q.id];

    if (q.type === 'scale_1_5') {
      return (
        <div key={q.id} className="mb-6">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">{q.text} {q.required && <span className="text-red-500 dark:text-red-400 dark:text-red-400">*</span>}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => handleResponse(q.id, n)}
                className={`w-12 h-12 rounded-full text-sm font-medium transition-all ${
                  val === n ? 'bg-primary-600 text-white ring-2 ring-primary-300 scale-110' : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">
            <span>Strongly Disagree</span>
            <span>Strongly Agree</span>
          </div>
          {q.notes && <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1 italic">{q.notes}</p>}
        </div>
      );
    }

    if (q.type === 'single_choice') {
      return (
        <div key={q.id} className="mb-6">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">{q.text} {q.required && <span className="text-red-500 dark:text-red-400 dark:text-red-400">*</span>}</p>
          <div className="space-y-2">
            {q.options?.map(opt => (
              <label
                key={opt}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  val === opt ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={val === opt}
                  onChange={() => handleResponse(q.id, opt)}
                  className="w-4 h-4 text-primary-600 dark:text-primary-400 dark:text-primary-400"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (q.type === 'multi_choice') {
      const selected: string[] = val || [];
      const max = q.maxSelect || 3;
      return (
        <div key={q.id} className="mb-6">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">
            {q.text} {q.required && <span className="text-red-500 dark:text-red-400 dark:text-red-400">*</span>}
            <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 ml-2">(Select up to {max})</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {q.options?.map(opt => {
              const isSelected = selected.includes(opt);
              const isDisabled = !isSelected && selected.length >= max;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isDisabled && !isSelected}
                  onClick={() => {
                    if (isSelected) {
                      handleResponse(q.id, selected.filter(s => s !== opt));
                    } else if (!isDisabled) {
                      handleResponse(q.id, [...selected, opt]);
                    }
                  }}
                  className={`p-2 rounded-lg border text-sm text-left transition-all ${
                    isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600'
                  } ${isDisabled && !isSelected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (q.type === 'open_text') {
      return (
        <div key={q.id} className="mb-6">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300 mb-2">{q.text} {q.required && <span className="text-red-500 dark:text-red-400 dark:text-red-400">*</span>}</p>
          <textarea
            value={val || ''}
            onChange={e => handleResponse(q.id, e.target.value)}
            className="input w-full min-h-[80px]"
            maxLength={q.maxLength || 2000}
            placeholder="Type your answer here..."
          />
          <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1 text-right">{(val || '').length} / {q.maxLength || 2000}</p>
        </div>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-20">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-2">Questionnaire Complete</h2>
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">You have already submitted your responses for this term.</p>
      </div>
    );
  }

  return (
    <div>
      {studentName && (
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-4">Responding for: <span className="font-semibold">{studentName}</span></p>
      )}

      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-1">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div className="bg-primary-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-400 dark:text-red-400 text-sm whitespace-pre-line">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 dark:border-green-900/40 rounded-lg text-green-700 dark:text-green-300 dark:text-green-300 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {domains.map((d, i) => {
          const dq = getDomainQuestions(respondentType, d.key);
          const answered = dq.filter(q => responses[q.id] !== undefined && responses[q.id] !== null && responses[q.id] !== '').length;
          return (
            <button
              key={d.key}
              onClick={() => setCurrentDomainIdx(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                i === currentDomainIdx ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {d.label.split('(')[0].trim()}
              <span className="ml-2 text-xs opacity-70">({answered}/{dq.length})</span>
            </button>
          );
        })}
      </div>

      {currentDomain && (
        <div className="bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-1">{currentDomain.label}</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mb-6">Domain {currentDomainIdx + 1} of {domains.length}</p>
          {domainQuestions.map(renderQuestion)}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentDomainIdx(Math.max(0, currentDomainIdx - 1))}
          disabled={currentDomainIdx === 0}
          className="btn-outline flex items-center gap-2 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => saveProgress(false)}
            disabled={saving}
            className="btn-outline flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Progress
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Submit All
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCurrentDomainIdx(Math.min(domains.length - 1, currentDomainIdx + 1))}
          disabled={currentDomainIdx === domains.length - 1}
          className="btn-outline flex items-center gap-2 disabled:opacity-40"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
