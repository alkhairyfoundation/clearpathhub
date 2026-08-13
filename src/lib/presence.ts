export type PresenceStatus = 'green' | 'yellow' | 'red';
export type PresenceActivityType = 'video' | 'notes' | 'quiz' | 'other';

export type PresenceSignalType =
  | 'idle'
  | 'tab_hidden'
  | 'tab_switch'
  | 'fullscreen_exit'
  | 'paused';

export interface PresenceSignal {
  t: PresenceSignalType;
  ts: number;
  detail?: string;
}

export interface PresenceRow {
  student_id: string;
  activity_type?: PresenceActivityType | null;
  content_id?: string | null;
  content_title?: string | null;
  progress?: number | null;
  signals?: PresenceSignal[] | null;
  client_id?: string | null;
  last_heartbeat_at?: string | null;
  started_at?: string | null;
  checked_by?: string | null;
  checked_at?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  class_id?: string | null;
  class_name?: string | null;
}

export const HEARTBEAT_MS = 30_000;
export const POLL_MS = 12_000;
export const ONLINE_AFTER_MS = 90_000;
export const IDLE_AFTER_MS = 60_000;
export const SIGNAL_WINDOW_MS = 60_000;
export const MAX_SIGNALS = 12;

export function toMs(value: string | number): number {
  return typeof value === 'number' ? value : new Date(value).getTime();
}

export function lastHeartbeatAge(row: Pick<PresenceRow, 'last_heartbeat_at'>, now: number = Date.now()): number | null {
  if (!row.last_heartbeat_at) return null;
  const age = now - toMs(row.last_heartbeat_at);
  return Number.isFinite(age) ? age : null;
}

export function recentSignals(
  signals: PresenceSignal[] | null | undefined,
  now: number = Date.now(),
  windowMs: number = SIGNAL_WINDOW_MS
): PresenceSignal[] {
  if (!signals || signals.length === 0) return [];
  return signals.filter((s) => now - s.ts <= windowMs);
}

export function deriveStatus(row: Pick<PresenceRow, 'last_heartbeat_at' | 'signals'>, now: number = Date.now()): PresenceStatus {
  const age = lastHeartbeatAge(row, now);
  if (age === null || age >= ONLINE_AFTER_MS) return 'red';

  const sigs = recentSignals(row.signals, now);
  const redCount = sigs.filter((s) => s.t === 'tab_switch' || s.t === 'fullscreen_exit').length;
  if (redCount >= 2) return 'red';
  if (sigs.some((s) => s.t === 'tab_hidden')) return 'red';

  if (age >= IDLE_AFTER_MS) return 'yellow';
  if (sigs.some((s) => s.t === 'idle')) return 'yellow';

  return 'green';
}

export function addSignal(
  signals: PresenceSignal[],
  t: PresenceSignalType,
  detail?: string,
  ts: number = Date.now(),
  max: number = MAX_SIGNALS
): PresenceSignal[] {
  const next = [...(signals || []), { t, ts, ...(detail ? { detail } : {}) }];
  return next.slice(-max);
}

export const STATUS_META: Record<PresenceStatus, { label: string; dot: string; chip: string }> = {
  green: { label: 'Active', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  yellow: { label: 'Idle', dot: 'bg-amber-400', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  red: { label: 'Left / Suspicious', dot: 'bg-red-500', chip: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
};

export const SIGNAL_LABELS: Record<PresenceSignalType, string> = {
  idle: 'Idle / no activity',
  tab_hidden: 'Tab hidden while studying',
  tab_switch: 'Switched tabs',
  fullscreen_exit: 'Exited fullscreen',
  paused: 'Paused content',
};

export const ACTIVITY_LABELS: Record<PresenceActivityType, string> = {
  video: 'Video',
  notes: 'Notes',
  quiz: 'Quiz',
  other: 'Other',
};
