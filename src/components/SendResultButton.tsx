'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, MessageCircle, Mail, X, Loader2 } from 'lucide-react';

interface ResultItem {
  subject_name: string;
  exam_type: string;
  score: number;
  grade: string;
}

interface SendResultButtonProps {
  studentId: string;
  studentName: string;
  results: ResultItem[];
  className?: string;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length === 13) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1);
  if (digits.startsWith('+')) return digits.slice(1);
  return digits;
}

function buildMessage(studentName: string, results: ResultItem[], className?: string): string {
  const scores = results.map(r => r.score);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : avg >= 50 ? 'D' : 'F';
  const status = avg >= 70 ? 'Good' : avg >= 50 ? 'Average' : 'Needs Improvement';

  let msg = `*Academic Results Report*\n`;
  msg += `*Student:* ${studentName}\n`;
  if (className) msg += `*Class:* ${className}\n`;
  msg += `─────────────────────\n`;

  results.forEach(r => {
    const icon = r.score >= 70 ? '✅' : r.score >= 50 ? '⚠️' : '❌';
    msg += `${icon} ${r.subject_name} (${r.exam_type}): ${r.score}% (${r.grade})\n`;
  });

  msg += `─────────────────────\n`;
  msg += `*Average:* ${avg}% (${grade})\n`;
  msg += `*Status:* ${status}\n`;
  msg += `\nSent via ClearPath Edu Hub`;

  return msg;
}

function buildEmailBody(studentName: string, results: ResultItem[], className?: string): string {
  const scores = results.map(r => r.score);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : avg >= 50 ? 'D' : 'F';

  let body = `Academic Results Report\n`;
  body += `Student: ${studentName}\n`;
  if (className) body += `Class: ${className}\n`;
  body += `${'─'.repeat(35)}\n\n`;

  results.forEach(r => {
    body += `${r.subject_name} (${r.exam_type}): ${r.score}% - ${r.grade}\n`;
  });

  body += `\n${'─'.repeat(35)}\n`;
  body += `Average: ${avg}% (${grade})\n\n`;
  body += `Sent via ClearPath Edu Hub`;

  return body;
}

export default function SendResultButton({ studentId, studentName, results, className }: SendResultButtonProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'whatsapp' | 'email'>('whatsapp');
  const [parentInfo, setParentInfo] = useState<{ phone?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function fetchParent() {
    setLoading(true);
    setError('');
    try {
      const { data: student } = await supabase
        .from('students')
        .select('parent_id, class:classes!class_id(name)')
        .eq('profile_id', studentId)
        .maybeSingle();

      if (!student?.parent_id) {
        setError('No parent linked to this student.');
        setLoading(false);
        return;
      }

      const { data: parent } = await supabase
        .from('profiles')
        .select('phone, email')
        .eq('id', student.parent_id)
        .maybeSingle();

      if (!parent) {
        setError('Parent profile not found.');
        setLoading(false);
        return;
      }

      setParentInfo({ phone: parent.phone || undefined, email: parent.email || undefined });

      if (!parent.phone && !parent.email) {
        setError('Parent has no phone or email on file.');
        setLoading(false);
        return;
      }

      const msg = buildMessage(studentName, results, (student as any)?.class?.name);
      const encodedMsg = encodeURIComponent(msg);

      if (mode === 'whatsapp') {
        if (!parent.phone) {
          setError('Parent has no phone number.');
          setLoading(false);
          return;
        }
        const waNumber = formatPhone(parent.phone);
        window.open(`https://wa.me/${waNumber}?text=${encodedMsg}`, '_blank');
      } else {
        if (!parent.email) {
          setError('Parent has no email address.');
          setLoading(false);
          return;
        }
        const subject = encodeURIComponent(`Academic Results - ${studentName}`);
        const body = encodeURIComponent(buildEmailBody(studentName, results, (student as any)?.class?.name));
        window.open(`mailto:${parent.email}?subject=${subject}&body=${body}`, '_blank');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send.');
    }
    setLoading(false);
  }

  function handleSend() {
    if (!results.length) {
      setError('No results to send.');
      return;
    }
    fetchParent();
  }

  return (
    <div className={`relative ${className || ''}`} ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        title="Send results to parent"
      >
        <Send size={14} />
        Send to Parent
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 w-72 p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Send Results</h3>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-100 rounded">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Send {studentName}&apos;s results to their parent via:
          </p>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode('whatsapp')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                mode === 'whatsapp'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>
            <button
              onClick={() => setMode('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                mode === 'email'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Mail size={16} />
              Email
            </button>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2 mb-2">{error}</div>
          )}

          <button
            onClick={handleSend}
            disabled={loading || results.length === 0}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> Sending...</>
            ) : (
              <><Send size={14} /> {mode === 'whatsapp' ? 'Open WhatsApp' : 'Open Email'}</>
            )}
          </button>

          {results.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 mb-1.5">Results included:</p>
              <div className="space-y-0.5">
                {results.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex justify-between text-[10px]">
                    <span className="text-slate-600 truncate mr-2">{r.subject_name}</span>
                    <span className={`font-medium ${r.score >= 70 ? 'text-green-600' : r.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.score}%</span>
                  </div>
                ))}
                {results.length > 8 && (
                  <p className="text-[10px] text-slate-400">+{results.length - 8} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
