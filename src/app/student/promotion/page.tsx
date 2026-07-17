'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle,
  Loader2, TrendingUp, FileText, Star, Award,
  BookOpen, Users, Brain
} from 'lucide-react';
import { getPromotionColor, getMasteryColor } from '@/lib/colors';

const DIMENSIONS = [
  { key: 'academic_mastery_score', label: 'Academic Mastery', icon: <BookOpen size={16} />, max: 100 },
  { key: 'islamic_development_score', label: 'Islamic Development', icon: <Star size={16} />, max: 100 },
  { key: 'skills_development_score', label: 'Skills Development', icon: <Brain size={16} />, max: 100 },
  { key: 'behavior_score', label: 'Behavior', icon: <Users size={16} />, max: 100 },
  { key: 'attendance_score', label: 'Attendance', icon: <Users size={16} />, max: 100 },
  { key: 'consistency_score', label: 'Consistency', icon: <TrendingUp size={16} />, max: 100 },
  { key: 'leadership_score', label: 'Leadership', icon: <Award size={16} />, max: 100 },
  { key: 'retention_score', label: 'Retention', icon: <Brain size={16} />, max: 100 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  ready: { label: 'Ready for Promotion', color: '#059669', bg: '#ecfdf5', icon: CheckCircle },
  conditional: { label: 'Conditional Promotion', color: '#ca8a04', bg: '#fefce8', icon: AlertTriangle },
  needs_intervention: { label: 'Needs Intervention', color: '#ea580c', bg: '#fff7ed', icon: AlertTriangle },
  not_ready: { label: 'Not Ready', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
};

export default function PromotionPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/promotion?student_id=${profile?.id}`);
      const d = await res.json();
      setData(d.promotion);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <DashboardLayout title="Promotion" subtitle="Promotion readiness assessment">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Promotion" subtitle="Promotion readiness assessment">
        <div className="max-w-4xl mx-auto text-center py-16">
          <FileText size={48} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">No promotion assessment available for the current term.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">Assessments are generated at the end of each term.</p>
        </div>
      </DashboardLayout>
    );
  }

  const StatusIcon = STATUS_CONFIG[data.promotion_status]?.icon || AlertTriangle;
  const statusInfo = STATUS_CONFIG[data.promotion_status] || STATUS_CONFIG.needs_intervention;

  return (
    <DashboardLayout title="Promotion" subtitle="Promotion readiness assessment">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">Promotion Readiness</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{data.academic_year} • {data.term} • {data.current_class_name || 'Current Class'}</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="card" style={{ backgroundColor: statusInfo.bg, borderColor: statusInfo.color }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: statusInfo.color + '20' }}>
                <StatusIcon size={24} style={{ color: statusInfo.color }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">{statusInfo.label}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">
                  Overall Score: <span className="font-bold" style={{ color: getMasteryColor(data.overall_score).hex }}>
                    {Math.round(data.overall_score)}%
                  </span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Promotion To</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{data.next_class_name || data.recommended_next_class || 'Next Class'}</p>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="card">
          <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-4">Score Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DIMENSIONS.map(dim => {
              const score = data[dim.key] || 0;
              return (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">
                      {dim.icon} {dim.label}
                    </div>
                    <span className="text-xs font-bold" style={{ color: getMasteryColor(score).hex }}>{Math.round(score)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${score}%`, backgroundColor: getMasteryColor(score).hex }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall Progress Ring */}
        <div className="card">
          <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-4 text-center">Overall Readiness</h3>
          <div className="flex justify-center">
            <div className="relative w-36 h-36">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={getMasteryColor(data.overall_score).hex}
                  strokeWidth="10" strokeDasharray={`${(data.overall_score / 100) * 327} 327`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold"                   style={{ color: getMasteryColor(data.overall_score).hex }}>
                  {Math.round(data.overall_score)}%
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500">Overall</span>
              </div>
            </div>
          </div>
        </div>

        {/* Supporting Evidence */}
        {data.supporting_evidence && Object.keys(data.supporting_evidence).length > 0 && (
          <div className="card">
            <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-3 flex items-center gap-2">
              <FileText size={16} className="text-primary-500" />
              Supporting Evidence
            </h3>
            <div className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400 space-y-1">
              {Object.entries(data.supporting_evidence).map(([key, val]) => (
                <div key={key} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 last:border-0">
                  <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conditional Requirements */}
        {data.conditional_requirements && data.conditional_requirements.length > 0 && (
          <div className="card bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40">
            <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-2 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" />
              Requirements to Fulfill
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400 space-y-1">
              {data.conditional_requirements.map((req: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <AlertTriangle size={12} className="text-amber-500 dark:text-amber-400 dark:text-amber-400" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
