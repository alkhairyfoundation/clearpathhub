'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QrCode, Download, Printer, Calendar, UserCheck, Clock } from 'lucide-react';
import QRCode from 'qrcode';

export default function AdminStaffQRPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [todayQR, setTodayQR] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
  }, [profile]);

  useEffect(() => {
    generateDailyQR();
    fetchTodayAttendance();
  }, [date]);

  async function generateDailyQR() {
    setGenerating(true);
    const qrData = `STAFF_ATTENDANCE_${date}_${Math.random().toString(36).substring(7)}`;
    setTodayQR(qrData);
    
    try {
      const url = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
    setGenerating(false);
  }

  async function fetchTodayAttendance() {
    const { data } = await supabase
      .from('staff_attendance')
      .select('*, staff:profiles(*)')
      .eq('date', date)
      .order('created_at', { ascending: false });
    
    if (data) setStaffAttendance(data);
  }

  async function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrCodeUrl) {
      const formData = await supabase.from('school_settings').select('*').limit(1).single();
      const schoolName = formData.data?.school_name || 'ClearPath Edu Hub';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code</title>
            <style>
              body { margin: 0; padding: 40px; font-family: Arial, sans-serif; }
              .container { text-align: center; }
              .qr-container { border: 2px solid #000; padding: 20px; display: inline-block; }
              h1 { font-size: 24px; margin-bottom: 10px; }
              p { margin: 10px 0; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="qr-container">
                <h1>${schoolName}</h1>
                <p><strong>Staff Attendance QR Code</strong></p>
                <p>Date: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; margin: 20px 0;" />
                <p><strong>Download this QR and paste it for staff to scan</strong></p>
                <p>Staff can scan this QR to mark their daily attendance</p>
              </div>
              <p style="margin-top: 20px; font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  const presentCount = staffAttendance.filter(a => a.status === 'present').length;
  const absentCount = staffAttendance.filter(a => a.status === 'absent').length;
  const lateCount = staffAttendance.filter(a => a.status === 'late').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Staff Attendance QR</h1>
          <p className="text-slate-500">Generate daily QR code for staff attendance scanning</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Generate QR Code</h2>
          
          <div className="mb-6">
            <label className="label">Select Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>

          {generating ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : qrCodeUrl ? (
            <div className="text-center">
              <div className="bg-gray-50 rounded-xl p-8 mb-6">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Date: {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
                  <Printer size={18} />
                  Print QR Code
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Today&apos;s Attendance</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar size={16} />
              <span>{new Date(date).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              <div className="text-sm text-slate-600">Present</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              <div className="text-sm text-slate-600">Absent</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{lateCount}</div>
              <div className="text-sm text-slate-600">Late</div>
            </div>
          </div>

          <div className="space-y-2">
            {staffAttendance.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <UserCheck size={32} className="mx-auto mb-2 opacity-50" />
                <p>No attendance recorded yet</p>
              </div>
            ) : (
              staffAttendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">
                        {record.staff?.first_name?.[0]}{record.staff?.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {record.staff?.first_name} {record.staff?.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {record.marked_at ? new Date(record.marked_at).toLocaleTimeString() : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'present' ? 'bg-green-100 text-green-700' :
                    record.status === 'absent' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {record.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-slate-800 mb-2">How to use:</h3>
        <ol className="list-decimal list-inside text-slate-600 space-y-1">
          <li>Select the date you want to generate the QR code for</li>
          <li>Click &quot;Print QR Code&quot; to download/print the QR code</li>
          <li>Paste the QR code at a visible location in the school</li>
          <li>Staff members will scan this QR code to mark their daily attendance</li>
          <li>Alternatively, use the mobile app or camera to scan the QR code</li>
        </ol>
      </div>
    </div>
  );
}