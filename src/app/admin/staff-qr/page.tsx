'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, QrCode, Printer, Calendar, UserCheck, Clock, CheckCircle, XCircle, Loader2, Search, Filter } from 'lucide-react';
import QRCode from 'qrcode';

export default function AdminStaffQRPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffAttendance, setStaffAttendance] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  useEffect(() => { generateDailyQR(); fetchAttendance(); }, [date]);

  async function fetchData() {
    setLoading(true);
    const [profilesRes, settingsRes] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email, role').in('role', ['teacher', 'accountant', 'admin']).order('first_name'),
      supabase.from('school_settings').select('*').limit(1).maybeSingle(),
    ]);
    if (profilesRes.data) setAllStaff(profilesRes.data);
    if (settingsRes.data) setSchoolSettings(settingsRes.data);
    setLoading(false);
  }

  async function generateDailyQR() {
    setGenerating(true);
    const qrData = JSON.stringify({
      type: 'STAFF_ATTENDANCE',
      date: date,
      schoolId: schoolSettings?.id,
      school: schoolSettings?.school_name || 'School',
      timestamp: Date.now(),
      version: '2.0'
    });
    try {
      const url = await QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#1e3a5f', light: '#ffffff' } });
      setQrCodeUrl(url);
    } catch { /* ignore */ }
    setGenerating(false);
  }

  async function fetchAttendance() {
    const { data } = await supabase.from('staff_attendance').select('*').eq('date', date).order('scanned_at', { ascending: false });
    if (data) setStaffAttendance(data);
  }

  async function markAttendance(staffId: string, status: 'present' | 'absent' | 'late') {
    setUpdating(staffId);
    const staffProfile = allStaff.find(s => s.id === staffId);
    const staffName = staffProfile ? `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim() : '';
    const existing = staffAttendance.find(a => a.staff_id === staffId);
    if (existing) {
      await supabase.from('staff_attendance').update({ status, scanned_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('staff_attendance').insert({
        staff_id: staffId, staff_name: staffName, date, status, scanned_at: new Date().toISOString(), scan_type: 'manual',
      });
    }
    await fetchAttendance();
    setUpdating(null);
  }

  function handlePrint() {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrCodeUrl) {
      const schoolName = schoolSettings?.school_name || 'Mastery Engine';
      printWindow.document.write(`<html><head><title>Print QR Code</title><style>body{margin:0;padding:40px;font-family:Arial,sans-serif}.container{text-align:center}.qr-container{border:2px solid #000;padding:30px;display:inline-block;border-radius:12px}h1{font-size:24px;margin-bottom:10px}p{margin:8px 0}@media print{body{margin:0}}</style></head><body><div class="container"><div class="qr-container"><h1>${schoolName}</h1><p><strong>Staff Attendance QR Code</strong></p><p>Date: ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p><img src="${qrCodeUrl}" alt="QR Code" style="width:200px;height:200px;margin:20px 0;" /><p><strong>Display this QR for staff to scan</strong></p></div></div></body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  }

  const attendanceMap = new Map(staffAttendance.map(a => [a.staff_id, a]));

  const mergedStaff = allStaff.map(s => {
    const record = attendanceMap.get(s.id);
    return {
      ...s,
      record,
      status: record?.status || null,
      scanned_at: record?.scanned_at || null,
    };
  });

  const filteredStaff = mergedStaff.filter(s => {
    if (roleFilter && s.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const presentCount = staffAttendance.filter(a => a.status === 'present').length;
  const absentCount = staffAttendance.filter(a => a.status === 'absent').length;
  const lateCount = staffAttendance.filter(a => a.status === 'late').length;
  const totalStaff = allStaff.length;
  const pendingCount = totalStaff - staffAttendance.length;

  return (
    <DashboardLayout title="Staff Attendance QR" subtitle="Generate staff QR codes and manage all staff attendance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Attendance Management</h1>
            <p className="text-slate-500 mt-1">Generate daily QR codes and manage attendance for all staff</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-900">{totalStaff}</p>
            <p className="text-xs text-slate-500">Total Staff</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            <p className="text-xs text-slate-500">Present</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
            <p className="text-xs text-slate-500">Late</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            <p className="text-xs text-slate-500">Absent</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-slate-400">{pendingCount}</p>
            <p className="text-xs text-slate-500">Not Marked</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 card">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><QrCode size={18} className="text-slate-400" />Daily QR Code</h2>
            <div className="mb-4"><label className="label">Select Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div>
            {generating ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div></div>
            ) : qrCodeUrl ? (
              <div className="text-center">
                <div className="bg-slate-50 rounded-xl p-6 mb-3 inline-block"><img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" /></div>
                <p className="text-sm text-slate-500 mb-3">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <button onClick={handlePrint} className="btn-primary flex items-center gap-2 mx-auto"><Printer size={18} />Print QR</button>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2 card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UserCheck size={18} className="text-slate-400" />Staff Attendance</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 flex items-center gap-1"><Calendar size={14} />{new Date(date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9 text-sm" />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input text-sm sm:w-36">
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="accountant">Accountant</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredStaff.length === 0 ? (
                  <div className="text-center py-8 text-slate-500"><UserCheck size={32} className="mx-auto mb-2 opacity-50" /><p>No staff found</p></div>
                ) : filteredStaff.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 bg-gradient-to-br from-primary-600 to-primary-700">
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{s.first_name} {s.last_name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 capitalize">{s.role}</span>
                          {s.record?.scanned_at && <span className="text-xs text-slate-400">&bull; {new Date(s.scanned_at).toLocaleTimeString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(['present', 'late', 'absent'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => markAttendance(s.id, st)}
                          disabled={updating === s.id}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all border ${
                            s.status === st
                              ? st === 'present' ? 'bg-green-100 text-green-700 border-green-300'
                                : st === 'late' ? 'bg-amber-100 text-amber-700 border-amber-300'
                                : 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                          } ${updating === s.id ? 'opacity-50' : ''}`}
                        >
                          {updating === s.id ? <Loader2 size={12} className="animate-spin" /> : st}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
