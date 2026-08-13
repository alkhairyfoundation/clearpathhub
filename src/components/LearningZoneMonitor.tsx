'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ACTIVITY_LABELS,
  POLL_MS,
  SIGNAL_LABELS,
  STATUS_META,
  deriveStatus,
  lastHeartbeatAge,
  type PresenceActivityType,
  type PresenceRow,
  type PresenceSignal,
  type PresenceStatus,
} from '@/lib/presence';
import {
  X,
  Search,
  UserCheck,
  CheckCircle,
  Clock,
  Activity,
  Users,
  Radio,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface LearningZoneMonitorProps {
  role: 'teacher' | 'admin';
}

interface StudentInfo {
  class_id: string | null;
  class_name: string | null;
  name: string | null;
  email: string | null;
}

interface EventRow {
  id: string;
  event_type: string;
  detail: string | null;
  activity_type: string | null;
  created_at: string;
}

const PRESENT_WINDOW_MS = 10 * 60_000;
const EVT_LABELS: Record<string, string> = {
  presence_start: 'Started studying',
  presence_end: 'Stopped studying',
  heartbeat: 'Heartbeat',
  tab_hidden: 'Tab hidden',
  tab_switch: 'Switched tabs',
  fullscreen_exit: 'Exited fullscreen',
  idle: 'Idle',
  active: 'Active',
  paused: 'Paused',
  checkpoint: 'Checkpoint',
  teacher_checkin: 'Teacher check-in',
};

function timeAgo(msAgo: number): string {
  if (msAgo < 0) return 'now';
  if (msAgo < 1_000) return 'just now';
  if (msAgo < 60_000) return `${Math.floor(msAgo / 1000)}s ago`;
  if (msAgo < 3_600_000) return `${Math.floor(msAgo / 60_000)}m ago`;
  return `${Math.floor(msAgo / 3_600_000)}h ago`;
}

function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function recentSignalTypes(signals: PresenceSignal[] | null | undefined): string[] {
  if (!signals || signals.length === 0) return [];
  const now = Date.now();
  return signals.filter((s) => now - s.ts <= 60_000).map((s) => s.t);
}

export default function LearningZoneMonitor({ role }: LearningZoneMonitorProps) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<PresenceRow[]>([]);
  const [students, setStudents] = useState<Map<string, StudentInfo>>(new Map());
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<PresenceRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkedMsg, setCheckedMsg] = useState('');

  const [statusFilter, setStatusFilter] = useState<PresenceStatus | 'all'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<PresenceActivityType | 'all'>('all');
  const [search, setSearch] = useState('');

  const checkedMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef<number>(Date.now());

  const isTeacher = role === 'teacher';

  const fetchStudents = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('students')
        .select('profile_id, class_id, class:classes!class_id(name), profile:profiles!profile_id(first_name, last_name, email)');
      const map = new Map<string, StudentInfo>();
      (data || []).forEach((s: any) => {
        if (!s.profile_id) return;
        map.set(s.profile_id, {
          class_id: s.class_id || null,
          class_name: s.class?.name || null,
          name: s.profile ? `${s.profile.first_name || ''} ${s.profile.last_name || ''}`.trim() : null,
          email: s.profile?.email || null,
        });
      });
      setStudents(map);
    } catch {
      // silent
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      if (isTeacher && profile?.id) {
        const { data } = await supabase
          .from('subjects')
          .select('class_id, class:classes!class_id(id, name)')
          .eq('teacher_id', profile.id);
        const seen = new Map<string, string>();
        (data || []).forEach((s: any) => {
          if (s.class?.id && !seen.has(s.class.id)) seen.set(s.class.id, s.class.name);
        });
        setClassOptions([...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const { data } = await supabase.from('classes').select('id, name').order('name');
        setClassOptions((data || []).map((c: any) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // silent
    }
  }, [isTeacher, profile?.id]);

  const fetchPresence = useCallback(async () => {
    const since = new Date(Date.now() - PRESENT_WINDOW_MS).toISOString();
    const { data, error: err } = await supabase
      .from('learning_presence')
      .select('*')
      .gte('last_heartbeat_at', since);
    if (err) {
      setError(err.message);
    } else {
      setError('');
      setRows((data || []) as PresenceRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchClasses();
    fetchStudents();
    fetchPresence();
  }, [profile, fetchClasses, fetchStudents, fetchPresence]);

  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t - lastFetchRef.current >= POLL_MS) {
        lastFetchRef.current = t;
        fetchPresence();
        fetchStudents();
      }
    };
    lastFetchRef.current = Date.now();
    const iv = window.setInterval(tick, 4_000);
    return () => window.clearInterval(iv);
  }, [fetchPresence, fetchStudents]);

  const decorated = useMemo(() => {
    return rows
      .map((row) => {
        const info = students.get(row.student_id);
        const status = deriveStatus(row, now);
        return {
          row,
          status,
          name: info?.name || row.content_title || 'Student',
          email: info?.email || '',
          class_id: info?.class_id || row.class_id || null,
          class_name: info?.class_name || row.class_name || '—',
          ageMs: lastHeartbeatAge(row, now) ?? -1,
          signals: recentSignalTypes(row.signals),
        };
      })
      .filter((d) => {
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (classFilter !== 'all' && d.class_id !== classFilter) return false;
        if (typeFilter !== 'all' && (d.row.activity_type || 'video') !== typeFilter) return false;
        if (search && !`${d.name} ${d.email} ${d.class_name}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        const order: Record<PresenceStatus, number> = { red: 0, yellow: 1, green: 2 };
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return a.name.localeCompare(b.name);
      });
  }, [rows, students, now, statusFilter, classFilter, typeFilter, search]);

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0 };
    rows.forEach((row) => {
      c[deriveStatus(row, now)] += 1;
    });
    return c;
  }, [rows, now]);

  const openDetail = useCallback(async (d: (typeof decorated)[number]) => {
    setSelected(d.row);
    setCheckedMsg('');
    setEventsLoading(true);
    setEvents([]);
    const { data, error: err } = await supabase
      .from('learning_events')
      .select('*')
      .eq('student_id', d.row.student_id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!err && data) setEvents(data as EventRow[]);
    setEventsLoading(false);
  }, []);

  const checkIn = useCallback(async () => {
    if (!selected) return;
    setChecking(true);
    setCheckedMsg('');
    const { error: err } = await supabase
      .from('learning_presence')
      .update({ checked_by: profile?.id || null, checked_at: new Date().toISOString() })
      .eq('student_id', selected.student_id);
    setChecking(false);
    if (err) {
      setCheckedMsg(`Failed: ${err.message}`);
    } else {
      setCheckedMsg('Checked in — the student has been notified.');
      setSelected({ ...selected, checked_by: profile?.id || null, checked_at: new Date().toISOString() });
      fetchPresence();
      if (checkedMsgTimer.current) clearTimeout(checkedMsgTimer.current);
      checkedMsgTimer.current = setTimeout(() => setCheckedMsg(''), 6000);
    }
  }, [selected, profile?.id, fetchPresence]);

  const refreshing = loading;
  const total = counts.green + counts.yellow + counts.red;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
            <Users size={16} />
            <span>Studying now</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{total}</p>
        </div>
        {(['green', 'yellow', 'red'] as PresenceStatus[]).map((s) => (
          <div key={s} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[s].dot}`} />
              <span>{STATUS_META[s].label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{counts[s]}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PresenceStatus | 'all')}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="red">Left / Suspicious</option>
            <option value="yellow">Idle</option>
            <option value="green">Active</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PresenceActivityType | 'all')}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All activity</option>
            {(Object.keys(ACTIVITY_LABELS) as PresenceActivityType[]).map((t) => (
              <option key={t} value={t}>{ACTIVITY_LABELS[t]}</option>
            ))}
          </select>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All classes</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Radio size={14} className={refreshing ? 'text-emerald-500 animate-pulse' : 'text-emerald-500'} />
            Live
          </span>
          <span>Updated {timeAgo(now - lastFetchRef.current)}</span>
          <button
            onClick={() => { setLoading(true); fetchPresence(); fetchStudents(); }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh now"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-4 py-3">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Roster */}
      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : decorated.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          <Activity size={32} className="mx-auto mb-3" />
          <p className="font-medium">No students studying right now</p>
          <p className="text-sm">Students appear here in real time when they open a video lesson or study notes.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 hidden md:table-cell">Class</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Activity</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Now studying</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Signals</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Last heartbeat</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {decorated.map((d) => (
                  <tr
                    key={d.row.student_id}
                    onClick={() => openDetail(d)}
                    className="border-b border-slate-100 dark:border-slate-700/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_META[d.status].dot}`} title={STATUS_META[d.status].label} />
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{d.name}</p>
                          {d.row.checked_at && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={11} /> Checked in {timeAgo(now - new Date(d.row.checked_at).getTime())}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_META[d.status].chip}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[d.status].dot}`} />
                        {STATUS_META[d.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600 dark:text-slate-300">{d.class_name}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600 dark:text-slate-300">
                      {ACTIVITY_LABELS[(d.row.activity_type as PresenceActivityType) || 'video']}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-slate-600 dark:text-slate-300 max-w-[220px] truncate">{d.row.content_title || '—'}</p>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {d.signals.length > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                          {d.signals.map((t) => SIGNAL_LABELS[t as keyof typeof SIGNAL_LABELS]).join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500 dark:text-slate-400">{timeAgo(d.ageMs)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">View</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSelected(null)} />
      )}
      {selected && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white">Student Detail</h2>
            <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {(() => {
              const info = students.get(selected.student_id);
              const st = deriveStatus(selected, now);
              const age = lastHeartbeatAge(selected, now);
              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold ${STATUS_META[st].dot}`}>
                      {(info?.name || 'S').split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{info?.name || selected.content_title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{info?.class_name || '—'}</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${STATUS_META[st].chip}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[st].dot}`} />
                    {STATUS_META[st].label}
                  </span>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Activity</p>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{ACTIVITY_LABELS[(selected.activity_type as PresenceActivityType) || 'video']}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Progress</p>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{typeof selected.progress === 'number' ? `${Math.round(selected.progress)}%` : '—'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Last heartbeat</p>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{age !== null ? timeAgo(age) : '—'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Studying since</p>
                      <p className="font-medium text-slate-800 dark:text-slate-100">{fmtTime(selected.started_at)}</p>
                    </div>
                  </div>

                  {selected.content_title && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Now studying</p>
                      <p className="text-sm text-slate-800 dark:text-slate-100">{selected.content_title}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Recent signals (last 60s)</p>
                    {recentSignalTypes(selected.signals).length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-slate-500">No suspicious signals.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {recentSignalTypes(selected.signals).map((t, i) => (
                          <li key={i} className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {SIGNAL_LABELS[t as keyof typeof SIGNAL_LABELS]}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Check-in</p>
                    {selected.checked_at ? (
                      <p className="text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle size={16} />
                        Checked in {timeAgo(now - new Date(selected.checked_at).getTime())}
                      </p>
                    ) : (
                      <button
                        onClick={checkIn}
                        disabled={checking}
                        className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
                      >
                        {checking ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                        Check on Student
                      </button>
                    )}
                    {checkedMsg && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{checkedMsg}</p>}
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <Clock size={14} />
                      <span>Activity timeline</span>
                    </div>
                    {eventsLoading ? (
                      <p className="text-sm text-slate-400">Loading...</p>
                    ) : events.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-slate-500">No activity recorded yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {events.map((ev) => (
                          <li key={ev.id} className="flex items-start gap-2 text-sm">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                            <div>
                              <p className="text-slate-700 dark:text-slate-200">
                                {EVT_LABELS[ev.event_type] || ev.event_type}
                                {ev.detail ? <span className="text-slate-400"> — {ev.detail}</span> : null}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(now - new Date(ev.created_at).getTime())}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </aside>
      )}
    </div>
  );
}
