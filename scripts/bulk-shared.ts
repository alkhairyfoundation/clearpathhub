export function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

export function normalizeGender(v: unknown): string | null {
  const g = str(v);
  if (!g) return null;
  const lower = g.toLowerCase();
  if (lower === 'm' || lower === 'male') return 'male';
  if (lower === 'f' || lower === 'female') return 'female';
  if (lower === 'o' || lower === 'other') return 'other';
  return lower;
}

export const CSV_HEADERS = [
  'first_name', 'last_name', 'email', 'password', 'class_name',
  'gender', 'date_of_birth', 'phone', 'address',
  'guardian_name', 'guardian_phone', 'guardian_email',
  'blood_group', 'emergency_contact', 'admission_number', 'parent_email',
];

export function generateTemplateCsv(): string {
  const sample = [
    'John', 'Doe', 'john@example.com', 'password123', 'SS 1',
    'male', '2010-05-15', '08012345678', '123 Main St',
    'John Sr', '08098765432', 'john.sr@example.com',
    'O+', '0801112222', '', '',
  ];
  return CSV_HEADERS.join(',') + '\n' + sample.join(',') + '\n';
}

export function parseCsv(text: string): { rows: any[]; errors: string[] } {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['CSV must have a header row and at least one data row'] };
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows: any[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
    if (!row.first_name || !row.last_name || !row.email || !row.password) {
      errors.push(`Row ${i}: Missing required fields (first_name, last_name, email, password)`);
    }
  }
  return { rows, errors };
}