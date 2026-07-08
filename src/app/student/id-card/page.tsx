'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Printer, QrCode, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

export default function StudentIDCardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [idCard, setIdCard] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [backRules, setBackRules] = useState('');
  const [qrFrontUrl, setQrFrontUrl] = useState('');
  const [qrBackUrl, setQrBackUrl] = useState('');
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);
  const [showBack, setShowBack] = useState(false);
  const initials = profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() : 'ST';
  const avatarUrl = student?.profile?.avatar_url || profile?.avatar_url;

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    const { data: studentData } = await supabase.from('students').select('*, profile:profiles(*), class:classes(*)').eq('profile_id', profile?.id).maybeSingle();
    if (studentData) {
      setStudent(studentData);
      const qr = await generateAttendanceQR(studentData.admission_number);
      const qrBack = await generateBackQR(studentData.admission_number);
      setQrFrontUrl(qr);
      setQrBackUrl(qrBack);
    }
    const { data: idCardData } = await supabase.from('id_cards').select('*').eq('student_id', profile?.id).maybeSingle();
    if (idCardData) setIdCard(idCardData);
    const { data: settings } = await supabase.from('school_settings').select('*').limit(1).maybeSingle();
    if (settings) {
      setSchoolSettings(settings);
      if (settings.id_card_config?.backRules) {
        setBackRules(settings.id_card_config.backRules);
      }
    }
  }

  async function generateAttendanceQR(admissionNumber: string): Promise<string> {
    const qrData = JSON.stringify({
      type: 'STUDENT_ATTENDANCE',
      admissionNumber,
      school: schoolSettings?.school_name || 'School',
    });
    try { return await QRCode.toDataURL(qrData, { width: 180, margin: 2, color: { dark: '#000000', light: '#ffffff' } }); }
    catch { return ''; }
  }

  async function generateBackQR(admissionNumber: string): Promise<string> {
    const qrData = JSON.stringify({
      type: 'ID_VERIFICATION',
      admissionNumber,
      school: schoolSettings?.school_name || 'School',
    });
    try { return await QRCode.toDataURL(qrData, { width: 120, margin: 2 }); }
    catch { return ''; }
  }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateStr || ''; }
  }

  async function handlePrint() {
    await generateQRs();
    const printWindow = window.open('', '_blank');
    if (!printWindow || !student) return;
    const photoHtml = avatarUrl
      ? `<img src="${avatarUrl}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #e2e8f0;" />`
      : `<div style="width:80px;height:80px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:bold;color:#94a3b8;">${initials}</div>`;
    const issueDate = idCard?.issued_at ? formatDate(idCard.issued_at) : '';
    const rulesHtml = backRules
      ? `<div style="margin-top:8px;font-size:11px;color:#475569;white-space:pre-wrap;text-align:left;">${backRules}</div>`
      : '<p style="font-size:11px;color:#94a3b8;text-align:center;">This ID card is non-transferable.</p>';
    printWindow.document.write(`
      <html><head><title>ID Card</title>
      <style>
        body{margin:0;padding:20px;font-family:Arial,sans-serif;background:#f1f5f9;}
        .card{width:320px;margin:20px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.15);border:1px solid #e2e8f0;}
        .card-header{background:#1e40af;color:white;padding:16px;text-align:center;}
        .card-body{padding:20px;text-align:center;}
        .back-card .card-header{background:#334155;}
        hr{border:none;border-top:1px solid #e2e8f0;margin:16px 0;}
      </style></head><body>
      <div class="card">
        <div class="card-header">
          <p style="margin:0;font-size:11px;opacity:0.9;">${schoolSettings?.school_name || 'School'}</p>
          <h3 style="margin:4px 0;font-size:18px;">STUDENT ID CARD</h3>
        </div>
        <div class="card-body">
          <div style="margin-bottom:12px;">${photoHtml}</div>
          <h2 style="margin:0;font-size:20px;">${student.profile?.first_name} ${student.profile?.last_name}</h2>
          <p style="margin:4px 0 8px;font-size:12px;color:#94a3b8;font-family:monospace;">Adm No: ${student.admission_number}</p>
          ${student.date_of_birth ? `<p style="margin:2px 0;font-size:12px;color:#64748b;">DOB: ${formatDate(student.date_of_birth)}</p>` : ''}
          ${issueDate ? `<p style="margin:2px 0;font-size:11px;color:#94a3b8;">Issued: ${issueDate}</p>` : ''}
          <img src="${qrFrontUrl}" style="width:110px;height:110px;margin-top:8px;" />
          <p style="margin:4px 0 0;font-size:10px;color:#94a3b8;">Scan to mark attendance</p>
        </div>
      </div>
      <div class="card back-card">
        <div class="card-header">
          <h3 style="margin:0;font-size:18px;">ID CARD RULES</h3>
        </div>
        <div class="card-body" style="text-align:left;">
          ${rulesHtml}
          <hr/>
          <div style="text-align:center;">
            <img src="${qrBackUrl}" style="width:80px;height:80px;" />
            <p style="font-size:10px;color:#94a3b8;">ID Verification Code</p>
          </div>
        </div>
      </div>
    </body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  async function generateQRs() {
    if (!student) return;
    if (!qrFrontUrl) {
      const qr = await generateAttendanceQR(student.admission_number);
      setQrFrontUrl(qr);
    }
    if (!qrBackUrl) {
      const qr = await generateBackQR(student.admission_number);
      setQrBackUrl(qr);
    }
  }

  async function exportAs(type: 'png' | 'pdf') {
    if (!student) return;
    setExporting(type);
    await generateQRs();
    try {
      const CARD_W = 340;
      const CARD_H = 540;
      const SCALE = 3;
      const primary = '#1e40af';

      const frontCanvas = document.createElement('canvas');
      frontCanvas.width = CARD_W * SCALE;
      frontCanvas.height = CARD_H * SCALE;
      const ctx = frontCanvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(SCALE, SCALE);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, CARD_W, 70);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(schoolSettings?.school_name || 'School', CARD_W / 2, 25);
      ctx.font = 'bold 20px Arial';
      ctx.fillText('STUDENT ID CARD', CARD_W / 2, 52);

      if (avatarUrl) {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = avatarUrl;
        await new Promise(resolve => { img.onload = () => resolve(true); img.onerror = () => resolve(false); });
        ctx.save();
        ctx.beginPath();
        ctx.arc(CARD_W / 2, 130, 36, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, CARD_W / 2 - 36, 94, 72, 72);
        ctx.restore();
      } else {
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(CARD_W / 2, 130, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(initials, CARD_W / 2, 138);
      }

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(`${student.profile?.first_name} ${student.profile?.last_name}`, CARD_W / 2, 215);
      ctx.font = '13px Arial';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Adm No: ${student.admission_number}`, CARD_W / 2, 240);

      if (student.date_of_birth) {
        ctx.font = '12px Arial';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`DOB: ${formatDate(student.date_of_birth)}`, CARD_W / 2, 262);
      }

      if (idCard?.issued_at) {
        ctx.font = '11px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Issued: ${formatDate(idCard.issued_at)}`, CARD_W / 2, 280);
      }

      if (qrFrontUrl) {
        const qrImg = document.createElement('img');
        qrImg.src = qrFrontUrl;
        await new Promise(resolve => { qrImg.onload = () => resolve(true); qrImg.onerror = () => resolve(false); });
        ctx.drawImage(qrImg, CARD_W / 2 - 55, 300, 110, 110);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Arial';
      ctx.fillText('Scan to mark attendance', CARD_W / 2, 430);

      if (type === 'png') {
        const link = document.createElement('a');
        link.download = `id_card_${student.admission_number}.png`;
        link.href = frontCanvas.toDataURL('image/png');
        link.click();
      } else {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: [CARD_W, CARD_H] });
        doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, CARD_W, CARD_H);
        doc.save(`id_card_${student.admission_number}.pdf`);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
    }
    setExporting(null);
  }

  return (
    <DashboardLayout title="My ID Card" subtitle="Digital ID card with QR code">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">My ID Card</h1>
            <p className="text-slate-500">Digital ID card with QR code</p>
          </div>
        </div>

        {/* Front Card */}
        <div className="flex justify-center">
          <div className="w-[340px] bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
            <div className="bg-blue-600 text-white p-4 text-center">
              <p className="text-xs font-medium opacity-90">{schoolSettings?.school_name || 'School Name'}</p>
              <h3 className="text-lg font-bold">STUDENT ID CARD</h3>
            </div>

            <div className="p-4">
              <div className="flex flex-col items-center mb-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Photo" className="w-20 h-20 rounded-full object-cover border-4 border-slate-100" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-400">
                    {initials}
                  </div>
                )}
              </div>

              <div className="text-center mb-4">
                <h4 className="text-lg font-bold text-slate-900">{profile?.first_name} {profile?.last_name}</h4>
                <p className="text-xs text-slate-500 mt-1 font-mono">Adm No: {student?.admission_number}</p>
                {student?.date_of_birth && (
                  <p className="text-sm text-slate-600 mt-1">DOB: {formatDate(student.date_of_birth)}</p>
                )}
                {idCard?.issued_at && (
                  <p className="text-xs text-slate-400 mt-1">Issued: {formatDate(idCard.issued_at)}</p>
                )}
              </div>

              <div className="flex justify-center mb-2">
                {qrFrontUrl ? (
                  <div className="bg-white p-2 rounded-lg border-2 border-slate-200">
                    <img src={qrFrontUrl} alt="QR Code" className="w-28 h-28" />
                  </div>
                ) : (
                  <div className="w-28 h-28 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-slate-500">Scan to mark attendance</p>
            </div>
          </div>
        </div>

        {/* Back Card Toggle */}
        {student && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowBack(!showBack)}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
            >
              {showBack ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              {showBack ? 'Hide' : 'Show'} Back of Card
            </button>
          </div>
        )}

        {showBack && student && (
          <div className="flex justify-center">
            <div className="w-[340px] bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
              <div className="bg-slate-600 text-white p-4 text-center">
                <h3 className="text-lg font-bold">ID CARD RULES</h3>
              </div>
              <div className="p-4">
                <div className="text-sm text-slate-700 whitespace-pre-wrap min-h-[80px]">
                  {backRules || 'This ID card is non-transferable.'}
                </div>
              </div>
              <div className="p-4 text-center border-t border-slate-100">
                {qrBackUrl ? (
                  <div className="flex justify-center mb-2">
                    <div className="bg-white p-2 rounded-lg border">
                      <img src={qrBackUrl} alt="Verification QR" className="w-20 h-20" />
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-slate-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                  </div>
                )}
                <p className="text-xs text-slate-500">ID Verification Code</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 flex-wrap">
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer size={18} />Print ID Card
          </button>
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
