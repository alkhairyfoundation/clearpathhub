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
    const { data } = await supabase.from('classes').select('id, name').order('level', { ascending: true });
    if (data) setClasses(data);
  }

  async function fetchAttendance() {
    setLoading(true);
    let query = supabase.from('attendance').select('*, student:profiles!student_id(first_name, last_name, email), class:classes!class_id(name)').eq('date', date);
    if (selectedClass !== 'all') query = query.eq('class_id', selectedClass);
    const { data, error } = await query;
    if (error) setError(error.message);
    if (data) {
      data.sort((a, b) => {
        const na = `${a.student?.first_name || ''} ${a.student?.last_name || ''}`;
        const nb = `${b.student?.first_name || ''} ${b.student?.last_name || ''}`;
        return na.localeCompare(nb);
      });
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
      }, { onConflict: 'student_id,date' });
      if (error) throw new Error(error.message);
      fetchAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setSaving(null);
    }
  }

  function exportCSV() {
    if (attendance.length === 0) { setError('No attendance data to export'); return; }
    const headers = 'Student Name,Admission Number,Class,Date,Status,Marked By';
    const rows = attendance.map(a => {
      const name = a.student ? `${a.student.first_name} ${a.student.last_name}` : 'N/A';
      return `"${name}","${a.student_id?.slice(0, 8) || 'N/A'}","${a.class?.name || 'N/A'}","${a.date}","${a.status}","${a.marked_by?.slice(0, 8) || 'N/A'}"`;
    }).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const presentPct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
  const statusColors: Record<string, string> = {
    present: 'bg-green-600 text-white', absent: 'bg-red-600 text-white', late: 'bg-amber-500 text-white', excused: 'bg-purple-600 text-white'
  };
  const statusBg: Record<string, string> = {
    present: 'bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 border-green-200 dark:border-green-900/40 dark:border-green-900/40', absent: 'bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 dark:border-red-900/40', late: 'bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40', excused: 'bg-purple-50 dark:bg-purple-900/20 dark:bg-purple-900/20 border-purple-200 dark:border-purple-900/40 dark:border-purple-900/40'
  };

  return (
    <DashboardLayout title="Attendance" subtitle="Track and manage student attendance">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Track and manage student attendance</p>
        </div>
        <button className="btn-outline flex items-center gap-2" onClick={exportCSV}><Download size={18} /> Export CSV</button>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card"><label className="label">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div>
        <div className="card"><label className="label">Class</label><select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input"><option value="all">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Present</span><CheckCircle size={16} className="text-green-600 dark:text-green-400 dark:text-green-400" /></div><p className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">{stats.present}</p><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{presentPct}%</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Absent</span><XCircle size={16} className="text-red-600 dark:text-red-400 dark:text-red-400" /></div><p className="text-2xl font-bold text-red-600 dark:text-red-400 dark:text-red-400">{stats.absent}</p></div>
        <div className="card col-span-2 lg:col-span-1"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">Late / Excused</span><Clock size={16} className="text-amber-600 dark:text-amber-400 dark:text-amber-400" /></div><p className="text-2xl font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{stats.late}</p><p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{stats.excused} excused</p></div>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white mb-4 flex items-center gap-2">
          <Users size={18} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />
          {selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClass)?.name} — {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-16">
            <UserCheck className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No attendance records for this date</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">Records are created when teachers mark attendance or students scan ID cards</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attendance.map((record) => (
              <div key={record.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border ${statusBg[record.status] || 'bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:border-slate-700'} hover:shadow-sm transition-shadow`}>
                <div className="flex items-center gap-3 mb-3 sm:mb-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${record.status === 'present' ? 'bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30 text-green-700 dark:text-green-300 dark:text-green-300' : record.status === 'absent' ? 'bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30 text-red-700 dark:text-red-400 dark:text-red-400' : record.status === 'late' ? 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 dark:text-amber-300' : 'bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30 text-purple-700'}`}>
                    {record.student?.first_name?.[0]}{record.student?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white dark:text-white">{record.student?.first_name} {record.student?.last_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{record.class?.name}{record.marked_at ? ` • Marked ${new Date(record.marked_at).toLocaleTimeString()}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(['present', 'late', 'absent', 'excused'] as const).map((status) => (
                    <button key={status} onClick={() => markAttendance(record.student_id, status)} disabled={saving === record.student_id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize disabled:opacity-50 ${record.status === status ? statusColors[status] : 'bg-white border border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700'}`}>
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
