'use client';

import { useState } from 'react';
import { Download, Upload, FileText, Table, FileSpreadsheet, File as FileDoc, Printer } from 'lucide-react';

export default function ImportExportPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportData = (format: 'csv' | 'pdf' | 'doc') => {
    setExporting(true);
    setTimeout(() => setExporting(false), 2000);
  };

  const getExportFormat = (format: string): 'csv' | 'pdf' | 'doc' => {
    if (format === 'csv' || format === 'pdf' || format === 'doc') return format;
    return 'csv';
  };

  const importData = (type: string) => {
    setImporting(true);
    setTimeout(() => setImporting(false), 2000);
  };

  const importExportOptions = [
    { title: 'Students', description: 'Bulk import students from CSV', exportFormats: ['CSV', 'PDF', 'Excel'], icon: '👨‍🎓' },
    { title: 'Teachers', description: 'Export teacher data', exportFormats: ['CSV', 'PDF'], icon: '👩‍🏫' },
    { title: 'Results', description: 'Export exam results', exportFormats: ['CSV', 'PDF', 'Excel'], icon: '📊' },
    { title: 'Attendance', description: 'Export attendance records', exportFormats: ['CSV', 'PDF'], icon: '✅' },
    { title: 'Invoices', description: 'Export financial records', exportFormats: ['CSV', 'PDF', 'Doc'], icon: '💰' },
    { title: 'ID Cards', description: 'Generate ID cards batch', exportFormats: ['PDF'], icon: '🪪' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Import / Export</h1><p className="text-slate-500">Import and export data in various formats</p></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {importExportOptions.map((item, index) => (
          <div key={index} className="bg-white rounded-xl shadow-md p-6">
            <div className="text-4xl mb-4">{item.icon}</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">{item.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{item.description}</p>
            
            <div className="space-y-2">
              <button onClick={() => importData(item.title)} className="w-full btn-outline flex items-center justify-center gap-2" disabled={importing}>
                <Upload size={16} />Import {importing ? '...' : ''}
              </button>
              <div className="flex gap-2">
                {item.exportFormats.map(format => (
                  <button key={format} onClick={() => exportData(getExportFormat(format))} className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1" disabled={exporting}>
                    {format === 'CSV' ? <Table size={14} /> : format === 'PDF' ? <FileDoc size={14} /> : <FileSpreadsheet size={14} />}
                    {exporting ? '...' : format}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Import Student Template</h2>
        <p className="text-sm text-slate-500 mb-4">Download the CSV template to import students in bulk</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-slate-800 mb-2">Required Columns</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>first_name / last_name</li>
              <li>email (unique)</li>
              <li>phone</li>
              <li>class_name</li>
              <li>gender</li>
              <li>date_of_birth</li>
            </ul>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-medium text-slate-800 mb-2">Optional Columns</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>address</li>
              <li>guardian_name</li>
              <li>guardian_phone</li>
              <li>blood_group</li>
              <li>emergency_contact</li>
            </ul>
          </div>
        </div>
        
        <button className="btn-primary mt-4 flex items-center gap-2">
          <Download size={18} />Download Template
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Export</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['All Students', 'All Teachers', 'All Results', 'Full Report'].map(label => (
            <button key={label} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 text-center">
              <Printer className="mx-auto mb-2 text-blue-600" size={20} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}