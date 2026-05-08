'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Download, Printer, X, QrCode, Loader2, Users, Eye, Settings, FileDown, FileText, Check, Palette } from 'lucide-react';
import QRCode from 'qrcode';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';

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

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile, selectedRole]);

  async function fetchData() {
    setLoading(true);
    let query = supabase.from('profiles').select('*').in('role', ['teacher', 'accountant', 'admin']).order('first_name');
    if (selectedRole !== 'all') {
      query = supabase.from('profiles').select('*').eq('role', selectedRole).order('first_name');
    }
    const [staffRes, settingsRes] = await Promise.all([
      query,
      supabase.from('school_settings').select('*').limit(1).maybeSingle(),
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
      case 'admin': return { bg: 'bg-blue-600', label: 'Administrator' };
      default: return { bg: 'bg-slate-600', label: role };
    }
  }

  async function downloadPDF() {
    if (!selectedStaff || !qrCodeUrl) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const badge = getRoleBadge(selectedStaff.role);

    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(schoolSettings?.school_name || 'School', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text('STAFF IDENTITY CARD', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(8);
    doc.text(schoolSettings?.academic_year || '2024-2025', pageWidth / 2, 27, { align: 'center' });

    // Card content
    doc.setTextColor(30, 58, 95);
    doc.setFontSize(16);
    doc.text(`${selectedStaff.first_name} ${selectedStaff.last_name}`, pageWidth / 2, 55, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(badge.label, pageWidth / 2, 63, { align: 'center' });
    doc.setFontSize(9);
    doc.text(selectedStaff.email, pageWidth / 2, 71, { align: 'center' });
    if (selectedStaff.phone) {
      doc.text(`Phone: ${selectedStaff.phone}`, pageWidth / 2, 78, { align: 'center' });
    }

    if (qrCodeUrl) {
      doc.addImage(qrCodeUrl, 'PNG', (pageWidth - 40) / 2, 85, 40, 40);
    }

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Scan for staff verification', pageWidth / 2, 130, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 135, { align: 'center' });

    doc.save(`${selectedStaff.first_name}-${selectedStaff.last_name}-staff-id.pdf`);
  }

  async function downloadPNG() {
    if (!selectedStaff || !qrCodeUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 340 * 3;
    canvas.height = 540 * 3;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, 0, canvas.width, 140);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(schoolSettings?.school_name || 'School', canvas.width / 2, 50);
    ctx.font = 'bold 36px Arial';
    ctx.fillText('STAFF ID CARD', canvas.width / 2, 95);
    ctx.font = '24px Arial';
    ctx.fillText(schoolSettings?.academic_year || '2024-2025', canvas.width / 2, 125);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`${selectedStaff.first_name} ${selectedStaff.last_name}`, canvas.width / 2, 260);
    ctx.font = '28px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(getRoleBadge(selectedStaff.role).label, canvas.width / 2, 300);
    ctx.font = '22px Arial';
    ctx.fillText(selectedStaff.email, canvas.width / 2, 340);
    if (selectedStaff.phone) {
      ctx.fillText(selectedStaff.phone, canvas.width / 2, 370);
    }

    if (qrCodeUrl) {
      const qrImg = document.createElement('img');
      qrImg.src = qrCodeUrl;
      await new Promise(resolve => { qrImg.onload = () => resolve(true); qrImg.onerror = () => resolve(false); });
      ctx.drawImage(qrImg, canvas.width / 2 - 100, 400, 200, 200);
    }

    const link = document.createElement('a');
    link.download = `${selectedStaff.first_name}-${selectedStaff.last_name}-staff-id.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <DashboardLayout title="Staff ID Cards" subtitle="Generate and print staff identity cards with QR codes">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Staff ID Cards</h1>
              <p className="text-slate-500 mt-1">{staff.length} staff members</p>
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

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No staff members found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(member => {
              const badge = getRoleBadge(member.role);
              return (
                <div key={member.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center font-bold text-white">
                        {member.first_name?.[0]}{member.last_name?.[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{member.first_name} {member.last_name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 truncate">{member.email}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">{member.phone || 'No phone'}</span>
                    <button onClick={() => handleShowCard(member)} disabled={generating} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
                      <Eye size={14} /> View ID
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Card Preview Modal */}
        {showCardModal && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900">Staff ID Card — {selectedStaff.first_name} {selectedStaff.last_name}</h3>
                <button onClick={() => setShowCardModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-6">
                {/* Card Preview */}
                <div className="flex flex-wrap justify-center gap-8 mb-6">
                  {/* Front */}
                  <div className="w-[340px] h-[540px] bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-5 text-center">
                      <p className="text-xs font-medium opacity-90">{schoolSettings?.school_name || 'School Name'}</p>
                      <h3 className="text-lg font-bold mt-1">STAFF ID CARD</h3>
                      <p className="text-xs opacity-80">{schoolSettings?.academic_year || '2024-2025'}</p>
                    </div>
                    <div className="p-5 flex flex-col items-center">
                      {selectedStaff.avatar_url ? (
                        <img src={selectedStaff.avatar_url} alt="Photo" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 mb-4" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white mb-4">
                          {selectedStaff.first_name?.[0]}{selectedStaff.last_name?.[0]}
                        </div>
                      )}
                      <h4 className="text-xl font-bold text-slate-900">{selectedStaff.first_name} {selectedStaff.last_name}</h4>
                      <span className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold text-white ${getRoleBadge(selectedStaff.role).bg}`}>
                        {getRoleBadge(selectedStaff.role).label}
                      </span>
                      <p className="text-sm text-slate-500 mt-2">{selectedStaff.email}</p>
                      {selectedStaff.phone && <p className="text-sm text-slate-500">{selectedStaff.phone}</p>}

                      <div className="mt-4 bg-white p-2 rounded-lg border-2 border-slate-200">
                        {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-28 h-28" />}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Scan for attendance</p>
                    </div>
                  </div>

                  {/* Back */}
                  <div className="w-[340px] h-[540px] bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-5 text-center">
                      <h3 className="text-lg font-bold">INFORMATION</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                        <span className="text-slate-500">Email:</span>
                        <span className="font-medium text-sm">{selectedStaff.email}</span>
                      </div>
                      {selectedStaff.phone && (
                        <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                          <span className="text-slate-500">Phone:</span>
                          <span className="font-medium">{selectedStaff.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                        <span className="text-slate-500">Role:</span>
                        <span className="font-medium">{getRoleBadge(selectedStaff.role).label}</span>
                      </div>
                      <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
                        <span className="text-slate-500">Joined:</span>
                        <span className="font-medium">{new Date(selectedStaff.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="p-4 text-center border-t border-slate-100 mt-auto">
                      {qrBackUrl && (
                        <div className="inline-block bg-white p-2 rounded-lg border mb-2">
                          <img src={qrBackUrl} alt="Verification QR" className="w-20 h-20" />
                        </div>
                      )}
                      <p className="text-xs text-slate-500">ID Verification Code</p>
                    </div>
                    <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t">
                      This ID card is the property of the school. If found, please return to the school office.
                    </div>
                  </div>
                </div>

                {/* Download Options */}
                <div className="card bg-slate-50 p-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileDown size={16} /> Download Options
                  </h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={downloadPNG} disabled={generating} className="btn-primary flex items-center gap-2">
                      <Download size={16} /> PNG
                    </button>
                    <button onClick={downloadPDF} disabled={generating} className="btn-outline flex items-center gap-2">
                      <FileText size={16} /> PDF
                    </button>
                    <button onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow && selectedStaff) {
                        const badge = getRoleBadge(selectedStaff.role);
                        printWindow.document.write(`
                          <html><head><title>Print Staff ID - ${selectedStaff.first_name}</title>
                          <style>body{margin:0;padding:20px;font-family:Arial,sans-serif;text-align:center}.card{max-width:340px;margin:0 auto;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden}.header{background:linear-gradient(to right,#1d4ed8,#1e3a8a);color:white;padding:20px;text-align:center}.content{padding:20px}img{width:120px;height:120px}@media print{body{margin:0}}</style>
                          </head><body>
                            <div class="card"><div class="header"><p>${schoolSettings?.school_name || 'School'}</p><h2>STAFF ID CARD</h2></div>
                            <div class="content"><h3>${selectedStaff.first_name} ${selectedStaff.last_name}</h3><p>${badge.label}</p><p>${selectedStaff.email}</p>${selectedStaff.phone ? `<p>${selectedStaff.phone}</p>` : ''}${qrCodeUrl ? `<img src="${qrCodeUrl}" alt="QR" />` : ''}</div></div>
                          </body></html>
                        `);
                        printWindow.document.close();
                        setTimeout(() => printWindow.print(), 500);
                      }
                    }} className="btn-outline flex items-center gap-2">
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
