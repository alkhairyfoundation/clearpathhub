'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Award, AlertTriangle, CheckCircle, Star, Heart, ShieldAlert, Clock, Copy, Monitor, Ban } from 'lucide-react';

function BehaviorContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const [children, setChildren] = useState<any[]>([]);
  const [child, setChild] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [examActivityLogs, setExamActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile, childId]);

  async function fetchData() {
    setLoading(true);
    try {
      const childrenRes = await supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)').eq('parent_id', profile?.id);
      if (childrenRes.error) throw new Error(childrenRes.error.message);
      if (childrenRes.data?.length) {
        setChildren(childrenRes.data);
        const selectedChild = childId ? childrenRes.data.find(c => c.id === childId) : childrenRes.data[0];
        if (selectedChild) {
          setChild(selectedChild);
          const [reportsRes, examLogsRes] = await Promise.all([
            supabase.from('behavioral_reports').select('*').eq('student_id', selectedChild.profile_id).order('created_at', { ascending: false }).limit(20),
            fetch('/api/manage-tests', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'list_exam_logs', student_ids: [selectedChild.profile_id] })
            }).then(r => r.json()),
          ]);
          if (reportsRes.data) setReports(reportsRes.data);
          if (examLogsRes.logs) setExamActivityLogs(examLogsRes.logs);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  function getIcon(rating: number) {
    if (rating >= 4) return <CheckCircle size={18} className="text-green-600 dark:text-green-400 dark:text-green-400" />;
    if (rating >= 3) return <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 dark:text-yellow-400" />;
    return <Star size={18} className="text-red-600 dark:text-red-400 dark:text-red-400" />;
  }

  function getBg(rating: number) {
    if (rating >= 4) return 'bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 border-green-200 dark:border-green-900/40 dark:border-green-900/40';
    if (rating >= 3) return 'bg-yellow-50 dark:bg-yellow-900/20 dark:bg-yellow-900/20 border-yellow-200';
    return 'bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 dark:border-red-900/40';
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>;

  return (
    <DashboardLayout title="Behavior Reports" subtitle={`${child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Behavior Reports</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">View behavior and exam security events</p>
          </div>
          {children.length > 1 && (
            <select
              value={child?.id || ''}
              onChange={(e) => {
                const newChild = children.find(c => c.id === e.target.value);
                if (newChild) {
                  setChild(newChild);
                  router.replace(`/parent/behavior?child=${newChild.id}`);
                }
              }}
              className="input max-w-[200px]"
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.profile?.first_name} {c.profile?.last_name}</option>
              ))}
            </select>
          )}
        </div>

      {!child ? (
        <div className="bg-white rounded-xl p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No children linked to your account</p></div>
      ) : (
        <>
          {examActivityLogs.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><ShieldAlert size={18} className="text-red-500 dark:text-red-400 dark:text-red-400" />Exam Security Events</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-4">Tab switches, copy/paste attempts, and other security events recorded during online exams.</p>
              <div className="space-y-2">
                {examActivityLogs.map(log => {
                  const eventIcons: Record<string, JSX.Element> = {
                    tab_switch: <Clock size={16} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" />,
                    fullscreen_exit: <Monitor size={16} className="text-orange-600 dark:text-orange-400 dark:text-orange-400" />,
                    copy_attempt: <Copy size={16} className="text-red-600 dark:text-red-400 dark:text-red-400" />,
                    paste_attempt: <Copy size={16} className="text-red-600 dark:text-red-400 dark:text-red-400" />,
                    screenshot: <Monitor size={16} className="text-red-600 dark:text-red-400 dark:text-red-400" />,
                    right_click: <Ban size={16} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" />,
                  };
                  const severityColors: Record<string, string> = {
                    critical: 'bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border-red-300',
                    high: 'bg-orange-50 dark:bg-orange-900/20 dark:bg-orange-900/20 border-orange-300',
                    medium: 'bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 border-amber-300',
                    low: 'bg-yellow-50 dark:bg-yellow-900/20 dark:bg-yellow-900/20 border-yellow-300',
                  };
                  return (
                    <div key={log.id} className={`flex items-center justify-between p-3 rounded-lg border ${severityColors[log.severity] || 'bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:border-slate-700'}`}>
                      <div className="flex items-center gap-3">
                        {eventIcons[log.event_type] || <ShieldAlert size={16} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />}
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200 capitalize">{log.event_type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                        log.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400' :
                        log.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        log.severity === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{log.severity}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2"><Award size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />Behavior Reports</h2>
            {reports.length === 0 ? (
              <div className="text-center py-8"><CheckCircle className="mx-auto text-green-400 mb-3" size={40} /><p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No behavior reports recorded</p><p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">Great! No behavioral concerns</p></div>
            ) : (
              <div className="space-y-4">
                {reports.map(report => (
                  <div key={report.id} className={`p-4 rounded-xl border ${getBg(report.rating)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">{getIcon(report.rating)}<div><p className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">{report.behavior || `Rating: ${report.rating}/5`}</p><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Week {report.week_start?.slice(0, 10)} to {report.week_end?.slice(0, 10)} &bull; {new Date(report.created_at).toLocaleDateString()}</p></div></div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/80 capitalize">{report.rating}/5</span>
                    </div>
                    {report.teacher_notes && <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 mt-2">{report.teacher_notes}</p>}
                    <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                      <span>Punctuality: {report.punctuality}/5</span>
                      <span>Participation: {report.class_participation}/5</span>
                      <span>Homework: {report.homework_completion}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ParentBehaviorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>}>
      <BehaviorContent />
    </Suspense>
  );
}
