'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Calendar, Download, Users, UserCheck, Loader2, AlertTriangle,
  CheckCircle, XCircle, Clock, Shield, FileText, Table, SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  buildCsv, csvFilename, downloadCsv, enumerateWeekdays, formatTimestamp,
  fullName, minutesOfDay, parseHhMm, SCHOOL_DAYS, WEEKDAY_LABELS, weekdayOf,
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
  markedAtRaw: string;
  scanMethod: string;
}

const PREVIEW_LIMIT = 50;
const LARGE_EXPORT = 10000;
const STUDENT_STATUSES = ['present', 'absent', 'late', 'excused', 'unmarked'];
const STAFF_STATUSES = ['present', 'absent', 'late', 'unmarked'];
const DAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];

function one(v: any) {
  return Array.isArray(v) ? v[0] : v;
}

function admissionOf(v: any): string {
  const rec = one(one(v)?.records);
  return rec?.admission_number || '';
}

function emptyRow(over: Partial<ReportRow>): ReportRow {
  return {
    key: '', personId: '', personName: '', admissionNumber: '', employeeId: '',
    role: '', designation: '', department: '', className: '', date: '', day: '',
    status: '', markedBy: '', markedAt: '', markedAtRaw: '', scanMethod: '', ...over,
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
  const [classIds, setClassIds] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [includeUnmarked, setIncludeUnmarked] = useState(true);

  const [statuses, setStatuses] = useState<string[]>([...STUDENT_STATUSES]);
  const [dayIndexes, setDayIndexes] = useState<number[]>([...SCHOOL_DAYS]);
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [scanMethod, setScanMethod] = useState('');
  const [markedByFilter, setMarkedByFilter] = useState('');
  const [search, setSearch] = useState('');
  const [belowPct, setBelowPct] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const isStudent = reportType === 'students';
  const availableStatuses = isStudent ? STUDENT_STATUSES : STAFF_STATUSES;

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
      const back = new Date();
      back.setDate(back.getDate() - 30);
      setFrom(back.toISOString().split('T')[0]);
      setTo(new Date().toISOString().split('T')[0]);
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

  function toggleClass(id: string) {
    const next = classIds.includes(id) ? classIds.filter(x => x !== id) : [...classIds, id];
    setClassIds(next);
    if (next.length === 0 && includeUnmarked) setIncludeUnmarked(false);
  }

  function toggleStatus(value: string) {
    setStatuses(prev => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]);
  }

  function toggleDay(index: number) {
    setDayIndexes(prev => prev.includes(index) ? prev.filter(d => d !== index) : [...prev, index]);
  }

  function resetAdvanced() {
    setStatuses([...(isStudent ? STUDENT_STATUSES : STAFF_STATUSES)]);
    setDayIndexes([...SCHOOL_DAYS]);
    setTimeFrom('');
    setTimeTo('');
    setScanMethod('');
    setMarkedByFilter('');
    setSearch('');
    setBelowPct('');
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
    const days = enumerateWeekdays(from, to, dayIndexes);

    let q = db.from('attendance').select(
      '*, student:profiles!student_id(first_name, last_name, records:students!profile_id(admission_number)), class:classes!class_id(name), marker:profiles!marked_by(first_name, last_name)',
    ).gte('date', from).lte('date', to);
    if (classIds.length) q = q.in('class_id', classIds);

    let rq = db.from('students').select(
      'profile_id, admission_number, person:profiles!profile_id(first_name, last_name), class:classes!class_id(name)',
    );
    if (classIds.length) rq = rq.in('class_id', classIds);

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
        markedAtRaw: r.marked_at || '',
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
          markedAtRaw: '',
          scanMethod: '—',
        }));
      }
    }
    return out;
  }

  async function buildStaffReport(): Promise<ReportRow[]> {
    const days = enumerateWeekdays(from, to, dayIndexes);

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
        markedAtRaw: r.marked_at || '',
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
          markedAtRaw: '',
        }));
      }
    }
    return out;
  }

  const rateByPerson = useMemo(() => {
    const acc = new Map<string, { present: number; recorded: number }>();
    for (const r of rows) {
      if (r.status === 'unmarked') continue;
      const e = acc.get(r.personId) || { present: 0, recorded: 0 };
      e.recorded += 1;
      if (r.status === 'present') e.present += 1;
      acc.set(r.personId, e);
    }
    const out = new Map<string, number>();
    for (const [id, v] of acc) out.set(id, v.recorded ? (v.present / v.recorded) * 100 : 0);
    return out;
  }, [rows]);

  const rateOf = (r: ReportRow) => (rateByPerson.has(r.personId) ? rateByPerson.get(r.personId)! : null);

  const visibleRows = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const fromMins = timeFrom ? parseHhMm(timeFrom) : null;
    const toMins = timeTo ? parseHhMm(timeTo) : null;
    const pctLimit = belowPct === '' ? null : Number(belowPct);

    return rows.filter(r => {
      if (!statuses.includes(r.status)) return false;
      if (scanMethod && r.scanMethod !== scanMethod) return false;
      if (markedByFilter && r.markedBy !== markedByFilter) return false;

      if (fromMins !== null || toMins !== null) {
        if (r.markedAtRaw) {
          const mins = minutesOfDay(r.markedAtRaw);
          if (mins !== null) {
            if (fromMins !== null && mins < fromMins) return false;
            if (toMins !== null && mins > toMins) return false;
          }
        }
      }

      if (lower) {
        const hay = [r.personName, r.admissionNumber, r.employeeId, r.className, r.designation]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(lower)) return false;
      }

      if (pctLimit !== null) {
        const rate = rateOf(r);
        if (rate === null || rate >= pctLimit) return false;
      }

      return true;
    });
  }, [rows, statuses, scanMethod, markedByFilter, timeFrom, timeTo, search, belowPct, rateByPerson]);

  const summary = useMemo(() => {
    const count = (s: string) => visibleRows.filter(r => r.status === s).length;
    return {
      present: count('present'),
      absent: count('absent'),
      late: count('late'),
      excused: isStudent ? count('excused') : 0,
      unmarked: count('unmarked'),
      total: visibleRows.length,
    };
  }, [visibleRows, isStudent]);

  const markerOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.markedBy && r.markedBy !== '—') set.add(r.markedBy);
    return [...set].sort();
  }, [rows]);

  const activeAdvanced = [
    statuses.length !== availableStatuses.length,
    dayIndexes.length !== SCHOOL_DAYS.length,
    !!timeFrom, !!timeTo, !!scanMethod, !!markedByFilter, !!search, belowPct !== '',
  ].filter(Boolean).length;

  const sessionName = sessions.find(s => s.id === sessionId)?.name || '';
  const termName = terms.find(t => t.id === termId)?.name || '';
  const className = classIds.length === 1
    ? classes.find(c => c.id === classIds[0])?.name || ''
    : classIds.length > 1 ? `${classIds.length}-classes` : '';

  function handleExport() {
    if (visibleRows.length === 0) { setError('Nothing to export'); return; }

    const stamp = csvFilename([
      isStudent ? 'student_attendance' : 'staff_attendance',
      isStudent ? className : roleFilter,
      termName, from, to,
    ]);

    const body = visibleRows.map(r => {
      const rate = rateOf(r);
      const rateCell = rate === null ? '' : `${rate.toFixed(1)}%`;
      return isStudent
        ? [r.admissionNumber, r.personName, r.className, r.date, r.day, r.status, r.markedBy, r.markedAt, r.scanMethod, rateCell]
        : [r.employeeId, r.personName, r.role, r.designation, r.department, r.date, r.day, r.status, r.markedBy, r.markedAt, rateCell];
    });

    downloadCsv(stamp, buildCsv(
      isStudent
        ? ['Admission Number', 'Student Name', 'Class', 'Date', 'Day', 'Status', 'Marked By', 'Marked At', 'Scan Method', 'Attendance Rate']
        : ['Employee ID', 'Staff Name', 'Role', 'Designation', 'Department', 'Date', 'Day', 'Status', 'Marked By', 'Marked At', 'Attendance Rate'],
      body,
    ));
  }

  const statusBadge: Record<string, string> = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    late: 'bg-amber-100 text-amber-700',
    excused: 'bg-purple-100 text-purple-700',
    unmarked: 'bg-slate-100 text-slate-600',
  };

  const chipBase = 'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors';
  const chipOn = 'bg-primary-600 text-white border-primary-600';
  const chipOff = 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600';

  const preview = visibleRows.slice(0, PREVIEW_LIMIT);
  const tooLarge = summary.total > LARGE_EXPORT;
  const filtered = visibleRows.length !== rows.length;
  const previewHeaders = isStudent
    ? ['Admission Number', 'Student Name', 'Class', 'Date', 'Status', 'Marked By', 'Rate']
    : ['Employee ID', 'Staff Name', 'Role', 'Designation', 'Date', 'Status', 'Marked By', 'Rate'];

  return (
    <DashboardLayout title="Attendance Reports" subtitle="Filter and export student or staff attendance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg dark:hover:bg-slate-700">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance Reports</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Choose exactly which attendance data to export</p>
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
          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 p-1">
            <button
              onClick={() => { setReportType('students'); setStatuses([...STUDENT_STATUSES]); setScanMethod(''); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${reportType === 'students' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              <Users size={16} /> Students
            </button>
            <button
              onClick={() => { setReportType('staff'); setStatuses([...STAFF_STATUSES]); setScanMethod(''); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${reportType === 'staff' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              <UserCheck size={16} /> Staff
            </button>
          </div>
        </div>

        <div className="card space-y-4">
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Name or admission number"
                  className="input"
                />
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
                Include unmarked days
              </label>
            </div>
          </div>

          {isStudent && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Classes {classIds.length > 0 && <span className="text-primary-600">{classIds.length} selected</span>}
              </label>
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                <button
                  onClick={() => { setClassIds([]); if (includeUnmarked) setIncludeUnmarked(false); }}
                  className={`${chipBase} ${classIds.length === 0 ? chipOn : chipOff}`}
                >
                  All Classes
                </button>
                {classes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleClass(c.id)}
                    className={`${chipBase} ${classIds.includes(c.id) ? chipOn : chipOff}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {classIds.length === 0 && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <AlertTriangle size={13} /> Select one or more classes to include unmarked students.
                </p>
              )}
            </div>
          )}

          <div>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              <SlidersHorizontal size={16} />
              Advanced filters
              {activeAdvanced > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary-600 text-white text-xs">{activeAdvanced}</span>
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-end">
                  <button onClick={resetAdvanced} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    <RotateCcw size={13} /> Reset advanced filters
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status to include</label>
                  <div className="flex flex-wrap gap-2">
                    {availableStatuses.map(s => (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        className={`${chipBase} capitalize ${statuses.includes(s) ? chipOn : chipOff}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Days of the week</label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_INDEXES.map(d => (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`${chipBase} ${dayIndexes.includes(d) ? chipOn : chipOff}`}
                      >
                        {WEEKDAY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Marked from</label>
                    <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Marked until</label>
                    <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Marked by</label>
                    <select value={markedByFilter} onChange={e => setMarkedByFilter(e.target.value)} className="input" disabled={markerOptions.length === 0}>
                      <option value="">Anyone</option>
                      {markerOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {isStudent && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Scan method</label>
                      <select value={scanMethod} onChange={e => setScanMethod(e.target.value)} className="input">
                        <option value="">Any method</option>
                        <option value="manual">Manual</option>
                        <option value="qr_scan">QR scan</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Below attendance rate</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={belowPct}
                      onChange={e => setBelowPct(e.target.value)}
                      placeholder="e.g. 75"
                      className="input"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    Time-of-day filtering uses the marking timestamp, so unmarked days have no time and are always kept.
                    Attendance rate is each person's present days as a share of their recorded days, excluding unmarked days.
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-500 dark:text-slate-400">Rows</span><Table size={16} className="text-slate-400" /></div><p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.total.toLocaleString()}</p></div>
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
            This export has {summary.total.toLocaleString()} rows. Narrow the date range, classes or statuses to keep the file manageable.
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-slate-400" /> Preview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Showing {preview.length.toLocaleString()} of {summary.total.toLocaleString()} rows
                {filtered ? ` (filtered from ${rows.length.toLocaleString()})` : ''}
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
              <p className="font-medium text-slate-500 dark:text-slate-400">No rows match these filters</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Adjust the filters, then generate the report again</p>
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
                  {preview.map(r => {
                    const rate = rateOf(r);
                    return (
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
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {rate === null ? '—' : `${rate.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}