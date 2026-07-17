import { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle, Check, Loader2, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: 'admin' | 'teacher';
  onSuccess?: (count: number) => void;
}

interface CsvRow {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  class_name: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  address: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  blood_group: string;
  emergency_contact: string;
}

interface ImportResult {
  row: number;
  success: boolean;
  email?: string;
  admission_number?: string;
  error?: string;
}

const CSV_HEADERS = [
  'first_name', 'last_name', 'email', 'password', 'class_name',
  'gender', 'date_of_birth', 'phone', 'address',
  'guardian_name', 'guardian_phone', 'guardian_email',
  'blood_group', 'emergency_contact',
];

const TEMPLATE_SAMPLE = [
  'John', 'Doe', 'john@example.com', 'password123', 'SS1-A',
  'M', '2010-05-15', '08012345678', '123 Main St',
  'John Sr', '08098765432', 'john.sr@example.com',
  'O+', '0801112222',
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
  }

  return { rows, errors };
}

export default function BulkStudentUpload({ isOpen, onClose, role, onSuccess }: Props) {
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
    a.download = 'student_upload_template.csv';
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
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: rows }),
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
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">Bulk Import Students</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Upload a CSV file to create multiple students at once</p>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
            <X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <>
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-900/40 dark:border-primary-900/40">
                <p className="text-sm text-primary-700 dark:text-primary-300 dark:text-primary-300">
                  <strong>Required columns:</strong> first_name, last_name, email, password
                </p>
                <p className="text-sm text-primary-600 dark:text-primary-400 dark:text-primary-400 mt-1">
                  <strong>Optional columns:</strong> class_name, gender, date_of_birth, phone, address, guardian_name, guardian_phone, guardian_email, blood_group, emergency_contact
                </p>
              </div>

              <button onClick={downloadTemplate} className="px-4 py-2 border border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 flex items-center gap-2 text-sm">
                <Download size={16} /> Download CSV Template
              </button>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 dark:border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20/30 transition-all"
              >
                <Upload size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="font-medium text-slate-600 dark:text-slate-400 dark:text-slate-400">Click to select CSV file</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">.csv files only, max 200 rows</p>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              </div>

              {parseErrors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 dark:text-red-400 mb-1">Validation Errors:</p>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400 dark:text-red-400 flex items-center gap-1"><AlertCircle size={12} /> {err}</p>
                  ))}
                </div>
              )}

              {apiError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400 dark:text-red-400 flex items-center gap-2"><AlertCircle size={16} /> {apiError}</p>
                </div>
              )}
            </>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">
                  <FileText size={16} className="inline mr-1" />
                  {rows.length} student{rows.length !== 1 ? 's' : ''} detected
                </p>
                <button onClick={() => { reset(); }} className="text-sm text-primary-600 dark:text-primary-400 dark:text-primary-400 hover:underline">Choose different file</button>
              </div>

              {parseErrors.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 dark:text-amber-300 mb-1">Warnings:</p>
                  {parseErrors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-600 dark:text-amber-400 dark:text-amber-400">{err}</p>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 dark:bg-slate-800">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400">#</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400">Name</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400">Email</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-400">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-700 dark:border-slate-700">
                        <td className="py-2 px-3 text-slate-400 dark:text-slate-500 dark:text-slate-500">{i + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white dark:text-white">{row.first_name} {row.last_name}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 dark:text-slate-400">{row.email}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 dark:text-slate-400">{row.class_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 dark:border-slate-700">
                    ...and {rows.length - 10} more row{rows.length - 10 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader2 size={40} className="mx-auto text-primary-600 dark:text-primary-400 dark:text-primary-400 animate-spin mb-4" />
              <p className="font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">Importing {rows.length} student{rows.length !== 1 ? 's' : ''}...</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Creating accounts and profiles. This may take a moment.</p>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'results' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-xl text-center">
                  <Check size={24} className="mx-auto text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 mb-1" />
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 dark:text-emerald-300">{results.filter(r => r.success).length}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">Imported</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-xl text-center">
                  <AlertCircle size={24} className="mx-auto text-red-600 dark:text-red-400 dark:text-red-400 mb-1" />
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400 dark:text-red-400">{results.filter(r => !r.success).length}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 dark:text-red-400">Failed</p>
                </div>
              </div>

              {results.filter(r => !r.success).length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 dark:text-red-400 mb-2">Failed Rows:</p>
                  {results.filter(r => !r.success).map(r => (
                    <p key={r.row} className="text-xs text-red-600 dark:text-red-400 dark:text-red-400 mb-1">
                      Row {r.row} ({r.email}): {r.error}
                    </p>
                  ))}
                </div>
              )}

              {results.filter(r => r.success).length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 mb-2">Created Students (first 10):</p>
                  {results.filter(r => r.success).slice(0, 10).map(r => (
                    <p key={r.row} className="text-xs text-emerald-600 dark:text-emerald-400 dark:text-emerald-400 mb-1">
                      Row {r.row}: {r.email} — {r.admission_number}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-700 dark:border-slate-700 flex gap-3">
          {step === 'upload' && (
            <button onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="btn-ghost flex-1">Back</button>
              <button onClick={handleImport} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Import {rows.length} Student{rows.length !== 1 ? 's' : ''}
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
