'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Search, X, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import type { Attendance } from '@/types';

export default function TeacherAttendancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchClasses();
  }, [profile]);

  useEffect(() => { if (selectedClass) fetchAttendance(); }, [date, selectedClass]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('level');
    if (data) setClasses(data);
  }

  async function fetchAttendance() {
    const { data } = await supabase.from('attendance').select('*, student:profiles(*), class:classes(*)').eq('date', date).eq('class_id', selectedClass).order('created_at', { ascending: false });
    if (data) setAttendance(data);
  }

  async function markAttendance(studentId: string, status: string) {
    await supabase.from('attendance').upsert({ student_id: studentId, class_id: selectedClass, date, status, marked_by: profile?.id, marked_at: new Date().toISOString(), scan_method: 'manual' });
    fetchAttendance();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Take Attendance</h1><p className="text-slate-500">Mark student attendance</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6"><label className="text-sm text-slate-500 mb-2 block">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div>
        <div className="bg-white rounded-xl shadow-md p-6"><label className="text-sm text-slate-500 mb-2 block">Class</label><select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input"><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="bg-white rounded-xl shadow-md p-6"><label className="text-sm text-slate-500 mb-2 block">Present</label><div className="text-2xl font-bold text-green-600">{attendance.filter(a => a.status === 'present').length}</div></div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">{selectedClass ? classes.find(c => c.id === selectedClass)?.name : 'Select a class'} - {new Date(date).toLocaleDateString()}</h2>
        <div className="space-y-3">
          {attendance.length === 0 ? <div className="text-center py-12 text-slate-500"><UserCheck size={48} className="mx-auto mb-4 opacity-50" /><p>No students found</p></div> : 
            attendance.map(record => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-blue-600 font-medium">{record.student?.first_name?.[0]}{record.student?.last_name?.[0]}</span></div>
                  <div><p className="font-medium text-slate-800">{record.student?.first_name} {record.student?.last_name}</p></div>
                </div>
                <div className="flex gap-2">{(['present', 'late', 'absent'] as const).map(status => (<button key={status} onClick={() => markAttendance(record.student_id, status)} className={`px-3 py-1 rounded-lg text-sm font-medium ${record.status === status ? (status === 'present' ? 'bg-green-600 text-white' : status === 'absent' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white') : 'bg-gray-200 text-gray-600'}`}>{status}</button>))}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}