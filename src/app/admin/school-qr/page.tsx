'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, QrCode, Download, Printer, Eye, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';

export default function AdminSchoolQRPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrSize, setQrSize] = useState(500);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  useEffect(() => {
    if (schoolSettings) generateSchoolQR();
  }, [schoolSettings, qrSize]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
    if (data) setSchoolSettings(data);
    setLoading(false);
  }

  async function generateSchoolQR() {
    if (!schoolSettings) return;
    const schoolData = JSON.stringify({
      type: 'SCHOOL_ATTENDANCE',
      school: schoolSettings.school_name || 'Mastery Engine',
      schoolId: schoolSettings.id,
      address: schoolSettings.school_address || '',
      phone: schoolSettings.school_phone || '',
      email: schoolSettings.school_email || '',
      motto: schoolSettings.school_motto || '',
      version: '2.0',
      purpose: 'staff_daily_attendance'
    });
    try {
      const url = await QRCode.toDataURL(schoolData, { width: qrSize, margin: 3, color: { dark: '#1e3a5f', light: '#ffffff' } });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  }

  async function downloadPNG() {
    if (!qrCodeUrl || !schoolSettings) return;
    const link = document.createElement('a');
    link.download = `${(schoolSettings.school_name || 'school')}-qr-code.png`;
    link.href = qrCodeUrl;
    link.click();
  }

  async function downloadPDF() {
    if (!qrCodeUrl || !schoolSettings) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const schoolName = schoolSettings.school_name || 'Mastery Engine';
    
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(schoolName, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('School Identity QR Code', pageWidth / 2, 30, { align: 'center' });
    
    if (schoolSettings.school_address) {
      doc.setFontSize(10);
      doc.text(schoolSettings.school_address, pageWidth / 2, 38, { align: 'center' });
    }

    const qrImage = qrCodeUrl;
    const qrSizeMM = 100;
    const qrX = (pageWidth - qrSizeMM) / 2;
    doc.addImage(qrImage, 'PNG', qrX, 60, qrSizeMM, qrSizeMM);

    doc.setTextColor(30, 58, 95);
    doc.setFontSize(14);
    doc.text('Scan for School Information', pageWidth / 2, 175, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (schoolSettings.school_phone) doc.text(`Phone: ${schoolSettings.school_phone}`, pageWidth / 2, 185, { align: 'center' });
    if (schoolSettings.school_email) doc.text(`Email: ${schoolSettings.school_email}`, pageWidth / 2, 192, { align: 'center' });
    
    if (schoolSettings.school_motto) {
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 95);
      doc.text(`"${schoolSettings.school_motto}"`, pageWidth / 2, 202, { align: 'center' });
    }

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 280, { align: 'center' });

    doc.save(`${schoolName.replace(/\s+/g, '-')}-QR-Code.pdf`);
  }

  function handlePrint() {
    if (!qrCodeUrl || !schoolSettings) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const schoolName = schoolSettings.school_name || 'Mastery Engine';
    printWindow.document.write(`
      <html>
      <head>
        <title>Print QR Code - ${schoolName}</title>
        <style>
          body { margin: 0; padding: 40px; font-family: Arial, sans-serif; text-align: center; background: #f8fafc; }
          .card { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          h1 { color: #1e3a5f; margin: 0 0 10px 0; font-size: 28px; }
          .subtitle { color: #64748b; margin: 0 0 30px 0; font-size: 14px; }
          .qr-box { display: inline-block; padding: 20px; background: white; border: 3px solid #1e3a5f; border-radius: 12px; }
          img { width: 300px; height: 300px; }
          .info { margin-top: 30px; color: #64748b; font-size: 13px; line-height: 1.8; }
          .motto { margin-top: 20px; font-style: italic; color: #1e3a5f; font-size: 14px; }
          .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; }
          @media print { body { background: white; padding: 20px; } .card { box-shadow: none; } }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>${schoolName}</h1>
          ${schoolSettings.school_address ? `<p class="subtitle">${schoolSettings.school_address}</p>` : ''}
          <div class="qr-box">
            <img src="${qrCodeUrl}" alt="School QR Code" />
          </div>
          <p class="subtitle" style="margin-top: 20px; font-weight: bold; color: #1e3a5f;">Scan for School Information</p>
          <div class="info">
            ${schoolSettings.school_phone ? `<div>Phone: ${schoolSettings.school_phone}</div>` : ''}
            ${schoolSettings.school_email ? `<div>Email: ${schoolSettings.school_email}</div>` : ''}
          </div>
          ${schoolSettings.school_motto ? `<p class="motto">"${schoolSettings.school_motto}"</p>` : ''}
          <p class="footer">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  if (loading) {
    return (
      <DashboardLayout title="School QR Code" subtitle="Generate and download the school identity QR code">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="School QR Code" subtitle="Generate and download the school identity QR code">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">School QR Code</h1>
            <p className="text-slate-500 mt-1">Generate and download the school identity QR code</p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <QrCode size={18} className="text-slate-400" />
            School Identity QR
          </h2>

          {qrCodeUrl ? (
            <div className="text-center">
              <div className="bg-white rounded-xl p-8 mb-6 inline-block border-2 border-slate-200">
                <img src={qrCodeUrl} alt="School QR Code" className="w-64 h-64" />
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">{schoolSettings?.school_name || 'Mastery Engine'}</h3>
                {schoolSettings?.school_address && <p className="text-slate-500 text-sm">{schoolSettings.school_address}</p>}
                {schoolSettings?.school_motto && <p className="text-primary-600 italic text-sm mt-1">&ldquo;{schoolSettings.school_motto}&rdquo;</p>}
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={downloadPNG} className="btn-primary flex items-center gap-2">
                  <Download size={18} /> Download PNG
                </button>
                <button onClick={downloadPDF} className="btn-outline flex items-center gap-2">
                  <Download size={18} /> Download PDF
                </button>
                <button onClick={handlePrint} className="btn-outline flex items-center gap-2">
                  <Printer size={18} /> Print
                </button>
                <button onClick={() => setShowPreview(true)} className="btn-outline flex items-center gap-2">
                  <Eye size={18} /> Preview
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary-600 border-t-transparent"></div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">QR Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="label">QR Size</label>
                <select value={qrSize} onChange={(e) => setQrSize(Number(e.target.value))} className="input">
                  <option value={300}>Small (300x300)</option>
                  <option value={500}>Medium (500x500)</option>
                  <option value={800}>Large (800x800)</option>
                  <option value={1000}>Extra Large (1000x1000)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-slate-900 mb-4">School Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{schoolSettings?.school_name || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium">{schoolSettings?.school_address || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{schoolSettings?.school_phone || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{schoolSettings?.school_email || 'N/A'}</span></div>
            </div>
          </div>

          <div className="card bg-primary-50 border-primary-200">
            <h3 className="font-bold text-slate-900 mb-2">Usage</h3>
            <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
              <li>Print and display at school entrance</li>
              <li>Include in official documents</li>
              <li>Share on school website</li>
              <li>Use for staff attendance scanning</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">QR Code Preview</h3>
              <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-6 text-white">
                <h3 className="text-xl font-bold mb-1">{schoolSettings?.school_name || 'Mastery Engine'}</h3>
                {schoolSettings?.school_address && <p className="text-primary-200 text-sm">{schoolSettings.school_address}</p>}
                <div className="mt-4 inline-block bg-white rounded-lg p-3">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="QR" className="w-40 h-40" />}
                </div>
                {schoolSettings?.school_motto && <p className="text-primary-200 italic text-sm mt-4">&ldquo;{schoolSettings.school_motto}&rdquo;</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowPreview(false)} className="btn-ghost">Close</button>
              <button onClick={handlePrint} className="btn-primary flex items-center gap-2"><Printer size={18} />Print</button>
            </div>
          </div>
        </div>
        )}
    </div>
  </DashboardLayout>
  );
}
