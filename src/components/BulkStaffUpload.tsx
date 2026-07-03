import { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle, Check, Loader2, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

interface CsvRow {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: string;
  department_name: string;
  designation: string;
  phone: string;
  salary: string;
  date_of_employment: string;
  staff_id: string;
  employee_id: string;
}

interface ImportResult {
  row: number;
  success: boolean;
  email?: string;
  staff_id?: string;
  error?: string;
}

const CSV_HEADERS = [
  'first_name', 'last_name', 'email', 'password', 'role',
  'department_name', 'designation', 'phone', 'salary',
  'date_of_employment', 'staff_id', 'employee_id',
];

const TEMPLATE_SAMPLE = [
  'Jane', 'Smith', 'jane@school.com', 'password123', 'teacher',
  'Science', 'Senior Teacher', '08098765432', '150000',
  '2026-01-15', 'TCH001', 'EMP00001',
];

function generateTemplateCsv(): string {
  return CSV_HEADERS.join(',') + '\n' + TEMPLATE_SAMPLE.join(',') + '\n';
}

function parseCsv(text: string): { rows: CsvRow[]; errors: string[] } {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ['CSV must have a header row and at least one data row'] };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row as CsvRow);

    if (!row.first_name || !row.last_name || !row.email || !row.password) {
      errors.push(`Row ${i}: Missing required fields (first_name, last_name, email, password)`);
    }
    if (row.role && !['teacher', 'accountant', 'admin'].includes(row.role.toLowerCase())) {
      errors.push(`Row ${i}: Role must be teacher, accountant, or admin (got "${row.role}")`);
    }
  }

  return { rows, errors };
}

export default function BulkStaffUpload({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'results'>('upload');
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [apiError, setApiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep('upload');
    setRows([]);
    setParseErrors([]);
    setResults([]);
    setApiError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function downloadTemplate() {
    const blob = new Blob([generateTemplateCsv()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff_upload_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setParseErrors(['Please select a .csv file']);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { rows: parsed, errors } = parseCsv(text);
      setRows(parsed);
      setParseErrors(errors);
      if (parsed.length > 0) setStep('preview');
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setStep('importing');
    setApiError('');

    try {
      const res = await fetch('/api/staff/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff: rows }),
      });

      const data = await res.json();
      if (!data.success) {
        setApiError(data.error || 'Import failed');
        setStep('upload');
        return;
      }

      setResults(data.results);
      setStep('results');
      if (onSuccess && data.totalSuccess > 0) onSuccess(data.totalSuccess);
    } catch (err: any) {
      setApiError(err.message);
      setStep('upload');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Bulk Import Staff</h3>
            <p className="text-sm text-slate-500 mt-1">Upload a CSV file to create multiple teachers, accountants, or admins at once</p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {step === 'upload' && (
            <>
              <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                <p className="text-sm text-primary-700">
                  <strong>Required columns:</strong> first_name, last_name, email, password, role
                </p>
                <p className="text-sm text-primary-600 mt-1">
                  <strong>Role must be:</strong> teacher, accountant, or admin
                </p>
                <p className="text-sm text-primary-600 mt-1">
                  <strong>Optional columns:</strong> department_name, designation, phone, salary, date_of_employment, staff_id, employee_id
                </p>
              </div>

              <button onClick={downloadTemplate} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2 text-sm">
                <Download size={16} /> Download CSV Template
              </button>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all"
              >
                <Upload size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="font-medium text-slate-600">Click to select CSV file</p>
                <p className="text-sm text-slate-400 mt-1">.csv files only, max 200 rows</p>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              </div>

              {parseErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-700 mb-1">Validation Errors:</p>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={12} /> {err}</p>
                  ))}
                </div>
              )}

              {apiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-center gap-2"><AlertCircle size={16} /> {apiError}</p>
                </div>
              )}
            </>
          )}

          {step === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  <FileText size={16} className="inline mr-1" />
                  {rows.length} staff member{rows.length !== 1 ? 's' : ''} detected
                </p>
                <button onClick={() => { reset(); }} className="text-sm text-primary-600 hover:underline">Choose different file</button>
              </div>

              {parseErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 mb-1">Warnings:</p>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-600">{err}</p>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">#</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Name</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Email</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{row.first_name} {row.last_name}</td>
                        <td className="py-2 px-3 text-slate-600">{row.email}</td>
                        <td className="py-2 px-3"><span className="text-xs px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">{row.role}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">
                    ...and {rows.length - 10} more row{rows.length - 10 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 size={40} className="mx-auto text-primary-600 animate-spin mb-4" />
              <p className="font-medium text-slate-700">Importing {rows.length} staff member{rows.length !== 1 ? 's' : ''}...</p>
              <p className="text-sm text-slate-500 mt-1">Creating accounts and profiles. This may take a moment.</p>
            </div>
          )}

          {step === 'results' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <Check size={24} className="mx-auto text-emerald-600 mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{results.filter(r => r.success).length}</p>
                  <p className="text-xs text-emerald-600">Imported</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                  <AlertCircle size={24} className="mx-auto text-red-600 mb-1" />
                  <p className="text-2xl font-bold text-red-700">{results.filter(r => !r.success).length}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
              </div>

              {results.filter(r => !r.success).length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 mb-2">Failed Rows:</p>
                  {results.filter(r => !r.success).map(r => (
                    <p key={r.row} className="text-xs text-red-600 mb-1">
                      Row {r.row} ({r.email}): {r.error}
                    </p>
                  ))}
                </div>
              )}

              {results.filter(r => r.success).length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-emerald-700 mb-2">Created Staff (first 10):</p>
                  {results.filter(r => r.success).slice(0, 10).map(r => (
                    <p key={r.row} className="text-xs text-emerald-600 mb-1">
                      Row {r.row}: {r.email} — {r.staff_id}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 flex gap-3">
          {step === 'upload' && (
            <button onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="btn-ghost flex-1">Back</button>
              <button onClick={handleImport} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Import {rows.length} Staff Member{rows.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {(step === 'results' || step === 'importing') && (
            <button onClick={handleClose} className="btn-primary flex-1">
              {step === 'results' ? 'Done' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
