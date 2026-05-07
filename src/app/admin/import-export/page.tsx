'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Upload, FileText, Table, FileSpreadsheet, Printer, Loader2, CheckCircle, AlertCircle, Users, BookOpen, BarChart3, DollarSign, QrCode } from 'lucide-react';

export default function ImportExportPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0, results: 0, attendance: 0 });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchStats();
  }, [profile]);

  async function fetchStats() {
    const [studentsRes, teachersRes, resultsRes, attendanceRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'student'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'teacher'),
      supabase.from('results').select('id', { count: 'exact' }),
      supabase.from('attendance').select('id', { count: 'exact' }),
    ]);
    setStats({
      students: studentsRes.count || 0,
      teachers: teachersRes.count || 0,
      results: resultsRes.count || 0,
      attendance: attendanceRes.count || 0,
    });
  }

  async function handleExport(type: string, format: string) {
    setExporting(`${type}-${format}`);
    try {
      let data: any[] = [];
      switch (type) {
        case 'Students': data = (await supabase.from('profiles').select('*').eq('role', 'student')).data || []; break;
        case 'Teachers': data = (await supabase.from('profiles').select('*').eq('role', 'teacher')).data || []; break;
        case 'Results': data = (await supabase.from('results').select('*, student:profiles(first_name, last_name), subject:subjects(name)')).data || []; break;
        case 'Attendance': data = (await supabase.from('attendance').select('*, student:profiles(first_name, last_name)')).data || []; break;
        case 'Invoices': data = (await supabase.from('invoices').select('*')).data || []; break;
      }

      if (format === 'CSV') {
        if (data.length === 0) { alert('No data to export'); setExporting(null); return; }
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v || '')).join(',')).join('\n');
        const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${type.toLowerCase()}_export.csv`; a.click();
        URL.revokeObjectURL(url);
      } else {
        alert(`${format} export will be available in a future update. CSV export is ready now.`);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Please try again.');
    }
    setExporting(null);
  }

  async function handleImport(type: string) {
    setImporting(type);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) { setImporting(null); return; }
      try {
        const text = await file.text();
        const lines = text.split('\n').filter((l: string) => l.trim());
        if (lines.length < 2) { alert('CSV file is empty or invalid'); setImporting(null); return; }

        const headers = lines[0].split(',').map((h: string) => h.trim());
        const rows = lines.slice(1).map((line: string) => {
          const values = line.split(',');
          const row: Record<string, string> = {};
          headers.forEach((h: string, i: number) => row[h] = (values[i] || '').trim());
          return row;
        });

        let successCount = 0;
        for (const row of rows) {
          if (type === 'Students' && row.first_name && row.last_name && row.email) {
            const { error } = await supabase.from('profiles').insert({
              id: crypto.randomUUID(), first_name: row.first_name, last_name: row.last_name,
              email: row.email, phone: row.phone || '', role: 'student', is_active: true,
            });
            if (!error) successCount++;
          }
        }

        setImportSuccess(`Successfully imported ${successCount}/${rows.length} ${type.toLowerCase()}`);
        fetchStats();
        setTimeout(() => setImportSuccess(null), 5000);
      } catch (err) {
        console.error('Import error:', err);
        alert('Import failed. Please check your CSV format.');
      }
      setImporting(null);
    };
    input.click();
  }

  const exportItems = [
    { title: 'Students', description: `${stats.students} records`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100', formats: ['CSV'] },
    { title: 'Teachers', description: `${stats.teachers} records`, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100', formats: ['CSV'] },
    { title: 'Results', description: `${stats.results} records`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100', formats: ['CSV'] },
    { title: 'Attendance', description: `${stats.attendance} records`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', formats: ['CSV'] },
    { title: 'Invoices', description: 'Financial records', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-100', formats: ['CSV'] },
    { title: 'ID Cards', description: 'Generate batch PDF', icon: QrCode, color: 'text-slate-600', bg: 'bg-slate-100', formats: ['PDF'] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Import / Export</h1>
          <p className="text-slate-500 mt-1">Bulk data operations and report generation</p>
        </div>
      </div>

      {importSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-slide-down">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-green-700 font-medium">{importSuccess}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exportItems.map((item, i) => (
          <div key={i} className="card">
            <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3`}><item.icon size={20} className={item.color} /></div>
            <h3 className="font-bold text-slate-900">{item.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{item.description}</p>
            <div className="space-y-2">
              <button onClick={() => handleImport(item.title)} disabled={importing === item.title} className="w-full btn-outline flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                <Upload size={16} />{importing === item.title ? 'Importing...' : 'Import CSV'}
              </button>
              <div className="flex gap-2">
                {item.formats.map(format => (
                  <button key={format} onClick={() => handleExport(item.title, format)} disabled={exporting === `${item.title}-${format}`} className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1 disabled:opacity-50">
                    {format === 'CSV' ? <Table size={14} /> : <FileDoc size={14} />}{exporting === `${item.title}-${format}` ? '...' : format}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><FileText size={18} className="text-slate-400" />Student Import Template</h2>
        <p className="text-sm text-slate-500 mb-4">Download the CSV template and fill in student data for bulk import</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-4 bg-blue-50 rounded-xl"><h3 className="font-semibold text-slate-900 mb-2 text-sm">Required Fields</h3><ul className="text-sm text-slate-600 space-y-1"><li>first_name</li><li>last_name</li><li>email (must be unique)</li></ul></div>
          <div className="p-4 bg-green-50 rounded-xl"><h3 className="font-semibold text-slate-900 mb-2 text-sm">Optional Fields</h3><ul className="text-sm text-slate-600 space-y-1"><li>phone</li><li>address</li><li>date_of_birth</li><li>gender</li></ul></div>
        </div>
        <button onClick={() => {
          const headers = 'first_name,last_name,email,phone,address,date_of_birth,gender';
          const sample = 'John,Doe,john@example.com,08012345678,Lagos,2010-05-15,M';
          const blob = new Blob([`${headers}\n${sample}`], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'student_import_template.csv'; a.click();
          URL.revokeObjectURL(url);
        }} className="btn-primary flex items-center gap-2"><Download size={18} />Download Template</button>
      </div>
    </div>
  );
}

function FileDoc(props: any) { return <FileText {...props} />; }
