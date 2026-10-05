'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowDownUp, ArrowLeft, Calendar, Download, Users, UserCheck, Loader2, AlertTriangle,
  CheckCircle, XCircle, Clock, Shield, FileText, Table, SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  buildCsv, csvFilename, downloadCsv, enumerateWeekdays, formatTimestamp,
  fullName, minutesOfDay, parseHhMm, SCHOOL_DAYS, toDateOnly, todayLocal,
  toIsoDate, WEEKDAY_LABELS, weekdayIndex, weekdayOf,
  sortAttendanceRows, type AttendanceSortKey, type SortDirection,
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
  markedById: string;
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
    status: '', markedBy: '', markedById: '', markedAt: '', markedAtRaw: '',
    scanMethod: '', ...over,
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
  const [sortKey, setSortKey] = useState<AttendanceSortKey>('person');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [span, setSpan] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [staffRoles, setStaffRoles] = useState<string[]>([]);
  const [unattributed, setUnattributed] = useState(0);

  const isStudent = reportType === 'students';
  const availableStatuses = isStudent ? STUDENT_STATUSES : STAFF_STATUSES;
  const classKey = classIds.join(',');
  const dayKey = dayIndexes.join(',');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchOptions();
  }, [profile]);

  useEffect(() => {
    if (!ready || profile?.role !== 'admin') return;
    const id = setTimeout(() => { runReport(); }, 350);
    return () => clearTimeout(id);
  }, [ready, reportType, from, to, classKey, roleFilter, includeUnmarked, dayKey]);

  useEffect(() => {
    if (!ready || profile?.role !== 'admin') return;
    loadSpan();
  }, [ready, reportType]);

  async function fetchOptions() {
    const [sessionsRes, termsRes, classesRes, staffRes] = await Promise.all([
      db.from('academic_sessions').select('*').order('start_date', { ascending: false }),
      db.from('terms').select('*').order('start_date', { ascending: false }),
      db.from('classes').select('id, name, level').order('level', { ascending: true }),
      db.from('staff').select('profile_id'),
    ]);

    const loadedSessions: any[] = sessionsRes.data || [];
    const loadedTerms: any[] = termsRes.data || [];
    setSessions(loadedSessions);
    setTerms(loadedTerms);
    setClasses(classesRes.data || []);

    const staffProfileIds = [...new Set((staffRes.data || []).map((s: any) => s.profile_id).filter(Boolean))] as string[];
    if (staffProfileIds.length) {
      const rolesRes = await db.from('profiles').select('role').in('id', staffProfileIds);
      const roles = [...new Set((rolesRes.data || []).map((p: any) => p.role).filter(Boolean) as string[])]
        .sort((a, b) => a.localeCompare(b));
      setStaffRoles(roles);
      if (roleFilter && !roles.includes(roleFilter)) setRoleFilter('');
    }

const currentSession = loadedSessions.find(s => s.is_current) || loadedSessions[0];
    const sessionTerms = currentSession
      ? loadedTerms.filter(t => t.session_id === currentSession.id)
      : [];
    const currentTerm = sessionTerms.find(t => t.is_current) || sessionTerms[0];

    if (currentTerm) {
      const termStart = toDateOnly(currentTerm.start_date);
      const termEnd = toDateOnly(currentTerm.end_date);
      setSessionId(currentTerm.session_id || currentSession?.id || '');
      setTermId(currentTerm.id);
      setFrom(termStart);
      setTo(termEnd);
    } else if (currentSession) {
      setSessionId(currentSession.id);
      setFrom(toDateOnly(currentSession.start_date));
      setTo(toDateOnly(currentSession.end_date));
    } else {
      const back = new Date();
      back.setDate(back.getDate() - 30);
      setFrom(toIsoDate(back));
      setTo(todayLocal());
    }
    setReady(true);
  }

  async function loadSpan() {
    const table = isStudent ? 'attendance' : 'staff_attendance';
    const [lo, hi] = await Promise.all([
      db.from(table).select('date').order('date', { ascending: true }).limit(1),
      db.from(table).select('date').order('date', { ascending: false }).limit(1),
    ]);
    setSpan({
      min: toDateOnly((lo.data || [])[0]?.date),
      max: toDateOnly((hi.data || [])[0]?.date),
    });
  }

  function onSessionChange(value: string) {
    setSessionId(value);
    setTermId('');
    const session = sessions.find(s => s.id === value);
    if (session) {
      setFrom(toDateOnly(session.start_date));
      setTo(toDateOnly(session.end_date));
    }
  }

  function onTermChange(value: string) {
    setTermId(value);
    if (!value) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setFrom(toDateOnly(session.start_date));
        setTo(toDateOnly(session.end_date));
      }
      return;
    }
    const term = terms.find(t => t.id === value);
    if (term) {
      setFrom(toDateOnly(term.start_date));
      setTo(toDateOnly(term.end_date));
    }
  }

  function toggleClass(id: string) {
    const next = classIds.includes(id) ? classIds.filter(x => x !== id) : [...classIds, id];
    setClassIds(next);
    if (next.length === 0 && includeUnmarked) setIncludeUnmarked(false);
  }

  function changeReportType(next: 'students' | 'staff') {
    if (next === reportType) return;
    setReportType(next);
    setStatuses([...(next === 'students' ? STUDENT_STATUSES : STAFF_STATUSES)]);
    setScanMethod('');
    setMarkedByFilter('');
    if (next === 'students') setRoleFilter('');
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
    if (isStudent) setUnattributed(0);
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
    const allowedDays = new Set(dayIndexes);

    let q = db.from('attendance').select(
      '*, student:profiles!student_id(first_name, last_name, records:students!profile_id(admission_number)), class:classes!class_id(name), marker:profiles!marked_by(first_name, last_name)',
    ).gte('date', from).lte('date', to)
      .order('date', { ascending: true })
      .order('student_id', { ascending: true });
    if (classIds.length) q = q.in('class_id', classIds);

    let rq = db.from('students').select(
      'profile_id, admission_number, person:profiles!profile_id(first_name, last_name), class:classes!class_id(name)',
    ).order('admission_number', { ascending: true });
    if (classIds.length) rq = rq.in('class_id', classIds);

    const [attRes, rosterRes] = await Promise.all([q, rq]);
    if (attRes.error) throw new Error(attRes.error.message);
    if (rosterRes.error) throw new Error(rosterRes.error.message);

    const roster = new Map<string, any>();
    for (const s of (rosterRes.data || []) as any[]) roster.set(s.profile_id, s);

    const marked = new Map<string, any>();
    for (const r of (attRes.data || []) as any[]) {
      if (!r.student_id) continue;
      r.date = toDateOnly(r.date);
      if (!allowedDays.has(weekdayIndex(r.date))) continue;
      marked.set(`${r.student_id}|${r.date}`, r);
    }

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
        markedById: r.marked_by || '',
        markedAt: formatTimestamp(r.marked_at),
        markedAtRaw: r.marked_at || '',
        scanMethod: r.scan_method || '—',
      });
    };

    if (!includeUnmarked) return [...marked.values()].map(fromMarked);

    const personIds = new Set<string>(roster.keys());
    for (const id of marked.keys()) personIds.add(id.split('|')[0]);

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
          markedById: '',
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
    const allowedDays = new Set(dayIndexes);

    const staffListRes = await db.from('staff').select('profile_id');
    if (staffListRes.error) throw new Error(staffListRes.error.message);
    const staffProfileIds = [...new Set((staffListRes.data || []).map((s: any) => s.profile_id).filter(Boolean))] as string[];

    const [attRes, staffRes] = await Promise.all([
      db.from('staff_attendance').select(
        '*, staff:profiles!staff_id(first_name, last_name, role), marker:profiles!marked_by(first_name, last_name)',
      ).gte('date', from).lte('date', to)
        .order('date', { ascending: true })
        .order('staff_id', { ascending: true }),
      staffProfileIds.length
        ? db.from('profiles').select(
            'id, first_name, last_name, role, record:staff!profile_id(staff_id, employee_id, designation, department:departments!department_id(name))',
          ).in('id', staffProfileIds).order('first_name', { ascending: true })
        : Promise.resolve({ data: [], error: null } as any),
    ]);
    if (attRes.error) throw new Error(attRes.error.message);
    if (staffRes.error) throw new Error(staffRes.error.message);

    const roster = new Map<string, any>();
    for (const p of (staffRes.data || []) as any[]) {
      if (!p?.id) continue;
      if (roleFilter && p.role !== roleFilter) continue;
      roster.set(p.id, p);
    }

    const roleOf = (r: any) => one(r.staff)?.role || roster.get(r.staff_id)?.role || '';

    const marked = new Map<string, any>();
    let unattributedCount = 0;
    for (const r of (attRes.data || []) as any[]) {
      r.date = toDateOnly(r.date);
      if (!allowedDays.has(weekdayIndex(r.date))) continue;
      // Records with no staff_id cannot be attributed to anyone. Keep them out of
      // the rows, but surface the count so a silent gap never looks like a clean report.
      if (!r.staff_id) { unattributedCount++; continue; }
      if (roleFilter && roleOf(r) !== roleFilter) continue;
      marked.set(`${r.staff_id}|${r.date}`, r);
    }
    setUnattributed(unattributedCount);

    const fromMarked = (r: any) => {
      const person = one(r.staff);
      const fallback = roster.get(r.staff_id);
      const source = person || fallback;
      const rec = one(one(fallback)?.record) || one(one(person)?.record);
      return emptyRow({
        key: `r-${r.id}`,
        personId: r.staff_id || '',
        personName: fullName(source) || 'N/A',
        role: source?.role || '',
        employeeId: rec?.employee_id || '',
        designation: rec?.designation || '',
        department: one(rec?.department)?.name || '',
        className: '',
        date: r.date,
        day: weekdayOf(r.date),
        status: r.status,
        markedBy: fullName(one(r.marker)) || '—',
        markedById: r.marked_by || '',
        markedAt: formatTimestamp(r.marked_at),
        markedAtRaw: r.marked_at || '',
        scanMethod: '—',
      });
    };

    if (!includeUnmarked) return [...marked.values()].map(fromMarked);

    const staffIds = new Set<string>(roster.keys());
    for (const id of marked.keys()) staffIds.add(id.split('|')[0]);

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
          className: '',
          date,
          day: weekdayOf(date),
          status: 'unmarked',
          markedBy: '—',
          markedById: '',
          markedAt: '',
          markedAtRaw: '',
          scanMethod: '—',
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

  const pctLimit = useMemo(() => {
    if (belowPct === '') return null;
    const n = Number(belowPct);
    if (!Number.isFinite(n)) return null;
    return Math.min(100, Math.max(0, n));
  }, [belowPct]);

  const visibleRows = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const fromMins = timeFrom ? parseHhMm(timeFrom) : null;
    const toMins = timeTo ? parseHhMm(timeTo) : null;

    return rows.filter(r => {
      if (!statuses.includes(r.status)) return false;
      if (scanMethod && r.scanMethod !== scanMethod) return false;
      if (markedByFilter && r.markedById !== markedByFilter) return false;

      if (fromMins !== null || toMins !== null) {
        const mins = r.markedAtRaw ? minutesOfDay(r.markedAtRaw) : null;
        if (mins === null) return false;
        if (fromMins !== null && mins < fromMins) return false;
        if (toMins !== null && mins > toMins) return false;
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
  }, [rows, statuses, scanMethod, markedByFilter, timeFrom, timeTo, search, pctLimit, rateByPerson]);

  const sortedRows = useMemo(
    () => sortAttendanceRows(visibleRows, sortKey, sortDir),
    [visibleRows, sortKey, sortDir],
  );

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
    const map = new Map<string, string>();
    for (const r of rows) if (r.markedById) map.set(r.markedById, r.markedBy);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const activeAdvanced = [
    statuses.length !== availableStatuses.length,
    dayIndexes.length !== SCHOOL_DAYS.length,
    !!timeFrom, !!timeTo, !!scanMethod, !!markedByFilter, !!search, pctLimit !== null,
  ].filter(Boolean).length;

  const sessionName = sessions.find(s => s.id === sessionId)?.name || '';
  const termName = terms.find(t => t.id === termId)?.name || '';
  const className = classIds.length === 1
    ? classes.find(c => c.id === classIds[0])?.name || ''
    : classIds.length > 1 ? `${classIds.length}-classes` : '';

  function handleExport() {
    if (sortedRows.length === 0) { setError('Nothing to export'); return; }

    const stamp = csvFilename([
      isStudent ? 'student_attendance' : 'staff_attendance',
      isStudent ? className : roleFilter,
      termName, from, to,
    ]);

    const body = sortedRows.map(r => {
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

  const preview = sortedRows.slice(0, PREVIEW_LIMIT);
  const tooLarge = summary.total > LARGE_EXPORT;
  const filtered = visibleRows.length !== rows.length;
  const spanOutside = !!(span.min && from && to && (to < span.min || from > span.max));
  const previewHeaders = isStudent
    ? ['Admission Number', 'Student Name', 'Class', 'Date', 'Day', 'Status', 'Marked By', 'Rate']
    : ['Employee ID', 'Staff Name', 'Role', 'Designation', 'Date', 'Day', 'Status', 'Marked By', 'Rate'];
  const sortOptions: { value: AttendanceSortKey; label: string }[] = [
    { value: 'person', label: 'Person, then date' },
    { value: 'date', label: 'Date, then person' },
    { value: 'class', label: 'Class, then person' },
    { value: 'status', label: 'Status, then date' },
  ];

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

        {!error && unattributed > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 text-amber-800 dark:text-amber-300 text-sm">
            {unattributed} staff attendance {unattributed === 1 ? 'record has' : 'records have'} no staff ID and could not be
            attributed to anyone, so {unattributed === 1 ? 'it is' : 'they are'} not in this report or the export. Run the
            Import&nbsp;&amp;&nbsp;Export attendance fix to repair these rows.
          </div>
        )}

        <div className="card">
          <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-600 p-1">
            <button
              onClick={() => changeReportType('students')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 ${reportType === 'students' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              <Users size={16} /> Students
            </button>
            <button
              onClick={() => changeReportType('staff')}
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
                  {staffRoles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
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
                      {markerOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
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
                    Days of the week filters both recorded and unmarked days. Time-of-day filtering uses the
                    marking timestamp, so unmarked days have no timestamp and are dropped while it is active.
                    Attendance rate is each person's present days as a share of their recorded days, excluding
                    unmarked days. The CSV export follows the row order and every active filter.
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

        {spanOutside && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-4 text-amber-800 dark:text-amber-200 text-sm flex flex-wrap items-center gap-3">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="flex-1">
              No {isStudent ? 'student' : 'staff'} attendance exists between <strong>{from}</strong> and <strong>{to}</strong>.
              The records on file run from <strong>{span.min}</strong> to <strong>{span.max}</strong>.
            </span>
            <button
              onClick={() => { setFrom(span.min); setTo(span.max); }}
              className="btn-outline py-1.5 px-3 text-xs"
            >
              Use full range
            </button>
          </div>
        )}

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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ArrowDownUp size={14} />
                <label htmlFor="sortKey" className="sr-only">Sort rows by</label>
                <select
                  id="sortKey"
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as AttendanceSortKey)}
                  className="input py-1.5 text-xs"
                >
                  {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button
                onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                className="btn-outline py-1.5 px-2.5 text-xs"
              >
                {sortDir === 'asc' ? 'Asc' : 'Desc'}
              </button>
              <button className="btn-primary flex items-center gap-2" onClick={handleExport} disabled={summary.total === 0}>
                <Download size={18} /> Export CSV
              </button>
            </div>
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
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-500 whitespace-nowrap">{r.day}</td>
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