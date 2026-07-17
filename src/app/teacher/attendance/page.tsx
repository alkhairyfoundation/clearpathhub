'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Search, X, CheckCircle, XCircle, Clock, UserCheck, Users, Loader2, ArrowLeft, Download } from 'lucide-react';

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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
    fetchClasses();
  }, [profile]);

  useEffect(() => { if (selectedClass) loadClassData(); }, [date, selectedClass]);

  async function fetchClasses() {
    // Get teacher's class IDs from their subject assignments
    const { data: subjectData } = await supabase
      .from('subjects')
      .select('class_id')
      .eq('teacher_id', profile?.id);

    const teacherClassIds = Array.from(new Set(subjectData?.map(s => s.class_id).filter(Boolean) || []));

    if (teacherClassIds.length > 0) {
      const { data } = await supabase.from('classes').select('id, name').in('id', teacherClassIds).order('level');
      if (data) setClasses(data);
    } else {
      setClasses([]);
    }
  }

  async function loadClassData() {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)').eq('class_id', selectedClass).order('admission_number'),
        supabase.from('attendance').select('student_id, status').eq('date', date).eq('class_id', selectedClass),
      ]);
      if (studentsRes.error) throw new Error(studentsRes.error.message);
      if (studentsRes.data) {
        const studentMap: Record<string, string> = {};
        studentsRes.data.forEach(s => {
          const record = attendanceRes.data?.find(r => r.student_id === s.profile_id);
          studentMap[s.profile_id] = record?.status || '';
        });
        setStudents(studentsRes.data);
        setAttendanceRecords(studentMap);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function markAttendance(studentId: string, status: string) {
    setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
    try {
      const { error } = await supabase.from('attendance').upsert({
        student_id: studentId,
        class_id: selectedClass,
        date,
        status,
        marked_by: profile?.id,
        marked_at: new Date().toISOString(),
        scan_method: 'manual'
      }, { onConflict: 'student_id,date' });
      if (error) setError(error.message);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function markAllPresent() {
    setSaving(true);
    for (const student of students) {
      await markAttendance(student.profile_id, 'present');
    }
    setSaving(false);
  }

  function exportCSV() {
    if (students.length === 0) return;
    const headers = 'Student Name,Admission Number,Class,Date,Status';
    const rows = students.map(s => {
      const status = attendanceRecords[s.profile_id] || 'unmarked';
      const className = classes.find(c => c.id === selectedClass)?.name || 'N/A';
      return `"${s.profile?.first_name} ${s.profile?.last_name}","${s.admission_number}","${className}","${date}","${status}"`;
    }).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${date}_${classes.find(c => c.id === selectedClass)?.name || 'class'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const presentCount = Object.values(attendanceRecords).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceRecords).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendanceRecords).filter(s => s === 'late').length;

  return (
    <DashboardLayout title="Take Attendance" subtitle="Mark student attendance for your class">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Take Attendance</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Mark student attendance for your class</p>
            </div>
          </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2 block">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2 block">Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="input">
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2 block">Students</label>
          <div className="flex items-center gap-2"><Users size={20} className="text-blue-600 dark:text-blue-400 dark:text-blue-400" /><span className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">{students.length}</span></div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <label className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2 block">Present</label>
          <div className="flex items-center gap-2"><CheckCircle size={20} className="text-green-600 dark:text-green-400 dark:text-green-400" /><span className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">{presentCount}</span></div>
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

      {selectedClass && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">
              {classes.find(c => c.id === selectedClass)?.name} - {new Date(date).toLocaleDateString()}
            </h2>
            {students.length > 0 && (
              <div className="flex gap-2">
                <button onClick={markAllPresent} disabled={saving} className="btn-outline text-sm flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  Mark All Present
                </button>
                <button onClick={exportCSV} className="btn-outline text-sm flex items-center gap-2">
                  <Download size={16} /> Export CSV
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div></div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 dark:text-slate-400"><UserCheck size={48} className="mx-auto mb-4 opacity-50" /><p>No students in this class</p></div>
          ) : (
            <div className="space-y-3">
              {students.map(student => {
                const status = attendanceRecords[student.profile_id] || '';
                return (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 dark:text-blue-400 font-medium">{student.profile?.first_name?.[0]}{student.profile?.last_name?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200">{student.profile?.first_name} {student.profile?.last_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{student.admission_number}</p>
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
                              : 'bg-gray-200 text-gray-600 dark:text-slate-400 dark:text-slate-400 hover:bg-gray-300'
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
    </DashboardLayout>
  );
}