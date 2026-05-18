'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Printer, QrCode, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function StudentIDCardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const initials = profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() : 'ST';
  const avatarUrl = student?.profile?.avatar_url || profile?.avatar_url;

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
      const photoImg = avatarUrl ? `<img src="${avatarUrl}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;" />` : '<div style="width:80px;height:80px;background:#ddd;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#999;">📷</div>';
      printWindow.document.write(`
        <html><head><title>ID Card</title><style>body{margin:0;padding:20px;font-family:Arial;}</style></head>
        <body>
          <div style="border:2px solid #b3922f;padding:20px;border-radius:12px;width:340px;text-align:center;">
            <h2 style="color:#b3922f;">ClearPath Edu Hub</h2>
            <p style="color:#666;">Student ID Card</p>
            <div style="width:80px;height:80px;margin:10px auto;">${photoImg}</div>
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

  async function exportAs(type: 'png' | 'pdf') {
    if (!cardRef.current) return;
    setExporting(type);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, allowTaint: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      if (type === 'png') {
        const link = document.createElement('a');
        link.download = `id_card_${student?.admission_number || 'student'}.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 3, canvas.height / 3] });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);
        pdf.save(`id_card_${student?.admission_number || 'student'}.pdf`);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
    }
    setExporting(null);
  }

  return (
    <DashboardLayout title="My ID Card" subtitle="Digital ID card with QR code">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-800">My ID Card</h1><p className="text-slate-500">Digital ID card with QR code</p></div>
        
        <div className="flex justify-center">
          <div ref={cardRef} className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white w-full max-w-sm">
          <div className="flex items-center justify-between mb-6">
            <div><h3 className="text-xl font-bold">ClearPath Edu Hub</h3><p className="text-blue-200 text-sm">Student ID Card</p></div>
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center"><span className="text-blue-600 text-xs font-bold">Logo</span></div>
          </div>
          
          <div className="flex gap-4 mb-6">
            <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-blue-600 text-lg font-bold">{initials}</span>
              )}
            </div>
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

      <div className="flex justify-center gap-4 flex-wrap">
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2"><Printer size={18} />Print ID Card</button>
        <button onClick={() => exportAs('png')} disabled={exporting !== null} className="btn-outline flex items-center gap-2">
          {exporting === 'png' ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          Download PNG
        </button>
        <button onClick={() => exportAs('pdf')} disabled={exporting !== null} className="btn-outline flex items-center gap-2">
          {exporting === 'pdf' ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
          Download PDF
        </button>
      </div>
      </div>
    </DashboardLayout>
  );
}
