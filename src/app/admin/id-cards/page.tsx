'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Download, Printer, X, Eye, Settings, Image, FileDown, FileText, Check, Palette, Users, Loader2, ShieldCheck, Hash, CalendarDays } from 'lucide-react';
import QRCode from 'qrcode';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';

interface CardConfig {
  showPhoto: boolean;
  showDOB: boolean;
  showBloodGroup: boolean;
  showAddress: boolean;
  showEmergencyContact: boolean;
  frontMessage: string;
  backMessage: string;
  backRules: string;
  cardTheme: string;
  primaryColor: string;
}

const defaultConfig: CardConfig = {
  showPhoto: true,
  showDOB: true,
  showBloodGroup: true,
  showAddress: true,
  showEmergencyContact: true,
  frontMessage: '',
  backMessage: 'This ID card is the property of the school. If found, please return to the school office.',
  backRules: 'This ID card is non-transferable.\nReport lost or stolen cards immediately.\nStudents must carry their ID at all times.\nThis card remains valid until further notice.',
  cardTheme: 'blue',
  primaryColor: '#1e40af',
};

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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function AdminIDCardsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedIdCard, setSelectedIdCard] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrBackUrl, setQrBackUrl] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [cardConfig, setCardConfig] = useState<CardConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadFormat, setDownloadFormat] = useState<'front' | 'back' | 'both'>('both');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
    loadCardConfig();
  }, [profile, selectedClass]);

  async function fetchData() {
    setLoading(true);
    const [studentsRes, classesRes, settingsRes] = await Promise.all([
      db.from('students').select('*, profile:profiles!profile_id(first_name, last_name, email, phone, avatar_url), class:classes!class_id(name)').order('admission_number'),
      db.from('classes').select('id, name').order('level'),
      db.from('school_settings').select('*').limit(1).maybeSingle(),
    ]);
    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    if (settingsRes.data) setSchoolSettings(settingsRes.data);
    setLoading(false);
  }

  async function loadCardConfig() {
    const { data } = await db.from('school_settings').select('id_card_config').limit(1).maybeSingle();
    if (data?.id_card_config) {
      setCardConfig({ ...defaultConfig, ...data.id_card_config });
    }
  }

  async function saveCardConfig() {
    setSaving(true);
    try {
      const { data: settings } = await db.from('school_settings').select('id').limit(1).maybeSingle();
      if (settings?.id) {
        await db.from('school_settings').update({ id_card_config: cardConfig }).eq('id', settings.id);
      }
      setSuccess('Card configuration saved!');
      setTimeout(() => setSuccess(''), 3000);
      setShowConfigModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = students.filter(s =>
    `${s.profile?.first_name} ${s.profile?.last_name} ${s.admission_number}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedClass === 'all' || s.class_id === selectedClass)
  );

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

  async function handleShowCard(student: any) {
    setSelectedStudent(student);
    setGenerating(true);
    const qr = await generateAttendanceQR(student.admission_number);
    const qrBack = await generateBackQR(student.admission_number);
    setQrCodeUrl(qr);
    setQrBackUrl(qrBack);
    const { data: idCardData } = await db.from('id_cards').select('*').eq('student_id', student.profile_id).maybeSingle();
    if (idCardData) setSelectedIdCard(idCardData);
    else setSelectedIdCard(null);
    setShowCardModal(true);
    setGenerating(false);
  }

  function formatDate(dateStr: string) {
    try { return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateStr || ''; }
  }

  const renderCardFront = (student: any, qr: string, idCard: any) => {
    if (!student) return null;
    const primary = cardConfig.primaryColor || '#1e40af';
    const darker = shadeColor(primary, -28);
    const lighter = shadeColor(primary, 35);
    const initials = `${(student.profile?.first_name || '')[0] || ''}${(student.profile?.last_name || '')[0] || ''}`.toUpperCase();
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
              {cardConfig.showPhoto && student.profile?.avatar_url ? (
                <img crossOrigin="anonymous" src={student.profile.avatar_url} alt="Student" className="h-[84px] w-[84px] rounded-full object-cover" />
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
            <h4 className="text-[19px] font-extrabold leading-tight text-slate-900">{(student.profile?.first_name || '')} {(student.profile?.last_name || '')}</h4>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{student.class?.name || 'Student'}</p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5" style={{ background: hexToRgba(primary, 0.07), border: `1.5px solid ${hexToRgba(primary, 0.35)}` }}>
              <Hash size={12} style={{ color: primary }} />
              <span className="text-[9px] font-extrabold uppercase tracking-[0.16em]" style={{ color: primary }}>Adm No</span>
              <span className="border-l pl-2 font-mono text-[13px] font-bold text-slate-800" style={{ borderColor: hexToRgba(primary, 0.25) }}>{student.admission_number}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-center">
            {student.date_of_birth && (
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
              {qr ? <img src={qr} alt="QR Code" className="h-[112px] w-[112px]" /> : <div className="flex h-[112px] w-[112px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}
            </div>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Scan to mark attendance</p>
            {cardConfig.frontMessage && (
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

  const renderCardBack = (student: any, qr: string) => {
    if (!student) return null;
    const primary = cardConfig.primaryColor || '#1e40af';
    const darker = shadeColor(primary, -28);
    const lighter = shadeColor(primary, 35);
    const rules = (cardConfig.backRules || 'This ID card is non-transferable.').split('\n').map(r => r.trim()).filter(Boolean);
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
              {qr ? <img src={qr} alt="Verification QR" className="h-[104px] w-[104px]" /> : <div className="flex h-[104px] w-[104px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <ShieldCheck size={11} style={{ color: primary }} /> ID Verification Code
            </p>
          </div>
        </div>

        <div className="relative px-5 py-3 text-center" style={{ background: `linear-gradient(90deg, ${hexToRgba(primary, 0.10)}, ${hexToRgba(lighter, 0.14)})` }}>
          <p className="text-[10px] font-medium leading-snug text-slate-500">{cardConfig.backMessage || 'This ID card is the property of the school.'}</p>
        </div>
      </div>
    );
  };

  function buildCardPDF(frontUrl: string | null, backUrl: string | null) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const imgW = 140;
    const imgH = (imgW * 540) / 340;
    const place = (url: string) => doc.addImage(url, 'PNG', (pw - imgW) / 2, (ph - imgH) / 2, imgW, imgH);
    if (frontUrl) {
      place(frontUrl);
      if (backUrl) { doc.addPage(); place(backUrl); }
    } else if (backUrl) {
      place(backUrl);
    }
    return doc;
  }

  async function downloadPNG() {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      const prefix = selectedStudent.admission_number;
      if (downloadFormat === 'front' || downloadFormat === 'both') {
        const frontUrl = await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true });
        if (downloadFormat === 'front') {
          const a = document.createElement('a');
          a.href = frontUrl; a.download = `${prefix}-front.png`; a.click();
        } else {
          const backUrl = await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true });
          const zip = new JSZip();
          const blob = await fetch(frontUrl).then(r => r.blob());
          const backBlob = await fetch(backUrl).then(r => r.blob());
          zip.file(`${prefix}-front.png`, blob);
          zip.file(`${prefix}-back.png`, backBlob);
          const zipped = await zip.generateAsync({ type: 'blob' });
          downloadBlob(zipped, `${prefix}-id-cards.zip`);
        }
      } else {
        const backUrl = await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true });
        const a = document.createElement('a');
        a.href = backUrl; a.download = `${prefix}-back.png`; a.click();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPDF() {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      const prefix = selectedStudent.admission_number;
      const frontUrl = downloadFormat !== 'back' ? await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true }) : null;
      const backUrl = downloadFormat !== 'front' ? await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true }) : null;
      const doc = buildCardPDF(frontUrl, backUrl);
      doc.save(downloadFormat === 'both' ? `${prefix}-id-card.pdf` : downloadFormat === 'front' ? `${prefix}-front.pdf` : `${prefix}-back.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePrint() {
    if (!selectedStudent) return;
    setGenerating(true);
    try {
      const frontUrl = downloadFormat !== 'back' ? await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true }) : null;
      const backUrl = downloadFormat !== 'front' ? await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true }) : null;
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) return;
      const cardHtml = [];
      if (frontUrl) cardHtml.push(`<div class="card-wrap"><img src="${frontUrl}" /></div>`);
      if (backUrl) cardHtml.push(`<div class="card-wrap"><img src="${backUrl}" /></div>`);
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
        <div class="sheet">${cardHtml.join('')}</div>
        <script>
          window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };
        </script></body></html>`);
      printWindow.document.close();
    } finally {
      setGenerating(false);
    }
  }

  async function handleBulkDownload() {
    if (selectedStudents.length === 0) return;
    setGenerating(true);
    try {
      const total = selectedStudents.length;
      let count = 0;
      for (const studentId of selectedStudents) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;
        setSelectedStudent(student);
        const qr = await generateAttendanceQR(student.admission_number);
        const qrBack = await generateBackQR(student.admission_number);
        setQrCodeUrl(qr);
        setQrBackUrl(qrBack);
        const { data: idCardData } = await db.from('id_cards').select('*').eq('student_id', student.profile_id).maybeSingle();
        setSelectedIdCard(idCardData || null);
        await new Promise(r => setTimeout(r, 150));
        const frontUrl = await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true });
        const backUrl = await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true });
        const doc = buildCardPDF(frontUrl, backUrl);
        doc.save(`${student.admission_number}-id-card.pdf`);
        count++;
        setSuccess(`Downloading ${count} of ${total}...`);
        await new Promise(r => setTimeout(r, 400));
      }
      setShowBulkModal(false);
      setSelectedStudents([]);
      setSuccess(`Downloaded ${count} ID cards`);
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <DashboardLayout title="Student ID Cards" subtitle="Generate and print student ID cards with QR codes">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Student ID Cards</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">{students.length} students eligible for ID cards</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowConfigModal(true)} className="btn-outline flex items-center gap-2">
              <Settings size={18} /> Configure
            </button>
            <button onClick={() => setShowBulkModal(true)} className="btn-outline flex items-center gap-2">
              <Download size={18} /> Bulk Download
            </button>
          </div>
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

        {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm">{success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No students found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(student => (
              <div key={student.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 dark:text-slate-400">
                      {student.profile?.first_name?.[0]}{student.profile?.last_name?.[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white dark:text-white">{student.profile?.first_name} {student.profile?.last_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{student.class?.name || 'No Class'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 dark:text-slate-400">{student.admission_number}</span>
                  <button onClick={() => handleShowCard(student)} disabled={generating} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hidden capture target used by exports */}
        <div className="fixed left-[-12000px] top-0 pointer-events-none" aria-hidden="true">
          <div ref={frontCardRef}>{renderCardFront(selectedStudent, qrCodeUrl, selectedIdCard)}</div>
          <div ref={backCardRef}>{renderCardBack(selectedStudent, qrBackUrl)}</div>
        </div>

        {showCardModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 animate-scale-in">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">ID Card Preview - {selectedStudent.profile?.first_name}</h3>
                <button onClick={() => setShowCardModal(false)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
                  <X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap justify-center gap-8 mb-6">
                  {renderCardFront(selectedStudent, qrCodeUrl, selectedIdCard)}
                  {renderCardBack(selectedStudent, qrBackUrl)}
                </div>

                <div className="card bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 p-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white dark:text-white mb-3 flex items-center gap-2">
                    <FileDown size={16} /> Download Options
                  </h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex gap-2">
                      <label className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400">Format:</label>
                      <select value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value as any)} className="input py-1 text-sm">
                        <option value="both">Front & Back</option>
                        <option value="front">Front Only</option>
                        <option value="back">Back Only</option>
                      </select>
                    </div>
                    <button onClick={downloadPNG} disabled={generating} className="btn-primary flex items-center gap-2">
                      {generating ? <Loader2 size={16} className="animate-spin" /> : <Image size={16} />} PNG
                    </button>
                    <button onClick={downloadPDF} disabled={generating} className="btn-outline flex items-center gap-2">
                      <FileText size={16} /> PDF
                    </button>
                    <button onClick={handlePrint} disabled={generating} className="btn-outline flex items-center gap-2">
                      <Printer size={16} /> Print
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">ID Card Configuration</h3>
                <button onClick={() => setShowConfigModal(false)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
                  <X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="label flex items-center gap-2"><Palette size={16} /> Card Theme</label>
                  <select value={cardConfig.cardTheme} onChange={(e) => setCardConfig({...cardConfig, cardTheme: e.target.value})} className="input">
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                    <option value="amber">Amber</option>
                    <option value="slate">Slate</option>
                  </select>
                </div>

                <div>
                  <label className="label">Primary Color</label>
                  <input type="color" value={cardConfig.primaryColor} onChange={(e) => setCardConfig({...cardConfig, primaryColor: e.target.value})} className="input h-10 p-1" />
                </div>

                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cardConfig.showPhoto} onChange={(e) => setCardConfig({...cardConfig, showPhoto: e.target.checked})} className="w-4 h-4" />
                  <span className="text-sm">Student Photo</span>
                </label>

                <div>
                  <label className="label">Front Message</label>
                  <textarea value={cardConfig.frontMessage} onChange={(e) => setCardConfig({...cardConfig, frontMessage: e.target.value})} className="input" rows={2} placeholder="Optional short message on front of card" />
                </div>

                <div>
                  <label className="label">ID Card Rules (Back of Card)</label>
                  <textarea value={cardConfig.backRules} onChange={(e) => setCardConfig({...cardConfig, backRules: e.target.value})} className="input" rows={5} placeholder="Enter ID card rules, one per line" />
                </div>

                <div>
                  <label className="label">Back Footer Message</label>
                  <textarea value={cardConfig.backMessage} onChange={(e) => setCardConfig({...cardConfig, backMessage: e.target.value})} className="input" rows={2} placeholder="Footer message for back of card" />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 dark:border-slate-700">
                <button onClick={() => setShowConfigModal(false)} className="btn-ghost">Cancel</button>
                <button onClick={saveCardConfig} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">Bulk Download</h3>
                <button onClick={() => setShowBulkModal(false)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
                  <X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-5">
                <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-400 mb-4">Select students to download ID cards (PDF):</p>
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {filtered.map(student => (
                    <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{student.profile?.first_name} {student.profile?.last_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{student.class?.name} - {student.admission_number}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{selectedStudents.length} students selected</p>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 dark:border-slate-700">
                <button onClick={() => setShowBulkModal(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleBulkDownload} disabled={selectedStudents.length === 0 || generating} className="btn-primary flex items-center gap-2">
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download PDF ({selectedStudents.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}