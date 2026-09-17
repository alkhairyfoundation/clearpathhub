'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Printer, Loader2, ChevronDown, ChevronUp, ShieldCheck, Hash, CalendarDays, BadgeCheck } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

function hexToRgba(hex: string, alpha = 1) {
  const clean = (hex || '#1e40af').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shadeColor(hex: string, percent: number) {
  const clean = (hex || '#1e40af').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  r = Math.round((target - r) * p) + r;
  g = Math.round((target - g) * p) + g;
  b = Math.round((target - b) * p) + b;
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function StudentIDCardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [idCard, setIdCard] = useState<any>(null);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [cardConfig, setCardConfig] = useState<any>(null);
  const [qrFrontUrl, setQrFrontUrl] = useState('');
  const [qrBackUrl, setQrBackUrl] = useState('');
  const [exporting, setExporting] = useState<'png' | 'pdf' | 'print' | null>(null);
  const [showBack, setShowBack] = useState(false);
  const initials = profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() : 'ST';
  const avatarUrl = student?.profile?.avatar_url || profile?.avatar_url;

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    const { data: studentData } = await db.from('students').select('*, profile:profiles(*), class:classes(*)').eq('profile_id', profile?.id).maybeSingle();
    if (studentData) {
      setStudent(studentData);
      const qr = await generateAttendanceQR(studentData.admission_number);
      const qrBack = await generateBackQR(studentData.admission_number);
      setQrFrontUrl(qr);
      setQrBackUrl(qrBack);
    }
    const { data: idCardData } = await db.from('id_cards').select('*').eq('student_id', profile?.id).maybeSingle();
    if (idCardData) setIdCard(idCardData);
    const { data: settings } = await db.from('school_settings').select('*').limit(1).maybeSingle();
    if (settings) {
      setSchoolSettings(settings);
      if (settings.id_card_config) setCardConfig(settings.id_card_config);
    }
  }

  async function generateAttendanceQR(admissionNumber: string): Promise<string> {
    const qrData = JSON.stringify({
      type: 'STUDENT_ATTENDANCE',
      admissionNumber,
      school: schoolSettings?.school_name || 'School',
      timestamp: Date.now(),
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

  const primary = cardConfig?.primaryColor || '#1e40af';
  const darker = shadeColor(primary, -28);
  const lighter = shadeColor(primary, 35);
  const backRules: string = (cardConfig?.backRules as string) || 'This ID card is non-transferable.\nReport lost or stolen cards immediately.\nStudents must carry their ID at all times.\nThis card remains valid until further notice.';
  const backMessage: string = (cardConfig?.backMessage as string) || 'This ID card is the property of the school. If found, please return to the school office.';

  const renderCardFront = () => {
    const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
    return (
      <div className="relative flex h-[540px] w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 10% 0%, ${hexToRgba(primary, 0.10)} 0%, transparent 45%), radial-gradient(circle at 96% 100%, ${hexToRgba(primary, 0.09)} 0%, transparent 42%)` }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[6px]" style={{ background: `linear-gradient(90deg, ${primary}, ${lighter})` }} />

        <div className="relative px-5 pb-6 pt-10 text-center" style={{ background: `linear-gradient(150deg, ${primary} 0%, ${darker} 100%)` }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 130% at 85% -10%, rgba(255,255,255,0.3) 0%, transparent 55%)' }} />
          <ShieldCheck className="relative mx-auto h-6 w-6 text-white/90" />
          <p className="relative mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/80">{schoolSettings?.school_name || 'School Name'}</p>
          <h3 className="relative mt-1 text-[22px] font-extrabold tracking-wide text-white drop-shadow-sm">STUDENT ID CARD</h3>
          <div className="relative mt-2.5 flex items-center justify-center gap-1.5">
            <span className="h-[3px] w-9 rounded-full bg-white/90" />
            <span className="h-[3px] w-2.5 rounded-full bg-white/50" />
            <span className="h-[3px] w-9 rounded-full bg-white/90" />
          </div>
        </div>

        <div className="relative z-10 -mt-9 flex justify-center">
          <div className="rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${lighter}, ${primary} 45%, ${darker})` }}>
            <div className="rounded-full border-[3px] border-white bg-white">
              {cardConfig?.showPhoto !== false && avatarUrl ? (
                <img crossOrigin="anonymous" src={avatarUrl} alt="Student" className="h-[84px] w-[84px] rounded-full object-cover" />
              ) : (
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-2xl font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${lighter}, ${darker})` }}>
                  {initials || 'ST'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex-1 px-5">
          <div className="mt-3 text-center">
            <h4 className="text-[19px] font-extrabold leading-tight text-slate-900">{name || 'Student'}</h4>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{student?.class?.name || 'Student'}</p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: hexToRgba(primary, 0.07), border: `1.5px solid ${hexToRgba(primary, 0.35)}` }}>
              <Hash size={12} style={{ color: primary }} />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.16em]" style={{ color: primary }}>Adm No</span>
              <span className="border-l pl-2 font-mono text-[13px] font-bold text-slate-800" style={{ borderColor: hexToRgba(primary, 0.25) }}>{student?.admission_number}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-center">
            {student?.date_of_birth && (
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <CalendarDays size={12} style={{ color: primary }} />
                <span className="font-semibold text-slate-600">DOB:</span> {formatDate(student.date_of_birth)}
              </p>
            )}
            {idCard?.issued_at && (
              <p className="text-[11px] text-slate-400"><span className="font-semibold text-slate-500">Issued:</span> {formatDate(idCard.issued_at)}</p>
            )}
          </div>

          <div className="mt-auto flex flex-col items-center pb-3 pt-2">
            <div className="rounded-xl border-2 border-slate-100 bg-white p-2 shadow-md">
              {qrFrontUrl ? <img src={qrFrontUrl} alt="QR Code" className="h-[112px] w-[112px]" /> : <div className="flex h-[112px] w-[112px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}
            </div>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Scan to mark attendance</p>
            {cardConfig?.frontMessage && (
              <p className="mt-1.5 px-5 text-center text-[11px] font-medium italic text-slate-500">{cardConfig.frontMessage}</p>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-between px-5 py-2.5" style={{ background: `linear-gradient(90deg, ${hexToRgba(primary, 0.10)}, ${hexToRgba(lighter, 0.14)})` }}>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]" style={{ color: primary }}>{schoolSettings?.school_name || 'School'}</span>
          <span className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
            <ShieldCheck size={10} style={{ color: primary }} /> Valid • {schoolSettings?.academic_year || 'This Year'}
          </span>
        </div>
      </div>
    );
  };

  const renderCardBack = () => {
    const rules: string[] = (backRules || '').split('\n').map(r => r.trim()).filter(Boolean);
    return (
      <div className="relative flex h-[540px] w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 90% 0%, ${hexToRgba(primary, 0.08)} 0%, transparent 45%), radial-gradient(circle at 8% 100%, ${hexToRgba(primary, 0.07)} 0%, transparent 40%)` }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[6px]" style={{ background: `linear-gradient(90deg, ${primary}, ${lighter})` }} />

        <div className="relative px-5 pb-5 pt-8 text-center" style={{ background: `linear-gradient(150deg, ${primary} 0%, ${darker} 100%)` }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 130% at 85% -10%, rgba(255,255,255,0.28) 0%, transparent 55%)' }} />
          <ShieldCheck className="relative mx-auto h-5 w-5 text-white/90" />
          <h3 className="relative mt-1 text-[20px] font-extrabold tracking-wide text-white drop-shadow-sm">ID CARD RULES</h3>
          <div className="relative mt-2 flex items-center justify-center gap-1.5">
            <span className="h-[3px] w-8 rounded-full bg-white/90" />
            <span className="h-[3px] w-2 rounded-full bg-white/50" />
            <span className="h-[3px] w-8 rounded-full bg-white/90" />
          </div>
        </div>

        <div className="relative flex flex-1 flex-col px-6 py-5">
          <div className="space-y-2.5">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${lighter}, ${darker})` }}>{i + 1}</span>
                <span className="text-[13px] leading-snug text-slate-600">{rule}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col items-center pt-4">
            <div className="rounded-xl border-2 border-slate-100 bg-white p-2 shadow-md">
              {qrBackUrl ? <img src={qrBackUrl} alt="Verification QR" className="h-[104px] w-[104px]" /> : <div className="flex h-[104px] w-[104px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <ShieldCheck size={11} style={{ color: primary }} /> ID Verification Code
            </p>
          </div>
        </div>

        <div className="relative px-5 py-3 text-center" style={{ background: `linear-gradient(90deg, ${hexToRgba(primary, 0.10)}, ${hexToRgba(lighter, 0.14)})` }}>
          <p className="text-[10px] font-medium leading-snug text-slate-500">{backMessage}</p>
        </div>
      </div>
    );
  };

  function buildCardPDF(frontUrl: string, backUrl: string | null) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const imgW = 140;
    const imgH = (imgW * 540) / 340;
    const place = (url: string) => doc.addImage(url, 'PNG', (pw - imgW) / 2, (ph - imgH) / 2, imgW, imgH);
    place(frontUrl);
    if (backUrl) { doc.addPage(); place(backUrl); }
    return doc;
  }

  async function handlePrint() {
    if (!student) return;
    setExporting('print');
    try {
      const frontUrl = await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true });
      const backUrl = await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true });
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) return;
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Print ID Card</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; background: #e2e8f0; }
          .sheet { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; padding: 24px; align-items: flex-start; }
          .card-wrap { width: 310px; }
          .card-wrap img { width: 100%; display: block; border-radius: 14px; box-shadow: 0 10px 30px rgba(15,23,42,0.25); }
          @media print {
            body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .sheet { padding: 0; gap: 8px; }
            .card-wrap { page-break-inside: avoid; }
            @page { size: auto; margin: 8mm; }
          }
        </style></head><body>
        <div class="sheet">
          <div class="card-wrap"><img src="${frontUrl}" /></div>
          <div class="card-wrap"><img src="${backUrl}" /></div>
        </div>
        <script>
          window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };
        </script></body></html>`);
      printWindow.document.close();
    } catch (err: any) {
      console.error('Print failed:', err);
    }
    setExporting(null);
  }

  async function exportAs(type: 'png' | 'pdf') {
    if (!student) return;
    setExporting(type);
    try {
      const frontUrl = await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true });
      const backUrl = await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true });
      if (type === 'png') {
        const zip = new (await import('jszip')).default();
        const blob = await fetch(frontUrl).then(r => r.blob());
        const backBlob = await fetch(backUrl).then(r => r.blob());
        zip.file(`id_card_${student.admission_number}-front.png`, blob);
        zip.file(`id_card_${student.admission_number}-back.png`, backBlob);
        const zipped = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipped);
        const a = document.createElement('a');
        a.href = url;
        a.download = `id_card_${student.admission_number}.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      } else {
        const doc = buildCardPDF(frontUrl, backUrl);
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
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">My ID Card</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Digital ID card with QR code</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 dark:text-emerald-300">
            <BadgeCheck size={14} /> Verified
          </span>
        </div>

        {/* Front Card */}
        <div className="flex justify-center" ref={frontCardRef}>
          {student ? renderCardFront() : (
            <div className="flex h-[540px] w-[340px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 dark:border-slate-700">
              <Loader2 size={28} className="animate-spin text-slate-300" />
            </div>
          )}
        </div>

        {/* Back Card Toggle */}
        {student && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowBack(!showBack)}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 dark:hover:text-slate-200"
            >
              {showBack ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              {showBack ? 'Hide' : 'Show'} Back of Card
            </button>
          </div>
        )}

        {showBack && student && (
          <div className="flex justify-center">
            {renderCardBack()}
          </div>
        )}

        {/* Hidden back card for export/print */}
        <div className="fixed left-[-12000px] top-0 pointer-events-none" aria-hidden="true">
          <div ref={backCardRef}>{student && renderCardBack()}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 flex-wrap">
          <button onClick={handlePrint} disabled={exporting !== null} className="btn-primary flex items-center gap-2">
            {exporting === 'print' ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}Print ID Card
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