'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, QrCode, Download, Printer, Calendar, UserCheck, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

export default function AdminStaffQRPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  useEffect(() => { generateDailyQR(); fetchAttendance(); }, [date]);

  async function fetchData() {
    const [staffRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, role').in('role', ['teacher', 'accountant']).order('first_name'),
      supabase.from('school_settings').select('*').limit(1).maybeSingle(),
    ]);
    if (staffRes.data) setStaff(staffRes.data);
    if (settingsRes.data) setSchoolSettings(settingsRes.data);
  }

  async function generateDailyQR() {
    setGenerating(true);
    const qrData = `STAFF_ATTENDANCE_${date}_${Date.now().toString(36).toUpperCase()}`;
    try {
      const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
      setQrCodeUrl(url);
    } catch { /* ignore */ }
    setGenerating(false);
  }

  async function fetchAttendance() {
    const { data } = await supabase.from('staff_attendance').select('*, staff:profiles(first_name, last_name)').eq('date', date).order('created_at', { ascending: false });
    if (data) setStaffAttendance(data);
  }

  async function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrCodeUrl) {
      const schoolName = schoolSettings?.school_name || 'Mastery Engine';
      printWindow.document.write(`<html><head><title>Print QR Code</title><style>body{margin:0;padding:40px;font-family:Arial,sans-serif}.container{text-align:center}.qr-container{border:2px solid #000;padding:30px;display:inline-block;border-radius:12px}h1{font-size:24px;margin-bottom:10px}p{margin:8px 0}@media print{body{margin:0}}</style></head><body><div class="container"><div class="qr-container"><h1>${schoolName}</h1><p><strong>Staff Attendance QR Code</strong></p><p>Date: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p><img src="${qrCodeUrl}" alt="QR Code" style="width:200px;height:200px;margin:20px 0;" /><p><strong>Display this QR for staff to scan</strong></p></div></div></body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  }

  const presentCount = staffAttendance.filter(a => a.status === 'present').length;
  const absentCount = staffAttendance.filter(a => a.status === 'absent').length;
  const lateCount = staffAttendance.filter(a => a.status === 'late').length;
  const presentRate = staffAttendance.length > 0 ? Math.round((presentCount / staffAttendance.length) * 100) : 0;

  return (
    <DashboardLayout title="Staff QR Attendance" subtitle="Generate and manage staff attendance QR codes">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Attendance QR</h1>
          <p className="text-slate-500 mt-1">Generate daily QR codes for staff attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><QrCode size={18} className="text-slate-400" />Daily QR Code</h2>
          <div className="mb-4"><label className="label">Select Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div>

          {generating ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div></div>
          ) : qrCodeUrl ? (
            <div className="text-center">
              <div className="bg-slate-50 rounded-xl p-8 mb-4 inline-block"><img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" /></div>
              <p className="text-sm text-slate-500 mb-4">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2"><Printer size={18} />Print QR</button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UserCheck size={18} className="text-slate-400" />Today&apos;s Attendance</h2>
            <span className="text-sm text-slate-500 flex items-center gap-1"><Calendar size={14} />{new Date(date).toLocaleDateString()}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-green-600">{presentCount}</p><p className="text-xs text-slate-600">Present</p></div>
            <div className="bg-red-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-red-600">{absentCount}</p><p className="text-xs text-slate-600">Absent</p></div>
            <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-600">{lateCount}</p><p className="text-xs text-slate-600">Late</p></div>
          </div>

          {staffAttendance.length === 0 ? (
            <div className="text-center py-8 text-slate-500"><UserCheck size={32} className="mx-auto mb-2 opacity-50" /><p>No attendance recorded yet</p></div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {staffAttendance.map(record => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">{record.staff?.first_name?.[0]}{record.staff?.last_name?.[0]}</div>
                    <div><p className="font-semibold text-slate-900 text-sm">{record.staff?.first_name} {record.staff?.last_name}</p><p className="text-xs text-slate-500">{record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : ''}</p></div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${record.status === 'present' ? 'bg-green-100 text-green-700' : record.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{record.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-bold text-slate-900 mb-2">How to use:</h3>
        <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1">
          <li>Select the date for the QR code</li>
          <li>Print the QR code and display it at the school entrance</li>
          <li>Staff scan the QR code using their device to mark attendance</li>
          <li>Monitor attendance in real-time from this page</li>
        </ol>
      </div>
    </DashboardLayout>
  );
}
