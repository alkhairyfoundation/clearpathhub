'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, Download, Printer, X, QrCode, Loader2, Users, Filter, Eye, Settings, Image, FileDown, FileText, Check, Palette } from 'lucide-react';
import QRCode from 'qrcode';
import DashboardLayout from '@/components/DashboardLayout';
import jsPDF from 'jspdf';

interface CardConfig {
  showPhoto: boolean;
  showDOB: boolean;
  showBloodGroup: boolean;
  showAddress: boolean;
  showEmergencyContact: boolean;
  frontMessage: string;
  backMessage: string;
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
  cardTheme: 'blue',
  primaryColor: '#1e40af',
};

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

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
    loadCardConfig();
  }, [profile, selectedClass]);

  async function fetchData() {
    setLoading(true);
    const [studentsRes, classesRes, settingsRes] = await Promise.all([
      supabase.from('students').select('*, profile:profiles!profile_id(first_name, last_name, email, phone, avatar_url), class:classes!class_id(name)').order('admission_number'),
      supabase.from('classes').select('id, name').order('level'),
      supabase.from('school_settings').select('*').limit(1).maybeSingle(),
    ]);
    console.log('Students data:', studentsRes.data);
    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    if (settingsRes.data) setSchoolSettings(settingsRes.data);
    setLoading(false);
  }

  async function loadCardConfig() {
    const { data } = await supabase.from('school_settings').select('id_card_config').limit(1).maybeSingle();
    if (data?.id_card_config) {
      setCardConfig({ ...defaultConfig, ...data.id_card_config });
    }
  }

  async function saveCardConfig() {
    setSaving(true);
    try {
      const { data: settings } = await supabase.from('school_settings').select('id').limit(1).maybeSingle();
      if (settings?.id) {
        await supabase.from('school_settings').update({ id_card_config: cardConfig }).eq('id', settings.id);
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
    setShowCardModal(true);
    setGenerating(false);
  }

  const getCardTheme = () => {
    const themes: Record<string, { bg: string, header: string, text: string }> = {
      blue: { bg: 'bg-blue-50', header: 'bg-blue-600', text: 'text-blue-900' },
      green: { bg: 'bg-emerald-50', header: 'bg-emerald-600', text: 'text-emerald-900' },
      purple: { bg: 'bg-purple-50', header: 'bg-purple-600', text: 'text-purple-900' },
      amber: { bg: 'bg-amber-50', header: 'bg-amber-600', text: 'text-amber-900' },
      slate: { bg: 'bg-slate-50', header: 'bg-slate-600', text: 'text-slate-900' },
    };
    return themes[cardConfig.cardTheme] || themes.blue;
  };

  const theme = getCardTheme();

  const renderCardFront = (student: any, qr: string) => (
    <div className="w-[340px] h-[540px] bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg" ref={cardRef}>
      <div className={`${theme.header} text-white p-4 text-center`}>
        <p className="text-xs font-medium opacity-90">{schoolSettings?.school_name || 'School Name'}</p>
        <h3 className="text-lg font-bold">STUDENT ID CARD</h3>
        <p className="text-xs opacity-80">{schoolSettings?.academic_year || '2024-2025'}</p>
      </div>
      
      <div className="p-4">
        <div className="flex flex-col items-center mb-4">
          {student.profile?.avatar_url ? (
            <img src={student.profile.avatar_url} alt="Photo" className="w-24 h-24 rounded-full object-cover border-4 border-slate-100" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-400">
              {student.profile?.first_name?.[0]}{student.profile?.last_name?.[0]}
            </div>
          )}
        </div>

        <div className="text-center mb-4">
          <h4 className="text-xl font-bold text-slate-900">{student.profile?.first_name} {student.profile?.last_name}</h4>
          <p className="text-sm text-slate-600">{student.class?.name}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">Adm No: {student.admission_number}</p>
        </div>

        <div className="flex justify-center mb-4">
          <div className="bg-white p-2 rounded-lg border-2 border-slate-200">
            <img src={qr} alt="QR Code" className="w-32 h-32" />
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          <p>Scan to mark attendance</p>
          {student.profile?.phone && <p className="mt-1">{student.profile.phone}</p>}
        </div>
      </div>

      <div className="absolute bottom-0 w-full p-2 bg-slate-50 text-center text-[10px] text-slate-400 border-t">
        {cardConfig.frontMessage || 'Valid for the current academic session'}
      </div>
    </div>
  );

  const renderCardBack = (student: any, qr: string) => (
    <div className="w-[340px] h-[540px] bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
      <div className={`${theme.header} text-white p-4 text-center`}>
        <h3 className="text-lg font-bold">INFORMATION</h3>
      </div>

      <div className="p-4 space-y-3">
        {cardConfig.showDOB && student.date_of_birth && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Date of Birth:</span>
            <span className="font-medium">{new Date(student.date_of_birth).toLocaleDateString()}</span>
          </div>
        )}
        {cardConfig.showBloodGroup && student.blood_group && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Blood Group:</span>
            <span className="font-medium">{student.blood_group}</span>
          </div>
        )}
        {cardConfig.showAddress && student.address && (
          <div className="text-sm">
            <span className="text-slate-500">Address:</span>
            <p className="font-medium">{student.address}</p>
          </div>
        )}
        {cardConfig.showEmergencyContact && student.emergency_contact && (
          <div className="text-sm">
            <span className="text-slate-500">Emergency Contact:</span>
            <p className="font-medium">{student.emergency_contact}</p>
            {student.guardian_name && <p className="text-xs text-slate-400">({student.guardian_name})</p>}
          </div>
        )}
      </div>

      <div className="p-4 text-center border-t border-slate-100">
        <div className="flex justify-center mb-2">
          <div className="bg-white p-2 rounded-lg border">
            <img src={qr} alt="Verification QR" className="w-20 h-20" />
          </div>
        </div>
        <p className="text-xs text-slate-500">ID Verification Code</p>
      </div>

      <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t">
        {cardConfig.backMessage || 'This ID card is the property of the school. If found, please return to the school office.'}
      </div>
    </div>
  );

  async function downloadPNG() {
    if (!selectedStudent || !qrCodeUrl) return;
    
    const frontCanvas = document.createElement('canvas');
    const backCanvas = document.createElement('canvas');
    
    frontCanvas.width = 340 * 3;
    frontCanvas.height = 540 * 3;
    backCanvas.width = 340 * 3;
    backCanvas.height = 540 * 3;

    const frontCtx = frontCanvas.getContext('2d');
    const backCtx = backCanvas.getContext('2d');

    if (!frontCtx || !backCtx) return;

    if (downloadFormat === 'front' || downloadFormat === 'both') {
      frontCtx.fillStyle = '#ffffff';
      frontCtx.fillRect(0, 0, frontCanvas.width, frontCanvas.height);
      frontCtx.fillStyle = cardConfig.primaryColor;
      frontCtx.fillRect(0, 0, frontCanvas.width, 120);
      frontCtx.fillStyle = '#ffffff';
      frontCtx.font = 'bold 48px Arial';
      frontCtx.textAlign = 'center';
      frontCtx.fillText(schoolSettings?.school_name || 'School', frontCanvas.width/2, 40);
      frontCtx.font = 'bold 36px Arial';
      frontCtx.fillText('STUDENT ID CARD', frontCanvas.width/2, 80);
      
      if (selectedStudent.profile?.avatar_url) {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = selectedStudent.profile.avatar_url;
        await new Promise(resolve => { img.onload = () => resolve(true); img.onerror = () => resolve(false); });
        frontCtx.save();
        frontCtx.beginPath();
        frontCtx.arc(frontCanvas.width/2, 240, 80, 0, Math.PI * 2);
        frontCtx.clip();
        frontCtx.drawImage(img, frontCanvas.width/2 - 80, 160, 160, 160);
        frontCtx.restore();
      }
      
      frontCtx.fillStyle = '#000000';
      frontCtx.font = 'bold 32px Arial';
      frontCtx.fillText(`${selectedStudent.profile?.first_name} ${selectedStudent.profile?.last_name}`, frontCanvas.width/2, 400);
      frontCtx.font = '24px Arial';
      frontCtx.fillText(selectedStudent.class?.name || '', frontCanvas.width/2, 440);
      frontCtx.font = '20px Arial';
      frontCtx.fillText(`Adm No: ${selectedStudent.admission_number}`, frontCanvas.width/2, 480);

const qrImg = document.createElement('img');
        qrImg.src = qrCodeUrl;
        await new Promise(resolve => { qrImg.onload = () => resolve(true); qrImg.onerror = () => resolve(false); });
      frontCtx.drawImage(qrImg, frontCanvas.width/2 - 100, 520, 200, 200);
    }

    if (downloadFormat === 'back' || downloadFormat === 'both') {
      backCtx.fillStyle = '#ffffff';
      backCtx.fillRect(0, 0, backCanvas.width, backCanvas.height);
      backCtx.fillStyle = cardConfig.primaryColor;
      backCtx.fillRect(0, 0, backCanvas.width, 80);
      backCtx.fillStyle = '#ffffff';
      backCtx.font = 'bold 36px Arial';
      backCtx.textAlign = 'center';
      backCtx.fillText('INFORMATION', backCanvas.width/2, 50);

      backCtx.fillStyle = '#000000';
      backCtx.font = '20px Arial';
      let yPos = 140;
      if (selectedStudent.date_of_birth) {
        backCtx.fillText(`DOB: ${new Date(selectedStudent.date_of_birth).toLocaleDateString()}`, 40, yPos);
        yPos += 30;
      }
      if (selectedStudent.blood_group) {
        backCtx.fillText(`Blood Group: ${selectedStudent.blood_group}`, 40, yPos);
        yPos += 30;
      }
      if (selectedStudent.guardian_phone) {
        backCtx.fillText(`Emergency: ${selectedStudent.guardian_phone}`, 40, yPos);
      }

      if (qrBackUrl) {
        const qrImg = document.createElement('img');
        qrImg.src = qrBackUrl;
        await new Promise(resolve => { qrImg.onload = () => resolve(true); qrImg.onerror = () => resolve(false); });
        backCtx.drawImage(qrImg, backCanvas.width/2 - 60, 350, 120, 120);
      }

      backCtx.font = '16px Arial';
      backCtx.fillStyle = '#666666';
      const msg = cardConfig.backMessage || 'This ID card is the property of the school';
      const words = msg.split(' ');
      let line = '';
      yPos = 500;
      for (const word of words) {
        if (line.length + word.length > 40) {
          backCtx.fillText(line, 40, yPos);
          line = word + ' ';
          yPos += 20;
        } else {
          line += word + ' ';
        }
      }
      backCtx.fillText(line, 40, yPos);
    }

    const link = document.createElement('a');
    const prefix = selectedStudent.admission_number;
    if (downloadFormat === 'both') {
      link.download = `${prefix}-id-card.png`;
    } else if (downloadFormat === 'front') {
      link.download = `${prefix}-front.png`;
    } else {
      link.download = `${prefix}-back.png`;
    }
    link.href = downloadFormat === 'both' 
      ? frontCanvas.toDataURL('image/png') 
      : downloadFormat === 'front' ? frontCanvas.toDataURL('image/png') : backCanvas.toDataURL('image/png');
    link.click();
  }

  async function downloadPDF() {
    if (!selectedStudent || !qrCodeUrl) return;
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const cardWidth = 85;
    const cardHeight = 135;
    const marginX = (pageWidth - cardWidth * 2) / 2;
    const marginY = (pageHeight - cardHeight * 2) / 2;

    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(schoolSettings?.school_name || 'School', pageWidth/2, 10, { align: 'center' });
    doc.setFontSize(10);
    doc.text('STUDENT ID CARD', pageWidth/2, 18, { align: 'center' });
    doc.setFontSize(8);
    doc.text(schoolSettings?.academic_year || '2024-2025', pageWidth/2, 23, { align: 'center' });

    if (downloadFormat === 'front' || downloadFormat === 'both') {
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(marginX, marginY + 10, cardWidth, cardHeight, 3, 3, 'F');
      
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(10);
      doc.text(`${selectedStudent.profile?.first_name} ${selectedStudent.profile?.last_name}`, pageWidth/4, marginY + 35, { align: 'center' });
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(selectedStudent.class?.name || '', pageWidth/4, marginY + 42, { align: 'center' });
      doc.text(`Adm No: ${selectedStudent.admission_number}`, pageWidth/4, marginY + 48, { align: 'center' });

      if (qrCodeUrl) {
        doc.addImage(qrCodeUrl, 'PNG', marginX + 25, marginY + 55, 35, 35);
      }

      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      doc.text('Scan to mark attendance', pageWidth/4, marginY + 130, { align: 'center' });
    }

    if (downloadFormat === 'back' || downloadFormat === 'both') {
      const backX = pageWidth * 0.75 - cardWidth/2;
      
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(backX, marginY + 10, cardWidth, cardHeight, 3, 3, 'F');
      
      doc.setTextColor(30, 58, 95);
      doc.setFontSize(10);
      doc.text('INFORMATION', backX + cardWidth/2, marginY + 20, { align: 'center' });

      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      let infoY = marginY + 30;
      
      if (selectedStudent.date_of_birth) {
        doc.text(`DOB: ${new Date(selectedStudent.date_of_birth).toLocaleDateString()}`, backX + 5, infoY);
        infoY += 8;
      }
      if (selectedStudent.blood_group) {
        doc.text(`Blood Group: ${selectedStudent.blood_group}`, backX + 5, infoY);
        infoY += 8;
      }
      if (selectedStudent.guardian_phone) {
        doc.text(`Emergency: ${selectedStudent.guardian_phone}`, backX + 5, infoY);
      }

      if (qrBackUrl) {
        doc.addImage(qrBackUrl, 'PNG', backX + 25, marginY + 70, 30, 30);
      }

      doc.setFontSize(5);
      const backMsg = cardConfig.backMessage || 'Property of school';
      const splitMsg = doc.splitTextToSize(backMsg, cardWidth - 10);
      doc.text(splitMsg, backX + 5, marginY + 120);
    }

    const prefix = selectedStudent.admission_number;
    const filename = downloadFormat === 'both' 
      ? `${prefix}-id-card.pdf` 
      : downloadFormat === 'front' ? `${prefix}-front.pdf` : `${prefix}-back.pdf`;
    
    doc.save(filename);
  }

  async function handleBulkDownload() {
    if (selectedStudents.length === 0) return;
    setGenerating(true);
    
    for (const studentId of selectedStudents) {
      const student = students.find(s => s.id === studentId);
      if (student) {
        setSelectedStudent(student);
        const qr = await generateAttendanceQR(student.admission_number);
        const qrBack = await generateBackQR(student.admission_number);
        setQrCodeUrl(qr);
        setQrBackUrl(qrBack);
        await downloadPDF();
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    setGenerating(false);
    setShowBulkModal(false);
    setSelectedStudents([]);
    setSuccess(`Downloaded ${selectedStudents.length} ID cards`);
    setTimeout(() => setSuccess(''), 3000);
  }

  return (
    <DashboardLayout title="Student ID Cards" subtitle="Generate and print student ID cards with QR codes">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Student ID Cards</h1>
              <p className="text-slate-500 mt-1">{students.length} students eligible for ID cards</p>
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

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No students found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(student => (
              <div key={student.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                      {student.profile?.first_name?.[0]}{student.profile?.last_name?.[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{student.profile?.first_name} {student.profile?.last_name}</h3>
                      <p className="text-sm text-slate-500">{student.class?.name || 'No Class'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-mono text-slate-500">{student.admission_number}</span>
                  <button onClick={() => handleShowCard(student)} disabled={generating} className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1">
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCardModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 animate-scale-in">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                <h3 className="text-lg font-bold text-slate-900">ID Card Preview - {selectedStudent.profile?.first_name}</h3>
                <button onClick={() => setShowCardModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex flex-wrap justify-center gap-8 mb-6">
                  {renderCardFront(selectedStudent, qrCodeUrl)}
                  {renderCardBack(selectedStudent, qrBackUrl)}
                </div>

                <div className="card bg-slate-50 p-4">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileDown size={16} /> Download Options
                  </h4>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex gap-2">
                      <label className="text-sm text-slate-600">Format:</label>
                      <select value={downloadFormat} onChange={(e) => setDownloadFormat(e.target.value as any)} className="input py-1 text-sm">
                        <option value="both">Front & Back</option>
                        <option value="front">Front Only</option>
                        <option value="back">Back Only</option>
                      </select>
                    </div>
                    <button onClick={downloadPNG} disabled={generating} className="btn-primary flex items-center gap-2">
                      <Image size={16} /> PNG
                    </button>
                    <button onClick={downloadPDF} disabled={generating} className="btn-outline flex items-center gap-2">
                      <FileText size={16} /> PDF
                    </button>
                    <button onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html><head><title>Print ID Card</title>
                          <style>
                            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                            .card-container { display: flex; gap: 20px; justify-content: center; }
                            @media print { body { padding: 0; } }
                          </style>
                          </head><body>
                            <div class="card-container">
                              <div>${renderCardFront(selectedStudent, qrCodeUrl).props.children}</div>
                              <div>${renderCardBack(selectedStudent, qrBackUrl).props.children}</div>
                            </div>
                          </body></html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
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

        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">ID Card Configuration</h3>
                <button onClick={() => setShowConfigModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
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

                <div className="space-y-2">
                  <label className="font-medium text-slate-700">Show on Card:</label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={cardConfig.showPhoto} onChange={(e) => setCardConfig({...cardConfig, showPhoto: e.target.checked})} className="w-4 h-4" />
                    <span className="text-sm">Student Photo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={cardConfig.showDOB} onChange={(e) => setCardConfig({...cardConfig, showDOB: e.target.checked})} className="w-4 h-4" />
                    <span className="text-sm">Date of Birth</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={cardConfig.showBloodGroup} onChange={(e) => setCardConfig({...cardConfig, showBloodGroup: e.target.checked})} className="w-4 h-4" />
                    <span className="text-sm">Blood Group</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={cardConfig.showAddress} onChange={(e) => setCardConfig({...cardConfig, showAddress: e.target.checked})} className="w-4 h-4" />
                    <span className="text-sm">Address</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={cardConfig.showEmergencyContact} onChange={(e) => setCardConfig({...cardConfig, showEmergencyContact: e.target.checked})} className="w-4 h-4" />
                    <span className="text-sm">Emergency Contact</span>
                  </label>
                </div>

                <div>
                  <label className="label">Front Message</label>
                  <input type="text" value={cardConfig.frontMessage} onChange={(e) => setCardConfig({...cardConfig, frontMessage: e.target.value})} className="input" placeholder="Message for front of card" />
                </div>

                <div>
                  <label className="label">Back Message</label>
                  <textarea value={cardConfig.backMessage} onChange={(e) => setCardConfig({...cardConfig, backMessage: e.target.value})} className="input" rows={3} placeholder="Message for back of card" />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
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
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Bulk Download</h3>
                <button onClick={() => setShowBulkModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              
              <div className="p-5">
                <p className="text-sm text-slate-600 mb-4">Select students to download ID cards (PDF):</p>
                <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
                  {filtered.map(student => (
                    <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
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
                        <p className="text-xs text-slate-500">{student.class?.name} - {student.admission_number}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-slate-500">{selectedStudents.length} students selected</p>
              </div>

              <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
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