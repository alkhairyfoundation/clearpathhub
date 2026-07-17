'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { QrCode, Camera, UserCheck, Check, X, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';

export default function AdminScanIDPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [manualInput, setManualInput] = useState('');
  const [lastScanned, setLastScanned] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchTodayHistory();
    return () => stopCamera();
  }, [profile, router]);

  async function fetchTodayHistory() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('*, student:profiles!student_id(first_name, last_name)')
      .eq('date', today)
      .eq('scan_method', 'qr_scan')
      .order('marked_at', { ascending: false });
    if (data) setScanHistory(data);
  }

  async function handleManualEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await processAdmissionNumber(manualInput.trim());
    setManualInput('');
  }

  async function processAdmissionNumber(data: string) {
    let admissionNumber = data.trim();
    
    try {
      const parsed = JSON.parse(data);
      if (parsed.admissionNumber) {
        admissionNumber = parsed.admissionNumber;
      } else if (parsed.type === 'STUDENT_ATTENDANCE' && parsed.admissionNumber) {
        admissionNumber = parsed.admissionNumber;
      }
    } catch {
      // Not JSON, use as-is for backward compatibility
    }
    
    const { data: student } = await supabase
      .from('students')
      .select('*, profile:profiles!profile_id(first_name, last_name), class:classes!class_id(name)')
      .eq('admission_number', admissionNumber)
      .maybeSingle();
    
    if (student) {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const cutoffHour = 8, cutoffMin = 30;
      const isLate = now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() > cutoffMin);
      await supabase.from('attendance').upsert({
        student_id: student.profile_id,
        class_id: student.class_id,
        date: today,
        status: isLate ? 'late' : 'present',
        marked_by: profile?.id,
        marked_at: new Date().toISOString(),
        scan_method: 'qr_scan'
      }, { onConflict: 'student_id,date' });
      
      setLastScanned(student);
      await fetchTodayHistory();
      stopCamera();
    } else {
      alert('Student not found with admission number: ' + admissionNumber);
    }
  }

  async function startCamera() {
    setCameraError('');
    setShowCamera(true);
    setScanning(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      setCameraError('Unable to access camera. Please grant permission and try again.');
      setScanning(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        
        if (code?.data) {
          processAdmissionNumber(code.data);
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(tick);
  }

  return (
    <DashboardLayout title="Scan Student ID" subtitle="Scan QR code or enter admission number to mark attendance">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 dark:text-slate-200">Scan Student ID</h1>
          <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Scan QR code or enter admission number to mark attendance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">Manual Entry</h2>
              <QrCode className="text-primary-600 dark:text-primary-400 dark:text-primary-400" size={24} />
            </div>

            <form onSubmit={handleManualEntry} className="space-y-4">
              <div>
                <label className="label">Admission Number</label>
                <input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)} className="input" placeholder="Enter admission number" />
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <Check size={18} />Mark Attendance
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg text-center">
              <Camera className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-3">Scan QR code using camera</p>
              {!showCamera ? (
                <button onClick={startCamera} className="btn-outline">Open Camera</button>
              ) : (
                <button onClick={stopCamera} className="btn-outline flex items-center gap-2 mx-auto">
                  <X size={16} />Close Camera
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-6">Last Scanned</h2>
            {lastScanned ? (
              <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 dark:bg-green-900/20 rounded-lg">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30 rounded-full flex items-center justify-center"><Check className="text-green-600 dark:text-green-400 dark:text-green-400" size={24} /></div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 dark:text-slate-200">{lastScanned.profile?.first_name} {lastScanned.profile?.last_name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{lastScanned.admission_number} &bull; {lastScanned.class?.name}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400 dark:text-slate-400">
                <QrCode size={48} className="mx-auto mb-4 opacity-50" />
                <p>No student scanned yet</p>
              </div>
            )}

            {scanHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-slate-800 dark:text-slate-200 dark:text-slate-200 mb-3">Today&apos;s Scans ({scanHistory.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {scanHistory.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg text-sm">
                      <div className="flex items-center gap-2"><UserCheck size={16} className="text-green-500" /><span>{s.student?.first_name} {s.student?.last_name}</span></div>
                      <span className="text-slate-500 dark:text-slate-400 dark:text-slate-400">{s.marked_at ? new Date(s.marked_at).toLocaleTimeString() : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">QR Scanner</h3>
                <button onClick={stopCamera} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
              </div>
              <div className="relative bg-black">
                <video ref={videoRef} className="w-full h-64 object-cover" playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
                </div>
                {scanning && (
                  <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Scanning...
                  </div>
                )}
              </div>
              {cameraError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 text-red-600 dark:text-red-400 dark:text-red-400 text-sm text-center">{cameraError}</div>
              )}
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
                Point camera at student ID QR code
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
