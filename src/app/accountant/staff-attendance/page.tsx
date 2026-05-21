'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, QrCode, Camera, Check, X, Loader2, Calendar, Clock, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';
import DashboardLayout from '@/components/DashboardLayout';

export default function AccountantStaffAttendancePage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    if (profile) checkToday();
    return () => stopCamera();
  }, [profile, loading]);

  async function checkToday() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('staff_id', profile?.id)
      .eq('date', today)
      .maybeSingle();
    setTodayRecord(data);
  }

  async function startCamera() {
    setCameraError('');
    setMessage(null);
    setShowCamera(true);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch {
      setCameraError('Unable to access camera. Please grant permission.');
      setScanning(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (animationFrameRef.current) { cancelAnimationFrame(animationFrameRef.current); animationFrameRef.current = null; }
    setShowCamera(false);
    setScanning(false);
  }

  function tick() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code?.data && code.data.length > 10) {
          processScan(code.data);
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  }

  function isLate() {
    const now = new Date();
    const cutoffHour = 8, cutoffMin = 30;
    return now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() > cutoffMin);
  }

  async function processScan(data: string) {
    stopCamera();
    setMessage(null);

    const today = new Date().toISOString().split('T')[0];
    const status = isLate() ? 'late' : 'present';
    const staffName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
    const now = new Date().toISOString();

    let qrCode = data;
    let scanType = 'raw';
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'STAFF_ATTENDANCE' || parsed.type === 'SCHOOL_ATTENDANCE') {
        qrCode = parsed.school || data;
        scanType = 'staff_attendance';
      }
    } catch { scanType = 'manual'; }

    try {
      const { error } = await supabase.from('staff_attendance').upsert({
        staff_id: profile?.id, staff_name: staffName, date: today, status,
        qr_data: data, qr_code: qrCode, scan_type: scanType,
        scanned_at: now, marked_at: now,
      }, { onConflict: 'staff_id,date' });

      if (error) { setMessage({ type: 'error', text: error.message }); return; }
      setMessage({ type: 'success', text: `Marked as ${status} at ${new Date(now).toLocaleTimeString()}` });
      setTodayRecord({ status, scanned_at: now });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save attendance' });
    }
  }

  return (
    <DashboardLayout title="Staff Attendance" subtitle="Scan school QR code to mark your attendance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Staff Attendance</h1>
            <p className="text-slate-500">Scan the school QR code to mark your attendance</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-center gap-2">
          <Clock size={16} /> Attendance after 8:30 AM is automatically marked as <strong>Late</strong>
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />} {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card text-center">
            <QrCode size={48} className="mx-auto text-primary-600 mb-4" />
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Scan QR Code</h2>
            <p className="text-sm text-slate-500 mb-6">Point your camera at the school QR code to mark your attendance</p>
            {todayRecord ? (
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <Check size={32} className="mx-auto text-green-600 mb-2" />
                <p className="font-semibold text-green-700 capitalize">Already marked {todayRecord.status}</p>
                <p className="text-sm text-green-600">Today at {new Date(todayRecord.scanned_at || todayRecord.marked_at).toLocaleTimeString()}</p>
              </div>
            ) : !showCamera ? (
              <button onClick={startCamera} className="btn-primary flex items-center gap-2 mx-auto"><Camera size={18} />Open Camera</button>
            ) : (
              <button onClick={stopCamera} className="btn-outline flex items-center gap-2 mx-auto"><X size={16} />Close Camera</button>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-slate-400" />Today&apos;s Record</h2>
            {todayRecord ? (
              <div className={`p-4 rounded-lg ${todayRecord.status === 'late' ? 'bg-amber-50' : 'bg-green-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${todayRecord.status === 'late' ? 'bg-amber-100' : 'bg-green-100'}`}>
                    <Check className={todayRecord.status === 'late' ? 'text-amber-600' : 'text-green-600'} size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 capitalize">Marked {todayRecord.status}</p>
                    <p className="text-sm text-slate-500">{todayRecord.scanned_at || todayRecord.marked_at ? new Date(todayRecord.scanned_at || todayRecord.marked_at).toLocaleTimeString() : ''}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500"><QrCode size={48} className="mx-auto mb-4 opacity-50" /><p>Not yet marked</p></div>
            )}
          </div>
        </div>

        {showCamera && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">QR Scanner</h3>
                <button onClick={stopCamera} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <div className="relative bg-black">
                <video ref={videoRef} className="w-full h-64 object-cover" playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
                </div>
                {scanning && <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Scanning...</div>}
              </div>
              {cameraError && <div className="p-4 bg-red-50 text-red-600 text-sm text-center">{cameraError}</div>}
              <div className="p-4 text-center text-sm text-slate-500">Point camera at the school QR code</div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
