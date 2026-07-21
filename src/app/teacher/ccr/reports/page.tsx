'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Users, Search, Loader2, BarChart3, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function TeacherCcrReports() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    try {
      const { data: tcData } = await supabase
        .from('teacher_classes')
        .select('class_id')
        .eq('teacher_id', profile?.id);
      const classIds = Array.from(new Set(tcData?.map(tc => tc.class_id).filter(Boolean) || []));
      const { data: kids } = await supabase
        .from('students')
        .select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)')
        .in('class_id', classIds)
        .order('admission_number');
      if (kids) setStudents(kids);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = students.filter(s =>
    !searchQuery || `${s.profile?.first_name} ${s.profile?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout title="CCR Reports" subtitle="Student reports">
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CCR Reports" subtitle="View student assessment reports"><div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-500" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search students..." className="input pl-10 w-full max-w-md" />
      </div>
      <div className="space-y-3">
        {filtered.map(s => (
          <Link
            key={s.id}
            href={`/parent/ccr/report?child=${s.profile_id}`}
            className="block bg-white rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 p-4 hover:border-primary-300 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600 dark:text-primary-400 dark:text-primary-400" />
              </div>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">{s.profile?.first_name} {s.profile?.last_name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{s.class?.name} | {s.admission_number}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  );
}

