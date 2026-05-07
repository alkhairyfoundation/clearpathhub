'use client';

import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Award, AlertTriangle, CheckCircle, Star, Heart } from 'lucide-react';

function BehaviorContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('child');
  const [child, setChild] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile, childId]);

  async function fetchData() {
    setLoading(true);
    const childrenRes = await supabase.from('students').select('*, profile:profiles(first_name, last_name), class:classes(name)').eq('parent_id', profile?.id);
    if (childrenRes.data?.length) {
      const selectedChild = childId ? childrenRes.data.find(c => c.id === childId) : childrenRes.data[0];
      if (selectedChild) {
        setChild(selectedChild);
        const reportsRes = await supabase.from('behavioral_reports').select('*, teacher:profiles(first_name, last_name)').eq('student_id', selectedChild.profile_id).order('created_at', { ascending: false }).limit(20);
        if (reportsRes.data) setReports(reportsRes.data);
      }
    }
    setLoading(false);
  }

  function getIcon(type: string) {
    switch (type) {
      case 'positive': return <CheckCircle size={18} className="text-green-600" />;
      case 'warning': return <AlertTriangle size={18} className="text-yellow-600" />;
      case 'concern': return <Star size={18} className="text-red-600" />;
      default: return <Heart size={18} className="text-blue-600" />;
    }
  }

  function getBg(type: string) {
    switch (type) {
      case 'positive': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'concern': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>;

  return (
    <DashboardLayout title="Behavior Reports" subtitle={`${child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800">Behavior Reports</h1>
            <p className="text-slate-500">{child ? `${child.profile?.first_name} ${child.profile?.last_name}` : ''}</p>
          </div>
        </div>

      {!child ? (
        <div className="bg-white rounded-xl p-12 text-center"><Award className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center"><CheckCircle className="mx-auto text-green-400 mb-4" size={48} /><p className="text-slate-500">No behavior reports recorded</p><p className="text-sm text-slate-400 mt-1">Great! No behavioral concerns</p></div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className={`p-4 rounded-xl border ${getBg(report.type || 'general')}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">{getIcon(report.type || 'general')}<div><p className="font-semibold text-slate-800">{report.title || 'Behavior Report'}</p><p className="text-xs text-slate-500">By {report.teacher?.first_name} {report.teacher?.last_name} &bull; {new Date(report.created_at).toLocaleDateString()}</p></div></div>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/80 capitalize">{report.type || 'general'}</span>
              </div>
              {report.description && <p className="text-sm text-slate-600 mt-2">{report.description}</p>}
            </div>
          ))}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ParentBehaviorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>}>
      <BehaviorContent />
    </Suspense>
  );
}
