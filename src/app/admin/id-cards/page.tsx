'use client';


import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Search, Download, Printer, X, QrCode, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import type { Student, Profile } from '@/types';

export default function AdminIDCardsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<(Student & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [showCard, setShowCard] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student & { profile: Profile } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [profile, selectedClass]);

  async function fetchData() {
    setLoading(true);
    
    const [studentsRes, classesRes] = await Promise.all([
      supabase
        .from('students')
        .select('*, profile:profiles(*), class:classes(*)')
        .order('admission_number'),
      supabase.from('classes').select('id, name').order('name'),
    ]);

    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  }

  const filteredStudents = students.filter(s => 
    `${s.profile?.first_name} ${s.profile?.last_name} ${s.admission_number}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedClass === 'all' || s.class_id === selectedClass)
  );

  async function generateQRCode(admissionNumber: string): Promise<string> {
    try {
      return await QRCode.toDataURL(admissionNumber, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (err) {
      console.error('QR generation error:', err);
      return '';
    }
  }

  async function handleShowCard(student: Student & { profile: Profile }) {
    setSelectedStudent(student);
    setGenerating(true);
    const qr = await generateQRCode(student.admission_number);
    setQrCodeUrl(qr);
    setShowCard(true);
    setGenerating(false);
  }

  async function handlePrint() {
    const printContent = document.getElementById('id-card-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print ID Card</title>
            <style>
              body { margin: 0; padding: 20px; }
              .card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; width: 340px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ID Cards</h1>
          <p className="text-slate-500">Generate and manage student ID cards with QR codes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="all">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <QrCode size={48} className="mx-auto mb-4 opacity-50" />
            <p>No students found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleShowCard(student)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold">
                      {student.profile?.first_name?.[0]}{student.profile?.last_name?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {student.profile?.first_name} {student.profile?.last_name}
                    </p>
                    <p className="text-sm text-slate-500">{student.admission_number}</p>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {student.class?.name || 'No Class'}
                </div>
                <button className="mt-3 w-full btn-outline text-sm py-2 flex items-center justify-center gap-2">
                  <QrCode size={16} />
                  View ID Card
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCard && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-slate-800">ID Card</h2>
              <button onClick={() => setShowCard(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <div className="p-6" id="id-card-content">
              {generating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold">ClearPath Edu Hub</h3>
                      <p className="text-blue-200 text-sm">Student ID Card</p>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">Logo</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-xs">Photo</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg">
                        {selectedStudent.profile?.first_name} {selectedStudent.profile?.last_name}
                      </h4>
                      <p className="text-blue-200 text-sm">
                        Admission: {selectedStudent.admission_number}
                      </p>
                      <p className="text-blue-200 text-sm mt-1">
                        Class: {selectedStudent.class?.name || 'N/A'}
                      </p>
                      {selectedStudent.date_of_birth && (
                        <p className="text-blue-200 text-sm">
                          DOB: {selectedStudent.date_of_birth}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-center">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24" />
                    ) : (
                      <div className="w-24 h-24 bg-white rounded-lg flex items-center justify-center">
                        <QrCode className="text-gray-400" size={32} />
                      </div>
                    )}
                  </div>
                  <p className="text-center text-xs text-blue-200 mt-2">
                    Scan for attendance
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowCard(false)} className="btn-outline">
                Close
              </button>
              <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
                <Printer size={18} />
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}