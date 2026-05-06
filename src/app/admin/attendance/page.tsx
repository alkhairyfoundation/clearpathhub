'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Calendar, Search, UserCheck, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Attendance, Class, Profile } from '@/types';

export default function AdminAttendancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchClasses();
  }, [profile]);

  useEffect(() => {
    fetchAttendance();
  }, [date, selectedClass]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    if (data) setClasses(data);
  }

  async function fetchAttendance() {
    setLoading(true);
    
    let query = supabase
      .from('attendance')
      .select('*, student:profiles(*), class:classes(*)')
      .eq('date', date);

    if (selectedClass !== 'all') {
      query = query.eq('class_id', selectedClass);
    }

    const { data } = await query.order('created_at', { ascending: false });
    
    if (data) {
      setAttendance(data);
      setStats({
        present: data.filter((a: any) => a.status === 'present').length,
        absent: data.filter((a: any) => a.status === 'absent').length,
        late: data.filter((a: any) => a.status === 'late').length,
        excused: data.filter((a: any) => a.status === 'excused').length,
        total: data.length,
      });
    }
    setLoading(false);
  }

  async function markAttendance(studentId: string, status: string) {
    await supabase.from('attendance').upsert({
      student_id: studentId,
      class_id: selectedClass !== 'all' ? selectedClass : null,
      date,
      status,
      marked_by: profile?.id,
      marked_at: new Date().toISOString(),
      scan_method: 'manual',
    });
    fetchAttendance();
  }

  const presentPercentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance</h1>
          <p className="text-slate-500">Track student attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Date</span>
            <Calendar size={18} className="text-blue-600" />
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Class</span>
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Present</span>
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
          <p className="text-xs text-slate-500">{presentPercentage}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Absent</span>
            <XCircle size={18} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Late</span>
            <Clock size={18} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">
          {selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClass)?.name} - {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <UserCheck size={48} className="mx-auto mb-4 opacity-50" />
            <p>No attendance records found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {record.student?.first_name?.[0]}{record.student?.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {record.student?.first_name} {record.student?.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {record.class?.name} • Marked {record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['present', 'late', 'absent', 'excused'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => markAttendance(record.student_id, status)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        record.status === status
                          ? status === 'present' ? 'bg-green-600 text-white' :
                            status === 'absent' ? 'bg-red-600 text-white' :
                            status === 'late' ? 'bg-yellow-500 text-white' :
                            'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}