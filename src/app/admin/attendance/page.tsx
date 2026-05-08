'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Calendar, Search, UserCheck, CheckCircle, XCircle, Clock, Shield, Loader2, Download, Users } from 'lucide-react';

export default function AdminAttendancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchClasses();
  }, [profile]);

  useEffect(() => { fetchAttendance(); }, [date, selectedClass]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('level');
    if (data) setClasses(data);
  }

  async function fetchAttendance() {
    setLoading(true);
    let query = supabase.from('attendance').select('*, student:profiles!student_id(first_name, last_name, email), class:classes!class_id(name)').eq('date', date);
    if (selectedClass !== 'all') query = query.eq('class_id', selectedClass);
    const { data, error } = await query.order('student.first_name');
    if (error) setError(error.message);
    if (data) {
      setAttendance(data);
      setStats({
        present: data.filter(a => a.status === 'present').length,
        absent: data.filter(a => a.status === 'absent').length,
        late: data.filter(a => a.status === 'late').length,
        excused: data.filter(a => a.status === 'excused').length,
        total: data.length,
      });
    }
    setLoading(false);
  }

  async function markAttendance(studentId: string, status: string) {
    setSaving(studentId);
    setError('');
    try {
      const { error } = await supabase.from('attendance').upsert({
        student_id: studentId, class_id: selectedClass !== 'all' ? selectedClass : null, date, status,
        marked_by: profile?.id, marked_at: new Date().toISOString(), scan_method: 'manual',
      });
      if (error) throw new Error(error.message);
      fetchAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setSaving(null);
    }
  }

  const presentPct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
  const statusColors: Record<string, string> = {
    present: 'bg-green-600 text-white', absent: 'bg-red-600 text-white', late: 'bg-amber-500 text-white', excused: 'bg-purple-600 text-white'
  };
  const statusBg: Record<string, string> = {
    present: 'bg-green-50 border-green-200', absent: 'bg-red-50 border-red-200', late: 'bg-amber-50 border-amber-200', excused: 'bg-purple-50 border-purple-200'
  };

  return (
    <DashboardLayout title="Attendance" subtitle="Track and manage student attendance">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 mt-1">Track and manage student attendance</p>
        </div>
        <button className="btn-outline flex items-center gap-2" onClick={() => setError('Export feature coming soon')}><Download size={18} /> Export</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card"><label className="label">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div>
        <div className="card"><label className="label">Class</label><select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input"><option value="all">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500">Present</span><CheckCircle size={16} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{stats.present}</p><p className="text-xs text-slate-500">{presentPct}%</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500">Absent</span><XCircle size={16} className="text-red-600" /></div><p className="text-2xl font-bold text-red-600">{stats.absent}</p></div>
        <div className="card col-span-2 lg:col-span-1"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500">Late / Excused</span><Clock size={16} className="text-amber-600" /></div><p className="text-2xl font-bold text-amber-600">{stats.late}</p><p className="text-xs text-slate-500">{stats.excused} excused</p></div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Users size={18} className="text-slate-400" />
          {selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClass)?.name} — {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No attendance records for this date</p>
            <p className="text-sm text-slate-400 mt-1">Records are created when teachers mark attendance or students scan ID cards</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attendance.map((record) => (
              <div key={record.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${statusBg[record.status] || 'bg-slate-50 border-slate-200'} hover:shadow-sm transition-shadow`}>
                <div className="flex items-center gap-3 mb-3 sm:mb-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${record.status === 'present' ? 'bg-green-100 text-green-700' : record.status === 'absent' ? 'bg-red-100 text-red-700' : record.status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                    {record.student?.first_name?.[0]}{record.student?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{record.student?.first_name} {record.student?.last_name}</p>
                    <p className="text-xs text-slate-500">{record.class?.name}{record.marked_at ? ` • Marked ${new Date(record.marked_at).toLocaleTimeString()}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(['present', 'late', 'absent', 'excused'] as const).map((status) => (
                    <button key={status} onClick={() => markAttendance(record.student_id, status)} disabled={saving === record.student_id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize disabled:opacity-50 ${record.status === status ? statusColors[status] : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
