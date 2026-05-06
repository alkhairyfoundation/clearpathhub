'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { QrCode, Camera, UserCheck, Check, X } from 'lucide-react';

export default function TeacherScanIDPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [manualInput, setManualInput] = useState('');
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
  }, [profile]);

  async function handleManualEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const { data: student } = await supabase.from('students').select('*, profile:profiles(*), class:classes(*)').eq('admission_number', manualInput.trim()).single();
    
    if (student) {
      await supabase.from('attendance').insert({
        student_id: student.profile_id,
        class_id: student.class_id,
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        marked_by: profile?.id,
        marked_at: new Date().toISOString(),
        scan_method: 'qr_scan'
      });
      setLastScanned(student);
      setScanHistory([student, ...scanHistory.slice(0, 9)]);
    } else {
      alert('Student not found');
    }
    setManualInput('');
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Scan Student ID</h1><p className="text-slate-500">Scan student ID card to mark attendance</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Manual Entry</h2>
            <QrCode className="text-blue-600" size={24} />
          </div>

          <form onSubmit={handleManualEntry} className="space-y-4">
            <div><label className="label">Admission Number</label><input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)} className="input" placeholder="Enter admission number" /></div>
            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2"><Camera size={18} />Mark Attendance</button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
            <Camera className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-sm text-slate-500">Use camera to scan QR code</p>
            <button className="btn-outline mt-2">Open Camera</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Last Scanned</h2>
          {lastScanned ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"><Check className="text-green-600" size={24} /></div>
              <div className="flex-1"><p className="font-semibold text-slate-800">{lastScanned.profile?.first_name} {lastScanned.profile?.last_name}</p><p className="text-sm text-slate-500">{lastScanned.admission_number} • {lastScanned.class?.name}</p></div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500"><QrCode size={48} className="mx-auto mb-4 opacity-50" /><p>No student scanned yet</p></div>
          )}

          {scanHistory.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-slate-800 mb-3">Recent Scans</h3>
              <div className="space-y-2">
                {scanHistory.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2"><UserCheck size={16} className="text-green-500" /><span>{s.profile?.first_name} {s.profile?.last_name}</span></div>
                    <span className="text-slate-500">{s.admission_number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}