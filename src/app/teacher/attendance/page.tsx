'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Search, X, CheckCircle, XCircle, Clock, UserCheck, Users, Loader2 } from 'lucide-react';

export default function TeacherAttendancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchClasses();
  }, [profile]);

  useEffect(() => { if (selectedClass) loadClassData(); }, [date, selectedClass]);

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('id, name').order('level');
    if (data) setClasses(data);
  }

  async function loadClassData() {
    if (!selectedClass) return;
    setLoading(true);
    const [studentsRes, attendanceRes] = await Promise.all([
      supabase.from('students').select('*, profile:profiles(first_name, last_name), class:classes(name)').eq('class_id', selectedClass).order('admission_number'),
      supabase.from('attendance').select('student_id, status').eq('date', date).eq('class_id', selectedClass),
    ]);
    if (studentsRes.data) {
      const studentMap: Record<string, string> = {};
      studentsRes.data.forEach(s => {
        const record = attendanceRes.data?.find(r => r.student_id === s.profile_id);
        studentMap[s.profile_id] = record?.status || '';
      });
      setStudents(studentsRes.data);
      setAttendanceRecords(studentMap);
    }
    setLoading(false);
  }

  async function markAttendance(studentId: string, status: string) {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
    await supabase.from('attendance').upsert({
      student_id: studentId,
      class_id: selectedClass,
      date,
      status,
      marked_by: profile?.id,
      marked_at: new Date().toISOString(),
      scan_method: 'manual'
    }, { onConflict: 'student_id,class_id,date' });
  }

  async function markAllPresent() {
    setSaving(true);
    for (const student of students) {
      await markAttendance(student.profile_id, 'present');
    }
    setSaving(false);
  }

  const presentCount = Object.values(attendanceRecords).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceRecords).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendanceRecords).filter(s => s === 'late').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Take Attendance</h1><p className="text-slate-500">Mark student attendance for your class</p></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="text-sm text-slate-500 mb-2 block">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="text-sm text-slate-500 mb-2 block">Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="text-sm text-slate-500 mb-2 block">Students</label>
          <div className="flex items-center gap-2"><Users size={20} className="text-blue-600" /><span className="text-2xl font-bold text-slate-800">{students.length}</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="text-sm text-slate-500 mb-2 block">Present</label>
          <div className="flex items-center gap-2"><CheckCircle size={20} className="text-green-600" /><span className="text-2xl font-bold text-green-600">{presentCount}</span></div>
        </div>
      </div>

      {selectedClass && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">
              {classes.find(c => c.id === selectedClass)?.name} - {new Date(date).toLocaleDateString()}
            </h2>
            {students.length > 0 && (
              <button onClick={markAllPresent} disabled={saving} className="btn-outline text-sm flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Mark All Present
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-500"><UserCheck size={48} className="mx-auto mb-4 opacity-50" /><p>No students in this class</p></div>
          ) : (
            <div className="space-y-3">
              {students.map(student => {
                const status = attendanceRecords[student.profile_id] || '';
                return (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">{student.profile?.first_name?.[0]}{student.profile?.last_name?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{student.profile?.first_name} {student.profile?.last_name}</p>
                        <p className="text-xs text-slate-500">{student.admission_number}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(['present', 'late', 'absent'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => markAttendance(student.profile_id, s)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            status === s
                              ? s === 'present' ? 'bg-green-600 text-white'
                              : s === 'absent' ? 'bg-red-600 text-white'
                              : 'bg-yellow-500 text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {s === 'present' ? 'Present' : s === 'late' ? 'Late' : 'Absent'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}