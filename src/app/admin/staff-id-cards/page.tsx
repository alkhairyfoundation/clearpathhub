'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Download, Printer, X, Users, Eye, FileDown, FileText, Loader2, ShieldCheck, Mail, Phone, BadgeCheck, CalendarDays } from 'lucide-react';
import QRCode from 'qrcode';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

const STAFF_GRADIENT = 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)';
const STAFF_ACCENT = '#1d4ed8';
const STAFF_DARK = '#1e3a8a';
const AVATAR_GRADIENT = 'linear-gradient(135deg, #3b82f6 0%, #4338ca 100%)';

function hexToRgba(hex: string, alpha = 1) {
  const clean = (hex || '#1e40af').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function AdminStaffIDCardsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrBackUrl, setQrBackUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [downloadFormat, setDownloadFormat] = useState<'front' | 'back' | 'both'>('both');

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile, selectedRole]);

  async function fetchData() {
    setLoading(true);
    let query = db.from('profiles').select('*').in('role', ['teacher', 'accountant', 'admin']).order('first_name');
    if (selectedRole !== 'all') {
      query = db.from('profiles').select('*').eq('role', selectedRole).order('first_name');
    }
    const [staffRes, settingsRes] = await Promise.all([
      query,
      db.from('school_settings').select('*').limit(1).maybeSingle(),
    ]);
    if (staffRes.data) setStaff(staffRes.data);
    if (settingsRes.data) setSchoolSettings(settingsRes.data);
    setLoading(false);
  }

  const filtered = staff.filter(s =>
    `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function generateStaffQR(staffMember: StaffMember): Promise<string> {
    const qrData = JSON.stringify({
      type: 'STAFF_ATTENDANCE',
      staffId: staffMember.id,
      name: `${staffMember.first_name} ${staffMember.last_name}`,
      role: staffMember.role,
      school: schoolSettings?.school_name || 'School',
    });
    try { return await QRCode.toDataURL(qrData, { width: 180, margin: 2, color: { dark: '#000000', light: '#ffffff' } }); }
    catch { return ''; }
  }

  async function generateBackQR(staffMember: StaffMember): Promise<string> {
    const qrData = JSON.stringify({
      type: 'STAFF_ID_VERIFY',
      staffId: staffMember.id,
      school: schoolSettings?.school_name || 'School',
    });
    try { return await QRCode.toDataURL(qrData, { width: 120, margin: 2 }); }
    catch { return ''; }
  }

  async function handleShowCard(staffMember: StaffMember) {
    setSelectedStaff(staffMember);
    setGenerating(true);
    const qr = await generateStaffQR(staffMember);
    const qrBack = await generateBackQR(staffMember);
    setQrCodeUrl(qr);
    setQrBackUrl(qrBack);
    setShowCardModal(true);
    setGenerating(false);
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case 'teacher': return { bg: 'bg-emerald-600', label: 'Teacher' };
      case 'accountant': return { bg: 'bg-amber-600', label: 'Accountant' };
      case 'admin': return { bg: 'bg-primary-600', label: 'Administrator' };
      default: return { bg: 'bg-slate-600', label: role };
    }
  }

  const renderCardFront = (member: StaffMember) => {
    if (!member) return null;
    const badge = getRoleBadge(member.role);
    const initials = `${(member.first_name || '')[0] || ''}${(member.last_name || '')[0] || ''}`.toUpperCase();
    return (
      <div className="relative flex h-[540px] w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 10% 0%, ${hexToRgba(STAFF_ACCENT, 0.08)} 0%, transparent 42%), radial-gradient(circle at 96% 100%, ${hexToRgba(STAFF_DARK, 0.10)} 0%, transparent 45%)` }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[6px]" style={{ background: `linear-gradient(90deg, ${STAFF_ACCENT}, #60a5fa)` }} />

        <div className="relative px-5 pb-6 pt-10 text-center" style={{ background: STAFF_GRADIENT }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 130% at 85% -10%, rgba(255,255,255,0.3) 0%, transparent 55%)' }} />
          <ShieldCheck className="relative mx-auto h-6 w-6 text-white/90" />
          <p className="relative mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/80">{schoolSettings?.school_name || 'School Name'}</p>
          <h3 className="relative mt-1 text-[22px] font-extrabold tracking-wide text-white drop-shadow-sm">STAFF ID CARD</h3>
          <div className="relative mt-2.5 flex items-center justify-center gap-1.5">
            <span className="h-[3px] w-9 rounded-full bg-white/90" />
            <span className="h-[3px] w-2.5 rounded-full bg-white/50" />
            <span className="h-[3px] w-9 rounded-full bg-white/90" />
          </div>
        </div>

        <div className="relative z-10 -mt-9 flex justify-center">
          <div className="rounded-full p-[3px] bg-gradient-to-br from-blue-400 to-indigo-900">
            <div className="rounded-full border-[3px] border-white bg-white">
              {member.avatar_url ? (
                <img crossOrigin="anonymous" src={member.avatar_url} alt="Staff" className="h-[84px] w-[84px] rounded-full object-cover" />
              ) : (
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-2xl font-extrabold text-white" style={{ background: AVATAR_GRADIENT }}>
                  {initials || 'ST'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex-1 px-5">
          <div className="mt-3 text-center">
            <h4 className="text-[19px] font-extrabold leading-tight text-slate-900">{member.first_name} {member.last_name}</h4>
            <span className={`mt-2 inline-block rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${badge.bg}`}>
              {badge.label}
            </span>
          </div>

          <div className="mt-4 mx-auto max-w-[240px] space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="flex items-center gap-2 text-[11px] text-slate-600">
              <Mail size={12} className="flex-none text-blue-600" /> <span className="truncate">{member.email}</span>
            </p>
            {member.phone && (
              <p className="flex items-center gap-2 text-[11px] text-slate-600">
                <Phone size={12} className="flex-none text-blue-600" /> <span className="truncate">{member.phone}</span>
              </p>
            )}
          </div>

          <div className="mt-auto flex flex-col items-center pb-3 pt-2">
            <div className="rounded-xl border-2 border-slate-100 bg-white p-2 shadow-md">
              {qrCodeUrl ? <img src={qrCodeUrl} alt="QR Code" className="h-[112px] w-[112px]" /> : <div className="flex h-[112px] w-[112px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}
            </div>
            <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Scan for attendance</p>
          </div>
        </div>

        <div className="relative flex items-center justify-between px-5 py-2.5" style={{ background: `linear-gradient(90deg, ${hexToRgba(STAFF_ACCENT, 0.10)}, ${hexToRgba(STAFF_DARK, 0.14)})` }}>
          <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]" style={{ color: STAFF_ACCENT }}>{schoolSettings?.school_name || 'School'}</span>
          <span className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
            <BadgeCheck size={10} style={{ color: STAFF_ACCENT }} /> Staff Verified
          </span>
        </div>
      </div>
    );
  };

  const renderCardBack = (member: StaffMember) => {
    if (!member) return null;
    const badge = getRoleBadge(member.role);
    const infoRows = [
      { label: 'Email', value: member.email, icon: Mail },
      { label: 'Phone', value: member.phone || '—', icon: Phone },
      { label: 'Role', value: badge.label, icon: BadgeCheck },
      { label: 'Joined', value: new Date(member.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), icon: CalendarDays },
    ];
    return (
      <div className="relative flex h-[540px] w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 90% 0%, ${hexToRgba(STAFF_ACCENT, 0.08)} 0%, transparent 45%), radial-gradient(circle at 8% 100%, ${hexToRgba(STAFF_DARK, 0.08)} 0%, transparent 40%)` }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[6px]" style={{ background: `linear-gradient(90deg, ${STAFF_ACCENT}, #60a5fa)` }} />

        <div className="relative px-5 pb-5 pt-8 text-center" style={{ background: STAFF_GRADIENT }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 130% at 85% -10%, rgba(255,255,255,0.28) 0%, transparent 55%)' }} />
          <ShieldCheck className="relative mx-auto h-5 w-5 text-white/90" />
          <h3 className="relative mt-1 text-[20px] font-extrabold tracking-wide text-white drop-shadow-sm">INFORMATION</h3>
          <div className="relative mt-2 flex items-center justify-center gap-1.5">
            <span className="h-[3px] w-8 rounded-full bg-white/90" />
            <span className="h-[3px] w-2 rounded-full bg-white/50" />
            <span className="h-[3px] w-8 rounded-full bg-white/90" />
          </div>
        </div>

        <div className="relative flex flex-1 flex-col px-6 py-5">
          <div className="space-y-2.5">
            {infoRows.map((row, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-white" style={{ background: AVATAR_GRADIENT }}>
                  <row.icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{row.label}</p>
                  <p className="truncate text-[12px] font-semibold text-slate-700">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto flex flex-col items-center pt-4">
            <div className="rounded-xl border-2 border-slate-100 bg-white p-2 shadow-md">
              {qrBackUrl ? <img src={qrBackUrl} alt="Verification QR" className="h-[104px] w-[104px]" /> : <div className="flex h-[104px] w-[104px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <ShieldCheck size={11} className="text-blue-600" /> ID Verification Code
            </p>
          </div>
        </div>

        <div className="relative px-5 py-3 text-center" style={{ background: `linear-gradient(90deg, ${hexToRgba(STAFF_ACCENT, 0.10)}, ${hexToRgba(STAFF_DARK, 0.14)})` }}>
          <p className="text-[10px] font-medium leading-snug text-slate-500">This ID card is the property of the school. If found, please return to the school office.</p>
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
    if (!selectedStaff) return;
    setGenerating(true);
    try {
      const prefix = `${selectedStaff.first_name}-${selectedStaff.last_name}`.toLowerCase().replace(/\s+/g, '-');
      if (downloadFormat === 'front' || downloadFormat === 'both') {
        const frontUrl = await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true });
        if (downloadFormat === 'front') {
          const a = document.createElement('a');
          a.href = frontUrl; a.download = `${prefix}-staff-front.png`; a.click();
        } else {
          const backUrl = await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true });
          const zip = new JSZip();
          const blob = await fetch(frontUrl).then(r => r.blob());
          const backBlob = await fetch(backUrl).then(r => r.blob());
          zip.file(`${prefix}-staff-front.png`, blob);
          zip.file(`${prefix}-staff-back.png`, backBlob);
          const zipped = await zip.generateAsync({ type: 'blob' });
          downloadBlob(zipped, `${prefix}-staff-id-cards.zip`);
        }
      } else {
        const backUrl = await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true });
        const a = document.createElement('a');
        a.href = backUrl; a.download = `${prefix}-staff-back.png`; a.click();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPDF() {
    if (!selectedStaff) return;
    setGenerating(true);
    try {
      const prefix = `${selectedStaff.first_name}-${selectedStaff.last_name}`.toLowerCase().replace(/\s+/g, '-');
      const frontUrl = downloadFormat !== 'back' ? await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true }) : null;
      const backUrl = downloadFormat !== 'front' ? await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true }) : null;
      const doc = buildCardPDF(frontUrl, backUrl);
      doc.save(downloadFormat === 'both' ? `${prefix}-staff-id.pdf` : downloadFormat === 'front' ? `${prefix}-staff-front.pdf` : `${prefix}-staff-back.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePrint() {
    if (!selectedStaff) return;
    setGenerating(true);
    try {
      const frontUrl = downloadFormat !== 'back' ? await toPng(frontCardRef.current!, { pixelRatio: 3, cacheBust: true }) : null;
      const backUrl = downloadFormat !== 'front' ? await toPng(backCardRef.current!, { pixelRatio: 3, cacheBust: true }) : null;
      const printWindow = window.open('', '_blank', 'width=800,height=900');
      if (!printWindow) return;
      const cardHtml = [];
      if (frontUrl) cardHtml.push(`<div class="card-wrap"><img src="${frontUrl}" /></div>`);
      if (backUrl) cardHtml.push(`<div class="card-wrap"><img src="${backUrl}" /></div>`);
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Print Staff ID</title>
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

  return (
    <DashboardLayout title="Staff ID Cards" subtitle="Generate and print staff identity cards with QR codes">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Staff ID Cards</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">{staff.length} staff members</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input pl-10" />
            </div>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="input sm:w-48">
              <option value="all">All Staff</option>
              <option value="teacher">Teachers</option>
              <option value="accountant">Accountants</option>
              <option value="admin">Admins</option>
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
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No staff members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(member => {
              const badge = getRoleBadge(member.role);
              return (
                <div key={member.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center font-bold text-white">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white dark:text-white">{member.first_name} {member.last_name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-3 truncate">{member.email}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">{member.phone || 'No phone'}</span>
                    <button onClick={() => handleShowCard(member)} disabled={generating} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
                      <Eye size={14} /> View ID
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Hidden capture target used by exports */}
        <div className="fixed left-[-12000px] top-0 pointer-events-none" aria-hidden="true">
          <div ref={frontCardRef}>{selectedStaff && renderCardFront(selectedStaff)}</div>
          <div ref={backCardRef}>{selectedStaff && renderCardBack(selectedStaff)}</div>
        </div>

        {showCardModal && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 animate-scale-in">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">Staff ID Card — {selectedStaff.first_name} {selectedStaff.last_name}</h3>
                <button onClick={() => setShowCardModal(false)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
                  <X size={20} className="text-slate-500 dark:text-slate-400 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap justify-center gap-8 mb-6">
                  {renderCardFront(selectedStaff)}
                  {renderCardBack(selectedStaff)}
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
                      {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} PNG
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
      </div>
    </DashboardLayout>
  );
}