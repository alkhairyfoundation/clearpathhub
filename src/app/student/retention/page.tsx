'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Brain, CheckCircle, XCircle, Clock, AlertTriangle,
  Loader2, RefreshCw, TrendingUp, BookOpen, Award
} from 'lucide-react';
import { getMasteryColor, getRetentionColor, getScoreColorClasses } from '@/lib/colors';

export default function RetentionPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | 'passed' | 'failed'>('all');

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchChecks();
  }, [profile]);

  async function fetchChecks() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('retention_checks')
        .select('*, subject:subjects!subject_id(name, code)')
        .eq('student_id', profile?.id)
        .order('check_date', { ascending: false });

      if (data) setChecks(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  const filtered = checks.filter(c => {
    if (filter === 'due') return c.passed == null && new Date(c.check_date) <= new Date();
    if (filter === 'passed') return c.passed === true;
    if (filter === 'failed') return c.passed === false;
    return true;
  });

  const stats = {
    total: checks.length,
    passed: checks.filter(c => c.passed === true).length,
    failed: checks.filter(c => c.passed === false).length,
    due: checks.filter(c => c.passed == null && new Date(c.check_date) <= new Date()).length,
    upcoming: checks.filter(c => c.passed == null && new Date(c.check_date) > new Date()).length,
  };

  if (loading) {
    return (
      <DashboardLayout title="Knowledge Retention" subtitle="Long-term learning verification">
        <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Knowledge Retention" subtitle="Long-term learning verification">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Knowledge Retention</h1>
            <p className="text-slate-500 mt-1">Rechecks at 3, 7, 14, and 30 days after mastery</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="card"><p className="text-xs text-slate-500">Total Checks</p><p className="text-2xl font-bold text-slate-900">{stats.total}</p></div>
          <div className="card"><p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle size={12} /> Passed</p><p className="text-2xl font-bold text-emerald-600">{stats.passed}</p></div>
          <div className="card"><p className="text-xs text-red-600 flex items-center gap-1"><XCircle size={12} /> Failed</p><p className="text-2xl font-bold text-red-600">{stats.failed}</p></div>
          <div className="card bg-amber-50 border-amber-200"><p className="text-xs text-amber-700 flex items-center gap-1"><Clock size={12} /> Due Now</p><p className="text-2xl font-bold text-amber-700">{stats.due}</p></div>
          <div className="card"><p className="text-xs text-slate-500 flex items-center gap-1"><Brain size={12} /> Upcoming</p><p className="text-2xl font-bold text-slate-600">{stats.upcoming}</p></div>
        </div>

        {stats.due > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={24} className="text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">{stats.due} retention check{stats.due > 1 ? 's' : ''} due</p>
              <p className="text-sm text-amber-700">Take a practice session to verify long-term knowledge retention</p>
            </div>
            <Link href="/student/practice" className="btn-primary ml-auto text-sm">Practice Now</Link>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'due', 'passed', 'failed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
                filter === f ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {f}
              {f === 'due' && stats.due > 0 && <span className="ml-1">({stats.due})</span>}
            </button>
          ))}
        </div>

        {/* Retention timeline */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <Brain className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="font-medium text-slate-500">No retention checks</p>
            <p className="text-sm text-slate-400 mt-1">Complete mastery verification to schedule retention checks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(check => {
              const daysSinceMastery = Math.floor(
                (new Date(check.check_date).getTime() - new Date(check.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              const isDue = check.passed == null && new Date(check.check_date) <= new Date();
              const color = getRetentionColor(daysSinceMastery, check.retest_score);

              return (
                <div key={check.id} className={`card border-l-4 ${check.passed === true ? 'border-l-emerald-500' : check.passed === false ? 'border-l-red-500' : isDue ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={16} className="text-slate-400" />
                        <span className="font-semibold text-slate-900">{check.topic}</span>
                        <span className="text-xs text-slate-400">{check.subject?.name || check.subject_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>Check: Day {check.check_days}</span>
                        <span>Scheduled: {new Date(check.check_date).toLocaleDateString()}</span>
                        {check.retest_score != null && <span>Score: {Math.round(check.retest_score)}%</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          check.passed === true ? 'bg-emerald-100 text-emerald-700' :
                          check.passed === false ? 'bg-red-100 text-red-700' :
                          isDue ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {check.passed === true ? 'Passed' :
                           check.passed === false ? 'Needs Reinforcement' :
                           isDue ? 'Due Now' : 'Upcoming'}
                        </span>
                        {check.entered_reinforcement && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            In Reinforcement
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${color.bgColor} ${color.textColor}`}>
                          {check.check_days}d
                        </div>
                      </div>
                      {check.mastery_score_at_verification != null && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Initial: {Math.round(check.mastery_score_at_verification)}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar for retention */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${check.passed === true ? 'bg-emerald-500' : check.passed === false ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(check.check_days / 30 * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{check.check_days}/30 days</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Retention explanation */}
        <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Brain size={18} className="text-primary-600" />
            How Retention Works
          </h3>
          <div className="grid grid-cols-4 gap-3 text-sm">
            {[
              { days: 3, label: 'Short-term', desc: 'Quick check after initial mastery' },
              { days: 7, label: 'Medium-term', desc: 'Verify week-long retention' },
              { days: 14, label: 'Extended', desc: 'Two-week knowledge check' },
              { days: 30, label: 'Long-term', desc: 'Month-long memory verification' },
            ].map(item => (
              <div key={item.days} className="text-center p-3 bg-white rounded-lg">
                <div className="w-8 h-8 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-1">
                  <span className="text-sm font-bold text-primary-700">{item.days}d</span>
                </div>
                <p className="font-medium text-slate-900 text-xs">{item.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-lg text-xs text-slate-600">
            <p className="font-medium text-slate-700">If you score below 80% on a retention check:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li>The topic becomes active for reinforcement</li>
              <li>It will appear in your priority practice topics</li>
              <li>You must re-master before the next retention check</li>
              <li>Your teacher is notified if you need help</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
