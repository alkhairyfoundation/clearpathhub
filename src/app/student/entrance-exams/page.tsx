'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Clock, Check, X, AlertCircle, ChevronRight, GraduationCap, Award, BookOpen } from 'lucide-react';

export default function StudentEntranceExamsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchApplications();
  }, [profile]);

  async function fetchApplications() {
    setLoading(true);
    try {
      if (!profile?.email) return;
      const { data } = await supabase
        .from('entrance_applications')
        .select('*, exam:entrance_exams(*)')
        .eq('email', profile.email)
        .order('created_at', { ascending: false });
      if (data) setApplications(data);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending Review</span>;
      case 'assigned':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Exam Assigned</span>;
      case 'passed':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Passed</span>;
      case 'failed':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Failed</span>;
      case 'admitted':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-700">Admitted</span>;
      case 'rejected':
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Rejected</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  }

  return (
    <DashboardLayout title="Entrance Exams" subtitle="View and manage your entrance exam applications">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="card text-center py-16">
            <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Entrance Exam Applications</h3>
            <p className="text-slate-500 mb-6">You haven't registered for any entrance exams yet.</p>
            <p className="text-sm text-slate-400 mb-4">To apply for admission, please contact the school administration or visit the school in person.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {app.exam?.title || 'Entrance Exam'}
                      </h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <GraduationCap size={14} />
                        Applied Class: {app.applied_class}
                      </span>
                      {app.exam?.academic_year && (
                        <span>Academic Year: {app.exam.academic_year}</span>
                      )}
                    </div>
                  </div>
                  
                  {app.status === 'assigned' && (
                    <Link 
                      href={`/student/entrance-exams/take/${app.id}`}
                      className="btn-primary flex items-center gap-2"
                    >
                      Take Exam <ChevronRight size={16} />
                    </Link>
                  )}
                  
                  {app.status === 'admitted' && app.admitted_class && (
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Admitted to</p>
                      <p className="text-lg font-bold text-primary-600">{app.admitted_class}</p>
                    </div>
                  )}
                </div>

                {app.exam_score !== null && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Exam Score</p>
                        <p className={`text-2xl font-bold ${
                          app.exam_score >= (app.exam?.passing_score || 50) 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {app.exam_score}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Passing Score</p>
                        <p className="text-lg font-semibold text-slate-700">{app.exam?.passing_score || 50}%</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <Link href={`/student/entrance-exams/report/${app.id}`} className="btn-outline text-sm flex items-center gap-2 w-full justify-center">
                        <FileText size={14} /> View Full Analysis Report
                      </Link>
                    </div>
                  </div>
                )}

                {app.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    <p className="font-medium mb-1">Application Rejected</p>
                    <p>Your application was not successful. You may reapply during the next admission period.</p>
                  </div>
                )}

                {app.status === 'failed' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                    <p className="font-medium mb-1">Exam Not Passed</p>
                    <p>You did not meet the passing score of {app.exam?.passing_score || 50}%. You may reapply during the next admission period.</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-slate-400 pt-2 border-t">
                  <span>Applied: {new Date(app.created_at).toLocaleDateString()}</span>
                  {app.reviewed_at && (
                    <span>Reviewed: {new Date(app.reviewed_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {applications.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-slate-400" />
              Exam Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-700 mb-1">Pending Review</p>
                <p className="text-slate-500">Your application is being reviewed by the administration.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-700 mb-1">Exam Assigned</p>
                <p className="text-slate-500">An entrance exam has been assigned to you. Click "Take Exam" to begin.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-700 mb-1">Admitted</p>
                <p className="text-slate-500">Congratulations! You have been admitted to your assigned class.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-700 mb-1">Rejected/Failed</p>
                <p className="text-slate-500">Your application was not successful. Please reapply during the next admission period.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}