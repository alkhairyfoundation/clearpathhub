'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, UserCheck, Calendar, Search, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminStaffAttendanceDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  useEffect(() => { fetchAttendance(); }, [date]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role')
      .in('role', ['teacher', 'accountant', 'admin'])
      .order('first_name');
    if (data) setAllStaff(data);
    setLoading(false);
  }

  async function fetchAttendance() {
    const { data } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('date', date)
      .order('marked_at', { ascending: false });
    if (data) setStaffAttendance(data);
  }

  async function markAttendance(staffId: string, status: 'present' | 'absent' | 'late') {
    setUpdating(staffId);
    const existing = staffAttendance.find(a => a.staff_id === staffId);
    if (existing) {
      await supabase.from('staff_attendance').update({
        status, marked_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('staff_attendance').insert({
        staff_id: staffId, date, status,
        marked_at: new Date().toISOString(),
      });
    }
    await fetchAttendance();
    setUpdating(null);
  }

  const attendanceMap = new Map(staffAttendance.map(a => [a.staff_id, a]));

  const mergedStaff = allStaff.map(s => {
    const record = attendanceMap.get(s.id);
    return { ...s, record, status: record?.status || null, marked_at: record?.marked_at || null };
  });

  const filteredStaff = mergedStaff.filter(s => {
    if (roleFilter && s.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const presentCount = staffAttendance.filter(a => a.status === 'present').length;
  const absentCount = staffAttendance.filter(a => a.status === 'absent').length;
  const lateCount = staffAttendance.filter(a => a.status === 'late').length;
  const totalStaff = allStaff.length;
  const markedCount = presentCount + absentCount + lateCount;
  const pendingCount = totalStaff - markedCount;

  return (
    <DashboardLayout title="Staff Attendance Records" subtitle="View and manage staff attendance by date">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Attendance Records</h1>
            <p className="text-slate-500 mt-1">View and manage attendance for all staff</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-slate-400" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="card text-center"><p className="text-2xl font-bold text-slate-900">{totalStaff}</p><p className="text-xs text-slate-500">Total Staff</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-green-600">{presentCount}</p><p className="text-xs text-slate-500">Present</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-amber-600">{lateCount}</p><p className="text-xs text-slate-500">Late</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-red-600">{absentCount}</p><p className="text-xs text-slate-500">Absent</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-slate-400">{pendingCount}</p><p className="text-xs text-slate-500">Not Marked</p></div>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9 text-sm" />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input text-sm sm:w-36">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredStaff.length === 0 ? (
                <div className="text-center py-8 text-slate-500"><UserCheck size={32} className="mx-auto mb-2 opacity-50" /><p>No staff found</p></div>
              ) : filteredStaff.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 bg-gradient-to-br from-primary-600 to-primary-700">
                      {s.first_name?.[0]}{s.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{s.first_name} {s.last_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 capitalize">{s.role}</span>
                        {s.status === 'present' && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} />Present</span>}
                        {s.status === 'late' && <span className="text-xs text-amber-600 flex items-center gap-1"><Clock size={12} />Late</span>}
                        {s.status === 'absent' && <span className="text-xs text-red-600 flex items-center gap-1"><XCircle size={12} />Absent</span>}
                        {s.record?.marked_at && <span className="text-xs text-slate-400">&bull; {new Date(s.marked_at).toLocaleTimeString()}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(['present', 'late', 'absent'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => markAttendance(s.id, st)}
                        disabled={updating === s.id}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all border ${
                          s.status === st
                            ? st === 'present' ? 'bg-green-100 text-green-700 border-green-300'
                              : st === 'late' ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-red-100 text-red-700 border-red-300'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                        } ${updating === s.id ? 'opacity-50' : ''}`}
                      >
                        {updating === s.id ? <Loader2 size={12} className="animate-spin" /> : st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
