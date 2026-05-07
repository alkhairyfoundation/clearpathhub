'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Download, Printer, FileText, X } from 'lucide-react';

export default function AccountantReceiptsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: 0, student_id: '', description: '' });

  useEffect(() => {
    if (!profile || profile.role !== 'accountant') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('receipts').select('*, student:profiles(first_name, last_name)').order('created_at', { ascending: false });
    if (data) setReceipts(data);
    setLoading(false);
  }

  async function handleSave() {
    await supabase.from('receipts').insert({ ...formData, created_by: profile?.id });
    setShowModal(false); setFormData({ title: '', amount: 0, student_id: '', description: '' }); fetchData();
  }

  function handlePrint(receipt: any) {
    const printContent = `
      <div style="padding: 20px; font-family: Arial;">
        <h2>Receipt</h2>
        <p><strong>Receipt #:</strong> ${receipt.id.slice(0, 8)}</p>
        <p><strong>Student:</strong> ${receipt.student?.first_name} ${receipt.student?.last_name}</p>
        <p><strong>Amount:</strong> NGN${receipt.amount?.toLocaleString()}</p>
        <p><strong>Date:</strong> ${new Date(receipt.created_at).toLocaleDateString()}</p>
        <p><strong>Description:</strong> ${receipt.description || 'N/A'}</p>
      </div>
    `;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.print();
  }

  return (
    <DashboardLayout title="Receipts" subtitle="View and print payment receipts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-slate-800">Receipts</h1><p className="text-slate-500">View and print payment receipts</p></div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={20} />Create Receipt</button>
        </div>
      
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : receipts.length === 0 ? (
            <div className="p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No receipts yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Receipt #</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Student</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Description</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-sm">{r.id.slice(0, 8)}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{r.student?.first_name} {r.student?.last_name}</td>
                      <td className="py-3 px-4 font-semibold">NGN{r.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-slate-600 hidden sm:table-cell">{r.description || '-'}</td>
                      <td className="py-3 px-4 text-sm text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right"><button onClick={() => handlePrint(r)} className="btn-outline text-sm py-1 px-3 flex items-center gap-1 ml-auto"><Printer size={14} />Print</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold text-slate-800">Create Receipt</h2><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button></div>
              <div className="p-6 space-y-4">
                <div><label className="label">Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input" placeholder="Receipt title" /></div>
                <div><label className="label">Amount</label><input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="input" /></div>
                <div><label className="label">Student ID</label><input type="text" value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} className="input" placeholder="Student profile ID" /></div>
                <div><label className="label">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input" rows={3} /></div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t"><button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button><button onClick={handleSave} className="btn-primary">Create Receipt</button></div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
