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
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

export function enumerateWeekdays(from: string, to: string): string[] {
  if (!from || !to || from > to) return [];
  const out: string[] = [];
  const end = new Date(`${to}T00:00:00`);
  const cur = new Date(`${from}T00:00:00`);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) out.push(toIsoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
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