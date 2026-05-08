'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Printer, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

export default function StudentIDCardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    const { data } = await supabase.from('students').select('*, profile:profiles(*), class:classes(*)').eq('profile_id', profile?.id).maybeSingle();
    if (data) setStudent(data);
    if (data?.admission_number) {
      const qr = await QRCode.toDataURL(data.admission_number, { width: 150, margin: 1 });
      setQrCodeUrl(qr);
    }
  }

  async function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>ID Card</title><style>body{margin:0;padding:20px;font-family:Arial;}</style></head>
        <body>
          <div style="border:2px solid #b3922f;padding:20px;border-radius:12px;width:340px;text-align:center;">
            <h2 style="color:#b3922f;">ClearPath Edu Hub</h2>
            <p style="color:#666;">Student ID Card</p>
            <div style="width:100px;height:100px;background:#eee;margin:10px auto;border-radius:8px;display:flex;align-items:center;justify-content:center;">Photo</div>
            <h3 style="margin:10px 0;">${profile?.first_name} ${profile?.last_name}</h3>
            <p style="color:#666;">${student?.admission_number}</p>
            <p style="color:#666;">${student?.class?.name}</p>
            <div style="margin:15px 0;"><img src="${qrCodeUrl}" style="width:100px;height:100px;" /></div>
            <p style="font-size:12px;color:#999;">Scan for attendance</p>
          </div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <DashboardLayout title="My ID Card" subtitle="Digital ID card with QR code">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-800">My ID Card</h1><p className="text-slate-500">Digital ID card with QR code</p></div>
        
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white w-full max-w-sm">
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="text-xl font-bold">ClearPath Edu Hub</h3><p className="text-blue-200 text-sm">Student ID Card</p></div>
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center"><span className="text-blue-600 text-xs font-bold">Logo</span></div>
          </div>
          
          <div className="flex gap-4 mb-6">
            <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center"><span className="text-gray-400 text-xs">Photo</span></div>
            <div>
              <h4 className="font-bold text-lg">{profile?.first_name} {profile?.last_name}</h4>
              <p className="text-blue-200 text-sm">Admission: {student?.admission_number}</p>
              <p className="text-blue-200 text-sm">{student?.class?.name}</p>
              {student?.date_of_birth && <p className="text-blue-200 text-sm">DOB: {student.date_of_birth}</p>}
            </div>
          </div>

          <div className="flex justify-center mb-2">
            {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24" /> : <div className="w-24 h-24 bg-white rounded-lg"></div>}
          </div>
          <p className="text-center text-xs text-blue-200">Scan for attendance</p>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2"><Printer size={18} />Print ID Card</button>
      </div>
      </div>
    </DashboardLayout>
  );
}