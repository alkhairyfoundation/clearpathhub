'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, QrCode, Camera, Check, X, Loader2, Calendar } from 'lucide-react';
import jsQR from 'jsqr';

export default function StaffScanQRPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile || !['teacher', 'accountant', 'admin'].includes(profile.role || '')) { router.push('/login'); return; }
    return () => stopCamera();
  }, [profile, loading]);

  async function startCamera() {
    setCameraError('');
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
        if (code?.data) {
          processScan(code.data);
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  }

  async function processScan(data: string) {
    stopCamera();
    const record = {
      staff_id: profile?.id,
      staff_name: `${profile?.first_name} ${profile?.last_name}`,
      qr_data: data,
      scanned_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      status: 'present'
    };
    await supabase.from('staff_attendance').insert(record);
    setLastScan(record);
    setScanHistory(prev => [record, ...prev.slice(0, 19)]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Scan Attendance QR</h1>
          <p className="text-slate-500">Scan the school QR code to mark your attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card text-center">
          <QrCode size={48} className="mx-auto text-blue-600 mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Scan QR Code</h2>
          <p className="text-sm text-slate-500 mb-6">Point your camera at the school QR code displayed at the entrance</p>
          {!showCamera ? (
            <button onClick={startCamera} className="btn-primary flex items-center gap-2 mx-auto"><Camera size={18} />Open Camera</button>
          ) : (
            <button onClick={stopCamera} className="btn-outline flex items-center gap-2 mx-auto"><X size={16} />Close Camera</button>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-slate-400" />Today&apos;s Attendance</h2>
          {lastScan ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center"><Check className="text-green-600" size={24} /></div>
              <div><p className="font-semibold text-slate-800">Checked In</p><p className="text-sm text-slate-500">{new Date(lastScan.scanned_at).toLocaleTimeString()}</p></div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500"><QrCode size={48} className="mx-auto mb-4 opacity-50" /><p>No attendance marked yet</p></div>
          )}
          {scanHistory.length > 0 && (
            <div className="mt-4"><h3 className="font-medium text-slate-800 mb-2">Recent Scans</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {scanHistory.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2"><Check size={14} className="text-green-500" /><span>{s.staff_name}</span></div>
                    <span className="text-slate-500">{new Date(s.scanned_at).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
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
  );
}
