const BOM = '\uFEFF';

export function csvCell(value: unknown): string {
  let s: string;
  if (value === null || value === undefined) s = '';
  else if (value instanceof Date) s = value.toISOString();
  else if (typeof value === 'object') s = JSON.stringify(value);
  else s = String(value);

  if (s.includes('"')) s = s.replace(/"/g, '""');
  return `"${s}"`;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [headers.map(csvCell).join(',')];
  for (const row of rows) lines.push(row.map(csvCell).join(','));
  return BOM + lines.join('\r\n');
}

export function buildCsvFromRecords(records: Record<string, unknown>[], columns?: string[]): string {
  if (records.length === 0) return BOM;
  const cols = columns && columns.length > 0 ? columns : Object.keys(records[0]);
  return buildCsv(cols, records.map(r => cols.map(c => r[c])));
}

export function csvFilename(parts: (string | null | undefined)[]): string {
  const base = parts
    .filter((p): p is string => !!p && p.trim().length > 0)
    .map(p => p.trim())
    .join('_')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();
  return `${base || 'export'}.csv`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function weekdayOf(date: string): string {
  const d = parseDateOnly(date);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function parseDateOnly(value: unknown): Date | null {
  const iso = toDateOnly(value);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateOnly(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? '' : toIsoDate(d);
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : toIsoDate(value);
  }
  return '';
}

export function todayLocal(): string {
  return toIsoDate(new Date());
}

export function weekdayIndex(date: unknown): number {
  const d = parseDateOnly(date);
  return d ? d.getDay() : -1;
}

const TIMESTAMP_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/;

export function parseStoredTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  const m = TIMESTAMP_RE.exec(raw);
  if (m) {
    const [, y, mo, d, h, mi, sec = '0', frac = ''] = m;
    const ms = Number(frac.slice(0, 3).padEnd(3, '0')) || 0;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec, ms));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const SCHOOL_DAYS = [1, 2, 3, 4, 5];

export function enumerateWeekdays(from: string, to: string, allowed?: number[]): string[] {
  const start = parseDateOnly(from);
  const finish = parseDateOnly(to);
  if (!start || !finish || start > finish) return [];
  const allow = new Set(allowed ?? SCHOOL_DAYS);
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= finish) {
    if (allow.has(cur.getDay())) out.push(toIsoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function minutesOfDay(value: unknown): number | null {
  const d = parseStoredTimestamp(value);
  if (!d) return null;
  return d.getHours() * 60 + d.getMinutes();
}

export function parseHhMm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!m) return null;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTimestamp(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const d = parseStoredTimestamp(value);
  if (!d) return String(value);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined): string {
  if (!p) return '';
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
}

export const SORT_KEYS = ['person', 'date', 'class', 'status'] as const;
export type AttendanceSortKey = (typeof SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';

export interface SortableAttendanceRow {
  key: string;
  personId: string;
  personName: string;
  admissionNumber: string;
  employeeId: string;
  className: string;
  date: string;
  status: string;
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function identityOf(row: SortableAttendanceRow): string {
  return row.admissionNumber || row.employeeId || row.personId || row.personName;
}

export function sortAttendanceRows<T extends SortableAttendanceRow>(
  rows: T[],
  sort: AttendanceSortKey = 'person',
  direction: SortDirection = 'asc',
): T[] {
  const dir = direction === 'desc' ? -1 : 1;
  const identity = identityOf;

  const weight = (row: T, k: AttendanceSortKey): string => {
    switch (k) {
      case 'date': return row.date;
      case 'class': return row.className;
      case 'status': return row.status;
      default: return identity(row);
    }
  };

  return [...rows].sort((a, b) => {
    const primary = collator.compare(weight(a, sort), weight(b, sort));
    if (primary !== 0) return primary * dir;

    if (sort !== 'class') {
      const byClass = collator.compare(a.className, b.className);
      if (byClass !== 0) return byClass * dir;
    }

    if (sort !== 'person') {
      const byIdentity = collator.compare(identity(a), identity(b));
      if (byIdentity !== 0) return byIdentity * dir;
    }

    const byDate = collator.compare(a.date, b.date);
    if (byDate !== 0) return byDate * dir;

    const byName = collator.compare(a.personName, b.personName);
    if (byName !== 0) return byName * dir;

    return collator.compare(a.key, b.key);
  });
}