'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, Download, Printer, X, QrCode, Loader2, Users, Filter, Eye } from 'lucide-react';
import QRCode from 'qrcode';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminIDCardsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showCard, setShowCard] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile, selectedClass]);

  async function fetchData() {
    setLoading(true);
    const [studentsRes, classesRes, settingsRes] = await Promise.all([
      supabase.from('students').select('*, profile:profiles(first_name, last_name, email, phone), class:classes(name)').order('admission_number'),
      supabase.from('classes').select('id, name').order('level'),
      supabase.from('school_settings').select('*').limit(1).maybeSingle(),
    ]);
    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    if (settingsRes.data) setSchoolSettings(settingsRes.data);
    setLoading(false);
  }

  const filtered = students.filter(s =>
    `${s.profile?.first_name} ${s.profile?.last_name} ${s.admission_number}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedClass === 'all' || s.class_id === selectedClass)
  );

  async function generateQR(admissionNumber: string): Promise<string> {
    try { return await QRCode.toDataURL(admissionNumber, { width: 200, margin: 2 }); } catch { return ''; }
  }

  async function handleShowCard(student: any) {
    setSelectedStudent(student);
    setGenerating(true);
    const qr = await generateQR(student.admission_number);
    setQrCodeUrl(qr);
    setShowCard(true);
    setGenerating(false);
  }

  async function handlePrint() {
    const printContent = document.getElementById('id-card-content');
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Print ID Card</title><style>body{margin:0;padding:20px;font-family:Arial,sans-serif}.card{border:1px solid #ccc;padding:20px;border-radius:8px;width:340px}@media print{body{margin:0}}</style></head><body>${printContent.innerHTML}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  }

  async function handleBulkPrint() {
    if (filtered.length === 0) return;
    for (const student of filtered.slice(0, 10)) {
      handleShowCard(student);
      await new Promise(r => setTimeout(r, 1000));
      handlePrint();
    }
  }

  return (
    <DashboardLayout title="Student ID Cards" subtitle="Generate and print student ID cards">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Student ID Cards</h1>
            <p className="text-slate-500 mt-1">{students.length} students eligible for ID cards</p>
          </div>
          {filtered.length > 0 && <button onClick={handleBulkPrint} className="btn-outline flex items-center gap-2"><Printer size={18} /> Bulk Print</button>}
        </div>

        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Search by name or admission #..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-10" />
            </div>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="input sm:w-48">
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No students found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(student => (
              <div key={student.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{student.profile?.first_name} {student.profile?.last_name}</h3>
                    <p className="text-sm text-slate-500">{student.class?.name || 'No Class'}</p>
                  </div>
                  <button onClick={() => handleShowCard(student)} disabled={generating} className="p-2 hover:bg-gray-100 rounded-lg">
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} className="text-slate-500" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-mono">{student.admission_number}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCard && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">ID Card - {selectedStudent.profile?.first_name}</h3>
                <button onClick={() => setShowCard(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button>
              </div>
              <div className="p-5">
                <div id="id-card-content" className="border-2 border-slate-200 rounded-xl p-6 bg-white">
                  <div className="text-center mb-4">
                    <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-2" />
                    <h3 className="font-bold text-lg">{selectedStudent.profile?.first_name} {selectedStudent.profile?.last_name}</h3>
                    <p className="text-sm text-slate-500">{selectedStudent.class?.name}</p>
                    <p className="text-xs text-slate-400 mt-1">Adm #: {selectedStudent.admission_number}</p>
                  </div>
                  {schoolSettings && (
                    <div className="text-center pt-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400">{schoolSettings.school_name}</p>
                      <p className="text-xs text-slate-400">{schoolSettings.address}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
                <button onClick={() => setShowCard(false)} className="btn-ghost">Close</button>
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2"><Printer size={16} />Print Card</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
