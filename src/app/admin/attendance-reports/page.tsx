'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Calendar, Download, Users, UserCheck, Loader2, AlertTriangle,
  CheckCircle, XCircle, Clock, Shield, FileText, Table,
} from 'lucide-react';
import {
  buildCsv, csvFilename, downloadCsv, enumerateWeekdays,
  formatTimestamp, fullName, weekdayOf,
} from '@/lib/csv';

interface ReportRow {
  key: string;
  personId: string;
  personName: string;
  admissionNumber: string;
  employeeId: string;
  role: string;
  designation: string;
  department: string;
  className: string;
  date: string;
  day: string;
  status: string;
  markedBy: string;
  markedAt: string;
  scanMethod: string;
}

function one(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

function admissionOf(v: any): string {
  const rec = one(one(v)?.records);
  return rec?.admission_number || '';
}

const PREVIEW_LIMIT = 50;
const LARGE_EXPORT = 10000;

function emptyRow(over: Partial<ReportRow>): ReportRow {
  return {
    key: '', personId: '', personName: '', admissionNumber: '', employeeId: '',
    role: '', designation: '', department: '', className: '', date: '', day: '',
    status: '', markedBy: '', markedAt: '', scanMethod: '', ...over,
  };
}

export default function AttendanceReportsPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const [reportType, setReportType] = useState<'students' | 'staff'>('students');
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [includeUnmarked, setIncludeUnmarked] = useState(true);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const isStudent = reportType === 'students';

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchOptions();
  }, [profile]);

  useEffect(() => { if (ready && profile?.role === 'admin') runReport(); }, [ready, reportType]);

  async function fetchOptions() {
    const [sessionsRes, termsRes, classesRes] = await Promise.all([
      db.from('academic_sessions').select('*').order('start_date', { ascending: false }),
      db.from('terms').select('*').order('start_date', { ascending: false }),
      db.from('classes').select('id, name, level').order('level', { ascending: true }),
    ]);

    const loadedSessions: any[] = sessionsRes.data || [];
    const loadedTerms: any[] = termsRes.data || [];
    setSessions(loadedSessions);
    setTerms(loadedTerms);
    setClasses(classesRes.data || []);

    const currentSession = loadedSessions.find(s => s.is_current) || loadedSessions[0];
    const currentTerm = loadedTerms.find(t => t.is_current)
      || (currentSession ? loadedTerms.find(t => t.session_id === currentSession.id) : undefined);

    if (currentTerm) {
      setSessionId(currentTerm.session_id || currentSession?.id || '');
      setTermId(currentTerm.id);
      setFrom(currentTerm.start_date);
      setTo(currentTerm.end_date);
    } else if (currentSession) {
      setSessionId(currentSession.id);
      setFrom(currentSession.start_date);
      setTo(currentSession.end_date);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const back = new Date();
      back.setDate(back.getDate() - 30);
      setFrom(back.toISOString().split('T')[0]);
      setTo(today);
    }
    setReady(true);
  }

  function onSessionChange(value: string) {
    setSessionId(value);
    setTermId('');
    const session = sessions.find(s => s.id === value);
    if (session) { setFrom(session.start_date); setTo(session.end_date); }
  }

  function onTermChange(value: string) {
    setTermId(value);
    if (!value) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) { setFrom(session.start_date); setTo(session.end_date); }
      return;
    }
    const term = terms.find(t => t.id === value);
    if (term) { setFrom(term.start_date); setTo(term.end_date); }
  }

  function onClassChange(value: string) {
    setClassId(value);
    if (value === '' && includeUnmarked) setIncludeUnmarked(false);
  }

  async function runReport() {
    if (!from || !to) { setError('Select a start and end date'); setRows([]); return; }
    if (from > to) { setError('Start date must be on or before the end date'); setRows([]); return; }

    setLoading(true);
    setError('');
    try {
      const built = isStudent ? await buildStudentReport() : await buildStaffReport();
      setRows(built);
    } catch (err: any) {
      setError(err?.message || 'Failed to build report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function buildStudentReport(): Promise<ReportRow[]> {
    const days = enumerateWeekdays(from, to);

    let q = db.from('attendance').select(
      '*, student:profiles!student_id(first_name, last_name, records:students!profile_id(admission_number)), class:classes!class_id(name), marker:profiles!marked_by(first_name, last_name)',
    ).gte('date', from).lte('date', to);
    if (classId) q = q.eq('class_id', classId);

    let rq = db.from('students').select(
      'profile_id, admission_number, person:profiles!profile_id(first_name, last_name), class:classes!class_id(name)',
    );
    if (classId) rq = rq.eq('class_id', classId);

    const [attRes, rosterRes] = await Promise.all([q, rq]);
    if (attRes.error) throw new Error(attRes.error.message);
    if (rosterRes.error) throw new Error(rosterRes.error.message);

    const records = (attRes.data || []) as any[];
    const roster = new Map<string, any>();
    for (const s of (rosterRes.data || []) as any[]) roster.set(s.profile_id, s);

    const marked = new Map<string, any>();
    for (const r of records) if (r.student_id) marked.set(`${r.student_id}|${r.date}`, r);

    const fromMarked = (r: any) => {
      const person = one(r.student);
      const fallback = roster.get(r.student_id);
      return emptyRow({
        key: `r-${r.id}`,
        personId: r.student_id || '',
        personName: fullName(person) || fullName(one(fallback?.person)) || 'N/A',
        admissionNumber: admissionOf(person) || fallback?.admission_number || 'N/A',
        className: one(r.class)?.name || one(fallback?.class)?.name || 'N/A',
        date: r.date,
        day: weekdayOf(r.date),
        status: r.status,
        markedBy: fullName(one(r.marker)) || '—',
        markedAt: formatTimestamp(r.marked_at),
        scanMethod: r.scan_method || '—',
      });
    };

    if (!includeUnmarked) return records.filter(r => r.student_id).map(fromMarked);

    const personIds = new Set<string>(roster.keys());
    for (const r of records) if (r.student_id) personIds.add(r.student_id);

    const out: ReportRow[] = [];
    for (const personId of personIds) {
      const fallback = roster.get(personId);
      const baseName = fullName(one(fallback?.person)) || '';
      const baseAdm = fallback?.admission_number || '';
      const baseClass = one(fallback?.class)?.name || 'N/A';
      for (const date of days) {
        const rec = marked.get(`${personId}|${date}`);
        if (rec) { out.push(fromMarked(rec)); continue; }
        out.push(emptyRow({
          key: `u-${personId}-${date}`,
          personId,
          personName: baseName || 'N/A',
          admissionNumber: baseAdm || 'N/A',
          className: baseClass,
          date,
          day: weekdayOf(date),
          status: 'unmarked',
          markedBy: '—',
          markedAt: '',
          scanMethod: '—',
        }));
      }
    }
    return out;
  }

  async function buildStaffReport(): Promise<ReportRow[]> {
    const days = enumerateWeekdays(from, to);

    const [attRes, staffRes] = await Promise.all([
      db.from('staff_attendance').select(
        '*, staff:profiles!staff_id(first_name, last_name, role), marker:profiles!marked_by(first_name, last_name)',
      ).gte('date', from).lte('date', to),
      db.from('profiles').select(
        'id, first_name, last_name, role, record:staff!profile_id(staff_id, employee_id, designation, department:departments!department_id(name))',
      ).in('role', ['teacher', 'accountant', 'admin']).order('first_name'),
    ]);
    if (attRes.error) throw new Error(attRes.error.message);
    if (staffRes.error) throw new Error(staffRes.error.message);

    const roster = new Map<string, any>();
    for (const p of (staffRes.data || []) as any[]) {
      if (roleFilter && p.role !== roleFilter) continue;
      roster.set(p.id, p);
    }

    const records = (attRes.data || []) as any[];
    const marked = new Map<string, any>();
    for (const r of records) if (r.staff_id) marked.set(`${r.staff_id}|${r.date}`, r);

    const fromMarked = (r: any) => {
      const person = one(r.staff);
      const fallback = roster.get(r.staff_id);
      const source = person || fallback;
      const rec = one(one(source)?.record);
      return emptyRow({
        key: `r-${r.id}`,
        personId: r.staff_id || '',
        personName: fullName(source) || 'N/A',
        role: source?.role || '',
        employeeId: rec?.employee_id || '',
        designation: rec?.designation || '',
        department: one(rec?.department)?.name || '',
        date: r.date,
        day: weekdayOf(r.date),
        status: r.status,
        markedBy: fullName(one(r.marker)) || '—',
        markedAt: formatTimestamp(r.marked_at),
      });
    };

    if (!includeUnmarked) return records.filter(r => r.staff_id).map(fromMarked);

    const staffIds = new Set<string>(roster.keys());
    for (const r of records) if (r.staff_id) staffIds.add(r.staff_id);

    const out: ReportRow[] = [];
    for (const staffId of staffIds) {
      const person = roster.get(staffId);
      const rec = one(one(person)?.record);
      for (const date of days) {
        const found = marked.get(`${staffId}|${date}`);
        if (found) { out.push(fromMarked(found)); continue; }
        out.push(emptyRow({
          key: `u-${staffId}-${date}`,
          personId: staffId,
          personName: fullName(person) || 'N/A',
          role: person?.role || '',
          employeeId: rec?.employee_id || '',
          designation: rec?.designation || '',
          department: one(rec?.department)?.name || '',
          date,
          day: weekdayOf(date),
          status: 'unmarked',
          markedBy: '—',
          markedAt: '',
        }));
      }
    }
    return out;
  }

  const summary = useMemo(() => {
    const count = (s: string) => rows.filter(r => r.status === s).length;
    return {
      present: count('present'),
      absent: count('absent'),
      late: count('late'),
      excused: isStudent ? count('excused') : 0,
      unmarked: count('unmarked'),
      total: rows.length,
    };
  }, [rows, isStudent]);

  const sessionName = sessions.find(s => s.id === sessionId)?.name || '';
  const termName = terms.find(t => t.id === termId)?.name || '';
  const className = classes.find(c => c.id === classId)?.name || '';

  function handleExport() {
    if (rows.length === 0) { setError('Nothing to export'); return; }

    const stamp = csvFilename([
      isStudent ? 'student_attendance' : 'staff_attendance',
      isStudent ? className : roleFilter,
      termName, from, to,
    ]);

    if (isStudent) {
      downloadCsv(stamp, buildCsv(
        ['Admission Number', 'Student Name', 'Class', 'Date', 'Day', 'Status', 'Marked By', 'Marked At', 'Scan Method'],
        rows.map(r => [r.admissionNumber, r.personName, r.className, r.date, r.day, r.status, r.markedBy, r.markedAt, r.scanMethod]),
      ));
    } else {
      downloadCsv(stamp, buildCsv(
        ['Employee ID', 'Staff Name', 'Role', 'Designation', 'Department', 'Date', 'Day', 'Status', 'Marked By', 'Marked At'],
        rows.map(r => [r.employeeId, r.personName, r.role, r.designation, r.department, r.date, r.day, r.status, r.markedBy, r.markedAt]),
      ));
    }
  }

  const statusBadge: Record<string, string> = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    late: 'bg-amber-100 text-amber-700',
    excused: 'bg-purple-100 text-purple-700',
    unmarked: 'bg-slate-100 text-slate-600',
  };

  const preview = rows.slice(0, PREVIEW_LIMIT);
  const tooLarge = summary.total > LARGE_EXPORT;
  const previewHeaders = isStudent
    ? ['Admission Number', 'Student Name', 'Class', 'Date', 'Status', 'Marked By']
    : ['Employee ID', 'Staff Name', 'Role', 'Designation', 'Date', 'Status', 'Marked By'];

  return (
    <DashboardLayout title="Attendance Reports" subtitle="Filter and export student or staff attendance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg dark:hover:bg-slate-700">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Reports</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Filter by session, term, class or role, then export CSV</p>
          </div>
          <button className="btn-outline flex items-center gap-2" onClick={runReport} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
            {loading ? 'Building...' : 'Generate Report'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="card">
          <div className="flex flex-wrap gap-4">
            <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 p-1">
              <button
                onClick={() => setReportType('students')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${reportType === 'students' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
              >
                <Users size={16} /> Students
              </button>
              <button
                onClick={() => setReportType('staff')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${reportType === 'staff' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
              >
                <UserCheck size={16} /> Staff
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Session</label>
              <select value={sessionId} onChange={e => onSessionChange(e.target.value)} className="input">
                <option value="">All Sessions</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Term</label>
              <select value={termId} onChange={e => onTermChange(e.target.value)} className="input">
                <option value="">All Terms in Session</option>
                {sessions.filter(s => terms.some(t => t.session_id === s.id)).map(session => (
                  <optgroup key={session.id} label={session.name}>
                    {terms.filter(t => t.session_id === session.id).map(term => (
                      <option key={term.id} value={term.id}>
                        {term.name}{term.is_current ? ' (Current)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {isStudent ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Class</label>
                <select value={classId} onChange={e => onClassChange(e.target.value)} className="input">
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input">
                  <option value="">All Roles</option>
                  <option value="teacher">Teacher</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUnmarked}
                  onChange={e => setIncludeUnmarked(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                Include unmarked weekdays
              </label>
            </div>
          </div>

          {isStudent && !classId && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <AlertTriangle size={13} /> Select a specific class to include unmarked students. Unmarked rows are generated for Monday to Friday only.
            </p>
          )}
          {!isStudent && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <AlertTriangle size={13} /> Unmarked rows are generated for Monday to Friday only. Unmarked means no record exists, not that the person was absent.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400">Rows</span><Table size={16} className="text-slate-400" /></div><p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400">Present</span><CheckCircle size={16} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{summary.present}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400">Absent</span><XCircle size={16} className="text-red-600" /></div><p className="text-2xl font-bold text-red-600">{summary.absent}</p></div>
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400">Late</span><Clock size={16} className="text-amber-600" /></div><p className="text-2xl font-bold text-amber-600">{summary.late}</p></div>
          {isStudent && (
            <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400">Excused</span><Shield size={16} className="text-purple-600" /></div><p className="text-2xl font-bold text-purple-600">{summary.excused}</p></div>
          )}
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400">Unmarked</span><AlertTriangle size={16} className="text-slate-500" /></div><p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{summary.unmarked}</p></div>
        </div>

        {tooLarge && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 text-amber-700 dark:text-amber-300 text-sm">
            This report has {summary.total.toLocaleString()} rows. Narrow the date range or class to keep the file manageable.
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-slate-400" /> Preview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Showing {preview.length} of {summary.total.toLocaleString()} rows
                {sessionName ? ` • ${sessionName}` : ''}{termName ? ` • ${termName}` : ''}{className ? ` • ${className}` : ''}
              </p>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={handleExport} disabled={summary.total === 0}>
              <Download size={18} /> Export CSV
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
            </div>
          ) : preview.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="font-medium text-slate-500 dark:text-slate-400">No rows to show</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Adjust the filters and generate the report again</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    {previewHeaders.map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map(r => (
                    <tr key={r.key} className="border-b border-slate-100 dark:border-slate-700/50">
                      <td className="py-2 px-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {isStudent ? r.admissionNumber : (r.employeeId || '—')}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{r.personName}</td>
                      {isStudent ? (
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{r.className}</td>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 capitalize whitespace-nowrap">{r.role || '—'}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{r.designation || '—'}</td>
                        </>
                      )}
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{r.date}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${statusBadge[r.status] || 'bg-slate-100 text-slate-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{r.markedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}