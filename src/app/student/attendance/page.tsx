'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { UserCheck, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export default function StudentAttendancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, rate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('attendance').select('*').eq('student_id', profile?.id).order('date', { ascending: false }).limit(30);
    if (data) {
      setAttendance(data);
      const present = data.filter(a => a.status === 'present').length;
      const total = data.length;
      setStats({ present, absent: data.filter(a => a.status === 'absent').length, late: data.filter(a => a.status === 'late').length, excused: data.filter(a => a.status === 'excused').length, rate: total > 0 ? Math.round((present / total) * 100) : 0 });
    }
    setLoading(false);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'present': return <CheckCircle className="text-green-500" size={18} />;
      case 'absent': return <XCircle className="text-red-500" size={18} />;
      case 'late': return <Clock className="text-yellow-500" size={18} />;
      case 'excused': return <AlertCircle className="text-blue-500" size={18} />;
      default: return null;
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">My Attendance</h1><p className="text-slate-500">View your attendance record</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Attendance Rate</span><UserCheck className="text-blue-600" size={18} /></div><p className="text-2xl font-bold text-slate-800">{stats.rate}%</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Present</span><CheckCircle className="text-green-600" size={18} /></div><p className="text-2xl font-bold text-green-600">{stats.present}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Absent</span><XCircle className="text-red-600" size={18} /></div><p className="text-2xl font-bold text-red-600">{stats.absent}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Late</span><Clock className="text-yellow-600" size={18} /></div><p className="text-2xl font-bold text-yellow-600">{stats.late}</p></div>
        <div className="bg-white rounded-xl shadow-md p-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Excused</span><AlertCircle className="text-blue-600" size={18} /></div><p className="text-2xl font-bold text-blue-600">{stats.excused}</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : attendance.length === 0 ? <div className="text-center py-12 text-slate-500"><UserCheck size={48} className="mx-auto mb-4 opacity-50" /><p>No attendance records</p></div> : (
          <div className="space-y-2">
            {attendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div><p className="font-medium text-slate-800">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p><p className="text-xs text-slate-500">{record.scan_method === 'qr_scan' ? 'Scanned' : 'Manual'}</p></div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${record.status === 'present' ? 'bg-green-100 text-green-700' : record.status === 'absent' ? 'bg-red-100 text-red-700' : record.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{record.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}